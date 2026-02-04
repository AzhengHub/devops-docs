---
title: "Pod 容器相关配置"
---

## 最小的 Pod 配置文件

```yaml {filename="min-pod.yaml"}
apiVersion: v1           # 核心 API 组的版本。
kind: Pod                # 告诉 K8s 这是一个 Pod，而不是 Deployment 或 Service。
metadata:
  name: min-nginx        # Pod 的名字（在同一个 Namespace 下，这个名字必须唯一）。
spec:
  containers:            # 这是一个列表（注意前面的短横线 -），意味着一个 Pod 里可以跑多个容器。
  - name: nginx-c        # 容器的名字
    image: nginx:alpine  # 使用的镜像，如果不写版本号，默认会去拉取 latest，在生产环境中强烈不建议这样做。
```
- 其实也可以通过这个命令生成：`kubectl run my-pod --image=nginx:alpine --dry-run=client -o yaml > min-nginx.yaml`

---

## Pod 中运行多个容器（Sidecar 模式）
在一个 Pod 中运行多个容器（Sidecar 模式）是 K8s 的核心特性之一。这种模式下，**所有容器共享同一个网络命名空间（IP 和端口）以及存储卷**。

这里重点展示如何定义多个容器以及它们如何通过 `volumes` 共享数据：

```yaml {filename="multi-container-pod.yaml"}
apiVersion: v1
kind: Pod
metadata:
  name: multi-container-pod
spec:
  # 定义共享存储卷，这是多容器协作的基础
  volumes:
  - name: shared-data
    emptyDir: {}

  containers:
  # 容器 1：主应用容器 (Main Container)
  - name: app-container
    image: nginx:alpine
    volumeMounts:
    - name: shared-data
      mountPath: /usr/share/nginx/html # 挂载到 web 目录

  # 容器 2：辅助容器 (Sidecar Container)
  # 职责：例如每隔 5 秒生成一次数据，供主容器使用
  - name: sidecar-container
    image: alpine
    volumeMounts:
    - name: shared-data
      mountPath: /data                # 挂载到同一个卷
    command: ["/bin/sh"]
    args: ["-c", "while true; do date > /data/index.html; sleep 5; done"]

```

这两个容器通过 **共享卷（Shared Volume）** 实现了一个典型的“生产者-消费者”模型：
1. **`sidecar-container` (生产者)**：它运行一个简单的 Shell 循环，每隔 5 秒将当前的系统时间写入 `/data/index.html`。
2. **`app-container` (消费者)**：它是一个标准的 Nginx。因为它把 `/usr/share/nginx/html` 挂载到了同一个卷上，所以它会直接读取并展示 Sidecar 生成的那个文件。

**验证：**
```sh
# 创建 Pod
kubectl apply -f multi-container-pod.yaml


# 查看 Pod 状态，应该看到 READY 列显示 2/2，这表示 Pod 中的两个容器都已正常启动并运行。
kubectl get pod multi-container-pod


# 验证实时更新，隔几秒执行一次，将发现输出的时间在变
kubectl exec multi-container-pod -c app-container -- curl localhost:80

```

**Sidecar 这种多容器模式通常用于：**

* **日志采集**：主容器写日志到共享卷，Sidecar 容器（如 Filebeat 或 Categraf）从卷里读日志并推送到远端。
* **配置更新**：Sidecar 监听 Git 或配置中心的变化，更新共享卷里的配置文件，然后通知主容器重载。
* **Proxy/Adapter**：Sidecar 处理网络流量（如 Envoy），为主容器提供安全传输或协议转换。


---

## 镜像拉取策略
`imagePullPolicy`（镜像拉取策略）决定了节点上的 kubelet 何时尝试从镜像仓库下载镜像。

这是一个包含三种策略对比的 Pod 示例：

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: image-policy-demo
spec:
  containers:
  # 1. Always：无论本地是否有镜像，每次启动都必须拉取
  - name: always-policy
    image: nginx:latest
    imagePullPolicy: Always

  # 2. IfNotPresent：如果本地没有才拉取（SRE 生产环境最推荐，节省带宽）
  - name: if-not-present-policy
    image: nginx:1.21
    imagePullPolicy: IfNotPresent

  # 3. Never：只使用本地镜像，绝不尝试从远程仓库拉取
  - name: never-policy
    image: my-local-image:v1
    imagePullPolicy: Never

