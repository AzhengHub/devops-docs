---
title: "基于 Sealos 离线部署 K8s 集群"
weight: 2
---

Sealos 的优势在于它将 K8s 的二进制文件、Containerd、CNI 插件（如 Cilium 或 Calico）以及依赖库全部封装在了一个 OCI 镜像中，无需在 Ubuntu 上手动处理繁琐的依赖。

参考文档：
- https://github.com/labring/sealos
- https://hub.docker.com/u/labring（Sealos 的官方镜像仓库，包含 K8s 生态中的常见组件）

以下是针对 **Ubuntu 22.04** + **K8s v1.33.6** 的详细离线部署方案：

### 一、先决条件

#### 1. 机器准备

需要准备两类机器：

* **在线机器**：用于下载 Sealos 二进制文件和 K8s 集群镜像。
* **离线目标服务器**：运行 Ubuntu 22.04，准备部署 K8s 的机器。


#### 2. ssh 免密登录
- 需要在控制机（通常是第一个 Master 节点）上配置 ssh 免密登录到所有目标服务器（Master 和 Node 节点）。


### 二、在线机器操作（下载与打包）

在可以联网的电脑上执行以下步骤：

#### 1. 下载 Sealos CLI

```bash
# 下载 Sealos
wget https://github.com/labring/sealos/releases/download/v5.1.1/sealos_5.1.1_linux_amd64.tar.gz

# 解压并保留二进制文件
tar xvf sealos_5.1.1_linux_amd64.tar.gz sealos

# 移动到 /usr/local/bin 目录
mv sealos /usr/local/bin/

# 验证安装
sealos version
```

#### 2. 下载并保存 K8s 与 Calico 镜像
```bash
# 拉取镜像
sealos pull labring/kubernetes:v1.33.6
sealos pull labring/calico:v3.27.4

# 导出为离线包
sealos save -o kubernetes-v1.33.6.tar labring/kubernetes:v1.33.6
sealos save -o calico-v3.27.4.tar labring/calico:v3.27.4
```

### 三、离线服务器操作（部署）

将下载好的 `sealos` 二进制文件、`kubernetes-v1.33.6.tar` 和 `calico-v3.27.4.tar` 复制到某个 Master 节点（例如 `/root` 目录）后，执行以下命令。

#### 1. 加载离线镜像

```bash
sealos load -i kubernetes-v1.33.6.tar
sealos load -i calico-v3.27.4.tar
```

#### 2. 安装 K8s 集群
```bash
sealos run labring/kubernetes:v1.33.6 \
    --masters 10.0.0.101,10.0.0.102,10.0.0.103 \
    --nodes 10.0.0.201,10.0.0.202,10.0.0.203
```

#### 3. 安装 calico 网络插件
```bash
sealos run labring/calico:v3.27.4
```



### 四、验证安装

```bash
# 查看节点状态，正常应为 Ready
kubectl get nodes

# 查看系统 Pod 运行状态（包括 CoreDNS, 网络插件等）
kubectl get pods -A
```


### 五、sealos 底层原理

当执行 `sealos run ...` 时，Sealos 就像一个精密的自动化流水线，严格按照以下顺序在幕后工作：

#### 第一阶段：准备与分发

1. **解析 Clusterfile 与 SSH 连接**
    - Sealos 解析命令行参数（`--masters`, `--nodes`, `--passwd`），在内存中构建集群拓扑对象。
    - 它并发地尝试连接所有目标服务器的 SSH 端口，验证密码/密钥是否正确。
    - **关键点**：如果之前安装过，它会读取本地已有的 `.sealos/default/Clusterfile`，这也是为什么后续安装插件不需要填 IP 的原因。


2. **构建 Overlay 文件系统（Rootfs）**
    - Sealos 采用“集群镜像”概念。它将你指定的 Kubernetes 镜像（`labring/kubernetes:v1.33.6`）和其他插件镜像视为层（Layer）。
    - 它利用联合文件系统（类似 Docker 的 Overlay2 技术）将这些层合并，生成一个包含所有二进制文件（kubelet, kubectl）、配置模板、容器镜像的完整文件系统结构。    


