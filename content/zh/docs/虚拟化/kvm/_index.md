---
title: "KVM"
---

## 一、KVM 概述

**KVM (Kernel-based Virtual Machine)** 是基于 Linux 内核的开源全虚拟化解决方案。它将 Linux 内核转化为一个 **Hypervisor (虚拟机监视器)**。

* **核心原理**：利用处理器硬件辅助虚拟化扩展（Intel VT-x 或 AMD-V）。
* **组件构成**：
  * `kvm.ko`：提供核心虚拟化基础设施。
  * `kvm-intel.ko` / `kvm-amd.ko`：处理器特定的内核模块。

* **特性**：每个虚拟机 (VM) 被视为一个标准的 **Linux 进程**，由标准 Linux 调度程序进行调度。每个 VM 拥有独立的虚拟硬件（CPU、内存、网卡、磁盘等）。

参考文档：
- 官方网站：https://www.linux-kvm.org/
- 红帽KVM介绍：https://www.redhat.com/zh/topics/virtualization/what-is-KVM
- Readhat虚拟化指南：https://access.redhat.com/documentation/zh%EF%BF%BEcn/red_hat_enterprise_linux/7/html/virtualization_getting_started_guide/index

---

### 1. KVM 与 QEMU 的协作

KVM 并不是独立运行的，它必须与 QEMU 协同工作。

**角色分工：**

| 组件 | 运行空间 | 核心职责 | 备注 |
| --- | --- | --- | --- |
| **KVM** | **内核空间 (Kernel)** | 虚拟化 CPU 和 内存 (MMU) | 性能极高，接近原生硬件 |
| **QEMU** | **用户空间 (User)** | 模拟 I/O 设备 (磁盘、网卡、显卡、键盘等) | 灵活性高，支持多种硬件模拟 |

**工作机制：**

* **I/O 拦截机制**：当 Guest OS（虚拟机）尝试访问硬件资源时，指令会被 KVM 内核模块拦截。如果是 CPU 或内存指令，KVM 直接处理；如果是 I/O 请求（如读写磁盘），KVM 会将其转发给用户空间的 QEMU 进程，由 QEMU 模拟真实的硬件响应。
* **接口通信**：用户空间程序（QEMU）通过 `/dev/kvm` 接口，使用 `ioctl()` 系统调用与内核中的 KVM 模块进行交互（如创建虚拟机、分配内存、启动 CPU）。

**为什么要配合使用？**

* **QEMU 单独运行**：可以模拟整台机器，但由于所有指令都靠软件转译，**速度极慢**。
* **KVM 单独运行**：无法模拟出一台完整的电脑，因为它不具备模拟显示器、键盘、网卡等外设的能力。
* **两者结合**：KVM 提供高性能的处理器运行环境，QEMU 提供丰富的设备模拟，从而实现**高性能的全虚拟化**。

---

### 2. 管理工具链

KVM 本身只提供了底层的虚拟化能力，实际生产中我们通常使用管理工具来简化操作。

**Libvirt**：这是管理 KVM 最核心的 API 库。它屏蔽了复杂的底层命令行，提供统一的 XML 配置文件。我们常用的 `virsh` 命令行工具和 `virt-manager` (图形界面) 都是基于 Libvirt 的。


**Proxmox VE (PVE)**：
* **特点**：基于 Debian，集成 KVM 和 LXC（容器）。
* **优势**：自带 Web 界面，安装简单，非常适合中小企业或私有实验室环境。


**oVirt**：
* **特点**：Red Hat 企业级虚拟化 (RHEV) 的开源版本。
* **优势**：功能极其强大，支持复杂的存储、网络节点管理，适合大规模环境。


**OpenStack**：
* **特点**：目前最主流的开源云操作系统（IaaS）。
* **优势**：不仅仅是管理虚拟机，还管理整个数据中心的计算、存储和网络资源。


参考文档：http://www.linux-kvm.org/page/Management_Tools

---

