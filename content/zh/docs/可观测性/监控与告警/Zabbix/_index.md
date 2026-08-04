---
title: "Zabbix"
---

# Zabbix 优势

- 官方网站：https://www.zabbix.com/cn/

- zabbix是一个开源免费的分布式监控系统，可以监控各种server和物理设备，还可以配置grafana实现华丽界面显示
- 采集方式丰富：支持Agent、SNMP、JMX、SSH等多种采集方式，以及主动和被动的数据传输方式。
- 较强的扩展性：支持Proxy分布式监控，有agent自动发现功能，插件式架构支持用户自定义数据采集脚本。
- 配置管理方便 ：能通过Web界面进行监控和告警配置，操作方便，上手简单。



# Zabbix 劣势

- 性能瓶颈：机器量或者业务量大了后，关系型数据库的写入一定是瓶颈，官方给出的单机上限是5000台，个人感觉达不到，尤其现在应用层的指标越来越多。虽然最新版已经开始支持时序数据库，不过成熟度还不高。
- 应用层监控支持有限：如果想对应用程序做侵入式的埋点和采集（比如监控线程池或者接口性能），zabbix没有提供对应的sdk，通过插件式的脚本也能曲线实现此功能，个人感觉zabbix就不是做这个事的。
- 数据模型不强大：不支持tag，因此没法按多维度进行聚合统计和告警配置，使用起来不灵活。
- 二次开发难度大 ：Zabbix采用的是C语言，二次开发往往需要熟悉它的数据表结构，基于它提供的API更多只能做展示层的定制



# Zabbix 常用术语

### 主机（host）

- 你想要监控的联网设备，有IP/DNS。

### 主机组（host group)

- 主机的逻辑组；可能包含主机和模板。一个主机组里的主机和模板之间并没有任何直接的关联。通常在给不同用户组的主机分配权限时候使用主机组。

### 监控项（item）

- 你想要接收的主机的特定数据，一个度量/指标数据。

### 值预处理（value preprocessing）

- 转化/预处理接收到的指标数据 存入数据库之前。

### 触发器（trigger）

- 一个被用于定义问题阈值和“评估”监控项接收到的数据的逻辑表达式
- 当接收到的数据高于阈值时，触发器从"OK"变成"Problem"状态。当接收到的数据低于阈值时，触发器保留/返回"OK"的状态。

### 事件（event）

- 一次发生的需要注意的事情，例如触发器状态改变、发现/监控代理自动注册

### 事件标签（event tag）

- 提前设置的事件标记可以被用于事件关联，权限细化设置等。

### 事件关联（event correlation）

- 自动灵活的、精确的关联问题和解决方案
- 比如说，你可以定义触发器A告警的异常可以由触发器B解决，触发器B可能采用完全不同的数据采集方式。

### 异常（problems）

- 一个处在"异常"状态的触发器

### 异常更新（problem update）

- Zabbix提供的问题管理选项，例如添加评论、确认异常、改变问题级别或者手动关闭等。

### 动作（action）

- 预先定义的应对事件的操作
- 一个动作由操作(例如发出通知)和条件(什么时间进行操作)组成

### 升级（escalation）

- 一个在动作内执行操作的自定义方式; 发送通知/执行远程命令的顺序安排。

### 媒介（media）

- 发送告警通知的方式；传送途径

### 通知（notification）

- 关于事件的信息，将通过选设定的媒介途径发送给用户。

### 远程命令（remote command）

- 一个预定义好的，满足特定条件的情况下，可以在被监控主机上自动执行的命令。

### 模版（template）

- 一组可以被应用到一个或多个主机上的实体（监控项，触发器，图形，聚合图形，应用，LLD，Web场景）的集合
- 模版的应用使得主机上的监控任务部署快捷方便；也可以使监控任务的批量修改更加简单。模版是直接关联到每台单独的主机上。

### 应用（application）

- 一组监控项组成的逻辑分组

### Web场景（web scenario）

- 检查网站可浏览性的一个或多个HTTP请求

### 前端（frontend)

- Zabbix提供的web界面

### Zabbix API

- Zabbix API允许用户使用JSON RPC协议来创建、更新和获取Zabbix对象（如主机、监控项、图形和其他）信息或者执行任何其他的自定义的任务

### Zabbix server

- Zabbix监控的核心程序，主要功能是与Zabbix proxies和Agents进行交互、触发器计算、发送告警通知；并将数据集中保存等

### Zabbix agent

- 部署在监控对象上的，能够主动监控本地资源和应用的程序

### Zabbix proxy

- 一个帮助Zabbix Server收集数据，分担Zabbix Server的负载的程序

### 加密（encryption）

