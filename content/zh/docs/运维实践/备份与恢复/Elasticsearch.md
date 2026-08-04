---
title: "Elasticsearch"
weight: 40
---

## 一、前言
Elasticsearch 的数据安全至关重要。本文档详细整理了两种主流的生产级备份与恢复方案，分别适用于不同的业务场景和数据规模：

1. **方案一：Elasticdump（轻量级迁移/备份）**
  - **原理**：通过 API 抓取数据并导出为 JSON 文件。
  - **适用场景**：数据量较小（GB 级以下）、单索引迁移、跨版本/跨集群迁移、无需复杂环境配置的场景。
  - **特点**：部署简单，但备份和恢复速度较慢。

2. **方案二：Snapshot 快照（生产级灾备）**
  - **原理**：基于文件系统的物理增量备份（官方推荐）。
  - **适用场景**：海量数据（TB/PB 级）、集群全量备份、定时自动化灾备。
  - **特点**：备份/恢复速度极快（直接复制底层文件），支持增量，但需要配置共享存储（如 NFS、S3）。


## 三、注意事项
**跨版本恢复**：
- 快照只能恢复到**相同版本**或**更高版本**的 ES 中；
- 在将低版本数据恢复到高版本 ES 时（例如 ES 7.10 的快照 -> 恢复到 ES 8.x）通常可以，但跨大版本还是需查阅官方迁移指南。

**索引别名**：
- 如果索引有别名，恢复后需要手动添加别名。

**索引副本数**：
- 如果新旧集群架构不同（例如：旧集群是 5 个节点，新集群只有 1 个节点），直接恢复可能会导致索引变成红色（Red），因为副本数（Replicas）无法满足。可以在恢复时动态修改索引设置：
```sh
# 示例：恢复时强制将副本数设为 0（适合单节点新集群）
curl -X POST "New_ES_IP:9200/_snapshot/nfs_backup/outer/_restore?pretty" -H 'Content-Type: application/json' -d'
{
  "indices": "mtproxy,chat,user...",
  "include_global_state": false,
  "index_settings": {
    "index.number_of_replicas": 0
  }
}
'
```

## 三、使用 elasticdump
### 1. 安装 elasticdump
- 在能连通 ES 集群的机器安装
```bash
# 1. 安装 npm
apt-get install -y nodejs npm

# 2. 全局安装 elasticdump
npm install elasticdump -g

# 3. 验证安装
elasticdump --version
```

### 2. 备份数据

