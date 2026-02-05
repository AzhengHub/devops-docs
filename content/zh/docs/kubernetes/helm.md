---
title: "Helm"
---

## helm 概述
参考文档：https://helm.sh/zh/docs/helm/helm/


## helm 相关文件

### $HOME/.cache/helm/repository

- 此目录是更新chart仓库索引信息后自动生成的相关文件

```sh
my-repo-charts.txt # 仓库中包含的软件包名
my-repo-index.yaml # 仓库索引信息
prometheus-15.16.1.tgz # chart定义文件
prometheus-community-charts.txt
prometheus-community-index.yaml
redis-17.3.5.tgz
```

### name-version.tgz

- chart定义相关文件

```sh
# tar xf redis-17.3.5.tgz
# cd redis/
# ls -l
Chart.lock
charts
Chart.yaml
img
README.md
templates
values.schema.json
values.yaml # chart具体定义文件，除了通过helm命令行选项传递参数定义chart运行方式外，也可以通过values.yaml文件传递参数（此文件仓库官网也有）
```



### values

在Helm中，`values.yaml`文件是用于定义Helm图表的默认配置值的文件。该文件包含了图表的配置参数及其默认值。用户可以通过修改这些值来自定义图表的行为。以下是关于Helm Values文件的详细解释：

1. **文件位置：** `values.yaml` 文件通常位于 Helm Chart 的根目录下，用于存储默认的配置值。

2. **YAML 格式：** Values 文件使用 YAML（YAML Ain't Markup Language）格式，这是一种易读的数据序列化格式。

3. **参数定义：** Values 文件包含一系列参数（键值对），每个参数都有一个默认值。这些参数通常与 Helm Chart 的模板文件中的变量相对应。

4. **默认值：** Values 文件中定义的值即为默认值。当用户使用 Helm 安装图表时，这些默认值将被应用。用户可以选择覆盖这些默认值，以满足他们的需求。

5. **注释：** 可以在 Values 文件中添加注释，以提供关于参数的额外说明。在 YAML 中，注释以 `#` 开头。

6. **结构化参数：** Values 文件中的参数可以是简单的键值对，也可以是嵌套的结构，以支持更复杂的配置。例如：

    ```yaml
    database:
      host: "localhost"
      port: 5432
      username: "admin"
      password: "password"
    ```

7. **全局配置：** Values 文件中可以包含一些全局配置，这些配置适用于整个 Helm Chart。例如，全局的镜像仓库、命名空间等。

8. **自定义模板：** 有时，Values 文件还可以包含自定义模板，以在 Helm 模板中使用。这些模板通常以 `{{ template "name" . }}` 的形式出现，其中 `name` 是模板的名称，`.` 表示当前上下文。

9. **参数替代：** 在 Helm 安装时，用户可以通过 `--set` 选项或者通过提供外部 YAML 文件来覆盖 Values 文件中的默认值。

    ```bash
    helm install mychart ./mychart --set key1=value1,key2=value2
    ```

    或者

    ```bash
    helm install mychart ./mychart -f values_override.yaml
    ```

通过适当理解和编辑 `values.yaml` 文件，用户可以根据他们的需求自定义 Helm Charts 的行为，从而更灵活地部署和管理应用程序。



## helm 最佳实践
### 安装/升级应用
- 下面以 argocd 为例
```sh
# 1. 添加应用仓库
helm repo add argo https://argoproj.github.io/argo-helm

# 2. 查看仓库中有哪些 chart
helm search repo argo
helm repo list # 验证，列出现有的chart仓库

# 3. 查看具体 chart 的所有版本信息
helm search repo argo/argo-cd -l

# 4. 下载选定的 chart 包，适用于离线环境，后期安装时还可以提高加载速度
helm pull argo/argo-cd --version 9.3.7

# 5. 查看 chart 的默认 values 文件，只把需要的内容复制到 values.yaml 中，并按需修改
helm show values ./argo-cd-9.3.7.tgz > reference-defaults.yaml
helm show readme ./argo-cd-9.3.7.tgz > reference-readme.md # 查看chart的安装前readme


# 6. 安装或更新 argo-cd
helm upgrade --install argocd ./argo-cd-9.3.7.tgz \
  -f values.yaml \
  --namespace argocd \
  --create-namespace

# 7. 查看安装状态，比如：接下来该如何操作等...
helm status argocd -n argocd
```



