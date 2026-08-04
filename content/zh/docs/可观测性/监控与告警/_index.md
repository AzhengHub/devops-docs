---
title: "监控与告警"
weight: 20
---


1. 部署 Prometheus、Alertmanager、Grafana，以及各种 Exporter；
2. 配置 Prometheus，通过服务发现或静态配置等方式将 Exporter 作为 Target，并在 Prometheus UI 界面测试 Exporter 采集的数据能否成功检索；
3. Grafana 中将 Prometheus 定义为数据源，导入相应的 Exporter 模板；
4. 配置 Prometheus，定义告警规则，并指向 Alertmanager 实际地址；
5. 在 Alertmanager 中配置告警媒介，收信人等信息，以便将告警发送给相关人员。



# ---

# 前言

- 监控报警的实现，需要 Prometheus Server 和 AlertManager 两个组件配合完成；
- 当告警产生时后，Prometheus Server 负责将告警信息推送给 AlertManager；
- AlertManager 对告警通知进行分组、去重后，根据路由规则将其路由到不同的receiver，如Email、 短信或PagerDuty等。

**数据流：**

- Prometheus --> 触发rule阈值 --> 超出持续时间  --> Alertmanager --> 分组|抑制|静默  --> 媒体类型 --> 邮件|钉钉|微信等...

**大体实现流程：**

- 在 Alertmanager 上定义 receiver，他们通常是能够基于某个媒介接收告警消息的特定用户；
  - Email、Wechat、Pagerduty、Slack 和 Webhook 等是为常见的发送告警信息的媒介。
- 在 Alertmanager 上定义路由规则（route），以便将收到的告警通知按需分别进行处理；
- 在 Prometheus 上定义告警规则生成告警通知，发送给 Alertmanager。

**参考文档：**

- https://www.kancloud.cn/pshizhsysu/prometheus/1803786



# 一. 监控指标采集

Prometheus + 各种 exporter 实现监控指标采集



# 二. 定义告警规则



# 三. 发送告警

**告警生命周期：**

Prometheus 以一个固定的周期来评估所有告警规则，其值由 Prometheus 全局配置段中的 evaluation_interval参数定义，在每个评估周期内，Prometheus 会计算每条告警规则中的布尔表达式并更新告警状态。

以下状态都可以在 Prometheus UI 界面的 alerts 中查看到：

```sh
inactive # 表示expr定义的表达式的值为false，此阶段不会触发报警。
pending # 表示expr定义的表达式值为true，但其持续时间未能满足for定义的时长，此阶段不会触发报警。
firing # 表示expr定义的表达式值为true，并且满足for定义的时长，此阶段会触发报警，并交由Alertmanager进行下一步处理
```

- 未使用 for 子句的告警，若布尔表达式的值为 true，会自动从 Inactive 状态转为 Firing，它只需要一个评估周期便能触发；
- 而带有 for 子句的告警状态将先转为 Pending，而后才到 Firing，因而至少需要两个评估周期才能触发；
- 处于 Pending 状态的告警，在其持续时长满足 for 子句的定义之前，若布尔表达式的值转回了 false，则告警状态将转回 Inactive。



## 1. Prometheus 中指定 AlertManager 地址

直接在 Prometheus 主配置文件中定义：

```yaml
alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager.monitoring.svc.cluster.local:9093']
```



## AlertManager 定义告警方式



- 



### 基于 dingtalk

通过钉钉 webhook 实现





## 告警标签

prometheus 发给 alertmanager 的每一条告警信息都是带有标签的，而且 alertmanager 是通过标签来标识每一条告警信息。比如说，下面是 alertmanager 接收到的一系列告警信息

```yaml
{alertname="NodeCPU",instance="peng01",job="node-exporter",serverity="high",...}  time, annotation
{alertname="NodeMemory",instance="peng01",job="node-exporter",serverity="high",...}  time, annotation
{alertname="NodeCPU",instance="peng02",job="node-exporter",serverity="high",...}  time, annotation 
{alertname="NodeMemory",instance="peng02",job="node-exporter",serverity="high",...}  time, annotation
...
```



