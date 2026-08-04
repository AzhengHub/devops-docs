---
title: "Logstash"
---

# Logstash 前言

Logstash是一个具有实时传输能力的数据收集引擎，其可以通过插件实现日志收集和转发，支持日志过滤，支持普通log、自定义json格式的日志解析，最终把经过处理的日志发送给Elasticsearch，基于Java开发，所以需要安装JDK**(logstash-7.13.4及以上版本自带JDK)**

**下载地址：**https://www.elastic.co/cn/downloads/logstash

**国内下载地址：**https://mirrors.tuna.tsinghua.edu.cn/elasticstack/apt/7.x/pool/main/l/logstash/

**插件及配置等官方帮助文档：**https://www.elastic.co/guide/en/logstash/current/index.html





# Logstash 安装

- **支持的版本**：https://www.elastic.co/cn/support/matrix

```bash
#下载
wget https://mirrors.tuna.tsinghua.edu.cn/elasticstack/7.x/apt/pool/main/l/logstash/logstash-7.16.3-amd64.deb

#安装
dpkg -i logstash-7.16.3-amd64.deb
```



# Logstash 安装后优化

## 以root身份启动

- **默认Logstash是以logstash的身份运行的，这样会导致对一些文件没有读的权限**

- 可以选择将启动用户改为root或者将读权限给予logstash，一般都是直接使用root启动

```bash
root@logstash:~# vim /etc/systemd/system/logstash.service
[Service]
Type=simple
User=root #root身份启动
Group=root #root身份启动
...
```

## JVM优化

```bash
root@logstash:~# vim /etc/logstash/jvm.options
...
-Xms1g #Logstash分配的内存，根据日志量生产中建议调到2、4、8G等
-Xmx1g #Logstash分配的内存，根据日志量生产中建议调到2、4、8G等
...
```



# Logstash 安装后测试

- 一般Logstash安装后可以正常启动都是没问题的，这里展示测试方法

### 测试标准输入和输出

```bash
#以进程的方式启动测试，测试前要关闭logstash服务
/usr/share/logstash/bin/logstash -e 'input { stdin{} } output { stdout{ codec => rubydebug } }' #标准输入和输出
hello #输入hello
{
      "@version" => "1", #事件版本号，一个事件就是一个 ruby 对象
    "@timestamp" => 2021-10-13T13:34:23.858Z, #事件发生的时间
       "message" => "hello", #消息的具体内容
          "host" => "es-node1" #事件发生在哪里（主机名）
}
```

### 测试输出到文件

```bash
#以进程的方式启动测试，测试前要关闭logstash服务
# /usr/share/logstash/bin/logstash -e 'input { stdin{} } output { file{ path => "/tmp/log-%{+YYYY.MM.dd}messages.log" } }'
...
#输入一些信息
aaa
[INFO ] 2022-03-16 06:49:16.785 [[main]>worker0] file - Opening file {:path=>"/tmp/log-2022.03.16messages.log"}
bbb
[INFO ] 2022-03-16 06:49:35.111 [[main]>worker1] file - Closing file /tmp/log-2022.03.16messages.log


#查看结果
# tail -f /tmp/log-2022.03.16messages.log 
{"message":"aaa","host":"es-node1","@timestamp":"2022-03-16T06:49:16.545Z","@version":"1"}
{"message":"bbb","host":"es-node1","@timestamp":"2022-03-16T06:49:19.308Z","@version":"1"}
```





# Logstash 相关文件

```bash
/usr/share/logstash/bin/ #logstash相关命令存放路径

/var/lib/logstash/plugins/inputs/file/ #此目录下的文件记录了输入文件的相关信息（inode节点号等）

/etc/systemd/system/logstash.service #service文件

/etc/logstash/logstash.yml #主配置文件

/etc/logstash/conf.d/ #子配置文件存放目录，后期配置文件通常放于此目录处，随开机启动会自动加载

/etc/logstash/jvm.options #JVM优化文件
```





# Logstash 配置文件说明

## /etc/logstash/conf.d/

- 

```bash
root@logstash:~# vim /etc/logstash/conf.d/test.conf
input  {
  stdin {}
}

output {
  elasticsearch {
    hosts => ["10.0.0.100"] #es节点的ip
    index => "my-elk" #和Elasticsearch主配置中的cluster.name:保持一致，文件中的必须是小写
  }

  file {
    path => "/tmp/test.log" #数据会在本机存放一份，存到此文件中
  }
}
```





# Logstash 相关命令

## Logstash自身相关

### 配置文件语法检测

```bash
#测试配置文件语法是否有问题
/usr/share/logstash/bin/logstash -f /etc/logstash/conf.d/test.conf -t
Configuration OK #ok
```

