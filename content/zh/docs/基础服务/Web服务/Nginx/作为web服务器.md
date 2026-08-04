---
title: "作为web服务器"
---

## 前言

- Nginx 作为 Web 服务器时主要负责处理 html、图片、js、css、txt 等静态资源
- 动态资源的请求可以通过反向代理实现



## mime

- MIME（Multipurpose Internet Mail Extensions）是多用途互联网邮件扩展标准。它是一个用于描述文件内容类型的标准。MIME 用于在互联网上交换各种类型的数据，如文本、图像、音频、视频、应用程序等。
- 在Web中，MIME类型通常指定在 HTTP 请求头部的 Content-Type 属性中，**用于表明发送的数据类型，以帮助客户端或浏览器正确地处理响应数据。**
  - 例如，如果客户端请求一个资源，服务器在响应头中指定了 MIME 类型为 text/html，则客户端浏览器会将这个资源当做 HTML 文档来处理。

- MIME类型使用单个字符串来表示，例如：
  - text/html、application/json、image/jpeg、audio/mp3 等

- Nginx服务器可以通过配置文件添加、修改或者删除 MIME 类型，以满足不同文件类型的需求。例如：
  - 可以使用 Nginx 的“types”模块来映射某个文件扩展名对应的 MIME 类型；
  - 或者使用“default_type”指令设置默认的 MIME 类型。
    - default_type 默认值为 application/octet-stream，他的字面意思是 “八进制流二进制应用程序”，它是一种通用的二进制数据流类型，通常用于指示文件的媒体类型未知或不确定的情况下。
    - 在互联网通信中，当服务器无法确定某个文件的正确 MIME 类型时，会自动将其指定为 “application/octet-stream” 类型，这表示它是一个二进制文件类型，通常需要本地程序来识别和打开该类型的文件。
    - 例如，当您在下载某些未知格式的文件时，当服务器无法确定文件的正确 MIME 类型时，将自动将这些文件指定为 “application/octet-stream” 类型，这意味着文件将被视为二进制文件类型，并且您需要使用相应的本地程序来打开它们。
    - 需要注意的是，由于 “application/octet-stream” 类型不会告诉客户端文件的具体内容和类型，因此它在安全上存在一定的风险，例如，攻击者可以将其利用为上传病毒、恶意代码等攻击手段的载体。因此，在实际开发中，建议尽可能地明确文件的 MIME 类型，以便更好地保护系统的安全性和可靠性。

- 总的来说，MIME类型是一种用于指示数据的媒体类型或格式的标准，它在互联网通信和 Web 应用中扮演着重要的角色。

**参考文档：**

- https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Basics_of_HTTP/MIME_Types

```sh
http {
...
    include       mime.types; # 导入支持的文件类型，在编译安装中是相对于/apps/nginx/conf的目录
    default_type  text/html; # 除mime.types中文件类型外，设置其他文件默认的MIME类型，访问其它类型时会提示下载不匹配的文件类型，建议修改为txt格式查看
    types { # 指定多个MIME类型
        text/html html;
        image/gif gif;
        image/jpeg jpg;
    }
...
}
```



### 范例

- 准备测试页面

```php
# vim /apps/nginx/html/index.php
<?php
  echo "Hello, World!"; 
?>
```

- 访问测试，这种情况如果使用浏览器访问将自动下载文件

```sh
# curl http://localhost/index.php -sI | grep Content-Type
Content-Type: application/octet-stream
```

- 将无法识别后缀的文件解析为文本格式

```nginx
http {
...
    default_type  text/html;
...
}
```

- 好啦

```sh
# curl http://localhost/index.php -sI | grep Content-Type
Content-Type: text/html
```





## 定义 http 响应首部

### 自定义 http 响应首部

- 添加头部报文信息，实现对后端服务器响应给客户端的报文中添加指定的响应首部字段
- 由 ngx_http_headers_module 模块提供此功能

```nginx
Syntax：add_header name value [always];
Default： —
Context：http, server, location, if in location
```

#### add_header 配置范例

```bash
# 生产中通常开启，可以间接性的告诉攻击者攻击的是CDN等信息
add_header X-Cache $upstream_cache_status; # 是否缓存命令，常用
add_header X-Accel $server_name # 客户访问的FQDN，常用
add_header X-Via $server_addr; # 当前nginx主机的IP，不常用
```

#### add_header 测试范例

```bash
[root@centos8 ~]# vim /apps/nginx/conf/conf.d/pc.conf
...
    location / {
        proxy_pass http://10.0.0.18;
        proxy_cache nginx_proxy_cache;
        proxy_cache_key $request_uri;
        proxy_cache_valid 200 302 301 10m;
        proxy_cache_valid any 5m;
        add_header X-Cache $upstream_cache_status; #显示是否缓存命令
    }
...


#测试
[root@localhost ~]#curl -I http://www.azheng.com/
HTTP/1.1 200 OK
Server: nginx/1.18.0
Date: Thu, 11 Nov 2021 12:21:06 GMT
Content-Type: text/html
Content-Length: 2331099
Connection: keep-alive
Vary: Accept-Encoding
Last-Modified: Thu, 11 Nov 2021 11:42:16 GMT
ETag: "618d0198-2391db"
X-Cache: MISS #第一次未命中
Accept-Ranges: bytes

[root@localhost ~]#curl -I http://www.azheng.com/
HTTP/1.1 200 OK
Server: nginx/1.18.0
Date: Thu, 11 Nov 2021 12:21:08 GMT
Content-Type: text/html
Content-Length: 2331099
Connection: keep-alive
Vary: Accept-Encoding
Last-Modified: Thu, 11 Nov 2021 11:42:16 GMT
ETag: "618d0198-2391db"
X-Cache: HIT #第二次命中
Accept-Ranges: bytes
```







需要注意的是，添加自定义首部时应该遵循一些规范和最佳实践，例如不应该使用已经被标准化的首部名称，避免潜在的安全风险以及性能影响。

- 如果您想要为所有请求添加固定的自定义首部，可以在 Nginx 的 `http` 块中使用该指令：
- 这意味着对于所有的请求，都会在响应中添加一个名为 “X-MyHeader” 的首部，其值为 “Hello, world!”。

```nginx
http {
    # some other configurations...

    add_header X-MyHeader "Hello, world!";

    # some other configurations...
}
```

- 以在某个特定的 `location` 或 `server` 块中使用 `add_header` 指令来添加该特定区域的自定义首部。例如：
- 这将只为特定的 URI “/my/path” 添加 “X-MyHeader” 自定义首部。

```nginx
server {
    # some other configurations...

    location /my/path {
        add_header X-MyHeader "Hello, world!";
    }

    # some other configurations...
}
```

- 验证

```sh
# curl http://localhost/index.php -I
...
X-MyHeader: Hello, world!
...
```



### 是否显示字符集

- 定义

```nginx
http {
    # some other configurations...

    charset utf-8; # 是否在相应报文中的Content-Type显示指定的字符集，默认为off 即不显示，utf-8的内容可以自定义

    # some other configurations...
}
```

- 验证

```sh
# 定义前
# curl http://localhost/index.php -sI | grep Content-Type
Content-Type: text/html


# 定义后
# curl http://localhost/index.php -sI | grep Content-Type
Content-Type: text/html; charset=utf-8
```



### 是否显示 nginx 版本

- 定义

```nginx
http {
    # some other configurations...

    server_tokens off; # 默认为on 表示显示，off表示关闭

    # some other configurations...
}
```

- 验证

```sh
# 定义前
# curl http://localhost/index.php -sI | grep Server
Server: nginx/1.18.0


# 定义后
# curl http://localhost/index.php -sI | grep Server
Server: nginx
```











## 多虚拟主机的实现

- 可以基于不同的IP、不同的端口、不同的域名实现不同的虚拟主机
- 依赖于核心模块 ngx_http_core_module 实现

```bash
# mkdir -p /data/web/html/{pc,mobile}


# 页面配置
# tree /data/
/data/
└── web
    └── html
        ├── mobile
        └── pc


# echo pc index.html > /data/web/html/pc/index.html

# echo mobile index.html > /data/web/html/mobile/index.html



# 修改主配置文件，使其支持子配置文件
# cat /apps/nginx/conf/nginx.conf
...
http {
...
    include /apps/nginx/conf/conf.d/*.conf; # 添加此行
...


# 创建子配置文件目录并准备界面
# mkdir /apps/nginx/conf/conf.d/
# vim /apps/nginx/conf/conf.d/pc.conf
server {
    listen       80;
    server_name  www.azheng.com; # 虚拟主机一
    location / {
    root /data/web/html/pc;
    }
}
# vim /apps/nginx/conf/conf.d/mobile.conf
server {
    listen       80;
    server_name  www.m.azheng.com; # 虚拟主机二
    location / {
    root /data/web/html/mobile;
    }
}


# 重启nginx
# nginx -t
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
# systemctl restart nginx.service 
```





### 测试

```bash
# echo 10.0.0.8 www.azheng.com www.m.azheng.com >> /etc/hosts


# curl www.m.azheng.com
mobile index.html


# curl www.azheng.com
pc index.html



# 本质上是根据请求报文头来判断的
# curl -H "Host:www.m.azheng.com" 10.0.0.18
mobile index.html
# curl -H "Host:www.pc.azheng.com" 10.0.0.18
mobile index.html
# curl -H "Host:www.azheng.com" 10.0.0.18
pc index.html
```

### 多虚拟主机的优先级

- 虚拟机主机的默认优先级是根据配置文件中的字母顺序来判断的

```bash
# curl 10.0.0.8
mobile index.html

# mv /apps/nginx/conf/conf.d/pc.conf /apps/nginx/conf/conf.d/apc.conf

# systemctl restart nginx.service 

# curl 10.0.0.8
pc index.html
```







## root 与 alias

### root

- 表示访问root+location的目录
- https://nginx.org/en/docs/http/ngx_http_core_module.html#root

```nginx
Syntax: root path;
Default: root html;
Context: http, server, location, if in location
```

#### 范例

```nginx
server {
...
    location /about {
        root /opt/html; #必须要在html目录下创建一个about目录，否则访问会报错
...    
    }
}

#结果访问的是下面目录里的内容
/opt/html/about

#范例2
server {
    server_name  azheng.com;
...
    location /uri_a {
        root /data/html;
    }
...
}
[root@nginx ~]# cat /data/html/uri_a/index.html 
/data/html/uri_a/index.html
[root@nginx ~]# curl -L azheng.com/uri_a
/data/html/uri_a/index.html
```

### alias

- 表示访问/about即跳转到/opt/html目录下
- 文档：https://nginx.org/en/docs/http/ngx_http_core_module.html#alias

```nginx
Syntax:	alias path;
Default: —
Context: location
```



#### 范例

```nginx
#范例
server {
...
    location /about {
    alias /opt/html;
...    
    }
}

#结果访问的是下面目录里的内容
/opt/html


#范例2
#范例2
server {
    server_name  azheng.com;
...
    location /uri_b {
        root /data/html;
    }
...
}
[root@nginx ~]# cat /data/html/index.html 
/data/html/index.html
[root@nginx ~]# curl -L azheng.com/uri_b
/data/html/index.html
```



### root 与 alias 的区别

在Nginx服务器配置中，root和alias指令都可以用来指定网站的根目录，但它们之间有一些区别。

root指令：

- `root` 只能用在server或location指令块中，表示指定服务器或特定请求的根目录，例如：
- 这里的root指令指定的是整个服务器的根目录，这意味着访问`http://localhost/`时将会访问`/usr/share/nginx/html`目录下的文件或目录。

```nginx
server {
    listen       80;
    server_name  localhost;
    root         /usr/share/nginx/html;
}
```

alias指令：

- `alias`同样只能用在location指令块中，例如：
- 这里的alias指令将`/test/`URI指向了`/data/www/`目录，这意味着访问`http://localhost/test/index.html`时将会访问`/data/www/index.html`文件。与root不同的是，alias可以重写URI路径。

```nginx
location /test/ {
    alias /data/www/;
}
```

所以，root用于映射URI到文件系统路径，而alias用于替换请求的URI路径。



## location

- 在Nginx中 `location` 是一个非常重要的指令，用于匹配请求的URL。在请求到达 Nginx Web 服务器时，Nginx 会按照一定的匹配优先级去匹配 `location`，如果匹配成功则将请求路由到对应的处理代码或资源。
- 在一个server中location配置段可存在多个，用于实现uri到文件系统的路径映射

参考文档：

- https://nginx.org/en/docs/http/ngx_http_core_module.html#location

```nginx
location [ = | ^~ | ~ | ~* ] uri {
    ...
}


# 匹配符需位于标准uri前
=  # 精确匹配、区分大小写
~  # 表示包含正则表达式，区分大小写
~* # 表示包含正则表达式，不区分大小写（注意：此方式中对服务器端的文件是区分大小写的，如文件没有则报404）
^~ # 表示包含正则表达式(且匹配开头)，不区分大小写
不带符号** ：匹配起始于此uri的所有的uri


# 匹配优先级从高到低：
=
^~
~|~*
不带符号
```



### location 匹配逻辑

- location在匹配的时候，会按照配置文件中定义的顺序依次匹配，匹配字符串最长的location优先级最高；
- 如果location中包含匹配符，匹配符也有优先级：
  - 优先级最高的是 = 表示精确匹配
  - 其次是 ^~ 表示匹配开头并且不区分大小写的正则匹配
  - 然后是 ~ 或 ~* 分别表示  区分大小写的正则匹配 和 不区分大小写的正则匹配
  - 不带匹配符优先级最低。
