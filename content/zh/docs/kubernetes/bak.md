---
title: "bak"
weight: 10
---


# 外部访问 k8s 内部服务的方式

## Pod

- Pod 级别定义

### hostPort

- 映射Pod到物理机：将Pod端口号映射到宿主机，即在Pod中采用hostPort方式，以使客户端应用能够通过物理机访问容器应用。


```yaml
apiVersion: v1
kind: Pod
metadata:
  name: tomcat
spec:
  containers:
    - name: tomcat
    image: tomcat:8.5
    ports:
      - hostPort: 8081 # 主机映射端口
        containerPort: 8080 # 容器内实际端口
```

### hostNetwork

- 使 Pod 共享 node 节点的网络名称空间。
- **谨慎使用！因为此选项危险性很高，因此要在多租户环境中限制普通用户定义此功能**
- `pod.spec.hostNetwork`

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp
  labels:
    name: myapp
spec:
  hostNetwork: true # boolean 布尔值，true或false，默认false
  containers:
  - name: myapp
    image: ikubernetes/demoapp:v1.0 
    imagePullPolicy: IfNotPresent
```

#### 范例-1

##### yaml

```yaml
# vim myapp.yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp
  labels:
    name: myapp
spec:
  hostNetwork: true # 共享宿主机的网络名称空间
  containers:
  - name: myapp
    image: ikubernetes/demoapp:v1.0
    imagePullPolicy: IfNotPresent
    env:
      - name: PORT
        value: "8080"
```

##### 验证

```sh
# kubectl apply -f myapp.yaml 
pod/myapp created

# kubectl describe pod myapp 
Name:         myapp
Namespace:    default
Priority:     0
Node:         k8s-node-2/10.0.0.102
...
Containers:
  myapp:
    Container ID:   docker://40505748fd9540ad06c5d1b1e77a096e54c6421f7067f2f490ab6a1f9779786a
    Image:          ikubernetes/demoapp:v1.0
    Image ID:       docker-pullable://ikubernetes/demoapp@sha256:6698b205eb18fb0171398927f3a35fe27676c6bf5757ef57a35a4b055badf2c3
    Port:           <none>
    Host Port:      <none>
    State:          Running
...




# 共享宿主机的网络了，因此可以从宿主机的8080端口直接进行访问。
# kubectl exec myapp -- ss -ntl
State   Recv-Q   Send-Q     Local Address:Port      Peer Address:Port  Process  
LISTEN  0        128              0.0.0.0:8080            0.0.0.0:*              
LISTEN  0        4096       127.0.0.53%lo:53             0.0.0.0:*              
LISTEN  0        128              0.0.0.0:22             0.0.0.0:*              
...

# kubectl exec myapp -- ip a
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
    inet6 ::1/128 scope host 
       valid_lft forever preferred_lft forever
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP group default qlen 1000
    link/ether 00:0c:29:0d:63:cd brd ff:ff:ff:ff:ff:ff
    inet 10.0.0.101/24 brd 10.0.0.255 scope global eth0
       valid_lft forever preferred_lft forever
    inet6 fe80::20c:29ff:fe0d:63cd/64 scope link 
       valid_lft forever preferred_lft forever
3: docker0: <NO-CARRIER,BROADCAST,MULTICAST,UP> mtu 1500 qdisc noqueue state DOWN group default 
...
```



## Service

- 定义 Service

### nodePort

- 映射Service到物理机：将Service端口号映射到宿主机，即在Service中采用nodePort方式，以使客户端应用能够通过物理机访问容器应用。

### LoadBalancer

- 映射Sercie到LoadBalancer：通过设置LoadBalancer映射到云服务商提供的LoadBalancer地址。这种用法仅用于在公有云服务提供商的云平台上设置Service的场景。

### externalIPs

- 通过外部公网或私网IP，将流量引入到集群内部

### ExternalName

- x

## Ingress

- 定义 Ingress



# ---



# 认证、授权、准入控制

# 前言

[Kubernetes API 访问控制 | Kubernetes](https://kubernetes.io/zh-cn/docs/concepts/security/controlling-access/)

- k8s 以**插件化**的形式实现了三层**串行**安全验证机制：
  - 验证顺序：身份验证 **-->** 权限验证 **-->** 准入控制


- 以上三层验证都是在 Api Server 进行，准入控制验证通过后则会存储到etcd中





# 身份验证

[用户认证 | Kubernetes](https://kubernetes.io/zh-cn/docs/reference/access-authn-authz/authentication/)

- Authentication，Authn，验证请求的用户身份是否为集群中的有效用户。

- Kubernetes 通过身份认证插件 利用客户端证书、持有者令牌（Bearer Token）或身份认证代理（Proxy） 来认证 API 请求者的身份。

- **认证不通过：**服务器将以 HTTP 状态码 401 拒绝该请求。

- **认证通过：**该用户被认证为是集群中合法的用户，下一步将对该用户进行鉴权，以确定该用户是否对特定的资源具有相应的访问或操作权限

  - 例如基于角色访问控制（RBAC）子系统会确定 Service Account 是否有权针对某资源执行特定的操作。

  - 部分验证器还提供用户的组成员身份，其他则不提供。

- 一旦匹配则立刻将结果返回，不再继续向下匹配



## User Account

- 用户账号，面向人类用户，k8s不负责存储和管理这类用户（证书和私钥由用户自行管理）。

**应用场景：**

-  `kubectl` 、`kubeadmin` 等命令执行时的验证；

### 创建用户账号

其实就是向集群CA申请签发证书

- 证书中的 Common Name 字段来标明用户名，例如："/CN=jamesazheng"

- 证书中的 organization 字段来标明用户的所属组（可选），例如："/O=devops"

  - ```sh
    # 范例：使用用户名 james 生成一个证书签名请求（CSR），且该用户属于 "devops" 和 "test" 两个用户组。
    openssl req -new -key james.pem -out james-csr.pem -subj "/CN=james/O=devops/O=test"
    ```


#### openssl

- 使用 openssl 创建

```sh
# 创建存放目录，目录可自行选择
# mkdir /etc/kubernetes/users/jamesazheng -p
# cd /etc/kubernetes/users/jamesazheng


# 生成私钥
# openssl genrsa -out jamesazheng.key 2048


# 生成证书申请文件（用户名为jamesazheng，所属组为devops）
# openssl req -new -key jamesazheng.key -out jamesazheng.csr -subj "/CN=jamesazheng/O=devops"


# k8sCA签发证书
# openssl x509 -req -days 36500 -CA /etc/kubernetes/pki/ca.crt -CAkey /etc/kubernetes/pki/ca.key -CAcreateserial -in jamesazheng.csr -out jamesazheng.crt
Signature ok
subject=CN = jamesazheng, O = devops
Getting CA Private Key


# 验证证书
# openssl x509 -in jamesazheng.crt -text
Certificate:
    Data:
        Version: 1 (0x0)
        Serial Number:
            14:44:df:c2:0e:e2:49:39:6c:f2:d6:e4:45:32:8e:e3:6e:2d:ea:84
        Signature Algorithm: sha256WithRSAEncryption
        Issuer: CN = kubernetes
        Validity
            Not Before: Jan  4 06:35:19 2023 GMT
            Not After : Dec 11 06:35:19 2122 GMT
        Subject: CN = jamesazheng, O = devops
...



