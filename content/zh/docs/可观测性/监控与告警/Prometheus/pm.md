---
title: "pm"
---


# Prometheus

![image-20231025105603369](/home/gu/桌面/博客园/image-20231025105603369.png)

# 1、组件

```sh
# Prometheus server
用于抓取和存储时间序列数据 // 时间序列数据 
# client libraries
一些客户端库，比如python，可以自定义metric来进行指标收集并暴漏给prom
# push gateway
将指标主动推送到promserver（默认情况下 通过http进行pull操作）
# alertmanager 
处理告警信息
# special-purpose
处理一些特殊服务的export 比如haproxy等
# 各种其他支持的工具包等 
# grafana
将prom数据进行可视化展示的客户端
```

# 2、基础概念

```sh
# Alert
警报： 配置的告警规则的结果，将其主动发送到发送到altermanager 参考架构
# Alertmanager
警报管理器： 结构警报并将其聚合，分组，并通过系列配置的静音设置（不提示），消除重复（重复告警）操作等后，将其发送到钉钉，微信，邮件等
# Client library
第三方客户端库，用于自定义监控规则，并将其暴露给prom
# Bridge
一个组件，可以采集第三方客户端库的指标并将其暴露
# collect
收集器： 表示一组指标（也可能是单一指标）
# Direct instrumentation 
使用客户端库作为程序源代码的一部分内联添加的插入
# Endpoint
可被抓取的指标的来源
# export
一个二进制文件，用来将非prom格式的指标转换为prom格式并将其暴露
# instance
job的标签对应的后端服务
# job
具有相同检测目标的集合，比如都暴露9099端口指标，那么所有9099端口的集合称之为job
# Notification
代表一组（一个活多个警报），将被发送到email等
# Promdash
可视化界面，比如grafana
# PromQL 
prom数据库查询语言
# Pushgateway
主动推送job的指标
# Recording rules
预先计算经常需要的或计算成本高昂的Promql表达式，并将其结果保存为一组新的时间序列。
# Remote Read|Write
prom一项功能，可以长期从其他系统读写时间序列数据
# Remote Read Adapter
远程读取适配器，将要进行远程读写的数据用适配器转换为需要的格式，和export类似
# Remote Read Endpoint
远程读写通信端口
# Sample
样本，示例：样本是时间序列中某个时间点的单个值
# Silence
静音，将警报管理器中告警规则进行tag，可防止其对此规则告警
# Target
目标，后端：要抓取的对象的定义，比如链接，标签等
# Time Series
时间序列：具有时间戳的值
```

## 2.1 数据模型

### 2.1.1 指标名称与标签

```
# 命名
一般见名知义，比如http_requests_total 表示http请求总数，中间以_分割
# 标签
用来标识一个度量的实例化，任何更改标签操作将会创建一个新的指标
```

### 2.1.2 指标类型

```sh
# Counter
代表一种累计增长的指标，只能被重置为0或者增加，例如用来监视服务请求数，错误数等
# Gauge
代表一种上下浮动的指标，比如内存使用情况
# Histogram
基于一定持续时间的采样
# Summary
和上面的采集方式类似但可以基于窗口滑动
```

### 2.1.3 job和instance

```sh
类似于类和实例的关系
instance 通常代表节点上一个运行的进程 ip:port 可以进行上报指标
job代表具有相同配置的instance的集合
比如 job: api-server
instance 1: 1.2.3.4:5670
instance 2: 1.2.3.4:5671
instance 3: 5.6.7.8:5670
instance 4: 5.6.7.8:5671
指标在被采集后会被自动添加这两个标签
```

# 3、安装

## 3.1 helm

```
# 推荐helm安装
下载helm包
https://github.com/prometheus-community/helm-charts
# 更改配置并将其上传到自己的helm仓库
```

# 4、配置

## 4.1 全局配置