```


| 策略 | 行为说明 | 适用场景 |
| --- | --- | --- |
| **`Always`** | 每次启动 Pod 都会去仓库检查一次镜像的 Hash 值是否变动。 | 标签为 `latest` 或 `master` 的镜像，或者测试环境频繁更新镜像时。 |
| **`IfNotPresent`** | 只要节点本地已经有这个镜像了，就直接启动。 | **生产环境推荐**。能有效降低镜像仓库并发压力，缩短 Pod 启动速度。 |
| **`Never`** | 完全不联网。如果本地没有，Pod 会报 `ErrImageNeverPull`。 | 离线机房、预拉取好镜像的边缘计算环境，或调试本地构建的镜像。 |

**注意事项”**

1. **关于 `latest` 标签的默认行为**：如果在 YAML 中没有写 `imagePullPolicy`，但镜像标签是 `:latest`，K8s 会**默认**将其设为 `Always`。
2. **版本固定（Best Practice）**：在生产环境中，强烈建议使用具体的版本号（如 `v1.2.3`）并配合 `IfNotPresent`。这样既能保证一致性，又能获得最快的启动速度。
3. **安全性**：如果担心镜像被篡改，`Always` 可以确保即使本地有同名镜像，也会对比仓库里的最新校验和（Checksum）。

---

## 容器启动命令与参数
在 Kubernetes 中，`command` 和 `args` 对应 Docker 中的 `ENTRYPOINT` 和 `CMD`。作为 SRE，理解这两者的覆盖关系非常重要，因为很多时候我们需要在不重新构建镜像的情况下，临时修改启动参数（比如开启调试模式或修改配置文件路径）。

这是一个典型的在容器启动时执行 Shell 脚本并传入参数的例子：

```yaml {filename="command-demo.yaml"}
apiVersion: v1
kind: Pod
metadata:
  name: command-demo
spec:
  containers:
  - name: alpine-container
    image: alpine:3.18
    # 1. command：相当于 Docker 的 ENTRYPOINT
    # 如果不写，则运行镜像默认的程序
    command: ["/bin/sh", "-c"]
    
    # 2. args：相当于 Docker 的 CMD
    # 会作为参数传递给上面的 command
    args: 
    - |
      echo "Starting application..."
      sleep 10
      echo "Done."
```

**K8s 与 Docker 字段映射关系：**
| K8s 字段 | Docker 字段 | 描述 |
| --- | --- | --- |
| `command` | `ENTRYPOINT` | 容器启动时执行的可执行文件 |
| `args` | `CMD` | 传递给可执行文件的默认参数 |

**覆盖逻辑规则：**

* 如果只定义了 `command`，镜像默认的 `ENTRYPOINT` 和 `CMD` 都会被忽略。
* 如果只定义了 `args`，镜像默认的 `CMD` 会被覆盖，但会带上镜像默认的 `ENTRYPOINT` 运行。
* 如果两个都定义了，镜像默认的设置会全部失效，只运行定义的这两个。

**实用技巧：**
```sh
# 技巧 A：解决容器启动即退出的问题
# 有时候我们需要进入一个没有守护进程的容器进行调试，可以用这个“死循环”命令防止容器退出：
command: ["/bin/sh", "-c", "while true; do sleep 3600; done"]


# 技巧 B：使用环境变量作为参数
# 可以通过 $(VAR_NAME) 语法在参数中引用容器内定义的环境变量：
env:
- name: APP_PORT
  value: "8080"
containers:
- name: app
  image: my-app:v1
  command: ["/app/server"]
  args: ["--port", "$(APP_PORT)"] # 动态注入变量
```

---

## 容器环境变量
以下是一个涵盖了所有容器环境变量主流注入方式的综合示例：
```yaml {filename="env-demo.yaml"} 
apiVersion: v1
kind: Pod
metadata:
  name: env-demo-pod
