---
title: "OpenVPN"
---

## Open VPN 概述

- Virtual private network 虚拟私人网络，又称为虚拟专用网络，用于在不安全的线路上安全传输数据

- OpenVPN 是一个实现 VPN 的开源软件
- OpenVPN 是一个健壮的、高度灵活的 VPN 守护进程。它支持 SSL/TLS 安全，Ethernet brideing、经由代理的 TCP 或 UDP 隧道和NAT。另外，它也支持动态IP地址以及DHCP，可伸缩性足以支持数百或数千用户的使用场景，同时还可以移植到大多数的操作系统平台上
- GitHub：https://github.com/OpenVPN/openvpn/pulse
- GitHub：https://github.com/OpenVPN/openvpn
- 官网：https://openvpn.net/

**NAT与VPN：**

- vpn本身就是使用了NAT技术，在VPN客户端访问局域网内部主机时，通过DNAT来实现将VPN客户端的公网IP转换成可以访问内部网络的防火墙公网地址，从而实现与内部网络通信

**涉及端口**

- 1194



## Open VPN 数据流

- OpenVPN 客户端首先会访问防火墙的公网IP（防火墙的公网IP通常监听1194端口，这也是 OpenVPN 的默认监听端口），然后由防火墙将客户端的请求转发给内部的 OpenVPN 服务器
- OpenVPN 服务器也可以直接配置公网IP被客户端所访问 但是并不安全，假设 OpenVPN 服务器配置了公网IP后被黑客所攻击无法访问后，运维等人员将无法通过这个入口直接访问公司内部网络了，反之将 OpenVPN 服务器放在防火墙后面可以大大的提高安全性
- OpenVPN 客户端到防火墙一直到 OpenVPN 服务端 这段的报文是加密的（因为中间涉及到了公网的各种路由转发 所以不安全），从 OpenVPN 服务端到企业内部的 nginx、MySQL等服务器通常是不加密的







## 实现流程概述

1. 在具有公网IP的服务器安装 openvpn 和 easy-rsa(OpenVPN旗下的证书管理工具，类似openssl)
2. 创建CA（用于后续证书的申请和吊销）
3. 创建服务端自签名证书
4. 申请客户端证书（就是给生产环境中需要通过vpn访问公司内部网络的人员创建证书）






## 实验环境

| 服务名         | 公网地址      | 私网地址          | 子网掩码      |
| -------------- | ------------- | ----------------- | ------------- |
| openvpn-server | 8.140.166.135 | 172.27.185.115/20 | 255.255.240.0 |
| back-server1   |               | 172.27.185.116/20 | 255.255.240.0 |
| back-server2   |               | 172.27.185.117/20 | 255.255.240.0 |
| back-server2   |               | 172.27.185.118/20 | 255.255.240.0 |







## openvpn 安装

- 官方文档 : https://openvpn.net/community-resources/how-to/#installing-openvpn

- 来自epel源

### 安装

```bash filename="openvpn/server-install.sh"
#centos安装
yum -y install openvpn

#Ubuntu安装
apt -y install openvpn
```

### 安装后配置

- 拷贝服务端配置文件模板

```bash
# cp /usr/share/doc/openvpn/sample/sample-config-files/server.conf /etc/openvpn/
```

- 准备日志存放目录

```bash
mkdir /var/log/openvpn

chown -R openvpn.openvpn /var/log/openvpn/
```



### 配置后的文件

```bash
# tree /etc/openvpn/
/etc/openvpn/
├── client
├── server
└── server.conf #

2 directories, 1 file
```



### openvpn 相关文件说明

```bash
# rpm -ql openvpn
...
/etc/openvpn/client
/etc/openvpn/server
/run/openvpn-client
/run/openvpn-server
/usr/lib/.build-id
/usr/lib/.build-id/66
/usr/lib/.build-id/66/bd0dab2368dc0d844282225cb7f20f1db4bd9b
/usr/lib/.build-id/9e
/usr/lib/.build-id/9e/360159708bfe37bf6bbae0fa9facffbd2556dc
/usr/lib/.build-id/ca
/usr/lib/.build-id/ca/29127991f2fbcd366ca4d99df93d6d333eebcd
/usr/lib/systemd/system/openvpn-client@.service
/usr/lib/systemd/system/openvpn-server@.service
/usr/lib/tmpfiles.d/openvpn.conf
/usr/lib64/openvpn
/usr/lib64/openvpn/plugins
/usr/lib64/openvpn/plugins/openvpn-plugin-auth-pam.so
/usr/lib64/openvpn/plugins/openvpn-plugin-down-root.so
/usr/sbin/openvpn
/usr/share/doc/openvpn
/usr/share/doc/openvpn/AUTHORS
/usr/share/doc/openvpn/COPYING
/usr/share/doc/openvpn/COPYRIGHT.GPL
/usr/share/doc/openvpn/ChangeLog
/usr/share/doc/openvpn/Changes.rst
/usr/share/doc/openvpn/README
/usr/share/doc/openvpn/README.auth-pam
/usr/share/doc/openvpn/README.down-root
/usr/share/doc/openvpn/README.systemd
/usr/share/doc/openvpn/contrib
/usr/share/doc/openvpn/contrib/OCSP_check
/usr/share/doc/openvpn/contrib/OCSP_check/OCSP_check.sh
/usr/share/doc/openvpn/contrib/README
/usr/share/doc/openvpn/contrib/openvpn-fwmarkroute-1.00
/usr/share/doc/openvpn/contrib/openvpn-fwmarkroute-1.00/README
/usr/share/doc/openvpn/contrib/openvpn-fwmarkroute-1.00/fwmarkroute.down
/usr/share/doc/openvpn/contrib/openvpn-fwmarkroute-1.00/fwmarkroute.up
/usr/share/doc/openvpn/contrib/pull-resolv-conf
/usr/share/doc/openvpn/contrib/pull-resolv-conf/client.down
/usr/share/doc/openvpn/contrib/pull-resolv-conf/client.up
/usr/share/doc/openvpn/management-notes.txt
/usr/share/doc/openvpn/sample
/usr/share/doc/openvpn/sample/sample-config-files
/usr/share/doc/openvpn/sample/sample-config-files/README
/usr/share/doc/openvpn/sample/sample-config-files/client.conf
/usr/share/doc/openvpn/sample/sample-config-files/firewall.sh
/usr/share/doc/openvpn/sample/sample-config-files/home.up
/usr/share/doc/openvpn/sample/sample-config-files/loopback-client
/usr/share/doc/openvpn/sample/sample-config-files/loopback-server
/usr/share/doc/openvpn/sample/sample-config-files/office.up
/usr/share/doc/openvpn/sample/sample-config-files/openvpn-shutdown.sh
/usr/share/doc/openvpn/sample/sample-config-files/openvpn-startup.sh
/usr/share/doc/openvpn/sample/sample-config-files/roadwarrior-client.conf
/usr/share/doc/openvpn/sample/sample-config-files/roadwarrior-server.conf
/usr/share/doc/openvpn/sample/sample-config-files/server.conf #服务端配置文件模板
/usr/share/doc/openvpn/sample/sample-config-files/static-home.conf
/usr/share/doc/openvpn/sample/sample-config-files/static-office.conf
/usr/share/doc/openvpn/sample/sample-config-files/tls-home.conf
/usr/share/doc/openvpn/sample/sample-config-files/tls-office.conf
/usr/share/doc/openvpn/sample/sample-config-files/xinetd-client-config
/usr/share/doc/openvpn/sample/sample-config-files/xinetd-server-config
/usr/share/doc/openvpn/sample/sample-scripts
/usr/share/doc/openvpn/sample/sample-scripts/auth-pam.pl
/usr/share/doc/openvpn/sample/sample-scripts/bridge-start
/usr/share/doc/openvpn/sample/sample-scripts/bridge-stop
/usr/share/doc/openvpn/sample/sample-scripts/ucn.pl
/usr/share/doc/openvpn/sample/sample-scripts/verify-cn
/usr/share/doc/openvpn/sample/sample-windows
/usr/share/doc/openvpn/sample/sample-windows/sample.ovpn
/usr/share/man/man8/openvpn.8.gz
/var/lib/openvpn
```