## 二、嵌套虚拟化
如在 VMware Workstation 中的虚拟机内跑 KVM，必须关闭 Windows 的 基于虚拟化的安全性 和 Hyper-V 平台。否则这种嵌套虚拟化会导致宿主机蓝屏等问题。

**第一步：彻底移除 Hyper-V 依赖**

为了稳定运行嵌套虚拟化（VMware 内跑 KVM），必须关闭 Windows 的 **基于虚拟化的安全性 (VBS)** 和 **Hyper-V 平台**。

1. **关闭 Windows 功能**：
* 按下 `Win + R`，输入 `optionalfeatures`。
* **取消勾选**以下所有项：
* `Hyper-V` (全部子项)
* `虚拟机平台` (Virtual Machine Platform)
* `Windows 虚拟机监控程序平台`
* `Windows 沙盒`




2. **关闭内核隔离**：
* 进入“Windows 安全中心” -> “设备安全性” -> “内核隔离详情”。
* 将 **“内存完整性” (Memory Integrity)** 设置为 **关闭**。


3. **强制关闭 Hypervisor 启动**：
* 以管理员身份打开 CMD/PowerShell，执行：
```bash
bcdedit /set hypervisorlaunchtype off

```

* **重启电脑**。

---

**第二步：配置 VMware 嵌套虚拟化**

在 VMware 中为准备安装 KVM 的虚拟机（例如 Ubuntu/CentOS）开启指令集透传。

1. **编辑虚拟机设置** -> **处理器**。
2. **勾选**：`虚拟化 Intel VT-x/EPT 或 AMD-V/RVI`。
3. 开启虚拟机，检查KVM环境是否正常。
```bash
# 查看 KVM 模块是否加载
lsmod | grep kvm

# 检查虚拟化支持 (结果大于 0 即可)
egrep -c '(vmx|svm)' /proc/cpuinfo
```


## 三、KVM 安装
- 需要在 BIOS 中开启虚拟化功能

### 1. 检查 KVM 环境
```bash
# 查看 KVM 模块是否加载
lsmod | grep kvm

# 检查虚拟化支持 (结果大于 0 即可)
egrep -c '(vmx|svm)' /proc/cpuinfo

# 安装 KVM 环境（以 Ubuntu 为例）
sudo apt update
sudo apt install qemu-kvm libvirt-daemon-system libvirt-clients bridge-utils virt-manager -y

```

### 2. 安装相关组件
为了保证管理的便利性，通常安装 QEMU 核心组件、Libvirt 管理库以及常用的命令行工具。
**CentOS / RHEL**

```bash
# 安装核心包
yum install -y qemu-kvm libvirt virt-install virt-manager

# qemu-kvm: KVM 用户空间组件
# libvirt: 管理 API 库
# virt-install: 命令行安装虚拟机的工具
# virt-manager: 图形化管理界面（可选）

```

**Ubuntu / Debian**

```bash
# 更新并安装
apt update
apt install -y qemu-system-x86 libvirt-daemon-system libvirt-clients virtinst bridge-utils

```

### 3. 服务配置与权限管理
安装完成后，需要启动 Libvirt 守护进程，这是后续所有 `virsh` 命令的基础。
```bash
# 启动并设置为开机自启
systemctl enable --now libvirtd
systemctl status libvirtd

# 权限设置（非 Root 用户操作），如果希望以普通用户身份管理虚拟机，需要将该用户加入 `libvirt` 和 `kvm` 组：
usermod -aG libvirt $(whoami)
usermod -aG kvm $(whoami)
# 重新登录后生效
``` 

### 3. 验证安装

使用 `virsh` 工具查看当前环境，如果返回空列表而非报错，则说明安装成功：

```bash
virsh list --all
```


## 四、创建虚拟机
### 1. 前期准备
```sh
# 建立一个标准目录存放镜像
mkdir -p /data/kvm/iso # 存放ISO镜像文件
mkdir -p /data/kvm/images  # 存放虚拟机磁盘文件
```

### 2. 使用 virt-install 创建虚拟机
这是最常用、最规范的创建方式。