- 当请求中有匹配当前uri的location块时，将只会使用匹配优先级最高的location块作为请求的处理地点。



### location 范例

#### 精确匹配 =

- 精确匹配的优先级最高
- 精确匹配一般用于匹配组织的 logo 等相对固定的 URL

```nginx
location = /admin { # 匹配严格为 http://domain.com/admin 的URL
    // 处理代码或返回静态资源
}
```



#### 正则匹配区分大小写 ~

- 如果没有前缀匹配，则尝试使用正则匹配。在 location 模式中使用（）和（*）之类的正则表达式选择。

```nginx
location ~ /A.?\.jpg { # 只有A开头后面跟一个字符或没有字符且以.jpg结尾的才匹配，小写的a开头不匹配
    // ...
}


location ~ \.(gif|jpg|png)$ { # 当请求的URL以 .gif、.jpg 或 .png 结尾时，Nginx将使用此 location
    // ...
}


location ~ ^/blogs/(.*)\.html$ { # 匹配 /blogs/*/*.html，并把 * 通配符的部分捕捉到 $1 变量中
    // 处理代码或返回静态资源
}
```



#### 正则匹配忽略大小写 ~*

- **注意：虽忽略大小写，但输入的文件名在主机上必须存在，否则也会报404，例如：访问 aB.jpg 磁盘上也许存在此文件**

```nginx
location ~* /A.?\.jpg { # 小写的a开头也一样匹配
    // ...
}


location ~* \.(gif|jpg|jpeg)$ { # 匹配 .gif/.jpg/.jpeg 后缀的URL，不论大小写
    // 处理代码或返回静态资源
}
```



#### 正则匹配忽略大小写并匹配开头 ^~

```nginx
location ^~ /images { # 匹配以images开头，不论大小写
    // 处理代码或返回静态资源
}
```



#### 普通字符匹配

- 例如：如果以上方式都无法匹配，则使用普通字符匹配，使用最长匹配路径（完整路径匹配）。
- 当以上 `location` 都无法匹配时，Nginx 将使用此 `location`。

```nginx
location / {
    // ...
}


location /news {
    # 匹配包含 /news 的所有URL，如 /news, /news/index.html
    // 处理代码或返回静态资源
}
```

#### 前缀匹配 /

- 如果没有精确匹配则检查前缀匹配，如果请求URL以 `location` 模式开头，则使用此 `location`。
- 例如：当请求的URL为 `/path/index.html` 时，Nginx 将使用该 `location`。

```nginx
location /path {
    // ...
}


location /images { # 匹配以 /images 开头的所有URL，如 /images/foo.jpg
    // 处理代码或返回静态资源
}
```











#### 其他例子

**静态文件服务器：**

```nginx
location /static/ {
    # 定义静态资源的目录
    root /var/www/;
    # 设置缓存时间为1小时
    expires 1h;
    # 启用gzip压缩
    gzip on;
    # 缓存文件大小
    gzip_min_length 1k;
}
```

**反向代理服务器：**

```nginx
location /api/ {
    # 设置代理服务器的地址
    proxy_pass http://127.0.0.1:8000/;
    # 启用请求重定向
    proxy_redirect off;
    # 关闭缓存
    proxy_buffering off;
    # 设置请求头信息中的Host
    proxy_set_header Host $host;
    # 把客户端的IP传到后端
    proxy_set_header X-Real-IP $remote_addr;
}
```

**Cache服务器：**

```nginx
location / {
    # 设置将缓存的代理服务器地址
    proxy_pass http://127.0.0.1:8000/;
    # 建立缓存的名称和路径
    proxy_cache_path /var/www/cache levels=1:2 keys_zone=my_cache:10m;
    # 缓存的有效时间为1小时
    proxy_cache_valid 200 1h;
    # 缓存最小的HTTP状态码
    proxy_cache_min_uses 3;
    # 设置缓存文件大小
    proxy_cache_bypass $http_pragma;
    # 检查缓存
    proxy_cache_revalidate on;
}
```



### location 官方范例

```bash
location = / {
    [ configuration A ]
}

location / {
    [ configuration B ]
}

location /documents/ {
    [ configuration C ]
}

location ^~ /images/ {
    [ configuration D ]
}

location ~* \.(gif|jpg|jpeg)$ {
    [ configuration E ]
}
```

**说明：**

- 如果访问 /
  - 请求将匹配配置 A（但测试发现返回的是配置 B）
- 如果访问 /index.html
  - 请求将匹配配置 B
- 如果访问 /documents/document.html
  - 请求将匹配配置 C
  - `location /`  和 `location /documents/` 都能匹配，但`location /documents/` 描述的更精确，因此匹配C。
- 如果访问 /images/1.gif
  - 请求将匹配配置 D
  - `location ^~ /images/` 和 `location ~* \.(gif|jpg|jpeg)$`都能匹配，但`^~`匹配符的优先级要高于`~*`，因此匹配D
- 如果访问 /documents/1.jpg
  - 请求将匹配配置 E
  - 虽然`location /documents/`也能匹配，但其未定义匹配符。所以定义了匹配符的`location ~* \.(gif|jpg|jpeg)$` 优先级更高



## 访问控制

### 四层访问控制

- 通过客户端的源IP地址进行访问限制
- **注意：能在防火墙上设置规则就尽量在防火墙上设置，这样可以减少资源的浪费**
- https://nginx.org/en/docs/http/ngx_http_access_module.html#allow

```bash
# 生效范围从上到下
location / {
    deny  192.168.1.1;
    allow 192.168.1.0/24;
    allow 10.1.1.0/16;
    allow 2001:0db8::/32;
    deny  all; # 定义时应该范围从小到大，如果将此行置于最上方，将直接拒绝所有，进而导致下面的规则无法生效
}
```



### 请求方法访问控制

`limit_except` 是 Nginx 服务器中的一个指令，它可以限制客户端使用除了指定的请求方法之外的其他方法。

具体来说，`limit_except` 可以用来限制特定的 HTTP 请求方法（例如 GET、POST、PUT、DELETE、HEAD 等）在指定的上下文中被允许或禁止。

可以在 `http`、`server` 或 `location` 上下文中使用 `limit_except`。

#### 范例-1

下面是一个例子，它在 `location` 上下文中使用 `limit_except` 来限制只有 POST 请求方法被允许：

```nginx
location /api {
    limit_except POST {
        deny all;
    }
}
```

在这个例子中，`/api` 路径下的所有请求都将被禁止，除非它们使用 POST 方法。

需要注意的是，`limit_except` 只能限制客户端使用除了指定的请求方法之外的其他方法，而不能限制客户端使用指定的请求方法。如果需要限制客户端使用指定的请求方法，可以使用 `allow` 和 `deny` 指令来实现。



#### 范例-2

可以使用 Nginx 的 `limit_except`、`allow` 和 `deny` 指令来实现该要求。具体配置如下：

```nginx
location / {
    limit_except GET HEAD {
        allow 192.168.1.0/24;
        deny all;
    }
}
```

在这个例子中，`/` 路径下的所有请求都将被禁止，除非它们使用 GET 或 HEAD 方法，并且来自于 `192.168.1.0/24` 网段的主机。其他请求方法和来源主机都将被拒绝访问。

需要注意的是，`allow` 和 `deny` 指令是按顺序匹配的。如果 `allow` 匹配成功，请求将被允许访问；如果 `deny` 匹配成功，请求将被拒绝访问。如果都没有匹配成功，则默认情况下请求将被禁止访问。

##### 验证

你可以使用以下命令来验证 Nginx 的配置是否按照预期工作：

```sh
curl -X POST http://your-server-ip/your-path
```

上述命令将发送一个 POST 请求到 `http://your-server-ip/your-path`。如果 Nginx 配置按照预期工作，该请求将被拒绝访问，并返回一个错误响应。

然后，你可以使用以下命令来发送一个 GET 请求到同样的 URL：

```sh
curl http://your-server-ip/your-path
```

如果 Nginx 配置按照预期工作，该请求将被允许访问，并返回一个正常响应。同样的，你也可以使用以下命令来发送一个 HEAD 请求到同样的 URL：

```sh
curl -I http://your-server-ip/your-path
```

如果 Nginx 配置按照预期工作，该请求也将被允许访问，并返回一个正常响应。



## basic 认证

- https://nginx.org/en/docs/http/ngx_http_auth_basic_module.html

### 生成所需的账号和密码

```bash
# Centos安装包
yum -y install httpd-tools
# Ubuntu安装包
apt -y install apache2-utils


# 创建用户并非交互式创建密码，-c创建新的文件，-b非交互式
# htpasswd -cb /apps/nginx/conf/.htpasswd user1 123456
Adding password for user user1
# cat /apps/nginx/conf/.htpasswd
user1:$apr1$ZWCIkUJw$d8vxof6SpwGpMe69HZ/8Q/


# 需要创建第二个用户时，不要加-c，否则会清空之前的内容
# htpasswd -b /apps/nginx/conf/.htpasswd user2 123456
Adding password for user user2
```

### 在Nginx配置文件中添加

```nginx
#准备测试页面
# echo test_login_page > /data/web/html/pc/login



#加入到Nginx配置文件中
# vim /apps/nginx/conf/conf.d/pc.conf
server {
...
    location /login {
    root /data/web/html/pc;
    auth_basic           "please login"; # 指定登录提示语
    auth_basic_user_file /apps/nginx/conf/.htpasswd; # 指定账号密码文件
    }
...    
}
```



### 验证

```sh
# curl www.azheng.com/login -I 
HTTP/1.1 401 Unauthorized
...


# 方法一
# curl http://user1:123456@www.azheng.com/login
test_login_page


# 方法二
# curl -u user2:123456 http://www.azheng.com/login
test_login_page
```







## 自定义错误页面

- 用于定义错误页面的处理方式。可以指定HTTP状态码和对应的页面。
- https://nginx.org/en/docs/http/ngx_http_core_module.html#error_page

```
Syntax： error_page code ... [=[response]] uri;
code： 404 500 502 503 504 ...
Context： http, server, location,if in location
```



### 范例：只返回错误图片

- 不常用，因为通常返回的都是自定义的错误页面，例如 error.html

```nginx
server {
    listen       80;
    server_name  www.azheng.com;
    error_page 404 /pc_404.png; # 指定状态码和错误页面图片位置
    location / {
    root /data/web/pc/html;
    }
}
```



### 范例：不同错误页面分别定义

```nginx
server {
    listen       80;
    server_name  www.azheng.com;
    error_page 404             /404.html; # 如果访问出现404，则跳转到/404.html下
    error_page 500 502 503 504 /50x.html;

    location = /404.html { # /404.html的定义，即在/data/web/pc/html/404.html前端写的错误页面
        root /data/web/pc/html;
    }
    location = /50x.html {
        root /data/web/pc/html;
    }
}
```





### 范例：如果页面不存在，则跳转到主页

- 最好改为防止截胡的写法

```nginx
server {
    listen       80;
    server_name  www.azheng.com;
    root /data/web/pc/html;
    error_page 404  /index.html; #添加此行

    location / {
    }
}
```



### 范例：防止截胡

- 防止浏览器"截胡"，例如：使用360访问到错误或不存在的页面时，会显示浏览器自带的错误提示，而非网站本身的错误页面
  - 解决方案：404转为302（因为302状态码浏览器一般不会截胡）


```nginx
server {
    listen       80;
    server_name  www.azheng.com;
    root /data/web/pc/html;
    error_page 404 =302 /index.html; # 404转为302并重定向到主页，（注意：语法为 =302）

    location / {
    }
}


# 验证
# curl -i  www.xiangzheng.com/dqwdqwewq
HTTP/1.1 302 Moved Temporarily
Server: nginx/1.18.0
Date: Thu, 13 Jan 2022 10:30:42 GMT
Content-Type: text/html
Content-Length: 29
Connection: keep-alive
ETag: "61dfa67f-1d"
```







## 检测文件是否存在

- try_files 会按指定顺序检查文件是否存在，并使用第一个找到的文件或文件夹（结尾加斜线表示为文件夹）；
- 如果所有文件或文件夹都找不到，会进行一个内部重定向到最后一个参数；
- 只有最后一个参数可以引起一个内部重定向，之前的参数只设置内部URI的指向
- 最后一个参数是回退URI且必须存在，否则会出现内部500错误

- https://nginx.org/en/docs/http/ngx_http_core_module.html#try_files

```
Syntax:	try_files file ... uri;
        try_files file ... =code;
Default:	—
Context:	server, location
```







### 范例：补全文件

```nginx
#准备页面
# mkdir -p /data/web/pc/html/about/
# echo 'default page' > /data/web/pc/html/about/default.html


# 修改配置
server {
    listen 80;
    server_name www.xiangzheng.com;
    root /data/web/pc/html/;
    try_files $uri $uri.html $uri/index.html /about/default.html;
}


# 访问不存在的页面
# curl -i  www.xiangzheng.com/dqwdqwewq
HTTP/1.1 200 OK # 状态码返回200
Server: nginx/1.18.0
Date: Thu, 13 Jan 2022 11:04:26 GMT
Content-Type: text/html
Content-Length: 13
Last-Modified: Thu, 13 Jan 2022 11:03:37 GMT
Connection: keep-alive
ETag: "61e00709-d"
Accept-Ranges: bytes

default page # 返回默认页面，即最后一个参数


# 访问存在的页面
#curl -i  www.xiangzheng.com/index
HTTP/1.1 200 OK #状态码返回200
Server: nginx/1.18.0
Date: Thu, 13 Jan 2022 11:05:46 GMT
Content-Type: text/html
Content-Length: 29
Last-Modified: Thu, 13 Jan 2022 04:11:43 GMT
Connection: keep-alive
ETag: "61dfa67f-1d"
Accept-Ranges: bytes

pc index.html # 返回主页，是根据 try_files 中 $uri.html 来补全的
```