spec:
  containers:
  - name: app-container
    image: nginx:alpine
    env:
      # 1. 直接定义键值对 (Static Value)
      - name: APP_REGION
        value: "china-east"

      # 2. 从 ConfigMap 中读取某个 Key (ConfigMap Ref)
      - name: LOG_LEVEL
        valueFrom:
          configMapKeyRef:
            name: app-config   # ConfigMap 的名字
            key: log_level     # ConfigMap 里的 Key

      # 3. 从 Secret 中读取加密信息 (Secret Ref)
      - name: DB_PASSWORD
        valueFrom:
          secretKeyRef:
            name: db-secret    # Secret 的名字
            key: password      # Secret 里的 Key

      # 4. 读取 Pod 自身的元数据 (Downward API)
      # 这在分布式系统中非常有用，比如应用需要知道自己的 Pod IP
      - name: MY_POD_IP
        valueFrom:
          fieldRef:
            fieldPath: status.podIP
      - name: MY_NODE_NAME
        valueFrom:
          fieldRef:
            fieldPath: spec.nodeName

    # 5. 批量注入 (envFrom)
    # 如果 ConfigMap 里有 50 个配置，不用一个个写，直接全部注入
    envFrom:
    - configMapRef:
        name: global-env-config

```

**环境变量注入方式对比：**

| 注入方式 | 适用场景 | SRE 建议 |
| --- | --- | --- |
| **直接定义 (`value`)** | 环境不敏感的常量（如时区） | 简单直观，但不灵活。 |
| **ConfigMap** | 业务配置、日志级别、连接字符串 | **推荐**。实现“一次构建，到处运行”。 |
| **Secret** | 数据库密码、Token、证书内容 | **强制**。严禁将明文密码直接写在 YAML 里。 |
| **Downward API** | 获取 Pod IP、Node 名、资源限制值 | 监控插件或服务发现必备。 |
| **envFrom (批量)** | 注入大量业务环境变量 | 保持 YAML 整洁，方便统一管理。 |


## 容器资源配额
在 SRE 的日常工作中，**资源配额** 是最重要的配置项之一。它直接决定了集群是否稳定，以及在资源紧张时谁会被“牺牲”。

```yaml {filename="resource-demo.yaml"}
apiVersion: v1
kind: Pod
metadata:
  name: resource-demo
spec:
  containers:
  - name: heavy-app
    image: nginx:alpine
    resources:
      # 1. Requests (需求量)：调度依据
      # 只有当 Node 的剩余资源大于这个值时，Pod 才能被调度上去
      requests:
        cpu: "250m"      # 250m = 0.25 核
        memory: "512Mi"  # Mi 代表兆字节 (1024进制)

      # 2. Limits (上限值)：运行限制
      # 限制容器在运行时能使用的资源最大值
      limits:
        cpu: "1000m"     # 1000m = 1 核
        memory: "1Gi"    # Gi 代表吉字节 (1024进制)

