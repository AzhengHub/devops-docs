---
title: "Pod"
weight: 10
---


## Pod 概述

在 Kubernetes 中，Pod 是最小的调度单位，是一组紧密关联的容器集合，这些容器共享同一个网络命名空间、存储卷和主机，运行在一个节点上。Pod 可以包含一个或多个容器，这些容器可以共享存储卷、网络命名空间、PID 命名空间等资源，因此可以通过本地进程间通信来协作完成一个特定的任务。

Pod 作为 Kubernetes 最小的部署单元，通常包含一个主容器和一些辅助容器（例如 sidecar 容器、init 容器等），主要用于运行一些需要协同工作的应用程序。Pod 可以由 Deployment、StatefulSet、DaemonSet 等控制器来管理，控制器会负责为 Pod 分配资源、管理 Pod 的生命周期、自动扩缩容、故障恢复等工作。

Pod 提供了一种轻量级的抽象，可以让开发人员将多个容器组合在一起，并以原子方式部署和管理它们。通过将多个容器组合在一个 Pod 中，可以让它们可以方便地共享同一个环境，从而更加轻松地构建、部署和管理应用程序。

**注意：**
- 重启 Pod 中的容器不应与重启 Pod 混淆。 Pod 不是进程，而是容器运行的环境。 在被删除之前，Pod 会一直存在。
- 当为 Pod 对象创建清单时，要确保所指定的 Pod 名称是合法的 [DNS 子域名](https://kubernetes.io/zh-cn/docs/concepts/overview/working-with-objects/names#dns-subdomain-names)。

---

### 静态 Pod
- 静态 Pod 指的是无需手动创建，而是由 kubelet 自行加载创建的 Pod；
- /etc/kubernetes/manifests 是 Kubelet 的 静态 Pod 目录。任何放入该目录的 YAML 文件，都会被该节点上的 Kubelet 守护进程自动扫描并启动为 Pod，不受 API Server 调度控制。
```sh
# kubelet 会定期查询这些文件的哈希值是否有变化，如果有变化则会重新加载该文件并创建对应的 Pod。
root@k8s-master-1:~# ls -l /etc/kubernetes/manifests/
total 16
-rw------- 1 root root 2298 Sep 13 00:01 etcd.yaml
-rw------- 1 root root 4040 Sep 13 00:01 kube-apiserver.yaml
-rw------- 1 root root 3556 Sep 13 00:01 kube-controller-manager.yaml
-rw------- 1 root root 1476 Sep 13 00:01 kube-scheduler.yaml
```

---

### pause 容器
- 在 Kubernetes 中，pause 容器作为 pod 中所有容器的父容器，主要负责底层网络封装；
- 如果没有 pause 容器，当一个 Pod 里的业务容器 A 重启时，Pod 的网络命名空间（IP 地址、MAC 地址等）可能会随之消失或重置。为了保证 Pod 作为一个整体的稳定性，Kubernetes 引入了 pause 容器。

**核心职责：**
1. 作为网络命名空间的基础：pause 容器启动后会持有网络命名空间（Network Namespace）。Pod 里的其他业务容器通过 container 模式加入到 pause 容器的网络空间中。
2. 作为 PID 1 进程管理僵尸进程：在 Linux 中，如果父进程退出了，子进程会被 PID 为 1 的进程接管。pause 容器里的进程（通常是用 C 语言编写的极简程序）扮演了 PID 1 的角色，负责回收 Pod 内产生的僵尸进程。


**工作原理，当创建 Pod 时：**
1. Kubelet 调用容器运行时（如 Containerd 或 Docker），优先启动一个 pause 容器。
2. pause 容器初始化网络、IPC（进程间通信）和 UTS（主机名）等命名空间；
3. 随后启动的业务容器（如 Nginx、MySQL）会共享 pause 容器的网络栈。这意味着，Pod 里的所有容器：
  - 共享同一个 IP 地址（即 pause 容器的 IP）。
  - 通过 localhost 互相通信（就像在同一台物理机上一样）。


### Pod 与 Namespace

如果一个 Pod 中包含多个容器：

| 命名空间 | 默认状态 | 备注 |
| --- | --- | --- |
| **NET** | **共享** | 所有容器共享同一个 IP、端口范围和路由表。它们可以通过 localhost 通信 |
| **IPC** | **共享** | 容器间可以通过信号量、共享内存等标准 Unix IPC 机制通信 |
| **UTS** | **共享** | 所有容器共享同一个主机名（Hostname）|
| **MNT** | **隔离** | 每个容器都有独立的文件系统。虽然可以通过 volume 挂载共享数据，但挂载点和文件系统视图是各自独立的。 |
| **USER** | **隔离** | 每个容器都有独立的用户和组ID，互相看不到对方的用户和组。 |
| **PID** | **默认隔离** | 默认情况下 Pod 里的容器看不到其他容器的进程（容器 A 里的 ps -ef 看不到容器 B 的进程）。可通过 `shareProcessNamespace: true` 改为共享（此时 pause 容器将正式承担起 PID 1 的职责，负责回收所有容器产生的僵尸进程）。 |





## Pod 控制器
- Pod 如果未被控制器管理，它的生命周期将受到 kubelet 的控制，并且 Pod 在删除后不会自动重建。

## ==========================

## Pod 相关命令

**查看 Pod**

```bash
#查看pod的详细信息
kubectl get pod [-A|-n <namespaces-name>] -o wide [pod-name]

#查看pod更详细的信息
kubectl describe pod [-A|-n <namespaces-name>] [pod-name]
```

**运行 pod**

```
kubectl run net-test1 --image=busybox -- tail -f /etc/host
```

**删除 pod**

```bash
kubectl delete pod <pod_name>


#指定 NAMESPACE 并指定资源名称进行删除
kubectl delete pod -n kubernetes-dashboard dashboard-metrics-scraper-8c47d4b5d-vnjbs kubernetes-dashboard-5676d8b865-x5brm
```

**扩容 pod**

```bash
kubectl scale [--resource-version=version] [--current-replicas=count] --replicas=COUNT (-f FILENAME | TYPE NAME)
[options]
```

**获取 Pod IP**

```bash
# 传统使用 -o wide 的获取方式
# kubectl get pod -n wordpress wordpress-647f56d5c-8jwx6 -o wide 
NAME                        READY   STATUS        RESTARTS   AGE   IP            NODE         NOMINATED NODE   READINESS GATES
wordpress-647f56d5c-8jwx6   2/2     Terminating   0          21h   10.244.1.27   k8s-node-1   <none>           <none>


# 基于 go-template 方式
# kubectl get pod -n wordpress wordpress-647f56d5c-8jwx6 -o go-template={{.status.podIP}}
10.244.1.27


# 基于json方式
```



## Pod states

**Pod 的状态是由 Pod 中的容器状态（container states）共同决定的，而不是单个容器的状态**。如果 Pod 中的任何容器出现错误，Pod 的状态将被设置为 Failed。相反，如果所有容器都运行正常，则 Pod 的状态为 Running。此外，Pending 状态可能是由于调度问题（如节点资源不足），因此它不仅仅是一个阶段，而是一个状态。

在 Kubernetes 中，Pod 是一组紧密关联的容器的集合，可以使用不同的状态来表示它们的运行情况。下面是不同状态的含义：

- **Running**（运行中）：Pod 中的所有容器都已经启动并且正常运行。
- **Pending**（挂起）：Pod 已经被 Kubernetes 接受，但是它包含的容器还没有被调度到节点上运行。通常这是因为节点资源不足或者调度器还没有找到适合的节点。
- **Succeeded**（成功）：Pod 中所有的容器已经成功地完成了它们的任务并且退出了。在成功结束后，Pod 不会自动重启。
- **Failed**（失败）：Pod 中的至少一个容器已经退出并且处于错误状态。在这种情况下，Pod 可能会被重启或者删除，具体取决于 Pod 的重启策略。
- **Unknown**（未知）：表示 Kubernetes 无法获取 Pod 的状态信息，这通常是由于与 Kubernetes 相关的组件（如 API 服务器）出现故障造成的。
- **Unschedulable**（无法调度）：Pod 不能被调度，kube-scheduler 没有匹配到合适的 node 节点。Pod 无法被 Kubernetes 调度到任何节点上运行。这可能是因为没有可用的节点、节点资源不足或者 Pod 调度限制等原因。
  - PS：处于此状态重点排查 node节点CPU、内存等资源是否不足、定义的标签是否匹配、节点污点、Pod容忍度等
- **PodScheduled**（已调度）：Pod 已经被 Kubernetes 调度到节点上运行，但是容器尚未启动。
- **ContainerCreating**（容器创建中）：表示 Pod 中的容器正在创建中。
- **Initialized**（已初始化）：Pod 中的所有容器都已经初始化完成并且被创建，但是它们还没有被 Kubernetes 设置为运行状态。
- **ImagePullBackoff**（拉取镜像失败）：Pod 中的一个或多个容器无法拉取镜像，可能是因为镜像不存在、网络故障等原因。
  - PS：处于此状态重点排查 镜像是否指向正确、harbor等镜像服务器是否工作正常 是否为公开权限等
- **Ready**（就绪）：Pod 中的所有容器已经被设置为运行状态，就绪探针探测成功，并且可以接收流量。
- **CrashLoopBackOff**（崩溃循环）：Pod 中的容器已经崩溃并且正在重启。如果容器在短时间内崩溃多次，就会出现这种情况。
  - Pod中的容器发生CrashLoopBackOff错误时，Kubernetes将尝试重启该容器。如果在启动容器后，容器在很短的时间内（默认为5秒）再次发生崩溃，那么Kubernetes会认为这是一个循环崩溃，即CrashLoopBackOff错误。在这种情况下，Kubernetes会停止对该容器的重试，并将该容器的状态设置为“Error”或“CrashLoopBackOff”。
  - 如果在一段时间内（默认为10分钟）重试该容器仍然失败，则Kubernetes将停止对该容器的重试，并将该Pod的状态设置为“Failed”。此时，可以通过查看该Pod的事件或日志来了解Pod失败的原因，并进行必要的修复。
- **Failure**（失败）：如果一个Pod在启动时出现了CrashLoopBackOff错误并且重试了多次后仍然无法启动，并且已经达到了重试限制。则该Pod将被标记为“Failed”状态。
  - PS：初始延迟之前的就绪态的状态值默认为 `Failure`
- **Error**（错误）：Pod 在创建或者更新时出现错误。
- **Terminating**（终止中）：Pod 正在被终止，可能是因为达到了重启次数限制或者用户手动删除 Pod。







## Pod phase

参考文档：https://kubernetes.io/zh-cn/docs/concepts/workloads/pods/pod-lifecycle/

Pod 的 phase 表示 Pod 的生命周期阶段，不同于 Pod 的状态。

以下是 Pod 的不同阶段：

- **Pending**（等待中）：Pod 已经被 Kubernetes 系统接受，但是容器还没有被调度或者创建。
  - PS：处于此状态重点排查 Pod 依赖的存储是否有权限挂载、镜像是否可以下载、调度是否正常等
- **Running**（运行中）：Pod 正常运行，Pod 中的所有容器都已经启动并且正常运行。但是，如果该容器出现异常或崩溃，那么该状态**可能**仍然是 Running。
- **Succeeded**（已成功）：Pod 中所有容器都已经成功地执行完任务并退出，不再运行。
  - PS：比如说 job 这种资源执行完成后就会进入 Succeeded 状态
- **Failed**（已失败）：Pod 中至少一个容器已经出现错误并退出，或者 Pod 的 init 容器失败，并且不会被重启。
- **Unknown**（未知）：Kubernetes 系统无法获取 Pod 的状态。apiserver 无法获取 Pod 的状态，通常是因为 kubelet 与 apiserver 通信失败，进而无法将节点的信息发送给 apiserver
  - PS：处于此状态重点排查 master节点与node节点是否能进行通信、node节点 kubelet 是否运行正常等



## Pod 创建过程

1. 首先创建 Pod 的 yaml 文件信息 会发送给 API Server 并写入到 etcd 中
2. 然后 controller-manager 会 watch API Server，发现有 Pod 创建请求后，会创建一个 Pod 资源对象，然后将 pod 配置存储在 etcd，此时 pod 状态会变成 Pending 等待被调度
3. 之后 scheduler 也会 watch  API Server，发现有新增 Pod 的配置后，会根据 亲和性标签、节点资源使用率、等维度将 Pod 调度到合适的 Node 节点，然后将调度信息通过 API Server 写入 etcd 集群，此时 pod 状态会变成 scheduled Pod调度完成
4. Node 节点的 kubelet 会定期通过 API Server 向 etcd 集群发起查询
   - 调用 CRI；将创建容器的需求交给 docker  等容器运行时 创建容器
   - 调用 CNI；生成网络规则(IP、iptables 或 ipvs、等...)
   - 调用 CSI；实现存储持久化

5. Node 节点的 kubeproxy
6. 最后 Node 节点的 kubelet 将 Pod 状态、IP等信息上报 API Server；API Server 更新 etcd 中 Pod 信息，并设置 Pod 状态为running，此时Pod就已经创建完成。
7. 后期 Node 节点的 kubelet 会定期向 etcd 发起查询，查询 Pod 是否需要更新等操作


# Pod 中容器的设计模式

在 Kubernetes 中，Sidecar、Adapter 和 Ambassador 是常用的容器设计模式，用于在容器化的微服务架构中解决通信和管理方面的问题。

除了 Sidecar、Adapter 和 Ambassador 之外，还有其他常用的容器设计模式，例如：Batch Job、Daemon Set、Daemon Set、Operator 等

## Sidecar

在 Kubernetes 中，Sidecar 模式是指将辅助容器（Sidecar 容器）与应用程序主容器共同部署在同一个 Pod 中。Sidecar 容器为主应用容器提供支持，例如负责日志收集、监控、服务发现和安全等功能。在 Sidecar 模式中，多个容器共享 Pod 的网络命名空间，使得容器之间的通信更加高效。



## Adapter

在 Kubernetes 中，Adapter 模式可以使用 Istio 这样的 Service Mesh 技术来实现。Adapter 用于在 Kubernetes 中解决应用程序中使用不同的 API 和协议的问题。例如，Adapter 可以将 gRPC 协议转换为 HTTP/1.1 协议，或者将 RESTful API 转换为 gRPC 协议。这样就能够使使用不同 API 和协议的服务之间进行通信。



## Ambassador

在 Kubernetes 中，Ambassador 模式是指通过使用 Envoy 代理作为网络入口，将所有传入和传出的网络流量引导到对应的服务。Ambassador 模式可以用于实现服务发现、负载均衡、安全和流量控制等功能。Ambassador 通常作为一个单独的容器部署在 Kubernetes 中。



## Batch Job

Batch Job 模式用于运行定期执行的批处理任务，例如数据清理、数据导入、数据导出等。



## Daemon Set

Daemon Set 模式用于在 Kubernetes 集群中的所有节点上运行一个特定的容器。



## Stateful Set

Stateful Set 模式用于管理有状态的应用程序，例如数据库。



## Operator

Operator 模式使用自定义资源定义（CRD）来扩展 Kubernetes API，用于管理和自动化特定类型的应用程序。



# Pod 日志采集方案

**方案1**

- 将 filebeat 打入基础镜像，制作子镜像时通过 ADD 配置文件的方式指定输入输出

**方案2**

- 以 DaemonSet 的方式运行 filebeat







# 节点运行 Pod 数量限制

## 通过修改调度器配置实现

以下方法可以在所有支持 Kubernetes 调度器的版本中使用，包括 Kubernetes 1.0+ 的版本。不过在不同版本中可能会有一些语法和 API 的差异，需要根据具体版本的文档进行调整。另外，不同的调度器可能会有一些限制或特殊行为，也需要参考相应的文档来了解。

在 Kubernetes 中，可以通过 Kubernetes 调度器中的 `PodTopologizer` 特性来限制每个节点上运行的 Pod 数量。这个特性是默认开启的，可以通过调整 `PodTopologizer` 的参数来改变节点上 Pod 数量的限制。具体来说，可以设置以下参数：

- `kubernetes.io/limit-pods`：该标签可以用于指定节点上可以运行的最大 Pod 数量。该标签的值必须是一个正整数，表示节点上可以运行的最大 Pod 数量。
- `kubernetes.io/num-cpus`：该标签可以用于指定节点上的 CPU 核心数。该标签的值必须是一个正整数，表示节点上的 CPU 核心数。该标签通常用于配合 `PodTopologizer` 特性，用于控制每个节点上运行的 Pod 数量。

在使用 `PodTopologizer` 特性时，需要在调度器配置文件中设置相关参数。可以通过修改 `/etc/kubernetes/manifests/kube-scheduler.yaml` 文件来进行配置，如下所示：

```yaml
apiVersion: v1
kind: Pod
metadata:
  creationTimestamp: null
  labels:
    component: kube-scheduler
    tier: control-plane
  name: kube-scheduler
  namespace: kube-system
spec:
  containers:
  - command:
    - kube-scheduler
    - --bind-address=127.0.0.1
    - --kubeconfig=/etc/kubernetes/scheduler.conf
    - --authentication-kubeconfig=/etc/kubernetes/scheduler.conf
    - --leader-elect=true
    # --pod-topologizer-policy-config-map 参数用于指定 PodTopologizer 的配置信息所在的 ConfigMap 的名称。您需要根据自己的需求调整这个参数的值。
    - --pod-topologizer-policy-config-map=pod-topologizer-policy
    # --policy-config-file 参数用于指定 PodTopologizer 的配置信息所在的文件。您需要根据自己的需求调整这个参数的值。
    - --policy-config-file=/etc/kubernetes/scheduler-policy-config.yaml
    image: k8s.gcr.io/kube-scheduler:v1.22.2
    imagePullPolicy: IfNotPresent
    name: kube-scheduler
    resources:
      requests:
        cpu: 100m
    volumeMounts:
    - mountPath: /etc/kubernetes/scheduler.conf
      name: kubeconfig
      readOnly: true
    - mountPath: /etc/kubernetes/scheduler-policy-config.yaml
      name: scheduler-policy-config
      readOnly: true
  hostNetwork: true
  volumes:
  - hostPath:
      path: /etc/kubernetes/scheduler.conf
      type: FileOrCreate
    name: kubeconfig
  - configMap:
      name: pod-topologizer-policy
    name: pod-topologizer-policy
  - hostPath:
      path: /etc/kubernetes/scheduler-policy-config.yaml
      type: FileOrCreate
    name: scheduler-policy-config
```

### 1

如果您使用的是 Kubernetes 1.18 及以上版本，可以考虑使用 TopologySpreadConstraints 来限制 Pod 在集群中的分布情况，从而避免 Pod 在某些节点上过度集中。这些策略都可以在 Kubernetes 的调度器中配置和使用。



## 通过修改kubelet的参数实现

**注意：**

- `--max-pods` 参数是 kubelet 的一个参数，因此它可以在任何支持 kubelet 的 Kubernetes 版本中使用。但是，需要注意的是，kubelet 的参数在每个节点上进行设置，因此如果要限制所有节点上的 Pod 数量，需要在每个节点上都设置一遍。
- 需要注意的是，从 Kubernetes 1.17 开始，Kubernetes 已经将 --max-pods 选项从 kubelet 中删除，而改为使用 ResourceQuota 对 Pod 资源的配额限制。建议使用 ResourceQuota 来限制每个节点上可运行的 Pod 数量。



通过 kubelet 的 `--max-pods` 参数来限制每个节点上可运行的 Pod 数量。这个参数用于限制 kubelet 可以运行的最大 Pod 数量，如果超过了这个数量，kubelet 将拒绝调度更多的 Pod，直到其他 Pod 终止并释放资源。

需要注意的是，这个参数并不会自动计算当前节点的资源使用情况或者根据节点的硬件规格进行自适应调整。因此，在使用这个参数时，需要根据节点的实际情况进行手动配置，确保不会影响其他运行中的应用。

需要注意的是，使用 `--max-pods` 参数限制节点上的 Pod 数量可能会影响调度器的性能和可靠性。当节点上的 Pod 数量达到限制时，调度器可能会出现无法调度的情况，因为没有足够的资源可用。为了避免这种情况，可以考虑使用其他方法，例如使用节点污点来限制 Pod 的调度，或者使用 Kubernetes 的自动伸缩功能来动态调整节点数量和资源使用率。

在每个节点上设置 kubelet 的 `--max-pods` 参数来限制每个节点可运行的 Pod 数量。例如：

```sh
# 限制该节点上最多运行 10 个 Pod
kubelet --max-pods=10
```



## ResourceQuota

ResourceQuota 限制的是每个 namespace 中的资源使用情况，而不是每个节点上的资源使用情况。

因此 ResourceQuota 无法实现节点运行 Pod 数量的限制





# Pod DNS

- https://blog.csdn.net/GaoChuang_/article/details/121341927


## Label & Annotation
# Label 概述

https://kubernetes.io/zh-cn/docs/concepts/overview/working-with-objects/labels/

- Label 是 Kubernetes 系统中的一个核心概念。
- Label 以 key/value 键值对的形式附加到各种对象上，如Pod、Service、RC、Node等。
- Label 定义了这些对象的可识别属性，用来对它们进行管理和选择。Label 可以在创建时附加到对象上，也可以在对象创建后通过API进行管理。
- 主要是便于管理，如xxx业务的pod，xxx业务对应的service，打上标签和相应的选择便于管理





# Label 组成

- 完整的 Label 由 键前缀+键名+键值组成，键前缀为可选部分。
  - `keyprefix/key: value`

## 键前缀

- 键前缀必须为DNS子域名格式，且不能超过253个字符，省略键前缀时，键将被视为用户的私有数据；
- 那些由Kubernetes系统组件或第三方组件自动为用户资源添加的键必须使用键前缀；
- kubernetes.io/ 和 k8s.io/ 前缀预留给了kubernetes的核心组件使用；
  - 例如 Node 对象上常用的：
    - kubernetes.io/os
    - kubernetes.io/arch
    - kubernetes.io/hostname 等

## 键名

- 键名最多能使用63个字符，支持字母、数字、连接号（-）、下划线（_）、点号（.）等字符，且只能以字母或数字开头。



## 键值

- 标签的键值必须不能多于63个字符，它要么为空，要么是以字母或数字开头及结尾，且中间仅使用了字母、数字、连接号（-）、下划线（_）或点号（.）等字符的数据。





# Label 定义参考

标签分类是可以自定义的，但是为了能使他人可以达到**一目了然**的效果，一般会使用以下一些分类：

## 版本类标签（release）

```yaml
# 稳定版
"release" : "stable"

# 金丝雀版本，可以将其称之为测试版中的测试版
"release" : "canary"

# 内测版
"release" : "alpha"

# 公测版
"release" : "beta"
```



## 环境类标签（environment）

```yaml
# 开发
"environment" : "dev"

# 测试
"environment" : "qa"

# 生产
"environment" : "prod"

# 运维
"environment" : "op"。
```



## 应用类（app）

```yaml
"app" : "ui"

"app" : "as"

"app" : "pc"

"app" : "sc"。
```



## 架构类（tier）

```yaml
# 前端
"tier" : "frontend"

# 后端
"tier" : "backend"

# 缓存
"tier" : "cache"
```



## 分区标签（partition）

```yaml
# 客户A
"partition" : "customerA"

# 客户B
"partition" : "customerB"。
```



## 品控级别（Track）

```yaml
# 每天
"track" : "daily"

# 每周
"track" : "weekly"。
```





# Label 管理命令

## 添加

```sh
kubectl label pod label-pod abc=123 # 给名为label-pod的pod添加标签

kubectl label nodes node01 disk=ssd # 给node01节点添加disk标签 
```

## 查看

```bash
kubectl get pod --show-labels # 查看pod，并且显示标签内容

kubectl get pod -l env,tier # 只显示符合键值资源对象的pod
```

## 修改

```sh
kubectl label pod label-pod abc=456 --overwrite # 修改名为label-pod这个pod上的标签 

kubectl label nodes node01 disk=sss -overwrite # 修改节点node01的标签 
```

## 删除

```sh
kubectl label pod label-pod abc- # 删除label-pod这个pod上的键为abc的标签

kubectl label nodes node01 disk- # 删除节点node01的disk标签
```







# ---



# Label Selector 概述

- Label Selector 标签选择器，通过查询条件来匹配相应的标签
- 在为对象定义好Label后，其他对象就可以使用Label Selector（选择器）来定义其作用的对象了

**注意事项：**

- 在使用时还可以将多个Label进行组合来选择
- **同时指定多个选择器时需要以逗号将其分隔，各选择器之间遵循"与"逻辑，即必须要满足所有条件**
- 空值的选择器将不选择任何对象



# Label Selector 类型

Kubernetes API目前支持两种类型的标签选择器：

- 基于等值关系 equality-based
- 基于集合关系 set-based


## equality-based

- **=** 或 **==**  都表示"等值"关系
- **!=** 表示"不等"

### example

```yaml
# 选择所有包含Label中，key等于"name" 并且 value等于"redis-slave" 的对象
name = redis-slave
name == redis-slave


# 选择所有包括Label中，key等于"env" 并且 value不等于"production" 的对象
env != production
env !== production
```



## set-based

KEY：所有存在此键名标签的资源；!KEY：所有不存在此键名标签的资源。

- **KEY in (VALUE1, VALUE2, …)**  
  - 指定的键名的值存在于给定的列表中即满足条件；
  - 在这个集合中
- **KEY not in (VALUE1, VALUE2, …)** 
  - 指定的键名的值不存在于给定列表中即满足条件；
  - 不在这个集合中
- **KEY exists (VALUE1, VALUE2, …)**  
  - 要么全在这个集合中
- **KEY not exists (VALUE1, VALUE2, …)** 
  - 要么都不在这个集合中

### example

```yaml
# 选择所有包含Label中 key等于"name" 并且 value 等于 "redis-master" 或 "redis-slave" 的对象
name in (redis-master, redis-slave)


# 选择所有包含Label中 key等于"name" 并且 value不等于"php-frontend" 的对象
name not in (php-frontend)



# 下面两行写法是否正确？
# key、operator、values 这三个字段是固定的
{key: name,operator: In,values: [zhangsan,lisi]}
# 如果指定为exists，那么values的值一定要为空
{key: age,operator: Exists,values:}
```



## equality-based + set-based

- 在某些对象需要对另一些对象进行选择时，可以将多个Label Selector进行组合，使用逗号","进行分隔即可，基于等式的LabelSelector和基于集合的Label Selector可以任意组合。

```yaml
...
selector: 
  matchLabels:
    name=redis-slave,env!=production
  matchExpressions:
    name not in (php-frontend),env!=production
...
```



# Label Selector Other

- 在使用基于集合的标签选择器同时指定多个选择器之间的逻辑关系为“与”操作
  - 比如：- {key:name,operator: In,values: [zhangsan,lisi]} ，那么只要拥有这两个值的资源，都会被选中
- 使用空值的标签选择器，意味着每个资源对象都被选中
  - 比如：标签选择器的键是“A”，两个资源对象同时拥有A这个键，但是值不一样，这种情况下，如果使用空值的标签选择器，那么将同时选中这两个资源对象
- 空的标签选择器（就是键值都为空），将无法选择出任何资源；
- 在基于集合的选择器中，使用“In”或者“Notin”操作时，其values可以为空，但是如果为空，这个标签选择器，就没有任何意义了。



# ---



# Annotation

https://kubernetes.io/zh-cn/docs/concepts/overview/working-with-objects/annotations/

http://kubernetes.io/docs/user-guide/annotations

- Annotation 可以用于定义注解，也可以用于定义服务的配置参数

- 资源注解是一个非结构化的键值映射，存储在一个可以由外部工具设置以存储和检索任意元数据。他们**不可查询**，应在修改对象时保留

- annotation的名称遵循类似于labels的名称命名格式，但其数据长度不受限制；
- 它不能用于被标签选择器作为筛选条件；但常用于为那些仍处于Beta阶段的应用程序提供临时的配置接口；
- **管理命令：**
  - 添加注解：`kubectl annotate TYPE/NAME KEY=VALUE`
  - 删除注解：` kubectl annotate TYPE/NAME KEY-`

```yaml
# 专用于ServiceAccount的相关的token信息的Secret资源会使用资源注解来保存其使用场景。
kind: Secret
metadata:
  annotations:
    kubernetes.io/service-account.name: node-controller
    kubernetes.io/service-account.uid: b9f7e593-3e49-411c-87e2-dbd7ed9749c0
```
