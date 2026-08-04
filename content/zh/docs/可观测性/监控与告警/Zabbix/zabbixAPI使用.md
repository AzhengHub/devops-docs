---
title: "zabbixAPI使用"
---

# ZabbixAPI 基础使用

- **官方文档：**https://www.zabbix.com/documentation/5.0/zh/manual/api

## 获取token

### 前言

- 需要先获取token才能实现对zabbix-server的管理
- 可以不在zabbix server执行
- token存在有效期 过期即失效，且每次获取的token都是不同的

### 方法一

- 此方式无需安装python，但输出结果不直观

```bash
curl --http1.1 -H 'Content-Type:application/json-rpc' -d '
{
     "jsonrpc": "2.0",
     "method": "user.login",
     "params": {
         "user": "阿征", #zabbix-server上的用户名
         "password": "12345" #对应的密码
     },
     "id": 1,
     "auth": null
 } ' 'http://10.0.0.8/api_jsonrpc.php' #RUL

{"jsonrpc":"2.0","result":"845bbca99a8afe24d76a55c501ae3372","id":1} #result后是token
```

### 方法二

- 此方法需要安装python，输出显示更直观

```bash
#没有Python3需要先安装
yum -y install python3

#执行以下命令，需指定user、password、和主机
curl -s -X POST -H 'Content-Type:application/json' -d'
{
    "jsonrpc": "2.0",
    "method": "user.login",
    "params": {
        "user": "阿征",
        "password": "12345"
    },
    "id": 1
}' http://10.0.0.8/api_jsonrpc.php | python3 -m json.tool
#下面是返回的值
{
    "jsonrpc": "2.0",
    "result": "5863ad59229bd9898a3422b9c6c6e1e8", #此为token
    "id": 1
}
```

## 获取主机信息

```shell
curl -s -X POST -H 'Content-Type:application/json' -d'
{
    "jsonrpc": "2.0",
    "method": "host.get",
    "params": {
        "output": [
            "hostid",
            "host"
        ],
        "selectInterfaces": [
            "interfaceid",
            "ip"
        ]
    },
    "id": 2,
    "auth": "845bbca99a8afe24d76a55c501ae3372"
}' http://10.0.0.8/api_jsonrpc.php | python3 -m json.tool
```









# 通过 ZabbixAPI 批量添加主机

## 前言

- 不要使用自动发现主机会导致：扫描周期漫长、添加的主机不能自定义名称、会增加zabbix server的负载、导致数据收集延迟
- 而通过zabbix提供的内置API可以实现完全自动化添加删除主机、agent、关联模板等操作，提高效率，减少重复冗余的工作
- 官方文档：https://www.zabbix.com/documentation/5.0/zh/manual/api/reference/host/create
- 

## 参数说明

- 下面实现的是创建一个具有IP接口和标签且名为“Linux Server”的主机，将其添加到主机组中，链接一个模板并且把MAC地址设置到主机资产清单里。

```sh
{
           "jsonrpc": "2.0", #jsonrpc的版本
           "method": "host.create", #方法类型，创建主机
           "params": { #定义参数
               "host": "10.0.0.123", #主机名称，被监控主机agent配置文件中的Hostname=
               "name": "nginx-10.0.0.123" #可见的名称
               "proxy_hostid": "10441", #可选项，配置proxy代理场景从这里指定proxy代理的ID，相关id可以在浏览器打开agent代理程序页面然后选择代理时查看到
               "interfaces": [
                   {
                       "type": 1, #类型为1表示客户端，2是SNMP，3是IPMI，4是JMX
                       "main": 1, #是否为默认接口，1默认接口，0非默认接口，默认为1
                       "useip": 1, #0是使用DNS，1是使用IP地址
                       "ip": "10.0.0.123", #被监控主机的IP地址，需安装zabbix-agent
                       "dns": "", #不指定DNS，指定需添加
                       "port": "10050" #agent端口
                   }
               ],
               "groups": [
                   {
                       "groupid": "24" #添加到的组的ID,相关id可以在浏览器打开zabbix组页面时查看到
                   }
               ],
               "templates": [
                   {
                       "templateid": "10284" #关联的模板ID,相关id可以在浏览器打开zabbix模板页面时查看到
                   }
               ]
           },
           "auth": "845bbca99a8afe24d76a55c501ae3372", #token
           "id": 1 #主机ID
       }
```



## 批量添加主机脚本

### 存在proxy代理场景

```bash
#!/bin/bash
TOKEN="845bbca99a8afe24d76a55c501ae3372"
PROXY_ID="10441"
GROUP_ID="24"
TEMP_ID="10284"
IP_LIST="
10.0.0.100
10.0.0.101
10.0.0.102
10.0.0.103
10.0.0.104
10.0.0.105
10.0.0.106
10.0.0.107
10.0.0.108
10.0.0.109
10.0.0.110
10.0.0.111
"

for IP in ${IP_LIST};do
curl -s -X POST -H 'Content-Type:application/json' -d"
{
    \"jsonrpc\": \"2.0\",
    \"method\": \"host.create\",
    \"params\": {
        \"host\": \"${IP}\",
        \"name\": \"nginx-${IP}\",
        \"proxy_hostid\": \"${PROXY_ID}\",
        \"interfaces\": [
            {
                \"type\": 1,
                \"main\": 1,
                \"useip\": 1,
                \"ip\": \"${IP}\",
                       \"dns\": \"\",
                       \"port\": \"10050\"
                   }
               ],
               \"groups\": [
                   {
                       \"groupid\": \"${GROUP_ID}\"
                   }
               ],
               \"templates\": [
                   {
                       \"templateid\": \"${TEMP_ID}\"
                   }
               ]
           },
           \"auth\": \"${TOKEN}\",
           \"id\": 1
}" http://10.0.0.8/api_jsonrpc.php | python3 -m json.tool
done
```

### 无proxy代理场景

```bash
#!/bin/bash
TOKEN="845bbca99a8afe24d76a55c501ae3372"
GROUP_ID="24"
TEMP_ID="10284"
IP_LIST="
10.0.0.100
10.0.0.101
10.0.0.102
10.0.0.103
10.0.0.104
10.0.0.105
10.0.0.106
10.0.0.107
10.0.0.108
10.0.0.109
10.0.0.110
10.0.0.111
"

for IP in ${IP_LIST};do
curl -s -X POST -H 'Content-Type:application/json' -d"
{
    \"jsonrpc\": \"2.0\",
    \"method\": \"host.create\",
    \"params\": {
        \"host\": \"${IP}\",
        \"name\": \"nginx-${IP}\",
        \"interfaces\": [
            {
                \"type\": 1,
                \"main\": 1,
                \"useip\": 1,
                \"ip\": \"${IP}\",
                       \"dns\": \"\",
                       \"port\": \"10050\"
                   }
               ],
               \"groups\": [
                   {
                       \"groupid\": \"${GROUP_ID}\"
                   }
               ],
               \"templates\": [
                   {
                       \"templateid\": \"${TEMP_ID}\"
                   }
               ]
           },
           \"auth\": \"${TOKEN}\",
           \"id\": 1
}" http://10.0.0.8/api_jsonrpc.php | python3 -m json.tool
done
```

