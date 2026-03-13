---
title: "Service与Ingress"
---

# Ingress
Ingress 是 Kubernetes 中的一个原生 API 资源对象，用于管理集群外部对集群内部服务的 HTTP 和 HTTPS 访问。它提供了一种声明式的路由规则配置方式，根据主机名（host）、路径（path）等规则，将外部流量路由到不同的后端 Service，从而实现负载均衡、SSL/TLS 终止、基于名称的虚拟主机等功能。
- Ingress 实际上就是七层代理，而 service 是基于 iptables 或 ipvs 实现的四层代理。

**核心概念**
- **Ingress Controller**：负责读取 Ingress 中的配置，然后转换成自身的配置（每一次更新 Ingress 的配置 都会在 Ingress Controller 生成相应的转发规则）
  - 实际实现路由的组件（如 NGINX、Traefik、HAProxy 等），它监视 Ingress 资源的变化，并配置反向代理（如负载均衡器）来处理外部请求。集群中必须部署至少一个 Ingress Controller，Ingress 才能生效。
  - 常见 Ingress Controller：
    - NGINX Ingress Controller（最流行，但官方已宣布将于 2026 年 3 月后停止维护）。
    - Traefik、HAProxy、Istio 等。
    - 云厂商特定：如 GKE 的 Google Cloud Load Balancer、AWS ALB Ingress Controller。
- **Ingress 资源**：定义路由规则的 YAML 对象，仅描述“应该如何路由”，本身不处理流量。
- **IngressClass**：用于指定使用哪个 Controller 处理特定的 Ingress 资源，避免冲突。

相比其他暴露服务的方式（如 NodePort 或 LoadBalancer 类型 Service），Ingress 的优势在于：
- 使用单个外部 IP 暴露多个服务，节省资源。
- 支持高级路由（如路径重写、流量拆分）。
- 便于统一管理域名和 TLS 证书。

注意事项与现状（截至 2025 年底）：
- Kubernetes 官方已冻结 Ingress API 的开发，不再添加新功能，并推荐迁移到更现代的 **Gateway API**（更灵活、支持更多协议和高级特性）。
- Ingress 仍被广泛使用，但对于新项目，建议优先考虑 Gateway API。
- 参考官方文档：https://kubernetes.io/docs/concepts/services-networking/ingress/

Ingress 是 Kubernetes 中暴露 HTTP 服务的最常用方式之一，适合大多数 Web 应用场景。如果需要更复杂的流量管理（如服务网格），可结合 Istio 等工具使用。

