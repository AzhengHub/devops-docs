---
title: "Prometheus Relabel"
---

# Relabel 概述
如果你把 Prometheus 想象成一个正在收集信息的侦探，那么 **Relabeling** 就是这位侦探在收集信息（指标/Metrics）**之前**或**之后**，对这些信息的“身份标签”进行修改、添加或删除的操作。

简单来说，**Relabeling 的核心目的就是控制和修改你的指标上的标签 (Labels)。**



## 核心目的



1. **控制抓取 (Service Discovery & Filtering)**：决定哪些指标应该被抓取 (Scrape)，哪些应该被忽略。
2. **标准化标签 (Normalization)**：将那些混乱、不规范或冗余的标签转换成你想要的样子。
3. **丰富信息 (Enrichment)**：添加有用的元数据（如集群名、环境名）到指标上。



## 通俗比喻



想象你是一家大公司的邮件分拣员。

| **概念**            | **邮件分拣的比喻**                                           | **Prometheus Relabeling**                                    |
| ------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| **原始地址**        | 信封上写着“王小姐，住在 3 号楼 101 室”                       | 服务发现（Service Discovery）提供的原始标签（如 `__address__`=`10.1.1.5:8080`, `__meta_kubernetes_pod_name`=`myapp-7b4d-1234`） |
| **Relabeling 规则** | “把所有写着‘3 号楼 101 室’的，都改成‘**A 区域研发部**’，然后把所有发件人是‘老李’的邮件都**扔掉**。” | 配置文件中的 `relabel_config` 块                             |
| **新标签**          | 邮件上贴了新标签：“**区域: A 区域研发部**”                   | 最终抓取到的指标上的新标签（如 `service`=`myapp`, `cluster`=`prod-asia`） |



# Relabel 流程
`relabel_configs` 和 `metric_relabel_configs` 是 Prometheus 配置中两个非常重要但作用阶段不同的配置块，它们的关系和先后顺序可以概括如下：



**1. 它们的关系：作用于不同的阶段**



| **配置块**                     | **作用对象**       | **作用阶段**                                                 | **目的**                                                     |
| ------------------------------ | ------------------ | ------------------------------------------------------------ | ------------------------------------------------------------ |
| **`relabel_configs`**          | **目标 (Targets)** | **服务发现 (Service Discovery) 之后，实际抓取 (Scrape) 之前。** | 用于修改目标的地址、端口，或为目标添加/删除/修改**标签（例如 `instance`, `job` 等）**，以决定 **是否抓取** 该目标。 |
| **`metric\_relabel\_configs`** | **指标 (Metrics)** | **实际抓取 (Scrape) 之后，存储 (Storage) 之前。**            | 用于修改抓取到的指标的名称或标签（例如 `code`, `method` 等），以决定 **是否保留** 该指标。 |

简单来说：

- **`relabel_configs` 决定“抓谁”和“用什么标签来抓”**（目标级别）。
- **`metric_relabel_configs` 决定“抓到后保留哪些数据”**（指标级别）。

------



**2. 它们的先后顺序：逻辑流程决定**



在 Prometheus 的抓取（Scrape）生命周期中，它们的执行顺序是严格固定的，遵循以下流程：



**🚀 顺序：`relabel_configs` → 实际抓取 → `metric_relabel_configs`**



1. **服务发现 (Service Discovery)**
   - Prometheus 找到潜在的目标列表（例如 Kubernetes Endpoints）。
2. **目标重贴标签 (`relabel_configs`)**
   - 对每个发现的目标执行 `relabel_configs`。
   - **您的配置中**，这部分工作包括：
     - 过滤（通过 `action: keep` 或 `drop` 决定是否保留目标）。
     - 添加或修改目标标签（如将 `__meta_kubernetes_namespace` 转换为 `namespace` 标签）。
3. **实际抓取 (Scraping)**
   - Prometheus 连接到经过重贴标签和过滤后的目标地址，并获取原始指标数据。
4. **指标重贴标签 (`metric_relabel_configs`)**
   - 对抓取到的每一个指标数据点执行 `metric_relabel_configs`。
   - **您的配置中**，这部分工作包括：
     - 过滤（通过 `action: drop` 决定丢弃不需要的指标，例如您配置中丢弃了大量 `kubelet_` 和 `apiserver_` 的内部指标）。
     - 修改指标的名称或标签。
5. **存储 (Storage)**
   - 将最终过滤和处理后的指标数据写入时间序列数据库。

因此，**`relabel_configs` 总是发生在实际抓取之前，而 `metric_relabel_configs` 总是发生在实际抓取之后。** 在 YAML 配置文件中，通常将 `metric_relabel_configs` 放在 `relabel_configs` 之后，以反映这种逻辑上的先后顺序。


# Relabel 核心配置
Relabeling 规则通常由以下几个核心字段构成：