3. **并发分发文件**
    - Sealos 通过 SFTP/SCP 将自身的二进制文件 (`sealos`) 和上述构建好的 Rootfs 数据包分发到**所有节点**的 `/var/lib/sealos` 目录下。
    - 它不仅仅是拷贝，还会解压并挂载这些目录，直接把 `kubelet`、`kubectl` 等二进制文件链接到 `/usr/bin` 下，无需你去下载。  



#### 第二阶段：基建与环境

4. **初始化系统环境 (System Init)**
    - 在所有节点上执行标准化的 OS 初始化脚本：
    - **关闭防火墙** (ufw/firewalld) 和 SELinux。
    - **关闭 Swap**。
    - **加载内核模块** (`br_netfilter`, `ip_vs` 等)。
    - **调整内核参数** (`net.ipv4.ip_forward=1` 等)。
    - **修改主机名** (Hostname)。   

5. **启动私有仓库 (Private Registry)**
    - **核心步骤**：Sealos 在**第一台 Master** 上启动一个轻量级的 Registry 进程（通常是一个 Docker 容器或二进制进程），挂载之前分发好的离线镜像数据。
    - 这个 Registry 监听 `5000` 端口（这就是你看到的 `:5000` 来源）。   


6. **配置 DNS 欺骗 (Hosts Injection)**
    - Sealos 修改**所有节点**的 `/etc/hosts` 文件，添加一行：
        - `10.0.0.101  sealos.hub` (假设 101 是第一台 Master)。
    - 同时，它配置所有节点的 Containerd/Docker，使其信任 `sealos.hub:5000` 这个不安全的私有仓库。
    - **结果**：所有节点拉镜像时，虽然请求的是 `sealos.hub`，实际流量走的都是内网，去第一台 Master 拉取。



#### 第三阶段：高可用与运行时

7. **配置高可用代理 (lvscare)**
    - Sealos 在**所有 Worker 节点**上，通过静态 Pod 的方式，部署`lvscare`。可通过以下命令查询：
        - `kubectl get pod -A -o wide | grep lvscare`
        - `cat /etc/kubernetes/manifests/kube-sealos-lvscare.yaml`（在 Worker 节点上查看）
    - `lvscare` 的作用是做**负载均衡**，将发往 Kubernetes API Server 的流量轮询转发给所有的 Master 节点。可通过以下命令查询：
        - `kubectl get svc kubernetes -n default -o wide`（API Server 通过 ClusterIP 在集群内部映射）
        - `ipvsadm -Ln`（可在 master 和 worker 节点查看 IPVS 负载均衡规则）
    - **目的**：如果 Master01 挂了，Worker 节点会自动通过 `lvscare` 切换连接到 Master02，保证集群不瘫痪。
    - 补充说明：
        ```sh
        root@localhost-k8s-worker-02:~# ipvsadm -Ln
        IP Virtual Server version 1.2.1 (size=4096)
        Prot LocalAddress:Port Scheduler Flags
          -> RemoteAddress:Port           Forward Weight ActiveConn InActConn
        # 10.96.0.1:443 是 Kubernetes API Server 的 ClusterIP，由 kube-proxy 管理，用于 Pod 内部访问 API Server。
        TCP  10.96.0.1:443 rr
          -> 10.0.0.101:6443              Masq    1      1          0         
          -> 10.0.0.102:6443              Masq    1      0          0         
          -> 10.0.0.103:6443              Masq    1      1          0         
        ...    
        # 10.103.97.2 是由 lvscare 维护的 VIP，用于 Worker 节点的 Kubelet 访问 API Server，可通过 ip route get 10.103.97.2 查询。
        TCP  10.103.97.2:6443 rr
          -> 10.0.0.101:6443              Masq    1      1          0         
          -> 10.0.0.102:6443              Masq    1      0          0         
          -> 10.0.0.103:6443              Masq    1      1          0         
        ```


##### 为什么要搞两个 IP（10.96.0.1 和 10.103.97.2）？
既然已经有官方的 `10.96.0.1` 了，Sealos 为什么还要自己在 Worker 上再造一个 `10.103.97.2`？”

这是一个非常经典的 **“鸡生蛋，蛋生鸡”** 的高可用难题：

