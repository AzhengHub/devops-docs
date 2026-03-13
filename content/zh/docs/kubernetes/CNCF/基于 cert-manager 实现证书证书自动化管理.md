---
title: "基于 cert-manager 实现证书证书自动化管理"
---


## Cert-Manager 概述
cert-manager 是 Kubernetes 的原生证书管理器（CRD 控制器），它能够为 Kubernetes 或 OpenShift 集群中的工作负载创建 TLS 证书，并在证书到期前自动续订证书。

它的作用是监控 Kubernetes 中的 Certificate 资源，自动向配置的证书颁发者（Issuer）申请证书，获取到证书后生成包含私钥和证书的 Kubernetes Secret（signed keypair），该 Secret 由应用程序 Pod 挂载或由 Ingress 控制器使用。
- 而使用 csi-driver、csi-driver-spiffe 或 istio-csr 时，私钥会在应用程序启动前按需生成；私钥永远不会离开节点，也不会存储在 Kubernetes Secret 中。

cert-manager 可以从各种证书颁发机构获取证书，包括： Let's Encrypt、HashiCorp Vault、 Venafi 和私有 PKI（私有证书颁发机构，自签名证书）。

**参考文档**
- 官网：[https://cert-manager.io](https://cert-manager.io)
- 官方文档：[https://cert-manager.io/docs/](https://cert-manager.io/docs/)
- github：[https://github.com/cert-manager/cert-manager](https://github.com/cert-manager/cert-manager)

---

## Cert-Manager 架构
<!-- {{< figure src="/http/high-level-overview.svg" alt="图片描述" title="图片标题" caption="图片说明" align="center" >}} -->
{{< figure src="/http/high-level-overview.svg" align="center" >}}

**Issuers**（证书颁发者）图中展示了 cert-manager 配置的多个 Issuer 或 ClusterIssuer，这些是不同的证书来源：
- **letsencrypt-prod**：Let's Encrypt 生产环境，用于颁发真实可信的公网证书。
- **letsencrypt-staging**：Let's Encrypt 测试环境，用于开发测试，避免触发频率限制。
- **hashicorp-vault**：HashiCorp Vault 的证书颁发功能（通常通过 Vault 的 PKI secrets engine）。
- **cyberark-saas**：CyberArk 的云托管证书服务（Conjur 或 CyberArk Trust Protection）。
- **cyberark-self-hosted**：自托管的 CyberArk 证书颁发服务。
- 这些 Issuer 都指向同一个 cert-manager，意思是 cert-manager 可以根据不同的需求选择不同的后端来签发证书。

**Certificates**（证书资源）这是 Kubernetes 中的 cert-manager 自定义资源（Certificate CR），代表你想要申请的证书。图中举了两个例子：
- `foo.bar.com` `Issuer: cyberark-saas`（使用 CyberArk 的 SaaS 服务来签发这个域名证书）
- `example.com / www.example.com` `Issuer: letsencrypt-prod`（使用 Let's Encrypt 生产环境签发这个域名证书）


**Kubernetes Secret：**
- cert-manager 在成功从 Issuer 获取证书后，会自动创建一个 Kubernetes Secret。
- 图中用黄色卷轴图标表示，名称为 “signed keypair”，里面包含：
  - tls.key（私钥）
  - tls.crt（证书链）
- 这些 Secret 随后可以被 Ingress、Pod 等资源通过 volume 或环境变量挂载使用，实现 TLS 终止。

---

**整体流程总结：**
1. 你在 Kubernetes 集群中创建 Certificate 自定义资源，指定域名和要使用的 Issuer。
2. cert-manager 监听到这个 Certificate 资源。
3. cert-manager 根据指定的 Issuer 去对应的证书颁发机构申请证书（可能需要 ACME challenge、Vault API 调用等）。
4. 证书签发成功后，cert-manager 生成或更新一个 Kubernetes Secret（包含私钥 + 证书）。
5. 你的应用（如 Ingress Controller）使用这个 Secret 来启用 HTTPS。

**这个架构的优势：**
- 统一管理：所有证书都通过 cert-manager 集中自动化管理，无需手动申请和续期。
- 多后端支持：可以根据不同域名的合规要求，选择不同的 CA（公网用 Let's Encrypt，企业内部域名用 Vault 或 CyberArk）。
- 环境分离：开发用 staging，避免污染生产配额；生产用 prod 或企业内部 CA。
- 安全合规：对于需要更高安全要求的企业，可以用 Vault 或 CyberArk 这种企业级 PKI 系统。

---

## Cert-Manager 核心组件

1. **cert-manager-controller**（主控制器 Deployment）  
   - 这是 cert-manager 的核心大脑。  
   - 负责监控自定义资源（如 Certificate、Issuer、ClusterIssuer、CertificateRequest 等）。  
   - 处理证书的颁发、续期、撤销等整个生命周期。  
   - 运行多个内部控制器（如 certificates、issuers、certificaterequests、orders、challenges 等），协调与外部 CA（如 Let's Encrypt、Vault）的交互。  
   - 通常部署为单副本（使用 leader election 确保高可用）。

2. **cert-manager-webhook**（Webhook Deployment）  
   - 提供 Admission Webhook 服务。  
   - 主要用于验证 cert-manager 的自定义资源（CR）的 API 请求（如 Issuer、Certificate 的创建/更新），确保配置有效。  
   - 同时处理 webhook 自身的 TLS 证书（通常由 cert-manager 自己管理）。  
   - 也是单副本运行。

3. **cert-manager-cainjector**（CA Injector Deployment）  
   - 负责将证书权威（CA）的公钥证书自动注入到 Kubernetes 的资源中。  
   - 典型用途：将 Issuer/ClusterIssuer 引用的 CA 证书注入到 ValidatingWebhookConfiguration、MutatingWebhookConfiguration 和 Pod 的 ConfigMap 中（例如为 Ingress Controller 或 API Server 添加信任）。  
   - 这确保了集群能信任 cert-manager 签发的证书。  
   - 同样使用 leader election，通常单副本。

4. **cert-manager-acmesolver**（ACME Solver Deployment，可选/按需）  
   - 专门处理 ACME 协议的 DNS01 挑战（HTTP01 通常由独立的 per-challenge Pod 处理）。  
   - 当使用 Let's Encrypt 等 ACME Issuer 并选择 DNS01 验证时，会创建这个组件的 Pod 来临时更新 DNS 记录。  
   - 不是常驻的主组件，而是按需运行。

**附加说明：**
- 安装 cert-manager 时（例如通过 Helm 或静态 manifest），会自动部署以上组件的 Pod，可以用 `kubectl get pods -n cert-manager` 查看，通常看到 `cert-manager-*`、`cert-manager-cainjector-*` 和 `cert-manager-webhook-*`。
- 还有一些扩展组件（如 cert-manager-csi-driver、istio-csr 等），但它们不属于核心，而是可选的卫星项目，用于更高级的场景（如 secretless 证书分发）。
- cert-manager 本身还定义了许多 CRD（Custom Resource Definitions），如 Certificate、Issuer 等，这些是 API 资源而非运行组件。

这些组件协同工作，确保 cert-manager 在 Kubernetes 中实现自动化、安全的 TLS 证书管理。

---
## Cert-Manager CRDs
cert-manager 的 **API** 主要基于 Kubernetes 的 **Custom Resource Definitions (CRDs)**，所有自定义资源都属于 API Group `cert-manager.io`（核心部分）和 `acme.cert-manager.io`（ACME 特定部分）。

cert-manager 定义了以下核心 CRDs（可以通过 `kubectl get crd | grep cert-manager.io` 查看）：

| CRD 全名                            | Kind               | 作用域     | 主要用途                                                     |
| ----------------------------------- | ------------------ | ---------- | ------------------------------------------------------------ |
| certificates.cert-manager.io        | Certificate        | Namespaced | 用户最常用的资源：描述所需的 TLS 证书（域名、私钥算法、有效期等），cert-manager 会自动向 Issuer 申请、续期，并将证书+私钥存入 Secret。 |
| certificaterequests.cert-manager.io | CertificateRequest | Namespaced | 代表一个具体的证书签名请求（CSR），包含 PEM 编码的 CSR。通常由 Certificate 资源自动创建，用于与 Issuer 交互。 |
| issuers.cert-manager.io             | Issuer             | Namespaced | 定义命名空间级别的证书颁发者（CA），支持 ACME（Let's Encrypt）、CA、Vault、Venafi 等类型。Certificate 资源引用它来签发证书。 |
| clusterissuers.cert-manager.io      | ClusterIssuer      | Cluster    | 与 Issuer 类似，但集群级别，可被任何命名空间的 Certificate 引用。 |
| orders.acme.cert-manager.io         | Order              | Namespaced | ACME 协议专用的资源：代表向 ACME 服务（如 Let's Encrypt）发起的一个证书订单，管理多个域名的验证过程。 |
| challenges.acme.cert-manager.io     | Challenge          | Namespaced | ACME 协议专用的资源：代表一个域名验证挑战（HTTP-01 或 DNS-01），cert-manager 会自动创建 solver Pod 来完成验证。 |

**说明：**
- **核心流程**：用户创建 **Certificate** → cert-manager 生成 **CertificateRequest** → 根据引用的 **Issuer/ClusterIssuer**（如果是 ACME 类型，会创建 **Order** 和 **Challenge**）→ 最终签发证书。
- **API 版本**：所有以上 CRDs 的稳定版本为 `cert-manager.io/v1` 和 `acme.cert-manager.io/v1`。早期版本有 v1alpha2、v1beta1 等，现已废弃。
- **其他内部/配置 CRD**：cert-manager 还有一些内部配置 CRD（如 controller.config.cert-manager.io/v1alpha1 用于控制器配置），但用户通常不直接操作。
- **查看 API 文档**：完整字段和结构体详见官方 API Reference：https://cert-manager.io/docs/reference/api-docs/

这些 CRDs 构成了 cert-manager 的完整 API 接口，让用户以声明式方式管理 Kubernetes 中的 TLS 证书。

---

## Cert-Manager 部署
### Helm
```yaml
helm repo add cert-manager https://charts.jetstack.io

helm repo update cert-manager

helm pull cert-manager/cert-manager --version v1.16.5

helm show values cert-manager/cert-manager --version 1.16.5 > values-cert-manager-v1.16.5.yaml

# 修改 values-cert-manager-v1.16.5.yaml 文件
...
crds:
  enabled: true # 启用CRD
...

# 安装/升级
helm upgrade --install cert-manager ./cert-manager-v1.16.5.tgz \
  --version 1.16.5 \
  --namespace cert-manager \
  --create-namespace \
  -f values-cert-manager-v1.16.5.yaml

# 验证
kubectl get pod -n cert-manager
kubectl api-resources | grep -i cert-manager
kubectl get crd | grep cert-manager
```
**注意事项：**
> Be sure never to embed cert-manager as a sub-chart of other Helm charts; cert-manager manages non-namespaced resources in your cluster and care must be taken to ensure that it is installed exactly once.

官方文档中说明 cert-manager 在一个 Kubernetes 集群中必须且只能安装一次，如果在同一个集群中安装多个 cert-manager 实例（例如多次 helm install，或者把 cert-manager 当作其他 Helm chart 的 sub-chart 来嵌入），就会导致：
- 多个控制器同时管理同一个集群级资源，造成冲突、竞争或不可预测的行为（例如多个 webhook 同时验证、多个控制器处理同一个 CertificateRequest）。
- 潜在的资源覆盖、错误或集群不稳定。


## Cert-Manager 使用

### 自建 CA 并签发应用证书

**目录结构**
```
cert-manager/
├── 01-root-ca-selfsigned-ClusterIssuer.yaml
├── 02-root-ca-Certificate.yaml
├── 03-root-ca-ClusterIssuer.yaml
│
├── apps/
│   └── backend/
│       ├── certificate-backend-api.yaml
│       └── deployment.yaml
```

#### 创建自签名的根 CA 证书

**01-root-ca-selfsigned-ClusterIssuer.yaml**
- 创建 SelfSigned ClusterIssuer（一次性）；
- 用于“生成”Root CA，而不是长期使用。
```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: root-ca-selfsigned
spec:
  selfSigned: {}
```

**02-root-ca-Certificate.yaml**
- 生成自签名证书的 Secret，其中包括：
  - `tls.key`：根 CA 的私钥，用于签发所有业务证书，**最敏感**，需要严格 RBAC 控制。
  - `tls.crt`：根 CA 的证书（**自签名证书**，包含根 CA 的公钥 + Subject 信息 + 自签名签名等）。
  - `ca.crt`：签发该根 CA 证书的上级 CA 证书（ca.crt 是签发者，tls.crt 是被签发者）。因为是自签名，所以内容与 tls.crt 完全相同，但语义上是“信任链中的 CA 证书”（后面签发普通叶证书时，ca.crt 就会变成真正的上级链）。


```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: root-ca
  namespace: cert-manager
spec:
  # Root CA 的证书与私钥将存储在该 Secret 中（成为整个信任体系的根）
  secretName: root-ca-secret

  # Root CA 有效期可以较长
  duration: 87600h # 10 年
  renewBefore: 8760h # 提前 1 年续期

  # 声明该证书为 CA
  isCA: true

  # 私钥算法与大小
  privateKey:
    algorithm: RSA
    size: 4096

  # 参考哪个 Issuer
  issuerRef:
    name: root-ca-selfsigned
    kind: ClusterIssuer

  # 写入证书 Subject 字段中的内容
  commonName: example-dev-k8s-root-ca
  subject:
    organizations:
      - example
```

**03-root-ca-ClusterIssuer.yaml**
- 基于 Root CA 创建业务用 ClusterIssuer，这个 ClusterIssuer 将被所有业务证书直接使用。
```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: root-ca
spec:
  ca:
    # 直接引用 Root CA 的 Secret
    secretName: root-ca-secret
```

**应用：**
```
kubectl apply -f .
```

#### 用自建根 CA 签发应用证书

```yaml {filename="/root/k8s/manifests/harbor/certificate-harbor.yaml"}
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: harbor-cert # secret 名称
  namespace: harbor # 签发到应用所属的 namespace
spec:
  secretName: harbor-tls # Pod 通过该 Secret 挂载证书
  duration: 2160h # 90 天
  renewBefore: 360h # 15 天
  privateKey:
    algorithm: RSA
    size: 2048
  issuerRef:
    name: root-ca
    kind: ClusterIssuer
  dnsNames:
    - harbor.bj.internal.example.com
  commonName: harbor.bj.internal.example.com
```


### 应用中引用证书

## 监控 Cert-Manager
### Prometheus 配置

### AlertManager 配置