## ========================================




### get

`helm get` 命令是 Helm 包管理器中的一个常用命令，用于获取有关 Helm 发行版（release）的信息。它可以用于查看已部署应用程序的状态、配置和其他相关详细信息。

下面是 `helm get` 命令的详细解释：

```
helm get [SUBCOMMAND] [RELEASE] [flags]
```

- `[SUBCOMMAND]`：可选的子命令，用于指定要获取的信息类型。常见的子命令包括：
  - `values`：获取发行版的配置值。
  - `manifest`：获取发行版的 Kubernetes 资源清单。
  - `hooks`：获取发行版的钩子（hooks）信息。
  - `notes`：获取发行版的备注信息。
  - `status`：获取发行版的状态信息。
  - `all`：获取发行版的所有信息。
- `[RELEASE]`：指定要获取信息的 Helm 发行版的名称。
- `[flags]`：可选的标志选项，用于配置获取操作的各个方面。常见的标志选项包括：
  - `--namespace namespace`：指定 Helm 发行版所在的命名空间。
  - `--revision revision`：指定要获取的 Helm 发行版的特定版本号。

`helm get` 命令根据指定的子命令和标志选项来获取与 Helm 发行版相关的信息。以下是几个常见的用法示例：

1. 获取发行版的配置值：

   ```
   helm get values [RELEASE]
   ```

2. 获取发行版的状态信息：

   ```
   helm get status [RELEASE]
   ```

3. 获取发行版的 Kubernetes 资源清单：

   ```
   helm get manifest [RELEASE]
   ```

4. 获取发行版的所有信息：

   ```
   helm get all [RELEASE]
   ```

注意：在运行 `helm get` 命令之前，请确保已经安装了 Helm 并初始化了相关的 Kubernetes 环境，并且存在指定名称的 Helm 发行版。

### 范例：通过 get 辅助排错

背景：通过 helm 部署的同一版本 harbor，某一版本无法通过 `docker login`  进行登录

- 通过 `helm ls`  列出当前部署的应用 

```sh
# helm ls -n darknet-target
NAME        	NAMESPACE     	REVISION	UPDATED                                	STATUS  	CHART       	APP VERSION
harbor-example	darknet-target	1       	2023-03-24 02:58:00.553612058 +0000 UTC	deployed	harbor-1.9.3	2.5.3      


# helm ls -n harbor
NAME  	NAMESPACE	REVISION	UPDATED                               	STATUS  	CHART       	APP VERSION
harbor	harbor   	2       	2023-07-07 16:57:36.41910434 +0800 CST	deployed	harbor-1.9.3	2.5.3      
```

- 通过 `helm get` 获取部署时添加的参数，对添加的额外参数进行比对，进行比对

```sh
# 未记录部署时的参数
# helm get values -n darknet-target  harbor-example
USER-SUPPLIED VALUES:
caSecretName: ""
chartmuseum:
  absoluteUrl: false
  affinity: {}
  automountServiceAccountToken: false
...



# 记录了部署时添加的参数
# helm get values -n harbor harbor
USER-SUPPLIED VALUES:
expose:
  nodePort:
    ports:
      http:
        nodePort: 30003
      notary:
        nodePort: 30005
  tls:
    enabled: false
  type: nodePort
externalURL: http://172.16.0.120



# 对比差异（问题就出在这里，需要加上30003端口才行！）
# helm get values -n darknet-target  harbor-example | grep externalURL
externalURL: http://172.16.0.120:30002
```

- 也可以通过`manifest` 获取发行版的 Kubernetes 资源清单。

