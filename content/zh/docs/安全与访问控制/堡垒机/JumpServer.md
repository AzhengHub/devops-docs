---
title: "JumpServer"
weight: 10
---

## JumpServer 概述

- 官网：https://jumpserver.org
- Github：https://github.com/jumpserver
- Docker：https://hub.docker.com/r/jumpserver
- **JumpServer 是全球首款开源的堡垒机，是符合 4A 的专业运维安全审计系统。**
  - **4A：**
    - 身份鉴定（防止身份冒用和复用，还支持多因子验证）
    - 账号管理（人员和资产的管理）
    - 权限控制（防止内部误操作和权限滥用）
    - 安全审计（追溯的保障和事故分析的依据）
- **JumpServer 的优势：**
  - 开源：零门槛，线上快速安装和部署，并且支持容器
  - 分布式：轻松支持大规模并发访问
  - 无插件：仅需浏览器，极致的 Web Terminal 使用体验
  - 多云支持：一套系统，同时管理不同云上面的资产
  - 云端存储：审计录像云端存储，永不丢失
  - 多租户：一套系统，多个子公司和部门同时使用
  - 多应用支持：数据库，Windows远程应用，Kubernetes
- **JumpServer 的组件：**
  - Lina：Web UI 项目
  - Luna：Web Terminal 项目
  - KoKo：字符协议 Connector 项目，替代原来 Python 版本的 Coco
  - Lion：图形协议 Connector 项目，依赖 Apache Guacamole
  - Clients：客户端 项目
  - Installer：安装包 项目





## JumpServer 安装

- 官方参考文档：https://docs.jumpserver.org/zh/master/install/setup_by_fast/



### 基于容器部署

- **生产中不常用，因为没有正常部署稳妥**

- jumpserver/jms_all 这个容器包含的所有组件

#### 创建容器中自定义网络

```bash
[root@docker ~]# docker network create -d bridge --subnet 172.22.0.0/16 --gateway 172.22.0.1 jmsnet

[root@docker ~]# ip addr show br-43ea1a589c96 
9: br-43ea1a589c96: <NO-CARRIER,BROADCAST,MULTICAST,UP> mtu 1500 qdisc noqueue state DOWN group default 
    link/ether 02:42:b7:60:34:66 brd ff:ff:ff:ff:ff:ff
    inet 172.22.0.1/16 brd 172.22.255.255 scope global br-43ea1a589c96
       valid_lft forever preferred_lft forever

[root@docker ~]# brctl show
bridge name	bridge id		STP enabled	interfaces
br-43ea1a589c96		8000.0242b7603466	no		
```



#### 安装MySQL服务

##### 进入MySQL查看基础配置是否合适

