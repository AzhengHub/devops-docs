---
title: "StatefulSet"
weight: 10
---

# StatefulSet 概述

- StatefulSet 有状态集合，简称 sts，更适合运行有状态服务 Stateful service
- StatefulSet 属于通用的有状态应用控制器
- **StatefulSet 强依赖于 Headless Service**；即创建 StatefulSet 前 需先创建无头服务
  - 因为无头服务可以给每个 pod 定义一个唯一的 service 域名标识，pod间使用这个域名进行反向解析得到目标pod的IP，进而实现 pod 与 pod 间直接通信，而不再经由service调度
- **如果 StatefulSet 需要持久化存储，那么每个实例都需要有自己独立的持久化存储，并且只能是PVC格式**

- StatefulSet 的每个 Pod 维护了一个有粘性的 ID。这些 Pod 是基于相同的规约来创建的， 但是不能相互替换：无论怎么调度，每个 Pod 都有一个永久不变的 ID。



## 有状态服务

- 多个实例彼此间**不可以互相取代**则为有状态服务
- 有状态服务可以说是 需要数据存储功能的服务、或者指多线程类型的服务，队列等。
- 状态的服务中的每个pod都有特定的名称和网络标识，比如pod名是由statefulSet名+有序的数字组成（0、1、2..）
  - statefulset_name-mysql-0、statefulset_name-mysql-1、statefulset_name-mysql-2

### 常见的有状态服务：

- MySQL、MongoDB、zookeeper、kafka 等...



## StatefulSet 部署应用

- **顺序部署**，假设三个副本，则 app-0 **-->** app-1 **-->** app-2

其他说明：

- 有的应用须严格按照先后顺序部署；例如：MySQL 集群，只能先部署主节点，再部署从节点，顺序不能颠倒。
- 有的应用部署时无需考虑部署的先后顺序；例如：zookeeper，因其内部自有leader选举协议，因此哪个节点先后启动都一样



## StatefulSet 扩容应用

- **顺序扩容**，例如：目前版本 app-0、app-1、app-2，再扩容两个应用则 app-3 **-->** app-4



## StatefulSet 缩容应用

- **逆序缩容**，例如：目前版本 app-0、app-1、app-2，缩容顺序为先删除app-2，再删除app-1

- Statefulset 在有实例不健康的情况下不允许缩容

**StatefulSet 缩容任何时候只会操作 一个 pod 实例**，所以有状态应用的缩容不会很迅速。

- 举例来说：一个分布式存储应用若同时下线多个节点 ，则可能导致其数据丢失 。
  - 比如说一个数据项副本数设置为 2 的数据存储应用， 若 同时有两个节点下线，一份数据记录就会丢失，如果它正好保存在这两个节点上 。 
- 若缩容是线性的 ，则分布式存储应用就有时间把丢失的副本复制到其他节点 ，保证数据不会丢失。



## StatefulSet 更新应用

**`StatefulSet.spec.updateStrategy.type.Rollingupdate`**

- **逆序更新**，默认值，例如：目前版本 app-0、app-1、app-2，则会以 app-2 **-->** app-1 **-->** app-0 的顺序逆序更新
  - **并且只能先减Pod，再加Pod**
- 可以使用 `StatefulSet.spec.updateStrategy.type.rollingUpdate.partition` 指定分区指示索引值，只有编号大于partition的pod才会被逆序更新（类似于金丝雀发布）；默认为0，即大于0的Pod都会逆序更新

**`StatefulSet.spec.updateStrategy.type.OnDelete`**

- 删除所有Pod后再更新



## 生产中运行 StatefulSet

- 自行创建比较繁琐并且不便于管理，所有应该使用Operator来部署与管理有状态应用
- Operator 是服务提供商开发的 StatefulSet
- https://operatorhub.io/
- https://github.com/operator-framework/awesome-operators



## 参考文档

- https://kubernetes.io/zh-cn/docs/concepts/workloads/controllers/statefulset/
- https://kubernetes.io/zh-cn/docs/tutorials/stateful-application/basic-stateful-set/
- https://kubernetes.io/zh-cn/docs/tutorials/stateful-application/cassandra/





# StatefulSet Explain

