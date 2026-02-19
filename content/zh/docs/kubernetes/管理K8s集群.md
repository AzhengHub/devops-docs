---
title: "管理 K8s 集群"
---

## 远程管理 K8s 集群
在其他主机上远程管理 Kubernetes (K8s) 集群是非常常见且标准的日常操作。它的核心原理其实很简单：**让远程主机上的 `kubectl` 命令行工具，通过认证文件（`kubeconfig`）与目标 K8s 集群的 API Server 建立安全的通信。**

**1. 确保网络连通性**
- 远程主机必须能够访问 K8s 集群的 API Server 的 IP 地址和端口（默认 6443）。可通过 telnet 或 nc 命令测试连通性。


**2. 在远程主机上安装 `kubectl` 工具**
- 可使用 scp 命令将 `kubectl` 二进制文件从 Master 节点复制到远程主机。
- 确保 `kubectl` 可执行权限（`chmod +x kubectl`）。

**3. 拷贝 `kubeconfig` 文件**
- `kubeconfig` 文件包含了集群的连接地址、证书和身份认证信息。
- `kubeconfig` 文件通常存放于 Master 节点的 `~/.kube/config` 路径下（如果是使用 kubeadm 安装的，也可以在 `/etc/kubernetes/admin.conf` 找到）。
- 在远程主机上，创建相同的目录并粘贴内容（或直接通过 `scp` 命令拷贝文件）：
```bash
# 在远程主机上执行
mkdir -p ~/.kube
vim ~/.kube/config  # 将刚刚在 Master 节点看到的内容粘贴进去并保存

```

**4. 检查 API Server 地址**

打开远程主机上的 `~/.kube/config` 文件，找到 `clusters` 下的 `server` 字段：

```yaml
clusters:
- cluster:
    certificate-authority-data: ...
    server: https://<Master-IP>:6443 # 检查这里的 IP 是否为 API Server 的 IP

```

**5. 测试连接**

在远程主机上运行以下命令，验证是否配置成功：

```bash
kubectl get nodes

```

如果能正常打印出集群的节点信息，说明已经成功接管了该集群！


**6. 配置 tab 补全**
```bash
kubectl completion bash >> /etc/profile.d/kubectl_completion.sh
. /etc/profile.d/kubectl_completion.sh
```

---

PS ：如果将来需要在这台远程主机上管理**多个不同的 K8s 集群**，直接覆盖 `~/.kube/config` 会导致旧集群丢失。可以将不同的 config 文件合并，或者使用环境变量 `KUBECONFIG` 来指定：

```bash
export KUBECONFIG=~/.kube/config-cluster1:~/.kube/config-cluster2

```

然后使用 `kubectl config use-context <cluster-name>` 在不同集群间无缝切换。

---


## 获取 yaml 文件的定义方式
- 可通过 `kubectl explain` 命令获取资源的定义方式。
```
kubectl explain Pod.spec.containers.livenessProbe
```