```sh
#下载MySQL镜像并启动（指定 --rm 可以实现容器停止后自动删除）
docker run --rm --name mysql -d -p 3306:3306 \
--network jmsnet \
-e MYSQL_ROOT_PASSWORD=12345 \
-e MYSQL_DATABASE=jumpserver \
-e MYSQL_USER=jumpserver \
-e MYSQL_PASSWORD=12345 \
mysql:5.7.30

#进入容器查看数据库和用户是否创建成功，以及相关配置文件存放位置以及内容
root@docker1:~# docker exec -it mysql bash
root@1ed17a73f855:/# mysql -uroot -p12345
mysql> show databases;
+--------------------+
| Database           |
+--------------------+
| information_schema |
| jumpserver         |
| mysql              |
| performance_schema |
| sys                |
+--------------------+
mysql> select user,host from mysql.user;
+---------------+-----------+
| user          | host      |
+---------------+-----------+
| jumpserver    | %         |
| root          | %         |
| mysql.session | localhost |
| mysql.sys     | localhost |
| root          | localhost |
+---------------+-----------+
mysql> status
...
Server characterset:	latin1 #默认字符集都是拉丁，需要修改
Db     characterset:	latin1
Client characterset:	latin1
Conn.  characterset:	latin1
...
mysql> show create database jumpserver; #因为默认字符集是拉丁，所以创建的数据库也是拉丁
+------------+-----------------------------------------------------------------------+
| Database   | Create Database                                                       |
+------------+-----------------------------------------------------------------------+
| jumpserver | CREATE DATABASE `jumpserver` /*!40100 DEFAULT CHARACTER SET latin1 */ |
+------------+-----------------------------------------------------------------------+


#MySQL相关配置文件
----------------------------------------------------------------------------------------
root@9a6f1f5636f6:/# ls -lR /etc/mysql/
/etc/mysql/:
total 8
drwxr-xr-x 2 root root   62 Jun  9  2020 conf.d
lrwxrwxrwx 1 root root   24 Jun  9  2020 my.cnf -> /etc/alternatives/my.cnf
-rw-r--r-- 1 root root  839 Aug  3  2016 my.cnf.fallback
-rw-r--r-- 1 root root 1215 Mar 23  2020 mysql.cnf
drwxr-xr-x 2 root root   24 Jun  9  2020 mysql.conf.d

/etc/mysql/conf.d:
total 12
-rw-r--r-- 1 root root 43 Jun  9  2020 docker.cnf
-rw-r--r-- 1 root root  8 Aug  3  2016 mysql.cnf
-rw-r--r-- 1 root root 55 Aug  3  2016 mysqldump.cnf

/etc/mysql/mysql.conf.d:
total 4
-rw-r--r-- 1 root root 1610 Jun  9  2020 mysqld.cnf
----------------------------------------------------------------------------------------



#MySQL默认主要配置文件内容
----------------------------------------------------------------------------------------
root@9a6f1f5636f6:/# grep ^[^#] /etc/mysql/my.cnf               
!includedir /etc/mysql/conf.d/
!includedir /etc/mysql/mysql.conf.d/
root@9a6f1f5636f6:/# grep ^[^#] /etc/mysql/my.cnf.fallback 
!includedir /etc/mysql/conf.d/
root@9a6f1f5636f6:/# grep ^[^#] /etc/mysql/mysql.cnf 
!includedir /etc/mysql/conf.d/
!includedir /etc/mysql/mysql.conf.d/

root@9a6f1f5636f6:/# grep ^[^#] /etc/mysql/mysql.conf.d/mysqld.cnf 
[mysqld] #mysql server端 配置文件
pid-file	= /var/run/mysqld/mysqld.pid
socket		= /var/run/mysqld/mysqld.sock
datadir		= /var/lib/mysql
symbolic-links=0

root@9a6f1f5636f6:/# grep ^[^#] /etc/mysql/conf.d/docker.cnf 
[mysqld] #mysql server端 配置文件（基于docker配置）
skip-host-cache
skip-name-resolve

root@9a6f1f5636f6:/# grep ^[^#] /etc/mysql/conf.d/mysql.cnf 
[mysql] #MySQL客户端配置，无内容

root@9a6f1f5636f6:/# grep ^[^#] /etc/mysql/conf.d/mysqldump.cnf 
[mysqldump] #MySQL服务器默认备份选项
quick
quote-names
max_allowed_packet	= 16M
----------------------------------------------------------------------------------------

#MySQL主目录
----------------------------------------------------------------------------------------
root@9a6f1f5636f6:/# ls /var/lib/mysql/ -l
total 188484
-rw-r----- 1 mysql mysql       56 Feb 11 10:25 auto.cnf
-rw------- 1 mysql mysql     1676 Feb 11 10:25 ca-key.pem
-rw-r--r-- 1 mysql mysql     1112 Feb 11 10:25 ca.pem
...
----------------------------------------------------------------------------------------


#退出以及停止容器，准备配置文件（容器停止后才能自动删除）
root@1ed17a73f855:/# exit
root@docker1:~# docker stop mysql
```

##### 在宿主机准备MySQL配置文件

```sh
#准备相关目录
mkdir -p /etc/mysql/{conf.d,mysql.conf.d}

#准备配置文件
tee /etc/mysql/mysql.conf.d/mysqld.cnf <<EOF
[mysqld]
pid-file	= /var/run/mysqld/mysqld.pid
socket		= /var/run/mysqld/mysqld.sock
datadir		= /var/lib/mysql
symbolic-links=0
character-set-server=utf8 #指定服务端字符集
EOF

tee /etc/mysql/conf.d/mysql.cnf <<EOF
[mysql]
default-character-set=utf8 #指定客户端字符集
EOF

#最终文件如下
root@docker1:~# tree /etc/mysql
/etc/mysql
├── conf.d
│   └── mysql.cnf
└── mysql.conf.d
    └── mysqld.cnf
```