#### 2.1 创建 ovs-br0 网桥
```bash
# 安装openvswitch
apt install -y openvswitch-switch # Ubuntu
yum install -y openvswitch # CentOS/Rocky

# 启动并设置为开机自启
systemctl enable --now openvswitch

# 创建网桥
ovs-vsctl add-br ovs-br0

# 将业务口网卡 ens37 加入网桥
# 注意：生产环境通常需要两块网卡，一块用于管理，一块用于业务流量，别加错，否则无法ssh连接了
# 这里假设 ens37 是业务流量口，将其加入 ovs-br0 网桥
ovs-vsctl add-port ovs-br0 ens37

# 执行 ovs-vsctl show 验证
    Bridge ovs-br0
        Port ens37
            Interface ens37
        Port ovs-br0
            Interface ovs-br0
                type: internal


# 设置网桥为混杂模式
# 在某些物理交换机环境下，可能需要手动开启物理网卡的混杂模式，否则虚拟机流量可能无法进出：
ip link set ovs-br0 promisc on


```

#### 2.2 RedHat 系
```bash
virt-install \
--name rocky-01 \
--vcpus 2 \
--memory 2048 \
--location /data/kvm/iso/Rocky-9.iso \
--disk path=/data/kvm/images/rocky-01.qcow2,size=20,format=qcow2,bus=virtio \ 
--network bridge=ovs-br0,virtualport_type=openvswitch,model=virtio \
--graphics none \
--extra-args 'console=ttyS0,115200n8 serial' \
--os-variant rockylinux9

```
* **`--disk ...,bus=virtio`**: **核心优化点**。使用 virtio 驱动，磁盘 I/O 性能比默认的 IDE/SATA 高出几个量级。
* **`--network ...,model=virtio`**: 网卡同样使用 virtio 驱动，降低 CPU 中断损耗。此外还挂载到了 `ovs-br0` 网桥，实现了虚拟机与宿主机的网络通信。
* **`--graphics none`**: 生产服务器通常不需要 VNC/显卡。
* **`--extra-args ...`**: 配合 `--graphics none` 使用，将安装过程的输出重定向到当前终端（Console），这样直接在 SSH 窗口就能完成系统安装。
* **`--os-variant`**: 告知 KVM 目标系统类型，它会自动优化 CPU 指令集和默认驱动配置。可用 `osinfo-query os` 查看支持列表。

#### 2.3 Ubuntu 系

```bash
virt-install \
--name ubuntu-01 \
--vcpus 2 \
--memory 2048 \
--cdrom /data/kvm/iso/ubuntu-22.04.5-live-server-amd64.iso \
--disk path=/data/kvm/images/ubuntu-01.qcow2,size=20,format=qcow2,bus=virtio \
--network bridge=ovs-br0,virtualport_type=openvswitch,model=virtio \
--graphics vnc,listen=0.0.0.0 \
--os-variant ubuntu22.04
```

**修改点详细说明：**

**1. 从 `--location` 改为 `--cdrom`**

* **原因**：Ubuntu 22.04 的 Live ISO 结构与 RedHat 系不同，`virt-install` 无法直接从它的 ISO 中“提取”出内核来配合 `extra-args` 使用。
* **后果**：由于使用了 `--cdrom`，原有的 `--extra-args`（用于串口控制台输出）将无法生效。

**2. 从 `--graphics none` 改为 `--graphics vnc`**

* **原因**：因为 `--cdrom` 模式无法直接将安装界面推送到的 SSH 串口（Terminal），必须通过 **VNC** 才能看到 Ubuntu 的安装紫色界面。
* **配置**：`listen=0.0.0.0` 允许从本地电脑使用 VNC 客户端连接宿主机的 IP 来进行安装。

**3. 修改 `--os-variant` 为 `ubuntu22.04`**

* **原因**：这会告诉 KVM 使用适合 Ubuntu 22.04 的硬件抽象层配置。
* **查询方式**：可以通过 `osinfo-query os | grep ubuntu` 确认的系统支持的确切名称。

**4. 磁盘路径与名称**

