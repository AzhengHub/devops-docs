---
title: "Pod 调度"
---

## Pod 调度策略

### 节点选择器
- nodeSelector 是节点亲和性的一种简单形式，它要求 Pod 必须运行在带有特定标签的节点上。

**操作与 YAML 配置示例：**
- 第一步：给节点添加标签
```bash
# 语法：kubectl label nodes <节点名称> <键>=<值> <键>=<值> ...
kubectl label nodes worker-node-01 disktype=ssd env=prod

# 如果这个节点之前已经有了 disktype=hdd 的标签，想把它覆盖成 ssd，直接运行上面的命令会报错。需要加上 --overwrite 参数来强制覆盖：
kubectl label nodes worker-node-01 disktype=ssd --overwrite

# 查看节点的标签
kubectl get nodes --show-labels # 查看所有节点的所有标签 (信息较多)
kubectl get nodes -l disktype=ssd # 查看所有打上 disktype=ssd 标签的节点
kubectl get nodes -l "disktype=ssd,env=prod" # 查看所有打上 disktype=ssd 且 env=prod 标签的节点

# 删除节点的标签，在标签的 Key 后面加一个减号 -，就代表删除这个标签。
kubectl label nodes worker-node-01 env- # 删除 env 标签
``` 
- 第二步：创建 Pod 并指定 nodeSelector
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx-pod
spec:
  containers:
  - name: nginx
    image: nginx:latest
  # nodeSelector
  nodeSelector:
    disktype: ssd
    env: prod
```
这个 Pod 会被调度到所有打上 `disktype=ssd` 且 `env=prod` 标签的节点上。

### 节点亲和性
nodeAffinity 是指 Pod 对节点的偏好或要求，调度器会根据这些条件将 Pod 分配到符合条件的节点上。

可以把节点亲和性理解为 Pod 的“择偶标准”。它通过匹配 Node 上的 **Labels (标签)** 来决定去向。亲和性分为两种严苛程度：
- **硬亲和 (Hard)**：`requiredDuringSchedulingIgnoredDuringExecution`，“非他不嫁”。如果集群里没有满足条件的 Node，Pod 宁愿一直处于 `Pending` 状态，也绝对不妥协。
- **软亲和 (Soft)**：`preferredDuringSchedulingIgnoredDuringExecution`，“最好是他，不行就算了”。调度器会尽量把 Pod 放在满足条件的 Node 上；如果实在找不到，放在其他 Node 上也可以。

> 名字里那一长串的 `IgnoredDuringExecution` 意思是，如果 Pod 已经运行在节点上了，此时修改了节点的标签导致它不满足条件了，K8s 也**不会**把这个运行中的 Pod 赶走。

**YAML 配置示例：**
- 假设有部分节点打上了标签 `disktype=ssd`，现在要部署一个 MySQL Pod，**必须**运行在 SSD 节点上，且**最好**运行在 `us-east-1` 区域：
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: mysql-pod
spec:
  containers:
  - name: mysql
    image: mysql:8.0
  affinity:
    nodeAffinity:
      # 1. 硬亲和：必须满足 (必须是 SSD)
      requiredDuringSchedulingIgnoredDuringExecution:
        nodeSelectorTerms:
        - matchExpressions:
          - key: disktype
            operator: In
            values:
            - ssd
      # 2. 软亲和：尽量满足 (最好在 us-east-1，权重为 100)
      preferredDuringSchedulingIgnoredDuringExecution:
      - weight: 100
        preference:
          matchExpressions:
          - key: topology.kubernetes.io/zone
            operator: In
            values:
            - us-east-1
```

**nodeSelector 对比 nodeAffinity：**
| 特性对比 | `nodeSelector` (经典版) | `nodeAffinity` (现代进阶版) |
| --- | --- | --- |
| **匹配逻辑** | **只能全等匹配** (`=`)。标签必须一模一样。 | **支持丰富的操作符**：`In` (包含), `NotIn` (不包含), `Exists` (存在该键即可), `Gt` (大于) 等。 |
| **条件硬度** | **只有硬性要求 (Hard)**。找不到绝对匹配的节点，Pod 就死等 (`Pending`)。 | **支持硬性 (Required) 和 软性 (Preferred)**。软性条件找不到最佳节点时，可以退而求其次去普通节点。 |
| **表达能力** | 弱。无法表达“我要去 zone-A **或者** zone-B”这种逻辑。 | 强。可以轻松实现“或 (OR)”以及反向排除的逻辑。 |
| **官方定位** | 依然支持，但功能不再更新。 | 官方推荐的主流方式，未来调度的核心。 |

在绝大多数简单的日常场景中（比如指定去 SSD 节点），`nodeSelector` 因为其极简的语法，依然是很多开发者的最爱。但是，如果的集群架构比较复杂，或者需要做高可用容灾部署，那就必须得上 `nodeAffinity` 了。

---

### 节点污点 与 Pod 容忍度
- 污点在节点上设置，而容忍度在 Pod 上设置。
- 可以把污点理解为节点上的“门禁”或“施工牌”。如果一个 Node 被打上了污点，那么普通的 Pod 是**绝对进不去**的，除非这个 Pod 拥有相应的“VIP 通行证”（也就是**容忍度**）。

