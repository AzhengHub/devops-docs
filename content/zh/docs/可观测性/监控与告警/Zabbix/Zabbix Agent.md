---
title: "Zabbix Agent"
---

# zabbix-agent 概述

- TCP / 10050
- 部署在被监控主机上，用于采集本机的数据并发送给Proxy或者Server，它的插件机制支持用户自定义数据采集脚本。Agent可在Server端手动配置，也可以通过自动发现机制被识别。数据收集方式同时支持主动Push和被动Pull 两种模式。
- **被监控的server上需要安装agent才能实现被监控**







# zabbix-agent 安装

- https://www.zabbix.com/cn/download

## rpm / apt 包安装

### Ubuntu

```bash
#构建仓库
# wget https://repo.zabbix.com/zabbix/5.0/ubuntu/pool/main/z/zabbix-release/zabbix-release_5.0-1+focal_all.deb
# dpkg -i zabbix-release_5.0-1+focal_all.deb
# apt update

#列出可用版本然后选择安装
apt-cache madison zabbix-agent
apt -y install zabbix-agent=1:5.0.20-1+focal
```

### Centos

```bash
#安装官方仓库
# rpm -Uvh https://repo.zabbix.com/zabbix/5.0/rhel/8/x86_64/zabbix-release-5.0-1.el8.noarch.rpm


# 替换为清华的镜像地址
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


# 列出有关zabbix-agent的相关包
[root@web1 ~]# yum list|grep zabbix-agent
zabbix-agent.x86_64  5.0.20-1.el8 #旧版的agent
zabbix-agent2.x86_64 5.0.20-1.el8 #新版的agent，不建议安装


#安装
# yum -y install zabbix-agent.x86_64


# 启动
# systemctl enable --now zabbix-agent.service


# 验证
# ss -ntl|grep 10050
LISTEN   0        128                   0.0.0.0:10050            0.0.0.0:*      
LISTEN   0        128                      [::]:10050               [::]:* 
```

## zabbix-agent.service

- /usr/lib/systemd/system/zabbix-agent.service

```bash
[Unit]
Description=Zabbix Agent
After=syslog.target
After=network.target

[Service]
Environment="CONFFILE=/apps/zabbix/etc/zabbix_agentd.conf"
EnvironmentFile=-/apps/zabbix/etc/sysconfig/zabbix-agent
Type=forking
Restart=on-failure
PIDFile=/apps/zabbix/run/zabbix_agentd.pid
KillMode=control-group
ExecStart=/usr/sbin/zabbix_agentd -c $CONFFILE
ExecStop=/bin/kill -SIGTERM $MAINPID
RestartSec=10s
User=zabbix
Group=zabbix

[Install]
WantedBy=multi-user.target


[root@18 ~]#systemctl  daemon-reload
[root@18 ~]#mkdir /apps/zabbix/run/
[root@18 ~]#chown -R zabbix.zabbix /apps/zabbix/
```







# zabbix-agent 配置文件说明

- https://www.zabbix.com/documentation/5.0/zh/manual/appendix/config/zabbix_agentd
- 下面是 zabbix-agent 的配置说明；zabbix-agent2 为官方新推出的新版agent，目前使用较少，推荐使用最初版本
- /etc/zabbix/zabbix_agentd.conf

**核心配置项**

```bash
Server=10.0.0.8 # 允许哪个zabbix-server或zabbix-proxy到本机获取监控数据，支持多个地址，以“，”隔开(必须配置 否则服务无法启动)

Hostname=10.0.0.18 # 本机主机名，建议写IP地址，便于管理（必须和添加主机时的主机名称相同）
```



**触发器相关配置**

```bash
Timeout=10 # Zabbix Agent默认的超时时间是3秒。往往我们自定义的Item由于各种原因返回时间会比较长。所以建议统一修改一个适合自己实际的值

LogRemoteCommands=1 # 1为允许zabbix-server远程在本机执行命令(主要为了实现故障恢复执行的命令)

UnsafeUserParameters=1 # 允许远程执行命令的时候使用不安全的参数(特殊字符串)

UserParameter=redis_status[*],/bin/bash /etc/zabbix/zabbix_agentd.d/redis_monitor.sh "$1" # 定义监控参数和监控脚本，可以定义多个

-----------------------------------------------------------------------------
# 有些监控项需要root权限才可以采集，可以在这里进行修改
# 注意：service文件中也需设置以root用户启动，否则还是会以service文件中指定的用户启动（进而无法获得root权限）
AllowRoot=1 # 1表示允许root用户允许zabbix-agent，0表示不允许
User=root # 以root身份运行
```



**主被动模式相关配置**

- 主动与被动模式是由zabbix server的模板决定的

```bash
ServerActive=10.0.0.8 # 主动向zabbix-server或zabbix-proxy提供数据的地址，也就是zabbix-server或zabbix-proxy的IP(可选配置)
```



**其他配置**

```bash
StartAgents=3 # 开启几个进程为zabbix-server收集数据，默认3 正常足够。设为0则不能收集数据
```





# zabbix-agent 常用内置 key

- 添加一向监控的时候，首先想到的应该是zabbix agent是否已经有相关的key存在，而不是自己去写脚本来获取key。

- https://www.zabbix.com/documentation/5.0/zh/manual/config/items/itemtypes/zabbix_agent

- 测试方法：

  - ```sh
    # zabbix_get -s 10.0.0.18 -p 10050 -k "system.cpu.load[all,avg1]"
    0.000000
    ```

```sh
system.cpu.load[all,avg1] # 返回 CPU 在过去 1 分钟内的平均负载。
system.cpu.load[all,avg5] # 返回 CPU 在过去 5 分钟内的平均负载。
system.cpu.load[all,avg15]# 返回 CPU 在过去 15 分钟内的平均负载。

agent.ping # 检测被监控端是否存活，如果存活则返回值为 1。

agent.hostname # 被监控端主机名？

agent.version # 打印 zabbix agent 版本

vfs.fs.size[/,pfree] # 返回根分区剩余空间百分比 (数字)；

net.if.in[eth0] # 返回eth0网卡的流入流量 (数字)；
net.if.out[eth0] # 返回eth0网卡的流出流量 (数字)。
```







# zabbix-agent 自定义 key

- 自定义监控项：https://www.zabbix.com/documentation/5.0/zh/manual/config/items/userparameters
