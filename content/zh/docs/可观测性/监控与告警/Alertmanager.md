---
title: "Alertmanager"
---


## 告警数据流
- **Prometheus** ：采集数据 -> **计算规则 (Rules)** -> 发现异常 -> **产生告警** -> 发送给 Alertmanager。
- **Alertmanager** ：接收告警 -> 分组/去重 -> **发送通知** (发邮件、钉钉等)。




# Alertmanager 概述

- Alertmanager 除了可以接受 Prometheus 的报警信息外，也支持接收来自其它工具的告警；
- Alertmanager 也是应用程序，它自身同样应该纳入prometheus的监控目标；
- Alertmanager 同样提供了可视化的 web UI，以及使用 /metrics 路径暴露了其内建的指标
- TCP/9093，Alertmanager-server
- TCP/9094，Alertmanager-cluster
- https://github.com/prometheus/alertmanager





# Alertmanager 单机部署

## helm

```
kubectl create ns monitoring
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm pull prometheus-community/alertmanager --version 1.7.0
tar xf alertmanager-1.7.0.tgz
helm install alertmanager ./alertmanager-1.7.0.tgz  -n monitoring -f alertmanager/values.yaml
```



## 二进制

- 直接将二进制文件解压到自定义的目录即可
- 可以选择使用 service 文件来对其进行启动
- 启动后验证 9093端口是否开启，同样可以访问 metrics 来查看是否有指标收集上来





## service

- /lib/systemd/system/prometheus-alertmanager.service

```sh
[Unit]
Description=Prometheus alertmanager
Documentation=https://github.com/prometheus/alertmanager

[Service]
Restart=always
User=root
ExecStart=/monitor/alertmanager/alertmanager --config.file=/monitor/alertmanager/alertmanager.yml
ExecReload=/bin/kill -HUP $MAINPID
TimeoutStopSec=20s
SendSIGKILL=no

[Install]
WantedBy=multi-user.target
```



# Alertmanager 集群部署

- https://github.com/prometheus/alertmanager#high-availability

## Gossip协议

- 多Alertmanager实例的场景中，告警信息可能会被重复发送；
- Gossip机制可为多个Alertmanager之间提供了信息传递的机制，以确保在多个Alertmanager分别接收到相同告警信息的情况下，只会有一个告警通知被发送给Receiver；
- Gossip是分布式系统中被广泛使用的协议，用于实现分布式节点之间的信息交换和状态同步；

## 部署 Alertmanager 集群

- 假设将三个alertmanager节点组织成为集群：
  - node01：10.0.0.8
  - node02：10.0.0.18
  - node03：10.0.0.28
- 各节点需要的启动命令如下：（注意：下面示例中只是说明配置集群所需的必选参数，每个alertmanager节点还要使用相同的`alertmanager.yml` 配置文件，或者以共享存储的方式共享配置文件）
  - node01: alertmanager
  - node02: alertmanager --cluster.peer=10.0.0.8:9094
  - node03: alertmanager --cluster.peer=10.0.0.8:9094
- 验证：
  - http://10.0.0.8:9093/#/status
  - 观察 Cluster Status



## Prometheus 指向 Alertmanager 集群

- 配置完 Alertmanagers 集群后，Prometheus 不要以负载均衡的方式访问 Alertmanagers，而是将 Prometheus 配置文件中指向所有 Alertmanagers 的列表

```yaml
alerting:
  alertmanagers:
  - static_configs:
    - targets:
      - alertmanager1:9093
      - alertmanager2:9093
      - alertmanager3:9093
```



# Alertmanager 配置文件

https://prometheus.io/docs/alerting/latest/configuration/

https://github.com/prometheus/alertmanager/blob/main/doc/examples/simple.yml



## global

全局配置部分，用于设置Alertmanager的全局参数，如SMTP服务器的地址、身份验证信息等。

https://prometheus.io/docs/alerting/0.26/configuration/#file-layout-and-global-settings