## 告警路由

假设 Prometheus 同时监控了两个组件：数据库组件与缓存组件；

如果希望：数据库组件的告警能够发送给数据库小组的相关人员，缓存组件的告警能发送给缓存小组的相关人员。

基于告警信息的标签与 alertmanager 的路由机制，可以达到上面的效果。

比如，我们定义如下的路由树：

```yaml
route:
  receiver: admin-receiver
  routes:
  - receiver: database-receiver
    match: 
      component: database    
  - receiver: memcache-receiver
    macth: 
      componnet: memcache
```

那么，当alertmanager收到一条告警信息时，首先会发送给 admin-receiver；

然后根据标签的匹配规则，如果该告警带有标签 `component:database`，那么还会发送给 database-receiver。

当然，如果数据库的告警还要继续细分，比如 mysql 的告警还要发送给 mysql-receiver，marriadb 的告警发送给 marriadb-receiver，那么可以路由树如下：

```yaml
route:
  receiver: admin-receiver
  routes:
  - receiver: database-receiver
    match: 
      component: database
    routes:
    - receiver: mysql-receiver
      match:
        type: mysql
    - receiver: marriadb-receiver
      match:
        type: marriadb   
  - receiver: memcache-receiver
    macth: 
      componnet: memcache
```



## 告警分组

- 将类似性质的警报合并为单个通知；
- 将相似告警合并为单个告警通知的机制，在系统因大面积故障而触发告警潮时，分组机制能避免用户被大量的告警噪声淹没，进而导致关键信息的隐没；
- 警报的分组、分组通知的计时以及这些通知的接收方由配置文件中的路由树进行配置。
- 例如：
  - 部分实例无法访问数据库，可以将无法连接到数据库的这里警报划分到同一个分组，从而发送单个紧凑通知



有时候我们会遇到这样的场景：一台主机挂了后，主机上所有的服务都会挂掉，此时 alertmanager 会连续接收到很多的告警；如果每条告警都发一个邮件出去给接收者，那么短时间内邮件的发送量会很大。

那么，有没有可能把多条告警信息，合并成一个邮件发送出去呢？

答案是可以的，这就是alertmanager的分组功能。假设我们有如下的配置：

```yaml
route:
  receiver: admin-receiver
  group_by: ["instance"]
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
```

### group_by

上面我们设置了`group_by ["instance"]`，那么，当AlertManager接收到如下告警时

```yaml
{alertname="NodeCPU",instance="peng01",job="node-exporter",serverity="high",...}  time, annotation
```

便会创建一个 Group：`{instance="peng01"}`，然后把该条告警加入到这个Group中。接着，如果再接收到一条告警

```yaml
{alertname="NodeMemory",instance="peng01",job="node-exporter",serverity="high",...} time, annotation
```

也会加入到这个Group中 ，因为该告警同样有`nstance="peng01"`标签。

如果接收到另一个告警

```yaml
{alertname="NodeCPU",instance="peng02",job="node-exporter",serverity="high",...}  time, annotation
```

那么便会创建Group：`{instance="peng02"}`，然后把这条告警放在这个Group中。（**注意：只有当一个新的告警到达，且它不属于任何已经存在的分组时，才会创建新的分组**）

而如果接到了一个告警，它没有`instance=xxx`这个Label，那么就会创建一个Group `{}`，把这个告警加入到这个Group中。



**如果未设置 `group_by`，或设置为 `group_by: []` 会怎样？**

在AlertManager中，如果未设置`group_by`或将其设置为`group_by: []`，则不会根据任何标签进行分组。这意味着所有的警报都将被视为单独的实体，不会进行任何合并或分组操作。这可能会导致警报过于散乱，难以管理和理解。通常情况下，设置`group_by`可以根据标签将相关的警报组合在一起，以便更清晰地组织和处理警报。



### group_wait

