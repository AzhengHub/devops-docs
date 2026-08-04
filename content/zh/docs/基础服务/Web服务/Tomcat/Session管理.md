---
title: "session管理"
---

# 前言

- 假设有一台 nginx 充当负载均衡；后端有两台 tomcat（tomcat1 和 tomcat2）
  - 那么当 nginx 以轮询的方式调度到后端的 tomcat1 时，tomcat1 会生成 session id 并发送给客户端
  - 客户端再下次访问时，会在 cookie 中携带 sessionid，而这时如果恰巧 nginx 将客户端的请求转发到了 tomcat2 上，那么 tomcat2 发现此 cookie 中的 session id 并非是自己的 进而会将其抛弃 并重新生成一个 session id 发送给客户端（tomcat1 也是如此）
  - 这样以来最终的结果就是客户端不端的收到新的 session id，而旧的 session id 因为在其它 tomcat 主机上没有对应的数据，所以相关的购物车等信息将不会保持保存

**session 持久化方案：**

- 负载均衡处基于 cookie 或 session 进行调度

- Tomcat session 复制集群
- session 共享





# 测试环境说明

- index.jsp（测试 session 的 jsp文件）

```bash
<%@ page import="java.util.*" %>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>lbjsptest</title>
</head>
<body>
<div>On <%=request.getServerName() %></div>
<div><%=request.getLocalAddr() + ":" + request.getLocalPort() %></div>
<div>SessionID = <span style="color:blue"><%=session.getId() %></span></div>
<%=new Date()%>
</body>
</html>
```

- /etc/hosts

```bash
10.0.0.8  azheng.com  # nginx
10.0.0.18 t1.azheng.com # tomcat1
10.0.0.28 t2.azheng.com # tomcat2
```





# 负载均衡基于 session 调度

## 实现前

### nginx 配置

- /apps/nginx/conf/nginx.conf

```nginx
...
http {
...
    upstream tomcat-server {
        server 10.0.0.18:8080;
        server 10.0.0.28:8080;
    }

    server {
        listen       80;
        server_name  azheng.com;
        charset utf-8;

        location / {
            proxy_pass http://tomcat-server;
        }
    }
...
```

### 实现前测试

- 以轮询方式调度 session 不会得以绑定

```bash
# curl azheng.com
...
<div>On tomcat-server</div>
<div>10.0.0.18:8080</div>
<div>SessionID = <span style="color:blue">E987819BA4D00194F8825DC61D975083</span></div>
...

# curl azheng.com
...
<div>On tomcat-server</div>
<div>10.0.0.28:8080</div>
<div>SessionID = <span style="color:blue">26A809AFA62BC6C31DB46A6661E4A578</span></div>
...
```



## 实现后

### nginx 配置

- /apps/nginx/conf/nginx.conf

```nginx
...
http {
...
    upstream tomcat-server {
        hash $cookie_JSESSIONID; # 添加基于JSESSIONID调度，JSESSIONID一致 则每次都会调度到同一台主机上
        server 10.0.0.18:8080;
        server 10.0.0.28:8080;
    }

    server {
        listen       80;
        server_name  azheng.com;
        charset utf-8;

        location / {
            proxy_pass http://tomcat-server;
        }
    }
...
```

### 实现后测试

```bash
# 获取 sessionid
# curl -I azheng.com
HTTP/1.1 200 
Server: nginx/1.18.0
Date: Tue, 30 Aug 2022 04:52:14 GMT
Content-Type: text/html;charset=ISO-8859-1
Connection: keep-alive
Set-Cookie: JSESSIONID=4228BB49F03E4D91834D74A164EECEEB; Path=/; HttpOnly

---

# 在请求报文中添加 session
# curl -H "Cookie: JSESSIONID=4228BB49F03E4D91834D74A164EECEEB" azheng.com
...
style="color:blue">4228BB49F03E4D91834D74A164EECEEB</span></div>
Tue Aug 30 12:52:27 CST 2022
...

---

# 会话得以保持
# curl -H "Cookie: JSESSIONID=4228BB49F03E4D91834D74A164EECEEB" azheng.com
...
style="color:blue">4228BB49F03E4D91834D74A164EECEEB</span></div>
Tue Aug 30 12:54:58 CST 2022
...
# curl -H "Cookie: JSESSIONID=4228BB49F03E4D91834D74A164EECEEB" azheng.com
...
style="color:blue">4228BB49F03E4D91834D74A164EECEEB</span></div>
Tue Aug 30 12:54:59 CST 2022
...
```