# 测试证书，可以识别用户，但未被授权，还需使用RBAC等授权插件对该用户授权。最后可以将次证书添加到kubeconfig中，使用kubeconfig进行访问。
```



## User Group

### 默认用户组

**system:unauthenticated**

- 未能通过任何一个授权插件检验的账号的所有未通过认证测试的用户统一隶属的用户组（匿名用户）；

**system:authenticated**

- 认证成功后的用户自动加入的一个专用组，用于快捷引用所有正常通过认证的用户账号；

**system:serviceaccounts**

- 所有名称空间中的所有ServiceAccount对象；

**system:serviceaccounts:\<namespace>**

- 特定名称空间内所有的ServiceAccount对象。

### 创建用户组

- xxx






## Service Account

- 服务账号，面向k8s中运行的应用，是标准的k8s资源类型之一(由K8s进行管理)，名称空间级别（可以在不同的名称空间中定义同名的用户）； 
- 服务账号用于 k8s 之上运行的 Pod 中的应用程序在访问 API Server 时认证使用
- 服务账号是 Kubernetes API 所管理的用户。它们被绑定到特定的名字空间， 或者由 API 服务器自动创建，或者通过 API 调用创建。服务账号与一组以 Secret 保存的凭据相关，这些凭据会被挂载到 Pod 中，从而允许集群内的进程访问 Kubernetes API。

**应用场景：**

- dashboard、kubelet... 



## 用户账号和服务账号的区别

**面向群体：**

- 用户账号针对人类用户
- 服务账号针对运行在 Pod 中的进程

**作用域：**

- 用户账号是集群作用域，每个k8s集群中账号名称必须唯一
- 服务账号是名称空间作用域，每个名称空间中的账号名称必须唯一，但不同名称空间可以重名

**创建复杂程度（相对于生产环境）：**

- 通常情况下，集群的用户账号可能会从企业数据库进行同步，其创建需要特殊权限， 并且涉及到复杂的业务流程。
- 服务账号创建有意做得更轻量，允许集群用户为了具体的任务创建服务账号以遵从权限最小化原则。
  - 服务账号的创建约束不多并且有名字空间域的名称，这种配置是很轻量的。



## Anonymous Account

- 匿名用户

- API 请求则或者与某普通用户相关联，或者与某服务账号相关联， 亦或者被视作[匿名请求](https://kubernetes.io/zh-cn/docs/reference/access-authn-authz/authentication/#anonymous-requests)。
- 这意味着集群内外的每个进程在向 API 服务器发起请求时都必须通过身份认证，否则会被视作匿名用户。
- 这里的进程可以是在某工作站上输入 `kubectl` 命令的操作人员，也可以是节点上的 `kubelet` 组件，还可以是控制面的成员。

























# 权限验证

[鉴权概述 | Kubernetes](https://kubernetes.io/zh-cn/docs/reference/access-authn-authz/authorization/)

- Authorization，Authz，验证用户是否对请求的资源具有操作权限。
- 成功通过身份验证后，授权插件会对该用户进行权限检查，以确保其拥有执行相应操作的权限。
  - 如果该用户未被授权插件定义对相关资源的操作权限，将被拒绝访问（新创建的用户默认是没有任何权限的）

- 一旦匹配则立刻将结果返回，不再继续向下匹配



## 常见授权插件

**RBAC**

- Role-based access control，基于角色的访问控制，**常用**；

**ABAC**

- Attribute-based access control，基于属性的访问控制（可以实现对某个字段的访问控制，如 spec 字段）；

**Webhook**

- 基于http回调机制通过外部REST服务检查确认用户授权的访问控制。

**Node**

- 基于Pod资源的目标调度节点来实现对kubelet的访问控制；







# 准入控制

[准入控制器参考 | Kubernetes](https://kubernetes.io/zh-cn/docs/reference/access-authn-authz/admission-controllers/)

- Admission Control
- 准入控制指的是**对写入的内容**进行效验、补充、纠正；
  - 效验指的是 对内容格式验证是否有语法错误，如有错误则提示具体错误的位置
  - 补充指的是 对未填写的可选字段进行补充，即使用默认值
  - 纠正指的是 对用户输入不规范的格式转为规范的格式（如将yaml格式 转为 json格式）
- 匹配成功后，还会继续向下匹配，直至全部匹配完成



## 常见准入控制器插件

**LimitRanger**

- 为Pod添加默认的计算资源需求和计算资源限制（cpu、mem、...）；以及存储资源需求和存储资源限制；
- 支持分别在容器和Pod级别进行限制

**ResourceQuota**

- 名称空间范围资源限制资源数量（pod、service、...），限制计算资源总量，存储资源总量；

**PodSecurityPolicy**

- 集群范围资源限制用户能够在Pod上可配置使用的securityContext。





# ---

# kubeconfig 

# kubeconfig 概述

- kubeconfig 是一种特定格式的认证信息文件，它可以将用户名、认证信息等组织一起，便于认证到 API Server上
- 使用 kubeconfig 文件，你可以组织集群、用户和命名空间。你还可以定义上下文，以便在集群和命名空间之间快速轻松地切换。
- kubeconfig 配置文件中支持保存m个集群的n个认证信息，并且 kubeconfig 文件的名称可以自定义

**kubeconfig 中可以包含 UserAccount，也可以包含 ServiceAccount；**

- 包含 UserAccount 的 kubeconfig 主要用于系统管理管使用 `kubectl` 命令来管理集群
  - PS：如果没有 kubeconfig，那么集群管理员在执行 `kubectl` 命令的时候还需再选项中指定证书等信息，这是一件非常麻烦的事情，而 kubeconfig 将这些认证相关信息进行整合，以减少操作步骤。

- 包含 ServiceAccount 的 kubeconfig 主要用于在集群中特定的应用中使用，例如 dashboard

**注意事项：**

- 因为 kubeconfig 中包含了很多的敏感信息，因此要保存好，以防泄漏。

**参考文档：**

- https://kubernetes.io/zh-cn/docs/tasks/access-application-cluster/configure-access-multiple-clusters/

- https://kubernetes.io/zh-cn/docs/concepts/configuration/organize-cluster-access-kubeconfig/



## 默认生成的 kubeconfig

如果使用kubeadm安装，将会生成以下 kubeconfig 文件

- master 节点

```bash
root@k8s-master-1:~# ls -l /etc/kubernetes/
total 36
-rw------- 1 root root 5638 Sep 13 00:01 admin.conf # master节点使用的最高管理权限的认证文件
# controller-manager、kubelet、scheduler 等服务使用的认证文件：
-rw------- 1 root root 5670 Sep 13 00:01 controller-manager.conf
-rw------- 1 root root 1982 Sep 13 00:02 kubelet.conf
drwxr-xr-x 2 root root 4096 Sep 13 00:01 manifests
drwxr-xr-x 3 root root 4096 Sep 13 00:01 pki
-rw------- 1 root root 5618 Sep 13 00:01 scheduler.conf
```

- node 节点

```bash
root@k8s-node-1:~# ls -l /etc/kubernetes/
total 12
-rw------- 1 root root 1951 Sep 13 00:47 kubelet.conf
drwxr-xr-x 2 root root 4096 Sep 12 22:47 manifests
drwxr-xr-x 2 root root 4096 Sep 13 00:47 pki
```









## kubeconfig 加载策略

kubeadm 安装的 master 节点默认从 /etc/kubernetes/admin.conf 加载

但 kubectl 控制端还可以从以下方式获取 kubeconfig

- **`$HOME/.kube/config` 文件**

- **`$KUBECONFIG` 环境变量**

  - ```sh
    # 定义一个kubeconfig文件
    export KUBECONFIG="/path/to/kubeconfig_filename"
    
    
    # 定义多个kubeconfig文件
    export KUBECONFIG="$HOME/.kube/config:/etc/kubernetes/users/jamesazheng/jamesazheng.conf:config-demo-2"
    ```

- **`kubectl --kubconfig=/path/to/kubeconfig_filename` 指定kubeconfig文件**

### 优先级

- --kubeconfig **>** $KUBECONFIG **>** $HOME/.kube/config









# Config Explain

- kubeconfig 由 clusters、users、contexts、current-context 三大部分组成；
- **clusters 定义了集群信息，users 定义了用户信息，contexts 将某个集群和某个用户相关联，current-context 定义了当前使用哪个 contexts，最后使用当前指向 context 中的信息来以某个用户的身份去访问某个集群。** 

```yaml
apiVersion: v1
kind: Config

clusters:
...

contexts:
...
current-context: dev-frontend # 当前使用的上下文


users:
...
```

## clusters

- clusters 中主要定义了 集群的CA、集群的地址、集群的名称

```yaml
clusters:
- cluster:
    certificate-authority: fake-ca-file
    server: https://1.2.3.4
  name: development
- cluster:
    insecure-skip-tls-verify: true
    server: https://5.6.7.8
  name: scratch
```

## contexts

- context 将集群、名称空间、用户进行分组，每个context对应一个环境信息

  - 名称空间为可选，不指定名称空间则表示针对整个集群的所有名称空间

```yaml
contexts:
- context:
    cluster: development
    namespace: frontend
    user: developer
  name: dev-frontend # 可以将context名称定义为 user@cluster 或 cluster@user，以实现见名知意
- context:
    cluster: development
    namespace: storage
    user: developer
  name: dev-storage
- context:
    cluster: scratch
    namespace: default
    user: experimenter
  name: exp-scratch
current-context: dev-frontend # 当前使用的上下文
kind: Config
preferences: {}
```

## users

- users 中主要定义了 用户名、用户的公钥和私钥 **或** 登陆账号和密码

```  yaml
users:
- name: developer
  user:
    client-certificate: fake-cert-file
    client-key: fake-key-seefile
- name: experimenter
  user:
    password: some-password
    username: exp
```

## 使用代理

- 你可以在 `kubeconfig` 文件中设置 `proxy-url` 来为 `kubectl` 使用代理，例如:

```yaml
apiVersion: v1
kind: Config

proxy-url: https://proxy.host:3128

clusters:
- cluster:
  name: development

users:
- name: developer

contexts:
- context:
  name: development
```





# kubectl config

https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#config

- `kubectl config` 命令可以实现创建、管理 kubeconfig

```bash
--kubeconfig="xxx"    # 指定kubeconfig路径

set-cluster xxx   # 指定要设置的集群名称

--server=https://1.2.3.4  # 指向apiserver 或 apiserver前负载均衡的IP或域名


--certificate-authority=fake-ca-file # 指向证书机构的 cert 文件路径（这里指的是集群的CA）

--insecure-skip-tls-verify # 设置为 true，则表示不会检查服务器证书的有效性。这样会导致你的 HTTPS 连接不安全。

set-credentials xxx  # 设置凭据

--client-certificate=fake-cert-file # 指定客户端证书
--client-key=fake-key-seefile # 指定客户端私钥

--username=exp # 指定用户名
--password=some-password # 指定登录的密码

--embed-certs=true # 在kubeconfig中嵌入群集项的证书，不添加则默认使用的是证书路径

--proxy-url='' # kubeconfig中群集项的代理url
```

## 添加 kubeconfig 中的信息



## 删除 kubeconfig 中的信息

```bash
# 要删除用户，可以运行
kubectl --kubeconfig=config-demo config unset users.<name>

# 要删除集群，可以运行
kubectl --kubeconfig=config-demo config unset clusters.<name>

# 要删除上下文，可以运行
kubectl --kubeconfig=config-demo config unset contexts.<name>
```





## 打印 kubeconfig 中的信息

- `kubectl config view`

  - ```sh
    --minify # 参数可以只打印当前上下文和其他相关信息
    --merge # 将kubeconfig重复的内容合并
    --flatten # 将证书等内容明文展示，而后还可以使用重定向导出
    ```

- 默认打印当前使用的 kubeconfig 的简要信息

```sh
# 默认打印当前使用的 kubeconfig 的简要信息，所谓简要信息是将证书信息以简略字标注，而不打印全部的证书信息
# kubectl config view
apiVersion: v1
clusters:
- cluster:
    certificate-authority-data: DATA+OMITTED
    server: https://10.0.0.100:6443
  name: kubernetes
contexts:
- context:
    cluster: kubernetes
    user: kubernetes-admin
  name: kubernetes-admin@kubernetes
current-context: kubernetes-admin@kubernetes
kind: Config
preferences: {}
users:
- name: kubernetes-admin
  user:
    client-certificate-data: REDACTED
    client-key-data: REDACTED


# 从指定的kubeconfig文件中打印：
# kubectl config --kubeconfig=config-exercise/config-demo view
...
```



## 打印当前上下文

- `kubectl config [--kubconfig=/path/to/kubeconfig_filename] get-context 上下文 `

```sh
# 打印当前默认的kubeconfig的当前上下文
# kubectl config get-contexts 
CURRENT   NAME                          CLUSTER      AUTHINFO           NAMESPACE
*         kubernetes-admin@kubernetes   kubernetes   kubernetes-admin   


