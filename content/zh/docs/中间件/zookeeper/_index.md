
---
title: "ZooKeeper"
weight: 10
---

# 前言

官方文档：https://zookeeper.apache.org/

参考链接：

- https://www.sohu.com/a/253808097_465221
- https://cwiki.apache.org/confluence/display/ZOOKEEPER/Index
- https://zookeeper.apache.org/doc/current/index.html
- 管理员指南：https://zookeeper.apache.org/doc/r3.8.0/zookeeperAdmin.html#sc_systemReq







# ZooKeeper 概述

zookeeper 是一个分布式服务框架，主要用来解决分布式环境中的协调问题 以及 数据管理问题 如：命名服务、状态同步、配置中心、集群管理等

zookeeper 的目录结构和Linux极其相似

**zookeeper 又称注册中心，物理机和虚拟机时代 IP地址都是固定的，但是到了容器的环境下，IP地址是随机变化的，就不适合固定的IP调用，就需要使用注册中心的服务发现功能**



## 命名服务

命名服务是分布式系统中比较常见的一类场景

在分布式系统中，**被命名的实体通常是集群中的机器、提供的服务地址、远程对象等（这些统称为 Name）**

- 如 RPC、RMI 中的服务地址列表

通过使用命名服务，**客户端应用能够根据指定的Name 来获取资源的实体、服务地址、提供者的信息等**



## 状态同步

每个节点除了存储数据内容 和 node节点状态信息之外，**还存储了已经注册的APP的状态信息，当有些节点不可用时，就将当前状态同步给其他服务**



## 配置中心

- zookeeper的配置中心功能应用较少
- **较常使用的配置中心软件是阿波罗配置中心（apollo）**
  - https://github.com/apolloconfig/apollo

假设我们的程序是分布式部署在多台机器上，如果我们要改变程序的配置文件，需要逐台机器去修改，非常麻烦，现在把这些配置全部放到zookeeper上去，保存在 zookeeper 的某个目录节点中，然后所有相关应用程序对这个目录节点进行监听，一旦配置信息发生变化，每个应用程序就会收到 zookeeper 的通知，然后从 zookeeper 获取新的配置信息应用到系统中。



## 集群管理

zookeeper 利用事件监听器（watcher）实现集群等节点的状态监听

**用户在指定的集群等节点注册一些 watcher监听，当一些特定事件触发的时候，zookeeper服务端会将事件通知到感兴趣的客户端上**，该机制是zookeeper实现分布式协调服务的重要特性

客户端注册监听它关心的目录节点，当目录节点发生变化（数据改变、被删除、子目录节点增加删除）时，zookeeper会通知客户端。







# ZooKeeper 涉及端口

```bash
2181/tcp #zookeeper-server
2888/tcp #zookeeper的leader节点独有的端口，负责向其它follower节点复制数据和进行心跳检测通信
3888/tcp #zookeeper进行leader选举使用的端口，所有zookeeper节点都会开启此端口
```



# ZooKeeper 老版本下载链接

http://archive.apache.org/dist/zookeeper/



# ZooKeeper 单机部署

## 先决条件

- 依赖 JDK-8-LTS 或以上LTS版本

## 二进制安装

### 安装JDK

- 过程省略

### 安装zookeeper

```bash
# 将二进制安装文件，解压到指定目录
tar xf /usr/local/src/apache-zookeeper*bin.tar.gz -C /usr/local/

# 创建软链接
ln -sv /usr/local/zookeeper*/ /usr/local/zookeeper

# 准备配置文件
cp /usr/local/zookeeper/conf/zoo_sample.cfg /usr/local/zookeeper/conf/zoo.cfg

# 修改配置文件 /usr/local/zookeeper/conf/zoo.cfg 中的数据存放目录 
dataDir=/usr/local/zookeeper/data

# 创建数据存放目录
mkdir -p /usr/local/zookeeper/data

# 启动zookeeper
/usr/local/zookeeper/bin/zkServer.sh start

# 查看端口是否开启成功
ss -ntl | grep 2181


# zookeeper service
cat > /etc/systemd/system/zookeeper.service << EOF
[Unit]
Description=Apache ZooKeeper
After=network.target

[Service]
Type=simple
User=root
Group=root
Environment="JAVA_HOME=/usr/local/jdk"
ExecStart=/usr/local/zookeeper/bin/zkServer.sh start-foreground
ExecStop=/usr/local/zookeeper/bin/zkServer.sh stop
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# 启动 service
systemctl daemon-reload ; systemctl enable --now zookeeper
```







