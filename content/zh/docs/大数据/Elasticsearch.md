---
title: "Elasticsearch"
---

## Elasticsearch 概述

https://www.elastic.co/cn/

Elasticsearch 基于 JAVA 开发，是一个高度可扩展的开源全文搜索和分析引擎，它可实现数据的实时全文搜索、支持分布式可实现高可用、提供API接口，可以处理大规模的日志数据，比如nginx、tomcat、系统日志等功能。

### 特点

- 实时搜索、实时分析

- 分布式架构、实时文件存储

- 文档导向、所有对象都是文档

- 高可用、易扩展、支持集群、分片与复制

- 接口友好、支持json



### 相关端口

```sh
TCP/9200 # ES节点和外部通讯使用 (与Logstash和Beats)
TCP/9300 # ES节点之间通讯使用 (ES集群节点通信)
```





- 



### Master & Slave节点



## Elasticsearch 部署

### 容器单机部署

**参考文档：**

- https://www.elastic.co/guide/en/elasticsearch/reference/current/docker.html

- https://hub.docker.com/_/elasticsearch

#### 拉取镜像

```bash
docker pull elasticsearch:8.2.3
```

#### 创建名为 net-elk 的自定义网络

```bash
docker network create net-elk #也可以指定子网
```

#### 查看创建的自定义网络

```json
# docker network inspect net-elk 
[
    {
        "Name": "net-elk",
        "Id": "62de484ebfaf926d7ad6381929ab61b9599067bf30c44b3f291328fa1d9ba8c7",
        "Created": "2022-06-17T18:47:41.932380131+08:00",
        "Scope": "local",
        "Driver": "bridge",
        "EnableIPv6": false,
        "IPAM": {
            "Driver": "default",
            "Options": {},
            "Config": [
                {
                    "Subnet": "172.18.0.0/16", 
                    "Gateway": "172.18.0.1"
                }
            ]
        },
        "Internal": false,
        "Attachable": false,
        "Ingress": false,
        "ConfigFrom": {
            "Network": ""
        },
        "ConfigOnly": false,
        "Containers": {},
        "Options": {},
        "Labels": {}
    }
]
```

#### 启动镜像

```bash
docker run -d --restart always --name es-node-1 --net net-elk -p 9200:9200 -p 9300:9300 elasticsearch:8.2.3
```

#### 为elastic用户重置密码

- 此命令帮助：https://www.elastic.co/guide/en/elasticsearch/reference/current/reset-password.html

```bash
docker exec -it es01 bash

#重置密码
elasticsearch@1c2f45f655bf:~$ bin/elasticsearch-reset-password -u elastic
...
Please confirm that you would like to continue [y/N]y
...
New value: y+3X8J1_l8FUDJoLyZKu #新的密码
```

#### 生成令牌

```bash
docker exec -it es01 bash

elasticsearch@1c2f45f655bf$ /usr/share/elasticsearch/bin/elasticsearch-create-enrollment-token -s kibana
eyJ2ZXIiOiI4LjIuMyIsImFkciI6WyIxNzIuMTguMC4yOjkyMDAiXSwiZmdyIjoiOTU1YzQ4MjUwYzMxYjJkMjZjNTY4MTExNGY4Y2E2NmQ5MmY4ZmI2NzBkZjRmMDIxN2Y2ZWU5NzkwZDVjMjQwNSIsImtleSI6Im9qMndjWUVCdVIxUjdkWEd3TmNzOkRVMWpLZHdJU2RlMjhyaGJyVHZPSHcifQ==
```

#### 将证书复制到本机

```bash
docker cp es-node-1:/usr/share/elasticsearch/config/certs/http_ca.crt .

# ll http_ca.crt 
-rw-rw---- 1 root root 1915 Jun 17 19:47 http_ca.crt
```

#### 测试访问

```bash
curl --cacert http_ca.crt -u elastic https://localhost:9200

# curl --cacert http_ca.crt -u elastic https://localhost:9200
Enter host password for user 'elastic': #输入之前重置的密码
{
  "name" : "1c2f45f655bf",
  "cluster_name" : "docker-cluster",
  "cluster_uuid" : "ypwxIEZ9T_mL69tU53aRlQ",
  "version" : {
    "number" : "8.2.3",
    "build_flavor" : "default",
    "build_type" : "docker",
    "build_hash" : "9905bfb62a3f0b044948376b4f607f70a8a151b4",
    "build_date" : "2022-06-08T22:21:36.455508792Z",
    "build_snapshot" : false,
    "lucene_version" : "9.1.0",
    "minimum_wire_compatibility_version" : "7.17.0",
    "minimum_index_compatibility_version" : "7.0.0"
  },
  "tagline" : "You Know, for Search"
}
```







