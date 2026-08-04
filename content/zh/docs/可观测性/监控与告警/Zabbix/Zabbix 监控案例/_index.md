---
title: "Zabbix 监控案例"
---

# 前言

## Zabbix 内部的整体数据流

- 首先，为了创建一个采集数据的监控项，您就必须先创建主机。其次，必须有一个监控项来创建触发器。最后，您必须有一个触发器来创建一个动作，这几个点构成了一个完整的数据流。
- 因此，如果您想要收到 CPU load it too high on *Server X* 的告警，您必须首先为 *Server X* 创建一个主机条目，其次创建一个用于监视其 CPU 的监控项，最后创建一个触发器，用来触发 CPU is too high 这个动作，并将其发送到您的邮箱里。虽然这些步骤看起来很繁琐，但是使用模板的话，其实并不复杂。也正是由于这种设计，使得 Zabbix 的配置变得更加灵活易用。

## 故障报警实现流程

### 所需组件

- 被监控的主机
- 监控项
- 触发器
- 动作
- 通知媒介(邮箱、短信、企业微信等)
- 收信人

### 组件调用关系

- 被监控的主机 --> 监控项 --> 触发器 --> 动作 --> 通知媒介 --> 收信人







# 部署agent流程

1. 在监控的主机上安装zabbix_agent(编译或包安装)

2. 修改 zabbix_agent 的配置文件，主要修改以下项目：

   - ```bash
     # /etc/zabbix/zabbix_agentd.conf
     # 动作相关配置
     EnableRemoteCommands=1 # 1为允许zabbix-server远程在本机执行命令(主要为了实现故障恢复执行的命令)
     UnsafeUserParameters=1 # 允许远程执行命令的时候使用不安全的参数(特殊字符串)
     Timeout=10 # Zabbix Agent默认的超时时间是3秒。往往我们自定义的Item由于各种原因返回时间会比较长。所以建议统一修改一个适合自己实际的值
     
     # 主动与被动模式是由zabbix server的模板决定的
     Server=10.0.0.8 # 允许哪个zabbix-server到本机获取监控数据，支持多个地址，以“，”隔开
     ServerActive=10.0.0.8 # 主动向zabbix-server或zabbix-proxy提供数据的地址，也就是zabbix-server或zabbix-proxy的IP
     Hostname=10.0.0.38 # 本机主机名，建议写IP地址 便于管理
     ```

3. 启动 zabbix_agent 的服务 并设置开机自启动，然后观察10050端口是否开启



**主动与被动模式是由zabbix server的模板决定的，对吗？**

不完全正确。主动与被动模式是由Zabbix Agent配置文件决定的。

- 当Zabbix Agent以主动模式运行时，它将主动向Zabbix Server发送数据。
- 而当Zabbix Agent以被动模式运行时，Zabbix Server将通过连接到Zabbix Agent的IP地址和端口来获取数据。

在Zabbix中，模板可以用来预定义监控项、触发器和图形等，但是模板本身并不决定主动或被动模式的使用。主动和被动模式是由Zabbix Agent配置文件中的“Server”和“ServerActive”选项的设置决定的。如果设置为Zabbix Server的IP地址和端口，则Zabbix Agent将以被动模式运行；如果设置为“127.0.0.1”和Zabbix Server的端口，则Zabbix Agent将以主动模式运行。




# 添加主机流程

- 配置 --> 主机 --> 右上角创建主机
- **主机**：
  - 主机名称：被监控主机中zabbix-agent所定义的Hostname，Hostname一般是被监控主机的IP，所以这里直接写IP即可
    - 如：10.0.0.28
  - 可见的名称：输入一个对外展示的，可以使用字母数字、空格、点”."、中划线"-"、下划线"_"，如果不写此项则会使用前面定义的主机名称
    - 如：10.0.0.28-nginx-web1
  - 群组：选择一个或多个已经定义的分组，群组如果事先没有创建的话会根据定义的群组名称自动创建，所有访问权限都分配到主机组，而不是单独的主机。这也是主机需要属于至少一个组的原因。
    - 如：web
  - Interfaces：接口类型，有客户端、SNMP、JMX、IPMI几种类型
    - 客户端：如：定义被监控主机的IP地址等信息 10.0.0.28 端口号一般默认10050即可
    - SNMP：...
    - JMX：...
    - IPMI：...
  - 由agent代理程序监测：
    - 如：涉及到proxy代理节点时需要配置

