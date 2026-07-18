---
title: "home分区空间合并到根"
weight: 20
---

```sh
# lsblk 
NAME            MAJ:MIN RM  SIZE RO TYPE MOUNTPOINT
sda               8:0    0  150G  0 disk 
├─sda1            8:1    0    1G  0 part /boot
└─sda2            8:2    0  149G  0 part 
  ├─centos-root 253:0    0   50G  0 lvm  /
  ├─centos-swap 253:1    0  3.9G  0 lvm  [SWAP]
  └─centos-home 253:2    0 95.1G  0 lvm  /home
```



将 `/home` 目录的空间全部转移到根目录 `/` 下，本质上需要**备份 `/home` 数据、删除 `/home` 的逻辑卷（LV）、将空闲出来的空间分配给根目录的逻辑卷，并最后修改开机挂载文件**。

由于这是 CentOS 系统（默认使用 XFS 文件系统，XFS 只能扩容不能缩容），必须先完整删除 `/home` 分区。虽然您的 `/home` 目前只用了 33M，但仍建议先备份。

> **警告：** 涉及磁盘分区的操作具有一定风险，请务必严格按照顺序执行。如果 `/home` 下有重要业务数据，请先将其备份到其他服务器。

以下是完整的操作流程：

1. **备份 /home 目录数据:** 保留当前的用户配置和数据.
将 `/home` 目录下的所有内容打包备份到 `/tmp` 目录下（`/tmp` 属于根分区，当前空间充足）。

```bash
tar -czvf /tmp/home_backup.tar.gz /home/

```


2. **卸载 /home 分区:** 确保没有进程占用.
终止所有正在使用 `/home` 的进程并卸载该分区：

```bash
umount /home

```

*(如果提示 `target is busy`，可以使用 `fuser -k /home` 杀掉占用进程后再试)*


3. **删除 /home 逻辑卷:** 释放 LVM 空间.
删除对应的 Logical Volume。系统会要求您输入 `y` 进行确认。

```bash
lvremove /dev/mapper/centos-home

```


4. **扩容根目录逻辑卷:** 将所有释放的空闲空间给 /.
把刚刚释放出的所有空间全部分配给 `centos-root`：

```bash
lvextend -l +100%FREE /dev/mapper/centos-root

```


5. **扩展文件系统容量:** 使系统识别新空间.
LVM 扩容后，还需要让文件系统同步扩容。CentOS 默认使用 XFS 文件系统，使用以下命令：

```bash
xfs_growfs /dev/mapper/centos-root

```

*(注：如果您用的是 ext4 文件系统，请使用 `resize2fs /dev/mapper/centos-root`)*

执行完毕后，可通过 `df -h /` 检查，此时 `/` 的容量应该已经变成了 140G 左右。


6. **恢复 /home 目录数据:** 将数据恢复到根分区下的 /home.
重新创建 `/home` 文件夹（此时它直接挂靠在根目录下），并将数据解压回去：

```bash
mkdir -p /home
tar -xzvf /tmp/home_backup.tar.gz -C /

```


7. **修改开机挂载配置 (关键步骤):** 防止重启后无法进入系统.
因为我们已经删除了 `/home` 的逻辑卷，必须在 `/etc/fstab` 中去掉对应的自动挂载记录，否则**系统下次重启时会因为找不到磁盘而进入紧急救援模式**。

打开文件：

```bash
vi /etc/fstab

```

找到包含 `/dev/mapper/centos-home` 或 `/home` 的那一行，在行首添加 `#` 将其注释掉，或者直接删除该行。保存并退出。

---

完成后，您可以通过运行 `lsblk` 和 `df -h` 再次确认状态，此时所有的空间都会集中在 `/` 分区下。



```sh
# lsblk 
NAME            MAJ:MIN RM   SIZE RO TYPE MOUNTPOINT
sda               8:0    0   150G  0 disk 
├─sda1            8:1    0     1G  0 part /boot
└─sda2            8:2    0   149G  0 part 
  ├─centos-root 253:0    0 145.1G  0 lvm  /
  └─centos-swap 253:1    0   3.9G  0 lvm  [SWAP]
```

