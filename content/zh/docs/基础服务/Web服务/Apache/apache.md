---
title: "Apache"
---

# apache

### apache特性

- 高度模块化：core + modules
- DSO：Dynamic Shared Object 动态加载/卸载
- MPM：multi-processing module 多路处理模块

### MPM 工作模式

#### **prefork**

多进程I/O模型，每个进程响应一个请求，CentOS 7 默认模型

一个主进程：生成和回收n个子进程，创建套接字，不响应请求。

多个子进程：工作(work)进程，每个子进程处理一个请求；系统初始时，预先生成多个空闲进程，等待请求。

**优点：**稳定

**缺点：**慢，占用资源，不适用于高并发场景

**配置：**

```bash
vim /app/httpd24/conf.d/test.conf

StartServers      100 #开机自动开启100个进程
MinSpareServers   50 #最小的空闲进程50
MaxSpareServers   80 #最大的空闲进程80
ServerLimit          2560 #最多进程数,最大值 20000
MaxRequestWorkers    2560 #最大的并发连接数，默认256
MaxConnectionsPerChild  4000 #子进程最多能处理的请求数量。在处理MaxRequestsPerChild 个请求之后,子进程将会被父进程终止，这时候子进程占用的内存就会释放(为0时永远不释放）
#MaxRequestsPerChild 4000  #从 httpd.2.3.9开始被MaxConnectionsPerChild代替
```



#### **worker**

复用的多进程I/O模型,多进程多线程，IIS使用此模型

一个主进程：生成m个子进程，每个子进程负责生个n个线程，每个线程响应一个请求，并发响应请求：m*n

**优点：**相比prefork 占用的内存较少，可以同时处理更多的请求

**缺点：**使用keep-alive的长连接方式，某个线程会一直被占据，即使没有传输数据，也需要一直等待到超时才会被释放。如果过多的线程，被这样占据，也会导致在高并发场景下的无服务线程可用。（该问题在prefork模式下，同样会发生）

**配置：**

```bash
vim /app/httpd24/conf.d/test.conf

ServerLimit         16  #最多worker进程数 #Upper limit on configurable number of processes
StartServers        10  #开机自动开启10个进程 #Number of child server processes created at startup
MaxRequestWorkers  150  #最能处理多少个连接 #Maximum number of connections that will be processed simultaneously
MinSpareThreads     25 #最小空闲线程
MaxSpareThreads     75 #最大空闲线程
ThreadsPerChild     25  #每个进程中线程的数量 #Number of threads created by each child process
```



#### event

事件驱动模型（worker模型的变种），CentOS8 默认模型

一个主进程：生成m个子进程，每个子进程负责生个n个线程，每个线程响应一个请求，并发响应请求：m*n，有专门的监控线程来管理这些keep-alive类型的线程，当有真实请求时，将请求传递给服务线程，执行完毕后，又允许释放。这样增强了高并发场景下的请求处理能力

**优点：**单线程响应多请求，占据更少的内存，高并发下表现更优秀，会有一个专门的线程来管理keep-alive类型的线程，当有真实请求过来的时候，将请求传递给服务线程，执行完毕后，又允许它释放

缺点：没有线程安全控制

**配置：**

```bash
vim /app/httpd24/conf.d/test.conf

ServerLimit         16  #最多worker进程数 #Upper limit on configurable number of processes
StartServers        10  #开机自动开启10个进程 #Number of child server processes created at startup
MaxRequestWorkers  150  #最能处理多少个连接 #Maximum number of connections that will be processed simultaneously
MinSpareThreads     25 #最小空闲线程
MaxSpareThreads     75 #最大空闲线程
ThreadsPerChild     25  #每个进程中线程的数量 #Number of threads created by each child process
```







#### 切换MPM工作模式

```bash
vim /app/httpd24/conf/httpd.conf #源码编译
vim /etc/httpd/conf.modules.d/00-mpm.conf #yum安装


#三种工作模式只能选择一种，取消注释即可，然后需要restart重启服务
#LoadModule mpm_event_module modules/mod_mpm_event.so
LoadModule mpm_prefork_module modules/mod_mpm_prefork.so
#LoadModule mpm_worker_module modules/mod_mpm_worker.so
```



### apache功能

- 虚拟主机：IP、Port、FQDN
- CGI：Common Gateway Interface，通用网关接口
- 反向代理
- 负载均衡
- 路径别名
- 丰富的用户认证机制：basic，digest
- 支持第三方模块

###  **httpd-2.4** **相关文件**and命令

yum

