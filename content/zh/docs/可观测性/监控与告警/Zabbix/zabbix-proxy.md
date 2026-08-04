---
title: "zabbix-proxy"
---

# zabbix-proxy 概述

- TCP / 10051
- 可选组件，对于被监控机器较多的情况下，可使用 Proxy 进行分布式监控，它能代理 Server 收集部分监控数据，然后把收集到的数据汇报给 Server，以减轻 Server 的压力。

- zabbix-proxy 也分为主动模式和被动模式







# zabbix-proxy 安装

- https://www.zabbix.com/cn/download
- 参考文档：
  - https://www.zabbix.com/documentation/4.0/zh/manual/installation/install_from_packages/rhel_centos
- proxy需配合数据库来使用，因为直接通过proxy将数据传输到server的话万一传输失败则有可能导致数据丢失，所以需先将监控的数据暂存到proxy关联的数据库当中
- 生成中数据库通常都是单独存放，且只存放proxy的数据

## rpm / apt 包安装

- 通过包进行安装zabbix-proxy，会自带数据库，也可以使用另外安装的数据库进行配置

### rpm

```bash
#安装官方仓库
[root@zabbix-proxy ~]# rpm -Uvh https://repo.zabbix.com/zabbix/5.0/rhel/8/x86_64/zabbix-release-5.0-1.el8.noarch.rpm
[root@zabbix-proxy ~]# dnf clean all

#安装zabbix-proxy
[root@zabbix-proxy ~]# yum -y install zabbix-proxy-mysql-5.0.20-1.el8

#启动数据库
[root@zabbix-proxy ~]# systemctl enable --now mariadb

#创建zabbix数据库账号
[root@zabbix-proxy ~]# mysql
MariaDB [(none)]> create database zabbix character set utf8 collate utf8_bin;
MariaDB [(none)]> create user zabbixproxy@localhost identified by '12345';
MariaDB [(none)]> grant all privileges on zabbix.* to zabbixproxy@localhost;

#验证数据库
[root@zabbix-proxy ~]# mysql -uzabbixproxy -p12345
MariaDB [(none)]> 

#导入初始数据库
[root@zabbix-proxy ~]# zcat /usr/share/doc/zabbix-server-mysql/create.sql.gz | mysql -uzabbixproxy -p 12345
```



## 编译安装

- centos7一键编译安装脚本

```sh
#!/bin/bash
#
#********************************************************************
#Author:		xiangzheng
#QQ: 			767483070
#Date: 			2021-09-19
#FileName：		install_zabbix_for_centos.sh
#URL: 			https://www.xiangzheng.vip
#Description：		The test script
#Copyright (C): 	2021 All rights reserved
#********************************************************************
. /etc/init.d/functions
DIR=`pwd`
ZABBIX_FILE="zabbix-4.0.32.tar.gz"
ZABBIX_DIR="/apps/zabbix_proxy"

yum -y install make java-1.8.0-openjdk-devel.x86_64 gcc libxml2-devel net-snmp net-snmp-devel curl\
 curl-devel php php-bcmath mariadb mariadb-devel \
libevent-devel pcre-devel  \
php-json && action "依赖包安装完成" || { action "依赖包安装失败" false ; exit; }

install_proxy(){
if ! [ -f "$DIR/$ZABBIX_FILE" ];then
    action "$ZABBIX_FILE 文件不存在" false
    exit;
elif [ -d "$ZABBIX_DIR" ];then
    action "ZABBIX 已经安装" false
    exit;
fi

tar xf $ZABBIX_FILE

cd ${ZABBIX_FILE%.tar.gz}

./configure --prefix=$ZABBIX_DIR \
--enable-proxy \
--enable-agent \
--with-mysql \
--enable-java \
--with-net-snmp \
--with-libcurl \
--with-libxml2 

make && make install

ln -s /apps/zabbix_proxy/sbin/zabbix_proxy /sbin/

id zabbix &> /dev/null || useradd -r -s /sbin/nologin zabbix

chown -R zabbix.zabbix /apps/zabbix_proxy/

action "zabbix 安装完成"

}

install_proxy

```

