---
title: "MySQL"
---


# MySQL 核心监控项

**性能类指标：**

- QPS，数据库每秒处理的请求数量
- TPS ，数据库每秒处理的事务数量
- 并发数，数据库实例当前并行处理的会话数量
- 连接数，连接到数据库会话的数量
- 缓存命中率，查询命中缓存的比例

**高可用指标：**

- 可用性，数据库是否可以正常对外服务（端口号、进程是否存在等）
- 阻塞，慢查询的会话数
- 慢查询，慢查询情况
- 主从同步状况
- 主从同步延迟(一般是120s-300s之间检测一次 根据情况来定)
- 死锁





# 先决条件

下面以监控从节点举例

- 在mysql-slave节点上部署agent

- zabbix-agent要以root用户启动 或 使用sudo进行授权，否则将无法执行收集主动同步状态等信息的操作

```bash
#方法一：zabbix-agent以root身份启动（推荐）
#vim /etc/zabbix/zabbix_agentd.conf
...
AllowRoot=1 #运行root启动
User=root #启动用户设为root
...
#vim /lib/systemd/system/zabbix-agent.service
...
[Service]
...
User=root
Group=root
...
#systemctl daemon-reload
#systemctl restart zabbix-agent.service
#ps aux|grep zabbix #验证

------------------------------------------------------------------------------

#方法二：将zabbix-agent进行sudo授权
#vim /etc/sudoers
...
#Defaults   !visiblepw    #注释此行，表示不强制使用tty
zabbix  ALL=NOPASSWD: ALL #允许zabbix执行命令时不需要密码验证
...
```





## 在web界面添加mysql-slave主机

- 参考上面的 添加主机流程

## 在web界面添加监控模板

- 可以参考上面的 添加模板流程

### 准备监控脚本

- 监控slave主机的主从同步是否监控以及延迟时间

```bash
#/etc/zabbix/zabbix_agentd.d/mysql_monitor.sh
#!/bin/bash
#Author:XiangZheng
MONITOR_USER=root
MONITOR_HOST=localhost

Seconds_Behind_Master(){
    NUM1=`mysql -u${MONITOR_USER} -h${MONITOR_HOST} -e "show slave status\G;" | grep Seconds_Behind_Master: | awk '{print $2}'`
    echo $NUM1
}

master_slave_check(){
    NUM2=`mysql -u${MONITOR_USER} -h${MONITOR_HOST} -e "show slave status\G;" 2>/dev/null | grep Slave_IO_Running: | awk '{print $2}'`

    NUM3=`mysql -u${MONITOR_USER} -h${MONITOR_HOST} -e "show slave status\G;" 2>/dev/null | grep Slave_SQL_Running: | awk '{print $2}'`

if [[ ${NUM2} = Yes ]] && [[ ${NUM3} = Yes ]];then
    echo 50
else
    echo 100
fi
}

main(){
    case $1 in
        Seconds_Behind_Master)
            Seconds_Behind_Master;
            ;;
        master_slave_check)
            master_slave_check;
            ;;
    esac
}

main $1
```

### 将监控脚本关联至子配置文件

```bash
#/etc/zabbix/zabbix_agentd.d/zabbix_monitor.conf
...
UserParameter=mysql_status[*],/etc/zabbix/zabbix_agentd.d/mysql_monitor.sh "$1"
...

#重启服务
systemctl restart zabbix-agent.service
```

### 测试监控脚本

```bash
[root@zabbix-server ~]# zabbix_get -s 10.0.0.28 -p 10050 -k mysql_status[Seconds_Behind_Master]
0
[root@zabbix-server ~]# zabbix_get -s 10.0.0.28 -p 10050 -k mysql_status[master_slave_check]
50
```

### 创建模板

- web界面 --> 配置 --> 模板 --> 创建模板
  - 模版名称 如：Templates MySQL status check
  - 群组 如：Templates

### 基于模板创建监控项

- web界面 --> 配置 --> 选择模板 --> 创建监控项
- **监控项：**
  - 名称：如：MySQL主从同步延迟时间
  - 类型：如：zabbix客户端(主动式)
  - 键值：如：mysql_status[Seconds_Behind_Master]
  - 信息类型：如：数字(无正负)
  - 单位：如：秒
  - 间隔时间：如：3m
  - 添加

### 基于监控项创建图形

- web界面 --> 配置 --> 选择模板 --> 创建图形
- **图形：**
  - 名称：如：MySQL主从同步延迟时间
  - 监控项：如：添加 MySQL主从同步延迟时间
  - 添加

### 基于监控项创建触发器

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