## 测试主机是否添加成功

- 无法ping通重点排查agent配置文件中的Server和ServerActive项，以及添加时是否有错误

```bash
#从zabbix-server ping 被监控的主机
[root@zabbix-server ~]# zabbix_get -s 10.0.0.28 -p 10050 -k "agent.ping"
1 #1则代表成功
```







# 添加模板流程

## 注意：

- **模板中需定义触发器才可以实现动作，有了动作和报警媒介以及被通知的用户才可以实现故障报警**

- 模板制作参看下面的创建自定义模板



## 添加模板：

- 配置 --> 主机 --> 选择主机
- **模板**：
  - Link new templates --> 选择模板 --> 如：Template App Nginx by Zabbix agent --> 更新



## 创建自定义模板

### 说明

- 系统自带的模板往往不能满足生产要求，这时就需要自定义监控的模板来满足需求
- 监控脚本和配置建议放到子配置文件：/etc/zabbix/zabbix_agentd.d/ 中，便于管理

### 定义子配置文件

```bash
#vim /etc/zabbix/zabbix_agentd.conf
...
Include=/etc/zabbix/zabbix_agentd.d/*.conf #此项一般为默认值
...
```

### 创建监控redis的自定义模板

#### 准备监控redis脚本

- **在需要被监控的主机部署**

```bash
# /etc/zabbix/zabbix_agentd.d/redis_monitor.sh 

#!/bin/bash
#Author:xiangzheng
REDIS_HOST="127.0.0.1"
REDIS_PASS=""

redis_status(){
    redis-cli --no-auth-warning -h "${REDIS_HOST}" -a "${REDIS_PASS}" info | grep -w $1 | awk -F: '{print $2}'

}

redis_status $1
```

#### 将监控脚本关联至子配置文件

```bash
#/etc/zabbix/zabbix_agentd.d/zabbix_monitor.conf
...
UserParameter=redis_status[*],/bin/bash /etc/zabbix/zabbix_agentd.d/redis_monitor.sh "$1"
...
```

#### 测试监控脚本

```bash
[root@zabbix-server ~]# zabbix_get -s 10.0.0.28 -p 10050 -k redis_status[connected_clients]
2

[root@zabbix-proxy ~]# zabbix_get -s 10.0.0.28 -p 10050 -k redis_status[connected_clients]
2
```

#### 创建模板

- web界面 --> 配置 --> 模板 --> 创建模板
  - 模版名称 如：Templates MySQL status check
  - 群组 如：Templates

#### 基于模板创建监控项

- web界面 --> 配置 --> 选择模板 --> 创建监控项
- **监控项：**
  - 名称：如：MySQL主从同步延迟时间
  - 类型：如：zabbix客户端(主动式)
  - 键值：如：mysql_status[Seconds_Behind_Master]
  - 信息类型：如：数字(无正负)
  - 单位：如：秒
  - 间隔时间：如：3m
  - 添加

#### 基于监控项创建图形

- web界面 --> 配置 --> 选择模板 --> 创建图形
- **图形：**
  - 名称：如：MySQL主从同步延迟时间
  - 监控项：如：添加 MySQL主从同步延迟时间
  - 添加

#### 基于监控项创建触发器

- web界面 --> 配置 --> 选择模板 --> 创建触发器

- **触发器：**
- 名称：如：MySQL主从同步延迟时间
  
- 严重性：如：严重（根据情况设定）
  
- 表达式：
  
  - 监控项：如：Templates MySQL status check: MySQL主从同步延迟时间
    - 功能：如：last最后的值
  
  - 间隔(秒)：如：180s（可选，这里值得是每隔多少秒探测一次）
    - 结果：如：>180（这里值得是监控项的值大于180则触发）
  
- 添加

#### 关联模板

- 配置 --> 主机 --> 选择主机
- **模板**：
  - Link new templates --> 选择模板 --> 如：Templates MySQL status check --> 更新





# 添加通知媒介流程

## 定义通知媒介类型

### 邮箱通知

