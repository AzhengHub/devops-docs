---
title: "Fluentd"
---

# fluentd 概述

- Fluentd是日志收集器，处理器和聚合器。（相比fluent-bit具有更强大的聚合功能）
- Fluentd 和 fluent-bit 可以根据两个组件不同特点可以考虑将Fluentd主要用作聚合器，将fluent-bit作为日志转发器，两个项目相互补充，从而提供了完整的可靠轻量级日志解决方案，当然fluent-bit也可以独立完成日志收集。



# fluent-bit 概述

https://fluentbit.io/

- fluent-bit类似filebeat，但fluent-bit的诞生之初就考虑到适配到云原生应用之上，因此更适合收集k8s中的日志数据等
- Fluent Bit 可以从本地文件和网络设备读取数据，并且可以从服务器中抓取普罗米修斯格式的指标。
- 所有事件都**自动标记**，以确定过滤、路由、解析、修改和输出规则。
- 过滤器可以通过调用**API（例如 Kubernetes）**来修改数据，删除无关字段或添加值。
- Fluent Bit可以将数据发送到**多个位置，**包括热门目的地，如Splunk, Elasticsearch,OpenSearch, Kafka等。



## fluent-bit 工作原理

- INPUT **-->** PARSER **-->** FILTER **-->** buffer **-->** routing **-->** OUTPUT **N**
- fluent-bit是一个简单日志收集工具，上面就是对它工作流程的全局概述，它通过输入、转换、过滤、缓冲、路由到输出而完成日志的收集







# fluent-bit 部署

## helm

- helm 是 fluent-bit 的推荐部署方式
- fluent-bit官方chart：https://github.com/fluent/helm-charts
- https://docs.fluentbit.io/manual/installation/kubernetes#installation
- https://artifacthub.io/packages/helm/fluent/fluent-bit

```sh
# 安装fluent官方chart仓库
# helm repo add fluent https://fluent.github.io/helm-charts
...

# 验证仓库
# helm repo list
NAME                	URL                                               
...              
fluent              	https://fluent.github.io/helm-charts              


# 更新仓库元数据
# helm repo update
...

# 查看fluent-bit相关chart
# helm search repo fluent-bit
NAME             	CHART VERSION	APP VERSION	DESCRIPTION                                       
fluent/fluent-bit	0.20.9       	1.9.9      	Fast and lightweight log processor and forwarde...


# 打印安装的readme，此信息从chart官方仓库也可以查看
# helm show readme fluent/fluent-bit --version 0.20.9


# 获取values文件，values文件还可以从chart官方仓库下载
# helm show values fluent/fluent-bit --version 0.20.9 > values-fluent-bit.yaml


# 按需修改values文件，具体如何修改参阅chart官方仓库，或readme的提示信息
# vim values-elasticsearch.yaml
...


# 指定chart版本安装，如未指定，则使用最新版本，最后指定按需修改后的values文件部署
# kubectl create ns logs
# helm install fluent-bit --version 0.20.9 fluent/fluent-bit -n logs -f values-fluent-bit.yaml



```





# fluent-bit conf

- https://docs.fluentbit.io/manual/administration/configuring-fluent-bit/classic-mode/configuration-file
- https://docs.fluentbit.io/manual/administration/configuring-fluent-bit/classic-mode/format-schema

## fluent-bit.conf

- /fluent-bit/etc/fluent-bit.conf

