---
title: "Kafka"
weight: 10
---

# kafka 概述

官网：https://kafka.apache.org/

阿里云kafka：https://kafka.console.aliyun.com/

- kafka 由 Scala 和 Java 编写，是apache开源软件基金会旗下的一个子项目
- kafka 是一种高吞吐量的分布式发布订阅消息系统，因为其性能极其出色，所以通常用于大数据领域。
- kafka 通常与 zookeeper 配合使用，从而实现动态扩容，以及实现大数据场合数据传输等场合
  - **注意：zookeeper中只保存了kafka的元数据信息（如：kafka的服务IP、端口，topic名称、分区等信息），业务数据是保存在Kafka的**
  - **kafka将 初始 或 新生成的 属性信息(元数据) 推送到zookeeper**
  - **生产者和消费者指向的都是kafka的IP地址和端口，而非zookeeper的地址**
- 顺序写 由于现代的操作系统提供了预读和写技术，磁盘的顺序写大多数情况下比随机写内存还要快。
- Zero-copy 零拷技术减少拷贝次数
- Batching of Messages 批量量处理。合并小的请求，然后以流的方式进行交互，直顶网络上限。
- Pull 拉模式 使用拉模式进行消息的获取消费，与消费端处理能力相符。

## kafka 优势

- kafka 通过 O(1)的磁盘数据结构提供消息的持久化，这种结构对于即使以数以TB的消息存储也能够保持长时间的稳定性能，
  - O(1) 最低复杂度，常量值，也就是耗时/耗空间 与输入数据大小无关，无论输入数据增大多少倍，耗时/耗空间都不变
  - 哈希算法就是典型的 O(1) 时间复杂度，无论数据规模有多大，都可以在一次计算后找到目标
- 高吞吐量，即使是非常普通的硬件 kafka 也可以支持每秒数百万的消息
- 支持通过 kafka 服务器分区消息
- 支持 Hadoop 并行数据加载



## kafka 数据写入过程

**描述1**

- 当数据发生更改时，kafka会通过内核的内存映射 先将修改的数据写入到内核的内存缓冲区中（不再将内核的内存空间映射到用户空间，这也就是所谓的零拷贝(复制)技术），然后通知用户成功，最后将数据顺序写入磁盘，数据默认168小时即7天清理一次

**描述2**

1. producer 先从 zookeeper 的 "/brokers/.../state" 节点找到该 partition 的 leader
2. producer 将消息发送给该 leader
3. leader 将消息写入本地 log
4. followers 从 leader pull 消息，写入本地 log 后 leader 发送 ACK
5. leader 收到所有 ISR 中的 replica 的 ACK 后，增加 HW（high watermark，最后 commit 的 offset） 并向 producer 发送 ACK



## kafka 数据流

- 生产者（Producer）负责写入消息数据。将审计日志、服务日志、数据库、移动App日志，以及其他类型的日志主动推送到Kafka集群进行存储。
- 消费者（Consumer）负责读取消息数据。例如，通过Hadoop的应用接口、Spark的应用接口、Storm的应用接口、ElasticSearch的应用接口，以及其他自定义服务的应用接口，主动拉取Kafka集群中的消息数据。



## kafka 适用场景

- 日志收集
- 消息系统
- 用户轨迹（记录浏览器用户或者app用户产生的各种记录，点击和搜索浏览等）
- 记录运营监控数据
- 实现流处理











# 相关术语

## broker

- broker 代理

- 一个kafka进程（kafka进程又被称为实例），被称为一个代理broker节点
- broker 是消息的代理，Producers往Brokers里面的指定Topic中写消息，Consumers从Brokers里面拉取指定Topic的消息，然后进行业务处理，broker在中间起到一个代理保存消息的中转站

- kafka 集群包含一个或多个服务器，这种服务器被称为broker

## topic

- topic 主题
- Kafka 系统通过主题来区分不同业务类型的消息记录。例如，用户登录数据存储在主题 A 中，用户充值记录存储在主题 B 中，则如果应用程序只订阅了主题 A，而没有订阅主题 B，那该应用程序只能读取主题 A 中的数据

- kafka 保存数据的地方，如果对 topic 配置了分区，那么 topic 可能会保存在不同的 kafka 节点上

