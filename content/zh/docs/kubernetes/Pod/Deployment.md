---
title: "Deployment"
weight: 10
---

# 无状态服务控制器发展史

ReplicationController、ReplicaSet 和 Deployment 都是 Kubernetes 中用来管理 Pod 副本的控制器，它们的主要区别如下：

1. ReplicationController（RC）：是 Kubernetes 最早引入的控制器，用于确保在集群中指定数量的 Pod 副本副本数，如果某个 Pod 副本失败，RC 会自动创建一个新的 Pod 副本来代替它。RC 主要负责水平伸缩 Pod 副本数量，但不负责应用更新和滚动更新。
2. ReplicaSet（RS）：是 RC 的升级版，除了包含 RC 的所有功能外，还可以使用更灵活的选择器来选择 Pod 副本。RS 还可以应用滚动更新，即按照一定的策略逐步更新 Pod 副本。
3. Deployment：是 RS 的升级版，它提供了更高级别的应用管理功能。Deployment 可以自动升级应用程序，它支持滚动升级、蓝绿部署和回滚操作。Deployment 还可以自动修复故障和扩展应用程序。Deployment 可以管理多个 ReplicaSet，并控制它们之间的切换和升级。

总的来说，RC 主要用于简单的水平扩展，RS 主要用于控制应用程序更新，而 Deployment 则是最强大的控制器，用于自动管理应用程序的滚动更新和故障修复。



**ReplicationController、ReplicaSet、Deployment 都是无状态服务的控制器吗？**

`ReplicationController`、`ReplicaSet`、`Deployment` 都是 Kubernetes 中用于管理 Pod 副本数目的控制器，它们的主要功能是保证 Pod 副本数目符合预期，以确保应用程序的高可用性。

这三个控制器都不限制应用程序的状态（无状态或有状态），因此既可以用于无状态服务，也可以用于有状态服务。但它们通常用于无状态服务，因为无状态服务的实例通常可以随意扩展，而且在任何节点上都可以启动新实例。相比之下，有状态服务的实例通常需要在特定节点上启动，并且在重新启动时需要维护其状态和标识。

需要注意的是，虽然这三个控制器都可以管理无状态服务，但是在 Kubernetes 1.9 版本之后，`ReplicationController` 已经不再推荐使用，建议使用 `ReplicaSet` 或 `Deployment` 来替代。因此，目前通常使用的是 `ReplicaSet` 和 `Deployment`。



# ReplicaSet 概述

- ReplicaSet(副本集) 是 ReplicationController 的升级版；
- ReplicaSet 负责管理一个应用（Pod）的多个副本；

## ReplicaSet Pod 升级方式

- 更新 Pod 中镜像后，replicaset 仅更新 API Server 中的定义，因此：
  - ReplicaSet 属于**删除式更新**，即 删除老版本的（或现有的）Pod 才能完成更新；


**删除更新方式：**

- 单批次删除所有Pod，一次完成所有更新；服务会中断一段时间；
- 分批次删除，待一批次就绪之后，才删除下一批；滚动更新；


# ReplicaSet Explain

```yaml
apiVersion: apps/v1
kind: ReplicaSet
metadata:
  name: …
  namespace: …
spec:
  minReadySeconds <integer>  # 在就绪探针的基础上再加一层判断，Pod就绪后多少秒内，Pod任一容器无crash方可视为“就绪”
  replicas <integer> # 期望的Pod副本数，默认为1
  selector: # 标签选择器，必须匹配template字段中Pod模板中的标签；
    matchExpressions <[]Object> # 标签选择器表达式列表，多个列表项之间为“与”关系
    matchLabels <map[string]string> # map格式的标签选择器
  template:  # Pod模板对象
    metadata:  # Pod对象元数据
      labels:  # 由模板创建出的Pod对象所拥有的标签，必须要能够匹配前面定义的标签选择器
    spec:  # Pod规范，格式同自主式Pod
      ……

```



# ---



# Deployment 概述

https://kubernetes.io/zh-cn/docs/concepts/workloads/controllers/deployment/

- Deployment 是 ReplicaSet 的升级版；
- **Deployment 并不直接管理Pod，而是借助于 ReplicaSet 来管理Pod；**
- Deployment 更适合运行无状态服务 Stateless service，是最常用的无状态应用控制器；

## 无状态服务

- 多个实例彼此间**可以互相取代**则为无状态服务

