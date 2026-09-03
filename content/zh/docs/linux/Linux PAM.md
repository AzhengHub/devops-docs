
---
title: PAM 模块
---


# PAM 概述

- Pluggable Authentication Modules，插件式的验证模块

- Sun公司于1995 年开发的一种与认证相关的通用框架机制。PAM 只关注如何为服务验证用户的 API，通过提供一些动态链接库和一套统一的API，将系统提供的服务和该服务的认证方式分开，使得系统管理员可以灵活地根据需要给不同的服务配置不同的认证方式而无需更改服务程序一种认证框架，自身不做认证



# PAM 架构

- PAM提供了对所有服务进行认证的中央机制，适用于本地登录，远程登录，如：telnet,rlogin,fsh,ftp,点对点协议PPP，su等应用程序中
  - 类似于网购中的 买家、卖家、淘宝，而淘宝就相当PAM模块
- **系统管理员 通过PAM配置文件来制定不同应用程序的不同认证策略**
- **应用程序开发者** 通过在服务程序中**使用PAM API**(pam_xxxx( ))来实现对认证方法的调用
- **PAM服务模块的开发者** 则**利用PAM SPI来编写模块**（主要调用函数pam_sm_xxxx( )供PAM接口库调用，将不同的认证机制加入到系统中
- **PAM接口库（libpam）则读取配置文件**，将应用程序和相应的PAM服务**模块联系起来**



# PAM 工作原理

PAM认证一般遵循这样的顺序：Service(服务)→PAM(配置文件)→pam_*.so

PAM认证首先要确定那一项服务，然后加载相应的PAM的配置文件(位于/etc/pam.d下)，最后调用认证文件(位于/lib64/security下)进行安全认证

**PAM认证过程示例：**

1. 使用者执行/usr/bin/passwd 程序，并输入密码
2. passwd开始调用PAM模块，PAM模块会搜寻passwd程序的PAM相关设置文件，这个设置文件一般是在/etc/pam.d/里边的与程序同名的文件，即PAM会搜寻/etc/pam.d/passwd此设置文件
3. 经由/etc/pam.d/passwd设定文件的数据，取用PAM所提供的相关模块来进行验证
4. 将验证结果回传给passwd这个程序，而passwd这个程序会根据PAM回传的结果决定下一个动作（重新输入密码或者通过验证）



# PAM 相关文件