### 基于邮件的发送者

```yaml
global:
  # 发件方邮箱地址
  [ smtp_from: <tmpl_string> ]
  # 邮件服务商提供的邮件服务器地址和端口，端口只能是25或基于TLS的587
  [ smtp_smarthost: <string> ]
  # 要向SMTP服务器标识的默认主机名，默认localhost
  [ smtp_hello: <string> | default = "localhost" ]
  # 发件方邮箱对应的账号
  [ smtp_auth_username: <string> ]
  # 发件方邮箱对应账号的密码
  [ smtp_auth_password: <secret> ]
  # SMTP Auth using LOGIN and PLAIN.
  [ smtp_auth_password_file: <string> ]
  # SMTP Auth using PLAIN.
  [ smtp_auth_identity: <string> ]
  # SMTP Auth using CRAM-MD5.
  [ smtp_auth_secret: <secret> ]
  # 是否使用使用tls加密，默认true
  [ smtp_require_tls: <bool> | default = true ]
```

#### qq 邮箱

```yaml
global:
  smtp_smarthost: 'smtp.qq.com:587'
  smtp_from: '767483070@qq.com'
  smtp_auth_username: '767483070@qq.com'
  smtp_auth_password: 'dfzjyeyveaotbbhb'
  smtp_hello: '@qq.com'
```

#### 163 邮箱

- 注意：163邮箱的587端口无法发送邮件，只能使用25端口明文发送。

```yaml
global:
  smtp_smarthost: 'smtp.163.com:25'
  smtp_from: 'sredevops@163.com'
  smtp_auth_username: 'sredevops@163.com'
  smtp_auth_password: 'CNPQGQWTVKVPBWPA'
  smtp_hello: '@163.com'
```



### 基于微信的发送者

通过企业微信实现

```yaml
global:
  wechat_api_url: "https://qyapi.weixin.qq.com/cgi-bin/" # 微信提供的api地址
  wechat_api_corp_id: "ww2e2992779dc200a5" # 企业ID（登录企业微信后，我的企业 --> 企业信息 --> 企业ID）
  wechat_api_secret: "_GyZlVTPC6UIvt15Q4RpbHdAAQkAFlPLP1VlLODHJvQ" # 自定义应用应用的密钥（登录企业微信后，应用管理 --> 自建应用 --> Secret）
```

企业微信安全升级，需要对自建应用配置 企业可信IP 才能实现接口调用（登录企业微信后，应用管理 --> 自建应用 --> 企业可信IP）

- 公网IP获取方式：`curl httpbin.org/ip`



## route

- `route` 配置段用于定义警报的分发策略，即：路由规则，包括将警报分组、等待时间、间隔时间以及警报的接收者；
- 基本逻辑是根据路由匹配规则的匹配结果来确定处理当前告警通知的路径和行为；
- 所有告警都将进入路由根节点，而后进行子节点遍历，如果子路由未匹配，则发送给默认的报警接受者。