# session 复制

- Tomcat session replication cluster

- Tomcat 官方实现了 session 的复制集群，将每个 Tomcat 进行相互的复制同步，从而保证了所有Tomcat 都有相同的 session 信息
- **在 Tomcat 主机过多的情况下占用内存较高，比较适合小环境中使用**
- 官方参考文档：https://tomcat.apache.org/tomcat-8.5-doc/cluster-howto.html



## session 复制集群 配置说明

- 添加到 <Engine> 所有虚拟主机都可以启用session复制
- 添加到 <Host> 只为该虚拟主机启动session复制
- 最后在应用程序内部启用才能使用
- 生产中，可以根据实际情况对参数进行微调，如：多播地址、发送间隔时间、故障阈值时间等

```xml
        <Cluster className="org.apache.catalina.ha.tcp.SimpleTcpCluster"
                 channelSendOptions="8">

          <Manager className="org.apache.catalina.ha.session.DeltaManager"
                   expireSessionsOnShutdown="false"
                   notifyListenersOnReplication="true"/>

          <Channel className="org.apache.catalina.tribes.group.GroupChannel">
            <Membership className="org.apache.catalina.tribes.membership.McastService"
                        address="228.0.0.4" #指定的多播地址
                        port="45564" #45564/udp
                        frequency="500" #间隔500ms发送
                        dropTime="3000"/> #故障阈值3s
            <Receiver className="org.apache.catalina.tribes.transport.nio.NioReceiver"
                      address="auto" #监听地址，此项建议修改为当前主机的IP
                      port="4000" #监听端口
                      autoBind="100" #如果端口冲突，自动绑定其他端口，范围是4000-4100
                      selectorTimeout="5000" #自动绑定超时时长5s
                      maxThreads="6"/>

            <Sender className="org.apache.catalina.tribes.transport.ReplicationTransmitter">
              <Transport className="org.apache.catalina.tribes.transport.nio.PooledParallelSender"/>
            </Sender>
            <Interceptor className="org.apache.catalina.tribes.group.interceptors.TcpFailureDetector"/>
            <Interceptor className="org.apache.catalina.tribes.group.interceptors.MessageDispatchInterceptor"/>
          </Channel>

          <Valve className="org.apache.catalina.ha.tcp.ReplicationValve"
                 filter=""/>
          <Valve className="org.apache.catalina.ha.session.JvmRouteBinderValve"/>

          <Deployer className="org.apache.catalina.ha.deploy.FarmWarDeployer"
                    tempDir="/tmp/war-temp/"
                    deployDir="/tmp/war-deploy/"
                    watchDir="/tmp/war-listen/"
                    watchEnabled="false"/>

          <ClusterListener className="org.apache.catalina.ha.session.ClusterSessionListener"/>
        </Cluster>
```

## 范例1：实现 session复制集群

### 实验环境

| IP        | 主机名           | 服务    | 软件          |
| --------- | ---------------- | ------- | ------------- |
| 10.0.0.8  | proxy.azheng.vip | 调度器  | nginx         |
| 10.0.0.18 | t1.azheng.vip    | tomcat1 | JDK8、tomcat8 |
| 10.0.0.28 | t2.azheng.vip    | tomcat2 | JDK8、tomcat8 |

### 在所有tomcat配置

- 这里是将此段内容添加到Host段中，即只为该虚拟主机启动session复制

#### conf/server.xml配置

