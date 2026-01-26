---
title: "DaemonSet"
weight: 10
---

# DaemonSet 概述

- DaemonSet 守护进程集，简称ds
- DaemonSet 默认在每个节点运行一个守护进程应用的Pod副本作为后台进程运行；
  - 也可以通过给节点打标签，然后 DaemonSet 选择节点标签的方式实现运行在部分节点

- DaemonSet 的应用通常使用 hostPort 监听在宿主机的端口来进行使用
- 由于 DaemonSet 控制器创建的 Pod 实际上提前已经确定了在哪个节点上了（Pod创建时指定了.spec.nodeName），所以 DaemonSet 并不关心节点的unshedulable字段？

**DaemonSet 常见应用场景：**

- 集群存储守护程序，如glusterd、ceph要部署在每个节点上以提供持久性存储；
- 节点监视守护进程，如Prometheus监控集群，可以在每个节点上运行一个node-exporter进程来收集监控节点的信息；
- 日志收集守护程序，如fluentd或logstash，在每个节点上运行以收集容器的日志





# DaemonSet Explain

```yaml
apiVersion: apps/v1  # API群组及版本
kind: DaemonSet  # 资源类型特有标识
metadata:
  name <string>  # 资源名称，在作用域中要唯一
  namespace <string>  # 名称空间；DaemonSet资源隶属名称空间级别
spec:
  minReadySeconds <integer>  # Pod就绪后多少秒内任一容器无crash方可视为“就绪”
  selector <object> # 标签选择器，必须匹配template字段中Pod模板中的标签
  revisionHistoryLimit <integer> # 滚动更新历史记录数量，默认为10；
  updateStrategy <Object> # 滚动更新策略
    type <string>  # 滚动更新类型，可用值有OnDelete和RollingUpdate，OnDelete表示删除后更新，默认RollingUpdate
    rollingUpdate <Object>  # 滚动更新参数，专用于RollingUpdate类型，默认1
      maxUnavailable <string>  # 更新期间可比期望的Pod数量缺少的数量或比例
  template <object>  # Pod模板对象；
    ...
```

## updateStrategy

- DaemonSet 更新时只支持 maxUnavailable，且默认值为1，即在一个节点删除重建后继续下一个节点
  - 没有 maxSurge 是因为本身 DaemonSet 就是在每个节点运行一个守护进程，如果能设置 maxSurge 的话，在更新过程中将会在节点运行2个以上相同的守护进程（例如：运行了2个file-bit同时收集了日志，运行了3个node-exporter同时采集节点信息...）这样可能会出现问题。


```bash
# node-2更新pod
# kubectl get pod -o wide | awk '{print $1,$2,$3,$7}' | column -t
NAME                           READY  STATUS   NODE
daemonset-node-exporter-lwwjd  0/1    Terminating  k8s-node-2
daemonset-node-exporter-v2lfd  1/1    Running  k8s-node-1

# node-2探针探测ing
# kubectl get pod -o wide | awk '{print $1,$2,$3,$7}' | column -t
NAME                           READY  STATUS   NODE
daemonset-node-exporter-lwwjd  0/1    Running  k8s-node-2
daemonset-node-exporter-v2lfd  1/1    Running  k8s-node-1

# node-2探针探测成功后，node-1开始更新pod
# kubectl get pod -o wide | awk '{print $1,$2,$3,$7}' | column -t
NAME                           READY  STATUS       NODE
daemonset-node-exporter-lwwjd  1/1    Running      k8s-node-2
daemonset-node-exporter-v2lfd  1/1    Terminating  k8s-node-1

# node-1探针探测ing
# kubectl get pod -o wide | awk '{print $1,$2,$3,$7}' | column -t
NAME                           READY  STATUS   NODE
daemonset-node-exporter-2m7ft  0/1    Running  k8s-node-1
daemonset-node-exporter-lwwjd  1/1    Running  k8s-node-2

# 全部更新完成
# kubectl get pod -o wide | awk '{print $1,$2,$3,$7}' | column -t
NAME                           READY  STATUS   NODE
daemonset-node-exporter-2m7ft  1/1    Running  k8s-node-1
daemonset-node-exporter-lwwjd  1/1    Running  k8s-node-2
```











# DaemonSet Example