```yaml
route: # 设置警报路由规则
  group_by: ['alertname', 'cluster', 'service']  # 按照指定的标签对警报进行分组，用于定义如何对警报进行分组的标签列表。这些标签将用于分组警报以便进行合并、抑制等操作。
                                                                     # 分组时使用的标签，默认情况下，所有的告警都组织在一起，而一旦指定分组标签，则Alertmanager将按这些标签进行分组
  continue: false # 指定是否继续匹配下一个路由规则，默认为false，即只匹配到第一个规则
                          # false表示遇到第一个匹配的路由分支后即终止；否则，将继续匹配后续的子路由节点，默认就是false；
  group_wait: 10s # 指定分组等待时间，即等待相同警报组的时间。在此时间内收到的相同组的警报将被合并成一个通知。
                            # 发出一组告警通知的初始等待时长；允许等待一个抑制告警到达或收集属于同一组的更多初始告警，通常是0到数分钟，默认30s；
  group_interval: 5m # 分组间隔时间，即多长时间内不再触发相同警报组的警报
                                 # 发送关于新告警的消息之前，需要等待多久；新告警将被添加到已经发送了初始通知的告警组中；一般在5分钟或以上，默认5m
  repeat_interval: 3h # 成功发送了告警后再次发送告警信息需要等待的时长，一般至少为3个小时，默认4h
  receiver: <string> # 指定默认的接收者，即没有匹配到具体规则时使用的接收者。
  match: # 警报必须中标签和值的与下面的 <labelname>:<labelvalue> 相匹配才会发送报警
    [ <labelname>: <labelvalue>, ... ]
  match_re: # 与match同理，但labelvalue支持正则
    [ <labelname>: <regex>, ... ]
  matchers: # 警报必须满足以匹配节点的匹配器列表。
    [ - <matcher> ... ]
  routes: # 用于定义更具体的路由规则。每个规则都包括  match 条件、自定义的分组等待时间、接收者以及是否继续匹配下一个规则。可以有一个或者多个，配置与route大体一致。子路由配置段，子路由中未定义的参数则继承主路由的，如果没有匹配的子路由，则发送给到根路由的默认接收方：'default-receiver'.
  - match:
      severity: 'critical' # 匹配的条件，可以是标签的匹配或者是表达式匹配
    group_wait: 10s
    receiver: <string>
    continue: true
  - match_re:
      service: '^web.*$' # 使用正则表达式匹配服务名称以'web'开头的警报
    receiver: 'slack-notifications'  # 匹配到该规则时使用的接收者
    continue: true
```

在 `routes` 中，`match` 可以是简单的匹配或者正则表达式匹配，根据匹配结果将警报分配给相应的接收者。 `continue` 参数指示是否继续匹配下一个规则，默认为 `false`，即只匹配到第一个规则。



### 示例：仅将警报发送给默认接收者

```yaml
route:
  receiver: default-receiver
  continue: false
  group_wait: 10s
  group_interval: 5m
  repeat_interval: 3h
```

综上所述，这段配置的含义是当接收到警报时，Alertmanager将其发送到名为`default-receiver`的接收者，并且不会继续处理后续的匹配项。它将等待10秒将相同的警报分组，然后每5分钟发送一次分组中的警报通知，重复发送间隔为3小时。







## receivers

定义警报接收者

接收者部分，定义了警报通知的接收者，可以通过电子邮件、Slack等方式发送通知。每个接收者可以有多个通知配置。

- https://prometheus.io/docs/alerting/latest/configuration/#receiver

### 基于邮件的接收者

- https://prometheus.io/docs/alerting/latest/configuration/#email_config

```yaml
# 必选参数：
receivers:
- name: default-receiver # 定义接收者的名称
  email_configs:
    - to: '767483070@qq.com' # 指定邮件接收者的地址
      send_resolved: true # 是否发送已解决的警报通知，默认false
# 可选参数，不指定则从 global 段继承：
      from: 'alertmanager@example.com' # 指定邮件的发件人地址
      smarthost: 'smtp.example.com:587' # 指定SMTP服务器的地址和端口
      auth_username: 'alertmanager' # 指定SMTP服务器的身份验证用户名
      auth_password: 'password'  # 指定SMTP服务器的身份验证密码
      auth_identity: '' # 指定SMTP服务器的身份验证身份
      require_tls: true # 指定是否需要TLS加密连接
      headers: # 自定义邮件头部信息
        From: 'Alertmanager <alertmanager@example.com>'
```



### 基于微信的接收者

- https://prometheus.io/docs/alerting/latest/configuration/#wechat_config

在Alertmanager中，您可以配置基于微信（WeChat）的接收者来发送警报通知。这需要使用WeChat的企业微信（Work WeChat）或者开放平台（Open Platform）的API来发送消息。以下是一个基于微信的接收者配置示例及其说明：