**常见的使用场景：**
- **专用节点：** 某几个节点挂载了昂贵的 GPU，打上污点，只允许 AI 训练的 Pod 容忍并调度上来，防止普通 Web 业务来抢占资源。
- **节点维护：** 某台服务器要关机升级内存，管理员先给它打上 `NoSchedule` 污点，这样新的 Pod 就不会再被调度到这台机器上了。

**污点的三种效果 (Effect)：**
1. `NoSchedule`：新的 Pod 不会被调度到该节点（已有 Pod 不受影响）。
2. `PreferNoSchedule`：尽量避免调度到该节点（软性限制）。
3. `NoExecute`：极其严厉！不仅新的 Pod 进不来，节点上**已经在运行且没有容忍度**的 Pod 也会被立刻驱逐（赶走）。

**操作与 YAML 配置示例：**
- 第一步：运维人员给节点打上污点，假设我们给名为 `node-gpu-01` 的节点打上污点，表示这是 GPU 专机：
```bash
# 格式: kubectl taint nodes <节点名> key=value:effect
kubectl taint nodes node-gpu-01 hardware=gpu:NoSchedule
```

- 第二步：在 Pod 中配置容忍度，现在普通的 Pod 无法进入 `node-gpu-01`。我们需要在 AI 训练程序的 Pod 中配置 `tolerations`：
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: ai-training-pod
spec:
  containers:
  - name: tensorflow
    image: tensorflow/tensorflow:latest-gpu
  # 关键配置：添加通行证 (容忍度)
  tolerations:
  - key: "hardware"
    operator: "Equal"
    value: "gpu"
    effect: "NoSchedule" 
```

只要 Pod 里的 `key`、`value` 和 `effect` 和节点上的污点完全对得上，这个 Pod 就可以无视门禁，成功调度到该节点上。

{{% alert title="<i class='fa-solid fa-exclamation-triangle pe-1'></i> 注意事项" color=warning %}}
污点和容忍度并没有“优先吸引”的作用，就算匹配了，Pod 依然有极大的概率会被调度到其他没有任何污点的普通节点上。

要想强制 Pod 只调度到特定的有污点的节点上，必须结合‘主动吸引机制’（如 nodeAffinity 或 nodeSelector）以及‘防排斥通行证’（Tolerations）打一套组合拳来实现。
{{% /alert %}}

---

### Pod 亲和与反亲和
- podAffinity，例如保证 Web 容器和 Redis 容器必须部署在同一台机器上。
- podAntiAffinity，例如保证两个相同的 Web 副本必须强制分散到不同的机器上以保证高可用。

**topologyKey (拓扑域)：**
- 如果 `topologyKey: kubernetes.io/hostname`：意味着以“单台物理机/虚拟机”为边界。
- 如果 `topologyKey: topology.kubernetes.io/zone`：意味着以“可用区（比如阿里云的可用区A、B）”为边界。

**YAML 配置示例：**
- 反亲和：它不能和别的 Web Pod 在同一台机器上（保证自身高可用）。
- 亲和：它必须和 Redis Pod 在同一个可用区（保证低延迟通信）。
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: web-pod
  labels:
    app: web
spec:
  containers:
  - name: web-server
    image: nginx:latest
  
  affinity:
    # ------------------------------------------------
    # 1. Pod 反亲和性 (打散自身)
    # ------------------------------------------------
    podAntiAffinity:
      requiredDuringSchedulingIgnoredDuringExecution: # 强制要求
      - labelSelector:
          matchExpressions:
          - key: app
            operator: In
            values:
            - web      # 看到标签带有 app=web 的 Pod 就躲开
        # 范围：同一台主机 (hostname)。如果这台机器上有 app=web 的 Pod，我就不去这台机器。
        topologyKey: "kubernetes.io/hostname" 
        
    # ------------------------------------------------
    # 2. Pod 亲和性 (寻找 Redis)
    # ------------------------------------------------
    podAffinity:
      requiredDuringSchedulingIgnoredDuringExecution: # 强制要求
      - labelSelector:
          matchExpressions:
          - key: app
            operator: In
            values:
            - redis    # 寻找标签带有 app=redis 的 Pod
        # 范围：同一个可用区 (zone)。我要和 Redis 待在同一个可用区里。
        topologyKey: "topology.kubernetes.io/zone"

```

{{% alert title="<i class='fa-solid fa-exclamation-triangle pe-1'></i> 注意事项" color=warning %}}
K8s 调度器在计算 Pod 亲和性和反亲和性时，需要遍历节点上所有正在运行的 Pod 的标签。在大规模集群（几百个 Node，上万个 Pod）中，**过度使用这两种亲和性会极大地消耗调度器的 CPU，导致 Pod 调度变慢**。因此，除非确实出于高可用或极低延迟的需求，否则请谨慎使用，尤其是硬亲和（`required...`）。
{{% /alert %}}




