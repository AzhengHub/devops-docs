---
title: "FileBeat"
---


# filebeat 概述

- filebeat 基于 golang语言开发 所以无需配置Java环境以及JDK等，性能非常出色，并且占用空间也非常小
- 但是相对logstash过滤的条件较少，只适合一些对数据收集格式要求不高的场景
- 可以通过将filebeat收集的数据转交给logstash来进行处理，以达到需要的格式等需求
- 还可以将输出转发给redis、kafka等应用进行下一步处理



# filebeat 安装

国内镜像下载地址：

- https://mirrors.tuna.tsinghua.edu.cn/elasticstack/yum/elastic-7.x/7.16.3/filebeat-7.16.3-x86_64.rpm
- https://mirrors.tuna.tsinghua.edu.cn/elasticstack/7.x/apt/pool/main/f/filebeat/filebeat-7.16.3-amd64.deb

```bash
# centos
rpm -iv filebeat-7.16.3-x86_64.rpm

# Ubuntu
dpkg -i filebeat-7.16.3-amd64.deb
```



# filebeat 核心配置说明

- 官方文档：https://www.elastic.co/guide/en/beats/filebeat/index.html
- filebeat的配置文件为YAML格式，此格式对缩进非常严格，配置的时候要格外注意

## inputs 配置

- 定义输入的文件

- 官方文档：https://www.elastic.co/guide/en/beats/filebeat/7.16/configuration-filebeat-options.html

```yaml
# /etc/filebeat/filebeat.yml

# ============================== Filebeat inputs ===============================
filebeat.inputs:
- type: log #输入的类型，只能使用官方指定的类型，不能自定义，如：log、redis、tcp等，详情参阅官方文档的 input types
  enabled: true #是否启用，false不启用，true启用
  paths:
    - /var/log/messages #指定输入的文件
    #- /var/log/boot.log #可以指定多个文件
    #- /var/log/*.log #匹配/var/log/下的所有以.log结尾的文件
  #exclude_lines: ['^DBG'] #排除输入文件中的以 DBG开头的行
  #include_lines: ['^ERR', '^WARN'] #不排除输入文件中的以 ERR WARN开头的行
  #prospector.scanner.exclude_files: ['.gz$'] #排除以.gz结尾的文件
  fields: #定义用于后续过滤的字段
    type: system_log #添加过滤信息，此处type可以按需指定，如：app_id: query_engine_12
```







## Outputs 配置

- 定义输出到哪里

- 官方文档：https://www.elastic.co/guide/en/beats/filebeat/7.16/configuring-output.html

### output.elasticsearch

- 输出到 Elasticsearch

```yaml
# /etc/filebeat/filebeat.yml

output.elasticsearch:
  hosts: ["10.0.0.123:9200"] #es地址和端口，通常都是直接指向负载均衡
  #protocol: "https" #指定协议类型，不指定则默认为http
```



### output.logstash

- 输出到 Logstash

```yaml
# /etc/filebeat/filebeat.yml

#output.logstash:
  # The Logstash hosts
  #hosts: ["localhost:5044"]

  # Optional SSL. By default is off.
  # List of root certificates for HTTPS server verifications
  #ssl.certificate_authorities: ["/etc/pki/root/ca.pem"]

  # Certificate for SSL client authentication
  #ssl.certificate: "/etc/pki/client/cert.pem"

  # Client Certificate Key
  #ssl.key: "/etc/pki/client/cert.key"

```

### output.file

- 输出到文件，通常用于测试

- 官方文档：https://www.elastic.co/guide/en/beats/filebeat/7.16/file-output.html

```yaml
# /etc/filebeat/filebeat.yml

output.file:
  path: "/tmp/" #输出的文件路径
  filename: filebeat #输出的文件名
  #rotate_every_kb: 10000 #每个文件的最大大小，达到此限制，文件则会从头写入
  #number_of_files: 7 #保存的最大文件数，达到此限制将删除最初的旧文件
  #permissions: 0600 #文件的权限
```

### output.redis

- 输出到 redis

```yaml
output.redis:
  hosts: ["localhost"]
  password: "my_password"
  key: "filebeat"
  db: 0
  timeout: 5
```

