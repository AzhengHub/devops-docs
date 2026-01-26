---
title: "Pod"
weight: 10
---

# Pod Base

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp
  labels:
    name: myapp
spec: # pod具体定义
  ... # pod级定义
  containers: # 容器级定义
  - name: myapp
    image: <Image>
    resources:
      limits:
        memory: "128Mi"
        cpu: "500m"
    ports:
      - containerPort: <Port>
status: # 资源运行时的状态，无需手动指定
...
```




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



## securityContext

- 安全上下文，**包含 Pod 级 和 container 级**，也可以在PSP（PodSecurityPolicy）资源中定义全局策略
- `pod.spec.securityContext`

```yaml
...  
spec:
  # Pod级别的安全上下文，对内部所有容器均有效
  securityContext:
    runAsUser <integer>   # 以指定的用户身份运行容器进程，默认由镜像中的USER指定
    runAsGroup <integer>   # 以指定的用户组运行容器进程，默认使用的组随容器运行时
    supplementalGroups  <[]integer>  # 为容器中1号进程的用户添加的附加组；
    fsGroup <integer>  # 为容器中的1号进程附加的一个专用组，其功能类似于sgid
    runAsNonRoot <boolean>  # 是否以非root身份运行
    seLinuxOptions <Object>  # SELinux的相关配置
    sysctls  <[]Object>  # 应用到当前Pod上的名称空间级别的sysctl参数设置列表
    windowsOptions <Object>  # Windows容器专用的设置
...   
  containers:
   # 容器级别的安全上下文，仅生效于当前容器
    securityContext:
      runAsUser <integer>
      runAsGroup <integer>
      runAsNonRoot <boolean>
      allowPrivilegeEscalation <boolean> # 是否允许特权升级
      capabilities <Object>  # 于当前容器上添加（add）或删除（drop）的内核能力
        add  <[]string>  # 添加由列表定义的各内核能力
        drop  <[]string>  # 移除由列表定义的各内核能力
      privileged <boolean>  # 是否运行为特权容器，相当于拥有宿主机的root身份，一般情况下不要开启。
      procMount <string>   # 设置容器的procMount类型，默认为DefaultProcMount；
      readOnlyRootFilesystem <boolean> # 是否将根文件系统设置为只读模式
      seLinuxOptions <Object>
      windowsOptions <Object> 
...
```

### capabilities

[capabilities(7) - Linux manual page (man7.org)](https://man7.org/linux/man-pages/man7/capabilities.7.html)

- capabilities 就是将 Linux 内核在设计时将不同能力划分成了多个不同的单元，以便普通用户调用
- `getcap` 和 `setcap` 来管理这些权限

```bash
# 常用内核相关能力说明：

CAP_CHOWN # 改变UID和GID

CAP_MKNOD # 调用 mknod() 创建设备文件 

CAP_NET_ADMIN # 网络管理权限，比如：iptables规则、路由表、清空驱动上的统计数据、设置网络接口的混杂模式、设置是否支持多播功能等...

CAP_SYS_ADMIN # 大部分的管理权限

CAP_SYS_TIME # 改内核时钟

CAP_SYS_MODULE # 装载卸载内核模块

CAP_NET_BIND_SERVICE # 允许普通用户绑定特权端口，0 ~ 1024（经测试发现普通用户即使授予了此能力还是无法绑定特权端口，还需要授予其他的能力？比如NET_ADMIN？）
```

#### 范例-1

- 调用 capabilities 增加能力，使普通用户可以监听在特权端口80上

```yaml
# vim myapp.yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp
  labels:
    name: myapp
spec:
  securityContext:
    runAsUser: 1001 # 以普通用户身份运行
    runAsGroup: 1001 
  containers:
  - name: myapp
    image: ikubernetes/demoapp:v1.0
    imagePullPolicy: IfNotPresent
    env:
      - name: PORT
        value: "80" # 监听特权端口


# 无法创建，因为普通用户无法监听特权端口
# kubectl get pod
NAME    READY   STATUS   RESTARTS   AGE
myapp   0/1     Error    0          5s
# kubectl logs myapp 
...
PermissionError: [Errno 13] Permission denied



-----------------

# vim myapp.yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp
  labels:
    name: myapp
spec:
  securityContext:
    runAsUser: 1001 # 以普通用户身份运行
    runAsGroup: 1001
  containers:
  - name: myapp
    image: ikubernetes/demoapp:v1.0
    imagePullPolicy: IfNotPresent
    env:
      - name: PORT
        value: "80" # 监听特权端口
        securityContext:
          capabilities:
            add: ['NET_BIND_SERVICE'] # 允许普通用户绑定特权端口，0 ~ 1024（经测试发现普通用户即使授予了此能力还是无法绑定特权端口，还需要授予其他的能力？比如NET_ADMIN？）
```

#### 范例-2

调用 capabilities 增加能力，使普通用户可以创建 iptables 规则，以实现端口转发

- **正常 Pod 内的容器无法设置 iptables 规则**

```yaml
# vim myapp.yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp
spec:
  containers:
  - name: myapp
    image: ikubernetes/demoapp:v1.0
    imagePullPolicy: IfNotPresent


# kubectl exec myapp -- /sbin/iptables -t nat -A PREROUTING -p tcp --dport 8080 -j REDIRECT --to-port 80
getsockopt failed strangely: Operation not permitted
command terminated with exit code 1
```

- **添加 `NET_ADMIN` 能力后，可以设置iptables 规则**

```yaml
# vim myapp.yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp
spec:
  containers:
  - name: myapp
    image: ikubernetes/demoapp:v1.0
    imagePullPolicy: IfNotPresent
    command: ["/bin/sh","-c"]
    args: ["/sbin/iptables -t nat -A PREROUTING -p tcp --dport 8080 -j REDIRECT --to-port 80 && /usr/bin/python3 /usr/local/bin/demo.py"]
    securityContext:
      capabilities:
        add: ['NET_ADMIN']


# kubectl describe pod myapp 
Name:         myapp
Namespace:    default
Priority:     0
Node:         k8s-node-1/10.0.0.101
Start Time:   Sat, 24 Dec 2022 12:53:19 +0800
Labels:       <none>
Annotations:  <none>
Status:       Running
IP:           10.244.1.249
...


# curl 10.244.1.249
iKubernetes demoapp v1.0 !! ClientIP: 10.244.0.0, ServerName: myapp, ServerIP: 10.244.1.249!
# curl 10.244.1.249:8080
iKubernetes demoapp v1.0 !! ClientIP: 10.244.0.0, ServerName: myapp, ServerIP: 10.244.1.249!


