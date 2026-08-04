---
title: "Vector"
---

# Vector 概述
Vector 是 Datadog 推出的一款高性能、轻量级的日志采集代理（Agent）。

它的配置文件结构如下：
```yaml
# 全局配置
略

# 数据源（Sources）—— 从哪里采集数据
sources:
  apache_logs:
    type: file
    include:
      - /var/log/apache2/access.log
    read_from: beginning

  host_metrics:
    type: host_metrics
    scrape_interval_secs: 10

  demo_logs:
    type: demo_logs
    format: syslog
    interval: 1

# 数据转换（Transforms）—— 对数据进行解析、过滤、采样、重命名等
transforms:
  parse_apache:
    type: remap
    inputs: ["apache_logs"]
    source: |
      . = parse_apache_log!(.message, "combined")

  add_env:
    type: remap
    inputs: ["parse_apache"]
    source: |
      .environment = "production"
      .host = get_hostname!()

  sample_logs:
    type: sample
    inputs: ["add_env"]
    rate: 10   # 只保留 10% 的日志（用于生产降采样）

# 数据输出（Sinks）—— 把数据发到哪里去
sinks:
  clickhouse_logs:
    type: clickhouse
    inputs: ["sample_logs", "parse_apache"]
    endpoint: https://clickhouse.example.com:8443
    database: logs
    table: apache_access
    auth:
      strategy: basic
      user: vector
      password: "${CLICKHOUSE_PASSWORD}"
    compression: gzip
    batch:
      max_bytes: 10485760   # 10MB

  prometheus_exporter:
    type: prometheus_exporter
    inputs: ["host_metrics"]
    address: 0.0.0.0:9598

  console_debug:
    type: console
    inputs: ["add_env"]
    encoding: json
```


# 全局配置
```yaml
# ==================== Vector 全局配置 ====================

data_dir: "/var/lib/vector/"          # 【必须】Vector 运行时数据的存储目录
                                      # 用来存放 buffer 的磁盘缓存、检查点（checkpoints）、
                                      # internal metrics 的 SQLite 数据库等
                                      # 推荐使用独立的分区或磁盘，权限建议 0700
                                      # 默认值："/var/lib/vector"（Linux）或系统临时目录

api:                                  # 【可选】开启 Vector 内置的 HTTP API（用于健康检查、指标暴露、调试等）
  enabled: true                       # 是否开启 API 服务
  address: "0.0.0.0:8686"             # 监听地址和端口，默认 127.0.0.1:8686
  playground: true                    # 是否开启交互式 GraphQL Playground（调试用，生产建议关闭）

healthchecks:                         # 【可选】健康检查相关配置
  enabled: true                       # 是否启用 /health 端点返回 200（所有组件正常时）
  require_healthy: false              # 启动时如果有组件不健康是否直接退出（常用于容器编排）

log_level: "info"                     # 【可选】全局日志级别，可选：off, error, warn, info, debug, trace
                                      # 也可以通过环境变量 VECTOR_LOG 覆盖

# ------------------- 时区与时间处理 -------------------
time_zone: "UTC"                      # 【可选】事件时间戳解析/格式化使用的时区
                                      # 可选值：Local（本地时区）或 IANA 时区名（如 "Asia/Shanghai"）
                                      # 默认：Local

# ------------------- 内部指标相关 -------------------
internal_metrics:                     # 【可选】Vector 自带的 Prometheus 指标暴露配置
  enabled: true
  address: "0.0.0.0:9598"             # ＃指标暴露端口（与 api 不同端口）
  scrape_interval_secs: 5            # 指标采集间隔，默认 5s

# ------------------- Buffer（缓冲）全局默认 -------------------
buffer:                               # 【可选】当 sources/transforms/sinks 没有单独配置 buffer 时使用的默认值
  type: "memory"                      # 默认缓冲类型：memory | disk
  max_events: 500                     # memory 模式下最大事件数
  when_full: "block"                  # 缓冲满时的行为：block（阻塞） | drop_newest（丢弃最新）

# disk 缓冲示例（如果想全局默认用磁盘缓冲可以这样写）：
# buffer:
#   type: "disk"
#   max_size: 268435456               # 256MB（字节）
#   when_full: "block"

# ------------------- 其他高级全局配置 -------------------
graceful_shutdown_timeout_secs: 60    # 【可选】收到 SIGTERM 后最多等待多少秒让缓冲刷完，默认 60s

enrichment_tables:                    # 【可选】全局定义 enrichment tables（类似查找表），可在 transform 中引用
  file:
    ip_to_region:
      type: "file"
      file: "/etc/vector/enrichment/ip_to_region.csv"
      format: "csv"

# ------------------- 实验性/不常用 -------------------
# enterprise:                        # 如果你使用 Vector Enterprise 版才需要
#   enabled: true
#   api_key: "xxxxxx"

# ------------------- 结束 -------------------
# sources / transforms / sinks 放在这个配置文件的其他位置或单独文件
```

# 数据源（Sources）配置
https://vector.dev/docs/reference/configuration/sources/