#### 2.1 准备备份脚本
```sh {filename="backup_es.sh"}
#!/bin/bash

# --- 0. 默认配置 ---
DEFAULT_ES_URL="http://172.16.30.111:9200"
DEFAULT_ROOT_DIR="/root/es_backup"

# --- 1. 交互式输入 ES 地址 ---
echo "----------------------------------------"
read -p "请输入 ES 地址 [默认: ${DEFAULT_ES_URL}]: " USER_ES_URL
ES_URL=${USER_ES_URL:-$DEFAULT_ES_URL}

# --- 2. 交互式输入索引名 ---
read -p "请输入要备份的 Index 名称 (例如 message): " INDEX_NAME

# 如果输入为空，则退出
if [ -z "$INDEX_NAME" ]; then
    echo "❌ 错误: 索引名不能为空！"
    exit 1
fi

# --- 3. 交互式输入备份目录 ---
# 定义默认完整路径
DEFAULT_FULL_PATH="${DEFAULT_ROOT_DIR}/${INDEX_NAME}"

read -p "请输入保存目录 [默认: ${DEFAULT_FULL_PATH}]: " USER_DIR
BACKUP_DIR=${USER_DIR:-$DEFAULT_FULL_PATH}

# --- 4. 确认与准备 ---
LOG_FILE="${BACKUP_DIR}/backup_${INDEX_NAME}.log"

echo "----------------------------------------"
echo "🚀 任务概览:"
echo "   ES 地址:  ${ES_URL}"
echo "   目标索引: ${INDEX_NAME}"
echo "   保存路径: ${BACKUP_DIR}"
echo "   日志文件: ${LOG_FILE}"
echo "----------------------------------------"

# 创建目录
mkdir -p "$BACKUP_DIR"
if [ $? -ne 0 ]; then
    echo "❌ 错误: 无法创建目录 $BACKUP_DIR"
    exit 1
fi

# --- 5. 开始备份 Mapping (前台运行，很快) ---
echo "Step 1/2: 正在备份 Mapping..."
elasticdump \
  --input="${ES_URL}/${INDEX_NAME}" \
  --output="${BACKUP_DIR}/${INDEX_NAME}_mapping.json" \
  --type=mapping \
  --quiet

if [ $? -eq 0 ]; then
    echo "✅ Mapping 备份成功"
else
    echo "❌ Mapping 备份失败，停止后续任务。"
    exit 1
fi

# --- 6. 自动后台化 (Tmux Auto-Detach) ---
echo "Step 2/2: 准备备份 Data..."

if [ -n "$TMUX" ]; then
    echo "----------------------------------------"
    echo "✨ 检测到 Tmux 环境！"
    echo "👋 脚本将在 10秒后 自动将本会话挂起至后台 (Detach)。"
    echo "   备份任务将继续运行，你可以放心去处理别的事情。"
    echo "   如果想查看进度，请稍后执行: tmux attach"
    echo "   或者直接查看日志: tail -f ${LOG_FILE}"
    echo "----------------------------------------"
    sleep 10
    # 核心魔法：将当前客户端从 tmux 会话中断开，但保持会话运行
    tmux detach
else
    echo "⚠️ 未检测到 Tmux 环境，将继续在前台运行..."
    echo "   (如果你关闭这个窗口，备份可能会中断！)"
fi

# --- 7. 开始备份 Data (后台/隐身运行) ---
# 注意：我们把输出重定向到了日志文件，防止在这里输出没人看
echo "[$(date)] 开始备份 Data..." > "$LOG_FILE"

elasticdump \
  --input="${ES_URL}/${INDEX_NAME}" \
  --output="${BACKUP_DIR}/${INDEX_NAME}_data.json" \
  --type=data \
  --limit=1000 \
  --scrollTime=20m \
  --fileSize=1gb \
  --ignore-errors=true \
  --fsCompress=true  >> "$LOG_FILE" 2>&1

# 检测备份是否成功
if grep -q "dump complete" "$LOG_FILE"; then
    echo "" >> "$LOG_FILE"
    echo "========================================" >> "$LOG_FILE"
    echo "[$(date)] ✅ 检测到 'dump complete'，备份成功！" >> "$LOG_FILE"
    
    # 成功了才记录版本
    VERSION_FILE="${BACKUP_DIR}/version.txt"
    echo "Index: $INDEX_NAME" > "$VERSION_FILE"
    echo "Date: $(date)" >> "$VERSION_FILE"
    curl -s "$ES_URL" >> "$VERSION_FILE"
else
    echo "" >> "$LOG_FILE"
    echo "========================================" >> "$LOG_FILE"
    echo "[$(date)] ❌ 未检测到 'dump complete'，备份失败！" >> "$LOG_FILE"
    echo "请检查上方日志中的报错信息。" >> "$LOG_FILE"
fi
```

#### 2.2 使用备份脚本
1. **新建 Tmux 会话**：
```bash
tmux new -s es_backup_message
```

2. **运行脚本**：
```bash
bash backup_es.sh
```


3. **按提示输入**：
* ES 地址：(直接回车用默认)
* 索引名：`message`
* 备份目录：`/root/es_backup/message`

10秒后脚本会退出到后台自动执行备份任务。

#### 2.3 查看后台进度

```bash
tail -f /root/es_backup/message/backup_message.log

```