# 可以定义
# kubectl exec myapp -- /sbin/iptables -t nat -A PREROUTING -p tcp --dport 8088 -j REDIRECT --to-port 80
# curl 10.244.1.249:8088
iKubernetes demoapp v1.0 !! ClientIP: 10.244.0.0, ServerName: myapp, ServerIP: 10.244.1.249!


# 容器内的iptables规则只与容器内部有关，与容器外部即宿主机无关。
# kubectl exec myapp -- /sbin/iptables -vnL -t nat
Chain PREROUTING (policy ACCEPT 0 packets, 0 bytes)
 pkts bytes target     prot opt in     out     source               destination         
    1    60 REDIRECT   tcp  --  *      *       0.0.0.0/0            0.0.0.0/0            tcp dpt:8080 redir ports 80
    1    60 REDIRECT   tcp  --  *      *       0.0.0.0/0            0.0.0.0/0            tcp dpt:8088 redir ports 80
...
```

#### 范例-3

调用 capabilities 减少能力，以实现 root 用户也无法修改文件的 UID 和 GID

- **正常容器内的 root 可以修改文件的 UID 和 GID**

```yaml
# vim myapp.yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp
spec:
  containers:
  - name: myapp
    image: ikubernetes/demoapp:v1.0
    imagePullPolicy: IfNotPresent

# kubectl exec myapp -- ls -l /etc/hosts
-rw-r--r--    1 root     root           202 Dec 24 05:16 /etc/hosts

# kubectl exec myapp -- chown 1001 /etc/hosts
# kubectl exec myapp -- ls -l /etc/hosts
-rw-r--r--    1 1001     root           202 Dec 24 05:16 /etc/hosts

# kubectl exec myapp -- chmod 400 /etc/hosts
# kubectl exec myapp -- ls -l /etc/hosts
-r--------    1 1001     root           202 Dec 24 05:16 /etc/hosts
```

- **删除 `CHOWN` 能力后，容器内的 root 用户将无法修改文件的 UID 和 GID**

```yaml
# vim myapp.yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp
spec:
  containers:
  - name: myapp
    image: ikubernetes/demoapp:v1.0
    imagePullPolicy: IfNotPresent
    securityContext:
      capabilities:
        drop: ['CHOWN']
        

# kubectl exec myapp -- ls -l /etc/hosts
-rw-r--r--    1 root     root           202 Dec 24 05:20 /etc/hosts

# 无法修改UID
# kubectl exec myapp -- chown 1001 /etc/hosts
chown: /etc/hosts: Operation not permitted
command terminated with exit code 1
# kubectl exec myapp -- ls -l /etc/hosts
-rw-r--r--    1 root     root           202 Dec 24 05:20 /etc/hosts

# 但文件权限依旧可以修改
# kubectl exec myapp -- chmod 400 /etc/hosts
# kubectl exec myapp -- ls -l /etc/hosts
-r--------    1 root     root           202 Dec 24 05:20 /etc/hosts
```



### sysctls

- **Pod内可安全设定的内核参数只有三个：**
  - kernel.shm_rmid_forced
  - net.ipv4.ip_local_port_range
  - net.ipv4.tcp_syncookies
- **其它非安全内核参数需要在启动kubelet时添加下面的选项：**

  - --allowed-unsafe-sysctls strings
  - 需要在每个 kubelet 节点都添加次参数，并且只有 kubelet 重启后才能生效



### privileged

- 是否运行为特权容器，相当于拥有宿主机的root身份，一般情况下不要开启。
- kube-system名称空间下的kube-proxy pod默认会开启此特权。
- 如需要特殊权限，可以选择定义capabilities添加内核能力，例如CAP_SYS_ADMIN、CAP_NET_ADMIN等

```yaml
# kubectl get pod -n kube-system kube-proxy-hh5ph -o yaml 
apiVersion: v1
kind: Pod
metadata:
...
spec:
...
  containers:
...
    securityContext:
      privileged: true
...
```



### runAsUser & runAsGroup

#### 范例-1

指定运行时的用户和所属组

- **默认以root身份运行**

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
    image: ikubernetes/demoapp:v1.0
    imagePullPolicy: IfNotPresent
    env:
      - name: PORT
        value: "8080"

# 默认以root身份运行
# kubectl exec myapp -- id
uid=0(root) gid=0(root) groups=0(root),1(bin),2(daemon),3(sys),4(adm),6(disk),10(wheel),11(floppy),20(dialout),26(tape),27(video)
```

- **指定运行时的用户和所属组**

```yaml
# vim myapp.yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp
  labels:
    name: myapp
spec:
  securityContext:
    runAsUser: 1001 # 指定运行时的用户
    runAsGroup: 1001 # 指定运行时的所属组
  containers:
  - name: myapp
    image: ikubernetes/demoapp:v1.0
    imagePullPolicy: IfNotPresent
    env:
      - name: PORT
        value: "8080"

# kubectl exec myapp -- id
uid=1001 gid=1001
```



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

- probe 是由 kubelet 对容器执行的定期诊断，以保证 Pod 的状态始终是健康的
- 有的时候容器正常运行并不能代表容器中的服务是正常运行的，例如：
  - 一个 tomcat 的容器，容器正常运行 而tomcat宕掉，再或者tomcat 正常运行 而 jdk 不可用了，则都会导致服务无法正常访问，而使用探针就可以时刻监视着这些容器内的组件是否出现问题


**探针选择最佳实践**

- 通常 livenessProbe 和 readinessProbe 两者配合使用。livenessProbe 可以实现对 Pod 的周期性重构，readinessProbe 可以实现发现 Pod 故障及时从 service 中剔除

**探测方式最佳实践**

- exec 多用于一些支持单独状态检测命令的应用，如：redis的 redis-cli info 等...
- httpGet 多用于web服务，如：nginx、tomcat 等
- tcpSocket 不建议使用，因为有的时候端口存在并不代表服务是可用的

**参考文档：**

- https://kubernetes.io/zh-cn/docs/concepts/workloads/pods/pod-lifecycle/#container-probes
- https://kubernetes.io/zh-cn/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- https://kubernetes.io/zh-cn/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/#configure-probes

## startupProbe

- **容器启动后探测一次，而非周期性探测，探测成功后才会执行存活和就绪探针**

- 启动检查机制，应用一些启动缓慢的业务，避免业务长时间启动而被存活探针kill掉，**这个问题也可以换另一种方式解决，就是定义上面两类探针机制时，初始化时间定义的长一些即可。**

- 检测容器中的应用是否已经启动。如果提供了启动探针，则所有其他探针都会被 禁用，直到此探针成功为止。如果启动探测失败，kubelet 将杀死容器，而容器依其 重启策略进行重启。 如果容器没有提供启动探测，则默认状态为 Success。

**何时该使用启动探针？**