```bash
#配置文件
/etc/httpd/conf/httpd.conf #主配置文件
/etc/httpd/conf.d/*.conf #子配置文件
/etc/httpd/conf.d/conf.modules.d/ #模块加载的配置文件
httpd –t #检查配置语法

#服务单元文件
/usr/lib/systemd/system/httpd.service #服务单元文件
/etc/sysconfig/httpd #服务单元配置文件

#服务控制和启动
systemctl enable|disable httpd.service
systemctl {start|stop|restart|status|reload} httpd.service
apachectl start|stop|restart|configtest
#systemctl和apachectl都能实现开启或关闭服务的操作，但建议使用一种，不要混用，否则可能出现问题

#站点网页文档根目录
/var/www/html

#模块文件路径
/etc/httpd/modules
/usr/lib64/httpd/modules

#主服务器程序文件
/usr/sbin/httpd
 
#主进程文件
/etc/httpd/run/httpd.pid

#日志文件目录
/var/log/httpd
access_log #访问日志
error_log #错误日志

#帮助文档包：httpd-manual
http://10.0.0.8/manual/
```

###  **httpd** **配置文件的组成**

```bash
#主要组成
Global Environment
Main server configuration
virtual host

#配置文件格式
directive value
directive #不区分字符大小写
value #为路径时，是否区分大小写，取决于文件系统

#配置文件语法检查
apachectl configtest
httpd -t
```

### 配置文件说明

```bash
vim /etc/httpd/conf/httpd.conf

ServerName www.example.com:80 #网站描述信息，可以在/etc/httpd/conf.d/test.conf添加*.conf文件单独存放，不添加此行语法检查时则会报错，不添加也不是问题


#自定义主站点的目录
vim /etc/httpd/conf.d/test.conf
</Directory>
DocumentRoot "/data/www" #文档的根，http2.4以后需要授权才能访问
<directory /data/www> #授权
require all granted
</directory>

#默认的主页面，根为DocumentRoot所指定的目录
<IfModule dir_module>
    DirectoryIndex index.html [index2.php index3.html ]
    
#所有配置文件相对路径的根
ServerRoot "/app/httpd24"


```

```bash
/etc/httpd/conf.d/welcome.conf #默认页面配置文件
```



### 持久连接

Persistent Connection：连接建立，每个资源获取完成后不会断开连接，而是继续等待其它的请求完成，**默认开启持久连接(5s)**

断开条件：（以下二选一）

```
时间限制：以秒为单位， 默认5s，httpd-2.4 支持毫秒级
请求数量: 请求数达到指定值,也会断开
```

副作用：对并发访问量大的服务器，持久连接会使有些请求得不到响应

折中：使用较短的持久连接时间

#### 持久连接相关配置：

```bash
KeepAlive On|Off #开启或关闭持久连接
KeepAliveTimeout  15      #连接持续15s,可以以ms为单位,默认值为5s
MaxKeepAliveRequests 500  #持久连接最大接收的请求数,默认值100
```

#### 测试方法：

```
telnet WEB_SERVER_IP PORT
GET /URL HTTP/1.1
Host: WEB_SERVER_IP
```



### 模块

```bash
httpd -M #查看已加载到内存的模块
http_module (static) #静态核心模块，开机即加载
mpm_prefork_module (shared) #动态模块，需要加载时在加载


/usr/lib64/httpd/modules/ #模块存放路径（yum默认）
/etc/httpd/conf.modules.d/ #模块配置文件，设置模块是否加载，修改后需reload（yum默认）
```

### 隐藏版本号等信息

```bash
curl -I http://10.0.0.7/ #显示版本号等信息

#隐藏版本号
vim /etc/httpd/conf.d/test.conf
ServerTokens Prod

systemctl reload httpd
```

## 访问控制

### 对特定主机实现访问控制

```bash
#默认所有主机都可以访问
ss -ntl
State        Recv-Q       Send-Q        Local Address:Port    PeerAddress:Port  
LISTEN       0            128                  *:80                 *:*     


Listen 10.0.0.*:80 #将此行取消注释，并将下面行注释掉，然后设置允许访问的IP或地址段即可
#Listen 80
```



### 对特定资源等实现访问控制

可以针对文件系统(一个目录能不能访问)，和URI的资源进行访问控制

**文件系统：一个目录能不能访问**

**URI：统一资源标识，分为URN和URL**

- **URN：统一资源命名**

- **URL：统一资源定位服务（使用最多）**

文件系统路径：

