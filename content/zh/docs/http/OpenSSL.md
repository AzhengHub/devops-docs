---
title: "OpenSSL"
---



#### OpenSSL 概述

https://www.openssl.org/

- oepnssl 是最常用的证书管理工具

- OpenSSL是一个工具集

- 可以实现对数据的加密以及密码的生成，CA的创建等功能
- 来自 openssl-libs 包（centos）

###### OpenSSL 包含组件

- libcrypto：用于实现加密和解密的库
- libssl：用于实现ssl通信协议的安全库
- openssl：多用途命令行工具

#### OpenSSL 工作模式

- 交互式
- 非交互式（script常用）

#### openssl 相关配置文件

```bash
#需要安装
[root@aliyun data]## rpm -ql openssl-libs
/etc/pki/tls
/etc/pki/tls/certs
/etc/pki/tls/ct_log_list.cnf
/etc/pki/tls/misc
/etc/pki/tls/openssl.cnf #openssl的配置文件
/etc/pki/tls/private
```



## openssl 实现对称加密

```bash
#准备测试文件
[root@aliyun ~]## cp /etc/fstab .
[root@aliyun ~]## ll
total 4
-rw-r--r-- 1 root root 427 Oct 17 15:42 fstab

#对文件进行加密
openssl enc -e -des3 -a -salt -in fstab -out fstab.cipher

#生产的加密文件
## cat fstab.cipher 
U2FsdGVkX1/blsLFgB4zgPPsPucLNFLmGs7Nn6uNlPoDZMAVHhW5/Xfvj/95g93M
19ly7adgK3/vwcD4OdzxgNIGnxoDmxrp/hjLLAJpMmaK9evMFYPk00z+lA6KJf4c
hmV8KFNqhfggvDpSiWhFIzj34GeOyhy7UqmXurb52odmHOksNEcA5DfKSgO5Vyey
J+NMiOT6Y5c62EPfuQILUwhD6m7TMtABmVKKFUzU339i9nNb+XIe0IoecFpJGwYd
kyjkZu3XHJJgzVggwLFrrEzNo3l4jFXTv5+QCM4HRhiZy77IEHdzE3ugeGY6lnT3
84BcF3XBUn4IK44SOw+dbAdMBPTbhv8nxFHdwAkjYB8yfx2jSox/YL/F7l0UcRGl
dYIquGFRMt+9pS1HMuMawGKIfF3QVhsxJyiVZhBKyehzxT0i3VAlyeFZk9Shtkfx
ZWxHRzdMfnoqSZGdDXfZWYS2D31KE9StpvDvDdnHd1s1xBdeywBHZ14dHqgy8rIT
4DtrN/iCwz++6xWWA21uPQiJM8yPHYGSEfFYzDj25DeHCCdME/z7sT137rePfEgu
XYdazV65nKeGHQv1ZlDb3GFimdA/yJJ2/ZvbVABr29cuvx+MJWURHWbFQ7CXrBuS
yFHDBABqK0McUu8Sfei3Rw5E8bPT9mJ2TK6gBk9gwML866djUcmYRYt5at0DqREb
ktn8w1kctSc8UgTpOiYiSCOFuHiFuf993f5KD81RD0BjaPsvQLDJgkvDMw5xAIIr
RiONuZWLNHdikkkE7R6oLTmtecFKiMDJ1GBrBR1HddDKfkaTYswZu2VNEehqWFsO
0nd/PpH9/Jo=


#对文件进行解密
openssl enc -d -des3 -a -salt -in fstab.cipher -out fstab

#解密后的文件
[root@centos8 ~]## cat fstab

#
## /etc/fstab
## Created by anaconda on Mon J
...
```



## openssl 生成PKI

pki：非对称密钥加密体系

**公钥加密：**

算法：RSA, ELGamal

工具：gpg, openssl rsautl（man rsautl）

**数字签名：**

算法：RSA, DSA, ELGamal

**密钥交换：**

算法：dh

 DSA：Digital Signature Algorithm

 DSS：Digital Signature Standard

 RSA：

openssl命令生成密钥对：man genrsa

#### 生成私钥

```bash
#用rsa算法生成私钥 rsa算法既能实现加密又能实现数字签名，还有一个是gendsa只支持数字签名
openssl genrsa -out /data/test.key [指定位数2048 4096，不写默认是2048]

#生成私钥文件并设为000权限，且不影响本身的umask值
( umask 777 ; openssl genrsa -out /data/test.key )

#生成私钥文件并设置密码加密（4-1024位的密码），但是不方便
openssl genrsa -out /data/test.key -des3
#解密
openssl rsa -in /data/test.key -out /data/test.key2
```