# ZooKeeper 集群部署

ZooKeeper 集群用于解决单点和单机性能及数据高可用等问题

参考链接：

- https://zookeeper.apache.org/doc/r3.8.0/zookeeperStarted.html#sc_RunningReplicatedZooKeeper
- https://zookeeper.apache.org/doc/current/zookeeperAdmin.html#sc_maintenance

## 环境说明

| IP         | hostname         | service         |
| ---------- | ---------------- | --------------- |
| 10.0.0.100 | zookeeper-node-1 | zookeeper-3.8.0 |
| 10.0.0.101 | zookeeper-node-2 | zookeeper-3.8.0 |
| 10.0.0.102 | zookeeper-node-3 | zookeeper-3.8.0 |

## 安装JDK

- 过程省略

## 安装zookeeper

- 参考前面的单机二进制安装，安装完成后先不修改配置文件和启动zookeeper

## 配置zookeeper

### zookeeper-node1

- 修改配置文件

```bash
# vim /apps/apache-zookeeper-3.8.0-bin/conf/zoo.cfg
tickTime=2000 #zookeeper节点间心跳节点检测时间间隔，毫秒为单位

initLimit=10 #集群中的 leader 与 follower服务器的初始连接心跳检测次数，（此处的10表示 当初始连接超过10个2000毫秒后此follower将视为不可用）

syncLimit=5 #集群中的 leader 与 follower服务器的连接后，后期的心跳检测次数，（此处的5表示 当后续连接超过5个2000毫秒后此follower将视为不可用）

dataDir=/apps/apache-zookeeper-3.8.0-bin/data #自定义的zookeeper数据保存目录

clientPort=2181 #zookeeper监听的端口

maxClientCnxns=60 #最大的客户端连接数量，默认为60

autopurge.snapRetainCount=3 #要在dataDir中保留的快照数

autopurge.purgeInterval=1 #自动清理日志和快照文件的时间间隔，小时为单位，设置为0表示不开启自动清理

#定义zookeeper集群中的各个节点，2888端口用于各个节点间通信也就是数据同步（领导者将数据通过此端口复制到其它节点)，3888端口用于进行leader选举
server.1=10.0.0.100:2888:3888
server.2=10.0.0.101:2888:3888
server.3=10.0.0.102:2888:3888
```

- 定义集群节点ID，**myid文件的值一定要与配置文件中的值保持一致**

```bash
mkdir /apps/apache-zookeeper-3.8.0-bin/data/

echo 1 > /apps/apache-zookeeper-3.8.0-bin/data/myid
```

### zookeeper-node2

- 修改配置文件，和zookeeper-node1保持一致即可

```bash
#略
```

- 定义集群节点ID

```bash
mkdir /apps/apache-zookeeper-3.8.0-bin/data/

echo 2 > /apps/apache-zookeeper-3.8.0-bin/data/myid
```

### zookeeper-node3

- 修改配置文件，和zookeeper-node1保持一致即可

```bash
#略
```

- 定义集群节点ID

```bash
echo 3 > /apps/apache-zookeeper-3.8.0-bin/data/myid
```



## 启动zookeeper

- 所有节点执行，**启动时间一定要控制在设置的初始阈值时间内完成**

```bash
# /apps/apache-zookeeper-3.8.0-bin/bin/zkServer.sh start
/usr/bin/java
ZooKeeper JMX enabled by default
Using config: /apps/apache-zookeeper-3.8.0-bin/bin/../conf/zoo.cfg
Starting zookeeper ... STARTED #启动成功
```



## 验证

**注意：**因为所有节点都参与选举 所以**所有节点都开启3888端口**，因为leader节点需要向其它节点复制数据，所以**只有leader节点才开启2888端口**