### 范例：自定义返回状态码

```nginx
# 修改配置文件
server {
    listen 80;
    server_name www.xiangzheng.com;
    root /data/web/pc/html/;
    try_files $uri $uri.html $uri/index.html =666; # 如果用户输入的uri前面的都匹配不到，则返回666状态码
}

# 访问不存在的页面
#curl -i  www.xiangzheng.com/ewqewqe
HTTP/1.1 666 #返回自定义的状态码
Server: nginx/1.18.0
Date: Thu, 13 Jan 2022 11:08:34 GMT
Content-Length: 0
Connection: keep-alive

# 访问存在的页面
#curl -i  www.xiangzheng.com/index
HTTP/1.1 200 OK #状态码返回200
Server: nginx/1.18.0
Date: Thu, 13 Jan 2022 11:09:10 GMT
Content-Type: text/html
Content-Length: 29
Last-Modified: Thu, 13 Jan 2022 04:11:43 GMT
Connection: keep-alive
ETag: "61dfa67f-1d"
Accept-Ranges: bytes

pc index.html # 返回主页，是根据 try_files 中 $uri.html 来补全的
```



### GPT

在nginx配置文件中，try_files指令用于指定尝试访问文件的顺序，通常用于处理静态文件的请求。它的语法为：

```
Copy code
try_files file ... uri;
```

其中，`file ...`表示要尝试访问的文件路径列表，`uri`表示如果前面的文件都不存在，则使用此URI进行处理。

try_files的常见应用场景有：

1. 处理静态资源请求：try_files可以在请求静态资源时，按照指定的顺序尝试访问文件，例如：

```
bashCopy codelocation /static/ {
    alias /path/to/static/;
    try_files $uri $uri/ =404;
}
```

这个配置会在访问/static/路径下的静态资源时，先尝试访问请求的文件，如果文件不存在，则尝试访问同名目录下的index文件，如果还是不存在则返回404错误。

1. 处理SPA应用：在单页面应用（SPA）中，所有的请求都需要返回同一个html文件，通过try_files可以实现这个功能，例如：

```
bashCopy codelocation / {
    try_files $uri $uri/ /index.html;
}
```

这个配置会在请求任何路径时，都返回index.html文件。

1. 处理反向代理请求：在反向代理时，try_files可以处理后端服务不可用或返回404错误的情况，例如：

```
perlCopy codelocation / {
    try_files $uri @backend;
}
location @backend {
    proxy_pass http://backend;
}
```

这个配置会在请求任何路径时，先尝试访问对应的文件，如果文件不存在，则将请求转发给后端服务进行处理。

总之，try_files是一个非常实用的指令，可以帮助我们处理各种场景下的请求。



非常感谢您的补充和提醒，关于try_files指令的功能，我再做一些进一步的澄清和补充说明：

1. try_files指令按照指定的顺序检查文件是否存在，并使用第一个找到的文件进行请求处理，如果没有找到，则按照最后一个参数指定的URI进行处理。
2. 如果最后一个参数指定的URI不存在，nginx会返回500错误。因此，必须确保最后一个参数是一个有效的URI。
3. try_files只能设置内部URI的指向，即nginx在内部重定向时使用的URI，而不会对客户端返回的URI产生影响。
4. 如果需要在找不到文件时返回自定义状态码，可以使用error_page指令来实现。例如：

```
bashCopy codelocation / {
    try_files $uri $uri/ /index.html;
    error_page 404 = /404.html;
}
```

这个配置会在请求任何路径时，先尝试访问对应的文件，如果文件不存在，则返回404.html文件，并将HTTP状态码设置为404。



### 范例

`try_files`指令是`core_module`模块提供的一个非常有用的功能，它可以帮助Nginx服务器在本地文件系统中查找指定的文件，并按照指定的顺序进行尝试。当Nginx服务器接收到一个请求时，它将会按照`try_files`指令中指定的顺序，依次尝试查找文件，直到找到为止。

例如，以下指令：

```
bashCopy codelocation / {
    try_files $uri $uri/ /index.php;
}
```

会先尝试查找请求的文件，如果文件不存在则查找对应的目录，如果还不存在则使用`index.php`处理请求。



## 长连接配置

- 在Nginx中，keepalive_timeout是一个用于控制HTTP keep-alive连接超时的指令。
- HTTP **keep-alive是指在一次TCP连接中，客户端可以连续发送多个HTTP请求，而不必每次请求都建立一个新的TCP连接。这可以减少TCP连接的建立和断开次数，从而提高性能。**
  - 需要注意的是，设置过长的keepalive_timeout可能会导致连接资源的浪费；
  - 而设置过短可能会增加TCP连接的建立和断开次数；
  - 因此，需要根据实际情况进行调整。

- keepalive_timeout 指令用于控制一个 keep-alive 连接的最大空闲时间，即服务器在一定时间内没有收到客户端发送的请求时，就会关闭这个连接。

### 相关指令说明

#### keepalive_timeout

- https://nginx.org/en/docs/http/ngx_http_core_module.html#keepalive_timeout

```sh
Syntax:	keepalive_timeout timeout [header_timeout];
Default: keepalive_timeout 75s;
Context: http, server, location
```

- timeout 指定了连接的最大空闲时间，单位为秒。0 表示禁止长连接
- header_timeout 是一个可选参数，用于设置在读取 HTTP 头信息时的超时时间。（HTTP响应报文中显示的）

#### keepalive_requests

- https://nginx.org/en/docs/http/ngx_http_core_module.html#keepalive_requests
- 设置每个长连接（keep-alive）可以处理的最大请求数。当一个长连接处理了一定数量的请求后，nginx会主动关闭该连接，以避免连接资源被占用过久，导致服务器负载过高或者资源浪费。

```
Syntax:	keepalive_requests number;
Default: keepalive_requests 1000;
Context: http, server, location
```



#### keepalive_disable

- keepalive_disable 可以实现针对不同的场景来禁用长连接，例如浏览器

在 Nginx 中，keepalive_disable 配置项用于禁用 keepalive 连接。下面是一个示例配置：

```nginx
perlCopy codehttp {
    # 禁用 keepalive 连接
    keepalive_disable  all;

    server {
        listen 80;
        server_name example.com;

        location / {
            # 处理请求
            # ...
        }

        # ...
    }
}
```

在上面的示例中，使用 keepalive_disable 配置项禁用了所有的 keepalive 连接。这将适用于整个 Nginx 实例。然后，在虚拟主机配置中处理请求。

请注意，可以在 location 中单独设置 keepalive_disable 配置项，以便更细粒度地控制 keepalive 连接。例如：

```nginx
location / {
    # 禁用 keepalive 连接
    keepalive_disable  if=$http_user_agent ~* MSIE;

    # 处理请求
    # ...
}
```

这将仅在用户代理字符串中包含 "MSIE" 的情况下禁用 keepalive 连接，并将覆盖全局配置。



keepalive_disable 配置项可以定义在哪些情况下禁用 keepalive 连接，包括特定的客户端请求头。在 Nginx 的官方文档中，提到了一些示例，其中一个就是禁用一些早期版本的 Microsoft Internet Explorer（MSIE）浏览器的 keepalive 连接。

以下是一个针对 MSIE 浏览器的示例：

```nginx
http {
    # 针对 MSIE 浏览器禁用 keepalive 连接
    keepalive_disable  msie6 msie7 msie8;

    server {
        listen 80;
        server_name example.com;

        location / {
            # 处理请求
            # ...
        }

        # ...
    }
}
```

在上面的示例中，使用 keepalive_disable 配置项针对 MSIE 6、7 和 8 版本禁用了 keepalive 连接。这将适用于整个 Nginx 实例。然后，在虚拟主机配置中处理请求。

请注意，可以根据需要针对其他客户端请求头禁用 keepalive 连接。例如，可以禁用特定的移动设备或特定的 API 客户端请求头。



### 范例

#### 定义

- 当一个 keep-alive 连接超过 65 秒没有收到新的请求时，Nginx 会关闭这个连接，从而释放服务器资源。
- 而 60 表示是在HTTP响应报文中显示的时间

```nginx
# 此配置通常定义在http段中作为全局配置
http {
    keepalive_timeout  65 60;
}
```

#### 测试

```sh
# 实现前
# curl -I 10.0.0.18
...
Connection: keep-alive
...



# curl -I 10.0.0.18
...
Connection: keep-alive
Keep-Alive: timeout=60 # 60 表示是在HTTP响应报文中显示的时间
...
```

要测试长连接（Keep-Alive）是否正常工作，您可以使用telnet命令模拟HTTP请求并手动发送HTTP头信息。以下是测试长连接的步骤：

1. 打开终端并输入以下命令连接到目标主机的端口（默认为80）：

```
telnet example.com 80
```

其中example.com是您要连接的主机名或IP地址。

1. 输入以下HTTP头信息，以请求一个具有长连接的网页：

```
GET / HTTP/1.1
Host: example.com
Connection: keep-alive
```

其中，第一行指定了请求方式（GET），请求路径（/）和HTTP协议版本（HTTP/1.1）。第二行指定了请求的主机名。第三行指定了连接方式为长连接（keep-alive）。

1. 按下回车键两次，发送HTTP头信息并等待服务器响应。
2. 如果一切正常，服务器应该会发送网页内容。您可以继续发送其他请求，直到长连接超时或您手动关闭连接。

如果连接超时或您在测试期间遇到其他问题，可以尝试修改服务器的keepalive_timeout指令或其他相关指令，以确保长连接功能正常工作。

需要注意的是，在实际生产环境中，建议使用更高级的工具或框架进行长连接测试，例如ab（Apache Benchmark）、wrk、Siege等。这些工具可以自动化测试过程，并提供更多的性能指标和报告。





### 范例：关闭长连接

```nginx
http {
    keepalive_timeout  0;
}


# curl -I 10.0.0.18
...
Connection: close # close 关闭了长连接，keep-alive 开启了长连接
...
```







## 实现 https

- 由 ngx_http_ssl_module 模块提供
- 官方文档：https://nginx.org/en/docs/http/ngx_http_ssl_module.html
- 执行nginx -V 查看是否开启 --with-stream_ssl_module 模块，否则无法使用https，编译安装需指定开启次模块

### 查看nginx是否支持https

- nginx -V默认为标准错误输出，需要将其改为标准输出

```bash
# nginx -V 2>&1|grep with-stream_ssl_module
...with-stream_ssl_module...
```

### https常用参数说明

- Context:	http, server

```bash
listen 443 ssl;
#启用ssl

ssl_certificate /path/to/file
#证书文件路径，即网站的证书+CA的证书两者合并，一般是crt文件

ssl_certificate_key /path/to/file
#私钥文件路径，一般是key文件或pem文件

ssl_protocols [SSLv2] [SSLv3] [TLSv1] [TLSv1.1] [TLSv1.2] [TLSv1.3];
#支持的ssl协议版本，早期为ssl现在是TLS，默认为：[TLSv1] [TLSv1.1] [TLSv1.2]，正常默认值即可，无需配置

ssl_session_cache off | none | [builtin[:size]] [shared:name:size];
#配置ssl缓存，默认为none
#off：关闭缓存
#none：不允许使用会话缓存：nginx告诉客户端可以重用会话，但实际上不在缓存中存储会话参数,即告诉客户端支持缓存 但实际未启用缓存
#[builtin[:size]]：内置于OpenSSL中的缓存,为每个worker进程私有，比较消耗内存，生产中不常用
#[shared:name:size]：在各worker直接使用一个共享的缓存，需要定义一个缓存名称和缓存空间大小，一兆可以存储4000个会话信息，多个虚拟主机可以使用相同的缓存名称，生产中常用

ssl_session_timeout time;
#缓存超时时间，默认五分钟
```



### 实现单域名https

```bash
#将证书文件导入到服务端
#创建证书相关目录
[root@aliyun ~]# mkdir /apps/nginx/certs

#将证书文件导入到此目录
[root@aliyun ~]# ls /apps/nginx/certs/
5464846_www.xiangzheng.vip.key  5464846_www.xiangzheng.vip.pem

------------------------------------------------------------------------------

#修改服务端配置文件
# vim /apps/nginx/conf.d/pc.conf
    server {
        listen 80; #也可以添加
        listen 443 ssl; #启用ssl，可以与
        server_name www.xiangzheng.vip;
        ssl_certificate /apps/nginx/certs/5464846_www.xiangzheng.vip.pem; #
        ssl_certificate_key /apps/nginx/certs/5464846_www.xiangzheng.vip.key; #
        ssl_session_cache shared:sslcache:20m; #worker共享缓存，1m大约可以储存4000个会话信息
        ssl_session_timeout 10m; #缓存有效时长，默认5m(5分钟)
         
        location / {
            root /data/nginx/html/pc/;
        }
}

------------------------------------------------------------------------------

#测试
[root@centos8 ~]# ss -ntlp|grep nginx
LISTEN    0         128                0.0.0.0:80               0.0.0.0:*        users:(("nginx",pid=10408,fd=9),("nginx",pid=10407,fd=9))                      
LISTEN    0         128                0.0.0.0:443              0.0.0.0:*        users:(("nginx",pid=10408,fd=10),("nginx",pid=10407,fd=10)) 

#访问测试
[root@centos8 ~]# curl -k https://www.azheng.com/
pc index.html
```



### 实现多域名https