- 如果你的容器需要在启动期间加载大型数据、配置文件或执行迁移，你可以使用 startupProbe
- **如果你的容器启动时间通常超出 `initialDelaySeconds + failureThreshold × periodSeconds` 总值，你应该设置一个启动探测**，对存活态探针所使用的同一端点执行检查。 `periodSeconds` 的默认值是 10 秒。你应该将其 `failureThreshold` 设置得足够高， 以便容器有充足的时间完成启动，并且避免更改存活态探针所使用的默认值。 这一设置有助于减少死锁状况的发生。
- `Pod.spec.containers.startupProbe`

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp
spec:
  containers:
  - name: myapp
    image: nginx:1.23
    imagePullPolicy: IfNotPresent
    startupProbe:
      exec <Object>     # 命令式探针
      httpGet <Object>  # http GET类型的探针
      tcpSocket <Object>  # tcp Socket类型的探针
      initialDelaySeconds <integer>  # 发起初次探测请求的延后时长
      periodSeconds <integer>         # 请求周期
      timeoutSeconds <integer>        # 超时时长
      successThreshold <integer>      # 成功阈值
      failureThreshold <integer>       # 失败阈值
```

### 范例 - 1

#### yaml

```yml
# nginx-http-probe.yaml
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
          name: nginx
          protocol: TCP
        resources:
          requests:   
            cpu: 100m
            memory: 128Mi   
          limits:   
            cpu: 1   
            memory: 256Mi
        startupProbe: #startupProbe
          httpGet:
            path: /index.htmllllll #定义一个不存在的 uri
            port: 80
          initialDelaySeconds: 10
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3


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
  - name: nginx
    port: 80
    protocol: TCP
    targetPort: 80
    nodePort: 30080
  selector:
    app: nginx-deployment-label
```

#### 测试

```bash
#创建
# kubectl apply -f nginx-http-probe.yaml 
deployment.apps/nginx-deployment created
service/nginx-service created


#观察 pod 状态，因为无法找到探测所需的 uri，所以会报404，发现问题直接将 Pod 标记未 NOREADY 状态
# kubectl get pod
NAME                                READY   STATUS    RESTARTS      AGE
nginx-deployment-6f4745486c-stfdb   1/1     Running   3 (31s ago)   3m1s



#观察 service 状态，发现问题后直接将故障的 Pod 从 Endpoints 剔除
# kubectl describe service nginx-service 
Name:                     nginx-service
Namespace:                default
Labels:                   app=nginx-service
Annotations:              <none>
Selector:                 app=nginx-deployment-label
Type:                     NodePort
IP Family Policy:         SingleStack
IP Families:              IPv4
IP:                       192.168.0.165
IPs:                      192.168.0.165
Port:                     nginx  80/TCP
TargetPort:               80/TCP
NodePort:                 nginx  30080/TCP
Endpoints:                
Session Affinity:         None
External Traffic Policy:  Cluster
Events:                   <none>


# 过后 pod 会一直尝试重启
# kubectl get pod
NAME                               READY   STATUS             RESTARTS       AGE
nginx-deployment-b8dd769cc-5mvnc   0/1     CrashLoopBackOff   15 (86s ago)   38m



#重启成功则恢复，并加到 service Endpoints 中
# vim nginx-http-probe.yaml
...
            path: /index.html #修改为正确的 uri
...
# kubectl apply -f nginx-http-probe.yaml 
deployment.apps/nginx-deployment configured
service/nginx-service unchanged
# kubectl get pod
NAME                               READY   STATUS    RESTARTS   AGE
nginx-deployment-76847db55-4ctkx   1/1     Running   0          65s
# kubectl describe service nginx-service 
Name:                     nginx-service
Namespace:                default
Labels:                   app=nginx-service
Annotations:              <none>
Selector:                 app=nginx-deployment-label
Type:                     NodePort
IP Family Policy:         SingleStack
IP Families:              IPv4
IP:                       192.168.0.165
IPs:                      192.168.0.165
Port:                     nginx  80/TCP
TargetPort:               80/TCP
NodePort:                 nginx  30080/TCP
Endpoints:                10.10.1.55:80
Session Affinity:         None
External Traffic Policy:  Cluster
Events:                   <none>
```

#### 小结

- 使用就绪探针 readinessProbe，在**检测到 Pod 故障后直接在 service 上将故障 Pod 的 IP 下线**，后续会一直重启 Pod，Pod 恢复后会再加入到 service中

## livenessProbe

- 存活探针，**周期性检测**，判断容器是否正常运行。
- 根据用户自定义规则来判定 Pod 是否健康，如果 livenessProbe 探针探测到容器不健康，则 kubelet 会杀死容器（然后将 Pod 标记为 CrashLoopBackOff 状态），而后 kubelet 会根据重启策略 restartPolicy 的定义来决定是否重启该容器；
- 如未定义存活探针，则 kubelet 会认为容器的 livenessProbe 探针的返回值永远成功 即状态为 `Success`
- `pod.spec.containers.livenessProbe`

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp
spec:
  containers:
  - name: myapp
    image: nginx:1.23
    imagePullPolicy: IfNotPresent
    livenessProbe:
      exec <Object> # 命令式探针 
      httpGet <Object> # http GET类型的探针
      tcpSocket <Object>  # tcp Socket类型的探针
      initialDelaySeconds <integer>  # 延迟几秒后进行初次探测，主要防止如java服务初始启动较慢时还未启动成功就进行探测从而导致循环探测失败的现象产生，默认0秒
      periodSeconds <integer> # 探测间隔时间，默认10秒
      timeoutSeconds <integer> # 单次探测的超时时长，探测应用timeout后为失败，默认1秒
      successThreshold <integer> # 探测失败后，连续探测几次成功后，即认为成功。默认值是 1，此值对于就绪和启动探针必须设为1?
      failureThreshold <integer> # 当探测失败时，Kubernetes 的重试次数，默认值3次
                                 # 对存活探测而言，放弃就意味着重新启动容器
```



### 1

`livenessProbe` 支持以下参数：

1. `httpGet`: 使用 HTTP GET 请求来检查容器的健康状态。

   - `path` (string): 指定要发送 GET 请求的路径。
   - `port` (number): 指定要发送请求的端口号。

2. `exec`: 使用执行的命令来检查容器的健康状态。

   - `command` (array of strings): 指定要执行的命令。

3. `tcpSocket`: 使用 TCP 套接字检查容器的健康状态。

   - `port` (number or string): 指定要检查的端口号。

4. `initialDelaySeconds` (number): 容器启动后开始执行首次探测之前等待的时间（以秒为单位）。

5. `timeoutSeconds` (number): 探测失败前等待探测响应的时间（以秒为单位）。

6. `periodSeconds` (number): 执行探测之间的间隔时间（以秒为单位）。

7. `successThreshold` (number): 在连续成功后认为容器是健康的探测次数。

