---
title: "LAMP"
---

# LAMP

L:LINUX

A:APACHE

M:MYSQL

P:PHP





# CGI和fastCGI

**CGI又称通用网关接口，每种语言的CGI解释器是不同的**

apache本身只能处理静态资源，当需要处理动态资源时则需要CGI这种解释器来实现和php等语言的交互，然后在将最后得到的结果交给apache，apache在把得到的结果加首部字段从而发送给浏览器，浏览器在进行解释执行

## CGI：

较老的技术，目前已经淘汰

web服务器会根据这次请求的内容，然后会 fork 一个新进程来运行外部的 C 程序或者bash,perl脚本等，这个进程会把处理完的数据返回给web服务器，最后web服务器把内容发送给用户，刚才fork的进程也随之退出。 如果下次用户还请求改动态脚本，那么web服务器又再次fork一个新进程，周而复始的进行。效率非常底下

## fastCGI：

fastcgi的方式是，web服务器收到一个请求时，不会重新fork一个进程（因为这个进程在web服务器启动时就开启了，而且不会退出），web服务器直接把内容传递给这个进程（进程间通信，但fastcgi使用了别的方式，tcp方式通信），这个进程收到请求后进行处理，把结果返回给web服务器，最后自己接着等待下一个请求的到来，而不是退出

## CGI和fastcgi对比

CGI: 兼职, 一次性的过河拆迁式服务，**需在apache开启子进程**，消耗apache的性能

FASTCGI: 专职,全周期的持续式服务，无需开启子进程，可以是一个**独立的服务器**







# PHP

### 简介

php是一种解释型语言，主要用于web开发实现动态web页面

**php是依附与apache or nginx的一个模块**



### 执行步骤

**PHP的语言引擎Zend执行PHP脚本代码一般会经过如下4个步骤**

1、Scanning 词法分析,将PHP代码转换为语言片段(Tokens)

2、Parsing 语义分析,将Tokens转换成简单而有意义的表达式

3、Compilation 将表达式编译成Opcode

4、Execution 顺次执行Opcode，每次一条，从而实现PHP脚本的功能

即：**扫描-->分析-->编译-->执行**



### php配置

php 的配置文件：/etc/php.ini, /etc/php.d/*.ini 

配置文件在php解释器启动时被读取



对配置文件的修改生效方法

- Modules：重启httpd服务（systemctl restart httpd）

- FastCGI：重启php-fpm服务（systemctl restart php-fpm）



**/etc/php.ini配置文件格式：**

```bash
[foo]：Section Header
directive = value
```

注释符：

- 以#开头，纯粹的注释信息

- 以 ; 开头，用于注释可启用的directive

提示：**较新的版本中，已经完全使用 “ ; ” 进行注释**



### **php.ini** **配置参考文档**

php.ini的核心配置选项文档： http://php.net/manual/zh/ini.core.php

php.ini配置选项列表：http://php.net/manual/zh/ini.list.php



### php常见配置

```bash
expose_php = On   #响应报文显示首部字段x-powered-by: PHP/x.y.z，暴露php版本，建议为off 
max_execution_time= 30 #最长执行时间30s
memory_limit=128M #生产不够，可调大
display_errors=off  #调试使用，不要打开，否则可能暴露重要信息
display_startup_errors=off  #建议关闭
post_max_size=8M   #最大上传数据大小，生产可能调大，比下面项大
upload_max_filesize =2M  #最大上传文件，生产可能要调大
max_file_uploads = 20 #同时上传最多文件数
date.timezone =Asia/Shanghai  #指定时区
short_open_tag=on #开启短标签,如: <? phpinfo();?>
```

### PHP语言格式

php语言有两种使用格式：

#### 格式1

```php
vim test1.php
<?php  
 echo "<h1>Hello world!</h1>"; #在PHP中嵌入HTML代码
?>
```

#### 格式2

