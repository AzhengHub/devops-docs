---
title: "GitLab"
---

## Gitlab 概述

https://about.gitlab.com/

https://gitlab.cn/

- GitLab 是一个用于仓库管理系统的开源项目，使用[Git](https://baike.baidu.com/item/Git?fromModule=lemma_inlink)作为代码管理工具，并在此基础上搭建起来的Web服务。
- 与之类似的还有 Github、Gitee 等...
- 代码在提交到 GitLab 前可以先放在本地仓库(这个时候没有网络也可以)，有网络时可以选择提交到GitLab主服务器，这样可以减轻 GitLab 主服务器的负载压力

剥开 GitLab 庞杂的功能外衣，它的本质其实就是一个**围绕“代码”的生命周期管理系统**。它的核心目的只有三个：
1. **存代码**（安全、可靠地保存和追踪每一次变更）。
2. **改代码**（多人协作、审查，确保代码质量）。
3. **跑代码**（自动化测试、构建和部署）。


**Gitlab 数据存储方式：**
- 会将提交到仓库的代码或数据进行哈希值效验，哈希值相同则认为是同一个文件，进而不会进行二次上传（类似百度云盘上传文件的原理）；
- 然后将新的数据发起一个指针指向旧的哈希值与之相同的文件（新的文件和旧文件类似于软连接关系）；
  - 优点：节省了空间又加快了代码提交速度；
  - 缺点：如果旧的文件出现问题或被删除 那么依赖于它的新文件将无法使用；




## Gitlab 安装
参考文档：
- https://docs.gitlab.com/install/
- https://about.gitlab.cn/install/
- https://gitlab.com/gitlab-org/omnibus-gitlab/blob/master/README.md

### docker-compose
**1. 准备持久化目录**

首先，在宿主机上创建用于存放 GitLab 配置、日志和核心数据的目录：
```bash
sudo mkdir -p /srv/gitlab/config
sudo mkdir -p /srv/gitlab/logs
sudo mkdir -p /srv/gitlab/data
```

**2. 编写 `docker-compose.yml`**

```yaml {filename="/srv/gitlab/docker-compose.yml"}
version: '3.6'
services:
  gitlab:
    image: 'gitlab/gitlab-ce:18.6.6-ce.0'
    container_name: gitlab
    restart: always
    hostname: '10.0.0.96' # 替换为实际域名或宿主机IP
    environment:
      GITLAB_OMNIBUS_CONFIG: |
        # 外部访问的URL，如果是内网可以直接写IP，例如 'http://192.168.1.100'
        external_url 'http://10.0.0.96'
        
        # 设置正确的时区，确保代码提交时间和定时任务不出错
        gitlab_rails['time_zone'] = 'Asia/Shanghai'
        
        # 配置 SSH 克隆时显示的端口（与下方 ports 映射的 2222 对应）
        gitlab_rails['gitlab_shell_ssh_port'] = 2222
    ports:
      - '80:80'
      - '443:443'
      - '2222:22' # 映射容器内的22端口到宿主机的2222，防止与宿主机SSH冲突
    volumes:
      - '/srv/gitlab/config:/etc/gitlab'
      - '/srv/gitlab/logs:/var/log/gitlab'
      - '/srv/gitlab/data:/var/opt/gitlab'
    shm_size: '256m' # 官方建议值，防止高负载下崩溃
```

**3. 启动并获取初始密码**

```bash
cd /srv/gitlab
docker compose up -d
```
GitLab 的启动相对较慢（通常需要 2-5 分钟），可以通过 `docker logs -f gitlab` 观察启动日志。

当容器完全启动后，GitLab 会自动生成一个初始的 `root` 密码，可以通过以下命令查看：
```bash
sudo docker exec -it gitlab grep 'Password:' /etc/gitlab/initial_root_password
```
> (注意：这个文件会在 24 小时后自动删除，需尽快登录 Web 界面并修改 root 密码。)


### apt / yum

- https://mirrors.bfsu.edu.cn/gitlab-ce/
- https://mirrors.tuna.tsinghua.edu.cn/gitlab-ce/

```bash
# yum
yum -y install /usr/local/src/gitlab-ce-14.5.4-ce.0.el8.x86_64.rpm

# apt
apt install ./gitlab-ce_15.4.3-ce.0_amd64.deb
```

修改配置文件：

- 注意不同版本配置文件间的差异

```bash
# grep ^[^#] /etc/gitlab/gitlab.rb 
external_url 'http://gitlab.xiangzheng.com'
gitlab_rails['smtp_enable'] = true
gitlab_rails['smtp_address'] = "smtp.qq.com"
gitlab_rails['smtp_port'] = 465
gitlab_rails['smtp_user_name'] = "767483070@qq.com"
gitlab_rails['smtp_password'] = "ywkvhxiqjzrbbccb"
gitlab_rails['smtp_domain'] = "qq.com"
gitlab_rails['smtp_authentication'] = :login
gitlab_rails['smtp_enable_starttls_auto'] = true
gitlab_rails['smtp_tls'] = true
gitlab_rails['gitlab_email_from'] = "767483070@qq.com"
```

初始化：

- `gitlab-ctl reconfigure`

获取初始密码：

- 除非您在安装过程中指定了自定义密码，否则将随机生成一个密码并存储在 /etc/gitlab/initial_root_password 文件中(出于安全原因，24 小时后，此文件会被第一次 `gitlab-ctl reconfigure` 自动删除，因此若使用随机密码登录，建议安装成功初始登录成功之后，立即修改初始密码）
- 使用此密码和用户名 `root` 登录。

```bash
#安装完成后密码存放在此文件，获取密码后记得把文件删除，以防盗用
# cat /etc/gitlab/initial_root_password
...
Password: JU5s9BMVYz/D1KCfJ36DrSsDOVtLak3jbHtwccu/UtY= #密码，默认账号为root
...
```

启动gitlab：

```bash
gitlab-ctl start
```





## Gitlab 相关文件

```bash
/etc/gitlab # 配置文件目录
/etc/gitlab/gitlab.rb # gitlab主配置文件，由于是ruby语言研发，所以以.rb为后缀

/run/gitlab # 运行pid目录

/opt/gitlab # 安装目录

/var/opt/gitlab # 数据目录，开发上传的代码等内容

/var/log/gitlab # 日志目录
```







## Gitlab 配置文件说明

https://docs.gitlab.cn/jh/administration/pages/index.html

- 修改配置文件后执行`gitlab-ctl reconfigure`使其生效，注意不同版本配置文件间的差异
- /etc/gitlab/gitlab.rb

```sh
# 关键配置：

external_url 'http://gitlab.xiangzheng.com'

#可选邮件通知配置
gitlab_rails['smtp_enable'] = true
gitlab_rails['smtp_address'] = "smtp.163.com"
gitlab_rails['smtp_port'] = 465
gitlab_rails['smtp_user_name'] = "rootroot25@163.com"
gitlab_rails['smtp_password'] = "VJEIDQLAESKBVOTD"
gitlab_rails['smtp_domain'] = "163.com"
gitlab_rails['smtp_authentication'] = :login
gitlab_rails['smtp_enable_starttls_auto'] = true
gitlab_rails['smtp_tls'] = true
gitlab_rails['gitlab_email_from'] = "rootroot25@163.com"
#user["git_user_email"] = "rootroot25@163.com" #git账号的邮箱
```



## Gitlab cmd

### gitlab-backup

- gitlab备份命令

- 常用指令：

- ```bash
  create  #创建一个gitlab备份
  restore #从备份中恢复数据
  ```

### gitlab-ctl

- gitlab控制命令

- 常用指令：

- ```bash
  check-config # 检查配置文件语法
  reconfigure # 重新加载配置文件
  start # 启动gitlab
  status # 查看gitlab的运行状态
  stop # 停止gitlab的运行
  kill # 强制关闭gitlab所有服务
  ```

### gitlab-psql

- 管理gitlab中的PostgreSQL数据库



### gitlab-redis-cli

- 管理gitlab中的redis数据库



## Gitlab security

- 可以选择登录界面禁止注册，如果是在内网 允许注册也没关系，因为注册完成后需要gitlab管理员进行审核
  - 禁止注册：设置 --> 一般的 --> 注册限制选项中全部取消勾选(注意不要改错，不要改成禁止登陆）
  - 审核注册：登录管理员账号 --> 管理中心 --> 用户 --> 等待批准



## Gitlab fork branch

- 外部开发者可以将代码fork一份到自己的名称空间下，添加或修改代码等操作后再将代码发起合并请求，最后由被fork分支的管理员将代码进行合并，从而实现外部协同工作。




## Gitlab 用户和管理

- 创建不同的用户并分发不同的权限来实现安全管理

### 创建用户

- 以root身份登录 --> 菜单 --> 管理员 --> 概览 --> 用户 --> 新用户
  - ...
  - **访问类型**
    - 访问级别：普通（无论是devleader还是developer都只授予普通权限即可，对项目的权限管理可以在项目和群组中单独设置）
  - ...
  - 创建用户



### 创建群组

- 以root身份登录 --> 菜单 --> 管理员 --> 概览 --> 群组 --> 新建群组
  - ...
  - **可见性级别**：私有（群组及其项目只能由成员查看，更加安全）
  - **允许创建项目**：维护者？
  - **允许创建项目**：维护者？
  - ...
  - 创建群组



### 创建项目

- 以root身份登录 --> 菜单 --> 管理员 --> 概览 --> 项目 --> 新建项目
  - **创建新项目**：一般都是创建空白项目
  - ...
  - ...
  - **可见性级别**：私有（项目访问必须明确授予每个用户。 如果此项目是在一个群组中，群组成员将会获得访问权限。，更加安全）
  - ...
  - 新建项目



### 将用户添加到群组中

- 以root身份登录 --> 菜单 --> 管理员 --> 概览 --> 群组 --> 点击指定的群组(不点编辑)
  - 将用户加入到群组(如果这个群组有对应的项目 那么这个被添加的用户将会看到这个项目)



### 将群组添加到项目中

- 以root身份登录 --> 菜单 --> 管理员 --> 概览 --> 项目 --> 点击指定的项目(不点编辑)
  - 将群组添加到项目中（**一般devadmin授予Owner权限，devuser授予developer权限**）



### 角色权限说明

- http://10.0.0.38/help/user/permissions



### 用户管理注意事项

- 建议为了安全考虑 关闭登录界面注册功能(注意不要改错，不要改成禁止登陆）
- 创建用户时，不给开发创建组的权限(开发的leader可以给)
- 创建群组时，可见性级别要设为私有(特殊情况除外)
- 创建项目时，可见性级别要设为私有
- 当开发者离职或暂时无需使用账号时 可以将账号禁用(看情况而定)









## Gitlab 数据备份与恢复

- https://docs.gitlab.com/ee/raketasks/backup_restore.html
- https://docs.gitlab.cn/ee/raketasks/backup_restore.html
- https://docs.gitlab.cn/omnibus/settings/backups.html

## 备份和恢复前准备

- 安装rsync

```bash
# Debian/Ubuntu
sudo apt-get install rsync

# RHEL/CentOS
sudo yum install rsync
```



## 备份

### 备份存放路径

- 如果使用apt/yum安装，则默认存放在 `/var/opt/gitlab/backups `目录下

### 备份命令

- GitLab 12.2 及更高版本：`gitlab-backup create`

### 配置文件备份

- 出于安全考虑，`gitlab-backup create`命令不会备份以下文件，以下文件需手动备份：
  - `/etc/gitlab/gitlab-secrets.json`
  - `/etc/gitlab/gitlab.rb`
- 配置文件备份命令：
  - `gitlab-ctl backup-etc`（它将在 `/etc/gitlab/config_backup/` 中创建一个 tar 存档）
  - `gitlab-ctl backup-etc --backup-path <DIRECTORY>`（将备份放置在指定目录中。如果目录不存在，将创建该目录。推荐使用绝对路径。）

### 备份生存周期

https://docs.gitlab.cn/jh/raketasks/backup_restore.html#限制本地文件的备份生存期删除旧备份

- gitlab默认不会删除备份的文件，但是也可以通过定义配置文件的方式来指定备份的生存周期
- 注意：只有使用gitlab默认的备份文件名时以下参数才可生效
- 604800 seconds =  7 days

```sh
# vim /etc/gitlab/gitlab.rb
...
###! The duration in seconds to keep backups before they are allowed to be deleted
# gitlab_rails['backup_keep_time'] = 604800
...


# 使其生效
gitlab-ctl reconfigure
```





### 备份脚本参考

- backup_gitlab.sh

```bash
#!/bin/bash
/usr/bin/gitlab-ctl stop unicorn
/usr/bin/gitlab-ctl stop sidekiq
/usr/bin/gitlab-backup create
/usr/bin/gitlab-ctl backup-etc
/usr/bin/gitlab-ctl start unicorn
/usr/bin/gitlab-ctl start sidekiq
```



## 恢复

https://docs.gitlab.cn/jh/raketasks/backup_restore.html#恢复极狐gitlab

- 恢复前一定要保证Gitlab版本统一，否则可能会出现问题
- gitlab-rake gitlab:backup:restore BACKUP=/PATH/TO/BACKUP_FILE
- gitlab-backup restore BACKUP=/PATH/TO/BACKUP_FILE

### 新主机恢复

```bash
#gitlab在新主机部署过程省略...（注意版本一定要和之前备份的gitlab版本一致）
...

```



### 原主机恢复

```bash
#恢复前先停止gitlab服务
gitlab-ctl stop unicorn ; gitlab-ctl stop sidekiq

#恢复，如果备份文件移动到其他目录的话需要再移动回/var/opt/gitlab/backups目录下，如果恢复时提示文件找不到的话直接将.tar前面的内容负责即可
gitlab-rake gitlab:backup:restore 1634049833_2021_10_12_14.3.2_gitlab_backup.tar
#新命令，慎用，如果用老命令备份的话再用新命令恢复可能会出现问题
gitlab-backup restore 1634049833_2021_10_12_14.3.2_gitlab_backup.tar

#恢复后启动服务
gitlab-ctl start unicorn ; gitlab-ctl start sidekiq
```

# Gitlab 密码找回

- 下面以找回root的密码举例：

```bash
#进入控制台
gitlab-rails console

#查看是否有root用户
root = User.where(id: 1).first
=> #<User id:1 @root> #有则返回此信息

#修改密码为azheng123，注意！密码最少长度为8位
root.password = 'azheng123'
=> "azheng123" #成功则返回此信息

#确认密码
root.password_confirmation = 'azheng123'
=> "azheng123" #成功则返回此信息

#保存密码
root.save!
=> true #true表示成功

#推出控制台
exit
```