- topic 类似于文件系统中的文件夹，消息是该文件夹中的文件。

## partition

- partition 分区
- 每一个主题（Topic）中可以有一个或者多个分区（Partition）。在Kafka系统的设计思想中，分区是基于物理层面上的，不同的分区对应着不同的数据文件。Kafka通过分区（Partition）来支持物理层面上的并发读写，以提高Kafka集群的吞吐量。
- 一个分区只对应一个代理节点（Broker），一个代理节点可以管理多个分区。

- 每个 topic 包含一个或 多个 partition，**创建 topic 时 可以指定 partition 的数量**
- **每个 partition 对应一个文件夹，该文件夹下存储该 partition 的数据 和 索引文件**
- 为了实现数据的高可用，比如将 分区0 的数据分散到不同的 kafka 节点，每一个分区都有一个 broker 作为 leader，另一个 broker 作为 follower

**分区的优势：**

1. 存储空间横向扩容，即将多个 kafka 服务器的空间结合使用
2. 提升性能，多服务器并行读写
3. 实现高可用，**类似于ELK集群分片中的 主分片、副本分片的概念**

## producer

- producer 生产者
- 负责发布信息到 kafka broker
- Producer 将消息记录发送到 Kafka 集群指定的主题（Topic）中进行存储，同时生产者（Producer）也能通过自定义算法决定将消息记录发送到哪个分区（Partition）。
  - 例如，通过获取消息记录主键（Key）的哈希值，然后使用该值对分区数取模运算，得到分区索引。


## consumer

- consumer 消费者，消费信息
- 消费者（Consumer）从 Kafka 集群指定的主题（Topic）中读取消息记录。在读取主题数据时，需要设置消费组名（GroupId）。如果不设置，则Kafka消费者会默认生成一个消费组名称。
- 每个 consumer 属于一个特定的 consumer group（可为每个 consumer 指定 group name，若不指定 group name，则属于默认的 group）
- 使用 consumer high level API 时，同一 topic 的一条消息只能被同一个 consumer group 内的一个 consumer 消费，但多个 consumer group 可同时消费这一消息

## consumer group

- consumer group 消费者组
- 消费者程序在读取 Kafka 系统主题（Topic）中的数据时，通常会使用多个线程来执行。一个消费者组可以包含一个或多个消费者程序，使用多分区和多线程模式可以极大提高读取数据的效率。
- 一般而言，一个消费者对应一个线程

## replication

- replication 副本
- 在Kafka系统中，每个主题（Topic）在创建时会要求指定它的副本数，默认是1。通过副本（Replication）机制来保证Kafka分布式集群数据的高可用性
- 在创建主题时，主题的副本系数值应如下设置：
  - 若集群数量大于等于3，则主题的副本系数值可以设置为3
  - 若集群数量小于3，则主题的副本系数值可以设置为小于等于集群数量值。例如，集群数为2，则副本系数可以设置为1或者2；集群数为1，则副本系数只能设置为1。

## Record

- Record 记录
- 被实际写入到Kafka集群并且可以被消费者应用程序读取的数据，被称为记录（Record）。每条记录包含一个键（Key）、值（Value）和时间戳（Timestamp）。

## replica

- partition 的副本，保障 partition 的高可用。

## leader

- replica 中的一个角色， producer 和 consumer 只跟 leader 交互。

## follower

- replica 中的一个角色，从 leader 中复制数据。

## controller

- kafka 集群中的其中一个服务器，用来进行 leader election 以及 各种 failover。

## zookeeper

- kafka 通过 zookeeper 来存储集群的 meta 信息。

## ISR、AR

- In-Sync Replicas 副本同步队列
- AR:Assigned Replicas 所有副本
- ISR是由leader维护，follower从leader同步数据有一些延迟（包括延迟时间replica.lag.time.max.ms和延迟条数replica.lag.max.messages两个维度, 当前最新的版本0.10.x中只支持replica.lag.time.max.ms这个维度），任意一个超过阈值都会把follower剔除出ISR, 存入OSR（Outof-Sync Replicas）列表，新加入的follower也会先存放在OSR中。AR=ISR+OSR