## easy-rsa 安装

- easy-rsa是一个OpenVPN旗下的证书管理工具
- URL : https://github.com/OpenVPN/easy-rsa

### 安装

```bash
#centos安装
dnf -y install easy-rsa

#Ubuntu安装
apt -y install easy-rsa
```

### 安装后配置

#### 拷贝证书管理工具

```bash
#服务端一份
cp -r /usr/share/easy-rsa/ /etc/openvpn/easyrsa-server

#客户端一份
cp -r /usr/share/easy-rsa/ /etc/openvpn/easyrsa-client
```

#### 拷贝环境变量配置文件

```bash
#服务端一份
cp /usr/share/doc/easy-rsa/vars.example /etc/openvpn/easyrsa-server/3/vars

#客户端一份
cp /usr/share/doc/easy-rsa/vars.example /etc/openvpn/easyrsa-client/3/vars
```

#### 初始化pki环境

- 准备两套pki环境

```sh
#服务端初始化
# cd /etc/openvpn/easyrsa-server/3
# ./easyrsa init-pki
...
Your newly created PKI dir is: /etc/openvpn/easyrsa-server/3/pki

# ll /etc/openvpn/easyrsa-server/3/pki
total 16
-rw------- 1 root root 4616 Oct  7 14:55 openssl-easyrsa.cnf
drwx------ 2 root root    6 Oct  7 14:55 private
drwx------ 2 root root    6 Oct  7 14:55 reqs
-rw------- 1 root root 4720 Oct  7 14:55 safessl-easyrsa.cnf

-------------------------------------------------------------------------

#客户端初始化
# cd /etc/openvpn/easyrsa-client/3/
# ./easyrsa init-pki
...
Your newly created PKI dir is: /etc/openvpn/easyrsa-client/3/pki
```



### 配置后的文件

```bash
# tree /etc/openvpn/
/etc/openvpn/
├── client
├── easyrsa-client #客户端使用
│   ├── 3 -> 3.0.8
│   ├── 3.0 -> 3.0.8
│   └── 3.0.8
│       ├── easyrsa
│       ├── openssl-easyrsa.cnf
│       ├── pki #客户端pki环境
│       │   ├── openssl-easyrsa.cnf
│       │   ├── private #证书存放目录
│       │   ├── reqs #证书申请文件存放目录
│       │   └── safessl-easyrsa.cnf
│       ├── vars
│       └── x509-types
│           ├── ca
│           ├── client
│           ├── code-signing
│           ├── COMMON
│           ├── email
│           ├── kdc
│           ├── server
│           └── serverClient
├── easyrsa-server #服务端使用
│   ├── 3 -> 3.0.8
│   ├── 3.0 -> 3.0.8
│   └── 3.0.8
│       ├── easyrsa
│       ├── openssl-easyrsa.cnf
│       ├── pki #服务端pki环境
│       │   ├── openssl-easyrsa.cnf
│       │   ├── private #证书私钥存放目录
│       │   ├── reqs #证书申请文件存放目录
│       │   └── safessl-easyrsa.cnf
│       ├── vars
│       └── x509-types
│           ├── ca
│           ├── client
│           ├── code-signing
│           ├── COMMON
│           ├── email
│           ├── kdc
│           ├── server
│           └── serverClient
├── server
└── server.conf

18 directories, 27 files
```

### easy-rsa 相关文件说明

```bash
# rpm -ql easy-rsa
...
/usr/share/doc/easy-rsa/vars.example #环境变量配置文件，配置证书签发的有效期等
/usr/share/easy-rsa/3.0.8/easyrsa #此二进制程序主要用于签发证书
...
```





## 证书相关文件说明

- .key 私钥文件
- .crt 证书文件（certs的缩写，Linux默认的后缀）
- .cer 证书文件（certs的缩写，Windows默认的后缀）
- ca 证书机构
- .req 证书签名申请文件
- .csr 证书签名申请文件（Open SSL默认）
- .crl 证书吊销列表文件（Windows默认的后缀）
- .pem 证书吊销列表文件（Open SSL默认）





## 创建CA

- 创建CA签发机构

- 为了给openvpn和客户端签发证书，需要先创建CA


```sh
#创建ca并且不使用密码
# cd /etc/openvpn/easyrsa-server/3
# ./easyrsa build-ca nopass
...
Common Name (eg: your user, host, or server name) [Easy-RSA CA]: #描述信息，直接回车即可

CA creation complete and you may now import and sign cert requests.
Your new CA certificate file for publishing is at:
/etc/openvpn/easyrsa-server/3/pki/ca.crt #生成的ca证书文件存放位置


# tree /etc/openvpn/easyrsa-server/3/pki
/etc/openvpn/easyrsa-server/3/pki
├── ca.crt #ca的证书文件
├── certs_by_serial
├── index.txt
├── index.txt.attr
├── issued
├── openssl-easyrsa.cnf
├── private
│   └── ca.key #ca的私钥文件
├── renewed
│   ├── certs_by_serial
│   ├── private_by_serial
│   └── reqs_by_serial
├── reqs
├── revoked
│   ├── certs_by_serial
│   ├── private_by_serial
│   └── reqs_by_serial
├── safessl-easyrsa.cnf
└── serial

12 directories, 7 files
```