- 无状态服务是指该服务运行的实例不会在本地存储需要持久化的数据，并且多个实例对于同一个请求响应的结果是完全一致的。多个实例可以共享相同的持久化数据。例如：nginx实例，tomcat实例等
- 由于是无状态服务，所以这些控制器创建的pod序号都是随机值。并且在缩容的时候并不会明确缩容某一个pod，而是随机的，因为所有实例得到的返回值都是一样，所以缩容任何一个pod都可以。

- **常见的无状态服务：**

  - nginx

  - tomcat


## Deployment Pod 名称由来

- Deployment 中 Pod 名称是由：Deployment名称 **+**  replicasets随机值 **+** pod随机值 组成
  - replicasets 随机值可以理解为是 template 中的定义所生成的哈希值，template 中定义发生修改则此值也会修改，旧值会保留(默认保留十个旧版本)

```yaml
# vim nginx-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginxdep
spec:
  replicas: 2
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:1.23.0-alpine
        imagePullPolicy: IfNotPresent
        ports:
        - containerPort: 80



# kubectl apply -f nginx-deployment.yaml 
deployment.apps/nginxdep created


# kubectl get pod
NAME                        READY   STATUS    RESTARTS   AGE
nginxdep-76d45b5c65-cx4cj   1/1     Running   0          12s
nginxdep-76d45b5c65-rx6fz   1/1     Running   0          12s

# kubectl get deployments
NAME       READY   UP-TO-DATE   AVAILABLE   AGE
nginxdep   2/2     2            2           21s

# kubectl get replicasets
NAME                  DESIRED   CURRENT   READY   AGE
nginxdep-76d45b5c65   2         2         2       30s

---

# 修改
# vim nginx-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginxdep
spec:
  replicas: 2
  selector:
    matchLabels:
      app: nginx
  template:
...
        - containerPort: 81

# kubectl apply -f nginx-deployment.yaml 
deployment.apps/nginxdep configured

# kubectl get pod
NAME                        READY   STATUS    RESTARTS   AGE
nginxdep-77c76d444d-ffxqt   1/1     Running   0          18s
nginxdep-77c76d444d-sdkzx   1/1     Running   0          17s

# 旧版本会保留定义 但不会运行旧的pod
# kubectl get replicasets
NAME                  DESIRED   CURRENT   READY   AGE
nginxdep-76d45b5c65   0         0         0       3m59s
nginxdep-77c76d444d   2         2         2       4s

# kubectl get deployments
NAME       READY   UP-TO-DATE   AVAILABLE   AGE
nginxdep   2/2     2            2           4m8s
```





# Deployment Explain

```yaml
apiVersion: apps/v1  # API群组及版本
kind: Deployment  # 资源类型特有标识
metadata:
  name <string>  # 资源名称，在作用域中要唯一
  namespace <string>  # 名称空间；Deployment隶属名称空间级别
  labels: mylabels # 设定资源的标签（定义 key: value 格式的标签）
  annotations: # 可选，自定义注解列表 （注意是列表，- xxx）
    - xxx
    - xxx  
spec:
  minReadySeconds <integer>  # 在就绪探针的基础上再加一层判断，Pod就绪后多少秒内，Pod任一容器无crash方可视为“就绪”，默认值为 0（Pod 在准备就绪后立即将被视为可用）。
  replicas <integer> # 期望的Pod副本数，默认为1
  selector <object> # 标签选择器，必须匹配template字段中Pod模板中的标签
  revisionHistoryLimit <integer> # 滚动更新历史记录数量，默认为10
  strategy <Object> # 滚动更新策略
    type: RollingUpdate # 定义 Pod 具体的更新策略，可以设置为 RollingUpdate 或 Recreate，默认为RollingUpdate
    rollingUpdate: # 滚动更新参数，专用于RollingUpdate类型
      maxSurge <string>  # 更新期间可比期望的Pod数量多出的数量或比例，可以是百分比，也可以是具体的值。默认25% max surg
      maxUnavailable <string>  # 更新期间可比期望的Pod数量缺少的数量或比例，可以是百分比，也可以是具体的值。默认25% maxunavailable
  progressDeadlineSeconds <integer> # 滚动更新故障超时时长，默认为600秒
  paused <boolean>  # 是否暂停部署过程
  template: # Pod模板对象
    metadata: # Pod模板元数据
      labels: # Pod模板标签
        app: myapp
    spec: # pod 具体的定义，等同于Pod.spec
    ...
```

# revisionHistoryLimit

- 滚动更新历史记录数量，默认为10，其实是存放了10个ReplicaSet的定义；
  - ReplicaSet定义中，当前版本的Pod数量为期望数量，历史版本的Pod数量为0；
  - 因此可以通过指向不同ReplicaSet的方式实现版本回滚，回滚时只需将指定版本的ReplicaSet中的Pod数量改为期望数量。

