---
title: "LNMP"
---

# LNMP 概述

- **L**：Linux
- **N**：Nginx
- **M**：MySQL
- **P**：<PHP、python、Perl>



# FastCGI

## CGI 概述

- common gateway interface 通用网关接口

- FastCGI解决了语言解释器和 Web Server 之间通讯的问题，主要是帮助 Web Server 处理动态请求 处理完毕后再将数据返回给 Web Server
- CGI 和 FastCGI的区别：
  - CGI：Web Server 每收到一个请求都会创建一个 CGI 进程，处理请求结束时会关闭进程
  - FastCGI：处理完请求后不会关闭CGI进程，而是保留这个进程，使这个进程可以处理多个请求

## php-fpm 概述

- FastCGI Process Manager：FastCGI 进程管理器
- **是一个实现了 FastCGI 的程序，并且提供进程管理功能**
- 进程包括 master 进程 和 worker 进程
  - master 进程：只有一个，负责监听端口，接受来自 Web Server 的请求
  - worker 进程：一般会有多个，每个进程中会嵌入一个 PHP 解释器 来进行php代码的处理

## FastCGI 核心指令

- 由 ngx_http_fastcgi_module 模块提供此功能
- 实现通过 fastcgi协议 将 客户端的动态请求 转发至 php-fmp 处理
- 官方文档：https://nginx.org/en/docs/http/ngx_http_fastcgi_module.html

### fastcgi_pass

- **定义转发的后端 fastcgi server 地址**
- Syntax：fastcgi_pass address;
- Default：—
- Context：location, if in location

### fastcgi_index

- **定义 fastcgi server 默认主页位置，如：fastcgi_index、index.php**
- Syntax：fastcgi_index name;
- Default：—
- Context：http, server, location

### fastcgi_param

- **定义传递给fastcgi服务器的参数值，可以是文本，变量或组合**

- **可用于将nginx的内置变量赋值给自定义key**

- Syntax：fastcgi_param parameter value [if_not_empty];

- Default：—

- Context：http, server, location

- **范例：**

- ```nginx
  fastcgi_param SCRIPT_FILENAME /data/php$fastcgi_script_name; 
  #默认脚本路径，就是php的文件路径（php文件是存放在php端的）
  #也可以使用下面的写法：
  fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
  
  
  fastcgi_param REMOTE_ADDR $remote_addr; #客户端源IP
  fastcgi_param REMOTE_PORT $remote_port; #客户端源端口
  fastcgi_param SERVER_ADDR $server_addr; #请求的服务器IP地址
  fastcgi_param SERVER_PORT $server_port; #请求的服务器端口
  fastcgi_param SERVER_NAME $server_name; #请求的server name
  fastcgi_param QUERY_STRING $query_string; #查询的字符串
  fastcgi_param REQUEST_METHOD $request_method; #请求方法
  fastcgi_param CONTENT_TYPE $content_type; #内容类型
  fastcgi_param CONTENT_LENGTH $content_length; #内容长度
  ```

## Fastcgi 缓存定义指令

- **生产中慎用，因为一般缓存的都是静态资源，而动态资源很少缓存**

### fastcgi_cache_path

- Syntax：fastcgi_cache_path path [levels=levels] [use_temp_path=on|off] keys_zone=name:size [inactive=time] [max_size=size] [min_free=size] [manager_files=number] [manager_sleep=time] [manager_threshold=time] [loader_files=number] [loader_sleep=time] [loader_threshold=time] [purger=on|off] [purger_files=number] [purger_sleep=time] [purger_threshold=time];
  - **path**：缓存存放位置
  - **max_size=size**：缓存最大存放空间
  - **levels=levels**：缓存目录的层级数量，以及每一级的目录数量，levels=levels=ONE:TWO:THREE，范例：leves=1:2:2
  - **keys_zone=name:size**：定义缓存名称 即 k/v映射的内存空间的名称及大小大小
  - **inactive=time**：缓存的有效时间，默认十分钟，需要在指定时间满足fastcgi_cache_min_uses 次数被视为活动缓存