- 管理 --> 报警媒介类型 --> 创建媒体类型
  - 名称：网易163邮箱报警媒介
  - 类型：电子邮件
  - SMTP服务器：smtp.163.com
  - SMTP服务器端口：465
  - SMTP HELO：163.com
  - SMTP电邮：rootroot25@163.com
  - 安全链接：SSL/TLS
    - SSL验证对端 √
    - SSL验证主机 √
  - 认证：用户名和密码
  - 用户名称：rootroot25@163.com
  - 密码：XXXXXXXXXXXXX（从各大邮箱平台获取的密码）

### 短信通知

#### 说明

- 注意：实现短信通知只能通过脚本

- 官方脚本参数宏：https://www.zabbix.com/documentation/5.0/zh/manual/appendix/macros/supported_by_location

- ```bash
  #官方提供的脚本参数宏
  {ALERT.SENDTO} #收件人媒介
  {ALERT.SUBJECT} #通知主题
  {ALERT.MESSAGE} #通知内容
  ```

#### 国内短信服务提供商

- 云片：https://www.yunpian.com/

#### 实现短信通知

- 管理 --> 报警媒介类型 --> 创建媒体类型
  - 名称：短信平台报警媒介
  - 类型：脚本（短信通知脚本参考下面的内容）
  - 脚本名称：如：send_sms.sh
  - 脚本参数：
    - {ALERT.SENDTO}（**值来自于用户报警媒介定义的收件人**）
    - {ALERT.SUBJECT} （**值来自于动作定义的主题**）
    - {ALERT.MESSAGE}（**值来自于动作定义的信息**）
  - 已启用：√
  - 更新

#### 短信通知脚本

- apt安装存放路径：/usr/lib/zabbix/alertscripts

```bash
#测试脚本
[root@zabbix-server ~]# vim /usr/lib/zabbix/alertscripts/send_sms.sh
DATE="`date "+%F %T"`"
echo "${DATE} $1 <-- $2 $3" >> /tmp/zabbix_send_msm.log


#修改脚本权限（权限视情况而定，只要zabbix-server能执行即可）
[root@zabbix-server ~]# chmod a+x /usr/lib/zabbix/alertscripts/send_sms.sh
[root@zabbix-server ~]# ll /usr/lib/zabbix/alertscripts/send_sms.sh

#配置动作后日志记录情况
[root@zabbix-server ~]# tail -f /tmp/zabbix_send_msm.log
2022-03-04 12:52:13 18525720417 <-- 业务报警：MySQL主从同步健康性检查 业务报警服务器：10.0.0.28-mysql-slave，IP：10.0.0.28，详情：MySQL主从同步健康性检查:100 个
2022-03-04 12:52:43 18525720417 <-- 业务恢复：MySQL主从同步健康性检查 业务恢复服务器：10.0.0.28-mysql-slave，IP：10.0.0.28，详情：MySQL主从同步健康性检查:50 个

#实际生产环境脚本
#!/bin/sh
DATE="`date "+%F %T"`"
MOBILE="$1"
SUBJECT="$2"
MESSAGE="$3"
curl -X "POST" "https://sms.yunpian.com/v2/sms/single_send.json" \
  -H "content-type: application/x-www-form-urlencoded" \
  -d "apikey=4d6cxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \
  -d "mobile=${MOBILE}" \
  -d "text=${MESSAGE}"
echo "${DATE} ${MOBILE} <-- ${SUBJECT} ${MESSAGE}" >> /tmp/zabbix_send_msm.log
```

### 企业微信

- **注意：企业微信安全升级，需要对自建应用配置 企业可信IP 才能实现接口调用（登录企业微信后，应用管理 --> 自建应用 --> 企业可信IP）**
  - 公网IP获取方式：`curl httpbin.org/ip`

#### 实现企业微信通知

- 管理 --> 报警媒介类型 --> 创建媒体类型
  - 名称：企业微信报警媒介
  - 类型：脚本（脚本参考下面的内容）
  - 脚本名称：如：send_wx.sh
  - 脚本参数：
    - {ALERT.SENDTO}（**值来自于用户报警媒介定义的收件人**）
    - {ALERT.SUBJECT} （**值来自于动作定义的主题**）
    - {ALERT.MESSAGE}（**值来自于动作定义的信息**）
  - 已启用：√
  - 更新

#### 企业微信通知脚本

- 官方文档：https://developer.work.weixin.qq.com/document/path/90664