```sh
# helm get manifest -n harbor harbor | grep 172.16.0.120
  EXT_ENDPOINT: "http://172.16.0.120:30003"
```




# ---

# helm 部署应用

## 直接部署

1. 创建 namespace（可选），例如：

   - ```
     kubectl create ns monitoring
     ```

2. 安装 chart 仓库，例如：

   - ```
     helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
     ```

3. 选择当前可用版本（可选），例如：

   - ```
     helm search repo prometheus-community/prometheus --versions | egrep "prometheus-community/prometheus\s+" | less -S
     ```

4. 选择指定版本部署，例如：

   - ```
     helm install prometheus prometheus-community/prometheus \
     -n monitoring \
     --version 25.8.2
     ```



## 通过 values 文件部署

### 获取 values 文件

#### 基于 helm pull

1. 安装 chart 仓库，例如：

   - ```
     helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
     ```

2. 选择当前可用版本（可选），例如：

   - ```
     helm search repo prometheus-community/prometheus --versions | egrep "prometheus-community/prometheus\s+" | less -S
     ```

3. 拉取chart包，解压后获取values文件

   - ```sh
     $ helm pull prometheus-community/prometheus --version 25.8.2
     
     $ tar xf prometheus-25.8.2.tgz 
     
     $ ls prometheus/values.yaml 
     prometheus/values.yaml
     ```

#### 基于 helm show values

https://helm.sh/docs/intro/using_helm/#customizing-the-chart-before-installing

1. 安装 chart 仓库，例如：

   - ```
     helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
     ```

2. 选择当前可用版本（可选），例如：

   - ```
     helm search repo prometheus-community/prometheus --versions | egrep "prometheus-community/prometheus\s+" | less -S
     ```

3. 拉取chart包，解压后获取values文件

   - ```sh
     $ helm show values prometheus-community/prometheus --version 25.8.2 > show_values.yaml
     ```

### 修改 values 文件

#### 修改镜像地址

- 解决无法拉取镜像等问题
- 可通过 vim 打开 values 文件，搜索 `pullPolicy`，而后更改其上下文关联的镜像地址。



### 部署

```py
helm install prometheus prometheus-community/prometheus --namespace  monitoring -f values.yaml

# 部署成功后将会有以下提示：
'''
NAME: prometheus
LAST DEPLOYED: Fri Mar  1 15:07:17 2024
NAMESPACE: monitoring
STATUS: deployed
REVISION: 1
TEST SUITE: None
NOTES:
The Prometheus server can be accessed via port 80 on the following DNS name from within your cluster:
prometheus-server.monitoring.svc.cluster.local


Get the Prometheus server URL by running these commands in the same shell:
  export POD_NAME=$(kubectl get pods --namespace monitoring -l "app.kubernetes.io/name=prometheus,app.kubernetes.io/instance=prometheus" -o jsonpath="{.items[0].metadata.name}")
  kubectl --namespace monitoring port-forward $POD_NAME 9090


The Prometheus alertmanager can be accessed via port 9093 on the following DNS name from within your cluster:
prometheus-alertmanager.monitoring.svc.cluster.local


Get the Alertmanager URL by running these commands in the same shell:
  export POD_NAME=$(kubectl get pods --namespace monitoring -l "app.kubernetes.io/name=alertmanager,app.kubernetes.io/instance=prometheus" -o jsonpath="{.items[0].metadata.name}")
  kubectl --namespace monitoring port-forward $POD_NAME 9093
#################################################################################
######   WARNING: Pod Security Policy has been disabled by default since    #####
######            it deprecated after k8s 1.25+. use                        #####
######            (index .Values "prometheus-node-exporter" "rbac"          #####
###### .          "pspEnabled") with (index .Values                         #####
######            "prometheus-node-exporter" "rbac" "pspAnnotations")       #####
######            in case you still need it.                                #####
#################################################################################


The Prometheus PushGateway can be accessed via port 9091 on the following DNS name from within your cluster:
prometheus-prometheus-pushgateway.monitoring.svc.cluster.local


Get the PushGateway URL by running these commands in the same shell:
  export POD_NAME=$(kubectl get pods --namespace monitoring -l "app=prometheus-pushgateway,component=pushgateway" -o jsonpath="{.items[0].metadata.name}")
  kubectl --namespace monitoring port-forward $POD_NAME 9091

For more information on running Prometheus, visit:
https://prometheus.io/
'''
```



