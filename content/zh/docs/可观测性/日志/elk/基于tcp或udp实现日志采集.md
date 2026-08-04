---
title: "基于tcp或udp实现日志采集"
---

# 通过 TCP/UDP 收集日志

- 通过 logstash 的 tcp/udp 插件收集日志
- 通常用于在向 elasticsearch 补录丢失的日志，其实就是将丢失的日志写到一个文件，然后通过 tcp 日志收集方式直接发送给装有logstash的机器，然后这台机器再将接受到的数据写入elasticsearch，补录日志的服务器可以装logstash，也可以不安装直接通过nc等网络工具将数据传送给装有logstash的服务器，再由其将之转发
- 当然补录日志的方法还有很多种
- 官方文档：https://www.elastic.co/guide/en/logstash/7.16/plugins-inputs-tcp.html

## 测试收集

### logstash配置

```bash
# vim /etc/logstash/conf.d/tcp.conf

input {
    tcp {
        port => 1998
        type => "tcp-log"
        mode => "server"
    }
}

output{
    stdout {
        codec => "rubydebug"
    }
}
```

### 前台启动测试

```bash
#需要先停止logstash服务
systemctl stop logstash.service

#前台启动
/usr/share/logstash/bin/logstash -f /etc/logstash/conf.d/tcp.conf
```

### 检查端口是否开启

```bash
# ss -ntl|grep 1998
LISTEN  0       1024                      *:1998               *:*         
```

### 通过nc命令发送数据进行测试

- 可以在其他服务器上安装nc命令进行测试
- nc又称网络界的瑞士军刀，可以通过tcp、udp等协议进行数据传输，另外还有很多其他功能

```bash
#安装nc
yum -y install nc

#测试数据发送
```

#### 返回结果

```bash
{
          "port" => 38796,
          "host" => "10.0.0.8",
       "message" => "test nc",
    "@timestamp" => 2022-03-17T06:38:48.814Z,
      "@version" => "1",
          "type" => "tcp-log"
}
```



### 通过伪设备的方式发送数据进行测试

- 在类 Unix 操作系统中，块设备有硬盘、内存等硬件，但是还有的设备并没有对应的物理设备，这种设备就称之伪设备
- 常见伪设备
  - /dev/random
  - /dev/urandom
  - /dev/null
  - /dev/zero
  - /dev/tcp（看不到但实际存在）
  - /dev/udp（看不到但实际存在）
  - ...

```bash
echo "伪设备" >  /dev/tcp/10.0.0.100/1998
```

#### 返回结果

```bash
{
          "port" => 38800,
          "host" => "10.0.0.8",
       "message" => "伪设备",
    "@timestamp" => 2022-03-17T06:40:25.405Z,
      "@version" => "1",
          "type" => "tcp-log"
}
```



## 正式收集

### logstash配置

- 将输入改为elasticsearch

```bash
# vim /etc/logstash/conf.d/tcp.conf

input {
    tcp {
        port => 1998
        type => "tcp-log"
        mode => "server"
    }
}

output {
    if [type] == "tcp-log" {
        elasticsearch {
            hosts => ["10.0.0.101"]
            index => "tcp-log-%{+YYYY.MM.dd}"
        }
    }
}
```

#### 启动logrotate

```bash
systemctl start logstash.service
```

#### 检查端口是否开启

```bash
# ss -ntl|grep 1998
LISTEN  0       1024                      *:1998               *:*         
```



### 输入信息

```bash
cat /etc/passwd >  /dev/tcp/10.0.0.100/1998
```



### Kibana界面配置

#### 定义索引

- Management  --> stack management --> 索引模式
- 名称
  - 如：
    - tcp-log-*
- 时间戳字段
  - timestamp
- 创建索引模式

#### 查看索引

- Discover