```yaml
apiVersion: apps/v1  # API群组及版本；
kind: StatefulSet  # 资源类型的特有标识
metadata:
  name <string>  # 资源名称，在作用域中要唯一
  namespace <string>  # 名称空间；StatefulSet隶属名称空间级别
spec:
  replicas <integer> # 期望的Pod副本数，默认为1
  selector <object> # 标签选择器，须匹配Pod模板中的标签，必选字段
  template <object>  # Pod模板对象，必选字段
  revisionHistoryLimit <integer> # 滚动更新历史记录数量，默认为10
  updateStrategy <Object> # 滚动更新策略
    type <string>  # 滚动更新类型，可用值有OnDelete和Rollingupdate，OnDelete删除所有Pod后再更新
    rollingUpdate <Object>  # 滚动更新参数，专用于RollingUpdate类型，只能定义partition
      partition <integer>  # 分区指示索引值，只有编号大于partition的pod才会被逆序更新（类似于金丝雀发布）；默认为0，即大于0的Pod都会被逆序更新
  serviceName  <string>  # 相关的Headless Service的名称，必选字段
  volumeClaimTemplates <[]Object>  # 存储卷申请模板
    apiVersion <string>  # PVC资源所属的API群组及版本，可省略
    kind <string>  # PVC资源类型标识，可省略
    metadata <Object>  # 卷申请模板元数据
    spec <Object>  # 期望的状态，可用字段同PVC
  podManagementPolicy  <string> # 定义Pod创建和删除策略，OrderedReady表示顺序递增创建和逆序递减删除，Parallel表示并行模式创建和删除，默认值OrderedReady
```







# StatefulSet Example

## 范例：运行 MySQL

**目标：**

- 1、statefulset跑一个mysql实例，使用secret保存账号、密码、数据库名称等信息，使用volumeClaimTemplate请求创建PVC，并持久存储数据；
- 2、Deployment跑两个wordpress实例，从secret中加载数据库名称、用户名和密码等信息（调用上面使用statefulset创建的MySQL实例），基于支持RWX访问模式的PVC保存页面资源。





## 范例：运行 zookeeper 集群

- 参考文档：https://kubernetes.io/zh-cn/docs/tutorials/stateful-application/zookeeper/

### 说明

**目前有以下几个问题：**

- **zookeeper-service.yaml 中 如果使用 type: NodePort 并且定义 nodePort: 32181，那么在 zookeeper 中使用 service 的名称来定义其它 zookeeper 节点的地址将无法完成 leader 选举，除非使用 Pod 的 IP，但使用 Pod 的 IP 又无法实现当 Pod 宕机 IP 被回收所导致的高可用问题**

- **zookeeper-service.yaml 中 如果使用 type: ClusterIP 并且定义 clusterIP: None，虽然可以完成 leader 的选举，但又无法实现从外部访问 zookeeper cluster**

- **另外镜像还需修改，因为各集群节点需手工添加：**

- ```bash
  # cat /zookeeper/apache-zookeeper-3.8.0-bin/conf/zoo.cfg 
  dataDir=/data/zookeeper
  dataLogDir=/data/zookeeper/logs
  tickTime=2000
  initLimit=10
  syncLimit=5
  clientPort=2181
  server.1=zookeeper-service-1.zookeeper.svc.kubecluster.local:2888:3888
  server.2=zookeeper-service-2.zookeeper.svc.kubecluster.local:2888:3888
  server.3=zookeeper-service-3.zookeeper.svc.kubecluster.local:2888:3888
  ```

  





### NFS

- 安装过程省略

```bash
# 创建共享目录
# mkdir -p /nfs_data/zookeeper/zk{1..3}

# 定义共享目录
# vim /etc/exports
...
/nfs_data/zookeeper/ *(rw,no_root_squash)

# 重载配置文件
# exportfs -r

# 查看共享结果
# showmount -e 10.0.0.103
Export list for 10.0.0.103:
/nfs_data/zookeeper *
...
```







### Dockerfile

- 制作 zookeeper 镜像

#### 相关文件

- **注意：entrypoint.sh 脚本需要加执行权限**