# strategy

- 定义 Pod 更新策略
- `Deployment.spec.strategy`

## type

- 定义 Pod 具体的更新策略，可以设置为 RollingUpdate 或 Recreate，默认为RollingUpdate
- `Deployment.spec.strategy.type`

### RollingUpdate

- 表示以滚动更新的方式来逐个更新Pod，先创建部分Pod，创建完成并且探针探测成功后再删除旧的Pod
- 每次更新部分新版本，直至全部旧版本更新成为新版本；
- 滚动更新过程有可能会有新旧版本并存的现象产生
- 滚动部署时可以定义 `maxSurge` 和  `maxUnavailable`，以实现控制滚动部署的速率

### Recreate

- 同时删除所有旧版本的 Pod，然后重建新的 Pod，危险！会影响业务正常运行



## rollingUpdate

https://kubernetes.io/zh-cn/docs/concepts/workloads/controllers/deployment/#proportional-scaling

```yaml
apiVersion: apps/v1
kind: Deployment
...
spec:
...
  strategy:
    type: RollingUpdate
    rollingUpdate: # 滚动更新参数，专用于RollingUpdate类型
      maxSurge <string>  # 更新期间可比期望的Pod数量多出的数量或比例，可以是百分比，也可以是具体的值。默认25% max surg
      maxUnavailable <string>  # 更新期间可比期望的Pod数量缺少的数量或比例，可以是百分比，也可以是具体的值。默认25% maxunavailable
  progressDeadlineSeconds <integer> # 滚动更新故障超时时长，默认为600秒
...
```

### maxSurge

- 更新期间可比期望的Pod数量多出的数量或比例，默认：`maxSurge: 25%`

- `Deployment.spec.strategy.rollingUpdate.maxSurge`

### maxUnavailable

- 更新期间可比期望的Pod数量缺少的数量或比例，默认：`maxUnavailable: 25%`

- `Deployment.spec.strategy.rollingUpdate.maxUnavailable`

### 范例：默认值

- `maxSurge: 25%`；`maxUnavailable: 25%`
- 默认就是加减同步25%



### 范例：先加后减

- `maxSurge: +`；`maxUnavailable: 0`

- 保持原有的副本数量对外提供服务，再次基础上新建Pod，新建的Pod就绪后，删除与新建Pod同等数量的旧Pod



### 范例：先减后加

- `maxSurge: +`；`maxUnavailable: 0`

- 先将原有的副本数量删除一部分，删除成功后，新建与删除Pod数量相同的Pod，新建的Pod就绪后，再删除部分旧Pod
- 针对节点资源不满足先增加Pod的场景



### 范例：不可行的方案

- maxSurge: 0
- maxUnavailable: 0
- 这种方式是不可以的，因为都为0表示 既不能增、也不能减，进而就无法更新Pod了



### 滚动部署策略（速率）

假设：有3个 Old Pod，期望副本数3，需全部升级为 New Pod

#### 方案一：

- maxSurge: 1 
- maxUnavailable: 0
- 表示最大可超过期望副本数1个，但不能低于期望副本数，Pod 更新过程中总数<=4
- 这种方式可以避免因低于期望副本数而导致的剩余Pod无法承载住用户流量的问题

##### 方案一更新流程

- New Pod +1；Old Pod=3，New Pod=1（最大可超过期望副本数1个，所以 New Pod 只能 +1）
- Old Pod -1；Old Pod=2，New Pod=1（不能低于期望副本数，所以 Old Pod 只能 -1）
- New Pod +1；Old Pod=2，New Pod=2
- Old Pod -1；Old Pod=1，New Pod=2
- New Pod +1；Old Pod=1，New Pod=3
- Old Pod -1；Old Pod=0，New Pod=3



#### 方案二：

- maxSurge: 0
- maxUnavailable: 1
- 表示只能先删除1个Pod，然后再进行新Pod的重建
- 应用于节点资源以无法满足继续创建Pod的需求，只能先删除再创建Pod，较少使用

##### 方案二更新流程

- Old Pod -1；Old Pod=2，New Pod=0
- New Pod+1；Old Pod=2，New Pod=1
- Old Pod -1；Old Pod=1，New Pod=1
- New Pod+1；Old Pod=1，New Pod=2
- Old Pod -1；Old Pod=0，New Pod=2
- New Pod+1；Old Pod=0，New Pod=3



#### 方案三：

- maxSurge: 1
- maxUnavailable: 1
- 表示最大可超过期望副本数1个 并且 可以低于期望副本数1个
- 相当于减一个旧Pod，然后加两个新Pod（旧pod空出来的1 + maxSurge定义的1）
- 这样的更新速度会更快