```yaml
receivers:
- name: 'wechat-notifications'
  # 定义接收者的名称
  wechat_configs:
  - crop_id: 'your_crop_id'
    # 企业微信的Crop ID
    secret: 'your_secret'
    # 企业微信应用的Secret
    agent_id: 'your_agent_id'
    # 企业微信应用的Agent ID
    to_user: '@user1|@user2'
    # 指定接收消息的用户，可以是用户ID，也可以是用户账号（需带@符号）
    to_party: '1|2'
    # 指定接收消息的部门，可以是部门ID，也可以是部门名称（需带|分隔符）
    to_tag: 'tag1|tag2'
    # 指定接收消息的标签，可以是标签ID，也可以是标签名称（需带|分隔符）
    safe: '0'
    # 是否保密消息，0表示否，1表示是，默认为0
    enable_id_transform: false
    # 是否启用用户ID转换，如果设置为true，则to_user中的值会被转换为对应的用户ID，默认为false
    enable_id_transform: false
    # 是否启用用户ID转换，如果设置为true，则to_user中的值会被转换为对应的用户ID，默认为false
```

上述配置定义了一个名为`wechat-notifications`的接收者，用于通过微信发送警报通知。该接收者具有以下参数：

- **`name`**: 定义接收者的名称。

- **`wechat_configs`**: 用于指定微信通知的参数列表。

在`wechat_configs`中，以下参数是必须的：

- **`crop_id`**: 您的企业微信的Crop ID，用于识别您的企业。

- **`secret`**: 企业微信应用的Secret，用于验证身份。

- **`agent_id`**: 企业微信应用的Agent ID，用于指定消息发送的应用。

- **`to_user`**, **`to_party`**, **`to_tag`**: 指定接收消息的用户、部门、标签，可以是其对应的ID或名称，多个值使用竖线（|）分隔。

在微信接收者配置中，还有一些可选参数：

- **`safe`**: 是否保密消息，0表示否，1表示是，默认为0。

- **`enable_id_transform`**: 是否启用用户ID转换，如果设置为true，则to_user中的值会被转换为对应的用户ID，默认为false。

这些参数允许您根据需求配置微信通知的接收者、消息内容和保密性等属性。

#### 示例

```yaml
...
receivers:
  - name: 'wechat' # 接收者名称
    wechat_configs:
    - send_resolved: true # 是否通知已解决的警报，默认false
      message: '{{ template "wechat.default.message" . }}'
      message_type: 'text' # 消息的类型，支持的值为“text”和“markdown”。
      agent_id: '1000004'  #应用ID（登录企业微信后，应用管理 --> 自建应用 --> AgentId）
      to_party: '2' # 接收部门id
      #to_user: ''
      #to_tag: ''
...
```

### 基于 webhook 的接收者

- https://prometheus.io/docs/alerting/latest/configuration/#webhook_config

在Alertmanager中，您可以配置基于Webhook的接收者来发送警报通知。Webhook允许您将警报通知发送到任何支持HTTP POST请求的端点，例如Slack、Microsoft Teams、PagerDuty等。以下是一个基于Webhook的接收者配置示例及其说明：

```yaml
receivers:
- name: 'webhook-notifications'
  # 定义接收者的名称
  webhook_configs:
  - url: 'http://example.com/alert'
    # 指定Webhook的目标URL
    send_resolved: true
    # 指定是否发送已解决的警报通知
    http_config:
      bearer_token: 'your_bearer_token'
      # 指定用于身份验证的Bearer Token
      basic_auth:
        username: 'username'
        password: 'password'
      # 指定用于基本身份验证的用户名和密码
    max_alerts: 10
    # 指定每次发送的最大警报数量
    proxy_url: 'http://proxy.example.com:8080'
    # 指定代理服务器的地址和端口
    timeout: 10s
    # 指定超时时间
    tls_config:
      insecure_skip_verify: true
      # 是否跳过对目标服务器TLS证书的验证
```

