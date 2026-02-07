---
title: "argo-cd"
---

## 一、argo-cd 概述
Argo CD 是一款专为 Kubernetes 设计的声明式、GitOps 持续交付（CD）工具。它遵循 **GitOps** 核心理念，将 Git 仓库（如 GitLab、GitHub）视为集群状态的“单一真理源”，实现应用配置的版本化管理。

Argo CD 通过持续监控 Git 仓库中的代码变更，能够自动或手动将期望的状态（Desired State）同步到 Kubernetes 集群中，并实时检测集群运行状态与 Git 定义之间的差异（Out-of-Sync）。

它不仅提供了直观的 Web 可视化界面用于查看资源拓扑和监控应用健康度，还具备强大的多集群管理、自动化回滚、RBAC 权限控制以及对 Helm、Kustomize 等多种模板引擎的原生支持，是云原生环境下实现自动化运维和标准化交付的核心组件。

---

## 二、argo-cd 部署

### 1. 通过 Helm 部署
环境：
- Kubernetes v1.33.6
- argo-cd CHART VERSION: 9.3.7（APP VERSION v3.2.6）
- 具体部署什么版本，可参考 argo-cd 的官方文档，最好选择与 Argo CD 版本一起测试的 Kubernetes 版本。

参考文档：
- https://argo-cd.readthedocs.io/en/stable/operator-manual/installation
- https://github.com/argoproj/argo-helm

```sh
# 添加 argo 仓库
helm repo add argo https://argoproj.github.io/argo-helm

# 创建并进入相关目录
mkdir -p helm/argo-cd/
cd helm/argo-cd

# 下载 argo-cd 图表
helm pull argo/argo-cd --version 9.3.7

# 选择并复制粘贴下面的 values 文件后，安装或更新 argo-cd
helm upgrade --install argocd ./argo-cd-9.3.7.tgz \
  -f values.yaml \
  --namespace argocd \
  --create-namespace
```

#### 1.1. values 文件模板
**高可用模式，并通过 NodePort 访问：**
```yaml {filename="values.yaml"}
#  Redis 高可用
redis-ha:
  enabled: true
  # 禁用默认的单点 Redis
redis:
  enabled: false

# Controller 配置
controller:
  replicas: 1 # 注意：Controller 通常保持为 1，除非开启分片(Sharding)。中小规模保持 1 即可避免并发竞争。
  enableStatefulSet: true # 推荐开启，状态更稳定
  metrics:
    enabled: true
    serviceMonitor:
      enabled: true

# Server (API/UI) 配置
server:
  replicas: 3 # API/UI 服务，建议至少 3 个副本
  autoscaling:
    enabled: true
    minReplicas: 3
    maxReplicas: 10
  # 使用 NodePort 暴露服务
  service:
    type: NodePort
    nodePortHttp: null # 不指定，由 Kubernetes 自动分配
    nodePortHttps: 30001 # 固定端口，用于外部访问
  metrics:
    enabled: true
    serviceMonitor:
      enabled: true
  # 强制反亲和性，确保副本分散在不同节点
  affinity:
    podAntiAffinity:
      preferredDuringSchedulingIgnoredDuringExecution:
      - weight: 100
        podAffinityTerm:
          labelSelector:
            matchLabels:
              app.kubernetes.io/name: argocd-server
          topologyKey: kubernetes.io/hostname

# Repo Server 配置
repoServer:
  replicas: 3 # Repo Server 负责拉取代码和渲染，负载较高
  autoscaling:
    enabled: true
    minReplicas: 3
    maxReplicas: 10
  metrics:
    enabled: true
    serviceMonitor:
      enabled: true

#  安全加固
configs:
  params:
    server.insecure: false # 开启https
```

**高可用模式，并通过 Ingress 访问：**
- ...

### 2. 获取访问方式
```sh
# 账号为admin，密码通过以下方式获取
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d ; echo
```

### 3. 配置客户端工具
```sh
# 从本地下载 argo-cd 客户端工具
curl -sk https://10.0.0.101:30001/download/argocd-linux-amd64 -o argocd

# 为 argo-cd 客户端工具添加可执行权限
chmod u+x argocd

# 验证安装结果
argocd version

# 配置 argo-cd 客户端工具
argocd login 10.0.0.101:30001 --insecure --username admin --password $(kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d ; echo)
```