##### 方案三更新流程

- Old Pod -1，New Pod+1+1；Old Pod=2，New Pod=2
- Old Pod -1，New Pod+1；Old Pod=1，New Pod=3
- Old Pod -1；Old Pod=0，New Pod=3





# kubectl rollout

- `kubectl rollout`可以对 deployments、daemonsets、statefulsets 资源进行滚动部署、灰度部署、回滚等管理操作

```bash
# Usage:
  kubectl rollout SUBCOMMAND [options]


# Available Commands:
  history     View rollout history
  pause       Mark the provided resource as paused
  restart     Restart a resource
  resume      Resume a paused resource
  status      Show the status of the rollout
  undo        Undo a previous rollout
```

## history

- 打印 daemonset、deployment、statefulset 的当前和历史版本
- 默认 Deployment 只保留十个历史版本，可通过 `Deployment.spec.revisionHistoryLimit` 来修改默认值
  - 本质上修改的是ReplicaSet的历史版本数量

- `kubectl rollout history < daemonset | deployment | statefulset > name [ -n namespace]  [ --revision=# ]`
  - --revision=#，#指定REVISION的版本编号


```sh
# 查看历史版本
# kubectl rollout history deployment demoapp 
deployment.apps/demoapp 
REVISION  CHANGE-CAUSE
1         <none>
2         <none>
3         <none> # 最后一个 REVISION 表示当前版本


# 查看指定版本
# kubectl rollout history deployment/demoapp  --revision=1
deployment.apps/demoapp with revision #1
Pod Template:
  Labels:	app=demoapp
	pod-template-hash=5748b7ccfc
  Containers:
   demoapp:
    Image:	ikubernetes/demoapp:v1.0
    Port:	<none>
    Host Port:	<none>
    Environment:	<none>
    Mounts:	<none>
  Volumes:	<none>




# 查看最新版本
# kubectl rollout history deployment/demoapp  --revision=3
deployment.apps/demoapp with revision #3
Pod Template:
  Labels:	app=demoapp
	pod-template-hash=57dd559479 # 57dd559479
  Containers:
   demoapp:
    Image:	ikubernetes/demoapp:v1.2
    Port:	<none>
    Host Port:	<none>
    Environment:	<none>
    Mounts:	<none>
  Volumes:	<none>
# 当新版本的 Pod 模板修改后，Deployment 背后的 ReplicaSet 会保留历史版本的信息，但不会运行旧版本的 Pod
# kubectl get replicasets.apps 
NAME                 DESIRED   CURRENT   READY   AGE
demoapp-5748b7ccfc   0         0         0       10m
demoapp-57dd559479   3         3         3       4m52s # 57dd559479
demoapp-bb799f7cd    0         0         0       5m32s
# kubectl get pod
NAME                       READY   STATUS    RESTARTS   AGE
demoapp-57dd559479-clpqp   1/1     Running   0          4m30s # 57dd559479
demoapp-57dd559479-gmkcj   1/1     Running   0          4m19s # 57dd559479
demoapp-57dd559479-wbz6k   1/1     Running   0          4m16s # 57dd559479
```



## undo

- **`kubectl rollout undo` 可以实现蓝绿部署后的回滚操作（回滚到上一个版本 或 回滚到指定版本）**
  - 蓝绿部署：两个或多个版本并存，但只有一个统一的版本对外提供服务，出现问题则回滚

- **注意事项：**
  - 回滚前需通过以下命令来获取到要回滚的版本详细信息，以确定要回滚的上一个或指定版本无误
    - `kubectl rollout history deployment/nginxdep`  简要信息
    - `kubectl rollout history deployment/nginxdep --revision=1`  详细信息

  - 执行回滚显示成功后需等待一段时间，等待镜像重构完毕，否则直接访问会出现多版本并存的情况


### 回滚到上一个版本

- `kubectl rollout undo deployment/deployment_name  [-n namespace_name]`

- **注意事项：**
  - 此方式执行第一次会回滚到上一个版本，第二次执行又会回到回滚前的版本，即**只能在两个版本间回滚**


#### 回滚到上一个版本