### 关联模板

- 配置 --> 主机 --> 选择主机
- **模板**：
  - Link new templates --> 选择模板 --> 如：Templates MySQL status check --> 更新



## 在web界面准备通知媒介

- **可选**，如果实现存在通知媒介则无需添加
- 参考上面的 添加通知媒介流程



## 在web界面添加动作

- 参考上面的 添加动作流程





## 基于 Percona 监控 MySQL

- 插件地址：https://www.percona.com/doc/percona-monitoring-plugins/LATEST/zabbix/index.html
- 下载地址：https://downloads.percona.com/downloads/percona-monitoring-plugins/percona-monitoring-plugins-1.1.8/binary/redhat/7/x86_64/percona-zabbix-templates-1.1.8-1.noarch.rpm







# ---

# 方法一

要通过Zabbix监控MySQL的主从同步状态，需要遵循以下步骤：

1. 在主服务器和从服务器上安装Zabbix代理。如果已经安装了代理，请跳过此步骤。
2. 在主服务器和从服务器上安装MySQL客户端库。可以使用以下命令来安装：

```
arduinoCopy code
sudo apt-get install libmysqlclient-dev
```

1. 在Zabbix服务器上创建一个新的模板来监控MySQL主从同步状态。可以按照以下步骤进行操作：

- 登录到Zabbix Web控制台
- 转到“配置”菜单，然后单击“模板”
- 单击“创建模板”按钮
- 在“模板名称”字段中输入模板名称，例如“MySQL主从同步状态”
- 在“模板组”字段中选择模板所属的组，例如“数据库”
- 单击“添加”按钮，然后单击“应用”
- 单击“添加”按钮，然后单击“数据元素”
- 在“名称”字段中输入数据元素名称，例如“MySQL主从同步状态”
- 在“类型”字段中选择“简单检查”
- 在“键”字段中输入以下内容：

```
mysql.ping
```

- 在“更新间隔”字段中输入监控间隔时间，例如30秒
- 单击“添加”按钮，然后单击“更新”

1. 配置MySQL主服务器和从服务器。

- 在主服务器和从服务器上创建一个MySQL用户，该用户具有REPLICATION SLAVE和REPLICATION CLIENT权限。可以使用以下命令创建用户：

```
CREATE USER 'zabbix'@'%' IDENTIFIED BY 'password';
GRANT REPLICATION SLAVE, REPLICATION CLIENT ON *.* TO 'zabbix'@'%';
```

- 在从服务器上启用二进制日志，并确保从服务器可以连接到主服务器。可以使用以下命令启用二进制日志：

```
log-bin=mysql-bin
```

1. 在Zabbix Web控制台中配置MySQL主从同步状态检查。

- 转到“配置”菜单，然后单击“主机”
- 单击要监控的主服务器的名称，然后单击“模板”
- 单击“添加模板”按钮，然后单击“选择模板”
- 选择“MySQL主从同步状态”模板，然后单击“添加”
- 重复此步骤来配置从服务器

完成这些步骤后，Zabbix将开始监视MySQL主从同步状态。您可以通过Zabbix Web控制台或Zabbix API查看监视数据。



# 方法二

- 通过 Shell 脚本

要通过自定义shell脚本监控MySQL的主从同步状态，需要遵循以下步骤：

1. 在主服务器和从服务器上安装MySQL客户端库。可以使用以下命令来安装：

```
sudo apt-get install mysql-client
```

1. 在主服务器和从服务器上创建一个MySQL用户，该用户具有REPLICATION SLAVE和REPLICATION CLIENT权限。可以使用以下命令创建用户：

```
CREATE USER 'zabbix'@'%' IDENTIFIED BY 'password';
GRANT REPLICATION SLAVE, REPLICATION CLIENT ON *.* TO 'zabbix'@'%';
```

1. 创建一个自定义shell脚本来监控MySQL主从同步状态。可以使用以下脚本作为示例：

```
#!/bin/bash

# MySQL连接参数
MYSQL_USER="zabbix"
MYSQL_PASSWORD="password"
MYSQL_HOST="localhost"
MYSQL_PORT="3306"

# 连接到MySQL服务器
mysql_connect="mysql -u${MYSQL_USER} -p${MYSQL_PASSWORD} -h${MYSQL_HOST} -P${MYSQL_PORT}"
slave_status=$(${mysql_connect} -e "show slave status\G")

# 检查主从同步状态
if [ "$?" -ne "0" ]; then
  echo "ERROR: Could not get slave status."
  exit 1
fi

seconds_behind_master=$(echo "${slave_status}" | grep "Seconds_Behind_Master" | awk '{print $2}')

if [ -z "${seconds_behind_master}" ]; then
  echo "0"
else
  echo "${seconds_behind_master}"
fi
```

