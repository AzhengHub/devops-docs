---
title: "zabbix-server"
---

# zabbix-server 概述

- TCP / 10051
- 核心组件，C语言编写，负责接收Agent、Proxy发送的监控数据，也支持JMX、SNMP等多种协议直接采集数据。同时，它还负责数据的汇总存储以及告警触发等。
- zabbix-server 可以将proxy或agent收集来的数据在web界面友好展示（web GUI组件由 PHP 编写），还支持自定义监控项、触发器、自动发现规则等功能
- zabbix-server 需要配合数据库，将配置信息以及采集到的数据写入其中，支持MySQL、Oracle等关系型数据库。同时，最新版本的Zabbix已经开始支持时序数据库，不过成熟度还不高。









# zabbix-server 安装

- https://www.zabbix.com/cn/download
- 推荐使用官方yum/apt仓库来进行基于包安装，因为其中涉及了很多的组件，而配置对应版本的官方仓库后 仓库中会提供关于这个版本中所有包含的组件
- **注意：每个组件都由对应的不同系统和不同软件版本的包 不要选择错**
  - 下面安装的是针对 CentOS 8、MySQL、Nginx 的包
- 官方的仓库在国外 下载会比较慢，可以去国内的镜像源来下载 如：清华镜像源



## rpm / apt 包安装

### 准备仓库

```bash
# rpm -Uvh https://repo.zabbix.com/zabbix/5.0/rhel/8/x86_64/zabbix-release-5.0-1.el8.noarch.rpm


# 替换为清华的镜像地址
# vim /etc/yum.repos.d/zabbix.repo
[zabbix]
name=Zabbix Official Repository - $basearch
baseurl=https://mirrors.tuna.tsinghua.edu.cn/zabbix/zabbix/5.0/rhel/8/$basearch/
enabled=1
gpgcheck=1
gpgkey=file:///etc/pki/rpm-gpg/RPM-GPG-KEY-ZABBIX-A14FE591

[zabbix-non-supported]
name=Zabbix Official Repository non-supported - $basearch
baseurl=https://mirrors.tuna.tsinghua.edu.cn/zabbix/non-supported/rhel/8/$basearch/
enabled=1
gpgkey=file:///etc/pki/rpm-gpg/RPM-GPG-KEY-ZABBIX
gpgcheck=1


# dnf clean all
# dnf makecache
```

### 安装 zabbix-server 相关组件

```bash
# dnf install zabbix-server-mysql zabbix-web-mysql zabbix-nginx-conf zabbix-agent
```

### 准备 MySQL 数据库

- 数据库安装过程略

```sql
# 登录数据库
# mysql -uroot -p

# 创建数据库，创建zabbix账号，授权
MariaDB [(none)]> create database zabbix_server character set utf8 collate utf8_bin;

MariaDB [(none)]> create user zabbix@"10.0.0.%" identified by '12345';

MariaDB [(none)]> grant all privileges on zabbix_server.* to zabbix@"10.0.0.%";


# 找其他主机测试一下是否能够访问，账号密码是否正确
# mysql -uzabbix -p12345 -h10.0.0.8
...
MariaDB [(none)]> show databases;
+--------------------+
| Database           |
+--------------------+
| information_schema |
| zabbix_server      |
+--------------------+
```

### 导入数据库初始数据

- 需要在安装zabbix-server的主机执行


```bash
# 注意最后要加数据库的库名
# zcat /usr/share/doc/zabbix-server-mysql/create.sql.gz | mysql -uzabbix -p12345 -h10.0.0.8 zabbix_server


# 查看数据是否创建成功
MariaDB [(none)]> show tables from zabbix_server;
+----------------------------+
| Tables_in_zabbix_server    |
+----------------------------+
| acknowledges               |
| actions                    |
| alerts                     |

```

### 为 Zabbix-server 配置数据库