```bash
#...
Require all denied #拒绝访问
Require all granted #允许访问

#基于目录
<Directory  "/path">
...
</Directory> 

#基于文件
<File  "/path/file”>  
...
</File> 

#基于文件通配符
<File  "/path/*file*”>  
...
</File> 

#基于扩展正则表达式
<FileMatch  "regex”>
...
</FileMatch>

#范例，图片文件
<FilesMatch ".+\.(gif|jpe?g|png)$">
   # ...
</FilesMatch>

#通配符
<Files ".ht*">
   Require all denied
</Files>
-----------------------------------------------------------------------------------------
#URL路径
<Location  "URL">
...
</Location> 

<LocationMatch "regex">
...
</LocationMatch>

#范例
#/private1, /private1/，/private1/file.txt 匹配
#/private1other 不匹配
<Location "/private1">
    # ...
</Location>

#/private2/，/private2/file.txt 匹配
#/private2，/private2other 不匹配
<Location "/private2/">
    # ...
</Location>
-----------------------------------------------------------------------------------------
#范例
<Location /status>
<LocationMatch "/(extra|special)/data">
```

### 针对目录实现访问控制

**方法一：在主配置文件中设置**

```bash
vim /etc/httpd/conf/httpd.conf
Options Indexes FollowSymLinks #此选项开启则可以列出默认目录下的文件列表，Indexes：允许文件、文件夹可以访问，FollowSymLinks：允许软连接可以使用，#但是知道文件名的情况下可以访问

Options None #全部禁用（大小写敏感）
Options All #全部允许（大小写敏感）
```

**方法二：在需要被控制的目录中存放访问控制配置文件**

与访问控制相关的哪些指令可以**放在指定目录下的.htaccess**（由AccessFileName 指令指定,AccessFileName .htaccess 为默认值）文件中，覆盖之前的配置指令，只对语句有效

```bash
#常见用法
AllowOverride All #.htaccess中所有指令都有效
AllowOverride None #.htaccess 文件无效，此为httpd 2.3.9以后版的默认值
AllowOverride AuthConfig #.htaccess 文件中，除了AuthConfig 其它指令都无法生效
```

```bash
#范例

#修改配置文件
vim /etc/httpd/conf/httpd.conf
#Options Indexes FollowSymLinks
Options Indexes                                                                 
      
#AllowOverride None
AllowOverride options=FollowSymLinks,indexes  #注释上一行，修改为此行，允许在目录中支持这些项

#创建测试相关文件并重启服务
vim /var/www/html/dir1/.htaccess
Options FollowSymLinks indexes #加此行

ln -s /app /var/www/html/dir1/applink

systemctl restart httpd
```

.htaccess文件在网页中无法访问，归功于：

```html
vim /etc/httpd/conf/httpd.conf
<Files ".ht*">
    Require all denied
</Files>
```

###  **基于客户端** **IP** **地址实现访问控制**

针对各种资源，可以基于以下两种方式的访问控制：

- 客户端来源地址

- 用户账号

基于客户端的IP地址的访问控制:

- 无明确授权的目录，默认拒绝

- 允许所有主机访问：Require all granted

- 拒绝所有主机访问：Require all denied

控制特定的IP访问：

- Require ip IPADDR：授权指定来源的IP访问

- Require not ip IPADDR：拒绝特定的IP访问

控制特定的主机访问：

- Require host HOSTNAME：授权特定主机访问

- Require not host HOSTNAME：拒绝

​       HOSTNAME：

​       FQDN：特定主机

​       domin.tld：指定域名下的所有主机

```bash
#不能有失败，至少有一个成功匹配才成功，即失败优先
<RequireAll> 
 Require all granted
 Require not ip 172.16.1.1 #拒绝特定IP
</RequireAll>
```

```bash
#多个语句有一个成功，则成功，即成功优先
<RequireAny>
 Require all denied
 require ip  172.16.1.1  #允许特定IP
</RequireAny>
```

```bash
#只允许10.0.0.0/24这个IP网段访问/var/www/html/dir目录

<directory /var/www/html/dir>
<requireany>
 require all denied
 Require ip 10.0.0.0/24                  
</requireany>
</directory>      
```

### 基于用户的访问控制

启用apache自带的加密管理后台



## log

### **相关配置**

