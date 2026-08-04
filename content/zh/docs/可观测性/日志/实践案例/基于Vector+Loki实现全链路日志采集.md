---
title: "基于Vector+Loki实现全链路日志采集"
---

## X、环境概述
拓扑图

### 应用版本
| 服务   | CHART VERSION | APP VERSION            |
| ------ | ------------- | ---------------------- |
| vector | 0.35.3        | 0.40.2-distroless-libc |
| loki   | 6.25.1        | 3.3.2                  |


## X、部署 Loki
- https://grafana.com/docs/loki/latest/setup/install/helm/install-scalable/
### 先决条件
- 准备对象存储

### 导出 loki values 文件
```sh
helm repo add grafana https://grafana.github.io/helm-charts

helm repo update

helm pull grafana/loki --version 6.25.1

helm show values grafana/loki --version 6.25.1 > values-loki-6.25.1.yaml
```

### 准备 htpasswd Secret
- 用于为 Loki gateway（NGINX 反向代理）启用 Basic Authentication，以保护 Loki 的写入/查询接口，防止任何人随意推送日志。
```sh
apt install apache2-utils

# 生成加密文件
htpasswd -c -B .htpasswd vector-user # 会提示输入密码，比如 P@ssw0rd

# 在 Kubernetes 的 monitoring namespace 创建 Secret
kubectl create secret generic loki-gateway-auth \
  --from-file=.htpasswd \
  -n monitoring
```

### 修改 values 文件
- 核心修改内容：
```yaml
...
deploymentMode: SimpleScalable # 部署模式
...
global:
  # 修改为集群实际域名
  clusterDomain: "cluster.local"
  dnsService: "coredns"
  dnsNamespace: "kube-system"
...
  storage:
    # 以下 bucket 需手动创建
    bucketNames:
      chunks: loki-chunks
      ruler: loki-ruler
      admin: loki-admin
    type: s3
    s3:
      endpoint: http://minio.minio.svc.cluster.local:9000 # minio或其他对象存储访问路径
      s3ForcePathStyle: true # 兼容s3风格
      insecure: true # 信任http
      accessKeyId: xxxxxxxxx
      secretAccessKey: xxxxxxxxxxxxxxxxxxxxxxxxxxxx
...
# Configuration for the gateway（通过 gateway 向 loki 写入/查询数据）
gateway:
  enabled: true
  replicas: 1
...
  basicAuth:
    enabled: true
    existingSecret: "loki-gateway-auth" # 更改为手动创建的 Secret
...
```

### 部署
- 修改完 values 文件后，部署：
```sh
helm upgrade --install loki ./loki-6.25.1.tgz \
  --version 6.25.1 \
  --namespace monitoring \
  --create-namespace \
  -f values-loki-6.25.1.yaml --debug
```

### 验证部署结果
- 以下请求仅限于为设置验证常见，如 Basic Authentication，需在curl命令中指定用户名和密码。
```sh
# 确认所有 Pod 处于 Running 状态
kubectl get pod -n monitoring | grep loki


# 测试日志写入，返回 204 状态码则表示日志写入成功
curl -v -H "Content-Type: application/json" \
  -H "X-Scope-OrgID: Prod" \
  -u "vector-user:P@ssw0rd" \
  -s -X POST "http://$(kubectl get svc -n monitoring | grep loki-gateway | awk '{print $3}')/loki/api/v1/push" \
  --data-raw '{"streams": [{ "stream": { "job": "test", "foo": "bar" }, "values": [ [ "'"$(date +%s%N)"'", "TestLog" ] ] }]}'


# 测试日志查询
curl -G -s "http://$(kubectl get svc -n monitoring | grep loki-gateway | awk '{print $3}')/loki/api/v1/query_range" \
  -H "X-Scope-OrgID: Prod" \
  -u "vector-user:P@ssw0rd" \
  --data-urlencode 'query={job="test"}' | jq '.data.result'


# 查询有哪些 label
curl -G -s -H "X-Scope-OrgID: Prod" \
  -u "vector-user:P@ssw0rd" \
  "http://$(kubectl get svc -n monitoring | grep loki-gateway | awk '{print $3}')/loki/api/v1/labels" | jq


# 查询 label 对应的 value（这里的 job 是 label 名称，可替换成其他 label）
curl -G -s -H "X-Scope-OrgID: Prod" \
  -u "vector-user:P@ssw0rd" \
  "http://$(kubectl get svc -n monitoring | grep loki-gateway | awk '{print $3}')/loki/api/v1/label/job/values" | jq
```