```bash
# vim /etc/zabbix/zabbix_server.conf
...
DBHost=10.0.0.8
DBName=zabbix_server
DBUser=zabbix
DBPassword=12345
...
```

### 为 Zabbix-server 配置前端

```bash
# nginx
# vim /etc/nginx/conf.d/zabbix.conf
server {
        listen          80;
        server_name     zbx.com;

        root    /usr/share/zabbix;
...

---

# php
# vim /etc/php-fpm.d/zabbix.conf
php_value[date.timezone] = Asia/Shanghai #将此行取消注释，并修改时区
```

### 启动 zabbix-server 相关服务

```bash
# systemctl restart zabbix-server zabbix-agent nginx php-fpm


# systemctl enable --now zabbix-server zabbix-agent nginx php-fpm



#

```

### 浏览器访问测试和配置

- 配置域名解析后访问 http://zbx.com/
- 浏览器访问，查看安装前检查是否都为OK

- 检查无误后，next step

- 配置数据库

- 登录

  - 账号默认：Admin


  - 密码默认：zabbix




## 编译安装

### 下载源码包

```bash
[root@18 ~]#wget https://cdn.zabbix.com/zabbix/sources/stable/5.0/zabbix-5.0.15.tar.gz
```

### 解决依赖关系

```bash
[root@18 ~]#yum -y install make gcc libxml2-devel net-snmp net-snmp-devel curl curl-devel php php-bcmath php-mbstring mariadb mariadb-devel libevent-devel pcre-devel php-mysqlnd php-gd php-xml php-ldap php-json
```

### 开始编译安装，然后创建zabbix用户

```bash
[root@18 ~]#tar xf zabbix-5.0.15.tar.gz

[root@18 ~]#cd zabbix-5.0.15/

[root@18 zabbix-5.0.15]#./configure --prefix=/apps/zabbix --enable-server --enable-agent --with-mysql --enable-ipv6 --with-net-snmp --with-libcurl --with-libxml2

[root@18 zabbix-5.0.15]#make && make install

[root@18 ~]#useradd -r zabbix -s /sbin/nologin
```

### 修改配置文件，数据库相关配置参考安装包安装部署

```bash
[root@18 ~]#vim /apps/zabbix/etc/zabbix_server.conf
DBHost=10.0.0.38
DBName=zabbix_server2
DBUser=zabbix
DBPassword=12345
PidFile=/apps/zabbix/run/zabbix_server.pid


[root@18 ~]#vim /apps/zabbix/etc/zabbix_agentd.conf
PidFile=/apps/zabbix/run/zabbix_agentd.pid
```

### 导入初始架构和数据

- 需要在安装zabbix的主机执行


```bash
[root@18 ~]#yum -y install mariadb

[root@18 ~]#cd zabbix-4.0.32/database/mysql/

#先在数据库主机创建数据库，创建zabbix账号，授权
MariaDB [(none)]> create user zabbix@"10.0.0.%" identified by '12345';

MariaDB [(none)]> create database zabbix_server1 character set utf8 collate utf8_bin;

MariaDB [(none)]> grant all privileges on zabbix_server1.* to zabbix@"10.0.0.%";


#导入前需修改数据库参数，否则可能会引起此报错
[root@18 mysql]# mysql -h10.0.0.8 -uzabbix -p12345 zabbix_server1 < schema.sql
ERROR 1118 (42000) at line 1278: Row size too large (> 8126). Changing some columns to TEXT or BLOB may help. In current row format, BLOB prefix of 0 bytes is stored inline.
#这个是在插入长数据的时候报错，在当前模式下，不支持这么长的blob数据插入。
#解决步骤：
[root@8 ~]# vim /etc/my.cnf.d/mariadb-server.cnf
[mysqld]
#取消行大小限制(8126)
innodb_strict_mode=0


#导入
[root@18 mysql]#mysql -h10.0.0.8 -uzabbix -p12345 zabbix_server1 < schema.sql
[root@18 mysql]#mysql -h10.0.0.8 -uzabbix -p12345 zabbix_server1 < images.sql
[root@18 mysql]#mysql -h10.0.0.8 -uzabbix -p12345 zabbix_server1 < data.sql

```

