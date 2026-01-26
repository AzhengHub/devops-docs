---
title: "PodDisruptionBudget"
weight: 10
---

PodDisruptionBudget（Pod 稳定性预算）是 Kubernetes 中用来确保在进行节点维护或缩减时，Pod 的最小可用性的策略对象。它能够限制在一段时间内可中断的 Pod 的数量，以确保业务的稳定性。

### 主要组成部分：

1. **minAvailable 和 maxUnavailable：**
   - `minAvailable`：指定了要保持可用的最小 Pod 数量。
   - `maxUnavailable`：指定了允许不可用的最大 Pod 数量。

2. **选择器（Selector）：**
   - PodDisruptionBudget 使用标签选择器来标识受影响的 Pod。

### 作用：

- **节点维护和缩减：** 当节点需要维护、升级或者缩减时，PodDisruptionBudget 允许在这些过程中限制可以同时中断的 Pod 数量，以确保系统的稳定性和可用性。

- **可用性保证：** 它允许你定义在任何时候所需的最小可用 Pod 数量，这样可以防止过多的 Pod 同时中断，从而保障服务的可用性。

### 使用场景：

- **无宕机服务更新：** 在进行服务更新或者迁移时，可以使用 PodDisruptionBudget 来确保在更新的过程中，系统依然能够保持一定的可用性。

- **稳健性测试：** 在进行系统测试或模拟故障的情况下，可以通过限制 PodDisruptionBudget 中允许的不可用 Pod 数量来测试系统对故障的响应能力。

PodDisruptionBudget 是确保系统稳定性的一个重要工具，它提供了对可中断 Pod 数量的控制和管理，以确保在维护和更新过程中保持服务的稳定性和可用性。





以下是一个 PodDisruptionBudget 的配置示例：

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: example-pdb
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: example-app
```

这个示例创建了一个名为 `example-pdb` 的 PodDisruptionBudget。它的配置包括：

- `minAvailable: 2`：这表示至少要保证标记为 `app: example-app` 的 Pod 中有 2 个处于可用状态。
- `selector`：指定了 PodDisruptionBudget 适用的 Pod，这里使用了标签选择器来选择带有 `app: example-app` 标签的 Pod。

这个 PodDisruptionBudget 的设置意味着，在进行节点维护或者缩减时，至少会保持两个带有 `app: example-app` 标签的 Pod 处于可用状态，以确保业务的稳定性。