- 基于Nginx的SNI功能实现，SNI解决了一个Nginx服务器内使用一个IP绑定多个域名和证书的功能
- SNI具体功能是客户端在连接到服务器建立SSL链接之前先向服务器发送要访问网站的域名，然后服务器在根据这个域名返回给客户端一个合适的证书
- **注意：因为listen字段只能添加在server语句块中，所以两个虚拟主机必须都添加 listen 443  ssl; 否则将无法生效，如果只添加了一个，那么另外一台虚拟主机的https访问将被跳转到这台添加的虚拟主机上**

```bash
# cat /apps/nginx/conf/conf.d/mobile.conf
server {
    listen 80;
    listen 443  ssl;
    server_name  www.m.azheng.com;
    root /data/web/mobile/html;
    error_page 404 =302 /index.html;

    ssl_certificate /apps/nginx/certs/www.m.azheng.com/www.m.azheng.com.pem;
    ssl_certificate_key /apps/nginx/certs/www.m.azheng.com/www.m.azheng.com.key;
    ssl_session_cache shared:sslcache:20m;
    ssl_session_timeout 10m;

    location / {
    }
}

# cat /apps/nginx/conf/conf.d/pc.conf 
server {
    listen       80;
    listen 443 ssl;
    server_name  www.azheng.com;
    root /data/web/pc/html;
    error_page 404 =302 /index.html;

    ssl_certificate /apps/nginx/certs/www.azheng.com/www.azheng.com.pem;
    ssl_certificate_key /apps/nginx/certs/www.azheng.com/www.azheng.com.key;
    ssl_session_cache shared:sslcache:20m;
    ssl_session_timeout 10m;

    location / {
    }
}


------------------------------------------------------------------------------
#测试访问
[root@centos8 ~]# curl -k https://www.m.azheng.com/
mobile index.html
[root@centos8 ~]# curl -k https://www.azheng.com/
pc index.html
```



```nginx
[root@aliyun ~]# vim /apps/nginx/conf/nginx.conf
    server {
        listen 443 ssl;
        server_name www.xiangzheng.vip;
        ssl_certificate /apps/nginx/certs/5464846_www.xiangzheng.vip.pem;
        ssl_certificate_key /apps/nginx/certs/5464846_www.xiangzheng.vip.key;
        ssl_session_cache shared:sslcache:20m; # worker共享缓存，1m可以储存4000个会话信息
        ssl_session_timeout 10m; # 缓存有效时长，默认5m(5分钟)
...
```

### ---

创建自签名证书并将 Nginx 配置为 HTTPS 需要几个步骤。以下是详细的流程：

#### 1. 生成自签名证书和私钥

首先，你需要创建一个自签名证书和与之对应的私钥。可以使用 `openssl` 工具来完成这项工作。

##### 步骤 1：生成私钥

运行以下命令生成一个 2048 位的 RSA 私钥：

```bash
openssl genpkey -algorithm RSA -out /etc/nginx/ssl/nginx.key -aes256

# 如果你不希望对私钥进行加密保护，可以省略 -aes256 选项，并且不会要求输入密码：
openssl genpkey -algorithm RSA -out nginx.key
```

你也可以使用 `openssl genrsa` 来生成私钥，但 `genpkey` 是更推荐的方式。

##### 步骤 2：生成证书签名请求（CSR）

你可以使用生成的私钥来创建一个证书签名请求（CSR）。虽然你是创建自签名证书，生成 CSR 的步骤仍然很重要：

```bash
openssl req -new -key /etc/nginx/ssl/nginx.key -out /etc/nginx/ssl/nginx.csr
```

系统会提示你输入一些信息，比如国家、组织、域名等。对于自签名证书，你可以随意填写，但是最重要的是 `Common Name`（CN）字段应填写你的域名或 IP 地址。

如果你想避免手动输入某些信息，可以通过一个 `openssl` 配置文件来提前设置这些字段，或者使用命令行参数来提供部分信息。以下是一个示例，演示如何通过命令行传递一些基本字段：

```bash
openssl req -new -key /etc/nginx/ssl/nginx.key -out /etc/nginx/ssl/nginx.csr \
    -subj "/C=CN/ST=Beijing/L=Beijing/O=My Company/OU=IT Department/CN=yourdomain.com/emailAddress=admin@yourdomain.com"
```

这条命令使用 `-subj` 参数直接在命令行中提供了证书的常见字段信息，省去了交互式输入。

- `C`：国家（Country）
- `ST`：省/自治区（State）
- `L`：城市（Locality）
- `O`：组织名称（Organization）
- `OU`：组织单位（Organizational Unit）
- `CN`：通用名称（Common Name），即你的域名或 IP 地址
- `emailAddress`：电子邮件地址

##### 步骤 3：生成自签名证书

接下来，使用 CSR 和私钥生成自签名证书：

```bash
openssl x509 -req -days 365 -in /etc/nginx/ssl/nginx.csr -signkey /etc/nginx/ssl/nginx.key -out /etc/nginx/ssl/nginx.crt
```

这会生成一个有效期为 365 天的自签名证书 `nginx.crt`。

#### 2. 配置 Nginx 使用 HTTPS

##### 步骤 1：创建 SSL 证书和密钥目录

确保 Nginx 有合适的目录来存放证书和私钥：

```bash
mkdir -p /etc/nginx/ssl
mv /path/to/nginx.crt /etc/nginx/ssl/
mv /path/to/nginx.key /etc/nginx/ssl/
```

##### 步骤 2：修改 Nginx 配置

编辑 Nginx 配置文件，通常是 `/etc/nginx/nginx.conf` 或者 `/etc/nginx/sites-available/default`。

1. 找到你的 `server` 配置块，如果没有，创建一个新的 `server` 块：

```nginx
server {
    listen 443 ssl;
    server_name your_domain_or_ip;

    ssl_certificate /etc/nginx/ssl/nginx.crt;
    ssl_certificate_key /etc/nginx/ssl/nginx.key;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers on;

    location / {
        root /var/www/html;
        index index.html index.htm;
    }
}
```

1. 这样配置将 Nginx 设为监听 HTTPS 的 443 端口，并指向你刚才创建的证书和私钥文件。

##### 步骤 3：重定向 HTTP 到 HTTPS（可选）

如果你希望所有 HTTP 流量（端口 80）自动重定向到 HTTPS，你可以添加一个 HTTP 到 HTTPS 的重定向 `server` 配置块：

```nginx
server {
    listen 80;
    server_name your_domain_or_ip;

    return 301 https://$host$request_uri;
}
```

##### 步骤 4：检查配置并重载 Nginx



在修改配置文件后，先检查配置是否正确：

```bash
sudo nginx -t
```

如果输出显示没有错误，重新加载 Nginx 配置：

```bash
sudo systemctl reload nginx
```

#### 3. 测试 HTTPS

现在，你可以通过访问 `https://your_domain_or_ip` 来测试 HTTPS 是否正常工作。如果你使用的是自签名证书，浏览器会警告证书不被信任，这是正常的，因为证书没有被权威证书机构（CA）签署。你可以手动添加信任，或者继续使用它进行测试。

#### 4. 防火墙设置（如果适用）

确保防火墙允许 HTTPS 流量。以 `ufw` 为例，允许 443 端口的流量：

```bash
sudo ufw allow 443/tcp
sudo ufw reload
```

#### 总结

通过以上步骤，你已经成功创建了一个自签名证书，并将 Nginx 配置为支持 HTTPS。虽然自签名证书适用于测试环境，但在生产环境中，建议使用由受信任证书颁发机构（CA）签发的证书。



## 实现 HSTS

- HTTP严格传输安全协议（英语：HTTP Strict Transport Security，简称：HSTS），是一套由互联网工程任务组发布的互联网安全策略机制。网站可以选择使用HSTS策略，来让浏览器强制使用HTTPS与网站进行通信，以减少会话劫持风险。
- 官方文档：https://www.nginx.com/blog/http-strict-transport-security-hsts-and-nginx/
- **注意：配置rewrite才能实现http跳转到https**

### 范例

```nginx
server {
    listen 443 ssl;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # This 'location' block inherits the STS header
    location / {
        root /usr/share/nginx/html;
    }

    # Because this 'location' block contains another 'add_header' directive,
    # we must redeclare the STS header
    location /servlet {
        add_header X-Served-By "My Servlet Handler";
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
        proxy_pass http://localhost:8080;
    }
}
```







## favicon.ico

- favicon.ico 文件是浏览器收藏网站时显示的图标 也是 网页顶部菜单栏显示的图标
- 当客户端使用浏览器访问页面时，浏览器会主动发起请求在服务上寻找 favicon.ico 来获取图标
- 如找不到会在浏览器详情页中显示404未找到，也会在服务器端日志文件中记录此信息

### 解决办法：

```nginx
#方法一：服务器不记录日志
server {
...
    location /favicon.ico {
        log_not_found off;
        access_log off;
    }
}

#方法二：定义一个图标
server {
...
    location /favicon.ico {
        root /data/web/pc/images/;
        expires 365d; #设置过期时间
    }
}
```





## Rewrite

在nginx中，rewrite指令可以用于重写URL或者修改请求的参数。以下是一些rewrite指令的用途：

1. URL重写：可以将一个URL重写成另一个URL，这对于SEO优化非常有用。例如，可以将`example.com/page?id=123`重写成`example.com/page/123`，这样更易于阅读和记忆，并且搜索引擎也更容易识别和索引。
2. 路径重写：可以将请求的文件路径重写成其他路径，这可以用于在不更改应用程序代码的情况下更改应用程序的目录结构。例如，可以将`example.com/app1/index.html`重写成`example.com/app2/index.html`。
3. 参数重写：可以修改请求的参数或者添加新的参数。这可以用于在不更改应用程序代码的情况下添加新的功能。例如，可以将`example.com/page?id=123`重写成`example.com/page?id=123&lang=en`，这样可以将语言参数添加到请求中。
4. 重定向：可以将请求重定向到其他URL或者网站。例如，可以将`example.com`重定向到`www.example.com`，这可以用于将所有的流量都重定向到主域名上。

总之，nginx中的rewrite指令非常有用，可以帮助开发人员更好地控制和管理请求，使应用程序更加灵活和可维护。



### Rewrite  先决条件

- 由 ngx_http_rewrite_module 模块实现，并且使用 PCRE 正则表达式更改请求 URI、返回重定向和条件选择配置，因此依赖PCRE，编译安装时需要安装PCRE库

  - ```sh
    # centos安装PCRE
    yum -y install pcre pcre-devel
    ```

- **注意：编译安装时不要加此选项，否则会禁用rewrite**

  - ```bash
    --without-http_rewrite_module      disable ngx_http_rewrite_module
    ```

参考文档：

- https://nginx.org/en/docs/http/ngx_http_rewrite_module.html
- http://www.pcre.org/





### Rewrite 相关指令

以下是nginx中常用的rewrite相关指令：

- **rewrite**：用于重写URL或者修改请求的参数。例如：`rewrite ^/page/(.*)$ /page?id=$1 last;`将`example.com/page/123`重写成`example.com/page?id=123`。
- **return**：用于返回指定的HTTP状态码和响应。例如：`return 301 http://www.example.com;`将请求重定向到`www.example.com`。
- **if**：用于根据某个条件执行指定的操作。例如：`if ($request_uri ~* ^/page/(.*)) { rewrite ^/page/(.*)$ /page?id=$1 last; }`如果请求的URI匹配`/page/`，则执行重写操作。
- **set**：用于设置变量的值。例如：`set $lang en;`设置变量`$lang`的值为`en`。
- **break**：用于终止当前指令块的执行。例如：`if ($request_uri ~* ^/page/(.*)) { rewrite ^/page/(.*)$ /page?id=$1 break; }`如果请求的URI匹配`/page/`，则执行重写操作并终止执行。

总之，rewrite相关指令可以帮助开发人员更好地控制和管理请求，使应用程序更加灵活和可维护。





### if

- if 用于条件匹配判断，并根据条件判断结果选择不同的nginx配置
- 注意：nginx的 if 语法只能实现单次判断，不支持 if else 或 if elif 这样的多重判断
- https://nginx.org/en/docs/http/ngx_http_rewrite_module.html#if

```nginx
Syntax:	if (condition) { ... }
Default:	—
Context:	server, location

# Syntax：
if (条件匹配) {
    action
}
```




#### 匹配参数说明

- 使用正则表达式对变量进行匹配，匹配成功时if指令认为是true，反之为false
- **变量与表达式之间**可以使用以下符号链接：

```bash
=   #比较变量和字符串是否相等
!=  #比较变量和字符串是否不相等

~   #区分大小写字符，判断是否匹配，可以通过正则表达式匹配
!~  #区分大小写字符，判断是否不匹配，可以通过正则表达式匹配

~*  #不区分大小写字符，判断是否匹配，可以通过正则表达式匹配
!~* #不区分大小写字符，判断是不否匹配，可以通过正则表达式匹配

-f 和 !-f   #判断请求的文件是否存在和是否不存在
-d 和 !-d   #判断请求的目录是否存在和是否不存在
-e 和 !-e   #判断请求的文件或目录是否存在和是否不存在（包括文件、目录、软连接）
-x 和 !-x   #判断文件是否可执行和是否不可执行
```

#### if 范例

- 条件成立则执行action的内容，反之则不执行

```nginx
location /main {
    if ( $scheme = http ) {
    echo "if---> $scheme";
 }
    if ( $scheme = https ) {
    echo "if---> $scheme";
 }
    if ( -f $request_filename ) {
    echo "$request_filename is exist";
 }
    if ( !-e $request_filename ) {
    echo "$request_filename is not exist";
 }
```

