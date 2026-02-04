---
title: "Pod"
weight: 10
---


# Pod.spec

## hostNetwork

- 使 Pod 共享宿主机的网络名称空间。
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

### 范例-1

#### yaml

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

#### 验证

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



## hostPID

- 使 Pod 共享宿主机的PID名称空间。
- **谨慎使用！**
- `pod.spec.hostPID`





## restartPolicy

- 定义 pod 的重启策略，可以是 Always、OnFailure、Never，默认为 Always
  - **Always** 表示容器终止则重启，这也是默认策略
  - **OnFailure** 表示容器退出状态为非0时则重启
  - **Never** 表示容器终止不重启，无论退出状态码为何
  - PS：所谓的重启其实就是将 Pod 删除重建，判断和重启操作由 Node 节点的 kubelet 完成，onfailure 和 never 通常用于 job 计划任务

- `pod.spec.restartPolicy`

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp
  labels:
    name: myapp
spec:
  restartPolicy: Always # 定义pod的重启策略
...
```



## nodeSelector

- 选择将pod运行在哪些节点上，需先给节点打标签 `kubectl label nodes kube-node1 zone=node1`

- `Pod.spec.nodeSelector`

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp
  labels:
    name: myapp
spec:
  nodeSelector: # 节点标签选择
    zone: node1 # 选择具备此标签的节点运行pod
  containers:
...
```





## hostPID

- 使用node节点的pid名称空间，**危险！因为会在容器内部看到宿主机的进程**

- `pod.spec.hostPID`

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp
  labels:
    name: myapp
spec:
  hostPID: true # boolean 布尔值，true或false，默认false
  containers:
  - name: myapp
    image: <Image>
...
```

### 范例

- 开启 hostPID 后
- `hostPID: true`

```bash
# 在宿主机可以看到pod内的进程
root@k8s-node-1:~# ps aux|grep node_exporter
nobody    346931  0.2  0.5 115220 15080 ?        Ssl  00:37   0:00 /bin/node_exporter


# 在pod内也可以看到宿主机的进程
root@k8s-master-1:~# kubectl exec daemonset-node-exporter-6h7g5 -- ps 
PID   USER     TIME  COMMAND
    1 root      0:11 {systemd} /sbin/init
    2 root      0:00 [kthreadd]
    3 root      0:00 [rcu_gp]
    4 root      0:00 [rcu_par_gp]
    6 root      0:00 [kworker/0:0H-kb]
    9 root      0:00 [mm_percpu_wq]
   10 root      0:05 [ksoftirqd/0]
   11 root      0:30 [rcu_sched]
   12 root      0:00 [migration/0]
   13 root      0:00 [idle_inject/0]
...
```

- 关闭 hostPID 后
- `hostPID: false`

```bash
# 在宿主机仍然可以看到pod内的进程
root@k8s-node-1:~# ps aux|grep node_exporter
nobody    355096  1.6  0.5 115220 15136 ?        Ssl  00:53   0:00 /bin/node_exporter


# 在pod内看不到宿主机的进程
root@k8s-master-1:~# kubectl exec daemonset-node-exporter-2jdwx -- ps
PID   USER     TIME  COMMAND
    1 nobody    0:00 /bin/node_exporter
   13 nobody    0:00 ps
```



## tolerations

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: cadvisor

---

apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: cadvisor
  namespace: cadvisor
spec:
  selector:
    matchLabels:
      name: cadvisor
  template:
    metadata:
      labels:
        name: cadvisor
    spec:
      tolerations: #污点容忍,忽略master的NoSchedule
        - effect: NoSchedule
          key: node-role.kubernetes.io/master #？
      hostNetwork: true
      restartPolicy: Always
      containers:
      - name: cadvisor
        image: cadvisor:v0.39.3
        imagePullPolicy: IfNotPresent
        resources:
          requests:
            memory: 400Mi
            cpu: 400m
          limits:
            memory: 2000Mi
            cpu: 800m
        ports:
          - name: http
            containerPort: 8080
            protocol: TCP
        volumeMounts:
        - name: rootfs
          mountPath: /rootfs
        - name: var-run
          mountPath: /var/run
        - name: sys
          mountPath: /sys
        - name: docker
          mountPath: /var/lib/docker
        - name: disk
          mountPath: /dev/disk
      terminationGracePeriodSeconds: 30
      volumes:
      - name: rootfs
        hostPath:
          path: /
      - name: var-run
        hostPath:
          path: /var/run
      - name: sys
        hostPath:
          path: /sys
      - name: docker
        hostPath:
          path: /var/lib/docker
      - name: disk
        hostPath:
          path: /dev/disk
```



