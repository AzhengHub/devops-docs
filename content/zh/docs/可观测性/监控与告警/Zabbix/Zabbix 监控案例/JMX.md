---
title: "JMX"
---


# 参考文档

- https://www.zabbix.com/documentation/5.0/zh/manual/config/items/itemtypes/jmx_monitoring
- https://docs.oracle.com/javase/1.5.0/docs/guide/management/agent.html



# 开启 JMX

## tomcat 开启 JMX

```bash
# vim /usr/local/tomcat/bin/catalina.sh
...
CATALINA_OPTS="${CATALINA_OPTS} -Djava.rmi.server.hostname=$(hostname -I | awk '{print $1}')"
#CATALINA_OPTS="${CATALINA_OPTS} -Djava.rmi.server.hostname=10.0.0.18"
CATALINA_OPTS="${CATALINA_OPTS} -Dcom.sun.management.jmxremote=true"
CATALINA_OPTS="${CATALINA_OPTS} -Dcom.sun.management.jmxremote.port=12345"
CATALINA_OPTS="${CATALINA_OPTS} -Dcom.sun.management.jmxremote.ssl=false"
CATALINA_OPTS="${CATALINA_OPTS} -Dcom.sun.management.jmxremote.authenticate=false"


# 说明：
CATALINA_OPTS="${CATALINA_OPTS} -Djava.rmi.server.hostname=JMX_HOST" #tomcat(Java程序)运行主机的IP地址，如果要在多台主机运行可以采用变量的方式获取当前主机的IP：$(hostname -I | awk '{print $1}')"
CATALINA_OPTS="${CATALINA_OPTS} -Dcom.sun.management.jmxremote=true" #启动远程监控JMX
CATALINA_OPTS="${CATALINA_OPTS} -Dcom.sun.management.jmxremote.port=JMX_PORT" #JMX监听的端口号，要和zabbix添加主机时候的端口一致即可 
CATALINA_OPTS="${CATALINA_OPTS} -Dcom.sun.management.jmxremote.ssl=false" #不启用ssl连接
CATALINA_OPTS="${CATALINA_OPTS} -Dcom.sun.management.jmxremote.authenticate=false" #不启用授权
```



## 为一般程序开启 JMX

```bash
# 在Java程序启动时添加以下参数
-Djava.rmi.server.hostname=192.168.1.2 # jmx服务端IP
# 多IP的场景可以使用变量获取IP
# -Djava.rmi.server.hostname=$(hostname -I | awk '{print $1}')

-Dcom.sun.management.jmxremote.port=6666 # jmx监听端口

-Dcom.sun.management.jmxremote.ssl=false # 不启用ssl连接

-Dcom.sun.management.jmxremote.authenticate=false # 不启用授权


# 范例：
java \
-Dcom.sun.management.jmxremote \
-Djava.rmi.server.hostname=$(hostname -I | awk '{print $1}') \
-Dcom.sun.management.jmxremote.port=12345 \
-Dcom.sun.management.jmxremote.authenticate=false \
-Dcom.sun.management.jmxremote.ssl=false \
-jar xxx.jar
```



## 验证 JMX

- 使用 java 客户端工具 jconsole

- **ssh X11方式：**

```bash
# centos 安装依赖包
xorg-x11-xauth xorg-x11-fonts-* xorg-x11-font-utils xorg-x11-fonts-Type1 libXtst


# 声明环境变量
# export DISPLAY=10.0.0.1:0.0


# 启动jconsole
# jconsole
```

- **Windows JDK：**

```bash
# Windows中的路径：
C:\Program Files\Java\jdk1.8.0_251\bin\jconsole.exe
```





# JMX 监控项常见指标

- 可以使用 java 客户端工具 jconsole 中的 MBean 来获取到响应的监控指标
- **注意：在模板中添加监控项时此处一定要选择 JMX agent代理程序**

## 语法

- 键值

```bash
jmx["java.lang:type=Threading","ThreadCount"]
```

## 堆内存

```bash
# 堆内存最大值
jmx["java.lang:type=Memory","HeapMemoryUsage.max"]

# 已提交堆内存
jmx["java.lang:type=Memory","HeapMemoryUsage.committed"]

# 已用堆内存
jmx["java.lang:type=Memory","HeapMemoryUsage.used"]

---


# eden space已用空间
jmx["java.lang:type=MemoryPool,name=Eden Space",Usage.used]

# eden space已提交空间
jmx["java.lang:type=MemoryPool,name=Eden Space",Usage.committed]

# eden space最大空间
jmx["java.lang:type=MemoryPool,name=Eden Space",Usage.max]

---

# 内存池old gen使用空间
jmx["java.lang:type=MemoryPool,name=PS Old Gen",Usage.used]

# 内存池old gen已提交空间
jmx["java.lang:type=MemoryPool,name=PS Old Gen",Usage.committed]

# 内存池old gen最大空间
jmx["java.lang:type=MemoryPool,name=PS Old Gen",Usage.max]
```



