---
title: "Elasticsearch"
---



# 监控 Elasticsearch集群

## Elasticsearch集群状态检测脚本

```bash
#!/bin/bash
#Elasticsearch_version:
#Author:Azheng

check_es_status(){
  STATUS=`curl -sXGET http://10.0.0.100:9200/_cluster/health?pretty=true | sed -n 3p | sed -nr 's/.*: "(.*)".*,/\1/p'`
  
  if test ${STATUS} = green ;then
    echo 50
  else
    echo 100
  fi
}

check_es_status
```









