---
title: "Longhorn"
weight: 10
---


## Longhorn 概述
Longhorn 是一款轻量级的云原生分布式块存储系统，它将集群内各个节点的本地物理磁盘聚合为统一的存储池，通过微服务架构和多副本跨节点冗余机制，为业务容器提供开箱即用、高可用且极易维护的持久化数据卷。

核心功能：

1. **聚合底层：** 把零散的本地盘（比如 `/data/longhorn`）统一纳管。
2. **微服务化：** 每个卷都有自己独立的控制器进程（Engine），一挂只挂一个卷，爆炸半径极小。
3. **高可用：** 自动在不同节点间做数据副本（默认 3 副本），节点宕机数据不丢。


## Longhorn 部署
通过 Helm 部署 Longhorn，将存储放在三个 worker 节点上。

### 前期准备
Longhorn 强依赖宿主机操作系统的几个核心组件来实现底层的块设备映射和网络共享。因此必须在 3 个 Worker 节点上安装这些依赖，否则后续 Pod 会一直卡在 ContainerCreating 状态挂载不上存储。

对于 Ubuntu/Debian 系统：
```sh
sudo apt-get update
sudo apt-get install -y open-iscsi nfs-common util-linux

# 确保 iscsid 服务启动并开机自启
sudo systemctl enable --now iscsid

# 检查 iscsid 服务状态
sudo systemctl status iscsid
```

对于 CentOS/RHEL/AlmaLinux 系统：
```sh
sudo yum install -y iscsi-initiator-utils nfs-utils
sudo systemctl enable --now iscsid
sudo systemctl status iscsid
```

### 使用 Helm 部署 Longhorn
#### 下载 chart
```sh
helm repo add longhorn https://charts.longhorn.io

helm repo update

mkdir -p /root/k8s/helm/longhorn/

cd /root/k8s/helm/longhorn/

helm pull longhorn/longhorn --version 1.10.2

# 准备 Longhorn 数据目录（worker 节点执行）
sudo mkdir -p /data/longhorn
```

#### 在 Ingress 层为 Longhorn 创建 Basic Auth 凭证
{{% alert title="<i class='fa-solid fa-exclamation-triangle pe-1'></i> 注意事项" color=warning %}}
Longhorn 自身没有登录鉴权，必须通过 Ingress 加上 Basic Auth，否则任何人都可以访问 Longhorn UI 控制台。
{{% /alert %}}

**第一步：生成账号密码**
```sh
# 安装 htpasswd 工具 (如果未安装)
apt install apache2-utils

# 生成 Basic Auth 凭证，用户名 admin，密码 P@ssw0rd，假设输出为 YWRtaW46JGFwcjEkYkNxa0ZzNmkkLlo3djYxT3dpZy9COFVzYjlCb3pyLw==
echo -n $(htpasswd -nb admin P@ssw0rd)  | base64
```
**第二步：创建认证 Secret 和 Traefik Middleware**
- 在 K8s 里创建一个 Secret 存密码，并创建一个 Traefik 的 Middleware 对象来引用这个 Secret。
```yaml {filename="/root/k8s/manifests/longhorn/longhorn-basic-auth.yaml"}
# 1. 存储密码的 Secret
apiVersion: v1
kind: Secret
metadata:
  name: longhorn-basic-auth
  namespace: longhorn # 必须和 Longhorn 在同一个命名空间
type: Opaque
data:
  # 将生成的 Base64 编码填在这里
  users: YWRtaW46JGFwcjEkYkNxa0ZzNmkkLlo3djYxT3dpZy9COFVzYjlCb3pyLw==

---

# 2. Traefik 的中间件定义
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: longhorn-basic-auth
  namespace: longhorn # 必须和 Longhorn 在同一个命名空间
spec:
  basicAuth:
    secret: longhorn-basic-auth
```

- 应用：
```sh
kubectl create namespace longhorn

kubectl apply -f /root/k8s/manifests/longhorn/longhorn-basic-auth.yaml
```