## affinity

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: zookeeper
  namespace: zookeeper
spec:
  selector:
    matchLabels:
      app: zookeeper
  serviceName: zookeeper-election
  replicas: 3
  updateStrategy:
    type: RollingUpdate
  podManagementPolicy: OrderedReady
  template:
    metadata:
      labels:
        app: zookeeper # 必须匹配 .spec.selector.matchLabels
    spec:
      affinity: # ？
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            - labelSelector:
                matchExpressions:
                  - key: "app"
                    operator: In
                    values:
                    - zookeeper
              topologyKey: "kubernetes.io/hostname"
      containers:
      - name: kubernetes-zookeeper
        imagePullPolicy: IfNotPresent
        image: "mirrorgooglecontainers/kubernetes-zookeeper:1.0-3.4.10"
        resources:
          requests:
            memory: "1Gi"
            cpu: "0.5"
        ports:
        - containerPort: 2181
          name: client
        - containerPort: 2888
          name: server
        - containerPort: 3888
          name: leader-election
        command:
        - sh
        - -c
        - "start-zookeeper \
          --servers=3 \
          --data_dir=/var/lib/zookeeper/data \
          --data_log_dir=/var/lib/zookeeper/data/log \
          --conf_dir=/opt/zookeeper/conf \
          --client_port=2181 \
          --election_port=3888 \
          --server_port=2888 \
          --tick_time=2000 \
          --init_limit=10 \
          --sync_limit=5 \
          --heap=512M \
          --max_client_cnxns=60 \
          --snap_retain_count=3 \
          --purge_interval=12 \
          --max_session_timeout=40000 \
          --min_session_timeout=4000 \
          --log_level=INFO"
        readinessProbe:
          exec:
            command:
            - sh
            - -c
            - "zookeeper-ready 2181"
          initialDelaySeconds: 10
          timeoutSeconds: 5
        livenessProbe:
          exec:
            command:
            - sh
            - -c
            - "zookeeper-ready 2181"
          initialDelaySeconds: 10
          timeoutSeconds: 5
        volumeMounts:
        - name: datadir
          mountPath: /var/lib/zookeeper
      securityContext:
        runAsUser: 1000
        fsGroup: 1000
  volumeClaimTemplates:
  - metadata:
      name: datadir
    spec:
      accessModes: [ "ReadWriteOnce" ]
      resources:
        requests:
          storage: 10Gi
```



## serviceAccountName

- 指定 serviceAccount，否则默认将使用 default ServiceAccount
- serviceAccountName 也可以写为 serviceAccount，但 serviceAccount 未来版本将被废弃
- `pod.spec.serviceAccountName`





## imagePullSecrets

- 指定私有镜像仓库拉取验证信息，最好指定ServiceAccount中的imagePullSecrets，以避免每个pod都单独关联secrets
- `pod.spec.imagePullSecrets`





# Pod.spec.containers

- containers 可以定义多个，即一个 Pod 中定义多个容器
- 如果其中存在多个容器，则容器默认是**并行**启动的，即无法控制启动的先后顺序

## env

- **向容器中传入环境变量，相当于执行`docker run -e key=value`**
- 定义容器中的环境变量，通过环境变量的配置容器化应用时，需要在容器配置段中嵌套使用env字段，它的值是一个由环境变量构建的列表。每个环境变量通常由name和value（或valueFrom）字段构成。
- **name \<string>** 环境变量的名称，必选字段；
- **value \<string>** 环境变量的值，通过$(VAR_NAME)引用，逃逸格式为“$$(VAR_NAME)”默认值为空；
- **valueFrom \<Object>** 环境变量值的引用源，例如当前Pod资源的名称、名称空间、标签等，不能与非空值的value字段同时使用，即环境变量的值要么源于value字段，要么源于valueFrom字段，二者不可同时提供数据。
  - valueFrom字段可引用的值有多种来源，包括当前Pod资源的属性值，容器相关的系统资源配置、ConfigMap对象中的Key以及Secret对象中的Key，它们分别要使用不同的嵌套字段进行定义。
  - **详参ConfigMap**
- 环境变量值的引用源，例如当前Pod资源的名称、名称空间、标签等，不能与非空值的value字段同时使用，即**环境变量的值要么源于value字段，要么源于valueFrom字段**，二者不可同时提供数据。
- valueFrom字段可引用的值有多种来源，包括当前Pod资源的属性值，容器相关的系统资源配置、ConfigMap对象中的Key以及Secret对象中的Key，它们分别要使用不同的嵌套字段进行定义。
- `pod.spec.containers.env`

### explain

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp
  labels:
    name: myapp
spec:
  containers:
  - name: myapp
    image: nginx:1.23
    imagePullPolicy: IfNotPresent
    env: # 定义容器中的环境变量
    - name: key1 # 键
      value: "value1" # 值
    - name: key2 # 键
      value: "value2" # 值
    - name: <string> # 变量名，其值来自于某Secret对象上的指定键的值；
      valueFrom: 
        secretKeyRef: # Secret对象中的特定Key
          name: <string>    # 引用的Secret对象的名称，需要与该Pod位于同一名称空间；
          key: <string>     # 引用的Secret对象上的键，其值将传递给环境变量；
          optional: <boolean> # 是否为可选引用；
    - name: <string>
      valueFrom: 
        configMapKeyRef <Object> # ConfigMap对象中的特定Key
    - name: <string>
      valueFrom: 
        fieldRef <Object> # 当前Pod资源的指定字段，目前支持使用的字段包括：
                          # metadata.name
                          # metadata.namespace
                          # metadata.labels
                          # metadata.annotations
                          # spec.nodeName
                          # spec.serviceAccountName
                          # status.hostIP
                          # status.podIP 等
    - name: <string>
      valueFrom: 
        resourceFieldRef <Object> # 当前容器的特定系统资源的最小值（配额）或最大值（限额），目前支持的引用包括：
                                  # limits.cpu
                                  # limits.memory
                                  # limits.ephemeral-storage
                                  # requests.cpu
                                  # requests.memory
                                  # requests.ephemeral-storage
```