### 3. 恢复数据
- 备份文件示例：
```sh
$ ll -h  es_backup/user/
total 253M
drwxr-xr-x 2 root root 4.0K Jan 16 17:54 ./
drwxr-xr-x 3 root root 4.0K Jan 16 17:46 ../
-rw-r--r-- 1 root root 2.6M Jan 16 17:54 backup_user.log
-rw-r--r-- 1 root root 120M Jan 16 17:50 user_data.split-0.json.gz
-rw-r--r-- 1 root root 121M Jan 16 17:54 user_data.split-1.json.gz
-rw-r--r-- 1 root root 9.2M Jan 16 17:54 user_data.split-2.json.gz
-rw-r--r-- 1 root root 1018 Jan 16 17:46 user_mapping.json
```

* **`user_mapping.json`**: 索引的结构。
* **`user_data.split-*.json.gz`**: 数据文件，而且自动切分成了 3 个文件（0, 1, 2），并且是压缩格式 (`.gz`)。



#### 4.1 恢复索引结构
```bash
# 进入到备份文件所在的目录：
cd /root/es_backup/user/

# 修改为实际要恢复的目标 ES 地址
export TARGET_ES="http://172.16.30.111:9200"
export INDEX_NAME="user"

# 恢复索引结构
elasticdump \
  --input=./${INDEX_NAME}_mapping.json \
  --output=${TARGET_ES}/${INDEX_NAME} \
  --type=mapping
```

#### 4.2 恢复数据

恢复脚本通过`for`循环一次导入`.gz`压缩包，`elasticdump` 会自动识别 `.gz` 后缀并解压，不需要手动解压。

```bash {file=restore_es_data.sh}
# 获取所有分割的数据文件，并按顺序排序
DATA_FILES=$(ls ${INDEX_NAME}_data.split-*.json.gz | sort -V)

echo "准备恢复以下文件:"
echo "$DATA_FILES"
echo "--------------------------------"

for file in $DATA_FILES; do
    echo "⬇️  正在导入文件: $file ..."
    
    elasticdump \
      --input=./$file \
      --output=${TARGET_ES}/${INDEX_NAME} \
      --type=data \
      --limit=2000 \
      --fsCompress=true \
      --quiet
      
    if [ $? -eq 0 ]; then
        echo "✅ $file 导入成功"
    else
        echo "❌ $file 导入失败，请检查！"
        # 遇到错误停止，防止数据错乱
        break
    fi
done

echo "🎉 所有数据恢复完成！"

```

---

## 四、使用 Snapshot
这是一个基于 NFS 实现 Elasticsearch 快照（Snapshot）备份的详细生产级方案。

使用 NFS 作为快照仓库（Repository）是 ES 官方支持的方案，类型为 `fs` (Shared File System)。核心要求是**集群中的每一个节点**都必须能挂载并访问到同一个 NFS 路径。

以下是分步实施指南：

### 1. 前期准备
#### 1.1 准备 NFS
```sh
# NFS 部署过程省略

# 映射 NFS 共享目录到 ES 节点的本地目录
echo '/data/backup 172.16.0.0/18(rw,no_root_squash)' >> /etc/exports

# 导出 NFS 共享目录
exportfs -r

# 验证 NFS 导出
exportfs -v

# 在 NFS 服务端更改目录所有者为 elasticsearch 用户 (假设 UID:GID 是 elasticsearch:elasticsearch)
chown -R elasticsearch:elasticsearch /data/backup
```
> **测试权限：** 在 ES 所有节点切换到 elasticsearch 用户 (`su - elasticsearch`) 尝试在 `/mnt/es_backup` 下 `touch` 一个文件，成功则说明权限无误。


#### 1.2 ES 所有节点挂载 NFS

- 在 es 集群的**每一个节点**上执行挂载操作, 假设 NFS 服务端地址是 `172.16.0.138`，共享目录是 `/data/backup`，本地挂载点设为 `/mnt/es_backup`。