# 配置文件

## server.properties

```sh
# 指定 Kafka 实例监听的地址和端口。它告诉 Kafka 实例在哪些网络接口和端口上接受来自客户端的连接
# PLAINTEXT 是 Kafka 的协议，除了 PLAINTEXT 之外，还有 SSL, SASL_PLAINTEXT, SASL_SSL 等。
listeners=PLAINTEXT://0.0.0.0:9092

# 指定客户端在连接到Kafka时使用的地址。这个配置项需要设置为Kafka服务端对外暴露的地址，这个地址应该是客户端可以访问到的IP地址或主机名。
advertised.listeners=PLAINTEXT://10.0.0.125:9092
```



# kafka 插件管理

参考文档：https://kafka.apache.org/quickstart#connectconfigs_plugin.path

示例：https://kafka.apache.org/quickstart（使用 KAFKA CONNECT 将数据作为事件流导入/导出）





# kafka 图形管理工具

- https://www.kafkatool.com/download.html







# Kafka 中的消息是否会丢失和重复消费？

- 要确定Kafka的消息是否丢失或重复，从两个方面分析入手：消息发送和消息消费。

## 消息发送

- Kafka消息发送有两种方式：同步（sync）和异步（async），默认是同步方式，可通过 producer.type属性进行配置。Kafka通过配置request.required.acks属性来确认消息的生产：
  - 0---表示不进行消息接收是否成功的确认；
    - acks=0，不和Kafka集群进行消息接收确认，则当网络异常、缓冲区满了等情况时，消息可能丢失；
  - 1---表示当Leader接收成功时确认；
    - acks=1、同步模式下，只有Leader确认接收成功后但挂掉了，副本没有同步，数据可能丢失；
  - -1---表示Leader和Follower都接收成功时确认；

## 消息消费

- Kafka消息消费有两个consumer接口，Low-level API和High-level API： 
- **Low-level API：**
  - 消费者自己维护offset等值，可以实现对Kafka的完全控制；
- **High-level API：**
  - 封装了对parition和offset的管理，使用简单；
- 如果使用高级接口High-level API，可能存在一个问题就是当消息消费者从集群中把消息取出来、并提交了新的消息offset值后，还没来得及消费就挂掉了，那么下次再消费时之前没消费成功的消息就“诡异”的消失了；解决办法：
  - **针对消息丢失：**同步模式下，确认机制设置为-1，即让消息写入Leader和Follower之后再确认消息发送成功；异步模式下，为防止缓冲区满，可以在配置文件设置不限制阻塞超时时间，当缓冲区满时让生产者一 直处于阻塞状态；
  - **针对消息重复：**将消息的唯一标识保存到外部介质中，每次消费时判断是否处理过即可。 







# 为什么 Kafka 不支持读写分离？

- 在 Kafka 中，生产者写入消息、消费者读取消息的操作都是与 leader 副本进行交互的，从 而实现的是一种主写主读的生产消费模型
- Kafka 并不支持主写从读，因为主写从读有 2 个很明 显的缺点:
  - **数据一致性问题：**数据从主节点转到从节点必然会有一个延时的时间窗口，这个时间 窗口会导致主从节点之间的数据不一致。某一时刻，在主节点和从节点中 A 数据的值都为 X， 之后将主节点中 A 的值修改为 Y，那么在这个变更通知到从节点之前，应用读取从节点中的 A 数据的值并不为最新的 Y，由此便产生了数据不一致的问题。
  - **延时问题：**类似 Redis 这种组件，数据从写入主节点到同步至从节点中的过程需要经 历网络→主节点内存→网络→从节点内存这几个阶段，整个过程会耗费一定的时间。而在 Kafka 中，主从同步会比Redis 更加耗时，它需要经历网络→主节点内存→主节点磁盘→网络→从节 点内存→从节点磁盘这几个阶段。对延时敏感的应用而言，主写从读的功能并不太适用。





# 什么是消费者组?

**消费者组是 Kafka 独有的概念**