```bash
# ll /data/dockerfile/zookeeper/
total 12892
drwxr-xr-x 2 root root     4096 Jul 14 14:58 ./
drwxr-xr-x 7 root root     4096 Jul 14 14:45 ../
-rw-r--r-- 1 root root 13185104 Jun 11 14:05 apache-zookeeper-3.8.0-bin.tar.gz
-rw-r--r-- 1 root root        0 Jul 14 14:45 Dockerfile
-rwxr-xr-x 1 root root     1860 Jul 14 14:58 entrypoint.sh*
```

#### apache-zookeeper-3.8.0-bin.tar.gz

```bash
# sha512sum /data/dockerfile/zookeeper/apache-zookeeper-3.8.0-bin.tar.gz 
d66e3a40451f840406901b2cd940992b001f92049a372ae48d8b420891605871cd1ae5f6cceb3b10665491e7abef36a4078dace158bd1e0938fcd3567b5234ca  /data/dockerfile/zookeeper/apache-zookeeper-3.8.0-bin.tar.gz


# 官方提供的校验码
d66e3a40451f840406901b2cd940992b001f92049a372ae48d8b420891605871cd1ae5f6cceb3b10665491e7abef36a4078dace158bd1e0938fcd3567b5234ca-apache-zookeeper-3.8
```

#### entrypoint.sh

- offical

```bash
#!/bin/bash
#
#********************************************************************
#Author:	     	xiangzheng
#QQ: 			    767483070
#Date: 		     	2022-07-14
#FileName：		    entrypoint.sh
#URL: 		    	https://www.xiangzheng.vip
#Email: 		    rootroot25@163.com
#Description：		The test script
#Copyright (C): 	2022 All rights reserved
#********************************************************************

set -e

# Allow the container to be started with `--user`
if [[ "$1" = 'zkServer.sh' && "$(id -u)" = '0' ]]; then
    chown -R zookeeper "$ZOO_DATA_DIR" "$ZOO_DATA_LOG_DIR" "$ZOO_LOG_DIR"
    exec gosu zookeeper "$0" "$@"
fi

# Generate the config only if it doesn't exist
if [[ ! -f "$ZOO_CONF_DIR/zoo.cfg" ]]; then
    CONFIG="$ZOO_CONF_DIR/zoo.cfg"
    {
        echo "dataDir=$ZOO_DATA_DIR"
        echo "dataLogDir=$ZOO_DATA_LOG_DIR"

        echo "tickTime=$ZOO_TICK_TIME"
        echo "initLimit=$ZOO_INIT_LIMIT"
        echo "syncLimit=$ZOO_SYNC_LIMIT"

        echo "autopurge.snapRetainCount=$ZOO_AUTOPURGE_SNAPRETAINCOUNT"
        echo "autopurge.purgeInterval=$ZOO_AUTOPURGE_PURGEINTERVAL"
        echo "maxClientCnxns=$ZOO_MAX_CLIENT_CNXNS"
        echo "standaloneEnabled=$ZOO_STANDALONE_ENABLED"
        echo "admin.enableServer=$ZOO_ADMINSERVER_ENABLED"
    } >> "$CONFIG"
    if [[ -z $ZOO_SERVERS ]]; then
      ZOO_SERVERS="server.1=localhost:2888:3888;2181"
    fi

    for server in $ZOO_SERVERS; do
        echo "$server" >> "$CONFIG"
    done

    if [[ -n $ZOO_4LW_COMMANDS_WHITELIST ]]; then
        echo "4lw.commands.whitelist=$ZOO_4LW_COMMANDS_WHITELIST" >> "$CONFIG"
    fi

    for cfg_extra_entry in $ZOO_CFG_EXTRA; do
        echo "$cfg_extra_entry" >> "$CONFIG"
    done
fi

# Write myid only if it doesn't exist
if [[ ! -f "$ZOO_DATA_DIR/myid" ]]; then
    echo "${ZOO_MY_ID:-1}" > "$ZOO_DATA_DIR/myid"
fi

exec "$@"
```

- test