- /lib64/security/*.so   **模块文件目录**

- /etc/security/   **特定模块相关的设置文件，较大的模块配置文件一般在这里存放**

- **应用程序调用PAM模块的配置文件：**

  - /etc/pam.conf   主配置文件，默认不存在，一般不使用主配置

  - /etc/pam.d/APP_NAME   为每种应用模块提供一个专用的子配置文件

  - **注意：如/etc/pam.d存在，/etc/pam.conf将失效**

- /var/log/secure* **日志相关文件**



# PAM 配置文件说明

- **通用配置文件 /etc/pam.conf 格式**

```http
application type control module-path arguments
```

- **专用配置文件 /etc/pam.d/ 格式**

```http
type control module-path arguments
```

### application

- 指服务名，如：telnet、login、ftp等
- 如果写为 OTHER 则代表所有没有在该文件中明确配置的其它服务

### type

- 指模块类型，即功能
  - **Auth** 账号的认证和授权
  - **Account** 帐户的有效性，与账号管理相关的非认证类的功能，如：用来限制/允许用户对某个服务的访问时间，限制用户的位置(例如：root用户只能从控制台登录)
  - **Password** 用户修改密码时密码复杂度检查机制等功能
  - **Session** 用户会话期间的控制，如：最多打开的文件数，最多的进程数等
  - **-type** 表示因为缺失而不能加载的模块将不记录到系统日志,对于那些不总是安装在系统上的模块有用

### control

- PAM库该如何处理与该服务相关的PAM模块的成功或失败情况，一个关健词实现
  - **required** 一票否决，表示本模块必须返回成功才能通过认证，但是如果该模块返回失败，失败结果也不会立即通知用户，而是要等到同一type中的所有模块全部执行完毕后 再将失败结果返回给应用程序，即为必要条件
  - **requisite** 一票否决，该模块必须返回成功才能通过认证，但是一旦该模块返回失败，将不再执行同一type内的任何模块，而是直接将控制权返回给应用程序。是一个必要条件
  - **sufficient** 一票通过，表明本模块返回成功则通过身份认证的要求，不必再执行同一type内的其它模块，但如果本模块返回失败可忽略，即为充分条件，优先于前面的required和requisite
  - **optional** 表明本模块是可选的，它的成功与否不会对身份认证起关键作用，其返回值一般被忽略
  - **include** 调用其他的配置文件中定义的配置信息

### module-path

- 用来指明本模块对应的程序文件的路径名
  - 模块文件所在绝对路径：
    - 如：/lib64/security/pam_shells.so
  - 模块文件所在相对路径，/lib64/security目录下的模块可使用相对路径
    - 如：pam_shells.so、pam_limits.so
  - 有些模块有自已的专有配置文件，在 /etc/security/*.conf 目录下

### Arguments

- 用来传递给该模块的参数
  - **debug** 该模块应当用syslog( )将调试信息写入到系统日志文件中
  - **no_warn** 表明该模块不应把警告信息发送给应用程序
  - **use_first_pass** 该模块不能提示用户输入密码，只能从前一个模块得到输入密码
  - **try_first_pass** 该模块首先用前一个模块从用户得到密码，如果该密码验证不通过，再提示用户输入新密码
  - **use_mapped_pass** 该模块不能提示用户输入密码，而是使用映射过的密码
  - **expose_account** 允许该模块显示用户的帐号名等信息，一般只能在安全的环境下使用，因为泄漏用户名会对安全造成一定程度的威胁

### 注意事项

- 注意：修改PAM配置文件将马上生效

- 建议：编辑pam规则时，保持至少打开一个root会话，以防止root身份验证错误





# PAM 相关命令

- **查看程序是否支持PAM**

```bash
[root@centos8 ~]#ldd `which sshd` |grep libpam
 libpam.so.0 => /lib64/libpam.so.0 (0x00007fea8e70d000)

[root@centos8 ~]#ldd `which passwd` |grep pam
 libpam.so.0 => /lib64/libpam.so.0 (0x00007f045b805000)
 libpam_misc.so.0 => /lib64/libpam_misc.so.0 (0x00007f045b601000)
```



# PAM 模块帮助

- 官方在线文档：http://www.linux-pam.org/Linux-PAM-html/
- 官方离线文档：http://www.linux-pam.org/documentation/
- pam模块文档说明：/user/share/doc/pam-*
- rpm -qd pam
- man –k pam_
- man 模块名 如：man 8 rootok



# 常用 PAM 模块说明

### pam_shells

- 功能：检查有效shell
- 帮助：man pam_shells
- 官方文档：http://www.linux-pam.org/Linux-PAM-html/sag-pam_shells.html

##### 范例：不允许使用/bin/csh的用户本地登录

```bash
#默认没有csh
[root@centos8 ~]# cat /etc/shells 
/bin/sh
/bin/bash
/usr/bin/sh
/usr/bin/bash

#安装csh
[root@centos8 ~]# yum -y install csh

#出现csh
[root@centos8 ~]# cat /etc/shells 
/bin/sh
/bin/bash
/usr/bin/sh
/usr/bin/bash
/bin/csh #
/bin/tcsh #
/usr/bin/csh #
/usr/bin/tcsh #

#创建默认使用csh登录的用户
[root@centos8 ~]# useradd -s /bin/csh testuser

#测试登录，没有问题
[root@centos8 ~]# su - testuser 
[testuser@centos8 ~]$ 

#修改登录相关的子配置文件，设置验证加一票否决 并使用pam_shells.so
#但是修改此文件后，从xshell终端还可以连接，也可以通过ssh连接，只有su登录不可以
[root@centos8 ~]# vim /etc/pam.d/su
#%PAM-1.0
auth       required     pam_shells.so #添加此行
.... 

#再次测试登录，没有问题，因为/etc/shells中包含csh，所以可以登录
[root@centos8 ~]# su - testuser 
[testuser@centos8 ~]$ 

#去掉csh相关的shell
[root@centos8 ~]# vim /etc/shells
/bin/sh
/bin/bash
/usr/bin/sh
/usr/bin/bash
#/bin/csh
/bin/tcsh
#/usr/bin/csh
/usr/bin/tcsh

#testuser将不可登录
[root@centos8 ~]# su - testuser
Password: 
su: Authentication failure

#观察日志
[root@centos8 ~]#tail /var/log/secure
Apr 22 23:55:17 8 su[13819]: pam_unix(su-l:auth): authentication failure; logname=root uid=0 euid=0 tty=pts/1 ruser=root rhost=  user=testuser

#添加回去又可登录了
[root@centos8 ~]# cat /etc/shells 
/bin/sh
/bin/bash
/usr/bin/sh
/usr/bin/bash
/bin/csh
/bin/tcsh
/usr/bin/csh
/usr/bin/tcsh
[root@centos8 ~]# su - testuser 
Last login: Sat Apr 23 00:04:27 CST 2022 from 10.0.0.8 on pts/4
[testuser@centos8 ~]$ 
```



### pam_securetty

- 功能：只允许root用户在/etc/securetty列出的安全终端上登陆
- 官方文档：http://www.linux-pam.org/Linux-PAM-html/sag-pam_securetty.html
- 注意：CentOS8没有调用此模块，所以默认允许root远程登录telnet

##### 范例：CentOS7 允许root在telnet登陆

```bash
vi /etc/pam.d/remote
#将下面一行加上注释
#auth required pam_securetty.so 

#或者/etc/securetty文件中加入
pts/0,pts/1…pts/n

#测试用root telnet登录
```

##### 范例：在CentOS8上实现 pam_securetty.so模块禁止root远程登录telnet服务

```bash
#默认CentOS8 允许root远程telnet登录
[root@centos7 ~]#telnet 10.0.0.8
Trying 10.0.0.8...
Connected to 10.0.0.8.
Escape character is '^]'.

Kernel 4.18.0-147.el8.x86_64 on an x86_64
centos8 login: root
Password: 
Last login: Mon May 25 11:51:08 from 10.0.0.1
[root@centos8 ~]# 


#修改配置不允许root远程telnet登录
[root@centos8 ~]#vim /etc/pam.d/remote 
#%PAM-1.0
auth       required     pam_securetty.so
...
[root@centos7 ~]#scp /etc/securetty 10.0.0.8:/etc


#测试
[root@centos7 ~]#telnet 10.0.0.8
Trying 10.0.0.8...
Connected to 10.0.0.8.
Escape character is '^]'.
Kernel 4.18.0-147.el8.x86_64 on an x86_64
centos8 login: wang
Password: 
Last login: Mon May 25 12:06:21 from ::ffff:10.0.0.6
[wang@centos8 ~]$exit
logout
Connection closed by foreign host.


[root@centos7 ~]#telnet 10.0.0.8
Trying 10.0.0.8...
Connected to 10.0.0.8.
Escape character is '^]'.
Kernel 4.18.0-147.el8.x86_64 on an x86_64
centos8 login: root
Password: 
Login incorrect
centos8 login:
```



### pam_nologin

- 功能：如果/etc/nologin文件存在,将导致非root用户不能登陆,当该用户登陆时，会显示/etc/nologin文件内容，并拒绝登陆
- 文档：http://www.linux-pam.org/Linux-PAM-html/sag-pam_nologin.html

```bash
#使用此模块的应用
[root@centos8 ~]# grep -r pam_nologin /etc/
/etc/pam.d/remote:account    required     pam_nologin.so
/etc/pam.d/vmtoolsd:account    required     pam_nologin.so
/etc/pam.d/sshd:account    required     pam_nologin.so
/etc/pam.d/login:account    required     pam_nologin.so
```



### pam_limits

- 功能：在用户级别实现对其可使用的资源的限制，例如：可打开的文件数量，可运行的进程数量，可用内存空间
- 文档：http://www.linux-pam.org/Linux-PAM-html/sag-pam_limits.html
- **注意：高并发场景下，单纯修改limit限制不能完全解决问题，要配合内核参数的修改**
- **注意：limit文件修改后不会立即生效，需要重启生效，但是最好在系统安装后统一进行修改 避免后期带来不必要的麻烦**

#### limit 配置文件说明

##### 配置文件格式

```bash
#每行一个定义
<domain>   <type>   <item>   <value>
```

##### domain

应用于哪些对象

- **Username** 单个用户
- **@group** 组内所有用户
- **\*** 所有用户
- **%** 仅用于限制 maxlogins limit , 可以使用 %group 语法. 只用 % 相当于 * 对所有用户maxsyslogins limit限制. %group 表示限制此组中的所有用户总的最大登录数

##### type

限制的类型

- **Soft** 软限制，普通用户自己可以修改
- **Hard** 硬限制，由root用户设定，且通过kernel强制生效
- **\-** 二者同时限定

##### item

限制的资源

- **nofile** 所能够同时打开的最大文件数量,默认为1024
- **nproc** 所能够同时运行的进程的最大数量,默认为1024
- **core** 限制核心文件大小 (KB)
- **memlock** 最大锁定内存地址空间 (KB)
- **msgqueue** POSIX 消息队列使用的最大内存（字节)

##### value

指定具体值

- **unlimited** 不限制

#### 修改 limit 限制

-  通过 ulimit 命令修改，立即生效，但退出终端后失效，无法持久保存

```bash
-n   #每个进程最多的打开的文件描述符个数
-u   #最大用户进程数
-S   #使用 soft（软）资源限制
-H   #使用 hard（硬）资源限制

#范例：
root@100:~# ulimit -n 20
root@100:~# ulimit -a
...
open files                      (-n) 20
...
```

- 修改配置文件，永久生效

```bash
/etc/security/limits.conf
/etc/security/limits.d/*.conf
```



#### 范例：limit默认的限制

```bash
[root@centos8 ~]# ulimit -a
core file size          (blocks, -c) unlimited
data seg size           (kbytes, -d) unlimited
scheduling priority             (-e) 0
file size               (blocks, -f) unlimited
pending signals                 (-i) 7651
max locked memory       (kbytes, -l) 64
max memory size         (kbytes, -m) unlimited
open files                      (-n) 1024
pipe size            (512 bytes, -p) 8
POSIX message queues     (bytes, -q) 819200
real-time priority              (-r) 0
stack size              (kbytes, -s) 8192
cpu time               (seconds, -t) unlimited
max user processes              (-u) 7651
virtual memory          (kbytes, -v) unlimited
file locks                      (-x) unlimited
```

#### 生产环境范例

- 在原有 /etc/security/limits.conf 文件中追加以下内容

```sh
*                soft    core            unlimited
*                hard    core            unlimited
*                soft    nproc           1000000
*                hard    nproc           1000000
*                soft    nofile          1000000
*                hard    nofile          1000000
*                soft    memlock         32000
*                hard    memlock         32000
*                soft    msgqueue        8192000
*                hard    msgqueue        8192000
```

#### 修改前和修改后对比

```bash
#提示打开文件过多
# ab -n5000 -c3000 http://10.0.0.8/
...
socket: Too many open files (24)


#修改limit限制
省略。。.

#OK
# ab -n 5000 -c 3000 10.0.0.8/
...
Benchmarking 10.0.0.8 (be patient)
Completed 500 requests
Completed 1000 requests
Completed 1500 requests
...
```

#### limit文件不生效解决方案

- 检查此文件是否开启

```bash
# grep -i pam /etc/ssh/sshd_config
...
UsePAM yes
...
```

- 内核参数是否有限制

```bash
# cat /proc/sys/fs/nr_open 
1048576

# sysctl -a | grep nr_open
fs.nr_open = 1048576
```



### pam_succeed_if

- 功能：根据参数中的所有条件都满足才返回成功

#### 案例：ubuntu默认不允许root登录桌面图形

- 用root登录桌面失败，查看日志，可看到Pam原因

```bash
# Vim /etc/pam.d/gdm-passwd
#将下面行注释
#auth requried pam_succeed_if.so user !=root quiet_success
```



### pam_google_authenticator

- 功能：实现SSH登录的两次身份验证，先验证APP的数字码，再验证root用户的密码，都通过才可以登录。目前只支持口令验证，不支持基于key验证

- 官方网站：https://github.com/google/google-authenticator-android







# 优化系统初始的pam_limits.so模块

- 否则系统的初始值都比较保守，不够用

```bash
vim /etc/security/limits.conf  

*    -   core    unlimited
*    -   nproc       1000000
*    -   nofile   1000000
*    -   memlock     32000
*    -   msgqueue    8192000

#*所有用户   -软硬同时限定    属性   值
```

配置文件在config文件夹里，需要的时候直接用

（属性类型可以查看/etc/security/limits.conf文件#开头的说明）：

-core -限制核心文件大小(KB)

-date-最大数据大小(KB)

fsize -最大文件大小(KB)

memlock - max锁在内存中的地址空间

-nofile -打开文件描述符的最大数目

-rss -最大常驻设置大小(KB)

-堆栈最大堆栈大小(KB)

cpu -最大cpu时间(MIN)

nproc -最大进程数

as地址空间限制(KB)

-maxlogins -该用户的最大登录数

-maxsyslogins -系统最大登录数

-priority -运行用户进程的优先级

-locks -用户可以持有的最大文件锁定数

-sigpending -最大待定信号数

-msgqueue - POSIX消息队列所使用的最大内存(字节)

-nice - max nice优先级允许提高到值:[- 20,19]

-rtprio - max实时优先级