##### 启动MySQL容器

```sh
#将上面宿主机设置好的配置文件挂载至MySQL容器
docker run -d --name mysql -p 3306:3306 --restart always \
--network jmsnet \
-e MYSQL_ROOT_PASSWORD=12345 \
-e MYSQL_DATABASE=jumpserver \
-e MYSQL_USER=jumpserver \
-e MYSQL_PASSWORD=12345 \
-v /data/mysql:/var/lib/mysql \
-v /etc/mysql/mysql.conf.d/mysqld.cnf:/etc/mysql/mysql.conf.d/mysqld.cnf \
-v /etc/mysql/conf.d/mysql.cnf:/etc/mysql/conf.d/mysql.cnf mysql:5.7.30
```

##### 验证MySQL

```sh
#进入MySQL方式1
root@ubuntu:~# docker exec -it mysql bash
root@d26b93f96a82:/# mysql -uroot -p12345

#进入MySQL方式2，需要安装mysql客户端工具（）
    [root@docker ~]# mysql -h 10.0.0.8 -uroot -p12345

#
mysql> show variables like 'character%';
+--------------------------+----------------------------+
| Variable_name            | Value                      |
+--------------------------+----------------------------+
| character_set_client     | utf8                       |
| character_set_connection | utf8                       |
| character_set_database   | utf8                       |
| character_set_filesystem | binary                     |
| character_set_results    | utf8                       |
| character_set_server     | utf8                       |
| character_set_system     | utf8                       |
| character_sets_dir       | /usr/share/mysql/charsets/ |
+--------------------------+----------------------------+

mysql> show variables like 'collation%';
+----------------------+-----------------+
| Variable_name        | Value           |
+----------------------+-----------------+
| collation_connection | utf8_general_ci |
| collation_database   | utf8_general_ci |
| collation_server     | utf8_general_ci |
+----------------------+-----------------+

mysql> show create database jumpserver;
+------------+---------------------------------------------------------------------+
| Database   | Create Database                                                     |
+------------+---------------------------------------------------------------------+
| jumpserver | CREATE DATABASE `jumpserver` /*!40100 DEFAULT CHARACTER SET utf8 */ |
+------------+---------------------------------------------------------------------+
1 row in set (0.00 sec)


root@9ed9f1e76d27:/# cat /etc/mysql/conf.d/mysql.cnf 
[mysql]
default-character-set=utf8

root@9ed9f1e76d27:/# cat /etc/mysql/mysql.conf.d/mysqld.cnf 
[mysqld]
pid-file= /var/run/mysqld/mysqld.pid
socket= /var/run/mysqld/mysqld.sock
datadir= /var/lib/mysql
symbolic-links=0
character-set-server=utf8
```

#### 安装redis服务

##### 在宿主机准备redis配置文件

- 这里只做简单配置，生产者要开启持久化等功能

```bash
[root@docker ~]# cat /etc/redis.conf 
bind 0.0.0.0
port 6379
requirepass 123456
```

##### 启动redis

- 另外还有注意配置文件权限问题
- 如有其他原因未能启动容器，可以使用 docker logs redis 来进行故障排查

```sh
[root@docker ~]# docker run -d -p 6379:6379 \
--name redis --restart always \
--network jmsnet \
-v /etc/redis.conf:/etc/redis.conf \
redis:6.2.6 \
redis-server /etc/redis.conf
```

##### 验证redis连接

```sh
127.0.0.1:6379> info server
# Server
redis_version:6.2.6
```

#### 部署 Jumpserver

##### 需先生成key和token

- **注意：生成的KEY要保留好，一旦丢失，将无法将数据库中加密的字段进行解密**