- **node1**

```bash
# ss -ntl|grep -E "(2888|3888)"
LISTEN  0       50       [::ffff:10.0.0.100]:3888               *:*             

# /apps/apache-zookeeper-3.8.0-bin/bin/zkServer.sh status
/usr/bin/java
ZooKeeper JMX enabled by default
Using config: /apps/apache-zookeeper-3.8.0-bin/bin/../conf/zoo.cfg
Client port found: 2181. Client address: localhost. Client SSL: false.
Mode: follower #被选举为追随者节点
```

- **node2**

```bash
# ss -ntl|grep -E "(2888|3888)"
LISTEN  0       50       [::ffff:10.0.0.101]:2888               *:*             
LISTEN  0       50       [::ffff:10.0.0.101]:3888               *:*   


# /apps/apache-zookeeper-3.8.0-bin/bin/zkServer.sh status
/usr/bin/java
ZooKeeper JMX enabled by default
Using config: /apps/apache-zookeeper-3.8.0-bin/bin/../conf/zoo.cfg
Client port found: 2181. Client address: localhost. Client SSL: false.
Mode: leader #被选举为领导者节点
```

- **node3**

```bash
# ss -ntl|grep -E "(2888|3888)"
LISTEN  0       50       [::ffff:10.0.0.102]:3888               *:*


# /apps/apache-zookeeper-3.8.0-bin/bin/zkServer.sh status
/usr/bin/java
ZooKeeper JMX enabled by default
Using config: /apps/apache-zookeeper-3.8.0-bin/bin/../conf/zoo.cfg
Client port found: 2181. Client address: localhost. Client SSL: false.
Mode: follower #被选举为追随者节点
```







# ZooKeeper 集群特性

## follower 节点职责

- 负责响应客户端的读请求
- 将写请求推送到 leader 节点交由其处理



## leader 节点职责

- 负责响应客户端的读写请求
- 将数据复制到各 follower 节点



## 半数写成功策略

- 类似于MySQL的半同步复制（主节点和部分从节点写入成功则通知用户成功）

- 集群中的 leader 节点 向 一半的 follower 节点写入成功就通知用户成功，此方式是zookeeper的默认策略，可以想象如果不采用此策略 那么如果因为有一个follower 节点宕机 而导致写入失败迟迟不能响应，那么只能返回给用户失败的结果，而半数写成功策略可以既兼顾性能 又具有冗余性
- 另外整个集群中只要有**超过一半**的 zookeeper 工作是正常的，那么整个集群对外就是可用的
  - 假设有两个 zookeeper 节点其中一个宕机，那么所有节点将不可用，**因为剩余的节点未超过总数的一半**
  - **三个节点个四个节点的冗余性一样，因为坏掉两个节点那么都将未超过节点总数的一半**







# ZooKeeper leader 选举流程

在Zookeeper中，分为两种选举情况

- 初始化集群分布式的时候会进行leader选举
- 运行期间leader出现故障会进行选举

## 说明

### 节点角色

- **注意：下面所说的事务其实就是写请求**

**领导者 leader**

- 事务请求的唯一调度和处理者，保证集群事务处理的顺序性
- 集群内部各服务器的调度者

**学习者 learner**

- **跟随者 follower**
  - 处理客户端非事务请求，转发事务请求给 leader 服务器
  - 参与事务请求 proposal 的投票
  - 参与 leader 选举的投票
- **观察者 observer**
  - follower 和 observer的唯一区别是 既不参与写操作的"半数写成功"策略 也不参与leader的选举，因此 observer 机器可以在不影响写性能的情况下提升集群的读性能

**客户端 client**

- 请求发起方



### 节点角色状态

**LOOKING**

- 选举中
- 正在寻找leader，即将进入leader选举流程中

**LEADING**

- 领导者状态

- 处于该状态的节点说明已经是 leader 角色（在zookeeper中，只有leader才有写权限，其他节点（FOLLOWING）是没有写权限的 但可以读）

**FOLLOWING**