```bash
vim /app/httpd24/conf/httpd.conf

#启动此模块才能记录日志
LoadModule log_config_module modules/mod_log_config.so

#查看是否开启记录日志mod
httpd -M|grep log
log_config_module (shared)

#记录日志的格式

<IfModule log_config_module>
    #
    # The following directives define some format nicknames for use with
    # a CustomLog directive (see below).
    #
    LogFormat "%h %l %u %t \"%r\" %>s %b \"%{Referer}i\" \"%{User-Agent}i\"" combined
    LogFormat "%h %l %u %t \"%r\" %>s %b" common

    <IfModule logio_module>
      # You need to enable mod_logio.c to use %I and %O
      LogFormat "%h %l %u %t \"%r\" %>s %b \"%{Referer}i\" \"%{User-Agent}i\" %I %O" combinedio
    </IfModule>
    
    CustomLog "logs/access_log" common #目前所使用的格式


ServerRoot "/app/httpd24" #配置文件的根
ErrorLog "logs/error_log" #错误日志存放位置，基于ServerRoot的相对路径
CustomLog "logs/access_log" #日常日志存放位置，基于ServerRoot的相对路径
```

### **日志格式定义**

http://httpd.apache.org/docs/2.4/mod/mod_log_config.html#logformat   参考文档

```bash
"%h %l %u %t \"%r\" %>s %b \"%{Referer}i\" \"%{User-Agent}i\" %I %O" 

%h #远程客户端IP地址
%l #远程用户,启用mod_ident才有效，通常为减号"-”
%u #验证（basic，digest）远程用户,非登录访问时，为一个减号"-”
%t ##服务器收到请求时的时间
\"%r\" #First line of request，即表示请求报文的首行；记录了此次请求的"方法”，"URL”以及协议版本
%>s #响应状态码（404，403，200...）
%b #访问资源的大小，不包括首部字段（默认b为单位）
%{Referer}i\ #显示从哪个页面跳转过来的(盗链)
%{User-Agent}i\ #显示用户所使用的浏览器类型
%{VARNAME}i   #The contents of VARNAME: header line(s) in the request sent to the server

#时间信息设置成以下格式更为直观
\"%{%F %T}t\"

#推荐格式
[root@centos8 ~]#vim /etc/httpd/conf/httpd.conf
logFormat "%h \"%{%F %T}t\" %>s %{User-Agent}i" testlog 
CustomLog "logs/access_log" testlog

[root@centos8 ~]#tail -f /var/log/httpd/access_log 
10.0.0.7 "2020-06-24 10:26:51" 200 curl/7.29.0

```



## **设定默认字符集**

```bash
AddDefaultCharset UTF-8  #此为默认值

#中文字符集：GBK, GB2312, GB18030
```



## 路径别名

网页数据除存放根目录以外，还可以存放在路径别名中

### 设置方法

```bash
Alias /URL/  /PATH/ #/URL/表示网页中访问的目录，/PATH/表示服务器中的真实的路径

<directory /PATH/> #还需对此文件夹进行授权
require all granted
</directory>
```



##  禁止trace方法

```
TraceEnable [on|off|extended]
```

**默认on，基于安全风险，建议关闭**

**关闭 trace方法：**

```bash
curl -IX OPTIONS http://127.0.0.1 #测试网站是否开启了TRACE
HTTP/1.1 200 OK
Date: Wed, 24 Jun 2020 06:04:45 GMT
Server: Apache/2.4.37 (centos)
Allow: POST,OPTIONS,HEAD,GET,TRACE #观察此行
Content-Length: 0
Content-Type: httpd/unix-directory

vim /etc/httpd/conf.d/test.conf #在配置文件中写入此行
TraceEnable off

systemctl restart httpd #重启服务

curl -IX OPTIONS http://127.0.0.1 #查看是否生效
HTTP/1.1 200 OK
Date: Tue, 10 Dec 2019 04:09:41 GMT
Server: Apache/2.4.37 (centos)
Allow: GET,POST,OPTIONS,HEAD #已不在显示允许TRACE
Content-Length: 0
Content-Type: text/html; charset=UTF-8
```



##  **status** 状态页

httpd 提供了状态页，可以用来观察httpd的运行情况。此功能**需要加载mod_status.so模块才能实现**

**启动状态页：**

```bash
httpd -M |grep status #确认加载mod_status.so模块
status_module (shared)

vim /etc/httpd/conf.d/status.conf 
<Location "/status"> #status的名字可以自定义，同时访问页面时也许使用此名字
   SetHandler server-status #开启状态页面
   <RequireAny>
 Require all denied
 require ip  172.16.1.1  #允许特定IP
   </RequireAny>
</Location>

ExtendedStatus Off  #是否详细的信息,默认值为on

systemctl restart httpd

#打开浏览器访问http://httpd服务器IP/status可以看到apache状态页面
```

## **多虚拟主机**

httpd 支持在一台物理主机上实现多个网站，即多虚拟主机