上面我们提到当设置了Group By后，alertManager会对告警进行分组。当一条告警到达时，如果它不属于任何一个已存在的分组，alertManager会创建一个新的分组，然后将该告警加入到这个分组中。此时，alertManager并不会立即把这个告警发给Receiver，而是会等待`group_wait`的时间，如果在这个时间里有属于这个分组的其它告警到达，那么在`group_wait`时间后，alertManager会把这一组告警一次性发给Receiver。

注意：是创建一个分组后，才会等待`group_wait`的时间，等待其他属于这个分组的告警加入。当一个分组里面的告警都已经被“解决”（Resolved）后，这些告警与分组都会删掉，如果再来一个告警，则会重新创建分组。



### group_interval

上面提到一个新的Group创建后，要等待`group_wait`的时间才会发通知给Receiver。当发送了通知以后，它会等待`group_interval`的时间，在这段时间内到达该Group的告警，会在`group_interval`后，会作为一个通知发送给Receiver（这个通知中会包含该分组内所有的告警）。

假设`group_interval`为5分钟，某个分组最后一次发送通知的时间为T，当`[T, T+5m]`的时间内该分组没有告警到达，而`T+6m`时该分组内有一个告警到达，那么这个告警会立即被发送给Receiver，而不会等到`T+10m`才发送。然后把`T+6m`作为最后一次发送通知的时间。



### repeat_interval

当alertManager为某个分组发送了一个通知后，如果该分组里面的告警依然存在（即没有被“解决”）且在`repeat_interval`的时间内没有接收到新的告警，那么在等待`repeat_interval`时间后，alertManager才会为该分组重新发送一个通知。

比如说，`repeat_interval`为4小时，T时刻alertManager为某个分组发送了最后一个通知，这个通知包含了多个告警。在`[T, T+4h]`的时间里，该分组没有接收到新的告警，那么在`T+4h`时alertmanager才会为该分组重新发送一个通知。



## 告警静默

- 特定时间的静音机制
- 是指在一个特定的时间窗口内，即便接收到告警通知，Alertmanager也不会真正向用户发送告警信息的行为；通常，在系统例行维护期间，需要激活告警系统的静默特性；
- 静默在 Alertmanager 的 Web 界面中配置。
- 例如：
  - 服务器要升级维护时设置这个时间段告警静默



## 告警接收者

告警接收器可以通过以下形式进行配置：

```
receivers:
  - <receiver> ...
```

每一个receiver具有一个全局唯一的名称，并且对应一个或者多个通知方式：

```yaml
name: <string>
email_configs:
  [ - <email_config>, ... ]
hipchat_configs:
  [ - <hipchat_config>, ... ]
pagerduty_configs:
  [ - <pagerduty_config>, ... ]
pushover_configs:
  [ - <pushover_config>, ... ]
slack_configs:
  [ - <slack_config>, ... ]
opsgenie_configs:
  [ - <opsgenie_config>, ... ]
webhook_configs:
  [ - <webhook_config>, ... ]
victorops_configs:
  [ - <victorops_config>, ... ]
```

目前官方内置的第三方通知集成包括：邮件、 即时通讯软件（如Slack、Hipchat）、移动应用消息推送(如Pushover)和自动化运维工具（例如：Pagerduty、Opsgenie、Victorops）。Alertmanager的通知方式中还可以支持Webhook，通过这种方式开发者可以实现更多个性化的扩展支持。



## 示例：基于邮件发送告警

邮箱应该是目前企业最常用的告警通知方式，Alertmanager内置了对SMTP协议的支持，因此对于企业用户而言，只需要一些基本的配置即可实现通过邮件的通知。
在Alertmanager使用邮箱通知，用户只需要定义好SMTP相关的配置，并且在receiver中定义接收方的邮件地址即可。在Alertmanager中我们可以直接在配置文件的global中定义全局的SMTP配置：

