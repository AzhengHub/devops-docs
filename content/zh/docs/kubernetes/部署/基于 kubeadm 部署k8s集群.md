---
title: "基于 kubeadm 部署 k8s 集群"
weight: 1
---

# 前言

- 下面使用的是 kubeadm 来部署 k8s 集群
- 目前 kubeadm 工具已经非常成熟，并且便于后期管理；
- 如果使用 ansible 进行二进制安装会带来后期管理的困难，并且 ansible + 二进制安装也不是官方推荐的做法，毕竟这种工具不属于云原生体系的范畴。







# 部署流程概述

1. 任意 master 节点运行 kubeadm init 初始化命令 只在一个 master 节点执行即可（不进行初始化的话 master节点的kubelet会报错）
2. 将其他 master 节点加入到初始化完成的 master节点
3. 验证 master 节点状态
4. 在 node 节点使用 kubeadm 命令将自己加入 k8s master（需要使用 master 生成 token认证）
5. 验证 node 节点状态
6. 创建 pod 并测试网络通信
7. 部署 web 服务 Dashboard
8. k8s 集群升级









# 先决条件

- **注意：下面演示的是安装 k8s 1.23.x 版本**
- 时间同步、关闭iptables等

## 禁用 swap

- 默认需禁用 swap
- `swapoff -a` 后注释或删除 fstab 文件中swap相关的挂载信息

```bash
# free -h
Swap:            0B          0B          0B #表示已经禁用
```

## 开启相关模块

```bash
# 查看相关模块是否开启，两者都有显示即代表开启
# lsmod | grep -E "^(overlay|br_netfilter)"
br_netfilter           28672  0
overlay               118784  0

# 临时加载模块
modprobe br_netfilter
modprobe overlay

# 永久加载模块
cat <<EOF | sudo tee /etc/modules-load.d/k8s.conf
overlay
br_netfilter
EOF
```

## 修改相关内核参数

- 下面只是一些部署k8s集群必要的参数，其它内核参数还需根据生产环境按需修改

```bash
# 设置所需的 sysctl 参数，参数在重新启动后保持不变
cat <<EOF | sudo tee /etc/sysctl.d/k8s.conf
net.bridge.bridge-nf-call-iptables  = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv4.ip_forward                 = 1
EOF

# 应用 sysctl 参数而不重新启动
sudo sysctl --system
```



# 配置 Docker 仓库

- 在所有节点配置

## Debian / Ubuntu

```bash
# 更新仓库
apt-get update


# 安装相关依赖包
apt-get -y install \
apt-transport-https \
ca-certificates \
curl \
gnupg \
lsb-release


# 添加Docker官方的GPG密钥
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg


# 写入软件源信息，从阿里云获取，这样速度更快
echo \
  "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://mirrors.aliyun.com/docker-ce/linux/ubuntu/ \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 更新仓库
apt-get update

# 查看可以安装的 docker-ce 和 docker-ce-cli 版本
apt-cache madison docker-ce docker-ce-cli
```



# 配置 K8s 仓库

- 在所有节点配置

## Debian / Ubuntu

- ps: 由于官网未开放同步方式, 可能会有索引gpg检查失败的情况, 这时请用 `yum install -y --nogpgcheck kubelet kubeadm kubectl` 安装

```bash
curl https://mirrors.aliyun.com/kubernetes/apt/doc/apt-key.gpg | apt-key add - 

apt-get update && apt-get install -y apt-transport-https

cat <<EOF >/etc/apt/sources.list.d/kubernetes.list
deb https://mirrors.aliyun.com/kubernetes/apt/ kubernetes-xenial main
EOF

apt-get update
```

## CentOS / RHEL / Fedora

```
cat <<EOF > /etc/yum.repos.d/kubernetes.repo
[kubernetes]
name=Kubernetes
baseurl=https://mirrors.aliyun.com/kubernetes/yum/repos/kubernetes-el7-x86_64/
enabled=1
gpgcheck=1
repo_gpgcheck=1
gpgkey=https://mirrors.aliyun.com/kubernetes/yum/doc/yum-key.gpg https://mirrors.aliyun.com/kubernetes/yum/doc/rpm-package-key.gpg
EOF

setenforce 0

#指定版本安装。。。。。。
yum install -y kubelet kubeadm kubectl

systemctl enable kubelet && systemctl start kubelet
```





# Container Runtime

## Docker

### 安装 docker

```bash
# 安装
apt -y install \
docker-ce=5:20.10.7~3-0~ubuntu-focal \
docker-ce-cli=5:20.10.7~3-0~ubuntu-focal

# 验证
# docker -v
Docker version 19.03.15, build 99e3ed8919
```

### 配置 docker

- 设置 docker 的 cgroup 驱动为 systemd，以及配置加速

```bash
# vim /etc/docker/daemon.json
{
    "registry-mirrors": ["https://jqm0rnhf.mirror.aliyuncs.com"],
    "exec-opts": ["native.cgroupdriver=systemd"]
}

# systemctl restart docker

# docker info|grep Cgroup
 Cgroup Driver: systemd
```

#### 参考文档：

- https://docs.docker.com/engine/reference/commandline/dockerd/
- https://kubernetes.io/zh-cn/docs/setup/production-environment/container-runtimes/#cgroup-%E9%A9%B1%E5%8A%A8%E7%A8%8B%E5%BA%8F



### k8s 1.24+ 额外配置

- 安装 cri-dockerd
- 使用 cri-dockerd 适配器来将 Docker Engine 与 Kubernetes 集成。

- **注意：在1.24版本以后所有节点只要安装了 docker 就需要安装此组件**