- Default：—
- Context：http

## Fastcgi 缓存调用指令

### fastcgi_cache

- **调用指定的缓存空间来缓存数据**
- Syntax：fastcgi_cache zone | off;
- Default：fastcgi_cache off;
- Context：http, server, location

### fastcgi_cache_key

- **定义用作缓存项的key的字符串**
- Syntax：fastcgi_cache_key string;
- Default：—
- Context：http, server, location
- 范例：
  - fastcgi_cache_key $request_uri;

### fastcgi_cache_methods

- **为哪些请求方法使用缓存**
- Syntax：fastcgi_cache_methods GET | HEAD | POST ...;
- Default：fastcgi_cache_methods GET HEAD;
- Context：http, server, location

### fastcgi_cache_min_uses

- **缓存空间中的缓存项在inactive定义的非活动时间内至少要被访问到此处所指定的次数方可被认作活动项**
- Syntax：fastcgi_cache_min_uses number;
- Default：fastcgi_cache_min_uses 1;
- Context：http, server, location

### fastcgi_keep_conn

- **收到后端服务器响应后，fastcgi服务器是否关闭连接**
- **生产中建议改为 on，即开启长连接**
- Syntax：fastcgi_keep_conn on | off;
- Default：fastcgi_keep_conn off;
- Context：http, server, location

### fastcgi_cache_valid

- **不同响应码的各自缓存时长**
- Syntax：fastcgi_cache_valid [code ...] time;
- Default：—
- Context：http, server, location

### fastcgi_hide_header

- **隐藏响应头指定信息**
- Syntax：fastcgi_hide_header field;
- Default：—
- Context：http, server, location

### fastcgi_pass_header

- **返回响应头指定信息**
- **默认情况下，nginx 不会从 FastCGI 服务器的响应中将头字段“Status”和“X-Accel-...”传递给客户端**
- Syntax：fastcgi_pass_header field;
- Default：—
- Context：http, server, location





## Nginx 默认 Fastcgi 配置范例

```nginx
        location ~ \.php$ {
            proxy_pass   http://127.0.0.1;
        }

        # pass the PHP scripts to FastCGI server listening on 127.0.0.1:9000
        
        location ~ \.php$ {
            root           html;
            fastcgi_pass   127.0.0.1:9000;
            fastcgi_index  index.php;
            fastcgi_param  SCRIPT_FILENAME  /scripts$fastcgi_script_name;
            include        fastcgi_params;
        }
```



# 单主机实现

**编译安装自带fastcgi配置**

```bash
[root@aliyun conf]# ls /apps/nginx/conf
fastcgi.conf
```

## nginx配置

```bash
[root@aliyun conf]# vim /apps/nginx/conf.d/pc.conf 
  server {
    listen 443 ssl;
    server_name www.xiangzheng.vip;
    ssl_certificate /apps/nginx/certs/5464846_www.xiangzheng.vip.pem;
    ssl_certificate_key /apps/nginx/certs/5464846_www.xiangzheng.vip.key;
    ssl_session_cache shared:sslcache:20m;
    ssl_session_timeout 10m;

    location / {
    root /data/nginx/wordpress;
    index index.php;
    }

    location ~ \.php$|status|ping {
    root           html;
    fastcgi_pass   127.0.0.1:9000;
    fastcgi_index  index.php;
    fastcgi_param  SCRIPT_FILENAME  /data/nginx/wordpress$fastcgi_script_name;
    include        fastcgi_params;
    }
}



#创建测试文件
[root@aliyun conf]# mkdir /data/nginx/php
[root@aliyun conf]# vim /data/nginx/php/test.php
<?php
phpinfo();
?>
```

## php配置

使用base源自带的php版本

```bash
#yum安装php和相关依赖包
[root@aliyun conf]# yum -y install php-fpm php-mysqlnd php-json

#修改php-fpm配置
[root@aliyun conf]# vim /etc/php-fpm.d/www.conf 
user = nginx
group = nginx
listen = 127.0.0.1:9000
pm.status_path = /status
ping.path = /ping

#启动服务
[root@aliyun conf]# systemctl enable --now php-fpm.service #开启后查看9000端口是否开启
```