---

## X、采集 K8s 日志
- 采集并推送 K8s Pod 中容器的日志
### 创建 Basic Authentication Secret
- 用于 Vector 向 loki-gateway 发送日志，账号密码需与 loki-gateway 的 .htpasswd 文件一致
```sh
kubectl create secret generic vector-loki-auth \
  --from-literal=username="vector-user" \
  --from-literal=password="P@ssw0rd" \
  -n monitoring
```
### 导出 vector values 文件

```sh
helm repo add vector https://helm.vector.dev

helm repo update

helm pull vector/vector --version 0.35.3

helm show values vector/vector --version 0.35.3 > values-vector-0.35.3.yaml
```

### 修改 values 文件
- 核心修改内容：
```yaml
...
# 修改为 Agent 模式
role: "Agent"
...

# 引用自建 secret
extraVolumes:
  - name: loki-auth
    secret:
      secretName: vector-loki-auth
extraVolumeMounts:
  - name: loki-auth
    mountPath: /etc/vector/loki-auth
    readOnly: true

...

# 修改配置文件
customConfig:
  # Vector 的 API 配置部分
  # 用于启用 Vector 的内置 GraphQL API 服务器，便于监控和调试（如使用 vector top 命令）
  api:
    address: 127.0.0.1:8686  # API 监听地址和端口，仅本地访问
    enabled: true            # 启用 API
    playground: false        # 禁用 GraphQL Playground（图形化交互界面）
  
  # Vector 的数据目录
  # 用于存储检查点（checkpoint）、磁盘缓冲区等状态数据
  # Vector 需要对此目录有读写权限
  data_dir: /vector-data-dir
  
  # 数据源（sources）配置
  sources:
    k8s_logs:
      type: kubernetes_logs  # 类型：从 Kubernetes 节点收集 Pod 日志
  
      # 自动合并因 Docker 16KB 限制而拆分的日志行（多行日志合并）
      auto_partial_merge: true
  
      # Pod 删除后，继续读取其日志文件的延迟时间（毫秒），防止日志丢失
      delay_deletion_ms: 300000  # 5 分钟
  
      # 排除某些路径的日志文件（glob 模式）
      exclude_paths_glob_patterns:
        - '**/*.gz'   # 排除压缩文件
        - '**/*.tmp'  # 排除临时文件
  
      # 额外 Pod 标签选择器：排除带有 vector.dev/exclude=true 的 Pod（在默认排除基础上）
      extra_label_selector: vector.dev/exclude!=true
  
      # 额外 Namespace 标签选择器：排除 kube-system 命名空间，以及带有 vector.dev/exclude=true 的 Namespace
      extra_namespace_label_selector: vector.dev/exclude!=true,kubernetes.io/metadata.name!=kube-system
  
      # 文件发现的最小冷却时间（毫秒），避免频繁扫描
      glob_minimum_cooldown_ms: 30000  # 30 秒
  
      # 忽略修改时间超过指定秒数的旧文件（防止读取历史日志）
      ignore_older_secs: 3600  # 1 小时
  
      # 要收集的日志文件路径（glob 模式），标准 Kubernetes Pod 日志路径
      include_paths_glob_patterns:
        - /var/log/pods/*/*/*.log
  
      # 添加摄入时间戳字段到事件中
      ingestion_timestamp_field: .ingest_timestamp
  
      # 单行日志最大字节数，超过会被截断或丢弃
      max_line_bytes: 1048576  # 1MB
  
      # 是否按旧日志优先读取（false 表示从最新开始，更适合实时收集）
      oldest_first: false
  
      # 自动为日志事件添加 Kubernetes 元数据字段（如 pod_name、namespace 等）
      pod_annotation_fields:
        container_image: .kubernetes.container_image
        container_name: .kubernetes.container_name
        pod_labels: .kubernetes.pod_labels
        pod_name: .kubernetes.pod_name
        pod_namespace: .kubernetes.pod_namespace
        pod_node_name: .kubernetes.pod_node_name
  
      # 从文件末尾开始读取（tail -f 模式），适合实时日志收集
      read_from: end
  
      # 使用 Kubernetes API Server 缓存来优化元数据获取（减少 API 调用）
      use_apiserver_cache: true
  
  # 数据输出（sinks）配置
  sinks:
    loki_push:
      type: loki  # 类型：推送日志到 Grafana Loki
  
      # 多租户 ID（Loki 的 tenant_id，用于多租户隔离）
      tenant_id: "Prod"

      # basic 认证（引用自建 secret）
      auth:
        strategy: basic
        user: '{{ "{{ file \"/etc/vector/loki-auth/username\" }}" }}'
        password: '{{ "{{ file \"/etc/vector/loki-auth/password\" }}" }}'


      # 输入来源：来自 k8s_logs source
      inputs:
        - k8s_logs
  
      # Loki 的推送端点（通常是 Loki 的 gateway 或 distributor）
      endpoint: http://loki-gateway.monitoring.svc.cluster.local:80
  
      # 编码格式：将事件编码为 JSON 发送
      encoding:
        codec: json
  
      # Loki 流标签（labels），用于查询和分组，支持 Vector 模板语法
      labels:
        namespace: '{{ "{{ kubernetes.pod_namespace }}" }}'  # Pod 命名空间
        pod: '{{ "{{ kubernetes.pod_name }}" }}'            # Pod 名称
        container: '{{ "{{ kubernetes.container_name }}" }}'  # 容器名称
        node: '{{ "{{ kubernetes.pod_node_name }}" }}'      # 节点名称
        job: kubernetes-pods                                # 固定标签，便于查询
  
      # 无序事件处理：Loki 不支持乱序插入，直接丢弃乱序日志
      out_of_order_action: drop
  
      # 如果标签键与事件字段冲突，移除事件中的这些字段（避免重复）
      remove_label_fields: true
  
      # 不发送事件原有的 timestamp 字段（Loki 会使用推送时间或元数据）
      remove_timestamp: true
  
      # 请求相关配置
      request:
        # 驱逐策略：缓冲区满时丢弃最新事件
        eviction_policy:
          strategy: drop_newest
  
        # 缓冲区配置：使用磁盘缓冲，最大 1GB，满时阻塞（等待空间）
        buffer:
          type: disk
          max_size: 1073741824  # 1GB
          when_full: block
  
      # 健康检查：启动时检查 Loki 端点是否可用
      healthcheck:
        enabled: true
...
```