- 如果访问的ip地址为192.168.9.115,则返回403

```nginx
if ($remote_addr = 192.168.9.115) {
    return 403;
}
```

- 不允许谷歌浏览器访问 如果是谷歌浏览器返回500

```nginx
if ($http_user_agent ~ Chrome) {
    return 500;
}
```





- 





### set

- set 可以实现设置自定义变量
- 指定key并给其定义一个变量，变量可以调用nginx内置变量赋值给key
- https://nginx.org/en/docs/http/ngx_http_rewrite_module.html#set

```nginx
Syntax:	set $variable value; # value 可以是 text variables 两者间的组合
Default:	—
Context:	server, location, if
```



#### set 范例

```nginx
# vim /apps/nginx/conf/conf.d/pc.conf
server {
...
    location /echo {
    set $name azheng;
    echo "$name";
    set $my_port $server_port;
    echo "$my_port";
    echo "$server_name:$server_port";
    }
...    
}

#测试
# curl www.azheng.com/echo
azheng
80
www.azheng.com:80
```



### return

- return 可以实现向客户端返回响应状态码，如：301、302、403、500等
- **注意：处于此指令后的所有配置都将不被执行**
- https://nginx.org/en/docs/http/ngx_http_rewrite_module.html#return

```nginx
Syntax:	return code [text]; # 返回给客户端的状态码及响应报文和实体内容，可以调用变量，text如果有空格需要加单引或双引号
        return code URL; # 返回给客户端指定状态码和指定的URL地址
        return URL;
Default: —
Context: server, location, if
```



#### return 范例

- **返回给客户端指定的HTTP状态码**

```nginx
location /test_return {
    return 403;
}


# curl http://www.azheng.com/test_return
<html>
<head><title>403 Forbidden</title></head>
<body>
<center><h1>403 Forbidden</h1></center>
<hr><center>nginx/1.18.0</center>
</body>
</html>


# curl http://www.azheng.com/test_return -I
HTTP/1.1 403 Forbidden
Server: nginx/1.18.0
Date: Mon, 08 Nov 2021 11:19:58 GMT
Content-Type: text/html
Content-Length: 153
Connection: keep-alive
```

- **返回给客户端的状态码及响应报文和实体内容**

```nginx
location /test_return {
    return 999 haha;
}


# curl http://www.azheng.com/test_return -I
HTTP/1.1 999 
Server: nginx/1.18.0
Date: Mon, 08 Nov 2021 11:22:44 GMT
Content-Type: text/html
Content-Length: 4
Connection: keep-alive


# curl http://www.azheng.com/test_return
haha
```

- **返回给客户端的URL地址**

```nginx
location /test_return {
    return 302 https://www.baidu.com/;
}


# curl http://www.azheng.com/test_return
<html>
<head><title>302 Found</title></head>
<body>
<center><h1>302 Found</h1></center>
<hr><center>nginx/1.18.0</center>
</body>
</html>

# curl -L http://www.azheng.com/test_return
<!DOCTYPE html>
<!--STATUS OK--><html> <head><meta http-equiv=content-type content=text/html;charset=utf-8><meta http-equiv=X-UA-Compatible content=IE=Edge><meta content=always name=referrer><link rel=stylesheet type=text/css href=https://ss1.bdstatic.com/5eN1bjq8AAUYm2zgoY3K/r/www/cache/bdorz/baidu.min.css><title>百度一下，你就知道
```







### rewrite

- rewrite 主要是对用户请求的 URL 或 URI 做具体处理
- 通过正则表达式的匹配来改变 URL 或 URI，从而实现路径重写等操作
- 可以同时存在一个或多个指令，并按照顺序依次进行匹配
- URL重写是非常有用的功能，比如说它可以在我们改变网站的结构后，不需要客户端修改原来的书签，也无需其他网站修改我们的链接，就可以设置为访问，另外也可以一定程度上的提示网站的安全性
- https://nginx.org/en/docs/http/ngx_http_rewrite_module.html#rewrite

```nginx
# rewrite 将用户请求的 URI 基于 regex 所描述的模式进行检查，匹配到时将其替换为表达式指定的新的 URI
Syntax:	rewrite regex replacement [flag]; # 通过正则表达式处理用户请求并返回替换后的数据包
Default:	—
Context:	server, location, if


# flag 有 last、break、redirect、permanent
# last 和 break 属于代理型，即在WEB服务器内部实现跳转
# redirect 和 permanent 属于跳转型，即由客户端浏览器重新对新地址进行请求
```

**rewrite 注意事项**

- 如果在同一级配置块中存在多个rewrite规则，那么会自上而下逐个检查；被某条件规则替换完成后，会重新一轮的替换检查，隐含有循环机制，但不超过十次；如果超过会提示500响应码，[flag]所表示的标志位用于控制此循环机制
- 如果替换后的URL是以http://或https://开头，则替换结果会直接以 永久重定向301的方式 返回给客户端



#### last

- 在 Nginx 的 rewrite 模块中，last 是一个常用的指令，它的作用是重新开始新的匹配，以便进一步处理。通常用于执行内部重定向，即将客户端的请求重新路由到另一个 URI 上。
- 在 rewrite 规则中，last 指令必须放在指令的最后，表示终止当前规则，并重新开始匹配。
- 当 Nginx 匹配到带有 last 指令的规则时，它会将客户端请求的 URI 重新从头开始匹配，直到找到新的匹配规则或无法再进行匹配。
- **last 指令的特点如下：**
  - last 指令必须放在 rewrite 规则的最后，否则可能导致规则无法正常匹配。
  - last 指令将终止当前规则，并重新开始匹配，因此必须谨慎使用，以避免陷入死循环。
  - last 指令通常用于执行内部重定向，但也可以用于实现循环规则。
- **last 指令总结**
  - last 指令是 Nginx rewrite 模块中一个非常有用的指令，它可以重新开始新的匹配，以便进一步处理。
  - 它通常用于执行内部重定向，或实现循环规则。
  - 在使用 last 指令时，必须注意将其放在 rewrite 规则的最后，并避免陷入死循环。
- **last 指令的语法：`last;`**



- last 可以停止处理后续的 rewrite 指令集 并开始搜索与更改的 URI 匹配的新位置

- 不建议在location中使用
- 适用于一个URL多次重写，要注意避免出现超过十次以及URL重写后返回错误给用户
- 对某个location的URL匹配成功后，会停止执行当前location后续的rewrite规则，并结束当前location，然后继续匹配后续的location，直到没有匹配的location后 则将最后一次的结果返还给客户端



**nginx rewrite 中的 last 表示终止当前规则，并根据新的 url 从头开始匹配 location，我理解的对吗**

- 您的理解基本上是正确的。在 Nginx 的 Rewrite 模块中，"last" 指令表示将当前规则作为最后一条规则执行，并且根据重写后的 URL 重新匹配一次 location 规则集。这个重写后的 URL 是指使用 rewrite 规则修改后的 URL。
- **当一个 Rewrite 规则使用 "last" 指令时，Nginx 将使用新的重写后的 URL 重新开始匹配 location 规则集。**这意味着 Nginx 将会重新查找与新 URL 匹配的 location 块，并且使用这个新的 URL 和新的 location 块来处理请求。
- **需要注意的是，如果新 URL 与当前 URL 匹配的 location 块相同，则该规则将被无限循环执行，直到达到 Nginx 配置中指定的最大重定向次数或者达到了某种限制。因此，当使用 "last" 指令时，确保重写后的 URL 与期望的 location 块匹配。**



##### last 使用场景

- last 指令通常用于执行内部重定向。例如，当客户端请求的 URI 不符合特定的规则时，可以将其重定向到新的 URI。



##### last 指令使用示例

###### 示例一

- 在这个示例中，当客户端请求 URI "/old-url" 时，Nginx 将其重写为 "/new-url"，并重新开始匹配。
- 这可以让 Nginx 将新的 URI 路由到不同的位置进行进一步处理。

```nginx
location /old-url {
    rewrite ^/old-url(.*)$ /new-url$1 last;
}
```

###### 示例二

- 除了执行内部重定向外，last 指令还可以用于实现循环规则。例如，以下规则将把所有的 /a/URI/ 转换为 /b/URI/，直到无法进行转换：
- 在这个规则中，last 指令的作用是在每次匹配后重新开始匹配，直到无法再匹配为止。

```nginx
location /a/ {
    rewrite ^/a/(.*)$ /b/$1 last;
}
```



#### break

- 在 Nginx 的 rewrite 模块中，break 指令用于停止当前的 rewrite 操作，并将处理流程转交给 Nginx 的其他模块进行处理。
- 在 rewrite 规则中，break 指令可以出现在任意位置，表示终止当前规则，并将处理流程交给 Nginx 的其他模块进行处理。
- break 与 last 指令不同，break 指令会立即停止当前的 rewrite 操作，并将控制权交回到 Nginx 的主处理流程中。
- **break 指令的特点如下：**
  - break 指令可以出现在 rewrite 规则的任意位置，表示立即停止当前的 rewrite 操作，并将控制权交给 Nginx 的其他模块进行处理。
  - break 指令与 last 指令不同，last 指令会重新开始匹配，而 break 指令则立即停止当前的 rewrite 操作，并将控制权交给 Nginx 的其他模块进行处理。
  - break 指令通常用于在 rewrite 规则中终止当前的操作，并将控制权交给其他模块进行处理。
- **break 指令总结：**
  - break 指令是 Nginx rewrite 模块中一个非常有用的指令，它可以立即停止当前的 rewrite 操作，并将控制权交给 Nginx 的其他模块进行处理。
  - 与 last 指令不同，break 指令不会重新开始匹配，而是直接将处理流程转交给其他模块进行处理。
  - 在使用 break 指令时，必须注意将其放在 rewrite 规则的正确位置，以确保能够正确地终止当前的操作。
- **break 指令的语法：`break;`**



- 一旦 rewrite 匹配成功 则 中断后续 ngx_http_rewrite_module 模块指令集的操作，但位于 break 前面的配置 和 后续非 rewrite 指令还会正常执行
- 停止处理后续的 rewrite 指令集
- 建议在 location 中使用
- 适用于一个 URL 一次重写



##### break 使用场景

break 指令通常用于在 rewrite 规则中终止当前的操作，并将控制权交给 Nginx 的其他模块进行处理。

例如，以下规则将把所有以 /static/ 开头的 URI 转发给静态文件处理模块进行处理：

```nginx
location /static/ {
    break;
}
```

在这个规则中，当客户端请求 URI 以 /static/ 开头时，Nginx 将立即停止当前的 rewrite 操作，并将控制权交给 Nginx 的静态文件处理模块进行处理。



##### break 范例一

```nginx
if ($slow) {
    limit_rate 10k;
    break; # 中断下面ngx_http_rewrite_module模块的指令（location块中其他后续指令还会正常执行）
}
```

##### break 范例二

- 1

```nginx
location /test_break {
    set $name1 xiaoming;
    echo $name1;
    set $name2 xiaohong;
    echo $name2;
    #break;
    set $name3 xiaoqiang;
    echo $name3;
    echo $server_port;
}


# 执行结果
# curl http://www.azheng.com/test_break
xiaoming
xiaohong
xiaoqiang
80
```

- 2

```nginx
location /test_break {
    set $name1 xiaoming;
    echo $name1;
    set $name2 xiaohong;
    echo $name2;
    break;
    set $name3 xiaoqiang;
    echo $name3;
    echo $server_port;
}

# 执行结果
# 因为加入了break，而set恰好属于rewrite模块所以name3的变量不会赋值
# 而echo $server_port; 不属于rewrite模块，所以可以正常显示
# curl http://www.azheng.com/test_break
xiaoming
xiaohong

80
```



#### redirect

- redirect 可以实现临时重定向 302（域名暂时用这个，以后可能还会改变）
  - 临时重定向的特定是域名解析记录不会缓存到客户端浏览器中




在 Nginx 的 rewrite 模块中，redirect 指令用于将客户端请求重定向到指定的 URL。

通常情况下，redirect 指令会返回一个 302 临时重定向响应，告诉客户端请求的资源已经临时移动到另一个 URL 上。

**语法**

redirect 指令的语法如下：

```nginx
redirect [http code] URL;
# http code 是可选的 HTTP 状态码，默认为 302
# URL 是要重定向到的目标 URL
# 在 rewrite 规则中，redirect 指令通常用于将客户端请求重定向到其他 URL，以实现 URL 重写和重定向的功能。
```

**使用场景**

redirect 指令通常用于以下场景：

**1. 重写 URL**

使用 redirect 指令可以将客户端请求重定向到指定的 URL。例如，以下规则将把所有以 /old/ 开头的 URI 重定向到以 /new/ 开头的 URI：

```nginx
location /old/ {
    redirect 302 /new$request_uri;
}
```

在这个规则中，当客户端请求 URI 以 /old/ 开头时，Nginx 将返回一个 302 临时重定向响应，并将客户端重定向到以 /new/ 开头的 URI。其中，$request_uri 是 Nginx 的一个内置变量，它包含客户端请求的 URI。

**2. 实现访问限制**

使用 redirect 指令可以实现访问限制，例如禁止客户端访问某些敏感资源。例如，以下规则将禁止客户端访问 /admin/ 目录下的所有资源，并将客户端重定向到 /login 页面：

```nginx
location /admin/ {
    if ($remote_addr != 127.0.0.1) {
        redirect 302 /login;
    }
}
```