## MySQL配置

```bash
[root@aliyun conf]# yum -y install mariadb-server
[root@aliyun conf]# systemctl enable --now mariadb
MariaDB [(none)]> create database wordpress;
MariaDB [(none)]> grant all on wordpress.* to wordpress@'127.0.0.1' identified by '123456';


```

## wordpress配置

```bash
[root@aliyun ~]# tar xf wordpress-5.7.1-zh_CN.tar.gz
[root@aliyun ~]# mv wordpress /data/nginx/

#进入页面按提示配置即可
```



# 多主机实现













# 实战项目：利用LNMP实现WordPress站点搭建

## 环境说明 

| IP           | server                                                       | 系统           |
| ------------ | ------------------------------------------------------------ | -------------- |
| 10.0.0.8/24  | nginx-1.18.0、php-fpm-8.0.12、wordpress-5.8.2                | centos8.3.2011 |
| 10.0.0.18/24 | MySQL-8.0.27                                                                                                        redis | centos8.3.2011 |



## 部署MySQL

### 二进制安装MySQL

- 在10.0.0.18主机二进制安装部署MySQL

```bash
#安装依赖包
[root@18 ~]# yum -y install libaio numactl-libs ncurses*

#创建相关账户和组，uid和gid可以自定义，但是必须为系统账号
[root@18 ~]# useradd -r -u 306 -d /data/mysql mysql

#准备程序文件
[root@18 ~]# cd /usr/local/src/
[root@18 src]# ll mysql-8.0.27-linux-glibc2.12-x86_64.tar.xz 
-rw-r--r-- 1 root root 1196633756 Nov 12 23:00 mysql-8.0.27-linux-glibc2.12-x86_64.tar.xz
[root@18 src]# tar xf mysql-8.0.27-linux-glibc2.12-x86_64.tar.xz -C /usr/local/

#给解压的MySQL目录创建软连接
[root@18 src]# cd /usr/local/
[root@18 local]# ln -s mysql-8.0.27-linux-glibc2.12-x86_64/ mysql
[root@18 local]# ll
total 0
...
lrwxrwxrwx  1 root root  36 Nov 12 23:24 mysql -> mysql-8.0.27-linux-glibc2.12-x86_64/
drwxr-xr-x  9 root root 129 Nov 12 23:24 mysql-8.0.27-linux-glibc2.12-x86_64
...

#将mysql安装目录下的的可执行程序加入到PATH变量
[root@18 local]# echo 'PATH=/usr/local/mysql/bin:$PATH' > /etc/profile.d/mysql.sh
[root@18 local]# . /etc/profile.d/mysql.sh

#准备配置文件
[root@18 local]# vim /etc/my.cnf
[mysqld]
datadir=/data/mysql
skip_name_resolve=1
socket=/data/mysql/mysql.sock
log-error=/data/mysql/mysql.log
pid-file=/data/mysql/mysql.pid
[client]
socket=/data/mysql/mysql.sock

#生成数据库文件并提取root密码
[root@18 local]# mysqld --initialize --user=mysql --datadir=/data/mysql

#获取密码，本次的密码为：CsbGIY&ry6Wl
[root@18 src]# grep password /data/mysql/mysql.log
2021-11-12T15:35:37.939065Z 6 [Note] [MY-010454] [Server] A temporary password is generated for root@localhost: CsbGIY&ry6Wl

#获取密码方法二
[root@18 src]# awk '/temporary password/{print $NF}' /data/mysql/mysql.log
CsbGIY&ry6Wl

#准备开启启动脚本，service文件
[root@18 local]# vim  /usr/lib/systemd/system/mysql.service
[Unit]
Description=MySQL Server
Documentation=man:mysqld(8)
Documentation=http://dev.mysql.com/doc/refman/en/using-systemd.html
After=network.target
After=syslog.target

[Install]
WantedBy=multi-user.target

[Service]
User=mysql
Group=mysql

# Have mysqld write its state to the systemd notify socket
Type=notify

# Disable service start and stop timeout logic of systemd for mysqld service.
TimeoutSec=0

# Start main service
ExecStart=/usr/local/mysql/bin/mysqld --defaults-file=/etc/my.cnf $MYSQLD_OPTS 

# Use this to switch malloc implementation
EnvironmentFile=-/etc/sysconfig/mysql

# Sets open_files_limit
LimitNOFILE = 10000

Restart=on-failure

RestartPreventExitStatus=1

# Set environment variable MYSQLD_PARENT_PID. This is required for restart.
Environment=MYSQLD_PARENT_PID=1

PrivateTmp=false

#修改初始口令，注意修改密码前后要加单引号，否则会报错
[root@18 ~]# mysqladmin -uroot -p'CsbGIY&ry6Wl' password 123

#测试登录
[root@18 ~]# mysql -uroot -p123
```