参考文档：
- [Ingress | Kubernetes](https://kubernetes.io/zh-cn/docs/concepts/services-networking/ingress/)
- [Ingress 控制器 | Kubernetes](https://kubernetes.io/zh-cn/docs/concepts/services-networking/ingress-controllers/)


---

## Ingress 数据流
1. 客户端访问 Ingress Controller 的 Service（NodePort / LoadBalancer）
2. Ingress Controller 的 Service，会转发到 Ingress Controller 的 Pod
3. Ingress Controller Pod 监视 Ingress 资源和后端 Service 的 Endpoints/EndpointSlices。并根据主机名（host）和路径（path）匹配规则，决定转发到哪个后端 Service。
4. **最后直接将数据报文发送到后端 Pod 而不再经由后端服务的 Service**
  - 转发到后端 Pod 大多数主流 Ingress Controller（如 NGINX Ingress Controller、Traefik）会直接将流量发送到后端 Pod 的 IP（通过监视 Endpoints API 获取），而非经过后端 Service 的 ClusterIP（VIP）和 kube-proxy。
  - 原因：这样可以绕过 kube-proxy 的 L4 负载均衡，支持更高级的 L7 特性（如基于 cookie 的 session affinity、自定义负载均衡算法、正则路径等）。
  - 这不会丢失健康检查或端点更新：Controller 实时监视 Endpoints，避免将流量发送到不健康的或已终止的 Pod。
  - 官方 NGINX Ingress 文档明确说明："The Ingress-Nginx Controller does not use Services to route traffic to the pods. Instead it uses the Endpoints API in order to bypass kube-proxy..."
  - Traefik 类似："Traefik automatically requests endpoint information... will connect directly to the endpoints (pods)"。
  - 这种设计减少了不必要的跳转（少一次 NAT 和 kube-proxy 处理），提升了性能，尤其在高流量场景下。
---

## Ingress 语法
```yaml
apiVersion: networking.k8s.io/v1   # 资源所属的API群组和版本，k8s1.19 后 ingress 才为稳定版v1
kind: Ingress   # 资源类型标识符
metadata:  # 元数据
  name <string>  # 资源名称
  annotations:   # 资源注解
    xxx
  namespace <string>  # 名称空间
spec:
  ingressClassName  <string>   # ingress类名称，用于指定适配的控制器
  rules <[]Object>   # Ingress规则列表
  - host <string>   # 可选字段，虚拟主机的FQDN，支持“*”前缀通配；如未指定host，则只能使用IP进行访问
    http <Object>
      paths <[]Object>   # 虚拟主机PATH定义的列表，由path和backend组成；每个路径都有一个由 serviceName 和 servicePort 定义的关联后端。
      - path <string>   # 流量匹配的HTTP PATH，必须以/开头
        pathType <string>  # 必选字段，支持Exact、Prefix和ImplementationSpecific
        backend <Object>   # 匹配到的流量转发到的目标后端
          resource <Object>   # 引用的同一名称空间下的资源，与service互斥
          service <object>  # 关联的后端Service对象
            name <string>  # 后端Service的名称
            port <object>  # 后端Service上的端口对象
              name <string>   # 端口名称
              number <integer>   # 端口号
  tls <[]Object>   # TLS配置，用于指定上rules中定义的哪些host需要工作HTTPS模式
  - hosts <[]string>   # 使用同一组证书的主机名称列表
    secretName <string>   # 保存于数字证书和私钥信息的secret资源名称
  defaultBackend <Object>   # 默认backend的定义，可嵌套字段及使用格式跟rules字段中的相同
    resource	<Object>
    service	<Object>
```
### .spec.rules[].host
| host        | host 头部         | 匹配与否？                          |
| ----------- | ----------------- | ----------------------------------- |
| `*.foo.com` | `bar.foo.com`     | 基于相同的后缀匹配                  |
| `*.foo.com` | `baz.bar.foo.com` | 不匹配，通配符仅覆盖了一个 DNS 标签 |
| `*.foo.com` | `foo.com`         | 不匹配，通配符仅覆盖了一个 DNS 标签 |

### .spec.rules[].http.paths[].pathType
在 Kubernetes Ingress（API 版本 `networking.k8s.io/v1`）中，每个路径（path）必须显式指定 `pathType`，否则资源验证会失败。自 Kubernetes 1.18 引入该字段以来，支持以下 **三种** 类型：

| pathType              | 描述                                                                 | 匹配行为示例（假设 path: /foo）                                                                 |
|-----------------------|----------------------------------------------------------------------|------------------------------------------------------------------------------------------------|
| **Exact**            | 精确匹配 URL 路径，大小写敏感。必须完全一致，不考虑尾部斜杠差异。     | 匹配：`/foo`<br>不匹配：`/foo/`、`/FOO`、`/foo/bar`                                            |
| **Prefix**           | 前缀匹配，按 `/` 分割路径逐元素匹配，大小写敏感。尾部斜杠被忽略，不支持子字符串匹配。 | 匹配：`/foo`、`/foo/`、`/foo/bar`、`/foo/bar/baz`<br>不匹配：`/foobar`、`/foo/barbaz`          |
| **ImplementationSpecific** | 匹配行为由具体的 IngressClass（Controller）决定。可视为 Prefix/Exact 的变体，或自定义（如支持正则）。许多 Controller 默认等同于 Prefix。 | 取决于 Controller（如 NGINX 可结合注解支持正则匹配）                                           |

**匹配优先级规则**
- 最长路径优先（例如 `/foo/bar` 优先于 `/foo`）。
- 长度相同时，**Exact** 优先于 **Prefix**。
- **ImplementationSpecific** 的优先级取决于具体实现。

---

## Ingress YAML 示例
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: example-ingress
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /$1  # 示例注解，根据 Controller 不同而变
spec:
  rules:
  - host: example.com
    http:
      paths:
      - path: /app1
        pathType: Prefix
        backend:
          service:
            name: app1-service
            port:
              number: 80
      - path: /app2
        pathType: Prefix
        backend:
          service:
            name: app2-service
            port:
              number: 80
  tls:  # 可选：TLS 配置
  - hosts:
    - example.com
    secretName: example-tls-secret
```

---


# Service

# Endpoints
Endpoints 资源代表了 Service 后端实际运行的 Pod 的网络地址（IP 地址和端口）。当一个 Service 被创建时，Kubernetes 会根据 Service 的选择器（`selector`）来查找匹配的 Pod，并将这些 Pod 的 IP 和端口信息填充到 Endpoints 对象中。它是 手动管理服务后端 的方式之一，但在大多数情况下，EndpointSlice 资源和 Endpoint 控制器会自动创建和管理它。

```YAML
apiVersion: v1
kind: Endpoints
metadata:
  name: my-service # Endpoints对象的名称通常与它关联的Service名称相同
subsets:
  - addresses: # 匹配的后端Pod的IP地址列表
      - ip: "10.244.0.4"
      - ip: "10.244.0.5"
    ports: # 匹配的后端Pod的端口列表
      - port: 8080
        name: http
        protocol: TCP
```



# EndpointSlice
EndpointSlice 是一种更具可扩展性和效率的 Endpoints 替代品。它旨在解决在拥有大量 Pod 后端的 Service 中，单个 Endpoints 对象变得非常大而导致的性能问题。每个 EndpointSlice 对象通常只包含少量的 Endpoint（最多约 100 个），这意味着对于一个大型 Service，可能会有多个 EndpointSlice 对象，每个对象包含一部分后端信息。这使得网络传输和客户端（如 kube-proxy）处理更新时更加高效。

```YAML
apiVersion: discovery.k8s.io/v1
kind: EndpointSlice
metadata:
  name: my-service-abcxyz # 自动生成的名称，通常包含Service名称
  labels:
    kubernetes.io/service-name: my-service # 关联的Service名称
addressType: IPv4
ports:
  - name: http
    protocol: TCP
    port: 8080
endpoints: # 包含的具体端点列表
  - addresses: # 后端Pod的IP地址
      - "10.244.0.6"
    conditions: # 端点的状态信息
      ready: true
      serving: true
    hostname: pod-name-a
  - addresses:
      - "10.244.0.7"
    conditions:
      ready: false # 示例：这个Pod尚未准备好接收流量
      serving: true
    hostname: pod-name-b
```

## Endpoints 与 EndpointSlice 的区别
K8s（Kubernetes）中的 **Endpoints** 和 **EndpointSlice** 都是用来跟踪 **Service** 对应后端 Pods 网络地址信息的对象，但 **EndpointSlice** 是为了解决大规模集群中 **Endpoints** 对象的扩展性问题而引入的。

------


| **特性**     | **Endpoints**                                                | **EndpointSlice**                                            |
| ------------ | ------------------------------------------------------------ | ------------------------------------------------------------ |
| **引入时间** | 早期（v1 API）                                               | v1.17 引入，v1.21 默认启用                                   |
| **结构**     | 单个对象，包含所有后端 Pod 地址和端口的完整列表。            | **分片** 的对象，每个对象只包含一部分后端 Pod 地址和端口。   |
| **可扩展性** | **差**：当 Service 后端 Pod 数量巨大时（如数千个），单个 Endpoints 对象会变得非常大，导致： 1. **etcd 压力**：对象更新、存储和监控（watch）消耗大量资源。 2. **网络延迟**：大型对象在网络传输和 API Server 与客户端之间同步时效率低下。 | **好**：将大型 Service 的 Endpoint 信息分割成多个较小的 Slice，显著减少单个对象的大小，从而： 1. **降低 etcd 压力**：更新只影响必要的 Slice。 2. **提高性能**：减少网络开销和处理时间。 |
| **主要用途** | 早期和小型集群。                                             | 推荐用于大规模集群，是 Kube-proxy、Ingress Controller 等组件获取 Service 后端信息的**首选**方式。 |
| **控制器**   | 由 Endpoint Controller 维护。                                | 由 EndpointSlice Controller 维护。                           |

------


### Endpoints (传统方式)



- **格式举例 (简化)**:

  ```JSON
  {
    "apiVersion": "v1",
    "kind": "Endpoints",
    "metadata": {
      "name": "my-service" 
    },
    "subsets": [
      {
        "addresses": [
          {"ip": "10.0.0.1"},
          {"ip": "10.0.0.2"},
          // ... 几千个 IP
        ],
        "ports": [
          {"port": 8080}
        ]
      }
    ]
  }
  ```

- **问题所在**: 想象一个 Service 有 3000 个 Pod 后端。任何一个 Pod 的状态变化（例如重启、IP 变化）都会导致这个包含 3000 个地址的 **巨大** Endpoints 对象被 **完全替换**，给 API Server、etcd 和所有监视它的组件（如 Kube-proxy）带来巨大的负担。



### EndpointSlice (现代方式)



- **设计理念**: **分而治之**。一个 Service 的后端地址不再存储在一个对象中，而是分散存储在多个 EndpointSlice 对象中。

- **分片规则**: 每个 EndpointSlice 默认最多存储大约 **100 个** Endpoints (可以配置)。如果一个 Service 有 3000 个 Pod，它将会有大约 30 个 EndpointSlice 对象。

- **格式举例 (简化)**:

  ```JSON
  // EndpointSlice 1 of 30 for 'my-service'
  {
    "apiVersion": "discovery.k8s.io/v1",
    "kind": "EndpointSlice",
    "metadata": {
      "name": "my-service-abcde",
      "labels": {
        "kubernetes.io/service-name": "my-service"
      }
    },
    "addressType": "IPv4",
    "endpoints": [
      {"addresses": ["10.0.0.1"], "targetRef": ...},
      {"addresses": ["10.0.0.2"], "targetRef": ...},
      // ... 最多约 100 个 endpoints
    ],
    "ports": [
      {"port": 8080}
    ]
  }
  ```

- **优势**: 当 Pod 状态发生变化时，只需要更新或替换包含该 Pod 的 **小型** EndpointSlice 对象，而不是整个 Service 的 Endpoints 列表。这极大地提高了大规模集群的性能和可扩展性。

------




**总结：EndpointSlice 是对 Endpoints 机制的优化升级。**

对于集群内需要获取 Service 后端地址信息的组件（如 Kube-proxy），它们现在主要通过监视 **EndpointSlice** 对象来获取信息，这让 Kubernetes 在处理拥有大量后端 Pod 的 Service 时更高效、更具弹性。