####    从私钥中提取公钥

```bash
openssl rsa -in test.key -pubout -out test.pub

#如果私钥被对称密钥加密，则需要输入密码才能从中提取出公钥
```











## openssl 配置文件说明

- 记录了CA的一些默认配置，一般无需修改

```bash
[root@centos ~]## cat /etc/pki/tls/openssl.cnf 
...
[ ca ]
default_ca	= CA_default #默认的ca，一个服务器上可以创建多个ca

####################################################################
[ CA_default ] ## CA_default 的设置

dir		= /etc/pki/CA		## ca的主工作路径，centos8默认不存在，需要手动创建
certs		= $dir/certs		## 证书存放路径
crl_dir		= $dir/crl		## 证书吊销列表存放路径
database	= $dir/index.txt	## 数据库索引文件。
#unique_subject	= no			## Set to 'no' to allow creation of
					## several certs with same subject.
new_certs_dir	= $dir/newcerts		## 新证书的默认存放路径，$dir/crl也会存放一份，相当于有两份，一份为备份

certificate	= $dir/cacert.pem 	## 根ca证书存放路径
serial		= $dir/serial 		## 证书颁发编号文件（下一个颁发证书的编号）
crlnumber	= $dir/crlnumber	## 证书吊销编号文件
					## must be commented out to leave a V1 CRL
crl		= $dir/crl.pem 		## 证书吊销列表文件
private_key	= $dir/private/cakey.pem #CA私钥存放目录

x509_extensions	= usr_cert		## The extensions to add to the cert

## Comment out the following two lines for the "traditional"
## (and highly broken) format.
name_opt 	= ca_default		## 主题名称选项
cert_opt 	= ca_default		## 证书字段选项

## Extension copying option: use with caution.
## copy_extensions = copy

## Extensions to add to a CRL. Note: Netscape communicator chokes on V2 CRLs
## so this is commented out by default to leave a V1 CRL.
## crlnumber must also be commented out to leave a V1 CRL.
## crl_extensions	= crl_ext

default_days	= 365 #证书的有效期，再企业内部用通常要长一些，如：3650(十年)
default_crl_days= 30			## how long before next CRL
default_md	= sha256		## use SHA-256 by default
preserve	= no			## keep passed DN ordering

## A few difference way of specifying how similar the request should look
## For type CA, the listed attributes must be the same, and the optional
## and supplied fields are just that :-)
policy		= policy_match #使用的策略，用户申请证书时，match字段为必须和CA相同

## For the CA policy
[ policy_match ] #默认策略，policy=字段指定
countryName		= match
stateOrProvinceName	= match
organizationName	= match
organizationalUnitName	= optional
commonName		= supplied
emailAddress		= optional

## For the 'anything' policy
## At this point in time, you must list all acceptable 'object'
## types.
[ policy_anything ]
countryName		= optional
stateOrProvinceName	= optional
localityName		= optional
organizationName	= optional
organizationalUnitName	= optional
commonName		= supplied
emailAddress		= optional

####################################################################
...
```



## openssl 选项

- https://www.openssl.org/docs/man3.0/man1/
- 注意：查阅时要注意openssl的版本，版本不同 则命令或子命令会有所不同

#### genrsa

`openssl genrsa`是OpenSSL工具的一部分，用于生成RSA密钥对。RSA是一种非对称加密算法，可以用于加密和解密数据，以及进行数字签名和验证。

以下是`openssl genrsa`命令的一般语法：

```
openssl genrsa [options] [-out filename] [-aes256] [-passout pass:password] [numbits]
```

其中，`[options]`是一些可选的参数，`[-out filename]`指定生成的私钥文件的输出路径和文件名，`[-aes256]`指定使用AES-256算法加密私钥文件，`[-passout pass:password]`指定密码以保护生成的私钥文件，`[numbits]`指定生成的密钥的位数，默认为2048位。

下面是一些常用的选项和用法示例：

- `-aes256`: 使用AES-256算法加密生成的私钥文件。
- `-passout pass:password`: 指定密码以保护生成的私钥文件。可以是明文密码或密码文件的路径。
- `[numbits]`: 指定生成的密钥的位数。常用的位数包括2048、3072和4096位等。

下面是一个示例，生成一个2048位的RSA密钥对，并将私钥保存到`private_key.pem`文件中：

```sh
openssl genrsa -out private_key.pem 2048
```