### 网络不好时的部署方式

手动下载 Prometheus 的 chart 包并安装可以通过以下步骤实现：

1. **从 GitHub 下载 chart 包**：访问 Prometheus 的 GitHub 仓库（https://github.com/prometheus-community/helm-charts），在 releases 页面找到你需要的版本，下载对应的 chart 包。通常，chart 包是以 `.tgz` 格式压缩的。你可以使用浏览器或者命令行工具下载。

2. **将 chart 包放置在本地**：将下载的 chart 包放置在本地一个你方便访问的目录下，例如 `/path/to/local/charts`。

3. **使用 helm install 安装 Prometheus**：在安装 Prometheus 时，通过指定本地路径来告诉 Helm 使用你手动下载的 chart 包。在命令中使用 `--set` 或 `-f` 标志来指定你的自定义配置。以下是一个示例命令：

```bash
helm install prometheus /path/to/local/charts/prometheus-25.8.2.tgz -n monitoring -f values.yaml

# helm install prometheus ./prometheus-25.8.2.tgz -n monitoring -f prometheus/values.yaml 
```

在这个命令中，`/path/to/local/charts/prometheus-25.8.2.tgz` 是你下载并放置在本地的 Prometheus chart 包的路径，`-n monitoring` 是指定安装到的命名空间，`-f values.yaml` 是指定自定义配置文件。

通过这些步骤，你应该能够使用手动下载的 chart 包来安装 Prometheus，而不受网络问题的影响。

## ---

## 范例

### kubernetes-dashboard

```sh
kubectl create ns kubernetes-dashboard
helm repo add kubernetes-dashboard https://kubernetes.github.io/dashboard/
helm pull kubernetes-dashboard/kubernetes-dashboard --version 7.1.2
tar xf kubernetes-dashboard-7.1.2.tgz
helm install kubernetes-dashboard ./kubernetes-dashboard-7.1.2.tgz  -n kubernetes-dashboard -f kubernetes-dashboard/values.yaml
```

```sh
# 修改为 NodePort
kubectl edit svc -n kubernetes-dashboard kubernetes-dashboard-web

# 获取token

```



### Redis

- https://artifacthub.io/packages/helm/bitnami/redis

#### 部署

```sh
# 安装第三方提供的redis chart仓库，my-repo为自定义的仓库名称
# helm repo add my-repo https://charts.bitnami.com/bitnami
"my-repo" has been added to your repositories


# 更新chart仓库索引信息
# helm repo update
Hang tight while we grab the latest from your chart repositories...
...Successfully got an update from the "my-repo" chart repository
Update Complete. ⎈Happy Helming!⎈


# 验证chart仓库
# helm repo list
NAME                	URL                                               
my-repo             	https://charts.bitnami.com/bitnami


# 查看chart仓库中可用的chart
# helm search repo my-repo
...


# 安装redis chart，redis是自定义的chart安装后的名称，如报错可以打印安装前的readme，也可以通过values.yaml文件传递参数
# 通过命令行传递参数以禁用存储类（参数内容可以参考values.yaml文件）
helm install redis my-repo/redis -n redis 


# 验证
helm list -n redis
kubectl get pod -n redis


# 后期可以根据安装后的输出提示进行连接等操作，输出提示可以使用以下命令查看：
helm status redis -n redis
```

#### 升级

- helm upgrade [RELEASE] [CHART] [flags]

#### 卸载

```sh
helm delete redis # 新版本用uninstall，不过目前delete也能用
```





### Prometheus

- https://artifacthub.io/packages/helm/prometheus-community/prometheus

