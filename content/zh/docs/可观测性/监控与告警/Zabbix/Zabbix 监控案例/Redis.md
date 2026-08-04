---
title: "Redis"
---


# Redis 核心监控项

- 端口是否存活、进程是否存在

- redis的客户端连接数（会话连接数量）

- 每秒处理请求总数

- 阻塞连接数

- redis内存使用量

- 主从角色

- redis日志队列长度（可选项，主要防止redis采集es日志时堆积过多）参考监控脚本：

  - ```bash
    #!/bin/bash
    #
    #********************************************************************
    #Author:	     	xiangzheng
    #QQ: 			    767483070
    #Date: 		     	2022-06-18
    #FileName：		    monitor_redis.sh
    #URL: 		    	https://www.xiangzheng.vip
    #Email: 		    rootroot25@163.com
    #Description：		The test script
    #Copyright (C): 	2022 All rights reserved
    #********************************************************************
    REDIS_HOST="127.0.0.1"
    REDIS_PASS="12345"
    REDIS_DB="2"
    
    redis_leen(){
        redis-cli --no-auth-warning -h "${REDIS_HOST}" -a "${REDIS_PASS}" -n "${REDIS_DB}" LLEN 10.0.0.8-message-log | awk  '{print $1}'
    }
    
    redis_leen
    ```

    






# Redis 监控脚本

- /etc/zabbix/zabbix_agentd.d/redis_monitor.sh 

```bash
#!/bin/bash
#Author:xiangzheng
REDIS_HOST="127.0.0.1"
REDIS_PASS=""

redis_status(){
    redis-cli --no-auth-warning -h "${REDIS_HOST}" -a "${REDIS_PASS}" info | grep -w $1 | awk -F: '{print $2}'

}

redis_status $1
```

- **将监控脚本关联至子配置文件**

```bash
# /etc/zabbix/zabbix_agentd.d/zabbix_monitor.conf
...
UserParameter=redis_status[*],/bin/bash /etc/zabbix/zabbix_agentd.d/redis_monitor.sh "$1"
...
```

- **测试监控脚本**

```bash
[root@zabbix-server ~]# zabbix_get -s 10.0.0.28 -p 10050 -k redis_status[connected_clients]
2

[root@zabbix-proxy ~]# zabbix_get -s 10.0.0.28 -p 10050 -k redis_status[connected_clients]
2
```







# 实现

## 先决条件

- 被监控主机安装 zabbix-agent



## 准备被监控主机并关联模板

- 这里以redis连接数超过3则报警举例

- 监控项和触发器等内容 参看：模板管理 --> 自定义模板 --> 创建监控redis的自定义模板



## 准备通知媒介

#### 邮箱通知

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
  - 密码：GTMSXAVCDUBURPGI



## 给用户添加报警媒介信息

- 这里选择使用zabbix默认的Admin用户
  - 管理 --> 用户 --> Admin --> 报警媒介 --> 添加
    - 类型：网易163邮箱报警媒介
    - 收件人：767483070@qq.com
    - 添加



## 添加动作

- 配置 --> 动作 --> 创建动作
  - 动作：
    - 名称：redis连接数报警
    - 已启用：√
  - 操作：
    - 默认操作步骤持续时间：60s（多少秒执行一次下面的步骤）
    - 暂停操作以制止问题：√
    - 操作
      - 操作类型：发送消息
      - 步骤：1-3（根据情况设置，此处1-3表示 总共发送3次 每次间隔60s 因为默认操作步骤持续时间设定的是60s）
      - Send to users：Admin (Zabbix Administrator)
      - 仅送到：网易163邮箱报警媒介
      - Custom message：√
      - 主题：业务报警：redis连接数超出阈值
      - 消息：XXX
  - 恢复操作：
    - 操作类型：发送消息
    - Send to users：Admin (Zabbix Administrator)
    - 仅送到：网易163邮箱报警媒介
    - 主题：业务报警：redis连接数恢复正常
    - 消息：XXX



## 验证

- 将redis连接数提升到报警阈值>3，测试是否发送报警邮件，测试成功后，再恢复连接数到阈值以下，测试是否有恢复的通知

