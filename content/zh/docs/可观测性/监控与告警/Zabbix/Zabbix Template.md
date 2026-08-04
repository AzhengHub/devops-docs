---
title: "Zabbix Template"
---

# 模板概述

- 模板是一组可以被应用到一个或多个主机上的实体（监控项，触发器，图形，聚合图形，应用，LLD，Web场景）的集合
- 模版的应用使得主机上的监控任务部署快捷方便；也可以使监控任务的批量修改更加简单。模版是直接关联到每台单独的主机上。

- https://www.zabbix.com/documentation/5.0/zh/manual/xml_export_import/templates

# 模板克隆

- 基于系统或自定义的模板克隆一份，然后进行个性化定制



# 导入模板

- 配置 --> 模板 --> 导入模板(导入模板时一般使用缺省的√就可以)



# 自定义模板说明

- 系统自带的模板往往不能满足生产要求，这时就需要自定义监控的模板来满足需求





# 范例：创建监控 redis 的自定义模板

### 准备监控 redis 脚本

- 将监控脚本放在需要被监控的主机的 /etc/zabbix/zabbix_agentd.d/ 目录下
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

### 修改被监控主机配置文件

```bash
#/etc/zabbix/zabbix_agentd.conf
...
UserParameter=redis_status[*],/bin/bash /etc/zabbix/zabbix_agentd.d/redis_monitor.sh "$1"
...
```

### 测试监控脚本

```bash
[root@zabbix-server ~]# zabbix_get -s 10.0.0.28 -p 10050 -k redis_status[connected_clients]
2

[root@zabbix-proxy ~]# zabbix_get -s 10.0.0.28 -p 10050 -k redis_status[connected_clients]
2
```

### 创建模板

- web界面 --> 配置 --> 模板 --> 创建模板
  - 模版名称 如：redis status check Templates 
  - 群组 如：Templates

### 基于模板创建监控项

- web界面 --> 配置 --> 模板 --> redis status check Templates --> 监控项  --> 创建监控项
  - 名称 如：redis连接数统计
  - 类型 如：zabbix客户端(主动式)
  - 键值 如：redis_status[connected_clients]
  - 单位 如：个
  - 间隔时间 如：30s ~ 1m(根据情况设置30秒到一分钟左右)
  - 添加

### 基于监控项创建图形

- web界面 --> 配置 --> 模板 --> redis status check Templates --> 图形  --> 创建图形
  - 名称 如：redis连接数统计
  - 监控项 如：添加 --> redis status check Templates：redis连接数统计

### 基于监控项创建触发器

- web界面 --> 配置 --> 模板 --> redis status check Templates --> 触发器 --> 创建触发器
  - 名称 如：redis连接数报警
  - 严重性 如：一般严重（根据情况设定）
  - 表达式 --> 添加
    - 监控项：选择触发器所需的监控项
    - 功能：一般选择last最后即可，也可以选avg 则表示几次数据的平均值
    - 间隔：如：10s（根据情况设定）
    - 结果：一般选择 > 或 >= ，如：>3
    - 添加

### 将创建的模板导入主机

- web界面 --> 配置 --> 主机 --> 选择一个主机 --> 模板  --> Link new templates  -->  redis status check Templates 

### 测试

- web界面 --> 监测 --> 主机 --> 图形
- 观察数据变化...

### 添加其他基于redis的监控项

- 重复 基于创建的模板创建监控项 --> 基于创建的监控项创建图形 --> 将创建的模板导入主机(可选)
- 即可







# 范例：创建监控 JMX 的自定义模板

## 先决条件

- zabbix-server 已经指向了 zabbix-Java-gateway
- 被监控的宿主机已经安装了 zabbix-agent 并开启了 JMX

## web 界面操作

### 创建模板

- 配置 --> 模板 --> 创建模板
  - 模版名称 如：JMX Base Template
  - 群组 如：JMX

### 基于模板 创建监控项

- 配置 --> 模板 --> JMX Base Template --> 监控项  --> 创建监控项
  - 名称 如：已卸载类数量
  - 类型 如：JMX agent代理程序
  - 键值 如：jmx["java.lang:type=ClassLoading","UnloadedClassCount"]
  - JMX 端点：默认即可
  - 单位 如：个
  - 间隔时间 如：30s ~ 1m(根据情况设置30秒到一分钟左右)
  - 添加

### 基于监控项创建图形

- 配置 --> 模板 --> JMX Base Template --> 图形  --> 创建图形
  - 名称 如：已卸载类数量
  - 监控项 如：添加 --> JMX Base Template: 已卸载类数量
  - 添加

### 基于监控项创建触发器

- web界面 --> 配置 --> 模板 --> redis status check Templates --> 触发器 --> 创建触发器
  - 名称 如：redis连接数报警
  - 严重性 如：一般严重（根据情况设定）
  - 表达式 --> 添加
    - 监控项：选择触发器所需的监控项
    - 功能：一般选择last最后即可，也可以选avg 则表示几次数据的平均值
    - 间隔：如：10s（根据情况设定）
    - 结果：一般选择 > 或 >= ，如：>3
    - 添加