**常见数据源类型：**
| 类型              | 用途                                   | 典型场景                             |
| ----------------- | -------------------------------------- | ------------------------------------ |
| kubernetes_logs   | 采集 Kubernetes 所有容器日志（推荐）   | K8s 集群日志采集（DaemonSet 模式）   |
| host_metrics      | 采集主机 CPU/内存/磁盘/网络/负载等指标 | 所有节点通用指标                     |
| internal_metrics  | Vector Agent 自身运行指标              | 监控 Vector 健康、吞吐、延迟         |
| file              | 通用文件日志采集                       | Nginx、Apache、自定义应用日志        |
| journald          | 采集 systemd-journal 日志              | Linux 系统服务日志                   |
| kafka             | 从 Kafka 消费日志或指标                | 日志中转管道、解耦架构               |
| vector            | Vector → Vector 之间传输（V2 协议）    | Edge → Central 多层采集架构          |
| syslog            | 接收传统 Syslog（UDP/TCP/TLS）         | 网络设备、防火墙、旧系统             |
| statsd            | 接收 StatsD 协议指标                   | 应用自定义指标                       |
| prometheus_scrape | 主动抓取 Prometheus Exporter           | Node Exporter、cAdvisor、Java JMX    |
| docker_logs       | 直接读取 Docker daemon 日志（旧版）    | 仍使用 Docker 而非 containerd 的环境 |
| splunk_hec        | 接收 Splunk HEC 协议日志               | 兼容旧 Splunk 转发器                 |

## Kubernetes logs

kubernetes_logs 源是 Vector 用于从 Kubernetes 节点采集容器日志的核心组件。它通过读取 /var/log/pods 下的 Pod 日志文件，并从 Kubernetes API 自动丰富元数据（如 Pod 名称、命名空间、标签等）。以下是一个完整的 YAML 配置代码块，涵盖所有主要参数。

参考文档：https://vector.dev/docs/reference/configuration/sources/kubernetes_logs/

```yaml
sources:
  k8s_logs:  # 源 ID，可自定义
    type: kubernetes_logs  # 必须指定为 kubernetes_logs 类型，用于 K8s 日志采集

    # 核心路径和文件处理
    include_paths_glob_patterns:  # 包含的日志文件路径模式（glob 语法），默认 ["**/*"]，建议自定义以匹配特定 Pod
      - "/var/log/pods/*/*/*.log"  # 示例：匹配所有 Pod 日志文件
    exclude_paths_glob_patterns:  # 排除的路径模式，默认 ["**/*.gz", "**/*.tmp"]，用于跳过压缩或临时文件
      - "**/*.gz"  # 排除 gzip 文件
      - "**/*.tmp"  # 排除临时文件
    fingerprint_lines: 1  # 生成文件指纹时读取的行数，默认 1，用于唯一标识日志文件，避免重复读取
    max_line_bytes: 32768  # 单行最大字节数（合并前），超过则丢弃，默认 32768（32KB），生产中可调至 1MB 以处理大日志
    max_merged_line_bytes: 1048576  # 合并部分行后的最大字节数，无默认（需手动设置），用于处理多行日志如栈追踪
    max_read_bytes: 2048  # 单文件读取最大字节数（非 oldest_first 模式），默认 2048，调高以提高吞吐但增加内存
    oldest_first: true  # 优先读取最旧文件，默认 true，适合顺序处理历史日志；设为 false 以平衡多文件读取
    read_from: beginning  # 从文件开头（beginning）或结尾（end）开始读取，默认 beginning，生产中用 end 以实时采集
    rotate_wait_secs: 9223372036854776000  # 日志文件轮转后保持打开句柄的时间（秒），默认极大值（无限制），设为 30 以快速释放资源
    glob_minimum_cooldown_ms: 60000  # 文件系统轮询间隔（ms），默认 60000（1 分钟），降低以检测快速轮转文件，但增加 CPU 开销
    ignore_older_secs: 86400  # 忽略超过此秒数的未修改文件，默认无，设为 86400（1 天）以跳过旧日志

    # 部分行合并（针对 K8s CRI 分割的多行日志）
    auto_partial_merge: true  # 自动合并部分事件，默认 true，启用以处理 JSON 或多行日志；设为 false 需用 transform 手动合并

    # Kubernetes 元数据丰富
    pod_annotation_fields:  # Pod 元数据字段映射，无默认，配置要富集的字段路径
      pod_name: ".kubernetes.pod_name"  # Pod 名称字段路径，默认如此，可设为 "" 禁用
      pod_namespace: ".kubernetes.pod_namespace"  # 命名空间字段
      pod_node_name: ".kubernetes.pod_node_name"  # 节点名称
      pod_uid: ".kubernetes.pod_uid"  # Pod UID
      pod_owner: ".kubernetes.pod_owner"  # Pod 所有者引用
      pod_ip: ".kubernetes.pod_ip"  # Pod IPv4 地址
      pod_ips: ".kubernetes.pod_ips"  # Pod IP 列表（IPv4/IPv6）
      container_name: ".kubernetes.container_name"  # 容器名称
      container_image: ".kubernetes.container_image"  # 容器镜像
      container_image_id: ".kubernetes.container_image_id"  # 容器镜像 ID
      container_id: ".kubernetes.container_id"  # 容器 ID
      pod_labels: ".kubernetes.pod_labels"  # Pod 标签
      pod_annotations: ".kubernetes.pod_annotations"  # Pod 注解
    namespace_annotation_fields:  # 命名空间元数据
      namespace_labels: ".kubernetes.namespace_labels"  # 命名空间标签
    node_annotation_fields:  # 节点元数据
      node_labels: ".kubernetes.node_labels"  # 节点标签

    # 过滤和选择器（使用 K8s Label/Field Selector 语法）
    extra_label_selector: "app!=vector"  # Pod 标签过滤器，默认无，示例：排除 app=vector 的 Pod
    extra_namespace_label_selector: "kubernetes.io/metadata.name!=kube-system"  # 命名空间标签过滤器，默认无，示例：排除系统命名空间
    extra_field_selector: "metadata.name!=exclude-pod"  # Pod 字段过滤器，默认无，示例：排除特定 Pod 名称

    # API 和缓存
    kube_config_file: ""  # kubeconfig 文件路径，默认空（使用 in-cluster 配置），集群外部署时指定
    use_apiserver_cache: false  # 启用 API 请求缓存，默认 false，生产中设为 true 以减少 API 负载
    delay_deletion_ms: 60000  # Pod 删除后延迟移除缓存（ms），默认 60000（1 分钟），用于捕获崩溃日志

    # 持久化和时间戳
    data_dir: "/var/lib/vector/state"  # 检查点目录，默认全局 data_dir，必须可写，用于恢复读取位置
    ingestion_timestamp_field: ".ingest_timestamp"  # 摄入时间戳字段，默认无，用于延迟追踪
    timezone: "local"  # 时区，默认 local，使用 IANA 如 "Asia/Shanghai"

    # 内部指标（可选）
    internal_metrics:  # 内部指标配置，默认无
      include_file_tag: false  # 在指标中包含 "file" 标签，默认 false，避免高基数
```