### docker-compose.yml

elasticsearch + kibana

```yml
version: '3.1'
services:
  elasticsearch:
    image: elasticsearch:8.13.4
    container_name: elasticsearch
    privileged: true
    environment:
      - "cluster.name=elasticsearch"
      - "discovery.type=single-node"
      - "ES_JAVA_OPTS=-Xms1024m -Xmx4096m"
      - "bootstrap.memory_lock=true"
      - "xpack.security.enabled=false"
    volumes:
      - /data/elasticsearch/plugins:/usr/share/elasticsearch/plugins
      - /data/elasticsearch/data:/usr/share/elasticsearch/data
      - /data/elasticsearch/logs:/usr/share/elasticsearch/logs
    ports:
      - 9200:9200
      - 9300:9300
    user: "1000:1000"
    deploy:
     resources:
        limits:
           cpus: "8"
           memory: 4096M
        reservations:
           memory: 1024M
    networks:
      - elastic_net
  kibana:
    image: kibana:8.13.4
    container_name: kibana
    depends_on:
      - elasticsearch # kibana在elasticsearch启动之后再启动
    environment:
      ELASTICSEARCH_HOSTS: http://elasticsearch:9200 # 设置访问elasticsearch的地址
      I18N_LOCALE: zh-CN
    ports:
      - 5601:5601
    networks:
      - elastic_net

networks:
  elastic_net:
    driver: bridge
```



## Elasticsearch 配置文件

### elasticsearch.yml

- 集群相关配置文件
- /etc/elasticsearch/elasticsearch.yml

```bash
# ---------------------------------- Cluster -----------------------------------
#
# Use a descriptive name for your cluster:
#
cluster.name: my-application  #集群名称，在所有节点必须保持一致
#
# ------------------------------------ Node ------------------------------------
#
# Use a descriptive name for the node:
#
node.name: node-1 #每个集群节点名称必须不同
#
# Add custom attributes to the node:
#
#node.attr.rack: r1
#
# ----------------------------------- Paths ------------------------------------
#
# Path to directory where to store the data (separate multiple locations by comma):
#
path.data: /data/esdata #ELK数据存放路径
#
# Path to log files:
#
path.logs: /var/log/elasticsearch
#
# ----------------------------------- Memory -----------------------------------
#
# Lock the memory on startup:
#
bootstrap.memory_lock: true #锁定内存，参数来自与jvm.options
#
# Make sure that the heap size is set to about half the memory available
# on the system and that the owner of the process is allowed to use this
# limit.
#
# Elasticsearch performs poorly when the system is swapping the memory.
#
# ---------------------------------- Network -----------------------------------
#
# By default Elasticsearch is only accessible on localhost. Set a different
# address here to expose this node on the network:
#
network.host: 0.0.0.0 #监听地址
#
# By default Elasticsearch listens for HTTP traffic on the first free port it
# finds starting at 9200. Set a specific HTTP port here:
#
http.port: 9200 #监听端口
#
# For more information, consult the network module documentation.
#
# --------------------------------- Discovery ----------------------------------
#
# Pass an initial list of hosts to perform discovery when this node is started:
# The default list of hosts is ["127.0.0.1", "[::1]"]
#
discovery.seed_hosts: ["10.0.0.100", "10.0.0.101","10.0.0.102"] #集群中node节点发现列表，添加所有node节点的主机IP
#
# Bootstrap the cluster using an initial set of master-eligible nodes:
#
cluster.initial_master_nodes: ["10.0.0.100", "10.0.0.101", "10.0.0.102"] #集群初始化哪些节点可以被选举为master，一般将所有的节点都加入此项中，除非某些节点的配置较低才不加入
#
# For more information, consult the discovery and cluster formation module documentation.
#
# ---------------------------------- Various -----------------------------------
#
# Require explicit names when deleting indices:
#
action.destructive_requires_name: true #true表示删除es数据时必须要指定数据的名称等信息，否则不能使用*来删除，生产者要改为true，防止使用*误删除库中所有内容
```



### jvm.options

- jvm配置

