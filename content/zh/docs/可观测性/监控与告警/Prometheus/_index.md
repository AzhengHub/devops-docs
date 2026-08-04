---
title: "Prometheus"
---

# Prometheus 概述

- Prometheus 是 Prometheus 生态中的核心组件，用于收集、存储监控数据。
- 它同时支持静态配置和通过 ServiceDiscovery 动态发现来管理监控目标，并从监控目标中获取数据。
- Prometheus Server 也是一个时序数据库，它将监控数据保存在本地磁盘中，并对外提供自定义的 PromQL 语言实现对数据的查询和分析
- Prometheus 默认端口：TCP/9090

## 特点

作为新一代的监控框架，Prometheus 具有以下特点：

- **强大的多维度数据模型：**
  1. 时间序列数据通过 metric 名和键值对来区分。
  2. 所有的 metrics 都可以设置任意的多维标签。
  3. 数据模型更随意，不需要刻意设置为以点分隔的字符串。
  4. 可以对数据模型进行聚合，切割和切片操作。
  5. 支持双精度浮点类型，标签可以设为全 unicode。

- **灵活而强大的查询语句（PromQL）：**
  - 在同一个查询语句，可以对多个 metrics 进行乘法、加法、连接、取分数位等操作。
- **易于管理：**
  - Prometheus server 是一个单独的二进制文件，可直接在本地工作，不依赖于分布式存储。