```sh
全局配置指定在所有其他配置中有效的参数 上下文。它们还用作其他配置部分的默认值。
cat /etc/config
global:
  # 指标抓取间隔
  [ scrape_interval: <duration> | default = 1m ]

  # 抓取超时时间
  [ scrape_timeout: <duration> | default = 10s ]

  # 规则刷新时间
  [ evaluation_interval: <duration> | default = 1m ]

  # 要添加的标签
  external_labels:
[ <labelname>: <labelvalue> ... ]

  # promql查询记录日志
  [ query_log_file: <string> ]

  # 每次抓取指标的数量限制，超过则失败，默认不设置
  [ sample_limit: <int> | default = 0 ]

  # 抓取指标标签数量限制
  [ label_limit: <int> | default = 0 ]

  # 抓取指标标签长度限制
  [ label_name_length_limit: <int> | default = 0 ]

# 规则文件路径列表
rule_files:
  [ - <filepath_glob> ... ]

# 抓取配置路径列表 
scrape_config_files:
  [ - <filepath_glob> ... ]

# 抓取配置规则列表
scrape_configs:
  [ - <scrape_config> ... ]

# 告警配置
alerting:
  # 告警配置
  alert_relabel_configs:
[ - <relabel_config> ... ]
  # 告警处理配置
  alertmanagers:
[ - <alertmanager_config> ... ]

# 远程读写配置
remote_write:
  [ - <remote_write> ... ]
remote_read:
  [ - <remote_read> ... ]

# 数据库卷配置
storage:
  [ tsdb: <tsdb> ]
  [ exemplars: <exemplars> ]

# 链路追踪配置
tracing:
  [ <tracing_config> ]
```

### 4.1.2 scrape_config

```
如何对job进行抓取，默认一个抓取配置仅针对一个job
```

```yml
# job名称
job_name: <job_name>

# 抓取指标频率，默认使用全局配置
[ scrape_interval: <duration> | default = <global_config.scrape_interval> ]

# 抓取指标超时时间，默认全局配置
[ scrape_timeout: <duration> | default = <global_config.scrape_timeout> ]

# 是否开启抓取直方图模式，若不使用参数--enable-feature=native-histograms开启此功能，此配置不生效 
[ scrape_classic_histograms: <boolean> | default = false ]

# 目标http路径 
[ metrics_path: <path> | default = /metrics ]


# 设置通信协议，默认http
[ scheme: <scheme> | default = http ]


# 账号密码配置
basic_auth:
  [ username: <string> ]
  [ password: <secret> ]
  [ password_file: <string> ]

# 账号认证配置
authorization:
  # 账号认证类型
  [ type: <string> | default: Bearer ]
  # 指定认证类型
  [ credentials: <secret> ]
  # 指定认证文件名称比如k8s-cm
  [ credentials_file: <filename> ]


# 是否遵循重定向
[ follow_redirects: <boolean> | default = true ]

# 是否使用http2
[ enable_http2: <boolean> | default: true ]

# tls设置
tls_config:
  # https://prometheus.io/docs/prometheus/latest/configuration/configuration/#tls_config
  [ <tls_config> ]

# k8s服务发现配置
kubernetes_sd_configs:
  # https://prometheus.io/docs/prometheus/latest/configuration/configuration/#kubernetes_sd_config
  [ - <kubernetes_sd_config> ... ]

# 静态设置
static_configs:
	# 后端列表
    targets:
      [ - '<host>' ]
    # 给抓取的指标打标签
    labels:
      [ <labelname>: <labelvalue> ... ]
# file_sd

# 替换标签设置
relabel_configs:
  # https://prometheus.io/docs/prometheus/latest/configuration/configuration/#relabel_config
  [ - <relabel_config> ... ]
```

#### 4.1.2.1 kubernetes_sd_config

```sh
从K8S rest api进行同步数据，可以针对下列资源进行同步
参考：https://hulining.gitbook.io/prometheus/prometheus/configuration/configuration#kubernetes_sd_config
# node
# service
# pod
# endpoints
# endpointslice
# ingress 
```

```yaml
# 指定api服务器地址，若不指定且运行在k8s集群内那么将使用pod的ca证书和api服务器进行通信
[ api_server: <host> ]

# 指定可以进行数据同步的资源 参考上方可配置的资源
role: <string>

# 指定kubeconfig，注意此选项和apiserver互斥，可选配置
[ kubeconfig_file: <filename> ]

# 可选配置用于向apiserver进行通信
authorization:
  # 设置类型
  [ type: <string> | default: Bearer ]
  # 配置为secret
  [ credentials: <secret> ]
  # secret名称
  [ credentials_file: <filename> ]

# 重定向配置
[ follow_redirects: <boolean> | default = true ]

# http2开启配置
[ enable_http2: <boolean> | default: true ]

# tls设置
tls_config:
  [ <tls_config> ]

# 是否指定ns，默认使用所有ns
namespaces:
  own_namespace: <boolean>
  names:
    [ - <string> ]
# 使用选择算法进行对特定资源的监视
[ selectors:
  [ - role: <string>
    [ label: <string> ]
    [ field: <string> ] ]]

# 可选配置是否将元数据附加到发现目标
attach_metadata:
  [ node: <boolean> | default = false ]
```



#### 4.1.2.2 relabel_config