### 范例 - 1

#### 测试使用的镜像

```sh
# tree .
.
├── data
│   └── index.html
├── Dockerfile
└── entrypoint.sh

# cat data/index.html 
website page

# cat Dockerfile 
FROM nginx:1.23
LABEL author="JamesAzheng"
ENV NGX_ROOT="/data/html/"
ADD data/ ${NGX_ROOT}
ADD entrypoint.sh /
ENTRYPOINT ["/entrypoint.sh"] 
CMD ["nginx", "-g", "daemon off;"] # CMD 的指令都会成为 ENTRYPOINT 的参数
EXPOSE 80

# cat entrypoint.sh 
#!/bin/bash
cat > /etc/nginx/conf.d/website.conf << EOF
server {
    listen ${NGX_LISTEN_IP:-0.0.0.0}:${NGX_LISTEN_PORT:-80};
    server_name ${NGX_SERVER_NAME};

    location / {
        root ${NGX_ROOT};
        index index.html;
    }
}
EOF

exec "$@" # 相当于接受CMD的参数后执行 nginx -g daemon off;


# docker build -t website:v6 .

# docker login --username=阿征666666 registry.cn-hangzhou.aliyuncs.com
# docker tag website:v6 registry.cn-hangzhou.aliyuncs.com/jamesazheng/test:v1
# docker push registry.cn-hangzhou.aliyuncs.com/jamesazheng/test:v1
```

#### yaml

```yaml
# vim myapp.yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp
  labels:
    name: myapp
spec:
  containers:
  - name: myapp
    image: registry.cn-hangzhou.aliyuncs.com/jamesazheng/test:v1
    imagePullPolicy: IfNotPresent
    env:
    - name: NGX_SERVER_NAME
      value: "xiangzheng.com"
    - name: NGX_LISTEN_PORT
      value: "68"
```

#### 验证

```sh
# kubectl apply -f myapp.yaml 
pod/myapp created

# kubectl exec -it myapp -- bash

root@myapp:/# curl 127.0.0.1
<!DOCTYPE html>
<html>
<head>
<title>Welcome to nginx!</title>
...


root@myapp:/# curl -H Host:xiangzheng.com 127.0.0.1
<!DOCTYPE html>
<html>
<head>
<title>Welcome to nginx!</title>
...


root@myapp:/# curl -H Host:xiangzheng.com 127.0.0.1:68
website page


root@myapp:/# cat /etc/nginx/conf.d/website.conf 
server {
    listen 0.0.0.0:68;
    server_name xiangzheng.com;

    location / {
        root /data/html/;
        index index.html;
    }
}


# 向容器中传入环境变量，相当于执行`docker run -e key=value
root@myapp:/# env
KUBERNETES_SERVICE_PORT_HTTPS=443
KUBERNETES_SERVICE_PORT=443
HOSTNAME=myapp
NGX_ROOT=/data/html/
NGX_LISTEN_PORT=68 # 
PWD=/
NGX_SERVER_NAME=xiangzheng.com # 
PKG_RELEASE=1~bullseye
HOME=/root
KUBERNETES_PORT_443_TCP=tcp://10.96.0.1:443
NJS_VERSION=0.7.9
TERM=xterm
SHLVL=1
KUBERNETES_PORT_443_TCP_PROTO=tcp
KUBERNETES_PORT_443_TCP_ADDR=10.96.0.1
KUBERNETES_SERVICE_HOST=10.96.0.1
KUBERNETES_PORT=tcp://10.96.0.1:443
KUBERNETES_PORT_443_TCP_PORT=443
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
NGINX_VERSION=1.23.3
_=/usr/bin/env
```

### 范例 - 2

- 引用 configmap 中的 value

#### ConfigMap

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: demoapp-config
  namespace: default
data:
  demoapp.port: "8899" # 定义
  demoapp.host: 127.0.0.1 # 定义
```