* **为了规范**，我把名称和磁盘路径改为了 `ubuntu-01`，避免和之前的 Rocky 混合。 


### 3. 检查安装结果
- 除了通过 VNC 查看安装过程，还可以通过下面的方式检查安装状态
```sh
# 查看虚拟机状态是否为 running
virsh list --all

# 查看网桥 ovs-br0 的状态，应该能看到一个以 vnet 开头的 Port 被自动加入到了 ovs-br0 中。
ovs-vsctl show
```

### 4. 安装完成后的操作
```sh
# 设置开机自启（可选）
virsh autostart ubuntu-01
```

## 五、虚拟机基础管理

### 1. 管理工具
#### RealVNC
下载链接：https://www.realvnc.com/en/connect/download/viewer/

命令里写了 `--graphics vnc,listen=0.0.0.0`，KVM 会启动一个 VNC 服务。但需要知道它监听在哪个端口（通常是从 5900 开始）。
```sh
# 查看虚拟机的 VNC 端口
virsh vncdisplay ubuntu-01

# 如果输出 :0，对应端口就是 5900。
# 如果输出 :1，对应端口就是 5901，以此类推。
```

最后在本地电脑打开 VNC 客户端，输入 宿主机IP:5900 即可看到 Ubuntu 的安装界面。


#### virsh 命令
- virsh 是基于命令行的虚拟机管理工具，来自 libvirt-client 包；
- 此工具基于 libvirtd 服务，此服务如果关闭或意外停止将无法继续使用 virsh 命令对虚拟机进行管理，但虚拟机本身依旧会正常运行（默认的 iptables规则与虚拟网卡等实现都是由 libvirtd 服务生成的）。
- virsh 分为交互式与非交互式，交互式直接敲 virsh 后回车即可进入 virsh 命令行界面。非交互式则需要在命令后跟上具体的任务命令：
  - 可以使用虚拟机名称、编号、UUID 来对虚拟机进行操作，但 UUID 最保险。
| 任务 | 命令 |
| --- | --- |
| **只列出目前在运行的虚拟机** | `virsh list` |
| **查看所有虚拟机（包括已关机）** | `virsh list --all` |
| **启动虚拟机** | `virsh start ubuntu-01` |
| **关闭虚拟机** | `virsh shutdown ubuntu-01` |
| **强制断电** | `virsh destroy ubuntu-01` |
| **暂停虚拟机** | `virsh suspend ubuntu-01` |
| **恢复暂停的虚拟机** | `virsh resume ubuntu-01` | 
| **查看虚拟机 UUID** | `virsh domuuid ubuntu-01` |
| **通过 Console 连接** | `virsh console ubuntu-01` (退出按 `Ctrl + ]`) |
| **设置开机自启** | `virsh autostart ubuntu-01`（本质上是在 /etc/libvirt/qemu/autostart/ 创建了一个软链接） |
| **禁止开机自启** | `virsh autostart --disable ubuntu-01`（本质上是删除了 /etc/libvirt/qemu/autostart/ 下的软链接） |
| **修改配置** | `virsh edit ubuntu-01` (需重启生效) |  
| **查看磁盘信息** | `virsh domblklist ubuntu-01`|  
| **查看虚拟机 XML 配置** | `virsh dumpxml ubuntu-01`（本质上是从 /etc/libvirt/qemu/ 目录下读取 XML 文件）|  


这份总结已经非常全面，特别是你对“本质上是创建/删除软链接”的理解，说明你已经深入到了 Libvirt 的底层逻辑。

关于 **QEMU Guest Agent (QGA)**，它是 SRE 提升虚拟机管理精细度的关键。目前的“高级功能”描述略显宽泛，因为即使不装 QGA，很多操作（如强制断电、基本信息查看）也能做。QGA 的真正价值在于**“从宿主机安全、优雅地感知和操作 Guest OS 内部”**。

以下是润色后的版本，我帮你强化了 **SRE 实战场景**：

---

#### QGA