**在所有节点执行：**

```bash
# 1. 创建本地挂载点
mkdir -p /mnt/es_backup

# 2. 安装 NFS 客户端 (以 CentOS/RHEL 为例)
yum install -y nfs-utils

# 3. 挂载 NFS
mount -t nfs 172.16.0.138:/data/backup /mnt/es_backup

# 4. 验证挂载
df -h | grep es_backup

# 5. 配置开机自动挂载，防止服务器重启后备份失败。
echo "172.16.0.138:/data/backup /mnt/es_backup nfs defaults 0 0" >> /etc/fstab
```

---

#### 1.3 修改 ES 配置
- 告知 ES 允许将快照写入哪个路径。在**所有节点**的配置文件 `elasticsearch.yml` 中，添加 `path.repo` 参数。

```yaml
path.repo: ["/mnt/es_backup"]
```

- 修改配置文件后，一次重启一个节点，并等待集群变绿后再重启下一个。


#### 1.4 准备快照仓库
##### 1.4.1 创建快照仓库
```sh
curl -X PUT "127.0.0.1:9200/_snapshot/nfs_backup?pretty" -H 'Content-Type: application/json' -d'
{
  "type": "fs",
  "settings": {
    "location": "/mnt/es_backup",
    "compress": true,
    "max_snapshot_bytes_per_sec": "40mb", 
    "max_restore_bytes_per_sec": "40mb"
  }
}
'
```
* `location`: 对应 NFS 挂载路径（可以是相对 `path.repo` 的路径）。
* `compress`: 开启压缩（推荐）。
* `max_snapshot_bytes_per_sec`: 限制备份速度，防止占用过多磁盘 IO 和网络带宽影响业务（根据 NFS 性能调整）。


##### 1.4.3 查询快照仓库

```bash
# 查看仓库配置详情（JSON格式），可以看到仓库类型（type）、NFS 路径（location）等详细配置：
curl -X GET "127.0.0.1:9200/_snapshot/_all?pretty"

# 查看仓库列表（表格格式），如果仓库很多，这个命令更直观，只显示仓库名和类型：
curl -X GET "127.0.0.1:9200/_cat/repositories?v"
```

### 2. 备份数据
#### 2.1 手动执行一次备份

这条命令会创建一个名为 `tor_*` 的快照，只包含 `tor_*` 开头的索引。

```bash
# 备份 i2p 索引到 i2p 快照中
curl -X PUT "127.0.0.1:9200/_snapshot/nfs_backup/i2p?pretty" -H 'Content-Type: application/json' -d'
{
  "indices": "i2p",
  "ignore_unavailable": true,
  "include_global_state": false
}
'

# 备份 tor_20 开头的索引到 tor_20xx 快照中
curl -X PUT "127.0.0.1:9200/_snapshot/nfs_backup/tor_20xx?pretty" -H 'Content-Type: application/json' -d'
{
  "indices": "tor_20*",
  "ignore_unavailable": true,
  "include_global_state": false
}
'

# 备份 mtproxy,chat,user 等索引到 outer 快照中
curl -X PUT "127.0.0.1:9200/_snapshot/nfs_backup/outer?pretty" -H 'Content-Type: application/json' -d'
{
  "indices": "mtproxy,chat,user,chat_member,need_download_file,obfs4,snowflake,generalbridge",
  "ignore_unavailable": true,
  "include_global_state": false
}
'
```

* **`indices`**: 指定只备份 `tor_*`。
* **`ignore_unavailable`**: 如果某个 `tor_` 索引处于关闭或缺失状态，跳过它而不报错。
* **`include_global_state`**: 设置为 `false`（推荐），表示不备份集群设置和模板，只备份数据本身。


#### 2.2 自动备份