- /etc/elasticsearch/jvm.options

```bash
#下面两个值通常都设为相同值
-Xms1g #最小分配内存，官方推荐使用物理内存的一半，但不要超过32G
-Xmx1g #最大分配内存，官方推荐使用物理内存的一半，但不要超过32G
...
```



### /var/log/elasticsearch

- 日志存放目录



## Elasticsearch 索引

在 Elasticsearch (ES) 中，索引是存储、管理和查询数据的核心概念。每个索引包含一个或多个文档，这些文档是数据的基本单元。

### 索引名称

每个索引有一个唯一的名称，用来引用和访问数据。在执行搜索、删除、更新等操作时，需要通过索引名称来定位。

### 索引分片（Shard）

索引通常分为多个分片，分片是数据的存储单位。每个分片可以分布在不同的节点上，便于负载均衡和并行搜索。

#### 主分片

- 即主索引数据，每个主分片会在集群中的每个节点随机分散存放；
- 如果主分片损坏，则副本分片上位替代主分片，**副本分片不可能和主分片存放在同一个服务器，一定是跨服务器保存**，否则主服务器一旦损坏则数据就会丢失。

#### 副本分片

- 即主索引数据的备份，每个副本分片会在集群中的每个节点随机分散存放
- 如果副本分片丢失，而主分片存在，则会在其他服务器上重新创建副本分片(不会和主分片一起存放)

#### 分片运行状态

https://www.elastic.co/guide/cn/elasticsearch/guide/current/_cluster_health.html

响应信息中最重要的一块就是 `status` 字段。状态可能是下列三个值之一：

- **`green`**：所有的主分片和副本分片都已分配。你的集群是 100% 可用的。

- **`yellow`**：所有的主分片已经分片了，但至少还有一个副本是缺失的。不会有数据丢失，所以搜索结果依然是完整的。不过，你的高可用性在某种程度上被弱化。如果 更多的 分片消失，你就会丢数据了。把 `yellow` 想象成一个**需要及时调查的警告**。

- **`red`**：至少一个主分片（以及它的全部副本）都在缺失中。这意味着你在**缺少数据**：搜索只能返回部分数据，而分配到这个分片上的写入请求会返回一个异常。





# Elasticsearch 集群部署

- https://mirrors.tuna.tsinghua.edu.cn/elasticstack/apt/7.x/pool/main/e/elasticsearch/

**Master节点职责：**

- 统计各 node 节点状态信息、集群状态信息统计、索引的创建和删除、索引分配的管理、关闭 node 节点等

**Slave节点职责：**

- 从 Master 同步数据、等待机会成为Master

## 安装前优化

- **所有es节点都需配置**

### /etc/security/limits.conf

```bash
*                soft    core            unlimited
*                hard    core            unlimited
*                soft    nproc           1000000
*                hard    nproc           1000000
*                soft    nofile          1000000
*                hard    nofile          1000000
*                soft    memlock         32000
*                hard    memlock         32000
*                soft    msgqueue        8192000
*                hard    msgqueue        8192000
```

### /etc/sysctl.conf