## k8s 默认的 DaemonSet 应用

### kube-proxy

```sh
# kubectl get daemonset -n kube-system kube-proxy 
NAME         DESIRED   CURRENT   READY   UP-TO-DATE   AVAILABLE   NODE SELECTOR            AGE
kube-proxy   3         3         3       3            3           kubernetes.io/os=linux   110d


# kubectl get pod -n kube-system -l k8s-app=kube-proxy -o wide 
NAME               READY   STATUS    RESTARTS       AGE    IP           NODE        
kube-proxy-hh5ph   1/1     Running   12 (44m ago)   105d   10.0.0.102   k8s-node-2     
kube-proxy-l9qnk   1/1     Running   35 (23m ago)   108d   10.0.0.101   k8s-node-1   
kube-proxy-wpjtz   1/1     Running   35 (21m ago)   108d   10.0.0.100   k8s-master-1
```

### flannel

```sh
# kubectl get daemonset -n kube-flannel 
NAME              DESIRED   CURRENT   READY   UP-TO-DATE   AVAILABLE   NODE SELECTOR   AGE
kube-flannel-ds   3         3         3       3            3           <none>          110d


# kubectl get pod -n kube-flannel -o wide 
NAME                    READY   STATUS    RESTARTS       AGE    IP           NODE      
kube-flannel-ds-h47jq   1/1     Running   39 (26m ago)   110d   10.0.0.101   k8s-node-1 
kube-flannel-ds-k998w   1/1     Running   37 (25m ago)   110d   10.0.0.100   k8s-master-1
kube-flannel-ds-s9h2h   1/1     Running   12 (47m ago)   105d   10.0.0.102   k8s-node-2  
```



## 部署 node-exporter

### yaml

- daemonset-node-exporter.yaml

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: daemonset-node-exporter
  namespace: default
  labels:
    app: prometheus
    component: node-exporter
spec:
  selector:
    matchLabels:
      app: prometheus
      component: node-exporter
  template:
    metadata:
      name: prometheus-node-exporter
      labels:
        app: prometheus
        component: node-exporter
    spec:
      hostNetwork: true
      hostPID: true
      containers:
      - image: prom/node-exporter:v0.18.1 
      #- image: prom/node-exporter:v1.1.1
        name: prometheus-node-exporter
        ports:
        - name: prom-node-exp
          containerPort: 9100
          hostPort: 9100
        livenessProbe:
          tcpSocket:
            port: prom-node-exp
          initialDelaySeconds: 3
        readinessProbe:
          httpGet:
            path: '/metrics'
            port: prom-node-exp
            scheme: HTTP
          initialDelaySeconds: 5
```

### 验证

```bash
# kubectl apply -f daemonset-node-exporter.yaml 
daemonset.apps/daemonset-node-exporter created


# kubectl get pod -o wide | awk '{print $1,$2,$3,$7}' | column -t
NAME                           READY  STATUS   NODE
daemonset-node-exporter-6bczf  1/1    Running  k8s-node-2
daemonset-node-exporter-6h7g5  1/1    Running  k8s-node-1


root@k8s-node-1:~# ps aux|grep node_exporter
nobody    346931  0.2  0.5 115220 15080 ?        Ssl  00:37   0:00 /bin/node_exporter

root@k8s-node-1:~# ss -ntlp | grep node_exporter
LISTEN    0         4096                     *:9100                   *:*        users:(("node_exporter",pid=346931,fd=3))   


# 可以通过node节点暴露的端口直接访问
root@k8s-master-1:~# curl 10.0.0.101:9100/metrics
go_gc_duration_seconds{quantile="0.25"} 3.334e-05
go_gc_duration_seconds{quantile="0.5"} 5.7795e-05
go_gc_duration_seconds{quantile="0.75"} 9.8785e-05
...
```





## DaemonSet 运行 cadvisor

### yaml file

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
          key: node-role.kubernetes.io/master
      hostNetwork: true #用node节点的网络，即直接在node节点开启8080端口 而无需创建service
      restartPolicy: Always #重启策略
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



## 污点容忍

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
      hostNetwork: true # 用node节点的网络名称空间，即直接在node节点开启8080端口 而无需创建service
      restartPolicy: Always #重启策略
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