网站的唯一标识：

- IP相同，但端口不同

- IP不同，但端口均为默认端口

- FQDN不同, IP和端口都相同

多虚拟主机有三种实现方案：

- 基于ip：为每个虚拟主机准备至少一个ip地址

- 基于port：为每个虚拟主机使用至少一个独立的port

- 基于FQDN(全程域名，主机头)：为每个虚拟主机使用至少一个FQDN，请求报文中首部 Host: www.a.com

**httpd 2.4版本中，基于FQDN的虚拟主机不再需要NameVirutalHost指令**

### 虚拟主机的基本配置方法：

基于FQDN虚拟主机

```bash
<VirtualHost *:80>
ServerName www.xiangzheng.vip
DocumentRoot  "/data/www"
ErrorLog "logs/a_error_log"
CustomLog "logs/xz_access.log" combined
<directory /data/www>
require all granted
</directory>
</VirtualHost>
```



## 压缩

**使用mod_deflate模块压缩页面优化传输速度**

**适用场景：**

(1) 节约带宽，额外消耗CPU，(可能有些较老浏览器不支持)

(2) 压缩适于压缩的资源，例如文本文件

```
LoadModule deflate_module modules/mod_deflate.so SetOutputFilter
```

**配置压缩**

```bash
httpd -M | grep deflate #首先确认压缩模块是否加载
deflate_module (shared)

vim /etc/httpd/conf.d/test.conf
SetOutputFilter DEFLATE  #默认值，可不写（利用哪种过滤器）
#必须指定项，指定对哪种MIME类型进行压缩，（来自 /etc/mime.types 多用途邮件扩展）
AddOutputFilterByType DEFLATE text/plain #纯文本
AddOutputFilterByType DEFLATE text/html #html文件
AddOutputFilterByType DEFLATE application/xhtml+xml
AddOutputFilterByType DEFLATE text/xml
AddOutputFilterByType DEFLATE application/xml
AddOutputFilterByType DEFLATE application/x-javascript
AddOutputFilterByType DEFLATE text/javascript
AddOutputFilterByType DEFLATE text/css

#压缩级别 (Highest 9 - Lowest 1)
DeflateCompressionLevel 9

#排除特定旧版本的浏览器，不支持压缩
#Netscape 4.x 只压缩text/html
BrowserMatch ^Mozilla/4 gzip-only-text/html
#Netscape 4.06-08 三个版本 不压缩
BrowserMatch ^Mozilla/4\.0[678] no-gzip
#Internet Explorer标识本身为"Mozilla / 4”，但实际上是能够处理请求的压缩。如果用户代理首部匹配字符串"MSIE”（"B”为单词边界”），就关闭之前定义的限制
BrowserMatch \bMSI[E] !no-gzip !gzip-only-text/html
```

## 编译安装后指定副配置文件路径

```bash
vim /app/httpd24/conf/httpd.conf #从主配置文件中指定

ServerRoot "/app/httpd24" #首先确定文件的绝对路径
Include conf.d/*.conf #指定配置文件路径

#创建副配置文件
mkdir /app/httpd24/conf.d/*.conf
```





#  apache 实现 https

### 为服务器申请数字证书

​       可以通过私建CA颁发证书实现

​       (a) 创建私有CA

​       (b) 在服务器创建证书签署请求

​       (c) CA签证

### 配置httpd支持使用https，及使用的证书

- https是利用ssl模块来实现的，yum安装默认没有这个模块，需要手动安装，
- 
- 编译安装手动开启即可

```bash
#修改对应的配置文件：/etc/httpd/conf.d/ssl.conf
SSLCertificateFile   /path/*public.crt #证书文件路径（）
SSLCertificateKeyFile /path/file #私钥文件路径（*.key）
#以下二选一
SSLCertificateChainFile /path/*-chain.crt #证书链文件路径（证书是谁颁发的）
SSLCACertificateFile /path/ca-bundle.crt #根CA文件路径

#重启服务
systemctl restart httpd

#安装完成后直接重启服务也可以生效，默认配置文件会自动生成自签名证书，并且也会有指定的默认证书路径
```

### URL重定向

URL重定向:即将httpd请求的URL转发至另一个的URL**（通过请求和转发实现跳转到https）**

**URL有一定安全风险，且有可能出现死循环跳转，建议使用HSTS**

重定向指令

```
Redirect [status] URL-path URL
```

**status状态：**