### 创建wordpress数据库并授权

```bash
[root@18 ~]# mysql -uroot -p123
...
mysql> create database wordpress; #创建wordpress库
Query OK, 1 row affected (0.01 sec)

mysql> create user wordpress@'10.0.0.%' identified by '123456'; #创建wordpress账号并设置密码
Query OK, 0 rows affected (0.03 sec)

mysql> grant all on wordpress.* to wordpress@'10.0.0.%'; #授权wordpress账号到wordpress库
Query OK, 0 rows affected (0.00 sec)
```

### 在其他主机测试连接

```bash
[root@8 ~]# yum -y install mysql
[root@8 ~]# mysql -h10.0.0.18 -uwordpress -p123456
...
mysql> #测试连接成功
mysql> show databases;
+--------------------+
| Database           |
+--------------------+
| information_schema |
| wordpress          | #权限无问题
+--------------------+
2 rows in set (0.00 sec)
```



## 部署PHP

### 编译安装php

- 官方网站：https://www.php.net/downloads
- **注意：**编译安装内存一定要大（2G以上）

```bash
#安装依赖包
[root@8 ~]# yum -y install make gcc openssl-devel libxml2-devel bzip2-devel sqlite-devel

#依赖包：oniguruma-devel安装
#centos7
yum -y install oniguruma-devel
#centos8
wget https://github.com/kkos/oniguruma/releases/download/v6.9.7.1/onig-6.9.7.1.tar.gz
tar xf onig-6.9.7.1.tar.gz
cd onig-6.9.7
#编译安装
./configure --prefix=/usr
make && make install

#解压
[root@8 src]# pwd
/usr/local/src
[root@8 src]# ll
total 15804
-rw-r--r-- 1 root root 16182704 Nov 13 01:41 php-8.0.12.tar.gz
[root@8 src]# tar xf php-8.0.12.tar.gz 
[root@8 src]# cd php-8.0.12/

#开始编译安装
[root@8 php-8.0.12]# ./configure --prefix=/apps/php8 \
--enable-mysqlnd \
--with-mysqli=mysqlnd \
--with-pdo-mysql=mysqlnd \
--with-openssl \
--with-zlib \
--with-config-file-path=/etc \
--with-config-file-scan-dir=/etc/php.d \
--enable-mbstring \
--enable-sockets \
--enable-fpm \
--enable-zts \
--disable-fileinfo

[root@8 php-8.0.12]# make -j 8 && make install
```

### 准备php配置文件

```bash
#将配置文件模板拷出并改名
[root@8 ~]# cp /usr/local/src/php-8.0.12/php.ini-production /etc/php.ini

#其他配置文件拷贝
[root@8 ~]# cp /apps/php8/etc/php-fpm.conf.default /apps/php8/etc/php-fpm.conf
[root@8 ~]# cp /apps/php8/etc/php-fpm.d/www.conf.default /apps/php8/etc/php-fpm.d/www.conf

#修改配置文件
[root@8 ~]# vim /apps/php8/etc/php-fpm.d/www.conf

#修改配置文件后的最终内容
[root@8 ~]# grep "^[a-Z]" /apps/php8/etc/php-fpm.d/www.conf
user = www
group = www
listen = 127.0.0.1:9000
pm = dynamic
pm.max_children = 5
pm.start_servers = 2
pm.min_spare_servers = 1
pm.max_spare_servers = 3
access.log = log/$pool.access.log
slowlog = log/$pool.log.slow

#创建用户
[root@8 ~]# useradd -r -s /sbin/nologin www

#创建访问日志文件路径
[root@8 ~]# mkdir /apps/php8/log
```

