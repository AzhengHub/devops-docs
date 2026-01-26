---
title: "Open vSwitch"
---

## OVS 概述
OVS 是一款开源的、生产级质量的多层虚拟交换机。与传统的 Linux Bridge 相比，OVS 最大的特点是**可编程性**（支持 OpenFlow）和**高性能**（内核态流表缓存），这使它成为云计算（OpenStack）和容器网络（Kubernetes CNI 如 OVN-Kubernetes, Antrea）的核心组件。

---

## OVS 核心组件

OVS 的架构设计采用了 **用户态 (User Space)** 和 **内核态 (Kernel Space)** 分离的模式，主要由三个核心组件组成：

## 1. ovs-vswitchd (用户态守护进程)
* **大脑**：这是 OVS 的核心守护进程。
* **职责**：负责与控制器（Controller）通信（通过 OpenFlow 协议），与数据库通信（OVSDB），以及管理流表（Flow Tables）。
* **慢速路径 (Slow Path)**：当内核模块不知道如何处理一个数据包（即“流表未命中”）时，数据包会被发送到 `ovs-vswitchd` 进行决策，决策结果会被下发到内核，形成缓存。


## 2. ovsdb-server (用户态数据库服务)
* **配置中心**：这是一个轻量级的数据库服务，用于保存 OVS 的配置信息（如 Bridge、Port、Interface、VLAN 配置等）。
* **持久化**：配置信息通常存储在 `/etc/openvswitch/conf.db` 中。


## 3. openvswitch_mod (内核模块 / Datapath)
* **执行者**：运行在 Linux 内核空间。
* **快速路径 (Fast Path)**：它维护一个**精确匹配**的缓存（Microflow Cache / Megaflow Cache）。当数据包进入网卡时，内核模块直接查缓存。如果命中，直接转发（性能极高）；如果不命中，则上报给用户态的 `ovs-vswitchd`（Upcall）。


---

## 相关核心概念与术语

在操作 OVS 时，你需要理解以下层级关系：

* **Bridge (网桥/交换机)**：对应物理交换机。一个 OVS 实例可以创建多个 Bridge（如 `br-int`, `br-ex`）。
* **Port (端口)**：对应交换机上的插口。
* **Normal Port**：连接物理网卡或虚拟网卡（veth pair）。
* **Internal Port**：OVS 内部创建的虚拟网卡（如 `br0`），通常配置 IP 地址用于宿主机通信。
* **Patch Port**：用于连接两个 OVS Bridge 的虚拟线缆。
* **Tunnel Port**：用于通过 VXLAN/GRE 封装跨主机通信。

* **Interface (接口)**：Port 上挂载的具体设备（通常 Port 和 Interface 是一对一的，但在 Bond 模式下是一对多）。
* **Flow (流)**：OVS 转发决策的基本单位。例如：“如果源 IP 是 A，目的端口是 80，则从 Port 2 转发出去”。

---

### 3. 数据包转发流程 (Packet Flow)

这是排查网络问题（如 K8s 网络不通）时最重要的部分。

1. **Ingress**：数据包进入 OVS 控制的网卡。
2. **Datapath Check (Kernel)**：
* 内核模块检查 **Fast Path** 缓存。
* **HIT**：如果找到匹配记录，直接执行动作（如 Forward, Drop, Modify），不经过用户态。**性能最高**。
* **MISS**：如果没有找到，触发 **Upcall**，将数据包（通常是首包）发送给用户态的 `ovs-vswitchd`。


3. **Flow Table Lookup (User Space)**：
* `ovs-vswitchd` 接收数据包，查询完整的 OpenFlow 流表（可能会有多级流表 Pipeline）。
* 决定如何处理该数据包。


4. **Install Rule & Execute**：
* `ovs-vswitchd` 将计算出的处理逻辑（Action）下发给内核模块，更新 Fast Path 缓存。
* 后续相同特征的数据包将直接在内核态处理。



---

## OVS 常用管理工具
使用前需安装 OVS 软件包：

```bash
# 安装 OVS 软件包
apt install openvswitch-switch

# 启动服务并设置为开机自启
systemctl enable --now openvswitch-switch

# 检查 OVS 服务状态
systemctl status openvswitch-switch
```


### ovs-vsctl
- 配置管理工具，用于创建、删除、配置 OVS Bridge、Port 等。