```bash
# 当前历史版本
# kubectl rollout history deployment demoapp 
deployment.apps/demoapp 
REVISION  CHANGE-CAUSE
1         <none>
2         <none>
3         <none> # 最后一个 REVISION 表示当前版本


# 访问当前版本测试
# curl 10.100.23.232
iKubernetes demoapp v1.2 !! ClientIP: 10.244.0.0, ServerName: demoapp-57dd559479-gmkcj, ServerIP: 10.244.1.195!


# 回滚到上一个版本
# kubectl rollout undo deployment/demoapp
deployment.apps/demoapp rolled back


# kubectl rollout history deployment 
deployment.apps/demoapp 
REVISION  CHANGE-CAUSE
1         <none>
3         <none>
4         <none> # 之前的REVISION=2现在变成了REVISION=4（REVISION会指数递增版本号）
# kubectl rollout history deployment/demoapp  --revision=4 | grep Image
    Image:	ikubernetes/demoapp:v1.1


# 再次访问测试
# curl 10.100.23.232
iKubernetes demoapp v1.1 !! ClientIP: 10.244.0.0, ServerName: demoapp-bb799f7cd-qqfl6, ServerIP: 10.244.1.197!
```

##### 再次回滚到上一个版本

- 反复回滚只能在两个版本间回滚，而REVISION会指数递增

```bash
# kubectl rollout undo deployment/demoapp
deployment.apps/demoapp rolled back


# kubectl rollout history deployment 
deployment.apps/demoapp 
REVISION  CHANGE-CAUSE
1         <none>
4         <none>
5         <none> # 之前的REVISION=3现在变成了REVISION=5，REVISION会指数递增
# kubectl rollout history deployment/demoapp  --revision=5 | grep Image
    Image:	ikubernetes/demoapp:v1.2



# 访问测试，反复回滚只能在两个版本间回滚
# curl 10.100.23.232
iKubernetes demoapp v1.2 !! ClientIP: 10.244.0.0, ServerName: demoapp-57dd559479-ft9lt, ServerIP: 10.244.1.202!
```



### 跨版本回滚

- `kubectl rollout undo deployment/deployment_name --to-revision=#   -n namespace_name`
  - `--to-revision=#`，#为指定的版本号

```bash
# 当前历史版本
# kubectl rollout history deployment demoapp 
deployment.apps/demoapp 
REVISION  CHANGE-CAUSE
1         <none>
4         <none>
5         <none>


# 每个历史版本对应的镜像
# kubectl rollout history deployment demoapp --revision=1 | grep Image
    Image:	ikubernetes/demoapp:v1.0
root@k8s-master-1:~# kubectl rollout history deployment demoapp --revision=4 | grep Image
    Image:	ikubernetes/demoapp:v1.1
root@k8s-master-1:~# kubectl rollout history deployment demoapp --revision=5 | grep Image
    Image:	ikubernetes/demoapp:v1.2



# 访问当前版本测试
# curl 10.100.23.232
iKubernetes demoapp v1.2 !! ClientIP: 10.244.0.0, ServerName: demoapp-57dd559479-gmkcj, ServerIP: 10.244.1.195!


# 跨版本回滚
# kubectl rollout undo deployment/demoapp --to-revision=1
deployment.apps/demoapp rolled back



# kubectl rollout history deployment 
deployment.apps/demoapp 
REVISION  CHANGE-CAUSE
4         <none>
5         <none>
6         <none> # 之前的REVISION=1现在变成了REVISION=6



# 再次访问测试
# curl 10.100.23.232
iKubernetes demoapp v1.0 !! ClientIP: 10.244.0.0, ServerName: demoapp-5748b7ccfc-czvcd, ServerIP: 10.244.1.203!
```

### 其他蓝绿部署实现方式

**ReplicaSet 可以基于标签实现蓝绿部署，比如：**

- 旧版本的 Pod 标签为 `version:1.0`； 新版本的 Pod 标签定义为 `version: 1.1`；
- 新旧两组 Pod 同时运行，但 Service 的标签选择器选择 `version: 1.1`；
- 这样可以实现使客户端的流量转发到新版本的 Pod 上，如果新版本的 Pod 出现问题，则可以将 Service 的标签选择器指向旧版本的 `version:1.0` 标签，从而实现版本回滚；
- 但这种方法的缺点是需要同时运行两组 Pod，比较占用资源



## pause & resume

- `kubectl rollout pause` 可以实现灰度部署，其实就是在刚部署的时候进行暂停，以实现新老版本并存的效果
- `kubectl rollout resume` 可以实现 `kubectl rollout pause` 暂停后继续部署

**灰度（金丝雀）部署：**

- 先部署部分新版本，以实现新旧版本并存，新版本测试一段时间后：
  - 如果没问题，则将剩余旧版本部署为新版本
  - 如果有问题，则新版本回滚为旧版本

### 范例：实现灰度部署

#### yaml file