### 启动并验证 php-fpm服务

```bash
#验证配置文件语法
[root@8 ~]# /apps/php8/sbin/php-fpm -t
[13-Nov-2021 11:27:24] NOTICE: configuration file /apps/php8/etc/php-fpm.conf test is successful

#拷贝service文件模板
[root@8 ~]# cp /usr/local/src/php-8.0.12/sapi/fpm/php-fpm.service /usr/lib/systemd/system/

#启动服务并设为开机自启动
[root@8 ~]# systemctl daemon-reload
[root@8 ~]# systemctl enable --now php-fpm.service 

#查看端口是否开启
[root@8 ~]# ss -ntl
State        Recv-Q       Send-Q               Local Address:Port               Peer Address:Port       
LISTEN       0            128                      127.0.0.1:9000                    0.0.0.0:*          
LISTEN       0            128                        0.0.0.0:22                      0.0.0.0:*          
LISTEN       0            128                           [::]:22                         [::]:*          

#查看进程是否开启
[root@8 ~]# ps aux|grep php
root      123019  0.2  0.4  72248 16088 ?        Ss   11:29   0:00 php-fpm: master process (/apps/php8/etc/php-fpm.conf)
www       123020  0.0  0.2 104460  8436 ?        S    11:29   0:00 php-fpm: pool www
www       123021  0.0  0.2 104460  8436 ?        S    11:29   0:00 php-fpm: pool www
```

### php测试页面代码

```php
<?php 
  phpinfo(); 
?>
```





## 部署Nginx

### 二进制安装Nginx

省略...



### 配置Nginx支持FastCGI

```bash
[root@8 ~]# cat /apps/nginx/conf/nginx.conf

#user  nobody;
worker_processes  1;

#error_log  logs/error.log;
#error_log  logs/error.log  notice;
#error_log  logs/error.log  info;

pid        /apps/nginx/run/nginx.pid;


events {
    worker_connections  1024;
}


http {
    include       mime.types;
    default_type  application/octet-stream;

    #log_format  main  '$remote_addr - $remote_user [$time_local] "$request" '
    #                  '$status $body_bytes_sent "$http_referer" '
    #                  '"$http_user_agent" "$http_x_forwarded_for"';

    #access_log  logs/access.log  main;

    sendfile        on;
    #tcp_nopush     on;

    #keepalive_timeout  0;
    keepalive_timeout  65;

    #gzip  on;

    server {
        listen       80;
        server_name  www.azheng.com; #指定server名
        server_tokens off; #安全加固，隐藏nginx版本号
        #charset koi8-r;

        #access_log  logs/host.access.log  main;

        location / {
            root   /data/nginx/wordpress;
            index  index.php index.html index.htm;
        }

        #error_page  404              /404.html;

        # redirect server error pages to the static page /50x.html
        #
        error_page   500 502 503 504  /50x.html;
        location = /50x.html {
            root   html;
        }

        # proxy the PHP scripts to Apache listening on 127.0.0.1:80
        #
        #location ~ \.php$ {
        #    proxy_pass   http://127.0.0.1;
        #}

        # pass the PHP scripts to FastCGI server listening on 127.0.0.1:9000
        #
        location ~ \.php$ {
            root           /data/nginx/wordpress;
            fastcgi_pass   127.0.0.1:9000;
            fastcgi_index  index.php;
            fastcgi_param  SCRIPT_FILENAME  $document_root$fastcgi_script_name;
            include        fastcgi_params;
            fastcgi_hide_header X-Powered-By; #隐藏PHP版本
        }

        # deny access to .htaccess files, if Apache's document root
        # concurs with nginx's one
        #
        #location ~ /\.ht {
        #    deny  all;
        #}
    }


    # another virtual host using mix of IP-, name-, and port-based configuration
    #
    #server {
    #    listen       8000;
    #    listen       somename:8080;
    #    server_name  somename  alias  another.alias;

    #    location / {
    #        root   html;
    #        index  index.html index.htm;
    #    }
    #}


    # HTTPS server
    #
    #server {
    #    listen       443 ssl;
    #    server_name  localhost;

    #    ssl_certificate      cert.pem;
    #    ssl_certificate_key  cert.key;

    #    ssl_session_cache    shared:SSL:1m;
    #    ssl_session_timeout  5m;

    #    ssl_ciphers  HIGH:!aNULL:!MD5;
    #    ssl_prefer_server_ciphers  on;

    #    location / {
    #        root   html;
    #        index  index.html index.htm;
    #    }
    #}

}


[root@8 ~]# systemctl reload nginx.service
```