```bash
#!/bin/bash
#
#********************************************************************
#Author:	     	xiangzheng
#QQ: 			    767483070
#Date: 		     	2022-07-14
#FileName：		    entrypoint.sh
#URL: 		    	https://www.xiangzheng.vip
#Email: 		    rootroot25@163.com
#Description：		The test script
#Copyright (C): 	2022 All rights reserved
#********************************************************************

set -e

# 仅当配置文件不存在时生成配置文件
if [[ ! -f "${ZOO_WORK_DIR}/conf/zoo.cfg" ]]; then
    CONFIG="${ZOO_WORK_DIR}/conf/zoo.cfg"
    {
        echo "dataDir=${ZOO_DATA_DIR}"
        echo "dataLogDir=${ZOO_DATA_LOG_DIR}"

        echo "tickTime=${ZOO_TICK_TIME}"
        echo "initLimit=${ZOO_INIT_LIMIT}"
        echo "syncLimit=${ZOO_SYNC_LIMIT}"

        echo "clientPort=${ZOO_CLI_PORT}"
    } >> "$CONFIG"
fi



# 通过循环方式添加集群节点
for ID in `seq ${CLUSTER_NUM}`;do
    echo "server.${ID}=10.0.0.100:2888:3888" >> $CONFIG
done

# 本节点ID
echo ${MY_ID} > /data/zookeeper/myid



/usr/bin/tail -f /etc/hosts
```





#### Dockerfile

- 基于定制的 jdk 镜像制作 zookeeper 镜像
- /data/dockerfile/zookeeper/Dockerfile

```dockerfile
FROM harbor.xiangzheng.vip/baseimages-app/jdk-8u333-base-ubuntu:1.0

LABEL version="1.0" \
      maintainer="XiangZheng <767483070@qq.com>"

ADD apache-zookeeper-3.8.0-bin.tar.gz /zookeeper/

    # 指定工作目录
ENV ZOO_WORK_DIR=/zookeeper/apache-zookeeper-3.8.0-bin \
    # zookeeper 数据保存目录
    ZOO_DATA_DIR=/data/zookeeper \
    # zookeeper 数据日志保存目录
    ZOO_DATA_LOG_DIR=/data/zookeeper/logs\
    # zookeeper 节点间心跳节点检测时间间隔，毫秒为单位
    ZOO_TICK_TIME=2000 \
    # 集群中的 leader 与 follower服务器的初始连接心跳检测次数
    # 此处的10表示 当初始连接超过10个2000毫秒后此follower将视为不可用
    ZOO_INIT_LIMIT=10 \
    # 集群中的 leader 与 follower服务器的连接后，后期的心跳检测次数
    # 此处的5表示 当后续连接超过5个2000毫秒后此follower将视为不可用
    ZOO_SYNC_LIMIT=5 \
    # 监听客户端连接的端口
    ZOO_CLI_PORT=2181


RUN set -eux; \
    # 定义启动用户
    groupadd -r zookeeper --gid=2181; \
    useradd -r -g zookeeper --uid=2181 zookeeper; \
    chown -R zookeeper.zookeeper ${ZOO_WORK_DIR}; \
    # 创建数据存放目录
    mkdir -p /data/zookeeper/logs



WORKDIR ${ZOO_WORK_DIR}

EXPOSE 2181 2888 3888 8080

COPY entrypoint.sh /

#ENTRYPOINT ["/usr/bin/tail","-f","/etc/hosts"]
ENTRYPOINT ["/entrypoint.sh"]
#CMD ["zkServer.sh", "start-foreground"]
```



**测试：**

```bash
docker run --rm -d --name zookeeper zookeeper-3.8.0-jdk-8u333:1.0 ; docker exec -it zookeeper bash

docker stop zookeeper


docker images |grep zoo ; docker ps -a |grep zoo




server.1=zookeeper-service-1.zookeeper.svc.kubecluster.local:2888:3888
server.2=zookeeper-service-2.zookeeper.svc.kubecluster.local:2888:3888
server.3=zookeeper-service-3.zookeeper.svc.kubecluster.local:2888:3888



server.1=zookeeper-service-1:2888:3888
server.2=zookeeper-service-2:2888:3888
server.3=zookeeper-service-3:2888:3888

 


server.1=192.168.3.144:2888:3888
server.2=192.168.12.58:2888:3888
server.3=192.168.8.64:2888:3888


# docker run --rm -e CLUSTER_NUM=3 -e MY_ID=1 -d --name zookeeper zookeeper-3.8.0-jdk-8u333:1.0 ; docker exec -it zookeeper bash
# cat conf/zoo.cfg     
dataDir=/data/zookeeper
dataLogDir=/data/zookeeper/logs
tickTime=2000
initLimit=10
syncLimit=5
clientPort=2181
server.1=10.0.0.100:2888:3888
server.2=10.0.0.100:2888:3888
server.3=10.0.0.100:2888:3888
# cat /data/zookeeper/myid 
1

```