- deployment-demo.yaml

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: deployment-demo
spec:
  replicas: 3
  selector:
    matchLabels:
      app: demoapp
      release: stable
  strategy:
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    metadata:
      labels:
        app: demoapp
        release: stable
    spec:
      containers:
      - name: demoapp
        image: ikubernetes/demoapp:${VERSION}
        ports:
        - containerPort: 80
          name: http
---
apiVersion: v1
kind: Service
metadata:
  name: demoapp-deploy
spec:
  selector:
    app: demoapp
    release: stable
  ports:
  - name: http
    port: 80
    targetPort: 80
```

#### 准备测试 pod

- 开启一个终端窗口，创建一个新的pod用于测试部署过程

```sh
# kubectl run pod --image="nginx:1.23.0-alpine" -it --rm -- sh
/ #
/ # while true ; do curl demoapp-deploy.default.svc.k8s.xiangzheng.com ; sleep .5 ; done 
...
```



#### 部署 & 测试

```bash
# 部署
# VERSION=v1.0 envsubst < deployment-demo.yaml | kubectl apply -f -
deployment.apps/deployment-demo created
service/demoapp-deploy created


# 测试
/ # while true ; do curl demoapp-deploy.default.svc.k8s.xiangzheng.com ; sleep .5 ; done 
iKubernetes demoapp v1.0 !! ClientIP: 10.244.1.79, ServerName: deployment-demo-57fcccf4fd-kx2c2, ServerIP: 10.244.1.80!
iKubernetes demoapp v1.0 !! ClientIP: 10.244.1.79, ServerName: deployment-demo-57fcccf4fd-w4vfq, ServerIP: 10.244.1.82!
iKubernetes demoapp v1.0 !! ClientIP: 10.244.1.79, ServerName: deployment-demo-57fcccf4fd-lmzd8, ServerIP: 10.244.1.81!
```



#### 灰度部署 & 测试

```sh
# 灰度部署
# VERSION=v1.1 envsubst < deployment-demo.yaml | kubectl apply -f - && kubectl rollout pause deployment/deployment-demo
deployment.apps/deployment-demo configured
service/demoapp-deploy unchanged
deployment.apps/deployment-demo paused


# 由于yaml文件中定义的rollingUpdate策略，所以暂停后578697c977版本的pod增加了一个
# kubectl get pod
NAME                               READY   STATUS    RESTARTS   AGE
deployment-demo-578697c977-lq52q   1/1     Running   0          23s
deployment-demo-57fcccf4fd-kx2c2   1/1     Running   0          33m
deployment-demo-57fcccf4fd-lmzd8   1/1     Running   0          33m
deployment-demo-57fcccf4fd-w4vfq   1/1     Running   0          33m


# 暂停于此阶段
# kubectl rollout status deployment/deployment-demo 
Waiting for deployment "deployment-demo" rollout to finish: 1 out of 3 new replicas have been updated...



# 测试，实现了灰度发布的效果
/ # while true ; do curl demoapp-deploy.default.svc.k8s.xiangzheng.com ; sleep .5 ; done 
iKubernetes demoapp v1.0 !! ClientIP: 10.244.1.79, ServerName: deployment-demo-57fcccf4fd-kx2c2, ServerIP: 10.244.1.80!
iKubernetes demoapp v1.1 !! ClientIP: 10.244.1.79, ServerName: deployment-demo-578697c977-lq52q, ServerIP: 10.244.1.83!
iKubernetes demoapp v1.0 !! ClientIP: 10.244.1.79, ServerName: deployment-demo-57fcccf4fd-w4vfq, ServerIP: 10.244.1.82!
iKubernetes demoapp v1.0 !! ClientIP: 10.244.1.79, ServerName: deployment-demo-57fcccf4fd-lmzd8, ServerIP: 10.244.1.81!
...


-------------------------------------

# 如果没问题，继续部署
# kubectl rollout resume deployment/deployment-demo 
deployment.apps/deployment-demo resumed
/ # while true ; do curl demoapp-deploy.default.svc.k8s.xiangzheng.com ; sleep .5 ; done 
iKubernetes demoapp v1.1 !! ClientIP: 10.244.1.79, ServerName: deployment-demo-578697c977-lq52q, ServerIP: 10.244.1.83!
iKubernetes demoapp v1.1 !! ClientIP: 10.244.1.79, ServerName: deployment-demo-578697c977-68q8r, ServerIP: 10.244.1.85!
iKubernetes demoapp v1.1 !! ClientIP: 10.244.1.79, ServerName: deployment-demo-578697c977-nfsv5, ServerIP: 10.244.1.84!
...


