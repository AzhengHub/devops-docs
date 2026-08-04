---
title: "基于logstash实现日志采集"
---

# 收集日志前注意事项

- **Logstash安装后必须以root身份启动，否则对没有权限的日志将无法进行收集**

  - ```bash
    # vim /etc/systemd/system/logstash.service
    ...
    [Service]
    ...
    User=root
    Group=root
    ...
    
    # systemctl daemon-reload
    
    # systemctl enable --now logstash.service
    ```

- 添加索引信息并重启服务后，如果没有发现索引信息，则需着重检查对应的日志文件是否存在 **并且文件中是否有内容** 文件没有内容也会导致找不到索引信息



# 系统日志

- 需要在被监控的主机上安装Logstash

## Logstash配置

```json
# vim /etc/logstash/conf.d/sys_log.conf

input  {
  file {
    path => "/var/log/syslog"
    type => "system-log"
    start_position => "beginning"
    stat_interval => "3"
    }
}

output {
  if [type] == "system-log" {  #如果 type 为 system-log 则将信息写到此段中的 index 中
  elasticsearch {
    hosts => ["10.0.0.100"]
    index => "logstash-system-log-%{+YYYY.MM}" #系统日志通常每周或每月生成一次即可，这里表示每月，周：%{+YYYY.ww}
  }}
}
```

## 检查Logstash配置文件语法

```bash
root@logstash:~# /usr/share/logstash/bin/logstash -f /etc/logstash/conf.d/sys_log.conf -t

#提示此行即表示成功
[INFO ] 2021-10-15 15:53:33.231 [LogStash::Runner] runner - Using config.test_and_exit mode. Config Validation Result: OK. Exiting Logstash
```



## Kibana界面配置

### 定义索引

- Management  --> stack management --> 索引模式
- 名称
  - 如：logstash-system-log-*（这样可以匹配所有时间段的索引）
- 时间戳字段
  - timestamp
- 创建索引模式

### 查看索引

- Discover



## 测试

- 尝试在日志中输入一段代码然后查看是否在web界面中展示

```bash
echo 'test code' >> /var/log/syslog
```





# Tomcat 日志

- 需要在被监控的主机上安装Logstash
- **注意：**如果多台tomcat属于同一个项目或应用，一般都是使用同一个索引类型，方便管理

## Tomcat 配置

- 修改tomcat日志格式，将输出格式修改为json格式

```bash
# vim /apps/tomcat/conf/server.xml
...
        <Valve className="org.apache.catalina.valves.AccessLogValve" directory="logs"
               prefix="tomcat_access_log" suffix=".log"
               pattern="{&quot;client&quot;:&quot;%h&quot;,  &quot;client user&quot;:&quot;%l&quot;,   &quot;authenticated&quot;:&quot;%u&quot;,   &quot;access time&quot;:&quot;%t&quot;,     &quot;method&quot;:&quot;%r&quot;,   &quot;status&quot;:&quot;%s&quot;,  &quot;send bytes&quot;:&quot;%b&quot;,  &quot;Query?string&quot;:&quot;%q&quot;,  &quot;partner&quot;:&quot;%{Referer}i&quot;,  &quot;Agent version&quot;:&quot;%{User-Agent}i&quot;}"/>
...
```

## Logstash配置

```bash
# vim /etc/logstash/conf.d/tomcat_log.conf
input {
    file {
        path => "/apps/tomcat/logs/tomcat_access_log*"
        type => "tomcat-access-log"
        start_position => "beginning"
        stat_interval => "3"
        codec => json
    }
}

output {
    if [type] == "tomcat-access-log" {
        elasticsearch {
            hosts => ["10.0.0.101"] #输出的 elasticsearch 主机IP地址，如果存在多台es主机，可以选择不同的es地址
            index => "logstash-tomcat-app1-access-log-%{+YYYY.MM.dd}" #索引输出格式，如属同一个项目，一般都是使用同一个索引类型，方便管理
        }
    }
}
```

## 检查Logstash配置文件语法

```bash
root@logstash:~# /usr/share/logstash/bin/logstash -f /etc/logstash/conf.d/tomcat_log.conf -t

#提示此行即表示成功
[INFO ] 2021-10-15 15:53:33.231 [LogStash::Runner] runner - Using config.test_and_exit mode. Config Validation Result: OK. Exiting Logstash
```

