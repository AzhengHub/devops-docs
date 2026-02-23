---
title: "部署"
weight: 2
---


## kubeadm 命令
# 为kubeadm 配置 tab键补全

- 默认 kubeadm 命令是不具有 tab键 补全命令功能的，可以使用以下方式来实现命令补全

```bash
# kubeadm completion bash > /etc/profile.d/kubeadm_completion.sh

# . /etc/profile.d/kubeadm_completion.sh

#按下tab键测试
# kubeadm 
certs       config      init        kubeconfig  token       version     
completion  help        join        reset       upgrade     
```



# 选项简述

```bash
# kubeadm --help
# Usage: kubeadm [command]
...
# Available Commands:
certs       #处理 kubernetes 证书相关命令
completion  #生成 kubeadm 实现 tab键补全的代码
config      #配置管理集群中的 ConfigMap 中持久化的 kubeadm 集群的配置
help        #命令帮助
init        #初始化集群的第一个节点
join        #加入到现有集群节点
kubeconfig  #文件实用程序
reset       #慎用！！初始化集群！！
token       #管理引导令牌
upgrade     #升级集群版本
version     #打印当前 kubeadm 的版本
```





# config

- 生成配置文件

## 列出指定的 kubernetes 依赖的镜像

```bash
# 不指定版本则列出当前 kubeadm 依赖的镜像
# kubeadm config images list
...
k8s.gcr.io/kube-apiserver:v1.23.8
k8s.gcr.io/kube-controller-manager:v1.23.8
k8s.gcr.io/kube-scheduler:v1.23.8
k8s.gcr.io/kube-proxy:v1.23.8
k8s.gcr.io/pause:3.6
k8s.gcr.io/etcd:3.5.1-0
k8s.gcr.io/coredns/coredns:v1.8.6


# 查看当前版本
# kubeadm version
kubeadm version: ...GitVersion:"v1.23.8"...


# 指定版本查询
# kubeadm config images list --kubernetes-version v1.23.8
...
k8s.gcr.io/kube-apiserver:v1.23.8
k8s.gcr.io/kube-controller-manager:v1.23.8
k8s.gcr.io/kube-scheduler:v1.23.8
k8s.gcr.io/kube-proxy:v1.23.8
k8s.gcr.io/pause:3.6
k8s.gcr.io/etcd:3.5.1-0
k8s.gcr.io/coredns/coredns:v1.8.6


#
# docker pull registry.cn-hangzhou.aliyuncs.com/google_containers/kube-apiserver:v1.23.8
```

## 生成初始化集群所需的配置文件

- 输出的文件名可按需指定

```bash
kubeadm config print init-defaults > init-kubecluster.yaml
```

### 生成的配置文件

- 还需加以修改，以及添加一些其它内容

```yaml
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
  advertiseAddress: 1.2.3.4
  bindPort: 6443
nodeRegistration:
  criSocket: /var/run/dockershim.sock
  imagePullPolicy: IfNotPresent
  name: node
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
imageRepository: k8s.gcr.io
kind: ClusterConfiguration
kubernetesVersion: 1.23.0
networking:
  dnsDomain: cluster.local
  serviceSubnet: 10.96.0.0/12
scheduler: {}
```



# init

- init 子命令的主要功能就是初始化集群的第一个节点

- 参考文档：https://kubernetes.io/zh-cn/docs/reference/setup-tools/kubeadm/kubeadm-init/

## init 子命令说明

- **注意：开头标注 * 的表示初始化集群时的必填项或建议添加项**