#### Pod

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: configmaps-env-demo
  namespace: default
spec:
  containers:
  - image: ikubernetes/demoapp:v1.0
    name: demoapp
    env:
    - name: PORT # 自定义键
      valueFrom: # 值来自：
        configMapKeyRef: # 来自configMap
          name: demoapp-config # 选择configMap；需等于ConfigMap.metadata.name
          key: demoapp.port # 选择configMap中具体的key；需等于ConfigMap.data中的key
          optional: false # 是否可选，true可选，false必选(不存在则会报错退出)
    - name: HOST
      valueFrom:
        configMapKeyRef:
          name: demoapp-config
          key: demoapp.host
          optional: true # true表示可选，不存在则会忽略
```

#### 验证

```sh
[root@configmaps-env-demo /]# ss -ntl
State       Recv-Q     Send-Q     Local Address:Port      Peer Address:Port           
LISTEN      0          128            127.0.0.1:8899           0.0.0.0:*                 


[root@configmaps-env-demo /]# env
KUBERNETES_SERVICE_PORT=443
KUBERNETES_PORT=tcp://10.96.0.1:443
HOSTNAME=configmaps-env-demo
SHLVL=1
PORT=8899 # 引入的环境变量
HOME=/root
PS1=[\u@\h \w]\$ 
TERM=xterm
KUBERNETES_PORT_443_TCP_ADDR=10.96.0.1
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
KUBERNETES_PORT_443_TCP_PORT=443
KUBERNETES_PORT_443_TCP_PROTO=tcp
HOST=127.0.0.1 # 引入的环境变量
DEPLOYENV=Production
KUBERNETES_SERVICE_PORT_HTTPS=443
KUBERNETES_PORT_443_TCP=tcp://10.96.0.1:443
RELEASE=Stable
KUBERNETES_SERVICE_HOST=10.96.0.1
PWD=/
```

## envFrom

- `Pod.spec.containers.envFrom`

### explain

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp
  labels:
    name: myapp
spec:
  containers:
  - name: myapp
    image: nginx:1.23
    imagePullPolicy: IfNotPresent
    envFrom: # 整体引用指定的Secret对象的全部键名和键值；configmap也支持这种引用！
    - prefix: <string> # 将所有键名引用为环境变量时统一添加的前缀；
```



## ports

- **定义容器对外暴露的端口。**
- **还可以指定 hostPort 实现对外提供访问，客户端可以从 Pod 被调度到的 node 节点访问。并非完美的解决方案，因为 Pod 被调度到哪个节点是不确定的，客户端又无从知晓。并且还容器产生端口冲突**
- `pod.spec.containers.ports`

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp
  labels:
    name: myapp
spec:
  containers:
  - name: myapp
    image: nginx:1.23
    imagePullPolicy: IfNotPresent
    ports: # 定义容器端口列表
    - containerPort: 80 # 定义一个容器对外暴露端口，如果仅定义此项 则只是声明暴露的端口，必选项
      hostIP: 0.0.0.0 # 将对外提供访问的端口绑定到被调度主机的哪个IP
      hostPort: 30888 # 映射到宿主机的端口，以实现对外提供访问
      name: http # 定义名称
      protocol: TCP # 端口协议，可以为 SCTP、TCP、UDP，默认为 TCP
```



### 范例-1

#### yaml

```yaml
# vim myapp.yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp
  labels:
    name: myapp
spec:
  containers:
  - name: myapp
    image: nginx:1.23
    imagePullPolicy: IfNotPresent
    ports:
    - containerPort: 80
      hostPort: 30888 # 为了避免与调度的节点端口冲突，因此单独指定一个冷门端口。
      name: http
      protocol: TCP
```

#### 验证

```yaml
# kubectl apply -f myapp.yaml 
pod/myapp created


# kubectl describe pod myapp
...
Name:         myapp
Namespace:    default
Priority:     0
Node:         k8s-node-1/10.0.0.101 # 被调度到了此节点
...
Containers:
  myapp:
