---
title: "SNMP设备"
---




# 监控 SNMP设备

- **SNMP主要用于网络设备的管理**
- **SNMP代理进程使用的端口为 UDP的161**

## SNMP概述

- SNMP是简单网络管理协议，它属于TCP/IP五层协议中的应用层协议

### SNMP的基本思想

- 为不同种类、型号和不同厂家生产的设备，定义一个统一的接口协议，使得管理员可以通过这个接口对网络设备进行统一管理

### SNMP的协议版本

- **SNMP v1**：采用团体名(Community Name)认证，团体名用来定义 SNMP 与NMS或Agent的关系，如果SNMP报文携带的团体名没有得到设备的认可，该报文将被丢弃，团体名起到了类似密码的作用，用来限制SNMP 与NMS或Agent的访问
- **SNMP v2c**：也采用团体名认证，它在监控SNMP v1的同时又扩充了SNMP v1的功能，它提供了更丰富的错误代码且能够更细致的区分错误
- **SNMP v3**：提供了基于用户的安全模型的认证机制，用户可以设置认证和加密功能，认证用于验证报文发送方的合法性，避免非法用户的访问，加密是对NMS和Agent之间的传输报文进行加密，以免被窃听。通过有无认证和有无加密等功能组合 可以为SNMP 与NMS或Agent之间的通信提供更高的安全性

## SNMP的组织机构

- **SNMP网络元素分为NMS和Agent两种：**
  - **NMS**(Network Management Station)网络管理站，是运行SNMP客户端管理程序的工作站，能够提供非常友好的人机交互界面，方便网络管理员完成绝大多数的网络管理工作
  - **Agent** 是驻留在设备上的一个进程，负责接受、处理来自NMS的请求报文。在一些紧急情况下 如接口状态发生改变等，Agent也会主动通知NMS
- **SNMP、NMS、Agent三者间的关系：**
  - NMS是SNMP网络的管理者，Agent是SNMP网络的被管理者
  - NMS和Agent之间通过SNMP协议来交互管理信息
- **一套完整的SNMP系统主要包括以下几个方面：**
  - SNMP报文协议
  - SMI 管理信息结构，一套公用的结构和表示符号
  - MIB 管理信息库，管理信息库包含所有代理进程的所有可被查询和修改的参数
  - OID，一个OID是一个唯一的键值对，用于标识具体某一个设备的某个具体信息，如：交换机某个端口信息、设备名称等

## SNMP MIB

- MIB被划分为若干个组，如system、interface、at(地址转换) 、ip组等
- iso.org.dod.internet.private.enterprises（1.3.6.1.4.1）这个标识，是给厂家自定义而预留的如：
  - 华为的为 1.3.6.1.4.1.2011
  - 华三的为 1.3.6.1.4.1.25506





- 这里以Centos主机来模拟SNMP设备

## 准备基于Centos的SNMP

```bash
#安装snmp
[root@snmp-dev ~]# dnf -y install net-snmp

--------------------------------------------------------------------------------

#修改配置文件
[root@snmp-dev ~]# vim /etc/snmp/snmpd.conf 
...
com2sec notConfigUser  default   testcom #设置团体认证 默认为public

group   notConfigGroup v1      notConfigUser
group   notConfigGroup v2c     notConfigUser #将团体名notConfigUser关联至组notConfigGroup

view    systemview    included   .1.3.6.1.2.1.1
view    systemview    included   .1.3.6.1.2.1.25.1.1 #创建一个view，并对其授权可访问的OID范围
view    systemview    included   .1. #自定义授权，否则zabbix server无法获取数据，
                                     #.1.表示.1.开头的都授权
access  notConfigGroup "" any  noauth    exact  systemview none none #将组notConfigGroup关联至systemview 从而完成对组的授权
...

--------------------------------------------------------------------------------

#启动服务
[root@snmp-dev ~]# systemctl enable --now snmpd

--------------------------------------------------------------------------------

#观察udp/161端口是否开启
[root@snmp-dev ~]# ss -nul
State    Recv-Q    Send-Q     Local Address:Port        Peer Address:Port
UNCONN    0          0          0.0.0.0:161              0.0.0.0:*                  
...
```

## 测试OID

- 使用snmpwalk测试
- snmpwalk是SNMP的一个工具，它使用SNMP的GET请求查询指定OID(协议中的对象标识)，入口的所有OID树信息，并显示给用户
- 通过snmpwalk也可以查看支持SNMP协议的设备的一些其他信息，如：cisco交换机或路由器IP地址、内存使用率等，也可用来协助开发SNMP功能

### 安装snmpwalk包

```bash
#安装
[root@zabbix-server ~]# dnf -y install net-snmp-utils

#获取帮助
[root@zabbix-server ~]# snmpwalk -h
...
```

### 测试SNMP数据采集

```bash
snmpwalk -v 2c -c testcom 10.0.0.28 .1.3.6.1.4.1.2021.10.1.3.1
```



## 准备监控模板

- 这里以zabbix自带的Template OS Linux SNMP模板举例
- 配置 --> 模板 --> Template OS Linux SNMP --> 宏  --> 模板 宏
  - 宏：{$SNMP_COMMUNITY}（替代默认继承模板的宏）
  - 值：testcom（执行SNMP的团体名称）



## web界面配置

- 配置 --> 主机
  - 主机：
    - 主机名称：如：test-switch（这个名称已经不重要了 因为设备上没有安装zabbix agent）
    - 可见的名称：如：test-switch
    - 群组：如：centos交换机
    - Interfaces：类型：SNMP IP地址：10.0.0.28 端口：161 SNMP version：SNMPv2
  - 模板：
    - Link new templates：Template OS Linux SNMP
  - 添加

## web界面测试

...