#### 部署

```sh
# 安装Prometheus提供的chart仓库
# helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
"prometheus-community" has been added to your repositories


# 更新chart仓库索引信息
# helm repo update
Hang tight while we grab the latest from your chart repositories...
...Successfully got an update from the "prometheus-community" chart repository
Update Complete. ⎈Happy Helming!⎈


# 验证chart仓库
# helm repo list
NAME                	URL                                               
prometheus-community	https://prometheus-community.github.io/helm-charts


# 查看chart仓库中可用的chart
# helm search repo prometheus
NAME                                              	CHART VERSION ...   
prometheus-community/kube-prometheus-stack        	41.4.1        ...
prometheus-community/prometheus                   	15.16.1       ...
prometheus-community/prometheus-adapter           	3.4.1         ...   
prometheus-community/prometheus-blackbox-exporter 	7.1.1         ...


# 安装 Prometheus chart，prom是自定义的chart安装后的名称
helm install prometheus prometheus-community/prometheus [-n prom] [ -f values-prometheus.yaml]
.........
```

#### 升级

- helm upgrade [RELEASE] [CHART] [flags]

```sh
# 使用ingress-nginx名称空间是因为ingress-nginx安装在这里了，没有将ingress-nginx部署清单的默认namespace修改
# helm upgrade prometheus prometheus-community/prometheus -n ingress-nginx -f values-prometheus.yaml
```



### longhorn

- 通过导出values文件的方式实现自定义安装

```sh
# 添加 Longhorn Helm 存储库：
# helm repo add longhorn https://charts.longhorn.io
# helm repo list
NAME                	URL                                               
longhorn            	https://charts.longhorn.io       
...


# 从存储库中获取最新的图表：
# helm repo update
...


# 尝试安装后卸载
# helm install longhorn longhorn/longhorn --namespace longhorn-system --create-namespace --version 1.3.2
...


# 会在家目录中生成以下压缩文件，其中包含values文件
# ls -l /root/.cache/helm/repository/longhorn-1.3.2.tgz 
-rw-r--r-- 1 root root 28128 Dec 28 22:50 /root/.cache/helm/repository/longhorn-1.3.2.tgz


# 导出values文件
# tar xf /root/.cache/helm/repository/longhorn-1.3.2.tgz -C /tmp/
# ls /tmp/longhorn/
app-readme.md  Chart.yaml  questions.yaml  README.md  templates  values.yaml
# cp /tmp/longhorn/values.yaml /k8s-data/helm/values-longhorn.yaml


# 编辑values文件后应用
# vim /k8s-data/helm/values-longhorn.yaml
...
# helm install longhorn longhorn/longhorn --namespace longhorn-system -f /k8s-data/helm/values-longhorn.yaml
...
```



# helm 更新 & 回滚应用

https://helm.sh/docs/intro/using_helm/#helm-upgrade-and-helm-rollback-upgrading-a-release-and-recovering-on-failure

**注意：更新时如不指定版本，则会升级到最新版本！**

### 通过 values 文件更新

- 例如修改values文件后，可通过以下方式更新