这个示例使用默认的选项生成一个2048位的RSA密钥对，并将私钥保存到`private_key.pem`文件中。

请注意，生成密钥对是一项复杂的任务，涉及到密码学和安全性问题。在实际应用中，建议仔细研究和理解选项、参数和算法的安全性要求，并采取适当的安全措施来保护生成的密钥。



#### genpkey

`openssl genpkey`是OpenSSL工具的一部分，用于生成密钥对或私钥。它使用OpenSSL库中的密码学功能生成安全的公钥和私钥。

以下是`openssl genpkey`命令的一般语法：

```
openssl genpkey [options] [-out filename] [-outform PEM|DER]
```

其中，`[options]`是一些可选的参数，`[-out filename]`指定生成的密钥文件的输出路径和文件名，`[-outform PEM|DER]`指定输出格式为PEM格式或DER格式。

下面是一些常用的选项和用法示例：

- `-algorithm algorithm`: 指定要使用的密钥算法，例如RSA、DSA、EC等。
- `-pkeyopt parameter:value`: 设置密钥参数的选项值。例如，对于RSA密钥，可以使用`-pkeyopt rsa_keygen_bits:2048`来指定生成2048位的RSA密钥。
- `-pass pass:password`: 指定密码以保护生成的私钥文件。可以是明文密码或密码文件的路径。
- `-aes256`, `-des3`: 指定生成的私钥文件使用AES-256或3DES算法加密。
- `-pubout`: 只生成公钥，并将其输出到文件中。
- `-text`: 显示生成的密钥的详细信息。

下面是一个示例，生成一个2048位的RSA密钥对，并将私钥保存到`private_key.pem`文件中，公钥保存到`public_key.pem`文件中：

```sh
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out private_key.pem
openssl rsa -in private_key.pem -pubout -out public_key.pem
```

这个示例使用`openssl genpkey`生成私钥文件，然后使用`openssl rsa`命令从私钥中提取公钥并保存到另一个文件中。

请注意，生成密钥对是一项复杂的任务，涉及到密码学和安全性问题。在实际应用中，建议仔细研究和理解选项、参数和算法的安全性要求，并采取适当的安全措施来保护生成的密钥。



###### genpkey & genrsa

`openssl genpkey`和`openssl genrsa`是OpenSSL工具中用于生成密钥对的两个不同命令，它们之间有以下区别：

1. **算法选择：** `openssl genpkey`命令是一个通用的密钥生成命令，可以生成各种类型的密钥对，包括RSA、DSA、EC等。它使用 `-algorithm` 选项来指定要使用的算法。而`openssl genrsa`命令专门用于生成RSA密钥对，不需要指定算法。
2. **参数设置：** `openssl genpkey`命令通过 `-pkeyopt` 选项允许设置特定算法的参数选项，例如指定RSA密钥的位数。而`openssl genrsa`命令不需要指定额外的参数选项，它会生成一个默认位数的RSA密钥对（通常是2048位）。
3. **输出格式：** `openssl genpkey`命令使用 `-outform` 选项指定输出格式为PEM格式或DER格式。而`openssl genrsa`命令生成的密钥对默认以PEM格式输出。

总结来说，`openssl genpkey`是一个通用的密钥生成命令，可以生成多种类型的密钥对，需要指定算法和参数选项；而`openssl genrsa`是专门用于生成RSA密钥对的命令，不需要指定算法和参数选项，默认生成的密钥位数较常见。

如果你只需要生成RSA密钥对，并且不需要特定的算法和参数设置，那么使用`openssl genrsa`命令会更加简单和方便。如果需要使用其他算法或自定义参数选项，那么可以选择使用`openssl genpkey`命令。



#### req

`openssl req`是OpenSSL工具的一部分，用于生成证书签名请求 (Certificate Signing Request, CSR)。CSR是一种包含公钥和证书主题信息的文件，用于向证书颁发机构 (Certificate Authority, CA) 申请数字证书。

以下是`openssl req`命令的一般语法：

```
cssCopy code
openssl req [options] [-key privatekey] [-new] [-out filename] [-config filename]
```

其中，`[options]`是一些可选的参数，`[-key privatekey]`指定与CSR关联的私钥文件路径，`[-new]`表示创建一个新的CSR，`[-out filename]`指定生成的CSR文件的输出路径和文件名，`[-config filename]`指定配置文件的路径，包含证书主题信息的配置。

下面是一些常用的选项和用法示例：