### 部署
- 修改完 values 文件后，部署：
```sh
helm upgrade --install vector ./vector-0.35.3.tgz \
  --version 0.35.3 \
  --namespace monitoring \
  --create-namespace \
  -f values-vector-0.35.3.yaml
```

### 验证
```sh
# 查询有哪些 label
curl -G -s -H "X-Scope-OrgID: Prod" \
  "http://$(kubectl get svc -n monitoring | grep loki-gateway | awk '{print $3}')/loki/api/v1/labels" | jq


# 查询 label 对应的 value（这里的 job 是 label 名称，可替换成其他 label）
curl -G -s -H "X-Scope-OrgID: Prod" \
  "http://$(kubectl get svc -n monitoring | grep loki-gateway | awk '{print $3}')/loki/api/v1/label/job/values" | jq

# 测试日志查询
curl -G -s "http://$(kubectl get svc -n monitoring | grep loki-gateway | awk '{print $3}')/loki/api/v1/query_range" \
  -H "X-Scope-OrgID: Prod" \
  --data-urlencode 'query={job="test"}' | jq '.data.result'
```



## X、采集 docker-compose 日志
- 采集并推送 docker-compose 运行的容器日志
- https://vector.dev/docs/reference/configuration/sources/docker_logs
- 租户 ID 同样使用 Prod，这样可以在一个 Grafana 面板中通过不同 job 来筛选不同环境的日志。
### 安装 vector
```sh
# 下载并解压安装包
mkdir -p vector && \
  curl -sSfL --proto '=https' --tlsv1.2 https://packages.timber.io/vector/0.40.2/vector-0.40.2-x86_64-unknown-linux-musl.tar.gz  | \
  tar xzf - -C vector --strip-components=2


# 安装
useradd --system --user-group --no-create-home --shell /usr/sbin/nologin vector
mkdir -p /var/lib/vector/
chown -R vector:vector /var/lib/vector
cp vector/bin/vector /usr/bin/
cp vector/etc/systemd/vector.default /etc/default/vector
cp vector/etc/systemd/vector.service /etc/systemd/system
mkdir -p /etc/vector
cp vector/config/vector.yaml /etc/vector/
systemctl daemon-reload

# 重要：将 vector 用户添加到 docker 组，否则将没有权限访问 /var/run/docker.sock
usermod -aG docker vector

# 启动
systemctl enable --now vector.service
```
### 修改配置文件
- config/vector.yaml
- Vector 的 docker_logs source 通过 Docker API 直接采集容器 stdout/stderr 日志（默认 json-file 或 local logging driver），自动添加丰富元数据（如 container_id、container_name、image_name、label、stream 等），便于后续过滤、解析和路由。
```yaml
...
```
### 运行并验证