#### 准备 values 文件
```yaml {filename="values-longhorn-1.10.2.yaml"}
defaultSettings:
  # 1. 核心存储路径 (强烈建议挂载独立的物理盘或 LVM，不要和系统盘混用)
  defaultDataPath: "/data/longhorn"

  # 2. 默认副本数 (你有 3 个 Worker 节点，3 是保证高可用的最佳实践)
  defaultReplicaCount: 3

  # 3. 数据本地化 (开启后，Longhorn 会尽量在跑业务 Pod 的那个节点上保留一份数据副本，大幅降低网络 IO 延迟)
  dataLocality: "best-effort"

  # 4. 存储超分比例 (默认是 100，也就是不超分。如果底层是纯 SSD 且想省钱，可以调高到 150 甚至 200，但要注意监控真实容量)
  storageOverProvisioningPercentage: 100

  # 5. 节点最小剩余空间保护 (默认 25%。当磁盘可用空间低于这个比例时，不再调度新卷，防止把节点盘撑爆)
  storageMinimalAvailablePercentage: 20

persistence:
  # 将默认的回收策略改为 Retain (防止生产环境下 pvc 被删除时，pv 被一并删除导致数据丢失)
  reclaimPolicy: Retain

# ---------------------------------------------------------
# UI 控制台暴露配置 (生产红线：绝对不要裸奔)
# ---------------------------------------------------------
ingress:
  # 生产环境推荐用 Ingress 暴露，方便统一管理证书和域名
  enabled: true
  ingressClassName: "traefik-internal" # 根据实际 Ingress Controller 调整 (如 traefik, nginx)
  annotations:
    # 引用 Traefik Basic Auth 中间件，格式：<命名空间>-<中间件名称>@kubernetescrd
    traefik.ingress.kubernetes.io/router.middlewares: "longhorn-longhorn-basic-auth@kubernetescrd"
  host: "longhorn.bj.internal.example.com" # 内网域名
  tls: true # 生产环境务必配置 TLS 证书
 

# ---------------------------------------------------------
# 组件资源限制 (生产红线：防止存储组件 OOM 或抢占业务 CPU)
# ---------------------------------------------------------
longhornManager:
  resources:
    requests:
      cpu: 200m
      memory: 256Mi
    limits:
      cpu: 1000m
      memory: 1024Mi

longhornInstanceSetup:
  resources:
    requests:
      cpu: 100m
      memory: 128Mi
    limits:
      cpu: 500m
      memory: 512Mi

```

#### 安装/升级 Longhorn
```sh
helm upgrade -i longhorn ./longhorn-1.10.2.tgz --namespace longhorn --create-namespace --values values-longhorn-1.10.2.yaml
```

#### 验证安装状态
```sh
# 检查 Longhorn 组件是否都启动起来
kubectl get all -n longhorn -o wide | less -S

# 检查 StorageClass 是否创建成功
kubectl get sc
```

```sh
# kubectl get sc
NAME                 PROVISIONER          RECLAIMPOLICY   VOLUMEBINDINGMODE   ALLOWVOLUMEEXPANSION   AGE
longhorn (default)   driver.longhorn.io   Retain          Immediate           true                   46s
longhorn-static      driver.longhorn.io   Delete          Immediate           true                   34m
```
longhorn (default) 
- **核心作用：** 用于**动态**创建存储卷。
- **工作流：** 研发写一个 `PVC (PersistentVolumeClaim)` 的 YAML 提交给 K8s，只要不明确指定别的名字，就会默认走这个 SC。Longhorn 的 CSI 插件接到任务后，会**全自动**在底层磁盘划出空间，并**自动**创建一个对应的 `PV (PersistentVolume)` 与之绑定。
- **使用场景：** 这是未来 **99%** 的工作场景。不需要关心底层的卷叫什么名字，随用随建，全自动化。

longhorn-static 
- **核心作用：** 用于**静态**接管已经存在的数据卷。
- **工作流：** 假设在 Longhorn 的 Web UI 面板里手工新建了一个 Volume，或者的某个业务线迁移，带来了一个已经有数据的历史卷。此时，底层数据卷已经存在，但 K8s 并不知道它。就需要手写一个 `PV` 的 YAML，指明 `storageClassName: longhorn-static`，并在配置里填上那个已在 - lume 的名字，从而把它强行“挂载”进 K8s 供 Pod 使用。
- **使用场景：** **灾难恢复 (Disaster Recovery)**、历史数据迁移、或者跨集群接管存储卷等特定运维场景。