```
在指标被抓取之前动态的覆盖其标签，每个抓取配置都可以使用多个此配置，按出现顺序应用于每个目标的标签集合
完成此配置后将删除__为开头的标签
临时使用加上__tmp
# 采集之前
job：采集设置job_name的名称
__address__： 目标的host：port
__scheme__： 采集协议
__metrics_path__：指标路径
# 重新标记阶段
进行配置将标签进行替换重载
# 标记完成后
将以__开头的标签删除
```

```sh
# 抓取后将其和给定标签进行匹配
[ source_labels: '[' <labelname> [, ...] ']' ]

# 指定抓取后的指标的分隔符
[ separator: <string> | default = ; ]

# 匹配成功后，替换操作中要进行替换的lable名称
[ target_label: <labelname> ]

# 指定获取标签的正则表达式使用分组 --> 抓取标签的匹配规则
[ regex: <regex> | default = (.*) ]

# 获取源标签hash模式
[ modulus: <int> ]

# 屁配成功后要替换的lable的值，相当于正则分组的后向引用
[ replacement: <string> | default = $1 ]

# 基于正则匹配后的动作
[ action: <relabel_action> | default = replace ]
	# 常用
	replace：将正则与sourcelable匹配，将target_label替换为replacement中指定的值
	keep：匹配给定条件则留下target
	drop：匹配留下的条件则删除target
	labelkeep：针对label
	labeldrop：针对label
	labmap： 类似于replace但可以创建新标签
	avg_over_time(node_load15{instance="$node",job="$job"}[$__rate_interval]) * 100 / on(instance) group_left sum by (instance)(irate(node_cpu_seconds_total{instance="$node",job="$job"}[$__rate_interval]))
```

```yaml
例子：
# repalce
	# 单个source_label
    scrape_configs:
    - job_name: cadvisor
      scrape_interval: 5s
      static_configs:
      - targets: ['cadvisor:8080']
        labels:
          k1: v1
          k2: v2
          k3: v3
          key13: value11
          key23: value22
          key33: value33
      relabel_configs:
      # regex匹配的是value的值，而不是key
      - regex: (value)(.*)
        source_labels: [key13]
        target_label: replace
    # 多个source_label
    scrape_configs:
    - job_name: cadvisor
      scrape_interval: 5s
      static_configs:
      - targets: ['cadvisor:8080']
        labels:
          k1: v1
          k2: v2
          k3: v3
          key13: value11
          key23: value22
          key33: value33
      relabel_configs:
      # 将source_label的value值匹配结果作为一个整体，默认中间的分隔符是；
      - regex: (value)(.*);(v)(.*);(value)(.*)
        source_labels: [key13,k2,key33]
        target_label: replaces
        replacement: $1-$2-$4-$6
        # 结果
        "replaces": "value-11-2-33"
      # 若匹配不加分隔符，将按顺序进行匹配并将其结果以分隔符；分割作为target_label结果
      - regex: (v)(.*)
        source_labels: [key13,k2,key33]
        target_label: replaces
        replacement: $1-$2
        # 结果
        replaces": "v-alue11;v2;value33"
# keep|drop # 匹配给定条件后删除或暴露target
	relabel_configs:
	  # 多个label需完全匹配
      - source_labels: [k1]
        action: keep|drop 
        regex: 'v([0-9]{1})'  # 正则分组
# labelkeep|labeldrop 
	# 将匹配到的标签删除或将除了匹配到的标签删除
	relabel_configs:
      - source_labels: [k1]
        action: labelkeep|labeldrop 
        regex: 'v([0-9]{1})'  # 正则分组
# lablemap # 将正则匹配到的所有label的值替换为$1为key的值，相当于将所有key进行一次更换
    - job_name: cadvisor
      scrape_interval: 5s
      static_configs:
      - targets: ['cadvisor:8080']
        labels:
          k1: v1
          k2: v2
          k3: v3
          key13: value11
          key23: value22
          key33: value33
      relabel_configs:
      # 结果为将key开头的label去掉key
      - action: labelmap
        regex: key([0-9]{1,3})
```

#### 4.1.2.3 file_sd_config

```yaml
基于文件的服务发现,通过静态配置来实现可插拔配置
file_sd_config:
  files:
    - <file_path_1>
    - <file_path_2>
    # 可以列出多个文件路径
---
# 文件内容
targets:
  - <target_1>
  - <target_2>
  # 可以列出多个目标
labels:
  <label_name_1>: <label_value_1>
  <label_name_2>: <label_value_2>
  # 可以定义标签，用于对目标进行标识
```

### 4.1.3 alertmanager_config

```
配置如何向altermanerger发送告警，已经通信方式
支持静态配置以及使用发现机制进行动态配置
```

