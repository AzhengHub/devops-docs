---
title: "Pod自动扩缩容"
weight: 10
---

# Pod 扩容/缩容相关方法
- HPA & VPA

## 自动 扩容/缩容

- Horizontal Pod Autoscaler（HPA）
- Vertical Pod Autoscaler（VPA）

## 手动 扩容/缩容

- 通过修改 yaml 文件中的 replicas 数量
- 在 dashboard 中更改 deployment 的 pod 值
- 通过 kubectl scale 命令
- 通过 kubectl edit 命令

## PS

- 自动扩容可以根据 Pod 的负载(如CPU负载、内存使用率等) 来进行动态扩容和缩容
- 手动扩容虽然需手动执行，但也可以通过  kubectl scale 等命令写入计划任务中在业务高峰期/低谷期来进行动态扩容和缩容







# 测试使用的 yaml 文件

```yaml
# cat nginx.yaml 
apiVersion: v1
kind: Namespace
metadata:
  name: nginx

---

apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
  labels:
    app: nginx-deployment-label
  namespace: nginx
spec:
  replicas: 1
  selector:
    matchLabels:
      app: nginx-deployment-label
  template:
    metadata:
      labels:
        app: nginx-deployment-label
    spec:
      restartPolicy: Always
      containers:
      - name: nginx-container
        image: nginx
        imagePullPolicy: Always
        ports:
        - containerPort: 80
          name: http
          protocol: TCP
        resources:
          requests:   
            cpu: 20m
            memory: 32Mi   
          limits:   
            cpu: 20m  
            memory: 64Mi

---

kind: Service
apiVersion: v1
metadata:
  labels:
    app: nginx-service
  name: nginx-service
  namespace: nginx
spec:
  type: NodePort
  ports:
  - name: http
    port: 80
    protocol: TCP
    targetPort: 80
    nodePort: 30003
  selector:
    app: nginx-deployment-label
```







# Metrics-Server

https://github.com/kubernetes-sigs/metrics-server

- metrics-server 从 kubelet 中获取资源指标（CPU & 内存），并通过 Metrics API 在 Kubernetes API 服务器中公开它们，以供 HPA 和 VPA 使用。 你还可以使用 `kubectl top` 命令查看这些指标。
  - metrics-server 收集的指标会存储在内存中，并不会持久保存
  - metrics-server 默认每 15 秒收集一次指标（在 Pod 数量众多的情况下，15采集一次数据就已经很频繁了，可以在 yaml 文件中修改此值）

- PS：Metrics Server 不适用于非自动缩放目的。例如，不要使用它来将指标转发到监控解决方案，或作为监控解决方案指标的来源。在这种情况下，请直接从 Kubelet`/metrics/resource`端点收集指标。

## Deploy

### Yaml

#### 下载 yaml 文件

```bash
# 普通安装
wget https://github.com/kubernetes-sigs/metrics-server/releases/download/v0.6.1/components.yaml


# 高可用安装（默认启用两个副本，replicas: 2）
wget https://github.com/kubernetes-sigs/metrics-server/releases/download/v0.6.1/high-availability.yaml
```

#### 修改 yaml 文件

- 主要是将镜像源指向国内或本地 harbor 仓库

```bash
# vim high-availability.yaml
...
        image: registry.aliyuncs.com/google_containers/metrics-server:v0.6.1
...
```

#### 安装

```bash
kubectl apply -f high-availability.yaml
```



### Helm

https://github.com/kubernetes-sigs/metrics-server#helm-chart

https://artifacthub.io/packages/helm/metrics-server/metrics-server

#### 添加储存库

```sh
# 添加储存库
# helm repo add metrics-server https://kubernetes-sigs.github.io/metrics-server/
"metrics-server" has been added to your repositories


# 验证储存库
root@k8s-master-1:~# helm repo list
NAME                	URL                                               
...          
metrics-server      	https://kubernetes-sigs.github.io/metrics-server/ 


# 

```

#### 修改 values 文件

- 从 chart hub 中下载 values文件加以修改，主要是指向国内镜像
- values-metrics-server.yaml