# 打印指定的kubeconfig的当前上下文
# kubectl config --kubeconfig=/etc/kubernetes/scheduler.conf get-contexts 
CURRENT   NAME                               CLUSTER      AUTHINFO                NAMESPACE
*         system:kube-scheduler@kubernetes   kubernetes   system:kube-scheduler   
```



## 切换上下文

- `kubectl config [--kubconfig=/path/to/kubeconfig_filename] use-context 上下文 `

```sh
# 对当前默认的kubeconfig文件切换上下文


# 对指定kubeconfig文件切换上下文
# kubectl config --kubeconfig=config-demo use-context dev-frontend
```



## 范例：创建 UserAccount 的 kubeconfig

### 创建 UserAccount

- 使用 openssl 创建

```sh
# 创建存放目录，目录可自行选择
# mkdir /etc/kubernetes/users/jamesazheng -p
# cd /etc/kubernetes/users/jamesazheng


# 生成私钥
# openssl genrsa -out jamesazheng.key 2048


# 生成证书申请文件（用户名为jamesazheng，所属组为devops）
# openssl req -new -key jamesazheng.key -out jamesazheng.csr -subj "/CN=jamesazheng/O=devops"


# k8sCA签发证书
# openssl x509 -req -days 36500 -CA /etc/kubernetes/pki/ca.crt -CAkey /etc/kubernetes/pki/ca.key -CAcreateserial -in jamesazheng.csr -out jamesazheng.crt
Signature ok
subject=CN = jamesazheng, O = devops
Getting CA Private Key


# 验证证书
# openssl x509 -in jamesazheng.crt -text
Certificate:
    Data:
        Version: 1 (0x0)
        Serial Number:
            14:44:df:c2:0e:e2:49:39:6c:f2:d6:e4:45:32:8e:e3:6e:2d:ea:84
        Signature Algorithm: sha256WithRSAEncryption
        Issuer: CN = kubernetes
        Validity
            Not Before: Jan  4 06:35:19 2023 GMT
            Not After : Dec 11 06:35:19 2122 GMT
        Subject: CN = jamesazheng, O = devops
...


# pwd
/etc/kubernetes/users/jamesazheng
# ls
jamesazheng.crt  jamesazheng.csr  jamesazheng.key
```

### set-cluster

- 将集群信息导入到kubeconfig
- `--embed-certs` 嵌入证书，不指定次选项则只会在kubeconfig中添加证书文件路径

```sh
kubectl config set-cluster kubernetes --server=https://10.0.0.100:6443 \
--certificate-authority=/etc/kubernetes/pki/ca.crt \
--embed-certs=true \
--kubeconfig=/etc/kubernetes/users/jamesazheng/jamesazheng.conf 


# 验证
# kubectl config view --kubeconfig=jamesazheng.conf 
apiVersion: v1
clusters:
- cluster: # 设置的集群
    certificate-authority-data: DATA+OMITTED
    server: https://10.0.0.100:6443
  name: kubernetes
contexts: null
current-context: ""
kind: Config
preferences: {}
users: null
```

### set-credentials

- 将用户信息导入到kubeconfig

```sh
kubectl config \
set-credentials jamesazheng \
--client-certificate=/etc/kubernetes/users/jamesazheng/jamesazheng.crt \
--client-key=/etc/kubernetes/users/jamesazheng/jamesazheng.key \
--embed-certs=true \
--kubeconfig=/etc/kubernetes/users/jamesazheng/jamesazheng.conf


# 验证
# kubectl config view --kubeconfig=jamesazheng.conf 
apiVersion: v1
clusters:
- cluster:
    certificate-authority-data: DATA+OMITTED
    server: https://10.0.0.100:6443
  name: kubernetes
contexts: null
current-context: ""
kind: Config
preferences: {}
users:
- name: jamesazheng # 设置的用户
  user:
    client-certificate-data: REDACTED
    client-key-data: REDACTED
```

### set-context

- 设置上下文

```sh
kubectl config set-context kubernetes@jamesazheng \
--cluster=kubernetes \
--user=jamesazheng \
--kubeconfig=/etc/kubernetes/users/jamesazheng/jamesazheng.conf


# 验证
# kubectl config view --kubeconfig=jamesazheng.conf 
apiVersion: v1
clusters:
- cluster:
    certificate-authority-data: DATA+OMITTED
    server: https://10.0.0.100:6443
  name: kubernetes
contexts:
- context: # 设置的上下文
    cluster: kubernetes
    user: jamesazheng
  name: kubernetes@jamesazheng
current-context: ""
kind: Config
preferences: {}
users:
- name: jamesazheng
  user:
    client-certificate-data: REDACTED
    client-key-data: REDACTED
```

### use-context

- 指定使用的上下文

```sh
kubectl config use-context kubernetes@jamesazheng \
--kubeconfig=/etc/kubernetes/users/jamesazheng/jamesazheng.conf


# 验证
# kubectl config view --kubeconfig=jamesazheng.conf 
apiVersion: v1
clusters:
- cluster:
    certificate-authority-data: DATA+OMITTED
    server: https://10.0.0.100:6443
  name: kubernetes
contexts:
- context:
    cluster: kubernetes
    user: jamesazheng
  name: kubernetes@jamesazheng
current-context: kubernetes@jamesazheng # 定义使用的上下文
kind: Config
preferences: {}
users:
- name: jamesazheng
  user:
    client-certificate-data: REDACTED
    client-key-data: REDACTED
```

### 测试

- 测试kubeconfig，可以识别用户，但未被授权，还需使用RBAC等授权插件对该用户授权

```sh
# kubectl get nodes --kubeconfig=/etc/kubernetes/users/jamesazheng/jamesazheng.conf 
Error from server (Forbidden): nodes is forbidden: User "jamesazheng" cannot list resource "nodes" in API group "" at the cluster scope
```



## 创建 ServiceAccount 的 kubeconfig

- 在 dashboard Web UI 进行登录验证时一定要使用 ServiceAccount，而非 UserAccount，因为 Dashboard 是以 Pod 方式运行，而 Pod 与其它资源进行交互时需要 ServiceAccount
- 例如为 Dashboard 创建 ServiceAccount 的 kubeconfig，只需填入cluster、user、token、context、current-context即可。
- 参阅 k8s Dashboard 中的 登录 Dashboard 









## 范例：创建多集群的 kubeconfig

假设用户有两个集群；

**development 集群：**

- 用于正式开发工作，需要通过证书进行认证
- 前端开发者在名为 `frontend` 的名字空间下工作
- 存储开发者在名为 `storage` 的名字空间下工作

**scratch 集群：**

- 用于其它临时用途，需要通过用户名和密码进行认证
- 开发人员可能在默认名字空间下工作，也可能视情况创建附加的名字空间



### 概述文件

- `config-demo` 文件中含有描述两个集群、 两个用户和三个上下文的框架。
- 文件名可以自定义

```yaml
apiVersion: v1
kind: Config
preferences: {}

clusters:
- cluster:
  name: development
- cluster:
  name: scratch

users:
- name: developer
- name: experimenter

contexts:
- context:
  name: dev-frontend
- context:
  name: dev-storage
- context:
  name: exp-scratch
```

### 将集群详细信息添加到配置文件中

```sh
# kubectl config --kubeconfig=config-demo set-cluster development --server=https://1.2.3.4 --certificate-authority=fake-ca-file
Cluster "development" set.


# kubectl config --kubeconfig=config-demo set-cluster scratch --server=https://5.6.7.8 --insecure-skip-tls-verify
Cluster "scratch" set.
```

#### 验证

- 打开 `config-demo` 文件查看添加的详细信息。也可以使用 `config view` 命令进行查看：

  - ```sh
    kubectl config --kubeconfig=config-demo view
    ```

```yaml
apiVersion: v1
clusters:
- cluster:
    certificate-authority: fake-ca-file
    server: https://1.2.3.4
  name: development
- cluster:
    insecure-skip-tls-verify: true
    server: https://5.6.7.8
  name: scratch
contexts: null
current-context: ""
kind: Config
preferences: {}
users: null
```

### 将用户详细信息添加到配置文件中

```sh
# kubectl config --kubeconfig=config-demo set-credentials developer --client-certificate=fake-cert-file --client-key=fake-key-seefile
User "developer" set.


# kubectl config --kubeconfig=config-demo set-credentials experimenter --username=exp --password=some-password
User "experimenter" set.
```

#### 验证

```yaml
...
users: # users由null变成了列表，下面都是新生成的信息
- name: developer
  user:
    client-certificate: fake-cert-file
    client-key: fake-key-seefile
- name: experimenter
  user:
    password: some-password
    username: exp
```

### 将上下文详细信息添加到配置文件中

```sh
# kubectl config --kubeconfig=config-demo set-context dev-frontend --cluster=development --namespace=frontend --user=developer
Context "dev-frontend" created.


# kubectl config --kubeconfig=config-demo set-context dev-storage --cluster=development --namespace=storage --user=developer
Context "dev-storage" created.


# kubectl config --kubeconfig=config-demo set-context exp-scratch --cluster=scratch --namespace=default --user=experimenter
Context "exp-scratch" created.
```

#### 验证

```yaml
...
contexts: # 生成的上下文内容
- context:
    cluster: development
    namespace: frontend
    user: developer
  name: dev-frontend
- context:
    cluster: development
    namespace: storage
    user: developer
  name: dev-storage
- context:
    cluster: scratch
    namespace: default
    user: experimenter
  name: exp-scratch