```ruby
[SERVICE]
    Daemon Off # Off前台运行，On后台运行，Default Off
    Flush 1 # 刷新时间，引擎循环使用刷新超时来定义何时需要刷新输入插件通过定义的输出插件接收的记录，Default 5
    Log_Level info # 日志记录级别，Default info
    Parsers_File parsers.conf # 语法解析器配置文件的路径，可以定义多个
    Parsers_File custom_parsers.conf
    HTTP_Server On # 是否启用内置HTTP服务器，Default Off
    HTTP_Listen 0.0.0.0
    HTTP_Port 2020
    Health_Check On


# 输入源，具体定义参数由输入插件决定
[INPUT]
    Name tail # 输入插件的名称，必选字段
    Tag kube.* # 与来自此插件的所有记录关联的标记名，除输入转发插件外，所有插件都必须使用标记（因为它提供动态标记）。
    Path /var/log/containers/*.log # 通过使用通用通配符指定特定日志文件或多个日志文件的模式。也允许使用逗号分隔的多个模式。
    multiline.parser docker, cri # 指定一个或多个要应用于内容的多行分析器定义。
    Mem_Buf_Limit 5MB
    Skip_Long_Lines On # 当文件中的某行数据的大小大于Buffer_Max_Size时(默认32k)，则不记录改行，Default Off

[INPUT]
    Name systemd
    Tag host.*
    Systemd_Filter _SYSTEMD_UNIT=kubelet.service # 指定systemd进程，_SYSTEMD_UNIT=为默认前缀，Systemd_Filter可以按需指定多个
    Read_From_Tail On # 是否从日志文件末尾开始读取，On是，Off否，Default Off


# 过滤，具体定义参数由过滤器插件决定
[FILTER]
    Name kubernetes # 过滤器插件的名称，必选字段
    Kube_URL https://kubernetes.default.svc.k8s.xiangzheng.com:443
    Kube_CA_File /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
    Kube_Token_File /var/run/secrets/kubernetes.io/serviceaccount/token
    # 所有过滤插件都必须使用Match或Match_Regex。如果两者都指定，则Match_Regex优先。
    Match kube.* # 与传入记录的标记匹配的模式。它区分大小写，并支持星号（*）字符作为通配符。
    #Match_Regex ？？？ # 与传入记录的标记匹配的正则表达式。如果要使用完整的正则表达式语法，请使用此选项。
    Merge_Log On # 启用时，它会检查日志字段内容是否是JSON字符串映射，如果是，它会将映射字段附加为日志结构的一部分，Default Off
    Keep_Log Off # 禁用Keep_Log时，一旦成功合并传入消息，日志字段就会从中删除必须配合Merge_Log On使用，Default On
    K8S-Logging.Parser On # 允许Kubernetes Pods建议一个预定义的解析器（请在KubernetesAnnotations部分阅读更多信息），Default Off
    K8S-Logging.Exclude On # 允许Kubernetes Pods将其日志从日志处理器中排除（请在KubernetesAnnotations部分了解更多信息），Default Off
    Merge_Parser testparser # 指定解析器名称，以指定如何解析日志键中包含的数据

# 输出目标，具体定义参数由输出插件决定
[OUTPUT]
    Name es # 输出插件名称
    Match kube.* # 与传入记录的标记匹配的模式。它区分大小写，并支持星号（*）字符作为通配符。
    #Match_Regex ？？？ # 与传入记录的标记匹配的正则表达式。如果要使用完整的正则表达式语法，请使用此选项。
    Host elasticsearch-master # 目标Elasticsearch实例的IP地址或主机名
    Logstash_Format On # 是否启用Logstash格式兼容性，Default Off
    Logstash_Prefix k8s-cluster # 日志索引前缀
    Retry_Limit False # False表示一直重试，也可以指定重试次数

[OUTPUT]
    Name es
    Match host.*
    Host elasticsearch-master
    Logstash_Format On
    Logstash_Prefix k8s-node
    Logstash_Prefix node
    Retry_Limit False
```



## custom_parsers.conf

- /fluent-bit/etc/custom_parsers.conf

```ruby
# 语法解析器配置
[PARSER]
    Name docker_no_time
    Format json
    Time_Keep Off
    Time_Key time
    Time_Format %Y-%m-%dT%H:%M:%S.%L
```







# fluent-bit plugins

## INPUT

- https://docs.fluentbit.io/manual/pipeline/inputs

### tail

- tail 插件可以类似于 `tail -f`命令一样跟踪日志发生的变化

- https://docs.fluentbit.io/manual/pipeline/inputs/tail

```ruby
[INPUT]
    Name tail
    Tag kube.* # 与来自此插件的所有记录关联的标记名，除输入转发插件外，所有插件都必须使用标记（因为它提供动态标记）。
    Path /var/log/containers/*.log # 通过使用通用通配符指定特定日志文件或多个日志文件的模式。也允许使用逗号分隔的多个模式。
    multiline.parser docker, cri # 指定一个或多个要应用于内容的多行分析器定义。
    Mem_Buf_Limit 5MB
    Skip_Long_Lines On # 当文件中的某行数据的大小大于Buffer_Max_Size时(默认32k)，则不记录改行，Default Off
```