通过**QEMU Guest Agent** (QGA) 可以增强 virsh 功能，它是安装在虚拟机内部的一个守护进程（`qemu-guest-agent`）。它在宿主机与虚拟机之间开启了一个特殊的通信通道（Virtio-serial），使得 Libvirt 可以执行那些**必须进入系统内部才能完成**的任务。

##### 1. QGA 核心增强功能

* **优雅管理**：不通过发送 ACPI 信号，而是直接在虚拟机内部调用 `systemctl poweroff`，避免文件系统损坏。
* **信息探测**：无需登录虚机，即可获取虚机内部的真实网卡 IP（包括多网卡、虚拟 IP）、用户登录情况及 OS 详细版本。
* **文件系统冻结**：在进行虚拟机快照备份前，自动冻结（fsfreeze）磁盘 I/O，确保备份数据的一致性。
* **重置密码**：在忘记密码时，直接从宿主机端注入新密码。

##### 2. QGA 实战常用命令

当虚拟机已安装并启动 QGA 服务后，可使用以下高级命令：

| 任务 | 命令 | SRE 使用场景 |
| --- | --- | --- |
| **获取虚拟机时间** | `virsh domtime ubuntu-01` | 同步宿主机与虚机时间，防止时钟偏移影响日志分析 |
| **查看内部网卡 IP** | `virsh domifaddr ubuntu-01 --source agent` | **最常用**：直接获取虚机内部真实 IP（支持多网卡环境） |
| **安全关机** | `virsh shutdown ubuntu-01 --mode agent` | 比默认 ACPI 方式更稳定，确保数据库等应用安全关闭 |
| **安全重启** | `virsh reboot ubuntu-01 --mode agent` | 强制通过内部 Agent 重启，避免某些内核卡死状态 |
| **重置 root 密码** | `virsh set-user-password ubuntu-01 root 123456` | 紧急救援，无需进入单用户模式或挂载磁盘修改 |
| **查看 OS 详情** | `virsh domhostname ubuntu-01` | 确认内部主机名是否与 Libvirt 记录一致 |
| **获取磁盘占用** | `virsh domfsinfo ubuntu-01` | 从内部视角看磁盘挂载点和文件系统类型 |


#### virt-manager

**virt-manager** 是一个可视化虚拟机管理工具，它提供了一个用户友好的界面，用于创建、配置、管理和监控虚拟机。

**安装 virt-manager**

```bash
# Ubuntu/Debian
apt install virt-manager -y

# CentOS/Rocky
yum install virt-manager -y
```

**启动 virt-manager**
- 需要开启 X11 转发，例如 xshell 中需要安装 Xmanager-passive 程序
```bash
# 假设宿主机 IP 为 10.0.0.1，X11 转发端口为 0.0
export DISPLAY=10.0.0.1:0.0

# 启动 virt-manager
virt-manager
```




---

### SRE 部署建议

为了让上述命令生效，你需要完成两步：

1. **XML 配置（宿主机）**：确保虚拟机 XML 中包含 `qemu-ga` 的通道（通常 `virt-install` 会默认添加）：
```xml
<channel type='unix'>
  <target type='virtio' name='org.qemu.guest_agent.0'/>
</channel>

```


2. **安装服务（虚拟机内）**：
```bash
# Ubuntu/Debian
apt install qemu-guest-agent -y && systemctl enable --now qemu-guest-agent

# CentOS/Rocky
yum install qemu-guest-agent -y && systemctl enable --now qemu-guest-agent

```




## 六、快照管理
{{% alert title="<i class='fa-solid fa-exclamation-triangle pe-1'></i> 注意事项" color=warning %}}
* **磁盘格式要求：** 快照功能主要针对 **qcow2** 格式。如果磁盘是 **raw** 格式，则无法使用内置快照（需先转换为 qcow2）。
* **写时复制 (COW)：** KVM 快照基于 COW 技术。创建快照是瞬间的，但随着数据写入，快照文件会逐渐增大。
{{% /alert %}}