## Java 线程

```bash
# 总开启线程数
jmx["java.lang:type=Threading","TotalStartedThreadCount"]

# 活动线程数
jmx["java.lang:type=Threading","ThreadCount"]

# 线程峰值数
jmx["java.lang:type=Threading","PeakThreadCount"]
```

## 类

```bash
# 已加载类数量
jmx["java.lang:type=ClassLoading","LoadedClassCount"]


# 总加载类数量
jmx["java.lang:type=ClassLoading","TotalLoadedClassCount"]


# 已卸载类数量
jmx["java.lang:type=ClassLoading","UnloadedClassCount"]
```



# ---

# Tomcat 核心监控项

tomcat 本身就是通过 Java 运行的程序，所以监控其它 Java 服务 和 监控 tomcat 大体一致

- 端口是否存活、进程是否存在
- 繁忙线程的nio、bio

- 堆内存使用和提交的状况
- 类加载和卸载的状况
- session的会话总数和活动会话数





# Zabbix 监控 Tomcat

## 先决条件

- 具有 zabbix-java-gateway 服务器
- 并配置 zabbix-server 或 zabbix-proxy 指向 zabbix-java-gateway



## zabbix-java-gateway 配置参考

- /etc/zabbix/zabbix_java_gateway.conf

```bash
...
LISTEN_IP="0.0.0.0" #监听地址，一般默认即可

LISTEN_PORT=10052 #监听端口，一般默认即可

PID_FILE="/run/zabbix/zabbix_java_gateway.pid" #pid文件位置，一般默认即可

START_POLLERS=5 #开启多少个进程向java采集数据，tomcat服务器数量多则建议优化，如：和cpu核心数保持相同

TIMEOUT=30 #后端tomcat服务器多久无响应则认为超时，超时则一个数据采集周期内将无法给zabbix-server报告数据，生产中建议设常一些 如最大值：30秒
...
```



## zabbix-server 配置参考

- /apps/zabbix/etc/zabbix_server.conf

```sh
...
JavaGateway=10.0.0.18 # JavaGateway的IP地址或主机名

JavaGatewayPort=10052 # JavaGateway的端口

StartJavaPollers=5 # 为JavaGateway开启的进程实例数量，一般和JavaGateway的此值相同
...
```

- 验证

```bash
# systemctl restart zabbix-server.service

# ps -ef|grep java
zabbix     10428   10416  0 12:42 ?        00:00:00 /usr/sbin/zabbix_server: java poller #1 [got 0 values in 0.000761 sec, idle 5 sec]
```



## zabbix-agent 配置参考

- 安装在被监控的 tomcat 端
- /etc/zabbix/zabbix_agentd.conf

```bash
...
PidFile=/var/run/zabbix/zabbix_agentd.pid

LogFile=/var/log/zabbix/zabbix_agentd.log

LogFileSize=0

LogRemoteCommands=1

Server=10.0.0.8

ServerActive=10.0.0.8

Hostname=10.0.0.18

Include=/etc/zabbix/zabbix_agentd.d/*.conf
...
```









## web界面配置

### 配置

#### 主机

- 右上角创建主机

- **主机名称：**被监控主机中zabbix-agent所定义的Hostname，Hostname一般是被监控主机的IP，所以这里直接写IP即可
  - 如：10.0.0.101
- **可见的名称：**输入一个对外展示的，可以使用字母数字、空格、点”."、中划线"-"、下划线"_"，如果不写此项则会使用前面定义的主机名称
  - 如：10.0.0.101-tomcat1
- **群组：**选择一个或多个已经定义的分组，群组如果事先没有创建的话会根据定义的群组名称自动创建，所有访问权限都分配到主机组，而不是单独的主机。这也是主机需要属于至少一个组的原因。
  - 如：tomcat
- **Interfaces：**这里保留默认的interfaces客户端，再添加一个JMX栏
  - 如：客户端 10.0.0.101:10050
  - 如：  JMX    10.0.0.101:12345
- **由agent代理程序监测：**涉及到proxy代理节点时需要配置

#### 模板

- 搜索并选择以下三个模板 **此模板仅作测试 生产中需要自定义模板**

- ```
  Template OS Linux by Zabbix agent active
  Template App Generic Java JMX
  Template App Apache Tomcat JMX
  ```


#### 验证

- 按照以上的方式配置完成后，可以在主机栏中点击图形-->选择监控项名称-->预览来观察是否有数据出现，也可以点击监测-->主机来查看是否有数据采集信息出现
- 另外也需要观察 监测-->主机 可用性除JMX是否为绿色，绿色则代表JMX正常





- 