## Kibana界面配置

### 定义索引

- Management  --> stack management --> 索引模式
- 名称
  - 如：logstash-tomcat-app1-access-log-*（这样可以匹配所有时间段的索引）
- 时间戳字段
  - timestamp
- 创建索引模式

### 查看索引

- Discover







# Java 日志

- Java日志通常都是以 [ 开头，设置匹配时以每行 [ 开头即可


- 在需要监控Java日志的主机，安装logstash，添加以下配置：


- **使用 codec 的 multiline 插件实现多行匹配，这是一个可以将多行进行合并的插件，而且可以使用 what 指令将匹配到的行与前面的行合并或者和后面的行进行合并**

- 官方文档：https://www.elastic.co/guide/en/logstash/7.13/plugins-codecs-multiline.html




## logstash配置：

### 整行匹配收集

```bash
# vim /etc/logstash/conf.d/java_error_log.conf

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

### 检查Logstash配置文件语法

```bash
/usr/share/logstash/bin/logstash -f /etc/logstash/conf.d/java_error_log.conf -t
```



## Kibana界面配置

### 定义索引

- Management  --> stack management --> 索引模式
- 名称
  - 如：logstash-java-error-log-*（这样可以匹配所有时间段的索引）
- 时间戳字段
  - timestamp
- 创建索引模式

### 查看索引

- Discover



## 测试

```bash
#简单测试记录是否生效的方法

#下一个开头为 [ 的字段出现前不会记录
root@logstash:~# echo '[11111111' >> /var/log/java_test.log 
root@logstash:~# echo '222222222' >> /var/log/java_test.log 
root@logstash:~# echo '333333333' >> /var/log/java_test.log 

#这时才开始记录上一段内容
root@logstash:~# echo '[22222222' >> /var/log/java_test.log 
```





# Nginx 日志

nginx服务器如果存在很多台，每个日志都单独设置一个索引的话会带来大量的索引，不便于管理和系统性能，可以选择**将所有的nginx日志(相同类型，如访问日志一类，错误日志一类)全部指向到一个索引上**

## nginx配置：

- 主要是将访问日志修改为json格式
- 其他nginx主机也使用相同的配置

```bash
# vim /etc/nginx/nginx.conf

...
http {
...
    # json日志格式
    log_format log_json '{"@timestamp": "$time_local",'
                        '"remote_addr": "$remote_addr",'
                        '"referer": "$http_referer",'
                        '"request": "$request",'
                        '"status": $status,'
                        '"bytes": $body_bytes_sent,'
                        '"user_agent": "$http_user_agent",'
                        '"x_forwarded": "$http_x_forwarded_for",'
                        '"up_addr": "$upstream_addr",'
                        '"up_host": "$upstream_http_host",'
                        '"up_resp_time": "$upstream_response_time",'
                        '"request_time": "$request_time"'
                        ' }';
    access_log  logs/access.log log_json; # 引用日志格式名称
...
}
```

## logstash配置：

- 其他nginx主机也使用相同的配置


```bash
# vim /etc/logstash/conf.d/nginx_log.conf

input {
    file {
        path => "/var/log/nginx/access.log" #日志按天切割还需使用通配符去匹配
        type => "app1-nginx-access-log"
        start_position => "beginning"
        stat_interval => "3"
        codec => json
    }
    file {
        path => "/var/log/nginx/error.log" #日志按天切割还需使用通配符去匹配
        type => "app1-nginx-error-log"
        start_position => "beginning"
        stat_interval => "3"
    }
}

output {
    if [type] == "app1-nginx-access-log" {
        elasticsearch {
            hosts => ["10.0.0.101"]
            index => "nginx-access-log-%{+YYYY.MM.dd}"
        }
    }
    if [type] == "app1-nginx-error-log" {
        elasticsearch {
            hosts => ["10.0.0.101"]
            index => "nginx-error-log-%{+YYYY.MM.dd}"
        }
    }
}
```

### 检查Logstash配置文件语法

```bash
/usr/share/logstash/bin/logstash -f /etc/logstash/conf.d/nginx_log.conf -t
```



## Kibana界面配置

### 定义索引

- Management  --> stack management --> 索引模式
- 名称
  - 如：
    - app1-nginx-access-log-*
    - app1-nginx-error-log-*
- 时间戳字段
  - timestamp
- 创建索引模式

### 查看索引

- Discover















# logstash 收集日志并写入Redis

- 在主机较多的场景下，所有的日志都通过logstash写入到es会导致es主机的IO占用较高 从而性能下降
- 可以在中间加一台Redis作为缓存服务器，让logstash收集来的数据先写入Redis，然后再使用一台logstash主机去Redis取数据 最后再写入es，**redis中的数据被取走后，数据将不会在redis中继续保留**

## 环境说明

| server          | host name       | IP         |
| --------------- | --------------- | ---------- |
| elasticsearch   | es-node1        | 10.0.0.100 |
| elasticsearch   | es-node2        | 10.0.0.101 |
| elasticsearch   | es-node3        | 10.0.0.102 |
| kibana          | kibana-server   | 10.0.0.8   |
| redis           | redis-server    | 10.0.0.18  |
| logstash        | logstash-server | 10.0.0.28  |
| nginx、logstash | nginx-node1     | 10.0.0.38  |



## redis 主机配置

- redis安装过程省略

### redis 核心配置

```bash
[root@redis-server ~]# vim /etc/redis.conf 
...
bind 0.0.0.0
save "" #正常无需开启持久化，因为随着logstash将数据取走，redis也会随之删除
requirepass 123456 #生产中密码要设置的复杂一些
...
```

### 启动redis服务

```bash
#启动redis并设为开机自启动
[root@redis-server ~]# systemctl enable --now redis

#观察端口是否出现
[root@redis-server ~]# ss -ntl|grep 6379
LISTEN    0         128                0.0.0.0:6379             0.0.0.0:*   
```





## nginx 主机配置

- nginx配置过程省略，主要是将访问日志和错误日志分开存放，并且将访问日志改为json格式

### 配置logstash

- 需要使用redis插件
- 官方帮助文档：https://www.elastic.co/guide/en/logstash/7.16/plugins-outputs-redis.html
- **注意：因为是写入到redis，而不是直接写入elasticsearch，所以无需配置index**

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
        redis { #调用redis插件
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

### 检查logstash语法

```bash
/usr/share/logstash/bin/logstash -f /etc/logstash/conf.d/nginx_log.conf -t
```

### 启动logstash

- 不要忘记将启动用户改为root，否则以默认的logstash身份将无法读取日志内容

```bash
systemctl start logstash.service
```



## 写入一些日志进行测试

- 测试无问题后在进行下一步的部署单独的logstash

```bash
#访问url生成日志过程省略。。。

#查看日志
127.0.0.1:6379> AUTH 123456
OK
127.0.0.1:6379> SELECT 1
OK
127.0.0.1:6379[1]> KEYS *
1) "nginx-access-log"
2) "nginx-error-log"

