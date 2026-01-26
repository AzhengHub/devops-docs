---
title: "CronJob"
weight: 10
---

# CronJob 概述

- CronJob 主要用于执行有终止期限的**周期性**作业式任务； 
- CronJob 与 Job 的关系类似于 Deployment 与 ReplicaSet 的关系，即 CronJob 调用 Job 来执行周期性任务



# CronJob Explain

```yaml
apiVersion: batch/v1  # API群组及版本
kind: CronJob  # 资源类型特有标识
metadata:
  name <string>  # 资源名称，在作用域中要唯一
  namespace <string>  # 名称空间；CronJob资源隶属名称空间级别
spec:
  jobTemplate  <Object>  # job作业模板，必选字段
    metadata <object>  # 模板元数据
    spec <object>  # 作业的期望状态
  schedule <string>  # 调度时间设定，必选字段
  concurrencyPolicy  <string> # 并发策略，可用值有Allow、Forbid和Replace
  failedJobsHistoryLimit <integer> # 失败作业的历史记录数，默认为1
  successfulJobsHistoryLimit  <integer> # 成功作业的历史记录数，默认为3
  startingDeadlineSeconds  <integer> # 因错过时间点而未执行的作业的可超期时长
  suspend  <boolean> # 是否挂起后续的作业，不影响当前作业，默认为false
```





# CronJob Example

## 范例 - 1

### yaml

- cronjob-demo.yaml

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: cronjob-demo
  namespace: default
spec:
  schedule: "*/1 * * * *" # 每两分钟执行一次
  jobTemplate: # job的定义
    metadata: # job的模板
      labels:
        controller: cronjob-demo
    spec: # job的具体定义
      parallelism: 1
      completions: 1
      ttlSecondsAfterFinished: 600
      backoffLimit: 3
      activeDeadlineSeconds: 60
      template:
        spec:
          containers:
          - name: myjob
            image: alpine
            command:
            - /bin/sh
            - -c
            - date; echo Hello from CronJob, sleep a while...; sleep 60
          restartPolicy: OnFailure
  startingDeadlineSeconds: 300
```

### 验证

```sh
# kubectl apply -f cronjob-demo.yaml
cronjob.batch/cronjob-demo created


# 未达到定义的时间点，因此不会创建job
# kubectl get cronjob
NAME           SCHEDULE      SUSPEND   ACTIVE   LAST SCHEDULE   AGE
cronjob-demo   */1 * * * *   False     0        <none>          12s
# kubectl get job
No resources found in default namespace.
# kubectl get pod
No resources found in default namespace.


# 到定义的时间点，开始执行job
# kubectl get cronjob
NAME           SCHEDULE      SUSPEND   ACTIVE   LAST SCHEDULE   AGE
cronjob-demo   */1 * * * *   False     1        2s              47s
# kubectl get job
NAME                    COMPLETIONS   DURATION   AGE
cronjob-demo-27876414   0/1           4s         4s
# kubectl get pod
NAME                          READY   STATUS    RESTARTS   AGE
cronjob-demo-27876414-5hlmm   1/1     Running   0          14s


# job执行完毕
# kubectl get pod
NAME                          READY   STATUS              RESTARTS   AGE
cronjob-demo-27876416-bwnpx   0/1     Terminating         0          67s
cronjob-demo-27876417-n7c5x   0/1     ContainerCreating   0          7s


# 每间隔1分钟执行一次
# kubectl get job
NAME                    COMPLETIONS   DURATION   AGE
cronjob-demo-27876416   0/1           105s       105s
cronjob-demo-27876417   0/1           45s        45s
# kubectl get job
NAME                    COMPLETIONS   DURATION   AGE
cronjob-demo-27876417   0/1           82s        82s
cronjob-demo-27876418   0/1           22s        22s
# kubectl get job
NAME                    COMPLETIONS   DURATION   AGE
cronjob-demo-27876418   0/1           76s        76s
cronjob-demo-27876419   0/1           16s        16s


# 删除cronjobs后，其关联的job也会删除
# kubectl delete cronjobs.batch cronjob-demo 
cronjob.batch "cronjob-demo" deleted
# kubectl get job
No resources found in default namespace.
# kubectl get pod
No resources found in default namespace.
```