```sh
# helm upgrade prometheus prometheus-community/prometheus --namespace  monitoring -f values.yaml
Release "prometheus" has been upgraded. Happy Helming!
NAME: prometheus
LAST DEPLOYED: Fri Mar  1 15:42:54 2024
NAMESPACE: monitoring
STATUS: deployed
REVISION: 2 # 从1升级到2
TEST SUITE: None
NOTES:
The Prometheus server can be accessed via port 80 on the following DNS name from within your cluster:
prometheus-server.monitoring.svc.cluster.local


Get the Prometheus server URL by running these commands in the same shell:
  export POD_NAME=$(kubectl get pods --namespace monitoring -l "app.kubernetes.io/name=prometheus,app.kubernetes.io/instance=prometheus" -o jsonpath="{.items[0].metadata.name}")
  kubectl --namespace monitoring port-forward $POD_NAME 9090


The Prometheus alertmanager can be accessed via port 9093 on the following DNS name from within your cluster:
prometheus-alertmanager.monitoring.svc.cluster.local


Get the Alertmanager URL by running these commands in the same shell:
  export POD_NAME=$(kubectl get pods --namespace monitoring -l "app.kubernetes.io/name=alertmanager,app.kubernetes.io/instance=prometheus" -o jsonpath="{.items[0].metadata.name}")
  kubectl --namespace monitoring port-forward $POD_NAME 9093


The Prometheus PushGateway can be accessed via port 9091 on the following DNS name from within your cluster:
prometheus-prometheus-pushgateway.monitoring.svc.cluster.local


Get the PushGateway URL by running these commands in the same shell:
  export POD_NAME=$(kubectl get pods --namespace monitoring -l "app=prometheus-pushgateway,component=pushgateway" -o jsonpath="{.items[0].metadata.name}")
  kubectl --namespace monitoring port-forward $POD_NAME 9091

For more information on running Prometheus, visit:
https://prometheus.io/
```



```sh
# helm upgrade grafana grafana/grafana -f values.yaml -n grafana
Release "grafana" has been upgraded. Happy Helming!
NAME: grafana
LAST DEPLOYED: Sun Mar  3 09:19:40 2024
NAMESPACE: grafana
STATUS: deployed
REVISION: 2
NOTES:
1. Get your 'admin' user password by running:

   kubectl get secret --namespace grafaa grafana -o jsonpath="{.data.admin-password}" | base64 --decode ; echo


2. The Grafana server can be accessed via port 80 on the following DNS name from within your cluster:

   grafana.grafana.svc.cluster.local

   Get the Grafana URL to visit by running these commands in the same shell:
     export NODE_PORT=$(kubectl get --namespace grafana -o jsonpath="{.spec.ports[0].nodePort}" services grafana)
     export NODE_IP=$(kubectl get nodes --namespace grafana -o jsonpath="{.items[0].status.addresses[0].address}")
     echo http://$NODE_IP:$NODE_PORT

3. Login with the password from step 1 and the username: admin
```



# helm 卸载应用

例如：

```
helm uninstall prometheus  --namespace  monitoring
```



# ---

# 1