```bash
# Controls source route verification
net.ipv4.conf.default.rp_filter = 1
net.ipv4.ip_nonlocal_bind = 1
net.ipv4.ip_forward = 1

# Do not accept source routing
net.ipv4.conf.default.accept_source_route = 0

# Controls the System Request debugging functionality of the kernel
kernel.sysrq = 0

# Controls whether core dumps will append the PID to the core filename.
# Useful for debugging multi-threaded applications.
kernel.core_uses_pid = 1

# Controls the use of TCP syncookies
net.ipv4.tcp_syncookies = 1

# Disable netfilter on bridges.
net.bridge.bridge-nf-call-ip6tables = 0
net.bridge.bridge-nf-call-iptables = 0
net.bridge.bridge-nf-call-arptables = 0

# Controls the default maxmimum size of a mesage queue
kernel.msgmnb = 65536

# # Controls the maximum size of a message, in bytes
kernel.msgmax = 65536

# Controls the maximum shared segment size, in bytes
kernel.shmmax = 68719476736

# # Controls the maximum number of shared memory segments, in pages
kernel.shmall = 4294967296




# TCP kernel paramater
net.ipv4.tcp_mem = 786432 1048576 1572864
net.ipv4.tcp_rmem = 4096        87380   4194304
net.ipv4.tcp_wmem = 4096        16384   4194304
net.ipv4.tcp_window_scaling = 1
net.ipv4.tcp_sack = 1

# socket buffer
net.core.wmem_default = 8388608
net.core.rmem_default = 8388608
net.core.rmem_max = 16777216
net.core.wmem_max = 16777216
net.core.netdev_max_backlog = 262144
net.core.somaxconn = 20480
net.core.optmem_max = 81920


# TCP conn
net.ipv4.tcp_max_syn_backlog = 262144
net.ipv4.tcp_syn_retries = 3
net.ipv4.tcp_retries1 = 3
net.ipv4.tcp_retries2 = 15

# tcp conn reuse
net.ipv4.tcp_tw_reuse = 1
net.ipv4.tcp_tw_recycle = 1
net.ipv4.tcp_fin_timeout = 1


net.ipv4.tcp_max_tw_buckets = 20000
net.ipv4.tcp_max_orphans = 3276800
#net.ipv4.tcp_timestamps = 1 #?
net.ipv4.tcp_synack_retries = 1
net.ipv4.tcp_syncookies = 1

# keepalive conn
net.ipv4.tcp_keepalive_time = 300
net.ipv4.tcp_keepalive_intvl = 30
net.ipv4.tcp_keepalive_probes = 3
net.ipv4.ip_local_port_range = 10001    65000

# swap
vm.overcommit_memory = 0
vm.swappiness = 10

#net.ipv4.conf.eth1.rp_filter = 0
#net.ipv4.conf.lo.arp_ignore = 1
#net.ipv4.conf.lo.arp_announce = 2
#net.ipv4.conf.all.arp_ignore = 1
#net.ipv4.conf.all.arp_announce = 2
```

### /etc/systemd/system.conf

```bash
DefaultLimitNOFILE=65536
DefaultLimitNPROC=32000
DefaultLimitMEMLOCK=infinity
```



## 准备磁盘空间

- 可选项，将es的数据置于单独一块硬盘更便于管理

- **所有es节点都需配置**

```sh
#创建文件系统，xfs和ext4系统都可以
mkfs.ext4 /dev/sdb

#创建挂载目录
mkdir -p /data/esdata

#修改挂载目录的权限
chown -R elasticsearch.elasticsearch /data/esdata

#挂载，生产中注意设备要写设备的UUID，blkid命令来获取UUID
cat /etc/fstab
/dev/sdb       /data/esdata ext4 defaults 0 0

#同步挂载
mount -a

#查看挂载是否生效
df -h
/dev/sdb                          ext4       98G   61M   93G   1% /data/ELK
```



## 安装

```bash
#安装
dpkg -i elasticsearch-7.16.3-amd64.deb
```



## 修改配置文件

### es-node1

**/etc/elasticsearch/elasticsearch.yml**

```bash
root@es-node1:~# grep ^[^#] /etc/elasticsearch/elasticsearch.yml
cluster.name: azheng-application
node.name: node-1
path.data: /data/esdata
path.logs: /var/log/elasticsearch
bootstrap.memory_lock: true
network.host: 0.0.0.0
http.port: 9200
discovery.seed_hosts: ["10.0.0.100", "10.0.0.101", "10.0.0.102"]
cluster.initial_master_nodes: ["10.0.0.100", "10.0.0.101", "10.0.0.102"]
action.destructive_requires_name: true
```

**/etc/elasticsearch/jvm.options**

- 生产中按需优化

```bash
root@es-node3:~# grep ^[^#] /etc/elasticsearch/grep ^[^#] /etc/elasticsearch/elasticsearch.yml
...
#下面两个值通常都设为相同值
-Xms1g #最小分配内存，官方推荐使用物理内存的一半，但不要超过32G
-Xmx1g #最大分配内存，官方推荐使用物理内存的一半，但不要超过32G
...
```

### es-node2

**/etc/elasticsearch/elasticsearch.yml**

```bash
root@es-node2:~# grep ^[^#] /etc/elasticsearch/elasticsearch.yml
cluster.name: azheng-application
node.name: node-2 #只有此行不同
path.data: /data/esdata
path.logs: /var/log/elasticsearch
bootstrap.memory_lock: true
network.host: 0.0.0.0
http.port: 9200
discovery.seed_hosts: ["10.0.0.100", "10.0.0.101", "10.0.0.102"]
cluster.initial_master_nodes: ["10.0.0.100", "10.0.0.101", "10.0.0.102"]
action.destructive_requires_name: true
```