- `-newkey arg`: 指定生成CSR时所使用的密钥算法和参数。例如，使用RSA密钥算法和2048位的密钥长度，可以使用`-newkey rsa:2048`。
- `-nodes`: 生成CSR时不加密私钥。
- `-subj arg`: 指定证书主题信息。可以使用各种字段来指定组织名称、国家代码、通用名称等信息。例如，`-subj "/C=US/ST=California/O=Example Company/CN=example.com"`。
- `-passin arg`: 指定私钥文件的密码。

下面是一个示例，生成一个新的CSR并将其保存到`csr.csr`文件中：

```
openssl req -new -key private_key.pem -out csr.csr
```

这个示例生成一个新的CSR，使用`private_key.pem`文件中的私钥，将生成的CSR保存到`csr.csr`文件中。

请注意，生成CSR是一项涉及到密码学和证书流程的任务。在实际应用中，建议仔细研究和理解选项、参数和证书要求，并遵循相应的证书颁发机构的要求和流程。

###### -subj

在定义网站证书时，一般需要指定以下内容作为主题信息（Subject）：

1. **国家代码（Country Code）**: 使用两个字母的国家代码表示，例如 "US" 表示美国，"CN" 表示中国。
2. **州/省名（State/Province Name）**: 表示所在的州或省的全名或缩写，例如 "California" 或 "CA"。
3. **城市名（Locality Name）**: 表示所在城市的名称。
4. **组织名（Organization Name）**: 表示组织或公司的名称。
5. **组织单位（Organizational Unit Name）**: 表示组织内部的部门或单位的名称，可选项。
6. **通用名称（Common Name）**: 表示主机名或域名，通常用于网站证书的主要标识。例如，如果证书用于 `www.example.com`，则通用名称应设置为 `www.example.com`。

以下是一个示例，展示如何使用`-subj`选项来指定这些主题信息：

```sh
-subj "/C=US/ST=California/L=San Francisco/O=Example Company/OU=IT Department/CN=www.example.com"
```

在上述示例中，主题信息的各个字段按顺序使用正斜杠 `/` 进行分隔。`C` 表示国家代码，`ST` 表示州/省名，`L` 表示城市名，`O` 表示组织名，`OU` 表示组织单位，`CN` 表示通用名称。

请注意，确保主题信息准确反映了所需的证书使用场景和主机名。实际情况可能需要根据具体要求进行调整和补充。

**如何查看某个证书中的这些内容？**

您可以使用以下命令来查看证书中的主题信息：

```sh
openssl x509 -in certificate.crt -noout -subject
```

其中，`certificate.crt`是要查看的证书文件路径。

执行该命令后，将会输出证书中的主题信息，例如：

```sh
subject= /C=US/ST=California/L=San Francisco/O=Example Company/OU=IT Department/CN=www.example.com
```

在输出中，`subject=`后面的部分即为证书中的主题信息。

请注意，此命令仅适用于已经生成的证书文件。如果您只有私钥或CSR文件，无法直接从中查看主题信息。



#### x509

`openssl x509`是OpenSSL工具的一部分，用于操作和管理X.509格式的证书。X.509是一种广泛使用的公钥证书标准，用于加密通信、数字签名和身份验证等安全领域。

以下是`openssl x509`命令的一般语法：

```sh
openssl x509 [options] [-inform PEM|DER] [-in filename] [-outform PEM|DER] [-out filename]
```

其中，`[options]`是一些可选的参数，`[-inform PEM|DER]`指定输入证书的格式为PEM格式或DER格式，`[-in filename]`指定输入证书文件的路径和文件名，`[-outform PEM|DER]`指定输出证书的格式为PEM格式或DER格式，`[-out filename]`指定输出证书文件的路径和文件名。

下面是一些常用的选项和用法示例：

- `-text`: 显示证书的详细信息，包括版本、序列号、颁发机构、有效期、主题、公钥等。
- `-noout`: 不输出证书内容，仅显示证书的摘要信息。
- `-inkey filename`: 指定与证书关联的私钥文件的路径。
- `-startdate`: 显示证书的有效起始日期。
- `-enddate`: 显示证书的有效结束日期。
- `-subject`: 显示证书的主题信息。
- `-issuer`: 显示颁发证书的机构信息。
- `-serial`: 显示证书的序列号。

下面是一个示例，显示证书文件`certificate.crt`的详细信息：

```sh
openssl x509 -in certificate.crt -text
```

这个示例使用`-in`选项指定要查看的证书文件，然后使用`-text`选项显示证书的详细信息。