- **cri-dockerd 概述：**
  - 为 Docker Engine 提供了一个 shim ，让您可以通过 Kubernetes [Container Runtime Interface](https://github.com/kubernetes/cri-api#readme)控制 Docker 。
    - shim：shim 是 Kubernetes v1.23 及之前版本中的一个组件。 Kubernetes 系统组件通过它与 Docker Engine 通信
  - cri-docker是一个支持CRI标准的shim（垫片）。一头通过CRI跟kubelet交互，另一头跟docker api交互，从而间接的实现了kubernetes以docker作为容器运行时。但是这种架构缺点也很明显，调用链更长，效率更低。
  - 更推荐使用 containerd 作为kubernetes 的容器运行时。

- **参考文档：**
  - https://kubernetes.io/zh-cn/docs/setup/production-environment/container-runtimes/#docker
  - https://github.com/Mirantis/cri-dockerd
- **下载链接：**
  - https://github.com/Mirantis/cri-dockerd/releases
- 对于 `cri-dockerd`，默认情况下，CRI 套接字是 `/run/cri-dockerd.sock`

```bash
#Ubuntu2004 deb安装

#下载
wget https://github.com/Mirantis/cri-dockerd/releases/download/v0.2.2/cri-dockerd_0.2.2.3-0.ubuntu-focal_amd64.deb


#安装
dpkg -i cri-dockerd_0.2.2.3-0.ubuntu-focal_amd64.deb


#修改service文件
#--network-plugin=cni 指定使用的网络插件？？？？？？？？？？？
#–pod-infra-container-image=registry.aliyuncs.com/google_containers/pause:3.7，用来指定所用的pause镜像是哪个，否则默认拉取k8s.gcr.io/pause:3.6，会导致安装失败。
#kubeadm config images list命令可以看到k8s1.24.2依赖的是pause:3.7
vim /usr/lib/systemd/system/cri-docker.service
...
ExecStart=/usr/bin/cri-dockerd --container-runtime-endpoint fd:// --network-plugin=cni --pod-infra-container-image=registry.aliyuncs.com/google_containers/pause:3.7
...

#重启 cri-docker 然后观察是否正常运行
systemctl daemon-reload
systemctl restart cri-docker.service
systemctl is-active cri-docker.service
```



# Master

**Master 节点必备组件说明：**

- kubeadm
- kubelet
- kubectl（Node 节点虽然也可以部署，但是为了安全通常指安装在 Master 节点上）
- container run time（Docker）
- flannel 或 calico（与 Node 节点统一）

## kubelet & kubeadm & kubectl

```bash
# 指定版本安装
apt-get install -y kubelet=1.23.10-00 kubeadm=1.23.10-00 kubectl=1.23.10-00
```



### 为 kubeadm 配置 tab 键补全

- 默认 kubeadm 命令是不具有 tab键 补全命令功能的，可以使用以下方式来实现命令补全

```bash
kubeadm completion bash > /etc/profile.d/kubeadm-completion.sh

. /etc/profile.d/kubeadm-completion.sh 
```



### 为 kubectl 配置 tab 键补全

- 默认 kubectl命令是不具有 tab键 补全命令功能的，可以使用以下方式来实现命令补全

```bash
kubectl completion bash > /etc/profile.d/kubectl-completion.sh

. /etc/profile.d/kubectl-completion.sh
```





## 提前拉取 init 所需镜像

- 可选项，镜像地址需指向国内

```bash
# kubeadm config images list
I0912 23:59:36.404311   14175 version.go:255] remote version is much newer: v1.25.0; falling back to: stable-1.23
k8s.gcr.io/kube-apiserver:v1.23.10
k8s.gcr.io/kube-controller-manager:v1.23.10
k8s.gcr.io/kube-scheduler:v1.23.10
k8s.gcr.io/kube-proxy:v1.23.10
k8s.gcr.io/pause:3.6
k8s.gcr.io/etcd:3.5.1-0
k8s.gcr.io/coredns/coredns:v1.8.6


# 替换后
registry.cn-hangzhou.aliyuncs.com/google_containers/kube-apiserver:v1.23.10
registry.cn-hangzhou.aliyuncs.com/google_containers/kube-controller-manager:v1.23.10
registry.cn-hangzhou.aliyuncs.com/google_containers/kube-scheduler:v1.23.10
registry.cn-hangzhou.aliyuncs.com/google_containers/kube-proxy:v1.23.10
registry.cn-hangzhou.aliyuncs.com/google_containers/pause:3.6
registry.cn-hangzhou.aliyuncs.com/google_containers/etcd:3.5.1-0
registry.cn-hangzhou.aliyuncs.com/google_containers/coredns/coredns:v1.8.6
```



## init master

- **只需在任意 master 节点执行一次即可**

```yaml
# 生成初始化配置文件模板
kubeadm config print init-defaults > init_k8s_cluster.yaml

# 编辑生成的配置文件模板
# vim init_k8s_cluster.yaml
apiVersion: kubeadm.k8s.io/v1beta3
bootstrapTokens:
- groups:
  - system:bootstrappers:kubeadm:default-node-token
  token: abcdef.0123456789abcdef
  ttl: 24h0m0s
  usages:
  - signing
  - authentication
kind: InitConfiguration
localAPIEndpoint:
  advertiseAddress: 10.0.0.100 # api-server 监听地址
  bindPort: 6443 # api-server 监听端口
nodeRegistration:
  criSocket: /var/run/dockershim.sock # k8s 1.24+ 版本如使用 docker 还需指定 cri socket ；unix:///var/run/cri-dockerd.sock
  imagePullPolicy: IfNotPresent
  name: k8s-master-1 # kubectl get nodes看到的name除将是此名称；见名知意
  taints: null
---
apiServer:
  timeoutForControlPlane: 4m0s
apiVersion: kubeadm.k8s.io/v1beta3
certificatesDir: /etc/kubernetes/pki
clusterName: kubernetes
#controlPlaneEndpoint: 10.0.0.68:6443 # 从SLB 访问 api-server 时需指定，生产中一般定义为域名然后使用DNS解析
controllerManager: {}
dns: {}
etcd:
  local:
    dataDir: /var/lib/etcd
imageRepository: registry.cn-hangzhou.aliyuncs.com/google_containers # 指向国内镜像仓库，registry.aliyuncs.com/google_containers 也行
kind: ClusterConfiguration
kubernetesVersion: 1.23.10 # 指定k8s的版本
networking:
  dnsDomain: k8s.xiangzheng.com # dns 解析的域名
  podSubnet: 10.244.0.0/16 # pod 网段
scheduler: {}


# 执行
kubeadm init --config init_k8s_cluster.yaml
```



### 保存初始化完成后的输出结果

- join 时需要

```bash
Your Kubernetes control-plane has initialized successfully!

To start using your cluster, you need to run the following as a regular user:

  mkdir -p $HOME/.kube
  sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
  sudo chown $(id -u):$(id -g) $HOME/.kube/config

Alternatively, if you are the root user, you can run:

  export KUBECONFIG=/etc/kubernetes/admin.conf

You should now deploy a pod network to the cluster.
Run "kubectl apply -f [podnetwork].yaml" with one of the options listed at:
  https://kubernetes.io/docs/concepts/cluster-administration/addons/

Then you can join any number of worker nodes by running the following on each as root:

kubeadm join 10.0.0.100:6443 --token abcdef.0123456789abcdef \
	--discovery-token-ca-cert-hash sha256:a98b1460e6153e42726954f58571bd0d83a6c8e8000e1a0f98c7b5c0d1acc1f5 
```



### 后续操作

- 如果是普通用户执行以下操作

```bash
mkdir -p $HOME/.kube
sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config
```

- 如果是root用户执行以下操作

```bash
echo 'export KUBECONFIG=/etc/kubernetes/admin.conf' >> /etc/profile.d/kubernetes.sh

. /etc/profile.d/kubernetes.sh
```



### 重置重新操作

```bash
kubeadm reset

# k8s 1.24+
kubeadm reset --cri-socket /var/run/cri-dockerd.sock
```





## flannel

- **每个 k8s 集群只能安装同一个 Pod 网络插件**

- https://github.com/flannel-io/flannel

```bash
# 下载
wget https://raw.githubusercontent.com/flannel-io/flannel/master/Documentation/kube-flannel.yml


# 如果您使用自定义的podCIDR 而不是10.244.0.0/16，则需要修改此处，一般在128行
vim kube-flannel.yml
...
  net-conf.json: |
    {
      "Network": "10.244.0.0/16", #此处改为pod的地址段
      "Backend": {
        "Type": "vxlan"
      }
    }
...

#执行
kubectl apply -f kube-flannel.yml


# 执行以下命令，查看 CoreDNS Pod 是否 Running 来确认其是否正常运行。 一旦 CoreDNS Pod 启用并运行，你就可以继续加入节点。
# kubectl get pods --all-namespaces
NAMESPACE     NAME                           READY   STATUS    RESTARTS        AGE
kube-system   coredns-7f74c56694-ck2z5       1/1     Running   0               139m
kube-system   coredns-7f74c56694-ql8gr       1/1     Running   0               139m
...
```



## join Master

- **未完待续！！！**
- join 其他 Master 节点

- **注意：**由于集群节点通常是按顺序初始化的，CoreDNS Pods 很可能都运行在第一个控制面节点上。 为了提供更高的可用性，请在加入至少一个新节点后 使用 `kubectl -n kube-system rollout restart deployment coredns` 命令，重新平衡 CoreDNS Pods。
- **基于命令行方式 和 基于配置文件方式二选一**
- **join完成后，/etc/cni/net.d/10-flannel.conflist 网络插件配置文件会自动生成，所以无需在其它master节点安装网络插件**

### 获取cert key

- 在首次初始化的master节点执行

```bash
# kubeadm init phase upload-certs --upload-certs --config init_k8s_cluster.yaml 
[upload-certs] Storing the certificates in Secret "kubeadm-certs" in the "kube-system" Namespace
[upload-certs] Using certificate key:
20628110f9b99d1a9933927d5b108a9893fe8c8d1dcd14c1ca71c896f56f577a
```

### 基于命令行方式

- 在所有需要成为 control-plane 节点的主机执行

```bash
kubeadm join 10.0.0.68:6443 \
--token abcdef.0123456789abcdef \
--discovery-token-ca-cert-hash sha256:281130e0b59b82a41ed7ea778c680a486af4017c27d4a2e58cc5aeeede904eb0 \
--control-plane \
--certificate-key 20628110f9b99d1a9933927d5b108a9893fe8c8d1dcd14c1ca71c896f56f577a \
--cri-socket /var/run/cri-dockerd.sock
```

### 基于配置文件方式

- 在所有需要成为 control-plane 节点的主机执行

```bash
#生成join配置文件模板
kubeadm config print join-defaults > join_k8s_cluster.yaml

#编辑生成的配置文件模板
# vim join_k8s_cluster.yaml
```

### 记录 join 成功后的内容

```bash
This node has joined the cluster and a new control plane instance was created:

* Certificate signing request was sent to apiserver and approval was received.
* The Kubelet was informed of the new secure connection details.
* Control plane label and taint were applied to the new node.
* The Kubernetes control plane instances scaled up.
* A new etcd member was added to the local/stacked etcd cluster.

To start administering your cluster from this node, you need to run the following as a regular user:

	mkdir -p $HOME/.kube
	sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
	sudo chown $(id -u):$(id -g) $HOME/.kube/config

Run 'kubectl get nodes' to see this node join the cluster.

```

### 后续操作

- 要从此节点开始管理群集，您需要以普通用户身份运行以下操作：

```bash
mkdir -p $HOME/.kube
sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config
```



### 查看结果

```bash
# kubectl get nodes
NAME                STATUS   ROLES           AGE     VERSION
k8s-master-node-2   Ready    control-plane   29m     v1.24.2
k8s-master-node-3   Ready    control-plane   5m23s   v1.24.2
node                Ready    control-plane   145m    v1.24.2 #NAME 在基于配置文件生成节点时忘记改名了 所以变成了默认的node
```







## 验证 Master

```bash
# kubectl get node
NAME           STATUS   ROLES                  AGE   VERSION
k8s-master-1   Ready    control-plane,master   43m   v1.23.10
```





# Node

又称 Work 节点

**Node 节点必备组件说明：**

- kubeadm
- kubelet
- container run time（Docker）
- flannel 或 calico（与 Master 节点统一）

## kubelet & kubeadm

```bash
# 指定版本安装
apt-get install -y kubelet=1.23.10-00 kubeadm=1.23.10-00
```



## Join Node

- 在所有要加入集群中 node 节点执行
- 此信息来自 master 初始化完成后的输出

```bash
kubeadm join 10.0.0.100:6443 --token abcdef.0123456789abcdef \
--discovery-token-ca-cert-hash sha256:a98b1460e6153e42726954f58571bd0d83a6c8e8000e1a0f98c7b5c0d1acc1f5 
```

### 验证 Node

```bash
# kubectl get node
NAME           STATUS   ROLES                  AGE     VERSION
k8s-master-1   Ready    control-plane,master   50m     v1.23.10
k8s-node-1     Ready    <none>                 5m57s   v1.23.10
```



## After Join Node

- 后续添加 Node 的话还需重新获取 tonken，因为初始化时生成的token默认是有有效期的，当然也可以设为永不过期 但是需要在初始化时添加一些参数
- 先决条件配置过程省略。。。（安装必备组件、关闭swap、禁用selinux、firewall、修改内核参数..）

```bash
# 获取token
# kubeadm token create --print-join-command
kubeadm join 10.0.0.100:6443 --token po11mv.gnpjj40xt443i1u1 --discovery-token-ca-cert-hash sha256:a98b1460e6153e42726954f58571bd0d83a6c8e8000e1a0f98c7b5c0d1acc1f5 


# 在准备好的node节点执行
# kubeadm join 10.0.0.100:6443 --token po11mv.gnpjj40xt443i1u1 --discovery-token-ca-cert-hash sha256:a98b1460e6153e42726954f58571bd0d83a6c8e8000e1a0f98c7b5c0d1acc1f5 


# 等待一段时间后验证
# kubectl get nodes 
NAME           STATUS   ROLES                  AGE     VERSION
k8s-master-1   Ready    control-plane,master   5d15h   v1.23.10
k8s-node-1     Ready    <none>                 5d14h   v1.23.10
k8s-node-2     Ready    <none>                 4m6s    v1.23.10 # Ready
```








# 远程管理k8s集群

## 从控制平面节点以外的计算机控制集群

- 参考文档：https://kubernetes.io/zh-cn/docs/setup/production-environment/tools/kubeadm/create-cluster-kubeadm/#optional-controlling-your-cluster-from-machines-other-than-the-control-plane-node

为了使 kubectl 在其他计算机（例如笔记本电脑）上与你的集群通信， 你需要将管理员 kubeconfig 文件从控制平面节点复制到工作站，如下所示：

```bash
scp root@<control-plane-host>:/etc/kubernetes/admin.conf .

kubectl --kubeconfig ./admin.conf get nodes
```

### 说明：

- 上面的示例假定为 root 用户启用了 SSH 访问。如果不是这种情况， 你可以使用 `scp` 将 `admin.conf` 文件复制给其他允许访问的用户。
- admin.conf 文件为用户提供了对集群的超级用户特权。 **该文件应谨慎使用。对于普通用户，建议生成一个你为其授予特权的唯一证书**。 你可以使用 `kubeadm alpha kubeconfig user --client-name <CN>` 命令执行此操作。 该命令会将 KubeConfig 文件打印到 STDOUT，你应该将其保存到文件并分发给用户。 之后，使用 `kubectl create (cluster)rolebinding` 授予特权。



## 将 API 服务器代理到本地主机

如果要从集群外部连接到 API 服务器，则可以使用 `kubectl proxy`：

```bash
scp root@<control-plane-host>:/etc/kubernetes/admin.conf .

kubectl --kubeconfig ./admin.conf proxy
```

你现在可以在本地访问 API 服务器 `http://localhost:8001/api/v1`。









# 删除k8s集群

参阅：https://kubernetes.io/zh-cn/docs/setup/production-environment/tools/kubeadm/create-cluster-kubeadm/#tear-down







# 问题汇总

**Found multiple CRI endpoints on the host. Please define which one do you wish to use by setting the 'criSocket' field in the kubeadm configuration file: unix:///var/run/containerd/containerd.sock, unix:///var/run/cri-dockerd.sock**
**To see the stack trace of this error execute with --v=5 or higher**

- 指定初始化时使用的配置文件，注意配置文件要开启
- 有的子命令如 join 时无需指定配置文件，只需指定 --cri-socket /var/run/cri-dockerd.sock 即可

```bash
# kubeadm init phase upload-certs --upload-certs --config init_k8s_cluster.yaml 
[upload-certs] Storing the certificates in Secret "kubeadm-certs" in the "kube-system" Namespace
[upload-certs] Using certificate key:
20628110f9b99d1a9933927d5b108a9893fe8c8d1dcd14c1ca71c896f56f577a

#OR

# kubeadm join 10.0.0.68:6443 --token abcdef.0123456789abcdef --discovery-token-ca-cert-hash sha256:281130e0b59b82a41ed7ea778c680a486af4017c27d4a2e58cc5aeeede904eb0 --control-plane --certificate-key 20628110f9b99d1a9933927d5b108a9893fe8c8d1dcd14c1ca71c896f56f577a --cri-socket /var/run/cri-dockerd.sock
...
```





# ---

# 部署 Kubernetes v1.28.2

https://kubernetes.io/zh-cn/docs/setup/production-environment/tools/kubeadm/create-cluster-kubeadm/

# 先决条件

- 禁用 swap

- 转发 IPv4 并让 iptables 看到桥接流量[ ](https://kubernetes.io/zh-cn/docs/setup/production-environment/container-runtimes/#转发-ipv4-并让-iptables-看到桥接流量)


```sh
# 执行下述指令：
cat <<EOF | sudo tee /etc/modules-load.d/k8s.conf
overlay
br_netfilter
EOF

sudo modprobe overlay
sudo modprobe br_netfilter

# 设置所需的 sysctl 参数，参数在重新启动后保持不变
cat <<EOF | sudo tee /etc/sysctl.d/k8s.conf
net.bridge.bridge-nf-call-iptables  = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv4.ip_forward                 = 1
EOF

# 应用 sysctl 参数而不重新启动
sudo sysctl --system

# 确认 br_netfilter 和 overlay 模块被加载：
lsmod | grep -E "(br_netfilter|overlay)"

# 确认 net.bridge.bridge-nf-call-iptables、net.bridge.bridge-nf-call-ip6tables 和 net.ipv4.ip_forward 系统变量在你的 sysctl 配置中被设置为 1：
sysctl net.bridge.bridge-nf-call-iptables net.bridge.bridge-nf-call-ip6tables net.ipv4.ip_forward
```

- 时间同步等...



# 安装容器运行时

- containerd

```sh
# 安装 containerd
wget -P /usr/local/src/ https://github.com/containerd/containerd/releases/download/v1.7.11/containerd-1.7.11-linux-amd64.tar.gz
wget -P /etc/systemd/system https://raw.githubusercontent.com/containerd/containerd/main/containerd.service
tar xvf /usr/local/src/containerd-1.7.11-linux-amd64.tar.gz -C /usr/local/
systemctl daemon-reload 
systemctl enable --now containerd
systemctl is-active containerd
containerd -v
ls /var/run/containerd/containerd.sock

# 安装 runc
wget -P /usr/local/src/ https://github.com/opencontainers/runc/releases/download/v1.1.10/runc.amd64
install -m 755 /usr/local/src/runc.amd64 /usr/local/sbin/runc
runc -v

# 安装 CNI 插件
wget -P /usr/local/src/ https://github.com/containernetworking/plugins/releases/download/v1.4.0/cni-plugins-linux-amd64-v1.4.0.tgz
mkdir -p /opt/cni/bin
tar xvf /usr/local/src/cni-plugins-linux-amd64-v1.4.0.tgz -C /opt/cni/bin
find /opt/cni/bin

# 安装 CLI 工具（crictl）
wget -P /usr/local/src/ https://github.com/kubernetes-sigs/cri-tools/releases/download/v1.28.0/crictl-v1.28.0-linux-amd64.tar.gz
tar xvf /usr/local/src/crictl-v1.28.0-linux-amd64.tar.gz -C /usr/local/bin
crictl -v

# 生成默认配置文件
mkdir /etc/containerd/
containerd config default > /etc/containerd/config.toml

# 指向 sandbox_image 到国内
vim /etc/containerd/config.toml
...
    sandbox_image = "registry.cn-hangzhou.aliyuncs.com/google_containers/pause:3.9"
...
systemctl restart containerd
```



# 安装 kubeadm、kubelet 和 kubectl

- `kubeadm`：用来初始化集群的指令。
- `kubelet`：在集群中的每个节点上用来启动 Pod 和容器等。
- `kubectl`：用来与集群通信的命令行工具。

```sh
# Debian / Ubuntu
apt-get update && apt-get install -y apt-transport-https
curl https://mirrors.aliyun.com/kubernetes/apt/doc/apt-key.gpg | apt-key add - 
cat <<EOF >/etc/apt/sources.list.d/kubernetes.list
deb https://mirrors.aliyun.com/kubernetes/apt/ kubernetes-xenial main
EOF
apt-get update

# 确定安装版本
apt-cache madison kubelet | head

# 指定版本安装
apt-get install -y kubelet=1.28.2-00 kubeadm=1.28.2-00 kubectl=1.28.2-00

# 验证
kubeadm version
```



# 配置 cgroup 驱动

- 配置 systemd cgroup 驱动；
- 需要确保容器运行时和 kubelet 所使用的是相同的 cgroup 驱动，否则 kubelet 进程会失败。

## containerd

```toml
vim /etc/containerd/config.toml
...
         [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runc.options]
...
            SystemdCgroup = true
...
```

## kubelet

- kubeadm 支持在执行 `kubeadm init` 时，传递一个 `KubeletConfiguration` 结构体。 `KubeletConfiguration` 包含 `cgroupDriver` 字段，可用于控制 kubelet 的 cgroup 驱动。
- 在版本 1.22 及更高版本中，如果用户没有在 `KubeletConfiguration` 中设置 `cgroupDriver` 字段， `kubeadm` 会将它设置为默认值 `systemd`。
- https://kubernetes.io/zh-cn/docs/tasks/administer-cluster/kubeadm/configure-cgroup-driver/#%E9%85%8D%E7%BD%AE-kubelet-%E7%9A%84-cgroup-%E9%A9%B1%E5%8A%A8



# 预先拉取镜像

```sh
kubeadm config images list \
--image-repository=registry.cn-hangzhou.aliyuncs.com/google_containers \
--kubernetes-version=v1.28.2
```



# init master node

只需在任意 master 节点执行一次即可

- 生成初始化配置文件模板

```
kubeadm config print init-defaults > init_k8s_cluster.yaml
```

- 编辑生成的配置文件模板

```yaml
# vim init_k8s_cluster.yaml
apiVersion: kubeadm.k8s.io/v1beta3
bootstrapTokens:
- groups:
  - system:bootstrappers:kubeadm:default-node-token
  token: abcdef.0123456789abcdef
  ttl: 24h0m0s
  usages:
  - signing
  - authentication
kind: InitConfiguration
localAPIEndpoint:
  advertiseAddress: 10.0.0.20  # api-server 监听地址
  bindPort: 6443 # api-server 监听端口
nodeRegistration:
  criSocket: unix:///var/run/containerd/containerd.sock
  imagePullPolicy: IfNotPresent
  name: local-k8s-master-1  # 注意，kubectl get nodes看到的name除将是此名称！
  taints: null
---
apiServer:
  timeoutForControlPlane: 4m0s
apiVersion: kubeadm.k8s.io/v1beta3
certificatesDir: /etc/kubernetes/pki
clusterName: kubernetes
controllerManager: {}
dns: {}
etcd:
  local:
    dataDir: /var/lib/etcd
imageRepository: registry.cn-hangzhou.aliyuncs.com/google_containers # 指向国内镜像仓库
kind: ClusterConfiguration
kubernetesVersion: 1.28.2 # 指定k8s的版本
networking:
  dnsDomain: cluster.local # dns 解析的域名
  serviceSubnet: 10.96.0.0/12 # service 网段
scheduler: {}
```

- 初始化

```sh
kubeadm init --config init_k8s_cluster.yaml
```

- 保存初始化完成后的输出结果（join 时需要）

```sh
Your Kubernetes control-plane has initialized successfully!

To start using your cluster, you need to run the following as a regular user:

  mkdir -p $HOME/.kube
  sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
  sudo chown $(id -u):$(id -g) $HOME/.kube/config

Alternatively, if you are the root user, you can run:

  export KUBECONFIG=/etc/kubernetes/admin.conf

You should now deploy a pod network to the cluster.
Run "kubectl apply -f [podnetwork].yaml" with one of the options listed at:
  https://kubernetes.io/docs/concepts/cluster-administration/addons/

Then you can join any number of worker nodes by running the following on each as root:

kubeadm join 10.0.0.20:6443 --token abcdef.0123456789abcdef \
	--discovery-token-ca-cert-hash sha256:d4de6d54c06dc3587c9332cdfee50f0e0f3b81f5408b65d0bc01e5edaf888029 
```

```sh
# root 用户
echo ' export KUBECONFIG=/etc/kubernetes/admin.conf' > /etc/profile.d/kubeconfig.sh
. /etc/profile.d/kubeconfig.sh
```



# 部署 cilium 网络插件

- 略



# join worker node

- 在所有要加入集群中 node 节点执行（此信息来自 master 初始化完成后的输出）

```bash
kubeadm join 10.0.0.20:6443 --token abcdef.0123456789abcdef \
	--discovery-token-ca-cert-hash sha256:d4de6d54c06dc3587c9332cdfee50f0e0f3b81f5408b65d0bc01e5edaf888029 
```

### 验证 Node

```bash
# kubectl get node
NAME           STATUS   ROLES                  AGE     VERSION
k8s-master-1   Ready    control-plane,master   50m     v1.23.10
k8s-node-1     Ready    <none>                 5m57s   v1.23.10
```




## ============================



# 前言

## 各组件版本选择

- 先选择要安装的k8s大版本
  - 如：1.23
- 然后观察其的变更日志
  - https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.23.md#changed-8
- 在变更日志的网页中搜寻docker，找到如下行 即代表支持的docker版本
  - github.com/docker/docker: v20.10.2+incompatible → v20.10.7+incompatible
  - 上文表示docker的v20.10.2版本以上都不支持





# 基于 kubeadm 部署k8s集群流程概述

1. 基础环境准备
2. 在 master 安装指定版本的 kubeadm、kubelet、kubectl、docker
4. 在所有 node 节点安装指定版本的 kubeadm、kubelet、docker**（**kubectl 为可选安装项，主要看是否需要在 node 执行 kubectl 命令进行集群管理及 pod 管理等操作，但通常不会在 node 节点安装 kubectl 因为只要拿到安装 kubectl 的 node 节点的权限 就可以对整个 k8s 集群进行管理 所以这个行为是很危险的**）**
5. master 节点运行 kubeadm init 初始化命令
6. 验证 master 节点状态
8. 在 node 节点使用 kubeadm 命令将自己加入 k8s master（需要使用 master 生成 token认证）
9. 验证 node 节点状态
10. 创建 pod 并测试网络通信
11. 部署 web 服务 Dashboard
12. k8s 集群升级





# 环境说明

- **docker = 19.03.15**
- **kubelet kubeadm kubectl = 1.20.15**
- **OS = Ubuntu 20.04.4 LTS**

| Host Name  | IP         | role                         |
| ---------- | ---------- | ---------------------------- |
| k8s-master | 10.0.0.100 | k8s-master （Control Plane） |
| k8s-work-1 | 10.0.0.101 | k8s-work（node）             |
| k8s-work-2 | 10.0.0.102 | k8s-work（node）             |





# 先决条件

### 禁用 swap

- PS：否则部署时会报错，或者也可以添加一些参数来允许 swap 的存在，但通常不会使用 swap，因为 swap 会影响性能

```bash
# free -h
Swap:            0B          0B          0B #表示已经禁用
```

### 开启相关模块

```bash
#查看相关模块是否开启，两者都有显示即代表开启
# lsmod | grep -E "^(overlay|br_netfilter)"
br_netfilter           28672  0
overlay               118784  0

#临时加载模块
modprobe br_netfilter
modprobe overlay

#永久加载模块
cat <<EOF | sudo tee /etc/modules-load.d/k8s.conf
overlay
br_netfilter
EOF
```

### 修改相关内核参数

- PS：下面只是一些部署k8s集群必要的参数，其它内核参数还需根据生产环境按需修改

```bash
# 设置所需的 sysctl 参数，参数在重新启动后保持不变
cat <<EOF | sudo tee /etc/sysctl.d/k8s.conf
net.bridge.bridge-nf-call-iptables  = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv4.ip_forward                 = 1
EOF

# 应用 sysctl 参数而不重新启动
sudo sysctl --system
```











# master 节点配置

## 安装 docker

- docker 安装过程略

```bash
# docker -v
Docker version 19.03.15, build 99e3ed8919
```

### 配置docker

- 设置 docker 的 cgroup 驱动为 systemd，以及配置加速

参考文档：

- https://docs.docker.com/engine/reference/commandline/dockerd/
- https://kubernetes.io/zh-cn/docs/setup/production-environment/container-runtimes/#cgroup-%E9%A9%B1%E5%8A%A8%E7%A8%8B%E5%BA%8F

```bash
cat <<EOF > /etc/docker/daemon.json
{
    "registry-mirrors": ["https://jqm0rnhf.mirror.aliyuncs.com"],
    "exec-opts": ["native.cgroupdriver=systemd"]
}
EOF

systemctl restart docker

# docker info|grep Cgroup
 Cgroup Driver: systemd
```

### 安装 cri-dockerd

使用 cri-dockerd 适配器来将 Docker Engine 与 Kubernetes 集成。

**注意：在1.24版本以后所有节点只要安装了 docker 就需要安装此组件**

- **cri-dockerd 概述：**
  - 为 Docker Engine 提供了一个 shim ，让您可以通过 Kubernetes [Container Runtime Interface](https://github.com/kubernetes/cri-api#readme)控制 Docker 。
    - shim：shim 是 Kubernetes v1.23 及之前版本中的一个组件。 Kubernetes 系统组件通过它与 Docker Engine 通信
  - cri-docker是一个支持CRI标准的shim（垫片）。一头通过CRI跟kubelet交互，另一头跟docker api交互，从而间接的实现了kubernetes以docker作为容器运行时。但是这种架构缺点也很明显，调用链更长，效率更低。
  - 更推荐使用 containerd 作为kubernetes 的容器运行时。

- **参考文档：**
  - https://kubernetes.io/zh-cn/docs/setup/production-environment/container-runtimes/#docker
  - https://github.com/Mirantis/cri-dockerd
- **下载链接：**
  - https://github.com/Mirantis/cri-dockerd/releases
- 对于 `cri-dockerd`，默认情况下，CRI 套接字是 `/run/cri-dockerd.sock`

```bash
#Ubuntu2004 deb安装

#下载
wget https://github.com/Mirantis/cri-dockerd/releases/download/v0.2.2/cri-dockerd_0.2.2.3-0.ubuntu-focal_amd64.deb


#安装
dpkg -i cri-dockerd_0.2.2.3-0.ubuntu-focal_amd64.deb


#修改service文件
#--network-plugin=cni 指定使用的网络插件？？？？？？？？？？？
#–pod-infra-container-image=registry.aliyuncs.com/google_containers/pause:3.7，用来指定所用的pause镜像是哪个，否则默认拉取k8s.gcr.io/pause:3.6，会导致安装失败。
#kubeadm config images list命令可以看到k8s1.24.2依赖的是pause:3.7
vim /usr/lib/systemd/system/cri-docker.service
...
ExecStart=/usr/bin/cri-dockerd --container-runtime-endpoint fd:// --network-plugin=cni --pod-infra-container-image=registry.aliyuncs.com/google_containers/pause:3.7
...

#重启 cri-docker 然后观察是否正常运行
systemctl daemon-reload
systemctl restart cri-docker.service
systemctl is-active cri-docker.service
```



## 安装 kubelet kubeadm kubectl

- 相关链接：https://developer.aliyun.com/mirror/kubernetes?spm=a2c6h.13651102.0.0.5ce81b11mqDOSy
- ps: 由于官网未开放同步方式, 可能会有索引gpg检查失败的情况, 这时请用 `yum install -y --nogpgcheck kubelet kubeadm kubectl` 安装

- master 节点需要运行静态Pod，所以也需要安装kube-proxy、kubelet（kube-proxy在安装kubelet时基于依赖自动安装）


### Debian / Ubuntu

```bash
curl https://mirrors.aliyun.com/kubernetes/apt/doc/apt-key.gpg | apt-key add - 

apt-get update && apt-get install -y apt-transport-https

cat <<EOF >/etc/apt/sources.list.d/kubernetes.list
deb https://mirrors.aliyun.com/kubernetes/apt/ kubernetes-xenial main
EOF

apt-get update

#指定版本安装
apt-get install -y kubelet=1.24.2-00 kubeadm=1.24.2-00 kubectl=1.24.2-00
```

### CentOS / RHEL / Fedora

```bash
cat <<EOF > /etc/yum.repos.d/kubernetes.repo
[kubernetes]
name=Kubernetes
baseurl=https://mirrors.aliyun.com/kubernetes/yum/repos/kubernetes-el7-x86_64/
enabled=1
gpgcheck=1
repo_gpgcheck=1
gpgkey=https://mirrors.aliyun.com/kubernetes/yum/doc/yum-key.gpg https://mirrors.aliyun.com/kubernetes/yum/doc/rpm-package-key.gpg
EOF

setenforce 0

#指定版本安装。。。。。。
yum install -y kubelet kubeadm kubectl

systemctl enable kubelet && systemctl start kubelet
```

### 为kubeadm 配置 tab键补全

- 默认 kubeadm 命令是不具有 tab键 补全命令功能的，可以使用以下方式来实现命令补全

```bash
kubeadm completion bash > /etc/profile.d/kubeadm_completion.sh

. /etc/profile.d/kubeadm_completion.sh

#按下tab键测试
# kubeadm 
certs       config      init        kubeconfig  token       version     
completion  help        join        reset       upgrade     
```



### 为 kubectl 配置 tab键补全

- 默认 kubeadm 命令是不具有 tab键 补全命令功能的，可以使用以下方式来实现命令补全

```bash
kubectl completion bash > /etc/profile.d/kubectl_completion.sh

. /etc/profile.d/kubectl_completion.sh

# 按下tab键测试
# kubectl 
annotate       autoscale      cp             drain          help           plugin         scale          wait
api-resources  certificate    create         edit           kustomize      port-forward   set            
api-versions   cluster-info   debug          exec           label          proxy          taint          
apply          completion     delete         explain        logs           replace        top            
attach         config         describe       expose         options        rollout        uncordon       
auth           cordon         diff           get            patch          run            version  
```











## 初始化 master 节点

**注意事项：**

- **基于命令方式 和 基于配置文件方式二选一即可**

- **单机集群就无需指定 --control-plane-endpoint 了**

### 基于命令行方式

- 不要忘记指定 --cri-socket /var/run/cri-dockerd.sock

```bash
kubeadm init \
--apiserver-advertise-address 10.0.0.100 \
--apiserver-bind-port 6443 \
--image-repository registry.cn-hangzhou.aliyuncs.com/google_containers \
--kubernetes-version v1.24.2 \
--pod-network-cidr 10.10.0.0/16 \
--service-cidr 192.168.1.0/20 \
--service-dns-domain  \
kubecluster.local \
--cri-socket /var/run/cri-dockerd.sock
```

### 基于配置文件方式

```yaml
#生成初始化配置文件模板
kubeadm config print init-defaults > init_k8s_cluster.yaml

#编辑生成的配置文件模板
# vim init_k8s_cluster.yaml
apiVersion: kubeadm.k8s.io/v1beta3
bootstrapTokens:
- groups:
  - system:bootstrappers:kubeadm:default-node-token
  token: abcdef.0123456789abcdef
  ttl: 24h0m0s
  usages:
  - signing
  - authentication
kind: InitConfiguration
localAPIEndpoint:
  advertiseAddress: 10.0.0.100
  bindPort: 6443
nodeRegistration:
  criSocket: unix:///var/run/cri-dockerd.sock
  imagePullPolicy: IfNotPresent
  name: node #kubectl get nodes看到的name除将是此名称，要设为如：k8s-master-1 以便见名知义
  taints: null
---
apiServer:
  timeoutForControlPlane: 4m0s
apiVersion: kubeadm.k8s.io/v1beta3
certificatesDir: /etc/kubernetes/pki
clusterName: kubernetes
controllerManager: {}
dns: {}
etcd:
  local:
    dataDir: /var/lib/etcd
imageRepository: registry.cn-hangzhou.aliyuncs.com/google_containers
kind: ClusterConfiguration
kubernetesVersion: 1.24.2
networking:
  dnsDomain: kubecluster.local
  podSubnet: 10.10.0.0/16
  serviceSubnet: 192.168.1.0/20
scheduler: {}


#执行
kubeadm init --config init_k8s_cluster.yaml
```

### 保存初始化完成后的输出结果

- join 时需要

```bash
[addons] Applied essential addon: CoreDNS
[addons] Applied essential addon: kube-proxy

Your Kubernetes control-plane has initialized successfully!

To start using your cluster, you need to run the following as a regular user:

  mkdir -p $HOME/.kube
  sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
  sudo chown $(id -u):$(id -g) $HOME/.kube/config

Alternatively, if you are the root user, you can run:

  export KUBECONFIG=/etc/kubernetes/admin.conf

You should now deploy a pod network to the cluster.
Run "kubectl apply -f [podnetwork].yaml" with one of the options listed at:
  https://kubernetes.io/docs/concepts/cluster-administration/addons/

Then you can join any number of worker nodes by running the following on each as root:

kubeadm join 10.0.0.100:6443 --token 5nty7g.t4ac8j5e2x55ug90 \
	--discovery-token-ca-cert-hash sha256:37302ea5a179a191a217bcbaf70baa7e6fac6f6880dff8cb7e13be10c4815d86 
```



### 后续操作

- 如果是普通用户执行以下操作

```bash
mkdir -p $HOME/.kube
sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config
```

- 如果是root用户执行以下操作

```bash
echo 'export KUBECONFIG=/etc/kubernetes/admin.conf' >> /etc/profile.d/kubernetes.sh

. /etc/profile.d/kubernetes.sh
```



### 如果需要重新操作

```bash
kubeadm reset --cri-socket /var/run/cri-dockerd.sock
```





## 安装网络插件

参考文档：

- https://kubernetes.io/zh-cn/docs/setup/production-environment/tools/kubeadm/create-cluster-kubeadm/#pod-network

- **你必须部署一个基于 Pod 网络插件的 [容器网络接口](https://kubernetes.io/zh/docs/concepts/extend-kubernetes/compute-storage-net/network-plugins/#cni) (CNI)，以便你的 Pod 可以相互通信。 在安装网络之前，集群 DNS (CoreDNS) 将不会启动。**
- **每个集群只能安装一个 Pod 网络**

### 部署 flannel

参考文档：

- https://github.com/flannel-io/flannel

```bash
#下载
wget https://raw.githubusercontent.com/flannel-io/flannel/master/Documentation/kube-flannel.yml


#如果您使用自定义的podCIDR 而不是10.244.0.0/16，则需要修改此处，一般在128行
vim kube-flannel.yml
...
  net-conf.json: |
    {
      "Network": "10.10.0.0/16", #此处改为pod的地址段
      "Backend": {
        "Type": "vxlan"
      }
    }
...

#执行
kubectl apply -f kube-flannel.yml


#执行以下命令，查看 CoreDNS Pod 是否 Running 来确认其是否正常运行。 一旦 CoreDNS Pod 启用并运行，你就可以继续加入节点。
# kubectl get pods --all-namespaces
NAMESPACE     NAME                           READY   STATUS    RESTARTS        AGE
kube-system   coredns-7f74c56694-ck2z5       1/1     Running   0               139m
kube-system   coredns-7f74c56694-ql8gr       1/1     Running   0               139m
...
```





## 查看结果

```bash
# kubectl get nodes
NAME                STATUS   ROLES           AGE     VERSION
k8s-master-node-2   Ready    control-plane   29m     v1.24.2
k8s-master-node-3   Ready    control-plane   5m23s   v1.24.2
node                Ready    control-plane   145m    v1.24.2 #NAME 在基于配置文件生成节点时忘记改名了 所以变成了默认的node
```



## 查看目前状态

```bash
# kubectl get node
NAME   STATUS   ROLES           AGE    VERSION
ks-1   Ready    control-plane   170m   v1.24.2
```





# work 节点配置

## 安装 docker

- docker 安装过程略

```bash
# docker -v
Docker version 19.03.15, build 99e3ed8919
```

### 配置docker

- 设置 docker 的 cgroup 驱动为 systemd，以及配置加速

参考文档：

- https://docs.docker.com/engine/reference/commandline/dockerd/
- https://kubernetes.io/zh-cn/docs/setup/production-environment/container-runtimes/#cgroup-%E9%A9%B1%E5%8A%A8%E7%A8%8B%E5%BA%8F

```bash
# vim /etc/docker/daemon.json
{
    "registry-mirrors": ["https://jqm0rnhf.mirror.aliyuncs.com"],
    "exec-opts": ["native.cgroupdriver=systemd"]
}

# systemctl restart docker

# docker info|grep Cgroup
 Cgroup Driver: systemd
```

### 安装 cri-dockerd

使用 cri-dockerd 适配器来将 Docker Engine 与 Kubernetes 集成。

**注意：在1.24版本以后所有节点只要安装了 docker 就需要安装此组件**

- **cri-dockerd 概述：**
  - 为 Docker Engine 提供了一个 shim ，让您可以通过 Kubernetes [Container Runtime Interface](https://github.com/kubernetes/cri-api#readme)控制 Docker 。
    - shim：shim 是 Kubernetes v1.23 及之前版本中的一个组件。 Kubernetes 系统组件通过它与 Docker Engine 通信
  - cri-docker是一个支持CRI标准的shim（垫片）。一头通过CRI跟kubelet交互，另一头跟docker api交互，从而间接的实现了kubernetes以docker作为容器运行时。但是这种架构缺点也很明显，调用链更长，效率更低。
  - 更推荐使用 containerd 作为kubernetes 的容器运行时。

- **参考文档：**
  - https://kubernetes.io/zh-cn/docs/setup/production-environment/container-runtimes/#docker
  - https://github.com/Mirantis/cri-dockerd
- **下载链接：**
  - https://github.com/Mirantis/cri-dockerd/releases
- 对于 `cri-dockerd`，默认情况下，CRI 套接字是 `/run/cri-dockerd.sock`

```bash
#Ubuntu2004 deb安装

#下载
wget https://github.com/Mirantis/cri-dockerd/releases/download/v0.2.2/cri-dockerd_0.2.2.3-0.ubuntu-focal_amd64.deb


#安装
dpkg -i cri-dockerd_0.2.2.3-0.ubuntu-focal_amd64.deb


#修改service文件
#--network-plugin=cni 指定使用的网络插件？？？？？？？？？？？
#–pod-infra-container-image=registry.aliyuncs.com/google_containers/pause:3.7，用来指定所用的pause镜像是哪个，否则默认拉取k8s.gcr.io/pause:3.6，会导致安装失败。
#kubeadm config images list命令可以看到k8s1.24.2依赖的是pause:3.7
vim /usr/lib/systemd/system/cri-docker.service
...
ExecStart=/usr/bin/cri-dockerd --container-runtime-endpoint fd:// --network-plugin=cni --pod-infra-container-image=registry.aliyuncs.com/google_containers/pause:3.7
...

#重启 cri-docker 然后观察是否正常运行
systemctl daemon-reload
systemctl restart cri-docker.service
systemctl is-active cri-docker.service
```



## 安装 kubelet kubeadm

- 相关链接：https://developer.aliyun.com/mirror/kubernetes?spm=a2c6h.13651102.0.0.5ce81b11mqDOSy
- ps: 由于官网未开放同步方式, 可能会有索引gpg检查失败的情况, 这时请用 `yum install -y --nogpgcheck kubelet kubeadm kubectl` 安装

### Debian / Ubuntu

```bash
curl https://mirrors.aliyun.com/kubernetes/apt/doc/apt-key.gpg | apt-key add - 

apt-get update && apt-get install -y apt-transport-https

cat <<EOF >/etc/apt/sources.list.d/kubernetes.list
deb https://mirrors.aliyun.com/kubernetes/apt/ kubernetes-xenial main
EOF

apt-get update

#指定版本安装
apt-get install -y kubelet=1.24.2-00 kubeadm=1.24.2-00
```

### CentOS / RHEL / Fedora

```bash
cat <<EOF > /etc/yum.repos.d/kubernetes.repo
[kubernetes]
name=Kubernetes
baseurl=https://mirrors.aliyun.com/kubernetes/yum/repos/kubernetes-el7-x86_64/
enabled=1
gpgcheck=1
repo_gpgcheck=1
gpgkey=https://mirrors.aliyun.com/kubernetes/yum/doc/yum-key.gpg https://mirrors.aliyun.com/kubernetes/yum/doc/rpm-package-key.gpg
EOF

setenforce 0

#指定版本安装。。。。。。
yum install -y kubelet kubeadm kubectl

systemctl enable kubelet && systemctl start kubelet
```

### 为kubeadm 配置 tab键补全

- 默认 kubeadm 命令是不具有 tab键 补全命令功能的，可以使用以下方式来实现命令补全

```bash
kubeadm completion bash > /etc/profile.d/kubeadm_completion.sh

. /etc/profile.d/kubeadm_completion.sh

#按下tab键测试
# kubeadm 
certs       config      init        kubeconfig  token       version     
completion  help        join        reset       upgrade     
```

## 加入到 master

```bash
kubeadm join 10.0.0.100:6443 --token 5nty7g.t4ac8j5e2x55ug90 \
	--discovery-token-ca-cert-hash sha256:37302ea5a179a191a217bcbaf70baa7e6fac6f6880dff8cb7e13be10c4815d86 \
--cri-socket /var/run/cri-dockerd.sock
```



## 查看最终状态

```bash
# kubectl get nodes 
NAME         STATUS   ROLES           AGE     VERSION
k8s-master   Ready    control-plane   6h29m   v1.24.2
k8s-work-1   Ready    <none>          6h11m   v1.24.2
k8s-work-2   Ready    <none>          15m     v1.24.2
```



# 测试

**测试集群中的 node 节点间是否可以进行通信以及连接外网**

- 如果不能通信 重点排查 net.ipv4.ip_forward 是否开启，网络插件配置文件中的网段是否指向了正确的pod网段

```bash
#部署两个pod
kubectl run net-test1 --image=busybox -- tail -f /etc/hosts
kubectl run net-test2 --image=busybox -- tail -f /etc/hosts


#查看pod
# kubectl get pod -A -o wide
NAMESPACE     NAME                                 READY   STATUS             RESTARTS      AGE     IP           NODE         NOMINATED NODE   READINESS GATES
default       net-test                             0/1     CrashLoopBackOff   4 (70s ago)   3m26s   10.10.1.2    k8s-work-1   <none>           <none>
default       net-test2                            0/1     CrashLoopBackOff   4 (24s ago)   2m46s   10.10.2.2    k8s-work-2   <none>           <none>

#互ping，以及ping外网
# kubectl exec -it net-test1 -- sh
/ # ls
bin   dev   etc   home  proc  root  sys   tmp   usr   var
/ # ip a
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
3: eth0@if8: <BROADCAST,MULTICAST,UP,LOWER_UP,M-DOWN> mtu 1450 qdisc noqueue 
    link/ether 86:8d:2d:93:f0:48 brd ff:ff:ff:ff:ff:ff
    inet 10.10.1.4/24 brd 10.10.1.255 scope global eth0
       valid_lft forever preferred_lft forever
/ # ping 10.10.2.3
PING 10.10.2.3 (10.10.2.3): 56 data bytes
64 bytes from 10.10.2.3: seq=0 ttl=62 time=2.743 ms
...
# ping 180.76.76.76
PING 180.76.76.76 (180.76.76.76): 56 data bytes
64 bytes from 180.76.76.76: seq=0 ttl=127 time=39.891 ms
...

# kubectl exec -it net-test2 -- sh
/ # ip a
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
3: eth0@if7: <BROADCAST,MULTICAST,UP,LOWER_UP,M-DOWN> mtu 1450 qdisc noqueue 
    link/ether 6a:51:42:4b:23:10 brd ff:ff:ff:ff:ff:ff
    inet 10.10.2.3/24 brd 10.10.2.255 scope global eth0
       valid_lft forever preferred_lft forever

/ # ping 10.10.1.4
PING 10.10.1.4 (10.10.1.4): 56 data bytes
64 bytes from 10.10.1.4: seq=0 ttl=62 time=0.758 ms
...
/ # ping 180.76.76.76
PING 180.76.76.76 (180.76.76.76): 56 data bytes
64 bytes from 180.76.76.76: seq=0 ttl=127 time=37.608 ms
...
```



# 远程管理k8s集群

## 从控制平面节点以外的计算机控制集群

- 参考文档：https://kubernetes.io/zh-cn/docs/setup/production-environment/tools/kubeadm/create-cluster-kubeadm/#optional-controlling-your-cluster-from-machines-other-than-the-control-plane-node

为了使 kubectl 在其他计算机（例如笔记本电脑）上与你的集群通信， 你需要将管理员 kubeconfig 文件从控制平面节点复制到工作站，如下所示：

```bash
scp root@<control-plane-host>:/etc/kubernetes/admin.conf .

kubectl --kubeconfig ./admin.conf get nodes
```

### 说明：

- 上面的示例假定为 root 用户启用了 SSH 访问。如果不是这种情况， 你可以使用 `scp` 将 `admin.conf` 文件复制给其他允许访问的用户。
- admin.conf 文件为用户提供了对集群的超级用户特权。 **该文件应谨慎使用。对于普通用户，建议生成一个你为其授予特权的唯一证书**。 你可以使用 `kubeadm alpha kubeconfig user --client-name <CN>` 命令执行此操作。 该命令会将 KubeConfig 文件打印到 STDOUT，你应该将其保存到文件并分发给用户。 之后，使用 `kubectl create (cluster)rolebinding` 授予特权。



## 将 API 服务器代理到本地主机

如果要从集群外部连接到 API 服务器，则可以使用 `kubectl proxy`：

```bash
scp root@<control-plane-host>:/etc/kubernetes/admin.conf .

kubectl --kubeconfig ./admin.conf proxy
```

你现在可以在本地访问 API 服务器 `http://localhost:8001/api/v1`。









# 删除k8s集群

参阅：https://kubernetes.io/zh-cn/docs/setup/production-environment/tools/kubeadm/create-cluster-kubeadm/#tear-down







# 问题汇总

**Found multiple CRI endpoints on the host. Please define which one do you wish to use by setting the 'criSocket' field in the kubeadm configuration file: unix:///var/run/containerd/containerd.sock, unix:///var/run/cri-dockerd.sock**
**To see the stack trace of this error execute with --v=5 or higher**

- 指定初始化时使用的配置文件，注意配置文件要开启
- 有的子命令如 join 时无需指定配置文件，只需指定 --cri-socket /var/run/cri-dockerd.sock 即可

```bash
# kubeadm init phase upload-certs --upload-certs --config init_k8s_cluster.yaml 
[upload-certs] Storing the certificates in Secret "kubeadm-certs" in the "kube-system" Namespace
[upload-certs] Using certificate key:
20628110f9b99d1a9933927d5b108a9893fe8c8d1dcd14c1ca71c896f56f577a

#OR

# kubeadm join 10.0.0.68:6443 --token abcdef.0123456789abcdef --discovery-token-ca-cert-hash sha256:281130e0b59b82a41ed7ea778c680a486af4017c27d4a2e58cc5aeeede904eb0 --control-plane --certificate-key 20628110f9b99d1a9933927d5b108a9893fe8c8d1dcd14c1ca71c896f56f577a --cri-socket /var/run/cri-dockerd.sock
...
```

