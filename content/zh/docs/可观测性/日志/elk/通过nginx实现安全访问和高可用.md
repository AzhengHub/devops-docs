---
title: "通过nginx实现安全访问和高可用"
---

# 前言

<img src="/docs/可观测性/日志/elk/es企业架构.jpg" alt="es企业架构" style="zoom: 50%;" />

- 在生产中，通常不是直接访问Kibana，而是通过nginx或haproxy等反向代理应用来进行访问
- Kibana为了容错，通常在每台Elasticsearch安装一个，这样即使一台Kibana出现问题，nginx或haproxy就会发现，进而将请求调度到其他的Kibana主机上
- 其他应用收集来的日志信息，也并不是直接发送给Elasticsearch，而是发送给负载均衡，再由负载均衡将信息交给Elasticsearch，这样即使Elasticsearch主机的IP发生变化，也无需在每台Logstash修改指向的Elasticsearch地址，只需在负载均衡上修改即可





# 注意事项

- nginx在中间充当反向代理时，因为kibana与es的交互过多，所以产生的大量的日志，**生产中可以考虑将nginx的日志关掉，或者定期进行清理**
- 配置完反向代理后，Kibana和logstash所指向的节点应为nginx的VIP





# 通过nginx代理 实现Kibana的安全访问

## Elasticsearch + Kibana + nginx 主机配置

### Elasticsearch配置

- 省略...

### Kibana配置

- 安装后，无需任何配置，让其监听默认的localhost

```bash
root@es-node1:~# vim /etc/kibana/kibana.yml 
#以下两项为默认值，及默认值监听在本地主机
#server.port: 5601
#server.host: "localhost
...

#启动kibana 并设为开机自启动
root@es-node1:~# systemctl enable --now kibana.service 

#观察端口是否开启
root@es-node1:~# ss -ntl|grep 5601
LISTEN   0        511            127.0.0.1:5601          0.0.0.0:*  
```

### nginx配置

- **使用nginx将访问kibana的请求转发到本机的127.0.0.1:5601，并加上账号密码的安全验证，防止恶意访问进行删除Elasticsearch索引数据等操作**
- 安装过程省略...

#### 生成密码

```bash
#Centos安装包
yum -y install httpd-tools
#Ubuntu安装包
apt -y install apache2-utils

#创建用户并非交互式创建密码，-c创建新的文件，-b非交互式
root@es-node1:~# htpasswd -cb /apps/nginx/conf/.htpasswd user1 666666
Adding password for user user1

#需要创建第二个用户时，不要加-c，否则会清空之前的内容
root@es-node1:~# htpasswd -b /apps/nginx/conf/.htpasswd user2 888888
Adding password for user user2

#查看密码文件是否生成
root@es-node1:~# ll /apps/nginx/conf/.htpasswd 
-rw-r--r-- 1 root root 88 Mar 18 17:30 /apps/nginx/conf/.htpasswd
root@es-node1:~# cat /apps/nginx/conf/.htpasswd
user1:$apr1$SE8LxZ2D$yhGBW1WGrHyLPwcCnuCoy1
user2:$apr1$jLkHg9PS$7.oEVTwmdlKg0NrFlRYYX1
```

#### 修改nginx配置文件

```bash
[root@centos8 ~]# vim /apps/nginx/conf/conf.d/pc.conf
server {
...
    location / {
        proxy_pass http://127.0.0.1:5601; #转发到本机
        auth_basic "please login"; #指定登录提示语
        auth_basic_user_file /apps/nginx/conf/.htpasswd; #指定账号密码文件
    }
...    
}
```



### 总结

- 另外两台主机进行同样的配置







## nginx + keepalived 主机配置

### keepalived 配置

安装过程省略...

### nginx 配置

安装过程省略...

- **注意：这里的nginx就无需再配置密码验证了，因为后端的三台es已经配置了密码验证**

#### 配置反向代理

```bash
[root@nginx ~]# vim /apps/nginx/conf/nginx.conf
http {
    upstream kibana { #注意要在http语句块配置
        server 10.0.0.100:80 weight=1 fail_timeout=10s max_fails=3;
        server 10.0.0.101:80 weight=1 fail_timeout=10s max_fails=3;
        server 10.0.0.102:80 weight=1 fail_timeout=10s max_fails=3;
    } 
    include /apps/nginx/conf.d/*.conf; #定义子配置文件
...

#创建子配置文件所需目录
[root@nginx ~]# mkdir /apps/nginx/conf.d/
```

#### 引用反向代理

```bash
[root@nginx ~]# vim /apps/nginx/conf.d/kibana.conf 
server {
    listen 80;
    server_name kibana.com;
    location  / {
        proxy_pass http://kibana;
    }
}
```



### 总结

- 另外一台主机同理





# -



# 通过nginx代理访问elasticsearch 从而实现日志写入



## nginx 配置

安装过程省略...

- **注意：这里的nginx就无需再配置密码验证了，因为后端的三台es已经配置了密码验证**

### 配置反向代理

- 转发到后端es的9200

```bash
[root@nginx ~]# vim /apps/nginx/conf/nginx.conf
http {
    upstream elasticsearch { #注意要在http语句块配置
        server 10.0.0.100:9200 weight=1 fail_timeout=10s max_fails=3;
        server 10.0.0.101:9200 weight=1 fail_timeout=10s max_fails=3;
        server 10.0.0.102:9200 weight=1 fail_timeout=10s max_fails=3;
    } 
    include /apps/nginx/conf.d/*.conf; #定义子配置文件
...

#创建子配置文件所需目录
[root@nginx ~]# mkdir /apps/nginx/conf.d/
```

### 引用反向代理

```bash
[root@nginx ~]# vim /apps/nginx/conf.d/elasticsearch.conf 
server {
    listen 9200; #监听9200端口
    location  / {
        proxy_pass http://elasticsearch;
    }
}
```



## 访问测试

- 通过浏览器测试访问的话可以发现每次都轮询转发到不同的es节点
- **访问VIP**

```bash
[root@client ~]# curl 10.0.0.123:9200
{
  "name" : "node-1", #浏览器访问：node1 ~ node2 ~ node3
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



## logstash 收集日志进行测试

### 安装logstash

```bash
[root@server src]# rpm -i logstash-7.16.3-x86_64.rpm 
```

### 配置日志收集

```bash
[root@server ~]# vim /etc/logstash/conf.d/system_messages.conf

```



## Kibana 添加索引信息

- 注意要通过负载均衡访问

### 添加索引

- app1-system-log-*