## 创建服务端自签名证书

### 申请OpenVPN服务端证书

```sh
# cd /etc/openvpn/easyrsa-server/3
# ./easyrsa gen-req server nopass
...
Common Name (eg: your user, host, or server name) [server]: #可以直接回车

Keypair and certificate request completed. Your files are:
req: /etc/openvpn/easyrsa-server/3/pki/reqs/server.req #服务端证书申请文件
key: /etc/openvpn/easyrsa-server/3/pki/private/server.key #服务端证书私钥文件
```

### 签发OpenVPN服务端证书

- **使用刚才创建的CA签发服务器证书**
- 即生成服务端crt公钥，crt公钥后期由用户发送给客户端，从而实现与openvpn server端加密传输数据？？？？

```sh
# cd /etc/openvpn/easyrsa-server/3
# ./easyrsa sign-req server server
...
Request subject, to be signed as a server certificate for 825 days: #证书的有效时长

subject=
    commonName                = server #通用名称

Type the word 'yes' to continue, or any other input to abort.
  Confirm request details: yes #输入yes继续

...
Data Base Updated

Certificate created at: /etc/openvpn/easyrsa-server/3/pki/issued/server.crt #生成的openvpen服务端的公钥（证书）


#这两个文件是一对
# ll pki/issued/
-rw------- 1 root root 4608 Oct  7 15:43 server.crt #openvpen服务端证书
# ll pki/private/
-rw------- 1 root root 1704 Oct  7 15:24 server.key #openvpen服务端私钥
```

### 创建 Diffie-Hellman 秘钥

```sh
# cd /etc/openvpn/easyrsa-server/3
# ./easyrsa gen-dh
.....................................................................................+...................++*++*++*++*

DH parameters of size 2048 created at /etc/openvpn/easyrsa-server/3/pki/dh.pem #生成的密钥
```







## 申请客户端证书

- 给生产环境中需要通过vpn访问公司内部网络的人员创建证书

### 设置证书自动过期时长

- 设置证书自动过期时间，防止员工离职后忘记吊销证书，从而通过VPN进入公司内部网络 对公司的数据安全造成影响

```bash
#90天自动过期
echo 'set_var EASYRSA_CERT_EXPIRE 90' >> /etc/openvpn/easyrsa-server/3/vars
```

### 生成客户端证书

```bash
# cd /etc/openvpn/easyrsa-client/3
# ./easyrsa gen-req xiangzheng
...
Enter PEM pass phrase: #设置一个密码（必须为4到1024个字符）
Verifying - Enter PEM pass phrase: #确认密码
...
Common Name (eg: your user, host, or server name) [xiangzheng]: #描述信息不用填直接回车

Keypair and certificate request completed. Your files are:
req: /etc/openvpn/easyrsa-client/3/pki/reqs/xiangzheng.req #用户的证书申请文件
key: /etc/openvpn/easyrsa-client/3/pki/private/xiangzheng.key #用户的私钥文件
```

### 签发客户端证书

- 在easyrsa-server目录中签发证书，因为CA在此处


```bash
#server端导入req（证书申请）文件
# cd /etc/openvpn/easyrsa-server/3
# ./easyrsa import-req /etc/openvpn/easyrsa-client/3/pki/reqs/xiangzheng.req xiangzheng

------------------------------------------------------------------

#server端签发客户端证书
# cd /etc/openvpn/easyrsa-server/3
# ./easyrsa sign client xiangzheng
...
Request subject, to be signed as a client certificate for 90 days: #确认有效期是否为90天
...
Type the word 'yes' to continue, or any other input to abort.
  Confirm request details: yes #输入yes确认签发
...
Certificate created at: /etc/openvpn/easyrsa-server/3/pki/issued/xiangzheng.crt

#验证签发后的用户crt证书：
# ll /etc/openvpn/easyrsa-server/3/pki/issued/xiangzheng.crt
-rw------- 1 root root 4500 Mar 26 16:18 /etc/openvpn/easyrsa-server/3/pki/issued/xiangzheng.crt
```







## 整理证书

- 对签发的服务端证书进行归档保存，可选项，但是归档保存便于管理

### CA和服务端证书相关归档保存

#### 创建目录

- 目录名称可以自定义

```bash
mkdir /etc/openvpn/certs
```

#### 复制证书相关文件

```sh
cd /etc/openvpn/certs

cp /etc/openvpn/easyrsa-server/3/pki/dh.pem .

cp /etc/openvpn/easyrsa-server/3/pki/ca.crt .

cp /etc/openvpn/easyrsa-server/3/pki/issued/server.crt .

cp /etc/openvpn/easyrsa-server/3/pki/private/server.key .
```

#### 准备ta.key文件

- 可选项，加上更安全

```bash
cd /etc/openvpn/certs

openvpn --genkey --secret ta.key
```

#### 验证文件

```bash
cd /etc/openvpn/certs

ls -l
total 24
-rw------- 1 root root 1204 Mar 26 17:06 ca.crt
-rw------- 1 root root  424 Mar 26 17:05 dh.pem
-rw------- 1 root root 4608 Mar 26 17:06 server.crt
-rw------- 1 root root 1708 Mar 26 17:06 server.key
-rw------- 1 root root  636 Mar 26 17:06 ta.key
```



### 客户端证书相关归档保存

#### 创建目录

- 其他用户同理

```bash
mkdir /etc/openvpn/client/xiangzheng
```

#### 复制证书相关文件

```bash
cd /etc/openvpn/client/xiangzheng

#将ta.key文件拷贝一份到客户端目录
cp /etc/openvpn/certs/ta.key .

#将ca证书拷贝一份到客户端目录
cp /etc/openvpn/easyrsa-server/3/pki/ca.crt . 

#其他用户同理
cp /etc/openvpn/easyrsa-server/3/pki/issued/xiangzheng.crt .

#其他用户同理
cp /etc/openvpn/easyrsa-client/3/pki/private/xiangzheng.key .
```

#### 验证文件

