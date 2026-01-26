---
title: "PodSecurityPolicy"
weight: 10
---

# PodSecurityPolicy 概述

- PodSecurityPolicy 是集群级别资源限制，因此无需指定 namespace
- 简称 PSP
- 相当于对应 `pod.spec.securityContext`

## 注意事项：

- 默认k8s并未启动PSP准入控制器，如果单纯的启动了PSP，那在之前在k8s中运行的pod将会收到很大限制 寸步难行
  - 如果要启动，需在api-server启动选项中指定

- **目前 PSP 为 v1beta1，所以一般不使用**





# PodSecurityPolicy Explain

```yaml
apiVersion: policy/v1beta1  # PSP资源所属的API群组及版本
kind: PodSecurityPolicy  # 资源类型标识
metadata:
  name <string>  # 资源名称
spec:  
  allowPrivilegeEscalation  <boolean>  # 是否允许权限升级
  allowedCSIDrivers <[]Object>  #内联CSI驱动程序列表，必须在Pod规范中显式定义
  allowedCapabilities <[]string>  # 允许使用的内核能力列表，“*”表示all
  allowedFlexVolumes <[]Object>  # 允许使用的Flexvolume列表，空值表示“all
  allowedHostPaths <[]Object>  # 允许使用的主机路径列表，空值表示all
  allowedProcMountTypes <[]string> # 允许使用的ProcMountType列表，空值表示默认
  allowedUnsafeSysctls <[]string> # 允许使用的非安全sysctl参数，空值表示不允许
  defaultAddCapabilities  <[]string>  # 默认即添加到Pod对象的内核能力，可被drop
  defaultAllowPrivilegeEscalation <boolean> # 是否默认允许内核权限升级
  forbiddenSysctls  <[]string> # 禁止使用的sysctl参数，空表示不禁用
  fsGroup <Object>  # 允许在SecurityContext中使用的fsgroup，必选字段
    rule <string>  # 允许使用的FSGroup的规则，支持RunAsAny和MustRunAs
    ranges <[]Object> # 允许使用的组ID范围，需要与MustRunAs规则一同使用
      max  <integer>  # 最大组ID号
      min  <integer>  # 最小组ID号
  hostIPC <boolean> # 是否允许Pod使用hostIPC
  hostNetwork <boolean> # 是否允许Pod使用hostNetwork
  hostPID <boolean> # 是否允许Pod使用hostPID
  hostPorts <[]Object>  # 允许Pod使用的主机端口暴露其服务的范围
    max  <integer>  # 最大端口号，必选字段
    min  <integer>  # 最小端口号，必选字段
  privileged  <boolean>  # 是否允许运行特权Pod
  readOnlyRootFilesystem  <boolean>  # 是否设定容器的根文件系统为“只读”
  requiredDropCapabilities <[]string> # 必须要禁用的内核能力列表  
  runAsGroup  <Object>  # 允许Pod在runAsGroup中使用的值列表，未定义表示不限制
  runAsUser <Object> # 允许Pod在runAsUser中使用的值列表，必选字段
    rule <string>  # 支持RunAsAny、MustRunAs和MustRunAsNonRoot
    ranges <[]Object> # 允许使用的组ID范围，需要跟“MustRunAs”规则一同使用
      max  <integer>  # 最大组ID号
      min  <integer>  # 最小组ID号
  runtimeClass <Object> # 允许Pod使用的运行类，未定义表示不限制
    allowedRuntimeClassNames <[]string> # 可使用的runtimeClass列表，“*”表示all
    defaultRuntimeClassName <string> # 默认使用的runtimeClass
  seLinux <Object> # 允许Pod使用的selinux标签，必选字段
    rule <string>  # MustRunAs表示使用seLinuxOptions定义的值；RunAsAny表示可使用任意值
    seLinuxOptions  <Object>  # 自定义seLinux选项对象，与MustRunAs协作生效
  supplementalGroups  <Object> # 允许Pod在SecurityContext中使用附加组，必选字段  volumes <[]string>  # 允许Pod使用的存储卷插件列表，空表示禁用，“*”表示全部
```

