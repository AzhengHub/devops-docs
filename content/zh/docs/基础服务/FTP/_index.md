---
title: "FTP"
---

## FTP 概述

FTP（文件传输协议）是一种用于在计算机网络上进行文件传输的协议。它允许计算机之间通过TCP/IP网络进行文件的上传和下载。

FTP的通信包括两个通道：控制通道和数据通道。控制通道用于发送命令和接收服务器的响应，而数据通道用于实际传输文件数据。

FTP有匿名FTP和认证FTP两种方式。匿名FTP允许用户在不提供用户名和密码的情况下访问公共文件服务器，通常用于提供公共的软件、文档或其他文件下载。认证FTP则需要用户提供有效的用户名和密码来访问特定的FTP服务器，用于限制对文件的访问权限。

虽然FTP在过去几十年中一直是文件传输的主要协议之一，但它已逐渐被更安全和高效的协议替代，例如SSH文件传输协议（SFTP）和HTTP文件传输协议（HTTP）等。

### 工作模式
1. 主动模式 (Active/PORT)：**服务端**主动连接客户端，服务端数据端口为固定的20
2. 被动模式 (Passive/PASV)：**客户端**主动连接服务端，服务端数据端口为随机端口或自定义范围（如 61001-61100）





##  FTP 服务端管理
- 提供 ftp 的软件有很多，但常见的就是vsftpd（Linux 平台）和 Filezilla（Windows 平台）
### 安装
离线安装：
```sh
# 在能上网的机器下载安装包，并拷贝到目标机器
mkdir -p /opt/vsftpd_all_rpm
dnf install -y dnf-utils
dnf download vsftpd --resolve --destdir=/opt/vsftpd_all_rpm
scp vsftpd-3.0.5-3.oe2403sp3.x86_64.rpm <目标IP地址>:

# 离线安装
rpm -ivh vsftpd-3.0.5-3.oe2403sp3.x86_64.rpm
systemctl enable --now vsftpd
systemctl status vsftpd
```

在线安装：
```sh
dnf install -y vsftpd
```

### 配置
```sh
# 创建配置文件
cat > /etc/vsftpd/vsftpd.conf << EOF
anonymous_enable=NO
local_enable=YES
write_enable=YES
local_umask=022
dirmessage_enable=YES
xferlog_enable=YES
connect_from_port_20=YES
xferlog_std_format=YES
listen=YES
listen_ipv6=NO
pam_service_name=vsftpd
userlist_enable=YES
chroot_local_user=YES
allow_writeable_chroot=YES
local_root=/lswj
listen_port=22221
pasv_enable=YES
pasv_min_port=61001
pasv_max_port=61100
EOF

# 创建指定目录
mkdir -p /lswj

# 创建用户，指定家目录为 /lswj，且禁止通过 SSH 登录 (-s /sbin/nologin)
useradd -d /lswj -s /sbin/nologin ftpuserwxjc

# 设置用户密码 (wxjc@ZXJC@123)
echo "ftpuserwxjc:wxjc@ZXJC@123" | chpasswd

# 将 /lswj 目录的所有者和所属组改为刚才创建的用户
chown -R ftpuserwxjc:ftpuserwxjc /lswj

# 赋予该目录 755 权限 (所有者可读写执行，其他人可读执行)
chmod -R 755 /lswj
```

语法检查：
```sh
# 直接执行命令，或执行绝对路径，没有报错就是语法通过了
vsftpd
/usr/sbin/vsftpd /etc/vsftpd/vsftpd.conf
killall -9 vsftpd # 上面的方式测试，需要清理掉多出的 vsftpd 进程，否则会干扰主进程运行

# 或者直接重启测试
systemctl restart vsftpd
```

测试上传文件：
```sh
# 临时允许登录
echo "/sbin/nologin" >> /etc/shells

# 先在随便一个目录下创建一个测试文件：
echo "Hello FTP" > /tmp/test.txt

# 然后使用 curl 命令尝试把它上传到 FTP (注意密码里的特殊字符用了单引号包裹)：
curl -v -T /tmp/test.txt -u ftpuserwxjc:'wxjc@ZXJC@123' ftp://127.0.0.1:22221/

# 检查 /lswj 目录，应该能看到刚刚传上去的文件：
ls -l /lswj/test.txt
```