```
# 告警推送超时时间
[ timeout: <duration> | default = 10s ]

# api版本
[ api_version: <string> | default = v2 ]

# http路径前缀
[ path_prefix: <path> | default = / ]

# 通信协议
[ scheme: <scheme> | default = http ]

# 通信认证
basic_auth:
  [ username: <string> ]
  [ password: <secret> ]
  [ password_file: <string> ]

authorization:
  # Sets the authentication type.
  [ type: <string> | default: Bearer ]
  # Sets the credentials. It is mutually exclusive with
  # `credentials_file`.
  [ credentials: <secret> ]
  # Sets the credentials to the credentials read from the configured file.
  # It is mutually exclusive with `credentials`.
  [ credentials_file: <filename> ]

# tls设置
tls_config:
  [ <tls_config> ]

# 动态服务发现设置
kubernetes_sd_configs:
  [ - <kubernetes_sd_config> ... ]

# 静态服务发现设置
static_configs:
  [ - <static_config> ... ]

# 标签重载
relabel_configs:
  [ - <relabel_config> ... ]
```

## 4.2 规则使用

### 4.2.1 录制规则

```yaml
# 格式
groups:
  [ - <rule_group> ]
# 例子
groups:
  # 名称，在文件中唯一
  - name: <string>
    # 采集频率，默认使用全局配置
    [ interval: <duration> | default = global.evaluation_interval ]
    # 规则定义
    rules:
      # 新的自定义指标名称，符合时间序列命名规则
      # 采集规则
      - record: <string>
		# 自定义表达式 
		expr: <string>
		# 对查询结果进行标签添加
		labels:
  			[ <labelname>: <labelvalue> ]

```

### 4.2.2 警告规则

```yaml
# 格式
groups:
  [ - <rule_group> ]
# 例子
groups:
  # 名称，在文件中唯一
  - name: <string>
    # 采集频率，默认使用全局配置
    [ interval: <duration> | default = global.evaluation_interval ]
    # 规则定义
    rules:
      # 警报规则
      # 名称，名称需唯一
      - alert: <string>
        # 表达式
        expr: <string>
        # 对警告添加标签
        labels:
  			[ <labelname>: <tmpl_string> ]
  		# 对警告添加描述
		annotations:
 		    [ <labelname>: <tmpl_string> ]
```

# 5、Promql

```sh
一种函数式语言，用来对时序数据进行聚合运算和查询
可以展示为图标和通过api进行传递，比如使用grafana来进行展示
```

## 5.1 表达式数据类型

```
瞬时向量： 理解为某个时间点的数据，这些数据的时间戳相同 # 只有此类型可以直接绘制图形
范围向量： 理解为某个时间段内的数据，这些数据每个都拥有自己的时间
标量： 一个简单的浮动数值
字符串： 
```

### 5.1.1 文本

```sh
# 字符串
字符串可以指定为单引号、双引号或 反引号 转义符号位 \ 反引号内不处理转义，不会将换行符进行换行而是直接输出
# 浮点文本 
按以下格式可以指定为文字整数或者浮点数
[-+]?(
      [0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?
    | 0[xX][0-9a-fA-F]+
    | [nN][aA][nN]
    | [iI][nN][fF]
)
```

## 5.2 查询

### 5.2.1 瞬时向量

```sh
查询瞬间的数据，给定一个时序数据指标名称和一个时间，可以使用{}来进行lable筛选，lable以,分割
kubelet_http_requests_total{job='kubernetes-nodes',method='GET'}
标签的选择支持逻辑运算
正则语法参考
https://github.com/google/re2/wiki/Syntax
=：选择与提供的字符串完全相同的标签。
!=：选择不等于提供的字符串的标签。
=~：选择与提供的字符串匹配的正则表达式标签。
!~：选择与提供的字符串不匹配的标签。
```

### 5.2.2 范围向量

```sh
类似瞬时向量，加上时间维度
kubelet_http_requests_total{job='kubernetes-nodes',method='GET'}[5m]
时间单位：
    ms-毫秒
    s-秒
    m-分钟
    h-小时
    d- 天 
    w- 周 
    y- 年 
```

### 5.2.3 时间偏移

```
将查询结果时间更改为 xx 之前
http_requests_total offset 5m #  查询5分钟之前的请求数 
偏移量要跟在查询指标之后，不可在聚合运算之后
```

### 5.2.4 修饰符@

```
返回一个查询向量的时间戳
瞬时向量返回查询数据时间
范围向量解析为查询的开始时间和结束时间
```

### 5.2.5 子查询

```

```

## 5.3 运算

### 5.3.1 算术运算

```
# 标量之间
# 标量/向量之间 将向量中每个指标进行运算
# 向量之间
```

