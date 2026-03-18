
---
title: 磁盘管理
---


## RAID
在存储和服务器运维中，选择合适的 RAID（独立磁盘冗余阵列）方案通常需要在**性能、容量利用率**和**数据安全性**之间寻找平衡。

以下是几种最常见 RAID 方案的直观对比：


| RAID 级别 | 最少硬盘数 | 容错能力 | 磁盘空间利用率 | 读取性能 | 写入性能 | 典型应用场景 |
| :--- | :---: | :--- | :---: | :--- | :--- | :--- |
| **RAID 0** (条带化) | 2 | **无** (坏一块数据全丢) | 100% | 极高 | 极高 | 临时数据、视频编辑、对安全性无要求的系统 |
| **RAID 1** (镜像) | 2 | 只要有一块存活即可 | 50% | 高 | 一般 | 操作系统盘、小容量高可靠性需求 |
| **RAID 5** (奇偶校验) | 3 | **允许损坏 1 块** | (n-1)/n | 高 | 一般 (存在校验开销) | 常用的文件服务器、中小型数据库 |
| **RAID 6** (双校验) | 4 | **允许损坏 2 块** | (n-2)/n | 高 | 较低 (双重校验开销) | 大容量存储阵列、对安全性要求极高 |
| **RAID 10** (1+0) | 4 | 镜像对中各坏一块不丢 | 50% | 极高 | 高 | 高负载数据库、核心业务应用 |

---

**RAID 0（追求极致速度）**
- 将数据拆分并同时写入所有磁盘。
* **优点**：读写速度最快，没有任何空间浪费。
* **缺点**：不具备冗余。如果是 n 块硬盘组成的 RAID 0，任何一块损坏，所有数据损坏概率为 100%。

**RAID 5（性价比之选）**
- 它是目前生产环境中最平衡的方案，通过奇偶校验位来恢复数据。
* **注意**：当一块硬盘损坏时，RAID 进入“降级”模式，此时性能大幅下降。在更换新盘进行**重建**过程中，如果再坏一块，数据将彻底丢失。

**RAID 10（性能与安全的完美结合）**
- 先做镜像（RAID 1）再做条带化（RAID 0）。
* **优点**：结合了 RAID 1 的安全性和 RAID 0 的高速度。重建速度比 RAID 5 快得多，因为不需要复杂的校验计算。
* **缺点**：成本最高，磁盘利用率仅有 50%。

---

选型建议
* **追求系统稳定性**：选 **RAID 1**。
* **追求读写性能且不在乎成本**：选 **RAID 10**。
* **追求存储空间与冗余的性价比**：选 **RAID 5**（但在使用 8TB 以上的大容量硬盘时，更建议选 **RAID 6**，因为大容量硬盘重建时间极长，期间再坏一块的风险较高）。



# 磁盘管理前言

要使用一块硬盘一般要经过以下几个步骤

1. 创建分区
2. 创建文件系统
3. 挂载



# 1. 创建分区

首先，我们需要在硬盘上创建一个或多个分区。可以使用 `fdisk` 或 `parted` 等工具来创建分区。以 `fdisk` 为例：

## (1) 查看硬盘

首先使用 `lsblk` 或 `fdisk -l` 查看当前系统中的硬盘，找出新的硬盘设备（例如 `/dev/sdb`）：

```bash
sudo fdisk -l
```

## (2) 启动 `fdisk` 对硬盘进行分区

假设新的硬盘是 `/dev/sdb`，使用以下命令启动 `fdisk` 工具：

```bash
sudo fdisk /dev/sdb
```

在 `fdisk` 提示符下，你可以使用以下命令创建分区：

- 输入 `n` 创建一个新分区。
- 输入 `p` 创建主分区，或输入 `e` 创建扩展分区（一般情况下使用主分区）。
- 输入分区号（例如 `1`）。
- 输入起始和结束的扇区，按回车键接受默认值。
- 输入 `w` 保存并退出。