- 支持Zabbix组建之间的加密通讯(server, proxy, agent, zabbix_sender 和 zabbix_get 程序) 使用TLS（Transport Layer Security ）协议。



# Zabbix 数据流

- 首先，为了创建一个采集数据的监控项，您就必须先创建主机。其次，必须有一个监控项来创建触发器。最后，您必须有一个触发器来创建一个动作，这几个点构成了一个完整的数据流。
- 因此，如果您想要收到 CPU load it too high on *Server X* 的告警，您必须首先为 *Server X* 创建一个主机条目，其次创建一个用于监视其 CPU 的监控项，最后创建一个触发器，用来触发 CPU is too high 这个动作，并将其发送到您的邮箱里。
- 虽然这些步骤看起来很繁琐，但是使用模板的话，其实并不复杂。也正是由于这种设计，使得 Zabbix 的配置变得更加灵活易用。
- **简述：**
  - 首先需要创建主机 或 创建多个主机将其划分到主机组中
  - 然后需要创建监控项 根据监控项来创建 图形、触发器、动作等；最后将其和主机或主机组关连
  - 图形负载数据可视化展示
  - 触发器负责数据到达某个事先定义的阈值后 根据相应的动作和媒介来实现报警通知
  - 这些操作都可以通过定义模板的方式来完成









# Zabbix 工作模式

- 以下主/被动模式是站在agent角度来说

## 被动模式

- 默认工作模式

- **被动模式指的是 agent 被动的接受 zabbix server 周期性发过来的数据收集指令**

- zabbix server会根据模板中的监控项和数据采集周期，周期性的打开随机端口向zabbix agent的10050端口发起TCP连接，然后发送需要获取的监控项指令收集数据

- 因为zabbix server需要向每台被监控的主机收集数据，所以**在被监控主机数量过多的场景下 zabbix server性能会受到很大影响**

- ```bash
  # 被动模式连接情况
  # 10.0.0.8   zabbix-server
  # 10.0.0.28  zabbix agent
  State      Recv-Q     Send-Q       Local Address:Port    Peer Address:Port 
  TIME-WAIT     0         0            10.0.0.28:10050       10.0.0.8:56418  
  ```



## 主动模式

- **主动模式指的是 agent 主动的向 zabbix server 发送收集的监控项数据**

- zabbix agent  周期性的打开随机端口向 zabbix server 的10051端口发起TCP连接，连接成功后后向 zabbix server 获取监控项和数据采集周期，收集完成后再发送给zabbix server

- 因为是 zabbix agent 主动向 zabbix server 发送监控数据，而 zabbix server 只是被动接受，**所以 zabbix server 减轻了压力 提高了性能**

- ```bash
  # 主动被动模式连接情况
  # 10.0.0.8  zabbix-server
  # 10.0.0.28 zabbix agent
  State    Recv-Q     Send-Q     Local Address:Port      Peer Address:Port 
  TIME-WAIT   0        0           10.0.0.8:10051         10.0.0.28:47330   
  ```

  



## 主动模式实现

- 成为主动模式先需要将zabbix-agent上配置ServerActive=zabbix-server-host，然后将zabbix server的模板改为主动模式

### 被监控主机配置

```bash
# grep ^[^#] /etc/zabbix/zabbix_agentd.conf 
PidFile=/var/run/zabbix/zabbix_agentd.pid
LogFile=/var/log/zabbix/zabbix_agentd.log
LogFileSize=0
LogRemoteCommands=1
Server=10.0.0.8
ServerActive=10.0.0.8 #指向zabbix-server服务器的地址
Hostname=10.0.0.28
Include=/etc/zabbix/zabbix_agentd.d/*.conf
```

### zabbix-server配置

- zabbix-server配置文件无需修改，**只需将模板定义为主动模式**
- **查看模板是否为主动模式：**配置 --> 模板 --> 监控项（观察类型栏，后面不带"主动式" 则为被动模式模板）

### 验证

```bash
#主动被动模式连接情况
#10.0.0.8  zabbix-server
#10.0.0.28 zabbix agent
State    Recv-Q     Send-Q     Local Address:Port      Peer Address:Port 
TIME-WAIT   0        0           10.0.0.8:10051         10.0.0.28:47330   
TIME-WAIT   0        0           10.0.0.8:10051         10.0.0.101:55652   
```



## 主动模式实现

### 环境

| IP地址     | 服务                                | 端口        |
| ---------- | ----------------------------------- | ----------- |
| 10.0.0.8   | zabbix-server、msqyl(zabbix-server) | 10051、3306 |
| 10.0.0.18  | zabbix-proxy、msqyl(zabbix-server)  | 10051、3306 |
| 10.0.0.28  | zabbix-agent、nginx                 | 10050、80   |
| 10.0.0.100 | Java-gateway                        | 10052       |
| 10.0.0.101 | zabbix-agent、tomcat                | 10050、8080 |

