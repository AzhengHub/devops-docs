---
title: "GitLab"
weight: 20
---


## 一、前言

GitLab 的完全备份实际上包含两部分：**数据备份**（由 GitLab 提供的工具完成）和 **配置文件备份**（必须手动完成）。

如果 GitLab 通过 apt/yum 安装，可根据下面的方式进行备份。


## 二、注意事项
**版本必须一致：**
- 恢复备份时，新服务器上的 GitLab 版本必须与创建备份时的版本**完全一致**。

**密钥文件至关重要：**
- `/etc/gitlab/gitlab-secrets.json` 包含数据库加密密钥。如果丢失此文件，即使有数据备份，你也无法恢复（数据将无法解密）。


## 三、手动备份
一个完整的备份包含两个步骤：命令备份数据 + 手动备份配置。

### 1. 备份数据

GitLab 提供了一个内置命令来打包所有数据。

```bash
# 运行备份命令
sudo gitlab-backup create

# 如果用的是 Docker 部署
# docker exec -t <container_name> gitlab-backup create

```

* **默认存放路径：** `/var/opt/gitlab/backups/`
* **生成文件：** 类似 `1768201492_2026_01_12_15.9.2_gitlab_backup.tar`。文件名包含了时间戳和 GitLab 版本号。

### 2. 备份配置文件

GitLab 的备份命令**不会**备份配置文件。需要手动保存 `/etc/gitlab` 目录下的关键文件。

1. `/etc/gitlab/gitlab.rb` (主配置文件)
2. `/etc/gitlab/gitlab-secrets.json` (**绝对核心文件，丢失无法恢复数据**)
3. `/etc/gitlab/ssl/` (如配置了 HTTPS 证书)
4. `/etc/gitlab/ssh_host_keys/` (可选，防止用户端 SSH 报错)


---

## 四、自动化备份并存放至远程 MinIO
生产环境中，手动备份容易遗忘，因此需要通过定时任务定时备份。

这里使用 MinIO 官方客户端 mc，写一个脚本把数据和配置文件打包并推送到 MinIO 对象存储中。

### 1. 安装并配置 MinIO 客户端
```sh
# 下载 mc
curl https://dl.min.io/client/mc/release/linux-amd64/mc \
  --create-dirs \
  -o /usr/local/bin/mc

# 给权限
chmod +x /usr/local/bin/mc

# 添加 MinIO 服务端别名 (alias)
# 格式: mc alias set <别名> <MinIO地址> <AccessKey> <SecretKey>
mc alias set myminio http://192.168.1.100:9000 minioadmin minioadmin
```

### 2. 备份脚本
```sh {filename="/opt/gitlab/bin/auto_backup.sh"}
#!/bin/bash

# ---------------- 配置项 ----------------
# 本地备份路径
LOCAL_BACKUP_DIR="/var/opt/gitlab/backups"
# 配置文件路径
CONFIG_DIR="/etc/gitlab"
# MinIO 别名 (也就是刚才 mc alias set 设置的名字)
MINIO_ALIAS="myminio"
# MinIO 桶名称
BUCKET_NAME="gitlab-backups"
# 日期格式
DATE=$(date +%Y_%m_%d)
# ---------------------------------------

echo "[INFO] 开始备份 GitLab 数据..."
# CRON=1 能够减少非必要的输出噪音
/opt/gitlab/bin/gitlab-backup create CRON=1

if [ $? -eq 0 ]; then
    echo "[INFO] 数据备份成功"
else
    echo "[ERROR] 数据备份失败!"
    exit 1
fi

echo "[INFO] 开始打包配置文件 (/etc/gitlab)..."
# 将配置文件打包，文件名带上日期
tar -zcf ${LOCAL_BACKUP_DIR}/gitlab_config_${DATE}.tar.gz ${CONFIG_DIR}

echo "[INFO] 开始推送到 MinIO..."
# 上传以今天日期为包含特征的文件 (既包含数据tar，也包含配置tar)
/usr/local/bin/mc cp ${LOCAL_BACKUP_DIR}/*${DATE}* ${MINIO_ALIAS}/${BUCKET_NAME}/

if [ $? -eq 0 ]; then
    echo "[SUCCESS] 备份文件已推送到 MinIO"
else
    echo "[ERROR] 上传 MinIO 失败!"
fi

# (可选) 清理本地 7 天前的配置备份文件
# 注意：GitLab 内置的数据备份清理可以通过 gitlab.rb 配置，但手打的 config 包需要脚本自己清理
find ${LOCAL_BACKUP_DIR} -name "gitlab_config_*.tar.gz" -mtime +7 -delete
```
- 给脚本执行权限：`chmod +x /opt/gitlab/bin/auto_backup.sh`

### 3. 配置定时任务

```bash
# 编辑 root 用户的 crontab：
sudo crontab -e -u root

# 每天凌晨 02:00 执行 GitLab 自动备份并上传 MinIO
0 2 * * * /bin/bash /opt/gitlab/bin/auto_backup.sh > /var/log/gitlab_backup.log 2>&1
```

### 4. 备份保留策略
备份分为本地保留和远程保留两部分，策略不同：
- **本地保留**：`gitlab-backup create` 生成的 `.tar` 包，默认保留 7 天。可通过 `/etc/gitlab/gitlab.rb` 配置 `gitlab_rails['backup_keep_time']` 来修改。
- **远程保留**：脚本里通过 `find` 命令清理 7 天前的配置备份包。