#### 创建网桥
```sh
# 创建网桥（Bridge）
ovs-vsctl add-br br-test # 创建一个名为 br-test 的网桥


# 查看 OVS 配置
# ovs-vsctl show
06cd7734-0575-420a-912d-b8c1a6ec3687 # 网桥的 UUID
    Bridge br-test # 网桥名称
        Port br-test # 默认端口名称
            Interface br-test # 端口挂载的接口名称
                type: internal # 内部端口
    ovs_version: "2.17.9" # OVS 版本号

# 查看网桥状态
# ip a | grep br-test -A3
5: br-test: <BROADCAST,MULTICAST> mtu 1500 qdisc noop state DOWN group default qlen 1000
    link/ether 06:17:fa:56:e7:44 brd ff:ff:ff:ff:ff:ff
```

#### 网卡与网桥绑定
{{% alert title="<i class='fa-solid fa-exclamation-triangle pe-1'></i> 注意事项" color=warning %}}
1. 绑定前，需确保有两个网卡，一个用于管理，一个用于业务
2. 绑定时，一定要绑定到业务网卡，不能绑定到管理网卡，否则将导致远程 ssh 连接失败。

**PS：**
- 网卡一旦被挂载到 OVS 网桥上，网卡就变成了一根“网线”（纯二层设备），不再具备三层（IP）功能。
{{% /alert %}}

```sh
# 查看当前系统中的网卡
# ip -br a
...
ens33            UP             10.0.0.100/24 fe80::20c:29ff:fe80:5232/64 # 管理口
ens37            DOWN   # 业务口
...

# 将 ens37 绑定到 br-test 网桥
ovs-vsctl add-port br-test ens37 # 将 ens37 作为 br-test 的一个端口


# 查看 OVS 配置
# ovs-vsctl show
06cd7734-0575-420a-912d-b8c1a6ec3687
    Bridge br-test
        Port br-test
            Interface br-test
                type: internal
        Port ens37 # 端口名称
            Interface ens37 # 端口挂载的接口名称
                type: normal # 普通端口，连接物理网卡或虚拟网卡
    ovs_version: "2.17.9"
```

#### 创建虚拟网卡并绑定到网桥
```sh
# 创建一个名为 vnet-test 的虚拟网卡，并将其作为 br-test 的一个端口，tag 为 110（VLAN）
ovs-vsctl add-port br-test vnet-test tag=110 -- set Interface vnet-test type=internal


# ovs-vsctl show
06cd7734-0575-420a-912d-b8c1a6ec3687
    Bridge br-test
        Port vnet-test # 名为 vnet-test 的虚拟网卡
            tag: 110 # VLAN标签为 110
            Interface vnet-test # 挂载到 vnet-test 虚拟网卡
                type: internal # 内部端口
        Port br-test
            Interface br-test
                type: internal
        Port ens37
            Interface ens37
    ovs_version: "2.17.9"
```

#### 修改网桥端口的 VLAN 标签
```sh
# 修改前
# ovs-vsctl show
    Bridge br-test
        Port vnet-test
            tag: 110 # VLAN标签为 110
            Interface vnet-test
                type: internal


# 修改 vnet-test 端口的 VLAN 标签为 2022
ovs-vsctl set Port vnet-test tag=2022


# 修改后
# ovs-vsctl show
    Bridge br-test
        Port vnet-test
            tag: 2022 # VLAN标签为 2022
            Interface vnet-test
                type: internal
```

#### 清除网桥端口的 VLAN 标签
- 例如需要改成 Trunk 模式，需要清除 VLAN 标签。
```sh
# 清除 vnet-test 端口的 VLAN 标签
ovs-vsctl clear port vnet-test tag
```
#### 将网桥端口修改为 Trunk 模式
- 未配置 VLAN 标签的情况下，默认即为 Trunk 模式。
```sh
# 将 vnet-test 端口设置为 Trunk 模式
ovs-vsctl set port vnet-test vlan_mode=trunk
```