## (3) 查看分区

完成分区后，再次使用 `lsblk` 或 `fdisk -l` 查看分区情况。你应该会看到像 `/dev/sdb1` 这样的分区。



## 分区管理

### MBR和GPT分区概述

**MBR分区：**

- 0磁道的0扇区为MBR的分区表
- 前446个字节为boot loader
- 中间64个字节为分区(每16个字节标识一个分区，开头80表示活动分区，00为非活动分区，系统启动时首先会寻找活动分区)
- 后2个字节为55AA标记位
- **超过2T的磁盘不支持**
- **MBR分区最多支持4个主分区，但通常都是使用3个主分区以及1个扩展分区(N个逻辑分区)**
  - 1-3 主机区
  - 4 扩展分区
  - 5+ 逻辑分区

**GPT分区：**

- 最多支持128个分区，且所有分区都为主分区



### 分区管理常用命令

- 列出块设备

```bash
lsblk
```

- 创建分区相关命令

```bash
fdisk  #管理MBR分区（也可以管理GPT分区，但通常只用来管理MBR分区）
gdisk  #管理GPT分区
parted #高级分区操作（立即生效，没有交互过程，所以不建议使用）
```

- 查看分区类型

```bash
fdisk -l
dos #表示MBR
```

- 查看分区表

```bash
hexdump -C -n 512 /dev/vda
```



### MBR分区管理

- 注意：创建MBR分区的时候，可以先创建扩展分区(前提是此块硬盘非系统启动盘)





### GPT分区管理



### 解决创建分区后不同步

```bash
partprobe #在centos5，7，8执行（重新设置内核中的内核分区表版本）

partx -a /dev/sda #centos6执行,只适合增加分区
partx -d --nr 6-8 /dev/sda #centos6执行,只适合减少分区
```



### MBR备份和还原分区表

**如果有多台设备的分区策略一样，也可以使用其他机器的分区表来进行还原**

```bash
#备份分区表，skip表示跳过源(if)的446字节
dd if=/dev/vda of=/data/dpt.img bs=1 count=64 skip=446

#将分区表拷贝到远程主机
scp /data/dpt.img 10.0.0.8:/data/

#破坏分区表，seek表示跳过目标(of)的446字节
dd if=/dev/zero of=/dev/vda bs=1 count=64 seek=446

#还原分区表：进入救援模式后
ip addr add 10.0.0.8/24 dev ens33 #临时添加网卡，或者使用ifconfig ens33 10.0.0.8/24
ip #查看是否出现ip地址
ping 10.0.0.7 #尝试是否能ping同存备份的主机
scp 10.0.0.7:/data/dpt.img . #将远程的备份文件拷贝到本机
dd if=dpt.img of=/dev/vda bs=1 seek=446 #还原
#重启
```





# 2. 创建文件系统

在分区后，我们需要在新创建的分区上创建一个文件系统（如 `ext4`、`xfs` 等）。例如，在 `/dev/sdb1` 上创建 `ext4` 文件系统，可以使用以下命令：

```bash
sudo mkfs.ext4 /dev/sdb1
```

如果你选择了其他文件系统类型，可以根据实际需要使用不同的命令，例如：

- `mkfs.xfs /dev/sdb1`（创建 `XFS` 文件系统）
- `mkfs.btrfs /dev/sdb1`（创建 `Btrfs` 文件系统）



## 文件系统管理

### 文件系统管理相关命令

- 查看文件系统类型

```bash
lsblk -f

blkid

df -T
```

- 查看文件系统详细信息

```bash
xfs_info /dev/vda1 #xfs系列文件系统查看方法

tune2fs -l /dev/vda1 #ext4系列文件系统查看方法
```



### 创建文件系统

```bash
mkfs.<ext4|xfs|...> <dev_name>
```



### 删除文件系统

- 因为删除文件系统等同于删除所有数据了，所以直接fdis删除分区即可