```xml
        <Cluster className="org.apache.catalina.ha.tcp.SimpleTcpCluster"
                 channelSendOptions="8">

          <Manager className="org.apache.catalina.ha.session.DeltaManager"
                   expireSessionsOnShutdown="false"
                   notifyListenersOnReplication="true"/>

          <Channel className="org.apache.catalina.tribes.group.GroupChannel">
            <Membership className="org.apache.catalina.tribes.membership.McastService"
                        address="228.0.0.3"
                        port="45564"
                        frequency="500"
                        dropTime="3000"/>
            <Receiver className="org.apache.catalina.tribes.transport.nio.NioReceiver"
                      address="auto"
                      port="4000"
                      autoBind="100"
                      selectorTimeout="5000"
                      maxThreads="6"/>

            <Sender className="org.apache.catalina.tribes.transport.ReplicationTransmitter">
              <Transport className="org.apache.catalina.tribes.transport.nio.PooledParallelSender"/>
            </Sender>
            <Interceptor className="org.apache.catalina.tribes.group.interceptors.TcpFailureDetector"/>
            <Interceptor className="org.apache.catalina.tribes.group.interceptors.MessageDispatchInterceptor"/>
          </Channel>

          <Valve className="org.apache.catalina.ha.tcp.ReplicationValve"
                 filter=""/>
          <Valve className="org.apache.catalina.ha.session.JvmRouteBinderValve"/>

          <Deployer className="org.apache.catalina.ha.deploy.FarmWarDeployer"
                    tempDir="/tmp/war-temp/"
                    deployDir="/tmp/war-deploy/"
                    watchDir="/tmp/war-listen/"
                    watchEnabled="false"/>

          <ClusterListener className="org.apache.catalina.ha.session.ClusterSessionListener"/>
        </Cluster>
```

#### webapps/ROOT/WEB-INF/web.xml配置

- 此文件没有可以拷贝一份模板然后在此基础上修改

```xml
[root@tomcat-node1 ~]# vim /data/webapps/ROOT/WEB-INF/web.xml
...
  <distributable/> #倒数第二行添加此段,开启程序的分布式
</web-app>
```

#### 测试访问

- 可以看到只有主机在变，而sessionID没有变化

```bash
[root@clicent ~]#curl -b "JSESSIONID=D003E14AB4EC8DC1270F7279817FB2EA" proxy.azheng.vip/index.jsp

<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>lbjsptest</title>
</head>
<body>
<div>On tomcat-server</div>
<div>10.0.0.18:8080</div>
<div>SessionID = <span style="color:blue">D003E14AB4EC8DC1270F7279817FB2EA</span></div>
Tue Jan 04 19:10:41 CST 2022
</body>
</html>
[root@clicent ~]#curl -b "JSESSIONID=D003E14AB4EC8DC1270F7279817FB2EA" proxy.azheng.vip/index.jsp

<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>lbjsptest</title>
</head>
<body>
<div>On tomcat-server</div>
<div>10.0.0.28:8080</div>
<div>SessionID = <span style="color:blue">D003E14AB4EC8DC1270F7279817FB2EA</span></div>
Tue Jan 04 19:10:47 CST 2022
</body>
</html>
```



## 范例2：实现 session复制集群

### 实验环境：

- 时间同步，关闭selinux等...

| IP        | 主机名           | 服务          |
| --------- | ---------------- | ------------- |
| 10.0.0.8  | proxy.azheng.org | nginx         |
| 10.0.0.18 | t1.azheng.org    | JDK8、tomcat8 |
| 10.0.0.28 | t2.azheng.org    | JDK8、tomcat8 |

### Tomcat页面准备：

```bash
#t2同理
[root@t1 ~]# mkdir -p /data/webapps/ROOT/
[root@t1 ~]# vim /data/webapps/ROOT/index.jsp
<%@ page import="java.util.*" %>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>lbjsptest</title>
</head>
<body>
<div>On <%=request.getServerName() %></div>
<div><%=request.getLocalAddr() + ":" + request.getLocalPort() %></div>
<div>SessionID = <span style="color:blue"><%=session.getId() %></span></div>
<%=new Date()%>
</body>
</html>
```

### proxy主机配置：

- proxy开启轮询调度模式

```bash
[root@proxy ~]# yum -y install nginx

[root@proxy ~]# cat /etc/nginx/nginx.conf
        location / {
        proxy_pass http://tomcat-server;
        }

[root@proxy ~]# vim /etc/nginx/conf.d/tomcat-server.conf
upstream tomcat-server {
  server 10.0.0.18:8080 weight=1 fail_timeout=15s max_fails=3;
  server 10.0.0.28:8080 weight=1 fail_timeout=15s max_fails=3;
}

[root@proxy ~]# systemctl enable --now nginx.service
```

### tomcat主机配置：

在所有后端tomcat主机上修改conf/server.xml，将多播复制的配置放到t1.azheng.org和t2.azheng.org虚拟主机中，即host块。**特别注意修改Receiver的address属性为一个可对外的IP地址。**

#### t1配置：