### 创建软连接和启动服务

```bash
[root@18 ~]#ln -s /apps/zabbix/sbin/* /sbin/


#启动zabbix_server服务
[root@18 ~]#zabbix_server

#启动zabbix_agentd服务
[root@18 ~]#zabbix_agentd
```

### 准备浏览器页面

```bash
[root@18 ~]#yum -y install httpd

[root@18 ~]# mkdir /var/www/html/zabbix

#zabbix4.0源码包中的php文件在frontends/php目录中
[root@18 ~]#cd zabbix-5.0.15/ui/

#nginx目录在/usr/share/nginx/html/
[root@18 ui]#cp -r * /var/www/html/

[root@18 ui]#systemctl enable --now httpd php-fpm zabbix-agent zabbix-server
```

### 进入网页开始配置

```bash
#会提示很多配置未达标或未设置，需手动修改

[root@18 ~]#vim /etc/php.ini
post_max_size = 16M
max_execution_time = 300
max_input_time = 300
date.timezone = Asia/Shanghai
```

**最后的配置文件需生成后下载后手动导入到指定目录中**



## 数据库报错解决办法

- 导入基础架构时的报错

```sh
[root@18 mysql]# mysql -h10.0.0.8 -uzabbix -p12345 zabbix_server1 < schema.sql
ERROR 1118 (42000) at line 1278: Row size too large (> 8126). Changing some columns to TEXT or BLOB may help. In current row format, BLOB prefix of 0 bytes is stored inline.
#这个是在插入长数据的时候报错，在当前模式下，不支持这么长的blob数据插入。
#解决步骤：
[root@8 ~]# vim /etc/my.cnf.d/mariadb-server.cnf
[mysqld]
#取消行大小限制(8126)
innodb_strict_mode=0
```

## zabbix-server.service

- /usr/lib/systemd/system/zabbix-server.service

```bash
[Unit]
Description=Zabbix Server
After=syslog.target
After=network.target

[Service]
Environment="CONFFILE=/apps/zabbix/etc/zabbix_server.conf"
EnvironmentFile=-/apps/zabbix/etc/sysconfig/zabbix-server
Type=forking
Restart=on-failure
PIDFile=/apps/zabbix/run/zabbix_server.pid
KillMode=control-group
ExecStart=/usr/sbin/zabbix_server -c $CONFFILE
ExecStop=/bin/kill -SIGTERM $MAINPID
RestartSec=10s
TimeoutSec=0

[Install]
WantedBy=multi-user.target


[root@18 ~]#systemctl  daemon-reload
[root@18 ~]#mkdir /apps/zabbix/run/
[root@18 ~]#chown -R zabbix.zabbix /apps/zabbix/
```









# zabbix-server GUI 优化

## 改中文

- 支持zabbix5.0，安装完成后再浏览器界面：
  - User settings **-->** language **-->** Chinese(zh_CN) **-->** Update

```bash
# Centos
yum -y install glibc-langpack-zh.x86_64

---

# Ubuntu
```

## 解决字体乱码

- 需要先在 Windows cmd 下执行 `fonts` 选择一个喜欢的字体

### zabbix 4.0

```bash
# 将字体拷贝到以下目录
[root@18 ~]#cd /var/www/html/zabbix/assets/fonts/

#根据名称修改如下几个字体关键字
[root@18 fonts]#cd ..
[root@18 assets]#cd ..
[root@18 zabbix]#cd ..
[root@18 html]#grep -R DejaVuSans *
ui/include/defines.inc.php:define('ZBX_GRAPH_FONT_NAME',		'DejaVuSans'); // font file name
ui/include/defines.inc.php:define('ZBX_FONT_NAME', 'DejaVuSans');
Binary file ui/assets/fonts/DejaVuSans.ttf matches
Binary file zabbix/assets/fonts/DejaVuSans.ttf matches
zabbix/include/defines.inc.php:define('ZBX_GRAPH_FONT_NAME',		'DejaVuSans'); // font file name
zabbix/include/defines.inc.php:define('ZBX_FONT_NAME', 'DejaVuSans');
```