## Pod 调度原理

当 `kube-apiserver` 接收到一个创建新 Pod 的请求后，Pod 的状态会是 `Pending`，且 `nodeName` 字段为空。这时，`kube-scheduler` 就会介入。

它的核心目标是在集群所有的 Worker 节点中，为这个 Pod 挑出一个**最合适**的节点。这个过程分为两大核心阶段：

### 预选阶段

“一票否决”的硬性过滤，在这个阶段，调度器会遍历所有的节点，剔除那些**绝对不可能**运行该 Pod 的节点。只要有一个条件不满足，该节点就会被淘汰。

**常见的预选规则包括：**

* **PodFitsResources (资源检查)：** 节点上剩余的 CPU 和内存，是否能满足 Pod 中 `resources.requests` 的需求？
* **MatchNodeSelector (标签匹配)：** Pod 是否通过 `nodeSelector` 指定了必须运行在带有特定 Label（例如 `disktype=ssd`）的节点上？该节点有这个标签吗？
* **PodFitsHostPorts (端口冲突)：** 如果 Pod 要求绑定宿主机的某个特定端口（`HostPort`），这个节点上的该端口被占用了吗？
* **TaintToleration (污点和容忍度)：** 节点上是否打上了“污点”（Taint，比如该节点正在维护，或者专供特定团队使用）？如果 Pod 没有相应的“容忍度”（Toleration），则会被直接拒绝。

**结果：** 经过预选后，会得到一个“可用节点列表”。如果这个列表为空，说明当前集群中没有任何节点能满足要求，Pod 将一直停留在 `Pending` 状态，并在事件（Events）中提示 `FailedScheduling`。

### 优选阶段

“择优录取”的打分排名，如果预选阶段筛选出了多个可用节点，调度器就会进入优选阶段。它会根据一套复杂的算法，为每一个可用节点**打分**（通常是 0 到 100 分），最后选出得分最高的那个节点。

**常见的优选规则（打分项）包括：**

* **LeastRequestedPriority (资源富余度)：** 哪个节点空闲的 CPU 和内存最多，得分就越高。这有助于将负载均匀地分散到整个集群。
* **ImageLocalityPriority (镜像本地性)：** 如果某个节点上**已经存在**该 Pod 所需要的容器镜像，得分会更高。因为这样可以省去拉取镜像的时间，让 Pod 启动得更快。
* **NodeAffinityPriority (节点亲和性)：** 虽然节点亲和性也可以作为硬性条件（在预选阶段），但如果配置为软性条件（`preferredDuringSchedulingIgnoredDuringExecution`），调度器会给更符合条件的节点加分，而不是直接淘汰不符合的。

**结果：** 打分结束后，调度器将 Pod 绑定（Bind）到得分最高的节点上，将该节点的名字写入 Pod 的 `nodeName` 字段，并通知 `kube-apiserver`。之后，目标节点上的 `kubelet` 就会发现这个分配给自己的 Pod，并开始拉起容器。


## 其他
### 将节点设置为不可调度
```sh
# 将节点设置为不可调度（已经在该节点上运行的 Pod 完全不受任何影响，它们会继续正常运行、对外提供服务。）
kubectl cordon <node-name>

# 将节点设置为可调度（恢复正常的调度行为）
kubectl uncordon <node-name>
```

**应用场景:**
1. ”软着陆” / 让任务自然结束：
    - 假设这个节点上运行了很多批处理任务（Job）或者正在处理长连接的 Web 服务。如果直接 drain，可能会导致正在下载一半的文件中断，或者正在进行的交易失败。
    - 这时可以执行 cordon，然后，就静静地等里面现有的任务自己跑完（或者等流量低峰期），最后再安全地关机维护。
2. 线上故障排查：
    - 假设监控报警，某台节点上的 CPU 飙高或者网络有轻微丢包，但上面的服务还没彻底死掉。如果直接 drain，不仅会把问题现场破坏掉，还可能因为大量 Pod 突然大搬家，引发全集群的波动（雪崩效应）。
    - 这时候，标准动作是先 cordon 它！“隔离现场”，不让新的业务再调度过来受害，同时保留节点上现有的状态，方便慢慢连进去查日志、抓包找原因。


### 驱逐在节点运行的 Pod
- 在升级 Linux 内核、修补系统漏洞、增加内存条、升级 K8s 版本等情况下，需要先将节点设置为不可调度，然后再驱逐节点上的所有 Pod。
```sh
# 将节点设置为不可调度（可选，其实 kubectl drain 时会自动执行）
kubectl cordon <node-name>

# 查看运行在指定节点的所有 Pod
kubectl get pods --field-selector spec.nodeName=<node-name> -A

# 驱逐节点上的所有 Pod
kubectl drain <node-name>

# 驱逐一个节点上的特定 Pod：
# 这个命令会立即删除指定的 Pod，并且 Kubernetes 将会在一段时间后重新调度该 Pod 到其他节点上。--grace-period 参数指定了 Pod 优雅终止的等待时间。
kubectl delete pod <pod-name> --grace-period=30
```