```bash
  [root@t1 ~]# vim /usr/local/tomcat/conf/server.xml
  .......................................................
    <Engine name="Catalina" defaultHost="t1.azheng.org">
    .......................................................
      <Host name="t1.azheng.org"  appBase="/data/webapps"
            unpackWARs="false" autoDeploy="false">
   ####################以下内容为新加段###############################
        <Cluster className="org.apache.catalina.ha.tcp.SimpleTcpCluster"
                 channelSendOptions="8">

          <Manager className="org.apache.catalina.ha.session.DeltaManager"
                   expireSessionsOnShutdown="false"
                   notifyListenersOnReplication="true"/>

          <Channel className="org.apache.catalina.tribes.group.GroupChannel">
            <Membership className="org.apache.catalina.tribes.membership.McastService"
                        address="230.3.3.3" #指定不冲突的多播地址
                        port="45564"
                        frequency="500"
                        dropTime="3000"/>
            <Receiver className="org.apache.catalina.tribes.transport.nio.NioReceiver"
                      address="10.0.0.18" #指定本机的ip地址
                      port="4000"
                      autoBind="100"
                      selectorTimeout="5000"
                      maxThreads="6"/>

            <Sender className="org.apache.catalina.tribes.transport.ReplicationTransmitter">
              <Transport className="org.apache.catalina.tribes.transport.nio.PooledParallelSender"/>
            </Sender>
            <Interceptor className="org.apache.catalina.tribes.group.interceptors.TcpFailureDetector"/>
            <Interceptor className="org.apache.catalina.tribes.group.interceptors.MessageDispatchInterceptor"/>
          </Channel>

          <Valve className="org.apache.catalina.ha.tcp.ReplicationValve"
                 filter=""/>
          <Valve className="org.apache.catalina.ha.session.JvmRouteBinderValve"/>

          <Deployer className="org.apache.catalina.ha.deploy.FarmWarDeployer"
                    tempDir="/tmp/war-temp/"
                    deployDir="/tmp/war-deploy/"
                    watchDir="/tmp/war-listen/"
                    watchEnabled="false"/>

          <ClusterListener className="org.apache.catalina.ha.session.ClusterSessionListener"/>
        </Cluster>
        #########################以上内容为新加段###############################
      </Host>
     </Engine>
  </Service>
</Server> 
```

#### t2配置：

可以从t1拷贝一份，主要修改虚拟机主机，和ip、多播地址等信息即可

```bash
  [root@t2 ~]# vim /usr/local/tomcat/conf/server.xml
  .......................................................
    <Engine name="Catalina" defaultHost="t2.azheng.org">
    .......................................................
      <Host name="t2.azheng.org"  appBase="/data/webapps"
            unpackWARs="false" autoDeploy="false">
   ####################以下内容为新加段###############################
        <Cluster className="org.apache.catalina.ha.tcp.SimpleTcpCluster"
                 channelSendOptions="8">

          <Manager className="org.apache.catalina.ha.session.DeltaManager"
                   expireSessionsOnShutdown="false"
                   notifyListenersOnReplication="true"/>

          <Channel className="org.apache.catalina.tribes.group.GroupChannel">
            <Membership className="org.apache.catalina.tribes.membership.McastService"
                        address="230.3.3.3"
                        port="45564"
                        frequency="500"
                        dropTime="3000"/>
            <Receiver className="org.apache.catalina.tribes.transport.nio.NioReceiver"
                      address="10.0.0.28"
                      port="4000"
                      autoBind="100"
                      selectorTimeout="5000"
                      maxThreads="6"/>

            <Sender className="org.apache.catalina.tribes.transport.ReplicationTransmitter">
              <Transport className="org.apache.catalina.tribes.transport.nio.PooledParallelSender"/>
            </Sender>
            <Interceptor className="org.apache.catalina.tribes.group.interceptors.TcpFailureDetector"/>
            <Interceptor className="org.apache.catalina.tribes.group.interceptors.MessageDispatchInterceptor"/>
          </Channel>

          <Valve className="org.apache.catalina.ha.tcp.ReplicationValve"
                 filter=""/>
          <Valve className="org.apache.catalina.ha.session.JvmRouteBinderValve"/>

          <Deployer className="org.apache.catalina.ha.deploy.FarmWarDeployer"
                    tempDir="/tmp/war-temp/"
                    deployDir="/tmp/war-deploy/"
                    watchDir="/tmp/war-listen/"
                    watchEnabled="false"/>

          <ClusterListener className="org.apache.catalina.ha.session.ClusterSessionListener"/>
        </Cluster>
        #########################以上内容为新加段###############################
      </Host>
     </Engine>
  </Service>
</Server> 
```

