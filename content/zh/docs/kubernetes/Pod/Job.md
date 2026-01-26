---
title: "Job"
weight: 10
---

# Job 概述

- Job 用于执行有终止期限的**一次性**作业式任务，而非一直处于运行状态的服务进程；
- Job 成功运行完毕后，Pod 会处于 Completed 状态



# Job Explain

```yaml
apiVersion: batch/v1  # API群组及版本
kind: Job  # 资源类型特有标识
metadata:
  name <string>  # 资源名称，在作用域中要唯一
  namespace <string>  # 名称空间；Job资源隶属名称空间级别
spec:
  selector <object> # 标签选择器，必须匹配template字段中Pod模板中的标签
  template <object>  # Pod模板对象
  completions <integer> # 期望的成功完成的作业次数，成功运行结束的Pod数量
  ttlSecondsAfterFinished  <integer> # 终止状态作业的生存时长，超期将被删除
  parallelism  <integer>  # 作业的最大并行度，默认为1
  backoffLimit <integer>  # 将作业标记为Failed之前的重试次数，默认为6
  activeDeadlineSeconds  <integer> # 作业启动后可处于活动状态的时长
```







# Job Example

## 范例 - 1

### yaml

- job-demo.yaml

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: job-demo
spec:
  template:
    spec:
      containers:
      - name: myjob
        image: alpine:3.11
        imagePullPolicy: IfNotPresent
        command: ["/bin/sh", "-c", "sleep 60"]
      restartPolicy: Never
  completions: 2 # 期望成功完成2次作业
  ttlSecondsAfterFinished: 3600
  backoffLimit: 3
  activeDeadlineSeconds: 300
```

### 验证

```sh
# kubectl apply -f job-demo.yaml 
job.batch/job-demo created


# 第一次作业运行中
# kubectl get job
NAME       COMPLETIONS   DURATION   AGE
job-demo   0/2           55s        55s
# kubectl get pod
NAME             READY   STATUS    RESTARTS   AGE
job-demo-hfqht   1/1     Running   0          10s



# 第一次作业运行完毕，第二次作业运行中
# kubectl get job
NAME       COMPLETIONS   DURATION   AGE
job-demo   1/2           69s        69s
# kubectl get pod
NAME             READY   STATUS      RESTARTS   AGE
job-demo-hfqht   0/1     Completed   0          72s
job-demo-nmcfr   1/1     Running     0          5s


# 两次作业全部运行完毕
# kubectl get job
NAME       COMPLETIONS   DURATION   AGE
job-demo   2/2           2m11s      2m57s
# kubectl get pod
NAME             READY   STATUS      RESTARTS   AGE
job-demo-hfqht   0/1     Completed   0          2m54s
job-demo-nmcfr   0/1     Completed   0          107s



# 删除cronjobs后，其关联的job也会删除
# kubectl delete job job-demo 
job.batch/job-demo "cronjob-demo" deleted
# kubectl get pod
No resources found in default namespace.
```



## 范例 - 2

### yaml

- job-para-demo.yaml

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: job-para-demo
spec:
  template:
    spec:
      containers:
      - name: myjob
        image: alpine:3.11
        imagePullPolicy: IfNotPresent
        command: ["/bin/sh", "-c", "sleep 60"]
      restartPolicy: Never
  completions: 12 # 期望成功完成2次作业
  parallelism: 2 # 以两两一组的方式并行运行（12/2=6，大约需要60x6=360+秒完成）
  ttlSecondsAfterFinished: 3600
  backoffLimit: 3
  activeDeadlineSeconds: 1200
```

### Test

```bash
# kubectl apply -f job-para-demo.yaml 
job.batch/job-para-demo created


# 并行2
# kubectl get pod
NAME                  READY   STATUS    RESTARTS   AGE
job-para-demo-7qtd4   1/1     Running   0          7s
job-para-demo-b5v4s   1/1     Running   0          7s


# 期望完成12个，目前完成0个
# kubectl get jobs.batch job-para-demo 
NAME            COMPLETIONS   DURATION   AGE
job-para-demo   0/12          12s        12s



# kubectl describe jobs.batch job-para-demo 
...



# 期望完成12个，目前完成4个
# kubectl get jobs.batch job-para-demo 
NAME            COMPLETIONS   DURATION   AGE
job-para-demo   4/12          2m23s      2m23s


# 完成后pod会处于Completed状态
# kubectl get pod
NAME                  READY   STATUS      RESTARTS   AGE
job-para-demo-7qtd4   0/1     Completed   0          2m16s
job-para-demo-b5v4s   0/1     Completed   0          2m16s
job-para-demo-g8fsv   1/1     Running     0          4s
job-para-demo-msvgf   0/1     Completed   0          68s
job-para-demo-tjvnt   1/1     Running     0          3s
job-para-demo-vtjhq   0/1     Completed   0          67s


# 完成后的Completed状态会保留
# kubectl get pod
NAME                  READY   STATUS      RESTARTS   AGE
job-para-demo-7qtd4   0/1     Completed   0          20m
job-para-demo-b5v4s   0/1     Completed   0          20m
job-para-demo-g8fsv   0/1     Completed   0          18m
job-para-demo-klqkw   0/1     Completed   0          15m
job-para-demo-msvgf   0/1     Completed   0          19m
job-para-demo-p5grs   0/1     Completed   0          16m
job-para-demo-qvtr9   0/1     Completed   0          15m
job-para-demo-szg9c   0/1     Completed   0          17m
job-para-demo-tjvnt   0/1     Completed   0          18m
job-para-demo-vtjhq   0/1     Completed   0          19m
job-para-demo-vvntz   0/1     Completed   0          16m
job-para-demo-vxdwt   0/1     Completed   0          17m
```



