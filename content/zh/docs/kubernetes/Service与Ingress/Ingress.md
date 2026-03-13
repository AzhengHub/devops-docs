---
title: "Ingress"
---



# IngressClass Explain

- IngressClass 一般用于将一个特定的 IngressClass 标记为集群默认 Ingress 类，以确保新的未指定 `ingressClassName` 字段的 Ingress 能够分配为这个默认的 IngressClass.
  - 将一个 IngressClass 资源的 `ingressclass.kubernetes.io/is-default-class` 注解设置为 `true` 
- 还可以定义其相关参数以及作用域；

```yaml
apiVersion: networking.k8s.io/v1beta1  # API资源群组及版本
kind: IngressClass   # 资源类型标识
metadata:
  name <string>
  namespace <string>
  annotations:
    ingressclass.kubernetes.io/is-default-class <boolean>  # 是否为默认，true表示该IngressClass为默认
spec:
  controller <string>   # 该类别关联的Ingress控制器
  parameters <Object>   # 控制器相关的参数，这些参数由引用的资源定义，可选字段
    apiGroup <string>   # 引用的目标资源所属的API群组
    kind <string>   # 引用的资源类型
    name <string>   # 引用的资源名称
```

## 范例：集群作用域

- IngressClass 的参数默认是集群范围的

```yaml
apiVersion: networking.k8s.io/v1
kind: IngressClass
metadata:
  name: external-lb-1
spec:
  controller: example.com/ingress-controller
  parameters:
    # 此 IngressClass 的配置定义在一个名为 “external-config-1” 的
    # ClusterIngressParameter（API 组为 k8s.example.net）资源中。
    # 这项定义告诉 Kubernetes 去寻找一个集群作用域的参数资源。
    scope: Cluster
    apiGroup: k8s.example.net
    kind: ClusterIngressParameter
    name: external-config-1
```

## 范例：名称空间作用域

```yaml
apiVersion: networking.k8s.io/v1
kind: IngressClass
metadata:
  name: external-lb-2
spec:
  controller: example.com/ingress-controller
  parameters:
    # 此 IngressClass 的配置定义在一个名为 “external-config” 的
    # IngressParameter（API 组为 k8s.example.com）资源中，
    # 该资源位于 “external-configuration” 命名空间中。
    scope: Namespace
    apiGroup: k8s.example.com
    kind: IngressParameter
    namespace: external-configuration
    name: external-config
```



# ---



# Ingress-Nginx 概述

- Ingress-Nginx 是一个基于 Nginx 的 Ingress 控制器。

- https://github.com/kubernetes/ingress-nginx
- https://help.aliyun.com/document_detail/204365.html



# Ingress-Nginx - Deploy

- https://kubernetes.github.io/ingress-nginx/deploy/


- 其中 service 默认为 `type: LoadBalancer`，测试环境中也可以定义为 `type: ClusterIP` 而后自定义`externalIPs` IP 对外提供服务；

```yaml
# wget https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.3.1/deploy/static/provider/cloud/deploy.yaml


# mv deploy.yaml ingress-nginx-deploy.yaml


# 以下三个镜像需要使用特殊手段才能下载（比如使用阿里云镜像服务构建国外镜像...）
# cat ingress-nginx-deploy.yaml |grep image:
        image: registry.cn-qingdao.aliyuncs.com/google-images-gogogo/ingress-nginx-controller:v1.3.1 
        #image: registry.k8s.io/ingress-nginx/controller:v1.3.1@sha256:54f7fe2c6c5a9db9a0ebf1131797109bb7a4d91f56b9b362bde2abd237dd1974
        image: registry.cn-qingdao.aliyuncs.com/google-images-gogogo/kube-webhook-certgen:v1.3.0 
        #image: registry.k8s.io/ingress-nginx/kube-webhook-certgen:v1.3.0@sha256:549e71a6ca248c5abd51cdb73dbc3083df62cf92ed5e6147c780e30f7e007a47
        image: registry.cn-qingdao.aliyuncs.com/google-images-gogogo/kube-webhook-certgen:v1.3.0 
        #image: registry.k8s.io/ingress-nginx/kube-webhook-certgen:v1.3.0@sha256:549e71a6ca248c5abd51cdb73dbc3083df62cf92ed5e6147c780e30f7e007a47
```

## test

```sh
# kubectl apply -f ingress-nginx-deploy.yaml 
...

# kubectl get pod -n ingress-nginx 
NAME                                        READY   STATUS      RESTARTS   AGE
ingress-nginx-admission-create-zqmqs        0/1     Completed   0          13s
ingress-nginx-admission-patch-4vsjd         0/1     Completed   1          13s
ingress-nginx-controller-5984c8d56d-m5v9h   1/1     Running     0          13s



# kubectl get svc -n ingress-nginx 
NAME                                 TYPE           CLUSTER-IP      EXTERNAL-IP   PORT(S)                      AGE
ingress-nginx-controller             LoadBalancer   10.104.205.64   <pending>     80:31950/TCP,443:31169/TCP   51s
ingress-nginx-controller-admission   ClusterIP      10.100.29.175   <none>        443/TCP                      51s


# ok
# curl http://10.0.0.101:31950/
<html>
<head><title>404 Not Found</title></head>
<body>
<center><h1>404 Not Found</h1></center>
<hr><center>nginx</center>
</body>
</html>

# ok
# curl -k  https://10.0.0.101:31169/
<html>
<head><title>404 Not Found</title></head>
<body>
<center><h1>404 Not Found</h1></center>
<hr><center>nginx</center>
</body>
</html>
```



## Ingress-Nginx - Ingress

- https://kubernetes.github.io/ingress-nginx/

### annotations