- permanent： 返回永久重定向状态码 301,此重定向信息进行缓存
- temp：返回临时重定向状态码302. 此为默认值
- 301和302的区别：本质上差不不大，属于公司策略问题，301表示以后不在使用http，而302表示这次临时使用302跳转，用哪个都能达到跳转的效果

```bash
vim /etc/httpd/conf.d/test.conf
Redirect permanent / https://www.b.com/
systemctl restart httpd

vim /etc/httpd/conf.d/test.conf
Redirect temp / https://www.b.com/
systemctl restart httpd
```

### HSTS

HSTS:HTTP Strict Transport Security , 服务器端配置支持HSTS后，会在给浏览器返回的HTTP首部中携带HSTS字段（有一定的有效期max-age=xxx）。浏览器获取到该信息后，会将所有HTTP访问请求在内部做307跳转到HTTPS。而无需任何网络过程,实现更高的安全性**（通过浏览器直接跳转到https）**

#### 实现

```bash
vim /etc/httpd/conf.d/test.conf
Header always set Strict-Transport-Security "max-age=31536000" #HSTS在浏览器缓存中的有效期，秒为单位，31536000为一年
RewriteEngine on
RewriteRule ^(/.*)$ https://%{HTTP_HOST}$1 [redirect=302] #301也可以

systemctl restart httpd
```

#### 补充

HSTS功能来自于mod_rewrite.so模块，而源码编译安装后此模块可能未启用，需手动启动(在主配置文件中找到该模块行，取消注释后httpd -M |grep rew 来查看是否生效)



### 测试

```bash
curl -Lk   http://www.a.com/
<h1>/var/www/html/index.html</h1>
```



# 正向反向代理

**nginx中突出的特性，在Apache中稍逊色**

#### 正向代理服务器：

- 主要**服务于客户端**，客户端需配置正向代理服务器的IP和端口
- **功能：**将远程服务器的数据在客户端发起请求时，将数据先缓存到正向代理服务器中，从而达到减少带宽冗余的目的

#### 反向代理服务器：

- 主要**服务于服务器端**，客户端不知道“反向”代理服务器的存在
- **功能：**将客户端的访问请求，分配到指定服务器中，类似于前台接待的服务员

```bash
#apache启用反向代理,添加下面两行

ProxyPass "/" "http://www.example.com/" #当访问"/"时调度到"http://www.example.com/"
ProxyPassReverse "/" "http://www.example.com/"
```

```bash
#特定URL反向代理

ProxyPass "/images"  "http://www.example.com/"
ProxyPassReverse "/images" http://www.example.com/
```

# sendfile

属于"零复制"技术

**默认开启**

在kernel 2.0+ 版本中，系统调用 sendfile() 就是用来简化上面步骤提升性能的。sendfile() 不但能减少

切换次数而且还能减少拷贝次数用 sendfile() 来进行网络传输的过程



# 指定文件类型**content type**

相关指令

```bash
#指定文件和content type 的对应文件
TypesConfig file-path
#在给定的文件扩展名与特定的content type内容类型之间建立映射关系。MIME-type指明了包含extension扩展名的文件的媒体类型。这个映射关系会添加在所有有效的映射关系上，并覆盖所有相同的extension扩展名映射，extension参数是不区分大小的，并且可以带或不带前导点
AddType MIME-type extension [extension] ...
```

范例

```bash
TypesConfig /etc/mime.types #默认指向配置文件
AddType image/jpeg jpeg jpg jpe
AddType application/x-httpd-php .php
```

```bash
AddType text/plain .config #将.config后缀的文件识别成纯文本类型
```



# ---



# apache 实现 https

要在Apache服务器上实现HTTPS并为两个虚拟主机提供外部访问，你可以按照以下步骤进行操作：

1. 安装和配置 SSL 证书：

   - 首先，确保你已经获得了有效的 SSL 证书。你可以从信任的证书颁发机构（CA）购买或获取免费的 SSL 证书，例如 Let's Encrypt。
   - 将证书和私钥文件准备好，并确保它们位于服务器上的安全位置。通常情况下，证书文件应命名为 `server.crt`，私钥文件应命名为 `server.key`。

2. 加载 SSL 模块：

   - 打开 Apache 的配置文件（通常是 `httpd.conf` 或 `apache2.conf`）。
   - 搜索 `LoadModule`，找到类似 `LoadModule ssl_module modules/mod_ssl.so` 的行。确保该行没有被注释（没有以 `#` 开头）。
   - 如果找不到该行，请查找名为 `ssl_module` 或 `mod_ssl.so` 的其他类似行，确保取消注释。