### 编译安装后导入数据

- proxy需配合数据库来使用，因为直接通过proxy将数据传输到server的话万一传输失败则有可能导致数据丢失，所以需先将监控的数据暂存到proxy关联的数据库当中
- 生成中数据库通常都是单独存放，且只存放proxy的数据

```bash
#在数据库主机创建账号、数据库、授权
MariaDB [(none)]> create user zabbix_(active|passive)@"10.0.0.%" identified by '12345';

MariaDB [(none)]> create database zabbix_proxy character set utf8 collate utf8_bin;

MariaDB [(none)]> grant all privileges on zabbix_proxy.* to zabbix_(active|passive)@"10.0.0.%";

#在proxy主机导入数据
[root@proxy ~]#cd zabbix-4.0.32/database/mysql/
[root@proxy mysql]#mysql -uzabbixx_(active|passive) -h10.0.0.8 -p12345 zabbix_proxy < schema.sql
```



## zabbix-proxy.service

- /lib/systemd/system/zabbix-proxy.service


```sh
[Unit]
Description=Zabbix Proxy
After=syslog.target
After=network.target

[Service]
Environment="CONFFILE=/apps/zabbix_proxy/etc/zabbix_proxy.conf"
Type=forking
Restart=on-failure
PIDFile=/tmp/zabbix_proxy.pid
KillMode=control-group
ExecStart=/usr/sbin/zabbix_proxy -c $CONFFILE
ExecStop=/bin/kill -SIGTERM $MAINPID
RestartSec=10s
User=zabbix
Group=zabbix

[Install]
WantedBy=multi-user.target
```













# zabbix-proxy 核心配置说明

- https://www.zabbix.com/documentation/5.0/zh/manual/appendix/config/zabbix_proxy

- /etc/zabbix/zabbix_proxy.conf

## 主动模式核心配置

```bash
ProxyMode=0 # proxy运行的模式，0表示主动模式，1表示被动模式，proxy设为什么模式 zabbix-server就得设置什么模式的监控项

Server=10.0.0.7 #zabbix-server服务器的地址

ServerPort=10051 #主动模式下此端口必须要配置；因为主动模式是proxy开启随机端口向server发送数据，所以必须知道server的端口。被动模式下此选项将被忽略；因为被动模式下是server开启随机端口向proxy的10051端口获取数据，所以proxy无需知道server的端口

Hostname=zabbix-proxy-beijing-active #proxy的主机名，在有多个proxy的情况下此名称必须保持唯一，例：zabbix-proxy-beijing-active|passive

ListenPort=10051 #本机proxy监听的端口，默认值就是10051

LogFile=/var/log/zabbix/zabbix_proxy.log #日志文件路径
PidFile=/var/run/zabbix/zabbix_proxy.pid #PID文件路径

EnableRemoteCommands=1 #是否允许zabbix-server在本机远程指向命令；0 不允许；1 允许；建议为1

#数据库相关配置，生成中数据库通常都是单独存放，且只存放proxy的数据
DBHost=
DBName=
DBUser=
DBPassword=
LogSlowQueries=3000 #查询超过多少毫秒则记录数据的慢查询日志中
                    #默认0 表示不记录慢查询日志
                    #根据生产环境适当调整 如：3000(毫秒为单位)

JavaGateway=10.0.0.100 #JavaGateway的地址，使用JavaGateway时需指定
JavaGatewayPort=10052 #JavaGateway的端口，使用JavaGateway时需指定
StartJavaPollers=5 #启动多少个java轮询器收集java数据，根据cpu核数适当调整

------------------------------------------------------------------------------
#可优化项
ProxyLocalBuffer=720 #已经提交到zabbix server的数据保留时间
                     #默认0，小时为单位 0-720
                     #建议调大，如720小时(一个月)，相当于保留一个月的监控数据备份 更加安全

ProxyOfflineBuffer=720 #未提交到zabbix server的数据保留时间
                       #默认1，小时为单位 1-720
                       #建议调大，如720小时(一个月)，因为如果因为网络等问题proxy的数据暂时无法发送给server时 还可以将这个数据保存至本地 而不是丢失

HeartbeatFrequency=60 #心跳检测时间间隔(检测zabbix server是否存活)
                      #默认60秒，范围0-3600秒
                      #可以适当调大，如：120秒，但默认值通常也可以

ConfigFrequency=300 #间隔多少秒向zabbix server获取监控项信息
                    #默认3600秒，范围1-3600*24*7秒
                    #默认间隔时间太长，建议设为300

DataSenderFrequency=30 #数据发送的时间间隔，默认为1秒，范围为1-3600秒
                       #默认间隔时间太短，建议设为30

StartPollers=5 #启动多少个收集器来收集数据，默认为5个，范围0-1000
               #通常默认就可以

#proxy缓存设置，内存大的话建议设大一点
CacheSize= #范围128K-64G
HistoryCacheSize= #范围128K-2G
HistoryIndexCacheSize= #范围128K-2G

Timeout=30 #超时时间，建议设为30s
```