请注意，`openssl x509`命令还提供了其他高级功能，例如验证证书的有效性、生成自签名证书等。具体的使用方法和选项，请参考OpenSSL的官方文档或运行`openssl x509 -help`命令来获取更多信息。





## 创建私有CA

即生成自签名证书

- **1.创建CA所需要的目录和文件**

```bash
#创建所需目录
[root@centos8 ~]## mkdir -p /etc/pki/CA/{certs,crl,newcerts,private}

#生成证书索引数据库文件（用户向CA申请证书时需要）
[root@centos8 ~]## touch /etc/pki/CA/index.txt

#指定第一个颁发证书的序列号（用户向CA申请证书时需要）
[root@centos8 ~]## echo 01 > /etc/pki/CA/serial
```

- **2.生成CA私钥**

```bash
#umask 066是让私钥创建时只具有600的权限，centos8默认创建即600权限，为了考虑通用性，所以加上
#执行
( umask 066 ; openssl genrsa -out /etc/pki/CA/private/cakey.pem )
```

- **3.生成CA自签名证书**

```bash
#选项说明
-new #生成新证书签署请求
-x509 #专用于CA生成自签证书，X.509 是密码学里公钥证书的格式标准
-key #生成请求时用到的私钥文件
-days n #证书的有效期限
-out /etc/pki/CA/cacert.pem #证书的保存路径 #路径和名称由配置文件定义

#生成CA自签名证书
[root@centos8 ~]## openssl req -new -x509 -key /etc/pki/CA/private/cakey.pem -days 36500 -out /etc/pki/CA/cacert.pem
...
Country Name (2 letter code) [XX]:CN #国家
State or Province Name (full name) []:liaoning #省份
Locality Name (eg, city) [Default City]:huludao #城市
Organization Name (eg, company) [Default Company Ltd]:alibaba #公司名称
Organizational Unit Name (eg, section) []: #组织单位名称（例如，部门）
Common Name (eg, your name or your server's hostname) []: #通用名称（例如，您的名称或服务器的主机名）
Email Address []: #邮箱地址


#范例：查看证书的相关信息
[root@centos8 ~]## openssl x509 -in /etc/pki/CA/cacert.pem -noout -text 
...
```



## 申请证书并颁发证书

PS：申请证书也可以不在CA主机操作，但是需要将证书申请文件拷贝到CA主机才能完成申请，还需将申请到的证书再拷贝回需要证书的主机

- **1.为需要使用证书的主机 生成生成私钥**

```bash
#创建一个目录，假设为app1这个应用申请CA
[root@centos8 ~]## mkdir -p /data/app1_crt

#为需要使用证书的主机生成生成私钥
[root@centos8 ~]## ( umask 066 ; openssl genrsa -out /data/app1_crt/app1.key )
```

- **2.利用这个私钥 生成证书申请文件**

```bash
#app1.csr表示证书申请文件
#要求： 国家，省，公司名称三项必须和CA一致（根据/etc/pki/tls/openssl.cnf中的policy = policy_match 字段指定）
#Common Name也需指定，例如，您的姓名或服务器的主机名

[root@centos8 ~]## openssl req -new -key /data/app1_crt/app1.key -out /data/app1_crt/app1.csr

[root@centos8 ~]## tree /data/app1_crt/
/data/app1_crt/
├── app1.csr #证书申请文件
└── app1.key
```

- **3.利用生成的证书申请文件向CA申请颁发证书**

注意：证书申请文件只能申请一次证书，除非修改/etc/pki/CA/index.txt.attr配置文件，修改unique_subject = no，即可解除限制

