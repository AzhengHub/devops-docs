---
title: "基于rsyslog实现日志采集"
---

# 通过rsyslog收集haproxy日志

- **rsyslog和haproxy在同一主机，logstash在其他主机，rsyslog收集日志后 指定logstash的IP和端口通过网络发送给logstash，再由logstash发送给es**



## haproxy配置

```bash
[root@haproxy ~]# vim /apps/haproxy/etc/haproxy.cfg
global
...
    log         127.0.0.1 local2 #记录到本地的local2
...
```



## rsyslog配置

```bash
[root@haproxy ~]# vim /etc/rsyslog.conf
...
module(load="imudp") #加载imudp模块
input(type="imudp" port="514") #打开基于udp收集日志，也可以基于tcp收集
...
local2.*   /var/log/haproxy.log #收集local2的所有类型日志到本机的指定文件
local2.*   @@10.0.0.100:516 #rsyslog通过网络发送给远程主机
...


#重启服务
[root@haproxy ~]# systemctl restart rsyslog.service


#观察514端口是否开启
[root@haproxy ~]# ss -nul|grep 514
UNCONN    0         0                  0.0.0.0:514              0.0.0.0:*  


#重启haproxy查看是否有日志产生
[root@haproxy ~]# systemctl restart haproxy.service
[root@haproxy ~]# tail -f /var/log/haproxy.log
Mar 17 15:42:16 localhost haproxy[1689]: Proxy stats started.
Mar 17 15:42:16 localhost haproxy[1689]: Proxy tomcat-server started.
Mar 17 15:42:17 localhost haproxy[1695]: Server tomcat-server/10.0.0.28 is DOW
...
```



## 测试收集

### logstash配置

```bash
root@es-node1:~# vim /etc/logstash/conf.d/rsyslog.conf
input {
    syslog {
        type => "listen-rsyslog"
        port => 516
    }
}

output {
    if [type] == "listen-rsyslog" {
        stdout {
            codec => "rubydebug"
        }
    }
}
```

### 前台运行logstash进行测试

```bash
#需要先停止logstash服务
root@es-node1:~# systemctl stop logstash.service

#前台启动
root@es-node1:~# /usr/share/logstash/bin/logstash -f /etc/logstash/conf.d/rsyslog.conf

#查看端口是否开启（使用syslog会同时开启tcp和udp两个端口）
root@es-node1:~# ss -ntul|grep 516
```

#### 使用nc工具测试

```bash
[root@haproxy ~]# echo 'nc test' | nc 10.0.0.100 516

#结果
[INFO ] 2022-03-17 09:23:22.924 [Ruby-0-Thread-19: :1] syslog - new connection {:client=>"10.0.0.18:57182"}
{
          "severity" => 0,
           "message" => "nc test\n",
    "severity_label" => "Emergency",
              "host" => "10.0.0.18",
              "tags" => [
        [0] "_grokparsefailure_sysloginput"
    ],
              "type" => "listen-rsyslog",
        "@timestamp" => 2022-03-17T09:23:22.984Z,
          "priority" => 0,
          "@version" => "1",
    "facility_label" => "kernel",
          "facility" => 0
}
```

#### 使用伪设备测试

```bash
#tcp测试
[root@haproxy ~]# echo '伪设备 tcp test' > /dev/tcp/10.0.0.100/516
#结果
[INFO ] 2022-03-17 09:28:36.847 [Ruby-0-Thread-21: :1] syslog - new connection {:client=>"10.0.0.18:58538"}
{
          "severity" => 0,
           "message" => "伪设备 tcp test\n",
    "severity_label" => "Emergency",
              "host" => "10.0.0.18",
              "tags" => [
        [0] "_grokparsefailure_sysloginput"
    ],
              "type" => "listen-rsyslog",
        "@timestamp" => 2022-03-17T09:28:36.852Z,
          "priority" => 0,
          "@version" => "1",
    "facility_label" => "kernel",
          "facility" => 0
}
     
------------------------------------------------------------------------------
          
#udp测试
[root@haproxy ~]# echo '伪设备 udp test' > /dev/udp/10.0.0.100/516
#结果
{
          "severity" => 0,
           "message" => "伪设备 udp test\n",
    "severity_label" => "Emergency",
              "host" => "10.0.0.18",
              "tags" => [
        [0] "_grokparsefailure_sysloginput"
    ],
              "type" => "listen-rsyslog",
        "@timestamp" => 2022-03-17T09:28:56.833Z,
          "priority" => 0,
          "@version" => "1",
    "facility_label" => "kernel",
          "facility" => 0
}
```