```yaml
#
# Default values for metrics-server.
# This is a YAML-formatted file.
# Declare variables to be passed into your templates.

image:
  # 指向国内镜像
  repository: registry.aliyuncs.com/google_containers/metrics-server
  #repository: k8s.gcr.io/metrics-server/metrics-server
  # Overrides the image tag whose default is v{{ .Chart.AppVersion }}
  tag: ""
  pullPolicy: IfNotPresent

imagePullSecrets: []
# - registrySecretName

nameOverride: ""
fullnameOverride: ""

serviceAccount:
  # Specifies whether a service account should be created
  create: true
  # Annotations to add to the service account
  annotations: {}
  # The name of the service account to use.
  # If not set and create is true, a name is generated using the fullname template
  name: ""

rbac:
  # Specifies whether RBAC resources should be created
  create: true
  pspEnabled: false

apiService:
  # Specifies if the v1beta1.metrics.k8s.io API service should be created.
  #
  # You typically want this enabled! If you disable API service creation you have to
  # manage it outside of this chart for e.g horizontal pod autoscaling to
  # work with this release.
  create: true

podLabels: {}
podAnnotations: {}

podSecurityContext: {}

securityContext:
  allowPrivilegeEscalation: false
  readOnlyRootFilesystem: true
  runAsNonRoot: true
  runAsUser: 1000

priorityClassName: system-cluster-critical

containerPort: 4443

hostNetwork:
  # Specifies if metrics-server should be started in hostNetwork mode.
  #
  # You would require this enabled if you use alternate overlay networking for pods and
  # API server unable to communicate with metrics-server. As an example, this is required
  # if you use Weave network on EKS
  enabled: false

replicas: 1

updateStrategy: {}
#   type: RollingUpdate
#   rollingUpdate:
#     maxSurge: 0
#     maxUnavailable: 1

podDisruptionBudget:
  # https://kubernetes.io/docs/tasks/run-application/configure-pdb/
  enabled: false
  minAvailable:
  maxUnavailable:

defaultArgs:
  - --cert-dir=/tmp
  - --kubelet-preferred-address-types=InternalIP,ExternalIP,Hostname
  - --kubelet-use-node-status-port
  - --metric-resolution=15s
  - --kubelet-insecure-tls

args: []

livenessProbe:
  httpGet:
    path: /livez
    port: https
    scheme: HTTPS
  initialDelaySeconds: 0
  periodSeconds: 10
  failureThreshold: 3

readinessProbe:
  httpGet:
    path: /readyz
    port: https
    scheme: HTTPS
  initialDelaySeconds: 20
  periodSeconds: 10
  failureThreshold: 3

service:
  type: ClusterIP
  port: 443
  annotations: {}
  labels: {}
  #  Add these labels to have metrics-server show up in `kubectl cluster-info`
  #  kubernetes.io/cluster-service: "true"
  #  kubernetes.io/name: "Metrics-server"

metrics:
  enabled: false

serviceMonitor:
  enabled: false
  additionalLabels: {}
  interval: 1m
  scrapeTimeout: 10s

resources: {}

extraVolumeMounts: []

extraVolumes: []

nodeSelector: {}

tolerations: []

affinity: {}
```

#### 安装

```sh
helm install metrics-server metrics-server/metrics-server -n kube-system -f values-metrics-server.yaml
```



### 故障排错

- **Readiness probe failed: HTTP probe failed with statuscode: 500**

```bash
# 解决方案1：忽略证书(仅用于测试)
# vim components.yaml
...
    spec:
      containers:
      - args:
        - --cert-dir=/tmp
        - --secure-port=4443
        - --kubelet-preferred-address-types=InternalIP,ExternalIP,Hostname
        - --kubelet-use-node-status-port
        - --metric-resolution=15s
        - --kubelet-insecure-tls #添加此行
...


# 解决方案2：Kubelet 证书需要由群集证书颁发机构签名(k8s集群二进制安装从而实现证书签名)
...


# 相关排错命令
kubectl describe  apiservices.apiregistration.k8s.io v1beta1.metrics.k8s.io

kubectl describe pod -n kube-system metrics-server-864d8c5bc7-tfwl7

kubectl logs -n kube-system metrics-server-864d8c5bc7-ckbcp
```