```yaml
global:
  [ smtp_from: <tmpl_string> ]
  [ smtp_smarthost: <string> ]
  [ smtp_hello: <string> | default = "localhost" ]
  [ smtp_auth_username: <string> ]
  [ smtp_auth_password: <secret> ]
  [ smtp_auth_identity: <string> ]
  [ smtp_auth_secret: <secret> ]
  [ smtp_require_tls: <bool> | default = true ]
```

完成全局SMTP之后，我们只需要为receiver配置`email_configs`用于定义一组接收告警的邮箱地址即可，如下所示：

```yaml
name: <string>
email_configs:
  [ - <email_config>, ... ]
```

每个`email_config`中定义相应的接收人邮箱地址，邮件通知模板等信息即可，当然如果当前接收人需要单独的SMTP配置，那直接在`email_config`中覆盖即可：

```yaml
[ send_resolved: <boolean> | default = false ]
to: <tmpl_string>
[ html: <tmpl_string> | default = '{{ template "email.default.html" . }}' ]
[ headers: { <string>: <tmpl_string>, ... } ]
```

如果当前收件人需要接受告警恢复的通知的话，在`email_config`中定义`send_resolved`为`true`即可。
这里，以Gmail邮箱为例，我们定义了一个全局的SMTP配置，并且通过route将所有告警信息发送到default-receiver中:

```yaml
global:
  smtp_smarthost: smtp.gmail.com:587
  smtp_from: <smtp mail from>
  smtp_auth_username: <usernae>
  smtp_auth_identity: <username>
  smtp_auth_password: <password>

route:
  group_by: ['alertname']
  receiver: 'default-receiver'

receivers:
  - name: default-receiver
    email_configs:
      - to: <mail to address>
        send_resolved: true
```



## 示例：基于 dingtalk 发送告警

- 基于钉钉提供的webhook实现报警，需要在钉钉群中创建webhook机器人
- https://github.com/timonwong/prometheus-webhook-dingtalk
- https://theo.im/blog/2017/10/16/release-prometheus-alertmanager-webhook-for-dingtalk/
- https://github.com/timonwong/prometheus-webhook-dingtalk/blob/main/docs/FAQ_zh.md

### webhook-dingtalk 配置

```yaml
# tar xf prometheus-webhook-dingtalk-2.1.0.linux-amd64.tar.gz -C /monitor/
# cd /monitor/prometheus-webhook-dingtalk
# cp config.example.yml webhook-dingtalk.yml

# vim webhook-dingtalk.yml
targets:
  webhook1: # webhook名称，可自定义，也可以定义多个webhook
    url: https://oapi.dingtalk.com/robot/send?access_token=xxx... # 机器人信息中的Webhook
    secret: SExxx... # 机器人信息中加签的内容
    
# 测试
# ./prometheus-webhook-dingtalk --config.file=./webhook-dingtalk.yml


# 定义service
...
```

### Alertmanager 配置

- /monitor/alertmanager/alertmanager.yml

```yaml
global:

route:
  group_by: ['alertname']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1m
  receiver: "team-1"

receivers:
  - name: "team-1"
    webhook_configs:
    - send_resolved: true
      url: http://10.0.0.28:8060/dingtalk/webhook1/send
```



# ---

# 告警模板

https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/#templating)

https://prometheus.io/docs/visualization/consoles/)

- 标签引用：{{ $labels.<label_name> }}
- 指标样本值引用： {{ $value }}



# 邮件报警模板

- https://prometheus.io/docs/alerting/latest/configuration/#email_config