```bash
vim test2.php
<h1>
 <?php echo "Hello world!" ?> #在HTML中嵌入PHP代码
</h1>
```

### PHP连接MySQL的方式

使用PDO扩展模块pdo_mysql.so连接数据库，此方式可以支持连接MySQL，Oracle等多种数据库

```bash
rpm -ql php-mysqlnd
/usr/lib64/php/modules/pdo_mysql.so #使用PDO(PHP Data Object)扩展连接数据库
```

### php使用pdo扩展连接数据库的测试代码1

```php
<?php
$dsn='mysql:host=mysqlhost;port=3306;dbname=mysql';
$username='root';
$passwd='magedu';
$dbh=new PDO($dsn,$username,$passwd);
var_dump($dbh);
?>
```

### php使用pdo扩展连接数据库的测试代码2（建议使用）

```php
<?php
try {
$user='root';
$pass='magedu';
$dbh = new PDO('mysql:host=mysqlhost;port=3306;dbname=mysql', $user, $pass);
foreach($dbh->query('SELECT user,host from user') as $row) {
print_r($row);
}
$dbh = null;
} catch (PDOException $e) {
print "Error!: " . $e->getMessage() . "<br/>";
die();
}
?>
```

### 安装php(模块方式)

**模块方式隶属于apache的进程，并且只能运行在prefork模型中**

```bash
yum -y install php 

[root@aliyun ~]# rpm -ql php
/etc/httpd/conf.d/php.conf
/etc/httpd/conf.modules.d/15-php.conf
/usr/lib/.build-id
/usr/lib/.build-id/ba
/usr/lib/.build-id/ba/09a4e8e6a7c720bb083558cb7168132aba29ad
/usr/lib64/httpd/modules/libphp7.so #此模块文件能让http支持php文件
/usr/share/httpd/icons/php.gif
/var/lib/php/opcache
/var/lib/php/session #每次访问都会在此目录下生成一个session信息
/var/lib/php/wsdlcache

[root@aliyun ~]# cat /etc/httpd/conf.modules.d/15-php.conf
#
# PHP is an HTML-embedded scripting language which attempts to make it
# easy for developers to write dynamically generated webpages.
#

# Cannot load both php5 and php7 modules
<IfModule !mod_php5.c>
  <IfModule prefork.c> #加载php模块，但是只能运行在prefork模型中
    LoadModule php7_module modules/libphp7.so
  </IfModule>
</IfModule>

```



### 测试PHP是否搭建成功

```bash
[root@centos7 ~]#cat /var/www/html/test.php 
<?php
phpinfo(); #php的内置函数，其中涵盖了php的各种信息
?>

#systemctl restart httpd #重启服务
#systemctl restart php-fpm #重启服务
#页面能显示出来则代表php搭建成功
```



### FSTCGI

**php-fpm服务来实现，有独立的进程以及线程，centos8默认采用的是这种模式**

模块方式虽然可以让apache支持动态资源，但终归apache仅擅长处理静态资源，所以性能也不是太优，这时可以采用FSTCGI服务来将apache接受到的动态请求直接交给FSTCGI来处理，从而更好地提升浏览器性能

- 通常LAMP架构中，apache和fastcgi服务可以放在一台服务器上，MySQL在单独放在一台服务器，少数情况

  将三种服务各单独存放

#### **各种OS版本对fastcgi的支持**

```bash
#CentOS 8: 默认使用fpm模式
 httpd-2.4：默认rpm包支持fcgi模块
   php包默认使用fpm模式
   php-fpm包：专用于将php运行于fpm模式
#CentOS 7：
 httpd-2.4：默认rpm包支持fcgi模块
 php-fpm包：专用于将php运行于fpm模式
#CentOS 6：
 PHP-5.3.2之前：默认不支持fpm机制；需要自行打补丁并编译安装
 httpd-2.2：默认不支持fcgi协议，需要自行编译此模块
 解决方案：编译安装httpd-2.4, php-5.3.3+
```