```
kustomize, helm

部署应用程序: 资源清单
	Deployment, Service, ConfigMap, Secret, RBAC(Role, ClusterRole, ...), ...

	kustomize, helm: 部署工具

	StatefulSet, Deployment, Service, ...

	Operator
		etcd-operator
			etcdCluster

部署Prometheus
	helm部署原生版Prometheus Server, 要借助于StatefulSet完成; 
	helm部署prometheus-operator, 再operator部署prometheus server
		CRD


https://ip:port/metrics


https://kubernetes.default.svc:443/api/v1/nodes/node01/proxy/metrics



pod
	prometheus.io/scrape: true/false

	__meta_kubernetes_pod_annotation_prometheus_io_scrape = true|false

	__meta_kubernetes_pod_annotation_prometheus_io_path = /metrics

	 __meta_kubernetes_pod_annotation_prometheus_io_port = 80
	 	http://10.244.1.6:80/metrics











	--tls-cert-file和--tls-private-key-file：metrics-server服务进程使用的证书和私钥，未指定时将由程序自动生成自签证书，生产环境建议自行指定；
	--secure-port=<port>：metrics-server服务进程对外提供服务的端口，默认为443，以非管理员账户运行时建议修改为1024及以上的端口号，例如4443等；
	--metric-resolution=<duration>：从kubelet抓取指标数据的时间间隔，默认为60s；
	--kubelet-insecure-tls：不验证为kubelet签发证书的CA，对于kubelet使用自签证书的测试环境较为有用，但不建议生产环境使用；
	--kubelet-preferred-address-types：与kubelet通信时倾向于使用的地址类型顺序，默认为Hostname、InternalDNS、InternalIP、ExternalDNS和ExternalIP；
	--kubelet-port：kubelet监听的能够提供指标数据的端口号，默认为10250。






1）监控代理程序，例如node_exporter，收集标准的主机指标数据，包括平均负载、CPU、Memory、Disk、Network及诸多其他维度的数据。
2）kubelet（cAdvisor）：收集容器指标数据，它们也是Kubernetes“核心指标”，每个容器的相关指标数据主要有CPU利用率（user和system）及限额、文件系统读/写/限额、内存利用率及限额、网络报文发送/接收/丢弃速率等。
3）Kubernetes API Server：收集API Server的性能指标数据，包括控制工作队列的性能、请求速率与延迟时长、etcd缓存工作队列及缓存性能、普通进程状态（文件描述符、内存、CPU等）、Golang状态（GC、内存和线程等）。
3）etcd：收集etcd存储集群的相关指标数据，包括领导节点及领域变动速率、提交/应用/挂起/错误的提案次数、磁盘写入性能、网络与gRPC计数器等。
4）kube-state-metrics：该组件用于根据Kubernetes API Server中的资源派生出多种资源指标，它们主要是资源类型相关的计数器和元数据信息，包括指定类型的对象总数、资源限额、容器状态（ready/restart/running/terminated/waiting）以及Pod资源的标签系列等。



k8s-prometheus-adapter: 
	custom.metrics.k8s.io或external.metrics.k8s.io

kube-metrics-adapter







rules:
  default: true   # 是否加载默认规则；
  custom:
#  - seriesQuery: '{__name__=~"^http_requests_.*",kubernetes_namespace!="",kubernetes_pod_name!=""}'
#    resources:
#      overrides:
#        kubernetes_namespace: {resource: "namespace"}
#        kubernetes_pod_name: {resource: "pod"}
#    metricsQuery: '<<.Series>>{<<.LabelMatchers>>}'
  - seriesQuery: 'http_requests_total{kubernetes_namespace!="",kubernetes_pod_name!=""}'
    resources:
      overrides:
        kubernetes_namespace: {resource: "namespace"}
        kubernetes_pod_name: {resource: "pod"}
    name:
      matches: "^(.*)_total"
      as: "${1}_per_second"
    metricsQuery: 'rate(<<.Series>>{<<.LabelMatchers>>}[2m])'
  existing:
  external: []
```

## ---


# Helm 概述
Helm 是 Kubernetes 的包管理器，类似 CentOS yum / Ubuntu apt，使用它可以极大地简化应用的部署和管理。
- https://helm.sh/zh
- https://github.com/helm/helm

# Helm 相关组件
**Helm**
- helm 是一个命令行下的客户端工具。类似于 apt / yum；
- 主要用于 Kubernetes 应用程序 Chart 的创建、打包、发布以及创建和管理本地和远程的 Chart 仓库。

**Chart**
- Helm 的软件包，每个包称为一个Chart。类似于 .deb / .rpm 包；
  - 一般Chart是由目录使用tar打包而成，形成 `name-version.tgz `格式的单一文件，方便传输和存储。
- Chart中包含的内容：
  - 一组定义 Kubernetes 资源相关的 YAML 文件
  - 运行一个 Kubernetes应用所需要的镜像、依赖关系等
- 官方Chart仓库：https://artifacthub.io/

**Repoistory**
- Helm 的软件仓库，Repository 本质上是一个 Web 服务器，该服务器保存了一系列的 Chart 软件包以供用户下载，并且提供了一个该 Repository 的 Chart 包的清单文件以供查询。
- Helm 可以同时管理多个不同的 Repository。
- 集中存储和分发Chart的仓库，类似于Perl的CPAN，或者Python的PyPI等。

**Release**
- 使用 helm install 命令在 Kubernetes 集群中部署的 Chart 称为 Release。
- 需要注意的是：Helm 中提到的 Release 和我们通常概念中的版本有所不同，这里的 Release 可以理解为 Helm 使用 Chart 包部署的一个应用实例。
- Chart实例化配置后运行于Kubernetes集群中的一个应用实例；在同一个集群上，一个Chart可以使用不同的Config重复安装多次，每次安装都会创建一个新的“发布（Release）”。
- 名为一个应用实例，但实际上一般是多个api-resources的集合