### 部署环境

- 过程省略...

### zabbix-server 配置

```bash
[root@zabbix-server ~]# hostname -I
10.0.0.8 
[root@zabbix-server ~]# grep ^[^#] /etc/zabbix/zabbix_server.conf 
[root@zabbix-server ~]# grep ^[^#] /etc/zabbix/zabbix_server.conf 
LogFile=/var/log/zabbix/zabbix_server.log
LogFileSize=0
PidFile=/var/run/zabbix/zabbix_server.pid
SocketDir=/var/run/zabbix
DBName=zabbix
DBUser=zabbix
DBPassword=password
SNMPTrapperFile=/var/log/snmptrap/snmptrap.log
Timeout=4
AlertScriptsPath=/usr/lib/zabbix/alertscripts
ExternalScripts=/usr/lib/zabbix/externalscripts
LogSlowQueries=3000
StatsAllowedIP=127.0.0.1
```



### zabbix-proxy 配置

```bash
[root@zabbix-proxy ~]# hostname -I
10.0.0.18 
[root@zabbix-proxy ~]# grep ^[^#] /etc/zabbix/zabbix_proxy.conf 
[root@zabbix-proxy ~]# grep ^[^#] /etc/zabbix/zabbix_proxy.conf 
ProxyMode=0 #改为主动模式
Server=10.0.0.8 #指向zabbix-server IP
ServerPort=10051 #指向zabbix-server PORT
Hostname=zabbix-proxy-beijing-active
ListenPort=10051
LogFile=/var/log/zabbix/zabbix_proxy.log
LogFileSize=0
EnableRemoteCommands=1
PidFile=/var/run/zabbix/zabbix_proxy.pid
SocketDir=/var/run/zabbix
DBName=zabbix
DBUser=zabbixproxy
DBPassword=12345
DBPort=3306
JavaGateway=10.0.0.100 #指向JavaGateway IP
JavaGatewayPort=10052 #指向JavaGateway PORT
StartJavaPollers=5 #收集JAVA的线程数
SNMPTrapperFile=/var/log/snmptrap/snmptrap.log
Timeout=4
ExternalScripts=/usr/lib/zabbix/externalscripts
LogSlowQueries=3000
StatsAllowedIP=127.0.0.1
```



### nginx 主机配置

- nginx配置过程省略...
- agent配置如下：**Server处必须指定proxy的IP**

```bash
[root@nginx-web1 ~]# hostname -I
10.0.0.28 
[root@nginx-web1 ~]# grep ^[^#] /etc/zabbix/zabbix_agentd.conf 
PidFile=/var/run/zabbix/zabbix_agentd.pid
LogFile=/var/log/zabbix/zabbix_agentd.log
LogFileSize=0
LogRemoteCommands=1
Server=10.0.0.8,10.0.0.18 #zabbix-server 和 zabbix-proxy的IP（添加zabbix-server是因为监控项中有一个agent ping的监控项是以被动模式探测agent主机的）
ServerActive=10.0.0.18 #指向zabbix-proxy代理
Hostname=10.0.0.28 #本机IP
Include=/etc/zabbix/zabbix_agentd.d/*.conf
```

- 只配置了ServerActive没有配置Server会导致proxy无法获取数据

```bash
[root@nginx-web1 ~]# grep ^[^#] /etc/zabbix/zabbix_agentd.conf 
Server=10.0.0.8
ServerActive=10.0.0.18
[root@zabbix-proxy ~]# zabbix_get -s 10.0.0.28 -p 10050 -k "agent.ping"
zabbix_get [3363]: Check access restrictions in Zabbix agent configuration

------------------------------------------------------------------------------

[root@nginx-web1 ~]# grep ^[^#] /etc/zabbix/zabbix_agentd.conf 
Server=10.0.0.8,10.0.0.18
ServerActive=10.0.0.18
[root@zabbix-proxy ~]# zabbix_get -s 10.0.0.28 -p 10050 -k "agent.ping"
1
```



### java-gateway 配置

```bash
root@zabbix-java-gateway:~# grep ^[^#] /etc/zabbix/zabbix_java_gateway.conf
LISTEN_IP="0.0.0.0"
LISTEN_PORT=10052
PID_FILE="/run/zabbix/zabbix_java_gateway.pid"
START_POLLERS=5
TIMEOUT=30
```



### tomcat 主机配置