```bash
* --apiserver-advertise-address string #API 服务器所公布的其正在监听的 IP 地址。如果未设置，则使用默认网络接口。可用于为控制平面节点的 API server 设置广播地址（本master节点的IP地址）

* --apiserver-bind-port int32 #API 服务器绑定的端口，默认值：6443

* --control-plane-endpoint string #为控制平面指定一个稳定的 IP 地址或 DNS 名称。可用于为所有控制平面节点设置共享端点。（haproxy+keepalived 的VIP的地址）

* --image-repository string #选择用于拉取控制平面镜像的容器仓库，默认值："k8s.gcr.io"，国内建议改为 registry.cn-hangzhou.aliyuncs.com/google_containers/ 以实现加速

* --kubernetes-version string #为控制平面选择一个特定的 Kubernetes 版本，默认值："stable-1"

* --pod-network-cidr string #指明 pod 网络可以使用的 IP 地址段。如果设置了这个参数，控制平面将会为每一个节点自动分配 CIDRs。

* --service-cidr string #为服务的虚拟 IP 地址另外指定 IP 地址段， 默认值："10.96.0.0/12"

* --service-dns-domain string #为服务另外指定域名，例如："myorg.internal"。 默认值："cluster.local"

--apiserver-cert-extra-sans strings #用于 API Server 服务证书的可选附加主题备用名称（SAN）。可以是 IP 地址和 DNS 名称。

--cert-dir string #保存和存储证书的路径，默认值："/etc/kubernetes/pki"

--certificate-key string #用于加密 kubeadm-certs Secret 中的控制平面证书的密钥。

--config string #kubeadm 配置文件的路径。

--cri-socket string #要连接的 CRI 套接字的路径。如果为空，则 kubeadm 将尝试自动检测此值；仅当安装了多个 CRI 或具有非标准 CRI 插槽时，才使用此选项。

--dry-run #不要应用任何更改；只是输出将要执行的操作。

--feature-gates string #一组用来描述各种功能特性的键值（key=value）对。选项是：
#PublicKeysECDSA=true|false (ALPHA - 默认值=false)
#RootlessControlPlane=true|false (ALPHA - 默认值=false)
#UnversionedKubeletConfigMap=true|false (BETA - 默认值=true)

--ignore-preflight-errors strings #错误将显示为警告的检查列表；例如：'IsPrivilegedUser,Swap'。取值为 'all' 时将忽略检查中的所有错误。

--node-name string #指定节点的名称。

--patches string #它包含名为 "target[suffix][+patchtype].extension" 的文件的目录的路径。 
#例如，"kube-apiserver0+merge.yaml"或仅仅是 "etcd.json"。 
#"target" 可以是 "kube-apiserver"、"kube-controller-manager"、"kube-scheduler"、"etcd" 之一。 
#"patchtype" 可以是 "strategic"、"merge" 或者 "json" 之一， 并且它们与 kubectl 支持的补丁格式相同。
#默认的 "patchtype" 是 "strategic"。 
#"extension" 必须是"json" 或"yaml"。 
#"suffix" 是一个可选字符串，可用于确定首先按字母顺序应用哪些补丁。

--skip-certificate-key-print #不要打印用于加密控制平面证书的密钥。

--skip-phases strings #要跳过的阶段列表

--skip-token-print #跳过打印 'kubeadm init' 生成的默认引导令牌。

--token string #这个令牌用于建立控制平面节点与工作节点间的双向通信。格式为 [a-z0-9]{6}.[a-z0-9]{16} - 示例：abcdef.0123456789abcdef

--token-ttl duration #令牌被自动删除之前的持续时间（例如 1 s，2 m，3 h）。如果设置为 '0'，则令牌将永不过期，默认值：24h0m0s

--upload-certs #将控制平面证书加密上传到 kubeadm-certs Secret 中。说明： kubeadm-certs Secret 和解密密钥会在两个小时后失效。注意： 正如命令输出中所述，证书密钥可访问集群敏感数据。请妥善保管！

-h, --help #init 操作的帮助命令
```

### 从父命令继承的选项

```bash
--rootfs string #[实验] 到 '真实' 主机根文件系统的路径。
```



## Init 命令的工作流程

`kubeadm init` 命令通过执行下列步骤来启动一个 Kubernetes 控制平面节点。

1. 在做出变更前运行一系列的预检项来验证系统状态。一些检查项目仅仅触发警告， 其它的则会被视为错误并且退出 kubeadm，除非问题得到解决或者用户指定了 `--ignore-preflight-errors=<错误列表>` 参数。
2. 生成一个自签名的 CA 证书来为集群中的每一个组件建立身份标识。 用户可以通过将其放入 `--cert-dir` 配置的证书目录中（默认为 `/etc/kubernetes/pki`） 来提供他们自己的 CA 证书以及/或者密钥。 APIServer 证书将为任何 `--apiserver-cert-extra-sans` 参数值提供附加的 SAN 条目，必要时将其小写。
   - SANs是Subject Alternate Names的简称，SANs证书是一种SSL证书，它支持添加多个域名，允许将多个域名写入同一个证书中，这样就可以保护多个域名，从而降低了运维人员的管理成本，提高了证书管理效率。SAN证书有时也称为统一通信证书(统一通信证书)、多域名证书等。
3. 将 kubeconfig 文件写入 `/etc/kubernetes/` 目录以便 kubelet、控制器管理器和调度器用来连接到 API 服务器，它们每一个都有自己的身份标识，同时生成一个名为 `admin.conf` 的独立的 kubeconfig 文件，用于管理操作。
4. 为 API 服务器、控制器管理器和调度器生成静态 Pod 的清单文件。假设没有提供一个外部的 etcd 服务的话，也会为 etcd 生成一份额外的静态 Pod 清单文件。
   - 静态 Pod 的清单文件被写入到 `/etc/kubernetes/manifests` 目录; kubelet 会监视这个目录以便在系统启动的时候创建 Pod。
   - 一旦控制平面的 Pod 都运行起来， `kubeadm init` 的工作流程就继续往下执行。