### 使用配置文件前台启动

```bash
/usr/share/logstash/bin/logstash -f /etc/logstash/conf.d/test.conf
```



## 插件管理相关

### 显示系统自带的核心插件

```bash
/usr/share/logstash/bin/logstash-plugin  list
```











# Logstash 插件

## input 相关插件

- 官方文档：https://www.elastic.co/guide/en/logstash/7.16/input-plugins.html
- input 相关插件使 Logstash 能够读取特定的事件源

### file

官方文档：https://www.elastic.co/guide/en/logstash/7.16/plugins-inputs-file.html

- **path** 必须配置的设置，定义输入文件的路径(**必须为绝对路径**)，支持通配符，可以配置多个路径，值类型：数组
- **type** 事件的唯一类型，主要便于在 output 插件中引用，值类型：字符串
- **start_position** 指定文件开始读取的位置
  - 后面跟 beginning 或 end，默认为end
  - 需要从头开始读取则定义beginning，不需要则定义end。

- **stat_interval** 每隔几秒读取一次文件，默认1秒读取一次，生产中建议设为3秒或以上，以减少系统调用

#### 范例

```bash
# /etc/logstash/conf.d/test_log.conf

input {
    file { #使用file插件
        path => "/var/log/syslog" #将此文件作为输入
        type => "system-log" #指定文件类型，后期output插件会引用此名称
        start_position => "beginning" #从文件的头开始读取数据
        stat_interval => "3" #每隔三秒读取一次
        codec => json #用于输入数据的编解码器。输入编解码器是一种在数据进入输入之前解码数据的便捷方法，无需在 Logstash 管道中使用单独的过滤器。
    }
}
```

### stdin

接受标准输入，一般用于测试

#### 范例：

```bash
#以进程的方式启动测试，测试前要关闭logstash服务
/usr/share/logstash/bin/logstash -e 'input { stdin{} } output { stdout{ codec => rubydebug } }' #标准输入和输出
hello #输入hello
{
      "@version" => "1", #事件版本号，一个事件就是一个 ruby 对象
    "@timestamp" => 2021-10-13T13:34:23.858Z, #事件发生的时间
       "message" => "hello", #消息的具体内容
          "host" => "es-node1" #事件发生在哪里（主机名）
}
```

### tcp

通过监听TCP端口的方式进行数据收集

官方帮助文档：https://www.elastic.co/guide/en/logstash/7.16/plugins-inputs-tcp.html#plugins-inputs-tcp-mode

- **port** 定义监听的端口
- **type** 定义事件类型，主要用于被output所引用
- **mode** 分为 server 和 client，server表示侦听客户端连接，client表示连接到服务器

#### 范例

```bash
# vim /etc/logstash/conf.d/tcp.conf

input {
    tcp { #使用tcp插件
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

### udp

通过监听UDP端口的方式进行数据收集

官方帮助文档：https://www.elastic.co/guide/en/logstash/7.16/plugins-inputs-tcp.html#plugins-inputs-udp-mode

### syslog

通过监听syslog发送过来的日志进行数据收集

官方帮助文档：https://www.elastic.co/guide/en/logstash/7.16/plugins-inputs-syslog.html

#### 范例

```
...
```



### redis

将redis收集来的数据发送给es等终端

官方帮助文档：https://www.elastic.co/guide/en/logstash/7.16/plugins-inputs-redis.html

- **host**  指定 redis 的IP
- **port** 指定 redis 的port，默认值为6379，如本身就是6379端口则可不写
- **password** 指定 redis 的password
- **db** 指定redis 的数据库编号
- **key** 写入 redis key的名称
- **data_type** 写入 redis的数据类型，可以选择 list或channel，但通常都是选择channel
- **type** 定义事件类型，主要用于被output所引用

#### 范例：

```bash
input {
    redis {
        host => ["10.0.0.18"]
        port => "6379"
        password => "123456"
        db => "1"
        key => "nginx-access-log"
        data_type => "list"
        codec => json
        type => "app1-nginx-access-log"
    }
}

output {
    if [type] == "app1-nginx-access-log" {
        elasticsearch {
            hosts => ["10.0.0.100"]
            index => "nginx-access-log-%{+YYYY.MM.dd}"
        }
    }
}
```



## output 相关插件

输出插件将事件数据发送到特定目的地。输出是事件管道的最后阶段

官方帮助文档：https://www.elastic.co/guide/en/logstash/7.16/output-plugins.html

### elasticsearch

- **hosts**  输出的 elasticsearch 主机IP地址，可以定义多个，如：["127.0.0.1:9200","127.0.0.2:9200"]
- **index** 索引输出格式，用于在Kibana检索

```bash
#/etc/logstash/conf.d/test_log.conf