```bash
# ll /etc/openvpn/client/xiangzheng
total 24
-rw------- 1 root root 1204 Mar 26 17:14 ca.crt
-rw------- 1 root root  636 Mar 26 17:12 ta.key
-rw------- 1 root root 4500 Mar 26 17:14 xiangzheng.crt
-rw------- 1 root root 1854 Mar 26 17:14 xiangzheng.key
```

#### 其他用户同理

```bash
# pwd
/etc/openvpn/client

# tree 
.
├── xiangzheng
│   ├── ca.crt
│   ├── ta.key
│   ├── xiangzheng.crt
│   └── xiangzheng.key
└── xiaoming
    ├── ca.crt
    ├── ta.key
    ├── xiaoming.crt
    └── xiaoming.key
```





## 修改服务端配置文件

- **Github**：https://github.com/OpenVPN/openvpn/blob/master/sample/sample-config-files/server.conf
- **官方文档**：https://openvpn.net/community-resources/how-to/#creating-configuration-files-for-server-and-clients

### 服务端配置文件说明

```bash
# vim /etc/openvpn/server.conf
;local a.b.c.d #本机监听IP，默认监听在本机，一般配置0.0.0.0即可

port 1194 #本机监听端口

;proto tcp #使用tcp协议，通常都是使用tcp

proto udp #使用udp协议

;dev tap #创建一个以太网隧道（数据链路层）

dev tun #创建一个路由IP隧道（网络层）

;dev-node MyTap #TAP-win32适配器，非Windows不需要，注释即可

ca ca.crt #ca证书，建议写绝对路径
cert server.crt #服务器证书
key server.key  #服务器证书私钥

dh dh2048.pem #Diffie-Hellman秘钥存放位置，建议写绝对路径

;topology subnet #网络拓扑，不需要配置

server 10.8.0.0 255.255.255.0  #客户端连接后分配IP的地址池，服务器默认会占用第一个IP 10.8.0.1(也可以定义其他的网段)
#生产中如果客户端连接的人建议子网掩码调大，比如：255.255.0.0
#255.255.255.0 可用地址数：254
#255.255.0.0 可用地址数：65534

;ifconfig-pool-persist ipp.txt #为客户端分配固定IP，不需要配置

;server-bridge 10.8.0.4 255.255.255.0 10.8.0.50 10.8.0.100 #配置网桥模式，不需要配置

;server-bridge #配置网桥模式，不需要配置


#非常重要：
;push "route 192.168.10.0 255.255.255.0"
;push "route 192.168.20.0 255.255.255.0"
#官方翻译：向客户端推送路由以允许它到达后面的其他私有子网服务器。记住这些私有子网也需要知道路由 OpenVPN 客户端地址池（10.8.0.0/255.255.255.0）
#简述：给客户端生成的静态路由表，下一跳为openvpn服务器的10.8.0.1，地址段为openvpn服务器后的公司内部网络，可以是多个网段
#说白了就是需要将IP地址和子网掩码修改成openvpn后面服务器的地址以及网段


;client-config-dir ccd #为指定的客户端添加路由，改路由通常是客户端后面的内网网段而不是服务端的，所以，不需要配置
;route 192.168.40.128 255.255.255.248 #无需配置
;client-config-dir ccd #无需配置
;route 10.9.0.0 255.255.255.252 #无需配置

;learn-address ./script #运行外部脚本，创建不同组的iptables规则，不需要配置

;push "redirect-gateway def1 bypass-dhcp" #启用后，客户端所有流量都将通过VPN服务器(如网页浏览等..)，因此不需要配置(配置私有VPN需开启)

;push "dhcp-option DNS 208.67.222.222" #推送DNS服务器，不需要配置
;push "dhcp-option DNS 208.67.220.220"

;client-to-client #允许不同的client通过openvpn server直接通信，默认情况下 客户端只会看到服务器，不需要配置

;duplicate-cn #多个用户共用一个账户，一般用于测试环境，生产环境都是一个用户一个证书（便于排错或追责），默认不共用一个账户，不需要配置

keepalive 10 120 #设置服务端检测的间隔和超时时间，默认为每10秒ping客户端一次，如果120秒没有回应则认为对方已经down

tls-auth ta.key 0 #加密，openvpn --genkey --secret ta.key 来生成该key，服务器和每个客户端必须具有该key，最后的参数服务端为0 客户端为1，ta.key文件建议写绝对路径

cipher AES-256-CBC #加密算法，默认即可

#压缩相关选项，生产中一般无需配置
;compress lz4-v2 #启用压缩，客户端选项仅限 v2.4+以上版本，
;push "compress lz4-v2" #启用压缩，客户端选项仅限 v2.4+以上版本，
;comp-lzo #对于与旧客户端兼容的压缩，请使用 comp-lzo，如果你在这里启用它，你还必须在客户端配置文件中启用它

;max-clients 100 #最大客户端连接数，默认值较小，建议调大，如：300

;user nobody #运行openvpn的用户，也可以使用默认的openvpn账号启动
;group nobody #运行openvpn的组，也可以使用默认的openvpn账号启动

;persist-key #此行注释则重启openVPN服务后会重新读取keys文件，生产中建议保持默认即可，开启也没问题，但是重启openVPN服务后重新加载设备还是比较好的
;persist-tun #此行注释则重启openVPN服务后会重新加载tun设备，生产中建议保持默认即可，开启也没问题，但是重启openVPN服务后重新加载设备还是比较好的


status openvpn-status.log #openVPN状态记录文件，每分钟会记录一次

;log         openvpn.log #日志记录方式和路径，重启后清空日志，生产中不建议开启
;log-append  openvpn.log #日志记录方式和路径，重启后不会清空日志，日志会一直追加，生产中建议开启

verb 3 #设置日志级别，0-9，级别越高记录的内容越详细

;mute 20 #相同类别的信息只有前20条会输出到日志文件中

;explicit-exit-notify 1 #通知客户端，在服务端重启后可以自动重新连接，仅能用于udp模式，tcp模式不需要配置即可实现断开重连接，且tcp配置后会导致openVPN无法启动，生产中建议禁用
```

### 服务端配置最终配置

```sh
# grep '^[a-Z]' /etc/openvpn/server.conf
local 0.0.0.0 
port 1194
proto tcp
dev tun
ca /etc/openvpn/certs/ca.crt
cert /etc/openvpn/certs/server.crt
key /etc/openvpn/certs/server.key
dh /etc/openvpn/easyrsa-server/3/pki/dh.pem
server 10.8.0.0 255.255.0.0
push "route 172.27.176.0 255.255.240.0" #一定要指向后端服务器的网段
keepalive 10 120
tls-auth /etc/openvpn/certs/ta.key 0
cipher AES-256-CBC
max-clients 300
user openvpn 
group openvpn
persist-key
persist-tun
status openvpn-status.log
log-append  /var/log/openvpn/openvpn.log
verb 3
```