在这个规则中，如果客户端的 IP 地址不是 127.0.0.1，则 Nginx 将返回一个 302 临时重定向响应，并将客户端重定向到 /login 页面。

**特点**

redirect 指令的特点如下：

- redirect 指令用于将客户端请求重定向到指定的 URL。
- redirect 指令通常返回一个 302 临时重定向响应，告诉客户端请求的资源已经临时移动到另一个 URL 上。
- redirect 指令可以指定 HTTP 状态码和目标 URL。

**总结**

- redirect 指令是 Nginx rewrite 模块中一个非常有用的指令，它可以将客户端请求重定向到指定的 URL。
- 在使用 redirect 指令时，必须注意指定正确的 HTTP 状态码和目标 URL，以确保能够正确地实现 URL



#### permanent

- 永久重定向301（域名以后不会再更改）
  - 永久重定向的特点是域名解析记录会缓存到客户端浏览器中




在 Nginx 的 rewrite 模块中，permanent 指令用于将客户端请求永久重定向到指定的 URL。与 redirect 指令不同，permanent 指令会返回一个 301 永久重定向响应，告诉客户端请求的资源已经永久移动到另一个 URL 上。在本文中，我们将详细介绍 permanent 指令的使用和特点。

**语法**

permanent 指令的语法如下：

```nginx
permanent URL;
```

其中，URL 是要永久重定向到的目标 URL。在 rewrite 规则中，permanent 指令通常用于将客户端请求永久重定向到其他 URL，以实现 URL 重写和重定向的功能。

**使用场景**

permanent 指令通常用于以下场景：

**1. 重写 URL**

使用 permanent 指令可以将客户端请求永久重定向到指定的 URL。例如，以下规则将把所有以 /old/ 开头的 URI 永久重定向到以 /new/ 开头的 URI：

```nginx
location /old/ {
    permanent /new$request_uri;
}
```

在这个规则中，当客户端请求 URI 以 /old/ 开头时，Nginx 将返回一个 301 永久重定向响应，并将客户端永久重定向到以 /new/ 开头的 URI。其中，$request_uri 是 Nginx 的一个内置变量，它包含客户端请求的 URI。

**2. 实现访问限制**

使用 permanent 指令可以实现访问限制，例如禁止客户端访问某些敏感资源。例如，以下规则将禁止客户端访问 /admin/ 目录下的所有资源，并将客户端永久重定向到 /login 页面：

```nginx
location /admin/ {
    if ($remote_addr != 127.0.0.1) {
        permanent /login;
    }
}
```

在这个规则中，如果客户端的 IP 地址不是 127.0.0.1，则 Nginx 将返回一个 301 永久重定向响应，并将客户端永久重定向到 /login 页面。

**特点**

permanent 指令的特点如下：

- permanent 指令用于将客户端请求永久重定向到指定的 URL。
- permanent 指令通常返回一个 301 永久重定向响应，告诉客户端请求的资源已经永久移动到另一个 URL 上。
- permanent 指令只能指定目标 URL，不能指定 HTTP 状态码。

**总结**

permanent 指令是 Nginx rewrite 模块中一个非常有用的指令，它可以将客户端请求永久重定向到指定的 URL。在使用 permanent 指令





#### 范例：last 和 break的区别

在 Nginx 的 rewrite 模块中，last 和 break 是两个常用的指令，它们的作用是不同的。

- **last 指令**： last 指令用于终止当前 rewrite 规则集的处理，并重新开始新的匹配，以便进一步处理。它通常用于执行内部重定向，即将客户端的请求重新路由到另一个 URI 上。当一个 rewrite 规则使用 last 指令时，Nginx 会重新从头开始处理 URI，并尝试将其匹配到新的规则集。

例如，假设有如下的 rewrite 规则：

```nginx
rewrite ^/old-url$ /new-url last;
```

如果客户端请求 URI "/old-url"，则 Nginx 会将其重写为 "/new-url"，并尝试重新匹配规则集，以便进一步处理新的 URI。

- **break 指令**： break 指令用于终止当前 rewrite 规则的处理，并返回处理结果。它通常用于执行条件分支或在满足某些条件时停止处理。

例如，假设有如下的 rewrite 规则：

```nginx
rewrite ^/api/(.*)$ /index.php?$1 break;
```

如果客户端请求的 URI 包含 "/api/"，则 Nginx 会将其重写为 "/index.php"，并将其余部分作为查询字符串传递给 index.php。在这个规则中，如果 break 指令没有被使用，那么 Nginx 会继续处理其它的 rewrite 规则，而 break 指令则会停止处理，并将结果返回给客户端。

总之，last 和 break 指令的区别在于它们终止规则集的方式不同：last 重新开始匹配，而 break 返回结果并停止处理。



##### 环境准备

```bash
# 准备目录
mkdir -p /data/web/pc/html/{rewrite,test1,test2}

# 准备页面
echo 'rewrite' > /data/web/pc/html/rewrite/index.html
echo 'test1' > /data/web/pc/html/test1/index.html
echo 'test2' > /data/web/pc/html/test2/index.html

# 注意权限
chown -R nginx.nginx /data/web/
```

##### break 范例

```nginx
# vim /apps/nginx/conf.d/pc.conf 
server {
    listen 80;
    server_name www.xiangzheng.com;
    root /data/web/pc/html/;

    location /break {
        rewrite ^/break/(.*) /test1/$1 break; # break匹配成功后不再向下匹配rewrite模块中的指令集，即直接结束匹配然后将数据直接返还给客户端，即 /test1 中的内容
        rewrite ^/test1/(.*) /test2/$1 break;
    }

    location /test1 {
        return 666 "test1 page";
    }

    location /test2 {
        return 888 "test2 page";
    }
}


# 测试访问
# curl -Li http://www.xiangzheng.com/break/;echo
HTTP/1.1 666 
Server: nginx/1.18.0
Date: Sun, 16 Jan 2022 04:45:41 GMT
Content-Type: text/html
Content-Length: 10
Connection: keep-alive

test1 page # 即 /test1 中的内容，结果显示没有继续向下匹配test2的内容，而是直接显示test1的内容
```

- 是的，你的理解是正确的。当请求匹配 `location /break` 块时，第一个 `rewrite` 规则将 URI 改为 `/test1/$1`，第二个 `rewrite` 规则进一步将其改为 `/test2/$1`。然而，由于 `rewrite` 指令使用了 `break` 标志，重写后的 URI 不会再次被 `location` 块重新匹配。相反，请求会立即由 `location /test1` 块处理，返回状态码为 `666`，消息为 "test1 page" 的响应。因此，服务器返回给请求 `http://www.xiangzheng.com/break/` 的响应将如你所示。



是的，你对`break`的理解是正确的。当使用`break`标志时，Nginx会在当前location中执行第一个匹配成功的rewrite语句，并且不再执行后面的rewrite语句，直接返回结果给客户端。

在你提供的示例中，当访问`www.xiangzheng.com/break`时，首先会匹配到`location /break`中的配置，并执行`rewrite ^/break/(.*) /test1/$1 break;`语句将请求重写为`/test1/`开头的URL。

由于使用了`break`标志，Nginx不会继续向下匹配rewrite模块中的指令集，直接结束匹配然后将数据直接返回给客户端，即 `/test1` 中的内容，而不会继续执行`rewrite ^/test1/(.*) /test2/$1 break;`语句，也就不会匹配到`location /test2`的配置。

因此，你的理解是正确的。`break`标志用于在rewrite模块中终止当前location的匹配过程，并直接返回结果给客户端。



##### last 范例

```nginx
# vim /apps/nginx/conf.d/pc.conf
server {
    listen 80;
    server_name www.xiangzheng.com;
    root /data/web/pc/html/;

    location /last {
        rewrite ^/last/(.*) /test1/$1 last; # 如果此行未匹配，则会继续向下匹配，再将最后的结果返还给客户端，即匹配首先到达/test1，而后又由 /test1 rewrite 到了 /test2
        rewrite ^/test1/(.*) /test2/$1 last;
    }

    location /test1 {
        rewrite ^/test1/(.*) /test2/$1 last;
        return 666 "test1 page";
    }

    location /test2 {
        return 888 "test2 page";
    }
}


#测试访问
[root@clicent ~]#curl -Li www.xiangzheng.com/last;echo
HTTP/1.1 301 Moved Permanently
Server: nginx/1.18.0
Date: Sun, 16 Jan 2022 06:35:36 GMT
Content-Type: text/html
Content-Length: 169
Location: http://www.xiangzheng.com/last/
Connection: keep-alive

HTTP/1.1 888 
Server: nginx/1.18.0
Date: Sun, 16 Jan 2022 06:35:36 GMT
Content-Type: text/html
Content-Length: 10
Connection: keep-alive

test2 page # /test2 中的内容
```

根据你提供的nginx配置和测试访问结果，可以看出以下情况：

1. 当访问`www.xiangzheng.com/last`时，首先会匹配到`location /last`中的配置，并执行`rewrite ^/last/(.*) /test1/$1 last;`语句将请求重写为`/test1/`开头的URL。
2. 然后，执行新的URL `/test1/`对应的`location /test1`配置，其中包含`rewrite ^/test1/(.*) /test2/$1 last;`语句，将请求重写为`/test2/`开头的URL。
3. 经过第二步的重写后，Nginx继续查找与新URL匹配的location配置，此时匹配到`location /test2`的配置，根据该配置返回响应码为888和内容为"test2 page"的响应。

因此，你的理解是正确的。**当使用`last`标志时，Nginx会停止在当前location中查找，并执行新的URL匹配到的location中的配置。**在这个过程中，可能会多次进行重写和匹配操作，直到匹配到最终的location配置或者达到重定向次数的限制。



##### 总结

- **last 与 break 都停止处理后续 rewrite 指令集，但是 last 会对重写后的新规则重新发起一个新请求，并重新匹配后续的 location。**

  - 不完全正确。
  - 使用 `last` 指令，会让 Nginx 重新以新的 URL 向匹配成功的 `location` 块重新发送一次请求。这时新的 URL 已经被重写，所以重新请求时会匹配到新的 `location` 块。如果新的 `location` 块也存在 `rewrite` 指令，则会按照新的规则进行重写。
  - 而使用 `break` 指令，不会重新发送请求，而是直接结束重写处理，并将结果返回给客户端。因此，`break` 不会导致重新请求和重新匹配 `location` 块。

- **last 和 break 当出现在 location 之外时，两者的作用是一致的没有任何差异**

  - 当 `last` 和 `break` 出现在 `location` 之外时，它们的作用是一致的，都会终止 Nginx 的当前指令集的处理，即停止匹配和处理后续的指令。这是因为 `last` 和 `break` 的作用范围都只限于当前指令集，出了这个指令集后，它们的作用就结束了，不再对后续指令产生任何影响。
  - 这也就意味着，当 `last` 和 `break` 出现在 `location` 之外时，它们不会像在 `location` 内部那样重新发起一个新的请求，也不会终止 Nginx 的整个请求处理过程。它们只会停止当前指令集的处理，然后将控制权交回到上一级指令集，由上一级指令集继续处理后续的指令。

- **last 和 break 当出现在 location 内部时，两者就存在了差异**

  - 在 `location` 内部使用 `last` 和 `break` 的主要区别在于它们的匹配流程和处理方式不同。
- 使用 `last` 时，Nginx 会将当前请求重新定向到新的 URL 上，并对其进行匹配处理，类似于一个新的请求。这个新的请求会再次经过所有的 `location` 块，并尝试匹配合适的块来处理请求。因此，`last` 可以实现 URL 的内部重定向，并重新处理匹配到的 `location`。
  - 而使用 `break` 时，Nginx 会在当前 `location` 中停止处理并返回结果，不会将请求发送到新的 URL 上，并且不会再次尝试匹配其他的 `location` 块。因此，`break` 会直接中断当前 `location` 的处理，并返回处理结果。
- 总之，当使用 `last` 时，Nginx 会重新处理 URL，并继续匹配后续的 `location` 块，而使用 `break` 时，Nginx 会停止当前 `location` 的处理并返回结果，不再进行任何匹配操作。

- **使用 root 指定源时使用 break 和 last 都可以，使用 alias 指定源时必须使用last**

  - 这是因为 `alias` 和 `root` 在处理请求时的行为不同。
  - 当使用 `root` 时，Nginx 会将请求的 URI 与 `root` 中指定的路径拼接起来，得到文件在文件系统中的真实路径。然后，Nginx 将该文件的内容作为响应体返回给客户端。在这个过程中，Nginx 可以使用 `break` 或 `last` 来中止或继续处理 URI 重写规则。
  - 当使用 `alias` 时，Nginx 会将请求的 URI 的匹配部分替换为 `alias` 中指定的路径，得到文件在文件系统中的真实路径。然后，Nginx 将该文件的内容作为响应体返回给客户端。在这个过程中，由于 `alias` 指令的特殊性，Nginx 只能使用 `last` 来继续处理 URI 重写规则。使用 `break` 可能会导致文件路径计算错误，返回错误的响应或者发生其他异常。




#### 范例：静态页面重写

- break 适用于不改变客户端访问方式，但是要将访问的目的 URL 做单次重写的场景

- 如：有v1、v2两个版本的页面共存，旧版本的页面在static不能丢失，还需将新的请求跳转到statics，这时就可以使用break来实现

```nginx
location /static {
    ...
    root /data/web/images;
    rewrite /static/(.*) /statics/$1 break; # 旧的页面直接跳转到statics
    #rewrite /(.*)/(.*) /$1s/$2 break; # 这样写是不是也行呢？
    ...
}
location /statics { # 新路径也可以直接响应请求
    ...
    root /data/web/images;
    ...
}
```