### 文件系统错误

**注意：修复前要取消挂载 unmount**

- 修复前：

```bash
# mount /dev/sda4 /opt/
mount: /opt: wrong fs type, bad option, bad superblock on /dev/sda4, missing codepage or helper program, or other error.
```

- 修复：

```bash
#
```

- 修复后：

```bash
#
```



# 3. 挂载

## (1) 获取磁盘的UUID

```bash
$ ls -l /dev/disk/by-uuid/
total 0
lrwxrwxrwx 1 root root  9 Nov 27 21:12 2024-11-27-21-12-45-00 -> ../../sr0
lrwxrwxrwx 1 root root 10 Nov 27 21:13 2415f79c-d00c-4572-825b-803a6471aca8 -> ../../vda4
lrwxrwxrwx 1 root root 10 Nov 27 21:12 6c611d9c-a1cd-452f-a4dc-187783dadf72 -> ../../vda2
lrwxrwxrwx 1 root root 10 Nov 27 21:12 72415ef9-41fa-44b7-b712-62fd289049a1 -> ../../vda3
lrwxrwxrwx 1 root root  9 Dec  3 11:43 de37eb92-dda0-49ba-9038-97d615de191b -> ../../vdb
```

## (2) 配置开机自动挂载

```bash
# cat /etc/fstab 
# /etc/fstab: static file system information.
#
# Use 'blkid' to print the universally unique identifier for a
# device; this may be used with UUID= as a more robust way to name devices
# that works even if disks are added and removed. See fstab(5).
#
# <file system> <mount point>   <type>  <options>       <dump>  <pass>
/dev/disk/by-uuid/72415ef9-41fa-44b7-b712-62fd289049a1 none swap sw 0 0
# / was on /dev/vda4 during curtin installation
/dev/disk/by-uuid/2415f79c-d00c-4572-825b-803a6471aca8 / ext4 defaults 0 1
# /boot was on /dev/vda2 during curtin installation
/dev/disk/by-uuid/6c611d9c-a1cd-452f-a4dc-187783dadf72 /boot ext4 defaults 0 1

###
/dev/disk/by-uuid/de37eb92-dda0-49ba-9038-97d615de191b /data ext4 defaults 0 2
```

- **`<dump>` 字段：**

  - **含义**：`<dump>` 字段用于指定 `dump` 工具是否需要备份该文件系统。`dump` 是一个用于备份文件系统的工具。这个字段一般情况下不常用，很多系统管理员不会在 `fstab` 文件中设置这个值。

  - 可选值：
    - **`0`**：表示不使用 `dump` 进行备份。大多数文件系统都设置为 `0`，因为现代 Linux 系统一般使用其他备份方法。
    - **`1`**：表示使用 `dump` 工具进行备份。通常，根文件系统（`/`）会设置为 `1`，以便备份。

-  **`<pass>` 字段:**

  - **含义**：`<pass>` 字段决定了 `fsck` 工具对文件系统进行检查的顺序。`fsck` 是一个用来检查文件系统的一致性和完整性的工具。该字段决定了启动时各个文件系统检查的优先级。

  - 可选值：
    - **`0`**：表示该文件系统在启动时 **不进行文件系统检查**。通常，交换分区（`swap`）和某些其他特殊分区会设置为 `0`，因为它们不需要文件系统检查。
    - **`1`**：表示该文件系统会在启动时 **最先进行文件系统检查**。通常，根文件系统（`/`）设置为 `1`，因为它是系统最重要的部分，必须首先进行检查。
    - **`2`**：表示该文件系统会在根文件系统检查完后进行检查。非根文件系统（如 `/home` 或 `/data`）通常设置为 `2`，检查顺序在根文件系统之后。

## (3) 挂载并验证

```bash
# 挂载
mount -a

# 验证
df -h
```



## 挂载管理

### 临时挂载