### 5.3.2 比较运算

```
==（相等）
!=（不相等）
>（大于）
<（小于）
>=（大于或等于）
<=（小于或等于）
```

### 5.3.3 逻辑运算

```
and（与）
or（或）
unless（去除相同的）
```

### 5.3.4 向量匹配

```
为左侧给定的条目在右侧中进行匹配
# 匹配关键字
on 
ingnoe 
#  修饰符
group_left 左侧条件
group_right 右侧条件
# 一对一匹配
从 左边和右边分别超找结果将其一一匹配，右边的结果忽略lable  code
method_code:http_errors:rate5m{code="500"} / ignoring(code) method:http_requests:rate5m
# 多对一和一对多
和一对一类似，可以使用修饰符对条件进行指定，指定那一侧为多
将左侧指定为多，右边为一分别将其与左侧进行匹配，忽略右侧code标签
method_code:http_errors:rate5m / ignoring(code) group_left method:http_requests:rate5m
```

### 5.3.5 聚合运算

```
sum（计算维度上的总和）
min（选择最小尺寸）
max（选择尺寸最大值）
avg（计算尺寸的平均值）
group（结果向量中的所有值均为 1）
stddev（计算维度上的总体标准差）
stdvar（计算维度上的总体标准方差）
count（计算向量中的元素数）
count_values（计算具有相同值的元素数）
bottomk（按样本值计算的最小 k 元素）
topk（按样本值计算的最大 k 元素）
quantile（计算维度上的φ分位数 （0 ≤ φ ≤ 1） ）
# 格式
<aggr-op>（聚合运算符）[without（从结果中删除标签）|by（保留结果标签） (<label list> 标签)] ([parameter,参数列表] <vector expression> 表达式)
# 下面两个表达式相等 假设里面只存在三个标签
sum without (instance) (http_requests_total)  返回结果没有instance
sum by (application, group) (http_requests_total)
# 统计http请求总数
sum(http_requests_total)
# 统计二进制文件build——version的数量，前面version为参数，指定一个参数统计器个数
count_values("version", build_version)
# 统样板中最多的5个元素个数
topk(5, http_requests_total)
```

## 5.4 函数

```
封装了某些功能，通过输入某参数得到返回结果
```

#### 5.4.1 abs()

```
abs(v instant-vector)
输入瞬时向量，返回输入向量的所有采样值的绝对值
```

#### 5.4.2 absent()

```
absent(v instant-vector)
输入一个瞬时向量，若输入向量为浮点数或直方图类型，返回空，若输入一个空向量，返回1
用来检查时间序列数据中的缺失或不存在的情况
absent(metric) == 1 若存在指标那么此表达式成立，若不存在则不成立
```

#### 5.4.3 absent_over_time

```
absent_over_time(v range-vector) 
用于检查一段时间范围内是否缺少某个时间序列数据
```

#### 5.4.4 ceil()

```
ceil(v instant-vector)
传递一个瞬时向量，将其值四舍五入
```

#### 5.4.5 changes()

```
changes(v range-vector)
计算时序数据在一段时间内发生的值的变化次数
```

#### 5.4.6 clamp|max|min

```
clamp(v instant-vector, min scalar, max scalar)
clamp_max() 限制最大值
clamp_min() 限制最小值
将采样值的采样限制在一个区间之内
```

#### 5.4.7 day_of_week|year|month

```
从给定的utc时间戳中提取年，月，周
```

#### 5.4.8 delta()

```
计算范围向量内第一个和最后一个值之间的差值
```

#### 5.4.9 floor()

```
将给定值四舍五入
```

#### 5.4.10 hour()

```
给定一个utc时间，返回小时
```

#### 5.4.11 increase()

```
increase() 是 Prometheus 查询语言（PromQL）中的一个聚合函数，它用于计算一个时间序列数据的增量值，即某个时间段内的数据增加量。通常，它用于分析时间序列数据的变化趋势。
# 查询过去一小时http请求量的增量一般指变化趋势增长速率
increase(http_requests_total[1h])
```

#### 5.4.12 irate（）

```
irate() 是 Prometheus 查询语言（PromQL）中的一个函数，用于计算时间序列数据在一个时间段内的瞬时变化率。它通常用于分析指标的瞬时增长速率，特别是在图表和警报规则中用于检测突发的异常行为
```

#### 5.4.13 rate()

```
rate() 是 Prometheus 查询语言（PromQL）中的一个函数，用于计算时间序列数据的瞬时速率。它通常用于分析数据的速率或速度，尤其是在监控系统性能和资源利用率时非常有用
```

#### 5.4.14 `round()`