## 修改客户端配置文件

- **Github**：https://github.com/OpenVPN/openvpn/blob/master/sample/sample-config-files/client.conf
- **官方文档**：https://openvpn.net/community-resources/how-to/#creating-configuration-files-for-server-and-clients

### 客户端拷贝配置文件模板

- 其他账号同理

```bash
#Windows需要将配置文件改为.ovpn后缀结尾
grep -Ev "^(#|;|$)" /usr/share/doc/openvpn/sample/sample-config-files/client.conf > /etc/openvpn/client/xiangzheng/client.ovpn
```

### 客户端配置文件说明

```bash
# /etc/openvpn/client/xiangzheng/client.ovpn
client #声明自己为客户端

dev tun #接口类型，必须和服务端保持一致

proto tcp #使用的从传输协议，必须和客户端保持一致

remote 8.140.166.135 1194 #server端的ip和端口，可以写域名但是需要可以解析成IP

resolv-retry infinite #如果写的是server端的域名，那么就始终解析，如果域名发生变化，则会重新连接到新的域名对应的IP

nobind #本机不绑定监听端口，因为客户端是打开随机端口连接到服务端的1194端口的

persist-key

persist-tun

ca ca.crt

cert xiangzheng.crt

key xiangzheng.key

remote-cert-tls server #指定采用服务器校验方式

tls-auth ta.key 1

cipher AES-256-CBC

verb 3

#验证当前目录
# tree /etc/openvpn/client/xiangzheng
/etc/openvpn/client/xiangzheng
├── ca.crt
├── client.ovpn
├── ta.key
├── xiangzheng.crt
└── xiangzheng.key


#修改完可以将模板文件拷贝到整理目录中
cp /etc/openvpn/client/xiangzheng/client.ovpn /etc/openvpn/certs/
```

### 客户端配置最终配置

```bash
# vim /etc/openvpn/client/xiangzheng/client.ovpn
client
dev tun
proto tcp
remote 8.140.166.135 1194
resolv-retry infinite
nobind
persist-key
persist-tun
ca ca.crt
cert xiangzheng.crt
key xiangzheng.key
remote-cert-tls server
tls-auth ta.key 1
cipher AES-256-CBC
verb 3
```



## 启动openVPN服务

### 添加防火墙规则

#### 前期准备

```bash
#先关闭并禁用firewalld（如果存在的情况下）
systemctl stop firewalld
systemctl disable firewalld
systemctl mask firewalld

#安装iptables相关包
yum -y install iptables iptables-services

#将iptables开启并设为开机自启动
systemctl enable --now iptables.service

#清空iptables规则（如果存在默认规则的情况下）
iptables -F  # 清空所有的防火墙规则
iptables -X  # 删除用户自定义的空链
iptables -Z  # 清空计数
iptables -t nat -F # 清空所有的防火墙规则(针对nat表)
iptables -t nat -X # 删除用户自定义的空链(针对nat表)
iptables -t nat -Z # 清空计数(针对nat表)
```

#### 创建iptables规则

注意公有云安全组规则也要放行 TCP/1194 端口

- **必填规则**

```bash
# 定义SNAT规则
# 10.8.0.0/16要修改成OpenVPN服务端定义的网段，如：server 10.8.0.0 255.255.0.0
iptables -t nat -A POSTROUTING -s 10.8.0.0/16 -j MASQUERADE
```

- **可选规则**

```bash
# 通过TCP连接访问本机的1194端口设为允许（公有云环境可以直接在安全组规则中放行）
iptables -A INPUT -p TCP --dport 1194 -j ACCEPT



# 这条规则的具体作用？？？
# 调用state扩展模块
# ESTABLISHED：NEW状态之后，连接追踪信息库中为其建立的条目失效之前期间内所进行的通信状态
# RELATED：新发起的但与已有连接相关联的连接，如：ftp协议中的数据连接与命令连接之间的关系
iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT
```

- **保存规则**

```bash
# 方法一
[root@openvpn-server ~]# service iptables save
iptables: Saving firewall rules to /etc/sysconfig/iptables:[  OK  ]

# 方法二
# 修改规则
# vim /etc/sysconfig/iptables
...
# 重新加载 iptables
# systemctl reload iptables.service
```



### 修改内核参数

- 修改内核参数，开启路由转发功能

```bash
echo 'net.ipv4.ip_forward = 1' >> /etc/sysctl.conf

sysctl -p
```

### 启动openVPN服务

```bash
#启动openVPN服务
systemctl enable --now  openvpn-server@multi-user.service

#确认1194端口是否开启
# ss -ntlp|grep 1194
LISTEN    0         32                 0.0.0.0:1194             0.0.0.0:*        users:(("openvpn",pid=316205,fd=5))

#验证tun设备是否开启
# ip address show tun0 
3: tun0: <POINTOPOINT,MULTICAST,NOARP,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UNKNOWN group default qlen 100
    link/none 
    inet 10.8.0.1 peer 10.8.0.2/32 scope global tun0
       valid_lft forever preferred_lft forever
    inet6 fe80::9d14:5a9d:95d:e2ac/64 scope link stable-privacy 
       valid_lft forever preferred_lft forever

```

#### 不能启动openvpn服务解决方案

- 观察配置文件调用关系：

```bash
# vim /usr/lib/systemd/system/openvpn-server@.service
...
[Service]
...
WorkingDirectory=/etc/openvpn/
ExecStart=...--config server.conf
...

# systemctl daemon-reload

#启动openVPN服务
systemctl enable --now  openvpn-server@multi-user.service

#确认1194端口是否开启
# ss -ntlp|grep 1194
LISTEN    0         32                 0.0.0.0:1194             0.0.0.0:*        users:(("openvpn",pid=316205,fd=5))            

#验证tun设备是否开启
# ip address show tun0 
3: tun0: <POINTOPOINT,MULTICAST,NOARP,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UNKNOWN group default qlen 100
    link/none 
    inet 10.8.0.1 peer 10.8.0.2/32 scope global tun0
       valid_lft forever preferred_lft forever
    inet6 fe80::9d14:5a9d:95d:e2ac/64 scope link stable-privacy 
       valid_lft forever preferred_lft forever
```



## 证书的打包

- 可选项，可以将生成的证书等相关文件打包压缩并通过邮件发送给所需人员

