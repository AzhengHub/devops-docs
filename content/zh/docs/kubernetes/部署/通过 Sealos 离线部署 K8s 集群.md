---
title: "通过 Sealos 离线部署 K8s 集群"
---

Sealos 的优势在于它将 K8s 的二进制文件、Containerd、CNI 插件（如 Cilium 或 Calico）以及依赖库全部封装在了一个 OCI 镜像中，无需在 Ubuntu 上手动处理繁琐的依赖。
- https://github.com/labring/sealos
以下是针对 **Ubuntu 22.04** + **K8s v1.33.6** 的详细离线部署方案：

### 1. 准备工作

我们需要两台机器：

* **在线机器**：用于下载 Sealos 二进制文件和 K8s 集群镜像。
* **离线目标服务器**：运行 Ubuntu 22.04，准备部署 K8s 的机器。

### 2. 在线机器操作（下载与打包）

在可以联网的电脑上执行以下步骤：

#### 第一步：下载 Sealos CLI

为了支持 K8s v1.33+ 的新特性，建议下载 Sealos 的最新版本（建议 v4.3.7 以上或 v5.x）。

```bash
# 下载 Sealos
wget https://github.com/labring/sealos/releases/download/v5.1.1/sealos_5.1.1_linux_amd64.tar.gz

# 解压并保留二进制文件
tar xvf sealos_5.1.1_linux_amd64.tar.gz sealos

```

#### 第二步：下载并保存 K8s v1.33.6 镜像

Sealos 官方维护的镜像库通常会紧跟 K8s 发行版更新。我们需要将包含 K8s v1.33.6 的镜像拉取并打包为 `.tar` 文件。

```bash
# 1. 拉取镜像
./sealos pull labring/kubernetes:v1.33.6

# 2. 导出为离线包
./sealos save -o kubernetes-v1.33.6.tar labring/kubernetes:v1.33.6
```

> **提示**：如果你需要特定的网络插件（如 Cilium）或存储插件，也可以一并 pull 并 save，例如 `labring/cilium:v1.14.x`。默认 K8s 镜像通常包含 Calico。

### 3. 离线服务器操作（部署）

将下载好的 `sealos` 二进制文件和 `kubernetes-v1.33.6.tar` 复制到离线 Ubuntu 22.04 服务器上（例如 `/root` 目录）。

#### 第一步：环境初始化（Sealos 会自动处理，但建议手动检查）

Ubuntu 22.04 默认开启 `ufw` 防火墙，建议关闭以避免网络插件冲突：

```bash
sudo ufw disable
sudo swapoff -a
# 永久关闭 swap 需编辑 /etc/fstab 注释掉 swap 行

```

#### 第二步：安装 Sealos

```bash
chmod +x sealos
mv sealos /usr/bin/

```

#### 第三步：加载离线镜像

```bash
sealos load -i kubernetes-v1.33.6.tar

```

#### 第四步：一键安装集群

假设你的服务器规划如下：

* Master 节点 IP: `192.168.1.100`
* SSH 密码: `MySecurePass123`

执行安装命令：

```bash
sealos run labring/kubernetes:v1.33.6 \
    --masters 192.168.1.100 \
    --passwd 'MySecurePass123'

```

**如果是多节点集群（例如 1 Master + 2 Workers）：**

```bash
sealos run labring/kubernetes:v1.33.6 \
    --masters 192.168.1.100 \
    --nodes 192.168.1.101,192.168.1.102 \
    --passwd 'MySecurePass123'

```

### 4. 验证安装

安装完成后，Sealos 会自动配置好 `kubectl`。你可以直接在 Master 节点验证：

```bash
# 查看节点状态
kubectl get nodes

# 查看系统 Pod 运行状态（包括 CoreDNS, 网络插件等）
kubectl get pods -A

```

如果所有 Pod 状态均为 `Running`，且 Node 状态为 `Ready`，则说明 **Kubernetes v1.33.6** 已成功在离线 Ubuntu 22.04 环境下部署。

---

### 常见问题排查 (Ubuntu 22.04 特有)

1. **Cgroup v2 问题**：
Ubuntu 22.04 默认使用 Cgroup v2。K8s v1.33 对 Cgroup v2 的支持已经非常成熟，Sealos 的镜像配置中通常会自动检测并配置 `SystemdCgroup=true`。如果你遇到 kubelet 启动失败，请检查 `/etc/containerd/config.toml` 中是否包含 `SystemdCgroup = true`。
2. **AppArmor 问题**：
极少数情况下，Ubuntu 的 AppArmor 策略可能干扰容器。如果遇到权限问题，可尝试暂时停止 AppArmor 服务排查：`systemctl stop apparmor`。
3. **内核版本**：
Ubuntu 22.04 的内核（5.15 或 6.x HWE）完全满足 K8s v1.33 的要求（通常要求 4.19+），无需升级内核。