```bash
root@ubuntu:~# grep ^[^#] /etc/zabbix/zabbix_agentd.conf
PidFile=/var/run/zabbix/zabbix_agentd.pid
LogFile=/var/log/zabbix/zabbix_agentd.log
LogFileSize=0
LogRemoteCommands=1
Server=10.0.0.8,10.0.0.18 #指向proxy和server
ServerActive=10.0.0.18 #指向proxy
Hostname=10.0.0.101
Include=/etc/zabbix/zabbix_agentd.d/*.conf

#JVM
root@ubuntu:~# cat /apps/tomcat/bin/catalina.sh 
...
# -----------------------------------------------------------------------------

CATALINA_OPTS="-Dcom.sun.management.jmxremote \
-Dcom.sun.management.jmxremote.port=12345 \
-Dcom.sun.management.jmxremote.authenticate=false \
-Dcom.sun.management.jmxremote.ssl=false \
-Djava.rmi.server.hostname=10.0.0.101"


# OS specific support.  $var _must_ be set to either true or false.
...
root@ubuntu:~# ss -ntl
State     Recv-Q    Send-Q      Local Address:Port          Peer Address:Port           
LISTEN     0        4096           0.0.0.0:10050               0.0.0.0:*                          
LISTEN     0         50             *:12345                      *:*    
```





### web界面配置

**添加proxy代理程序**

- 管理 --> agent代理程序
  - agent代理程序名称：zabbix-proxy-beijing-active
  - 系统代理程序模式：主动式
  - 代理地址：10.0.0.18

**将nginx和tomcat交由代理程序处理**

- 配置 --> 主机 --> agent代理程序
  - 由agent代理程序监测：zabbix-proxy-beijing-active







# Zabbix Tools

## zabbix_get

- zabbix_get是一个命令行实用程序，用于从Zabbix agent 获取数据
- **注意：此工具只能在 zabbix-server 上使用，zabbix-server 上存在多个IP时需要 -I 指定源地址**
- 包安装时默认没有安装zabbix_get 需要手动安装`dnf -y install zabbix-get`
- 官方帮助：https://www.zabbix.com/documentation/5.0/zh/manpages/zabbix_get

### 语法

```bash
zabbix_get -s 主机名或IP [-p p端口号] [-I IP地址] -k 监控项关键字
```

### 常用选项

```bash
-s, --host 主机名或IP # agent主机的主机名或IP地址.（目标地址）

-p, --port 端口号 # 指定主机上运行的代理的端口号。默认值为10050

-I, --source-address IP地址 # 指定源IP地址，zabbix-server上存在多个IP时需要 -I 指定源地址

-k, --key item-key #指定要为其检索值的监控项的键.

--tls-connect value #如何连接到 agent. 值:
```

### 范例：检测agent是否生效

- agent 配置文件中的 Server 项没配置时无法使用此工具
  - 但 ServerActive 指向了 proxy 还是一样可以监控到数据

- 在zabbix server上执行：

```bash
# zabbix_get -s 10.0.0.28 -p 10050 -k "agent.ping"
1   # 1表示在线，即可用，只要有返回的数据就说明能与agent建立连接 反之则无法建立连接

# zabbix-server上存在多个IP时需要 -I 指定源地址
# zabbix_get -s 10.0.0.18 -p 10050 -I 10.0.0.8 -k "agent.ping"
1
```















# 主机可用性含义

### ZBX

- **绿色：**配置了Zabbix agent ping监控项 并且能ping通才显示绿色
- **红色：**不可用
- **灰色：**未知

#### 实现在模板添加ZBX监控

- 配置 --> 主机 --> 选择一个主机 --> 选择一个模板 --> 监控项 --> 创建一个监控项

  - 名称：Zabbix agent ping

  - 类型：zabbix客户端(主动式)

    - 注意：这里被监控端配置文件中必须以被动模式执行zabbix-server

    - 测试：

    - ```bash
      [root@zabbix-server ~]# zabbix_get -s 10.0.0.28 -p 10050 -k agent.ping
      1 #1表示正常，非0或者无数据返回则表示无法连接agent，重点排查agent端配置文件
      ```

      

  - 键值：agent.ping

  - 更新时间：1m

  - 历史数据保留时长：7d

  - 趋势存储时间：365d

  - 查看值：Zabbix agent ping status

  - 添加



### SNMP

- 111

### JMX

- 配置了JMX才会显示绿色

### IPMI

- 111





# Zabbix 内置监控项

- 官方文档：https://www.zabbix.com/documentation/5.0/zh/manual/config/items/itemtypes/zabbix_agent

## 常用内置监控项汇总

```bash
net.tcp.listen[port] #检查此TCP端口是否处于监听状态。 0 - 未监听，port - TCP端口 1 - 处于监听状态
```



## 触发器概述

- 一个被用于定义问题阈值和“评估”监控项接收到的数据的逻辑表达式
- 当接收到的数据高于阈值时，触发器从"OK"变成"Problem"状态。当接收到的数据低于阈值时，触发器保留/返回"OK"的状态。