#### 安装php-fpm

##### CentOS 8 安装php-fpm

```bash
dnf -y install php-fpm
#或者
dnf -y install php
```

#### php-fpm配置生产案例

```bash
cat  /etc/php-fpm.d/www.conf
[www]
listen = 127.0.0.1:9000  #监听地址及IP
listen.allowed_clients = 127.0.0.1 #允许客户端从哪个源IP地址访问，要允许所有行首加 ;注释即可
user = apache #php-fpm启动的用户和组，会涉及到后期文件的权限问题
group = apache
pm = dynamic #动态模式进程管理
pm.max_children = 500 #静态方式下开启的php-fpm进程数量，在动态方式下他限定php-fpm的最大进程数
pm.start_servers = 100 #动态模式下初始进程数，必须大于等于pm.min_spare_servers和小于等于pm.max_children的值。
pm.min_spare_servers = 100 #最小空闲进程数
pm.max_spare_servers = 200 #最大空闲进程数
pm.max_requests = 500000 #进程累计请求回收值，会重启
pm.status_path = /fpm_status #状态访问URL
ping.path = /ping #ping访问动地址
ping.response = ping-pong #ping返回值
slowlog = /var/log/php-fpm/www-slow.log #慢日志路径
php_admin_value[error_log] = /var/log/php-fpm/www-error.log #错误日志
php_admin_flag[log_errors] = on
php_value[session.save_handler] = files #phpsession保存方式及路径
php_value[session.save_path] = /var/lib/php/session #当时使用file保存session的文件S路径
```

####  **配置**httpd **支持** fastcgi

```bash
#确认apache中是否开启fastcgi的模块
[root@centos8 ~]httpd -M |grep fcgi
proxy_fcgi_module (shared)

#创建httpd的配置文件 /etc/httpd/conf.d/fcgi.conf ，内容如下
DirectoryIndex index.php #默认的查找php文件
ProxyRequests Off #关闭正向代理
ProxyPassMatch ^/(.*\.php)$ fcgi://127.0.0.1(php-fpm服务器IP):9000/var/www/html/$1
#ProxyPassMatch ^/(fpm_status|ping) fcgi://127.0.0.1:9000 #状态页
#以上开启FCGI反向代理,“^/”这处的”/“相对于后面的/var/www/html而言，后面的$1是指前面的/(.*.php)

systemctl restart httpd
```



#  实现LAMP

## LAMP架构

- 静态资源：

​       Client -- http --> httpd

- 动态资源：

​       Client -- http --> httpd --> libphp5.so () -- mysql --> MySQL server

​       Client -- http --> httpd -->fastcgi-- mysql --> MySQL server

## CentOS 8 利用RPM包部署 wordpress

```bash
[root@centos8 ~]#dnf -y install httpd php php-json php-mysqlnd mariadb-server
[root@centos8 ~]#systemctl enable --now httpd mariadb
[root@centos8 ~]#mysql 
MariaDB [(none)]> create database wordpress;
MariaDB [(none)]> grant all on wordpress.* to wordpress@'localhost' identified by 'magedu';
[root@centos8 ~]#wget https://cn.wordpress.org/latest-zh_CN.zip
[root@centos8 ~]#tar xvf wordpress-5.4.2-zh_CN.tar.gz 
[root@centos8 ~]#mv wordpress/* /var/www/html/
[root@centos8 ~]#setfacl -Rm u:apache:rwx /var/www/html #让apache账号能在网站实现修改以及上传下载

#浏览器访问
http://LAMP服务器/wordpress
```





# 常见LAMP应用

### PhpMyAdmin

PhpMyAdmin是一个以PHP为基础，以Web-Base方式架构在网站主机上的MySQL的数据库管理工具，让管理者可用Web接口管理MySQL数据库，官网：https://www.phpmyadmin.net/

### WordPress