```bash
#/etc/pki/CA/certs/app1.crt 表示生成的证书放置的位置
#通常证书文件都是放在/etc/pki/CA/certs/这个目录下的
[root@centos8 ~]## openssl ca -in /data/app1_crt/app1.csr -out /etc/pki/CA/certs/app1.crt -days 3600
...
Sign the certificate? [y/n]:y #y
...
1 out of 1 certificate requests certified, commit? [y/n]y #y
Write out database with 1 new entries
Data Base Updated

#查看生成的证书文件
[root@centos8 ~]## openssl x509 -in /etc/pki/CA/certs/app1.crt -noout -text
#挑一部分来看
[root@centos8 ~]## openssl x509 -in /etc/pki/CA/certs/app1.crt -noout -subject
subject=C = CN, ST = liaoning, O = alibaba, CN = centos8
[root@centos8 ~]## openssl x509 -in /etc/pki/CA/certs/app1.crt -noout -issuer
issuer=C = CN, ST = liaoning, L = huludao, O = alibaba
[root@centos8 ~]## openssl x509 -in /etc/pki/CA/certs/app1.crt -noout -dates 
notBefore=Oct 17 15:59:20 2021 GMT
notAfter=Aug 26 15:59:20 2031 GMT
[root@centos8 ~]## openssl x509 -in /etc/pki/CA/certs/app1.crt -noout -serial 
serial=01


#查看指定编号的证书的状态（通过CA的数据库文件来查找并获取状态）
[root@centos8 ~]## openssl ca -status 01
Using configuration from /etc/pki/tls/openssl.cnf
01=Valid (V)


#还会再/etc/pki/CA/newcerts/目录下生成一个和新申请证书相同的文件，相当于备份了
[root@centos8 ~]## diff /etc/pki/CA/certs/app1.crt /etc/pki/CA/newcerts/01.pem 
[root@centos8 ~]## 

#索引文件和序列号文件也会同时更新
[root@centos8 ~]## cat /etc/pki/CA/index.txt
V	310826155920Z		01	unknown	/C=CN/ST=liaoning/O=alibaba/CN=centos8  
[root@centos8 ~]## cat /etc/pki/CA/serial
02
[root@centos8 ~]## cat /etc/pki/CA/serial.old
01
```

- **4.将申请完毕的证书集中保存**

```bash
[root@centos8 ~]## cp /etc/pki/CA/certs/app1.crt /data/app1_crt/

#总结
[root@centos8 ~]## tree /data/app1_crt/
/data/app1_crt/
├── app1.crt #证书文件
├── app1.csr #证书申请文件
└── app1.key #证书申请所需的key文件
```



## 吊销证书

######## 在CA客户端获取要吊销证书的serial

```bash
[root@centos8 ~]## openssl x509 -in /etc/pki/CA/certs/app1.crt -noout  -serial -subject
serial=01
subject=C = CN, ST = liaoning, O = alibaba, CN = centos8
```

######## 在CA上，根据客户提交的serial与subject信息，对比检验是否与index.txt文件中的信息一致

```bash
#吊销证书，/etc/pki/CA/newcerts/01.pem，01.pem表示被吊销证书的serial
[root@centos8 ~]## openssl ca -revoke /etc/pki/CA/newcerts/01.pem
Using configuration from /etc/pki/tls/openssl.cnf
Revoking Certificate 01.
Data Base Updated
```

######## 证书吊销后发生的文件变化

```bash
#开头为R即表示证书被吊销，正常状态是V
[root@centos8 ~]## cat /etc/pki/CA/index.txt
R	310826155920Z	211017164217Z	01	unknown	/C=CN/ST=liaoning/O=alibaba/CN=centos8
```

######## 指定第一个吊销证书的编号,注意：第一次更新证书吊销列表前，才需要执行

```bash
#开始是没有这个文件的
[root@centos8 ~]## cat /etc/pki/CA/crlnumber
cat: /etc/pki/CA/crlnumber: No such file or directory

#指定第一个吊销证书的编号，同样/etc/pki/CA/crlnumber这个文件也是根据openssl配置文件来指定的
[root@centos8 ~]## echo 01 > /etc/pki/CA/crlnumber
```

######## 更新证书吊销列表

```bash
[root@centos8 ~]## openssl ca -gencrl -out /etc/pki/CA/crl.pem
Using configuration from /etc/pki/tls/openssl.cnf

#同样吊销证书的编号文件也会更新
[root@centos8 ~]## cat /etc/pki/CA/crlnumber
02

#这个文件正常应该放到互联网中通知大家这个证书已经被吊销
/etc/pki/CA/crl.pem
```

######## 查看crl（证书吊销列表）文件