- https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- nginx Ingress 经常使用注解（annotations）来配置一些选项，具体取决于 Ingress 控制器，不同的 [Ingress 控制器](https://kubernetes.io/zh-cn/docs/concepts/services-networking/ingress-controllers)支持不同的注解；

- nginx Ingress 常用注解说明：


```yaml
apiVersion: networking.k8s.io/v1   # 资源所属的API群组和版本
kind: Ingress
metadata:
  annotations:   # 资源注解
    nginx.ingress.kubernetes.io/auth-type: [basic|digest] # 用于指定认证类型，仅有两个可选值；
    nginx.ingress.kubernetes.io/auth-secret: secretName # 保存有认证信息的Secret资源名称；
    nginx.ingress.kubernetes.io/auth-secret-type: [auth-file|auth-map] # Secret中的数据类型，auth-file表示数据为htpasswd直接生成的文件，auth-map表示数据是直接给出用户的名称和hash格式的密钥信息；
    nginx.ingress.kubernetes.io/auth-realm: "realm string" # 认证时使用的realm信息。
...
spec:
...
```

环境说明：

- 下面范例中所使用的 ingress controller 对应 service 的信息；

```yaml
# kubectl describe svc -n ingress-nginx ingress-nginx-controller
Name:              ingress-nginx-controller
Namespace:         ingress-nginx
Labels:            app.kubernetes.io/component=controller
                   app.kubernetes.io/instance=ingress-nginx
                   app.kubernetes.io/name=ingress-nginx
                   app.kubernetes.io/part-of=ingress-nginx
                   app.kubernetes.io/version=1.3.1
Annotations:       <none>
Selector:          app.kubernetes.io/component=controller,app.kubernetes.io/instance=ingress-nginx,app.kubernetes.io/name=ingress-nginx
Type:              ClusterIP
IP Family Policy:  SingleStack
IP Families:       IPv4
IP:                10.96.216.31
IPs:               10.96.216.31
External IPs:      10.0.0.168 # 这里设置为了ExternalIP，在云环境中都是type: LoadBalancer对外提供服务的
Port:              http  80/TCP
TargetPort:        http/TCP
Endpoints:         10.244.1.70:80
Port:              https  443/TCP
TargetPort:        https/TCP
Endpoints:         10.244.1.70:443
Session Affinity:  None
Events:            <none>
```

### 发布一个简单的 web 服务

- 对外发布一个最简单的 web服务
```yaml {filename="demoapp.yaml"}
apiVersion: apps/v1
kind: Deployment
metadata:
  name: demoapp-dep
  namespace: default
spec:
  selector:
    matchLabels:
      app: demoapp
  template:
    metadata:
      labels:
        app: demoapp
    spec:
      containers:
      - name: demoapp
        image: ikubernetes/demoapp:v1.0
---
apiVersion: v1
kind: Service
metadata:
  name: demoapp-svc 
  namespace: default 
spec:
  type: ClusterIP # 因为仅被ingress所访问，所以配置为ClusterIP也可以
  selector:
    app: demoapp
  ports:
  - port: 80
    targetPort: 80
```

验证：

```yaml
# kubectl describe svc demoapp-svc
Name:              demoapp-svc
Namespace:         default
Labels:            <none>
Annotations:       <none>
Selector:          app=demoapp
Type:              ClusterIP
IP Family Policy:  SingleStack
IP Families:       IPv4
IP:                10.104.210.197
IPs:               10.104.210.197
Port:              <unset>  80/TCP
TargetPort:        80/TCP
Endpoints:         10.244.1.72:80
Session Affinity:  None
Events:            <none>
```


```yaml {filename="ingress.yamll"}
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ingress-demoapp
  namespace: default # 自定义的 Ingress 可以不与 Ingress controller 位于同一名称空间，但需和对应的service位于同一名称空间
spec:
  ingressClassName: nginx
  #ingressClassName: contour
  rules:
  - host: azheng.com
    http:
      paths:
      - path: /
        pathType: Prefix 
        backend:
          service:
            name: demoapp-svc
            port:
              number: 80
```

验证：

```yaml
# kubectl describe ingress ingress-demoapp
Name:             ingress-demoapp
Labels:           <none>
Namespace:        default
Address:          10.96.216.31
Default backend:  default-http-backend:80 (<error: endpoints "default-http-backend" not found>) # 生产中可以定义默认后端，即 sorry server，如果未定义则后端无pod可用时访问ingress将报404
Rules:
  Host        Path  Backends
  ----        ----  --------
  azheng.com
              /   demoapp-svc:80 (10.244.1.72:80) # 通过service直接获取到的后端pod的endpoint
Annotations:  <none>
Events:
  Type    Reason  Age               From                      Message
  ----    ------  ----              ----                      -------
  Normal  Sync    8s (x2 over 43s)  nginx-ingress-controller  Scheduled for sync
```

测试：

```yaml
# 访问 ingress service 所提供的对外IP进行验证
# 因为未加主机头，并且也没有定义Default backend，所以报404
# curl 10.0.0.168
<html>
<head><title>404 Not Found</title></head>
<body>
<center><h1>404 Not Found</h1></center>
<hr><center>nginx</center>
</body>
</html>



# 因为提供了ingress中定义的host，所以被识别，从而转发到了demoapp对应service后端的pod
# curl -H "Host: azheng.com"  10.0.0.168
iKubernetes demoapp v1.0 !! ClientIP: 10.244.1.136, ServerName: myapp-dep-77b84444d7-ms9q5, ServerIP: 10.244.1.137!
```



### 单域名https + 默认后端

- 使用 ingress 对外发布 azheng.com 虚拟主机，并且使用 https 对外提供服务，最后再创建默认的 backend作为 sorryserver

#### secret

- 为 azheng.com 创建自签名证书，而后生成tls类型的secret；
- **注意：CN字段要与实际主机名相匹配**

```yaml
# mkdir -p /tmp/certs/

# cd /tmp/certs/

# openssl genrsa -out azheng.com.key 4096

# openssl req -x509 -new -days 3650 -subj "/C=CN/ST=Beijing/L=Beijing/O=AzhengKeJi/OU=Personal/CN=azheng.com" -key azheng.com.key -out azheng.com.crt


# kubectl create secret tls azheng.com --cert=azheng.com.crt --key=azheng.com.key
```

```yaml {filename="demoapp.yaml"}
apiVersion: apps/v1
kind: Deployment
metadata:
  name: demoapp-dep
  namespace: default 
spec:
  selector:
    matchLabels:
      app: demoapp
  template:
    metadata:
      labels:
        app: demoapp
    spec:
      containers:
      - name: demoapp
        image: ikubernetes/demoapp:v1.0
---
apiVersion: v1
kind: Service
metadata:
  name: demoapp-svc
  namespace: default 
spec:
  type: ClusterIP
  selector:
    app: demoapp
  ports:
  - port: 80
    targetPort: 80
```

```yaml {filename="sorry-server.yaml"}
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sorry-server-dep
  namespace: default 
spec:
  selector:
    matchLabels:
      app: sorry-server
  template:
    metadata:
      labels:
        app: sorry-server
    spec:
      containers:
      - name: sorry-server
        image: nginx:1.23 # 提供sorry-server的pod
---
apiVersion: v1
kind: Service
metadata:
  name: sorry-server-svc 
  namespace: default 
spec:
  type: ClusterIP
  selector:
    app: sorry-server
  ports:
  - port: 80
    targetPort: 80
```
 
```yaml {filename="ingress.yaml"}
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ingress-demoapp
  namespace: default
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    nginx.ingress.kubernetes.io/default-backend: sorry-server-svc
    nginx.ingress.kubernetes.io/custom-http-errors: "404,415"
spec:
  ingressClassName: nginx
  rules:
  - host: azheng.com
    http:
      paths:
      - path: /
        pathType: Prefix 
        backend:
          service:
            name: demoapp-svc
            port:
              number: 80
  tls:
  - hosts:
    - azheng.com
    secretName: azheng.com
  defaultBackend:
    service: 
      name: sorry-server-svc
      port:
        number: 80
```

验证：

```yaml
# kubectl describe ingress ingress-demoapp
Name:             ingress-demoapp
Labels:           <none>
Namespace:        default
Address:
Default backend:  sorry-server-svc:80 (10.244.1.85:80)
TLS:
  azheng.com terminates azheng.com
Rules:
  Host        Path  Backends
  ----        ----  --------
  azheng.com
              /   demoapp-svc:80 (10.244.1.84:80)
Annotations:  nginx.ingress.kubernetes.io/custom-http-errors: 404,415
              nginx.ingress.kubernetes.io/default-backend: sorry-server-svc
              nginx.ingress.kubernetes.io/rewrite-target: /
Events:
  Type    Reason  Age   From                      Message
  ----    ------  ----  ----                      -------
  Normal  Sync    12s   nginx-ingress-controller  Scheduled for sync
```



测试：

```yaml
# curl -H "Host:azheng.com" 10.0.0.168 -kL
iKubernetes demoapp v1.0 !! ClientIP: 10.244.1.70, ServerName: demoapp-dep-5748b7ccfc-l9nsv, ServerIP: 10.244.1.84!



# 删除demoapp，模拟后端无Pod可用
# kubectl delete deployments.apps demoapp-dep


# 会跳转到 sorry-server 的Pod
# curl -H "Host:azheng.com" 10.0.0.168 -kL
<!DOCTYPE html>
<html>
<head>
<title>Welcome to nginx!</title>
<style>
...


# ingress自身还是404
# curl 10.0.0.168
<html>
<head><title>404 Not Found</title></head>
<body>
<center><h1>404 Not Found</h1></center>
<hr><center>nginx</center>
</body>
</html>
```



### 多路径

- 访问不同路径时将流量转发给不同的service处理

```yaml {filename="demoapp-foo.yaml"}
apiVersion: apps/v1
kind: Deployment
metadata:
  name: demoapp-foo
  namespace: default
spec:
  selector:
    matchLabels:
      app: demoapp-foo
  template:
    metadata:
      labels:
        app: demoapp-foo
    spec:
      containers:
      - name: demoapp-foo
        image: ikubernetes/demoapp:v1.0 # demoapp:v1.0 为 foo
---
apiVersion: v1
kind: Service
metadata:
  name: demoapp-foo
  namespace: default
spec:
  type: ClusterIP
  selector:
    app: demoapp-foo
  ports:
  - port: 80
    targetPort: 80
```

```yaml {filename="demoapp-bar.yaml"} 
apiVersion: apps/v1
kind: Deployment
metadata:
  name: demoapp-bar
  namespace: default
spec:
  selector:
    matchLabels:
      app: demoapp-bar
  template:
    metadata:
      labels:
        app: demoapp-bar
    spec:
      containers:
      - name: demoapp-bar
        image: ikubernetes/demoapp:v1.1 # demoapp:v1.1 为 bar
---
apiVersion: v1
kind: Service
metadata:
  name: demoapp-bar
  namespace: default
spec:
  type: ClusterIP
  selector:
    app: demoapp-bar
  ports:
  - port: 80
    targetPort: 80
```

```yaml {filename="ingress.yaml"}
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: simple-fanout-example
  namespace: default
spec:
  ingressClassName: nginx
  rules:
  - host: azheng.com
    http:
      paths:
      - path: /foo # 后端服务也需有此路径，否则将报404
        pathType: Prefix
        backend:
          service:
            name: demoapp-foo
            port:
              number: 80
      - path: /bar # 后端服务也需有此路径，否则将报404
        pathType: Prefix
        backend:
          service:
            name: demoapp-bar
            port:
              number: 80
```

验证：

```yaml
# kubectl describe ingress simple-fanout-example
Name:             simple-fanout-example
Labels:           <none>
Namespace:        default
Address:          10.96.216.31
Default backend:  default-http-backend:80 (<error: endpoints "default-http-backend" not found>)
Rules:
  Host        Path  Backends
  ----        ----  --------
  azheng.com
              /foo   demoapp-foo:80 (10.244.1.76:80)
              /bar   demoapp-bar:80 (10.244.1.77:80)
Annotations:  <none>
Events:
  Type    Reason  Age                From                      Message
  ----    ------  ----               ----                      -------
  Normal  Sync    25s (x2 over 27s)  nginx-ingress-controller  Scheduled for sync
```

测试：

- 访问的路径在后端服务中也需存在，否则将报404

```yaml
# curl -H "Host:azheng.com" 10.0.0.168/foo
...
<title>404 Not Found</title>
...
# kubectl logs demoapp-foo-6cf5bdf499-qcrv4 -f
...
10.244.1.70 - - [17/Jan/2023 12:29:55] "GET /foo HTTP/1.1" 404 -
...


# curl -H "Host:azheng.com" 10.0.0.168/bar
...
<title>404 Not Found</title>
...
# kubectl logs demoapp-bar-64dd6bb966-xpmfc -f
...
10.244.1.70 - - [17/Jan/2023 12:29:48] "GET /bar HTTP/1.1" 404 -
...
```

- **由此也可以看出是由 ingress controller 代理访问的后端 Pod**

```yaml
# kubectl describe ep -n ingress-nginx ingress-nginx-controller
Name:         ingress-nginx-controller
Namespace:    ingress-nginx
Labels:       app.kubernetes.io/component=controller
              app.kubernetes.io/instance=ingress-nginx
              app.kubernetes.io/name=ingress-nginx
              app.kubernetes.io/part-of=ingress-nginx
              app.kubernetes.io/version=1.3.1
Annotations:  endpoints.kubernetes.io/last-change-trigger-time: 2023-01-17T09:12:49Z
Subsets:
  Addresses:          10.244.1.70 # 10.244.1.70！
  NotReadyAddresses:  <none>
  Ports:
    Name   Port  Protocol
    ----   ----  --------
    https  443   TCP
    http   80    TCP

Events:  <none>
```



### 多域名 http

```yaml {filename="demoapp-azheng.yaml"}
apiVersion: apps/v1
kind: Deployment
metadata:
  name: demoapp-azheng
  namespace: default
spec:
  selector:
    matchLabels:
      app: demoapp-azheng
  template:
    metadata:
      labels:
        app: demoapp-azheng
    spec:
      containers:
      - name: demoapp-azheng
        image: ikubernetes/demoapp:v1.0 # demoapp:v1.0 为 azheng
---
apiVersion: v1
kind: Service
metadata:
  name: demoapp-azheng
  namespace: default
spec:
  type: ClusterIP
  selector:
    app: demoapp-azheng
  ports:
  - port: 80
    targetPort: 80
```

```yaml {filename="demoapp-xiangzheng.yaml"}
apiVersion: apps/v1
kind: Deployment
metadata:
  name: demoapp-xiangzheng
  namespace: default
spec:
  selector:
    matchLabels:
      app: demoapp-xiangzheng
  template:
    metadata:
      labels:
        app: demoapp-xiangzheng
    spec:
      containers:
      - name: demoapp-xiangzheng
        image: ikubernetes/demoapp:v1.1 # demoapp:v1.1 为 xiangzheng
---
apiVersion: v1
kind: Service
metadata:
  name: demoapp-xiangzheng
  namespace: default
spec:
  type: ClusterIP
  selector:
    app: demoapp-xiangzheng
  ports:
  - port: 80
    targetPort: 80
```

```yaml {filename="ingress.yaml"}
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: name-virtual-host-ingress
spec:
  ingressClassName: nginx
  rules:
  - host: azheng.com
    http:
      paths:
      - pathType: Prefix
        path: "/"
        backend:
          service:
            name: demoapp-azheng
            port:
              number: 80
  - host: xiangzheng.com
    http:
      paths:
      - pathType: Prefix
        path: "/"
        backend:
          service:
            name: demoapp-xiangzheng
            port:
              number: 80
```

验证：

```yaml
# kubectl describe ingress name-virtual-host-ingress
Name:             name-virtual-host-ingress
Labels:           <none>
Namespace:        default
Address:
Default backend:  default-http-backend:80 (<error: endpoints "default-http-backend" not found>)
Rules:
  Host            Path  Backends
  ----            ----  --------
  azheng.com
                  /   demoapp-azheng:80 (10.244.1.78:80)
  xiangzheng.com
                  /   demoapp-xiangzheng:80 (10.244.1.79:80)
Annotations:      <none>
Events:
  Type    Reason  Age   From                      Message
  ----    ------  ----  ----                      -------
  Normal  Sync    8s    nginx-ingress-controller  Scheduled for sync
```

测试：

- 访问不同的虚拟主机可以跳转到对应的 Backend

```yaml
# curl -H "Host:azheng.com" 10.0.0.168
iKubernetes demoapp v1.0 !! ClientIP: 10.244.1.70, ServerName: demoapp-azheng-7659c65c69-c8jj4, ServerIP: 10.244.1.78!


# curl -H "Host:xiangzheng.com" 10.0.0.168
iKubernetes demoapp v1.1 !! ClientIP: 10.244.1.70, ServerName: demoapp-xiangzheng-65974885bb-jtrgp, ServerIP: 10.244.1.79!
```



### 多域名 https

- 各种 Ingress 控制器所支持的 TLS 功能之间存在差异。请参阅有关 [nginx](https://kubernetes.github.io/ingress-nginx/user-guide/tls/)、 [GCE](https://git.k8s.io/ingress-gce/README.md#frontend-https) 或者任何其他平台特定的 Ingress 控制器的文档，以了解 TLS 如何在你的环境中工作。


- 使用 ingress 对外发布两个虚拟主机 xiangzheng.com 和 azheng.com，且都使用 https 对外提供服务

secret：

- 为 xiangzheng.com 创建自签名证书，而后生成tls类型的secret；
- **注意：CN字段要与实际主机名相匹配**

```yaml
# mkdir -p /tmp/certs/
# cd /tmp/certs/

# openssl genrsa -out xiangzheng.com.key 4096

# openssl req -x509 -new -days 3650 -subj "/C=CN/ST=Beijing/L=Beijing/O=AzhengKeJi/OU=Personal/CN=xiangzheng.com" -key xiangzheng.com.key -out xiangzheng.com.crt


# kubectl create secret tls xiangzheng.com --cert=xiangzheng.com.crt --key=xiangzheng.com.key
```

- 为 azheng.com 创建自签名证书，而后生成tls类型的secret；
- **注意：CN字段要与实际主机名相匹配**

```yaml
# mkdir -p /tmp/certs/

# cd /tmp/certs/

# openssl genrsa -out azheng.com.key 4096

# openssl req -x509 -new -days 3650 -subj "/C=CN/ST=Beijing/L=Beijing/O=AzhengKeJi/OU=Personal/CN=azheng.com" -key azheng.com.key -out azheng.com.crt


# kubectl create secret tls azheng.com --cert=azheng.com.crt --key=azheng.com.key
```


```yaml {filename="xiangzheng.com.yaml"}
apiVersion: apps/v1
kind: Deployment
metadata:
  name: xiangzheng-dep
  namespace: default 
spec:
  selector:
    matchLabels:
      app: xiangzheng-app
  template:
    metadata:
      labels:
        app: xiangzheng-app
    spec:
      containers:
      - name: xiangzheng-app
        image: ikubernetes/demoapp:v1.0 # xiangzheng-app 为 v1.0
---
apiVersion: v1
kind: Service
metadata:
  name: xiangzheng-svc 
  namespace: default 
spec:
  type: ClusterIP
  selector:
    app: xiangzheng-app
  ports:
  - port: 80
    targetPort: 80
```


```yaml {filename="azheng.com.yaml"}
apiVersion: apps/v1
kind: Deployment
metadata:
  name: azheng-dep
  namespace: default 
spec:
  selector:
    matchLabels:
      app: azheng-app
  template:
    metadata:
      labels:
        app: azheng-app
    spec:
      containers:
      - name: azheng-app
        image: ikubernetes/demoapp:v1.1 # xiangzheng-app 为 v1.1
---
apiVersion: v1
kind: Service
metadata:
  name: azheng-svc 
  namespace: default 
spec:
  type: ClusterIP
  selector:
    app: azheng-app
  ports:
  - port: 80
    targetPort: 80
```

-  注意：如果不同虚拟主机使用同一个证书，那该证书需为SAN格式的多域名证书

```yaml {filename="ingress.yaml"}
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ingress-myapp
  namespace: default
spec:
  ingressClassName: nginx
  rules:
  - host: xiangzheng.com
    http:
      paths:
      - path: /
        pathType: Prefix 
        backend:
          service:
            name: xiangzheng-svc
            port:
              number: 80
  - host: azheng.com
    http:
      paths:
      - path: /
        pathType: Prefix 
        backend:
          service:
            name: azheng-svc
            port:
              number: 80
  tls:
  - hosts:
    - xiangzheng.com
    secretName: xiangzheng.com
  - hosts:
    - azheng.com
    secretName: azheng.com
```

验证：

```yaml
# kubectl describe ingress ingress-myapp
Name:             ingress-myapp
Labels:           <none>
Namespace:        default
Address:
Default backend:  default-http-backend:80 (<error: endpoints "default-http-backend" not found>)
TLS:
  xiangzheng.com terminates xiangzheng.com
  azheng.com terminates azheng.com
Rules:
  Host            Path  Backends
  ----            ----  --------
  xiangzheng.com
                  /   xiangzheng-svc:80 (10.244.1.80:80)
  azheng.com
                  /   azheng-svc:80 (10.244.1.81:80)
Annotations:      <none>
Events:
  Type    Reason  Age   From                      Message
  ----    ------  ----  ----                      -------
  Normal  Sync    23s   nginx-ingress-controller  Scheduled for sync
```

测试：

```sh
# vim /etc/hosts
...
10.0.0.168 xiangzheng.com
10.0.0.168 azheng.com

# curl https://xiangzheng.com -kv
...
* Server certificate:
*  subject: C=CN; ST=Beijing; L=Beijing; O=AzhengKeJi; OU=Personal; CN=xiangzheng.com
...
iKubernetes demoapp v1.0 !! ClientIP: 10.244.1.70, ServerName: xiangzheng-dep-c5464bb7c-fjqcl, ServerIP: 10.244.1.80!



# curl https://azheng.com -kv
...
* Server certificate:
*  subject: C=CN; ST=Beijing; L=Beijing; O=AzhengKeJi; OU=Personal; CN=azheng.com
...
iKubernetes demoapp v1.1 !! ClientIP: 10.244.1.70, ServerName: azheng-dep-6df7878c4b-tg9t6, ServerIP: 10.244.1.81!
```



其他说明：

- 虚拟主机如未指定证书，则访问这个虚拟主机时返回的是 Ingress Controller 默认提供的证书。
  - Ingress-Nginx如何禁用虚拟主机的https？

```yaml {filename="ingress-xiangzheng.yaml"}
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ingress-xiangzheng
  namespace: default
spec:
  ingressClassName: nginx
  rules:
  - host: xiangzheng.com
    http:
      paths:
      - path: /
        pathType: Prefix 
        backend:
          service:
            name: xiangzheng-svc
            port:
              number: 80
  tls:
  - hosts:
    - xiangzheng.com
    secretName: xiangzheng.com
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ingress-azheng
  namespace: default
spec:
  ingressClassName: nginx
  rules:
  - host: azheng.com
    http:
      paths:
      - path: /
        pathType: Prefix 
        backend:
          service:
            name: azheng-svc
            port:
              number: 80
```

验证：

```yaml
# kubectl describe ingress ingress-azheng
Name:             ingress-azheng
Labels:           <none>
Namespace:        default
Address:          10.96.216.31
Default backend:  default-http-backend:80 (<error: endpoints "default-http-backend" not found>)
Rules:
  Host        Path  Backends
  ----        ----  --------
  azheng.com
              /   azheng-svc:80 (10.244.1.82:80)
Annotations:  <none>
Events:
  Type    Reason  Age                From                      Message
  ----    ------  ----               ----                      -------
  Normal  Sync    10m (x2 over 11m)  nginx-ingress-controller  Scheduled for sync


# kubectl describe ingress ingress-xiangzheng
Name:             ingress-xiangzheng
Labels:           <none>
Namespace:        default
Address:          10.96.216.31
Default backend:  default-http-backend:80 (<error: endpoints "default-http-backend" not found>)
TLS:
  xiangzheng.com terminates xiangzheng.com
Rules:
  Host            Path  Backends
  ----            ----  --------
  xiangzheng.com
                  /   xiangzheng-svc:80 (10.244.1.83:80)
Annotations:      <none>
Events:
  Type    Reason  Age                From                      Message
  ----    ------  ----               ----                      -------
  Normal  Sync    11m (x2 over 11m)  nginx-ingress-controller  Scheduled for sync
```

测试：

- 访问 http://xiangzheng.com 时会自动跳转到https

```yaml
# curl http://xiangzheng.com -k
<html>
<head><title>308 Permanent Redirect</title></head>
<body>
<center><h1>308 Permanent Redirect</h1></center>


# curl http://xiangzheng.com -kL
iKubernetes demoapp v1.0 !! ClientIP: 10.244.1.70, ServerName: xiangzheng-dep-c5464bb7c-gf4gn, ServerIP: 10.244.1.83!



# curl https://xiangzheng.com -kv
...
* Server certificate:
*  subject: C=CN; ST=Beijing; L=Beijing; O=AzhengKeJi; OU=Personal; CN=xiangzheng.com
...
```

- 访问 http://azheng.com 时不会自动跳转到https，但https://azheng.com也可以访问，并且返回的是 Ingress Controller 默认提供的证书。
  - **Ingress-Nginx如何禁用虚拟主机的https？查看官方文档看看是否是通过注解定义？**

```yaml
# curl http://azheng.com -k
iKubernetes demoapp v1.1 !! ClientIP: 10.244.1.70, ServerName: azheng-dep-6df7878c4b-bg6d5, ServerIP: 10.244.1.82!


# curl https://azheng.com -kv
...
* Server certificate:
*  subject: O=Acme Co; CN=Kubernetes Ingress Controller Fake Certificate
...
```

### 对外发布 dashboard

https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/#rewrite

https://kubernetes.github.io/ingress-nginx/examples/rewrite/

- k8s dashboard 通过 ingress 对外发布

dashboard：

```sh
# kubectl describe svc -n kubernetes-dashboard kubernetes-dashboard
Name:              kubernetes-dashboard
Namespace:         kubernetes-dashboard
Labels:            k8s-app=kubernetes-dashboard
Annotations:       <none>
Selector:          k8s-app=kubernetes-dashboard
Type:              ClusterIP
IP Family Policy:  SingleStack
IP Families:       IPv4
IP:                10.103.252.210
IPs:               10.103.252.210
Port:              <unset>  443/TCP
TargetPort:        8443/TCP
Endpoints:         10.244.1.86:8443
Session Affinity:  None
Events:            <none>
```

#### 通过根路径访问 dashboard

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: dashboard-ingress
  namespace: kubernetes-dashboard # Ingress的定义需和所转发的service位于同一名称空间
  annotations:
    ingress.kubernetes.io/ssl-passthrough: "true" # 启动ssl直连
    nginx.ingress.kubernetes.io/backend-protocol: "HTTPS" # 指定后端使用的协议为https
spec:
  ingressClassName: nginx
  rules:
  - http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: kubernetes-dashboard
            port:
              number: 443
```

验证：

- 访问：https://10.0.0.168/

```yaml
# kubectl describe ingress -n kubernetes-dashboard dashboard-ingress
Name:             dashboard-ingress
Labels:           <none>
Namespace:        kubernetes-dashboard
Address:          10.96.216.31
Default backend:  default-http-backend:80 (<error: endpoints "default-http-backend" not found>)
Rules:
  Host        Path  Backends
  ----        ----  --------
  *
              /   kubernetes-dashboard:443 (10.244.1.86:8443)
Annotations:  ingress.kubernetes.io/ssl-passthrough: true
              nginx.ingress.kubernetes.io/backend-protocol: HTTPS
Events:
  Type    Reason  Age                 From                      Message
  ----    ------  ----                ----                      -------
  Normal  Sync    95s (x2 over 2m1s)  nginx-ingress-controller  Scheduled for sync
```



#### 通过子路径访问


```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: dashboard-ingress
  namespace: kubernetes-dashboard
  annotations:    
    ingress.kubernetes.io/ssl-passthrough: "true" # 启动ssl直连    
    nginx.ingress.kubernetes.io/backend-protocol: "HTTPS" # 指定后端使用的协议为https   
    nginx.ingress.kubernetes.io/rewrite-target: /$2  # 重写目标路径
spec:
  ingressClassName: nginx
  rules:
  - http:
      paths:
      - path: /dashboard(/|$)(.*)
        pathType: Exact 
        backend:
          service:
            name: kubernetes-dashboard
            port:
              number: 443
```

验证：

- 访问：https://10.0.0.168/dashboard/
  - 访问时末尾要加 "/"

- **重写说明：**

  - https://10.0.0.168/dashboard/  **-->** https://dashboard-ClusterIP:ClusterPort443/

  - https://10.0.0.168/dashboard/pathA  **-->** https://dashboard-ClusterIP:ClusterPort443/pathA




### 对外发布 longhorn

https://longhorn.io/docs/1.3.2/deploy/accessing-the-ui/longhorn-ingress/

- 为 longhorn 添加 basic-auth，以实现安全访问
- **PS：longhorn默认未启用ssl，为了basic的账号密码在互联网传输更加安全 可以在ingress上启用ssl**

```sh
$ USER=foo; PASSWORD=bar; echo "${USER}:$(openssl passwd -stdin -apr1 <<< ${PASSWORD})" >> auth
$ cat auth
foo:$apr1$FnyKCYKb$6IP2C45fZxMcoLwkOwf7k0

$ kubectl -n longhorn-system create secret generic basic-auth --from-file=auth
secret/basic-auth created
$ kubectl -n longhorn-system get secret basic-auth -o yaml
apiVersion: v1
data:
  auth: Zm9vOiRhcHIxJEZueUtDWUtiJDZJUDJDNDVmWnhNY29Md2tPd2Y3azAK
kind: Secret
metadata:
  creationTimestamp: "2020-05-29T10:10:16Z"
  name: basic-auth
  namespace: longhorn-system
  resourceVersion: "2168509"
  selfLink: /api/v1/namespaces/longhorn-system/secrets/basic-auth
  uid: 9f66233f-b12f-4204-9c9d-5bcaca794bb7
type: Opaque

$ echo "
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: longhorn-ingress
  namespace: longhorn-system
  annotations:
    # type of authentication
    nginx.ingress.kubernetes.io/auth-type: basic
    # prevent the controller from redirecting (308) to HTTPS
    nginx.ingress.kubernetes.io/ssl-redirect: 'false'
    # name of the secret that contains the user/password definitions
    nginx.ingress.kubernetes.io/auth-secret: basic-auth
    # message to display with an appropriate context why the authentication is required
    nginx.ingress.kubernetes.io/auth-realm: 'Authentication Required '
spec:
  rules:
  - http:
      paths:
      - pathType: Prefix
        path: "/"
        backend:
          service:
            name: longhorn-frontend
            port:
              number: 80
" | kubectl -n longhorn-system create -f -
ingress.networking.k8s.io/longhorn-ingress created

$ kubectl -n longhorn-system get ingress
NAME               HOSTS   ADDRESS                                     PORTS   AGE
longhorn-ingress   *       45.79.165.114,66.228.45.37,97.107.142.125   80      2m7s

$ curl -v http://97.107.142.125/
*   Trying 97.107.142.125...
* TCP_NODELAY set
* Connected to 97.107.142.125 (97.107.142.125) port 80 (#0)
> GET / HTTP/1.1
> Host: 97.107.142.125
> User-Agent: curl/7.64.1
> Accept: */*
>
< HTTP/1.1 401 Unauthorized
< Server: openresty/1.15.8.1
< Date: Fri, 29 May 2020 11:47:33 GMT
< Content-Type: text/html
< Content-Length: 185
< Connection: keep-alive
< WWW-Authenticate: Basic realm="Authentication Required"
<
<html>
<head><title>401 Authorization Required</title></head>
<body>
<center><h1>401 Authorization Required</h1></center>
<hr><center>openresty/1.15.8.1</center>
</body>
</html>
* Connection #0 to host 97.107.142.125 left intact
* Closing connection 0

$ curl -v http://97.107.142.125/ -u foo:bar
*   Trying 97.107.142.125...
* TCP_NODELAY set
* Connected to 97.107.142.125 (97.107.142.125) port 80 (#0)
* Server auth using Basic with user 'foo'
> GET / HTTP/1.1
> Host: 97.107.142.125
> Authorization: Basic Zm9vOmJhcg==
> User-Agent: curl/7.64.1
> Accept: */*
>
< HTTP/1.1 200 OK
< Date: Fri, 29 May 2020 11:51:27 GMT
< Content-Type: text/html
< Content-Length: 1118
< Last-Modified: Thu, 28 May 2020 00:39:41 GMT
< ETag: "5ecf084d-3fd"
< Cache-Control: max-age=0
<
<!DOCTYPE html>
<html lang="en">
......
```

### Resource 使用

- `Resource` 后端是一个引用，指向同一命名空间中的另一个 Kubernetes 资源，将其作为 Ingress 对象；
- **`Resource` 后端与 Service 后端是互斥的，在二者均被设置时会无法通过合法性检查 ；**
- `Resource` 后端的一种常见用法是将所有入站数据导向带有静态资产的对象存储后端；

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ingress-resource-backend
spec:
  defaultBackend:
    resource:
      apiGroup: k8s.example.com
      kind: StorageBucket
      name: static-assets
  rules:
    - http:
        paths:
          - path: /icons
            pathType: ImplementationSpecific
            backend:
              resource:
                apiGroup: k8s.example.com
                kind: StorageBucket
                name: icon-assets
```





# ---

# Contour 概述

- [Contour](https://projectcontour.io/) 是一个基于 [Envoy](https://www.envoyproxy.io/) 的 Ingress 控制器；
- **contour 负责解析 ingress 或 httpproxy 的配置清单，然后转换为 envoy 支持的格式，实际的代理是 envoy 完成的，当然客户端访问的也是 envoy 的 service；**
- envoy 会以 DaemonSet 的方式在每个node节点运行，并且 envoy 的 service 使用了 `externalTrafficPolicy: Local` 的流量转发策略，即只在节点范围进行调度，这样的好处是大大减少了集群范围调度而带来的性能损耗，从而提高了性能。



Contour是基于Envoy代理的。Contour是Kubernetes的Ingress控制器，使用Envoy代理来实现请求路由和负载均衡等功能。Contour基于Envoy提供了许多高级的流量管理功能，例如灰度发布、TLS终止、请求重试等。Contour支持Kubernetes的动态配置，可以与Istio等服务网格集成，为Kubernetes集群中的应用程序提供高级流量管理和安全功能。

### Contour - Deploy

- https://projectcontour.io/getting-started/



### Contour - Ingress

- https://projectcontour.io/docs/v1.23.0/config/ingress

### annotations

- https://projectcontour.io/docs/v1.23.0/config/annotations/

### 环境说明

- 下面范例中所使用的 ingress controller 对应 service 的信息；

- **外部访问的是 envoy service**（contour只为给envoy提供配置信息）

```yaml
# kubectl get svc -n projectcontour
NAME      TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)          AGE
contour   ClusterIP   10.104.99.184   <none>        8001/TCP         167m
envoy     ClusterIP   10.106.15.54    10.0.0.188    80/TCP,443/TCP   167m
```

## 发布一个简单的 web 服务

- 对外发布一个最简单的 web服务
- **PS：自定义的 Ingress 可以不与 Ingress controller 位于同一名称空间**

```yaml {filename="demoapp.yaml"}
apiVersion: apps/v1
kind: Deployment
metadata:
  name: demoapp-dep
  namespace: default 
spec:
  selector:
    matchLabels:
      app: demoapp
  template:
    metadata:
      labels:
        app: demoapp
    spec:
      containers:
      - name: demoapp
        image: ikubernetes/demoapp:v1.0
---
apiVersion: v1
kind: Service
metadata:
  name: demoapp-svc 
  namespace: default 
spec:
  type: ClusterIP # 因为仅被ingress所访问，所以配置为ClusterIP也可以
  selector:
    app: demoapp
  ports:
  - port: 80
    targetPort: 80
```

```yaml {filename="ingress-demoapp.yaml"}
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ingress-demoapp
  namespace: default
spec:
  ingressClassName: contour
  rules:
  - host: xiangzheng.com
    http:
      paths:
      - path: /
        pathType: Prefix 
        backend:
          service:
            name: demoapp-svc
            port:
              number: 80
```

验证：

```yaml
# kubectl describe ingress ingress-demoapp
Name:             ingress-demoapp
Labels:           <none>
Namespace:        default
Address:
Default backend:  default-http-backend:80 (<error: endpoints "default-http-backend" not found>)
Rules:
  Host            Path  Backends
  ----            ----  --------
  xiangzheng.com
                  /   demoapp-svc:80 (10.244.1.93:80)
Annotations:      <none>
Events:           <none>
```

测试：

```yaml
# 因为未加主机头，并且也没有定义Default backend，所以报404
# curl 10.0.0.188 -I
HTTP/1.1 404 Not Found
vary: Accept-Encoding
date: Thu, 19 Jan 2023 09:15:32 GMT
server: envoy # 由envoy响应
transfer-encoding: chunked


# 因为提供了ingress中定义的host，所以被识别，从而转发到了service对应后端的pod
# curl -H "Host:xiangzheng.com"  10.0.0.188
iKubernetes demoapp v1.0 !! ClientIP: 10.244.1.90, ServerName: demoapp-dep-5748b7ccfc-j5bcj, ServerIP: 10.244.1.93!
```



## 单域名https + 默认后端

- 使用 ingress 对外发布 xiangzheng.com 虚拟主机，并且使用 https 对外提供服务，最后再创建默认的backend 作为 sorryserver

### secret

- 为 xiangzheng.com 创建自签名证书，而后生成tls类型的secret；
- **注意：CN字段要与实际主机名相匹配**

```yaml
# mkdir -p /tmp/certs/

# cd /tmp/certs/

# openssl genrsa -out xiangzheng.com.key 4096

# openssl req -x509 -new -days 3650 -subj "/C=CN/ST=Beijing/L=Beijing/O=AzhengKeJi/OU=Personal/CN=xiangzheng.com" -key xiangzheng.com.key -out xiangzheng.com.crt

# kubectl create secret tls xiangzheng.com --cert=xiangzheng.com.crt --key=xiangzheng.com.key
```


```yaml {filename="demoapp.yaml"}
apiVersion: apps/v1
kind: Deployment
metadata:
  name: demoapp-dep
  namespace: default 
spec:
  selector:
    matchLabels:
      app: demoapp
  template:
    metadata:
      labels:
        app: demoapp
    spec:
      containers:
      - name: demoapp
        image: ikubernetes/demoapp:v1.0
---
apiVersion: v1
kind: Service
metadata:
  name: demoapp-svc 
  namespace: default 
spec:
  type: ClusterIP
  selector:
    app: demoapp
  ports:
  - port: 80
    targetPort: 80
```


```yaml {filename="sorry-server.yaml"}
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sorry-server-dep
  namespace: default 
spec:
  selector:
    matchLabels:
      app: sorry-server
  template:
    metadata:
      labels:
        app: sorry-server
    spec:
      containers:
      - name: sorry-server
        image: nginx:1.23 # 提供sorry-server的pod
---
apiVersion: v1
kind: Service
metadata:
  name: sorry-server-svc 
  namespace: default 
spec:
  type: ClusterIP
  selector:
    app: sorry-server
  ports:
  - port: 80
    targetPort: 80
```


```yaml {filename="ingress-demoapp.yaml"}
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ingress-demoapp
  namespace: default
spec:
  ingressClassName: contour
  rules:
  - host: xiangzheng.com
    http:
      paths:
      - path: /
        pathType: Prefix 
        backend:
          service:
            name: demoapp-svc
            port:
              number: 80
  tls:
  - hosts:
    - xiangzheng.com
    secretName: xiangzheng.com
  defaultBackend:
    service: 
      name: sorry-server-svc
      port:
        number: 80
```

测试：

- 注意：ingressClassName 设置为 contour 时测试域名访问需要修改hosts文件测试，如果使用添加Host主机头的方式访问将报错

```sh
# 以添加主机头的方式访问报错
# curl -H "Host:xiangzheng.com" https://10.0.0.188
curl: (35) OpenSSL SSL_connect: Connection reset by peer in connection to 10.0.0.188:443 


# 以hosts文件解析的方式访问正常
# echo '10.0.0.188 xiangzheng.com' >> /etc/hosts
# curl https://xiangzheng.com -k
iKubernetes demoapp v1.0 !! ClientIP: 10.244.1.90, ServerName: demoapp-dep-5748b7ccfc-j5bcj, ServerIP: 10.244.1.93!


# default backend 可以正常响应，但模拟后端无Pod可用后，sorry-server的Pod并未正常做出响应
# curl 10.0.0.188
<!DOCTYPE html>
<html>
<head>
<title>Welcome to nginx!</title>
...
# kubectl delete deployments.apps demoapp-dep
deployment.apps "demoapp-dep" deleted
# curl https://xiangzheng.com -ki;echo
HTTP/2 503
content-length: 19
content-type: text/plain
date: Thu, 19 Jan 2023 09:37:32 GMT
server: envoy

no healthy upstream
```



## 对外发布 dashboard

- k8s dashboard 通过 ingress 对外发布

### dashboard service

```sh
# kubectl get svc -n kubernetes-dashboard
NAME                        TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)    AGE
dashboard-metrics-scraper   ClusterIP   10.109.180.121   <none>        8000/TCP   17s
kubernetes-dashboard        ClusterIP   10.101.248.186   <none>        443/TCP    17s
```


- 此示例无法实现对外发布dashboard，参阅下面的使用 HTTPProxy 来对外发布 dashboard

```yaml {filename="dashboard-ingress.yaml"}
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: dashboard-ingress
  namespace: kubernetes-dashboard
  annotations:
    ingress.kubernetes.io/ssl-passthrough: "true" # 启动ssl直连
spec:
  ingressClassName: contour
  rules:
  - host: dashboard.azheng.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: kubernetes-dashboard
            port:
              number: 443
  tls:
  - hosts:
    - dashboard.azheng.com
    secretName: xiangzheng.com
```



# HTTPProxy - Explain

- [HTTPProxy (Contour custom resource)](https://projectcontour.io/docs/v1.23.0/config/fundamentals/)

- Contour除了支持使用标准Ingress资源进行配置以外，还支持使用HTTPProxy这个自定义资源实现更丰富的流量管理策略

## 资源规范基础

```yaml
apiVersion: projectcontour.io/v1   # API群组及版本
kind: HTTPProxy   # CRD资源的名称；
metadata:
  name <string>
  namespace <string>   # 名称空间级别的资源
spec:
  virtualhost <VirtualHost>   # 定义FQDN格式的虚拟主机，类似于Ingress中host
    fqdn <string>   # 虚拟主机FQDN格式的名称
    tls <TLS>   # 启用HTTPS，且默认将HTTP请求以301重定向至HTTPS
      secretName <string>   # 存储于证书和私钥信息的Secret资源名称
      minimumProtocolVersion <string>   # 支持的SSL/TLS协议的最低版本
      passthrough <boolean>   # 是否启用透传模式，启用时控制器不卸载HTTPS会话
      clientValidation <DownstreamValidation>   # 验证客户端证书，可选配置
        caSecret <string>   # 用于验证客户端证书的CA的证书
  routes <[]Route>  # 定义路由规则，如果存在TCPProxy，则忽略路由规则
    conditions <[]Condition>   # 流量匹配条件，支持PATH前缀和标头匹配两种检测机制
      prefix <String>   # PATH路径前缀匹配，类似于Ingress中的path字段
    permitInsecure <Boolean>   # 是否禁止默认的将HTTP重定向到HTTPS的功能
    services <[]Service>   # 后端服务，会对应转换为Envoy的Cluster定义
      name <String>    # 服务名称
      port <Integer>   # 服务端口
      protocol <String>   # 到达后端服务的协议，可用值为tls、h2或者h2c
      validation <UpstreamValidation>   # 是否校验服务端证书
        caSecret <String>  
        subjectName <string>   # 要求证书中使用的Subject值
```

## 高级路由

```yaml
spec:
  routes <[]Route>  # 定义路由规则
    conditions <[]Condition>
      prefix <String>
      header <HeaderCondition>   # 请求报文标头匹配，多个header间为与逻辑，即都满足才匹配
        name <String>        # 标头名称
        present <Boolean>   # true表示存在该标头即满足条件，值false没有意义
        contains <String>   # 标头值必须包含的子串
        notcontains <String>  # 标头值不能包含的子串
        exact <String>      # 标头值精确的匹配
        notexact <String>  # 标头值精确反向匹配，即不能与指定的值相同
    services <[]Service>   # 后端服务，转换为Envoy的Cluster
      name <String>
      port <Integer>
      protocol <String>  
      weight <Int64>     # 服务权重，用于流量分割
      mirror <Boolean>   # 流量镜像
      requestHeadersPolicy <HeadersPolicy>   # 到上游服务器请求报文的标头策略
        set <[]HeaderValue>   # 添加标头或设置指定标头的值
          name <String>
          value <String>
        remove <[]String>   # 移除指定的标头
      responseHeadersPolicy <HeadersPolicy>   # 到下游客户端响应报文的标头策略
    loadBalancerPolicy <LoadBalancerPolicy>   # 指定要使用负载均衡策略
      strategy <String>    # 具体使用的策略，支持Random、RoundRobin、Cookie、WeightedLeastRequest，默认为RoundRobin；
    requestHeadersPolicy <HeadersPolicy>   # 路由级别的请求报文标头策略
    reHeadersPolicy <HeadersPolicy>         # 路由级别的响应报文标头策略
    pathRewritePolicy <PathRewritePolicy>  # URL重写
      replacePrefix <[]ReplacePrefix>
        prefix <String>         # PATH路由前缀
        replacement <String>   # 替换为的目标路径
```

## 服务弹性

```yaml
spec:
  routes <[]Route> 
    timeoutPolicy <TimeoutPolicy>   # 超时策略
      response <String>   # 等待服务器响应报文的超时时长
      idle <String>   # 超时后，Envoy维持与客户端之间连接的空闲时长
    retryPolicy <RetryPolicy>   # 重试策略
      count <Int64>   # 重试的次数，默认为1
      perTryTimeout <String>   # 每次重试的超时时长
    healthCheckPolicy <HTTPHealthCheckPolicy>   # 主动健康状态检测
      path <String>   # 检测针对的路径（HTTP端点）
      host <String>   # 检测时请求的虚拟主机
      intervalSeconds <Int64>   # 时间间隔，即检测频度，默认为5秒
      timeoutSeconds <Int64>   # 超时时长，默认为2秒
      unhealthyThresholdCount <Int64>   # 判定为非健康状态的阈值，即连续错误次数
      healthyThresholdCount <Int64>   # 判定为健康状态的阈值
```



# HTTPProxy - Eample

## 对外发布 dashboard

- 对外发布 kubernetes dashboard


```yaml {filename="httpproxy.yaml"} 
apiVersion: projectcontour.io/v1
kind: HTTPProxy
metadata:
  name: dashboard
  namespace: kubernetes-dashboard
spec:
  virtualhost:
    fqdn: dashboard.azheng.com
    tls:
      passthrough: true
  tcpproxy:
    services:
    - name: kubernetes-dashboard
      port: 443
```

### 验证

```yaml
# kubectl get httpproxies -n kubernetes-dashboard 
NAME        FQDN                       TLS SECRET   STATUS   STATUS DESCRIPTION
dashboard   dashboard.xiangzheng.com                valid    Valid HTTPProxy


# 浏览器访问：https://dashboard.xiangzheng.com/
```





## 首部字段路由

- 根据请求报文中的首部字段路由


```yaml {filename="demoapp-v10.yaml"} 
apiVersion: apps/v1
kind: Deployment
metadata:
  name: demoapp-v10-dep
  namespace: default 
spec:
  selector:
    matchLabels:
      app: demoapp-v10
  template:
    metadata:
      labels:
        app: demoapp-v10
    spec:
      containers:
      - name: myapp
        image: ikubernetes/demoapp:v1.0
---
apiVersion: v1
kind: Service
metadata:
  name: demoapp-v10-svc 
  namespace: default 
spec:
  type: ClusterIP
  selector:
    app: demoapp-v10
  ports:
  - port: 80
    targetPort: 80
```


```yaml {filename="demoapp-v11.yaml"}
apiVersion: apps/v1
kind: Deployment
metadata:
  name: demoapp-v11-dep
  namespace: default 
spec:
  selector:
    matchLabels:
      app: demoapp-v11
  template:
    metadata:
      labels:
        app: demoapp-v11
    spec:
      containers:
      - name: myapp
        image: ikubernetes/demoapp:v1.1
---
apiVersion: v1
kind: Service
metadata:
  name: demoapp-v11-svc
  namespace: default 
spec:
  type: ClusterIP
  selector:
    app: demoapp-v11
  ports:
  - port: 80
    targetPort: 80
```


- 多个header间为与逻辑，即都满足才匹配

```yaml {filename="httpproxy.yaml"}
apiVersion: projectcontour.io/v1
kind: HTTPProxy
metadata:
  name: httpproxy-headers-routing
  namespace: default
spec:
  virtualhost:
    fqdn: xiangzheng.com
  routes:
  - conditions: # http请求报文中包含键为X-Canary，并且User-Agent为curl的流量将转发到demoapp-v11-svc
    - header:
        name: X-Canary
        present: true # 为true时只要键为X-Canary即满足条件
    - header:
        name: User-Agent
        contains: curl
    services:
    - name: demoapp-v11-svc
      port: 80
  - services: # 其他流量转发到demoapp-v10-svc
    - name: demoapp-v10-svc
      port: 80
```



### 验证

```sh
# 因为任何首部字段都不满足，所以被路由到v1.0上了
# wget -q -O- xiangzheng.com
iKubernetes demoapp v1.0 !! ClientIP: 10.244.1.168, ServerName: demoapp-v10-dep-586d58c846-nxtsd, ServerIP: 10.244.1.179!


# 因为只满足 User-Agent:curl，所以被路由到v1.0上了
# curl xiangzheng.com
iKubernetes demoapp v1.0 !! ClientIP: 10.244.1.168, ServerName: demoapp-v10-dep-586d58c846-nxtsd, ServerIP: 10.244.1.179!


# 因为同时满足User-Agent:curl与X-Canary:true，所以被路由到v1.1上了
# curl -H "X-Canary:true" xiangzheng.com
iKubernetes demoapp v1.1 !! ClientIP: 10.244.1.168, ServerName: demoapp-v11-dep-749946db4b-5tkng, ServerIP: 10.244.1.180!

# 因为在header中定义了present: true，所有只要键为X-Canary即可
# curl -H "X-Canary:aaa" xiangzheng.com
iKubernetes demoapp v1.1 !! ClientIP: 10.244.1.90, ServerName: demoapp-v11-dep-749946db4b-kzsgm, ServerIP: 10.244.1.98!
```







## 流量分割

- 通过流量分割可以实现金丝雀发布


```yaml {filename="demoapp-v10.yaml"}
apiVersion: apps/v1
kind: Deployment
metadata:
  name: demoapp-v10-dep
  namespace: default 
spec:
  selector:
    matchLabels:
      app: demoapp-v10
  template:
    metadata:
      labels:
        app: demoapp-v10
    spec:
      containers:
      - name: myapp
        image: ikubernetes/demoapp:v1.0
---
apiVersion: v1
kind: Service
metadata:
  name: demoapp-v10-svc 
  namespace: default 
spec:
  type: ClusterIP
  selector:
    app: demoapp-v10
  ports:
  - port: 80
    targetPort: 80
```

```yaml {filename="demoapp-v11.yaml"}
apiVersion: apps/v1
kind: Deployment
metadata:
  name: demoapp-v11-dep
  namespace: default 
spec:
  selector:
    matchLabels:
      app: demoapp-v11
  template:
    metadata:
      labels:
        app: demoapp-v11
    spec:
      containers:
      - name: myapp
        image: ikubernetes/demoapp:v1.1
---
apiVersion: v1
kind: Service
metadata:
  name: demoapp-v11-svc
  namespace: default 
spec:
  type: ClusterIP
  selector:
    app: demoapp-v11
  ports:
  - port: 80
    targetPort: 80
```


- 定义多个service，而后给每个service定义不同的权重，以实现灰度发布的效果

```yaml {filename="httpproxy.yaml"}
apiVersion: projectcontour.io/v1
kind: HTTPProxy
metadata:
  name: httpproxy-traffic-splitting
  namespace: default
spec:
  virtualhost:
    fqdn: xiangzheng.com
  routes:
  - conditions:
    - prefix: /
    services:
    - name: demoapp-v10-svc 
      port: 80
      weight: 80 # 百分之80的流量发送到demoapp-v10-svc
    - name: demoapp-v11-svc
      port: 80
      weight: 20 # 百分之20的流量发送到demoapp-v11-svc（灰度）
```

### 验证

- 样本数足够时，不同服务的相应占比应无限接近于`2:8`
- **如何写一个shell脚本来统计100次访问中每个服务的响应次数？定义变量然后将得到的不同值+1+1？**

```yaml
# while true ; do curl xiangzheng.com ; sleep .1 ; done
iKubernetes demoapp v1.0 !! ClientIP: 10.244.1.90, ServerName: demoapp-v10-dep-586d58c846-jcdhk, ServerIP: 10.244.1.99!
iKubernetes demoapp v1.0 !! ClientIP: 10.244.1.90, ServerName: demoapp-v10-dep-586d58c846-jcdhk, ServerIP: 10.244.1.99!
iKubernetes demoapp v1.0 !! ClientIP: 10.244.1.90, ServerName: demoapp-v10-dep-586d58c846-jcdhk, ServerIP: 10.244.1.99!
iKubernetes demoapp v1.0 !! ClientIP: 10.244.1.90, ServerName: demoapp-v10-dep-586d58c846-jcdhk, ServerIP: 10.244.1.99!
iKubernetes demoapp v1.0 !! ClientIP: 10.244.1.90, ServerName: demoapp-v10-dep-586d58c846-jcdhk, ServerIP: 10.244.1.99!
iKubernetes demoapp v1.0 !! ClientIP: 10.244.1.90, ServerName: demoapp-v10-dep-586d58c846-jcdhk, ServerIP: 10.244.1.99!
iKubernetes demoapp v1.0 !! ClientIP: 10.244.1.90, ServerName: demoapp-v10-dep-586d58c846-jcdhk, ServerIP: 10.244.1.99!
iKubernetes demoapp v1.0 !! ClientIP: 10.244.1.90, ServerName: demoapp-v10-dep-586d58c846-jcdhk, ServerIP: 10.244.1.99!
iKubernetes demoapp v1.0 !! ClientIP: 10.244.1.90, ServerName: demoapp-v10-dep-586d58c846-jcdhk, ServerIP: 10.244.1.99!
iKubernetes demoapp v1.0 !! ClientIP: 10.244.1.90, ServerName: demoapp-v10-dep-586d58c846-jcdhk, ServerIP: 10.244.1.99!
iKubernetes demoapp v1.0 !! ClientIP: 10.244.1.90, ServerName: demoapp-v10-dep-586d58c846-jcdhk, ServerIP: 10.244.1.99!
iKubernetes demoapp v1.0 !! ClientIP: 10.244.1.90, ServerName: demoapp-v10-dep-586d58c846-jcdhk, ServerIP: 10.244.1.99!
iKubernetes demoapp v1.1 !! ClientIP: 10.244.1.90, ServerName: demoapp-v11-dep-749946db4b-r4vjs, ServerIP: 10.244.1.100!
iKubernetes demoapp v1.0 !! ClientIP: 10.244.1.90, ServerName: demoapp-v10-dep-586d58c846-jcdhk, ServerIP: 10.244.1.99!
iKubernetes demoapp v1.0 !! ClientIP: 10.244.1.90, ServerName: demoapp-v10-dep-586d58c846-jcdhk, ServerIP: 10.244.1.99!
iKubernetes demoapp v1.0 !! ClientIP: 10.244.1.90, ServerName: demoapp-v10-dep-586d58c846-jcdhk, ServerIP: 10.244.1.99!
iKubernetes demoapp v1.1 !! ClientIP: 10.244.1.90, ServerName: demoapp-v11-dep-749946db4b-r4vjs, ServerIP: 10.244.1.100!
...
```

### 全量发布

- 灰度部署测试没问题后，将流量全部发往新版本的service

```yaml {filename="httpproxy.yaml"}
apiVersion: projectcontour.io/v1
kind: HTTPProxy
metadata:
  name: httpproxy-traffic-splitting
  namespace: default
spec:
  virtualhost:
    fqdn: xiangzheng.com
  routes:
  - conditions:
    - prefix: /
    services:
    - name: demoapp-v11-svc
      port: 80



# kubectl apply -f httpproxy.yaml
httpproxy.projectcontour.io/httpproxy-traffic-splitting configured



# while true ; do curl xiangzheng.com ; sleep .1 ; done
iKubernetes demoapp v1.1 !! ClientIP: 10.244.1.90, ServerName: demoapp-v11-dep-749946db4b-r4vjs, ServerIP: 10.244.1.100!
iKubernetes demoapp v1.1 !! ClientIP: 10.244.1.90, ServerName: demoapp-v11-dep-749946db4b-r4vjs, ServerIP: 10.244.1.100!
iKubernetes demoapp v1.1 !! ClientIP: 10.244.1.90, ServerName: demoapp-v11-dep-749946db4b-r4vjs, ServerIP: 10.244.1.100!
iKubernetes demoapp v1.1 !! ClientIP: 10.244.1.90, ServerName: demoapp-v11-dep-749946db4b-r4vjs, ServerIP: 10.244.1.100!
iKubernetes demoapp v1.1 !! ClientIP: 10.244.1.90, ServerName: demoapp-v11-dep-749946db4b-r4vjs, ServerIP: 10.244.1.100!
iKubernetes demoapp v1.1 !! ClientIP: 10.244.1.90, ServerName: demoapp-v11-dep-749946db4b-r4vjs, ServerIP: 10.244.1.100!
iKubernetes demoapp v1.1 !! ClientIP: 10.244.1.90, ServerName: demoapp-v11-dep-749946db4b-r4vjs, ServerIP: 10.244.1.100!
iKubernetes demoapp v1.1 !! ClientIP: 10.244.1.90, ServerName: demoapp-v11-dep-749946db4b-r4vjs, ServerIP: 10.244.1.100!
iKubernetes demoapp v1.1 !! ClientIP: 10.244.1.90, ServerName: demoapp-v11-dep-749946db4b-r4vjs, ServerIP: 10.244.1.100!
```





## 流量镜像

- 通过流量镜像可以实现全量压测


```yaml {filename="demoapp-v10.yaml"}
apiVersion: apps/v1
kind: Deployment
metadata:
  name: demoapp-v10-dep
  namespace: default 
spec:
  selector:
    matchLabels:
      app: demoapp-v10
  template:
    metadata:
      labels:
        app: demoapp-v10
    spec:
      containers:
      - name: myapp
        image: ikubernetes/demoapp:v1.0
---
apiVersion: v1
kind: Service
metadata:
  name: demoapp-v10-svc 
  namespace: default 
spec:
  type: ClusterIP
  selector:
    app: demoapp-v10
  ports:
  - port: 80
    targetPort: 80
```


```yaml {filename="demoapp-v11.yaml"}
apiVersion: apps/v1
kind: Deployment
metadata:
  name: demoapp-v11-dep
  namespace: default 
spec:
  selector:
    matchLabels:
      app: demoapp-v11
  template:
    metadata:
      labels:
        app: demoapp-v11
    spec:
      containers:
      - name: myapp
        image: ikubernetes/demoapp:v1.1
---
apiVersion: v1
kind: Service
metadata:
  name: demoapp-v11-svc
  namespace: default 
spec:
  type: ClusterIP
  selector:
    app: demoapp-v11
  ports:
  - port: 80
    targetPort: 80
```


- 即主pod正常对外访问，而后定义一组新pod同样接受外部流量 但仅接受 不响应；

```yaml {filename="httpproxy.yaml"}
apiVersion: projectcontour.io/v1
kind: HTTPProxy
metadata:
  name: httpproxy-traffic-mirror
  namespace: default
spec:
  virtualhost:
    fqdn: xiangzheng.com
  routes:
  - conditions:
    - prefix: /
    services:
    - name: demoapp-v10-svc
      port: 80
    - name: demoapp-v11-svc
      port: 80
      mirror: true # demoapp-v11-svc service 镜像一份，仅接受，不响应
```

### 验证

```sh
# 只有v1.0的pod对外响应
# for i in {1..3} ; do curl xiangzheng.com ; sleep .1 ; done
iKubernetes demoapp v1.0 !! ClientIP: 10.244.1.168, ServerName: demoapp-v10-dep-586d58c846-nxtsd, ServerIP: 10.244.1.179!
iKubernetes demoapp v1.0 !! ClientIP: 10.244.1.168, ServerName: demoapp-v10-dep-586d58c846-nxtsd, ServerIP: 10.244.1.179!
iKubernetes demoapp v1.0 !! ClientIP: 10.244.1.168, ServerName: demoapp-v10-dep-586d58c846-nxtsd, ServerIP: 10.244.1.179!



# 但流量也会镜像到v1.1的pod中
# kubectl logs demoapp-v11-dep-749946db4b-5tkng
10.244.1.168 - - [11/Nov/2022 03:34:33] "GET / HTTP/1.1" 200 -
10.244.1.168 - - [11/Nov/2022 03:34:33] "GET / HTTP/1.1" 200 -
10.244.1.168 - - [11/Nov/2022 03:34:33] "GET / HTTP/1.1" 200 -
```





## 自定义负载均衡策略

- 自定义负载均衡策略

```yaml {filename="demoapp-v10.yaml"}
apiVersion: apps/v1
kind: Deployment
metadata:
  name: demoapp-v10-dep
  namespace: default 
spec:
  selector:
    matchLabels:
      app: demoapp-v10
  template:
    metadata:
      labels:
        app: demoapp-v10
    spec:
      containers:
      - name: myapp
        image: ikubernetes/demoapp:v1.0
---
apiVersion: v1
kind: Service
metadata:
  name: demoapp-v10-svc 
  namespace: default 
spec:
  type: ClusterIP
  selector:
    app: demoapp-v10
  ports:
  - port: 80
    targetPort: 80
```

```yaml {filename="demoapp-v11.yaml"}
apiVersion: apps/v1
kind: Deployment
metadata:
  name: demoapp-v11-dep
  namespace: default 
spec:
  selector:
    matchLabels:
      app: demoapp-v11
  template:
    metadata:
      labels:
        app: demoapp-v11
    spec:
      containers:
      - name: myapp
        image: ikubernetes/demoapp:v1.1
---
apiVersion: v1
kind: Service
metadata:
  name: demoapp-v11-svc
  namespace: default 
spec:
  type: ClusterIP
  selector:
    app: demoapp-v11
  ports:
  - port: 80
    targetPort: 80
```

### httpproxy.yaml

```yaml
apiVersion: projectcontour.io/v1
kind: HTTPProxy
metadata:
  name: httpproxy-lb-strategy
  namespace: default
spec:
  virtualhost:
    fqdn: xiangzheng.com
  routes:
    - conditions:
      - prefix: /
      services:
        - name: demoapp-v10-svc
          port: 80
        - name: demoapp-v11-svc
          port: 80
      loadBalancerPolicy:
        strategy: Random # 指定调度算法，支持Random、RoundRobin、Cookie、WeightedLeastRequest，默认为RoundRobin；
```

### 验证

- Random，随机调度

```yaml
# while true ; do curl xiangzheng.com ; sleep .1 ; done
iKubernetes demoapp v1.0 !! ClientIP: 10.244.1.90, ServerName: demoapp-v10-dep-586d58c846-jcdhk, ServerIP: 10.244.1.99!
iKubernetes demoapp v1.0 !! ClientIP: 10.244.1.90, ServerName: demoapp-v10-dep-586d58c846-jcdhk, ServerIP: 10.244.1.99!
iKubernetes demoapp v1.1 !! ClientIP: 10.244.1.90, ServerName: demoapp-v11-dep-749946db4b-r4vjs, ServerIP: 10.244.1.100!
iKubernetes demoapp v1.0 !! ClientIP: 10.244.1.90, ServerName: demoapp-v10-dep-586d58c846-jcdhk, ServerIP: 10.244.1.99!
iKubernetes demoapp v1.1 !! ClientIP: 10.244.1.90, ServerName: demoapp-v11-dep-749946db4b-r4vjs, ServerIP: 10.244.1.100!
...
```

- RoundRobin，轮询调度（测试发现并未实现轮询调度，而是相当于随机调度，因为程序自身BUG所导致？）






## 部署双 Ingress Controller 实现流量隔离
部署两个 Ingress Controller，分别面向外部流量和内部流量。
- 外部流量链路：公网 VIP -> 公网 LB (如 LVS) -> Traefik 实例 A (监听 ingressClass: traefik-external，部署在专门的 DMZ 节点组) -> C 端业务 Pod。
- 内部流量链路：内网 VIP -> 内网 LB (如内部的 LVS 或 HAProxy) -> Traefik 实例 B (监听 ingressClass: traefik-internal，部署在内网管理节点组) -> kube-prometheus-stack 等内部 Pod。

参考文档：https://help.aliyun.com/zh/ack/ack-managed-and-ack-dedicated/user-guide/deploy-multiple-ingress-controllers-in-a-cluster


### 给 Worker 节点打标签
- 以决定内外网的入口分别落在哪些机器上，实现物理层面的隔离。

```sh
# 假设 node1 和 node2 作为外网流量入口 (放在 DMZ 区)
kubectl label nodes localhost-k8s-worker-01 ingress-type=external
kubectl label nodes localhost-k8s-worker-02 ingress-type=external
kubectl get node localhost-k8s-worker-{01,02} --show-labels

# 假设 node3 和 node4 作为内网流量入口 (办公网可达)
kubectl label nodes localhost-k8s-worker-03 ingress-type=internal
kubectl label nodes localhost-k8s-worker-04 ingress-type=internal
kubectl get node localhost-k8s-worker-{03,04} --show-labels

# 验证
kubectl get node -o wide --show-labels | grep ingress
```

### 准备 Traefik
```sh
# 添加官方 Traefik Helm repo
helm repo add traefik https://traefik.github.io/charts
helm repo update

# 创建面向公网和内网流量的 namespace 
kubectl create namespace traefik-external
kubectl create namespace traefik-internal

# 拉取 chart
helm pull traefik/traefik --version 35.2.0
```

#### 面向公网流量
- 这份配置负责处理来自互联网的流量，通常不信任外部来源，所以我们需要它作为默认的 IngressClass，并且绑定到 external 标签的节点上。

```yaml {filename="values-traefik-35.2.0-external.yaml"}
# values-external.yaml
globalArguments:
  - "--global.checknewversion=false"
  - "--global.sendanonymoususage=false"

ingressClass:
  enabled: true
  isDefaultClass: true # 设置为集群默认的 Ingress，通常外网业务较多
  name: traefik-external

providers:
  kubernetesCRD:
    enabled: true
    ingressClass: traefik-external
    allowCrossNamespace: true
  kubernetesIngress:
    enabled: true
    ingressClass: traefik-external

deployment:
  kind: DaemonSet

# 开启主机网络，直接监听宿主机的 80/443
hostNetwork: true
# 🚨 关键：使用 hostNetwork 时，必须修改 dnsPolicy，否则 Traefik 无法解析集群内的 Service 域名
dnsPolicy: ClusterFirstWithHostNet

nodeSelector:
  ingress-type: external # 精准调度到外网节点

tolerations:
  - key: "node-role.kubernetes.io/master"
    operator: "Exists"
    effect: "NoSchedule"
  - key: "node-role.kubernetes.io/control-plane"
    operator: "Exists"
    effect: "NoSchedule"

ports:
  web:
    port: 8000
    expose: true
    exposedPort: 80
    # 如果外网前面也有 LVS/Nginx 四层代理，也需要开启 proxyProtocol
    # proxyProtocol:
    #   trustedIPs:
    #     - "10.0.x.x/24" # 外网 LB 的内网 IP 网段
  websecure:
    port: 8443
    expose: true
    exposedPort: 443
  traefik:
    port: 9000
    expose: true
    exposedPort: 9000

service:
  enabled: true
  type: ClusterIP # 因为用了 hostNetwork，Service 类型用默认的 ClusterIP 即可，不需要 NodePort 或 LoadBalancer

logs:
  access:
    enabled: true
```

#### 面向内网流量
这份配置专供内部员工通过 Nginx 四层 LB 访问，核心区别在于 ingressClass 的名称、节点调度标签，以及强制开启的 proxyProtocol。
```yaml {filename="values-traefik-35.2.0-internal.yaml"}
globalArguments:
  - "--global.checknewversion=false"
  - "--global.sendanonymoususage=false"

ingressClass:
  enabled: true
  isDefaultClass: false # 必须为 false，避免与外网冲突
  name: traefik-internal

providers:
  kubernetesCRD:
    enabled: true
    ingressClass: traefik-internal
    allowCrossNamespace: true
  kubernetesIngress:
    enabled: true
    ingressClass: traefik-internal

deployment:
  kind: DaemonSet

# 开启主机网络
hostNetwork: true
dnsPolicy: ClusterFirstWithHostNet

nodeSelector:
  ingress-type: internal # 精准调度到内网节点

tolerations:
  - key: "node-role.kubernetes.io/master"
    operator: "Exists"
    effect: "NoSchedule"
  - key: "node-role.kubernetes.io/control-plane"
    operator: "Exists"
    effect: "NoSchedule"

ports:
  web:
    port: 8080
    expose:
      default: true
    exposedPort: 80
    # http 重定向到 https
    redirections:
      entryPoint:
        to: websecure
        scheme: https
        permanent: true # 开启 301 永久重定向
    # 必须开启：接收 Nginx 传过来的真实员工办公网 IP
    proxyProtocol:
      trustedIPs:
        - "10.0.0.80/32" # 替换为内网 Nginx LB 所在的网段或具体 IP
  websecure:
    port: 8443
    expose:
      default: true
    exposedPort: 443
    # 必须开启：接收 Nginx 传过来的真实员工办公网 IP 
    proxyProtocol:
      trustedIPs:
        - "10.0.0.80/32" # 替换为内网 Nginx LB 所在的网段或具体 IP
  traefik:
    port: 9000
    expose:
      default: true
    exposedPort: 9000

service:
  enabled: true
  type: ClusterIP

logs:
  access:
    enabled: true

updateStrategy:
  type: RollingUpdate
  rollingUpdate:
    maxUnavailable: 1
    maxSurge: 0 # DaemonSet 不支持 maxSurge，必须设为 0
```

### 安装/升级 Traefik
```sh
# 外部 Ingress Controller
helm upgrade -i traefik-external ./traefik-35.2.0.tgz \
  -n traefik-external \
  --values values-traefik-35.2.0-external.yaml

# 内部 Ingress Controller
helm upgrade -i traefik-internal ./traefik-35.2.0.tgz \
  -n traefik-internal \
  --values values-traefik-35.2.0-internal.yaml
```
注：这里的第一个 `traefik-external` 是 Helm Release 的名字，第二个 `-n traefik-internal` 是刚才创建的 Namespace 名字，两者同名在运维管理中是非常清晰的好习惯。

### LB 配置
#### 内网 LB
```conf {filename="/etc/nginx/stream.d/lb-intranet.conf"}
upstream traefik_internal_http {
    server 10.0.0.103:8080 max_fails=3 fail_timeout=10s;
    server 10.0.0.203:8080 max_fails=3 fail_timeout=10s;
}

upstream traefik_internal_https {
    server 10.0.0.103:8443 max_fails=3 fail_timeout=10s;
    server 10.0.0.203:8443 max_fails=3 fail_timeout=10s;
}

# 监听内网 LB 的 80 端口，转发到后端的 8080
server {
    listen 80;
    proxy_pass traefik_internal_http;
    
    # 开启 PROXY Protocol 发送真实客户端 IP
    proxy_protocol on;
}

# 监听内网 LB 的 443 端口，转发到后端的 8443
server {
    listen 443;
    proxy_pass traefik_internal_https;
    
    # 开启 PROXY Protocol 发送真实客户端 IP
    proxy_protocol on;
}
```

### 验证
```sh
kubectl get ingressclasses -A -o wide

# 而后通过 LB 访问测试
```