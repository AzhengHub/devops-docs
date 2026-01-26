---
title: "Kubernetes"
---

## 一、前言

在 Kubernetes 生产环境中，仅备份 etcd 并不足以实现应用级的快速恢复。本文档详细整理了基于 **Velero** 的集群备份与恢复方案。

Velero 是一个云原生灾备工具，支持 K8s 资源对象（YAML）和持久化卷数据（PV）的统一备份：

1. **方案一：Restic/Kopia（文件系统级备份）**
* **原理**：通过在每个节点运行 Pod 访问本地挂载卷，直接读取文件并上传至对象存储。
* **适用场景**：任何支持挂载的存储（NFS, Ceph, HostPath 等）、跨云平台迁移、无快照能力的存储。
* **特点**：通用性强，但对于海量小文件备份速度较慢。


2. **方案二：Volume Snapshot（存储快照级备份）**
* **原理**：调用云厂商或存储侧的 CSI 快照接口进行物理备份。
* **适用场景**：公有云环境（EBS, OSS, Azure Disk）、支持 CSI 快照的私有化存储（Ceph, NetApp）。
* **特点**：备份/恢复速度极快，性能损耗小，但依赖底层存储硬件能力。



## 二、注意事项

**Namespace 映射**：

* 在将备份恢复到新集群时，可以实现 Namespace 的重新命名映射。

**存储类（StorageClass）兼容性**：

* 如果原集群和目标集群的 StorageClass 名称不一致，需在恢复时配置 `configmap` 进行映射转换。

**备份 Hooks**：

* 对于有状态应用（如 MySQL/ES），备份前应通过 `Pre-backup Hook` 执行 `flush tables with read lock`，确保数据一致性。

**插件版本一致性**：

* Velero 客户端版本、服务端版本以及对应的插件（如 AWS/MinIO 插件）版本需严格匹配。

## 三、环境部署

### 1. 安装 Velero 客户端

```bash
# 下载二进制包
wget https://github.com/vmware-tanzu/velero/releases/download/v1.12.0/velero-v1.12.0-linux-amd64.tar.gz
tar -xvf velero-v1.12.0-linux-amd64.tar.gz
mv velero /usr/local/bin/ && velero version --client

```

### 2. 初始化 Velero 服务端（以 MinIO 为例）

```bash {filename="install_velero.sh"}
# 准备 MinIO 凭证
cat > credentials-velero <<EOF
[default]
aws_access_key_id = minioadmin
aws_secret_access_key = minioadmin
EOF

# 执行安装
velero install \
  --provider aws \
  --plugins velero/velero-plugin-for-aws:v1.7.0 \
  --bucket k8s-backup \
  --secret-file ./credentials-velero \
  --use-node-agent \
  --use-volume-snapshots=false \
  --backup-location-config region=minio,s3ForcePathStyle="true",s3Url=http://minio-service.storage.svc:9000

```

---

## 四、备份操作

### 1. 手动执行备份

#### 1.1 备份整个 Namespace

```bash
# 备份 production 命名空间，并保留 72 小时
velero backup create backup-prod-$(date +%Y%m%d) \
  --include-namespaces production \
  --ttl 72h0m0s

```

#### 1.2 带有选择器的特定资源备份

```bash
velero backup create app-backup \
  --selector app=nginx \
  --include-resources deployments,configmaps

```

### 2. 自动化定时备份 (Schedule)

类似于 ES 的 SLM 策略，Velero 通过 Schedule 对象实现周期性备份。

```bash {filename="velero_schedule.yaml"}
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: daily-backup
  namespace: velero
spec:
  schedule: "0 1 * * *" # 每天凌晨 1 点执行
  template:
    includedNamespaces:
    - "*"
    excludedNamespaces:
    - kube-system
    - velero
    ttl: 720h0m0s # 保留 30 天
    snapshotVolumes: true
    storageLocation: default

```

### 3. 查看备份状态

```bash
# 查看所有备份任务列表
velero backup get

# 查看特定备份的详细日志和错误信息
velero backup describe backup-prod-20260125 --details
velero backup logs backup-prod-20260125

```

---

## 五、数据恢复

### 1. 恢复到当前集群（误删恢复）

```bash
# 从指定的备份创建恢复任务
velero restore create --from-backup backup-prod-20260125 \
  --include-namespaces production \
  --wait

```

### 2. 跨集群/Namespace 迁移恢复

不覆盖原空间，将 `production` 空间的数据恢复到 `production-test`。

```bash
velero restore create restore-for-test \
  --from-backup backup-prod-20260125 \
  --namespace-mappings production:production-test

```

### 3. 验证恢复进度

```bash
# 查看恢复任务状态
velero restore get

# 查看详细恢复报告（包括哪些跳过了，哪些失败了）
velero restore describe restore-for-test

# 检查 Pod 和 PV 状态
kubectl get pods -n production-test
kubectl get pvc -n production-test

```

## 六、进阶技巧：故障排查

* **备份一直处于 InProgress**：
检查 `velero node-agent`（原 Restic）的日志，确认是否存在节点证书过期或无法连接 MinIO 的问题。
* **PV 恢复后状态为 Pending**：
检查新集群的 `StorageClass` 是否存在，或者是否需要使用 `ConfigMap` 进行名称重映射。
* **数据不一致**：
检查是否正确配置了 `Pre-backup Hooks`，确保在备份快照生成前内存数据已落盘。