- **定义：**即消费者组是 Kafka 提供的可扩展且具有容错性的消费者机制。
- **原理：**在 Kafka 中，消费者组是一个由多个消费者实例 构成的组。多个实例共同订阅若干个主题，实现共同消费。同一个组下的每个实例都配置有 相同的组 ID，被分配不同的订阅分区。当某个实例挂掉的时候，其他实例会自动地承担起 它负责消费的分区。



此时，又有一个小技巧给到你:消费者组的题目，能够帮你在某种程度上掌控下面的面试方向。

- 如果你擅长位移值原理，就不妨再提一下消费者组的位移提交机制;
- 如果你擅长 Kafka Broker，可以提一下消费者组与 Broker 之间的交互;
- 如果你擅长与消费者组完全不相关的 Producer，那么就可以这么说:“消费者组要消 费的数据完全来自于Producer 端生产的消息，我对 Producer 还是比较熟悉的。”





# ---

# Kafka 集群恢复

- 启动zookeeper集群

```sh
# 各zookeeper节点运行
apache-zookeeper-3.6.1-bin/bin/zkServer.sh start
```

- 启动kafka集群

```sh
# kafka_2.12-2.6.0/bin/kafka-server-start.sh -daemon kafka_2.12-2.6.0/config/server1.properties


# kafka_2.12-2.6.0/bin/kafka-server-start.sh -daemon kafka_2.12-2.6.0/config/server2.properties


# kafka_2.12-2.6.0/bin/kafka-server-start.sh -daemon kafka_2.12-2.6.0/config/server3.properties
```





# 部署

- 需安装 JDK

## 单机

### 二进制

**kafka + kraft：**

```sh
tar xvf kafka_2.13-3.6.2.tgz -C /
cd /kafka_2.13-3.6.2/
KAFKA_CLUSTER_ID="$(bin/kafka-storage.sh random-uuid)"
bin/kafka-storage.sh format -t $KAFKA_CLUSTER_ID -c config/kraft/server.properties

# 编辑 config/kraft/server.properties，修改 advertised.listeners=PLAINTEXT://10.0.0.125:9092，将10.0.0.125改为kafka对外访问的IP
vim config/kraft/server.properties

# 手动前台启动
bin/kafka-server-start.sh config/kraft/server.properties


# 基于 service 启动
cat > /etc/systemd/system/kafka.service <<EOF
[Unit]
Description=Apache Kafka - Distributed Streaming Platform
Documentation=https://kafka.apache.org/documentation/
After=network.target

[Service]
Type=simple
User=root
Group=root
ExecStart=/kafka_2.13-3.6.2/bin/kafka-server-start.sh /kafka_2.13-3.6.2/config/kraft/server.properties
ExecStop=/kafka_2.13-3.6.2/bin/kafka-server-stop.sh
Restart=on-failure
RestartSec=10
SuccessExitStatus=143
LimitNOFILE=100000

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl start kafka
systemctl enable kafka
systemctl status kafka
```



### 容器

#### bitnami/kafka

```sh
docker run -d -p 9092:9092 --name kafka \
-e KAFKA_CFG_NODE_ID=1 \
-e KAFKA_CFG_PROCESS_ROLES=broker,controller \
-e KAFKA_CFG_CONTROLLER_QUORUM_VOTERS=1@localhost:9092 \
-e KAFKA_CFG_LISTENERS=PLAINTEXT://:9092,CONTROLLER://:9093 \
-e KAFKA_CFG_LISTENER_SECURITY_PROTOCOL_MAP=CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT \
-e KAFKA_CFG_CONTROLLER_LISTENER_NAMES=CONTROLLER \
-e KAFKA_CFG_LOG_DIRS=/opt/bitnami/kafka/logs \
-e KAFKA_CFG_AUTO_CREATE_TOPICS_ENABLE=true \
-e ALLOW_PLAINTEXT_LISTENER=yes \
bitnami/kafka:3.2.3
```

#### apache/kafka

```sh
docker run -d --name kafka -p 9092:9092 apache/kafka:3.7.0
```



### docker-compose.yml