#### 4.1 本地保留策略
编辑 `/etc/gitlab/gitlab.rb`，设置本地数据保留时间（例如 7 天）：

```ruby
# 单位：秒 (7天 = 604800 秒)
gitlab_rails['backup_keep_time'] = 604800

```

修改后记得 `gitlab-ctl reconfigure`。
*注：这个配置只会清理 `gitlab-backup create` 生成的 `.tar` 包，脚本里生成的配置备份包已在脚本末尾通过 `find` 命令处理。*


#### 4.2 MinIO 远程保留策略（可选）
在 MinIO 控制台通过 **Lifecycle Rules**（生命周期规则）来管理，比写脚本去远程删除更安全。

* 设置规则：Bucket `gitlab-backups` 中的对象，超过 `30` 天自动过期删除。


---

## 五、恢复

### 1. 安装相同版本的 GitLab
具体版本号可从备份文件名中获取，例如文件名为`1768201492_2026_01_12_15.9.2_gitlab_backup.tar`，则版本号为`15.9.2`。
- **注意**：备份文件名本身不区分 CE（社区版）还是 EE（企业版）。必须确认原来的机器装的是 CE 还是 EE。如果弄错，恢复会失败。通常大多数个人或中小团队使用的是 CE。

在 Ubuntu 22.04 上安装 GitLab 15.9.2：
```sh
# 安装依赖
sudo apt-get update
sudo apt-get install -y curl openssh-server ca-certificates tzdata perl

# 添加 GitLab 官方源 (这一步会自动适配 Ubuntu 22.04)
curl https://packages.gitlab.com/install/repositories/gitlab/gitlab-ce/script.deb.sh | sudo bash

# 查找并锁定准确的版本号字符串，APT 包名通常带有后缀（如 15.9.2-ce.0）。先搜索一下确切名称：
apt-cache policy gitlab-ce | grep 15.9.2
# 应该会看到类似 15.9.2-ce.0 的输出。

# 使用查到的完整版本号进行安装（不要直接 run install，否则会装成最新版）：
# 格式：sudo apt-get install gitlab-ce=<完整版本号>
sudo apt-get install gitlab-ce=15.9.2-ce.0

# 确认安装版本是否正确
cat /opt/gitlab/version-manifest.txt | head -n 1
```

{{% alert title="<i class='fa-solid fa-info-circle pe-1'></i> 提示" color="info" %}}

如安装过程中遇到报错，可执行以下命令手动配置：

```bash
# 重新配置 GitLab
sudo gitlab-ctl reconfigure

# 然后修复依赖问题
sudo apt-get install -f
```

{{% /alert %}}



### 2. 准备工作

将备份文件（`.tar`）和配置文件复制到新服务器。

* 将 `.tar` 备份文件放入： `/var/opt/gitlab/backups/`
* **修改权限：** 确保备份文件属于 git 用户。
```bash
sudo chown git:git /var/opt/gitlab/backups/1768201492_2026_01_12_15.9.2_gitlab_backup.tar

```

### 3. 恢复配置文件

在恢复数据之前，先恢复配置。

```bash
# 复制配置文件到默认目录
sudo cp gitlab.rb /etc/gitlab/
sudo cp gitlab-secrets.json /etc/gitlab/
sudo cp -r ssl /etc/gitlab/

# 重新配置 GitLab 以应用配置
sudo gitlab-ctl reconfigure

# 应返回 gitlab Reconfigured!
```

### 4. 停止相关服务

恢复数据时，必须停止连接数据库的服务（如 Unicorn/Puma 和 Sidekiq），但必须保持 PostgreSQL 运行。

```bash
sudo gitlab-ctl stop puma
sudo gitlab-ctl stop sidekiq
# 如果是旧版本可能是 unicorn
# sudo gitlab-ctl stop unicorn

# 确认状态（确保 puma/sidekiq 是 down，postgresql 是 run）
sudo gitlab-ctl status
```

{{% alert title="<i class='fa-solid fa-info-circle pe-1'></i> 提示" color="info" %}}
执行 `gitlab-ctl status` 如遇到“WARN: Please install an English UTF-8 locale for Cinc Client to use, falling back to C locale and disabling UTF-8 support.
”的告警，可通过以下方式解决：

```sh
# 1. 安装并生成英文 UTF-8 语言包
sudo apt-get install -y locales
sudo locale-gen en_US.UTF-8

# 2. 更新系统默认语言设置
sudo update-locale LANG=en_US.UTF-8
```
{{% /alert %}}


### 5. 执行恢复命令

使用文件名中的时间戳部分进行恢复（`BACKUP=` 后面不需要加 `.tar` 后缀）。

```bash
# 这里的 timestamp 是你备份文件名的前缀
# 例如文件名是 1768201492_2026_01_12_15.9.2_gitlab_backup.tar
sudo gitlab-backup restore BACKUP=1768201492_2026_01_12_15.9.2

```

* 系统会询问多次确认（如“这将覆盖现有数据”），输入 `yes` 继续。

### 6. 重启并验证

恢复完成后，重启所有服务并进行系统检查。

```bash
# 重启服务
sudo gitlab-ctl restart

# 检查系统健康状态
sudo gitlab-rake gitlab:check SANITIZE=true

```

如果检查结果全部为绿色（OK），则恢复成功。