### 1. 创建快照
```bash
# virsh snapshot-create-as 虚拟机名称 快照名称 --atomic
virsh snapshot-create-as ubuntu-01 snapshot-01 --atomic
```
- `--atomic`：确保快照创建是原子操作，要么成功要么失败，不会部分完成。


### 2. 查看快照
```bash
# virsh snapshot-list 虚拟机名称
virsh snapshot-list ubuntu-01
```

### 3. 恢复快照
```bash
# virsh snapshot-revert 虚拟机名称 快照名称
virsh snapshot-revert ubuntu-01 snapshot-01
```

### 4. 删除快照
```bash
# virsh snapshot-delete 虚拟机名称 快照名称
virsh snapshot-delete ubuntu-01 snapshot-01
```

## 七、虚拟机克隆
在 KVM 环境中，克隆虚拟机主要有两种方式：使用命令行工具 **`virt-clone`**（最简单、最常用）以及**手动复制磁盘镜像**。

### 1. 使用 virt-clone 克隆虚拟机
这是官方推荐的方法，它会自动处理配置文件（XML）的修改，包括生成新的 UUID、MAC 地址等，避免冲突。

```sh
# 确定源虚拟机名称
virsh list --all

# 克隆前建议先停止（关机）源虚拟机，以确保磁盘数据的一致性。
virsh shutdown <源虚拟机名称>

# 执行克隆
virt-clone \
  --original <源虚拟机名称> \
  --name <新虚拟机名称> \
  --file <新虚拟机磁盘文件的存储路径>.qcow2


# 启动新虚拟机
virsh start <新虚拟机名称>
```
- `--clone-type=full`：创建一个完整的克隆，包括所有磁盘数据。

## 八、网络管理

网络模式对比：

| 特性 | 网桥模式 (Bridge) | NAT 模式 | 直接分配 (SR-IOV) |
| --- | --- | --- | --- |
| **外部可见性** | 外部网络可直接访问 VM | 外部不可见，需做端口转发 | 外部直接访问 |
| **性能** | 高 (接近物理网卡) | 中 (受限于宿主机 CPU) | **极高 (几乎无损)** |
| **灵活性** | 高 | 一般 | 低 (受物理硬件限制) |
| **复杂度** | 低 | 极低 | 高 (需硬件支持) |
| **典型用途** | **生产业务环境** | 个人实验、快速开发 | **高并发/低延迟业务** |

### 1. 桥接模式
在 KVM 的生产环境中，网桥模式（Bridge Mode） 是应用最广泛、最主流的选择。

**桥接模式原理：**：
- 首先通过 Linux 内核或 ovs 创建一个网桥（如 br0），这个网桥相当于一个“交换机”，所有连接到它的物理网卡和虚拟机网卡都在同一个二层网络中；
- 物理网卡（如 eth0）被插到这个“交换机”的一个端口上；
- 虚拟机启动时，KVM 会在宿主机创建一个 vnetX 虚拟网卡，并将其插到 br0 的另一个端口。

#### 1.1 实现桥接模式
- KVM 虚拟机网卡加入到网桥。

##### 1.1.1 创建网桥
- 下面以 ovs 网桥为例，创建一个名为 ovs-br0 的网桥。
```bash
# 安装 ovs 软件包
apt install openvswitch-switch -y

# 创建 ovs 网桥
ovs-vsctl add-br ovs-br0

# 查看 ovs 网桥
ovs-vsctl show
```

##### 1.1.2 虚拟机网卡加入网桥

**方法一：安装系统时指定网桥**
```sh
virt-install  --network bridge=ovs-br0,virtualport_type=openvswitch,model=virtio   ...
```

**方法二：通过 XML 配置**
- 编辑虚拟机 XML 配置文件，添加网络接口。
```sh
# 编辑虚拟机配置： 
virsh edit <虚拟机名称>

# 修改 <interface> 段落： 找到网络接口部分，按以下格式修改：
<interface type='bridge'>
  <source bridge='ovs-br0'/>
  <virtualport type='openvswitch'/>
  <model type='virtio'/>
</interface>

# 保存并启动，配置完成后，启动虚拟机。Libvirt 会自动执行类似于 ovs-vsctl add-port 的操作。
``` 