```
round() 是 Prometheus 查询语言（PromQL）中的一个函数，用于将数值四舍五入到指定的小数位数。这可用于控制和调整数字的精度，以满足你的需求
```

#### 5.4.15 `scalar()`

```
将瞬时向量转换为标量
```

#### 5.4.16 sort()|sort_desc()

```
根据采集指标升序或降序
```

#### 5.4.17 time()

```
用于返回当前时间的时间戳
```

#### 5.4.18 `timestamp()`

```
获取时序数据每个数据的时间戳
```

#### 5.4.19 `vector(s scalar)` 

```
将标量作为不带标签的向量作为返回值
```

## 5.5 http api

```
api路径在 /api/v1
以json格式返回，
请求状态码
	200 
    400 错误的参数
    422 表达式错误
    503 查询超时或后端服务不可用
```

## 5.6 查询示例

```
# 查询
输入指标名称，列出所有实例的指标
node_load15
# 根据label查询
{}内可以输入多个label来进行筛选,支持正则与反向匹配
node_load15{job='kubernetes-service-endpoints',instance=~'172.31.3.\.*'}
node_load15{job='kubernetes-service-endpoints',instance=~'172.*'}
node_load15{job='kubernetes-service-endpoints',instance!~'172.31.3.1[01]:9100'}
# 范围向量查询
# 时间偏移
kubelet_running_pods{instance='worker-01'} offset 1h
```

# 6、存储

## 6.1 目录结构

```sh
####################################
./data
├── 01BKGV7JBM69T2G1BGBGM6KB12
│   └── meta.json
├── 01BKGTZQ1SYQJTR4PB43C8PD98
│   ├── chunks
│   │   └── 000001
│   ├── tombstones
│   ├── index
│   └── meta.json
├── 01BKGTZQ1HHWHV8FBJXW1Y3W0K
│   └── meta.json
├── 01BKGV7JC0RY8A6MACW02A2PJD
│   ├── chunks
│   │   └── 000001
│   ├── tombstones
│   ├── index
│   └── meta.json
└── wal
    ├── 00000002
    └── checkpoint.000001
# 存储的数据样本每2小时为一个块，每个块为一个目录
# 目录下包含一个或者多个块文件，文件包含该2小时窗口内的时序数据，元数据，索引
# 通过api对时序数据进行删除，而不是针对块文件进行删除，删除记录储存在单独的逻辑块中
# wal为预写日志，储存尚未被压缩为块文件的原始数据，至少保留3个以上的预写日志
```

## 6.2 配置

```
--storage.tsdb.path: 指定 Prometheus 在何处写入数据库(数据库保存位置)。默认为data/
--storage.tsdb.retention.time: 指定何时删除旧数据(旧数据保存时间)。默认为15d。
--storage.tsdb.wal-compression: 该标志位启用预写日志(WAL)的压缩。取决于您的数据，可以将预期的 WAL 大小减少一半
--web.enable-lifecycle 是否开启配置文件重载
    PUT  /-/reload
    POST /-/reload
```

# 7、api

```sh
# 健康检测
GET /-/healthy
# 就绪检测
GET /-/ready
# 配置重载
PUT  /-/reload
POST /-/reload
# 退出
PUT  /-/quit
POST /-/quit
```

# 8、可视化

## 8.1 grafana

```

```

# 9、告警

```sh
prom告警分两部分实现
prom将告警推送到altermanager，altermanager将告警通过webhook或者微信，钉钉等发送出去
告警可以被抽象为一组http流量
# 实现步骤
配置altermanager
配置prom与altermanager通信
prom创建告警规则
```

## 9.1 altermanager

### 9.1.1 简介

```
altermanager处理prom发送过来的警报，将数据进行去重，分组和路由
# 分组
将其按集群和名称进行分类，当同类多个实例触发告警时，只发送一个告警而不是进行信息轰炸
# 抑制
比如某一集群无法访问，那么关于此集群的其他告警将被抑制，不会被发送出去
# 静默
设定一个条件，若告警匹配此条件那么不进行信息发送
```

## 9.1.2 配置

### 9.1.2.1 全局配置