8. `failureThreshold` (number): 在连续失败后认为容器是不健康的探测次数。

这些参数允许 Kubernetes 在容器运行时周期性地执行健康检查，以确保容器正常工作。通过这些检查，Kubernetes 可以确定是否需要重新启动容器，以维持应用程序的可用性。



## readinessProbe

- 就绪探针，**周期性检测**，探测容器是否准备好为对外提供服务；
- 根据用户自定义规则来判断 Pod 是否健康，如果探测失败，端点控制器（Endpoint Control）会将此 Pod 从对应 service 的 endpoint 列表中移除，从此不再将任何请求调度到此Pod上，直到下次探测成功。
  - 初始延迟之前的就绪态的状态值默认为 `Failure`。 
- 如未定义就绪探针，则只要容器未终止，即为就绪； 
- `pod.spec.containers.readinessProbe`

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp
spec:
  containers:
  - name: myapp
    image: nginx:1.23
    imagePullPolicy: IfNotPresent
    readinessProbe:
      exec <Object>     # 命令式探针
      httpGet <Object>  # http GET类型的探针
      tcpSocket <Object>  # tcp Socket类型的探针
      initialDelaySeconds <integer>  # 发起初次探测请求的延后时长
      periodSeconds <integer>         # 请求周期
      timeoutSeconds <integer>        # 超时时长
      successThreshold <integer>      # 成功阈值
      failureThreshold <integer> # 当探测失败时，Kubernetes 的重试次数，默认值3次
                                 # 对就绪探测而言，放弃意味着 Pod 会被打上未就绪的标签
```

### 范例 - 1

#### 定义 yaml 文件

```yml
# nginx-http-probe.yaml
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
          name: nginx
          protocol: TCP
        resources:
          requests:   
            cpu: 100m
            memory: 128Mi   
          limits:   
            cpu: 1   
            memory: 256Mi
        readinessProbe: #readinessProbe
          httpGet:
            path: /index.htmllllll #定义一个不存在的 uri
            port: 80
          initialDelaySeconds: 10
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3

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
  - name: nginx
    port: 80
    protocol: TCP
    targetPort: 80
    nodePort: 30080
  selector:
    app: nginx-deployment-label
```

#### 测试

```bash
# 创建
# kubectl apply -f nginx-http-probe.yaml 
deployment.apps/nginx-deployment created
service/nginx-service created


# 观察 pod 状态
# 因为无法找到探测所需的 uri，所以会报404，发现问题直接将 Pod 标记未 NOREADY 状态
# kubectl get pod
NAME                                READY   STATUS    RESTARTS   AGE
nginx-deployment-695cd5649c-zvs8v   0/1     Running   0          2m10s


# 观察 service 状态
# 发现问题后直接将故障的 Pod 从 Endpoints 剔除
# kubectl describe service nginx-service 
Name:                     nginx-service
Namespace:                default
Labels:                   app=nginx-service
Annotations:              <none>
Selector:                 app=nginx-deployment-label
Type:                     NodePort
IP Family Policy:         SingleStack
IP Families:              IPv4
IP:                       192.168.0.164
IPs:                      192.168.0.164
Port:                     nginx  80/TCP
TargetPort:               80/TCP
NodePort:                 nginx  30080/TCP
Endpoints:                
Session Affinity:         None
External Traffic Policy:  Cluster
Events:                   <none>



#后续不会对 pod 执行重启操作
# kubectl get pod
NAME                               READY   STATUS             RESTARTS       AGE
nginx-deployment-b8dd769cc-5mvnc   0/1     CrashLoopBackOff   15 (86s ago)   38m
```

#### 小结

- **检测到 Pod 故障后立刻在 service 上将故障 Pod 的 IP 下线，后续不会对 pod 执行重启操作**

### 范例 - 存活+就绪探针

- 就绪和存活探测可以在同一个容器上并行使用。 **这也是通常的操作**

#### yaml

```yml
# nginx-http-probe.yaml
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
          name: nginx
          protocol: TCP
        resources:
          requests:   
            cpu: 100m
            memory: 128Mi   
          limits:   
            cpu: 1   
            memory: 256Mi
        livenessProbe: #livenessProbe
          httpGet:
            path: /index.htmllllll #定义一个不存在的 uri
            port: 80
          initialDelaySeconds: 10
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe: #readinessProbe
          httpGet:
            path: /index.htmllllll #定义一个不存在的 uri
            port: 80
          initialDelaySeconds: 10
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3

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
  - name: nginx
    port: 80
    protocol: TCP
    targetPort: 80
    nodePort: 30080
  selector:
    app: nginx-deployment-label
```

#### 测试

```bash
#创建
# kubectl apply -f nginx-http-probe.yaml 
deployment.apps/nginx-deployment created
service/nginx-service created


#观察 pod 状态
#发现问题直接将 Pod 标记未 NOREADY 状态，但后续会根据存活探针指定的阈值反复对 Pod 进行重构
# kubectl get pod
NAME                                READY   STATUS    RESTARTS      AGE
nginx-deployment-5c6968b58f-vx8gb   0/1     Running   2 (19s ago)   119s



#观察 service 状态
#发现问题后直接将故障的 Pod 从 Endpoints 剔除
# kubectl describe service nginx-service 
Name:                     nginx-service
Namespace:                default
Labels:                   app=nginx-service
Annotations:              <none>
Selector:                 app=nginx-deployment-label
Type:                     NodePort
IP Family Policy:         SingleStack
IP Families:              IPv4
IP:                       192.168.0.164
IPs:                      192.168.0.164
Port:                     nginx  80/TCP
TargetPort:               80/TCP
NodePort:                 nginx  30080/TCP
Endpoints:                
Session Affinity:         None
External Traffic Policy:  Cluster
Events:                   <none>


# 模拟pod恢复
# kubectl exec -it nginx-deployment-5c6968b58f-vx8gb -- bash
root@nginx-deployment-5c6968b58f-vx8gb:/#mv /usr/share/nginx/html/index.html /usr/share/nginx/html/index.htmllllll


# 当检测到 Pod 恢复后，会将 Pod 标记为 READY 状态，并加入到 service中正常对外提供服务
# kubectl get pod
NAME                                READY   STATUS    RESTARTS      AGE
nginx-deployment-5c6968b58f-vx8gb   1/1     Running   5 (61s ago)   5m1s
root@k8s-master:~# kubectl describe service nginx-service
Name:                     nginx-service
Namespace:                default
Labels:                   app=nginx-service
Annotations:              <none>
Selector:                 app=nginx-deployment-label
Type:                     NodePort
IP Family Policy:         SingleStack
IP Families:              IPv4
IP:                       192.168.11.161
IPs:                      192.168.11.161
Port:                     nginx  80/TCP
TargetPort:               80/TCP
NodePort:                 nginx  30080/TCP
Endpoints:                10.10.1.57:80
Session Affinity:         None
External Traffic Policy:  Cluster
Events:                   <none>