```yaml
services:
  kafka:
    image: apache/kafka:latest
    container_name: kafka
    environment:
      KAFKA_NODE_ID: 1
      KAFKA_PROCESS_ROLES: broker,controller
      KAFKA_LISTENERS: PLAINTEXT://localhost:9092,CONTROLLER://localhost:9093
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
      KAFKA_CONTROLLER_LISTENER_NAMES: CONTROLLER
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT
      KAFKA_CONTROLLER_QUORUM_VOTERS: 1@localhost:9093
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR: 1
      KAFKA_TRANSACTION_STATE_LOG_MIN_ISR: 1
      KAFKA_GROUP_INITIAL_REBALANCE_DELAY_MS: 0
      KAFKA_NUM_PARTITIONS: 3
```



## 集群

- kafka + zookeeper 配置实现集群
- kafka与zookeeper合并到一起部署，也可以将每台kafka和zookeeper分开部署，下面以合并部署演示

### 环境说明

| IP         | hostname     | service                           |
| ---------- | ------------ | --------------------------------- |
| 10.0.0.100 | kafka-node-1 | zookeeper-3.8.0、kafka_2.13-3.1.1 |
| 10.0.0.101 | kafka-node-2 | zookeeper-3.8.0、kafka_2.13-3.1.1 |
| 10.0.0.102 | kafka-node-3 | zookeeper-3.8.0、kafka_2.13-3.1.1 |

### 安装 JDK

- 略

### 部署 zookeeper

- 略

### 部署 Kafka

#### 前期准备

- 所有node执行

```bash
# ll kafka_2.13-3.1.1.tgz 
-rw-r--r-- 1 root root 88034707 Jun 13 13:18 kafka_2.13-3.1.1.tgz

# mkdir /apps/

# tar xf kafka_2.13-3.1.1.tgz -C /apps/

# mkdir /apps/kafka_2.13-3.1.1/data
```



#### 修改kafka配置文件

- **注意：以下是需要或建议修改的配置，并不代表仅留存这些配置**

##### node1

```bash
# vim /apps/kafka_2.13-3.1.1/config/server.properties
...
broker.id=100 #每个broker在集群中的唯一标识
listeners=PLAINTEXT://10.0.0.100:9092 #Kafka的监听地址
log.dirs=/apps/kafka_2.13-3.1.1/data/kafka-logs #kafka用于保存数据的目录，所有的消息都会存储在该目录中
num.partitions=1 #创建新的topic的默认分区数量，更多的数量可以通过并行访问提升性能，但不建议超过kafka节点的总数（好比三个集群节点 一个主分片 三个副本分片就有些冗余了）
log.retention.hours=168 #kafka中消息的保留时间，168小时即7天
zookeeper.connect=10.0.0.100:2181,10.0.0.101:2181,10.0.0.102:2181 #指定连接zookeeper的地址（zookeeper中储存了broker的元数据信息）
...
```

##### node2

```bash
# vim /apps/kafka_2.13-3.1.1/config/server.properties
...
broker.id=101
listeners=PLAINTEXT://10.0.0.101:9092
log.dirs=/apps/kafka_2.13-3.1.1/data/kafka-logs
num.partitions=1
log.retention.hours=168
zookeeper.connect=10.0.0.100:2181,10.0.0.101:2181,10.0.0.102:2181
...
```

##### node3

```bash
# vim /apps/kafka_2.13-3.1.1/config/server.properties
...
broker.id=101
listeners=PLAINTEXT://10.0.0.101:9092
log.dirs=/apps/kafka_2.13-3.1.1/data/kafka-logs
num.partitions=1
log.retention.hours=168
zookeeper.connect=10.0.0.100:2181,10.0.0.101:2181,10.0.0.102:2181
...
```



#### 启动kafka

- 在所有节点执行，未启动成功可以前台启动观察日志

```bash
#以守护进程的方式启动kafka
# /apps/kafka_2.13-3.1.1/bin/kafka-server-start.sh -daemon /apps/kafka_2.13-3.1.1/config/server.properties 

#验证是否启动成功
# ss -ntl|grep 9092
LISTEN  0       50       [::ffff:10.0.0.100]:9092               *:* 
```

- 启动成功后，可以打开zookeeper图形客户端查看 broker --> ids目录下出现100、101、102出现以下信息：