- 配置文件

```bash
tickTime=2000
initLimit=10
syncLimit=5
dataDir=/data/zookeeper
clientPort=2181




# cat zoo.cfg.bak 
# The number of milliseconds of each tick
tickTime=2000
# The number of ticks that the initial 
# synchronization phase can take
initLimit=10
# The number of ticks that can pass between 
# sending a request and getting an acknowledgement
syncLimit=5
# the directory where the snapshot is stored.
# do not use /tmp for storage, /tmp here is just 
# example sakes.
dataDir=/tmp/zookeeper
# the port at which the clients will connect
clientPort=2181
# the maximum number of client connections.
# increase this if you need to handle more clients
#maxClientCnxns=60
#
# Be sure to read the maintenance section of the 
# administrator guide before turning on autopurge.
#
# https://zookeeper.apache.org/doc/current/zookeeperAdmin.html#sc_maintenance
#
# The number of snapshots to retain in dataDir
#autopurge.snapRetainCount=3
# Purge task interval in hours
# Set to "0" to disable auto purge feature
#autopurge.purgeInterval=1

## Metrics Providers
#
# https://prometheus.io Metrics Exporter
#metricsProvider.className=org.apache.zookeeper.metrics.prometheus.PrometheusMetricsProvider
#metricsProvider.httpHost=0.0.0.0
#metricsProvider.httpPort=7000
#metricsProvider.exportJvmInfo=true

```



#### 构建镜像并上传到 harbor

- **构建镜像**

```bash
docker build -t zookeeper-3.8.0-jdk-8u333:1.0 .
```

- **在 harbor 创建项目，并命名为 如：baseimages-os，访问级别设为公开**

- **打标签然后上传到 harbor**

```bash
# 打标签
docker tag zookeeper-3.8.0-jdk-8u333:1.0 harbor.xiangzheng.vip/baseimages-os/zookeeper-3.8.0-jdk-8u333:1.0

# 上传
docker push harbor.xiangzheng.vip/baseimages-os/zookeeper-3.8.0-jdk-8u333:1.0
```







#### yaml

- k8s 编排 zookeeper 镜像

##### 相关文件

```bash
# tree /data/yaml/zookeeper/
/data/yaml/zookeeper/
├── pv
│   ├── zookeeper-pvc.yaml
│   └── zookeeper-pv.yaml
├── zookeeper-deployment.yaml
├── zookeeper-namespace.yaml
└── zookeeper-service.yaml

1 directory, 5 files
```

##### zookeeper-namespace.yaml

```yaml
# vim /data/yaml/zookeeper/zookeeper-namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: zookeeper
```

###### 验证

```bash
# kubectl apply -f /data/yaml/zookeeper/zookeeper-namespace.yaml 
namespace/zookeeper created


# kubectl get namespaces 
NAME              STATUS   AGE
...
zookeeper         Active   3m37s
```



##### zookeeper-pv.yaml

```yaml
# vim /data/yaml/zookeeper/zookeeper-pv.yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: zookeeper-pv-1
  namespace: zookeeper
spec:
  capacity:
    storage: 30Gi
  accessModes:
    - ReadWriteOnce
  persistentVolumeReclaimPolicy: Retain
  nfs:
    path: "/nfs_data/zookeeper/zk1"
    server: 10.0.0.103

---

apiVersion: v1
kind: PersistentVolume
metadata:
  name: zookeeper-pv-2
  namespace: zookeeper
spec:
  capacity:
    storage: 30Gi
  accessModes:
    - ReadWriteOnce
  persistentVolumeReclaimPolicy: Retain
  nfs:
    path: "/nfs_data/zookeeper/zk2"
    server: 10.0.0.103

---

apiVersion: v1
kind: PersistentVolume
metadata:
  name: zookeeper-pv-3
  namespace: zookeeper
spec:
  capacity:
    storage: 30Gi
  accessModes:
    - ReadWriteOnce
  persistentVolumeReclaimPolicy: Retain
  nfs:
    path: "/nfs_data/zookeeper/zk3"
    server: 10.0.0.103
```