```bash
#执行脚本，生成key和token

[root@docker ~]# vim key.sh
#/bin/bash
if [ ! "$SECRET_KEY" ];then
    SECRET_KEY=`cat /dev/urandom | tr -dc a-zA-Z0-9 | head -c 50`;
    echo SECRET_KEY=${SECRET_KEY} >> ~/.bashrc;
    echo ${SECRET_KEY};
else
    echo ${SECRET_KEY};
fi

if [ ! "$BOOTSTRAP_TOKEN" ];then
    BOOTSTRAP_TOKEN=`cat /dev/urandom | tr -dc a-zA-Z0-9 | head -c 16`;
    echo BOOTSTRAP_TOKEN=${BOOTSTRAP_TOKEN} >> ~/.bashrc;
    echo ${BOOTSTRAP_TOKEN}
else
    echo ${BOOTSTRAP_TOKEN}
fi

#生成的key和token
SECRET_KEY=BFzu8keczx4kNTnCdxiBVx486TetbWmDOL85PnlKkS1TN15K9G
BOOTSTRAP_TOKEN=1B5gMbC6T3JflsM3
```

##### 运行 jumpserver

```bash
docker run --name jms_all -d \
-p 80:80 \
-p 2222:2222 \
--restart always \
--network jmsnet \
-e SECRET_KEY=3uEhiGlkVUoe660IITAp64J2ohItNVn9qCQPGdjvMNGajQEHpO \
-e BOOTSTRAP_TOKEN=88HobaDoIHnS6J7T \
-e DB_HOST=10.0.0.8 \
-e DB_PORT=3306 \
-e DB_USER=root \
-e DB_PASSWORD=12345 \
-e DB_NAME=jumpserver \
-e REDIS_HOST=10.0.0.8 \
-e REDIS_PORT=6379 \
-e REDIS_PASSWORD=123456 \
jumpserver/jms_all:v2.17.3
```

##### 验证是否成功

- 默认登录账号为admin，密码为admin

```bash
...
```











## JumpServer 使用

### 登录

- **首次登录 默认账号为admin 默认密码为 admin**

#### 方式一：基于浏览器登录

- 访问jumpserver服务器的IP或域名进行登录

#### 方式二：基于命令行登录

- jumpserver也可以基于ssh协议的2222/TCP端口进行远程登录管理

```bash
ssh -p 2222 admin@10.0.0.100
```



### JumpServer 用户管理

#### 配置邮箱

- 配置邮箱可以实现基于邮件完成设置初始密码、找回密码、信息通知等功能
- **系统设置 --> 邮件设置 --> 邮件服务器设置**

##### 输出说明

```bash
SMTP主机 #由第三方邮件平台提供，一般在第三方邮件平台登录后点击设置就能看到

SMTP端口 #SMTP主机所使用的端口，每个第三方平台使用的端口可能不一样，并且端口又分为 SSL协议端口和非SSL协议端口，以163邮件举例 SSL协议端口：465 非SSL协议端口：25 ，这些信息在邮箱官网都可以看到

SMTP账号 #登录第三方邮箱所使用的账号

SMTP密码 #第三方邮箱的授权码，由第三方邮箱提供，一般在第三方邮件平台登录后点击设置然后申请即可

使用SSL #如果SMTP端口是465，通常需要启用 SSL
使用TLS #如果SMTP端口是587，通常需要启用 TLS
```

##### 范例

```bash
SMTP主机 #smtp.163.com
SMTP端口 #465
SMTP账号 #rootroot25@163.com
SMTP密码 #BKUGOQFTMOHQKRPC
使用SSL  #勾选
```

##### 测试邮件

- JumpServer 提供了邮件测试，配置完成后可以测试一下发送是否正常



#### 创建组

- 创建组后可以将特定类别的用户加入到特定组中，从而实现分类管理
- **用户管理 --> 用户组 --> 创建用户组**



#### 创建JumpServer用户

- 创建不同权限的账号分配给不同的工作人员 如：运维、开发、测试等，从而实现数据安全保障
- 还可以将指定用户添加到指定组中，实现分类管理
- **用户分类：**
  - 系统管理员（权限最高）
  - 系统审计员（具有查看录像、日志等审计相关权限）
  - 用户（普通权限）
- **MFA：**双因子验证，可以实现双重验证，更加安全
- 如选择通过邮箱重置密码，打开收到的链接后如果打不开，则**需要修改成本地的ip地址和80端口才能进行修改**



### 资产管理

#### 资产相关用户说明

下面是JumpServer对资产相关用户的解释：