- 追随者状态
- 表示 leader 已经选举出来，当前节点的角色为 follow，主要具备以下几个功能点：
  - 向leader发送请求（PING消息、REQUEST消息、ACK消息、REVALIDATE消息）
  - 接收leader消息并进行处理
  - 接收client发送过来的请求，如果为写请求，会发送给Leader进行投票处理，然后返回client结果

**OBSERVER**

- 观察者状态
- 表示当前节点的角色为 observer
- observer 和 follow类似，但observer不参与leader的投票选举，只接受leader选举后的结果



### 选举ID

**ZXID**

- zookeeper transaction id，每个改变 zookeeper 状态的操作都会形成一个对应的zxid

**myid**

- 服务器的唯一表示(SID)，通过配置 myid 文件指定，同一集群中必须唯一



### 成为leader的必要条件

- leader 需要具有最高的 zxid
- 集群中的节点必须一半以上（n/2+1）的 follow得到响应 才能实现选举出leader



## 初始化集群选举

当启动初始化集群的时候，server1的myid为1，zxid为0  server2的myid为2，zxid同样是0，以此类推。

此种情况下zxid都是为0。**先比较zxid，zxid如果相同，再比较myid**

### 流程

1. 服务器1启动，给自己投票，然后发投票信息，由于其它机器还没有启动所以它收不到反馈信息，服务器1的状态一直属于Looking(选举状态)。
2. 服务器2启动，给自己投票，同时与之前启动的服务器1交换结果，由于服务器2的myid大所以服务器2胜出  并且 此时投票数正好大于半数，所以服务器2此时为leader
3. 服务器3启动，给自己投票，同时与之前启动的服务器1,2交换信息，虽然服务器3的myid最大但是服务器2已经成为领导者，所以服务器3成为服务器2的FOLLOWING

### 总结

- 在初始化集群节点时，一般到过半的机器数的时候谁的myid最大一般就是leader



## leader节点故障选举

- leader 与 follower 间使用PING机制(心跳) 来感知对方是否存活，当leader无法响应PING时，将重新发起 leader 选举
- 假设场景：
  - server1，follower，myid为1，zxid为160
  - server2，leader，myid为2，zxid为170
  - server3，follower，myid为3，zxid为180
- **通过 zxid（事务id ）进行对比，zxid最大的则胜出选举为leader，因为zxid最大的则代表数据最新**

### 流程

1. 假设此时 server2 即 leader节点宕机，并且到达了指定的时间阈值后 leader节点未向其它 follower节点发送心跳响应，则选举开始
2. 同样首先比较zxid，server3的zxid 大于 server1的zxid，server3胜出 server3选举为leader

**注意：如果leader节点宕机后，剩余的其它节点大于2，那么只要被选举为leader的节点投票数过半，后续的节点即使zxid再高 也会成为这个节点的 follower**



### 范例

- 所有集群节点和上文部署的一致

#### 模拟故障前

```bash
root@zookeeper-node-1:~# /apps/apache-zookeeper-3.8.0-bin/bin/zkServer.sh status
...
Mode: follower #follower

root@zookeeper-node-2:~# /apps/apache-zookeeper-3.8.0-bin/bin/zkServer.sh status
...
Mode: leader #leader

root@zookeeper-node-3:~# /apps/apache-zookeeper-3.8.0-bin/bin/zkServer.sh status
...
Mode: follower #follower
```

#### 模拟leader节点故障

```bash
root@zookeeper-node-2:~# /apps/apache-zookeeper-3.8.0-bin/bin/zkServer.sh stop
```

#### 选举结果

```bash
root@zookeeper-node-1:~# /apps/apache-zookeeper-3.8.0-bin/bin/zkServer.sh status
...
Mode: follower
root@zookeeper-node-1:~# ss -ntl|grep -E "(2888|3888)"
LISTEN  0       50       [::ffff:10.0.0.100]:3888               *:*         


----------------------------------------------------------------



root@zookeeper-node-3:~# /apps/apache-zookeeper-3.8.0-bin/bin/zkServer.sh status
...
Mode: leader
root@zookeeper-node-3:~# ss -ntl|grep -E "(2888|3888)"
LISTEN  0       50       [::ffff:10.0.0.102]:2888               *:*             
LISTEN  0       50       [::ffff:10.0.0.102]:3888               *:*         
```