```
# 指定配置文件
--config.file=alertmanager.yml
# 配置文件详解
global:
  # 默认的 SMTP From 头字段
  [ smtp_from: <tmpl_string> ]
  # 用于发送邮件的默认 SMTP 主机，包括端口号。
  # 端口号通常为25，对于支持 TLS 的 SMTP(有时称为STARTTLS)为587
  # 示例: smtp.example.org:587
  [ smtp_smarthost: <string> ]
  # 标识到 SMTP 服务器的默认主机名
  [ smtp_hello: <string> | default = "localhost" ]
  # SMTP 身份认证相关
  # SMTP Auth using CRAM-MD5, LOGIN and PLAIN. If empty, Alertmanager doesn't authenticate to the SMTP server.
  [ smtp_auth_username: <string> ]
  # SMTP Auth using LOGIN and PLAIN.
  [ smtp_auth_password: <secret> ]
  # SMTP Auth using PLAIN.
  [ smtp_auth_identity: <string> ]
  # SMTP Auth using CRAM-MD5. 
  [ smtp_auth_secret: <secret> ]
  # SMTP 默认使用 TLS
  # 请注意，Go不支持与远程 SMTP 端点的未加密连接
  [ smtp_require_tls: <bool> | default = true ]

  # 用于 Slack 通知的API URL
  [ slack_api_url: <secret> ]
  [ victorops_api_key: <secret> ]
  [ victorops_api_url: <string> | default = "https://alert.victorops.com/integrations/generic/20131114/alert/" ]
  [ pagerduty_url: <string> | default = "https://events.pagerduty.com/v2/enqueue" ]
  [ opsgenie_api_key: <secret> ]
  [ opsgenie_api_url: <string> | default = "https://api.opsgenie.com/" ]
  [ hipchat_api_url: <string> | default = "https://api.hipchat.com/" ]
  [ hipchat_auth_token: <secret> ]
  [ wechat_api_url: <string> | default = "https://qyapi.weixin.qq.com/cgi-bin/" ]
  [ wechat_api_secret: <secret> ]
  [ wechat_api_corp_id: <string> ]

  # 默认的 HTTP 配置
  [ http_config: <http_config> ]

  # 如果警报不设置 EndsAt，则 ResolveTimeout 是 Alertmanager 使用的默认值，经过此时间后，如果告警尚未更新，则可以将告警声明为已解决
  # 这对 Prometheus 的告警没有任何影响，因为它们始终包含 EndsAt
  [ resolve_timeout: <duration> | default = 5m ]

# 从中读取自定义通知模板定义的文件.
# 最后一个组件可以使用通配符匹配器,如 'templates/*.tmpl'.
templates:
  [ - <filepath> ... ]

# 路由树的根节点
route: <route>

# 通知接收者列表.
receivers:
  - <receiver> ...

# 告警抑制规则列表.
inhibit_rules:
  [ - <inhibit_rule> ... ]
```

### 9.1.2.2 route

```
# 给路由定义一个名称
[ receiver: <string> ]
# 根据label进行分组
[ group_by: '[' <labelname>, ... ']' ]

# 告警是否向子路由进行传播
[ continue: <boolean> | default = false ]

# 告警必须满足等值匹配才能匹配节点
match:
  [ <labelname>: <labelvalue>, ... ]

# 警必须满足正则匹配才能匹配节点
match_re:
  [ <labelname>: <regex>, ... ]

# 分组期间新告警的等待时间
[ group_wait: <duration> | default = 30s ]

# 同一组告警间隔
[ group_interval: <duration> | default = 5m ]

# 重复时间间隔
[ repeat_interval: <duration> | default = 4h ]

# 0 个或多个子路由.
routes:
  [ - <route> ... ]
# 例子
# 具有所有参数的根路由.如果未覆盖,则由子路由继承
route:
  receiver: 'default-receiver'
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  group_by: [cluster, alertname]
  # 与以下子路由不匹配的所有告警将保留在根节点上,并分派给 'default-receiver'.
  routes:
  # 所有带有 service = mysql或 service = cassandra 的告警都将分派到 'database-pager'
  - receiver: 'database-pager'
    group_wait: 10s
    match_re:
      service: mysql|cassandra
  # 所有带有 team = frontend 标签的警报均与此子路由匹配.它们按 product 和 environment 分组,而不是按群集和警报名称分组
  - receiver: 'frontend-pager'
    group_by: [product, environment]
    match:
      team: frontend
```

### 9.1.2.3 inhibit_rule

```yaml
告警抑制规则
当特定条件下发生时，如何抑制或取消其他警报
# 当满足source定义的条件时以下告警将被抑制
target_match:
  [ <labelname>: <labelvalue>, ... ]
target_match_re:
  [ <labelname>: <regex>, ... ]

# 当满足以下条件时
source_match:
  [ <labelname>: <labelvalue>, ... ]
source_match_re:
  [ <labelname>: <regex>, ... ]

# 当每个标签都匹配时触发
[ equal: '[' <labelname>, ... ']' ]
####################################
inhibit_rules:
  # 指定源
  - source_match: 
      severity: 'critical'
    # 指定源匹配时哪些抑制将被触发
    target_labels:
      severity: 'warning'
    # 指定是否完全匹配指定标签
    equal: false
    # 指定抑制名称
    inhibit_name: 'dont-notify-warning'

  - source_match:
      environment: 'production'
    target_labels:
      environment: 'staging'
    equal: false
    inhibit_name: 'dont-notify-staging'
    # 是否应用于每个重复告警
    repeated: true
```