## X、采集文件系统日志

---

## X、遇到的坑
### Grafana 中添加 Loki 数据源时报错
点击 Save & test 后报错`Unable to connect with Loki. Please check the server logs for more details.`

**解决方案：**
- 在 HTTP headers（Pass along additional context and metadata about the request/response）处点击 Add header
    - Header 填 `X-Scope-OrgID`
    - Value 填任意值（例如 anonymous）后 Save & test

**为什么必须加 X-Scope-OrgID？**
- Loki 从 2.0 版本开始默认启用了**多租户（multi-tenancy）**模式，即使你只部署了一个 Loki 实例，也会强制要求每条请求都带上一个“租户 ID”（tenant ID），用来区分不同用户/项目/命名空间的日志。
    - 这个租户 ID 就是通过 HTTP Header X-Scope-OrgID 传递的。
    - 如果你不带这个 Header，Loki 会返回 401 Unauthorized 或直接拒绝连接。
    - 如果你带了（哪怕值是随便填的），Loki 就认为这是“单租户模式”下的请求，允许你正常读写。

**参考链接：**
- Loki 官方文档 - 多租户模式（Multi-tenancy）：https://grafana.com/docs/loki/latest/operations/multi-tenancy/
- Loki 官方文档 - 配置 auth_enabled：https://grafana.com/docs/loki/latest/configuration/#auth_enabled

---