```

**注意事项：**
- CPU 是**可压缩资源**。当容器达到 `limits` 时，K8s 会通过 CPU 周期节流（Throttling）来限制它，应用会变慢，但**不会挂掉**。
- 内存是**不可压缩资源**。一旦容器使用的内存超过 `limits`，系统会立即触发 **OOM Kill** 杀掉该容器。

---

### Qos (服务质量) 与资源配额
在 K8s 中，QoS (Quality of Service，服务质量) 是系统用来管理容器资源分配和在资源紧张时进行“择优录取”或“驱逐”的一套机制。

简单来说，当集群资源不足（比如内存爆满）时，K8s 需要决定先“杀掉”哪个 Pod 来保全大局。QoS 等级就是它的参考标准。

K8s 根据 Pod 中容器对 CPU 和内存的 Requests (请求值) 和 Limits (限制值) 的配置情况，自动将 Pod 划分为以下三个等级，这三种等级在由于资源不足而驱逐 Pod 时，有不同的优先级（优先级从高到低）：
1. Guaranteed (完全保障型)：这是最高优先级的 Pod。系统会确保它获得所请求的资源，且除非系统本身崩溃，否则不会被轻易驱逐。
    - 配置条件：Pod 中所有容器的所有资源（CPU 和内存）都必须设置了 requests 和 limits。且每个资源的 requests 必须等于 limits。
    - 特点：极其稳定，就像“一等座”，只要火车还在开，的位子就是的。

2. Burstable (弹性伸缩型)：这是最常见的类型。Pod 至少有一个最低资源保障，但在系统空闲时可以“超载”使用更多资源。
    - 配置条件：`requests` 小于 `limits`。
    - 特点：像“二等座/无座”，有位子时能坐，没位子时可能得站着，甚至在资源极其匮乏时被请下车。

3. BestEffort (尽力型)：完全不写 `resources`。
    - 配置条件：Pod 中任何一个容器都没有设置 requests 或 limits。
    - 特点：像“挂票”，系统有富余资源就给用，一旦资源稍微紧张，这类 Pod 首当其冲会被第一个杀掉。

**总结对比表：**

| QoS 级别 | 配置策略 | 适用场景 | 优点 | 缺点 |
| --- | --- | --- | --- | --- |
| **Guaranteed**| **Requests == Limits** | 生产核心业务、数据库 | 极度稳定，不会被随机驱逐 | 资源利用率相对较低（存在浪费） |
| **Burstable** | **Requests < Limits** | 非核心业务、Web 应用 | 资源利用率高，支持波峰冲刺 | 可能因为宿主机压力大导致性能抖动 |
| **BestEffort** | **不写资源限制** | **禁止用于生产** | 编写简单 | 极度危险，可能导致整台服务器宕机 |
- 可以在 Namespace 上配置 `LimitRange`，强制要求所有 Pod 必须写 `resources`，否则拒绝创建。


**查看 Qos 等级**

```bash
# 查看单个 Pod 的 Qos 等级
kubectl describe pod <pod-name>| grep QoS

# 查看所有 Namespace 中的 Pod Qos 等级
kubectl get pods -A -o custom-columns="NAMESPACE:.metadata.namespace,NAME:.metadata.name,QOS:.status.qosClass"
```
---

## 容器生命周期
一个 Pod 完整的生命周期顺序如下：
1. **Init Containers 1**（启动 -> 运行 -> 成功退出）
2. **Init Containers 2**（...以此类推）
3. **主容器启动** 与 **PostStart 钩子** 同时触发。
4. **Startup Probe（启动探针）** 开始探测。
5. **Startup Probe 成功**，此探针永久退出。
6. **Liveness & Readiness Probe** 开始周期性探测。
7. （运行期间...）
8. **收到删除指令**，**PreStop 钩子** 触发。
9. **PreStop 完成**，发送 **SIGTERM** 信号给主进程。
10. **宽限期结束** 或 **进程退出**，容器销毁。

### 初始化容器
Init Container 是一种特殊的容器，它在 Pod 的主容器启动之前运行。

**核心特性：**
- **顺序执行**：如果定义了多个 Init Container，它们会按顺序**串行**运行。
- **阻塞启动**：只有当前一个 Init Container 成功退出（Exit Code 0），下一个才会开始。只有全部成功，主容器才会启动。
    - 但主容器是并行启动的，即无法控制启动的先后顺序。
- **独立镜像**：它可以拥有与主容器完全不同的镜像和工具（例如主容器只有运行时，Init 容器可以带 `curl`、`sed` 等工具）。

Init Container 配置示例：
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: init-demo
spec:
  # 1. 初始化容器段
  initContainers:
  - name: install-tool
    image: busybox:1.28
    command: ['wget', '-O', '/work-dir/index.html', 'http://info.cern.ch']
    volumeMounts:
    - name: workdir
      mountPath: /work-dir

  # 2. 主容器段
  containers:
  - name: main-app
    image: nginx:1.21
    volumeMounts:
    - name: workdir
      mountPath: /usr/share/nginx/html
  
  volumes:
  - name: workdir
    emptyDir: {}
```

初始化容器常见场景：
- **依赖等待**：比如应用启动前必须确保 MySQL 已经就绪。
    - *Init 容器逻辑*：`until nslookup mysql; do sleep 2; done;`