### zabbix 5.0

```bash
# 将字体文件导入到此目录下
/usr/share/fonts/dejavu/

# 字体文件
# ll /usr/share/fonts/dejavu/simkai.ttf 
-rw-r--r-- 1 root root 11787328 Oct 14  2021 /usr/share/fonts/dejavu/simkai.ttf


#将默认字体备份
mv  /usr/share/fonts/dejavu/DejaVuSans.ttf  /usr/share/fonts/dejavu/DejaVuSans.ttf.bak

#将新导入的字体改名
mv /usr/share/fonts/dejavu/simkai.ttf /usr/share/fonts/dejavu/DejaVuSans.ttf
```





# zabbix-server 配置文件说明

- https://www.zabbix.com/documentation/5.0/zh/manual/appendix/config/zabbix_server

- /apps/zabbix/etc/zabbix_server.conf

## 分类

- ***** 表示可优化项

#### 基础配置

```bash
ListenIP=0.0.0.0 #监听地址相关，默认值即可
ListenPort=10051 #zabbix监听端口，默认值即可
SourceIP= #传出连接的源IP地址，默认值即可
```

#### 日志相关

```bash
LogType=file #日志记录类型，一般默认值即可
LogFile=/var/log/zabbix/zabbix_server.log #日志文件记录位置
LogFileSize=0 #日志滚动重写，0表示不自动重写，也可以设置为1-1024(M为单位)
DebugLevel=3 #日志记录级别，一般不用改，遇到严重问题时可以调整为dbug，但更改为dbug调试完成后记得改回来，否则日志量会记录很大
```

#### pid、sock相关

```bash
PidFile=/var/run/zabbix/zabbix_server.pid #pid文件路径
SocketDir=/var/run/zabbix #IPC套接字使用的目录
```

#### DB相关

```bash
DBHost=localhost #数据库主机的IP地址，如果数据库在远程则需填写远程IP
DBName=zabbix #数据库的名称
DBSchema= #数据库架构名称，用于PostgreSQL，一般默认不用动
DBUser=zabbix #连接数据库的用户名
DBPassword=password #连接数据库的密码
DBSocket= #默认即可
DBPort= #默认即可，默认3306端口
```

#### elasticsearch相关

```bash
HistoryStorageURL= #elasticsearch服务器地址，保存zabbix历史数据到ES里面，优化zabbix性能
HistoryStorageTypes=uint,dbl,str,log,text #elasticsearch索引类型
HistoryStorageDateIndex=0 #将历史数据保存到不同的elasticsearch索引
```

#### 导出文件相关

```bash
ExportDir= #定义实时导出触发器事件、监控项采集值、趋势数据的目录
ExportFileSize=1G #定义每个导出文件的最大大小
ExportType=events,history,trends #定义导出的文件类型
```

#### 高级参数

```bash
*StartPollers=5 #预启动多少个进程数量来负责数据采集，生产中根据cpu配置来适当调大
StartIPMIPollers=0 #需要开启IPMI，收集IPMIP的进程数，默认为0，根据需求少量开启即可
*StartPreprocessors=3 #预启动多少个进程用于处理zabbix-agent数据，生产中根据cpu配置来适当调大
StartPollersUnreachable=1 #不可达主机的轮询进程的初始实例启动数量，一般默认即可
StartTrappers=5 #预启动的Trappers(报警相关)进程数量，一般默认即可
*StartPingers=5 #ping(探测)的预分配实例数，建议调大一点 如：5
*StartDiscoverers=5 #主动发现的预分配实例数，建议调大一点 如：5
StartHTTPPollers=1 #为web界面的分配的进程数
StartTimers=1 #计时器的实例数量，计时器用于计算问题的发生时间和步骤同步等
StartEscalators=1 #escalators进程的初始实例数量，用于处理动作中的自动步骤的进程数量
StartAlerters=3 #报警实例预启动数量
```

