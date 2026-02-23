---
title: "核心概念"
weight: 1
---

## 一、K8s 概述

Kubernetes (简称 K8s) 是一个开源的容器编排引擎，用于自动化容器化应用程序的部署、扩展和管理。

简单来说，K8s 就是一个**智能的“容器管家”**。以前我们手动部署应用，得自己盯着服务器：万一程序崩了要手动重启，流量大了要赶紧加机器，更新代码还得提心吊胆怕断网。有了 K8s，只需要告诉它一个“期望状态”（比如：我要 5 个这玩意儿一直跑着），剩下的脏活累活——比如分发任务、故障自愈、自动扩容它全帮干了。

**参考文档：**
- kubernetes 中文文档：
  - https://kubernetes.io/zh/docs/home/
  - http://docs.kubernetes.org.cn/
- kubernetes 中文社区：https://www.kubernetes.org.cn/docs


---

## 二、架构概览与核心组件

![Kubernetes-组件](/docs/kubernetes/Kubernetes-组件.png)

K8s 集群采用典型的 **Master-Worker (控制平面-工作节点)** 架构。

* **Control Plane (控制平面)**：集群的“大脑”，负责全局决策（如调度）、检测和响应集群事件。
* **Worker Node (工作节点)**：集群的“手脚”，负责实际运行应用程序的容器（Pod）。

> K8s 的所有组件之间都不直接通过网络互相调用，而是**全部通过 `kube-apiserver` 进行通信**。这保证了架构的松耦合和极高的可扩展性。



### 1. 控制平面组件
通常运行在 Master 节点上，生产环境中必须进行高可用部署（至少 3 个节点）。

#### kube-apiserver
**K8s 集群的统一入口**，提供 HTTP REST API 接口，所有其他组件（无论是内部组件还是外部客户端如 kubectl）都需要通过它来交互。它负责请求的认证、授权、准入控制以及 API 注册。

**默认端口：**
- 6443（TCP）：所有的内部组件（如 kubelet、kube-scheduler）以及外部客户端（kubectl 命令），都是通过请求这个端口与控制平面进行通信的。

**默认运行方式：**
- 静态 Pod，控制平面的 kubelet 监控 /etc/kubernetes/manifests/kube-apiserver.yaml 文件，直接利用本机的容器运行时拉取镜像并启动 kube-apiserver 容器。

**查看 apiserver 的版本**

```bash
# curl -k https://127.0.0.1:6443/version
{
  "major": "1",
  "minor": "24",
  "gitVersion": "v1.24.2",
  "gitCommit": "f66044f4361b9f1f96f0053dd46cb7dce5e990a8",
  "gitTreeState": "clean",
  "buildDate": "2022-06-15T14:15:38Z",
  "goVersion": "go1.18.3",
  "compiler": "gc",
  "platform": "linux/amd64"
}
```

---

#### etcd
- K8s 的数据库。一个强一致性、高可用的分布式键值存储系统。它保存了整个集群的所有状态数据和配置信息。只有 kube-apiserver 可以直接访问它。

**默认端口：**
- 2379（TCP）：用于对外提供服务。在 K8s 中，只有 kube-apiserver 会连接这个端口，向 etcd 发起读写请求（例如保存一个新的 Pod 记录，或者查询当前 Node 的状态）。也是使用 etcdctl 命令行工具查询数据时，默认连接的端口。
- 2380（TCP）：用于 etcd 集群内部节点之间的数据同步和心跳维持。etcd 基于 Raft 共识算法，集群中的 Leader 节点和 Follower 节点需要不断地通过这个端口交换数据，以保证数据的高可用和强一致性。只有 etcd 节点彼此之间会用到这个端口，外部组件不会访问它。

**默认运行方式：**
- 静态 Pod，控制平面的 kubelet 监控 /etc/kubernetes/manifests/etcd.yaml 文件，直接利用本机的容器运行时拉取镜像并启动 etcd 容器。 

> 在对稳定性要求极高的生产环境中，通常会将 etcd 从 K8s 的 Master 节点中剥离出来，部署在完全独立的一组服务器上。kube-apiserver 会通过配置参数（--etcd-servers）指向这组独立的外部机器的 2379 端口。这组外部机器上的 etcd 通常以 Systemd 守护进程（二进制部署）或容器的形式运行。

---

#### kube-scheduler
- 负责 Pod 的分配和调度，它会监控新创建且未分配节点的 Pod并根据一系列条件（硬件限制、亲和性/反亲和性规则等），为该 Pod 选择一个最合适的 Worker 节点来运行。

**默认端口：**
- 10259（TCP）：主要用于暴露自身的 metrics 指标以及健康检查 healthz 等