上述配置定义了一个名为`webhook-notifications`的接收者，用于通过Webhook发送警报通知。该接收者具有以下参数：

- **`name`**: 定义接收者的名称。

- **`webhook_configs`**: 用于指定Webhook通知的参数列表。

在`webhook_configs`中，以下参数是必须的：

- **`url`**: 指定Webhook的目标URL，即警报通知将被发送到的端点。

可选参数包括：

- **`send_resolved`**: 指定是否发送已解决的警报通知，默认为`false`。

- **`http_config`**: 包含用于配置HTTP请求的参数，如身份验证、代理等。可以包含以下子参数：
  - **`bearer_token`**: 指定用于身份验证的Bearer Token。
  - **`basic_auth`**: 指定用于基本身份验证的用户名和密码。
  
- **`max_alerts`**: 指定每次发送的最大警报数量，默认为0，表示不限制数量。

- **`proxy_url`**: 指定代理服务器的地址和端口。

- **`timeout`**: 指定超时时间，默认为0s。

- **`tls_config`**: 包含用于配置TLS连接的参数，如是否跳过证书验证等。可以包含以下子参数：
  - **`insecure_skip_verify`**: 是否跳过对目标服务器TLS证书的验证，默认为`false`。

这些参数允许您根据需要配置Webhook通知的目标端点、身份验证、代理、超时等属性。

#### 示例

```yaml
send_resolved: <boolean> # 是否通知已解决的警报，默认false，可选项

url: <string> # 要向其发送HTTP POST请求的端点，必选项

http_config: <http_config> # HTTP客户端的配置，默认global.http_config，可选项

max_alerts: <int> # 单个webhook消息中包含的最大警报数，警报高于此阈值时将被截断，默认0 表示不设限即包括所有警报，可选项
```









## inhibit_rules

定义禁止的规则

在Alertmanager中，抑制规则（inhibit rules）用于控制在特定条件下抑制或阻止发送警报通知。这可以防止在一些情况下触发多个相关警报时发送过多的通知，而只发送与问题相关的最重要的通知。以下是一个示例抑制规则配置及其说明：

```yaml
inhibit_rules:
- source_match:
    severity: 'critical'
  target_match:
    severity: 'warning'
  # 配置匹配源与目标的条件
  equal:
  - 'instance'
  # 配置用于匹配的标签名称

- source_match:
    severity: 'critical'
  target_match_re:
    severity: 'critical|warning'
  # 配置匹配源与目标的条件
  equal:
  - 'instance'
  # 配置用于匹配的标签名称
```

上述配置定义了两个抑制规则：

1. 第一个规则指定，当源警报的严重性为'critical'时，如果目标警报的严重性为'warning'，并且它们具有相同的实例（instance）标签，则不发送通知。

2. 第二个规则指定，当源警报的严重性为'critical'时，如果目标警报的严重性为'critical'或'warning'，并且它们具有相同的实例标签，则不发送通知。

这些抑制规则可以根据特定的需求进行调整和扩展，以控制在特定条件下发送警报通知的行为。





- 抑制

- 当警报发出后，停止重复发送由此警报引发的其它警报，即合并一个故障引起的其它警报，可以消除冗余警报；
- 系统中某个组件或服务故障而触发告警通知后，那些依赖于该组件 或服务的其它组件或服务可能也会因此而触发告警，抑制便是避免类似的级联告警的一 种特性，从而让用户能将精力集中于真正的故障所在；
- 例如：
  - 交换机宕机而导致的服务全部宕掉 则只发生交换机宕机警报

```yaml
# 在AllIstancesDown告警规则触发critical级别的告警时，若后来出来其它critical级别的报警 ，且其node标签的值与前面报警的node标签值相同，则认为告警隶属同一节点
...
inhibit_rules:
  - source_match:
      alertname: AllInstancesDown
      severity: critical
    target_match:
      severity: critical
    equal:
      - node
...      
```