### 准备测试页面

```bash
[root@8 ~]# cat /data/nginx/wordpress/test.php
<?php
phpinfo();
?>
[root@8 ~]# mkdir -p /data/nginx/wordpress
```

### 浏览器访问测试

```bash
http://www.azheng.com/test.php
```



## 部署wordpress

```bash
[root@8 src]# pwd
/usr/local/src
[root@8 src]# ll wordpress-5.8.2-zh_CN.tar.gz 
-rw-r--r-- 1 root root 15800400 Nov 13 11:43 wordpress-5.8.2-zh_CN.tar.gz
[root@8 src]# tar xf wordpress-5.8.2-zh_CN.tar.gz -C /data/nginx
[root@8 src]# chown -R nginx.nginx /data/nginx
```

### 在浏览器中配置wordpress

省略...



### 准备wp-config.php

- 浏览器配置时可能出现此错误，手动配置

```php
[root@8 ~]# cat /data/nginx/wordpress/wp-config.php
<?php
/**
 * WordPress基础配置文件。
 *
 * 这个文件被安装程序用于自动生成wp-config.php配置文件，
 * 您可以不使用网站，您需要手动复制这个文件，
 * 并重命名为“wp-config.php”，然后填入相关信息。
 *
 * 本文件包含以下配置选项：
 *
 * * MySQL设置
 * * 密钥
 * * 数据库表名前缀
 * * ABSPATH
 *
 * @link https://codex.wordpress.org/zh-cn:%E7%BC%96%E8%BE%91_wp-config.php
 *
 * @package WordPress
 */

// ** MySQL 设置 - 具体信息来自您正在使用的主机 ** //
/** WordPress数据库的名称 */
define( 'DB_NAME', 'wordpress' );

/** MySQL数据库用户名 */
define( 'DB_USER', 'wordpress' );

/** MySQL数据库密码 */
define( 'DB_PASSWORD', '123456' );

/** MySQL主机 */
define( 'DB_HOST', '10.0.0.18' );

/** 创建数据表时默认的文字编码 */
define( 'DB_CHARSET', 'utf8mb4' );

/** 数据库整理类型。如不确定请勿更改 */
define( 'DB_COLLATE', '' );

/**#@+
 * 身份认证密钥与盐。
 *
 * 修改为任意独一无二的字串！
 * 或者直接访问{@link https://api.wordpress.org/secret-key/1.1/salt/ WordPress.org密钥生成服务}
 * 任何修改都会导致所有cookies失效，所有用户将必须重新登录。
 *
 * @since 2.6.0
 */
define( 'AUTH_KEY',         '&:4<f.vF_ ok@&b[Wg=|.*,n,=a2bop!&Fnn_6@G{&<{)7LjJB79pO=|8ZMV3G~z' );
define( 'SECURE_AUTH_KEY',  'z#>153PnXdj2@ael@>iXZgDq7K~@>)yD5X|WX,@@ePuO#XMMl>yMK71J9GxTu{_m' );
define( 'LOGGED_IN_KEY',    '-q[`%.BTyPa)5#m:t!V0Z0+:##~A;Jyql])>|(yOd(5r-Q5rgcueu<@ 2 >z;4+u' );
define( 'NONCE_KEY',        'x^Zl:,;(I90_VgHthtx1n$$fjYw3GIrx3tO+}78Y@i6P%yc!q$w!3k16&ZhJ$QUu' );
define( 'AUTH_SALT',        'LW,^7!smPmeNj C^:iooB>vQEyVw ,96j{e2r2S@K4(n&|YDk1k_V|g(r3|nut]b' );
define( 'SECURE_AUTH_SALT', 'W3!^#h<L2r4aFXPqmT9H4&%YQmh>;x`Er8+:tOPg_}L+:,}cv 3&~~wx#[[Qy0MW' );
define( 'LOGGED_IN_SALT',   'rRTJc9swdwiawL%xX-RR`;ZTqZG7DSFsUB^xs=(?dY+4,T*;|K9$RwZz:OO$NBTR' );
define( 'NONCE_SALT',       '+~>I5hh.Eqc)gmo1IcEYUUx]:K1M(~)#*<5#2C{_Yc*t<v&^z6#L?9t)q<k(>b*a' );