current-context: ""
...
```



### 字段说明

- 其中的 `fake-ca-file`、`fake-cert-file` 和 `fake-key-file` 是证书文件路径名的占位符。 你需要更改这些值，使之对应你的环境中证书文件的实际路径名。
  - 注意：有时你可能希望在这里使用 BASE64 编码的数据而不是一个个独立的证书文件。 如果是这样，你需要在键名上添加 `-data` 后缀。例如， `certificate-authority-data`、`client-certificate-data` 和 `client-key-data`。
    - **通常都是将证书文件内容转换成 BASE64 编码，然后打入到 kubeconfig 文件中，但是要将证书引用选项的后面添加 -data**
- 每个上下文包含三部分（集群、用户和名字空间），例如， `dev-frontend` 上下文表明：使用 `developer` 用户的凭证来访问 `development` 集群的 `frontend` 名字空间。
  - **但是`developer`用户也要有对`development` 集群的 `frontend` 名字空间 具有RBAC授权 才能进行下去**
  - 不加名称空间则表示对整个集群的访问都使用对应用户的凭证

```yaml
apiVersion: v1
clusters: # 集群定义，对象列表格式
- cluster:
    certificate-authority: fake-ca-file # 集群CA路径
    server: https://1.2.3.4
  name: development # 
- cluster:
    insecure-skip-tls-verify: true
    server: https://5.6.7.8
  name: scratch
contexts: # 上下文定义，对象列表格式
- context:
    cluster: development
    namespace: frontend
    user: developer
  name: dev-frontend
- context:
    cluster: development
    namespace: storage
    user: developer
  name: dev-storage
- context:
    cluster: scratch
    namespace: default
    user: experimenter
  name: exp-scratch
current-context: "" # 当前使用的上下文
kind: Config
preferences: {}
users: # 用户定义，对象列表格式
- name: developer # 用户名
  user:
    client-certificate: fake-cert-file # 用户证书路径
    client-key: fake-key-seefile # 用户私钥路径
- name: experimenter # 用户名
  user:
    password: some-password # 登录用户密码
    username: exp # 登录用户名
```

### 切换(设置)上下文

```yaml
# 设置当前上下文：
# 现在当输入 kubectl 命令时，相应动作会应用于 dev-frontend 上下文中所列的集群和名字空间， 同时，命令会使用 dev-frontend 上下文中所列用户的凭证。
# kubectl config --kubeconfig=config-demo use-context dev-frontend
Switched to context "dev-frontend".




# 查看当前上下文信息
# kubectl config --kubeconfig=config-demo view --minify
apiVersion: v1
clusters:
- cluster:
    certificate-authority: fake-ca-file
    server: https://1.2.3.4
  name: development
contexts:
- context:
    cluster: development
    namespace: frontend
    user: developer
  name: dev-frontend
current-context: dev-frontend # 切换成功
kind: Config
preferences: {}
users:
- name: developer
  user:
    client-certificate: fake-cert-file
    client-key: fake-key-seefile
```

















# kubeadm kubeconfig

- 新版本方法，`kubeadm kubeconfig` 是用来管理 kubeconfig 文件的工具。

**参考文档：**

- https://kubernetes.io/zh-cn/docs/tasks/administer-cluster/kubeadm/kubeadm-certs/#kubeconfig-additional-users
- https://kubernetes.io/zh-cn/docs/reference/setup-tools/kubeadm/kubeadm-kubeconfig/

### 选项说明

- 此命令可用来为其他用户生成一个 kubeconfig 文件。

```bash
# kubeadm kubeconfig user --help

--client-name string # 用户名。如果生成客户端证书，则用作其 CN。

--config string # 指向 kubeadm 配置文件的路径

--org strings # 客户端证书的组织。如果创建客户端证书，此值将用作其 O 字段值。

--token string # 应该用此令牌做为 kubeconfig 的身份验证机制，而不是客户端证书

--validity-period duration # 客户证书的合法期限。所设置值为相对当前时间的偏移。默认8760h（一年）
```



### 查看现有集群设置

```yaml
# kubectl get cm kubeadm-config -n kube-system -o=jsonpath="{.data.ClusterConfiguration}"
apiServer:
  extraArgs:
    authorization-mode: Node,RBAC
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
kubernetesVersion: v1.24.2
networking:
  dnsDomain: kubecluster.local
  podSubnet: 10.10.0.0/16
  serviceSubnet: 192.168.1.0/20
scheduler: {}
```

### 生成 kubeadm 配置文件

- **注意：v1.24.2版本中此api无法指定cri(因为使用的是docker)，进而无法继续执行下面的 kubeadm kubeconfig user 命令**

```yaml
# vim kubeadm-azheng.yaml
apiVersion: kubeadm.k8s.io/v1beta3
kind: ClusterConfiguration
# kubernetes 将作为 kubeconfig 中集群名称
clusterName: "kubernetes"
# 10.0.0.100:6443 将作为集群 kubeconfig 文件中服务地址（IP 或者 DNS 名称）
controlPlaneEndpoint: "10.0.0.100:6443"
# 从本地挂载集群的 CA 秘钥和 CA 证书
certificatesDir: "/etc/kubernetes/pki"
```



### 为普通用户创建

#### 范例一

- 为在 `appdevs` 组的 `johndoe` 用户创建一个有效期为 24 小时的 kubeconfig 文件：

```bash
kubeadm kubeconfig user --config kubeadm-johndoe.yaml --org appdevs --client-name johndoe --validity-period 24h
```

#### 范例二

- 111

```bash
kubeadm kubeconfig --config kubeadm.yaml user --client-name azheng --validity-period 24h
```



### 为管理员创建

#### 范例一

- 以下示例将为管理员创建一个有效期有一周的 kubeconfig 文件：

```bash
kubeadm kubeconfig user --config example.yaml --client-name admin --validity-period 168h
```









# ---

# User & Group

# 创建 UserAccount

- 普通用户证书

参考文档：

- https://kubernetes.io/zh-cn/docs/reference/access-authn-authz/certificate-signing-requests/#normal-user
  - https://v1-23.docs.kubernetes.io/zh/docs/reference/access-authn-authz/certificate-signing-requests/#normal-user
- https://kubernetes.io/zh-cn/docs/reference/access-authn-authz/authentication/#users-in-kubernetes

## 前言

- 普通用户无法通过 Api Server 来进行创建，但是可以使用**集群中的CA** 对使用第三方证书管理工具生成的证书进行签发 从而生成普通用户所需的证书
  - 即普通用户必须拥有 Kubernetes 集群签发的证书， 然后将该证书提供给 Kubernetes API。
- 接下来，基于角色访问控制（RBAC）子系统会确定用户是否有权针对某资源执行特定的操作。

**Kubernetes 使用证书Subject中的以下字段作为验证条件：**

- CommonName（CN）
  - 被k8s当用户名使用
  - 例如："/CN=bob" 来确定用户名 
- Orgnization（O）
  - 被k8s当组名使用
  - 标明用户的组成员信息。 要包含用户的多个组成员信息，可以在证书种包含多个 organization 字段。

- 范例：

  - 例如，使用 `openssl` 命令行工具生成一个证书签名请求：


  - 此命令将使用用户名 `jbeda` 生成一个证书签名请求（CSR），且该用户属于 "app" 和 "app2" 两个用户组。

  - 参阅[管理证书](https://kubernetes.io/zh-cn/docs/tasks/administer-cluster/certificates/)了解如何生成客户端证书。


```sh
openssl req -new -key jbeda.pem -out jbeda-csr.pem -subj "/CN=jbeda/O=app1/O=app2"
```

- **下面使用的是官方文档中提供的方法：**

## 创建私钥文件 key

```sh
openssl genrsa -out myuser.key 2048

# ls -l
total 4
-rw------- 1 root root 1679 Sep 28 21:45 myuser.key
```

## 创建证书签名请求文件 CSR

- CN=用户名
- O=组名

```sh
openssl req -new -key myuser.key -out myuser.csr -subj "/CN=jbeda/O=developers"

# ls -l
total 8
-rw-r--r-- 1 root root  915 Sep 28 21:54 myuser.csr # 证书申请文件
-rw------- 1 root root 1679 Sep 28 21:45 myuser.key
```



## 创建 CertificateSigningRequest

创建一个 CertificateSigningRequest，并通过 kubectl 将其提交到 Kubernetes 集群。

下面是生成 CertificateSigningRequest 的脚本。

- **myuser-csr.yaml**

```yaml
apiVersion: certificates.k8s.io/v1
kind: CertificateSigningRequest
metadata:
  name: myuser
spec:
  request: LS0tLS1CRUdJTiBDRVJUSUZJQ0FURSBSRVFVRVNULS0tLS0KTUlJQ2FqQ0NBVklDQVFBd0pURU9NQXdHQTFVRUF3d0ZhbUpsWkdFeEV6QVJCZ05WQkFvTUNtUmxkbVZzYjNCbApjbk13Z2dFaU1BMEdDU3FHU0liM0RRRUJBUVVBQTRJQkR3QXdnZ0VLQW9JQkFRQ25PaFNHVlptTDRMVzRIR00xCk5WT2NCWW1KSWRoSGs1SXdqaEN3YTBVWDhIVWlid3BmRDBRQk4yeXU1ZTViSUoxN3dSblpPSUNVN3VnV2lGZkwKZ214M3E4SlZiK0tFb2k2ZTRsNFBncWJhZnhycXRGY2EzTWVxbTNBampMeVMwaUR3ZGZLTzhPYUJieDZEcVBuUQpFZTNwWk9kRVBCZWNFMmJXcnVveTNoT0hBdG5FbkQ4TmRhTHQwY3p0R05DRUg1RTJEeFd2a2Z0OGFIdmNiTHpKCndlU09JVTRDVVFrUUFpTjBSd28xQTdqYjhnRXZkay9SeHZxeEsxcHFHYlo4bHFkaXU4WENDU0gwT05PekVvZzAKTWhaZTFZcGpTL2s5bURmalU5SmR2Vkx1QWJJTUVTdEp6NTVoY3h5QURYY1dZSWlqU0tBWjdsdzJSRjdHbGQxZQpTOER2QWdNQkFBR2dBREFOQmdrcWhraUc5dzBCQVFzRkFBT0NBUUVBbkduVDhBRWZVWXMxNCtPMlBrN1h4SDBVCnRlakhBdzlJLzdTU3d2dllqOEhZR3E3M2ZqSkF2VlN3OUZ3cHozaHkycXYvOGV3bEI3V1FCM0lJbnZMeks4Y08KN21peDhNbCtCMHFtR1J0ODgzOUxOS0M2cGduODh6ZlFPQWJEZFhkaW05R0hFOEVTeVUzMEUxRTlBTWNPRGNWRQpDK3I2dmkrOGpuWkxWVUN4NWo3b3JLajFudXRlUEZjbG13dXRUWC9VWnZuT09OaDdGMUNZcDc0V3kySGdQMXpXCnEvV1N1UjNKNDFuQ21BdnVzQm5sMWxpckRxdXprYkc3WFdwR2xhYTdVejV2eVBQK1Y0UnBRS1JEcGsvT1RHSVQKejFUMzU0SThNSkJvTHJoMkdabXNad3BDYUtlVW9JWkNrUE03dkxFTWdPQ2g2ZXRiYmhnS0hiTjZuZXJKaHc9PQotLS0tLUVORCBDRVJUSUZJQ0FURSBSRVFVRVNULS0tLS0K
  signerName: kubernetes.io/kube-apiserver-client
  expirationSeconds: 86400  # one day
  usages:
  - client auth