#### 查看端口是否开启验证配置是否生效：

t2同理，主要看4000端口是否开启

```bash
[root@t1 ~]# ss -ntl
State        Recv-Q       Send-Q                  Local Address:Port             Peer Address:Port      
LISTEN       0            50                 [::ffff:10.0.0.28]:4000                        *:*         
LISTEN       0            1                  [::ffff:127.0.0.1]:8005                        *:*         
LISTEN       0            100                                 *:8080                        *:*         
```

### 开启应用程序的分布式

修改应用的web.html文件开启该应用程序的分布式

```sh
#将源程序的目录作为模板拷贝到虚拟主机目录下，t2也同样操作
[root@t1 ~]# cp -a /usr/local/tomcat/webapps/ROOT/WEB-INF /data/webapps/ROOT/
[root@t1 ~]# tree /data/
/data/
└── webapps
    └── ROOT
        ├── index.jsp
        └── WEB-INF
            └── web.xml
            
#修改web.xml，t2上的文件同样进行此修改，或者将t1修改完的文件拷贝到t2
#在倒数第二行中插入
[root@t1 ~]# vim /data/webapps/ROOT/WEB-INF/web.xml
[root@t1 ~]# tail -n3 /data/webapps/ROOT/WEB-INF/web.xml
  </description>
<distributable/> #添加此行
</web-app>
```

### 访问测试

- 在浏览器中测试访问，看是否只有tomcat主机IP变，而sessionID不变





# session 共享

## msm

- msm（memcached session manager）
- 提供将Tomcat的session保持到memcached或redis的程序，可以实现高可用
- 项目网站：https://github.com/magro/memcached-session-manager，支持Tomcat6、7、8、9

### 相关包说明：

- **tomcat的session管理类：**

  - memcached-session-manager-2.3.2.jar（通用包，必须装）
  - memcached-session-manager-tc8-2.3.2.jar（针对tomcat包）

- **session数据的序列化、反序列化类:**

  - 可选，不用则使用java内置的序列化（实测不行，必须使用其他的序列化）

  - 官方推荐kyro

  - 在webapps中WEB-INF/lib/下

  - ```bash
    msm-kryo-serializer-2.3.2.jar
    kryo-serializers-0.43.jar
    kryo-3.0.3.jar
    minlog-1.3.1.jar
    reflectasm-1.11.8.jar
    asm-5.2.jar
    objenesis-2.6.jar
    ```

    

- **驱动类:**

  - spymemcached-2.12.3.jar（针对memcached）
  - jedis-3.0.0.jar（针对redis）



## redis实现

- 参考链接：https://github.com/magro/memcached-session-manager/wiki/SetupAndConfiguration

### tomcat配置

```xml
#往tomcat中拷贝文件，将以下文件拷贝到 tomcat端的：$CATALINA_BASE/lib/
memcached-session-manager-tc8-2.3.2.jar
memcached-session-manager-2.3.2.jar
jedis-3.0.0.jar
msm-kryo-serializer-2.3.2.jar
kryo-serializers-0.43.jar
kryo-3.0.3.jar
minlog-1.3.1.jar
reflectasm-1.11.8.jar
asm-5.2.jar
objenesis-2.6.jar

----------------------------------------------------------------------------------

#修改tomcat配置文件，在倒数第二行添加
#memcachedNodes= 根据生产环境添加
#不指定端口则默认6379
<Context>
  ...
  <Manager className="de.javakaffee.web.msm.MemcachedBackupSessionManager"
    memcachedNodes="redis://:password@redis.example.com:portnumber"
    sticky="false"
    sessionBackupAsync="false"
    lockingMode="uriPattern:/path1|/path2"
    requestUriIgnorePattern=".*\.(ico|png|gif|jpg|css|js)$"
    transcoderFactoryClass="de.javakaffee.web.msm.serializer.kryo.KryoTranscoderFactory"
    />
...    
</Context>
```

### 准备redis

- 正常选择二进制安装即可，设置安全密码等，主要配置都在tomcat上
- 另外redis为了数据安全和冗余性要开启持久化和哨兵或集群等...