### 9.1.2.4 receiver

```sh
警报通知的接收者配置，定义了如何发送通知
# receiver 的唯一名称
name: <string>

# 多个通知集成的配置，常用微信，webhook，email，钉钉
email_configs:
  [ - <email_config>, ... ]
webhook_configs:
  [ - <webhook_config>, ... ]
wechat_configs:
  [ - <wechat_config>, ... ]
```

#### 9.1.2.4.1 email_configs

```
# 是否通知告警已解决.
[ send_resolved: <boolean> | default = false ]

# 接收通知的电子邮件地址.
to: <tmpl_string>

# 发件人地址.
[ from: <tmpl_string> | default = global.smtp_from ]

# SMTP服务器的主机名和端口
[ smarthost: <string> | default = global.smtp_smarthost ]

# SMTP 服务器的主机名标识.
[ hello: <string> | default = global.smtp_hello ]

# SMTP 认证信息.
SMTP身份验证的用户名
[ auth_username: <string> | default = global.smtp_auth_username ]
SMTP身份验证的密码。
[ auth_password: <secret> | default = global.smtp_auth_password ]
[ auth_secret: <secret> | default = global.smtp_auth_secret ]
SMTP身份验证的身份标识
[ auth_identity: <string> | default = global.smtp_auth_identity ]

# SMTP TLS要求.
# 请注意，Go不支持与远程 SMTP 端点的未加密连接
[ require_tls: <bool> | default = global.smtp_require_tls ]

# TLS 配置.
tls_config:
  [ <tls_config> ]

# 邮件通知的HTML正文.
[ html: <tmpl_string> | default = '{{ template "email.default.html" . }}' ]
# 邮件通知的文本正文.
[ text: <tmpl_string> ]

# 电子邮件头键/值对。 覆盖先前由通知实现设置的所有请求头
[ headers: { <string>: <tmpl_string>, ... } ]
```

#### 9.1.2.4.2 webhook_config

```
# 是否通知告警已解决.
[ send_resolved: <boolean> | default = true ]

# 发送 HTTP POST 请求的endpoint
url: <string>

# HTTP 客户端配置.
[ http_config: <http_config> | default = global.http_config ]
```

#### 9.1.2.4.3 wechat_config

```
# 是否通知告警已解决.
[ send_resolved: <boolean> | default = false ]

# 与微信 API 通信时使用的 API 密钥
[ api_secret: <secret> | default = global.wechat_api_secret ]

# The WeChat API URL.
[ api_url: <string> | default = global.wechat_api_url ]

# 用于身份验证的公司 ID
[ corp_id: <string> | default = global.wechat_api_corp_id ]

# 由微信 API 定义的 API 请求数据
[ message: <tmpl_string> | default = '{{ template "wechat.default.message" . }}' ]
[ agent_id: <string> | default = '{{ template "wechat.default.agent_id" . }}' ]
[ to_user: <string> | default = '{{ template "wechat.default.to_user" . }}' ]
[ to_party: <string> | default = '{{ template "wechat.default.to_party" . }}' ]
[ to_tag: <string> | default = '{{ template "wechat.default.to_tag" . }}' ]
```



# N、资料参考

## 1、占位符含义

```
# <boolean>：可以取值或的布尔值 true|false
# <duration>：与正则表达式匹配的持续时间
例如
	((([0-9]+)y)?(([0-9]+)w)?(([0-9]+)d)?(([0-9]+)h)?(([0-9]+)m)?(([0-9]+)s)?(([0-9]+)ms)?|0)1d1h30m5m10s
# <filename>：当前工作目录中的有效路径
# <float>：浮点数
# <host>：由主机名或 IP 后跟可选端口号组成的有效字符串
# <int>：整数值
# <labelname>：与正则表达式匹配的字符串[a-zA-Z_][a-zA-Z0-9_]*
# <labelvalue>：一串 Unicode 字符
# <path>：有效的网址路径
# <scheme>：可以接受值或的字符串 http|https
# <secret>：作为机密的常规字符串，例如密码
# <string>：常规字符串
# <size>：以字节为单位的大小，例如 。一个单位是必需的。支持的单位：B、KB、MB、GB、TB、PB、EB。512MB
# <tmpl_string>：使用前模板扩展的字符串
```

2、promql

```

```