```bash
[root@openvpn-server ~]# cd /etc/openvpn/client/xiangzheng/

#不加密码打包压缩
[root@openvpn-server xiangzheng]# tar zcfv xiangzheng.tar.gz ./* 
./ca.crt
./client.ovpn
./xiangzheng.crt
./xiangzheng.key
[root@openvpn-server xiangzheng]# sz xiangzheng.tar.gz


#加密码打包压缩
[root@aliyun xiangzheng]# zip -P "123456" xiangzheng.zip ./*
[root@aliyun xiangzheng]# ll
total 32
-rw------- 1 root root 1204 Oct 20 17:11 ca.crt
-rw-r--r-- 1 root root  220 Oct 20 17:46 client.ovpn
-rw------- 1 root root  636 Oct 20 17:33 ta.key
-rw------- 1 root root 4500 Oct 20 17:11 xiangzheng.crt
-rw------- 1 root root 1854 Oct 20 17:11 xiangzheng.key
-rw-r--r-- 1 root root 6255 Oct 20 17:53 xiangzheng.zip

#上传到桌面
[root@aliyun xiangzheng]# sz xiangzheng.zip
```





## Windows 客户端测试链接

- **Windows PC 端安装 openvpn，官方下载地址：**https://swupdate.openvpn.net/downloads/connect/openvpn-connect-3.3.6.2752_signed.msi
- **下载完成后将证书等相关文件导入到客户端即可**







## 总结


### 客户端

客户端生成的路由信息

- `route print` 输出：

<!-- ![](/docs/vpn/客户端生成的路由信息.png) -->
![](/docs/vpn/openvpn/客户端生成的路由信息.png)

- `netstat` 输出：

```
活动连接
    
  协议        本地地址                外部地址               状态
  TCP    192.168.31.51:5186     8.140.166.135:9527     ESTABLISHED
  TCP    10.8.0.6:11248         172.27.185.116:ssh     ESTABLISHED
  TCP    10.8.0.6:11330         172.27.185.117:ssh     ESTABLISHED
  TCP    10.8.0.6:11344         172.27.185.118:ssh     ESTABLISHED
  ...
```



### openVPN-server

```bash
[root@openVPN-server ~]# hostname -I
172.27.185.115 10.8.0.1 

[root@openVPN-server ~]# route -n
Kernel IP routing table
Destination     Gateway         Genmask         Flags Metric Ref    Use Iface
0.0.0.0         172.27.191.253  0.0.0.0         UG    100    0        0 eth0
10.8.0.0        10.8.0.2        255.255.0.0     UG    0      0        0 tun0
10.8.0.2        0.0.0.0         255.255.255.255 UH    0      0        0 tun0
172.27.176.0    0.0.0.0         255.255.240.0   U     100    0        0 eth0

#远程客户端112.39.61.191使用随机端口于VPN主机建立连接
[root@openVPN-server ~]# ss -ntla|grep 1194
LISTEN      0        32                0.0.0.0:1194              0.0.0.0:*      
ESTAB       0        0          172.27.185.115:1194        112.39.61.191:3964

#iptables信息
[root@openVPN-server ~]# iptables -S
...
-A INPUT -p tcp -m tcp --dport 1194 -j ACCEPT #访问本机TCP的1194端口全部放行
-A INPUT -m state --state RELATED,ESTABLISHED -j ACCEPT
[root@openVPN-server ~]# iptables -S -t nat 
...
-A POSTROUTING -s 10.8.0.0/16 -j MASQUERADE #从10.8.0.0/16网段出去的包全部做源地址转SNAT换成本机的地址然后出去，此项配置则无法连接到内部服务器

#抓包情况，可以看到所有的包都转为本机的172.27.185.115:1194代理发出
[root@openVPN-server ~]# tcpdump -i eth0 -nn tcp port 1194
17:13:03.296862 IP 172.27.185.115.1194 > 112.39.61.191.3964: Flags [.], ack 3216, win 1432, length 0
17:13:03.373817 IP 112.39.61.191.3964 > 172.27.185.115.1194: Flags [.], ack 3197, win 508, length 0
17:13:03.373842 IP 112.39.61.191.3964 > 172.27.185.115.1194: Flags [P.], seq 3216:3282, ack 3197, win 508, length 66
```

### back-server1

```bash
root@back-server1:~# hostname -I
172.27.185.116 

root@back-server1:~# route -n
Kernel IP routing table
Destination     Gateway         Genmask         Flags Metric Ref    Use Iface
0.0.0.0         172.27.191.253  0.0.0.0         UG    100    0        0 eth0
172.27.176.0    0.0.0.0         255.255.240.0   U     0      0        0 eth0
172.27.191.253  0.0.0.0         255.255.255.255 UH    100    0        0 eth0

#ssh的连接是由openvpn服务器172.27.185.115使用随机端口向其发起的连接，而非客户端直接连接
root@back-server1:~# ss -ntla|grep 22
LISTEN    0       128             0.0.0.0:22              0.0.0.0:*             
ESTAB     0       52       172.27.185.116:22       172.27.185.115:11248 
```

### back-server2

```bash
root@back-server2:~# hostname -I
172.27.185.117

root@back-server2:~# route -n
Kernel IP routing table
Destination     Gateway         Genmask         Flags Metric Ref    Use Iface
0.0.0.0         172.27.191.253  0.0.0.0         UG    100    0        0 eth0
172.27.176.0    0.0.0.0         255.255.240.0   U     0      0        0 eth0
172.27.191.253  0.0.0.0         255.255.255.255 UH    100    0        0 eth0

#ssh的连接是由openvpn服务器172.27.185.115使用随机端口向其发起的连接，而非客户端直接连接
root@back-server2:~# ss -ntla|grep 22
LISTEN    0       128             0.0.0.0:22              0.0.0.0:*             
ESTAB     0       52       172.27.185.117:22       172.27.185.115:11330       
```

### back-server3

```bash
root@back-server3:~# hostname -I
172.27.185.118 

root@back-server3:~# route -n
Kernel IP routing table
Destination     Gateway         Genmask         Flags Metric Ref    Use Iface
0.0.0.0         172.27.191.253  0.0.0.0         UG    100    0        0 eth0
172.27.176.0    0.0.0.0         255.255.240.0   U     0      0        0 eth0
172.27.191.253  0.0.0.0         255.255.255.255 UH    100    0        0 eth0

#ssh的连接是由openvpn服务器172.27.185.115使用随机端口向其发起的连接，而非客户端直接连接
root@back-server3:~# ss -ntla|grep 22
LISTEN    0       128             0.0.0.0:22              0.0.0.0:*             
ESTAB     0       52       172.27.185.118:22       172.27.185.115:11344    
```