- **注意：token是由有效期的，默认是7200秒 即两个小时，需要想办法解决这个问题，如定时获取并导入等...**

  - ```bash
    #范例，获取token
    [root@zabbix-server ~]# curl -s "https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=ww2e2992779dc200a5&corpsecret=i36Ha0ihSV48zzPYKGxGWsKBY-KYlURWFg4L9jua4zk"|awk -F\" '{print $10}'
    3RA4xFsbnQv7s7fLj0hLAF9yB1_PhNb8GkPveVGkXy2RMsB6nae02KI6jitDFD5WsxtSyydlYDIRzzYLrCP9X13R6tezRRCZvULvecxQjJuhhx6MKOdhLtZpYE54gTx1Yy6m5-aPoFFcWaXARBqRi29qpOxPCw7mGvwyS07h1OHeQNOOPhpOagm-cAuOu4_iSaHWi4VDRtN0flWzvyrDlQ
    
    #定义环境变量
    #/etc/profile.d/wx_token.sh
    TOKEN=`curl -s "https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=ww2e2992779dc200a5&corpsecret=i36Ha0ihSV48zzPYKGxGWsKBY-KYlURWFg4L9jua4zk"|awk -F\" '{print $10}'`
    
    #加到脚本中，以实现每次启动获取最新的TOKEN
    #/lib/zabbix/alertscripts/send_wx.sh 
    #!/bin/bash
    USER="$1"
    SUBJECT="$2"
    MESSAGE="$3"
    WX_SEND="{
       \"touser\" : \"${USER}\",
       \"msgtype\" : \"text\",
       \"agentid\" : 1000002,
       \"text\" : {
           \"content\" : \"${SUBJECT}\n${MESSAGE}\"
       },
       \"safe\":0,
    }"
    
    . /etc/profile.d/wx_token.sh
    
    curl -d "${WX_SEND}" "https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token=${TOKEN}"
    
    echo "${DATE} ${USER} <-- ${SUBJECT} ${MESSAGE}" >> /tmp/zabbix_send_wx.log
    ```

    

- **所需data：**

  - corpid：xxx（获取access_token的必要条件，我的企业 --> 企业ID）
  - SECRET：xxx（获取access_token的必要条件，应用管理 --> 自建应用 -->Secret）
  - access_token：https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=ID&corpsecret=SECRET（使用GET方法获取，大写的字母是需要替换的位置）
  - AgentId：xxx（下面脚本所需的agentid应用id，应用管理 --> 自建应用 --> AgentId）

- **POST方法发送信息：**

  - https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token=ACCESS_TOKEN

```bash
[root@zabbix-server ~]# cat /lib/zabbix/alertscripts/send_wx.sh 
#!/bin/bash
USER="$1"
SUBJECT="$2"
MESSAGE="$3"
WX_SEND="{
   \"touser\" : \"${USER}\",
   \"msgtype\" : \"text\",
   \"agentid\" : 1000002,
   \"text\" : {
       \"content\" : \"${SUBJECT}\n${MESSAGE}\"
   },
   \"safe\":0,
}"

curl -d "${WX_SEND}" "https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token=GDQbPrK2GOKMAKILDRGpxBGjIEvvBJ3NEF6bRxViB6phZMm61BF6TWX1ofqg5Liz_O4keEQFeAaJS9otjHHuRSKW79C8T_qujTZuo4Cjq41oe_QkafH6u0Wxy7GTRxEBtSrIR4YiDVWNZYjtKCEuMhdTfh7cioIHPVB9QBu-pfBZBzG50pvClkJScCyxwaXUUEKicXraVsbCSLbSxjF5AA"