```bash
[root@centos8 ~]## openssl crl -in /etc/pki/CA/crl.pem -noout -text 
Certificate Revocation List (CRL):
        Version 2 (0x1)
        Signature Algorithm: sha256WithRSAEncryption
        Issuer: C = CN, ST = liaoning, L = huludao, O = alibaba
        Last Update: Oct 17 16:50:58 2021 GMT
        Next Update: Nov 16 16:50:58 2021 GMT
        CRL extensions:
            X509v3 CRL Number: 
                1
Revoked Certificates:
    Serial Number: 01
        Revocation Date: Oct 17 16:42:17 2021 GMT
    Signature Algorithm: sha256WithRSAEncryption
         36:ab:6e:47:30:ff:78:c2:8f:73:43:74:b3:33:da:d2:3a:dd:
         9b:3d:67:81:ae:b1:2b:7e:d7:38:a5:b1:2c:0d:c2:ba:92:b8:
         4a:c5:65:74:f7:7a:eb:03:cf:39:fd:d5:0b:47:a1:87:50:e4:
         cc:57:ab:37:71:5d:7c:bc:39:84:dc:08:10:02:06:3b:44:46:
         dc:fe:6f:fe:fe:7f:cb:92:ad:8d:bd:63:54:d7:04:63:99:fc:
         67:85:28:7e:96:69:9c:06:ed:dc:ba:db:46:41:6e:15:c0:3f:
         b9:da:e3:4e:d4:33:d5:08:eb:5a:d4:6e:95:c1:c1:b7:d2:49:
         e4:78:c7:62:e9:74:9a:5c:52:07:0e:12:01:7c:09:50:68:e1:
         c0:e3:3c:5c:2d:40:ac:e0:e9:6c:b2:87:7a:d3:38:4d:49:b6:
         7b:0a:8f:b1:07:70:cf:41:d0:14:3c:a8:14:02:53:5c:13:12:
         cb:ba:64:6e:73:44:ee:01:da:e6:f9:7d:14:d9:2c:e9:fe:07:
         00:ff:33:32:aa:2e:b9:fd:03:3e:d2:c6:7c:ee:8d:3c:95:4d:
         39:7c:39:c9:4f:24:25:e9:75:d9:d4:22:66:c9:1c:a8:31:bc:
         cd:26:12:ab:8a:8b:d0:70:86:33:fa:87:c5:cf:2a:61:66:9d:
         f3:73:f3:36
         
#吊销列表文件也可以传到Windows上改为crl后缀来进行查看
```

######## 吊销其他证书和以上步骤一样



## 创建自签名证书

- 自己的证书给自己用，也不给别人分配，流程和创建私有CA的生成CA自签名证书一样
- 在一些企业内部应用并且需要证书进行加密时可以使用这种方式
- 下面以nginx测试https举例

```bash
#创建nginx证书存放目录
[root@centos8 ~]## mkdir -p /apps/nginx/certs

#自签名CA证书，同时生成ca的key和ca的证书
[root@centos8 ~]## openssl req -newkey rsa:4096 -nodes -sha256 -keyout /apps/nginx/certs/ca.key -x509 -days 36500 -out /apps/nginx/certs/ca.crt
...
Country Name (2 letter code) [XX]:CN #国家
State or Province Name (full name) []:liaoning #省份
Locality Name (eg, city) [Default City]:huludao #城市
Organization Name (eg, company) [Default Company Ltd]:alibaba #公司名称
Organizational Unit Name (eg, section) []:yunwei #部门
Common Name (eg, your name or your server's hostname) []: #通用名称，域名或主机名(会在颁发者显示)
Email Address []: #邮箱地址，可选

#此阶段生成的文件
[root@centos8 ~]## tree /apps/nginx/certs/
/apps/nginx/certs/
├── ca.crt #ca的证书
└── ca.key #ca的私钥

#自制key和csr文件
[root@centos8 ~]## openssl req -newkey rsa:4096 -nodes -sha256 -keyout /apps/nginx/certs/www.azheng.com.key -out /apps/nginx/certs/www.azheng.com.csr
...
Country Name (2 letter code) [XX]:CN
State or Province Name (full name) []:liaoning
Locality Name (eg, city) [Default City]:huludao
Organization Name (eg, company) [Default Company Ltd]:alibaba
Organizational Unit Name (eg, section) []:yunwei
Common Name (eg, your name or your server's hostname) []:#通用名称，域名或主机名(会在颁发给显示)
Email Address []:

Please enter the following 'extra' attributes
to be sent with your certificate request
A challenge password []:azheng123
An optional company name []:

#此阶段生成的文件
[root@centos8 ~]## tree /apps/nginx/certs/
/apps/nginx/certs/
├── ca.crt
├── ca.key
├── www.azheng.com.csr #证书申请文件
└── www.azheng.com.key #证书key文件

#签发证书
[root@centos8 ~]## openssl x509 -req -days 36500 -in /apps/nginx/certs/www.azheng.com.csr -CA /apps/nginx/certs/ca.crt -CAkey /apps/nginx/certs/ca.key -CAcreateserial -out /apps/nginx/certs/www.azheng.com.crt
Signature ok
subject=C = CN, ST = liaoning, L = huludao, O = alibaba, OU = yunwei
Getting CA Private Key

#此阶段生产的文件
[root@centos8 ~]## tree /apps/nginx/certs/
/apps/nginx/certs/
├── ca.crt
├── ca.key
├── ca.srl
├── www.azheng.com.crt #证书文件
├── www.azheng.com.csr
└── www.azheng.com.key

#验证证书内容
[root@centos8 ~]## openssl x509 -in /apps/nginx/certs/www.azheng.com.crt -noout -text 
...

#合并CA和服务器证书成一个文件，注意服务器证书在前
[root@centos8 ~]## cd /apps/nginx/certs/
[root@centos8 certs]## cat www.azheng.com.crt ca.crt > www.azheng.com.pem
[root@centos8 certs]## tree /apps/nginx/certs/
/apps/nginx/certs/
├── ca.crt
├── ca.key
├── ca.srl
├── www.azheng.com.crt #nginx需要此文件
├── www.azheng.com.csr
├── www.azheng.com.key
└── www.azheng.com.pem #生成的文件，nginx还需要此文件
```