# 数据转换（Transforms）配置

**常见数据转换方式：**

| 类型         | 用途                                      | 关键配置示例                          |
| ------------ | ----------------------------------------- | ------------------------------------- |
| remap        | 最强大的 VRL（Vector Remap Language）转换 | source: '.status = to_int!(.status)'  |
| lua          | 写复杂 Lua 脚本                           | source: 自定义函数                    |
| filter       | 条件过滤                                  | condition: '.level == "error"'        |
| sample       | 采样（生产环境必备）                      | rate: 10（保留10%）                   |
| reduce       | 合并多条事件成一条（如会话化）            | expires: 30s, group_by: ["user_id"]   |
| json_parser  | 解析 JSON 日志                            | —                                     |
| regex_parser | 正则解析                                  | regex: '(?P<ip>\S+)'                  |
| add_fields   | 添加静态字段                              | fields.env: "prod"                    |
| anonymize    | 脱敏 IP、手机号等                         | fields: ["client_ip"], method: sha256 |

# 数据输出（Sinks）配置

https://vector.dev/docs/reference/configuration/sinks/

**常见数据输出目标：**

| 类型                    | 目标系统                       | 备注                           |
| ----------------------- | ------------------------------ | ------------------------------ |
| loki                    | Grafana Loki                   | 标签模型，成本最低，K8s 最常用 |
| clickhouse              | ClickHouse                     | 超高性能写入查询，推荐首选     |
| elasticsearch           | Elasticsearch / OpenSearch     | 传统搜索方案，生态最全         |
| kafka                   | Kafka                          | 日志中转管道，大厂标配         |
| aws_s3                  | AWS S3 / MinIO                 | 冷存储、归档、合规留存         |
| prometheus_remote_write | Prometheus/Cortex/Thanos/Mimir | 指标远程写入                   |
| datadog_logs            | Datadog                        | 直接发 Datadog，无需额外存储   |
| splunk_hec              | Splunk                         | HEC 方式接入                   |
| humio                   | Humio / ChaosSearch            | 新一代日志平台                 |
| console                 | 标准输出                       | 本地调试、测试必备             |

## loki
https://vector.dev/docs/reference/configuration/sinks/loki/

## console
- 可使用 `kubectl logs -f ds/vector -n monitoring` 查看输出
```yaml
sinks:
  # 方案A：最快最直观，直接打印到 Vector Pod 的 stdout
  console_pretty:
    type: console
    inputs: ["debug_parse"]
    encoding:
      codec: json
    target: stdout                  # 直接打到 pod 日志里

  # 方案B：想看得更舒服，用 text 格式（带颜色）
  console_text:
    type: console
    inputs: ["debug_parse"]
    encoding:
      codec: text                   # 纯文本，一行一条
    target: stdout
```

# vector top 命令
```sh
kubectl exec -n monitoring -it ds/vector -- vector top
```