### 通过 Helm 更新 Vector 配置文件时报错
配置文件与报错内容：
```yaml
# cat values-vector-0.35.3.yaml
...
customConfig:
...
  sinks:
    loki_push:
        type: loki
        inputs:
          - k8s_logs
        endpoint: http://loki-write.monitoring.svc.cluster.local:3100
        encoding:
          codec: json
        labels:
          namespace: "{{ kubernetes.pod_namespace }}"
          pod: "{{ kubernetes.pod_name }}"
          container: "{{ kubernetes.container_name }}"
          node: "{{ kubernetes.pod_node_name }}"
          stream: "{{ kubernetes.container_name }}"
...

# helm upgrade --install vector ./vector-0.35.3.tgz --namespace monitoring --create-namespace -f values-vector-0.35.3.yaml
Error: UPGRADE FAILED: template: vector/templates/daemonset.yaml:30:28: executing "vector/templates/daemonset.yaml" at <include (print $.Template.BasePath "/configmap.yaml") .>: error calling include: template: vector/templates/configmap.yaml:11:3: executing "vector/templates/configmap.yaml" at <tpl (toYaml .Values.customConfig) .>: error calling tpl: error during tpl function execution for "api:\n address: 127.0.0.1:8686\n enabled: true\n playground: false\ndata_dir: /vector-data-dir\nsinks:\n loki_push:\n encoding:\n codec: json\n endpoint: http://loki-write.monitoring.svc.cluster.local:3100\n healthcheck:\n enabled: true\n inputs:\n - k8s_logs\n labels:\n container: '{{ kubernetes.container_name }}'\n namespace: '{{ kubernetes.pod_namespace }}'\n node: '{{ kubernetes.pod_node_name }}'\n pod: '{{ kubernetes.pod_name }}'\n stream: '{{ kubernetes.container_name }}'\n out_of_order_action: drop\n remove_label_fields: true\n remove_timestamp: true\n request:\n buffer:\n max_size: 1073741824\n type: disk\n when_full: block\n eviction_policy:\n strategy: drop_newest\n type: loki\nsources:\n k8s_logs:\n auto_partial_merge: true\n delay_deletion_ms: 300000\n exclude_paths_glob_patterns:\n - '**/*.gz'\n - '**/*.tmp'\n extra_label_selector: vector.dev/exclude!=true\n extra_namespace_label_selector: vector.dev/exclude!=true,kubernetes.io/metadata.name!=kube-system\n glob_minimum_cooldown_ms: 30000\n ignore_older_secs: 3600\n include_paths_glob_patterns:\n - /var/log/pods/*/*/*.log\n ingestion_timestamp_field: .ingest_timestamp\n max_line_bytes: 1048576\n oldest_first: false\n pod_annotation_fields:\n container_image: .kubernetes.container_image\n container_name: .kubernetes.container_name\n pod_labels: .kubernetes.pod_labels\n pod_name: .kubernetes.pod_name\n pod_namespace: .kubernetes.pod_namespace\n pod_node_name: .kubernetes.pod_node_name\n read_from: end\n type: kubernetes_logs\n use_apiserver_cache: true": parse error at (vector/templates/daemonset.yaml:16): function "kubernetes" not defined
```
- 因为在 values-vector-0.35.3.yaml 里直接写了 "{{ kubernetes.pod_name }}" 等内容，Helm 在渲染 customConfig 的时候会先尝试对整个 YAML 字符串做 tpl 处理，它把 {{ kubernetes.xxx }} 当成了 Helm/Go template 的函数调用，而 Helm 根本没有叫 kubernetes 的函数，所以直接炸了。

解决方案：对 Vector 模板变量进行转义
- 把 customConfig 中所有 Vector 需要用到的 {{ xxxx }} 改成 Helm 不解析、但渲染后会变成 Vector 能识别的写法。
```yaml
...
sinks:
    loki_push:
      type: loki
      inputs:
        - k8s_logs
      endpoint: http://loki-write.monitoring.svc.cluster.local:3100
      encoding:
        codec: json
      labels:
        # 用 {{ "{{ xxxx }}" }}（两层大括号）来转义 Vector 的模板变量Helm 渲染后会变成 {{ kubernetes.pod_name }}，这正是 Vector 能识别的语法。
        namespace:  '{{ "{{ kubernetes.pod_namespace }}" }}' 
        pod:        '{{ "{{ kubernetes.pod_name }}" }}'
        container:  '{{ "{{ kubernetes.container_name }}" }}'
        node:       '{{ "{{ kubernetes.pod_node_name }}" }}'
...
```