#### 重启haproxy生成日志查看是否能接受到日志

```bash
[root@haproxy ~]# systemctl restart haproxy.service

#haproxy接受到的日志
[root@haproxy ~]# tail -f /var/log/haproxy.log
Mar 17 17:29:32 localhost haproxy[2472]: Proxy stats started.
Mar 17 17:29:32 localhost haproxy[2472]: Proxy tomcat-server started.
Mar 17 17:29:33 localhost haproxy[2474]: Server tomcat-server/10.0.0.28 is DOWN, reason: Layer4 connection problem, info: "No route to host", check duration: 639ms. 2 active and 0 backup servers left. 0 sessions active, 0 requeued, 0 remaining in queue.

#logstash端接受到的日志
[INFO ] 2022-03-17 09:29:33.581 [Ruby-0-Thread-22: :1] syslog - new connection {:client=>"10.0.0.18:58790"}
{
          "severity" => 1,
           "message" => "Server tomcat-server/10.0.0.28 is DOWN, reason: Layer4 connection problem, info: \"No route to host\", check duration: 639ms. 2 active and 0 backup servers left. 0 sessions active, 0 requeued, 0 remaining in queue.\n",
    "severity_label" => "Alert",
              "host" => "10.0.0.18",
         "logsource" => "localhost",
              "type" => "listen-rsyslog",
        "@timestamp" => 2022-03-17T17:29:33.000Z,
          "priority" => 145,
               "pid" => "2474",
         "timestamp" => "Mar 17 17:29:33",
           "program" => "haproxy",
          "@version" => "1",
    "facility_label" => "local2",
          "facility" => 18
}
{
          "severity" => 1,
           "message" => "Server tomcat-server/10.0.0.28 is DOWN, reason: Layer4 connection problem, info: \"No route to host\", check duration: 639ms. 2 active and 0 backup servers left. 0 sessions active, 0 requeued, 0 remaining in queue.\n",
    "severity_label" => "Alert",
              "host" => "10.0.0.18",
         "logsource" => "localhost",
              "type" => "listen-rsyslog",
        "@timestamp" => 2022-03-17T17:29:33.000Z,
          "priority" => 145,
               "pid" => "2476",
         "timestamp" => "Mar 17 17:29:33",
           "program" => "haproxy",
          "@version" => "1",
    "facility_label" => "local2",
          "facility" => 18
}
...
```





## 正式收集

- **收集有问题，使用接受标准输入进行测试可以受到haproxy rsyslog的日志，但是写入到es中 es无显示**

### logstash配置

- 使用rsyslog插件实现日志收集
- **logstash可以不与haproxy或rsyslog在同一主机**
- **因为是从远端的rsyslog接受的日志，所以并不支持从头读取日志，需要想其他办法**

```bash
root@es-node1:~# vim /etc/logstash/conf.d/rsyslog.conf

input {
    syslog {
        type => "listen-rsyslog"
        port => 516 #本机开启516端口监听rsyslog发送过来的日志
    }
}

output {
    if [type] == "listen-rsyslog" {
        elasticsearch {
            hosts => ["10.0.0.101"]
            index => "haproxy-rsyslog-%{+YYYY.MM.dd}"
        }
    }
}
```

#### 重启服务并观察端口是否开启

```bash
root@es-node1:~# systemctl restart logstash.service 
root@es-node1:~# ss -ntul|grep 516
LISTEN  0       50                        *:516                *:*       
```



### 使haproxy生成日志

- 重启haproxy以生成新的日志，**因为使用的是基于rsyslog发送日志，所以追加信息无效**
- **生产中谨慎重启**

```bash
[root@haproxy ~]# systemctl restart haproxy.service
```



### Kibana界面配置

#### 定义索引

- Management  --> stack management --> 索引模式
- 名称
  - 如：
    - haproxy-rsyslog-*
- 时间戳字段
  - timestamp
- 创建索引模式

#### 查看索引

- Discover