### 验证

```bash
# 查看生成的 Metrics API
# kubectl api-versions |grep metrics
metrics.k8s.io/v1beta1

# kubectl api-resources |grep metrics
nodes                                                                  metrics.k8s.io/v1beta1                 false        NodeMetrics
pods                                                                   metrics.k8s.io/v1beta1                 true         PodMetrics


---


# kubectl top node
NAME           CPU(cores)   CPU%        MEMORY(bytes)   MEMORY%     
k8s-master-1   201m         10%         1273Mi          45%         
k8s-node-1     70m          3%          783Mi           27%      

# kubectl top pod -n kube-system etcd-k8s-master-1 
NAME                CPU(cores)   MEMORY(bytes)   
etcd-k8s-master-1   33m          116Mi      


---


# kubectl get --raw "/apis/metrics.k8s.io/v1beta1/nodes/k8s-node-1" | jq .
{
  "kind": "NodeMetrics",
  "apiVersion": "metrics.k8s.io/v1beta1",
  "metadata": {
    "name": "k8s-node-1",
    "creationTimestamp": "2022-11-15T07:38:56Z",
    "labels": {
      "beta.kubernetes.io/arch": "amd64",
      "beta.kubernetes.io/os": "linux",
      "kubernetes.io/arch": "amd64",
      "kubernetes.io/hostname": "k8s-node-1",
      "kubernetes.io/os": "linux"
    }
  },
  "timestamp": "2022-11-15T07:38:37Z",
  "window": "20.082s",
  "usage": {
    "cpu": "82765573n",
    "memory": "801896Ki"
  }
}


# kubectl get --raw "/apis/metrics.k8s.io/v1beta1/namespaces/kube-system/pods/etcd-k8s-master-1" | jq '.'
{
  "kind": "PodMetrics",
  "apiVersion": "metrics.k8s.io/v1beta1",
  "metadata": {
    "name": "etcd-k8s-master-1",
    "namespace": "kube-system",
    "creationTimestamp": "2022-11-15T07:41:48Z",
    "labels": {
      "component": "etcd",
      "tier": "control-plane"
    }
  },
  "timestamp": "2022-11-15T07:41:36Z",
  "window": "17.119s",
  "containers": [
    {
      "name": "etcd",
      "usage": {
        "cpu": "27164641n",
        "memory": "119396Ki"
      }
    }
  ]
}
```



# Horizontal Pod Autoscaler（HPA）

- **注意：HPA的优先级最高（即副本数参考HPA最终定义的值）**
- v2版支持根据其他指标来进行动态扩缩容，如http qps，但需要配合Prometheus-xxx-xxx

## 参考文档

- https://kubernetes.io/zh-cn/docs/tasks/run-application/horizontal-pod-autoscale/
- https://kubernetes.io/zh-cn/docs/tasks/run-application/horizontal-pod-autoscale-walkthrough/
- https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/cloudprovider/alicloud/README.md
- https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#autoscale

## 实现前测试

```bash
# 模拟客户端请求
root@client:~# ab -c300  -n1000000 http://10.0.0.100:30003/
...


# 服务端即使达到cpu的设置上限 也不会扩容pod
root@k8s-master:~# kubectl top pod -n nginx 
NAME                                CPU(cores)   MEMORY(bytes)   
nginx-deployment-5559575875-p7fml   21m          3Mi         
```



## 通过 kubectl autoscale 命令实现

- **不常用**

### 定义

```bash
# 为 nginx namespace 中的 nginx-deployment deployment创建自动伸缩，cpu占用百分比超过百分之50即新建pod，但最小的pod数量不能低于1，最大的pod数量不能高于10
root@k8s-master:~# kubectl autoscale -n nginx  deployment nginx-deployment --cpu-percent=50 --min=1 --max=10
horizontalpodautoscaler.autoscaling/nginx-deployment autoscaled



# 查看创建的hpa
# kubectl get hpa -n nginx 
NAME               REFERENCE                     TARGETS   MINPODS   MAXPODS   REPLICAS   AGE
nginx-deployment   Deployment/nginx-deployment   0%/50%    1         10        1          61s
```

### 测试

