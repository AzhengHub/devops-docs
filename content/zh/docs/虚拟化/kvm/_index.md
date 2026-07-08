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

## 九、虚拟机管理脚本
### 9.1 统计虚拟机

```py {filename="collect_vm.py"}
import subprocess
import pandas as pd
import datetime
from openpyxl import load_workbook
from openpyxl.styles import Font, PatternFill, Alignment

# --- 配置区：对应你 ~/.ssh/config 里的别名 ---
HOST_ALIASES = ["kvm1", "kvm2", "kvm3"]

# 强化版 Shell 命令：增加了 virsh desc 读取逻辑，并修正了输出格式
KVM_CMD = """
virsh list --all --name | while read vm; do
    [ -z "$vm" ] && continue
    
    # 清理函数：去除换行和首尾空格
    clean() { echo "$1" | tr -d '\\n\\r' | xargs; }

    status=$(clean "$(virsh domstate "$vm" 2>/dev/null)")
    
    create_time=$(clean "$(stat -c %y /etc/libvirt/qemu/"$vm".xml 2>/dev/null | cut -d'.' -f1)")
    [ -z "$create_time" ] && create_time="Unknown"
    
    info=$(virsh dominfo "$vm" 2>/dev/null)
    vcpu=$(clean "$(echo "$info" | grep "CPU(s):" | awk '{print $2}')")
    mem=$(clean "$(echo "$info" | grep "Used memory:" | awk '{print $3/1024/1024 "G"}')")
    
    disks=$(clean "$(virsh domblklist "$vm" --details 2>/dev/null | grep 'disk' | awk '{print $4}' | paste -sd ";")")
    [ -z "$disks" ] && disks="No_Disk_Found"

    # --- 获取虚拟机备注 (使用 --config 确保即便没重启也能读到磁盘配置) ---
    note=$(clean "$(virsh desc "$vm" --config 2>/dev/null)")
    [ -z "$note" ] || [ "$note" = "没有域描述" ] && note="N/A"

    # --- IP 获取逻辑 ---
    get_ips_from_source() {
        virsh domifaddr "$vm" --source $1 2>/dev/null | grep ipv4 | awk '{print $4}' | cut -d/ -f1 | xargs | sed 's/ /,/g'
    }

    ips=$(get_ips_from_source "agent")
    if [ -z "$ips" ]; then
        ips=$(get_ips_from_source "lease")
    fi
    
    if [ -z "$ips" ]; then
        macs=$(virsh domiflist "$vm" 2>/dev/null | grep -E "vnet|virtio" | awk '{print $5}')
        temp_ips=""
        for m in $macs; do
            found_ip=$(arp -an | grep "$m" | awk '{print $2}' | tr -d '()')
            if [ ! -z "$found_ip" ]; then
                if [ -z "$temp_ips" ]; then temp_ips="$found_ip"; else temp_ips="$temp_ips,$found_ip"; fi
            fi
        done
        ips="$temp_ips"
    fi
    
    ips=$(echo "$ips" | tr -d '\\n\\r')
    [ -z "$ips" ] && ips="Unknown"
    
    # 修正点：最后确保输出的是 ${note}，而不是空的 ${}
    echo "${vm}|${status}|${create_time}|${vcpu}|${mem}|${ips}|${disks}|${note}"
done
"""

def fetch_kvm_data():
    all_data = []
    for host in HOST_ALIASES:
        print(f"🔍 正在连接宿主机: {host} ...")
        ssh_cmd = ["ssh", "-o", "ConnectTimeout=5", host, KVM_CMD]
        try:
            process = subprocess.run(ssh_cmd, capture_output=True, text=True, check=True)
            output = process.stdout.strip()
            
            if not output: continue
            
            for line in output.split('\n'):
                line = line.strip()
                if not line or '|' not in line: continue
                
                parts = line.split('|')
                # 填充字段，确保有 8 个元素
                while len(parts) < 8:
                    parts.append("Unknown")
                
                all_data.append({
                    "宿主机": host,
                    "虚拟机名称": parts[0],
                    "运行状态": parts[1],
                    "创建时间": parts[2],
                    "配置(vCPU)": parts[3],
                    "配置(内存)": parts[4],
                    "IP": parts[5],
                    "磁盘路径": parts[6],
                    "备注": parts[7]
                })
        except Exception as e:
            print(f"❌ {host} 执行失败: {e}")
            
    return all_data

def save_and_style_excel(data, filename):
    df = pd.DataFrame(data)
    # 重新排序列，确保备注在最后一列
    cols = ["宿主机", "虚拟机名称", "运行状态", "创建时间", "配置(vCPU)", "配置(内存)", "IP", "磁盘路径",  "备注"]
    df = df[cols]
    df = df.sort_values(by=["宿主机", "虚拟机名称"])
    df.to_excel(filename, index=False, engine='openpyxl')
    
    wb = load_workbook(filename)
    ws = wb.active
    
    # 样式定义
    header_fill = PatternFill(start_color="44546A", end_color="44546A", fill_type="solid")
    header_font = Font(color="FFFFFF", bold=True, size=11)
    center_alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)

    # 美化表头
    for cell in ws[1]:
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = center_alignment

    # 自动调整列宽
    for column in ws.columns:
        max_length = 0
        column_letter = column[0].column_letter
        for cell in column:
            try:
                if len(str(cell.value)) > max_length:
                    max_length = len(str(cell.value))
            except: pass
        
        # 特别处理“备注”列 (K列)
        if column_letter == 'K':
            ws.column_dimensions[column_letter].width = 45
        else:
            adjusted_width = (max_length + 4)
            ws.column_dimensions[column_letter].width = adjusted_width if adjusted_width < 60 else 60

    wb.save(filename)
    print(f"✨ 最终结果已保存: {filename}")

if __name__ == "__main__":
    results = fetch_kvm_data()
    if results:
        now_str = datetime.datetime.now().strftime('%Y%m%d_%H%M')
        fname = f"KVM_INFO_{now_str}.xlsx"
        save_and_style_excel(results, fname)
    else:
        print("📭 未采集到有效数据。")
```