```bash
mount 设备名 挂载点 #挂载点必须存在

#取消挂载
umount 挂载点 #写设备名也可以

#查看设备的挂载关系
mount
```



### 其他临时挂载方式

只读方式挂载

```bash
umount devname #如果有挂载，需先取消挂载
mount -r devname #只读方式挂载
```

不取消挂载实现重新挂载

```bash
mount -o remount,rw devname #ro表示只读，rw表示读写，重新挂载并以读写方式挂载
```



### 永久挂载

- 第一列：设备名（通常是UUID，这样能确保设备的唯一性）
- 第二列：挂载点
- 第三列：文件系统
- 第四列：挂载选项（属性，通常写defaults就可以）
- 第五列：备份时间间隔（0表示永不备份，通常写0就可以）
- 第六列：开机时是否自检（1,2,3..表示检测顺序，0表示永不检查，通常写0就可以）

```bash
[root@aliyun ~]# vim /etc/fstab
UUID=c077882c-9433-4d90-ba75-79c137a956b7 /                       xfs     defaults        0 0
```

**修改完配置文件后执行**

```bash
#同步配置文件内容，但只能同步第一次的更改
[root@aliyun ~]# mount -a

#再次修改需同步需执行：
[root@aliyun ~]# fuser -km /mnt/sdb2 #杀掉正在使用挂载点的进程(在取消挂载显示正忙时执行)
[root@aliyun ~]# umount /mnt/sdb2 #取消挂载
[root@aliyun ~]# mount -a #重新挂载

#不能取消挂载的情况：使用remount重新挂载，然后再修改配置文件
```



### 永久挂载后故障排错







### 挂载规则

- 一个挂载点同一时间只能挂载一个设备
- 一个挂载点同一时间挂载了多个设备，只能看到最后一个设备的数据，其它设备上的数据将被隐藏
- 一个设备可以同时挂载到多个挂载点
- 挂载点通常是已存在的空目录



### 查看其他人是否在使用挂载点

```bash
[root@aliyun ~]# lsof /mnt/sdb2

#或者

[root@aliyun ~]# fuser -v /mnt/sdb2

#杀掉正在使用挂载点的进程
[root@aliyun ~]# fuser -km /mnt/sdb2
```



### 挂载相关优化

禁止挂载点中的数据刷新读时间（这样对网页中的读数据刷新有遏制效果，从而提升效率）

```bash
[root@aliyun ~]# mount -o remount,noatime /point

#恢复
[root@aliyun ~]# mount -o remount,relatime /point
```



### 查看是否为挂载点

可以在脚本中使用

```bash
[root@aliyun ~]# findmnt /dev/vda1 
TARGET SOURCE    FSTYPE OPTIONS
/      /dev/vda1 xfs    rw,noatime,attr2,inode64,logbufs=8,logbsize=32k,noquota
[root@aliyun ~]# echo $?
0
[root@aliyun ~]# findmnt /etc/
[root@aliyun ~]# echo $?
1
```



### 随机生成UUID

```bash
[root@aliyun ~]# uuidgen 
4c6b441b-85bb-4107-9181-ccfc2db8626b
```





# 其他



## 移动介质

### 使用光盘



### USB介质

查看usb设备是否被识别

```bash
[root@aliyun ~]# yum -y install usbutils

lsusb
```



### 查看硬件信息

```bash
[root@aliyun ~]# dmesg
```









## 扫描增加的磁盘

- 只能扫描同步增加的磁盘，移除的硬盘无法同步

```sh
echo '- - -' > /sys/class/scsi_host/host0/scan
echo '- - -' > /sys/class/scsi_host/host1/scan
echo '- - -' > /sys/class/scsi_host/host2/scan
echo '- - -' > /sys/class/scsi_host/host3/scan


# 也可以设置成别名：
alias scandisk="echo '- - -' > /sys/class/scsi_host/host0/scan;echo '- - -' > /sys/class/scsi_host/host1/scan;echo '- - -' > /sys/class/scsi_host/host2/scan;echo '- - -' > /sys/class/scsi_host/host3/scan"
```





