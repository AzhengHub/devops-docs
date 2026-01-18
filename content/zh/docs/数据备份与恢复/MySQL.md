---
title: "MySQL"
---

## 一、前言

### 1. 备份文件类型与相关工具
MySQL 的备份**按文件类型**主要分为 **逻辑备份**（SQL 语句）和 **物理备份**（文件拷贝）。
- 逻辑备份适合数据量级小于 10G 的数据，相关工具有 mysqldump、mydumper（多线程，更快）。
- 物理备份适合数据量级非常大的数据，相关工具主要是 xtraBackup。

### 2. 备份方式与备份内容
而 MySQL 的备份方式主要是 **全量备份+增量备份+二进制日志** 共同实现。
- 全量备份就是将整个数据库完全备份下来
- 增量备份是在全量备份的基础上，做累加
- 二进制在生产环境中必须开启，用于记录全量或增量备份以后变化的数据，用于“基于时间点”的增量恢复。

除了数据，还需备份配置文件（通常位于 `/etc/my.cnf` 或 `/etc/mysql/my.cnf`）。


#### 2.1 备份方式最佳实践
1. **全量备份**：每周一次（XtraBackup）。
2. **增量备份**：每日一次（XtraBackup `--incremental`）。
3. **实时增量**：开启 Binlog 并实时同步/备份到远程存储。
这样在极端情况下，可以先通过物理备份快速“回血”，再通过 Binlog 精确恢复到故障前的最后一秒。

### 3. 关于数据恢复
数据恢复流程应为：
- 全量备份 --> 增量备份（增量一 -> 增量二 -> 增量N... ） --> 二进制日志（恢复全量或增量备份以后变化的数据）

---

## 二、注意事项

**版本问题：**
- MySQL 5.7 与 8.0 差异巨大，在跨版本恢复（如从 5.7 到 8.0）时使用 `XtraBackup` 不适合，需要使用 `mysqldump` 或 `mydumper` 逻辑备份。
- 使用不同的工具进行备份/恢复时，要注意版本兼容性，可通过以下命令验证版本：
  - `mysqldump -V`
  - `mydumper -V`
  - `xtrabackup -v`
  - 通常大版本号相同就行，例如5.7与8.0
  
**不要备份系统库：**
- MySQL 5.7 与 8.0有`information_schema`、`performance_schema`、`sys`、`mysql`。
- 这些库包含数据库元数据、权限信息等，备份时无需包含。

---

## 三、基于 mysqldump

使用 MySQL 自带的 `mysqldump` 工具。它会将数据导出为可读的 SQL 脚本。

* **优点：** 使用简单，恢复灵活（可跨平台、跨版本）。
* **缺点：** 数据量大时，备份和恢复速度极慢。

### 1. 安装 mysqldump
- 注意 mysqldump 的大版本要与 MySQL 服务器版本一致。
```bash
sudo apt-get install mysql-client
```

### 2. 使用 mysqldump 备份
#### 2.1 备份所有数据库
```bash
# --single-transaction: 对 InnoDB 引擎启用热备（不锁表）
# --master-data=2: 记录备份时的 Binlog 位置（用于搭建主从或增量恢复）
# --triggers --routines --events: 确保存储过程、触发器等一并备份
mysqldump -u root -p \
  --all-databases \
  --single-transaction \
  --master-data=2 \ 
  --triggers --routines --events \
  > /backup/mysql/full_backup_$(date +%F).sql
```

#### 2.2 备份单个数据库
```bash
# 备份单个数据库
mysqldump -u root -p --databases database_name \
  --single-transaction \
  --master-data=2 \
  --triggers --routines --events \
  > /backup/mysql/database_name_backup_$(date +%F).sql
```

### 3. 使用 mysqldump 恢复数据库
```bash
# 恢复所有数据库
mysql -u root -p < /backup/mysql/full_backup_2023-10-01.sql

# 恢复单个数据库
mysql -u root -p < /backup/mysql/database_name_backup_2023-10-01.sql
```



## 四、基于 XtraBackup

推荐使用 Percona 提供的开源工具 **XtraBackup**。它直接拷贝底层数据文件。

* **优点：** 备份恢复速度极快，支持热备（不影响业务读写）。
* **缺点：** 只能恢复到相同版本/架构的 MySQL，操作步骤相对复杂。

### 1. 安装 XtraBackup

