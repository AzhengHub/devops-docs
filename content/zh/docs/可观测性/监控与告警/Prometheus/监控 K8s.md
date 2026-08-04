---
title: "监控 K8s"
---

# 相关 Exporter


对于一个完整的 K8s 监控方案，通常会部署以下几个核心组件：

| **组件名称**                  | **监控目标**                            | **监控粒度**  | **指标前缀**  |
| ----------------------------- | --------------------------------------- | ------------- | ------------- |
| **`kube-state-metrics`**      | K8s 对象状态 (Pod, Deployment, Node 等) | 集群状态      |   kube_   |
| **`Node Exporter`**           | 节点操作系统和硬件                      | 基础设施/节点 |    node_    |
| **`cAdvisor` (通过 Kubelet)** | 容器的资源使用                          | 容器          |  container_ / pod_   |
| **核心组件 `/metrics`**       | K8s 控制平面 (API Server, Scheduler 等) | 集群控制面    |   |
| **应用 Exporter**             | 应用程序和中间件 (Redis, Kafka, etc.)   | 应用          |   |

许多人会使用 **`kube-prometheus-stack`** (一个 Helm Chart) 来部署一整套监控方案，它包含了 Prometheus Operator、Prometheus、Alertmanager、**`Node Exporter`** 和 **`kube-state-metrics`** 等所有必要的组件。


# kube-state-metrics (KSM)
- **功能:** 收集 Kubernetes 对象的健康和状态指标，例如 Pod、Node、Deployment、Service、Job 等的状态信息。
- **指标示例:** Pod 的状态（Running, Pending, Failed）、Deployment 的可用副本数、资源请求和限制 (Request/Limit) 等。
- **特点:** 不监控 Pod 或 Node 本身的资源使用情况，而是监控 K8s API Server 中对象的状态。

# Node Exporter
- **功能:** 收集 Kubernetes 集群中**每个节点**（Node）的底层操作系统和硬件指标。
- **指标示例:** CPU 使用率、内存使用率、磁盘 I/O、网络带宽/延迟、文件系统健康状况等。
- **部署方式:** 通常以 **DaemonSet** 的形式部署，确保每个节点上都有一个实例运行。

# cAdvisor (Container Advisor)
- **功能:** 容器资源使用情况和性能分析代理。它专门为容器构建，并收集机器上所有运行容器的系统指标。
- **特点:** 在 K8s 中，**`cAdvisor` 已经集成到 `kubelet` 二进制文件中**，因此通常不需要单独部署。Prometheus 可以直接从 Kubelet 的 `/metrics` 或 `/metrics/cadvisor` 端点获取这些容器级别的指标。

# 各种中间件/应用 Exporter
- 例如：`Redis Exporter`、`MySQL Exporter`、`Kafka Exporter`、`JMX Exporter`（用于 JVM 应用）等。
- **功能:** 收集特定应用或中间件的内部运行指标。

# Blackbox Exporter
- **功能:** 用于外部探测（External Probing）和黑盒监控，检查端点（如 HTTP/S、TCP、ICMP、DNS）的可用性和延迟。
- **用途:** 监控 Service 或 Ingress 暴露的外部服务的健康状况。

# Kubernetes Control Plane Metrics
- K8s 的核心组件（如 **`kube-apiserver`**、**`kube-controller-manager`**、**`kube-scheduler`**、**`etcd`**）本身会暴露符合 Prometheus 格式的 `/metrics` 端点。这些指标直接从组件暴露，不需要额外的 Exporter。

