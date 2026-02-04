---
title: "Pod 安全相关配置"
weight: 10
---

## securityContext
`securityContext` 是 Kubernetes 中定义 Pod 或 Container 权限和访问控制设置的核心字段。它决定了容器内的进程以什么用户身份运行、拥有哪些 Linux Capabilities（能力）、文件系统权限如何分配等。

**Pod 级别 (全局基准，对所有容器生效):**
- 设置在 `spec.securityContext`。
- 这些设置会应用到 Pod 内的**所有**容器（包括 Init Containers 和 Sidecars）。
- **特有字段:** 只有 Pod 级别可以配置挂载卷的权限（如 `fsGroup`）和 sysctls。

**容器级别 (特定覆盖，仅对特定容器生效):**
- 设置在 `spec.containers[].securityContext`。
- **优先级更高:** 如果同一个字段（如 `runAsUser`）在 Pod 和容器级别都设置了，容器级别的设置会**覆盖** Pod 级别的设置。
- **特有字段:** 只有容器级别可以配置 Capabilities（能力）和特权模式（Privileged）。 


### Pod 级别的 SecurityContext

Pod 级别的设置主要关注**所有容器共享的属性**以及**存储卷的访问控制**。下面是一些常用的字段：

**`fsGroup` (FileSystem Group):**
- **作用:** Kubernetes 会自动将挂载的 Volume 中所有文件的所属组（Group ID）更改为这个 ID，并确保容器进程（如果属于该组）有读写权限。
- **场景:** 多个容器共享一个存储卷时，确保它们都能读写文件。

**`runAsUser` / `runAsGroup`:**
- **作用:** 指定 Pod 内所有容器进程运行的 UID 和 GID。
- **注意:** 如果容器级别也定义了，则以此处为准。

**`runAsNonRoot`:**
- **作用:** 强制检查容器镜像是否尝试以 root (UID 0) 运行。如果是，Kubernetes 甚至不会启动该容器。

**`seccompProfile`:**
- **作用:** 限制容器进程可以调用的系统调用（System Calls），减少攻击面。 

#### YAML 示例

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: pod-security-context-demo
spec:
  securityContext:
    runAsUser: 1000        # 所有容器默认以 UID 1000 运行
    runAsGroup: 3000       # 所有容器默认 GID 3000
    fsGroup: 2000          # 挂载卷的文件组 ID 将被改为 2000
  volumes:
  - name: sec-ctx-vol
    emptyDir: {}
  containers:
  - name: sec-ctx-demo
    image: busybox
    command: [ "sh", "-c", "sleep 1h" ]
    volumeMounts:
    - name: sec-ctx-vol
      mountPath: /data/demo

```

---

### 容器级别的 SecurityContext

容器级别的设置更加精细，通常涉及**Linux 内核能力的控制**和**文件系统只读性**。下面是一些常用的字段：

**`capabilities`:**
- **作用:** 精细化控制 Linux Capabilities（如 `NET_ADMIN`, `SYS_TIME`）。
- **add:** 增加特定能力（尽量少用）。
- **drop:** 移除能力（最佳实践是 `drop: ["ALL"]`，然后按需添加）。


**`privileged`:**
- **作用:** **特权模式**。容器内的 root 用户将拥有宿主机 root 用户的几乎所有权限，可以直接访问宿主机的设备。
- **警告:** 除非必要（如需操作硬件或管理网络栈），否则**严禁**设置为 `true`。


**`readOnlyRootFilesystem`:**
- **作用:** 将容器的根文件系统设为只读。  
- **场景:** 增强安全性，防止攻击者篡改应用二进制文件或配置文件。应用如需写数据，必须挂载 Volume（如 emptyDir）。


**`allowPrivilegeEscalation`:**
- **作用:** 是否允许子进程获得的权限比父进程多（通过 setuid 二进制文件）。
- **建议:** 设置为 `false` 以防止提权攻击。 



**YAML 示例（包含覆盖 Pod 设置）：**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: container-security-context-demo
spec:
  securityContext:
    runAsUser: 1000        # Pod 级别默认
  containers:
  - name: secure-container
    image: busybox
    command: [ "sh", "-c", "sleep 1h" ]
    securityContext:
      runAsUser: 2000      # 【覆盖】此容器将以 UID 2000 运行，而非 1000
      allowPrivilegeEscalation: false
      readOnlyRootFilesystem: true
      capabilities:
        add: ["NET_ADMIN"] # 【特有】仅此容器拥有网络管理能力
        drop: ["ALL"]

```