#### JAVA收集相关

- 收集Java数据则需要配置此项

```bash
JavaGateway=10.0.0.100 #JavaGateway的IP地址或主机名
JavaGatewayPort=10052 #JavaGateway的端口
StartJavaPollers=5 #为JavaGateway开启的进程实例数量，一般和JavaGateway的此值相同
```

#### VMware收集相关，一般不用配 默认即可

```bash
StartVMwareCollectors=0
VMwareFrequency=60
VMwarePerfFrequency=60
VMwareCacheSize=8M
VMwareTimeout=10
```

#### SNMP收集相关

```bash
SNMPTrapperFile=/var/log/snmptrap/snmptrap.log #SNMP的日志文件存放路径
StartSNMPTrapper=0 #是否启用SNMP触发器，1表示启动，0表示关闭
```

#### 历史数据相关

```bash
HousekeepingFrequency=1 #多少小时清理一次代理端数据库的历史数据，默认值即可
MaxHousekeeperDelete=5000 #每次最多删除历史数据的行数，默认值即可
```

#### 缓存优化相关

```bash
*CacheSize=128M  #缓存大小，根据业务量来配置大小，1G...2G...
*CacheUpdateFrequency=300 #zabbix更新缓存数据的频率，单位是秒，可以适当长一些如300秒
StartDBSyncers=4 #zabbix和数据库同步数据的进程数量，一般默认即可
*HistoryCacheSize=4M #历史数据的缓存大小，内存大的话建议设为最大值2G
*HistoryIndexCacheSize=4M #历史索引缓存大小，内存大的话建议设为最大值2G
*TrendCacheSize=4M #划分多少系统共享内存用于存储计算出来的趋势数据，内存大的话建议设为2G或更高
*ValueCacheSize=8M #历史值的缓存大小，用于缓存历史数据请求的共享内存大小，内存大的话建议设为2G或更高
```

#### 时间相关优化

```bash
*Timeout=30 #认为agent的超时的等待时长，建议设为30秒(如果超过这个时间则认为agent以及超时，此次探测结果无效)
TrapperTimeout=300 #触发器处理新数据的最长时间，单位是秒，一般默认值就够用
UnreachablePeriod=45 #当主机不可达多少秒后，设置为主机不可用，一般默认值就够用
UnavailableDelay=60 #当主机不可用了，多久检查一次该主机的可用性，一般默认值就够用
UnreachableDelay=15 #当主机不可到达，多久检查一次该主机的可用性，一般默认值就够用
```

#### 路径相关

```bash
AlertScriptsPath=/usr/lib/zabbix/alertscripts #监控报警脚本的路径，取决于编译时datadir路径参数
ExternalScripts=/usr/lib/zabbix/externalscripts#监控报警脚本执行的路径，取决于编译时datadir路径参数
FpingLocation=/usr/sbin/fping #检查网络设备是否通畅fping命令的路径
Fping6Location=/usr/sbin/fping6 #检查网络设备是否通畅fping6命令的路径
SSHKeyLocation= #SSH检查和操作的公钥和私钥的位置
LogSlowQueries=3000 #数据库查询可能需要多长时间才能被记录（以毫秒为单位），仅当DebugLevel设置为3、4或5时有效，0-不要记录慢速查询
TmpDir=/tmp #临时目录
```

#### 与proxy相关优化