---

### Vector 向 loki-gateway（loki-write） 写日志时报 401
- 当 loki 处于多租户模式下时，需要在 Vector 配置文件中指定 tenant_id；
- 该配置相当于在 grafana 添加数据源时定义的`X-Scope-OrgID` Header 与 Value。
- 参考链接：https://vector.dev/docs/reference/configuration/sinks/loki/#tenant_id

---

### loki-gateway 无法解析域名
loki-gateway 关键日志片段（could not be resolved）：
```log
[error] 13#13: *91364 loki-read.monitoring.svc.cluster.local could not be resolved (110: Operation timed out), client: r: , request: "GET /loki/api/v1/tail?query=%7Bstream%3D%22stdout%22%2Cpod%3D%22loki-canary-4ffch%22%7D+ HTTP/1.1", host: ring.svc.cluster.local.:80"
[error] 13#13: *91370 loki-read.monitoring.svc.cluster.local could not be resolved (110: Operation timed out), client: : , request: "GET /loki/api/v1/tail?query=%7Bstream%3D%22stdout%22%2Cpod%3D%22loki-canary-q8vwr%22%7D+ HTTP/1.1", host: ring.svc.cluster.local.:80"
[error] 13#13: *91377 loki-read.monitoring.svc.cluster.local could not be resolved (110: Operation timed out), client: : , request: "GET /loki/api/v1/tail?query=%7Bstream%3D%22stdout%22%2Cpod%3D%22loki-canary-zgc7l%22%7D+ HTTP/1.1", host: ring.svc.cluster.local.:80"
[error] 11#11: *89581 loki-write.monitoring.svc.cluster.local could not be resolved (110: Operation timed out), client: r: , request: "POST /loki/api/v1/push HTTP/1.1", host: "loki-gateway.monitoring.svc.cluster.local"
[error] 13#13: *89639 loki-write.monitoring.svc.cluster.local could not be resolved (110: Operation timed out), client: r: , request: "POST /loki/api/v1/push HTTP/1.1", host: "loki-gateway.monitoring.svc.cluster.local"
[error] 12#12: *91425 loki-read.monitoring.svc.cluster.local could not be resolved (110: Operation timed out), client: r: , request: "GET /loki/api/v1/tail?query=%7Bstream%3D%22stdout%22%2Cpod%3D%22loki-canary-4ffch%22%7D+ HTTP/1.1", host: ring.svc.cluster.local.:80"
[error] 12#12: *91430 loki-read.monitoring.svc.cluster.local could not be resolved (110: Operation timed out), client: : , request: "GET /loki/api/v1/tail?query=%7Bstream%3D%22stdout%22%2Cpod%3D%22loki-canary-q8vwr%22%7D+ HTTP/1.1", host: ring.svc.cluster.local.:80"
[error] 10#10: *89536 loki-write.monitoring.svc.cluster.local could not be resolved (110: Operation timed out), client: r: , request: "POST /loki/api/v1/push HTTP/1.1", host: "loki-gateway.monitoring.svc.cluster.local"
[error] 9#9: *91438 loki-read.monitoring.svc.cluster.local could not be resolved (110: Operation timed out), client: 10. request: "GET /loki/api/v1/tail?query=%7Bstream%3D%22stdout%22%2Cpod%3D%22loki-canary-zgc7l%22%7D+ HTTP/1.1", host: ring.svc.cluster.local.:80"
[error] 13#13: *89639 loki-write.monitoring.svc.cluster.local could not be resolved (110: Operation timed out), client: r: , request: "POST /loki/api/v1/push HTTP/1.1", host: "loki-gateway.monitoring.svc.cluster.local"
[error] 11#11: *89581 loki-write.monitoring.svc.cluster.local could not be resolved (110: Operation timed out), client: r: , request: "POST /loki/api/v1/push HTTP/1.1", host: "loki-gateway.monitoring.svc.cluster.local"
[error] 10#10: *91489 loki-read.monitoring.svc.cluster.local could not be resolved (110: Operation timed out), client: r: , request: "GET /loki/api/v1/tail?query=%7Bstream%3D%22stdout%22%2Cpod%3D%22loki-canary-4ffch%22%7D+ HTTP/1.1", host: ring.svc.cluster.local.:80"
[error] 10#10: *91492 loki-read.monitoring.svc.cluster.local could not be resolved (110: Operation timed out), client: : , request: "GET /loki/api/v1/tail?query=%7Bstream%3D%22stdout%22%2Cpod%3D%22loki-canary-q8vwr%22%7D+ HTTP/1.1", host: ring.svc.cluster.local.:80"
[error] 10#10: *91497 loki-read.monitoring.svc.cluster.local could not be resolved (110: Operation timed out), client: : , request: "GET /loki/api/v1/tail?query=%7Bstream%3D%22stdout%22%2Cpod%3D%22loki-canary-zgc7l%22%7D+ HTTP/1.1", host: ring.svc.cluster.local.:80"
[error] 10#10: *89536 loki-write.monitoring.svc.cluster.local could not be resolved (110: Operation timed out), client: r: , request: "POST /loki/api/v1/push HTTP/1.1", host: "loki-gateway.monitoring.svc.cluster.local"
[error] 13#13: *89639 loki-write.monitoring.svc.cluster.local could not be resolved (110: Operation timed out), client: 10.233.89.150, server: , request: "POST /loki/api/v1/push HTTP/1.1", host: "loki-gateway.monitoring.svc.cluster.local"
```