**默认运行方式：**
- 静态 Pod，控制平面的 kubelet 监控 /etc/kubernetes/manifests/kube-scheduler.yaml 文件，直接利用本机的容器运行时拉取镜像并启动 kube-scheduler 容器。


---

#### kube-controller-manager
- **集群的大管家**。运行着诸多后台控制器（如 Node, ReplicaSet Controller），负责维持集群的期望状态。
- 如果 Deployment 修改了副本数但 Pod 数量迟迟没变化，大概率是 Controller Manager 异常。

### 2. 工作节点组件
运行在每一个 Worker Node 上，负责维护运行的 Pod 并提供 K8s 运行环境。

#### kubelet
- **节点的大管家（Agent）**。接收 API Server 的指令，管理本节点 Pod 和容器的生命周期（启动、停止、执行健康探针）。
- 如果 Node 状态变为 `NotReady`，或者 Pod 无法启动，第一步先查该节点 `kubelet` 的 `journalctl` 日志。

#### kube-proxy
- **网络代理与负载均衡**。维护节点上的网络规则（iptables/IPVS），实现 K8s Service 的网络转发机制。
- 如果 Pod 运行正常，但通过 Service IP 无法访问，通常是 `kube-proxy` 规则同步失败或内核参数问题。

#### Container Runtime
- **容器运行时**。真正负责运行容器的基础软件（如 containerd, CRI-O）。Kubelet 通过 CRI 接口与其交互。
- 关注底层镜像拉取失败 (ImagePullBackOff)、容器文件系统损坏等底层报错。


### 3. 其他组件

下面这些组件，同样对 K8s 集群的正常运行至关重要。

#### CoreDNS
- **集群的 DNS 服务器**。负责为集群中的 Service 和 Pod 提供 DNS 解析服务。
- 如果 Service 无法解析，通常是 CoreDNS 配置错误或 Pod 网络问题。 

#### CNI
- **容器网络接口**。负责为 Pod 分配网络资源（IP 地址、路由表），并确保不同 Pod 之间可以通信。
- 如果 Pod 无法通信，通常是 CNI 插件配置错误或网络策略冲突。


## 三、K8s 核心术语对照表

### 1. 基础

| 英文术语 | 中文对照 | 核心含义 |
| :--- | :--- | :--- |
| **Pod** | 容器组 | K8s 中最小的部署和计算单元。一个 Pod 共享同一网络命名空间（IP）和存储。 |
| **Node** | 节点 | 物理机或虚拟机。Pod 的实际载体。|
| **Namespace** | 命名空间 | 虚拟集群隔离机制。常用于区分环境（如 `dev`, `prod`）或项目团队。注意：Namespace 只能隔离逻辑资源，不能隔离底层物理资源。 |
| **Label** | 标签 | 附加在对象上的键值对（Key-Value）。**K8s 的灵魂**，用于分类和标识。 |
| **Selector** | 标签选择器 | K8s 对象之间建立关联的“胶水”。例如，Service 通过 Selector 找到对应 Label 的 Pod 来转发流量。如果流量不通，第一步先检查 Selector 是否拼写一致。 |
| **Annotation** | 注解 | 类似 Label，但不用于标识和选择对象，而是用于存储非标识性的辅助元数据（如构建版本、被工具链依赖的配置信息）。 |

### 2. 工作负载

| 英文术语 | 中文对照 | 核心含义 |
| :--- | :--- | :--- |
| **Deployment (deploy)** | 无状态应用 | 管理无状态应用的最常用控制器。支持滚动更新（RollingUpdate）和一键回滚。它在底层通过管理 ReplicaSet 来控制 Pod 数量。 |
| **StatefulSet (sts)** | 有状态应用副本集 | 用于管理需要持久化存储和稳定网络标识符（如 `pod-0`, `pod-1`）的应用（如 MySQL, Redis 集群）。 |
| **DaemonSet (ds)** | 守护进程集 | 确保在集群的**每一个（或符合条件的）Node** 上都运行一个特定的 Pod 副本。常用于日志采集（Fluentd）或网络插件（Calico）。 |
| **Job / CronJob** | 任务 / 定时任务 | Job 用于执行一次性任务（如数据库迁移），CronJob 用于执行周期性任务（如每天凌晨备份）。 |
| **ReplicaSet** | 副本集 | 确保指定数量的 Pod 副本始终在运行。通常由 Deployment 自动管理，**极少手动直接创建和操作**。 |

### 3. 网络与服务暴露