echo "${DATE} ${USER} <-- ${SUBJECT} ${MESSAGE}" >> /tmp/zabbix_send_wx.log
```



## 添加用户

- 管理 --> 用户 --> 创建用户
- **用户：**
  - 别名：如：阿征
  - 用户名第一部分：如：项
  - 姓氏 如：征
  - 群组：如：Zabbix administrators
- **权限：**
  - 用户类型：如：超级管理员（按需添加）
- 添加



## 给用户添加报警媒介

### 邮箱通知

- 管理 --> 用户 --> 选择用户 --> 报警媒介 --> 添加
  - 类型：网易163邮箱报警媒介
  - 收件人：767483070@qq.com
  - 当启用时：默认为7x24小时，默认即可
  - 如果存在严重性则使用：一般将所有类型的信息都添加
  - 添加

### 短信通知

- 管理 --> 用户 --> 选择用户 --> 报警媒介 --> 添加
  - 类型：短信平台报警媒介
  - 收件人：13888888888
  - 当启用时：默认为7x24小时，默认即可
  - 如果存在严重性则使用：按需添加通知的级别，一般通过短信通知都是严重或以上
  - 更新

### 企业微信通知

- 管理 --> 用户 --> 选择用户 --> 报警媒介 --> 添加
  - 类型：企业微信报警媒介
  - 收件人：XiangZheng（企业微信通讯录中的成员账号）
  - 当启用时：默认为7x24小时，默认即可
  - 如果存在严重性则使用：按需添加通知的级别，一般通过短信通知都是严重或以上
  - 更新





# 添加动作流程

## 前言

### 执行恢复命令注意事项

- 给zabbix添加sudo权限，否则无法在被监控主机远程执行命令
- 因为有些服务必须以root用户才能进行重启，所以此项必须设置

```bash
[root@nginx-web1 ~]# vim /etc/sudoers
...
#Defaults   !visiblepw    #注释此行，表示不强制使用tty
zabbix  ALL=NOPASSWD: ALL #允许zabbix执行命令时不需要密码验证
...
```

- 在agent主机修改配置文件

```sh
[root@nginx-web1 ~]# vim /etc/zabbix/zabbix_agentd.conf
...
EnableRemoteCommands=1 #1为允许zabbix-server远程在本机执行命令(主要为了实现故障恢复执行的命令)
UnsafeUserParameters=1 #允许远程执行命令的时候使用不安全的参数(特殊字符串)
...

[root@nginx-web1 ~]# systemctl restart zabbix-agent.service
```

### 无法执行命令的常见原因

- Unsupported item key

```bash
#Zabbix Agent默认的超时时间是3秒。往往我们自定义的Item由于各种原因返回时间会比较长。所以建议统一修改一个适合自己实际的值
[root@nginx-web1 ~]# vim /etc/zabbix/zabbix_agentd.conf 
...
Timeout=10
...
[root@nginx-web1 ~]# systemctl restart zabbix-agent.service 
```

### zabbix动作信息参照变量

```bash
{EVENT.NAME} #问题名称，例：Nginx: Process is not running
{TRIGGER.NAME} #信息，例：Nginx: Process is not running 