#可以通过
```



## logstash 配置

- 单独准备一台 server 安装 logstash，去将redis中的日志数据收集过来然后传递给es

```bash
[root@logstash-server ~]# vim /etc/logstash/conf.d/redis_to_es.conf 
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
    redis {
        host => ["10.0.0.18"]
        port => "6379"
        password => "123456"
        db => "1"
        key => "nginx-error-log"
        data_type => "list"
        codec => json
        type => "app1-nginx-error-log"
    }
}

output {
    if [type] == "app1-nginx-access-log" {
        elasticsearch {
            hosts => ["10.0.0.100"]
            index => "app1-nginx-access-log-%{+YYYY.MM.dd}"
        }
    }
    if [type] == "app1-nginx-error-log" {
        elasticsearch {
            hosts => ["10.0.0.100"]
            index => "app1-nginx-error-log-%{+YYYY.MM.dd}"
        }
    }
}
```

### 检查logstash语法

```bash
/usr/share/logstash/bin/logstash -f /etc/logstash/conf.d/redis_to_es.conf -t
```

### 启动logstash

- 不要忘记将启动用户改为root，否则以默认的logstash身份将无法读取日志内容

```bash
systemctl start logstash.service
```



## Kibana界面配置

### 定义索引

- Management  --> stack management --> 索引模式
- 名称
  - 如：
    - app1-nginx-access-log-*
    - app1-nginx-error-log-*
- 时间戳字段
  - timestamp
- 创建索引模式

### 查看索引

- Discover