```

### 字段说明

- `usage` 字段必须是 '`client auth`'
- `expirationSeconds` 可以设置为更长（例如 `864000` 是十天）或者更短（例如 `3600` 是一个小时）
- `request` 字段是 CSR 文件内容的 base64 编码值。 要得到该值，可以执行命令 `cat myuser.csr | base64 | tr -d "\n" ; echo`。

### 执行脚本

```sh
# kubectl apply -f myuser-csr.yaml 
certificatesigningrequest.certificates.k8s.io/myuser created
```



## 批准证书签名请求

使用 kubectl 创建 CSR 并批准。

- **获取 CSR 列表：**

```sh
# kubectl get csr
NAME     AGE   SIGNERNAME                            REQUESTOR          REQUESTEDDURATION   CONDITION
myuser   48s   kubernetes.io/kube-apiserver-client   kubernetes-admin   24h                 Pending

# REQUESTEDDURATION：证书的有效期
# CONDITION：Pending 表示待签发
```

- **批准 CSR：**

```sh
# kubectl certificate approve myuser
certificatesigningrequest.certificates.k8s.io/myuser approved

---

# 验证
# kubectl get csr
NAME     AGE     SIGNERNAME                            REQUESTOR          REQUESTEDDURATION   CONDITION
myuser   3m44s   kubernetes.io/kube-apiserver-client   kubernetes-admin   24h                 Approved,Issued
# CONDITION：Approved,Issued 表示已经签发
```



## 获取证书

- **从 CSR 取得证书：**

```yaml
# kubectl get csr/myuser -o yaml
kind: CertificateSigningRequest
...
status:
  certificate: LS0tLS1CRUd... # 证书的内容使用 base64 编码，存放在 status.certificate字段
...
```

- **导出颁发的证书**

```sh
# kubectl get csr myuser -o jsonpath='{.status.certificate}'| base64 -d > myuser.crt


# ls -l
total 16
-rw-r--r-- 1 root root 1115 Sep 28 22:18 myuser.crt # 证书文件
-rw-r--r-- 1 root root  915 Sep 28 21:54 myuser.csr
-rw-r--r-- 1 root root 1444 Sep 28 22:09 myuser-csr.yaml
-rw------- 1 root root 1679 Sep 28 21:45 myuser.key
```



## 添加到 kubeconfig

- **添加新的凭据：**

```sh
# kubectl config set-credentials myuser --client-key=myuser.key --client-certificate=myuser.crt --embed-certs=true
User "myuser" set.
```

- **添加上下文：**

```sh
# kubectl config set-context myuser --cluster=kubernetes --user=myuser
Context "myuser" created.
```

### 测试方法一

- 临时切换用户测试

```sh
# 默认用户有权限
# kubectl get namespaces/default
NAME      STATUS   AGE
default   Active   15d


# 临时切换到新创建的用户无权限
# kubectl get namespaces/default --context='myuser'
Error from server (Forbidden): namespaces "default" is forbidden: User "jbeda" cannot get resource "namespaces" in API group "" in the namespace "default"
```

### 测试方法二

- 切换用户测试

```sh
# 上下文切换为 myuser：
# kubectl config use-context myuser
Switched to context "myuser".


# 因为没有相应的权限，所以访问被拒绝了，但myuser用户已然可被API Server正确识别；
# kubectl get pod
Error from server (Forbidden): pods is forbidden: User "jbeda" cannot list resource "pods" in API group "" in the namespace "default"


# 切换为原有的上下文用户：
# kubectl config use-context kubernetes-admin@kubernetes
Switched to context "kubernetes-admin@kubernetes".
```

### 说明

- 以上，我们通过创建自定义的数字证书，实现了将mason用户认证到API Server，并将该用户的身份凭据保存于至kubeconfig文件中。



## 保存到单独的 kubeconfig 文件中





## 创建角色和角色绑定

创建了证书之后，为了让这个用户能访问 Kubernetes 集群资源，现在就要创建 Role 和 RoleBinding 了。

也可以使用 ClusterRole 和 ClusterRoleBinding ？

### Role

按需创建权限

`kubectl create role developer --verb=create --verb=get --verb=list --verb=update --verb=delete --resource=pods`

- 

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: project-1 # 针对哪个 namespace 进行访问控制
  name: pod-reader # 定义该Role的name
rules: # 定义具体的角色规则
- apiGroups: ["apps"] # 针对哪些API群组，可以定义多个。来自 kubectl api-resources 中的 APIVERSION 列，默认[""]表示核心API群组，* 代表所有API群组
  resources: ["deployments", "pod/log"] # 针对哪些资源，可以定义多个。来自 kubectl api-resources 中的 NAME 列，"pod/log"表示只能对pod下的日志，* 代表所有
  verbs: ["get", "watch", "list"] # 可以执行的动作，参阅上面的请求动词，* 代表所有
```

- 创建 Role 

### RoleBinding





# 其他创建 UserAccount 的方法

- 部分步骤非官方

```sh
第一步，以客户端的身份，生成目标用户账号mason的私钥及证书签署请求，保存于用户家目录下的.certs目录中。
1)	生成私钥文件，注意其权限应该为600以阻止其他用户读取；
~$ mkdir $HOME/.certs
~$ (umask 077; openssl genrsa -out $HOME/.certs/mason.key 2048)
2)	创建证书签署请求，-subj选项中CN的值将被API Server识别为用户名，O的值将被识别为用户组；
~$ openssl req -new -key $HOME/.certs/mason.key \
-out $HOME/.certs/mason.csr \
-subj "/CN=mason/O=developers"



第二步，以kubernetes-ca的身份签署ikubernetes的证书请求，这里直接读取相关的CSR文件，并将签署后的证书仍然保存于当前系统用户家目录下的.certs中。
1)	基于kubernetes-ca签署证书，并为其设置合理的生效时长，例如365天；
~$ sudo openssl x509 -req -days 365 -CA /etc/kubernetes/pki/ca.crt \
-CAkey /etc/kubernetes/pki/ca.key -CAcreateserial \
-in $HOME/.certs/mason.csr -out $HOME/.certs/mason.crt
Signature ok
subject=CN = mason, O = developers
Getting CA Private Key
2)	必要时，还可以验证生成的数字证书的相关信息（可选）。
~$ openssl x509 -in $HOME/.certs/mason.crt -text -noout



第三步，将ikubernetes的身份凭据生成kubeconfig配置，这次选择将其保存于kubectl默认搜索路径指向的$HOME/.kube/config文件中。另外，因指向当前集群的配置项已经存在，它是位于clusters配置段中kubernetes，这里直接复用该集群定义。
1)	根据X509证书及私钥创建身份凭据，列表项名称同目标用户名；
~$ kubectl config set-credentials mason --embed-certs=true \
--client-certificate=$HOME/.certs/mason.crt \
--client-key=$HOME/.certs/mason.key          
User "mason" set.
2)	配置context，以mason的身份凭据访问已定义的kubernetes集群，该context的名称为mason@kubernetes；
~$ kubectl config set-context mason@kubernetes --cluster=kubernetes --user=mason
Context "mason@kubernetes" created.
3)	将当前上下文切换为mason@kubernetes，或直接在kubectl命令上使用“--context= 'mason@kubernetes'”临时以完成该用户的认证测试，下面的命令选择了以第二种方式进行，错误信息是提示权限错误，但mason用户已然可被API Server正确识别；
~$ kubectl get namespaces/default --context='mason@kubernetes'
Error from server (Forbidden): namespaces "default" is forbidden: User "mason" cannot get resource "namespaces" in API group "" in the namespace "default"
以上，我们通过创建自定义的数字证书，实现了将mason用户认证到API Server，并将该用户的身份凭据保存于至kubeconfig文件中。
```

## 其他工具生成证书

- 可以使用 easyrsa、openssl、cfssl 等工具以手工方式生成证书。
- 参考文档：
  - https://kubernetes.io/zh-cn/docs/tasks/administer-cluster/certificates/

### cfssl 

- 下面示例中使用 cfssl 工具让 k8s 根 ca 签发普通用户的证书

#### 安装 cfssl

```bash
apt install golang-cfssl
```

#### 创建 ca 配置文件

```bash
# vim /data/kubeconfig/ca-config.json
{
  "signing": {
    "default": {
      "expiry": "8760h"
    },
    "profiles": {
      "kubernetes": {
        "usages": [
          "signing",
          "key encipherment",
          "server auth",
          "client auth"
        ],
        "expiry": "8760h"
      }
    }
  }
}
```

#### 创建 csr 文件

- 可以使用 `cfssl print-defaults csr > /data/kubeconfig/azheng-csr.json` 来生成模板

```bash
# vim /data/kubeconfig/azheng-csr.json
{
    "CN": "azheng.vip",
    "hosts": [],
    "key": {
        "algo": "rsa",
        "size": 2048
    },
    "names": [
        {
            "C": "CN",
            "ST": "LiaoNing",
            "L": "HuLuDao",
            "O": "AzhengKeJi",
            "OU": "System"
        }
    ]
}
```

#### 签发证书

