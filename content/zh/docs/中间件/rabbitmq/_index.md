---
title: "RabbitMQ"
weight: 20
---

# RabbitMQ 简介

RabbitMQ官网：https://www.rabbitmq.com/

RabbitMQ 采用 Erlang 语言开发，Erlang 语言由 Ericson 设计，Erlang 在分布式编程和故障恢复方面表现出色，广泛使用于电信等领域

Erlang官网：https://www.erlang.org/



**RabbitMQ 特点**

- 高并发
- 分布式
- 消息确认机制
- 消息持久化机制
- 消息可靠性 和 集群高可靠性
- 简单易用
- 运行稳定
- 跨平台
- 多语言
- 开源





# RabbitMQ 运行原理

<img src="/docs/中间件/rabbitmq/rabbit1.png" alt="rabbit1" style="zoom: 100%;" />

**Publisher**

- 发布者



**Broker**

- 代理，接受和分发消息的应用，RabbitMQ Server 就是 Message Broker



**Virtual Host**

- 虚拟主机，出于多租户和安全因素设计的，把 AMQP 的基本组件划分到一个虚拟的分组中，类似网络中的 namespace 概念；
- 当多个不同的用户使用同一个 RabbitMQ Server 提供的服务时，可以划分出多个 vhost ，每个用户在自己的 vhost 创建 exchange(交换) / queue(队列) 等



**Exchange**

- message 到达 broker 的第一站，根据分发规则 匹配查询表中的 routing key（路由关键字），分发消息到 queue 中去
- 常用的类型有：
  - direct 直接（point-to-point）
  - topic 标题（publish-subscribe 发布-订阅）
  - fanout 输出（multicast 多播，多点传送）



**Binding**

- exchange 和 queue 之间的虚拟连接，binding 中可以包含 routing key
- binding 信息被保存到 exchange 中的查询表中，用于 message 的分发依据



**Queue**

- 队列

- 信息最终被送到这里等待 consumer 取走
- Queue 的特性：
  - 消息基于先进先出的原则进行顺序消费
  - 消息可以持久化到磁盘节点服务器
  - 消息可以缓存到内存节点服务器提高性能



**Connection**

- publisher / consumer 和 broker 之间的 TCP 连接



**Channel**

- 频道
- 如果每一次访问 RabbitMQ 都建立一个 Connection，在消息量大的时候建立 TCP Connection 的开销将是巨大的，效率也较低。
- Channel 是在 Connection内部建立的逻辑连接，如果应用程序支持多线程，通常每个 Thread 创建单独的 Channel 进行通信
- AMQP method 包含了 channel id 帮助客户端 和 message broker 识别 channel，所以channel之间是完全隔离的
- channel 作为轻量级的 connection 极大减少了操作系统建立 TCP Connection 的开销



**Consumer**

- 消费者







# RabbitMQ 发布者/消费者

<img src="/docs/中间件/rabbitmq/rabbitmq2.png" alt="rabbitmq2" style="zoom:50%;" />

**说明：**

1. Publisher 发布者将消息发送到 Broker Server（RabbitMQ）
2. 在 Broker 内部，用户创建 Exchange / Queue，通过 Binding 规则将两者联系在一起
3. Exchange 分发消息，根据类型 Binding 的不同分发策略有区别
4. 消息最后来到 Queue 中，等待 Consumer 消费者取走





# RabbitMQ 部署前言

版本参考链接：https://rabbitmq.com/which-erlang.html

- 小版本号迭代的越多 通常越稳定



# RabbitMQ 单机部署

## at Ubuntu or Debian

参考链接：https://rabbitmq.com/install-debian.html

### 基于Cloudsmith安装

参考链接：https://rabbitmq.com/install-debian.html#apt-cloudsmith

其中包含最新的 RabbitMQ 和现代 Erlang 版本提供包。