```

#### 小结

- **livenessProbe 和 readinessProbe 并存，可以确保流量不会发给还未就绪的容器，并且当容器探测失败时会将其删除重构。**



## ---

## exec

- ExecAction，在容器内执行命令，命令执行成功则表示探测成功；
- 当$?返回结果为0时，kubelet 则认为容器是健康的，不做任何处理；
- 当$?返回结果为非0时，则认为容器是非健康的，kubelet 会杀死这个容器并重新启动它，然后根据定义的重启策略来对进行相应的操作

### 范例 - livenessProbe - 1

#### 实验镜像

```sh
# kubectl run myapp --image=ikubernetes/demoapp:v1.0
pod/myapp created


# kubectl get pod -o wide 
NAME    READY   STATUS    RESTARTS   AGE   IP          
myapp   1/1     Running   0          30s   10.244.1.253


# 该镜像提供了健康检测的对外接口
# curl 10.244.1.253/livez
OK


# 支持使用 POST 方法修改 livez 的返回结果
# curl -XPOST -d 'livez=FAIL' 10.244.1.253/livez
# curl 10.244.1.253/livez
FAIL
# curl -XPOST -d 'livez=ERROR' 10.244.1.253/livez
# curl 10.244.1.253/livez
ERROR
```

#### yaml

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: liveness-exec-demo
spec:
  containers:
  - name: demo
    image: ikubernetes/demoapp:v1.0
    imagePullPolicy: IfNotPresent
    livenessProbe:
      exec:
        command: ['/bin/sh', '-c', '[ "$(curl -s 127.0.0.1/livez)" == "OK" ]']
      initialDelaySeconds: 5
      timeoutSeconds: 1
      periodSeconds: 5
```

#### 测试

```yaml
# kubectl get pod
NAME                 READY   STATUS    RESTARTS   AGE
liveness-exec-demo   1/1     Running   0          3s
# kubectl describe pod liveness-exec-demo 
Name:         liveness-exec-demo
...
Status:       Running
IP:           10.244.1.254
...
Containers:
  demo:
...
    Restart Count:  0
    Liveness:       exec [/bin/sh -c [ "$(curl -s 127.0.0.1/livez)" == "OK" ]] delay=5s timeout=1s period=5s #success=1 #failure=3
...


# curl 10.244.1.254/livez
OK


# curl -XPOST -d 'livez=FAIL' 10.244.1.254/livez


# curl 10.244.1.254/livez
FAIL


# 大约过20秒后pod根据默认的重启策略将pod中的容器重建后恢复正常
# （period=5s + timeout=1s ）* #failure=3 ≈ 18秒
# curl 10.244.1.254/livez
OK

# kubectl get pod
NAME                 READY   STATUS    RESTARTS       AGE
liveness-exec-demo   1/1     Running   1 (9m6s ago)   14m
# kubectl describe pod liveness-exec-demo 
Name:         liveness-exec-demo
...
Status:       Running
IP:           10.244.1.254 # 只是重建Pod中的容器，因此Pod ip不会改变
...
Containers:
  demo:
...
    Restart Count:  1 # 根据默认的重启策略重建1次
    Liveness:       exec [/bin/sh -c [ "$(curl -s 127.0.0.1/livez)" == "OK" ]] delay=5s timeout=1s period=5s #success=1 #failure=3
...
```



### 范例 - livenessProbe - 2

##### yaml

- 下面以 redis 实现 exec 探针举例

```yml
# vim myapp.yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp
spec:
  containers:
  - name: myapp
    image: redis:6.2.8
    imagePullPolicy: IfNotPresent
    livenessProbe: #存活探测
      exec: #执行命令探测
        command: #执行的命令
        - /usr/local/bin/redis-cli
        - info
      # 探测前等待10秒，之后每10秒探测一次，超过5秒则认为探测失败，探测失败后重试3次，3次重试都失败后则根据重启策略执行下一步操作。
      initialDelaySeconds: 10 # 在执行第一次探测前等待10秒
      periodSeconds: 10 # kubelet每10秒执行一次存活探测
      timeoutSeconds: 5 # 超过5秒则认为超时
      failureThreshold: 3 # 重试3次
```

##### 验证

```bash
# kubectl get pod
NAME    READY   STATUS    RESTARTS   AGE
myapp   1/1     Running   0          32s


# 删除执行命令的文件
# kubectl exec myapp -- rm -f /usr/local/bin/redis-cli


# 到达设定的阈值后 Pod 会删除重构 并恢复正常运行
# kubectl get pod
NAME    READY   STATUS    RESTARTS      AGE
myapp   1/1     Running   1 (40s ago)   2m40s

# kubectl describe pod myapp
...
Events:
  Type     Reason     Age                 From               Message
  ----     ------     ----                ----               -------
  Normal   Scheduled  3m23s               default-scheduler  Successfully assigned default/myapp to k8s-node-1
  Normal   Pulling    3m19s               kubelet            Pulling image "redis:6.2.8"
  Normal   Pulled     3m9s                kubelet            Successfully pulled image "redis:6.2.8" in 9.842129614s
  Warning  Unhealthy  83s (x3 over 103s)  kubelet            Liveness probe failed: OCI runtime exec failed: exec failed: unable to start container process: exec: "/usr/local/bin/redis-cli": stat /usr/local/bin/redis-cli: no such file or directory: unknown
  Normal   Killing    83s                 kubelet            Container myapp failed liveness probe, will be restarted
  Normal   Pulled     83s                 kubelet            Container image "redis:6.2.8" already present on machine
  Normal   Created    82s (x2 over 3m9s)  kubelet            Created container myapp
  Normal   Started    82s (x2 over 3m8s)  kubelet            Started container myapp

```



## httpGet

- HTTPGetAction：向指定的path发HTTP请求，2xx, 3xx的响应码表示成功；

- 对指定的访问路径和端口上的容器的IP地址发起 HTTP GET 请求
- 返回大于或等于 200 并且小于 400 的任何代码都标示成功，其它返回代码都标示失败，然后根据定义的重启策略来对进行相应的操作