| 英文术语 | 中文对照 | 核心含义|
| :--- | :--- | :--- |
| **Service (svc)** | 服务 | 为一组 Pod 提供一个固定的虚拟 IP（ClusterIP）和负载均衡。解决了 Pod IP 频繁变化导致无法被可靠访问的问题。 |
| **Ingress (ing)** | 入口网关 | 管理集群外部访问集群内部服务的 HTTP/HTTPS 路由规则。相当于集群的“Nginx 反向代理配置”。需要配合 Ingress Controller 才能工作。 |
| **Endpoint (ep)** | 端点 | Service 的后端实际 IP 地址列表。当 Service 无法访问 Pod 时，第一步应使用 `kubectl get ep` 检查端点列表中是否有真实的 Pod IP。 |
| **NetworkPolicy (netpol)** | 网络策略 | 集群内部的“防火墙”。通过 Label 限制不同 Namespace 或 Pod 之间的网络出入站流量（默认是全部放行的）。 |

### 4. 配置与存储

| 英文术语 | 中文对照 | 核心含义 |
| :--- | :--- | :--- |
| **ConfigMap (cm)** | 配置映射 | 用于将非机密配置数据（如配置文件、环境变量）与容器镜像解耦。更新 ConfigMap 后，依赖它的热更新机制取决于应用的实现。 |
| **Secret** | 密钥 | 类似 ConfigMap，但用于存储敏感信息（如密码、Token、TLS 证书）。数据在 etcd 中默认以 Base64 编码存储。 |
| **Volume** | 存储卷 | 挂载到 Pod 容器中的目录。生命周期通常与 Pod 绑定（宿主机目录或临时目录）。 |
| **PersistentVolume (pv)** | 持久卷 | 集群级别的存储资源池（如一块 AWS EBS 云盘或一段 NFS 目录）。由管理员预先配置。 |
| **PersistentVolumeClaim (pvc)** | 持久卷声明 | 开发者对存储资源（PV）的“申请单”。Pod 通过挂载 PVC 来获取持久化存储，无需关心底层存储的具体实现。 |  
| **StorageClass (sc)** | 存储类 | 存储的“模板”。当用户创建 PVC 时，K8s 可以根据 StorageClass 动态地自动创建 PV（动态供应 Dynamic Provisioning）。 |

### 5. 扩展与包管理

| 英文术语 | 中文对照 | 核心含义 |
| :--- | :--- | :--- |
| **HPA (HorizontalPodAutoscaler)** | Pod 水平自动扩缩容 | 根据 CPU/内存使用率或自定义指标，自动增加或减少 Deployment/StatefulSet 的 Pod 副本数。 |
| **CRD (CustomResourceDefinition)** | 自定义资源定义 | 允许用户在不修改 K8s 源代码的情况下，向 K8s API 注册自己发明的新资源类型（如 Prometheus 的 `ServiceMonitor`）。 |
| **Helm** | (K8s 包管理器) | 类似 Linux 的 `apt` 或 `yum`。通过模板化（Chart）的方式打包、发布和管理复杂的 K8s 应用。 |


### 6. 标准接口与容器运行时

K8s 本身并不直接提供网络、存储和底层的容器运行能力，而是通过定义一套**标准接口（Interfaces）**，让第三方的插件（Plugins）来具体实现。

| 英文术语 | 中文对照 | 核心含义|
| :--- | :--- | :--- |
| **Container Runtime** | 容器运行时 | **真正负责拉取镜像和运行容器的软件**。以前默认是 Docker（dockershim），现在主流是 `containerd` 或 `CRI-O`。排障：当 K8s 层面无法操作容器时，可以直接登录 Node 节点，使用 `crictl` 工具进行底层排查。 |
| **CRI (Container Runtime Interface)** | 容器运行时接口 | K8s (`kubelet`) 与底层容器运行时（如 containerd）通信的**标准 API 接口**。只要符合 CRI 标准的运行时，都可以无缝接入 K8s。 |
| **CNI (Container Network Interface)** | 容器网络接口 | 负责为 Pod 分配 IP 地址并打通集群网络的**标准插件接口**。常见的实现有 Calico、Flannel、Cilium（基于 eBPF）。排障：如果 Pod 出现 `NetworkPluginNotReady` 或跨节点网络不通，重点检查 Node 节点上的 `/etc/cni/net.d/` 配置文件和 CNI 插件的 Pod 日志。 |
| **CSI (Container Storage Interface)** | 容器存储接口 | K8s 对接外部存储系统的**标准插件接口**。无论是 AWS EBS、阿里云盘，还是自建的 Ceph、NFS，只要提供 CSI 驱动，就能被 K8s 作为 PV 动态调度。排障：如果 PVC 一直处于 `Pending` 或 Pod 挂载目录失败超时，通常需要去排查对应 CSI Provisioner 容器的日志。 |