{HOST.NAME} #主机名，例：10.0.0.28-nginx-web1
{HOSTNAME1}  #主机IP，例：10.0.0.28
{EVENT.DATE} #日期，例：2022.03.02
{EVENT.TIME} #时间，例：20:13:16
{TRIGGER.SEVERITY} #告警等级，例：High
{TRIGGER.KEY1} #项目，例：proc.num[nginx]
{ITEM.NAME}:{ITEM.VALUE} #问题详情，例：Nginx: Number of processes running:0
{TRIGGER.STATUS}:{ITEM.VALUE1} #当前状态，例：PROBLEM:0
{EVENT.ID} #事件ID，例：2820
```



## 实现动作添加

### 基于邮件

配置 --> 动作 --> 创建动作

- **动作：**

  - 名称：如：Nginx进程停止运行
  - 条件：如： 触发器 等于 10.0.0.28-nginx-web1: Nginx: Process is not running，添加
    - **也可以基于警报严重级别来进行统一添加**
  - 条件：如： 主机群组 等于 nginx（则表示此信息只发送给nginx组的主机）
  - 已启用：√

- **操作：**

  - 默认操作步骤持续时间：60s（表示多少秒执行一次下面的步骤，最少为60s否则会报错：字段 "esc_period": 值必须是 60-604800 之一 值错误。）
  - 暂停操作以制止问题：√
  - **操作**（支持发送消息和远程命令这两种类型）
    - **操作类型：发送消息**（主要用来定义服务故障后发送的信息）
      - 步骤：1-3（根据情况设置，此处1-3表示 总共发送3次 每次间隔60s 因为默认操作步骤持续时间设定的是60s）
      - Send to user groups：（可以从这里选择发送的分组，从而实现不同的动作发送给不同的分组，如：网络组、DBA组等...）
      - Send to users：Admin (Zabbix Administrator)
      - 仅送到：网易163邮箱报警媒介
      - Custom message：√
      - 主题：如：业务报警：{EVENT.NAME}
      - 消息：如：业务报警服务器：{HOST.NAME}，IP：{HOSTNAME1}，详情：{ITEM.NAME}:{ITEM.VALUE}
    - **操作类型：远程命令**（主要用来定义服务故障后执行的恢复命令 脚本等操作）
      - 步骤：1-1（表示执行一次，根据情况也可以设置1-2、1-3 即执行2次、3次）
      - 步骤持续时间：30s（故障后间隔多久执行恢复命令或脚本）
      - 目标列表：当前主机√
      - 类型：自定义脚本
      - 执行在：zabbix客户端
      - 命令：命令脚本都可以，也可以在被执行的主机先创建个测试文件试试是否能执行，命令最好写绝对路径，如：sudo /usr/bin/touch /tmp/123.txt 或 sudo /data/scripts/nginx_check.sh
    - **操作类型：发送消息**（在进行定义则实现递归报警，如：前面三次报警发送完毕但故障仍未恢复 则发送给高级运维、运维经理等上一层级人员）
      - 步骤：4-5（根据情况设置，此处4-5表示 总共发送2次 每次间隔60s 因为默认操作步骤持续时间设定的是60s）
      - Send to user groups：（可以从这里选择发送的分组，从而实现不同的动作发送给不同的分组，如：网络组、DBA组等...）
      - Send to users：项征
      - 仅送到：网易163邮箱报警媒介
      - Custom message：√
      - 主题：如：业务报警：{EVENT.NAME}
      - 消息：如：业务报警服务器：{HOST.NAME}，IP：{HOSTNAME1}，详情：{ITEM.NAME}:{ITEM.VALUE}

  

  - **恢复操作**（支持发送消息和远程命令以及通知所有参与者这三种类型）

    - **操作类型：发送消息**（主要用于定义服务恢复后发送的信息）

      - Send to user groups：（可以从这里选择发送的分组，从而实现不同的动作发送给不同的分组，如：网络组、DBA组等...）

      - Send to users：Admin (Zabbix Administrator)
      - 仅送到：网易163邮箱报警媒介
      - 主题：如：业务恢复：{EVENT.NAME}
      - 消息：如：业务恢复服务器：{HOST.NAME}，IP：{HOSTNAME1}，详情：{ITEM.NAME}:{ITEM.VALUE}

    - **操作类型：发送消息**（这里是在定义了上面的给高级运维、运维经理等上一层级人员发送信息后的恢复信息）

      - Send to user groups：（可以从这里选择发送的分组，从而实现不同的动作发送给不同的分组，如：网络组、DBA组等...）

      - Send to users：项征
      - 仅送到：网易163邮箱报警媒介
      - 主题：如：业务恢复：{EVENT.NAME}
      - 消息：如：业务恢复服务器：{HOST.NAME}，IP：{HOSTNAME1}，详情：{ITEM.NAME}:{ITEM.VALUE}

### 基于短信

- **通过短信实现动作和上面基本一致，只需把通知媒介改为短信，但是发送的内容有严格的格式要求，具体参考短信服务商官方文档**
- **这里所有的主题和内容都将作为变量的内容赋值给之前在定义短信通知脚本媒介时定义的 {ALERT.SUBJECT}  {ALERT.MESSAGE} 这两个参数变量，然后参数变量得到值后 再将变量写到发送的脚本中作为发送条件**

#### 主题范例

- 业务报警：{EVENT.NAME}
- 业务恢复：{EVENT.NAME}

#### 信息范例

- 【阿征科技】业务报警服务器：{HOST.NAME}，IP：{HOSTNAME1}，详情：{ITEM.NAME}:{ITEM.VALUE}
- 【阿征科技】业务恢复服务器：{HOST.NAME}，IP：{HOSTNAME1}，详情：{ITEM.NAME}:{ITEM.VALUE}



### 基于企业微信

- 







# 自定义监控项实现流程

1. 准备shell命令或脚本，能获取到指定被监控的数据
2. 将脚本或者命令添加到zabbix agent的配置文件中的UserParameter行中
3. 重启zabbix agent，并在zabbix server端测试添加的key是否能生效
4. 在zabbix web添加监控项、图形

## 注意事项

- 在web界面更改监控项所采集的键值或其他属性后，可能不会生效，解决方案是删除图形和监控项然后重新创建