```bash
# 安装 XtraBackup 8.0 版本（支持 MySQL 8.0）
sudo apt-get install percona-xtrabackup-80

# 或安装 XtraBackup 5.7 版本（支持 MySQL 5.7）
sudo apt-get install percona-xtrabackup-57
```


### 2. 使用 XtraBackup 进行全量+增量备份

```sh
# 假设每周一做全量，其余时间做增量

# 1. [周一] 全量备份
# 记录当前周的备份基准目录
xtrabackup --backup \
  --user=root --password='YOUR_PASSWORD' \
  --target-dir=/data/backups/$(date +%Y%W)_full

# 2. [周二] 第一次增量 (基于周一的全量)
xtrabackup --backup \
  --user=root --password='YOUR_PASSWORD' \
  --target-dir=/data/backups/$(date +%F)_inc \
  --incremental-basedir=/data/backups/$(date +%Y%W)_full

# 3. [周三至周日] 随后的增量 (基于前一天的增量)
# 注意：生产环境通常建议增量备份始终基于【全量】（优点是恢复快），
# 或者基于【前一天增量】（优点是占用空间小）。以下示例为基于前一天：
xtrabackup --backup \
  --user=root --password='YOUR_PASSWORD' \
  --target-dir=/data/backups/$(date +%F)_inc \
  --incremental-basedir=/data/backups/$(date -d "yesterday" +%F)_inc
```

**其他常见选项：**
- **--datadir**：指定 MySQL 数据目录（默认 `/var/lib/mysql`）。

#### 2.1 自动化全量+增量备份脚本
这个脚本会自动判断：如果是周一则进行全量备份，其他日期则进行增量备份。
```sh
#!/bin/bash

# 配置信息
USER="root"
PASSWORD="YOUR_PASSWORD"
BACKUP_ROOT="/data/backups"
DATE=$(date +%F)
WEEK_NUM=$(date +%Y%W)
DAY_OF_WEEK=$(date +%u) # 1-7，1是周一

# 路径定义
FULL_BACKUP_DIR="${BACKUP_ROOT}/${WEEK_NUM}_full"
INC_BACKUP_DIR="${BACKUP_ROOT}/${DATE}_inc"
PREV_DAY_DIR="${BACKUP_ROOT}/$(date -d "yesterday" +%F)_inc"
LOG_FILE="${BACKUP_ROOT}/backup.log"

exec >> "${LOG_FILE}" 2>&1

echo "--- 备份开始: $(date) ---"

if [ "$DAY_OF_WEEK" -eq 1 ] || [ ! -d "$FULL_BACKUP_DIR" ]; then
    echo "检测到周一或全量目录不存在，执行全量备份..."
    xtrabackup --backup --user=$USER --password=$PASSWORD --target-dir=$FULL_BACKUP_DIR
else
    # 判断增量备份的基准：如果昨天有增量则基于昨天，否则基于本周全量
    if [ -d "$PREV_DAY_DIR" ]; then
        BASE_DIR=$PREV_DAY_DIR
    else
        BASE_DIR=$FULL_BACKUP_DIR
    fi
    echo "执行增量备份，基准目录: $BASE_DIR"
    xtrabackup --backup --user=$USER --password=$PASSWORD --target-dir=$INC_BACKUP_DIR --incremental-basedir=$BASE_DIR
fi

if [ $? -eq 0 ]; then
    echo "备份成功完成: $DATE"
else
    echo "备份失败，请检查输出信息"
    exit 1
fi

echo "--- 备份结束: $(date) ---"
```

#### 2.1 定时自动备份
- 建议将备份安排在业务低峰期（如凌晨 2 点）。
- 执行 crontab -e 编辑定时任务，然后添加以下行：
```sh
# 每天凌晨 2:00 执行备份脚本
00 02 * * * /bin/bash /root/scripts/mysql_backup.sh > /dev/null 2>&1

# 可选：定期清理 30 天前的旧备份（防止磁盘爆满）
00 04 * * * find /data/backups/ -mtime +30 -exec rm -rf {} \;
```


### 3. 使用 XtraBackup 恢复

在“每周一全量 + 每日一增量”的模式下，恢复的核心逻辑是：**先将全量备份作为基准，然后按顺序将每一天的增量“合并”到基准中，最后统一执行 Prepare。**

假设在周四数据库宕机，需要恢复数据，你的备份目录如下：

* `base` (周一的全量)
* `inc1` (周二的增量)
* `inc2` (周三的增量)