**/etc/elasticsearch/jvm.options**

- 生产中按需优化

```bash
root@es-node3:~# grep ^[^#] /etc/elasticsearch/grep ^[^#] /etc/elasticsearch/elasticsearch.yml
...
#下面两个值通常都设为相同值
-Xms1g #最小分配内存，官方推荐使用物理内存的一半，但不要超过32G
-Xmx1g #最大分配内存，官方推荐使用物理内存的一半，但不要超过32G
...
```

### es-node3

**/etc/elasticsearch/elasticsearch.yml**

```bash
root@es-node3:~# grep ^[^#] /etc/elasticsearch/elasticsearch.yml
cluster.name: azheng-application
node.name: node-3 #只有此行不同
path.data: /data/esdata
path.logs: /var/log/elasticsearch
bootstrap.memory_lock: true
network.host: 0.0.0.0
http.port: 9200
discovery.seed_hosts: ["10.0.0.100", "10.0.0.101", "10.0.0.102"]
cluster.initial_master_nodes: ["10.0.0.100", "10.0.0.101", "10.0.0.102"]
action.destructive_requires_name: true
```

**/etc/elasticsearch/jvm.options**

- 生产中按需优化

```bash
root@es-node3:~# grep ^[^#] /etc/elasticsearch/grep ^[^#] /etc/elasticsearch/elasticsearch.yml
...
#下面两个值通常都设为相同值
-Xms1g #最小分配内存，官方推荐使用物理内存的一半，但不要超过32G
-Xmx1g #最大分配内存，官方推荐使用物理内存的一半，但不要超过32G
...
```



## 启动服务

- 启动完毕后查看9200和9300端口是否开启
- **注意：**在虚拟机环境下，宿主机如果内存较少 则要关闭内存锁定，否则将无法启动服务，并提示无法锁定内存，bootstrap.memory_lock: false

```bash
#开启elasticsearch并设为开机自动启动
systemctl enable --now elasticsearch.service
```



## 测试访问

- 浏览器访问9200端口查看es信息是否出现

```bash
[root@client ~]# curl 10.0.0.100:9200
{
  "name" : "node-1", #本节点的名称
  "cluster_name" : "azheng-application", #集群名称
  "cluster_uuid" : "dSzmWLlRQBKSCRc0CPznRg", #集群的唯一UUID
  "version" : { #elasticsearch版本相关信息
    "number" : "7.16.3", #elasticsearch版本
    "build_flavor" : "default",
    "build_type" : "deb", #安装的方式
    "build_hash" : "4e6e4eab2297e949ec994e688dad46290d018022",
    "build_date" : "2022-01-06T23:43:02.825887787Z",
    "build_snapshot" : false,
    "lucene_version" : "8.10.1",
    "minimum_wire_compatibility_version" : "6.8.0",
    "minimum_index_compatibility_version" : "6.0.0-beta1"
  },
  "tagline" : "You Know, for Search"
}

--------------------------------------------------------------------------

[root@client ~]# curl 10.0.0.101:9200
{
  "name" : "node-2",
  "cluster_name" : "azheng-application",
  "cluster_uuid" : "dSzmWLlRQBKSCRc0CPznRg",
  "version" : {
    "number" : "7.16.3",
    "build_flavor" : "default",
    "build_type" : "deb",
    "build_hash" : "4e6e4eab2297e949ec994e688dad46290d018022",
    "build_date" : "2022-01-06T23:43:02.825887787Z",
    "build_snapshot" : false,
    "lucene_version" : "8.10.1",
    "minimum_wire_compatibility_version" : "6.8.0",
    "minimum_index_compatibility_version" : "6.0.0-beta1"
  },
  "tagline" : "You Know, for Search"
}

------------------------------------------------------------------------------

[root@client ~]# curl 10.0.0.102:9200
{
  "name" : "node-3",
  "cluster_name" : "azheng-application",
  "cluster_uuid" : "dSzmWLlRQBKSCRc0CPznRg",
  "version" : {
    "number" : "7.16.3",
    "build_flavor" : "default",
    "build_type" : "deb",
    "build_hash" : "4e6e4eab2297e949ec994e688dad46290d018022",
    "build_date" : "2022-01-06T23:43:02.825887787Z",
    "build_snapshot" : false,
    "lucene_version" : "8.10.1",
    "minimum_wire_compatibility_version" : "6.8.0",
    "minimum_index_compatibility_version" : "6.0.0-beta1"
  },
  "tagline" : "You Know, for Search"
}
```