```yaml
# vim myapp.yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp
spec:
  containers:
  - name: myapp
    image: redis:6.2.8
    imagePullPolicy: IfNotPresent
    livenessProbe:
      httpGet:
        path <string> # 访问 HTTP 服务的路径。默认值为 "/"。可以定义专用于检测的路径 但要注意后期更新镜像时此路径需存在 否则会因为探测不到而导致 Pod 无法正常运行
        port <string> -required- # 访问容器的端口号或者端口名，名称必须是IANA_SVC_NAME
        host <string> # 连接使用的主机名，默认是 Pod 的 IP。也可以在 HTTP 头中设置 “Host” 来代替。
        scheme <string> # 用于设置连接主机的方式（HTTP 还是 HTTPS）。默认是 "HTTP"。
        httpHeaders	<[]Object> # 请求中自定义的 HTTP 头。HTTP 头字段允许重复。
      initialDelaySeconds: 10
      periodSeconds: 10
      timeoutSeconds: 5
      failureThreshold: 3
```

### 范例 - livenessProbe - 1

#### 实验镜像

```sh
# kubectl run myapp --image=ikubernetes/demoapp:v1.0
pod/myapp created


# kubectl get pod -o wide 
NAME    READY   STATUS    RESTARTS   AGE   IP          
myapp   1/1     Running   0          30s   10.244.1.5


# 该镜像提供了健康检测的对外接口，只有返回OK时状态码才为200
# curl 10.244.1.5/livez
OK
# curl -I 10.244.1.5/livez
HTTP/1.0 200 OK
Content-Type: text/html; charset=utf-8
Content-Length: 2
Server: Werkzeug/1.0.0 Python/3.8.2
Date: Sat, 24 Dec 2022 15:00:24 GMT


# 支持使用 POST 方法修改 livez 的返回结果
# curl -XPOST -d 'livez=FAIL' 10.244.1.5/livez


# 只要返回值不是OK则返回5XX响应码
# curl 10.244.1.5/livez
FAIL
# curl -I 10.244.1.5/livez
HTTP/1.0 506 VARIANT ALSO NEGOTIATES
Content-Type: text/html; charset=utf-8
Content-Length: 4
Server: Werkzeug/1.0.0 Python/3.8.2
Date: Sat, 24 Dec 2022 15:01:00 GMT
```

#### yaml

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: readiness-httpget-demo
spec:
  containers:
  - name: demo
    image: ikubernetes/demoapp:v1.0
    imagePullPolicy: IfNotPresent
    readinessProbe:
      httpGet:
        path: '/readyz'
        port: 80
        scheme: HTTP
      initialDelaySeconds: 15
      timeoutSeconds: 2
      periodSeconds: 5
      failureThreshold: 3
  restartPolicy: Always
```

#### 测试

```yaml
# kubectl get pod
NAME                    READY   STATUS    RESTARTS   AGE
liveness-httpget-demo   1/1     Running   0          7s
# kubectl describe pod liveness-httpget-demo 
Name:         liveness-httpget-demo
...
Status:       Running
IP:           10.244.1.3
...
Containers:
  demo:
...
    Restart Count:  0
    Liveness:       http-get http://:80/livez delay=5s timeout=1s period=10s #success=1 #failure=3
...


# curl 10.244.1.3/livez
OK
# curl -I 10.244.1.3/livez
HTTP/1.0 200 OK
Content-Type: text/html; charset=utf-8
Content-Length: 2
Server: Werkzeug/1.0.0 Python/3.8.2
Date: Sat, 24 Dec 2022 15:00:24 GMT


# 支持使用 POST 方法修改 livez 的返回结果
# curl -XPOST -d 'livez=FAIL' 10.244.1.3/livez


# 只要返回值不是OK则返回5XX响应码
# curl 10.244.1.3/livez
FAIL
# curl -I 10.244.1.3/livez
HTTP/1.0 506 VARIANT ALSO NEGOTIATES
Content-Type: text/html; charset=utf-8
Content-Length: 4
Server: Werkzeug/1.0.0 Python/3.8.2
Date: Sat, 24 Dec 2022 15:01:00 GMT


# 大约过35秒后pod根据默认的重启策略将pod中的容器重建后恢复正常（35秒只是容器开始重建的时间）
# （period=10s + timeout=1s ）* #failure=3 ≈ 33秒
# curl 10.244.1.3/livez
OK

# kubectl get pod
NAME                    READY   STATUS    RESTARTS        AGE
liveness-httpget-demo   1/1     Running   1 (2m42s ago)   7m2s
# kubectl describe pod liveness-httpget-demo 
Name:         liveness-httpget-demo
...
Status:       Running
IP:           10.244.1.3 # 只是重建Pod中的容器，因此Pod ip不会改变
...
Containers:
  demo:
...
    Restart Count:  1 # 根据默认的重启策略将Pod中的容器重建一次
    Liveness:       http-get http://:80/livez delay=5s timeout=1s period=10s #success=1 #failure=3
...
```



### 范例 - livenessProbe - 2

#### yaml

- 下面以 nginx 镜像举例

```yml
# vim myapp.yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp
spec:
  containers:
  - name: myapp
    image: redis:6.2.8
    imagePullPolicy: IfNotPresent
    livenessProbe:
      httpGet:
        path: /index.html #访问 HTTP 服务的路径。默认值为 "/"。可以定义专用于检测的路径 但要注意后期更新镜像时此路径需存在 否则会因为探测不到而导致 Pod 无法正常运行
        port: 80 # 访问容器的端口号或者端口名
      initialDelaySeconds: 10
      periodSeconds: 10
      timeoutSeconds: 5
      failureThreshold: 3
```

#### 测试

```bash
#创建
# kubectl apply -f nginx-exec-probe.yaml 
deployment.apps/nginx-deployment created
service/nginx-service created


#查看目前正常运行状态
# kubectl get pod
NAME                                READY   STATUS    RESTARTS   AGE
nginx-deployment-8688c99d55-8wbnc   1/1     Running   0          4m34s


#进入容器并删除页面文件
# kubectl exec -it nginx-deployment-8688c99d55-8wbnc -- bash
root@nginx-deployment-8688c99d55-8wbnc:/# rm -f /usr/share/nginx/html/index.html 


#观察pod的信息
# kubectl describe pod nginx-deployment-8688c99d55-8wbnc
...
Events:
  Type     Reason     Age               From               Message
  ----     ------     ----              ----               -------
...
  Warning  Unhealthy  0s     kubelet            Liveness probe failed: HTTP probe failed with statuscode: 404



#到达设定的阈值后pod会重启 并恢复正常运行
# kubectl get pod
NAME                                READY   STATUS    RESTARTS      AGE
nginx-deployment-8688c99d55-8wbnc   1/1     Running   1 (71s ago)   7m42s
# kubectl describe pod nginx-deployment-8688c99d55-8wbnc
...
Events:
  Type     Reason     Age               From               Message
  ----     ------     ----              ----               -------
...
  Warning  Unhealthy  80s (x3 over 100s)   kubelet            Liveness probe failed: HTTP probe failed with statuscode: 404
  Normal   Killing    80s                  kubelet            Container nginx-container failed liveness probe, will be restarted
  Normal   Created    64s (x2 over 7m48s)  kubelet            Created container nginx-container
  Normal   Started    64s (x2 over 7m48s)  kubelet            Started container nginx-container
  Normal   Pulled     64s                  kubelet            Successfully pulled image "nginx" in 15.923026745s