```sh
## 自签名CA证书，同时生成ca的key和ca的证书
openssl req \
-newkey rsa:4096 \
-nodes \
-sha256 \
-keyout /etc/nginx/conf.d/ca.key \
-x509 \
-days 36500 \
-out /etc/nginx/conf.d/ca.crt \
-subj "/C=CN/CN=www.nasm.us"


## 自制key和csr文件
openssl req \
-newkey rsa:4096 \
-nodes \
-sha256 \
-keyout /etc/nginx/conf.d/www.nasm.us.key \
-out /etc/nginx/conf.d/www.nasm.us.csr \
-subj "/C=CN/CN=www.nasm.us"


## 签发证书
openssl x509 \
-req -days 36500 \
-in /etc/nginx/conf.d/www.nasm.us.csr \
-CA /etc/nginx/conf.d/ca.crt \
-CAkey /etc/nginx/conf.d/ca.key \
-CAcreateserial \
-out /etc/nginx/conf.d/www.nasm.us.crt


## 合并CA和服务器证书成一个文件，注意服务器证书在前
cat /etc/nginx/conf.d/www.nasm.us.crt /etc/nginx/conf.d/ca.crt > /etc/nginx/conf.d/www.nasm.us.pem

## 合并CA和服务器证书成一个文件，注意服务器证书在前
[root@centos8 ~]## cd /apps/nginx/certs/
[root@centos8 certs]## cat www.azheng.com.crt ca.crt > www.azheng.com.pem
[root@centos8 certs]## tree /apps/nginx/certs/
/apps/nginx/certs/
├── ca.crt
├── ca.key
├── ca.srl
├── www.azheng.com.crt #nginx需要此文件
├── www.azheng.com.csr
├── www.azheng.com.key
└── www.azheng.com.pem #生成的文件，nginx还需要此文件
```





```sh
cd /data/certs/nasm.us/

## 自签名CA证书，同时生成ca的key和ca的证书
openssl req \
-newkey rsa:4096 \
-nodes \
-sha256 \
-keyout ca.key \
-x509 \
-days 36500 \
-out ca.crt \
-subj "/C=CN/CN=www.nasm.us"


## 自制key和csr文件
openssl req \
-newkey rsa:4096 \
-nodes \
-sha256 \
-keyout www.nasm.us.key \
-out www.nasm.us.csr \
-subj "/C=CN/CN=www.nasm.us"


## 签发证书
openssl x509 \
-req -days 36500 \
-in www.nasm.us.csr \
-CA ca.crt \
-CAkey ca.key \
-CAcreateserial \
-out www.nasm.us.crt


## 合并CA和服务器证书成一个文件，注意服务器证书在前
cat www.nasm.us.crt ca.crt > www.nasm.us.pem




server {
    listen 80;
    listen 443;

    ssl_certificate /data/certs/nasm.us/www.nasm.us.pem;
    ssl_certificate_key /data/certs/nasm.us/www.nasm.us.key;

    server_name www.nasm.us;

    root /data/nginx;
    index index.html;
}

```

## 分析证书信息
判断是证书还是私钥：
```sh
# 文件开头和结尾包含以下内容的则为证书
-----BEGIN CERTIFICATE-----
...
-----END CERTIFICATE-----

# 文件开头和结尾包含以下内容的则为私钥
-----BEGIN PRIVATE KEY-----
...
-----END PRIVATE KEY-----
```

查看证书信息：
```sh
openssl x509 -in <证书文件> -noout -text
```
- 私钥没有过期时间，也没有域名信息。查看私钥主要是为了确认其加密算法和位数。