output {
    if [type] == "system-log" {  #如果 type 为 system-log 则将信息写到此段中的 index 中
        elasticsearch {
            hosts => ["10.0.0.100"]
            index => "logstash-test-log-%{+YYYY.MM.dd}"
        }
    }
}
```



### redis

将input收集来的数据发送给redis

官方帮助文档：https://www.elastic.co/guide/en/logstash/7.16/plugins-outputs-redis.html

- **host**  指定 redis 的IP
- **port** 指定 redis 的port，默认值为6379，如本身就是6379端口则可不写
- **password** 指定 redis 的password
- **db** 指定redis 的数据库编号
- **key** 写入 redis key的名称
- **data_type** 写入 redis的数据类型，可以选择 list或channel，但通常都是选择channel
- **注意：因为是写入到redis，而不是直接写入elasticsearch，所以无需配置index**

#### 范例

```bash
[root@nginx-node1 src]# cat /etc/logstash/conf.d/nginx_log.conf
input {
    file {
        path => "/var/log/nginx/access.log"
        type => "app1-nginx-access-log"
        start_position => "beginning"
        stat_interval => "3"
        codec => json
    }
    file {
        path => "/var/log/nginx/error.log"
        type => "app1-nginx-error-log"
        start_position => "beginning"
        stat_interval => "3"
    }
}

output {
    if [type] == "app1-nginx-access-log" {
        redis { #调用redis插件
            host => ["10.0.0.18"]
            port => "6379"
            password => "123456"
            db => "1"
            key => "nginx-access-log"
            data_type => "list"
            codec => json
        }
    }
    if [type] == "app1-nginx-error-log" {
        redis {
            host => ["10.0.0.18"]
            port => "6379"
            password => "123456"
            db => "1"
            key => "nginx-error-log"
            data_type => "list"
            codec => json
        }
    }
}
```



### stdout 插件

- 接受标准输出，一般用于测试





## 通用插件

### codec 插件

- 解码器，定义输入或输出文件的格式解码，如：json、multiline等...，默认值：plain

#### json

- 读取 JSON 格式的内容，为 JSON 数组中的每个元素创建一个事件

- 官方文档：https://www.elastic.co/guide/en/logstash/7.16/plugins-codecs-json.html

#### multiline

- 将多行消息合并到一个事件中

- 官方文档：https://www.elastic.co/guide/en/logstash/7.16/plugins-codecs-multiline.html

##### 范例

```bash
input {
    file {
        path => "/var/log/java_test.log"
        type => "java-error-log" #java也分也访问日志和错误日志，要标注好
        start_position => "beginning"
        stat_interval => "3"
        codec => multiline { #使用 codec 的 multiline 插件
            pattern => "^\[" #正则表达式匹配[开头的行
            negate => true #true表示匹配成功进行操作，false为不成功进行操作
            what => "previous" #指定从 [ 前面的内容合并，如果是后面的行合并用 next
        }
    }
}

output {
    if [type] == "java-error-log" {
        elasticsearch {
            hosts => ["10.0.0.100"]
            index => "logstash-java-error-log-%{+YYYY.MM.dd}"
        }
    }
}
```







# Logstash单日志收集

范例:

```json
input  {
  file {
    path => "/var/log/syslog"   #将系统日志作为输入，文件名支持通配符
    type => "systemlog" #设置一个类型，可以自定义
    start_position => "beginning" #从日志开头开始
    stat_interval => "3" #日志收集时间间隔，每三秒收集一次，默认1秒，建议优化
  }
  file {
    path => "/var/log/secure" #支持多个日志
    start_position => "beginning"
    stat_interval => "3"
  }
}

output {
  elasticsearch {
    hosts => ["10.0.0.100"]
    index => "my-syslog"
  }

  file {
    path => "/tmp/test-v3.log"
  }
}
```









# Logstash多日志收集

### Logstash配置：

```json
#output如果不定义多个索引字段的话，将会把全部input信息写到同一个index中

input  {
  file {
    path => "/var/log/syslog" #将系统日志作为输入
    type => "systemlog" #事件的唯一类型
    start_position => "beginning" #第一次收集日志的位置
    
  }
}

output {
  if [type] == "systemlog" {  #如果type为systemlog则将信息写道此段中的index中
  elasticsearch {
    hosts => ["10.0.0.100"]
    index => "logstash-syslog-systemlog-%{+YYYY.MM.dd}" #%{+YYYY.ww}表示以周为单位 
  }}
  
  if [type] == "systemlog" {
  elasticsearch {
    hosts => ["10.0.0.100"]
    index => "logstash-syslog-systemlog-%{+YYYY.MM.dd}"
  }}
}
```