## 后期操作

### 申请证书

#### 手动申请

- 假设为xiaoming申请证书


```bash
# 为新用户创建证书存放目录
[root@openvpn-server ~]# mkdir /etc/openvpn/client/xiaoming

# 进入客户端证书创建目录
[root@openvpn-server ~]# cd /etc/openvpn/easyrsa-client/3

# 生成证书申请文件和证书申请文件私钥
[root@openvpn-server ~]# ./easyrsa gen-req xiaoming
...
Enter PEM pass phrase: # 输入证书的密码
Verifying - Enter PEM pass phrase: # 确认密码
...
Common Name (eg: your user, host, or server name) [xiaoming]: # 描述信息直接回车
...
req: /etc/openvpn/easyrsa-client/3/pki/reqs/xiaoming.req # xiaoming的证书申请文件
key: /etc/openvpn/easyrsa-client/3/pki/private/xiaoming.key # xiaoming的私钥文件

# 在easyrsa-server目录中签发证书
[root@openvpn-server 3]# cd /etc/openvpn/easyrsa-server/3

# 导入req（证书申请）文件
[root@openvpn-server 3]# pwd
/etc/openvpn/easyrsa-server/3
[root@openvpn-server 3]# ./easyrsa import-req /etc/openvpn/easyrsa-client/3/pki/reqs/xiaoming.req xiaoming

# server端签发客户端证书
[root@openvpn-server 3]# ./easyrsa sign client xiaoming
...
Type the word 'yes' to continue, or any other input to abort.
  Confirm request details: yes #输入yes确认签发
...
Certificate created at: /etc/openvpn/easyrsa-server/3/pki/issued/xiaoming.crt #小明的证书

#拷贝ca、用户证书私钥文件
[root@openvpn-server 3]# mkdir /etc/openvpn/client/xiaoming
[root@openvpn-server 3]# cd /etc/openvpn/client/xiaoming
[root@openvpn-server xiaoming]# cp /etc/openvpn/certs/ca.crt .
[root@openvpn-server xiaoming]# cp /etc/openvpn/certs/ta.key .
[root@openvpn-server xiaoming]# cp /etc/openvpn/easyrsa-server/3/pki/issued/xiaoming.crt .
[root@openvpn-server xiaoming]# cp /etc/openvpn/easyrsa-client/3/pki/private/xiaoming.key .

#拷贝.ovpn模板文件，再稍加修改
[root@openvpn-server xiaoming]# cp /etc/openvpn/certs/client.ovpn .
[root@openvpn-server xiaoming]# vim client.ovpn
client
dev tun
proto tcp
remote 8.140.166.135 1194
resolv-retry infinite
nobind
persist-key
persist-tun
ca ca.crt
cert xiaoming.crt #修改成实际用户证书名称
key xiaoming.key #修改成实际用户私钥名称
remote-cert-tls server
tls-auth ta.key 1
cipher AES-256-CBC
verb 3

#最终文件
[root@openvpn-server xiaoming]# ll
total 24
-rw------- 1 root root 1204 Oct 20 18:24 ca.crt
-rw-r--r-- 1 root root  216 Oct 20 18:33 client.ovpn
-rw------- 1 root root  636 Oct 20 18:25 ta.key
-rw------- 1 root root 4498 Oct 20 18:25 xiaoming.crt
-rw------- 1 root root 1854 Oct 20 18:26 xiaoming.key

#压缩并发给pc端，或通过邮件发给所需者
[root@openvpn-server xiaoming]# zip -P "123456" xiaoming.crt.zip ./* ;sz xiaoming.crt.zip
```

#### 自动申请证书脚本

- request_crt.sh

```bash
#!/bin/bash
#
#********************************************************************
#Author:	     	xiangzheng
#QQ: 			    767483070
#Date: 		     	2022-03-27
#FileName：		    request_crt.sh
#URL: 		    	https://www.xiangzheng.vip
#Email: 		    rootroot25@163.com
#Description：		The test script
#Copyright (C): 	2022 All rights reserved
#********************************************************************
PASS=$(cat /dev/urandom |tr -dc '[:alnum:]'|head -c8)

COLOR="echo -e \\E[1;31m"
END="\\E[0m"

rpm -q expect &>/dev/null || yum -y install expect
#dpkg -L expect &>/dev/null || apt -y install expect

read -p "请输入申请证书人员的姓名英文缩写: " NAME

#******申请证书******
mkdir -pv /etc/openvpn/client/${NAME}
cd /etc/openvpn/client/${NAME}
echo "${PASS}" > /etc/openvpn/client/${NAME}/pass.txt

cd /etc/openvpn/easyrsa-client/3
expect<<- EOF
spawn ./easyrsa gen-req ${NAME} 
expect {
    "Enter*" { send "${PASS}\r"; exp_continue }
    "Verifying*" { send "${PASS}\r"; exp_continue }
    "Common" { send "\r"; }
}
expect eof
EOF
#*******************

#--------------------------------------------------------------------

#******签发证书******
cd /etc/openvpn/easyrsa-server/3
./easyrsa import-req /etc/openvpn/easyrsa-client/3/pki/reqs/${NAME}.req ${NAME}
expect<<- EOF
spawn ./easyrsa sign client ${NAME} 
expect {
    "*details:" { send "yes\r"; }
}
expect eof
EOF
#*******************

#--------------------------------------------------------------------

#*****整理证书******
cd /etc/openvpn/client/${NAME}
cp /etc/openvpn/certs/ca.crt .
cp /etc/openvpn/certs/ta.key .
cp /etc/openvpn/easyrsa-server/3/pki/issued/${NAME}.crt .
cp /etc/openvpn/easyrsa-client/3/pki/private/${NAME}.key .
cat > /etc/openvpn/client/${NAME}/client.ovpn <<EOF
client
dev tun
proto tcp
remote 8.140.166.135 1194
resolv-retry infinite
nobind
persist-key
persist-tun
ca ca.crt
cert ${NAME}.crt
key ${NAME}.key
remote-cert-tls server
tls-auth ta.key 1
cipher AES-256-CBC
verb 3
EOF
cd /etc/openvpn/client/
zip -P "azhengkeji888" ${NAME}.zip ./${NAME}/*
mv ${NAME}.zip /etc/openvpn/client/${NAME}/

#*******************
echo
${COLOR}"秘钥签发完毕 文件存放位置: /etc/openvpn/client/${NAME}/${NAME}.zip 请交给相关人员"${END}
```