# Elasticsearch helm 部署

- 下面使用Elasticsearch官方提供的仓库进行部署，也可以使用信任的第三方仓库，比如：bitnami
- https://artifacthub.io/packages/helm/elastic/elasticsearch

```sh
# 安装elastic官方chart仓库
# helm repo add elastic https://helm.elastic.co


# 验证仓库
# helm repo list
NAME                	URL                                               
...              
elastic             	https://helm.elastic.co


# 打印安装的readme，此信息从chart官方仓库也可以查看
# helm show readme elastic/elasticsearch --version 7.17.3


# 获取values文件，values文件还可以从chart官方仓库下载
# helm show values elastic/elasticsearch --version 7.17.3 > values-elasticsearch.yaml


# 按需修改values文件，具体如何修改参阅chart官方仓库，或readme的提示信息
# vim values-elasticsearch.yaml
...


# 指定chart版本安装，如未指定，则使用最新版本，最后指定按需修改后的values文件部署
# kubectl create ns logs
# helm install elasticsearch --version 7.17.3 elastic/elasticsearch -n logs -f values-elasticsearch.yaml


# 检测es集群是否健康
# curl -XGET --fail '127.0.0.1:9200/_cluster/health?wait_for_status=green&timeout=1s'
# curl -XGET --fail '10.107.84.186:9200/_cluster/health?wait_for_status=green&timeout=1s' | jq .
{
  "cluster_name": "elasticsearch",
  "status": "green",
  "timed_out": false,
  "number_of_nodes": 1,
  "number_of_data_nodes": 1,
  "active_primary_shards": 1,
  "active_shards": 1,
  "relocating_shards": 0,
  "initializing_shards": 0,
  "unassigned_shards": 0,
  "delayed_unassigned_shards": 0,
  "number_of_pending_tasks": 0,
  "number_of_in_flight_fetch": 0,
  "task_max_waiting_in_queue_millis": 0,
  "active_shards_percent_as_number": 100
}



# 卸载
# helm uninstall elasticsearch -n logs
release "elasticsearch" uninstalled
```




















# Elasticsearch plugins

插件是为了完成不同的功能，官方提供了一些插件但大部分是收费的，另外也有一些开发爱好者提供的插件，可以实现对 Elasticsearch 集群的状态监控与管理配置等功能，插件实际上是调用 Elasticsearch 的API接口来实现特定功能的

## cerebro

- 主要功能是管理集群分片
- 需要Java1.8或更高版本（新版本需要Java 11 或更高版本才能运行）


- https://github.com/lmenezes/cerebro

### 安装

#### docker

- https://hub.docker.com/r/lmenezes/cerebro/

```bash
#首先需要在被安装的主机上准备docker环境

#拉取镜像
docker pull lmenezes/cerebro:0.9.4

#使用默认端口运行
docker run -d --name cerebro --restart=always -p 9000:9000 lmenezes/cerebro:0.9.4

#指定端口运行
docker run -d --name cerebro --restart=always -p 9100:9100 -e CEREBRO_PORT=9100 lmenezes/cerebro:0.9.4
```

### 使用

- 星星为实心则表示为master节点
- 颜色说明参阅 Elasticsearch 集群状态
- 实线框表示主分片，虚线框表示副本分片





## head

- 管理分片

- https://github.com/mobz/elasticsearch-head

### 安装

#### 基于docker安装

```bash
#需要先修改 Elasticsearch 的配置文件
vim /etc/elasticsearch/elasticsearch.yml
http.cors.enabled: true #开启支持跨域访问
http.cors.allow-origin: "*" #指定允许访问范围
#修改完毕后需重启Elasticsearch服务

#在被安装的主机上准备docker环境
docker run -d -p 9100:9100 mobz/elasticsearch-head:5

#最后浏览器访问本机的9100端口
```


## Es API

- Elasticsearch 提供了RESTful风格的API，此API可以实现对es集群的CRUD（Create, Read, Update, Delete)
- 参考文档：https://www.elastic.co/guide/en/elasticsearch/reference/current/docs.html