- **环境预处理**：主容器镜像为了安全通常是 `distroless`（无 shell）的，可以用 Init 容器去修改文件权限 (`chmod`) 或生成配置文件。
- **敏感信息处理**：在 Init 容器里解密证书，把明文存入 `emptyDir` 共享卷给主容器使用，这样主容器进程就不需要掌握解密密钥。 

### 健康检查探针
三种探针的综合配置示例：

```yaml {filename="probe-demo.yaml"}
apiVersion: v1
kind: Pod
metadata:
  name: probe-demo
spec:
  containers:
  - name: business-app
    image: nginx:1.21
    
    # -------------------------------------------------------
    # 1. 启动探针 (Startup Probe)
    # 作用：保护启动慢的应用。在它成功之前，其他探针都会被禁用。
    # -------------------------------------------------------
    startupProbe:
      httpGet:
        path: /api/startup
        port: 8080
      failureThreshold: 30     # 允许失败30次
      periodSeconds: 10        # 每10秒检查一次，总共给应用300秒启动时间

    # -------------------------------------------------------
    # 2. 就绪探针 (Readiness Probe)
    # 作用：决定流量是否接入。失败时，Pod 会从 Service 的 Endpoint 中移除。
    # -------------------------------------------------------
    readinessProbe:
      httpGet:
        path: /ready
        port: 8080
      initialDelaySeconds: 5   # 启动探针成功后，等待5秒开始检查
      periodSeconds: 10        # 检查频率
      successThreshold: 1      # 成功1次就算就绪
      failureThreshold: 3      # 连续失败3次移除流量

    # -------------------------------------------------------
    # 3. 存活探针 (Liveness Probe)
    # 作用：决定容器是否重启。失败时，K8s 会直接杀掉容器并按重启策略重启。
    # -------------------------------------------------------
    livenessProbe:
      tcpSocket:               # 也可以检查端口是否通
        port: 8080
      initialDelaySeconds: 15
      periodSeconds: 20

```

#### 检查方式
**HTTP GET**，向容器发 HTTP 请求（状态码 200-399 算成功）：
```yaml
      httpGet:
        path <string> # 访问 HTTP 服务的路径。默认值为 "/"。可以定义专用于检测的路径 但要注意后期更新镜像时此路径需存在 否则会因为探测不到而导致 Pod 无法正常运行
        port <string> -required- # 访问容器的端口号或者端口名，名称必须是IANA_SVC_NAME
        host <string> # 连接使用的主机名，默认是 Pod 的 IP。也可以在 HTTP 头中设置 “Host” 来代替。
        scheme <string> # 用于设置连接主机的方式（HTTP 还是 HTTPS）。默认是 "HTTP"。
        httpHeaders	<[]Object> # 请求中自定义的 HTTP 头。HTTP 头字段允许重复。
```
**TCP Socket**，只要端口能通就观测成功：
```yaml
      tcpSocket:
        port: 8080
```
**Exec 命令**，在容器内执行命令，退出码为 0 算成功： 
```yaml
  exec:
    command: ["cat", "/tmp/healthy"]
```

#### 检查顺序与成功失败动作
**第一关：Startup Probe（一次性探测）**：
- 优先级最高，成功后才会执行其他探针（Readiness 和 Liveness），失败了会重启容器；
- 这保证了启动慢的应用（比如 Java）不会因为还没初始化完就被 liveness 给误杀重启。

**第二关：Liveness & Readiness（并行执行 + 重复探测）**：
- Readiness Probe：成功后才会将 Pod 加入 Service Endpoint，失败了会将 Pod 从 Service Endpoint 中移除（停止发送流量）。确保用户不会访问到正在初始化或负载过高崩溃的页面。
- Liveness Probe：成功后才会认为容器“存活”，失败了会根据重启策略（如 `restartPolicy`）重启容器。用于解决应用死锁或无法自愈的僵死状态。