...
    Host Port:      30888/TCP
...

# 访问测试
# curl 10.0.0.101:30888
<!DOCTYPE html>
<html>
<head>
<title>Welcome to nginx!</title>
...
```

#### 问题

- 为什么在被调度到的10.0.0.101节点上看不到监听的端口

  - ```sh
    root@k8s-node-1:~# ss -ntul | grep 30888
    ```

### 范例-2

- 如果仅定义 `pod.spec.containers.ports.containerPort`，则只是声明暴露的端口

#### yaml

```yaml
# vim myapp.yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp
  labels:
    name: myapp
spec:
  containers:
  - name: myapp
    image: nginx:1.23
    imagePullPolicy: IfNotPresent
    ports:
      - containerPort: 80
```

#### 验证

```yaml
# kubectl apply -f myapp.yaml 
pod/myapp created


# kubectl describe pod myapp 
Name:         myapp
Namespace:    default
Priority:     0
Node:         k8s-node-1/10.0.0.101
Start Time:   Fri, 23 Dec 2022 20:12:06 +0800
Labels:       name=myapp
Annotations:  <none>
Status:       Running
IP:           10.244.1.234
IPs:
  IP:  10.244.1.234
Containers:
  myapp:
    Container ID:   docker://7dcf45f73e86f8f786b873a7f320eb9dd7382503126556936ea32cf40be85def
    Image:          nginx:1.23
    Image ID:       docker-pullable://nginx@sha256:0b970013351304af46f322da1263516b188318682b2ab1091862497591189ff1
    Port:           80/TCP # 仅是声明容器中的Port
    Host Port:      0/TCP # 不会监听所被调度宿主机的端口
    State:          Running
...
```



## imagePullPolicy

- 定义镜像的拉取策略；
  - **Always** 每次都去拉取镜像
  - **IfNotPresent** 如果镜像在本地存在，则不去拉取镜像
  - **Never** 只使用本地镜像
  - **默认值说明：**
    - 当镜像标签是 latest 或没有指定标签时，默认策略是 Always
      - 因为本地镜像是 latest 并不能代表一定是最新的，所以就需要每次去拉取镜像以保证镜像始终是最新的
    - 当镜像为自定义标签时，默认策略是 IfNotPresent
      - 因为本地镜像已经指明了所处的版本，所以就会使用当前的镜像版本

- `pod.spec.initContainers.imagePullPolicy`

- `pod.spec.containers.imagePullPolicy`

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp
  labels:
    name: myapp
spec:
  restartPolicy: Always
  containers:
  - name: myapp
    image: <Image>
    imagePullPolicy: Always # 定义镜像拉取策略
    resources:
      limits:
        memory: "128Mi"
        cpu: "500m"
    ports:
      - containerPort: <Port>
```





## command

- **相当于 Dockerfile 中的 ENTRYPOINT**
- **如果 kubernetes yaml 中定义了command 则以 yaml 中定义的为准（即 command 会替换原有的 ENTRYPOINT ），否则以 Dockerfile 中定义的ENTRYPOINT为准**
- 可与 kubernetes yaml 中的 args 组合使用
- `pod.spec.containers.command`

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp
  labels:
    name: myapp
spec:
  containers:
  - name: myapp
    image: nginx:1.23
    imagePullPolicy: IfNotPresent
    command <[]string> # command
```

### 范例-1

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp
spec:
  containers:
  - name: myapp
    image: <Image>
    imagePullPolicy: Always
    command: # command
      - /usr/local/bin/redis-cli
      - info
    args: # args
      - xxx
      - xxx
    resources:
      limits:
        memory: "128Mi"
        cpu: "500m"
    ports:
      - containerPort: <Port>
```



## args

- **相当于 Dockerfile 中的 CMD**
- **如果kubernetes yaml中定义了 args 则以 yaml 中定义的为准，否则以Dockerfile中定义的CMD为准**
- 可与 kubernetes yaml 中的 command 组合使用
- `pod.spec.containers.args`

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp
  labels:
    name: myapp
spec:
  containers:
  - name: myapp
    image: nginx:1.23
    imagePullPolicy: IfNotPresent
    args <[]string> # command