---

###  字段对比速查表

| 字段 (Field) | Pod 级别 | 容器级别 | 说明 |
| --- | --- | --- | --- |
| `runAsUser` / `runAsGroup` | ✅ | ✅ | 容器级别会**覆盖** Pod 级别 |
| `runAsNonRoot` | ✅ | ✅ | 容器级别会**覆盖** Pod 级别 |
| `seccompProfile` | ✅ | ✅ | 容器级别会**覆盖** Pod 级别 |
| `fsGroup` | ✅ | ❌ | 仅 Pod 级别，用于控制 Volume 权限 |
| `fsGroupChangePolicy` | ✅ | ❌ | 仅 Pod 级别，控制何时更改 Volume 权限 |
| `sysctls` | ✅ | ❌ | 仅 Pod 级别，修改内核参数 |
| `capabilities` | ❌ | ✅ | 仅容器级别，Linux 能力控制 |
| `privileged` | ❌ | ✅ | 仅容器级别，特权模式 |
| `readOnlyRootFilesystem` | ❌ | ✅ | 仅容器级别 |
| `allowPrivilegeEscalation` | ❌ | ✅ | 仅容器级别 |

---

### capabilities
[capabilities(7) - Linux manual page (man7.org)](https://man7.org/linux/man-pages/man7/capabilities.7.html)
- capabilities 就是将 Linux 内核在设计时将不同能力划分成了多个不同的单元，以便普通用户调用，常用内核相关能力说明：

```bash
CAP_CHOWN # 改变UID和GID

CAP_MKNOD # 调用 mknod() 创建设备文件 

CAP_NET_ADMIN # 网络管理权限，比如：iptables规则、路由表、清空驱动上的统计数据、设置网络接口的混杂模式、设置是否支持多播功能等...

CAP_SYS_ADMIN # 大部分的管理权限

CAP_SYS_TIME # 改内核时钟

CAP_SYS_MODULE # 装载卸载内核模块

CAP_NET_BIND_SERVICE # 允许普通用户绑定特权端口，0 ~ 1024
```

---

### 最佳实践建议

1. **遵循最小权限原则 (Least Privilege):** 默认丢弃所有 Capabilities (`drop: ["ALL"]`)，只添加应用运行必需的。
2. **避免使用 root:** 尽量设置 `runAsNonRoot: true` 和指定具体的 `runAsUser`（如 UID > 10000）。
3. **限制提权:** 将 `allowPrivilegeEscalation` 设为 `false`。
4. **锁定文件系统:** 如果应用不需要写入根目录，尽量开启 `readOnlyRootFilesystem: true`，并将临时文件写入 `/tmp` 挂载的 `emptyDir`。

**您想了解如何结合 `PodSecurityAdmission` (PSA) 来强制在整个 Namespace 中实施这些策略吗？**




## 集群级安全策略（PodSecurityPolicy）

- PodSecurityPolicy 是集群级别资源限制，因此无需指定 namespace
- 简称 PSP
- 相当于对应 `pod.spec.securityContext`

### 注意事项：

- 默认k8s并未启动PSP准入控制器，如果单纯的启动了PSP，那在之前在k8s中运行的pod将会收到很大限制 寸步难行
  - 如果要启动，需在api-server启动选项中指定

- **目前 PSP 为 v1beta1，所以一般不使用**





### PodSecurityPolicy Explain

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