## RAID

RAID（冗余磁盘阵列）是一种将多个物理磁盘组合成一个逻辑单元的技术，目的是提供数据冗余性、提升性能或两者兼而有之。通过将数据分布在多个磁盘上，RAID技术可以提供更高的数据可靠性和/或更高的性能。

下面是一些常见的RAID级别和它们的特点：

1. RAID 0：条带化（Striping）
   - 特点：将数据块分割成条带并同时写入多个磁盘。提供了卓越的读写性能，但没有冗余功能。
   - 优点：高性能，适用于需要快速数据传输的应用。
   - 缺点：没有冗余性，如果其中一个磁盘损坏，所有数据都会丢失。
2. RAID 1：镜像化（Mirroring）
   - 特点：将数据同时写入两个磁盘，创建镜像副本。提供了数据冗余，即使一个磁盘出现故障，数据仍然可用。
   - 优点：良好的数据冗余性，读取性能较好。
   - 缺点：磁盘利用率较低，写入性能相对较低。
3. RAID 5：条带化加奇偶校验（Striping with Parity）
   - 特点：将数据和奇偶校验位分布在多个磁盘上。奇偶校验位用于恢复数据，提供了数据冗余性。
   - 优点：相对较高的读取性能和良好的数据冗余性。
   - 缺点：写入性能相对较低，重建阵列时可能会有性能下降。
4. RAID 6：双奇偶校验的条带化（Striping with Double Parity）
   - 特点：类似于RAID 5，但使用两个奇偶校验位。提供更高的数据冗余性，即使同时有两个磁盘故障，数据仍然可用。
   - 优点：较高的数据冗余性，适用于大容量存储系统。
   - 缺点：相对较低的写入性能和较高的写入延迟。

此外，还有其他RAID级别，如RAID 10（RAID 1+0）和RAID 50（RAID 5+0），它们是对多个RAID级别的组合使用。

选择适合您需求的RAID级别时，需要权衡性能要求、数据冗余性和成本。不同的RAID级别适用于不同的应用场景，因此建议在选择



RAID（冗余磁盘阵列）是一种将多个物理磁盘组合成一个逻辑单元的技术，目的是提供数据冗余性、提升性能或两者兼而有之。通过将数据分布在多个磁盘上，RAID技术可以提供更高的数据可靠性和/或更高的性能。

下面是一些常见的RAID级别和它们的特点：

1. RAID 0：条带化（Striping）
   - 特点：将数据块分割成条带并同时写入多个磁盘。提供了卓越的读写性能，但没有冗余功能。
   - 优点：高性能，适用于需要快速数据传输的应用。
   - 缺点：没有冗余性，如果其中一个磁盘损坏，所有数据都会丢失。
2. RAID 1：镜像化（Mirroring）
   - 特点：将数据同时写入两个磁盘，创建镜像副本。提供了数据冗余，即使一个磁盘出现故障，数据仍然可用。
   - 优点：良好的数据冗余性，读取性能较好。
   - 缺点：磁盘利用率较低，写入性能相对较低。
3. RAID 5：条带化加奇偶校验（Striping with Parity）
   - 特点：将数据和奇偶校验位分布在多个磁盘上。奇偶校验位用于恢复数据，提供了数据冗余性。
   - 优点：相对较高的读取性能和良好的数据冗余性。
   - 缺点：写入性能相对较低，重建阵列时可能会有性能下降。
4. RAID 6：双奇偶校验的条带化（Striping with Double Parity）
   - 特点：类似于RAID 5，但使用两个奇偶校验位。提供更高的数据冗余性，即使同时有两个磁盘故障，数据仍然可用。
   - 优点：较高的数据冗余性，适用于大容量存储系统。
   - 缺点：相对较低的写入性能和较高的写入延迟。
