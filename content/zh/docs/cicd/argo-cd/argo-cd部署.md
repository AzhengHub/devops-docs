---
title: "argo-cd 部署"
---

## 通过 Helm 部署
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

# 复制粘贴下面的 values 文件后，安装或更新 argo-cd
helm upgrade --install argocd ./argo-cd-9.3.7.tgz \
  -f values.yaml \
  --namespace argocd \
  --create-namespace
```

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
    nodePort: 30080  # 固定端口
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