**Config**
- Chart实例化安装运行时使用的配置信息。



# Helm helm
- https://github.com/helm/helm/releases
- PS：helm 命令执行时也需要 kubeconfig 文件，通常 kubectl 命令能执行则 helm 同样也能执行。
```sh
wget https://get.helm.sh/helm-v3.13.3-linux-amd64.tar.gz
tar xf helm-v3.13.3-linux-amd64.tar.gz 
cp linux-amd64/helm /usr/local/sbin
rm -fr linux-amd64/
helm version
```



# Helm 最佳实践
## 安装/升级应用
```sh
# 添加应用对应的 helm 仓库
helm repo add grafana https://grafana.github.io/helm-charts

# 更新仓库
helm repo update

# 查看目前仓库所有可用的应用与版本，不加 -l 则只显示最新版
helm search repo grafana/loki -l | grep 'loki '

# 导出指定版本的 values 文件（文件名一定要加版本号，因为不同版本可能会有差异）
# --version 参数指定的是 CHART VERSION
helm show values grafana/loki --version 5.43.3 > values-loki-5.43.3.yaml


# 根据部署需求，手动修改 values 文件
略

# 安装/升级
# upgrade --install 为官方推荐写法，第一次执行就是 install，之后每次再执行都是 upgrade。
# loki grafana/loki --version 5.43.3 必须指定，因为 values.yaml 只是“配置覆盖”，chart 名 + 版本才是“安装哪一个软件包”。
# loki 是 Helm release 的名字（对应 helm list -A 的 name 列），grafana/loki 是 chart 的名称。
helm upgrade --install loki grafana/loki \
  --version 5.43.3 \
  --namespace monitoring \
  --create-namespace \
  -f values-loki-5.43.3.yaml
```

## 卸载应用
``` sh
# Pod、ConfigMap、Secret 等由 Helm 管理的资源会被删除，但 pvc 会保留。
helm uninstall loki --namespace monitoring

# 删除 pvc（可选）
kubectl delete pvc -n monitoring -l app.kubernetes.io/name=loki
```
## 其他常用命令
```sh
# 查看目前所有通过helm安装的应用信息（NAME 列就是 Helm release 的名字）
helm list -A

# 导出部署清单
helm get manifest cilium -n cilium > manifest.yaml

# 显示 Helm 的所有环境路径
helm env
```


# Helm FAQ
## 更新时提示网络超时
- 当修改完 values 文件后，执行 upgrade 更新软件包时，有时会提示网络超时，其根本原因是因为去互联网上下载了chart包，而链接的地址通常在境外。

```sh

# vector/vector 是去互联网下载
# helm upgrade --install vector vector/vector   --version 0.35.3   --namespace monitoring   --create-namespace   -f values-vector-0.35.3.yaml
Error: Get "https://github.com/vectordotdev/helm-charts/releases/download/vector-0.35.3/vector-0.35.3.tgz": unexpected EOF


# 解决方案一：如果本机有缓存，直接指定缓存
# 直接使用本地 .tgz 文件
helm upgrade --install vector /root/.cache/helm/repository/vector-0.35.3.tgz \
  --namespace monitoring \
  --create-namespace \
  -f values-vector-0.35.3.yaml
# 或者先将缓存文件复制/重命名到当前目录，再升级
cp /root/.cache/helm/repository/vector-0.35.3.tgz .
helm upgrade --install vector ./vector-0.35.3.tgz \
  --namespace monitoring \
  --create-namespace \
  -f values-vector-0.35.3.yaml \
  --timeout 10m


# 解决方案二：本机开代理下载 Chart，而后拷贝至目标服务器
helm pull vector/vector --version 0.35.3 # 将 vector-0.35.3.tgz 下载至当前目录
```
