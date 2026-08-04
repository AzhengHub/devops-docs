---
title: "PromQL"
---

# Metric 类型
Prometheus 客户端库主要提供四种主要的 metric 类型：
## Counter 计数器
- 一种只能累加的 metric，其值从0开始只能增加，不会减少；重启进程后，会被重置
- 典型应用：http的请求数、下单数、结束的任务数、出现的错误数等等。
- 示例：查询 `http_requests_total{method=”get”, job=”Prometheus”, handler=”query”}` 返回 8，10 秒后，再次查询，则返回 14。
- 常见操作： 通常使用 rate() 或 irate() 函数来计算其变化率（例如，每秒的请求数）。

**通常，Counter的总数并没有直接作用，而是需要借助于rate、topk、increase和irate等函数来生成样本数据的变化状况（增长率）；**

- rate(http_requests_total[2h])，获取2小内，该指标下各时间序列上的http总请求数的增长速率；
  - **增长速率是指单位时间内增长的数量**
- topk(3, http_requests_total)，获取该指标下http请求总数排名前3的时间序列；
- irate(http_requests_total[2h])，高灵敏度函数，用于计算指标的瞬时速率；
  - 基于样本范围内的最后两个样本进行计算，相较于rate函数来说，irate更适用于短期时间范围内的
    变化速率分析；

## Gauge 仪表盘
- 一个可增减的值，可以随时间增加或减少，用于存储有着起伏特征的指标数据。
- 典型应用：内存的使用量、CPU 的当前温度、队列中的消息数、当前并发请求数等、运行的 goroutines 的个数。
- 示例：go_goroutines{instance=”172.17.0.2”, job=”Prometheus”} 返回值 147，10 秒后返回 124。

**Gauge用于存储其值可增可减的指标的样本数据，常用于进行求和、取平均值、最小值、最大值等聚合计算；也会经常结合PromQL的predict_linear和delta函数使用；**
`predict_linear(v range-vector, t, scalar)` 函数可以预测时间序列v在t秒后的值，它通过线性回归的方式来预测样本数据的Gauge变化趋势；
`delta(v range-vector)` 函数计算范围向量中每个时间序列元素的第一个值与最后一个值之差，从而展示不同时间点上的样本值的差值；
- `delta(cpu_temp_celsius{host="web01.xiangzheng.com"}[2h])`，返回该服务器上的CPU温度与2小时之前的差异；

## Histogram 直方图
- 可以理解为柱状图，它会在一段时间范围内对数据进行采样，并将其计入可配置的 bucket 之中，用于分组及统计。
  - 暴露三个指标：_bucket, _sum, _count。
- Histogram 更适合监测一个一系列事件的持续时间或大小的分布情况；
- 典型应用：HTTP 请求延迟、数据库查询时间、响应体大小。
- 常见操作： 用于计算分位数（如 P95、P99），通常配合 `histogram_quantile()` 函数使用。

**示例：API 请求处理延迟**

假设您的 API 收到 1000 个请求，您想知道这些请求的处理时间分布，特别是 99% 的请求是否在 500 毫秒内完成。

Histogram 不记录 1000 个延迟值本身，而是定义一组**分桶**（例如 100ms, 250ms, 500ms, 1s），然后记录有多少次请求的延迟落入每个分桶。
**Prometheus 实际暴露的指标：**

| **指标名称**                           | **标签 (le)** | **值 (计数)** | **含义**                               |
| -------------------------------------- | ------------- | ------------- | -------------------------------------- |
| `http_request_duration_seconds_bucket` | `{le="0.1"}`  | 100           | 100个请求延迟 ≤ 0.1 秒             |
| `http_request_duration_seconds_bucket` | `{le="0.25"}` | 500           | 500个请求延迟 ≤ 0.25 秒            |
| `http_request_duration_seconds_bucket` | `{le="0.5"}`  | 950           | 950个请求延迟 ≤ 0.5 秒             |
| `http_request_duration_seconds_bucket` | `{le="+Inf"}` | 1000          | 1000个请求延迟 $ + ∞ 秒 (总数) |
| `http_request_duration_seconds_sum`    | (无)          | 150.0         | 所有请求延迟的总和（秒）               |
| `http_request_duration_seconds_count`  | (无)          | 1000          | 请求总数                               |

