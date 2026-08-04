---
title: "Grafana"
---

# Grafana概述

[Introduction to Grafana | Grafana documentation](https://grafana.com/docs/grafana/v9.3/introduction/)

Grafana是什么？Grafana是一个开源的数据可视化平台，支持当前几乎所有（30+）的主流的数据库（包括开源或者商业化的数据库）通过接入各种数据源，就可以快速地查询和可视化数据。



Grafana能为我们做什么？Grafana能够将各种数据源的数据混合在同一个仪表盘中完美的展现出来，以便我们能更好地理解当前数据指标，培养团队数据驱动型文化。



Grafana常用数据源有哪些？常用的数据源有Graphite、MySQL、Influxdb、Prometheus、Elasticsearch、AWS CloudWatch等；商业化的数据源包括如Microsoft SQL Server、Oracle公司的Oracle数据库等。

除此之外，Grafana还有一个explore(探索) 模式，在explore模式下我们可以编写查询语句进行查询（相当于查询客户端），这样我们就可以先专注于查询迭代，直到有一个有效的查询，然后再考虑将其放到仪表盘中。



Grafana支持告警功能吗？支持多种告警方式，如Email、Telegram、钉钉等Webhook方式，但监控与告警并非Grafana的强项。



Grafana如何展示数据？Grafana靠各种插件来展示数据。插件分原生（内置）插件和社区插件。 原生插件包括：Graph（图形）、Singlestat（单值状态图）、Stat（状态图）、Gauge（仪表度量图）、Bar Gauge（条状态度量图）、Table（表格图）、Text（文本图）、Dashboard list（仪表盘列表）、Plugin list（插件列表）、Alert List（告警列表图）等，其中Stat和Bar Gauge目前在v6.x里仍还是Beta版。



Grafana社区常用插件包括：Zabbix、Diagram、ImageIt、FlowCharting等。

另外，像Clock、Pie Chart也出自出Grafana Labs，但没有内置在Grafana中。



Grafana官网插件下载地址：https://grafana.com/grafana/plugins?orderBy=weight&direction=asc

Grafana Dashboard地址：https://grafana.com/grafana/dashboards?orderBy=name&direction=asc



为什么要用Grafana？因为Grafana支持接入当前各种主流的数据库，并且能将各数据库中的数据以非常灵活酷炫的图表展现出来，同时也因为是开源软件方便二次开发定制。另外，当前主流开源的监控系统诸如zabbix、prometheus、open-falcon等均能与Grafana完美结合来展示图表数据。作为一名IT运维人员，除了要及时有效地监控到系统运行状态，还需要展示各种数据趋势，快速发现问题。所以，熟练使用Grafana的各种插件也是运维人员必会技能。

# 部署

## rpm

国内有镜像，直接下载镜像安装也行：

- https://developer.aliyun.com/mirror/grafana

```sh
#安装依赖包
# yum -y install initscripts urw-fonts wget

#下载rpm包
# wget https://dl.grafana.com/oss/release/grafana-8.3.7-1.x86_64.rpm

#安装
# rpm -Uvh grafana-8.3.7-1.x86_64.rpm

#修改主配置文件
# vim /etc/grafana/grafana.ini
...
[server]
...
protocol = http #设置http
http_port = 3000 #设置监听端口为3000
...

#启动服务
# systemctl enable --now grafana-server.service 

#浏览器访问，默认账号和密码都是admin
http://10.0.0.38:3000/login
```



## apt

- Ubuntu 20.04

```sh
# 安装依赖包
# apt-get install -y adduser libfontconfig1


# 下载rpm包（Work_Files中有）
# wget https://mirrors.tuna.tsinghua.edu.cn/grafana/apt/pool/main/g/grafana/grafana_8.5.9_amd64.deb

# 安装
# dpkg -i grafana_8.5.9_amd64.deb

# 修改主配置文件
# vim /etc/grafana/grafana.ini
...
[server]
...
protocol = http #设置http
http_port = 3000 #设置监听端口为3000
...
# 可以修改默认账户和密码
[security]
# default admin user, created on startup
;admin_user = admin
# default admin password, can be changed before first start of grafana,  or in profile settings
;admin_password = admin

#启动服务
# systemctl enable --now grafana-server.service 

#浏览器访问，默认账号和密码都是admin
http://10.0.0.103:3000/login

#安装插件方法一

#安装插件方法二

```



## kubernetes yaml

https://grafana.com/docs/grafana/v10.3/setup-grafana/installation/kubernetes/

- 默认账号和密码都为 admin

```yaml
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: grafana-pvc
  namespace: monitoring
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 3Gi
---
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    app: grafana
  name: grafana
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: grafana
  template:
    metadata:
      labels:
        app: grafana
    spec:
      securityContext:
        fsGroup: 472
        supplementalGroups:
          - 0
      containers:
        - name: grafana
          image: grafana/grafana:9.5.15
          imagePullPolicy: IfNotPresent
          ports:
            - containerPort: 3000
              name: http-grafana
              protocol: TCP
          readinessProbe:
            failureThreshold: 3
            httpGet:
              path: /robots.txt
              port: 3000
              scheme: HTTP
            initialDelaySeconds: 10
            periodSeconds: 30
            successThreshold: 1
            timeoutSeconds: 2
          livenessProbe:
            failureThreshold: 3
            initialDelaySeconds: 30
            periodSeconds: 10
            successThreshold: 1
            tcpSocket:
              port: 3000
            timeoutSeconds: 1
          resources:
            requests:
              cpu: 250m
              memory: 750Mi
          volumeMounts:
            - mountPath: /var/lib/grafana
              name: grafana-pv
      volumes:
        - name: grafana-pv
          persistentVolumeClaim:
            claimName: grafana-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: grafana
  namespace: monitoring
spec:
  ports:
    - port: 3000
      protocol: TCP
      targetPort: http-grafana
      nodePort: 30300
  selector:
    app: grafana
  sessionAffinity: None
  type: NodePort 
```



## helm

```py
kubectl create ns monitoring
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update
helm pull grafana/grafana --version 7.2.5
tar xf grafana-7.2.5.tgz 
vim grafana/values.yaml # 开启存储持久化
helm install grafana -n monitoring ./grafana-7.2.5.tgz -f grafana/values.yaml
```



# 配置文件

- `rpm -ql grafana`

```sh
/etc/grafana/grafana.ini # 主配置文件

/etc/init.d/grafana-server # 

/etc/sysconfig/grafana-server # service文件加载此文件中的配置相关环境变量

/usr/lib/systemd/system/grafana-server.service

/usr/sbin/grafana-cli # grafana命令行工具
```

## /etc/sysconfig/grafana-server

```sh
GRAFANA_USER=grafana # 系统用户

GRAFANA_GROUP=grafana # 系统组

GRAFANA_HOME=/usr/share/grafana # 家目录，静态资源默认存放位置，升级时建议备份

LOG_DIR=/var/log/grafana # 日志目录

DATA_DIR=/var/lib/grafana # 数据默认存放目录，升级时建议备份

MAX_OPEN_FILES=10000 # 最大支持打开文件数

CONF_DIR=/etc/grafana # 配置文件目录，升级时建议备份

CONF_FILE=/etc/grafana/grafana.ini # 主配置文件

RESTART_ON_UPGRADE=true # 更新时就重启

PLUGINS_DIR=/var/lib/grafana/plugins # 读取插件存目录

PROVISIONING_CFG_DIR=/etc/grafana/provisioning # 通过读取配置文件方式来配置datasource和dashboard，而不是在grafana图形窗口中操作

# Only used on systemd systems
PID_FILE_DIR=/var/run/grafana # 进程存放目录
```





## grafana.ini

- `/etc/grafana/grafana.ini`，下面只列出主配置文件中的一些核心配置

```ini
[paths]
# 修改数据存储路径后，需要将原来位置数据同步到新的路径下。
data = /var/lib/grafana
# 修改插件存放目录后，还应该修改/etc/sysconfig/grafana-server中PLUGINS_DIR
plugins = /var/lib/grafana/plugins
...


[server]
# 可以添加请求上下文，便于ngx反向代理
;root_url = %(protocol)s://%(domain)s:%(http_port)s/grafana
# 与root_url配置使用
;serve_from_sub_path = false
...
[database]
[datasources]
[remote_cache]
[dataproxy]
[analytics]
[security]
[security.encryption]
[snapshots]
[dashboards]
[users]
[auth]
[auth.anonymous]
[auth.github]
[auth.gitlab]
[auth.google]
[auth.grafana_com]
[auth.azuread]
[auth.okta]
[auth.generic_oauth]
[auth.basic]
[auth.proxy]
[auth.jwt]
[auth.ldap]
[aws]
[azure]
[rbac]
[smtp]
[emails]
[log]
[log.console]
[log.file]
[log.syslog]
[log.frontend]
[quota]
[unified_alerting]
[unified_alerting.reserved_labels]
[alerting]
[annotations]
[annotations.dashboard]
[annotations.api]
[explore]
[help]
[profile]
[query_history]
[metrics]
[metrics.environment_info]
[metrics.graphite]
[grafana_com]
[tracing.jaeger]
[tracing.opentelemetry]
[tracing.opentelemetry.jaeger]
[tracing.opentelemetry.otlp]
[external_image_storage]
[external_image_storage.s3]
[external_image_storage.webdav]
[external_image_storage.gcs]
[external_image_storage.azure_blob]
[external_image_storage.local]
[rendering]
[panels]
[plugins]
[live]
[plugin.grafana-image-renderer]
[enterprise]
[feature_toggles]
[date_formats]
[expressions]
[geomap]
[navigation.app_sections]
[navigation.app_standalone_pages]
```





## 其他说明

修改data或plugins默认存储路径时，除了改grafana.ini，还应该修改/etc/sysconfig/grafana-server和/etc/init.d/grafana-server（可选）

使用systemctl restart grafana-server命令读取了/etc/sysconfig/grafana-server中变量；使用/etc/init.d/grafana-server restart重启时，当/etc/sysconfig/grafana-server不存在，则使用/etc/init.d/grafana-server中默认指定的。



# 添加数据源

## Prometheus

```
http://prometheus-server.monitoring.svc.cluster.local:80
```



# 仪表盘

仪表盘模板：

- https://grafana.com/grafana/dashboards/



# 备份

## 升级前备份

- 升级前要先备份相关目录

```sh
# cp -rp /var/lib/grafana /var/lib/grafana_$(date +%Y%m%d%H%M)
# cp -rp /usr/share/grafana /usr/share/grafana_$(date +%Y%m%d%H%M)
# cp -rp /etc/grafana /etc/grafana_$(date +%Y%m%d%H%M)
```

## 升级

```sh
# yum -y install  https://dl.grafana.com/oss/release/grafana-6.7.2-1.x86_64.rpm
```

## 重启

```sh
# systemctl restart grafana-server.service
```



## ---

## 备份目录

- 此方式只是在本地做备份，更好的方式可以使用下面的备份工具

```sh
# cp -rp /var/lib/grafana /var/lib/grafana_$(date +%Y%m%d%H%M)

# cp -rp /usr/share/grafana /usr/share/grafana_$(date +%Y%m%d%H%M)

# cp -rp /etc/grafana /etc/grafana_$(date +%Y%m%d%H%M)
```





## 备份工具

- [GitHub - ysde/grafana-backup-tool：一个基于 Python 的应用程序，使用 Grafana API 备份 Grafana 设置](https://github.com/ysde/grafana-backup-tool)
- [Grafana 备份恢复教程 - 掘金 (juejin.cn)](https://juejin.cn/post/6906731073762230286)
- [教你一分钟内导出 Grafana 所有的 Dashboard - 腾讯云开发者社区-腾讯云 (tencent.com)](https://cloud.tencent.com/developer/article/1766285#:~:text=默认情况下会备份所有的组件，你也可以指定备份的组件： %24 grafana -backup save --components,%3D 比如，我只想备份 Dashboards 和 Folders：)



# 告警

- 告警并非 Grafana 的强项，但并非无用武之地，比如：单机运行的 Prometheus 虽然可以对其监控的内容进行阈值告警，但是自身如果宕机将无法发送告警，这时就可以使用 Grafana 的告警功能来对Prometheus 进行监控。
- 需要配合 Alert List Panel。

## 流程概述

- 配置 Grafana 邮件相关配置
- 配置告警通道 Notification policies 、Notification Channel(老版本)
- 创建 Time series Panel，定义Alert
  - PromQL例如：`up{instance="localhost:9090", job="prometheus"}`，此值返回1则表示正常运行，返回0表示运行不正常或未运行。





## Grafana 邮件相关配置

- `/etc/grafana/grafana.ini`

```ini
...
#################################### SMTP / Emailing ##########################
[smtp]
enabled = true
host = smtp.qq.com:465
user = 767483070@qq.com
password = ywkvhxiqjzrbbccb
skip_verify = true
from_address = 767483070@qq.com
from_name = Grafana
...
```

- 使其生效

```sh
# 重启grafana
systemctl restart grafana-server
```





## 配置告警通道 

Notification policies 、Notification Channel(老版本)

- 创建联系点后测试邮件发送是否生效
- 



## Alert List Panel

- Alert List Panel（告警列表面板），告警列表面板用于显示所有仪表盘（Dashboard）中的告警信息。可以将告警列表配置为显示当前状态或最近的状态更改等，也可以设置成只显示指定tags的Dashboard。

- 注意：
  - Grafana中只有Graph Panel、Time series 支持配置Alert，其它Panel没有告警图标(铃铛标志)Alert，因此无法定义。
  - 使用Zabbix数据源创建的图形面板也不支持配置Alert。
  - 另外，Alert list Panel也不支持模板与变量，即如果一个Dashboard中使用了模板变量，则其图形面板中不能设置Alert List Panel。

### 说明

**Options（选项）**

- Show选项包括：
  - Current state（当前状态）
  - Recent state change（最近状态改变），选中该选项，则只允许设置Max items（告警列表默认显示多少条，超出的条目将不显示）；
- Sort order（排序），可按字母升/降序，也可按重要性排序；
- Alerts from this dashboard（启用该选项，表示只显示当前Dashboard中的告警，其他Dashboard将不显示）。

**Filter（过滤器）**

- Alert name（按告警名称过滤）
- Dashboard title（按Dashboard 标题过滤）
- Foler（按Dashboard存放的文件夹来过滤，默认为ALL所有）
- Dashboard tags（按Dashboard设置的标签来过滤）

**State filter（按告警所处的状态来过滤）**

- 即在Grafana中告警状态包括：Ok、Paused、No data、Execution error、Alerting、Pending。



## Time series Panel

- 创建 Time series Panel，定义Alert



# 变量

https://grafana.com/docs/grafana/v9.3/dashboards/variables/

[020-grafana下使用变量-添加变量_Prometheus监控系统入门与实践_运维工具视频-51CTO学堂](https://edu.51cto.com/center/course/lesson/index?id=762291)

[grafana仪表盘中针对prometheus设置全局变量_51CTO博客_grafana仪表盘修改经验心得](https://blog.51cto.com/u_12227788/5464921)



# 用户管理

## 修改登录密码

- `grafana-cli admin reset-admin-password admin@12345`



# 插件

https://grafana.com/grafana/plugins/

https://grafana.com/docs/grafana/v9.0/administration/plugin-management/

## grafana-cli 管理插件

- 注意：grafana-cli 命令默认认为插件位置位于`/var/lib/grafana/plugins`，如需修改默认值，需要编辑`/usr/sbin/grafana-cli` 文件中的`PLUGINS_DIR=`
  - 或者使用` --pluginsDir` 选项明确指定
- PS：grafana的环境变量在多个文件中有定义，比如/etc/sysconfig/grafana-server、/usr/sbin/grafana-cli、/etc/init.d/grafana-server

### 列出本地已安装的插件

- `grafana-cli plugins ls`
  - 默认安装的插件不会显示

```sh
# grafana-cli plugins ls
```

### 列出远程可用插件

- `grafana-cli plugins list-remote`

```sh
# grafana-cli plugins list-remote | grep zabbix
id: alexanderzobnin-zabbix-app version: 4.2.10
```

### 列出插件可用版本

- `grafana-cli plugins list-versions <plugin id>`

```sh
# grafana-cli plugins list-versions alexanderzobnin-zabbix-app | head
4.2.10
4.2.9
4.2.8
4.2.7
4.2.6
4.2.5
4.2.4
4.2.3
4.2.2
4.2.1
```

### 安装插件

- `grafana-cli plugins install <plugin id> <plugin version (optional)>`
  - 不指定插件版本则默认安装最新版本
  - 注意：有的插件位于Google，因此无法从命令行直接下载安装

```sh
# 安装指定版本的插件
# grafana-cli plugins install alexanderzobnin-zabbix-app 4.2.8


# 使用--pluginsDir指定安装路径
# grafana-cli --pluginsDir=/data/grafana/plugins plugins install alexanderzobnin-zabbix-app  
```

#### 重启 grafana-server

- 使安装的插件生效需重启grafana

```
systemctl restart grafana-server
```

### 更新插件

- `grafana-cli plugins update <plugin id>`
  - 更新指定插件
- `grafana-cli plugins update-all`
  - 更新所有以安装的插件

### 卸载插件

- `grafana-cli plugins uninstall <plugin id>`





## 手动下载离线安装插件

- https://grafana.com/grafana/plugins/
  - 此页面搜索所需的插件
- 假设要安装1.4.0版本的piechart-panel插件，则下载地址为：https://grafana.com/api/plugins/grafana-piechart-panel/versions/1.4.0/download
  - 使用`grafana-cli plugins install` 安装插件时也能看到插件所对应的URI

```sh
# wget https://grafana.com/api/plugins/grafana-piechart-panel/versions/1.4.0/download -O grafana-piechart-panel.zip

# unzip grafana-piechart-panel.zip

# mv grafana-piechart-panel-b707cd5/ /data/grafana/plugins/grafana-piechart-panel

# systemctl restart grafana-server
```





## Grafana web 在线安装

- Configuration --> plugins



## 常用插件汇总

```
alexanderzobnin-zabbix-app
grafana-piechart-panel
agenty-flowcharting-panel
grafana-clock-panel
pierosavi-imageit-panel
jdbranham-diagram-panel
agenty-flowcharting-panel
```



#  配合 zabbix

## 安装zabbix插件

### 方法一

- Grafana web界面 --> Server Admin --> plugins --> 搜索zabbix --> install --> enable

### 方法二

- 官网地址：https://grafana.com/grafana/plugins/alexanderzobnin-zabbix-app/?tab=installation

```bash
# grafana-cli plugins install alexanderzobnin-zabbix-app
# systemctl restart grafana-server.service
```



## 添加MySQL数据源

- 在Grafana web界面中配置指向zabbix-server关联的数据库

### 创建授权账号

```sql
CREATE USER 'grafanauser'@'%' IDENTIFIED BY '123456';
GRANT SELECT ON zabbix.* TO 'grafanauser';
```

### web界面配置

- Grafana web界面 --> Configuration --> data sources --> MySQL
- **settings：**
  - Name：Zabbix-MySQL
  - Host：10.0.0.8
  - Database：zabbix
  - User：grafanauser
  - Password：123456
  - 其他保持默认
  - Save & test
  - Database Connection OK 表示成功



## 配置zabbix插件

- Grafana web界面 --> Configuration --> data sources --> Add data source --> Zabbix
- **settings：**
  - Name：Zabbix-server-10.0.0.8（自定义）
  - **HTTP:**
  - URL：http://10.0.0.8/api_jsonrpc.php
  - **Zabbix API details：**
  - Username：阿征（zabbix上的用户）
  - Password：xxx（zabbix上的用户密码）
  - **Direct DB Connection：**
  - Enable：√
  - Data Source：Zabbix-MySQL（选择刚才创建的MySQL数据源）
  - 其余默认
  - Save & test
  - Zabbix API version: 5.0.20, DB connector type: MySQL 表示成功



## 添加仪表盘主题

- 官网主题：https://grafana.com/grafana/dashboards/
- 添加主题时直接输入主题ID号即可 如：5363、7877等

### 添加主题

- Grafana web界面 --> +号图标 --> input --> 输入主题号如：5363 然后 load --> 选择数据源然后添加



# Panel

## Time series & Graph

[Time series | Grafana documentation](https://grafana.com/docs/grafana/latest/panels-visualizations/visualizations/time-series/)

- Graph是Grafana的原生插件。使用Graph Panel，可以将数据展示成折线、条状、点状等风格。
- Time series 是 Graph 的升级版，新版本默认已经将 Graph 改为 Time series

### 应用场景

- 进程每个状态的数量、每个时段的订单数、用户注册数量等



## Heatmap

[Heatmap | Grafana documentation](https://grafana.com/docs/grafana/latest/panels-visualizations/visualizations/heatmap/)

- Heatmap是Grafana的原生插件。Heatmap（热图）的用途，在Grafana官网是这样描述的：使用热图，将允许您查看随时间变化的直方图。
- 所以要使用热图的前提必先知道如何使用直方图。
- 什么是直方图？直方图是用于表示数值分布的图形，直方图将数值分组到一个一个的bucket当中，然后计算每个bucket中值出现次数。在直方图上，X轴表示表示数值的范围，Y轴表示对应数值出现的频次。在直方图上，对于各数值出现的次数，分布是否对称都显示的很清楚。
- 那什么又是Heatmap呢？直白一点说：Heatmap是用X轴表示时间，Y轴表示值的大小，bucket用来表示一个区间的值在对应时间点出现的次数。
- 热图类似于直方图，但随着时间的推移，每个时间片都表示自己的直方图。不使用条状的高度来表示频次，而是使用单元格，并将单元格的颜色与bucket中的值映射成对应关系，如用bucket的颜色深浅来表示数值出现的频次。





## Stat & Singlestat

[Stat | Grafana documentation](https://grafana.com/docs/grafana/latest/panels-visualizations/visualizations/stat/)

- Singlestat Panel是grafana的原生插件。Singlestat，从字面理解就是单个状态，显示的是查询的数据在某一时刻的状态值。简单来说就是只展示一个数值（如最大值、最小值、当前值、平均值或总和）。Singlestat还可以设置阈值来改变面板背景色。还可以将单个数值（或一个范围段的数值）映射为文本。
- Singlestat只支持返回单个序列的查询，即如果是多值查询，则不能用Singlestat，可以考虑Grafana新出的Stat Panel插件。
- Stat 是 Singlestat 的升级版，新版本默认已经将 Singlestat 改为 Stat。
  - **注意：**Singlestat已被[Stat面板](https://grafana.com/docs/grafana/latest/panels/visualizations/stat-panel/)取代，不再从Grafana 8.0中提供。有关如何迁移的更多信息，请参阅[迁移到新的统计信息面板](http://10.0.0.17:3000/#migrate-to-the-new-stat-panel)。
  - Stat 支持多值展示 但需要是同一类的数据（因为单位不能分别设置）；而 Singlestat 不支持。

### 应用场景

- 统计CPU总核心数、内存总大小、进程总数量等返回单一值的内容。
- 由于支持多值显示，因此还可以将系统的5、10、15分钟负载归纳到同一个图当中。







## Gauge & Bar gauge 

[Gauge | Grafana documentation](https://grafana.com/docs/grafana/latest/panels-visualizations/visualizations/gauge/)

[Bar gauge | Grafana documentation](https://grafana.com/docs/grafana/latest/panels-visualizations/visualizations/bar-gauge/)

- Gauge 和 Bar Gauge 均是 Grafana 的原生插件，使用简单。
- Gauge 是圆形展示，而 Bar Gauge 是条状展示（水平和垂直）。

### 应用场景

- 内存使用、磁盘分区使用等。显示会更加直观
- 每个分区的空间占有率百分比





## Table

[Table | Grafana documentation](https://grafana.com/docs/grafana/latest/panels-visualizations/visualizations/table/)

- Table  Panel也是Grafana的原生插件。Table Panel支持将基于时间序列的多种数据以表格式形式展示，Table Panel灵活且相对复杂。

### 应用场景

- 可以将磁盘每个分区的使用率等情况归纳到一个表格中。





## Pie Chart

[Pie chart | Grafana documentation](https://grafana.com/docs/grafana/latest/panels-visualizations/visualizations/pie-chart/)

- 在饼图上不适合展示非常多的数据，即使是用多种颜色区分在视觉上也不如条状图(Bar gauge)。

### 应用场景

- 在Pie Chart只适合展示较少种（3-4种）数据，例如按运营商来区分注册用户占比：移动、联通、电信和其他(海外)。

- 每个HTTP状态码出现比例。





## Text

[Text | Grafana documentation](https://grafana.com/docs/grafana/latest/panels-visualizations/visualizations/text/)

- Text Panel（文本面板），是用于为Dashboard增加描述性信息的面板。有三种输入模式，分别为：Markdown、HTML和Text。
  - 内容中不带任何语法标记，则为Text（纯文本），即输入的内容不做任何格式化。



## Dashboard List

- Dashboard List Panel（仪表盘列表面板），用于显示指向其他仪表板的链接，可理解为用于仪表盘导航菜单或目录吧。当有非常多的Dashboard时，将Dashboard分类展示很有必要。
- Dashboard List Panel可以配置为使用星号的仪表盘、最近查看的仪表盘、搜索查询和/或仪表盘标记。

### 说明

**Options（选项）**

- Starred（有标记 星星 的Dashboard，位于Dashboard的右上角，表示喜欢或较重要的Dashboard）
- Recently viewed（最近浏览过的Dashboard）
- Search（搜索查询或标记的仪表盘）
- Show headings（显示标题）
- Max items（允许显示最大条目数）

**Search（搜索）**

- Query（查询条件，如Dashboard的标题名或关键字）
- Folder（按文件夹搜索）
- Tags（按Dashboard标签搜索）



## Clock

https://github.com/grafana/clock-panel

- Clock Panel可以用来显示当前（各国）时间或用于倒计时，并支持每秒更新一次。
- Clock Panel也是Grafana Labs提供，但并非Native，需自行安装。

### 安装 Clock 插件

#### 方法一

- 从命令行直接安装

```sh
# grafana-cli plugins install grafana-clock-panel

# systemctl restart grafana-server
```

#### 方法二

- 如无法从命令行直接安装，可以从GitHub下载相关的包而后安装

```sh
# yum -y install unzip

# wget https://github.com/grafana/clock-panel/releases/download/v2.1.1/grafana-clock-panel-2.1.1.zip

# unzip grafana-clock-panel-2.1.1.zip

# mv grafana-clock-panel /var/lib/grafana/plugins/grafana-piechart-panel

# systemctl restart grafana-server

# grafana-cli plugins ls
installed plugins:
grafana-clock-panel @ 2.1.1
```