```

### 范例 - readinessProbe - 1

#### 实验镜像

```sh
# kubectl run myapp --image=ikubernetes/demoapp:v1.0
pod/myapp created


# kubectl get pod -o wide 
NAME    READY   STATUS    RESTARTS   AGE   IP          
myapp   1/1     Running   0          30s   10.244.1.6


# 该镜像提供了健康检测的对外接口，只有返回OK时状态码才为200
# curl -i 10.244.1.6/readyz
HTTP/1.0 200 OK
Content-Type: text/html; charset=utf-8
Content-Length: 2
Server: Werkzeug/1.0.0 Python/3.8.2
Date: Sat, 24 Dec 2022 15:31:03 GMT

OK


# 支持使用 POST 方法修改 readyz 的返回结果
# curl -XPOST -d 'readyz=FAIL' 10.244.1.6/readyz


# 只要返回值不是OK则返回5XX响应码
# curl -i 10.244.1.6/readyz
HTTP/1.0 507 INSUFFICIENT STORAGE
Content-Type: text/html; charset=utf-8
Content-Length: 4
Server: Werkzeug/1.0.0 Python/3.8.2
Date: Sat, 24 Dec 2022 15:36:05 GMT

FAIL
```

#### yaml

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: readiness-httpget-demo
  labels:
    app: readiness-httpget-demo
spec:
  containers:
  - name: demo
    image: ikubernetes/demoapp:v1.0
    imagePullPolicy: IfNotPresent
    readinessProbe:
      httpGet:
        path: '/readyz'
        port: 80
        scheme: HTTP
      initialDelaySeconds: 15
      timeoutSeconds: 2
      periodSeconds: 5
      failureThreshold: 3
  restartPolicy: Always

---

kind: Service
apiVersion: v1
metadata:
  labels:
    app: demo-service
  name: demo-service
spec:
  type: NodePort
  ports:
  - name: nginx
    port: 80
    protocol: TCP
    targetPort: 80
    nodePort: 30080
  selector:
    app: readiness-httpget-demo
```

#### 测试

##### 刚启动时

```yaml
# 刚启动时因未达到就绪探针的探测成功阈值，因此处于未就绪（READY 0/1，左边的0表示处于就绪状态的容器数量，右边的1表示容器的总数）
# kubectl get pod -o wide 
NAME                     READY   STATUS    RESTARTS   AGE   IP          
readiness-httpget-demo   0/1     Running   0          9s    10.244.1.8

# kubectl get svc demo-service 
NAME           TYPE       CLUSTER-IP       EXTERNAL-IP   PORT(S)        AGE
demo-service   NodePort   10.100.217.175   <none>        80:30080/TCP   6s

# 未探测成功则不会将其加入到ENDPOINTS
# kubectl get ep demo-service 
NAME           ENDPOINTS   AGE
demo-service               13s

---

# 达到探测成功的阈值后会处于就绪状态
# kubectl get pod -o wide 
NAME                     READY   STATUS    RESTARTS   AGE   IP          
readiness-httpget-demo   1/1     Running   0          115s  10.244.1.8

# 达到探测成功的阈值后Pod会加入到ENDPOINTS
# kubectl get ep demo-service
NAME           ENDPOINTS       AGE
demo-service   10.244.1.8:80   3m7s
```

##### 模拟故障

```yaml
# curl 10.100.217.175
iKubernetes demoapp v1.0 !! ClientIP: 10.244.0.0, ServerName: readiness-httpget-demo, ServerIP: 10.244.1.8!

---

# curl -XPOST -d 'readyz=FAIL' 10.100.217.175/readyz
# curl -i 10.100.217.175/readyz
HTTP/1.0 507 INSUFFICIENT STORAGE
Content-Type: text/html; charset=utf-8
Content-Length: 4
Server: Werkzeug/1.0.0 Python/3.8.2
Date: Sat, 24 Dec 2022 16:02:50 GMT

FAIL


# 正常运行但未就绪
# kubectl get pod -o wide 
NAME                     READY   STATUS    RESTARTS   AGE   IP       
readiness-httpget-demo   0/1     Running   0          14m   10.244.1.8 

# 从ENDPOINTS中剔除
# kubectl get ep demo-service
NAME           ENDPOINTS   AGE
demo-service               19m

# curl 10.100.217.175
curl: (7) Failed to connect to 10.100.217.175 port 80: Connection refused

---

# curl -XPOST -d 'readyz=OK' 10.244.1.8/readyz
# curl -i 10.244.1.8/readyz
HTTP/1.0 200 OK
Content-Type: text/html; charset=utf-8
Content-Length: 2
Server: Werkzeug/1.0.0 Python/3.8.2
Date: Sat, 24 Dec 2022 16:11:43 GMT

OK


# kubectl get pod -o wide 
NAME                     READY   STATUS    RESTARTS   AGE   IP       
readiness-httpget-demo   1/1     Running   0          14m   10.244.1.8 

# kubectl get ep demo-service
NAME           ENDPOINTS       AGE
demo-service   10.244.1.8:80   23m


# curl 10.100.217.175
iKubernetes demoapp v1.0 !! ClientIP: 10.244.0.0, ServerName: readiness-httpget-demo, ServerIP: 10.244.1.8!
```



## tcpSocket

- 对指定端口上的容器IP发起TCP探测，如果可以与其建立TCP连接，则认为成功，反之则失败，然后根据定义的重启策略来对进行相应的操作

### 范例 - livenessProbe - 1

#### yaml

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: liveness-tcpsocket-demo
spec:
  containers:
  - name: demo
    image: ikubernetes/demoapp:v1.0
    imagePullPolicy: IfNotPresent
    ports:
    - name: http
      containerPort: 80
    securityContext:
      capabilities:
        add:
        - NET_ADMIN # 为了测试时添加iptables规则所定义
    livenessProbe:
      tcpSocket:
        port: http # 调用的spec.containers.ports.name，因此相当于直接填写80
                   # 向当前容器的80端口发起TCP探测，只要第一次握手能得到响应即认为成功。
      periodSeconds: 5
      initialDelaySeconds: 5
```

#### 验证

```yaml
# kubectl get pod
NAME                      READY   STATUS    RESTARTS   AGE
liveness-tcpsocket-demo   1/1     Running   0          3s
# kubectl describe pod liveness-tcpsocket-demo
Name:         liveness-tcpsocket-demo
...
Status:       Running
IP:           10.244.1.4
...
Containers:
  demo:
