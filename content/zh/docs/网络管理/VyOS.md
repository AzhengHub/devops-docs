---
title: "VyOS"
weight: 20
---


## 安装
下载链接
- 官方：https://vyos.net/get/
- 第三方：https://cdn.as212934.net/routers/VyOS/

配置要求
- 一般 2C + 2G + 10G磁盘


你现在停留在 VyOS 的初始引导（GRUB）界面。由于 VyOS 是一个存粹的网络操作系统，它的安装过程全程在命令行下进行，没有图形化的向导。

整个安装过程非常快，跟着下面的步骤走即可：

### 第一阶段：进入 Live 系统

1. **启动：** 直接在当前高亮的 **`Live system (amd64-vyos)`** 选项上按 `Enter` 回车。
2. **等待滚动：** 屏幕会滚过大量内核加载信息，等待它最终停在一个登录提示符 `vyos login:` 处。
3. **登录：**
* 用户名输入：`vyos`
* 密码输入：`vyos`
（输入密码时屏幕不会有任何显示，盲输后回车即可）



### 第二阶段：执行安装写入

登录成功后，你会看到以 `vyos@vyos:~$` 结尾的提示符。现在我们将系统永久写入你刚才分配的 10G 虚拟磁盘中。

1. 输入安装命令并回车：
```bash
install image

```


2. **一路回车与简单确认：** 接下来系统会问你一系列问题，绝大多数直接按 `Enter` 使用默认选项即可。关键步骤如下：
* `Would you like to continue? (Yes/No)` -> 输入 `Yes` 回车。
* `Partition (Auto/Union/Parted/Skip) [Auto]:` -> 直接按 `Enter`（使用 Auto 自动分区）。
* `Install the image on? [sda]:` -> 确认是你的虚拟磁盘（通常是 `sda` 或 `vda`），直接按 `Enter`。
* `Continue? (Yes/No)` -> 输入 `Yes` 回车（确认格式化这块盘）。
* `How big of a root partition should I create? (1000MB - 10737MB) [10737MB]:` -> 直接按 `Enter`（使用全部空间）。
* `What would you like to name this image? [1.4.3]:` -> 直接按 `Enter`。
* `Which one should I copy to /boot/grub/menu.lst? [config.boot]:` -> 直接按 `Enter`。
* **`Enter password for user 'vyos':`** -> **这里非常重要！** 输入你想要设置的管理员新密码，并再次确认。作为未来的核心网关，建议设置一个强密码。
* `Which drive should GRUB modify the boot partition on? [sda]:` -> 直接按 `Enter`，将引导记录写入此盘。



当看到类似 `Setting up grub... Done!` 的提示时，就说明系统已经成功安装到你的虚拟硬盘里了。

### 第三阶段：重启并弹出 ISO

为了让虚拟机从刚安装好系统的硬盘启动，而不是再次进入光盘 Live 系统，你需要做最后一步：

1. 在 VyOS 命令行中输入命令重启并回车，然后输入 `y` 确认：
```bash
reboot

```


2. **关键动作：** 在输入重启命令后，**立刻回到 PVE 的 Web 界面**，选中这台虚拟机，进入“硬件 (Hardware)”选项卡。
3. 双击 CD/DVD 驱动器，将其修改为 **“不使用任何媒体 (Do not use any media)”**，或者直接点击“移除”。

等虚拟机再次启动完毕，你就可以用刚才设置的新密码登录一个全新、干净且持久化的 VyOS 路由器了。


### 基础配置
- 以为管理口配置静态ip为例
```sh
# 进入配置模式 （提示符会从 $ 变成 #）：
configure

# 设置静态 IP 和描述（如果配置错了，就把set改为delete，最后别忘了提交并保存）
set interfaces ethernet eth0 address '10.30.58.22/24'
set interfaces ethernet eth0 description 'Management Interface'

# 设置默认网关
set protocols static route 0.0.0.0/0 next-hop 10.30.58.254

# 开启 SSH 服务，默认监听 22 端口
set service ssh

# 提交配置，使其立刻生效
commit

# 将配置保存到硬盘的 config.boot 文件中，否则重启后配置会丢失
save

# 退出配置模式回到常规模式
exit

# 测试，查看获取到的 IP 地址
show interfaces
```


## 使用

### 纯虚拟机环境
- 下面以 pve 虚拟机环境举例，接管四个网段
#### 创建网桥
```sh
auto vmbr2
iface vmbr2 inet manual
    bridge-ports none
    bridge-stp off
    bridge-fd 0

auto vmbr3
iface vmbr3 inet manual
    bridge-ports none
    bridge-stp off
    bridge-fd 0

auto vmbr4
iface vmbr4 inet manual
    bridge-ports none
    bridge-stp off
    bridge-fd 0

auto vmbr5
iface vmbr5 inet manual
    bridge-ports none
    bridge-stp off
    bridge-fd 0
```

验证
```sh
# 加载配置
ifreload -a

# 从界面或使用下面的命令查看
# brctl show
bridge name	bridge id		STP enabled	interfaces
...
vmbr2		8000.000000000000	no		
vmbr3		8000.000000000000	no		
vmbr4		8000.000000000000	no		
vmbr5		8000.000000000000	no		



# 或者使用这个命令看
# ip -br link show type bridge
...
vmbr2            UNKNOWN        de:9e:46:f0:40:ab <BROADCAST,MULTICAST,UP,LOWER_UP> 
vmbr3            UNKNOWN        a6:31:75:79:2c:b1 <BROADCAST,MULTICAST,UP,LOWER_UP> 
vmbr4            UNKNOWN        3a:d1:a5:ab:31:6e <BROADCAST,MULTICAST,UP,LOWER_UP> 
vmbr5            UNKNOWN        ea:52:8e:3e:81:2c <BROADCAST,MULTICAST,UP,LOWER_UP> 
```

#### VyOS 配置
- 依次添加 4 块网卡，分别桥接到刚建的 vmbr2 到 vmbr5 上（模型记得选 VirtIO）。
- 可通过执行`ip link`，找到网卡的 mac 找到网卡与网桥的对应关系。
- 确认关系后，执行以下命令
```sh
configure
set interfaces ethernet eth1 address '192.168.26.1/24'
set interfaces ethernet eth2 address '192.168.21.1/24'
set interfaces ethernet eth3 address '10.10.11.1/24'
set interfaces ethernet eth4 address '192.168.50.3/24'
commit
save
exit

# 配置完后，执行 ip a 验证
```