```bash
# 更新仓库
sudo apt-get update -y


# 安装依赖包
apt-get -y install curl gnupg apt-transport-https


# 获取RabbitMQ 团队的主要签名密钥
curl -1sLf "https://keys.openpgp.org/vks/v1/by-fingerprint/0A9AF2115F4687BD29803A206B73A36E6026DFCA" | sudo gpg --dearmor | sudo tee /usr/share/keyrings/com.rabbitmq.team.gpg > /dev/null


# Cloudsmith：现代 Erlang 存储库密钥
curl -1sLf https://dl.cloudsmith.io/public/rabbitmq/rabbitmq-erlang/gpg.E495BB49CC4BBE5B.key | sudo gpg --dearmor | sudo tee /usr/share/keyrings/io.cloudsmith.rabbitmq.E495BB49CC4BBE5B.gpg > /dev/null


# Cloudsmith：RabbitMQ 存储库密钥
curl -1sLf https://dl.cloudsmith.io/public/rabbitmq/rabbitmq-server/gpg.9F4587F226208342.key | sudo gpg --dearmor | sudo tee /usr/share/keyrings/io.cloudsmith.rabbitmq.9F4587F226208342.gpg > /dev/null


# 添加由 RabbitMQ Team 维护的 apt 存储库
sudo tee /etc/apt/sources.list.d/rabbitmq.list <<EOF
## Provides modern Erlang/OTP releases
##
deb [signed-by=/usr/share/keyrings/io.cloudsmith.rabbitmq.E495BB49CC4BBE5B.gpg] https://dl.cloudsmith.io/public/rabbitmq/rabbitmq-erlang/deb/ubuntu bionic main
deb-src [signed-by=/usr/share/keyrings/io.cloudsmith.rabbitmq.E495BB49CC4BBE5B.gpg] https://dl.cloudsmith.io/public/rabbitmq/rabbitmq-erlang/deb/ubuntu bionic main

## Provides RabbitMQ
##
deb [signed-by=/usr/share/keyrings/io.cloudsmith.rabbitmq.9F4587F226208342.gpg] https://dl.cloudsmith.io/public/rabbitmq/rabbitmq-server/deb/ubuntu bionic main
deb-src [signed-by=/usr/share/keyrings/io.cloudsmith.rabbitmq.9F4587F226208342.gpg] https://dl.cloudsmith.io/public/rabbitmq/rabbitmq-server/deb/ubuntu bionic main
EOF


# 查看apt仓库文件是否生成完毕
cat /etc/apt/sources.list.d/rabbitmq.list
...

# 更新仓库
sudo apt-get update -y

# 安装 Erlang 相关包
sudo apt-get install -y erlang-base \
                        erlang-asn1 erlang-crypto erlang-eldap erlang-ftp erlang-inets \
                        erlang-mnesia erlang-os-mon erlang-parsetools erlang-public-key \
                        erlang-runtime-tools erlang-snmp erlang-ssl \
                        erlang-syntax-tools erlang-tftp erlang-tools erlang-xmerl

#查看 rabbitmq-server 支持的安装版本
apt-cache madison rabbitmq-server

# 安装 rabbitmq-server 指定版本
apt-get install -y rabbitmq-server=3.8.34-1

# 安装完成后 rabbitmq默认启动并开机自启动，可以观察启动状态和4369端口是否开启
root@rabbitmq-node-1:~# systemctl status rabbitmq-server.service 
...
root@rabbitmq-node-1:~# ss -ntl|grep 4369
LISTEN  0        128              0.0.0.0:4369           0.0.0.0:*              
LISTEN  0        128                 [::]:4369              [::]:*
```



## 二进制安装

- 二进制安装后使用apt/yum安装时的service文件能启动 但**启动时一直卡住可以安装socat工具解决**





# RabbitMQ 集群部署

一个 RabbitMQ 集群是一个或多个节点的逻辑分组，每个节点共享用户、虚拟主机、队列、交换器、绑定、运行时参数和其他分布式状态。

参考文档：https://rabbitmq.com/clustering.html

## 前言