3. 配置虚拟主机：

   - 找到 Apache 配置文件中的 `<VirtualHost>` 部分。对于每个虚拟主机，需要添加一个 `<VirtualHost>` 块。

   - 在每个 `<VirtualHost>`块中，配置正确的域名或 IP 地址和端口号，如：

     ```http
     <VirtualHost *:80>
         ServerName example.com
         ...
     </VirtualHost>
     ```

   - 对于每个需要启用 HTTPS 的虚拟主机，添加一个新的 `<VirtualHost>` 块来处理 SSL 连接，并指定 SSL 证书和私钥的路径，如：

     ```http
     <VirtualHost *:443>
         ServerName example.com
         ...
         SSLEngine on
         SSLCertificateFile /path/to/server.crt
         SSLCertificateKeyFile /path/to/server.key
         ...
     </VirtualHost>
     ```

4. 配置重定向：

   - 为了将 HTTP 请求重定向到 HTTPS，你可以在 HTTP 的 `<VirtualHost>`块中添加以下配置：

     ```http
     <VirtualHost *:80>
         ServerName example.com
         Redirect permanent / https://example.com/
     </VirtualHost>
     ```

     这将确保所有的 HTTP 请求都会被重定向到相应的 HTTPS 地址。

5. 重启 Apache 服务器：

   - 保存 Apache 配置文件，并重启 Apache 服务器以使更改生效。你可以使用以下命令重启 Apache：
     - 在 Ubuntu 上：`sudo service apache2 restart`
     - 在 CentOS/RHEL 上：`sudo systemctl restart httpd`

完成上述步骤后，你的 Apache 服务器将配置为使用 HTTPS，并为两个虚拟主机提供外部访问。确保你的 DNS 记录已正确设置，将域名解析到服务器的 IP 地址，以便外部用户可以通过 HTTPS 访问你的网站。





## 准备证书

- 创建证书存放目录

```sh
# mkdir /etc/httpd/ca
# cd /etc/httpd/ca
```

- www.wanyou.com.cn

```sh
# 生成私钥
openssl genrsa -out www.wanyou.com.cn.key 2048


# 生成证书请求（CSR）
openssl req -new -key www.wanyou.com.cn.key -out www.wanyou.com.cn.csr \
-subj "/C=CN/CN=www.wanyou.com.cn"


# 创建自签名证书
openssl x509 -req -days 3650 -in www.wanyou.com.cn.csr -signkey www.wanyou.com.cn.key -out www.wanyou.com.cn.crt
```

- www.csgc.com.cn

```sh
# 生成私钥
openssl genrsa -out www.csgc.com.cn.key 2048


# 生成证书请求（CSR）
openssl req -new \
-key www.csgc.com.cn.key \
-out www.csgc.com.cn.csr \
-subj "/C=CN/CN=www.csgc.com.cn"


# 创建自签名证书
openssl x509 -req -days 3650 \
-in www.csgc.com.cn.csr \
-signkey www.csgc.com.cn.key \
-out www.csgc.com.cn.crt
```



## 加载 SSL 模块

```sh
# ls -l /etc/httpd/modules/mod_ssl.so
-rwxr-xr-x. 1 root root 219456 5月  30 22:01 /etc/httpd/modules/mod_ssl.so


# cat /etc/httpd/conf.modules.d/00-ssl.conf
LoadModule ssl_module modules/mod_ssl.so
```



## 配置虚拟主机

### www.wanyou.com.cn

```html
# vim /etc/httpd/conf.d/00-www.wanyou.com.cn.conf
<VirtualHost *:443>
    Servername www.wanyou.com.cn
    DocumentRoot "/var/www/wanyou"
    SSLEngine on
    SSLCertificateFile /etc/httpd/ca/www.wanyou.com.cn.crt
    SSLCertificateKeyFile /etc/httpd/ca/www.wanyou.com.cn.key
</VirtualHost>
```

### www.csgc.com.cn

```html
# vim /etc/httpd/conf.d/00-www.csgc.com.cn.conf
<VirtualHost *:443>
    Servername www.csgc.com.cn
    DocumentRoot "/var/www/csgc"
    SSLEngine on
    SSLCertificateFile /etc/httpd/ca/www.csgc.com.cn.crt
    SSLCertificateKeyFile /etc/httpd/ca/www.csgc.com.cn.key
</VirtualHost>
```

## 编译安装Apache
- centos7编译安装Apache (http2.4)：
**centos7中yum源所带的APR软件过于老旧，所以需先编译安装APR**



### 1.需下载以下两个APR源码到linux

http://apr.apache.org/