-----------------------------------

# 如果有问题需要回滚

# 如果使用undo，会提示需先恢复部署再进行undo，但是使用resume恢复部署的话会将有问题的版本继续部署下去...
# kubectl rollout undo deployment/deployment-demo
error: you cannot rollback a paused deployment; resume it first with 'kubectl rollout resume deployment/deployment-demo' and try again

# 可以先使用原有的yaml文件恢复成旧版本
# VERSION=v1.0 envsubst < deployment-demo.yaml | kubectl apply -f -
deployment.apps/deployment-demo configured
service/demoapp-deploy unchanged
/ # while true ; do curl demoapp-deploy.default.svc.k8s.xiangzheng.com ; sleep .5 ; done 
iKubernetes demoapp v1.0 !! ClientIP: 10.244.1.79, ServerName: deployment-demo-57fcccf4fd-2kmk7, ServerIP: 10.244.1.88!
iKubernetes demoapp v1.0 !! ClientIP: 10.244.1.79, ServerName: deployment-demo-57fcccf4fd-rfjsd, ServerIP: 10.244.1.87!
iKubernetes demoapp v1.0 !! ClientIP: 10.244.1.79, ServerName: deployment-demo-57fcccf4fd-7vfgc, ServerIP: 10.244.1.86!

# 待问题修复后，继续进行灰度部署，注意命令格式！
# kubectl rollout resume deployment/deployment-demo && kubectl rollout pause deployment/deployment-demo
deployment.apps/deployment-demo resumed
deployment.apps/deployment-demo paused 

# 继续进行灰度测试...，
/ # while true ; do curl demoapp-deploy.default.svc.k8s.xiangzheng.com ; sleep .5 ; done
iKubernetes demoapp v1.1 !! ClientIP: 10.244.1.79, ServerName: deployment-demo-578697c977-dflzd, ServerIP: 10.244.1.97!
iKubernetes demoapp v1.0 !! ClientIP: 10.244.1.79, ServerName: deployment-demo-57fcccf4fd-s92r6, ServerIP: 10.244.1.95!
iKubernetes demoapp v1.0 !! ClientIP: 10.244.1.79, ServerName: deployment-demo-57fcccf4fd-ps4fg, ServerIP: 10.244.1.94!
iKubernetes demoapp v1.0 !! ClientIP: 10.244.1.79, ServerName: deployment-demo-57fcccf4fd-dfvv5, ServerIP: 10.244.1.93!

# 如果没问题，继续部署
# kubectl rollout resume deployment/deployment-demo 
deployment.apps/deployment-demo resumed
/ # while true ; do curl demoapp-deploy.default.svc.k8s.xiangzheng.com ; sleep .5 ; done
iKubernetes demoapp v1.1 !! ClientIP: 10.244.1.79, ServerName: deployment-demo-578697c977-dflzd, ServerIP: 10.244.1.97!
iKubernetes demoapp v1.1 !! ClientIP: 10.244.1.79, ServerName: deployment-demo-578697c977-tmm2q, ServerIP: 10.244.1.99!
iKubernetes demoapp v1.1 !! ClientIP: 10.244.1.79, ServerName: deployment-demo-578697c977-gtjr7, ServerIP: 10.244.1.98!
```







## restart

- 重新启动资源





## status

- 显示 Pod 的更新状态

### yaml file

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginxdep
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nginx
  strategy:
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:1.23.0-alpine
        imagePullPolicy: IfNotPresent
        ports:
        - containerPort: 80
```

### 显示 Pod 的更新状态

```bash
# kubectl apply -f nginx-deployment.yaml && kubectl rollout status deployment/nginxdep
deployment.apps/nginxdep created
Waiting for deployment "nginxdep" rollout to finish: 0 of 3 updated replicas are available...
Waiting for deployment "nginxdep" rollout to finish: 1 of 3 updated replicas are available...
Waiting for deployment "nginxdep" rollout to finish: 2 of 3 updated replicas are available...
deployment "nginxdep" successfully rolled out


# 如果已经更新完毕
# kubectl rollout status deployment/nginxdep
deployment "nginxdep" successfully rolled out
```







# Deployment 其他相关命令

```bash
# 获取 Deployment 的信息
# kubectl get deployments.apps -n zookeeper 
NAME                     READY   UP-TO-DATE   AVAILABLE   AGE
zookeeper-1-deployment   1/1     1            1           158m
zookeeper-2-deployment   1/1     1            1           158m
zookeeper-3-deployment   1/1     1            1           158m

# NAME：Deployment 的名称
# READY：可用的“副本”数。“就绪个数/期望个数”。
# UP-TO-DATE：为了达到期望状态已经更新的副本数
# AVAILABLE：可供用户使用的副本数
# AGE：应用程序运行的时间



#获取 Deployment 的详细信息
# kubectl describe deployments.apps -n zookeeper 
...
```