```bash
# 执行
cfssl gencert \
-ca=/etc/kubernetes/pki/ca.crt \
-ca-key=/etc/kubernetes/pki/ca.key \
-config=/data/kubeconfig/ca-config.json \
-profile=kubernetes /data/kubeconfig/azheng-csr.json | cfssljson -bare azheng

# 执行后输出
2022/07/24 00:49:57 [INFO] generate received request
2022/07/24 00:49:57 [INFO] received CSR
2022/07/24 00:49:57 [INFO] generating key: rsa-2048
2022/07/24 00:49:58 [INFO] encoded CSR
2022/07/24 00:49:58 [INFO] signed certificate with serial number 291917182609964931137890493347978514275611951492
2022/07/24 00:49:58 [WARNING] This certificate lacks a "hosts" field. This makes it unsuitable for
websites. For more information see the Baseline Requirements for the Issuance and Management
of Publicly-Trusted Certificates, v.1.1.6, from the CA/Browser Forum (https://cabforum.org);
specifically, section 10.2.3 ("Information Requirements").

```

#### 查看生成的文件

```bash
# ls /data/kubeconfig/ | tr ' ' '\n'
azheng.csr # 生成的证书申请文件（通过 azheng-csr.json 生成的）
azheng-csr.json
azheng-key.pem # 证书私钥
azheng.pem # 证书
ca-config.json
```



# 驳回(吊销) UserAccount

参考文档：https://v1-23.docs.kubernetes.io/zh/docs/reference/access-authn-authz/certificate-signing-requests/#approval-rejection





# Group

在 Kubernetes 中，Group 是一组用户或 ServiceAccount 的集合。它可以用于在授权过程中表示一组用户或 ServiceAccount 具有相同的权限。

例如，可以为一个 Group 创建一个 ClusterRoleBinding，该 Group 中的所有用户或 ServiceAccount 都将获得绑定的 ClusterRole 的权限。

要创建一个 Group，可以将用户或 ServiceAccount 添加到 Kubernetes 中的一个 Namespace 或 Cluster 中，然后使用 RBAC 绑定（RoleBinding 或 ClusterRoleBinding）将该 Group 与 Role 或 ClusterRole 相关联。这样，该 Group 中的所有用户或 ServiceAccount 都可以继承 Role 或 ClusterRole 的权限。





# 查看用户和用户组

在 Kubernetes 中，可以使用 `kubectl` 命令行工具来查看用户和用户组。

要查看当前用户，请使用以下命令：

```
kubectl config view --minify | grep username
```

该命令将输出当前用户的用户名。如果使用的是 ServiceAccount 进行身份验证，则用户名将具有 `system:serviceaccount` 前缀，其格式为 `system:serviceaccount:<namespace>:<service-account>`。

要查看当前用户所属的用户组，请使用以下命令：

```
kubectl config view --minify | grep group
```

该命令将输出当前用户所属的用户组列表。如果使用的是 ServiceAccount 进行身份验证，则用户组列表将包括 `system:serviceaccounts` 和 `system:serviceaccounts:<namespace>`。

除了查看当前用户和用户组之外，还可以使用 `kubectl` 命令行工具查看特定 ServiceAccount 的身份验证令牌和角色绑定。以下是一些示例命令：

要查看特定 ServiceAccount 的身份验证令牌，请使用以下命令：

```
kubectl get secret <service-account-token-name> -o jsonpath='{.data.token}' | base64 --decode
```

其中，`<service-account-token-name>` 是 ServiceAccount 的身份验证令牌的名称。

要查看特定 ServiceAccount 的角色绑定，请使用以下命令：

```
kubectl get rolebinding <role-binding-name> -n <namespace>
```

其中，`<role-binding-name>` 是角色绑定的名称，`<namespace>` 是 ServiceAccount 所在的名称空间。

这些命令可以帮助您了解当前用户和用户组的身份验证信息，以及 ServiceAccount 的身份验证令牌和角色绑定。



# 查看k8s中证书的有效期

在 Kubernetes 中，证书的有效期可以通过以下方式之一来查看：

1. **kubectl 命令行工具**：
   你可以使用 `kubectl` 命令来获取证书的信息。以下是一个获取证书信息的示例命令：
   ```bash
   kubectl get secrets <secret-name> -o jsonpath='{.data.tls\.crt}' | base64 --decode | openssl x509 -noout -enddate
   ```
   这将输出证书的结束日期。

2. **kubelet API**：
   你可以通过 kubelet API 获取证书信息。Kubelet 暴露了 `/certificates` 终端，你可以使用以下 curl 命令来获取证书信息：
   ```bash
   curl -k https://<kubelet-hostname>:10250/certificates/kubelet | openssl x509 -noout -enddate
   ```
   请注意，这需要对 kubelet 进行相应的访问权限。

3. **直接查看证书文件**：
   如果你可以访问 Kubernetes 证书文件所在的位置，你可以直接使用 OpenSSL 来查看证书的结束日期：
   ```bash
   openssl x509 -noout -enddate -in /path/to/certificate.crt
   ```
   这将输出证书的结束日期。

在所有这些方法中，你需要替换 `<secret-name>`、`<kubelet-hostname>` 和 `/path/to/certificate.crt` 分别为相应的证书名称、kubelet 主机名和证书文件路径。

# ---

# K8s Volume

# Volume Base

- **同一 Pod 内共享数据需借助存储卷来完成**
- kubelet 也负责管理存储卷
- Volume 隶属于 Pod，而非容器； pause容器支撑

**共享式存储设备数据写入机制**

- 多路并行读写
- 多路只读
- 单路读写

**Pod 使用 Volume 步骤**

1. 在Pod上定义存储卷，并关联至目标存储服务上；
2. 在需要用到存储卷的容器上，挂载其所属的Pod的存储卷； 

**参考文档：**

- https://kubernetes.io/zh-cn/docs/concepts/storage/



# Volume Type

- Kubernetes 的存储插件分为树内（in-tree）和树外（out-of-tree）两种。
- 简单说 in-tree 是指在 Kubernetes 主仓库维护的插件，而 out-of-tree 是指独立维护的插件。
- 在之前，Kubernetes 有很多插件都是 in-tree 的，这样会使得 Kubernetes 代码维护困难，并且造成 Kubernetes 主库的臃肿，所以三年前 storage SIG 就开始从 Kubernetes 核心中迁移 in-tree 的存储插件到外面，变为 out-of-tree 存储插件。
- V1.25 版本中，很多 in-tree 的存储插件都将被删除，包括 GlusterFS, flocker, quobyte, storageos 等，具体列表请参考 deprecations-and-removals-for-storage-drivers [1] 。
- 举例而言，从 1.25 版本开始，用户在使用以下 yaml 对接 GFS 存储时，将得到警告信息“this feature will be removed soon after in a subsequent release”。



## In-Tree

In-Tree 数内型存储（k8s原生支持的），`pod.spec.volumes` 下所支持的都属于

- **Host级别：**
  - hostPath
- **网络级别：**
  - NFS、GlusterFS、rbd（块设备）、CephFS（文件系统）、云厂商提供的存储...
- **临时存储：**
  - emptyDir
- **特殊类别：**
  - ConfigMap、Secret、downwardAPI



## Out-of-Tree

Out-of-Tree  数外型存储（k8s原生不支持的，需额外部署一些Pod 然后再**基于CSI实现**）

由管理员通过flexVolume或CSI接入的第三方存储卷类型； 

**Longhorn**

- 部署Longhorn，需要提前解决的依赖关系：
    在每个节点上部署iscsi的适配器：CentOS 7上的程序包名为iscsi-initiator-utils
- https://longhorn.io/

**Rancher**

- ...

**（SUSE）**

- ...

 



# PV / PVC

- 将存储消费，存储创建的职能分离开来


- 用户只要按需调用 PVC 而不必关心底层存储设施，而底层存储可以交由专门的管理员来进行管理；
- 这样的好处是用户无需关注底层存储具体如何调用与实现，只要按需调用PVC即可。

**PV / PVC 工作流程概述**

- 容器中的数据 **-->** PVC **-->** PV（或 Storage Class） **-->** 实际的存储（如：NFS、NAS、ceph等)
  - Admin：创建好PV；
  - User: 按需创建PVC，而后创建Pod，在Pod调用persistentVolumeClaim类型的存储卷插件调用同一个名称空间中的PVC资源；





# Volume 注意事项

- 如果宿主机或其它存储设备上目录事先为空 或未被创建，则在存储介质在被挂载时 容器中的目录以及内容会被复制过来并进行持久保存；在容器下次重建时挂载会读取宿主机或其它存储设备上目录的内容
- 如果宿主机或其它存储设备上目录中存在数据，则容器在挂载时会以存储设备中的内容和容器中的内容并存的方式进行呈现
- **如果nfs端目录实现存有数据，那么新生成的 Pod 会直接采用 nfs 目录共享的内容 而不会生成初始化的文件，所以在初始化过程中要保证 nfs 共享的目录没有文件存在 尤其是不易发现的隐藏文件**



# Volume Explan

```yaml
spec:
  volumes:
  - name <string>  # 存储卷名称标识，仅可使用DNS标签格式的字符，在当前Pod中必须唯一
    VOL_TYPE <Object>  # 存储卷插件及具体的目标存储供给方的相关配置
  containers:
  - name: …
    image: …
    volumeMounts:
    - name <string>  # 要挂载的存储卷的名称，必须匹配存储卷列表中某项的定义
      mountPath <string> # 容器文件系统上的挂载点路径
      readOnly <boolean>  # 是否挂载为只读模式，默认为“否”
      subPath <string>     # 挂载存储卷上的一个子目录至指定的挂载点
      subPathExpr <string>  # 挂载由指定的模式匹配到的存储卷的文件或目录至挂载点
```













# NFS 共享存储

- 参考文档：
  - https://github.com/kubernetes/examples/tree/master/staging/volumes/nfs
  - https://kubernetes.io/zh-cn/docs/concepts/storage/storage-classes/#nfs