#### 将网桥端口修改为 Trunk 模式，并设置允许的 VLAN 标签范围
```sh
# 将 vnet-test 端口设置为 Trunk 模式，只允许带着 VLAN 100 和 VLAN 110 标签的数据包通过这个口，而且不要拆掉标签。
ovs-vsctl set port vnet-test trunks=[100,110]

# 清空 VLAN 白名单，全放行，允许 VLAN 0 - 4095 所有标签通过。
# 如果把连接普通虚拟机的端口设为 trunks=[]，这台虚拟机就能通过伪造 VLAN 标签，探测到你整个网络里所有 VLAN 的数据（比如原本属于财务部的 VLAN 666）。这是严重的安全漏洞。
ovs-vsctl set port vnet-test trunks=[]
```

#### 网桥互联
在 Open vSwitch (OVS) 中，实现两个网桥（Bridge）互联最常用且标准的方法是使用 Patch Port。这种方式类似于在两个交换机之间直接插了一根“虚拟网线”，其性能比传统的 Linux VETH Pair 更好，因为它在 OVS 内核模块内部直接处理数据包，不经过 Linux 协议栈。

假设有两个网桥：br-int 和 br-ex。
```sh
# 创建一个名为 br-int 的网桥
ovs-vsctl add-br br-int


# 创建一个名为 br-ex 的网桥
ovs-vsctl add-br br-ex


# 执行 ovs-vsctl show 验证
    Bridge br-ex
        Port br-ex
            Interface br-ex
                type: internal
    Bridge br-int
        Port br-int
            Interface br-int
                type: internal


# 在 br-int 上创建端口指向 br-ex：
ovs-vsctl add-port br-int patch-to-ex -- set interface patch-to-ex type=patch options:peer=patch-to-int


# 在 br-ex 上创建端口指向 br-int：
ovs-vsctl add-port br-ex patch-to-int -- set interface patch-to-int type=patch options:peer=patch-to-ex


# 执行 ovs-vsctl show 验证
    Bridge br-ex
        Port br-ex
            Interface br-ex
                type: internal
        Port patch-to-int
            Interface patch-to-int
                type: patch
                options: {peer=patch-to-ex}
    Bridge br-int
        Port patch-to-ex
            Interface patch-to-ex
                type: patch
                options: {peer=patch-to-int}
        Port br-int
            Interface br-int
                type: internal
```
- `type=patch`：指定端口类型为补丁端口。
- `options:peer`：必须精准指向另一个网桥上对应的端口名称。

### ovs-ofctl
流表管理工具，用于查看、添加、删除 OpenFlow 流表规则。
#### 网桥端口镜像
- 将一个端口的流量复制到另一个端口，用于监控或分析。

##### 1. 前期准备
```sh
# 创建测试虚拟端口 vnet-test2，用于接收流量镜像，生产环境中有可能是物理端口
ovs-vsctl add-port br-test vnet-test2 tag=110 -- set Interface vnet-test2 type=internal
```

##### 2. 配置端口镜像
```sh
# 将 vnet-test 端口的流量复制到 vnet-test2 端口
ovs-ofctl add-flow br-test "in_port=vnet-test,actions=output:vnet-test2"
```

##### 3. 测试

```sh
# 监听 vnet-test 端口的流量
tcpdump -i vnet-test -nn -e

# 监听 vnet-test2 端口的流量
tcpdump -i vnet-test2 -nn -e

# 通过 scapy 发包到 vnet-test 端口
>>> pkt = Ether(src="00:11:22:33:44:55", dst="ff:ff:ff:ff:ff:ff") / IP(dst="192.168.99.99") / ICMP()
>>> sendp(pkt, iface="vnet-test", count=3)
...
Sent 3 packets.


# vnet-test2 能收到与 vnet-test 端口相同的流量
19:58:50.564631 00:11:22:33:44:55 > ff:ff:ff:ff:ff:ff, ethertype IPv4 (0x0800), length 42: 10.0.0.100 > 192.168.99.99: ICMP echo request, id 0, seq 0, length 8
19:58:50.564785 00:11:22:33:44:55 > ff:ff:ff:ff:ff:ff, ethertype IPv4 (0x0800), length 42: 10.0.0.100 > 192.168.99.99: ICMP echo request, id 0, seq 0, length 8
19:58:50.564932 00:11:22:33:44:55 > ff:ff:ff:ff:ff:ff, ethertype IPv4 (0x0800), length 42: 10.0.0.100 > 192.168.99.99: ICMP echo request, id 0, seq 0, length 8
```

### ovs-dpctl
内核路径调试工具，用于查看内核态的流表缓存。