1. **启动顺序问题**：
    - Worker 节点启动时，**Kubelet** 是第一个启动的。
    - Kubelet 必须先连接上 API Server，才能注册自己，然后才能下载并启动 Pod（包括 `kube-proxy` Pod）。
    - 如果 Kubelet 依赖 `10.96.0.1`，但维护这个 IP 的 `kube-proxy` 还没启动（或者挂了），Kubelet 就永远连不上 Master，节点就废了。


2. **Sealos 的解法**：
    - Sealos 引入了轻量级的 `lvscare`（静态 Pod，由 Kubelet 直接启动，不依赖 API Server）。
    - `lvscare` 维护一个独立的 VIP (`10.103.97.2`)。
    - Sealos 把 Worker 节点的 Kubelet 配置文件（kubeconfig）里的 Server 地址指向这个 VIP。
    - **结果**：即使 `kube-proxy` 挂了，或者还没启动，Kubelet 依然可以通过 `lvscare` 的 VIP 连上 Master。


为了彻底证实这一点，可以检查 Worker 节点上的这两个文件，一切就会真相大白：

**验证一：Kubelet 到底连谁？**
在 **Worker 节点** 执行：

```bash
# 查看 kubeconfig 连接的地址
grep server /etc/kubernetes/kubelet.conf

```

**预测结果**：你应该会看到 `server: https://apiserver.cluster.local:6443`。

**验证二：域名解析给谁？**
在 **Worker 节点** 执行：

```bash
# 查看 hosts 映射
cat /etc/hosts | grep apiserver

```

**预测结果**：你应该会看到 `10.103.97.2 apiserver.cluster.local`。
*(这就证实了 Kubelet 走的是 Sealos 的专用 VIP `10.103.97.2`)*


**总结：**

| IPVS 规则 | IP 地址 | 来源组件 | 谁在用它？ | 作用 |
| --- | --- | --- | --- | --- |
| **规则 A** | `10.96.0.1` | **Kube-Proxy** | **Pods** (如 CoreDNS) | K8s 标准服务发现，Pod 内部访问 API |
| **规则 B** | `10.103.97.2` | **Lvscare** | **Kubelet** (宿主机) | **节点高可用**，保证 kube-proxy 挂了节点也能活 |

---

8. **生成 Kubeadm 配置**
    - Sealos 根据模板动态生成 `kubeadm-config.yaml`。它会自动填入正确的 `imageRepository: sealos.hub:5000`，确保 `kubeadm` 初始化时去私有仓库拉镜像，而不是去公网。



#### 第四阶段：K8s 启动

9. **Master01 初始化 (Kubeadm Init)**
    - 在第一台 Master 上执行 `kubeadm init --config ...`。
    - 这一步会启动核心组件（API Server, Controller Manager, Scheduler, Etcd）。 
    - **关键点**：初始化完成后，Master01 会生成一个 `kubeadm join` 命令，后续 Worker 节点加入时需要用到。


10. **分发证书与 Join (Masters Join)**
    - 初始化成功后，Sealos 将 Master01 生成的证书（`/etc/kubernetes/pki`）复制到 Master02 和 Master03。
    - 在 Master02/03 上执行 `kubeadm join --control-plane ...`，将它们加入控制面。
    - **关键点**：`--control-plane` 标志表示这是一个主节点，会启动额外的组件（如 API Server, Controller Manager）。 


11. **Worker 节点加入 (Nodes Join)**
    - 在所有 Worker 节点上执行 `kubeadm join ...`，将它们连接到集群。



#### 第五阶段：插件应用与收尾

12. **应用插件层 (Apply Addons)**
    - K8s 核心启动后，Sealos 开始处理你追加的镜像（如 Calico）。
    - 它通过 Helm 或 kubectl，将镜像里预置的 YAML 文件应用到集群中。    
    - **关键点**：此时 K8s 会根据 YAML 去 `sealos.hub:5000` 拉取 Calico 镜像（因为之前已经配置好了 hosts 和 trust）。   


13. **保存状态 (Save State)**
    - 最后，Sealos 将当前的集群信息（节点列表、角色、版本）序列化保存到 `Clusterfile` 中。
    - 这就结束了整个流程。  

**总结成一句话：**
Sealos 是一个**精密的搬运工和配置员**。它把所有东西搬到内网，搭好本地仓库，改好 DNS，配好负载均衡，最后替你敲下了 `kubeadm` 命令。