根本原因（DNS server 指向错误）：
```sh
# values-loki-5.43.3.yaml 
global:
...
  clusterDomain: "cluster.local"
  dnsService: "kubernetes" # 指向错误
  dnsNamespace: "default" # 指向错误

# kubectl exec -n monitoring loki-gateway-784df669b9-ghx2g -- nginx -T
http {
...
  resolver kubernetes.default.svc.cluster.local.;
...
```

解决方案（修改解析域名）：
```yaml
# values-loki-5.43.3.yaml 
global:
...
  clusterDomain: "cluster.local"
  dnsService: "coredns" # 修改
  dnsNamespace: "kube-system" # 修改

# 更新 values 文件

# kubectl exec -n monitoring loki-gateway-86d95dbd48-vr966 -- nginx -T | grep resolver
  resolver coredns.kube-system.svc.cluster.local.;
```

---

### loki-backend 频繁崩溃
核心日志片段：
```sh
# kubectl logs -n monitoring loki-backend-0 loki | grep -i error | tail
table-name=loki_index_20434 msg="failed to open existing index file /var/loki/boltdb-shipper-cache/loki_index_20434/ntinuing without it to let the sync operation catch up" err="recovered from panic opening boltdb file: runtime error: invalid memory 
table-name=loki_index_20434 msg="failed to open existing index file /var/loki/boltdb-shipper-cache/loki_index_20434/ntinuing without it to let the sync operation catch up" err="recovered from panic opening boltdb file: invalid freelist page: 1, page 
table-name=loki_index_20434 msg="sync failed, retrying it" err="recovered from panic opening boltdb file: invalid freelist page: 0, page type is unknown<00>"
error creating index client
error initialising module: store
```

原因与解决方案：
- 旧版本（v2.9.4）对 corrupted boltdb 处理较差，即使删除 loki_index_xxxxx 相关 bucket，并重建 Pod 后问题依旧；
- 升级到 v3.3.2 版本后问题解决。