- 常用
- NFS（网络文件系统）和 容器内的文件或目录做挂载关系
- **数据不会随着容器的删除而删除**
- NFS 卷可以被预先填充数据，并且这些数据可以在 Pod 之间共享。
- NFS 卷可以被多个写入者同时挂载
- Kubernetes 不包含内部 NFS 驱动。你需要使用外部驱动为 NFS 创建 StorageClass
- 参考链接：
  - [NFS Ganesha 服务器和外部驱动](https://github.com/kubernetes-sigs/nfs-ganesha-server-and-external-provisioner)
  - [NFS subdir 外部驱动](https://github.com/kubernetes-sigs/nfs-subdir-external-provisioner)



## 通过 NFS 实现共享存储示例

- **nfs服务端安装nfs，并准备挂载所需目录**

```bash
#安装nfs
#centos
[root@nfs ~]# yum -y install nfs-utils
apt -y install nfs-kernel-server
#Ubuntu
root@nfs:~# apt -y install nfs-kernel-server


#准备挂载目录
[root@nfs ~]# mkdir -p /data/k8s-data/nginx/app{1..2}
[root@nfs ~]# echo 'nfs app1 page' > /data/k8s-data/nginx/app1/index.html
[root@nfs ~]# echo 'nfs app2 page' > /data/k8s-data/nginx/app2/index.html
[root@nfs ~]# tree /data/
/data/
└── k8s-data
    └── nginx
        ├── app1
        │   └── index.html
        └── app2
            └── index.html


#定义挂载选项
#注意：生产中最好要严格控制可以挂载的主机 10.0.0.0/24
[root@nfs ~]# vim /etc/exports
/data/k8s-data/nginx/app1/ *(rw,no_root_squash)
/data/k8s-data/nginx/app2/ *(rw,no_root_squash)

#加载nfs配置文件
[root@nfs ~]# exportfs -r
```

- **k8s-node节点部署nfs，并进行挂载测试**

```bash
#所有需要通过nfs进行挂载的node节点都需要安装
root@k8s-work-1:~# apt -y install nfs-kernel-server

#查看远程挂载映射
root@k8s-work-1:~# showmount -e 10.0.0.8
Export list for 10.0.0.8:
/data/k8s-data/nginx/app2 *
/data/k8s-data/nginx/app1 *


#临时测试挂载（远程nfs目录中的内容在本机显示，而本机原有的内容会被暂时遮盖）
root@k8s-work-1:~# mount 10.0.0.8:/data/ /data/
root@k8s-work-1:~# tree /data/
/data/
└── k8s-data
    └── nginx
        ├── app1
        │   └── index.html
        └── app2
            └── index.html

#注意：虽然可以直接挂载父目录，但是：
#在nfs节点的非挂载点目录添加文件后 其他主机是看不到的
[root@nfs ~]# cp /etc/passwd /data/k8s-data/
root@k8s-work-1:~# tree /data/
/data/
└── k8s-data
    └── nginx
        ├── app1
        │   └── index.html
        └── app2
            └── index.html
#只有app1、app2这两个目录的内容修改才能修改
root@k8s-work-1:~# cp /etc/fstab /data/k8s-data/
cp: cannot create regular file '/data/k8s-data/fstab': Read-only file system


#测试完毕 取消挂载
root@k8s-work-1:~# umount /data/
```

- **准备 yaml 文件**

```yml
# vim nfs-nginx.yaml
kind: Deployment
apiVersion: apps/v1
metadata:
  name: nginx-deployment
  labels:
    app: nginx-deployment-label
  namespace: default
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
            cpu: 100m
            memory: 128Mi   
          limits:   
            cpu: 1   
            memory: 256Mi
        volumeMounts:
        - mountPath: /usr/share/nginx/html/app1  #容器上的路径
          name: nfs-app1 #引用
        - mountPath: /usr/share/nginx/html/app2  #容器上的路径
          name: nfs-app2 #引用
      volumes:
      - name: nfs-app1 #定义
        nfs:
          server: 10.0.0.8 #nfs的ip地址
          path: /data/k8s-data/nginx/app1 #nfs上的路径
      - name: nfs-app2 #定义
        nfs:
          server: 10.0.0.8 #nfs的ip地址
          path: /data/k8s-data/nginx/app2 #nfs上的路径

---

kind: Service
apiVersion: v1
metadata:
  labels:
    app: nginx-service
  name: nginx-service
  namespace: default
spec:
  type: NodePort
  ports:
  - name: http
    port: 80
    protocol: TCP
    targetPort: 80
    nodePort: 30001
  selector:
    app: nginx-deployment-label
```

- **测试**

```bash
#测试
# curl http://10.0.0.101:30001/app2/
nfs app2 page
# curl http://10.0.0.101:30001/app1/
nfs app1 page

#nfs节点更新页面
[root@nfs ~]# echo 'nfs app1 NEW page' > /data/k8s-data/nginx/app1/index.html
[root@nfs ~]# echo 'nfs app2 NEW page' > /data/k8s-data/nginx/app2/index.html

#再次测试
# curl http://10.0.0.101:30001/app1/
nfs app1 NEW page
# curl http://10.0.0.101:30001/app2/
nfs app2 NEW page
```







# Pod 多容器共享存储

**一个pod中的多个容器间数据共享只能使用持久卷吗？临时卷可以吗**

在Kubernetes中，Pod是一个包含一个或多个容器的最小部署单元。不同容器之间共享数据的最常用方法是通过持久卷（Persistent Volume）来实现。使用持久卷，可以将数据保存到独立于容器的存储介质中，这些数据可以在容器重启后保持不变。

不过，对于某些场景，也可以考虑使用临时卷（EmptyDir）来实现容器之间的数据共享。EmptyDir是一种空目录卷，可以被Pod中的多个容器共享，当Pod被删除时，EmptyDir中的数据也会被删除。

使用持久卷和临时卷的选择取决于具体的应用场景和需求。如果数据需要在容器重启后仍然存在，则应使用持久卷。如果数据只需要在容器内部共享，且不需要在容器重启后仍然存在，则可以考虑使用临时卷。



**如何使用临时卷实现一个pod中的多个容器间数据共享**

- 详参emptyDir笔记

使用临时卷（EmptyDir）实现一个Pod中多个容器间的数据共享可以通过以下步骤实现：

- 在Pod的spec中定义一个EmptyDir卷，并命名为共享卷，例如：

```yaml
volumes:
  - name: shared-data
    emptyDir: {}
```

- 在Pod的spec中定义需要共享数据的容器，并将共享卷挂载到这些容器中，例如：

```yaml
containers:
  - name: container1
    image: image1
    volumeMounts:
      - name: shared-data
        mountPath: /data
  - name: container2
    image: image2
    volumeMounts:
      - name: shared-data
        mountPath: /data
```

在这个例子中，共享卷被挂载到了两个容器的`/data`目录下。

- 在容器中读写共享卷中的数据即可实现数据共享。容器可以使用标准的文件系统API来访问挂载的目录。

需要注意的是，当Pod被删除时，EmptyDir中的数据也会被删除。因此，如果需要保留数据，应该考虑使用持久卷。

# nfs example

- Pod 中的容器使用 NFS 作为存储媒介

## 先决条件

### work 节点配置

- work 节点创建用户非必选项，因为此处仅为在宿主机做挂载测试；
- 安装 nfs-utils 工具包为必选项，因为依赖其程序驱动事先挂载；

```sh
# 每个 work 节点创建相同的用户，作为连接到 ceph 时使用的用户。
# useradd -u 1688 -s /bin/bash -m redis
# id 1688
uid=1688(redis) gid=1688(redis) groups=1688(redis)


# 安装nfs-utils，否则将无法挂载
...
```

### nfs 节点配置

```sh
# nfs 节点同样创建相同的用户
# useradd -u 1688 -s /bin/bash -m redis
# id 1688
uid=1688(redis) gid=1688(redis) groups=1688(redis)


# 创建一个共享的目录
# mkdir -p /data/nfs/redis
# chown redis.redis /data/nfs/redis/

# 配置共享，*后面不填内容表示以只读方式共享，读写需要在*后面添加(rw)
# vim /etc/exports
/data/nfs/redis 10.0.0.0/24(rw)


# 让配置生效
# exportfs -r

# 查看配置，即本机被共享出来的路径
# exportfs -v
/data/nfs/redis
        10.0.0.0/24(sync,wdelay,hide,no_subtree_check,sec=sys,rw,root_squash,no_all_squash)
```

**验证：**

- ```sh
  # work 节点测试挂载
  # showmount -e 10.0.0.8
  Export list for 10.0.0.8:
  /data/nfs/redis 10.0.0.0/24
  # mount 10.0.0.8:/data/nfs/redis /mnt/
  
  # 需切换未与nfs服务端相同id的用户，否则会提示权限拒绝无法写入数据
  root@k8s-node-1:~# su - redis
  redis@k8s-node-1:~$ id
  uid=1688(redis) gid=1688(redis) groups=1688(redis)
  redis@k8s-node-1:~$ touch /mnt/a.txt
  redis@k8s-node-1:~$ ls /mnt/a.txt
  /mnt/a.txt
  ```

  

## yaml

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: volumes-nfs-demo
  labels:
    app: redis
spec:
  containers:
  - name: redis
    image: redis:alpine
    ports:
    - containerPort: 6379
      name: redisport
    securityContext:
      runAsUser: 1688 # 在nfs上此用户需具有相关权限
    volumeMounts:
    - mountPath: /data
      name: redisdata
  volumes:
    - name: redisdata
      nfs:
        server: 10.0.0.8
        path: /data/nfs/redis
        readOnly: false
```

## 验证

```sh
# kubectl exec -it volumes-nfs-demo -- sh
/data $ redis-cli -h 127.0.0.1
127.0.0.1:6379> set key1 azheng.com
OK
127.0.0.1:6379> get key1
"azheng.com"
127.0.0.1:6379> bgsave
Background saving started


# nfs端验证
# ls /data/nfs/redis/ -l
total 4
-rw-r--r-- 1 redis nobody 114 Dec 27 19:54 dump.rdb


# 重构pod验证数据是否能恢复
# kubectl delete -f volumes-nfs-demo.yaml 
pod "volumes-nfs-demo" deleted
# kubectl apply -f volumes-nfs-demo.yaml 
pod/volumes-nfs-demo created
# kubectl exec -it volumes-nfs-demo -- sh
/data $ redis-cli -h 127.0.0.1
127.0.0.1:6379> get key1
"azheng.com"
```





# 故障排查

## 故障一

- Pod启动时报错：

```
...
Mounting command: mount
Mounting arguments: -t nfs 172.16.0.136:/data /var/lib/kubelet/pods/dd858afc-05e1-44e8-9910-7053f2b412f4/volumes/kubernetes.io~nfs/redisdata
Output: mount: /var/lib/kubelet/pods/dd858afc-05e1-44e8-9910-7053f2b412f4/volumes/kubernetes.io~nfs/redisdata: bad option; for several filesystems (e.g. nfs, cifs) you might need a /sbin/mount.<type> helper program.
```

这个错误提示表明缺少适当的挂载类型的辅助程序（mount.\<type> helper program），导致无法成功挂载 NFS 共享。

解决这个问题的方法是确保系统上安装了相应的 NFS 挂载工具。具体步骤如下：

1. 检查所需的 NFS 挂载工具是否已安装： 运行以下命令，检查是否存在适当的 NFS 挂载工具：

   ```
   ls /sbin/mount.nfs
   ```

   如果命令返回结果为空或文件不存在，表示缺少所需的工具。

2. 安装所需的 NFS 挂载工具： 如果缺少所需的工具，您需要安装适当的软件包。具体取决于您使用的操作系统和软件包管理器。

   - 对于基于 Debian/Ubuntu 的系统，可以运行以下命令安装 NFS 挂载工具：

     ```
     sudo apt-get install nfs-common
     ```

   - 对于基于 Red Hat/CentOS 的系统，可以使用以下命令安装 NFS 挂载工具：

     ```
     sudo yum install nfs-utils
     ```

3. 重新尝试挂载 NFS 共享： 安装完所需的 NFS 挂载工具后，再次运行挂载命令以尝试挂载 NFS 共享。

如果您仍然遇到问题，请确保您的系统配置正确，并且 NFS 服务器已正确配置并可从您的主机访问。另外，请查看系统日志以获取更多详细的错误消息和调试信息，以便进一步排查问题。



### 解决方案

```sh
root@k8s-master1:~# ansible worker -a 'apt-get install -y nfs-common'
```





## 故障二

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: volumes-nfs-demo
  labels:
    app: redis
spec:
  containers: # Pod 中运行的容器
  - name: redis
    image: redis:alpine # 运行 redis 进行测试
    ports:
    - containerPort: 6379
      name: redisport
    volumeMounts:
    - name: redisdata
      mountPath: /data # 容器中对应的目录
  volumes:
    - name: redisdata
      nfs:
        server: 172.16.0.136 # nfs-server 地址
        path: /data # nfs 共享的目录
        readOnly: false # 读写方式挂载

/data         	172.16.0.0/18(rw,wdelay,root_squash,no_subtree_check,sec=sys,rw,secure,root_squash,no_all_squash)


以上是我的 pod 配置和nfs配置，为什么pod启动时报错 chown: .: Operation not permitted
```

在您的配置中，您正在将 NFS 共享挂载到 Pod 中的容器上。当容器尝试更改挂载目录的所有者（使用 `chown` 命令）时，出现了 "Operation not permitted"（操作不允许）的错误。

这是因为默认情况下，NFS 共享以匿名用户的身份挂载到容器中，而匿名用户通常没有足够的权限来更改目录的所有者。

要解决这个问题，有几种方法可以尝试：

1. 在 NFS 服务器上配置合适的权限： 确保 NFS 服务器上的共享目录具有适当的权限设置，以允许容器中的用户更改目录的所有者。您可能需要调整目录的所有者、权限或用户映射等设置。

2. 在 Pod 配置中使用 `securityContext`： 在 Pod 的配置中，可以为容器定义一个 `securityContext`，以指定运行容器的用户和组。通过将容器用户和组与 NFS 服务器上的用户和组进行映射，可以获得正确的权限。 例如：

   ```yaml
   spec:
     containers:
     - name: redis
       image: redis:alpine
       securityContext:
         runAsUser: 1000 # 指定容器用户的 UID
         runAsGroup: 1000 # 指定容器用户所属的 GID
       # 其他配置...
   ```

3. 在 NFS 服务器上启用 root 权限： 如果您确定需要在容器中具有 root 权限来更改挂载目录的所有者，您可以尝试在 NFS 服务器上禁用 `root_squash` 选项，以允许远程 root 用户具有特权访问权限。请注意，这可能会降低安全性。

请根据您的需求选择适当的方法，并确保 NFS 服务器和容器的权限配置是一致的，以避免权限相关的错误。



### 解决方案

- 在 nfs 服务端的挂载选项中添加 `no_root_squash`，以实现将远程的 root 用户映射为 nfs 服务端的 root用户
  - 否则默认为 `root_squash`，即将远程 root 用户映射为 nfs 服务端的匿名用户，匿名用户的权限通常有限。

```sh
root@nfs-server:~# vim /etc/exports 
...
/data 172.16.0.0/18(rw,no_root_squash)


root@nfs-server:~# exportfs -r
exportfs: /etc/exports [2]: Neither 'subtree_check' or 'no_subtree_check' specified for export "172.16.0.0/18:/data".
  Assuming default behaviour ('no_subtree_check').
  NOTE: this default has changed since nfs-utils version 1.0.x



root@nfs-server:~# exportfs -v
/data         	172.16.0.0/18(rw,wdelay,no_root_squash,no_subtree_check,sec=sys,rw,secure,no_root_squash,no_all_squash)
```





# Pod 控制器基础

**Deployment、StatefulSet、DaemonSet 都可以实现Pod被删除后自动重建吗**

是的，Deployment、StatefulSet、DaemonSet 都可以实现 Pod 被删除后自动重建。

Deployment 是 Kubernetes 中最常用的控制器之一，它通过 ReplicaSet 机制来保证 Pod 的数量和期望状态一致。当 Pod 被删除或失败时，Deployment 会自动创建一个新的 Pod 来替代它。

StatefulSet 是用于管理有状态服务的控制器，它可以保证 Pod 的创建和更新顺序，并且可以为每个 Pod 分配一个唯一的稳定的网络标识符。当 Pod 被删除时，StatefulSet 会自动创建一个新的 Pod 来替代它，同时保证新的 Pod 具有相同的标识符和状态。

DaemonSet 用于在整个集群中运行一个 Pod 的副本，每个节点上都运行一个。当新的节点加入集群时，DaemonSet 会自动在该节点上创建一个新的 Pod，并在节点删除时删除该节点上的 Pod。因此，如果一个 Pod 被删除，DaemonSet 会自动创建一个新的 Pod 来替代它。

因此，这三个控制器都可以自动重建被删除的 Pod。不同之处在于它们的用途和特性，应该根据具体情况选择适合的控制器来管理 Pod。




# ---

# 存储

**kubernetes 中，目前主流的外部存储解决方案有哪些，并请按照采用排行榜排序**

在Kubernetes中，目前主流的外部存储解决方案有以下几种，按照采用排行榜排序：

1. NFS（Network File System）：NFS是一种基于网络的分布式文件系统协议，可以将远程文件系统挂载到Kubernetes集群中的Pod中。它是最常见和成熟的外部存储解决方案之一。
2. Ceph：Ceph是一个开源的分布式存储系统，提供了块存储、文件系统和对象存储等接口。Ceph在Kubernetes中可以通过Rook项目来集成和管理，提供可靠的分布式存储解决方案。
3. GlusterFS：GlusterFS是一个开源的分布式文件系统，具有可扩展性和容错性。它可以将多个存储节点组合成一个统一的命名空间，并将文件划分为小的存储单元进行存储和复制。
4. CSI（Container Storage Interface）：CSI是Kubernetes定义的一种标准化的存储接口，允许外部存储提供商通过插件将其存储系统集成到Kubernetes中。CSI提供了更好的可扩展性和灵活性，使得集成新的存储解决方案更加简单。
5. Rook：Rook是一个开源项目，旨在为Kubernetes提供多种存储解决方案，包括Ceph、NFS、GlusterFS等。它提供了用于部署、管理和扩展这些存储解决方案的自定义资源定义（CRD）和操作符。

请注意，这只是目前较为主流的外部存储解决方案之一，实际情况可能因特定需求和环境而有所不同。在选择合适的存储解决方案时，需要考虑性能、可靠性、可扩展性和成本等因素。



**你的意思是，kubernetes 中，目前最主流的外部存储解决方案是NFS对吗**

是的，NFS是Kubernetes中最常见和成熟的外部存储解决方案之一。NFS（Network File System）是一种基于网络的分布式文件系统协议，可以将远程文件系统挂载到Kubernetes集群中的Pod中。NFS具有广泛的支持和广泛的应用，许多组织在Kubernetes中使用NFS作为外部存储解决方案来满足他们的需求。然而，最佳的外部存储解决方案仍然取决于特定的使用案例和要求。



**是不是要用到 nfs-subdir-external-provisioner**

是的，要在Kubernetes中使用NFS作为外部存储解决方案，通常需要使用nfs-subdir-external-provisioner。

nfs-subdir-external-provisioner是一个Kubernetes外部存储供应商，它允许在Kubernetes集群中自动创建NFS PV（Persistent Volume）和PVC（Persistent Volume Claim）。它通过在NFS服务器上创建子目录并将其用作PV来实现存储的动态供应和回收。

使用nfs-subdir-external-provisioner，您可以通过创建一个存储类（StorageClass）来定义NFS存储的配置和参数，然后在PVC中引用该存储类。当创建PVC时，nfs-subdir-external-provisioner将自动在NFS服务器上创建一个子目录，并将其用作PV供PVC使用。

请注意，nfs-subdir-external-provisioner是一个独立的项目，您需要根据您的环境和需求进行安装和配置。可以从nfs-subdir-external-provisioner项目的GitHub存储库获取更多详细信息和安装说明。
