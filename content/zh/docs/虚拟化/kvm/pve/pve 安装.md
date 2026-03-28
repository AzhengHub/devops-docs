---
title: "pve"
---


## 一、前期准备
1. 下载 pve 安装镜像，下载连接：[Proxmox VE 9.1 ISO](https://enterprise.proxmox.com/iso/proxmox-ve_9.1-1.iso)
2. 将镜像写入 U 盘或 光盘中
    - 如果使用 U盘作为安装介质，可使用 [Rufus](https://rufus.ie/) 工具将镜像写入 U盘

## 二、安装 pve
- 将安装介质插入目标计算机并启动后，执行以下步骤

1. 安装方式选择 Terminal UI
![install-1](/docs/虚拟化/kvm/pve/images/install-1.png)

2. 同意安装协议
![install-2](/docs/虚拟化/kvm/pve/images/install-2.png)

3. 选择安装目标磁盘后，Next
![install-3](/docs/虚拟化/kvm/pve/images/install-3.png)

4. 选择和红框中一样的选项后，Next
![install-4](/docs/虚拟化/kvm/pve/images/install-4.png) 

5. 设置密码、邮箱后，Next
![install-5](/docs/虚拟化/kvm/pve/images/install-5.png)

6. 选择与实际网络环境匹配的IP、网关、DNS
![install-6](/docs/虚拟化/kvm/pve/images/install-6.png)

7. 确认信息无误后，install
![install-7](/docs/虚拟化/kvm/pve/images/install-7.png)


## 三、验证安装
安装完成后，浏览器访问 http://IP:8006 即可登录 pve 管理界面，账号为 root ，密码为设置的密码。

![check-install](/docs/虚拟化/kvm/pve/images/check-install.png)