```





## resources

- 定义容器所需资源的初始值 和 使用限制；
  - cpu：1核cpu = 1000m（毫核）
  - mem：1G内存 = 1024Mi（Mi表示以1024作为单位）
- 也可以在Pod级别定义
- **注意：**即使限制了Pod或其内部容器所需的资源，但在容器内部看到的还是宿主机的实际资源情况。如果某些应用按照看到的资源百分比调用时可能会出现资源不足的情况产生，从而发生OOM，但可以使用`downwardAPI`从配置清单中获取到实际的资源限制，进而做出调整。
- `pod.spec.containers.resources`

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp
  labels:
    name: myapp
spec:
  containers:
  - name: myapp
    image: <Image>
    resources: # 资源管理相关配置
      requests: # 容器运行时，最低资源需求，也就是说最少需要多少资源容器才能正常运行   
        cpu: "200m" # CPU资源（核数），两种方式，浮点数或者是整数+m，0.1=100m，最少值为0.001核（1m）
        memory: "64Mi" # 内存使用量
      limits: # 资源限制，即最多使用多少资源，有limitsrange，就是不设置时有默认限制范围！(如果定义了limitsrange的情况下)
        cpu: "500m"
        memory: "128Mi"
```





# Probe


- 使用存活探针 livenessProbe，虽然可以在检测到 Pod 故障时执行重构策略，但是 service 上并不会立刻将故障 Pod 的 IP 下线，但达到 failureThreshold 重试次数上线后，故障的 Pod 会被打上 NO READY 的标签，最终从 service 中下线
- **会导致 Pod 故障时无法及时的从 service 中下线 从而导致用户的请求有可能被调度到故障的 Pod 上，业务会受到影响**



# Hook

https://kubernetes.io/zh-cn/docs/concepts/containers/container-lifecycle-hooks/

https://kubernetes.io/zh-cn/docs/tasks/configure-pod-container/attach-handler-lifecycle-event/

https://kubernetes.io/zh-cn/docs/concepts/workloads/pods/pod-lifecycle/#pod-termination

- 定义启动后或停止前的钩子

  - **只有启动后钩子执行成功 容器才会变成 running 状态**
    - 这个说法是不完全准确的。在容器启动的过程中，Docker引擎会按照一定的顺序执行一系列的操作，包括拉取镜像、创建容器、设置网络、挂载卷等。当所有这些操作都完成后，Docker引擎会将容器状态设置为running。
    - 其中，在容器启动的过程中可以执行一些命令或操作，这些命令或操作被称为钩子（hook），例如在容器启动前或启动后执行的脚本。如果在启动后钩子执行失败，容器状态仍然会被设置为running，但是在容器内部可能会发生错误或无法正常运行。因此，启动后钩子的执行成功与否并不会直接影响容器状态的变化，但是它可能会影响容器的正常运行。
  - **只有停止前钩子执行成功 容器才会正常停止(发送kill信号)**
- 同样支持 `exec`、`httpGet`、`tcpSocket`，与 Probe 中的使用方式大体一致。
- `pod.spec.containers.lifecycle`

## 范例 -1

- 此范例更适合在初始化容器中添加iptables规则，因为添加了`NET_ADMIN`能力后此容器后期会一直拥有此能力

### yaml

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: lifecycle-demo
spec:
  containers:
  - name: demo
    image: ikubernetes/demoapp:v1.0
    imagePullPolicy: IfNotPresent
    securityContext:
      capabilities:
        add:
        - NET_ADMIN # 为了能执行iptables命令
    livenessProbe:
      httpGet:
        path: '/livez'
        port: 80
        scheme: HTTP
      initialDelaySeconds: 5
    lifecycle:
      postStart: # 启动后钩子
        exec:
          command: ['/bin/sh','-c','iptables -t nat -A PREROUTING -p tcp --dport 8080 -j REDIRECT --to-ports 80']
      preStop: # 停止前钩子，此处示例不好测出效果
        exec:
          command: ['/bin/sh','-c','while killall python3; do sleep 1; done']
  restartPolicy: Always
```

### 验证

```sh
# kubectl get pod -o wide 
NAME             READY   STATUS    RESTARTS   AGE   IP         
lifecycle-demo   1/1     Running   0          96s   10.244.1.10 


# curl 10.244.1.10 
iKubernetes demoapp v1.0 !! ClientIP: 10.244.0.0, ServerName: lifecycle-demo, ServerIP: 10.244.1.10!


# curl 10.244.1.10:8080
iKubernetes demoapp v1.0 !! ClientIP: 10.244.0.0, ServerName: lifecycle-demo, ServerIP: 10.244.1.10!


# 在容器内可以直接设置iptables，并不安全
# kubectl exec lifecycle-demo -- iptables -A INPUT -j REJECT
# kubectl exec lifecycle-demo -- iptables -vnL
Chain INPUT (policy ACCEPT 0 packets, 0 bytes)
 pkts bytes target     prot opt in     out     source               destination         
    1    60 REJECT     all  --  *      *       0.0.0.0/0            0.0.0.0/0            reject-with icmp-port-unreachable