以上代码的含义如下：

- 当请求路径是以 /static 开头时，会进入第一个 location 块。
- 在第一个 location 块中，使用 rewrite 指令将请求路径中的 /static/ 替换成 /statics/，并使用 break 指令停止后续的 rewrite 操作，直接返回修改后的请求路径给下一个处理阶段。
- 修改后的请求路径会被下一个 location 块处理，即进入第二个 location 块。
- 在第二个 location 块中，使用 root 指令将请求映射到 /data/web/images 目录下的 /statics 路径，即实际请求的文件路径是 /data/web/images/statics/。
- 处理完第二个 location 块后，将会返回对应的静态文件给客户端。

因此，以上配置的作用是将 /static 目录下的静态资源请求映射到 /data/web/images/statics 目录下的对应静态资源。注意，使用 break 指令是为了防止在第一个 location 块中重复处理请求路径，从而提高性能。

因此，即使有新版本的请求进来，也会被重写到`/statics`目录下，而旧版本的请求也可以在`/static`目录下继续访问，从而保证了新旧版本的兼容性。

**rewrite /(.\*)/(.*) /$1s/$2 break; 这样写是不是也行呢？**

是的，这样写也可以实现类似的功能，即将匹配到的第一个 URI 路径中的最后一个字符去掉，并在末尾添加 "s"，然后重写请求。不过，**这样的写法可能会导致潜在的问题**。假如一个请求的 URI 路径中包含多个 "/" 字符，比如 "/foo/bar/baz"，那么使用这个重写规则，将会把 URI 重写为 "/foo/bars/baz"，显然不是我们预期的结果。相比之下，使用先匹配后重写的方式，就能更准确地对目标 URI 进行操作。





#### 范例：域名永久与临时重定向

- **永久与临时重定向的核心区别：永久重定向会缓存DNS解析记录到客户端浏览器，F12中有 from disk cache 的信息，而临时重定向不会**

- 假设因业务需要，将访问源域名www.azheng.com的请求临时重定向到www.taobao.com

```bash
[root@centos8 ~]# vim /apps/nginx/conf/conf.d/pc.conf
server {
    server_name  www.azheng.com;
    listen 80;
    listen 443 ssl;
    ssl_certificate /apps/nginx/certs/pc/www.azheng.com.pem;
    ssl_certificate_key /apps/nginx/certs/pc/www.azheng.com.key;
    ssl_session_cache shared:sslcache:20m;
    ssl_session_timeout 10m;
    root /data/web/pc/html;

    location / {
        #rewrite / https://www.taobao.com/ permanent;
        rewrite / https://www.taobao.com/ redirect;
    }
}

#访问测试
[root@18 ~]# curl -LI www.azheng.com
HTTP/1.1 302 Moved Temporarily
Server: nginx/1.18.0
Date: Mon, 08 Nov 2021 17:13:44 GMT
Content-Type: text/html
Content-Length: 145
Connection: keep-alive
Location: https://www.taobao.com/

HTTP/2 200 
server: Tengine
content-type: text/html; charset=utf-8
date: Mon, 08 Nov 2021 17:12:45 GMT
vary: Accept-Encoding
...
```



#### 范例：实现HTTP自动跳转HTTPS

##### 方法一

- 出于安全考虑，将用户的 http 请求全部自动跳转到 https
- 也可以实现部分location跳转

```bash
[root@centos8 ~]# vim /apps/nginx/conf/conf.d/pc.conf
server {
    server_name  www.azheng.com;
    listen 80;
    listen 443 ssl;
    ssl_certificate /apps/nginx/certs/pc/www.azheng.com.pem;
    ssl_certificate_key /apps/nginx/certs/pc/www.azheng.com.key;
    ssl_session_cache shared:sslcache:20m;
    ssl_session_timeout 10m;
    root /data/web/pc/html;

    location / { # 针对全站跳转
    if ( $scheme = http ){ # 如果没有加条件判断，会导致死循环（浏览器提示重定向次数过多）
        rewrite / https://$host redirect; # 不添加判断，这行会一直死循环
     }
    }
    
    location /login { # 针对特定的url跳转
    if ( $scheme = http ){ # 如果没有加条件判断，会导致死循环（浏览器提示重定向次数过多）
        rewrite / https://$host/login redirect; # /开始则匹配，然后临时重定向到https://www.azheng.com/login
     }
    }
}
```



##### 方法二

要在Nginx中实现HTTP自动跳转HTTPS，您可以使用以下配置：

```
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name yourdomain.com;
    ssl_certificate /path/to/your/cert.pem;
    ssl_certificate_key /path/to/your/key.pem;
    ...
}
```

解释一下这个配置：

第一个server块监听80端口上的HTTP请求，并使用return 301指令将所有HTTP请求重定向到HTTPS。

第二个server块监听443端口上的HTTPS请求，其中包含您的SSL证书和其他HTTPS配置。

当您完成上述更改并重新加载Nginx配置后，所有HTTP请求都将自动重定向到HTTPS。



##### 后语

**以上两种方法是不是都可以实现HTTP自动跳转HTTPS**

是的，两种方法都可以实现HTTP自动跳转HTTPS。

- 第一种方法是通过在Nginx配置中的location块中添加rewrite规则，针对全站或特定的URL请求进行HTTP到HTTPS的重定向。
- 第二种方法是通过在Nginx配置中设置监听HTTP请求的80端口，并使用return 301语句将所有HTTP请求跳转到443端口的HTTPS请求。

两种方法的目的都是将HTTP请求自动跳转到HTTPS，但具体实现方式略有不同，开发者可以根据自己的需求和实际情况选择其中一种方法。

**你更推荐哪一种**

从可维护性和清晰度的角度来看，我更推荐第二种方法。因为第二种方法将 HTTP 到 HTTPS 的跳转配置分别放在两个 server 块中，这样更加清晰易懂，也更易于维护和修改。而第一种方法将 HTTP 到 HTTPS 的跳转逻辑嵌套在每个 location 块中，容易造成混乱和重复，难以维护。此外，第二种方法的配置也更加简洁。



#### 范例：访问错误URI时重定向到主页

- 假设当用户访问公司网站时输入了一个错误的URL，可以将用户的请求自动重定向到主页

```nginx
#配置前测试
# curl www.azheng.com/dnwqewqin
<html>
<head><title>404 Not Found</title></head>
<body>
<center><h1>404 Not Found</h1></center>
<hr><center>nginx/1.18.0</center>
</body>
</html>



#配置
# /apps/nginx/conf/conf.d/pc.conf
server {
    listen 80;
    server_name www.xiangzheng.com;
    root /data/web/pc/html/;
    
    #if也可以写再外部，支持server和location语句块
    #if ( !-e $request_filename ) { 
    #    #rewrite ^(.*)$ https://www.azheng.com/index.html;
    #    rewrite ^(.*)$ /index.html;
    #}
    
    location / {
        if ( !-e $request_filename ) {
            rewrite ^(.*)$ http://www.azheng.com/index.html; # 针对浏览器的302跳转
            #rewrite ^(.*)$ /index.html; # 服务器内部跳转，即访问/data/web/pc/html/ndex.html
        }
    }
}


#配置后测试
# curl -Lk www.azheng.com/dnwqewqWEWQEMWQ
pc index.html
```



#### 范例：如果客户端是IE浏览器则跳转到指定目录

```nginx
if ( $http_user_agent ~ MSIE) {
    rewrite ^(.*)$ /mise/$1 break;
}

# 说明：^(.*)$表示的是用户输入的所有URI
# 假设：用户访问 xiangzheng.vip/1.css，则访问的是网站根目录下的/mise/1.css
```



#### 范例：单目录访问方式改为对象存储

- **要求：**
  - /20200106/static    -->   /static?id=20200106
  - /20200123/image   -->   /image?id=20200123

```nginx
rewrite ^/(\d+)/(.+)/ /$2?id=$1 last;

#说明：
# ^/(\d+)/(.+)/ 中的 ^/(\d+) 表示的是 /20200106 或 /20200123
# ^/(\d+)/(.+)/ 中的 /(.+)/ 表示的是 /static 或 /image
# 第一个括号表示分组1 即$1，第二个括号表示分组2 即$2
# /$2?id=$1 结果就是 /20200106 或 20200123 ?id= /static 或 /image
```

**rewrite ^/(\d+)/(.+)/ /$2?id=$1 last; 这样写行吗**

这个重写规则似乎不太符合要求。根据要求，需要将 `/20200106/static` 转换为 `/static?id=20200106`，将 `/20200123/image` 转换为 `/image?id=20200123`。

因此，一个更合适的重写规则可以是：

```nginx
rewrite ^/(\d+)/(static|image)/?$ /$2?id=$1 last;
```

这个规则中：

- `^/(\d+)` 匹配一个数字作为 ID，例如 `20200106`。
- `/(static|image)` 匹配 `static` 或 `image` 目录。
- `/?$` 匹配可选的结尾斜杠。
- `/$2?id=$1` 重写为 `/static?id=20200106` 或 `/image?id=20200123` 的形式。
- `last` 停止匹配其他规则，使用新的 URL 继续处理请求。



#### 范例：多目录访问方式改为对象存储

- **要求：**
  - www.xiangzheng.vip/images/20200106/1.jpg
  - 改为：
  - www.xiangzheng.vip/index.do?name=images&dir=20200106&file=1.jpg

```nginx
if ( $host ~* (.*)\.xiangzheng\.vip) {
    rewrite ^/(.*)/(\d+)/(.*)$ /index.do?name=$1&dir=$2&file=$3 last;
}
```

是的，这样的写法是可以的。这段配置使用了 if 指令判断请求的主机是否符合正则表达式 `.*\.xiangzheng\.vip`，然后使用 rewrite 指令将请求重写为 `/index.do?name=$1&dir=$2&file=$3`，其中 `$1`、`$2` 和 `$3` 分别对应括号中的三个正则表达式子匹配。最后使用 last 指令使 Nginx 重新匹配 URL 并将其发送到重写后的地址。





#### 范例：将 URI "/old-url" 重写为 "/new-url"

在 Nginx 服务器中，rewrite flag 是指用于重写 URL 的指令。它可以修改客户端请求的 URI（Uniform Resource Identifier），并将请求路由到新的位置。在 Nginx 中，rewrite flag 主要由 rewrite 模块提供支持。

rewrite 模块使用类似于正则表达式的语法来匹配 URI，并将其重写为新的 URI。例如，下面的指令可以将 URI "/old-url" 重写为 "/new-url"：

```
rewrite ^/old-url$ /new-url permanent;
```

这个指令中，"^/old-url$" 是一个正则表达式，表示匹配以 "/old-url" 开头、以该字符串结尾的 URI。"/new-url" 是重写后的 URI，"permanent" 则指示将重定向标记设置为 301，表示该重定向是永久的。

在 Nginx 中，rewrite 指令具有很多选项和参数，可以根据需要灵活配置。通过 rewrite flag，可以实现许多重写和重定向的需求，例如将 HTTP 请求重定向到 HTTPS，或将 URL 重写为更友好的形式等。



#### 范例：你问我答

你能不能出几道关于 nginx rewrite 的题目，然后我来回答，最后你看看对不对

当然可以，请看以下几个题目：

1. 将所有的 HTTP 请求跳转到 HTTPS 上。
2. 将 `/article/123` 跳转到 `/article?id=123` 上。
3. 将 `/about.php` 跳转到 `/about` 上。
4. 将 `/doc/2018/03/01` 跳转到 `/doc?id=2018-03-01` 上。
5. 将 `www.example.com` 跳转到 `example.com` 上。
6. 将 `www.example.com/path` 跳转到 `example.com/path` 上。
7. 将 `example.com` 跳转到 `www.example.com` 上。
8. 将 `example.com/path` 跳转到 `www.example.com/path` 上。
9. 将 `/image/20190401/1.jpg` 跳转到 `/img?id=20190401&name=1.jpg` 上。
10. 将 `/docs/201909/file.pdf` 跳转到 `/download?id=file.pdf` 上。

回答时请分别给出相应的 nginx 配置项。



### rewrite_log

- 设置是否开启记录 ngx_http_rewrite_module 模块日志记录到 error_log日志文件当中
- **注意：需要日志级别为 notice**
- 生产中很少使用
- https://nginx.org/en/docs/http/ngx_http_rewrite_module.html#rewrite_log

```
Syntax:	rewrite_log on | off;
Default:	rewrite_log off;
Context:	http, server, location, if
```











## 跨域

### 跨域概述

- https://help.aliyun.com/document_detail/31870.html?spm=5176.8466032.0.0.6a9d1450TWx022

![nginx跨域](/docs/基础服务/web服务/nginx/nginx跨域.png)

- **首先 跨域是浏览器同源策略实现的一种安全机制**

**跨域会导致的问题：**

- 跨域就是在原站点中加载了域名 协议 或端口不同的其他站点下的资源，这样浏览器的**同源策略**会阻止一个域的 javascript 脚本和另外一个域的内容进行交互。进而浏览器会提示报错进而无法正常展示页面

![跨域报错示例图](/docs/基础服务/web服务/nginx/跨域报错示例图.png)

- 报错说明：要在“https:html”处执行XMLHttpRequest吗？来自源“http://localhost:63342”的1已被CORS策略阻止：请求的资源上不存在“访问控制允许源”标头。

- 再比如：使用云厂商的对象存储 存储图片等场景，因为云厂商的域与源站点不属于同一个域  所以就会涉及到跨域设置

**同源策略：**