**方法三：在 Libvirt 中定义 OVS 虚拟网络**
- 如果有很多 VM 都要连 OVS，可以先定义一个 Libvirt 网络。
```sh
# 创建一个网络 XML 文件 ovs-net.xml：
<network>
  <name>ovs-network</name>
  <forward mode='bridge'/>
  <bridge name='ovs-br0'/>
  <virtualport type='openvswitch'/>
</network>


# 激活并使用：
virsh net-define ovs-net.xml
virsh net-start ovs-network
virsh net-autostart ovs-network


# 之后在 VM 配置里只需指定 <source network='ovs-network'/> 即可。
```

##### 1.1.3 验证

```bash
# 查看 ovs 网桥
# ovs-vsctl show
    Bridge ovs-br0
        Port vnet0
            Interface vnet0
        Port ens37
            Interface ens37
        Port ovs-br0
            Interface ovs-br0
                type: internal

# 宿主机查看 vnet0 网卡
# ip a
6: vnet0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel master ovs-system state UNKNOWN group default qlen 1000
    link/ether fe:54:00:ce:a4:42 brd ff:ff:ff:ff:ff:ff
    inet6 fe80::fc54:ff:fece:a442/64 scope link 
       valid_lft forever preferred_lft forever

# 查看虚拟机网卡是否加入到 ovs 网桥
# virsh domiflist ubuntu-01
 Interface   Type     Source    Model    MAC
------------------------------------------------------------
 vnet0       bridge   ovs-br0   virtio   52:54:00:ce:a4:42

# 虚拟机内部查看 enp1s0 网卡，MAC 地址与宿主机 vnet0 网卡一致
# ip a
2: enp1s0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP group default qlen 1000
    link/ether 52:54:00:ce:a4:42 brd ff:ff:ff:ff:ff:ff
    inet 10.0.0.128/24 metric 100 brd 10.0.0.255 scope global dynamic enp1s0
       valid_lft 1145sec preferred_lft 1145sec
    inet6 fe80::5054:ff:fece:a442/64 scope link 
       valid_lft forever preferred_lft forever


# 检查流表，确认是否有流量统计，如果有 n_packets 在增加，说明流量已经过桥。
ovs-ofctl dump-flows ovs-br0
```
在虚拟化层，`vnet0` 是宿主机侧的一个 **Tap 设备**，它就像是一根虚拟网线的“一头”；而虚拟机内部的 `enp1s0` 是这根线的“另一头”。它们共享相同的二层身份信息。如果 MAC 地址完全一致，那么 `vnet0` 就是 `enp1s0` 在宿主机侧的呈现。
- Tap 设备简单来说，就是一种虚拟网卡，它是连接“虚拟机内部”与“宿主机外部”的**二层**桥梁。

#### 1.2 桥接模式下虚拟机间通信
- 只要虚拟机之前接入同一个网桥，并配置了正确的 IP 地址，就可以直接通信。


### 2. NAT 模式
这是 KVM 安装后的默认设置（即 `virbr0` 网桥）。

* **原理**：宿主机充当虚拟机的路由器。宿主机会通过 `dnsmasq` 为虚拟机分配私有 IP，并通过内核的 IP Forwarding 和 IPTables 实现 SNAT（源地址转换）。
* **优点**：开箱即用，虚拟机可以访问外部网络。
* **缺点**：外部网络（包括局域网内其他物理机）无法直接访问虚拟机；宿主机重启或网络服务变动可能导致规则丢失。
* **适用场景**：个人开发测试、临时实验环境。


---

如果是实验/测试环境，可以使用 `virbr0` 的 NAT 模式。

如果是生产环境，建议直接禁用 `virbr0`，改用 OVS 桥接模式，可以执行以下操作：

```bash
# 查看所有网络
virsh net-list --all

# 停止默认网络
virsh net-destroy default

# 取消开机自启
virsh net-autostart --disable default

# (可选) 如果确定以后不用了，可以直接删除定义
virsh net-undefine default
```