```bash
#以100举例，转化成易读格式
{
    "features": {},
    "listener_security_protocol_map": {
        "PLAINTEXT": "PLAINTEXT"
    },
    "endpoints": [
        "PLAINTEXT://10.0.0.100:9092"
    ],
    "jmx_port": -1,
    "port": 9092,
    "host": "10.0.0.100",
    "version": 5,
    "timestamp": "1655449725648"
}
```





# 内建工具

## topic 管理

参考文档：https://kafka.apache.org/quickstart

### 创建 topic

- 在任意 kafka 节点操作
- --partitions 3，分区为3
- --replication-factor 3，每个分区的副本数为3（一个主分片，两个副本分片）
- --topic azheng，创建一个名为azheng的topic

```bash
./kafka-topics.sh --create --partitions 3 --replication-factor 3 --topic azheng --bootstrap-server 10.0.0.102:9092
Created topic azheng.
```

### 查看topic的详细信息

- --describe，列出给定主题的详细信息
- Isr（ln-sync，表示可以参加选举成为为leader）

```bash
# /apps/kafka_2.13-3.1.1/bin/kafka-topics.sh --describe --topic azheng --bootstrap-server 10.0.0.102:9092
Topic: azheng	TopicId: Hqe6ATY1SE2JMV0z2UaZyw	PartitionCount: 3	ReplicationFactor: 3	Configs: segment.bytes=1073741824
	Topic: azheng	Partition: 0	Leader: 102	Replicas: 102,100,101	Isr: 102,100,101
	Topic: azheng	Partition: 1	Leader: 101	Replicas: 101,102,100	Isr: 101,102,100
	Topic: azheng	Partition: 2	Leader: 100	Replicas: 100,101,102	Isr: 100,101,102
	

#zookeeper客户端 brokers-->topics-->azheng-->partitions-->0-->state 显示以下内容：
{
    "controller_epoch": 4,
    "leader": 100,
    "version": 1,
    "leader_epoch": 3,
    "isr": [
        100
    ]
}
```

### 获取所有 topic

```bash
./kafka-topics.sh -list --bootstrap-server 10.0.0.102:9092
azheng
```

### 向 topic 发送信息

```bash
# /apps/kafka_2.13-3.1.1/bin/kafka-console-producer.sh --topic azheng --bootstrap-server 10.0.0.102:9092
>mes1
>mes2
>mes3
```

### 获取 topic 中的信息

- 不加 --from-beginning 则只能获取最新的消息，加上的话表示从头获取所有消息

```bash
# /apps/kafka_2.13-3.1.1/bin/kafka-console-consumer.sh --from-beginning --topic azheng --bootstrap-server 10.0.0.102:9092
```

### 删除 topic

```bash
# /apps/kafka_2.13-3.1.1/bin/kafka-topics.sh --delete --topic azheng --bootstrap-server 10.0.0.102:9092
```

### 完整示例

```bash
# 创建 topic
$ kafka-topics.sh --bootstrap-server 127.0.0.1:9092 -create -topic  my_topic

# 列出所有 topic
$ kafka-topics.sh --bootstrap-server 127.0.0.1:9092 -list
my_topic

# 向 topic 发送信息，control + c 退出
$ kafka-console-producer.sh --bootstrap-server 127.0.0.1:9092 -topic  my_topic
>m1
>m2
>m3

#  获取 topic 中的信息（不加 --from-beginning 则只能获取最新的消息，加上的话表示从头获取所有消息），control + c 退出
$ kafka-console-consumer.sh --bootstrap-server 127.0.0.1:9092 -topic  my_topic --from-beginning
m1
m2
m3

# 删除 topic
$ kafka-topics.sh --bootstrap-server 127.0.0.1:9092 -delete -topic  my_topic
```



# 管理脚本

## 列出所有 topic

```py
from kafka import KafkaAdminClient

# 配置Kafka连接参数
bootstrap_servers = ['localhost:9092']  # 这里可以替换为你的Kafka broker地址

def list_topics():
    # 创建Kafka管理员客户端
    admin_client = KafkaAdminClient(bootstrap_servers=bootstrap_servers)
    
    # 获取所有topics
    topics = admin_client.list_topics()
    
    # 打印所有topic名称
    print("Available Topics:")
    for topic in topics:
        print(topic)

if __name__ == "__main__":
    list_topics()
```