```bash
# 模拟客户端请求
root@client:~# ab -c300  -n1000000 http://10.0.0.100:30003/
...


# pod 持续创建中...
root@k8s-master:~# kubectl get pod -n nginx 
NAME                                READY   STATUS              RESTARTS   AGE
nginx-deployment-5559575875-5vdcg   0/1     ContainerCreating   0          10s
nginx-deployment-5559575875-fvc2r   0/1     ContainerCreating   0          10s
nginx-deployment-5559575875-p7fml   1/1     Running             0          16m
nginx-deployment-5559575875-t7trh   1/1     Running             0          25s
nginx-deployment-5559575875-xcwww   0/1     ContainerCreating   0          26s
root@k8s-master:~# kubectl get hpa -n nginx 
NAME               REFERENCE                     TARGETS   MINPODS   MAXPODS   REPLICAS   AGE
nginx-deployment   Deployment/nginx-deployment   0%/50%    1         10        5          2m59s



# 但最高不会超过10个
root@k8s-master:~# kubectl get hpa -n nginx 
NAME               REFERENCE                     TARGETS    MINPODS   MAXPODS   REPLICAS   AGE
nginx-deployment   Deployment/nginx-deployment   160%/50%   1         10        10         4m13s



# cpu负载降下来后pod也会回收
root@k8s-master:~# kubectl get hpa -n nginx 
NAME               REFERENCE                     TARGETS   MINPODS   MAXPODS   REPLICAS   AGE
nginx-deployment   Deployment/nginx-deployment   0%/50%    1         10        1          10m
root@k8s-master:~# kubectl get pod -n nginx 
NAME                                READY   STATUS    RESTARTS   AGE
nginx-deployment-5559575875-p7fml   1/1     Running   0          24m
```



## 通过 autoscaling/v2 API实现

- **常用**

### 定义 yaml 文件

- 每个需要横向伸缩的Pod都需要有一个此文件，将此文件和deployment的yaml文件放在一起便于管理

- PS：可以通过上面命令生成的结果导出成为 yaml 文件再加以修改

  - ```bash
    kubectl get hpa -n nginx nginx-deployment -o yaml > hpa-nginx.yaml
    ```

```yaml
# 经筛选后得到以下内容：
# vim hpa-nginx.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: nginx-deployment
  namespace: nginx
spec:
  minReplicas: 1 # 最小副本数
  maxReplicas: 10 # 最大副本数
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: nginx-deployment # 针对的deployment
  metrics: # 定义选择的指标，kubectl explain HorizontalPodAutoscaler.spec.metrics
  - resource:
      name: cpu
      target:
        averageUtilization: 50 # 平均利用率
        type: Utilization
  #- type: Resource
  #  resource:
  #    name: memory
  #    target:
  #      averageValue: 50Mi
  #      type: AverageValue
    type: Resource
```

### 测试

- 结果和上文中 通过 kubectl autoscale 命令实现 的结果一致



## other

- **删除 hpa**

```bash
kubectl delete hpa [ -n nginx ] nginx-deployment
# 或
kubectl delete -f hpa-nginx.yaml
```

- **修改 hpa 后使其生效**

```bash
kubectl apply -f hpa-nginx.yaml
```

- **查看 hpa 详细信息**

```bash
kubectl describe hpa -n nginx
```





# Vertical Pod Autoscaler（VPA）

**什么是 Vertical Pod Autoscaler（VPA）:**

Vertical Pod Autoscaler（VPA）是一个Kubernetes API扩展，它可以自动调整Pod的资源请求和限制，以确保它们具有足够的计算和内存资源来运行应用程序，同时又不会过度分配资源。

传统上，Kubernetes Pod的资源请求和限制是在部署时手动设置的。这意味着如果应用程序的负载发生变化，可能需要手动更改资源请求和限制。而VPA使用监控数据来自动调整Pod的资源请求和限制，以满足应用程序的需求，从而更好地管理资源，并确保应用程序的可靠性和性能。

VPA支持垂直扩展，即调整单个Pod的资源请求和限制，也支持水平扩展，即增加或减少Pod的数量来满足应用程序负载的需求。