## templates

定义告警模板文件，在Alertmanager中，模板（templates）用于定义警报通知消息的格式。您可以通过模板来自定义警报通知的外观和内容。以下是一个示例模板配置及其说明：

```yaml
templates:
- name: 'custom-email'
  # 定义模板的名称
  subject: '{{ template "custom-email.subject" . }}'
  text: |
    {{ template "custom-email.text" . }}
  html: |
    {{ template "custom-email.html" . }}

  # 定义模板中使用的子模板
  'custom-email.subject': 
    text: "Alert: {{ .CommonLabels.alertname }}"

  'custom-email.text':
    text: |
      {{ range .Alerts }}
        {{ .Annotations.summary }}
        {{ .Labels.severity }} alert for {{ .Labels.job }} on {{ .Labels.instance }}.
        {{ .Annotations.description }}
        Summary: {{ .Annotations.summary }}
        Severity: {{ .Labels.severity }}
        Description: {{ .Annotations.description }}
        Runbook: {{ .Annotations.runbook_url }}
      {{ end }}

  'custom-email.html':
    text: |
      {{ range .Alerts }}
        <p>{{ .Annotations.summary }}</p>
        <p><b>{{ .Labels.severity }}</b> alert for {{ .Labels.job }} on {{ .Labels.instance }}.</p>
        <p>{{ .Annotations.description }}</p>
        <p>Summary: {{ .Annotations.summary }}</p>
        <p>Severity: {{ .Labels.severity }}</p>
        <p>Description: {{ .Annotations.description }}</p>
        <p>Runbook: <a href="{{ .Annotations.runbook_url }}">{{ .Annotations.runbook_url }}</a></p>
      {{ end }}
```

上述配置定义了一个名为`custom-email`的模板，用于自定义电子邮件通知的格式。该模板包含三个部分：

1. **`subject`**: 定义了电子邮件主题的模板。在此示例中，主题为警报的名称（`alertname`）。

2. **`text`**: 定义了纯文本格式的通知消息模板。其中使用了模板函数和警报对象的属性，如警报标签（`Labels`）、注释（`Annotations`）等。

3. **`html`**: 定义了HTML格式的通知消息模板。与纯文本模板类似，但在此处使用了HTML标记来美化消息的呈现。

这些模板可以根据需要自定义和扩展，以满足特定的通知需求和偏好。







要自定义 Alertmanager 的警报模板，你需要编辑 Alertmanager 的配置文件以指定自定义模板，并且创建你的模板文件。以下是一些步骤：

1. **编辑 Alertmanager 配置文件**：你需要打开 Alertmanager 的配置文件（通常是 `alertmanager.yml`）并添加模板配置。确保你指定了模板文件的路径。

   ```yaml
   templates:
     - '/path/to/your/templates/*.tmpl'
   ```

2. **创建模板文件**：创建你的模板文件，通常使用 Go 的 text/template 格式或者其它支持的模板引擎。在模板文件中，你可以使用占位符来引用警报的各种属性，如标签、摘要、摘要摘要等。

   以下是一个简单的示例模板文件 `alert.tmpl`：

   ```tmpl
   {{ define "slack.text" }}
   *Alert:* {{ .CommonLabels.alertname }}
   *Description:* {{ .CommonAnnotations.summary }}
   *Details:*
   {{ range .Alerts }}
       - *Description:* {{ .Annotations.description }}
       - *Severity:* {{ .Labels.severity }}
       - *Value:* {{ .Annotations.value }}
   {{ end }}
   {{ end }}
   ```

3. **重新加载或重启 Alertmanager**：保存配置文件和模板文件后，重新加载或重启 Alertmanager 使更改生效。

4. **测试你的模板**：触发一个测试警报来确保你的模板正在按预期工作。

这就是自定义 Alertmanager 告警模板的基本步骤。根据你的需求，你可能需要进一步调整模板以满足你的特定需求。