- 因为有几个特性（例如[quorum queues](https://rabbitmq.com/quorum-queues.html)，[MQTT 中的客户端跟踪](https://rabbitmq.com/mqtt.html)）需要集群成员之间达成共识，所以强烈建议使用奇数个集群节点：1、3、5、7 等等。

- **强烈建议不要使用**两个节点集群，因为集群节点不可能在连接丢失的情况下识别多数并形成共识。例如，当两个节点失去连接时，MQTT 客户端连接将不被接受，仲裁队列将失去可用性，等等。

#### 工作模式

- **经典队列模式**
  - queue创建后，如果没有其它policy，那么**消息将只存在一个节点，其他节点只存储该消息的元数据（队列结构）**，这时如果consumer向非存在消息的节点获取数据，那么rabbitmq将会将存储消息节点的消息发送给非存在消息的节点 最后consumer获取到消息，此方式**缺点是当存在消息的节点故障后将无法获取未消费的消息实体**
  - 经典队列仍将是受支持的非复制队列类型。
- **持久镜像队列模式（已弃用）**
  - queue创建后，消息将同步到所有节点，优点：高可用性提高，缺点：当queue过多时 系统性能和网络带宽消耗增加
  - 经典队列镜像将**在 RabbitMQ 的未来版本**中移除
- **仲裁队列Quorum Queues（替代镜像集群模式，目前主流）**
  - **默认选择**
  - 从 RabbitMQ 3.8.0 开始可用，**仲裁队列 是 持久镜像队列的替代方案**
  - 从 RabbitMQ 3.10 开始支持，仲裁队列[支持消息 TTL](https://blog.rabbitmq.com/posts/2022/05/rabbitmq-3.10-release-overview/) ，与镜像经典队列相比，提供[更高的吞吐量和更稳定的延迟。](https://blog.rabbitmq.com/posts/2022/05/rabbitmq-3.10-performance-improvements/)
  - 参考链接：https://rabbitmq.com/quorum-queues.html



#### 集群持久化

- 三个节点实现集群持久化，分为两种角色 RAM内存角色(非持久化) 和  Disk磁盘角色(持久化)
- 内存角色通常为两个，磁盘角色通常为一个，数据采集优先向内存角色获取



#### 集群聚合与分离

- 集群的组成可以动态改变。所有 RabbitMQ 代理都开始运行在单个节点上。这些节点可以加入到集群中，然后再次变成单独的代理。

**节点名称（标识符）**

- RabbitMQ 集群节点名称**由前缀和主机名组成**，如：rabbit@mq-node1.xiangzheng.vip，rabbit为前缀，node1.messaging.com为主机名
- **注意事项：**
  - 集群中的节点名称必须唯一，如：rabbit1@hostname 和 rabbit2@hostname
  - 因为使用节点名称相互通信，所以每个节点名称的主机名都必须可以解析，另外ctl工具还使用节点名称识别和寻址节点



## 环境说明

| IP         | hostname        | server         |
| ---------- | --------------- | -------------- |
| 10.0.0.100 | rabbitmq-node-1 | rabbitmq3.8.34 |
| 10.0.0.101 | rabbitmq-node-2 | rabbitmq3.8.34 |
| 10.0.0.102 | rabbitmq-node-3 | rabbitmq3.8.34 |



## 每个节点单机部署MQ

- 参阅上面的 RabbitMQ 单机部署



## 配置主机名解析

两种实现方案：

- 本地域名解析文件：/etc/hosts
- DNS 记录

### 通过本地域名解析文件

- 在所有节点配置

```bash
# vim /etc/hosts
...
10.0.0.100 rabbitmq-node-1 mq-node1.xiangzheng.vip
10.0.0.101 rabbitmq-node-2 mq-node2.xiangzheng.vip
10.0.0.102 rabbitmq-node-3 mq-node3.xiangzheng.vip
```

### 通过DNS 记录



## 每个节点设置相同的cookie

- 共享密钥，称为 Erlang cookie，各个节点必须相同

- 存放位置通常位于/var/lib/rabbitmq/.erlang.cookie，**此文件权限必须为400**

  - ```bash
    # ll /var/lib/rabbitmq/.erlang.cookie
    -r-------- 1 rabbitmq rabbitmq 20 Jun  8 00:00 /var/lib/rabbitmq/.erlang.cookie
    ```

- 从rabbitmq3.8.6版本后，可以使用以下命令来获取 Erlang cookie的相关信息

  - ```bash
    rabbitmq-diagnostics erlang_cookie_sources
    ```

### 实现

```bash
#获取其中一个节点的cookie
root@rabbitmq-node-1:~# cat /var/lib/rabbitmq/.erlang.cookie;echo
CMUXOKJKCLLBDCSECOXL

#重定向到其他节点
root@rabbitmq-node-2:~# echo 'CMUXOKJKCLLBDCSECOXL' > /var/lib/rabbitmq/.erlang.cookie
root@rabbitmq-node-3:~# echo 'CMUXOKJKCLLBDCSECOXL' > /var/lib/rabbitmq/.erlang.cookie

#重启被修改节点的服务，否则会报错，（CLI工具的Erlang cookie 和 服务器的节点的Erlang cookie不匹配）
root@rabbitmq-node-2:~# systemctl restart rabbitmq-server.service
root@rabbitmq-node-3:~# systemctl restart rabbitmq-server.service
```



## 设置为独立节点

- 在rabbitmq正常启动后执行以下操作

```bash
#在所有节点执行，设置为独立节点
rabbitmq-server -detached
```



## 加入前的集群状态

```erlang
# rabbitmqctl cluster_status
Cluster status of node rabbit@rabbitmq-node-1 ...
Basics

Cluster name: rabbit@rabbitmq-node-1 #注意此名称

Disk Nodes

rabbit@rabbitmq-node-1

Running Nodes

rabbit@rabbitmq-node-1

Versions

rabbit@rabbitmq-node-1: RabbitMQ 3.8.34 on Erlang 25.0

Maintenance status

Node: rabbit@rabbitmq-node-1, status: not under maintenance

Alarms

(none)

Network Partitions

(none)

Listeners

Node: rabbit@rabbitmq-node-1, interface: [::], port: 15672, protocol: http, purpose: HTTP API
Node: rabbit@rabbitmq-node-1, interface: [::], port: 25672, protocol: clustering, purpose: inter-node and CLI tool communication
Node: rabbit@rabbitmq-node-1, interface: [::], port: 5672, protocol: amqp, purpose: AMQP 0-9-1 and AMQP 1.0

Feature flags

Flag: drop_unroutable_metric, state: disabled
Flag: empty_basic_get_metric, state: disabled
Flag: implicit_default_bindings, state: enabled
Flag: maintenance_mode_status, state: enabled
Flag: quorum_queue, state: enabled
Flag: user_limits, state: enabled
Flag: virtual_host_metadata, state: enabled
```



## 重置准备加入集群的节点

- 这里假设将 mq-node2 和 mq-node3 重置，并后续加入到mq-node1 节点中
- **注意：被重置的节点将清空所有数据**
- 在 mq-node2 和 mq-node3执行

```bash
#停止节点
rabbitmqctl stop_app

#重置节点
rabbitmqctl reset
```



## 将重置完成的节点加入集群

- 在 mq-node2 和 mq-node3 节点执行

```bash
#以内存角色的方式 加入到 mq-node1 节点
rabbitmqctl join_cluster rabbit@rabbitmq-node-1 --ram

#启动节点
rabbitmqctl start_app
```



## 加入后的集群状态

```erlang
# rabbitmqctl cluster_status
Cluster status of node rabbit@rabbitmq-node-1 ...
Basics

Cluster name: rabbit@rabbitmq-node-1

Disk Nodes

rabbit@rabbitmq-node-1

RAM Nodes

rabbit@rabbitmq-node-2 #增加的内存角色
rabbit@rabbitmq-node-3 #增加的内存角色

Running Nodes

rabbit@rabbitmq-node-1
rabbit@rabbitmq-node-2
rabbit@rabbitmq-node-3

Versions

rabbit@rabbitmq-node-1: RabbitMQ 3.8.34 on Erlang 25.0
rabbit@rabbitmq-node-2: RabbitMQ 3.8.34 on Erlang 25.0.1
rabbit@rabbitmq-node-3: RabbitMQ 3.8.34 on Erlang 25.0.1

Maintenance status

Node: rabbit@rabbitmq-node-1, status: not under maintenance
Node: rabbit@rabbitmq-node-2, status: not under maintenance
Node: rabbit@rabbitmq-node-3, status: not under maintenance

Alarms

(none)

Network Partitions

(none)

Listeners

Node: rabbit@rabbitmq-node-1, interface: [::], port: 15672, protocol: http, purpose: HTTP API
Node: rabbit@rabbitmq-node-1, interface: [::], port: 25672, protocol: clustering, purpose: inter-node and CLI tool communication
Node: rabbit@rabbitmq-node-1, interface: [::], port: 5672, protocol: amqp, purpose: AMQP 0-9-1 and AMQP 1.0
Node: rabbit@rabbitmq-node-2, interface: [::], port: 25672, protocol: clustering, purpose: inter-node and CLI tool communication
Node: rabbit@rabbitmq-node-2, interface: [::], port: 5672, protocol: amqp, purpose: AMQP 0-9-1 and AMQP 1.0
Node: rabbit@rabbitmq-node-3, interface: [::], port: 25672, protocol: clustering, purpose: inter-node and CLI tool communication
Node: rabbit@rabbitmq-node-3, interface: [::], port: 5672, protocol: amqp, purpose: AMQP 0-9-1 and AMQP 1.0

Feature flags

Flag: drop_unroutable_metric, state: enabled
Flag: empty_basic_get_metric, state: enabled
Flag: implicit_default_bindings, state: enabled
Flag: maintenance_mode_status, state: enabled
Flag: quorum_queue, state: enabled
Flag: user_limits, state: enabled
Flag: virtual_host_metadata, state: enabled
```



## 所有节点启动web界面插件

- 不启动web插件的节点会在web界面显示节点统计信息不可用 Node statistics not available

```bash
rabbitmq-plugins enable rabbitmq_management

#开启成功后会打开15672端口
# ss -ntl|grep 15672
LISTEN  0        1024             0.0.0.0:15672          0.0.0.0:* 
```



## 集群实现故障排错

join_cluster时无法加入到主节点

1. **/var/lib/rabbitmq/.erlang.cookie文件各节点是否一致**
   - 可以使用sha512sum等方式计算文件的哈希值是否一致
2. **主机名是否可以解析**
   - ...
3. ...
   - ...





# RabbitMQ helm 部署

https://artifacthub.io/packages/helm/bitnami/rabbitmq

```sh
helm install rabbitmq \
bitnami/rabbitmq \
-n rabbitmq \
--version 12.0.4 \
--set global.storageClass="nfs-client"
```

- 输出结果

```
NAME: rabbitmq
LAST DEPLOYED: Tue Jul 11 09:58:50 2023
NAMESPACE: rabbitmq
STATUS: deployed
REVISION: 1
TEST SUITE: None
NOTES:
CHART NAME: rabbitmq
CHART VERSION: 12.0.4
APP VERSION: 3.12.1** Please be patient while the chart is being deployed **

Credentials:
    echo "Username      : user"
    echo "Password      : $(kubectl get secret --namespace rabbitmq rabbitmq -o jsonpath="{.data.rabbitmq-password}" | base64 -d)"
    echo "ErLang Cookie : $(kubectl get secret --namespace rabbitmq rabbitmq -o jsonpath="{.data.rabbitmq-erlang-cookie}" | base64 -d)"

Note that the credentials are saved in persistent volume claims and will not be changed upon upgrade or reinstallation unless the persistent volume claim has been deleted. If this is not the first installation of this chart, the credentials may not be valid.
This is applicable when no passwords are set and therefore the random password is autogenerated. In case of using a fixed password, you should specify it when upgrading.
More information about the credentials may be found at https://docs.bitnami.com/general/how-to/troubleshoot-helm-chart-issues/#credential-errors-while-upgrading-chart-releases.

RabbitMQ can be accessed within the cluster on port 5672 at rabbitmq.rabbitmq.svc.cluster.local

To access for outside the cluster, perform the following steps:

To Access the RabbitMQ AMQP port:

    echo "URL : amqp://127.0.0.1:5672/"
    kubectl port-forward --namespace rabbitmq svc/rabbitmq 5672:5672

To Access the RabbitMQ Management interface:

    echo "URL : http://127.0.0.1:15672/"
    kubectl port-forward --namespace rabbitmq svc/rabbitmq 15672:15672

```

- 1

```
Username: user

Password: lYyJ9eL8eaQYTNt8

ErLang Cookie: Zlj66qlF53xtVxppoh8NEzkxexrDTAXL

RabbitMQ Management UI: http://172.16.0.120:32259
```



# RabbitMQ 集群管理

参考文档：https://rabbitmq.com/clustering.html#hostname-resolution-requirement

## 更改节点类型

我们可以将节点的类型从 ram 更改为 disc，反之亦然。假设我们想颠倒 rabbit@rabbit2和rabbit@rabbit1的类型，将前者从 ram 节点变为磁盘节点，将后者从磁盘节点变为 ram 节点。为此，我们可以使用 change_cluster_node_type命令。必须先停止节点。

```bash
# on rabbit2
rabbitmqctl stop_app
# => Stopping node rabbit@rabbit2 ...done.

rabbitmqctl change_cluster_node_type disc
# => Turning rabbit@rabbit2 into a disc node ...done.

rabbitmqctl start_app
# => Starting node rabbit@rabbit2 ...done.

# on rabbit1
rabbitmqctl stop_app
# => Stopping node rabbit@rabbit1 ...done.

rabbitmqctl change_cluster_node_type ram
# => 将 rabbit@rabbit1 变成一个 ram 节点 ...完成。

rabbitmqctl start_app
# => 开始节点 rabbit@rabbit1 ...完成。
```



# RabbitMQ 端口说明

CLI 工具、客户端库和 RabbitMQ 节点也打开连接（客户端 TCP 套接字）。**防火墙可以阻止节点和 CLI 工具相互通信。确保可以访问以下端口：**

- 4369：[epmd](http://erlang.org/doc/man/epmd.html)，RabbitMQ 节点和 CLI 工具使用的对等发现服务
- 5672、5671：由不带和带 TLS 的 AMQP 0-9-1 和 1.0 客户端使用
- 25672：用于节点间和 CLI 工具通信（Erlang 分发服务器端口），从动态范围分配（默认限制为单个端口，计算为 AMQP 端口 + 20000）。除非这些端口上的外部连接确实是必要的（例如集群使用[联邦](https://rabbitmq.com/federation.html)或在子网外的机器上使用 CLI 工具），否则这些端口不应公开。有关详细信息，请参阅[网络指南](https://rabbitmq.com/networking.html)。
- 35672-35682：由 CLI 工具（Erlang 分发客户端端口）用于与节点通信，并从动态范围分配（计算为服务器分发端口 + 10000 到服务器分发端口 + 10010）。有关详细信息，请参阅[网络指南](https://rabbitmq.com/networking.html)。
- 15672：[HTTP API](https://rabbitmq.com/management.html)客户端、[管理 UI](https://rabbitmq.com/management.html)和[rabbitmqadmin](https://rabbitmq.com/management-cli.html) （仅在启用[管理插件](https://rabbitmq.com/management.html)的情况下）
- 61613、61614：不带和带 TLS 的[STOMP 客户端](https://stomp.github.io/stomp-specification-1.2.html)（仅在启用[STOMP 插件](https://rabbitmq.com/stomp.html)的情况下）
- 1883、8883：如果启用了[MQTT 插件](https://rabbitmq.com/mqtt.html)，则不带和带 TLS 的[MQTT 客户端](http://mqtt.org/)
- 15674：STOMP-over-WebSockets 客户端（仅当[Web STOMP 插件](https://rabbitmq.com/web-stomp.html)启用时）
- 15675：MQTT-over-WebSockets 客户端（仅当启用[Web MQTT 插件时）](https://rabbitmq.com/web-mqtt.html)
- 15692：Prometheus 指标（仅在启用[Prometheus 插件](https://rabbitmq.com/prometheus.html)的情况下）

可以将[RabbitMQ 配置](https://rabbitmq.com/configure.html) 为使用[不同的端口和特定的网络接口](https://rabbitmq.com/networking.html)。





# RabbitMQ 配置说明

新版rabbitmq无主配置文件，基本是有相关命令行工具来控制mq的各种功能

配置指南参考链接：https://rabbitmq.com/configure.html

生产检查表参考链接：https://rabbitmq.com/production-checklist.html（了解开发环境之外的指南。）

## 注意事项

- 节点设置为作为系统用户rabbitmq运行。如果[节点数据库或日志](https://rabbitmq.com/relocate.html)的位置发生更改，则文件和目录必须归该用户所有。







# RabbitMQ 命令行工具

## rabbitmqctl

用于服务管理和一般操作员任务

```bash
#列出用户名和标签
rabbitmqctl list_users

#交互模式添加用户并设置密码，默认情况下，此用户对任何虚拟主机都没有权限
rabbitmqctl add_user <username>

#非交互模式添加用户并设置密码，默认情况下，此用户对任何虚拟主机都没有权限
rabbitmqctl add_user <username> <password>

#为用户打标签
rabbitmqctl set_user_tags <username> <tags_name>

#更改用户密码
rabbitmqctl change_password <username> <password>

#删除用户
rabbitmqctl delete_user '用户名'

#创建vhost
rabbitmqctl add_vhost <vhost_name>

#列出所有vhost
rabbitmqctl list_vhosts

#列出所有队列
rabbitmqctl list_queues

#
```



## rabbitmq-diagnostics

用于诊断和健康检查

```bash
#探测rabbitmq是否存活
rabbitmq-diagnostics ping

#打印rabbitmq的当前状态
rabbitmq-diagnostics status

#打印群集成员信息
rabbitmq-diagnostics cluster_status

#打印有效的节点配置
rabbitmq-diagnostics environment
```





## rabbitmq-plugins

用于插件管理

参考文档：https://www.rabbitmq.com/management.html

**子命令说明：**

- **list** 列出插件及其状态
  - **E** 显式启用
  - **e** 隐式启用
  - **\*** 正在运行

- **enable** 启用插件
- **disable** 禁用插件





## rabbitmq-queues

用于队列上的维护任务，特别是仲裁队列



## rabbitmq-upgrade

用于与升级相关的维护任务





# RabbitMQ 虚拟主机

虚拟主机相关文档：https://www.rabbitmq.com/vhosts.html

每一个RabbitMQ服务器都能创建虚拟的消息服务器，我们称之为虚拟主机（virtual host)，简称vhost.每一个vhost是一个独立的小型服务器，拥有自己独立的队列，交换器等。它拥有自己独立的权限。vhost之于这个RabbitMQ服务器就像虚拟机于物理服务器一样。它能将众多客户分割开来，又可以避免队列和交换器等的命名冲突。vhost之间是绝对隔离的。
通常来讲，默认的vhost名字是"/".

RabbitMQ 是多租户系统：连接、交换、队列、绑定、用户权限、策略和其他一些东西属于**虚拟主机**、实体的逻辑组。

RabbitMQ中的虚拟主机类似于nginx中的虚拟主机（server块），但不同的是RabbitMQ使用rabbitmqctl或 HTTP API创建和删除虚拟主机 。

## 创建虚拟主机

#### 使用命令行工具创建

```bash
#创建名为qa1的虚拟主机
rabbitmqctl add_vhost qa1
```

#### 使用API创建

- 可以使用PUT /api/vhosts/{name}  [HTTP API](https://www.rabbitmq.com/management.html)端点创建虚拟主机，其中{name}是虚拟主机的名称

```bash
#这是一个使用curl通过连接 rabbitmq.local:15672节点来创建虚拟主机vh1的示例：
curl -u userename:pa$sw0rD -X PUT http://rabbitmq.local:15672/api/vhosts/vh1
```



## 删除虚拟主机

- 删除虚拟主机将永久删除其中的所有实体（队列、交换、绑定、策略、权限等）

#### 使用命令行工具删除

```bash
#删除名为qa1的虚拟主机
rabbitmqctl delete_vhost qa1
```

#### 使用API删除

```bash
#这是一个使用curl通过连接 rabbitmq.local:15672节点来删除虚拟主机vh1的示例：
curl -u userename:pa$sw0rD -X DELETE http://rabbitmq.local:15672/api/vhosts/vh1
```



## 配置限制

- 使用 rabbitmqctl 配置限制，详情参考官方文档虚拟主机篇

  





# RabbitMQ 用户管理

身份验证、授权、访问控制

参考文档：https://rabbitmq.com/access-control.html#user-management

## 注意事项

- 身份验证和授权经常被混淆或互换使用。这是错误的，在 RabbitMQ 中，两者是分开的。为简单起见，我们将身份验证定义为“识别用户是谁”，将授权定义为“确定用户可以做什么和不允许做什么”。

## 默认虚拟主机和用户

- 一个名为/的虚拟主机（斜杠）
- 一个名为guest的用户，默认密码为guest，被授予对/虚拟主机的完全访问权限
- 默认情况下，此用户只能用于主机本地连接。使用它的远程连接将被拒绝。
- 生产环境不应使用默认用户，而是使用生成的凭据创建新用户帐户。

## 添加用户并设置密码

```bash
#交互模式
rabbitmqctl add_user "用户名"

#非交互模式1，注意某些字符如$、&、&、#等必须转义以避免
echo '123456' | rabbitmqctl add_user '用户名'

#非交互模式1，注意某些字符如$、&、&、#等必须转义以避免
rabbitmqctl add_user '用户名'  '123456'

#列出用户，普通格式输出
rabbitmqctl list_users

#列出用户，json格式输出
rabbitmqctl list_users --formatter=json
```

## 向用户授予权限

**向虚拟主机中的用户授权，如没有虚拟主机需事先创建**

授权相关文档：https://www.rabbitmq.com/access-control.html#authorisation

- 第一个 ".\*" 用于配置每个实体的权限
- 第二个 ".\*" 表示每个实体的写权限
- 第三个 ".\*" 表示每个实体的读取权限

```bash
#为用户打标签，tags_name 为 administrator时表示设置此用户是管理员，可以获得UI访问权限
#使用“administrator”标记用户以获得完整的管理 UI 和 HTTP API 访问权限
rabbitmqctl set_user_tags <username> <tags_name>

#授权，.*含义参考上文
rabbitmqctl set_permissions -p "vhost_name" "username" ".*" ".*" ".*"

#范例
rabbitmqctl set_permissions -p "qa1" "azheng" ".*" ".*" ".*"
```

### 清除虚拟主机中用户的权限

```bash
#撤销虚拟主机的权限
rabbitmqctl clear_permissions -p "vhost_name"  "username"
```



## 删除用户

```bash
rabbitmqctl delete_user '用户名'
```



# RabbitMQ 管理

参考文档：https://www.rabbitmq.com/management.html

## 基于web界面管理

### 前言

**相关端口说明：**

- 5672：消费者访问的端口
- 15672：web管理端口
- 25672：集群状态通信端口

### 实现

```bash
#开启web界面管理插件
rabbitmq-plugins enable rabbitmq_management

#创建管理账号，默认账号和密码都为guest，但默认只允许localhost进行登录，
rabbitmqctl add_user azheng 123456

#可选项，将azheng用户打一个administrator的标签，以标记为管理员
rabbitmqctl set_user_tags azheng administrator

#创建虚拟主机（如实现存在可省略）
rabbitmqctl add_vhost qa1

#向用户授予权限
rabbitmqctl set_permissions -p "qa1" "azheng" ".*" ".*" ".*"
```

### 访问

- 浏览器登录账号进行管理，IP+15672端口











# RabbitMQ 监控

参考文档：

- https://rabbitmq.com/monitoring.html
- https://rabbitmq.com/management.html
- https://rabbitmq.com/prometheus.html

## API

当创建了管理员用户和授予了相应权限后，可以访问http://10.0.0.100:15672/api/index.html进行相应的API管理参考

互联网相同参考文档：https://rawcdn.githack.com/rabbitmq/rabbitmq-server/v3.10.5/deps/rabbitmq_management/priv/www/api/index.html

### 范例

```bash
#打印系统概览,包含队列总数、消费者总数、链接总数等信息，参阅：https://rabbitmq.com/monitoring.html
curl -s -u azheng:123456 http://10.0.0.100:15672/api/overview;echo



#打印集群节点的详细信息
curl -s -u azheng:123456 http://10.0.0.100:15672/api/nodes;echo
...
        "log_files": [
            "/var/log/rabbitmq/rabbit@rabbitmq-node-2.log",
            "/var/log/rabbitmq/rabbit@rabbitmq-node-2_upgrade.log"
        ],
        "db_dir": "/var/lib/rabbitmq/mnesia/rabbit@rabbitmq-node-2",
        "config_files": [],
        "net_ticktime": 60,
        "enabled_plugins": [
            "rabbitmq_management"
        ],
        "mem_calculation_strategy": "rss",
        "ra_open_file_metrics": {
            "ra_log_wal": 1,
            "ra_log_segment_writer": 0
        },
        "name": "rabbit@rabbitmq-node-2",
        "type": "ram",
        "running": true,
        "mem_used": 145985536,
        "mem_used_details": {
            "rate": 0.0
        },
...
```







## 集群状态监控

```bash
# cat rabbitmq_claster_monitor.sh 
#!/bin/bash
#
#********************************************************************
#Author:	     	xiangzheng
#QQ: 			    767483070
#Date: 		     	2022-06-10
#FileName：		    rabbitmq_claster_status_monitor.sh
#URL: 		    	https://www.xiangzheng.vip
#Email: 		    rootroot25@163.com
#Description：		The test script
#Copyright (C): 	2022 All rights reserved
#********************************************************************
USER='guest'
PASS='guest'
HOST='127.0.0.1'

#定义函数,判断集群中running节点的数量
mq_nodes_status(){
curl -s -u ${USER}:${PASS} http://${HOST}:15672/api/nodes|grep -Eo "\"running\"\:true\,"|wc -l
}

#调用函数
mq_nodes_status
```







## 内存使用监控
