---
title: "RabbitMQ"
---



# 监控 RabbitMQ

参考文档：https://git.zabbix.com/projects/ZBX/repos/zabbix/browse/templates/app/rabbitmq_http

## 监控集群节点数量脚本

```bash
# cat rabbitmq_claster_status_monitor.sh
#!/bin/bash
#
#********************************************************************
#Author:	     	xiangzheng
#QQ: 			    767483070
#Date: 		     	2022-06-10
#FileName：		    rabbitmq_claster_status_monitor.sh
#URL: 		    	https://www.xiangzheng.vip
#Email: 		    rootroot25@163.com
#Description：		The test script
#Copyright (C): 	2022 All rights reserved
#********************************************************************
USER='azheng'
PASS='123456'
HOST='10.0.0.100'

#定义函数,判断集群中running节点的数量
status(){
curl -s -u ${USER}:${PASS} http://${HOST}:15672/api/nodes|grep -Eo "\"running\"\:true\,"|wc -l
}

#调用函数
status
```