WordPress是一种使用PHP语言开发的博客平台，用户可以在支持PHP和MySQL数据库的服务器上架设属于自己的网站。也可把 WordPress当作一个内容管理系统（CMS）来使用，官网：https://cn.wordpress.org/

### Discuz

Crossday Discuz! Board是一套通用的社区论坛软件系统。自2001年6月面世以来，是覆盖率最大的论坛软件系统之一。2010年8月23日与腾讯达成收购协议，官网：https://www.discuz.net/

# 优化

## 压力测试

**ab：** 来自httpd-tools包

```bash
ab [OPTIONS] URL

#常见选项
 -n：总请求数
 -c：模拟的并发数
 -k：以持久连接模式测试
说明：并发数高于1024时，需要用 ulimit –n # 调整能打开的文件数



ab -c10 -n100 URL
Requests per second #结果中此行最重要（显示了响应速度信息）
```



## PHP加速器

php的加速器：基于PHP的特殊扩展机制如**opcode缓存扩展也可以将opcode缓存于php的共享内存中**，从而可以让同一段代码的后续重复执行时跳过编译阶段以提高性能。这些加速器并非真正提高了opcode的运行速度，而仅是通过分析opcode后并将它们重新排列以达到快速执行的目的

**实现opcache加速php 7.X**

opcache为官方提供的php加速程序

```bash
[root@centos8 ~]#dnf install php-opcache
[root@centos8 ~]#cat /etc/php.ini
[opcache]
zend_extension=opcache.so                            
opcache.enable=1
[root@centos8 ~]#systemctl restart php-fpm
```

**查看opcache是否生效**

编写一个php测试页面，在页面中搜索有opcache则已经开启



## php-fpm优化关闭危险参数
```bash
#1、打开php的安全模式
 php的安全模式是个非常重要的php内嵌的安全机制，能够控制一些php中的函数执行，比如system()，同时把被很多文件操作的函数进行了权限控制。
默认关闭，338行
safe_mode = Off
改为
safe_mode = On

#2、用户组安全
; By default, Safe Mode does a UID compare check when
; opening files. If you want to relax this to a GID compare,
; then turn on safe_mode_gid.
; http://php.net/safe-mode-gid
safe_mode_gid = Off  # php5.3.27默认关闭

#3、关闭危险函数
当打开安全模式，函数禁止可以不做，但为了双重保险还是做。比如不执行system()能执行系统命令的函数，或能查看php信息的phpinfo()等函数。方法如下
disable_functions = system,passthru,exec,shell_exec,popen,phpinfo

#4、关闭php版本号
php版本号会在http的head里显示
expose_php = On
改为
expose_php = Off

#5、关闭注册全局变量
register_globals = Off  # 默认关闭，不要打开

#6、打开magic_quotes_gpc防止SQL注入
magic_quotes_gpc = Off
改为
magic_quotes_gpc = On

#7、错误信息控制
 一般php在没有连接到数据库或者其他情况下会有错误提示，一般错误信息中会包含php脚本当前的路径信息或者查询的SQL语句等信息，这类信息在生产环境是不允许的，应禁止。想要错误信息，应该导入日志。
display_errors = Off (默认值，不是改为off)

显示错误级别
error_reporting = E_WARNING & E_ERROR

#8、错误日志
log_errors = On
log_errors_max_len = 1024   # Set maximum length of log_errors.
error_log = /app/logs/php_errors.log  # 注意写权限

#9、资源参数限制优化
# 设置每个脚本运行的最长时间，当无法上传较大的文件或者后台备份数据经常超时，需调整下面参数，单位秒。
max_execution_time = 30
# 每个脚本使用的最大内存
memory_limit = 128M
# 每个脚本等待输入数据最长时间
max_input_time = 60 
# 上传文件的最大许可
upload_max_filesize = 2M

#10、安全参数优化
# 禁止打开远程地址
allow_url_fopen = On
改为
allow_url_fopen = Off
# 防止Nginx文件类型错误解析漏洞
cgi.fix_pathinfo=0
```