# ZooKeeper 使用

更多使用范例，参阅：https://zookeeper.apache.org/doc/r3.8.0/zookeeperCLI.html

```bash
#通过自带的客户端工具连接到zookeeper
# /apps/apache-zookeeper-3.8.0-bin/bin/zkCli.sh -server 127.0.0.1:2181
/usr/bin/java
Connecting to 127.0.0.1:2181
...
WatchedEvent state:SyncConnected type:None path:null
[zk: 127.0.0.1:2181(CONNECTED) 0] 


#列出客户端可以执行的命令
[zk: 127.0.0.1:2181(CONNECTED) 0] help
ZooKeeper -server host:port -client-configuration properties-file cmd args
	addWatch [-m mode] path # optional mode is one of [PERSISTENT, PERSISTENT_RECURSIVE] - default is PERSISTENT_RECURSIVE
	addauth scheme auth
	close 
	config [-c] [-w] [-s]
	connect host:port
	create [-s] [-e] [-c] [-t ttl] path [data] [acl]
	delete [-v version] path


#列出zookeeper的目录
[zk: 127.0.0.1:2181(CONNECTED) 4] ls /
[zookeeper]


#创建zk_test录（创建一个新的 znode 并将字符串“my_data”与该节点相关联）
[zk: 127.0.0.1:2181(CONNECTED) 5] create /zk_test my_data
Created /zk_test #创建成功
[zk: 127.0.0.1:2181(CONNECTED) 6] ls / #查看结果
[zk_test, zookeeper] #结果


#验证数据是否与 znode 关联
[zk: 127.0.0.1:2181(CONNECTED) 9] get -s /zk_test
my_data
cZxid = 0x2
ctime = Sat Jun 11 13:29:55 UTC 2022
mZxid = 0x2
mtime = Sat Jun 11 13:29:55 UTC 2022
pZxid = 0x2
cversion = 0
dataVersion = 0
aclVersion = 0
ephemeralOwner = 0x0
dataLength = 7
numChildren = 0


#更改
[zk: 127.0.0.1:2181(CONNECTED) 10] set /zk_test junk
[zk: 127.0.0.1:2181(CONNECTED) 11] get -s /zk_test
junk #更改成功
cZxid = 0x2
ctime = Sat Jun 11 13:29:55 UTC 2022
mZxid = 0x3
mtime = Sat Jun 11 13:38:02 UTC 2022
pZxid = 0x2
cversion = 0
dataVersion = 1
aclVersion = 0
ephemeralOwner = 0x0
dataLength = 4
numChildren = 0


#删除
[zk: 127.0.0.1:2181(CONNECTED) 12] delete /zk_test
[zk: 127.0.0.1:2181(CONNECTED) 13] ls /
[zookeeper] #删除成功
```





# ZooKeeper 数据备份

在 ZooKeeper 中，主要需要备份的数据是 ZooKeeper 的数据目录，该目录包含了整个 ZooKeeper 集群的数据和状态信息。ZooKeeper 的数据目录通常被指定为配置文件（`zoo.cfg`）中的 `dataDir` 参数所定义的路径。在进行备份时，您应该备份整个 `dataDir` 目录，因为它包含了以下关键的数据和状态信息：

1. **事务日志（transaction log）：** ZooKeeper 使用事务日志来记录每个更新操作的详细信息，包括创建、删除、更新节点等。这些事务日志是 ZooKeeper 数据的变更历史记录。

2. **快照（snapshot）：** ZooKeeper 会定期创建快照，它是数据目录的一个副本，包含了某个时间点上整个 ZooKeeper 数据树的状态。快照是用于恢复 ZooKeeper 数据的一种手段，结合事务日志，可以还原到最新的状态。

在备份 ZooKeeper 数据时，您应该同时备份事务日志和最新的快照。备份的频率可以根据您的需求和数据变更的频率来确定。定期备份是保持系统可靠性和数据完整性的重要措施，尤其是在发生故障或意外数据丢失时，备份可以用于恢复数据。