- **特点：** 它是一组**统计数据**，反映了一段时间内**采样值的分布**。

- 查询： 通常用于计算分位数，例如计算 P99 (第 99 百分位数) 延迟：
  - `histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))` 在过去 5 分钟内，有 99% 的用户请求，其延迟（响应时间）最高是多少？
  - 内层 rate： 将 5 分钟内的累积计数转换为每秒的请求延迟分布。
  - 外层 histogram_quantile(0.99, ...)： 根据这个每秒分布，计算出 99% 的请求所能达到的最大延迟时间。
  - 最终结果的意义： 如果结果是 500ms，就说明你的系统在过去 5 分钟内，有 99% 的用户请求都在 500ms 或更短的时间内得到了响应。这是一个非常重要的服务等级指标（SLI）。

- **Gauge** 回答：“**现在**是什么？”
- **Histogram** 回答：“**在一段时间内**，**大部分**事件的速度（或大小）是多少？”

---

## Summary 摘要
- 与 Histogram 类似，也是用于对采样值进行统计，它在客户端计算和存储。
- 典型应用：请求持续时间，响应大小。

# PromQL 概述
- Prometheus Query Language
- 当 Prometheus 从系统和服务收集指标数据时，它会把数据存储在内置的时序数据库（TSDB）中，要对收集到的数据进行任何处理，我们都可以使用 PromQL 从 TSDB 中读取数据，同时可以对所选的数据执行过滤、聚合以及其他转换操作。
- 外部用户和 UI 界面可以使用 Prometheus 服务提供的 [HTTP API](https://prometheus.io/docs/prometheus/latest/querying/api/) 来执行 PromQL 查询。这就是仪表盘软件（例如 [Grafana](https://grafana.com/grafana/)、[PromLens](https://promlens.com/) 以及 Prometheus 内置 Web UI）访问 PromQL 的方式。


# PromQL 基础语法
**`<metric name> {<label name>=<label value>, …}`**
- **metric name** 指标名称：通常用于描述系统上要测定的某个特征；例如`http_requests_total` 表示接收到的HTTP请求总数
- **label name** 标签：可选项；键值型数据，附加在指标名称之上，从而让指标能够支持多纬度特征；例如`http_requests_total{method=GET}` 和 `http_requests_total{method=POST}` 代表着两个不同的时间序列，以 __ 开头的标签名是Prometheus 系统内部保留使用的。

**注意事项：**
- `metric name`、`label name`仅支持字母、数字和下划线，且必须能匹配RE2规范的正则表达式`[a-zA-Z_:][a-zA-Z0-9_:]*`；
- 指标名称和标签的特定组合代表着一个时间序列；更改任何标签值，包括添加或删除标签，都会创建一个新的时间序列；
- **应该尽可能地保持标签的稳定性**，否则，则很可能创建新的时间序列，更甚者会生成一个动态的数据环境，并使得监控的数据源难以跟踪，从而导致建立在该指标之上的图形、告警及记录规则变得无效。



# PromQL 匹配操作符
**定义标签过滤条件，目前支持如下4种匹配操作符：**
- `=` 完全相等
- `!=` 不等于
- `=~` 正则匹配
- `!~` 正则匹配取反

**示例：**
```sh
# 统计 master 节点数量
count(up{job="kubernetes-nodes", instance=~'k8s-master.*'})
```

# PromQL 函数
## 聚合函数
**Prometheus 内置提供了11个聚合函数：**
- `sum()` 对样本值求和
- `avg()` 对样本值求平均值，这是进行指标数据分析的标准方法
- `count()` 对分组内的时间序列进行数量统计
- `stddev()` 对样本值求标准差，以帮助用户了解数据的波动大小（或称之为波动程度）
- `stdvar()` 对样本值求方差，它是求取标准差过程中的中间状态
- `min()` 求取样本值中的最小者
- `max()` 求取样本值中的最大者
- `topk()` 逆序返回分组内的样本值最大的前k个时间序列及其值
- `bottomk()` 顺序返回分组内的样本值最小的前k个时间序列及其值
- `quantile()` 分位数用于评估数据的分布状态，该函数会返回分组内指定的分位数的值，即数值落在小于等于指定的分位区间的比例
- `count_values()` 对分组内的时间序列的样本值进行数量统计对每一个样本值进行分别计数

**聚合操作语法：**
- `<aggr-op>([parameter,] <vector expression>) [without|by (<label list>)] `
- `<aggr-op> [without|by (<label list>)] ([parameter,] <vector expression>)`
  - aggr-op：聚合操作，指定聚合函数
  - parameter：对于 topk、bottomk 聚合函数返回结果的取值范围

  - without：从结果向量中删除由without子句指定的标签，未指定的那部分标签则用作分组标准；

  - by：功能与without刚好相反，它仅使用by子句中指定的标签进行聚合，结果向量中出现但未被by子句指定的标签则会被忽略；
    - 为了保留上下文信息，使用by子句时需要显式指定其结果中原本出现的job、instance等一类的标签
- 分组聚合：先分组、后聚合
- 事实上，各函数工作机制的不同之处也仅在于计算操作本身，PromQL对于它们的执行逻辑相似；

### count
- K8s 节点状态统计
```sh
# 统计 master 节点数量
count(up{job="kubernetes-nodes", instance=~'k8s-master.*'})
```

- 计算CPU核心数
```sh
count(count(node_cpu_seconds_total{instance="$node",job="$job"}) by (cpu))
count(count(node_cpu_seconds_total{instance="10.0.0.7:9100",job="nodes"}) by (cpu))


# 打印出每号CPU的各种状态，例如：0号CPU的idle、system、user等总计8种状态，如果有两个CPU则总计会返回0号和1号CPU的总计16条信息。
node_cpu_seconds_total{instance="10.0.0.7:9100",job="nodes"}


# 计数，1颗cpu返回8，2颗返回16，以此类推。
count(node_cpu_seconds_total{instance="10.0.0.7:9100",job="nodes"})


# 根据CPU分组，最后得到实际CPU的个数
count(count(node_cpu_seconds_total{instance="10.0.0.7:9100",job="nodes"}) by (cpu))
```

## 内建函数
https://prometheus.io/docs/prometheus/latest/querying/functions

### rate
`rate()` 函数用于计算某个 Counter 类型指标，在单位时间内的增长速率。

语法：`rate(指标名称[时间范围])`

示例：
```sh
# 计算在过去 5 分钟内的 HTTP 请求速率。
rate(http_requests_total[5m])

# 意思是“看看过去5分钟（5m）这个计数器一共涨了多少，然后除以300秒，给我算出每秒平均增长速度”
# 过去5分钟涨了300 → rate = 300 ÷ 300秒 = 1 次/秒
# 过去5分钟涨了1500 → rate = 1500 ÷ 300秒 = 5 次/秒
```

### irate
`irate()` 也是把 Counter 变成“每秒速度”，但它只看过去时间窗口里的最后两个数据点的增长速度，反应的是瞬间速率（超级敏感，适合抓突发峰值）。

语法：`irate(指标名称[时间范围])`

示例：
```sh
# 看当前这一瞬间的请求速度有多猛
irate(http_requests_total[5m])

# 假设：Prometheus 每10秒刮擦一次数据（典型间隔）。
# 过去5分钟（300秒）窗口里，有一堆样本点。
# 但 irate 只关心最后两个点：比如 t=295秒 值=1000，t=300秒 值=1100（最后5秒内突然涨了100）。
# 增长 = 1100 - 1000 = 100
# 时间差 = 300 - 295 = 5秒（注意：实际时间差取决于刮擦间隔，不是固定5秒）
# irate = 100 ÷ 5 = 20 次/秒（瞬间爆发20 QPS！）
# 而 rate() 会用整个5分钟的第一个和最后一个点算平均，可能过去5分钟总涨了1500，rate=1500÷300=5 次/秒（平滑，看不出瞬间峰值）
```

rate 和 irate 的区别：
- rate 计算的是单位时间内的平均增长速率，适合像 CPU 使用率、磁盘 IO 这种场景，线条比较平滑。
- irate 是高灵敏函数，计算的是单位时间内**最后两个数据点的瞬时速率**，适合像 HTTP 请求速率（QPS）、突发性网络流量这种场景，线条比较陡峭。
- 简单来讲，irare 更加敏感，它能看到一些瞬时、突发的情况。而rate 更平滑，

### increase
`increase()` 函数用于计算某个 Counter 类型指标，在指定时间范围内的增量（增长值）。
语法：`increase(指标名称[时间范围])`

示例：
```sh
# 看过去5分钟总共处理了多少个成功的GET请求：
increase(http_requests_total{method="GET", code="200"}[5m])
```

### time
- 返回自1970年1月1日UTC以来的秒数。
```sh
# 系统启动的时间，unix时间戳为单位，以秒为单位
node_boot_time_seconds{instance=~"10.0.0.18:9100"}

# time()函数以unix时间戳的方式打印当前时间，减去启动时间，即得到启动的秒数
time() - node_boot_time_seconds{instance=~"10.0.0.18:9100"}

# /60 得到启动的分钟
(time() - node_boot_time_seconds{instance=~"10.0.0.18:9100"}) / 60


# grafana中写法，因为可以实现自动单位转换
avg(time() - node_boot_time_seconds{instance=~"$instance"})
```

# PromQL 分组聚合
PromQL（Prometheus Query Language）中的分组聚合主要通过两个关键字实现：
- `by`：按指定的标签分组（分组聚合）
- `without`：排除指定的标签后，把剩余所有标签作为分组依据（常用于去掉一些噪音标签）

它的核心作用是：在聚合运算（sum、avg、count、min、max、topk、bottomk 等）时，先按照某些标签把指标划分成不同的组，然后对每个组分别进行聚合计算。

没有分组 = 对所有时间序列整体聚合

有分组 = 对每一组（相同标签值的组合）分别聚合，得到多条结果序列

**示例：基于 by 实现单标签分组：**
- 假设我们有指标：`http_requests_total{job="api-server", instance="1.2.3.4:9090", code="200", method="get"}`
```sh
# 统计整个集群总的HTTP请求数（不分组）：
sum(http_requests_total)
# 结果：只有1条时间序列，整个集群的总和


# 按状态码统计总请求数（按code分组）：
sum(http_requests_total) by (code)
# 结果：
# {code="200"}  => 很大一堆
# {code="404"}  => 少一点
# {code="500"}  => 很少
```

**示例：基于 by 实现多标签分组：**
```sh
# 按方法和状态码一起分组
sum(http_requests_total) by (method, code)
```

**示例：基于 without 实现多标签分组：**
- 使用 without 去掉某些标签（常用于去掉instance、pod等噪声标签）
```sh
# 去掉instance和pod标签后，按剩下的所有标签分组求和
# 典型场景：统计每个服务、每个路由的总QPS，不关心具体是哪台机器
sum(http_requests_total) without (instance, pod)
```

**示例：生产环境参考**
```sh
# 1. 每个服务的总QPS（去掉机器维度）
sum(rate(http_requests_total[5m])) without (instance)

# 2. 每个服务的错误率（按job + code分组）
sum(rate(http_requests_total[5m])) by (job, code) 

# 3. 每个路由的P99延迟（去掉instance）
histogram_quantile(0.99, 
  sum(rate(http_request_duration_seconds_bucket[5m])) without (instance) by (le, route)
)

# 4. top 10 请求最多的路径
topk(10, sum(rate(http_requests_total[5m])) by (route))

# 5. 统计集群中不同job有多少个实例在运行（count by job）
count(count by (instance, job) (up)) by (job)
# 或者更简单：
count(up) by (job)
```


# 时间序列选择器

- Time series Selectors
- PromQL的查询操需要针对有限个时间序列上的样本数据进行，挑选出目标时间序列是构建表达式时最为关键的一步
- 用户可使用向量选择器表达式，来挑选出给定指标名称下的所有时间序列或部分时间序列的即时（当前）样本值（称为即时向量选择器）或至过去某个时间范围内的样本值（称为范围向量选择器）



## PromQL 数据类型

PromQL 的表达式中支持4种数据类型：

**即时向量 instant Vectors**

- 最近一次的时间戳上跟踪的数据指标
- 特定或全部的时间序列集合上，具有相同时间戳的一组样本值称为即时向量

**时间范围向量 range Vectors**

- 指定时间范围内的所有时间戳上的数据指标
- 特定或全部的时间序列集合上，在指定的同一时间范围内的所有样本值

**标量 Scalar**

- 一个浮点型的数据值

**字符串 String**

- 支持使用单引号、双引号或反引号进行引用，但反引号中不会对转义字符进行转义



## 向量表达式使用要点

表达式的返回值类型亦是即时向量、范围向量、标题或字符串4种数据类型其中之一，但是，有些使用场景要求表达式返回值必须满足特定的条件，例如：

- 需要将返回值绘制成图形时，仅支持即时向量类型的数据；
- 对于诸如rate一类的速率函数来说，其要求使用的却又必须是范围向量型的数据；

由于范围向量选择器的返回的是范围向量型数据，它不能用于表达式浏览器中图形绘制功能，否则，表达式浏览器会返回“Error executing query: invalid expression type "range vector" for range query, must be Scalar or instant Vector”一类的错误

- 事实上，范围向量选择几乎总是结合速率类的函数rate一同使用。



## 即时向量选择器

- Instant Vector Selectors

- 返回0个、1个或多个时间序列上在给定时间戳（instant）上的各自的一个样本，该样本也可称为即时样本；

**即时向量选择器由两部分组成：**

- 指标名称：用于限定特定指标下的时间序列，即负责过滤指标；可选；
- 匹配器（Matcher）：或称为标签选择器，用于过滤时间序列上的标签；定义在{}之中；可选；

**显然，定义即时向量选择器时，以上两个部分应该至少给出一个；于是，这将存在以下三种组合：**

- 仅给定指标名称，或在标签名称上使用了空值的匹配器：返回给定的指标下的所有时间
  序列各自的即时样本；
  - 例如：http_requests_total 和 http_requests_total{}的功能相同，都是用于返回http_requests_total指标下各时间序列的即时样本；
- 仅给定匹配器：返回所有符合给定的匹配器的所有时间序列上的即时样本；
  - 注意：这些时间序列可能会有着不同的指标名称；
  - 例如： {job=".*", method="get"}
- 指标名称和匹配器的组合：返回给定的指标名称下的 且 符合给定的标签过滤器的所有时间序列上的即时样本；
  - 例如： http_requests_total{method="get"}





## 范围向量选择器

**范围向量在绝大多数情况下，都是结合速率类的函数例如：`rate` 等一同使用。**

- Range Vector Selectors

- 返回0个、1个或多个时间序列上在给定时间范围内的各自的一组样本；

**同即时向量选择器的唯一不同之处在于，范围向量选择器需要在表达式后紧跟一个方括号[ ]来表达需在时间时序上返回的样本所处的时间范围；**

- 时间范围：以当前时间为基准时间点，指向过去一个特定的时间长度；例如[5m]便是指过去5分钟之内；

**时间格式：一个整数后紧跟一个时间单位，例如“5m”中的“m”即是时间单位；**

- 可用的时间单位有ms（毫秒）、s（秒）、m（分钟）、h（小时）、d（天）、w（周）和y（年）;
- 必须使用整数时间，且能够将多个不同级别的单位进行串联组合，以时间单位由大到小为顺序，例如1h30m，但不能使用1.5h；

**需要注意的是，范围向量选择器返回的是一定时间范围内的数据样本，虽然不同时间序列的数据抓取时间点相同，但它们的时间戳并不会严格对齐；**

- 多个Target上的数据抓取需要分散在抓取时间点前后一定的时间范围内，以均衡Prometheus Server的负载；
- 因而，Prometheus在趋势上准确，但并非绝对精准；



## 偏移量修改器

**默认情况下，即时向量选择器和范围向量选择器都以当前时间为基准时间点，而偏移量修改器能够修改该基准；**

**偏移量修改器的使用方法是紧跟在选择器表达式之后使用“offset”关键字指定**

- http_requests_total offset 5m，表示获取以http_requests_total为指标名称的所有时间序列在过去5分钟之时的即时样本；

- http_requests_total[5m] offset 1d，表示获取距此刻1天时间之前的5分钟之内的所有样本；













# 内置函数

https://prometheus.io/docs/prometheus/latest/querying/functions/

## rate()

https://prometheus.io/docs/prometheus/latest/querying/functions/#rate

`rate()` 函数用于计算时间序列数据的增长速率。它的作用是估算一个时间序列在单位时间内的增长速率。

`rate()` 函数通常仅用于计算计数器（Counter）类型指标的变化速率，因为计数器类型指标记录了事件发生的总次数或增量，且通常必须指定范围向量。

基本语法为：`rate(metric[range])`

- `metric`: 要计算增长速率的指标名称。
- `range`: 表示时间范围，可选参数。它指定了用于计算增长速率的时间跨度，默认是一个采样间隔的时间范围。

`rate()` 函数返回的是时间序列的增长率，通常是每秒的增量。使用这个函数能够将 Counter 类型的指标转换成增长速率，更适合进行分析和可视化。

例如，如果有一个叫做 `http_requests_total` 的 Counter 指标记录了 HTTP 请求的总数，可以使用 `rate(http_requests_total[5m])` 来计算在过去 5 分钟内的 HTTP 请求速率。

这个函数对于监控系统的性能分析非常有用，能够帮助理解指标的变化趋势以及系统在不同时间段内的性能情况。



```
78.112454714 
84.943775309 
91.131259621 
97.042530353 
102.82308864 
109.393009217
114.533443554
121.052590027
126.39130006 
133.290817097

container_cpu_usage_seconds_total 查询十分钟内的数据时，为什么返回的是这种值
```



## histogram_quantile()

- 分位数计算



## time()

- 返回自1970年1月1日UTC以来的秒数。请注意，这实际上并不返回当前时间，而是返回要计算表达式的时间。



# 二元运算

## 二元运算符

- Binary Operators

**PromQL支持基本的算术运算和逻辑运算，这类运算支持使用操作符连接两个操作数，因而也称为二元运算符或二元操作符；**

- 支持的运算：
  - 两个标量间运算；
  - 即时向量和标量间的运算：将运算符应用于向量上的每个样本；
  - 两个即时向量间的运算：遵循向量匹配机制；
- 将运算符用于两个即时向量间的运算时，可基于**向量匹配**模式（Vector Matching）定义其运算机制；

**算术运算：**

- +（加）、-（减）、*（乘）、/（除）、%（取模）、^（幂运算）

**比较运算：**

- ==（等值比较）、!=（不等）、>、<、>=、<=

**逻辑/集合运算：**

- and（并且）、or（或者）、unless（除了）
- 目前，该运算仅允许在两个即时向量间进行，尚不支持标量参与运算；





## 二元运算符优先级

**Prometheus的复杂运算中，二元运算符存在如下给定次序中所示的由高到低的优先级：**

- ^
- *, /, %
- +, -
- ==, !=, <=, <, >=, >
- and, unless
- or

**具有相同优先级的运算符满足结合律（左结合），但幂运算除外，因为它是右结合机制；**

**可以使用括号( )改变运算次序；**









# 向量匹配

即时向量间的运算是PromQL的特色之一；运算时，PromQL为会左侧向量中的每个元素找到匹配的元素，其匹配行为有两种基本类型

- 一对一 （One-to-One）
- 一对多或多对一 （Many-to-One, One-to-Many）



## 向量一对一匹配

- 即时向量的一对一匹配
- 从运算符的两边表达式所获取的即时向量间依次比较，并找到唯一匹配（标签完全一致）的样本值；
- 找不到匹配项的值则不会出现在结果中；

**匹配表达式语法：**

- `<vector expr> <bin-op> ignoring(<label list>) <vector expr>`
- `<vector expr> <bin-op> on(<label list>) <vector expr>`
  - vector expr：左右两边的即时向量
  - bin-op：二元运算符
  - ignore：定义匹配检测时要忽略的标签；
  - on：定义匹配检测时只使用的标签；
  

### Example

**rate(http_requests_total{status_code=~"5.*"}[5m]) > .1 * rate(http_requests_total[5m])**

- 左侧会生成一个即时向量，它计算出5xx响应码的各类请求的增长速率；
  - 除了status_code标签外，该指标通常还有其它标签；于是，status_code的值为500的标签同其它标签的每个组 合将代表一个时间序列，其相应的即时样本即为结果向量的一个元素；
-  右侧会生成一个即时向量，它计算出所有标签组合所代表的各类请求的增长速率；
- 计算时，PromQL会在操作符左右两侧的结果元素中找到标签完全一致的元素进行比较；
- 其意义为，计算出每类请求中的500响应码在该类请求中所占的比例是否大于10%；





## 向量一对多/多对一匹配 

- "一" 侧的每个元素，可与“多”侧的多个元素进行匹配；

- 必须使用 group_left 或 group_right 明确指定哪侧为"多"侧；

**匹配表达式语法：**

- \<vector expr> \<bin-op> ignoring(\<label list>) group_left(\<label list>) \<vector expr>
- \<vector expr> \<bin-op> ignoring(\<label list>) group_right(\<label list>) \<vector expr>
- \<vector expr> \<bin-op> on(\<label list>) group_left(\<label list>) \<vector expr>
- \<vector expr> \<bin-op> on(\<label list>) group_right(\<label list>) \<vector expr>



### Example

- xxx





# Recording Rule

- https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/

- 当实时查询一些较为复杂的PromQL时，其响应结果有可能会有一定程度上的延迟，并且也会给Prometheus带来瞬时压力的增加；
- 为了解决这个问题，可以对复杂的PromQL进行记录规则（Recording rule）
  - Recording rule 能够**预先运行**频繁用到或计算消耗较大的表达式，并将其结果保存为一组新的时间序列；
  - **客户端只需要查询由记录规则生成的结果序列上的样本数据即可，速度远快于实时查询；**
    - 由于不是实时计算，所以**查询的结果有一定程度上的延迟**
  - 常用于跨多个时间序列生成聚合数据，或者计算消耗较大的查询等场景中；
  - 多见于同可视化工具结合使用的需求中，也可用于生成可产生告警信息的时间序列；
- Alert rule 告警规则：
  - 告警规则是另一种定义在Prometheus配置文件中的PromQL表达式， 它通常是一个基于查询语句的布尔表达式，该表达式负责触发告警；
  - 告警规则中用的查询语句较为复杂时，可将其保存为记录规则，而后通过查询该记录规则生成的时间序列来参与比较，从而避免实时查询导致的较长时间延迟；



## 定义 Recording Rule

- 记录规则是定义在Prometheus配置文件中的查询语句，由 Prometheus Server 加载后它能够于以类似批处理任务的方式在后台周期性的执行并记录查询结果； 
- 记录规则将生成新的时间序列，因而其名称必须是规范的指标名称格式；
- 记录规则必须定义在规则组（rule group）中，各规则按给定的顺序依次运行；

### 定义规则组

- 通常要保存于单独的文件中，如：`$prometheus-BASE/rules/recording_rules.yaml`

```yaml
groups:
- name: custom_rules
  interval: 5s # promQL执行间隔
  rules:
  - record: instance:node_cpu:avg_rate5m
    expr: 100 - avg(irate(node_cpu_seconds_total{job="node", mode="idle"}[5m])) by (instance) * 100

  - record: instace:node_memory_MemFree_percent
    expr: 100 - (100 * node_memory_MemFree_bytes / node_memory_MemTotal_bytes)

  - record: instance:root:node_filesystem_free_percent
    expr: 100 * node_filesystem_free_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"}
    
  - record: runtime:min
    expr: (time() - node_boot_time_seconds{instance=~"10.0.0.18:9100"}) / 60
```

### 引用

- 在prometheus.yml中通过rule_files加载规则组文件

```yaml
...
rule_files:
  - "rules/*.yaml"
...
```

### 验证

- 定义完成并重启Prometheus后，可以在Prometheus的rules URI 看到定义的规则
- 后期查询时，只需引用record定义的内容即可，如：runtime:min