- 同源策略是由网景公司提出的一种安全策略，指的是不同目标站点和源站点的 域名、协议、端口相同 即为同源，反之则非同源，（好比一场家庭聚会的饭局，其它非家庭成员的人是不能参与就餐的，这就属于同源）
- 假设当浏览器的百度页面执行一个脚本的时候会检查这个脚本是属于哪个页面的，即检查是否同源，只有和百度同源的脚本才会被执行。如果非同源，那么在请求数据时，浏览器会在控制台中报一个异常，提示拒绝访问。



### 常见跨域情况

- 网络协议不同，如http协议访问https协议 ;
- 端口不同，如80端口访问8080端口 ;
- 域名不同，如www.test1.com访问www.test2.com ;
- 子域名不同，如abc.test1.com访问def.test1.com ;



### 跨域解决方案

- 可以通过 CORS （Cross-Origin Resource Sharing）跨域资源共享来解决

- 通过上面的浏览器报错截图我们可以看到，它提示了一个：从某某位置请求的资源被阻挡了，因为没有在响应头里发现："Access-Control-Allow-Origin"的响应头。

  - 提示很明显 也就是说**只要在跨域资源中的响应报文头中添加 Access-Control-Allow-Origin 相关的响应头即可解决跨域问题**

    - ```bash
      # 含义：允许哪些源访问本资源
      # 取值：规范的url 或 *
      Access-Control-Allow-Origin
      # 范例1：
      Access-Control-Allow-Origin * # 允许所有源都可以访问本资源
      # 范例2：
      Access-Control-Allow-Origin https://developer.mozilla.org # 只允许https://developer.mozilla.org 访问本资源
      
      ---
      
      # 含义：响应头表示是否可以将对请求的响应暴露给页面。返回true则可以，其他值均不可以。
      # 取值：true/false
      Access-Control-Allow-Credentials
      
      ---
      
      # 含义：表示此次请求中可以使用那些header字段
      # 取值：符合请求头规范的字符串 或 *
      Access-Control-Allow-Headers
      
      ---
      
      # 含义：表示此次请求中可以使用那些请求方法
      # 取值：如：GET/POST/PUT/DELETEGET/POST(多个使用逗号隔开) 或 *
      Access-Control-Allow-Methods
      ```




#### 通过 Nginx 添加响应报文头

##### Nginx 实现跨域配置参考

- 普通跨域请求：只需服务器端设置 Access-Control-Allow-Origin


- 带cookie跨域请求：前后端都需要进行设置

```nginx
user root;
events {
    worker_connections  1024;
}

http {
    charset utf-8;
    
 server {
      listen 80;                         
      server_name test1.xqiangme.top;  

      #允许跨域请求的域，* 代表所有
      add_header 'Access-Control-Allow-Origin' *;
      #允许带上cookie请求
      add_header 'Access-Control-Allow-Credentials' 'true';
      #允许请求的方法，比如 GET/POST/PUT/DELETE
      add_header 'Access-Control-Allow-Methods' *;
      #允许请求的header
      add_header 'Access-Control-Allow-Headers' *;

      location /index.html {
      alias /home/nginx/static_html/index_test1.html;
      }
   }

 server {
      listen 80;                         
      server_name test2.xqiangme.top;  

      #允许跨域请求的域，* 代表所有
      add_header 'Access-Control-Allow-Origin' *;
      #允许带上cookie请求
      add_header 'Access-Control-Allow-Credentials' 'true';
      #允许请求的方法，比如 GET/POST/PUT/DELETE
      add_header 'Access-Control-Allow-Methods' *;
      #允许请求的header
      add_header 'Access-Control-Allow-Headers' *;

      location /index.html {
      alias /home/nginx/static_html/index_test2.html;
      }
  }
}
```










### 范例：Nginx 实现跨域

#### 环境说明

- 两个不同子域的域名：
  - test1.xiangzheng.com
  - test2.xiangzheng.com

#### 准备 index 文件

- **test1 子域**：/data/nginx/static_html/index_test1.html

```xml
<html>
<head>
    <title>test1 跨域测试</title>
</head>
<body style="padding: 20px;">
<br/>
<script type='text/javascript'> 
    var xmlhttp = new XMLHttpRequest()
    xmlhttp.open("GET", "http://test2.xiangzheng.com/index.html", true);
    xmlhttp.send();
</script>
<p>hello world ...... test1 子域名index.html </p>
</body>
</html>
```

- **test2 子域**：/data/nginx/static_html/index_test2.html

```bash
test2 page
```



#### 实现跨域前测试

- **nginx 配置：**

```nginx
...
events {
    worker_connections 1024;
}

http {
...
    server {
        listen      80;
        server_name test1.xiangzheng.com;

        location /index.html {
            alias /data/nginx/static_html/index_test1.html;
        }

    }

    server {
        listen       80;
        server_name  test2.xiangzheng.com;

        location /index.html {
            alias /data/nginx/static_html/index_test2.html;
        }

    }
}
```

- http://test1.xiangzheng.com/，因为目标站点未存在跨域相关的响应报文首部字段，所以报错 CORS

![未作跨域设置前1](/docs/基础服务/web服务/nginx/未作跨域设置前1.jpg)

- http://test2.xiangzheng.com/，未存在跨域相关的响应报文首部字段

![未作跨域设置前2](/docs/基础服务/web服务/nginx/未作跨域设置前2.jpg)

#### 实现跨域后测试

- **nginx 配置**

```nginx
...
events {
    worker_connections 1024;
}

http {
...
    server {
        listen      80;
        server_name test1.xiangzheng.com;

        location /index.html {
            alias /data/nginx/static_html/index_test1.html;
        }

    }

    server {
        listen       80;
        server_name  test2.xiangzheng.com;
        #允许跨域请求的域，* 代表所有
        add_header 'Access-Control-Allow-Origin' *;
        #允许带上cookie请求
        add_header 'Access-Control-Allow-Credentials' 'true';
        #允许请求的方法，比如 GET/POST/PUT/DELETE
        add_header 'Access-Control-Allow-Methods' *;
        #允许请求的header
        add_header 'Access-Control-Allow-Headers' *;

        location /index.html {
            alias /data/nginx/static_html/index_test2.html;
        }

    }
}
```

- 无报错

![跨域设置后1](/docs/基础服务/web服务/nginx/跨域设置后1.jpg)

- 出现了新的响应头

![跨域设置后2](/docs/基础服务/web服务/nginx/跨域设置后2.jpg)



### 范例：OSS 实现跨域

- 在云厂商的 OSS 管理界面中可以直接配置添加响应报文头，具体配置参阅下面的链接

- https://help.aliyun.com/document_detail/31870.html?spm=5176.8466032.cors.1.6a9d1450U47Qu6





## http压力测试

```bash
ab [OPTIONS] URL

#常见选项
 -n：总请求数
 -c：模拟的并发数
 -k：以持久连接模式测试
说明：并发数高于1024时，需要用 ulimit –n # 调整能打开的文件数

Requests per second #结果中此行最重要（显示了响应速度信息）

#范例
ab -c10 -n 100 http://10.0.0.8/
```





## 开启压缩功能

- 将指定文件压缩以牺牲一定cpu资源作为条件换来节省带宽减少网络流量从而降低成本的效果
- 由 ngx_http_gzip_module 模块提供此功能
- 官方文档：https://nginx.org/en/docs/http/ngx_http_gzip_module.html
- 使用 SSL/TLS 协议时，压缩响应可能会受到 BREACH 攻击
- Content：http, server, location

### 配置说明

```nginx
gzip on | off;
# 启用或关闭gzip压缩，默认关闭

gzip_comp_level <1-9>;
# 指定压缩比，默认1，9为最高压缩比

gzip_min_length 1k;
# 指定压缩的最小文件，这里是小于1k的文件将不会被压缩

gzip_types mime-type ...;
# 指定压缩的文件类型，默认为gzip_types text/html;，一般默认即可

gzip_vary on | off;
# 响应报文首部添加字段，默认为off，一般建议打开，在响应报文首部插入"Vary: Accept-Encoding"字段
```

### 配置范例

```bash
[root@centos8 ~]# vim /apps/nginx/conf/nginx.conf
...
http {
    gzip on;
    gzip_comp_level 9;
    gzip_min_length 1k;
    gzip_vary on;
...
}
```





## 防盗链

valid_referers，定义有效的 referer，后面可以使用 if 对 referers 的内置变量进行判断，如果是无效的 referer 访问，就可以 return 个 403

- 此功能是通过 ngx_http_referer_module 模块实现此功能

### 盗链 概述



- 盗链就是将他人网站中的某些链接放到自己的网站中，从而使用他人的资源
- 不做防盗链优化的话会导致他人非法占用服务器的资源，对服务器的性能造成影响

- 防盗链基于客户端的referer实现

### referer 概述

- referer就是之前那个网站的域名
- referer是记录打开一个页面之前记录从哪个页面跳转过来的标记信息
- **正常的referer信息：**

```bash
none # 请求报文首部没有referer首部，比如用户直接在浏览器输入域名访问网站，就没有referer信息

blocked # 请求报文有referer首部，但无有效值，比如为空

server_names # referer首部中包含本主机名即nginx 监听的server_name

arbitrary_string # 自定义指定字符串，但可使用*作通配符。如：*.xiangzheng.vip、www.xiangzheng.*

regular expression # 被指定的正则表达式模式匹配到的字符，要使用~开头，例如:      ~.*\.xiangzheng\.vip
```

### 利用 referer 模块 实现防盗链

- 检查访问请求的referer信息是否有效来进行动作处理 从而实现实现防盗链功能
- 由 ngx_http_referer_module 模块实现此功能
- 官方帮助：https://nginx.org/en/docs/http/ngx_http_referer_module.html
- 该模块的预期目的不是彻底阻止此类请求，而是阻止常规浏览器发送的大量请求
- **Syntax:**	
  - valid_referers none | blocked | server_names | string ...;

- **Default:**	
  - —

- **Context:**	
  - server, location


```nginx
server {
    ...
    valid_referers none blocked server_names *.xingzheng.com ~\.google\. ~\.baidu\. ~\.bing\. ~\.so\. ~\.dogedoge\. ~\.fsou\.; # 定义有效的referer
    
    if ($invalid_referer) { #假如是使用其他的无效的referer访问
        return 403; #返回状态码403
    }
}
```



### 防盗链范例

#### 盗取远程主机图片

```bash
#nginx配置
...
        location / {
            root   /data/web/html;
            index  index.html index.htm;
        }
...

#盗链页面准备
# /data/web/html/daolian.html
<html>
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
<title>盗链</title>
</head>
<body>
<h1 style="color:red">盗链图片：</h1>
<img src="https://www.azheng.com/images/test.png">
</body>
</html>
```

#### 被盗链主机截取日志

- 用户访问盗链主机的页面后，被盗链的主机会出现以下日志内容
  - **referer": "http://10.0.0.100/**

```json
# tail -f /apps/nginx/logs/access.log
...
{"@timestamp": "27/Apr/2022:12:28:15 +0800","remote_addr": "10.0.0.1","referer": "http://10.0.0.100/","request": "GET /images/test.png HTTP/1.1","status": 200,"bytes": 49806,"agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36 Edg/100.0.1185.50","x_forwarded": "-","up_addr": "-","up_host": "-","up_resp_time": "-","request_time": "0.000" }
```

#### 被盗链主机实现防盗链

- 嵌入式变量 $invalid_referer 如果 Referer 请求头字段值被认为有效，则为空字符串，否则为 1，if语句块中$invalid_referer为空字符串即未赋值将不会执行action，反之赋值则会执行action

```bash
server {
    ...
    valid_referers none blocked server_names *.xingzheng.com ~\.google\. ~\.baidu\. ~\.bing\. ~\.so\. ~\.dogedoge\. ~\.fsou\.; #定义有效的referer
    
    if ($invalid_referer) { #假如是使用其他的无效的referer访问
        return 403; #返回状态码403
    }
}
```





## 相关配置说明

### listen

- 指定监听的端口号和IP地址，一般是80或443，也可以两个都指定



### server_name

- 定义虚拟主机的域名，用于匹配请求的HTTP Host头部。可以设置多个域名，使用空格分隔。





### root

- 根目录
- 网站默认的根目录，指定虚拟主机的根目录。当访问虚拟主机时，nginx会在该目录下查找对应的文件。
- 默认页面，相对路径表示相对于安装目录的路径，也可以写绝对路径



### alias

- 路径别名



### index

- 默认页面的文件名称，会从左到右依次寻找

```nginx
location / {
    index  index.html index.htm;
}
```



### autoindex

```nginx
location /images/ {
    autoindex on;
}
```



### sendfile

```
http {
    sendfile        on;
    #tcp_nopush     on; #在开启了sendfile的情况下，合并请求后统一发送给客户端
    #tcp_nodelay   off; #在开启了keepalive模式下的连接是否启用TCP_NODELAY选项，当为off时，延迟0.2s发送，默认on时，不延迟发送，立即发送用户响应报文
}
```



### keepalive_timeout

- 设置回话保持时间

```nginx
http {
    keepalive_timeout  65 60; #65为实际保持的时间，60表示显示的时间
}
```





### include

- 另外指定http配置段的其他配置文件位置

```nginx
http {
    include /apps/nginx/conf.d/*.conf;
}
```



## 参考文档

**第三方模块：**

- https://github.com/agile6v/awesome-nginx/
- https://github.com/openresty/

**Lua参考网站：**

- https://www.runoob.com/lua/lua-tutorial.html

**自动生成 nginx 配置文件：**

- https://www.digitalocean.com/community/tools/nginx?global.app.lang=zhCN