```bash
*StartProxyPollers=1 #启动多少子进程与代理端通信，proxy代理数量多个时，可设为和和代理数量相同的值
*ProxyConfigFrequency=60 #proxy被动模式下，server多少秒同步配置文件至proxy，该参数仅用于被动模式下的代理，主机多设置长些，主机少设置短些
*ProxyDataFrequency=60 #proxy被动模式下，server间隔多少秒向proxy请求历史数据，主机多设置长些(建议不超过5分钟)，主机少设置短些(60秒)
```

####  链路层发现协议相关

```bash
StartLLDProcessors=2
```

#### 安全相关

```bash
*AllowRoot=0 #是否允许root来允许zabbix服务，0不允许，1允许，默认为0
*User=zabbix #启动zabbix进程的账户
StatsAllowedIP= #定义允许访问zabbix server的IP地址列表，一般不用设置，通常都是在防火墙上和公网地址做映射实现异地访问
```

#### 配置文件存放位置相关

```bash
Include=/usr/local/etc/zabbix_server.general.conf
Include=/usr/local/etc/zabbix_server.conf.d/
Include=/usr/local/etc/zabbix_server.conf.d/*.conf
```

#### SSL相关

```bash
SSLCertLocation=${datadir}/zabbix/ssl/certs #SSL证书公钥的位置，用于web监控
SSLKeyLocation=${datadir}/zabbix/ssl/keys #SSLkey证书私钥的位置，用于web监控
SSLCALocation= #SSL CA文件目录
```

#### 模块相关

```bash
LoadModulePath=${libdir}/modules #第三方模块目录路径
LoadModule= #第三方模块路径
```

#### TLS相关

- 一般不用配，证书以及相关的配置一般都是在nginx或apache上面配

```bash
TLSCAFile= #CA文件
TLSCRLFile= #包含已吊销证书的文件的完整路径列表
LSCertFile= #公钥文件路径
TLSKeyFile= #私钥文件路径
...
```



## 可优化项总结

```bash
*StartPollers=5 #预启动多少个进程数量来负责数据采集，生产中根据cpu配置来适当调大
*StartPreprocessors=3 #预启动多少个进程用于处理zabbix-agent数据，生产中根据cpu配置来适当调大
*StartPingers=5 #ping(探测)的预分配实例数，建议调大一点 如：5
*StartDiscoverers=5 #主动发现的预分配实例数，建议调大一点 如：5

#缓存优化相关
*CacheSize=128M  #缓存大小，根据业务量来配置大小，1G...2G...
*CacheUpdateFrequency=300 #zabbix更新缓存数据的频率，单位是秒，可以适当长一些如300秒
*HistoryCacheSize=4M #历史数据的缓存大小，内存大的话建议设为最大值2G
*HistoryIndexCacheSize=4M #历史索引缓存大小，内存大的话建议设为最大值2G
*TrendCacheSize=4M #划分多少系统共享内存用于存储计算出来的趋势数据，内存大的话建议设为2G或更高
*ValueCacheSize=8M #历史值的缓存大小，用于缓存历史数据请求的共享内存大小，内存大的话建议设为2G或更高

#时间相关优化
*Timeout=30 #认为agent的超时的等待时长，建议设为30秒(如果超过这个时间则认为agent以及超时，此次探测结果无效)

#与proxy相关优化
*StartProxyPollers=1 #启动多少子进程与代理端通信，proxy代理数量多个时，可设为和和代理数量相同的值
*ProxyConfigFrequency=60 #proxy被动模式下，server多少秒同步配置文件至proxy，该参数仅用于被动模式下的代理，主机多设置长些，主机少设置短些
*ProxyDataFrequency=60 #proxy被动模式下，server间隔多少秒向proxy请求历史数据，主机多设置长些(建议不超过5分钟)，主机少设置短些(60秒)

#安全相关优化
*AllowRoot=0 #是否允许root来允许zabbix服务，0不允许，1允许，默认为0
*User=zabbix #启动zabbix进程的账户
```