#### 3.1 准备全量备份
首先，需要对全量备份进行处理，但由于后面还要合并增量，必须加上 --apply-log-only 参数。这告诉工具：只应用已提交的事务，不要回滚未提交的事务（因为未提交的事务可能在后续的增量包里）。
```sh
xtrabackup --prepare --apply-log-only --target-dir=/data/backups/base
```
#### 3.2 合并增量备份

按照时间顺序，将每一个增量包逐个合并到 `base` 目录中。

```bash
# 合并周二的增量：
xtrabackup --prepare --apply-log-only --target-dir=/data/backups/base \
  --incremental-dir=/data/backups/inc1

# 合并周三的增量（最后一个增量）：
```bash
xtrabackup --prepare --target-dir=/data/backups/base \
  --incremental-dir=/data/backups/inc2
```
> 如果是最后一个增量包，建议**去掉** `--apply-log-only`，这样工具会进行完整的回滚操作，使数据达到最终一致状态。

#### 3.3 运行整体 Prepare
为了万无一失，在合并完所有增量后，对 `base` 目录执行一次标准的 Prepare：

```bash
xtrabackup --prepare --target-dir=/data/backups/base
```

#### 3.4 恢复回原目录
```sh
# 1. 停止服务
sudo systemctl stop mysql

# 2. 备份并清空原数据目录
sudo mv /var/lib/mysql /var/lib/mysql_old
sudo mkdir /var/lib/mysql

# 3. 拷贝备份（--target-dir 表示备份目录，--datadir 表示数据目录）
xtrabackup --copy-back --target-dir=/data/backups/base --datadir=/var/lib/mysql

# 4. 修改权限归属为 mysql 用户
sudo chown -R mysql:mysql /var/lib/mysql

# 5. 启动服务
sudo systemctl start mysql
```

#### 3.5 使用 mysqlbinlog 工具重放二进制日志
物理恢复只能回到**最后一次增量备份（周三凌晨）**的时间点。要追回周三到周四宕机前的“实时数据”，必须依赖二进制日志。
##### 3.5.1 确定恢复起点
在合并完所有增量并完成 copy-back 后，查看最后一个增量包（即 inc2）中的位置信息：
```sh
# 每次 XtraBackup 备份完成后，目录里都会生成一个 xtrabackup_binlog_info 文件，其中包含备份时刻对应的 Binlog 文件名和 Pos 节点，可以根据这个文件来恢复剩余数据。
cat /data/backups/inc2/xtrabackup_binlog_info

# 输出示例：mysql-bin.000015  120
```
- **注意：必须查看最后一个增量包里的文件，因为它代表了物理备份链条的终点。**

##### 3.5.2 导出并重放日志
使用 mysqlbinlog 将该位置之后的所有操作导出为 SQL 并作用于数据库：

```sh
# --start-position 对应上面查到的 120
# /var/lib/mysql/mysql-bin.000015 是你最后的日志文件
mysqlbinlog --start-position=120 /var/lib/mysql_old/mysql-bin.000015 \
  | mysql -u root -p
```

如果跨越了多个 Binlog 文件（例如从 015 到了 016），则按顺序填入：
```sh
mysqlbinlog --start-position=120 /var/lib/mysql_old/mysql-bin.000015 /var/lib/mysql_old/mysql-bin.000016 \
  | mysql -u root -p
```

{{% alert title="<i class='fa-solid fa-info-circle pe-1'></i> 提示" color="info" %}}
如果 MySQL 开启了 GTID，mysqlbinlog 命令可以不用指定 position，直接使用 --skip-gtids 或自动定位更加安全。
{{% /alert %}}

---

## 五、自动化备份

建议编写脚本并通过 Crontab 定时执行。为了安全，建议将密码写入配置文件，而不是明文写在命令中。

**1. 创建认证文件 `~/.my.cnf**`**

```ini
[mysqldump]
user=root
password=Password

```

*设置权限：`chmod 600 ~/.my.cnf*`

**2. 添加定时任务 (Crontab)**

```bash
sudo crontab -e

```

```bash
# 每天凌晨 3 点执行全量逻辑备份
0 3 * * * mysqldump --defaults-extra-file=/root/.my.cnf --all-databases --single-transaction | gzip > /data/backups/mysql_$(date +\%F).sql.gz

# 建议添加清理脚本，删除 7 天前的备份文件
# 0 4 * * * find /data/backups/ -name "*.sql.gz" -mtime +7 -delete

```