## 三、通过 argo-cd 部署应用
### 1. 准备应用 yaml 文件并上传到 Git 仓库
```yaml {filename="/root/k8s/manifests/myapp/01-deployment.yaml"}
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  namespace: myapp
  labels:
    app: myapp
spec:
  replicas: 1
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
      - name: myapp
        image: ikubernetes/myapp:v1
        imagePullPolicy: IfNotPresent
        resources:
          limits:
            memory: "128Mi"
            cpu: "500m"
          requests:
            memory: "64Mi"
            cpu: "250m"
        ports:
        - containerPort: 80
          name: http
```

```yaml {filename="/root/k8s/manifests/myapp/02-service.yaml"}
apiVersion: v1
kind: Service
metadata:
  name: myapp
  namespace: myapp
  labels:
    app: myapp
spec:
  type: ClusterIP
  selector:
    app: myapp
  ports:
  - name: http
    port: 80
    targetPort: 80
    protocol: TCP
```

---

### 2. argo-cd 中添加 Git 仓库
在首页依次点击 Settings -> Repositories -> Connect Repo 后，添加以下信息：
- **Choose your connection method：** 保持默认 `VIA HTTP/HTTPS`
- **Type：** 保持默认`git`
- **Name (optional)：** 给这个仓库起个好记的名字，比如 `devops-k8s-repo`。以后在列表中能快速认出它是哪个仓库。
- **Project：** 选择 `default`，这是 Argo CD 内部的项目分组，如果没创建过其他 Project，选 default 即可。
- **Repository URL：** 填写实际的 git 仓库地址，例如`http://10.0.0.99/devops/k8s.git`
- **Username (optional)：** git 仓库的用户名
- **Password (optional)：** git 仓库的密码

填写完毕后，点击顶部蓝色的 **CONNECT** 按钮，如果连接成功，将会看到状态栏显示 `Successful`。

---

### 3. 添加应用
方法一：在 Settings -> Repositories 中选择仓库后，点击右侧的三个点来创建应用

方法二：在首页点击 Applications -> New App 来创建应用

接下来的配置分为三大部分，需要按以下内容填写：

**1. General（通用信息）**

* **Application Name：** `myapp` （自定义应用名称）
* **Project Name：** `default`
* **Sync Policy：** 建议初次使用选择 `Manual`（手动同步），熟悉后可选 `Automatic`。
* **Sync Options：** **【重要】** 勾选 `Auto-Create Namespace`。（因为 yaml 中定义了 `namespace: myapp`，如果集群中不存在该命名空间，不勾选此项会导致部署失败。）

**2. Source（来源配置）**

* **Repository URL：** 在下拉菜单中选择你刚才添加的仓库（例如 `http://10.0.0.99/devops/k8s.git`）。
* **Revision：** `HEAD` 或 `main`（分支名）。
* **Path：** 填写 yaml 文件在 Git 仓库中的目录路径。这里应填 `manifests/myapp`。

**3. Destination（目标集群）**

* **Cluster URL：** 选择 `https://kubernetes.default.svc`（代表 Argo CD 所在的当前集群）。
* **Namespace：** `myapp`（虽然 yaml 里写了 namespace，但这里指定后 Argo CD 能更好地管理资源。）


点击顶部的 **CREATE** 按钮创建应用，等待状态变为 `Healthy`（绿色爱心）和 `Synced`（绿色对勾），即表示部署成功。
- 如果选择了 `Manual` 同步策略，点击顶部的 **SYNC** 按钮，在弹窗中点击 **SYNCHRONIZE**。


### 4. 版本更新与回滚

**更新：** 代码推送到 Git 仓库后，Argo CD 会自动检测到变化并触发同步。

**回滚：** 如果需要回滚到之前的版本，点击应用卡片进入详情页，在 **HISTORY AND ROLLBACK** 标签页中选择之前的版本，点击 **ROLLBACK** 按钮即可。