**Vertical Pod Autoscaler（VPA）与 Horizontal Pod Autoscaler（HPA）有什么区别：**

Vertical Pod Autoscaler（VPA）和Horizontal Pod Autoscaler（HPA）都是Kubernetes的自动扩展机制，但它们关注的方面不同。

Horizontal Pod Autoscaler（HPA）关注的是应用程序的负载和流量，可以根据CPU使用率或自定义指标自动调整Pod的数量，以确保应用程序能够处理更多的请求或负载。HPA主要是水平扩展，即增加或减少Pod的数量来应对应用程序负载变化。

Vertical Pod Autoscaler（VPA）则关注的是单个Pod的资源使用情况，可以自动调整Pod的资源请求和限制，以确保Pod具有足够的计算和内存资源来运行应用程序，从而提高应用程序的性能和可靠性。VPA主要是垂直扩展，即调整单个Pod的资源请求和限制，而不是增加或减少Pod的数量。

可以说，VPA和HPA是互补的机制，可以结合使用，以实现更好的资源管理和应用程序扩展。



**参考文档**

- https://github.com/kubernetes/autoscaler/tree/master/vertical-pod-autoscaler/



# 手动实现扩容缩容

## 通过更改 yaml 文件实现

```bash
# 更改前
# kubectl get pod -n nginx 
NAME                                READY   STATUS    RESTARTS   AGE
nginx-deployment-7cb6c7d4c6-9rntc   1/1     Running   0          2m15s



# 更改为3
# vim nginx.yaml
...
apiVersion: apps/v1
kind: Deployment
...
spec:
  replicas: 3
# kubectl apply -f nginx.yaml
namespace/nginx unchanged
deployment.apps/nginx-deployment configured
service/nginx-service unchanged




# 更改后
# kubectl get pod -n nginx
NAME                                READY   STATUS    RESTARTS   AGE
nginx-deployment-7cb6c7d4c6-9rntc   1/1     Running   0          4m3s
nginx-deployment-7cb6c7d4c6-btt4w   1/1     Running   0          37s
nginx-deployment-7cb6c7d4c6-zd8tk   1/1     Running   0          37s
```







## 通过 kubectl scale 命令实现

### 语法

```bash
kubectl scale deployment <deployment-name> --replicas=<N> -n <namespace-name>
# 或
kubectl scale deployment/<deployment-name> --replicas=<N> -n <namespace-name>



# 更多语法
kubectl scale deployment --help
```

### 实现

```bash
# 更改前
# kubectl get pod -n nginx 
NAME                                READY   STATUS    RESTARTS   AGE
nginx-deployment-7cb6c7d4c6-9rntc   1/1     Running   0          2m15s




# 更改为3
kubectl scale deployment nginx-deployment --replicas=3 -n nginx



# 更改后
# kubectl get pod -n nginx
NAME                                READY   STATUS    RESTARTS   AGE
nginx-deployment-7cb6c7d4c6-2n7lq   1/1     Running   0          14m
nginx-deployment-7cb6c7d4c6-9rntc   1/1     Running   0          30m
nginx-deployment-7cb6c7d4c6-d5jdb   1/1     Running   0          14m
```



## 通过 kubectl edit 命令

- **注意：此命令慎用，因为其中还包含了很多 deployment 的其它信息，且保存后立即生效**

### 语法

```
kubectl edit deployment <deployment-name> -n <namespace-name>
```

### 实现

```bash
# 更改前
# kubectl get pod -n nginx 
NAME                                READY   STATUS    RESTARTS   AGE
nginx-deployment-7cb6c7d4c6-9rntc   1/1     Running   0          2m15s




# 更改为3
# kubectl edit deployment nginx-deployment -n nginx
...
spec:
...
  replicas: 3
...
# :wq 或 :x 保存退出
deployment.apps/nginx-deployment edited


# 更改后
# kubectl get pod -n nginx
NAME                                READY   STATUS    RESTARTS   AGE
nginx-deployment-7cb6c7d4c6-45rnt   1/1     Running   0          51s
nginx-deployment-7cb6c7d4c6-7z2jt   1/1     Running   0          51s
nginx-deployment-7cb6c7d4c6-9rntc   1/1     Running   0          37m
```