###### 验证

```bash
# kubectl apply -f /data/yaml/zookeeper/zookeeper-pv.yaml
persistentvolume/zookeeper-pv-1 created
persistentvolume/zookeeper-pv-2 created
persistentvolume/zookeeper-pv-3 created


# kubectl get pv
NAME             CAPACITY   ACCESS MODES   RECLAIM POLICY   STATUS      CLAIM                  STORAGECLASS   REASON   AGE
zookeeper-pv-1   30Gi       RWO            Retain           Available                                                  15s
zookeeper-pv-2   30Gi       RWO            Retain           Available                                                  15s
zookeeper-pv-3   30Gi       RWO            Retain           Available                                                  15s
```





##### zookeeper-service.yaml

- 下面创建了两个service，类型都为 ClusterIP(不写则默认为ClusterIP)，ClusterIP 表示只能在群集中访问该 service。
- zookeeper-election 为无头 service，表示不分配 ClusterIP，但是可以通过 service 来进行访问，请求会到达目标 Pod 的实际 IP ，而非 service 的 ClusterIP。

```yaml
# vim /data/yaml/zookeeper/zookeeper-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: zookeeper-election
  namespace: zookeeper
spec:
  ports:
  - port: 2888
    name: server
  - port: 3888
    name: leader-election
  clusterIP: None
  selector:
    app: zookeeper

---

apiVersion: v1
kind: Service
metadata:
  name: zookeeper-client
  namespace: zookeeper
spec:
  ports:
  - port: 2181
    name: client
  selector:
    app: zookeeper
```

###### 验证

```bash
# kubectl apply -f zookeeper-service.yaml
service/zookeeper-election created
service/zookeeper-client created


# kubectl get service -n zookeeper 
NAME                 TYPE        CLUSTER-IP     EXTERNAL-IP   PORT(S)             AGE
zookeeper-client     ClusterIP   192.168.8.87   <none>        2181/TCP            7s
zookeeper-election   ClusterIP   None           <none>        2888/TCP,3888/TCP   7s
```



##### zookeeper-pdb.yaml

```yaml
# vim /data/yaml/zookeeper/zookeeper-pdb.yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: zookeeper-pdb
spec:
  selector:
    matchLabels:
      app: zookeeper
  maxUnavailable: 1
```

###### 验证

```bash
# kubectl apply -f /data/yaml/zookeeper/zookeeper-pdb.yaml
poddisruptionbudget.policy/zookeeper-pdb created


# kubectl get poddisruptionbudgets.policy 
NAME            MIN AVAILABLE   MAX UNAVAILABLE   ALLOWED DISRUPTIONS   AGE
zookeeper-pdb   N/A             1                 0                     43s
```



##### zookeeper-statefulset.yaml

```yaml
# vim /data/yaml/zookeeper/zookeeper-statefulset.yaml
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
        app: zookeeper
    spec:
      affinity:
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







###### 测试

- **目前还需手动执行 `/zookeeper/apache-zookeeper-3.8.0-bin/bin/zkServer.sh start`**

```bash
root@zookeeper-1-deployment-749db8476c-bbmlh:~# /zookeeper/apache-zookeeper-3.8.0-bin/bin/zkServer.sh status
ZooKeeper JMX enabled by default
Using config: /zookeeper/apache-zookeeper-3.8.0-bin/bin/../conf/zoo.cfg
Client port found: 2181. Client address: localhost. Client SSL: false.
Mode: follower



root@zookeeper-2-deployment-55bb4f459c-8rtqk:~# /zookeeper/apache-zookeeper-3.8.0-bin/bin/zkServer.sh status
ZooKeeper JMX enabled by default
Using config: /zookeeper/apache-zookeeper-3.8.0-bin/bin/../conf/zoo.cfg
Client port found: 2181. Client address: localhost. Client SSL: false.
Mode: leader



root@zookeeper-3-deployment-847d65c495-t5jxn:~# /zookeeper/apache-zookeeper-3.8.0-bin/bin/zkServer.sh status
ZooKeeper JMX enabled by default
Using config: /zookeeper/apache-zookeeper-3.8.0-bin/bin/../conf/zoo.cfg
Client port found: 2181. Client address: localhost. Client SSL: false.
Mode: follower
```