1. 将该脚本复制到Zabbix代理的脚本目录中。可以使用以下命令将脚本复制到脚本目录中：

```
sudo cp mysql_replication.sh /usr/local/bin/
sudo chown zabbix:zabbix /usr/local/bin/mysql_replication.sh
sudo chmod +x /usr/local/bin/mysql_replication.sh
```

1. 在Zabbix Web控制台中创建一个新的自定义监控项来监控MySQL主从同步状态。可以按照以下步骤进行操作：

- 登录到Zabbix Web控制台
- 转到“配置”菜单，然后单击“主机”
- 单击要监控的主服务器或从服务器的名称，然后单击“自定义监控项”
- 单击“创建监控项”按钮
- 在“名称”字段中输入监控项名称，例如“MySQL主从同步状态”
- 在“类型”字段中选择“Zabbix代理（主动）”
- 在“键”字段中输入以下内容：

```
custom.mysql_replication.sh
```

- 在“更新间隔”字段中输入监控间隔时间，例如30秒
- 单击“添加”按钮，然后单击“更新”

1. 在Zabbix Web控制台中创建一个新的触发器来检测MySQL主从同步状态是否正常。可以按照以下步骤进行操作：

- 转到“配置”菜单，然后单击“触发器”
- 单击“创建触发器”按钮
- 在“名称”字段中输入触



# 方法二

- 通过Python脚本

要通过自定义脚本监控MySQL的主从同步状态，需要遵循以下步骤：

1. 在主服务器和从服务器上安装MySQL客户端库。可以使用以下命令来安装：

```
arduinoCopy code
sudo apt-get install libmysqlclient-dev
```

1. 在主服务器和从服务器上创建一个MySQL用户，该用户具有REPLICATION SLAVE和REPLICATION CLIENT权限。可以使用以下命令创建用户：

```
sqlCopy codeCREATE USER 'zabbix'@'%' IDENTIFIED BY 'password';
GRANT REPLICATION SLAVE, REPLICATION CLIENT ON *.* TO 'zabbix'@'%';
```

1. 创建一个自定义脚本来监控MySQL主从同步状态。可以使用以下Python脚本作为示例：

```
pythonCopy code#!/usr/bin/python

import sys
import MySQLdb

# MySQL连接参数
mysql_user = 'zabbix'
mysql_password = 'password'
mysql_host = 'localhost'
mysql_port = 3306

# 连接到MySQL服务器
try:
    conn = MySQLdb.connect(user=mysql_user, passwd=mysql_password, host=mysql_host, port=mysql_port)
    cursor = conn.cursor()
except:
    print "ERROR: Could not connect to MySQL server."
    sys.exit(1)

# 检查主从同步状态
try:
    cursor.execute("SHOW SLAVE STATUS")
    slave_status = cursor.fetchone()
    if slave_status is None:
        print "ERROR: Could not get slave status."
        sys.exit(1)
    else:
        seconds_behind_master = slave_status[32]
        if seconds_behind_master is None:
            print "0"
        else:
            print seconds_behind_master
except:
    print "ERROR: Could not execute query."
    sys.exit(1)

# 关闭MySQL连接
cursor.close()
conn.close()
```

1. 将该脚本复制到Zabbix代理的脚本目录中。可以使用以下命令将脚本复制到脚本目录中：

```
bashCopy codesudo cp mysql_replication.py /usr/local/bin/
sudo chown zabbix:zabbix /usr/local/bin/mysql_replication.py
sudo chmod +x /usr/local/bin/mysql_replication.py
```

1. 在Zabbix Web控制台中创建一个新的自定义监控项来监控MySQL主从同步状态。可以按照以下步骤进行操作：

- 登录到Zabbix Web控制台
- 转到“配置”菜单，然后单击“主机”
- 单击要监控的主服务器或从服务器的名称，然后单击“自定义监控项”
- 单击“创建监控项”按钮
- 在“名称”字段中输入监控项名称，例如“MySQL主从同步状态”
- 在“类型”字段中选择“Zabbix代理（主动）”
- 在“键”字段中输入以下内容：

```
vbnetCopy code
custom.mysql_replication
```

- 在“更新间隔”字段中输入监控间隔时间，例如30秒
- 单击“添加”按钮，然后单击“更新”

1. 在Zabbix Web控制台中创建一个新的触发器来检测MySQL主从同步状态是否正常。可以按照以下步骤进行操作：

- 转