### 证书的吊销

- **注意：如果是第一次搭建vpn后准备吊销证书，一定要纯手动执行一次吊销，因为需要在vpn服务端配置文件中指定吊销列表文件的位置**

#### 证书的自动过期时间

- **注意：**证书是否过期是以openVPN服务器的时间为基准的

```bash
[root@openvpn-server ~]# grep EASYRSA_CERT_EXPIRE /etc/openvpn/easyrsa-server/3/vars
set_var EASYRSA_CERT_EXPIRE 90 #90代表从申请证书之日起，九十天后过期
```

#### 证书手动吊销

##### 查看证书的有效性

```bash
#查看当前证书的有效性，有效为V，无效为R
[root@openvpn-server ~]# cat /etc/openvpn/easyrsa-server/3/pki/index.txt
V	240123085310Z		88D9143F3EA8F959929B61332571B742	unknown	/CN=server
V	240123090109Z		6411BB9DB0F00FC2696C82B171E4B068	unknown	/CN=xiangzheng
V	240123101534Z		6C7151B81E71E6D23DF3995D208C1F27	unknown	/CN=xiangzheng
V	240123101647Z		9DF48177B6D206A2DCFEE72E99FB7C0C	unknown	/CN=xiaoming
```

##### 吊销指定用户的证书

```bash
#吊销指定用户(xiaoming)的证书
[root@openvpn-server ~]# cd /etc/openvpn/easyrsa-server/3/
[root@openvpn-server 3]# ./easyrsa revoke xiaoming
...
Type the word 'yes' to continue, or any other input to abort.
  Continue with revocation: yes #输入yes
...
Revocation was successful. You must run gen-crl and upload a CRL to your #successful表示成功
...

#查看索引文件，则xiaoming处显示R，即被吊销
[root@openvpn-server ~]# cat /etc/openvpn/easyrsa-server/3/pki/index.txt
V	240123085310Z		88D9143F3EA8F959929B61332571B742	unknown	/CN=server
V	240123090109Z		6411BB9DB0F00FC2696C82B171E4B068	unknown	/CN=xiangzheng
V	240123101534Z		6C7151B81E71E6D23DF3995D208C1F27	unknown	/CN=xiangzheng
R	240123101647Z	211020112640Z	9DF48177B6D206A2DCFEE72E99FB7C0C	unknown	/CN=xiaoming

#但是当前断开客户端连接，xiaoming用户依旧可以连接
#所以需要更新证书吊销列表文件，并且需要重启openvpn服务（重启服务前最好将修改的配置文件备份一份，防止因为修改错误而导致服务不能启动从而影响业务的正常运行，出问题还可以及时用备份的文件来进行恢复使服务可以启动）
```

##### 更新证书吊销列表文件

```bash
[root@openvpn-server 3]# ./easyrsa gen-crl

Note: using Easy-RSA configuration from: /etc/openvpn/easyrsa-server/3.0.8/vars
Using SSL: openssl OpenSSL 1.1.1g FIPS  21 Apr 2020
Using configuration from /etc/openvpn/easyrsa-server/3/pki/easy-rsa-29534.sdirJH/tmp.b1TzLK

An updated CRL has been created.
CRL file: /etc/openvpn/easyrsa-server/3/pki/crl.pem #生成的证书吊销列表文件
```

##### 将吊销列表文件发布

```bash
#第一次吊销证书时需要编辑配置文件指定吊销列表文件的位置，后续吊销无需此步
[root@openvpn-server 3]# vim /etc/openvpn/server.conf
crl-verify /etc/openvpn/easyrsa-server/3/pki/crl.pem

#每次吊销证书后，都需要重启服务才能生效
[root@openvpn-server 3]# systemctl restart openvpn-server@multi-user.service
```

#### 自动吊销证书脚本

- revoke_crt.sh

```bash
#!/bin/bash
#
#********************************************************************
#Author:	     	xiangzheng
#QQ: 			    767483070
#Date: 		     	2022-03-27
#FileName：		    revoke_crt.sh
#URL: 		    	https://www.xiangzheng.vip
#Email: 		    rootroot25@163.com
#Description：		The test script
#Copyright (C): 	2022 All rights reserved
#********************************************************************
COLOR="echo -e \\E[1;31m"
END="\\E[0m"

rpm -q expect &>/dev/null || yum -y install expect
#dpkg -L expect &>/dev/null || apt -y install expect

read -p "请输入被吊销证书人员的姓名英文缩写: " NAME


#*****吊销指定用户的证书*****
cd /etc/openvpn/easyrsa-server/3/
expect <<- EOF
spawn ./easyrsa revoke ${NAME} 
expect {
    "*revocation:" { send "yes\r"; }
}
expect eof
EOF
#***************************

if [ $? != 0 ];then
    ${COLOR}"证书吊销失败 请检查后重试"${END} ; exit
fi

#----------------------------------------------------

#*****更新证书吊销列表文件*****
cd /etc/openvpn/easyrsa-server/3/
./easyrsa gen-crl
#******************************

if [ $? = 0 ];then
    ${COLOR}"${NAME}的证书已经吊销完毕 需要重启openVPN服务才能使其生效"${END}
fi
```



#### 吊销后的访问日志

```bash
[root@aliyun ~]# tail -f /var/log/openvpn/openvpn.log
...
TCP connection established with [AF_INET]112.39.61.191:3634
112.39.61.191:3634 TLS: Initial packet from [AF_INET]112.39.61.191:3634, sid=44921a2c 9fa30ef4

112.39.61.191:3634 WARNING: Failed to stat CRL file, not (re)loading CRL.
112.39.61.191:3634 VERIFY ERROR: depth=0, error=certificate revoked: CN=azheng123, serial=33626050709740924166954007928611399588
112.39.61.191:3634 OpenSSL: error:1417C086:SSL routines:tls_process_client_certificate:certificate verify failed
112.39.61.191:3634 TLS_ERROR: BIO read tls_read_plaintext error
112.39.61.191:3634 TLS Error: TLS object -> incoming plaintext read error
112.39.61.191:3634 TLS Error: TLS handshake failed
112.39.61.191:3634 Fatal TLS error (check_tls_errors_co), restarting
112.39.61.191:3634 SIGUSR1[soft,tls-error] received, client-instance restarting
```



### 脚本优化

- 可以将申请和吊销的脚本整合到一起，并封装成两个函数，最后通过位置变量传参+case判断的方式实现更加灵活的操作