...
    Restart Count:  0
    Liveness:       tcp-socket :http delay=5s timeout=1s period=5s #success=1 #failure=3
...


# 拒绝80端口访问后将探测失败
# kubectl exec liveness-tcpsocket-demo -- iptables -A INPUT -p tcp --dport 80 -j REJECT



# kubectl get pod
NAME                      READY   STATUS    RESTARTS     AGE
liveness-tcpsocket-demo   1/1     Running   2 (9s ago)   7m35s
# kubectl describe pod liveness-httpget-demo 
Events:
  Type     Reason     Age                 From               Message
  ----     ------     ----                ----               -------
  Normal   Scheduled  6m42s               default-scheduler  Successfully assigned default/liveness-tcpsocket-demo to k8s-node-1
  Warning  Unhealthy  37s (x3 over 47s)   kubelet            Liveness probe failed: dial tcp 10.244.1.4:80: i/o timeout
  Normal   Killing    37s                 kubelet            Container demo failed liveness probe, will be restarted
  Normal   Pulled     7s (x2 over 6m42s)  kubelet            Container image "ikubernetes/demoapp:v1.0" already present on machine
  Normal   Created    7s (x2 over 6m42s)  kubelet            Created container demo
  Normal   Started    6s (x2 over 6m42s)  kubelet            Started container demo

```



### 范例 - livenessProbe - 2

#### 定义 yaml 文件

```yml
# nginx-tcp-probe.yaml
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
          name: nginx
          protocol: TCP
        resources:
          requests:   
            cpu: 100m
            memory: 128Mi   
          limits:   
            cpu: 1   
            memory: 256Mi
        livenessProbe:
          tcpSocket:
            port: 80 #访问容器的端口号，数字必须在 1～65535 之间。
          initialDelaySeconds: 10
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3


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
  - name: nginx
    port: 80
    protocol: TCP
    targetPort: 80
    nodePort: 30080
  selector:
    app: nginx-deployment-label
```

#### 测试

```bash
#创建
# kubectl apply -f nginx-tcp-probe.yaml
deployment.apps/nginx-deployment created
service/nginx-service created


#查看目前正常运行状态
# kubectl get pod
NAME                                READY   STATUS    RESTARTS   AGE
nginx-deployment-5bd59b89f4-klfps   1/1     Running   0          4m34s


#进入容器并修改nginx的端口号
# kubectl exec -it nginx-deployment-5bd59b89f4-klfps -- bash
root@nginx-deployment-5bd59b89f4-klfps:/# sed -ri "s|( +listen +)80;|\181;|" /etc/nginx/conf.d/default.conf   
root@nginx-deployment-5bd59b89f4-klfps:/# cat /etc/nginx/conf.d/default.conf|grep listen
    listen       81;
    listen  [::]:80;
root@nginx-deployment-5bd59b89f4-klfps:/# /usr/sbin/nginx -s reload  



#到达设定的阈值后pod会重启 并恢复正常运行
# kubectl get pod
NAME                                READY   STATUS    RESTARTS      AGE
nginx-deployment-5bd59b89f4-klfps   1/1     Running   1 (71s ago)   7m42s


#日志信息
# kubectl describe pod nginx-deployment-5bd59b89f4-klfps
...
Events:
  Type     Reason     Age               From               Message
  ----     ------     ----              ----               -------
...
  Warning  Unhealthy  20s (x3 over 40s)  kubelet            Liveness probe failed: dial tcp 10.10.1.51:80: connect: connection refused
  Normal   Killing    20s                kubelet            Container nginx-container failed liveness probe, will be restarted
  Normal   Pulling    19s (x2 over 35m)  kubelet            Pulling image "nginx"
  Normal   Created    3s (x2 over 35m)   kubelet            Created container nginx-container
  Normal   Started    3s (x2 over 35m)   kubelet            Started container nginx-container
  Normal   Pulled     3s                 kubelet            Successfully pulled image "nginx" in 16.014527139s
```

### 范例 - livenessProbe - 3

- 下面例子使用 nginx 镜像，httpGet 的探测方法

#### yaml

```yml
# nginx-http-probe.yaml
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
          name: nginx
          protocol: TCP
        resources:
          requests:   
            cpu: 100m
            memory: 128Mi   
          limits:   
            cpu: 1   
            memory: 256Mi
        livenessProbe: # livenessProbe
          httpGet:
            path: /index.htmllllll #定义一个不存在的 uri
            port: 80
          initialDelaySeconds: 10
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3

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
  - name: nginx
    port: 80
    protocol: TCP
    targetPort: 80
    nodePort: 30080
  selector:
    app: nginx-deployment-label
```

#### 测试

```bash
#创建
# kubectl apply -f nginx-http-probe.yaml 
deployment.apps/nginx-deployment created
service/nginx-service created


#观察 pod 状态，因为无法找到探测所需的 uri，所以会报404，进而一致反复重启
# kubectl get pod
NAME                                READY   STATUS    RESTARTS      AGE
nginx-deployment-6f4745486c-stfdb   1/1     Running   3 (31s ago)   3m1s



#观察 service 状态，未作任何更改，Endpoints 的 10.10.1.52:80 一直和 service 相关联
# kubectl describe service nginx-service 
Name:                     nginx-service
Namespace:                default
Labels:                   app=nginx-service
Annotations:              <none>
Selector:                 app=nginx-deployment-label
Type:                     NodePort
IP Family Policy:         SingleStack
IP Families:              IPv4
IP:                       192.168.13.29
IPs:                      192.168.13.29
Port:                     nginx  80/TCP
TargetPort:               80/TCP
NodePort:                 nginx  30080/TCP
Endpoints:                10.10.1.52:80 #未剔除
Session Affinity:         None
External Traffic Policy:  Cluster
Events:                   <none>


#failureThreshold 重试次数上线后，故障的 Pod 会被打上 NO READY 的标签
# kubectl get pod -o wide 
NAME                                READY   STATUS             RESTARTS      AGE   IP           NODE         NOMINATED NODE   READINESS GATES
nginx-deployment-6f4745486c-stfdb   0/1     CrashLoopBackOff   7 (52s ago)   11m   10.10.1.52   k8s-work-1   <none>           <none>


# 从 service 中下线
# kubectl describe service nginx-service 
Name:                     nginx-service
Namespace:                default
Labels:                   app=nginx-service
Annotations:              <none>
Selector:                 app=nginx-deployment-label
Type:                     NodePort
IP Family Policy:         SingleStack
IP Families:              IPv4
IP:                       192.168.13.29
IPs:                      192.168.13.29
Port:                     nginx  80/TCP
TargetPort:               80/TCP
NodePort:                 nginx  30080/TCP
Endpoints:                
Session Affinity:         None
External Traffic Policy:  Cluster
Events:                   <none>
```

#### 小结

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