5. 对控制平面节点应用标签和污点标记以便不会在它上面运行其它的工作负载。
6. 生成令牌，将来其他节点可使用该令牌向控制平面注册自己。 如 [kubeadm token](https://kubernetes.io/zh/docs/reference/setup-tools/kubeadm/kubeadm-token/) 文档所述， 用户可以选择通过 `--token` 提供令牌。
7. 为了使得节点能够遵照[启动引导令牌](https://kubernetes.io/zh/docs/reference/access-authn-authz/bootstrap-tokens/) 和 [TLS 启动引导](https://kubernetes.io/zh/docs/reference/access-authn-authz/kubelet-tls-bootstrapping/) 这两份文档中描述的机制加入到集群中，kubeadm 会执行所有的必要配置：
   - 创建一个 ConfigMap 提供添加集群节点所需的信息，并为该 ConfigMap 设置相关的 RBAC 访问规则。
   - 允许启动引导令牌访问 CSR 签名 API。
   - 配置自动签发新的 CSR 请求。
   - 更多相关信息，请查看 [kubeadm join](https://kubernetes.io/zh/docs/reference/setup-tools/kubeadm/kubeadm-join/)。
8. 通过 API 服务器安装一个 DNS 服务器 (CoreDNS) 和 kube-proxy 附加组件。 在 Kubernetes 版本 1.11 和更高版本中，CoreDNS 是默认的 DNS 服务器。 请注意，尽管已部署 DNS 服务器，但直到安装 CNI 时才调度它。
9. **警告：从 v1.18 开始，在 kubeadm 中使用 kube-dns 的支持已被废弃，并已在 v1.21 版本中删除。** 



## init 实现初始化集群的第一个节点

### 拉取依赖镜像

- 替换成国内源拉取，**可选项**，因为在执行初始化命令时 kubeadm 会自动去拉取

```bash
# docker pull registry.cn-hangzhou.aliyuncs.com/google_containers/kube-apiserver:v1.23.8

# docker pull registry.cn-hangzhou.aliyuncs.com/google_containers/kube-controller-manager:v1.23.8

# docker pull registry.cn-hangzhou.aliyuncs.com/google_containers/kube-scheduler:v1.23.8

# docker pull registry.cn-hangzhou.aliyuncs.com/google_containers/kube-proxy:v1.23.8

# docker pull registry.cn-hangzhou.aliyuncs.com/google_containers/pause:3.6

# docker pull registry.cn-hangzhou.aliyuncs.com/google_containers/etcd:3.5.1-0

# docker pull registry.cn-hangzhou.aliyuncs.com/google_containers/coredns:v1.8.6
```

### 安装cni网络插件

参考文档：

- https://kubernetes.io/zh-cn/docs/concepts/extend-kubernetes/compute-storage-net/network-plugins/#cni
- https://kubernetes.io/zh-cn/docs/concepts/cluster-administration/networking/#how-to-implement-the-kubernetes-networking-model

默认情况下，如果未指定 kubelet 网络插件，则使用 `noop` 插件？？？？， 该插件设置 `net/bridge/bridge-nf-call-iptables=1`，以确保简单的配置 （如带网桥的 Docker ）与 iptables 代理正常工作。





### 基于配置文件初始化集群

- **常用**





### 基于命令初始化集群

- 不常用

- 记录 `kubeadm init` 执行成功后输出的 `kubeadm join` 命令，后续将使用这个命令将其他节点 join 到此集群中

```bash
kubeadm init --apiserver-advertise-address 10.0.0.100 --apiserver-bind-port 6443 --control-plane-endpoint 10.0.0.68 --image-repository registry.cn-hangzhou.aliyuncs.com/google_containers/ --kubernetes-version v1.23.8 --pod-network-cidr 10.10.0.0/16 --service-cidr 192.168.1.0/20 --service-dns-domain  --upload-certs kubecluster.local
```

```bash
kubeadm init \
--apiserver-advertise-address 10.0.0.100 \
--apiserver-bind-port 6443 \
--control-plane-endpoint 10.0.0.68 \
--image-repository registry.cn-hangzhou.aliyuncs.com/google_containers/ \
--kubernetes-version v1.23.8 \
--pod-network-cidr 10.10.0.0/16 \
--service-cidr 192.168.1.0/20 \
--upload-certs \
--service-dns-domain  kubecluster.local
```



# join

- join 的主要功能就是将当前节点加入到现有集群节点

- 参考文档：https://kubernetes.io/zh-cn/docs/setup/production-environment/tools/kubeadm/create-cluster-kubeadm/#join-nodes