### systemd

- systemd 可以在Linux环境中监视systemd守护进程收集的日志信息，例如：执行`systemctl status kubelet.service`命令时输出的日志

- https://docs.fluentbit.io/manual/pipeline/inputs/systemd

```ruby
[INPUT]
    Name systemd
    Tag host.*
    Systemd_Filter _SYSTEMD_UNIT=kubelet.service # 指定systemd进程，_SYSTEMD_UNIT=为默认前缀，Systemd_Filter可以按需指定多个
    Read_From_Tail On # 是否从日志文件末尾开始读取，On是，Off否，Default Off
```



## PARSER

- 语法解析器配置

- https://docs.fluentbit.io/manual/pipeline/parsers
- [Rubular: a Ruby regular expression editor](https://rubular.com/)

```ruby
[PARSER]
    Name docker_no_time # 自定义的语法解析器名称
    Format json # 指定解析器的格式，可用的选项有：json、regex、ltsv或logfmt。
    Time_Keep Off # 默认情况下，当识别并解析时间键时，解析器将删除原始时间字段。启用此选项将使解析器在日志条目中保留原始时间字段及其值。
    Time_Key time # 如果日志条目提供了带有时间戳的字段，则此选项指定该字段的名称。
    Time_Format %Y-%m-%dT%H:%M:%S.%L # 指定时间字段的格式，以便正确识别和分析时间字段。Fluent bit使用strptime（3）来解析时间，因此您可以参考strptim文档了解可用的修饰符。
```

### example

- https://github.com/fluent/fluent-bit/blob/master/conf/parsers.conf

```ruby
[PARSER]
    Name   apache
    Format regex
    Regex  ^(?<host>[^ ]*) [^ ]* (?<user>[^ ]*) \[(?<time>[^\]]*)\] "(?<method>\S+)(?: +(?<path>[^\"]*?)(?: +\S*)?)?" (?<code>[^ ]*) (?<size>[^ ]*)(?: "(?<referer>[^\"]*)" "(?<agent>[^\"]*)")?$
    Time_Key time
    Time_Format %d/%b/%Y:%H:%M:%S %z

[PARSER]
    Name   apache2
    Format regex
    Regex  ^(?<host>[^ ]*) [^ ]* (?<user>[^ ]*) \[(?<time>[^\]]*)\] "(?<method>\S+)(?: +(?<path>[^ ]*) +\S*)?" (?<code>[^ ]*) (?<size>[^ ]*)(?: "(?<referer>[^\"]*)" "(?<agent>.*)")?$
    Time_Key time
    Time_Format %d/%b/%Y:%H:%M:%S %z

[PARSER]
    Name   apache_error
    Format regex
    Regex  ^\[[^ ]* (?<time>[^\]]*)\] \[(?<level>[^\]]*)\](?: \[pid (?<pid>[^\]]*)\])?( \[client (?<client>[^\]]*)\])? (?<message>.*)$

[PARSER]
    Name   nginx
    Format regex
    Regex ^(?<remote>[^ ]*) (?<host>[^ ]*) (?<user>[^ ]*) \[(?<time>[^\]]*)\] "(?<method>\S+)(?: +(?<path>[^\"]*?)(?: +\S*)?)?" (?<code>[^ ]*) (?<size>[^ ]*)(?: "(?<referer>[^\"]*)" "(?<agent>[^\"]*)")
    Time_Key time
    Time_Format %d/%b/%Y:%H:%M:%S %z

[PARSER]
    # https://rubular.com/r/IhIbCAIs7ImOkc
    Name        k8s-nginx-ingress
    Format      regex
    Regex       ^(?<host>[^ ]*) - (?<user>[^ ]*) \[(?<time>[^\]]*)\] "(?<method>\S+)(?: +(?<path>[^\"]*?)(?: +\S*)?)?" (?<code>[^ ]*) (?<size>[^ ]*) "(?<referer>[^\"]*)" "(?<agent>[^\"]*)" (?<request_length>[^ ]*) (?<request_time>[^ ]*) \[(?<proxy_upstream_name>[^ ]*)\] (\[(?<proxy_alternative_upstream_name>[^ ]*)\] )?(?<upstream_addr>[^ ]*) (?<upstream_response_length>[^ ]*) (?<upstream_response_time>[^ ]*) (?<upstream_status>[^ ]*) (?<reg_id>[^ ]*).*$
    Time_Key    time
    Time_Format %d/%b/%Y:%H:%M:%S %z

[PARSER]
    Name   json
    Format json
    Time_Key time
    Time_Format %d/%b/%Y:%H:%M:%S %z

[PARSER]
    Name         docker
    Format       json
    Time_Key     time
    Time_Format  %Y-%m-%dT%H:%M:%S.%L
    Time_Keep    On
    # --
    # Since Fluent Bit v1.2, if you are parsing Docker logs and using
    # the Kubernetes filter, it's not longer required to decode the
    # 'log' key.
    #
    # Command      |  Decoder | Field | Optional Action
    # =============|==================|=================
    #Decode_Field_As    json     log

[PARSER]
    Name        docker-daemon
    Format      regex
    Regex       time="(?<time>[^ ]*)" level=(?<level>[^ ]*) msg="(?<msg>[^ ].*)"
    Time_Key    time
    Time_Format %Y-%m-%dT%H:%M:%S.%L
    Time_Keep   On

[PARSER]
    Name        syslog-rfc5424
    Format      regex
    Regex       ^\<(?<pri>[0-9]{1,5})\>1 (?<time>[^ ]+) (?<host>[^ ]+) (?<ident>[^ ]+) (?<pid>[-0-9]+) (?<msgid>[^ ]+) (?<extradata>(\[(.*?)\]|-)) (?<message>.+)$
    Time_Key    time
    Time_Format %Y-%m-%dT%H:%M:%S.%L%z
    Time_Keep   On

[PARSER]
    Name        syslog-rfc3164-local
    Format      regex
    Regex       ^\<(?<pri>[0-9]+)\>(?<time>[^ ]* {1,2}[^ ]* [^ ]*) (?<ident>[a-zA-Z0-9_\/\.\-]*)(?:\[(?<pid>[0-9]+)\])?(?:[^\:]*\:)? *(?<message>.*)$
    Time_Key    time
    Time_Format %b %d %H:%M:%S
    Time_Keep   On

[PARSER]
    Name        syslog-rfc3164
    Format      regex
    Regex       /^\<(?<pri>[0-9]+)\>(?<time>[^ ]* {1,2}[^ ]* [^ ]*) (?<host>[^ ]*) (?<ident>[a-zA-Z0-9_\/\.\-]*)(?:\[(?<pid>[0-9]+)\])?(?:[^\:]*\:)? *(?<message>.*)$/
    Time_Key    time
    Time_Format %b %d %H:%M:%S
    Time_Keep   On

[PARSER]
    Name    mongodb
    Format  regex
    Regex   ^(?<time>[^ ]*)\s+(?<severity>\w)\s+(?<component>[^ ]+)\s+\[(?<context>[^\]]+)]\s+(?<message>.*?) *(?<ms>(\d+))?(:?ms)?$
    Time_Format %Y-%m-%dT%H:%M:%S.%L
    Time_Keep   On
    Time_Key time

[PARSER]
    # https://rubular.com/r/0VZmcYcLWMGAp1
    Name    envoy
    Format  regex
    Regex ^\[(?<start_time>[^\]]*)\] "(?<method>\S+)(?: +(?<path>[^\"]*?)(?: +\S*)?)? (?<protocol>\S+)" (?<code>[^ ]*) (?<response_flags>[^ ]*) (?<bytes_received>[^ ]*) (?<bytes_sent>[^ ]*) (?<duration>[^ ]*) (?<x_envoy_upstream_service_time>[^ ]*) "(?<x_forwarded_for>[^ ]*)" "(?<user_agent>[^\"]*)" "(?<request_id>[^\"]*)" "(?<authority>[^ ]*)" "(?<upstream_host>[^ ]*)"
    Time_Format %Y-%m-%dT%H:%M:%S.%L%z
    Time_Keep   On
    Time_Key start_time

[PARSER]
    # https://rubular.com/r/17KGEdDClwiuDG
    Name    istio-envoy-proxy
    Format  regex
    Regex ^\[(?<start_time>[^\]]*)\] "(?<method>\S+)(?: +(?<path>[^\"]*?)(?: +\S*)?)? (?<protocol>\S+)" (?<response_code>[^ ]*) (?<response_flags>[^ ]*) (?<response_code_details>[^ ]*) (?<connection_termination_details>[^ ]*) (?<upstream_transport_failure_reason>[^ ]*) (?<bytes_received>[^ ]*) (?<bytes_sent>[^ ]*) (?<duration>[^ ]*) (?<x_envoy_upstream_service_time>[^ ]*) "(?<x_forwarded_for>[^ ]*)" "(?<user_agent>[^\"]*)" "(?<x_request_id>[^\"]*)" (?<authority>[^ ]*)" "(?<upstream_host>[^ ]*)" (?<upstream_cluster>[^ ]*) (?<upstream_local_address>[^ ]*) (?<downstream_local_address>[^ ]*) (?<downstream_remote_address>[^ ]*) (?<requested_server_name>[^ ]*) (?<route_name>[^  ]*)
    Time_Format %Y-%m-%dT%H:%M:%S.%L%z
    Time_Keep   On
    Time_Key start_time

[PARSER]
    # http://rubular.com/r/tjUt3Awgg4
    Name cri
    Format regex
    Regex ^(?<time>[^ ]+) (?<stream>stdout|stderr) (?<logtag>[^ ]*) (?<message>.*)$
    Time_Key    time
    Time_Format %Y-%m-%dT%H:%M:%S.%L%z
    Time_Keep   On

[PARSER]
    Name    kube-custom
```





## FILTER

- https://docs.fluentbit.io/manual/pipeline/filters

### kubernetes

- https://docs.fluentbit.io/manual/pipeline/filters/kubernetes

```ruby
[FILTER]
    Name kubernetes
    Match kube.* # 与传入记录的标记匹配的模式。它区分大小写，并支持星号（*）字符作为通配符。
    Merge_Log On # 启用时，它会检查日志字段内容是否是JSON字符串映射，如果是，它会将映射字段附加为日志结构的一部分，Default Off
    Kube_URL https://kubernetes.default.svc.k8s.xiangzheng.com:443
    Kube_CA_File /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
    Kube_Token_File /var/run/secrets/kubernetes.io/serviceaccount/token
    Keep_Log Off # 禁用Keep_Log时，一旦成功合并传入消息，日志字段就会从中删除必须配合Merge_Log On使用，Default On
    K8S-Logging.Parser On # 允许Kubernetes Pods建议一个预定义的解析器（请在KubernetesAnnotations部分阅读更多信息），Default Off
    K8S-Logging.Exclude On # 允许Kubernetes Pods将其日志从日志处理器中排除（请在KubernetesAnnotations部分了解更多信息），Default Off
    Merge_Parser testparser # 指定解析器名称，以指定如何解析日志键中包含的数据
```





## OUTPUT

- https://docs.fluentbit.io/manual/pipeline/outputs
- Retry_Limit：https://docs.fluentbit.io/manual/administration/scheduling-and-retries

### es

- 输出到Elasticsearch
- https://docs.fluentbit.io/manual/pipeline/outputs/elasticsearch

```ruby
[OUTPUT]
    Name es # 输出插件名称
    Match kube.* # 与传入记录的标记匹配的模式。它区分大小写，并支持星号（*）字符作为通配符。
    #Match_Regex ？？？ # 与传入记录的标记匹配的正则表达式。如果要使用完整的正则表达式语法，请使用此选项。
    Host elasticsearch-master # 目标Elasticsearch实例的IP地址或主机名
    Logstash_Format On # 是否启用Logstash格式兼容性，Default Off
    Logstash_Prefix k8s-node # 日志索引前缀
    Retry_Limit False # False表示一直重试，也可以指定重试次数
```