手动备份容易遗忘，生产环境强烈建议使用 **Snapshot Lifecycle Management (SLM)** 进行自动化管理。
- 自动备份下，第一次备份会备份所有索引，后续备份只会备份有变化的索引。即第一次全量，后续增量。

以下策略每天凌晨 1:30 执行备份，保留最近 30 天的快照。

```json
PUT /_slm/policy/daily-snapshots
{
  "schedule": "0 30 1 * * ?", 
  "name": "<daily-snap-{now/d}>", 
  "repository": "my_nfs_backup",
  "config": {
    "indices": ["*"], 
    "ignore_unavailable": true,
    "include_global_state": false
  },
  "retention": {
    "expire_after": "30d", 
    "min_count": 5, 
    "max_count": 50 
  }
}

```
* `schedule`: Cron 表达式。
* `indices`: 这里是 `*` 备份所有索引，也可以指定如 `tor_*`。
* `retention`: 自动清理过期快照。

#### 2.3 查看备份进度/结果

执行上面的命令后，ES 会立即返回 `{ "accepted" : true }`，备份在后台运行。您可以通过以下命令查看状态：

```bash
# 查看 outer 快照状态详情（包括创建时间等）
curl "127.0.0.1:9200/_snapshot/nfs_backup/outer?pretty"
# state 为 IN_PROGRESS 表示正在备份中，SUCCESS 表示备份完成。

# 查看所有快照简要状态
curl "127.0.0.1:9200/_cat/snapshots/nfs_backup?v"

# 或者查看所有当前正在运行的备份任务（但备份完成的任务这里不会展示）
curl -s "127.0.0.1:9200/_snapshot/nfs_backup/_current" | jq .
```



### 3. 恢复数据

#### 3.1 恢复并重命名 (用于测试)

不覆盖现有数据，将 `user` 恢复为 `user-test`。

```sh
# 假设仓库名为 nfs_backup
curl -X POST "127.0.0.1:9200/_snapshot/nfs_backup/outer/_restore?pretty" -H 'Content-Type: application/json' -d'
{
  "indices": "user",
  "ignore_unavailable": true,
  "include_global_state": false,
  "rename_pattern": "user",
  "rename_replacement": "user-test"
}
'
```
- `"indices": "user"`: 指定只从快照中提取 `user` 这一个索引（如果不写这行，会试图恢复快照里的所有索引）。
- `"rename_pattern": "user"`: 这是正则表达式，匹配索引名称。这里要精确匹配 `user`。
- `"rename_replacement": "user-test"`: 将匹配到的名称替换为 `user-test`。


#### 3.2 恢复某个误删的索引

```sh
# 假设仓库名为 nfs_backup，从 outer 快照中恢复 user 索引
curl -X POST "127.0.0.1:9200/_snapshot/nfs_backup/outer/_restore?pretty" -H 'Content-Type: application/json' -d'
{
  "indices": "user",
  "ignore_unavailable": true,
  "include_global_state": false
}'

```

#### 3.3 恢复到全新的es集群
大体逻辑：新集群必须能“看到”旧集群生成的 NFS 文件，并将其注册为自己的仓库，然后执行 Restore 指令。下面是实现流程概述：
1. 在所有新 ES 节点，安装了 NFS 客户端，并挂载同一个 NFS 路径。
```sh
  # 1. 安装客户端
  yum install -y nfs-utils

  # 2. 创建目录
  mkdir -p /mnt/es_backup

  # 3. 挂载 (确保 IP 能通)
  mount -t nfs 172.16.0.138:/data/backup /mnt/es_backup

  # 4. 验证权限 (切到 es 用户测试读取)
  su - elasticsearch -c "ls /mnt/es_backup"
```

2. 在所有新 ES 节点的 elasticsearch.yml 中添加相同的 path.repo 配置：
```yaml
# 修改配置文件后，重启新集群
path.repo: /mnt/es_backup
```