```yaml
global:
  smtp_smarthost: 'smtp.qq.com:587' # 邮件服务商提供的邮件服务器地址，测试发现使用465端口无法发送邮件，587端口可以
  smtp_from: '767483070@qq.com' # 发件方邮箱
  smtp_auth_username: '767483070@qq.com' # 发件方邮箱对应的账号
  smtp_auth_password: 'ywkvhxiqjzrbbccb' # 发件方邮箱对应账号的密码
  smtp_hello: '@qq.com' # 要向SMTP服务器标识的默认主机名，默认localhost
  smtp_require_tls: true # 是否使用使用tls加密，默认true

#templates:
#- '/alertmanager/*.tmpl'

route:
  group_by: ['alertname'] # 采用哪个标签来作为分组依据
  group_wait: 10s # 组告警等待时间，也就是告警产生后等待10s，如果有同组告警则一起发出
  group_interval: 10s # 两组告警的间隔时间
  repeat_interval: 1m # 两组告警的间隔时间，减少相同邮件的发送频率
  receiver: 'email' # 默认警报接收者
  # 子路由配置：
  #routes:
  #- receiver: 'wechat' # 其它报警接收者
  #  match:
  #    severity: test  #标签severity为test时满足条件，使用wechat警报
 
receivers:
  - name: 'email' # 接收者名称
    email_configs:
    - to: 'sredevops@163.com'  # 接收警报的email


# 禁止的规则
#inhibit_rules:
#  - source_match:
#      severity: 'critical'
#    target_match:
#      severity: 'warning'
#    equal: ['alertname', 'dev', 'instance']
```



# 微信报警模板

- 通过企业微信实现

- https://prometheus.io/docs/alerting/latest/configuration/#wechat_config

```yaml
global:
  wechat_api_url: "https://qyapi.weixin.qq.com/cgi-bin/" # 微信提供的api地址
  wechat_api_corp_id: "ww2e2992779dc200a5" # 企业ID（登录企业微信后，我的企业 --> 企业信息 --> 企业ID）
  wechat_api_secret: "_GyZlVTPC6UIvt15Q4RpbHdAAQkAFlPLP1VlLODHJvQ" # 自定义应用应用的密钥（登录企业微信后，应用管理 --> 自建应用 --> Secret）
 
#templates:
#- '/alertmanager/*.tmpl'
 
route:
  group_by: ['alertname']
  group_wait: 20s
  group_interval: 20s
  repeat_interval: 12h
  receiver: 'wechat'
 
receivers:
  - name: 'wechat'  #警报名称
    wechat_configs:
    - send_resolved: true # 是否通知已解决的警报，默认false
      message: '{{ template "wechat.default.message" . }}'
      message_type: 'text' # 消息的类型，支持的值为“text”和“markdown”。
      agent_id: '1000004'  #应用ID（登录企业微信后，应用管理 --> 自建应用 --> AgentId）
      to_party: '2' # 接收部门id
      #to_user: ''
      #to_tag: ''
```

## solution

- - 



# 邮件+微信报警模板

```yaml
global:
  resolve_timeout: 5m #超时,默认5min
  #邮箱smtp服务
  smtp_smarthost: 'smtp.qq.com:587'
  smtp_from: 'report@elven.vip'
  smtp_auth_username: 'report@elven.vip'
  smtp_auth_password: 'xxx密码'
  smtp_hello: 'qq.com'
  #smtp_require_tls: false
  #wechat
  #wechat_api_url: "https://qyapi.weixin.qq.com/cgi-bin/"
  wechat_api_corp_id: "wwe518* 企业微信账号唯一ID"
  wechat_api_secret: "自定义应用 应用的密钥"
 

 
route:
  group_by: ['alertname']
  group_wait: 20s
  group_interval: 20s
  repeat_interval: 12h
  receiver: 'email'
  routes:
  - receiver: 'wechat'
    match:
      severity: test
 
receivers:
- name: 'email' #警报名称
  email_configs:
  - to: '228@elven.vip'  # 接收警报的email
    html: '{{ template "emai.html" . }}' # 模板
    headers: { Subject: " {{ .CommonLabels.instance }} {{ .CommonAnnotations.summary }}" } #标题
 
- name: 'wechat'  #警报名称
  wechat_configs:
  - send_resolved: true
    to_party: '2'   #接收部门id
    agent_id: '1000002'  #应用ID
    to_user: ''
    to_tag: ''
    message: '{{ template "wechat.html" . }}'
```