...
```



## terminationGracePeriodSeconds

在Kubernetes中，`terminationGracePeriodSeconds` 属性用于定义一个Pod在接收到终止信号后，允许其容器进行清理和关闭的时间。如果 `preStop` 钩子所需的时间长于默认的终止限期，你可以通过修改Pod的定义来调整 `terminationGracePeriodSeconds` 属性的值。

这个值位于Pod的规格（spec）部分中。以下是一个示例Pod定义，展示了如何修改 `terminationGracePeriodSeconds` 属性：

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: example-pod
spec:
  terminationGracePeriodSeconds: 120 # 修改这个值为你需要的时间（以秒为单位）
  containers:
    - name: main-container
      image: nginx:latest
      # ... 其他容器设置 ...
```

在这个示例中，将 `terminationGracePeriodSeconds` 设置为120秒，但你可以根据需要将其调整为适合 `preStop` 钩子完成所需任务的时间。

记住，当你修改了Pod的定义后，你需要使用 `kubectl apply -f <pod-definition.yaml>` 命令来应用更改。



# initContainers

- 初始化容器，与 Pod.spec.containers 配置基本一致；
- 如果其中存在多个容器，则容器默认是**串行**启动的；初始化完成后会进入到 Terminated 状态之后会运行 containers
  - 假设初始化容器中有两个容器，则先运行容器一，容器一运行完毕退出后，再运行容器二，最后运行正式容器

- 通常初始化容器中需要运行的是 **比启动后钩子更先要执行的内容**
  - 假设容器中的进程正常运行需要事先依赖某些操作
    - 如果使用启动后钩子只关心钩子命令是否执行完成，而不关系容器中的进程是否已经启动成功，而初始化容器则可以解决这个问题
- `pod.spec.initContainers`

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp
  labels:
    name: myapp
spec:
  initContainers: # 定义初始化容器
    - name: myapp_init
      image: <Image>
...
  containers:
...
```

## 范例 - 1

- 避免主容器中权限泛滥的问题，比如需要设置 iptables 规则，如果直接在主容器中设置 则会导致后期主容器一直会获得这个权限，那么如果在初始化容器中设置 则可以创建完 iptables 规则后这个权限将不会传入到主容器中

### yaml

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: init-container-demo
  namespace: default
spec:
  initContainers:
  - name: iptables-init
    image: ikubernetes/admin-box:latest
    imagePullPolicy: IfNotPresent
    command: ['/bin/sh','-c']
    args: ['iptables -t nat -A PREROUTING -p tcp --dport 8080 -j REDIRECT --to-port 80']
    securityContext:
      capabilities:
        add:
        - NET_ADMIN
  containers:
  - name: demo
    image: ikubernetes/demoapp:v1.0
    imagePullPolicy: IfNotPresent
    ports:
    - name: http
      containerPort: 80
```

### 验证

#### 初始化容器运行中

```yaml
# kubectl get pod
NAME                  READY   STATUS     RESTARTS   AGE
init-container-demo   0/1     Init:0/1   0          22s

# kubectl describe pod init-container-demo 
Name:         init-container-demo
Namespace:    default
Priority:     0
Node:         k8s-node-1/10.0.0.101
Start Time:   Sun, 25 Dec 2022 13:52:56 +0800
Labels:       <none>
Annotations:  <none>
Status:       Pending
IP:           
IPs:          <none>
Init Containers:
  iptables-init:
    Container ID:  
    Image:         ikubernetes/admin-box:latest
    Image ID:      
    Port:          <none>
    Host Port:     <none>
    Command:
      /bin/sh
      -c
    Args:
      iptables -t nat -A PREROUTING -p tcp --dport 8080 -j REDIRECT --to-port 80
    State:          Waiting
      Reason:       PodInitializing
    Ready:          False
    Restart Count:  0
    Environment:    <none>
    Mounts:
      /var/run/secrets/kubernetes.io/serviceaccount from kube-api-access-rqslt (ro)
...
```

#### 初始化完毕