3. 注册快照仓库，新集群启动后，它还不知道去哪里找快照。因此需要注册一个同名的仓库（或者起个新名字，指向同一个路径）。
```sh
# 在 Kibana Dev Tools 或任意新节点执行：
curl -X PUT "New_ES_IP:9200/_snapshot/nfs_backup?pretty" -H 'Content-Type: application/json' -d'
{
  "type": "fs",
  "settings": {
    "location": "/mnt/es_backup",
    "compress": true,
    "readonly": true 
  }
}
'

# "readonly": true 设为只读，防止新集群误操作覆盖了旧集群的备份文件。
```

4. 验证仓库是否连接成功：
```sh
# 查看仓库状态
curl "127.0.0.1:9200/_snapshot/nfs_backup?pretty?v"

# 确保 "state": "SUCCESS" 表示连接成功。  
```

5. 执行恢复
```sh
# 将快照中的 i2p 索引恢复到新集群。
curl -X POST "New_ES_IP:9200/_snapshot/nfs_backup/i2p/_restore?pretty" -H 'Content-Type: application/json' -d'
{
  "indices": "i2p",
  "ignore_unavailable": true,
  "include_global_state": false
}
'

# 恢复所有 tor_20* 开头的索引。
curl -X POST "New_ES_IP:9200/_snapshot/nfs_backup/tor_20xx/_restore?pretty" -H 'Content-Type: application/json' -d'
{
  "indices": "tor_20*",
  "ignore_unavailable": true,
  "include_global_state": false
}
'

# 恢复 outer 快照 (mtproxy, chat, user 等其他业务索引)
curl -X POST "New_ES_IP:9200/_snapshot/nfs_backup/outer/_restore?pretty" -H 'Content-Type: application/json' -d'
{
  "indices": "mtproxy,chat,user,chat_member,need_download_file,obfs4,snowflake,generalbridge",
  "ignore_unavailable": true,
  "include_global_state": false
}
'
```

### 4. 验证恢复进度
- 命令执行后，ES 会在后台进行恢复。可以用以下命令检查 user-test 是否出现以及数据量是否一致：
```sh
# 查看正在进行中的恢复任务：
curl -X GET "New_ES_IP:9200/_cat/recovery?v&active_only=true"

# 查看恢复进度条
curl "127.0.0.1:9200/_cat/recovery/user-test?v"

# 对比 user 和 user-test 的 docs.count（文档数量）是否一致
curl "127.0.0.1:9200/_cat/indices/user*?v&s=index"

# 检查分片具体状态，State 正常应该是 STARTED。
curl "127.0.0.1:9200/_cat/shards/user-test?v"

# 检查分片分配详情，确认是否正常分配到节点
curl "127.0.0.1:9200/_cluster/allocation/explain?pretty" -H 'Content-Type: application/json' -d'
{
  "index": "user-test",
  "shard": 0,
  "primary": true
}
'

# 查看索引健康度，当恢复完成后，索引应该变绿（或黄，如果是单节点副本设置问题）。
curl -X GET "New_ES_IP:9200/_cat/indices?v"
```

### 4. 通过 Kibana 管理快照
通过 curl 调用 es 接口虽然可行，但如果安装了 Kibana，将更便于对 es 的整体管理：

- **访问地址**: 通常是 `http://IP:5601`
- **路径**:
  1. 点击左侧菜单底部的 **Stack Management** (堆栈管理)。
  2. 在 "Data" (数据) 板块下找到 **Snapshot and Restore** (快照与恢复)。

- **功能**:
  - **Snapshots 标签页**: 列出所有快照，可以直接看到 **Storage size** (存储大小)、状态、包含索引数。
  - **Repositories 标签页**: 管理 NFS 仓库。
  - **Policies 标签页**: 图形化配置 SLM (自动备份策略)，不用写 Cron 表达式。
  - **Restore**: 直接点击快照右边的“恢复”按钮，在网页上选要恢复哪个索引，还能重命名，非常方便。
