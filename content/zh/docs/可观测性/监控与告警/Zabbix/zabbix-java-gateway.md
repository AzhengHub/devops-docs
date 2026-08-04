---
title: "zabbix-java-gateway"
---

# zabbix-java-gateway 概述

- TCP / 10052
- 主要功能是监控java程序
- Java gateway是一个独立于zabbix server和zabbix agent的组件，也就是Java gateway可以是单独一台服务器，也可以和zabbix server和zabbix agent公用一台服务器，前提端口不要冲突



zabbix-java-gateway 和 JMX 是什么关系：

Zabbix Java Gateway 是 Zabbix 监控系统的一个组件，主要用于通过 Java Management Extensions (JMX) 监控 Java 应用程序。JMX 是 Java 平台的一种标准管理和监控技术，允许开发人员在应用程序中暴露可管理的资源，例如应用程序的状态和性能指标。JMX 提供了一组 API 和协议，使得应用程序可以与管理工具进行通信，例如 Zabbix Java Gateway。

通过 Zabbix Java Gateway，Zabbix 可以通过 JMX 获取 Java 应用程序的监控数据，并将这些数据存储在 Zabbix 数据库中，以供用户分析和报告。因此，Zabbix Java Gateway 和 JMX 是紧密相关的，用于监控和管理 Java 应用程序的不同方面。



# zabbix-java-gateway 安装

- **注意：通过包安装会根据依赖自动安装 OpenJDK ，如果事先安装了 Oracle JDK 则会被覆盖，Oracle JDK 被覆盖有可能导致正在运行的 Java 程序运行异常**
- 所以 java-gateway 单独安装在一台主机上可以选择包安装
- **如果安装在其它已经跑了 Java 服务并且使用了 Oracle JDK 的主机要选择编译安装**

- https://www.zabbix.com/cn/download

## CentOS

```bash
# rpm -Uvh https://repo.zabbix.com/zabbix/5.0/rhel/8/x86_64/zabbix-release-5.0-1.el8.noarch.rpm


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


# dnf install zabbix-java-gateway

# systemctl restart zabbix-java-gateway
# systemctl enable --now zabbix-java-gateway
```

## Ubuntu

```bash
#构建仓库
# wget https://repo.zabbix.com/zabbix/5.0/ubuntu/pool/main/z/zabbix-release/zabbix-release_5.0-1+focal_all.deb
# dpkg -i zabbix-release_5.0-1+focal_all.deb
# apt update

#列出可用版本然后选择安装
apt-cache madison package-name
apt-get install <<package name>>=<<version>>
```







# zabbix-java-gateway 配置文件说明

- https://www.zabbix.com/documentation/5.0/zh/manual/appendix/config/zabbix_java

- /etc/zabbix/zabbix_java_gateway.conf

```bash
# grep ^[^#] /etc/zabbix/zabbix_java_gateway.conf
LISTEN_IP="0.0.0.0" #监听地址，一般默认即可

LISTEN_PORT=10052 #监听端口，一般默认即可

PID_FILE="/run/zabbix/zabbix_java_gateway.pid" #pid文件位置，一般默认即可

START_POLLERS=5 #开启多少个进程向java采集数据，tomcat服务器数量多则建议优化，如：和cpu核心数保持相同

TIMEOUT=30 #后端tomcat服务器多久无响应则认为超时，超时则一个数据采集周期内将无法给zabbix-server报告数据，生产中建议设常一些 如最大值：30秒

PROPERTIES_FILE=
```