## envsubst

- kubernetes 本身不支持环境变量，但可以使用 envsubst 来使其支持环境变量的传入

### yaml file

- replicaset-blue-green.yaml

```yaml
apiVersion: apps/v1
kind: ReplicaSet
metadata:
  name: rs-${DEPLOY}
spec:
  minReadySeconds: 3
  replicas: 2
  selector:
    matchLabels:
      app: demoapp
      ctr: rs-${DEPLOY}
      version: ${VERSION}
  template:
    metadata:
      labels:
        app: demoapp
        ctr: rs-${DEPLOY}
        version: ${VERSION}
    spec:
      containers:
      - name: demoapp
        image: ikubernetes/demoapp:${VERSION}
        ports:
        - name: http
          containerPort: 80
```



### 实现前

```bash
# 正常定义
# DEPLOY=blue
# VERSION=v1.0
# echo $DEPLOY
blue
# echo $VERSION
v1.0


# 执行测试，报错
# kubectl apply -f replicaset-blue-green.yaml 
The ReplicaSet "rs-${DEPLOY}" is invalid: 
* metadata.name: Invalid value: "rs-${DEPLOY}": a lowercase RFC 1123 subdomain must consist of lower case alphanumeric characters, '-' or '.', and must start and end with an alphanumeric character (e.g. 'example.com', regex used for validation is '[a-z0-9]([-a-z0-9]*[a-z0-9])?(\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*')
* spec.selector.matchLabels: Invalid value: "rs-${DEPLOY}": a valid label must be an empty string or consist of alphanumeric characters, '-', '_' or '.', and must start and end with an alphanumeric character (e.g. 'MyValue',  or 'my_value',  or '12345', regex used for validation is '(([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9])?')
* spec.selector.matchLabels: Invalid value: "${VERSION}": a valid label must be an empty string or consist of alphanumeric characters, '-', '_' or '.', and must start and end with an alphanumeric character (e.g. 'MyValue',  or 'my_value',  or '12345', regex used for validation is '(([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9])?')
* spec.selector: Invalid value: v1.LabelSelector{MatchLabels:map[string]string{"app":"demoapp", "ctr":"rs-${DEPLOY}", "version":"${VERSION}"}, MatchExpressions:[]v1.LabelSelectorRequirement(nil)}: invalid label selector

```



### 实现后

```yaml
# 打印测试
# DEPLOY=blue VERSION=v1.0 envsubst < /k8s-yaml/replicaset-blue-green.yaml 
apiVersion: apps/v1
kind: ReplicaSet
metadata:
  name: rs-blue
spec:
  minReadySeconds: 3
  replicas: 2
  selector:
    matchLabels:
      app: demoapp
      ctr: rs-blue
      version: v1.0
  template:
    metadata:
      labels:
        app: demoapp
        ctr: rs-blue
        version: v1.0
    spec:
      containers:
      - name: demoapp
        image: ikubernetes/demoapp:v1.0
        ports:
        - name: http
          containerPort: 80


# 执行，注意命令最后一定要加-
# DEPLOY=blue VERSION=v1.0 envsubst < /k8s-yaml/replicaset-blue-green.yaml | kubectl apply -f -
replicaset.apps/rs-blue created


# 验证
# kubectl get pod --show-labels 
NAME            READY   STATUS    RESTARTS   AGE   LABELS
rs-blue-547qb   1/1     Running   0          84s   app=demoapp,ctr=rs-blue,version=v1.0
rs-blue-cj4fh   1/1     Running   0          84s   app=demoapp,ctr=rs-blue,version=v1.0


# 在envsubst中定义的变量不会保留在终端内
# echo $VERSION

# echo $DEPLOY
  
```



# ---



# Deployment 模板

## demoapp.yaml

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx
  namespace: test
spec:
  replicas: 1
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
          image: registry.cn-hangzhou.aliyuncs.com/xiangzheng_repo/demoapp:v1.0
```



## nginx.yaml

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx
  namespace: nginx
spec:
  replicas: 1
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
        - name: nginx
          image: nginx:1.23
---
apiVersion: v1
kind: Service
metadata:
  name: nginx
  namespace: nginx
spec:
  ports:
  - name: http
    port: 80 
    protocol: TCP
    targetPort: 80
  selector:
    app: nginx 
  type: ClusterIP
```