**时间线模拟：**
* **T = 0s**：容器启动。
* **T = 5s**：`startupProbe` 开始检查。
* **T = 30s**：`startupProbe` 终于成功（比如数据库连接初始化完成了）。
* **T = 31s**：`startupProbe` 功成身退。此时 `liveness` 和 `readiness` **同时启动**。
* **T = 35s**：`readiness` 成功。流量开始进入 Pod。
* **T = 60s**：应用突然 OOM 导致死锁。
  * `readiness` 失败：流量停止进入，用户看到 502（由其他副本处理）。
  * `liveness` 失败：K8s 发现死锁，直接杀掉进程，重启容器。
* **T = 重启后**：重新从第一关 `startupProbe` 开始。

---

#### 注意事项与最佳实践
1. **Readiness vs Liveness 区分**：如果数据库连不上了，应用应该 **Readiness 失败**（断开流量，等会儿可能好），而不是 **Liveness 失败**（疯狂重启应用并不能修好数据库，反而可能引发雪崩）。
2. **避免检查外部依赖**：探针脚本里**不要**去 `curl` 外部 API 或数据库。如果外部挂了，集群里成百上千个 Pod 同时重启/掉线，后果不堪设想。探针只应检查容器“自身”的状态。
3. **超时时间设置 (`timeoutSeconds`)**：默认是 1 秒。如果的接口响应较慢，一定要调大这个值，否则会因为超时导致误杀。
4. **接口解耦**：建议应用专门提供 `/healthz`、`/ready` 等轻量级接口，不要直接检查业务逻辑复杂的接口。
5. **探针的检查频率：**
    - 设置长周期的 `startupProbe`：针对启动慢的应用，给够失败次数（比如 30 次 * 10 秒），防止应用还没起来就被杀掉。
    - 设置敏感的 `readinessProbe`：频率高一点（比如 5 秒一次），一旦应用卡顿立即切断流量。
    - 设置保守的 `livenessProbe`：频率低一点（比如 20 秒一次），只要应用还能动，就不要轻易重启它。
> ⚠️ **注意**：如果没配置 `startupProbe`，那么 `liveness` 会在容器启动后的 `initialDelaySeconds` 秒后直接开始检查。如果应用启动时间超过了延迟时间，应用会陷入“启动 -> 被杀 -> 启动”的死循环。



### 启动后与停止前钩子
启动后与停止前钩子是实现“初始化配置”和“优雅停机”的终极武器。

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: lifecycle-demo
spec:
  # 优雅停机时间，给应用留出处理存量请求和关闭连接的时间，停止前钩子的执行时间不能超过这个值，否则会被强制终止。
  terminationGracePeriodSeconds: 30
  containers:
  - name: app-container
    image: nginx:1.21
    lifecycle:
      # 1. PostStart: 容器创建后立即执行
      postStart:
        exec:
          command: ["/bin/sh", "-c", "echo 'Container started' > /var/log/start.log"]

      # 2. PreStop: 容器终止前执行
      preStop:
        exec:
          # 场景：通知 Nginx 优雅退出，并等待 10 秒让存量请求处理完
          command: ["/bin/sh", "-c", "/usr/sbin/nginx -s quit; sleep 10"]
```

**PostStart 实现原理：**
- 执行时机：容器启动后立即执行，并和容器主进程 (ENTRYPOINT/CMD) 同时触发。
- 如果执行成功，执行启动探针（如有）。
- 如果执行失败：容器会被杀掉并根据 restartPolicy 重启。
- 注意事项：
    - 不要在里面跑太重的任务。如果它一直跑不完，容器状态会卡在 ContainerCreating。
    - postStart 钩子和容器主进程 (ENTRYPOINT/CMD) 是并行执行的，因此无法确定哪个先执行。
**PreStop 实现原理：**
- 执行时机：当 Pod 收到删除指令（如 kubectl delete 或缩容）时，在向容器发送 SIGTERM 信号之前执行。
- 只有当 preStop 脚本跑完了，K8s 才会发送 SIGTERM 信号给主进程。
- 注意事项：整个 preStop 的执行时间受 terminationGracePeriodSeconds（默认 30s）限制。如果钩子跑了 40s，K8s 还是会直接杀掉容器。