```yaml
# kubectl get pod
NAME                  READY   STATUS    RESTARTS   AGE
init-container-demo   1/1     Running   0          11m
# kubectl describe pod init-container-demo
Name:         init-container-demo
Namespace:    default
Priority:     0
Node:         k8s-node-1/10.0.0.101
Start Time:   Sun, 25 Dec 2022 13:52:56 +0800
Labels:       <none>
Annotations:  <none>
Status:       Running
IP:           10.244.1.11
IPs:
  IP:  10.244.1.11
Init Containers:
  iptables-init:
...
    Command:
      /bin/sh
      -c
    Args:
      iptables -t nat -A PREROUTING -p tcp --dport 8080 -j REDIRECT --to-port 80
    State:          Terminated # 初始化完毕后会退出
...


# curl 10.244.1.11 
iKubernetes demoapp v1.0 !! ClientIP: 10.244.0.0, ServerName: init-container-demo, ServerIP: 10.244.1.11!

# curl 10.244.1.11:8080
iKubernetes demoapp v1.0 !! ClientIP: 10.244.0.0, ServerName: init-container-demo, ServerIP: 10.244.1.11!


# 因为初始化容器初始化完后会退出，且不影响主容器，因此无法执行iptables命令，所以更加安全。
# kubectl exec init-container-demo -- iptables -A INPUT -j REJECT
Defaulted container "demo" out of: demo, iptables-init (init)
getsockopt failed strangely: Operation not permitted
command terminated with exit code 1
```



# Multi container

- 一个 Pod 中可以运行多个容器，不同的容器可以有不同的运行模式：

## Sidecar

- 边车模式，为主容器提供辅助功能，**最常用**
- 例如：日志采集器

### 范例 - 1

#### yaml

- envoy会监听80端口，客户端访问Pod后流量会经由envoy转发给demoapp的8080端口

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: sidecar-container-demo
  namespace: default
spec:
  containers:
  - name: proxy
    image: envoyproxy/envoy-alpine:v1.14.1
    command: ['/bin/sh','-c']
    args: ['sleep 10 && envoy -c /etc/envoy/envoy.yaml']
    lifecycle:
      postStart:
        exec:
          command: ['/bin/sh','-c','wget -O /etc/envoy/envoy.yaml https://llinux.cn/envoy.yaml']
  - name: demo
    image: ikubernetes/demoapp:v1.0
    imagePullPolicy: IfNotPresent
    env:
    - name: HOST
      value: "127.0.0.1"
    - name: PORT
      value: "8080"
```

#### envoy.yaml

```yaml
admin:
  access_log_path: /tmp/admin_access.log
  address:
    socket_address: { address: 0.0.0.0, port_value: 9901 }

static_resources:
  listeners:
  - name: listener_0
    address:
      socket_address: { address: 0.0.0.0, port_value: 80 }
    filter_chains:
    - filters:
      - name: envoy.http_connection_manager
        config:
          stat_prefix: ingress_http
          codec_type: AUTO
          route_config:
            name: local_route
            virtual_hosts:
            - name: local_service
              domains: ["*"]
              routes:
              - match: { prefix: "/" }
                route: { cluster: local_service }
          http_filters:
          - name: envoy.router

  clusters:
  - name: local_service
    connect_timeout: 0.25s
    type: STATIC
    lb_policy: ROUND_ROBIN
    load_assignment:
      cluster_name: local_service
      endpoints:
      - lb_endpoints:
        - endpoint:
            address:
              socket_address:
                address: 127.0.0.1
                port_value: 8080
```

#### 验证

```sh
# kubectl get pod -o wide 
NAME                     READY   STATUS    RESTARTS   AGE     IP    
sidecar-container-demo   2/2     Running   0          2m23s   10.244.1.12



# 测试访问
# curl 10.244.1.12 -i
HTTP/1.1 200 OK
content-type: text/html; charset=utf-8
content-length: 108
server: envoy # 访问的是envoy的80端口，envoy再转发给demoapp，demoapp再将数据发送给envoy，最后由envoy发送给客户端
date: Sun, 25 Dec 2022 08:30:27 GMT
x-envoy-upstream-service-time: 3

iKubernetes demoapp v1.0 !! ClientIP: 127.0.0.1, ServerName: sidecar-container-demo, ServerIP: 10.244.1.12!
```



## Adapter

- 适配器模式，兼容到某个格式
- 例如：默认 nginx status 输出的格式无法与 Prometheus 的指标格式相兼容，那么适配器容器可以实现将 nginx status 输出的格式转换成 Prometheus 所兼容的格式

## Ambassador

- 大使模式，为了让主容器更好的接入外部环境而设定的；如果内部主容器不便于外部直接通信时 可以创建此类型容器来实现与外界通信
- 例如：代表主容器访问数据库；假设 Pod 中的一个容器需要向各种数据库中写入数据(redis、MySQL..)，那么这个容器就可以将写数据的操作交由大使模式的容器（有适配MySQL的、适配redist的...）来进行处理，从而避免在业务代码层面产生冗余的代码 只需定义标准的访问大使容器的接口即可





# Pod template

- demoapp.yaml

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: demoapp
  namespace: test
spec:
  containers:
  - name: demoapp
    image: ikubernetes/demoapp:v1.0
    imagePullPolicy: IfNotPresent
  nodeSelector:
    hostname: k8s-worker1
```