## 被动模式核心配置

```bash
#/etc/zabbix/zabbix_proxy.conf

ProxyMode=0 #proxy运行的模式，0表示主动模式，1表示被动模式，proxy设为什么模式 zabbix-server就得设置什么模式的监控项

Server=10.0.0.7 #zabbix-server服务器的地址

                 
Hostname=zabbix-proxy-beijing-passive #proxy的主机名
                                      #在有多个proxy的情况下此名称必须保持唯一
                                      #例：zabbix-proxy-beijing-active|passive

ListenPort=10051 #本机proxy监听的端口，默认值就是10051

LogFile=/var/log/zabbix/zabbix_proxy.log #日志文件路径
PidFile=/var/run/zabbix/zabbix_proxy.pid #PID文件路径

EnableRemoteCommands=1 #是否允许zabbix-server在本机远程指向命令
                       #0 不允许
                       #1 允许
                       #建议为1

#数据库相关配置，生成中数据库通常都是单独存放，且只存放proxy的数据
DBHost=
DBName=
DBUser=
DBPassword=
LogSlowQueries=3000 #查询超过多少毫秒则记录数据的慢查询日志中
                    #默认0 表示不记录慢查询日志
                    #根据生产环境适当调整 如：3000(毫秒为单位)

JavaGateway=10.0.0.100 #JavaGateway的地址，使用JavaGateway时需指定
JavaGatewayPort=10052 #JavaGateway的端口，使用JavaGateway时需指定
StartJavaPollers=5 #启动多少个java轮询器收集java数据，根据cpu核数适当调整
 
------------------------------------------------------------------------------
#可优化项
ProxyLocalBuffer=720 #已经提交到zabbix server的数据保留时间，默认0，小时为单位 0-720，建议调大，如720小时(一个月)，相当于保留一个月的监控数据备份 更加安全

ProxyOfflineBuffer=720 #未提交到zabbix server的数据保留时间，默认1，小时为单位 1-720，建议调大，如720小时(一个月)，因为如果因为网络等问题proxy的数据暂时无法发送给server时 还可以将这个数据保存至本地 而不是丢失


StartPollers=5 #启动多少个收集器来收集数据，默认为5个，范围0-1000
               #通常默认就可以，cpu核数多也可以适当调大

#proxy缓存设置，内存大的话建议设大一点
CacheSize= #范围128K-64G
HistoryCacheSize= #范围128K-2G
HistoryIndexCacheSize= #范围128K-2G

Timeout=30 #超时时间，建议设为30s
```