![image-20210317164402334](C:\Users\阿征\AppData\Roaming\Typora\typora-user-images\image-20210317164402334.png)



### 2.下载http主程序到linux

http://httpd.apache.org/

![image-20210317164827317](C:\Users\阿征\AppData\Roaming\Typora\typora-user-images\image-20210317164827317.png)



### 3.最终得到的文件

![image-20210317165059324](C:\Users\阿征\AppData\Roaming\Typora\typora-user-images\image-20210317165059324.png)

### 4.解包并移动

```bash
tar xvf httpd-2.4.46.tar.bz2 -C /usr/local/src/
tar xvf apr-1.7.0.tar.bz2 apr-util-1.6.1.tar.bz2 -C /usr/local/src/
tar xvf apr-util-1.6.1.tar.bz2 -C /usr/local/src/

cd /usr/local/src/

mv apr-1.7.0/ httpd-2.4.46/srclib/apr
mv apr-util-1.6.1/ httpd-2.4.46/srclib/apr-util
```

### 5.三者合并编译安装

```bash
#安装前准备相关依赖包
yum -y install gcc make pcre-devel openssl-devel expat-devel

#准备软件存放目录
mkdir -p /app/httpd24

#开始编译安装
cd /usr/local/src/httpd-2.4.46/

./configure \
--prefix=/app/httpd24 \
--enable-so \
--enable-ssl \
--enable-cgi \
--enable-rewrite \
--with-zlib \
--with-pcre \
--with-included-apr \
--enable-modules=most \
--enable-mpms-shared=all \
--with-mpm=prefork

make -j 4 && make install
```

```bash
configure: WARNING: you should use --build, --host, --target
configure: WARNING: invalid host type:  
checking for chosen layout... Apache
checking for working mkdir -p... yes
checking for grep that handles long lines and -e... /usr/bin/grep
checking for egrep... /usr/bin/grep -E
checking build system type... Invalid configuration ` ': machine ` -unknown' not recognized
configure: error: /bin/sh build/config.sub   failed

#此错误为\后面有空格导致
```

### 6.**编译安装后配置**

Httpd编译过程：/app/httpd24/build/config.nice 

自带的服务控制脚本：/app/httpd24/bin/apachectl

### 7.**创建专用用户**

```bash
useradd -s /sbin/nologin -r apache
```

### 8.**指定运行httpd的用户**

```bash
vim /app/httpd24/conf/httpd.conf
user apache
group apache
```

### 9.**配置环境变量**

```bash
vim /etc/profile.d/httpd24.sh
PATH=/app/httpd24/bin:$PATH

#或者也可以直接创建软连接
ln -s /app/httpd24/bin/* /usr/bin/
```

### 10.实现开机启动

#### 方法一：

```bash
vim /etc/rc.d/rc.local
/app/httpd24/bin/apachectl start
chmod +x /etc/rc.d/rc.local
```

#### 方法二：

**创建service unit文件(CentOS 7以上版本)**

```bash
vim /usr/lib/systemd/system/httpd.service

[Unit]
Description=The Apache HTTP Server
After=network.target remote-fs.target nss-lookup.target
Documentation=man:httpd(8)
Documentation=man:apachectl(8)
[Service]
Type=forking
#EnvironmentFile=/etc/sysconfig/httpd
ExecStart=/app/httpd24/bin/apachectl start
#ExecStart=/app/httpd24/bin/httpd $OPTIONS -k start
ExecReload=/app/httpd24/bin/apachectl graceful
#ExecReload=/app/httpd24/bin/httpd $OPTIONS -k graceful
ExecStop=/app/httpd24/bin/apachectl stop
KillSignal=SIGCONT
PrivateTmp=true
[Install]
WantedBy=multi-user.target

systemctl daemon-reload
systemctl enable --now httpd
```

**创建service unit文件(CentOS 6以前版本)**

```bash
#自定义启动脚本(参考httpd-2.2的服务脚本)
cp   /etc/rc.d/init.d/httpd /etc/rc.d/init.d/httpd24
vim /etc/rc.d/init.d/httpd24
apachectl=/app/httpd24/bin/apachectl
httpd=${HTTPD-/app/httpd24/bin/httpd}
pidfile=${PIDFILE-/app/httpd24/logs/httpd.pid}
lockfile=${LOCKFILE-/var/lock/subsys/httpd24}
chkconfig –add httpd24 
chkconfig –list httpd24
```

### 11.配置帮助

```bash
vim /etc/man_db.conf
MANDATORY_MANPATH           /app/httpd24/man

mandb #更新数据库
```