- **系统用户** 是JumpServer 登录资产时使用的账号，如 root ssh root@host，而不是使用该用户名登录资产（ssh admin@host)
- **特权用户** 是资产已存在的, 并且拥有 高级权限 的系统用户，如 root 或 拥有 NOPASSWD: ALL sudo 权限的用户。 JumpServer 使用该用户来 推送系统用户、获取资产硬件信息等。**就是服务器上的root用户**
- **普通用户** 可以在资产上预先存在，也可以由 特权用户 来自动创建。**就是服务器上的普通用户**



#### 创建特权用户

- **添加资产前需要先创建特权用户**，要注意的是 特权用户和前面创建的用户不是同一类，前面创建的用户是基于JumpServer的用户，而**这次创建的是针对管理资产的特权用户 如：某台要被列为资产服务器主机的root账号和其对应的密码**，除root账号外 sudo授权的账号也是可以的
- **资产管理 --> 系统用户 --> 特权用户 --> 创建**



#### 添加资产

- 系统平台为Linux时 协议组选择ssh
- 系统平台为Windows时 协议组选择rdp
- **资产管理 --> 资产列表 --> 创建**



#### 创建普通用户

- **普通用户是在资产上具有普通权限的用户，然后给特定人员分配普通用户的权限，防止直接使用特权用户而导致权限过大的问题**
- 普通用户可以在资产上预先存在，也可以由 特权用户 来自动创建
- 普通用户在资产上预先存在的话 只需直接在web界面创建用户即可
  - **资产管理 --> 系统用户 --> 普通用户 --> 创建**
- **由特权用户自动创建：**
  - **资产管理 --> 系统用户 --> 普通用户 --> 创建（创建时需要开启自动推送）**
  - **注意：**这种方式添加资产的普通用户 不会立刻在资产上创建用户 需要将**用户和资产进行绑定**（关联单一资产 或 关联一个资产节点）**才会生成用户**
  - 如果创建用户是忘记开启自动推送：
    - 点击 资产管理 --> 系统用户 --> 普通用户 --> 选取指定的用户 --> **快速更新框中将自动推送开启才会生成用户**



#### 命令过滤

系统用户可以绑定一些命令过滤器，一个过滤器可以**定义一些规则** 当用户使用这个系统用户登录资产，然后执行一个命令 这个命令需要被绑定过滤器的所有规则匹配，高优先级先被匹配， 当一个规则匹配到了，如果规则的动作是允许，这个命令会被放行，**如果规则的动作是禁止，命令将会被禁止执行**， 否则就匹配下一个规则，**如果最后没有匹配到规则，则允许执行**





### 权限管理

#### 资产授权

- 将指定的JumpServer用户或者组授权到指定资产中
- **权限管理 --> 资产授权 --> 创建**






### 使用总结

#### JumpServer 账号篇：

- JumpServer 初次安装使用时需要创建一个新的管理员账号 防止唯一的管理员账号忘记密码而带来不必要麻烦
- 另外还可以创建其他的普通账号来分发给普通用户，如：测试、开发等
- 除上述两种账号外，还有一种账号叫做系统审计员，这个账号就类似于看录像的，系统审计员账号可以实现对会话的管理、命令记录的查看、Jumpserver以及资产日志的查看等功能
- 为了方便管理 可以创建指定的用户组 将创建完的账号按职责分类添加到特点组中



#### 资产管理账号篇：

- 管理资产 首先要有管理资产对应的账号 管理资产的账号有如下几种：
  - 普通用户（资产上的普通用户 可以设置如：登录ssh的普通用户、管理数据库的MySQL用户等）
  - 特权用户（资产上的超级管理员 **只能设置登录终端的root用户**）
- 然后就需要将指定的资产添加到资产列表中
- 添加资产 和 管理资产的账号创建时没有先后顺序之分，只要账号和资产创建完毕后 测试是否能够ping通即可



#### 资产授权篇：

- 虽然创建了JumpServer的账号 和 资产，但这时候JumpServer的账号还并不能管理资产
- 需要将资产 对 JumpServer 账号授权才能实现JumpServer账号对资产的访问



#### 应用授权篇：

- 对应用进行授权，如 MySQL、Kubernetes
- **需要创建一个 资产管理账号中 相应 应用的账号，然后在应用管理中创建指定的数据库 最后才能实现授权**
- 授权时可以将指定的用户或用户组加入到应用中 从而实现从jumpserver上访问