- **高效：**
  - 平均每个采样点仅占 3.5 bytes，且一个 Prometheus server 可以处理数百万的 metrics。
  - 使用 pull 模式采集时间序列数据，这样不仅有利于本机测试而且可以避免有问题的[服务器](https://cloud.tencent.com/product/cvm?from=10680)推送坏的 metrics。
- 可以采用 push gateway 的方式把时间序列数据推送至 Prometheus server 端。
- 可以通过服务发现或者静态配置去获取监控的 targets。
- 有多种可视化图形界面。
- 易于伸缩。

## 数据采集方式

- Prometheus 数据采集是主动从各Target上 "拉取 pull" 数据，而非等待被监控端的 "推送 push"；
  - Pull模型的优势在于：
    - 集中控制：有利于将配置集在Prometheus Server上完成，包括指标及采取速率等；


## 数据抓取途径

- Prometheus支持通过三种类型的途径从目标上"抓取（Scrape）"指标数据：

  - Exporters

  - Instrumentation

  - Pushgateway


## 数据保存形式

- Prometheus 将其指标收集并存储为时间序列数据，即指标信息与记录时的时间戳以及称为标签的可选键值对一起存储。
- Prometheus 不依赖分布式存储，单个服务器节点是自治的。
- Prometheus 认为只有最近的监控数据才有查询的需要。因此其本地存储的设计初衷只是保存短期数据，而不支持针对大量的历史数据进行存储；
  - **若需要存储长期的历史数据，建议基于远端存储机制将数据保存于InfluxDB或OpenTSDB 等系统中；**


## 参考文档

- https://prometheus.io/
- https://github.com/prometheus/prometheus

# Prometheus 部署

## 单机部署

### bin

- https://prometheus.io/download/
- https://github.com/prometheus/prometheus/releases

```bash
# pwd
/usr/local/src

# wget https://github.com/prometheus/prometheus/releases/download/v2.37.4/prometheus-2.37.4.linux-amd64.tar.gz


# tar xf prometheus-2.37.4.linux-amd64.tar.gz -C /usr/local/


# ln -s /usr/local/prometheus-2.37.4.linux-amd64/ /usr/local/prometheus


# ll /usr/local/
...
lrwxrwxrwx  1 root root   41 Jul 24 13:24 prometheus -> /usr/local/prometheus-2.37.4.linux-amd64//
drwxr-xr-x  4 3434 3434 4096 Jul 14 23:35 prometheus-2.37.4.linux-amd64/


# 创建运⾏Prometheus Server进程的系统⽤⼾，并为其创建家⽬录/var/lib/prometheus作为数据存储⽬录。
# useradd -r -m -d /var/lib/prometheus prometheus
# ll /var/lib/prometheus -d
drwx------ 2 prometheus prometheus 62 Dec  8 04:05 /var/lib/prometheus
# id prometheus
uid=997(prometheus) gid=995(prometheus) groups=995(prometheus)


# 此 service 文件由 Ubuntu 直接 apt 安装 prometheus 所获得的 service 文件参考修改而来
# vim /lib/systemd/system/prometheus.service
[Unit]
Description=Monitoring system and time series database
Documentation=https://prometheus.io/docs/introduction/overview/

[Service]
Restart=always
User=root
ExecStart=/usr/local/prometheus/prometheus \
          --config.file=/usr/local/prometheus/prometheus.yml
ExecReload=/bin/kill -HUP $MAINPID
TimeoutStopSec=20s
SendSIGKILL=no

[Install]
WantedBy=multi-user.target



# systemctl daemon-reload
# systemctl enable --now prometheus.service
```





### helm

使用 helm 部署原生版的 Prometheus

```py
kubectl create ns monitoring
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm pull prometheus-community/prometheus --version 25.8.2
tar xf prometheus-25.8.2.tgz 
vim prometheus/values.yaml  # 将该文件中的 alertmanager、kube-state-metrics、prometheus-node-exporter、prometheus-pushgateway 的 enabled 改为 false（后期这些组件单独部署，以便于管理）
helm install prometheus ./prometheus-25.8.2.tgz -n monitoring -f prometheus/values.yaml

'''
NAME: prometheus
LAST DEPLOYED: Thu Mar  7 16:53:14 2024
NAMESPACE: monitoring
STATUS: deployed
REVISION: 1
TEST SUITE: None
NOTES:
The Prometheus server can be accessed via port 80 on the following DNS name from within your cluster:
prometheus-server.monitoring.svc.cluster.local


Get the Prometheus server URL by running these commands in the same shell:
  export POD_NAME=$(kubectl get pods --namespace monitoring -l "app.kubernetes.io/name=prometheus,app.kubernetes.io/instance=prometheus" -o jsonpath="{.items[0].metadata.name}")
  kubectl --namespace monitoring port-forward $POD_NAME 9090





For more information on running Prometheus, visit:
https://prometheus.io/
'''
```





## 集群部署

### Prometheus N

- 建立两个或多个Prometheus，同时工作，共同收集指标，前端建立SLB进行访问
- Grafana定义数据源时通过SLB访问Prometheus
- alertmanager集群可以与Prometheus节点复用

**优缺点：**

- 存在数据不一致的可能性
- 不支持数据长期存储
- 仅适用于小规模的系统环境；







### Prometheus N + 3rd-party

- 建立两个或多个Prometheus，同时工作，共同收集指标，但将数据共同存入到第三方存储上 从而实现数据读/写，前端建立SLB进行访问
  - 第三方存储可以是 InfluxDB、M3DB 等时序数据库
- Grafana定义数据源时可以直接指向InfluxDB、M3DB 等时序数据库
- alertmanager集群可以与Prometheus节点复用

**优缺点：**

- 支持数据的长期存储
- Prometheus Server恢复后能够快速恢复数据
- 仅适用于小规模的系统环境







### Prometheus Federation

- 设定多台Prometheus Server，分别监控不同的Target；
  - 可基于地址位置、机房、业务等纬度来拆分监控对象； 
- 设定一台主节点，来合并多个分片的Prometheus Server各自抓取的数据；
  - 主节点使用Prometheus federation API进行数据合并；
  - 主节点也是Grafana的数据源；





### Prometheus + Thanos

- Thanos是一个开源、高可用的Prometheus设置，具有长期存储和查询功能。
- 所有这些项目都可能适合特定的用例，但没有一个是灵丹妙药。以下好处使我们决定与Thanos合作：
  - 无状态组件
  - 服务之间的稳定StoreAPI
  - 历史度量和整个状态被持久化到对象存储
  - 最后但并非最不重要的是，它是一个CNCF项目
- Thanos组件：
  - Sidecar
  - Store
  - Compact
  - Query
  - Rule
  - Bucket





###  Prometheus + Cortex

- 为Prometheus添加长期存储、数据的全局视图及多租户功能
  - 支持多租户，作为服务的Cortex可提供鉴权和访问控制功能；
  - 数据长期保留，状态可被管理；
  - 高可用，可伸缩；
  - 提供更好的查询效率及全局视图，尤其是长查询
- 组件：
  - Distributor：使用Prometheus的远程写入API处理由Prometheus实例写入Cortex的时间序列数据；传入的数据会自动复制和分片；并且会并行发送到多个Cortex Ingester；
  - Ingester：从Distributor节点接收时间序列数据，然后将该数据写入长期存储后端，压缩数据到
    Prometheus块以提高效率；
  - Ruler：执行规则并生成告警，将告警发送到Alertmanager；
  - Querier：处理来自客户端的PromQL查询，对短期时间序列数据和长期存储中的样本进行抽象；











# Prometheus 相关生态组件

Prometheus 生态圈中包含了多个组件，其中部分组件可选

![architecture](Prometheus-images\architecture.png)

## 组件说明

- **Prometheus Server**: 
  - 收集和存储时间序列数据； 

- **Client Library**: 
  - 客户端库，目的在于为那些期望原生提供Instrumentation功能的应用程序提供便捷的开发途径；
  - 客户端库，为需要监控的服务生成相应的 metrics 并暴露给 Prometheus server。当 Prometheus server 来 pull 时，直接返回实时状态的 metrics。

- **Push Gateway**: 
  - 接收那些通常由短期作业生成的指标数据的网关，并支持由Prometheus  Server进行指标拉取操作；
  - 主要用于短期的 jobs。由于这类 jobs 存在时间较短，可能在 Prometheus 来 pull 之前就消失了。为此，这次 jobs 可以直接向 Prometheus server 端推送它们的 metrics。这种方式主要用于服务层面的 metrics，对于机器层面的 metrices，需要使用 node exporter。

- **Exporters**: 
  - 用于暴露已有的第三方服务的 metrics 给 Prometheus。
- **Alertmanager**: 
  - 从Prometheus Server接收到“告警通知”后，通过去重、分组、路由等预处 理功能后以高效向用户完成告警信息发送；

- **Data Visualization**：
  - Prometheus Web UI （Prometheus Server内建），及Grafana等； 

- **Service Discovery**：
  - 动态发现待监控的Target，从而完成监控配置的重要组件，在容器化环境中尤为有用；
  - 该组件目前由Prometheus Server内建支持；


## 工作流程

1. Prometheus server 定期从配置好的 jobs 或者 exporters 中拉 metrics，或者接收来自Pushgateway 发过来的 metrics，或者从其他的 Prometheus server 中拉 metrics。
2. Prometheus server 在本地存储收集到的 metrics，并运行已定义好的 alert.rules，记录新的时间序列或者向 Alertmanager 推送警报。
3. Alertmanager 根据配置文件，对接收到的警报进行处理，发出告警。在图形界面中，可视化采集数据。





# Prometheus 数据模型

Prometheus 中存储的数据为时间序列，是由 metric 的名字和一系列的标签（键值对）唯一标识的，不同的标签则代表不同的时间序列。

- **metric 名字：**
  - 该名字应该具有语义，一般用于表示 metric 的功能，例如：http_requests_ total, 表示 http 请求的总数。
  - metric 名字由 ASCII 字符，数字，下划线，以及冒号组成，且必须满足正则表达式 \[a-zA-Z:][a-zA-Z0-9:]*。
- **标签：**
  - 使同一个时间序列有了不同维度的识别。例如 http_requests_total{method="Get"} 表示所有 http 请求中的 Get 请求。当 method="post" 时，则为新的一个 metric。
  - 标签中的键由 ASCII 字符，数字，以及下划线组成，且必须满足正则表达式 \[a-zA-Z:][a-zA-Z0-9:]*。
- **样本：**
  - 实际的时间序列，每个序列包括一个 float64 的值和一个毫秒级的时间戳。
- **格式:**
  - `<metric_name>{<label_name>=<label_value>,...}`
  - 例如：`http_requests_total{method="POST",endpoint="/api/tracks"}`
    - 表示指标名为 http_requests_total 的指标，方法为POST，并且请求的URI为/api/tracks







# Prometheus 数据采集流程

**服务发现 --> 配置 --> relabel_configs（target重新打标） --> 抓取 -->  metric_relabel_configs（metric重新打标） --> TSDB**

下面是每个阶段的含义：

1. **服务发现：** Prometheus 使用服务发现机制来动态地发现和识别监控目标（通常是应用程序、服务或实例）。服务发现可以通过多种方式实现，如 Kubernetes 服务发现、Consul 服务发现、EC2 标签查询等。服务发现的目的是将要监控的目标列入 Prometheus 的监控范围。

2. **配置：** 在配置阶段，你需要定义抓取配置，即告诉 Prometheus 如何定期从监控目标收集指标数据。这包括指定抓取的频率、目标的地址、端口等信息。配置还可以包括 `relabel_configs`，这是一组规则，用于在抓取之前修改目标标签，以满足特定的监控需求。这一阶段主要是为了确定 Prometheus 如何与监控目标建立连接。

3. **relabel_configs（目标重新打标）：** 在 `relabel_configs` 阶段，Prometheus 可以修改或过滤掉目标的标签。这些操作可能包括修改实例标签、添加额外的标签、删除不需要的标签等。这一阶段的目的是在数据采集之前，对目标进行标签的动态调整。

4. **抓取：** 在抓取阶段，Prometheus 根据配置定期从监控目标获取指标数据。这是实际采集数据的阶段，Prometheus 将监控目标返回的指标数据存储在本地内存中，以备后续处理。

5. **metric_relabel_configs（指标重新打标）：** 在 `metric_relabel_configs` 阶段，Prometheus 可以对抓取到的每个样本进行修改。这包括修改样本的标签或值，以满足更具体的需求。这一阶段的目的是在将数据存储到时间序列数据库之前，对样本数据进行灵活的调整。

6. **TSDB：** 最终，处理过的指标数据被存储在 Prometheus 的时间序列数据库（TSDB）中。这是一个高效的、持久的存储，Prometheus 可以在查询时从中检索并分析历史数据。

总体而言，这个流程描述了 Prometheus 如何从服务发现到最终存储在时间序列数据库中的过程，其中包括对目标和指标数据的多个阶段的处理和调整。这种流程使得 Prometheus 能够灵活适应不同的监控场景和需求。





# Prometheus 存储

![prome-storage](C:/Users/xiang/Desktop/Work_Notes/监控/Prometheus/Prometheus-images/prome-storage.jpg)

## t.v

- 传入的时序数据



## Head

Head块是数据库位于内存中的部分

- 传入的样本（t,v）首先会进入Head，并在内存中停留一会儿，然后即会被刷写到磁盘并映射进内存中（M-map）；
- 当这些内存映射的块或内存中的块老化到一定程度时，它会将作为持久块刷写到磁盘；
- 随着它们的老化进程，将合并更多的块，最在超过保留期限后被删除；



## Block

Block（灰色块）是磁盘上不 可更改的持久块

- Prometheus TSDB 写入的数据会每间隔2小时存储为一个单独的block，期间数据的写入量可能并不是固定值，因此block的大小并不固定；

- block会进行压缩、合并历史数据块，随着压缩合并，其block数量会减少；

- 每个block都有单独的目录，通常存放在 `$prometheus-base/data/` 目录下类似`01GEHBKA6XDP18R9J3ADDT1JCH`命名的目录内，里面包含该时间窗口内所有的chunk、index、 tombstones、meta.json

  - ```sh
    /monitor/prometheus/data/01GEHBKA6XDP18R9J3ADDT1JCH/
    ├── chunks # 用于保存时序数据，每个chunk的大小为512MB，超出该大小时则截断并创建为另一个Chunk；各Chunk以数字编号；
    │   └── 000001
    ├── index # 索引文件，它是Prometheus TSDB实现高效查询的基础；我们甚至可以通过Metrics Name和Labels查找时间序列数据在chunk文件中的位置；索引文件会将指标名称和标签索引到样本数据的时间序列中；
    ├── meta.json # block的元数据信息，这些元数据信息是block的合并、删除等操作的基础依赖；
    └── tombstones # 用于对数据进行软删除，即“标记删除”，以降低删除操作的成本；删除的记录并保存于tombstones文件中，而读取时间序列上的数据时，会基于tombstones进行过滤已经删除的部分；
    ```



## WAL

Write-Ahead Logging 预写日志，用于辅助完成持久写入

- 类似MySQL中的事务日志

- WAL是数据库中发生的事件的顺序日志，在写入/修改/删除数据库中的数据之前 ，首先将事件记录（附加）到WAL中，然后在数据库中执行必要的操作；

- WAL的关键点在于，用于帮助TSDB先写日志，再写磁盘上的Block； 

- WAL被分割为默认为128MB大小的文件段，它们都位于WAL目录下；

  - ```sh
    /monitor/prometheus/data/wal/
    ├── 00000010
    ├── 00000011
    ├── 00000012
    ...
    └── checkpoint.00000009
        └── 00000000
    ```

- 使用WAL技术可以方便地进行圆润、重试等操作；

- WAL日志的数量及截断的位置则保存于checkpoint文件中，该文件的内容要同步写入磁盘，以确保其可靠性；

  - ```sh
    /monitor/prometheus/data/wal/
    ...
    └── checkpoint.00000009
        └── 00000000
    ```



## Prometheus 存储配置参数

```sh
--storage.tsdb.path # 数据存储路径，WAL日志亦会存储于该目录下，默认为 $prometheus-base/data

--storage.tsdb.retention.time # 样本数据在存储中保存的时长，超过该时长的数据就会被删除；默认为15d；

--storage.tsdb.retention.size # 每个Block的最大字节数（不包括WAL文件），支持B、KB、MB、GB、TB、PB和EB，例如512MB等；

--storage.tsdb.wal-compression # 是否启用WAL的压缩机制，2.20及以后的版本中默认即为启用；
```





## Prometheus 存储容量规划

- **needed_disk_space = retention_time_seconds * ingested_samples_per_second * bytes_per_sample**



## Prometheus远程存储

- Prometheus可通过基于gRPC的适配器对接到远程存储

- 适配器主要处理“读”和“写”两种数据操作，它们可分别通过不同的URL完成