```sh
# 打印所有索引，按存储大小降序排序
curl -s "127.0.0.1:9200/_cat/indices?v&s=store.size:desc"

# 打印节点信息
curl -s "127.0.0.1:9200/_cat/nodes?v&h=ip,name,version,node.role,master,heap.percent,cpu,load_1m"

# 打印所有以tor_开头的索引，按索引名称排序
curl -s "172.16.30.111:9200/_cat/indices/tor_*?v&s=index"
```

### GET

- curl 命令默认使用GET方法，因此省略 `-XGET`

#### /_cat

```sh
# 打印支持的指令，pretty表示以易读格式输出=true可省略；
curl 'http://127.0.0.1:9200/_cat?pretty=true'

# 健康状态信息
curl 'http://127.0.0.1:9200/_cat/health?pretty'

# 每个字段的含义
curl 'http://127.0.0.1:9200/_cat/health?help'

# 群集节点信息
curl 'http://127.0.0.1:9200/_cat/nodes?pretty'

# 主节点信息
curl 'http://127.0.0.1:9200/_cat/master?pretty'

# 全部索引信息
curl 'http://127.0.0.1:9200/_cat/indices?pretty'

# 某个索引信息
curl 'http://127.0.0.1:9200/_cat/indices/logstash-2022.10.19?pretty'
```

#### /_cluster

```sh
# 集群健康状态信息
curl 'http://127.0.0.1:9200/_cluster/health?pretty'


# 集群详细信息；
curl 'http://127.0.0.1:9200/_cluster/stats?pretty'
```

#### /\_search


#### /_search

```sh
# 搜索所有索引
curl 'http://127.0.0.1:9200/_search?pretty'

# 搜索指定索引
curl 'http://127.0.0.1:9200/my-index/_search?pretty'
```

### PUT

```sh
# 创建索引文档
curl \
-H 'content-type: application/json' \
-XPUT 'http://127.0.0.1:9200/my-index/_doc/123' \
-d '{ "key1": "value1", "key2": "value2" }'


# 验证
# curl 'http://127.0.0.1:9200/my-index/_doc/123?pretty'
{
  "_index" : "my-index",
  "_type" : "_doc",
  "_id" : "123",
  "_version" : 1,
  "_seq_no" : 0,
  "_primary_term" : 1,
  "found" : true,
  "_source" : {
    "key1" : "value1",
    "key2" : "value2"
  }
}


# 搜索的方式
# curl 'http://127.0.0.1:9200/my-index/_search?q=value1&pretty'
{
  "took" : 4,
  "timed_out" : false,
  "_shards" : {
    "total" : 1,
    "successful" : 1,
    "skipped" : 0,
    "failed" : 0
  },
  "hits" : {
    "total" : {
      "value" : 1,
      "relation" : "eq"
    },
    "max_score" : 0.2876821,
    "hits" : [
      {
        "_index" : "my-index",
        "_type" : "_doc",
        "_id" : "123",
        "_score" : 0.2876821,
        "_source" : {
          "key1" : "value1",
          "key2" : "value2"
        }
      }
    ]
  }
}
```



## Elasticsearch security

启用 Elasticsearch 安全功能：

官方链接：https://www.elastic.co/guide/en/elasticsearch/reference/7.15/security-minimal-setup.html#_enable_elasticsearch_security_features

**！！！elasticsearch-7.15.0版本有BUG，开启安全认证就开启不了elasticsearch服务，而取消安全认证开启服务就执行不了/usr/share/elasticsearch/bin/elasticsearch-setup-passwords interactive设置不了密码**

#### 多集群节点：

##### 开启安全认证功能

```bash
#在集群中的每个节点上，停止 Kibana 和 Elasticsearch（如果它们正在运行）
systemctl stop elasticsearch.service
systemctl stop kibana.service

#在集群中的每个节点上，将xpack.security.enabled设置添加到$ES_PATH_CONF/elasticsearch.yml文件并将值设置为true：
echo "xpack.security.enabled: true" >> /etc/elasticsearch/elasticsearch.yml
```

##### 为集群节点设置密码

```bash
/usr/share/elasticsearch/bin/elasticsearch-setup-passwords interactive
...
```

#### 单集群节点：

```bash
#如果您的集群只有一个节点，请discovery.type在 $ES_PATH_CONF/elasticsearch.yml文件中添加设置并将值设置为single-node. 此设置可确保您的节点不会无意中连接到可能在您的网络上运行的其他集群。
echo "discovery.type: single-node" >> /etc/elasticsearch/elasticsearch.yml
```