/**#@-*/

/**
 * WordPress数据表前缀。
 *
 * 如果您有在同一数据库内安装多个WordPress的需求，请为每个WordPress设置
 * 不同的数据表前缀。前缀名只能为数字、字母加下划线。
 */
$table_prefix = 'wp_';

/**
 * 开发者专用：WordPress调试模式。
 *
 * 将这个值改为true，WordPress将显示所有用于开发的提示。
 * 强烈建议插件开发者在开发环境中启用WP_DEBUG。
 *
 * 要获取其他能用于调试的信息，请访问Codex。
 *
 * @link https://codex.wordpress.org/Debugging_in_WordPress
 */
define('WP_DEBUG', false);

/* 好了！请不要再继续编辑。请保存本文件。使用愉快！ */

/** WordPress目录的绝对路径。 */
if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', dirname( __FILE__ ) . '/' );
}

/** 设置WordPress变量和包含文件。 */
require_once( ABSPATH . 'wp-settings.php' );
```



# LNMP优化

## 安全加固

### 隐藏nginx版本

```bash
[root@aliyun ~]# vim /apps/nginx/conf/nginx.conf
  server {
        server_tokens off; #添加此行（80和443都要加）
}

[root@aliyun ~]# systemctl restart nginx.service
```

### 隐藏php版本

- 两种方法都可以实现：


#### 1.在nginx配置文件中隐藏

```bash
[root@aliyun ~]# vim /apps/nginx/conf.d/pc.conf 
    location ~ \.php$ {
    root           html;
    fastcgi_pass   127.0.0.1:9000;
    fastcgi_index  index.php;
    fastcgi_param  SCRIPT_FILENAME  /data/nginx/wordpress$fastcgi_script_name;
    include        fastcgi_params;
    fastcgi_hide_header X-Powered-By; #添加此行
    }
```

#### 2.在php配置文件中隐藏

```

```



## php加速

### 开启php opcache

```bash
#查找有无此模块，没有需安装
[root@aliyun ~]# find / -name opcache.so
[root@aliyun ~]# yum -y install php-opcache.x86_64
[root@aliyun ~]# find / -name opcache.so
/usr/lib64/php/modules/opcache.so #路径可以省略，（直接写opcache.so）

#修改php.ini文件
[root@aliyun ~]# vim /etc/php.ini
[opcache]
zend_extension=/usr/lib64/php/modules/opcache.so
opcache.enable=1
[root@aliyun ~]# systemctl restart php-fpm.service
```



## 上传文件大小限制

### nginx

- 设置客户端请求正文的最大允许大小。如果请求中的大小超过配置的值，则会向客户端返回 413（请求实体太大）错误。设置size为 0 将禁用对客户端请求正文大小的检查。
- Syntax：client_max_body_size size;
- Default：client_max_body_size 1m;
- Context：http, server, location

### php

```sh

```



## 优化总结







# 前台启动php

```bash
php-fpm7.4 -F
```