| **参数**            | **作用**                                                     |
| ------------------- | ------------------------------------------------------------ |
| **`source_labels`** | **输入：** 你想读取的原始标签。你可以指定一个或多个标签，它们的值会被拼接起来作为处理的输入。 |
| **`regex`**         | **匹配模式：** 一个正则表达式。它用来尝试匹配 `source_labels` 拼接后的值。 |
| **`target_label`**  | **输出：** 如果匹配成功，你希望创建或修改的那个新标签的名字。 |
| **`replacement`**   | **替换内容：** 匹配成功后，用来替换到 `target_label` 中的新值。你可以使用正则表达式的捕获组（如 `$1`, `$2`）。 |
| **`action`**        | **执行动作：** 告诉 Prometheus 怎么处理。这是最重要的！      |



## action 类型



| **action**     | **作用**                                                     | **场景示例**                                                 |
| -------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| **`replace`**  | **（最常用）** 根据 `regex` 和 `replacement` 来修改/创建 `target_label`。 | 从原始地址 `10.1.1.5:8080` 中提取出 IP `10.1.1.5` 作为新标签 `instance`。 |
| **`keep`**     | **保留：** 如果 `source_labels` 匹配了 `regex`，则保留该 Target；否则**丢弃**。 | 只抓取 Kubernetes 中命名空间为 `production` 的 Pod。         |
| **`drop`**     | **丢弃：** 如果 `source_labels` 匹配了 `regex`，则**丢弃**该 Target；否则保留。 | 丢弃所有端口号是 `9100`（Node Exporter）的 Target。          |
| **`labelmap`** | **批量修改：** 将所有匹配 `regex` 的标签名，进行批量重命名。 | 将 Kubernetes 所有的 `__meta_kubernetes_service_label_` 开头的标签统一重命名为不带前缀的版本。 |

------


# Relabel 示例



Relabeling 在生产环境中有两个主要发生的地方：

1. **`scrape_configs` -> `relabel_configs` (Scrape Time)**：在 **抓取之前**，用来决定是否抓取（`keep`/`drop`）和修改 Target 的元数据标签。
2. **`scrape_configs` -> `metric_relabel_configs` (Metric Time)**：在 **抓取之后**，用来修改或丢弃指标本身带有的标签。



## 示例一：使用 `keep` 过滤 Targets（Scrape Time）



**需求：** 你的 Kubernetes 集群里有很多 Service，但你只想抓取带有标签 `app: api-server` 的 Service。

YAML

```
# 在 scrape_configs 下
relabel_configs:
  - source_labels: [__meta_kubernetes_service_label_app] # 1. 原始输入：K8S Service 的标签 "app"
    regex: api-server                            # 2. 匹配模式：必须是 'api-server'
    action: keep                                 # 3. 动作：如果匹配成功，保留这个 Target；否则丢弃。
```

**效果：** 只有 `app=api-server` 的服务会被 Prometheus 发现并抓取。



## 示例二：使用 `replace` 标准化标签（Scrape Time）



**需求：** K8S 提供的原始 Pod 名字太长（`__meta_kubernetes_pod_name`），你想用它作为实例名（`instance`），但需要去掉最后的随机后缀。

假设原始标签值为：`my-web-app-7b4d669-abcde`

YAML

```
# 在 scrape_configs 下
relabel_configs:
  - source_labels: [__meta_kubernetes_pod_name]       # 1. 原始输入：K8S Pod 名字
    regex: (.*)-[0-9a-f]{5}$                        # 2. 匹配模式：捕获 (.*) 前缀，忽略末尾的 -5位随机字符串
    replacement: $1                                 # 3. 替换内容：使用捕获组 $1，即前缀部分
    target_label: job                               # 4. 新标签名：命名为 job
    action: replace                                 # 5. 动作：执行替换
```

**效果：**

- **原始标签：** `__meta_kubernetes_pod_name` = `my-web-app-7b4d669-abcde`
- **最终指标标签：** `job` = `my-web-app-7b4d669`



## 示例三：使用 `drop` 丢弃高基数指标（Metric Time）



**需求：** 抓取 Node Exporter 时，`node_network_receive_bytes_total` 这个指标带了一个 `device` 标签，它的值可能是虚拟网卡（如 `vethxxxx`），这些网卡数量太多（**高基数**），会占用大量内存，需要丢弃。

YAML

```
# 在 scrape_configs -> metric_relabel_configs 下 (注意：这是针对指标 Metric 的)
metric_relabel_configs:
  - source_labels: [__name__, device]                 # 1. 原始输入：指标名 和 device 标签的值
    regex: node_network_.*_bytes_total;veth.* # 2. 匹配模式：指标名以 node_network 开头 且 device 标签值为 veth 开头
    action: drop                                      # 3. 动作：如果匹配成功，整个指标将被丢弃。
```

**效果：** 带有 `device="veth..."` 的所有网络字节数指标（如 `node_network_receive_bytes_total`）将不会被 Prometheus 存储，有效控制了存储开销。

------



## 总结



Relabeling 是 Prometheus **最强大**、同时也**最复杂**的配置功能之一。掌握了它，你就掌握了对指标的生杀予夺大权。

- **Scrape Relabeling** (抓取阶段)：用来过滤 Target（保留或丢弃整个抓取目标）。
- **Metric Relabeling** (指标阶段)：用来过滤或修改已经抓取到的指标上的标签（控制基数）。




