
---
title: Linux
weight: 2
---


# Linux 中从根开始每个目录的含义

在Linux系统中，根目录是整个文件系统的最顶层目录，所有的其他目录和文件都位于其下。以下是从根目录开始的一些常见目录的含义：

- `/bin`: 存放系统命令和二进制可执行文件，如ls、cp等。
- `/boot`: 存放Linux内核和启动加载程序的文件。
- `/dev`: 存放设备文件，如硬盘、键盘、鼠标等设备。
- `/etc`: 存放系统配置文件，如网络配置、用户配置等。
- `/home`: 存放用户主目录的根目录。
- `/lib`: 存放系统共享库文件。
- `/media`: 存放可移动设备的挂载点，如U盘、CD-ROM等。
- `/mnt`: 临时挂载目录，可用于挂载其他文件系统。
- `/opt`: 存放可选应用程序的目录，如第三方软件。
- `/proc`: 存放系统内核及进程信息。
- `/root`: 超级用户（root）的主目录。
- `/run`: 存放系统运行时的文件，如进程号（PID）文件、锁文件等。
- `/sbin`: 存放系统管理员使用的系统命令和二进制可执行文件，如ifconfig、fdisk等。
- `/srv`: 存放服务数据目录，如Web服务器的文件。
- `/sys`: 存放系统设备文件和驱动程序的文件。
- `/tmp`: 存放临时文件。
- `/usr`: 存放系统资源和应用程序文件，包括用户手册、库文件、头文件等。
- `/var`: 存放系统和应用程序的变化数据，如日志文件、缓存文件等。

需要注意的是，这里列出的目录不是完整的，还有其他目录也可能出现在Linux系统中。此外，目录的具体用途可能因Linux系统的发行版本和安装配置而有所不同。



## /usr

在Linux系统中，`/usr` 目录是一个重要的系统目录，它通常包含用户可共享的只读数据和程序。这个目录的名称代表 "Unix System Resources"（Unix系统资源）。以下是一些 `/usr` 目录的主要子目录及其用途：

1. `/usr/bin`: 存放系统用户使用的可执行文件（binary files）。
2. `/usr/sbin`: 存放系统管理员使用的系统管理命令和系统守护程序（daemons）。
3. `/usr/lib` 和 `/usr/lib64`: 存放程序运行时需要的库文件。
4. `/usr/include`: 存放用于C和C++编程的头文件。
5. `/usr/share`: 存放共享数据，例如程序所使用的共享资源、文档等。
6. `/usr/local`: 通常用于存放本地安装的软件，而非系统默认提供的软件包。
7. `/usr/games`: 存放一些游戏程序。
8. `/usr/src`: 存放系统源代码。

总体而言，`/usr` 目录包含系统管理员和普通用户可以共享使用的文件和程序，而不是系统启动和运行过程中必须的文件。这样的设计使得系统的根目录 `/`（root directory）可以较小且包含系统启动和运行所需的最小文件集。

# Linux 相关配置文件说明

- ssh 终端登录提示信息

```bash
[root@openvpn-server ~]# cat /etc/motd

Welcome to Alibaba Cloud Elastic Compute Service !
```



以下是常见的Linux配置文件及其用途的简要说明：

1. /etc/fstab: 文件系统表配置文件，指定系统启动时要挂载的文件系统。
2. /etc/passwd: 存储系统用户的基本信息，如用户名、UID、GID、默认shell等。
3. /etc/group: 存储用户组的基本信息，如组名、GID、组内用户等。
4. /etc/hosts: 存储主机名与IP地址的对应关系，可用于本地DNS解析。
5. /etc/hostname: 存储主机名。
6. /etc/resolv.conf: 存储DNS服务器的地址，用于系统解析域名。
7. /etc/network/interfaces: 网络接口配置文件，包括IP地址、子网掩码、网关等。
8. /etc/sysctl.conf: 内核参数配置文件，可用于调整系统性能、网络参数等。
9. /etc/motd: ssh登录提示信息的配置文件。
10. /etc/ssh/sshd_config: ssh服务器的配置文件，可用于配置ssh服务。
11. /etc/sudoers: sudo权限管理文件，指定哪些用户可以使用sudo执行特权命令。
12. /etc/logrotate.conf: 日志轮换工具的配置文件，可用于管理系统日志。
13. /etc/crontab: 系统定时任务配置文件，用于定时执行指定的命令。
14. /etc/inittab: 系统启动配置文件，指定系统启动时要执行的命令。
15. /etc/profile: 系统全局shell环境变量配置文件，可用于设置全局的环境变量。

注意：以上列举的文件不一定在所有Linux发行版中都存在或有相同的位置和用途，一些特定的发行版可能会有自己的特殊配置文件。



# 一切皆文件

## 判断端口号是否存活

```bash
#语法
< /dev/tcp/127.0.0.1/端口号 &> /dev/null

#范例
# < /dev/tcp/127.0.0.1/22
# echo $?
0
# < /dev/tcp/127.0.0.1/21
-bash: connect: Connection refused
-bash: /dev/tcp/127.0.0.1/21: Connection refused
# echo $?
1
```



## 查看网卡的mac地址

```sh
#方法一
[root@docker ~]# cat /sys/class/net/eth0/address 
00:0c:29:0b:14:8b

#方法二
[root@docker ~]# dmesg |grep eth0
[    8.473279] e1000 0000:02:01.0 eth0: (PCI:66MHz:32-bit) 00:0c:29:0b:14:8b

#方法三
[root@docker ~]# ip address show eth0 
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP group default qlen 1000
    link/ether 00:0c:29:0b:14:8b brd ff:ff:ff:ff:ff:ff
    inet 10.0.0.8/16 brd 10.0.255.255 scope global noprefixroute eth0
       valid_lft forever preferred_lft forever
```

















# Linux 终端常用快捷键

以下是一些常用的 Linux 终端快捷键：

## 光标移动

- Ctrl + a：将光标移动到行首（Home 键的效果）。
- Ctrl + e：将光标移动到行尾（End 键的效果）。
- Ctrl + b：向后移动一个字符（相当于按下左箭头键）。
- Ctrl + f：向前移动一个字符（相当于按下右箭头键）。
- Alt + b：向后按单词边界移动。
- Alt + f：向前按单词边界移动。
- Ctrl + xx：在命令行首尾之间切换。



## 编辑命令行

- Ctrl + u：从光标位置删除到行首。
- Ctrl + k：从光标位置删除到行尾。
- Ctrl + w：从光标位置删除到前一个空格。
- Ctrl + y：粘贴之前使用 Ctrl + u、Ctrl + k 或 Ctrl + w 删除的文本。
- Ctrl + h：删除前一个字符（相当于按下退格键）。
- Ctrl + d：删除当前字符（相当于按下删除键）。
- Ctrl + t：交换光标处的字符和前一个字符。
- Alt + t：交换光标处的单词和前一个单词。
- Alt + u：将光标处的单词转换为大写。
- Alt + l：将光标处的单词转换为小写。
- Alt + c：将光标处的单词的首字母转换为大写。



## 控制命令行

- Ctrl + c：终止当前正在运行的命令。
- Ctrl + z：将当前正在运行的命令放入后台。
- Ctrl + s：暂停屏幕输出（锁定屏幕）。
- Ctrl + q：恢复屏幕输出（解锁屏幕）。
- Ctrl + l：清除屏幕并重新显示当前行。



## 历史命令

- Ctrl + r：在历史命令中搜索。
- Ctrl + p：显示上一个历史命令。
- Ctrl + n：显示下一个历史命令。
- Alt + .：插入上一个命令的最后一个参数。



## 历史命令替换

通过利用历史命令替换，可以更加高效地操作和管理历史命令，并轻松地重复执行它们，而无需手动重新输入。

- `!!`：执行上一个命令。
- `!string`：执行最近以"string"开头的命令。
- `!n`：执行历史记录中的第n个命令。
- `!-n`：执行倒数第n个命令。

- `!$`：引用上一个命令的最后一个参数。

  - ```sh
    # !$将被替换为"world"，最后执行的命令是"ls world"。
    
    $ echo hello world
    
    $ ls !$
    ```

- `!^`：引用上一个命令的第一个参数。

  - ```sh
    # !^将被替换为"hello"，最后执行的命令是"ls hello"。
    
    $ echo hello world
    
    $ ls !^
    ```

- `!:n`：引用上一个命令的第n个参数。

  - ```sh
    # 上述示例中，"!:2"将被替换为"world"，最后执行的命令是"ls world"。
    
    shellCopy code$ echo hello world
    
    $ ls !:2
    ```

- `!$`：引用上一个命令的最后一个参数。

  - ```sh
    # !$将被替换为"world"，最后执行的命令是"ls world"。
    
    $ echo hello world
    
    $ ls !$
    ```











# shell

**什么是shell**

Shell是一种命令行解释器，它为用户提供了一种与操作系统内核进行交互的方式。它是操作系统和用户之间的接口，使用户能够执行命令、运行程序、管理文件和目录等操作。

Shell通常是用户与Linux、Unix或macOS操作系统进行交互的主要方式，它允许用户使用命令行界面（CLI）来操作系统。当用户输入一个命令或脚本时，shell会解释这个命令或脚本，并向操作系统内核发送相应的指令，然后将执行结果返回给用户。

Shell还允许用户编写脚本来自动化和批处理任务。这些脚本可以包含多个命令和条件语句，可以在系统启动时自动运行，也可以根据特定的事件或时间表运行。通过使用shell脚本，用户可以轻松地自动化许多常见的任务，提高工作效率。



**常见的shell类型有以下几种：**

1. Bash shell（Bourne-Again Shell）：Bash是一个Linux和macOS上默认的shell，也是最常用的shell之一。它是从Bourne shell（sh）演变而来的。
2. C shell（csh）：C shell具有类似于C语言的语法，它是BSD Unix的默认shell。csh与bash有很多相似之处，但也有一些重要的区别。
3. Korn shell（ksh）：ksh是UNIX系统上最早的shell之一，由David Korn开发。它在Bourne shell的基础上增加了许多功能，同时保留了其简洁性和可移植性。
4. Z shell（zsh）：zsh是一种功能强大的shell，与bash和ksh类似。它具有高级自动补全功能和强大的别名扩展功能等特性。

除了上述常见的shell类型之外，还有一些其他类型的shell，如fish（friendly interactive shell）等，但这些相对较少见。



## bash 的配置文件

按生效范围划分两类

- 全局配置：

```bash
/etc/profile
/etc/profile.d/*.sh
/etc/bashrc
```

- 个人配置：

```
~/.bash_profile
~/.bashrc
```

- 登录后配置文件执行顺序

（同名的情况下，后执行的会把前面的配置覆盖掉）

```bash
1./etc/profile.d/*.sh
2./etc/bashrc
3./etc/profile
4./etc/bashrc    #此文件执行两次
5.~/.bashrc
6.~/.bash_profile
#注意！每个版本的配置文件生效顺序不统一，仅做参考。 通常每个文件都有各自的分工
```

























# 与或非

逻辑运算：与&、或|、非！、异或

   与：只要有一个为假，结果一定为假

   或：只要有一个为真，结果一定为真



1：真     0：假

?     

   1、与&

     1 & 0 = 0    0 & 0 = 0   
    
      1 & 1 = 1    0 & 1 = 0

   2、或

     0|1 = 1    0|0 = 0
    
      1|1 = 1    1|0 = 1

   3、非！

     !真 = 假    !假 = 真

   4、异或

     操作数相同则为假，操作数不同则为真
    
       0异或1 = 真     1异或0 = 真
    
        0异或0 = 假     1异或1 = 假




与=取交集（1,2,3与2,4,5=只有2）

或=都有（1或者2=1和2都有）

#和生活逻辑正好相反



































# 运行级别

```bash
0  # shutdown.target（关机）
1  # emergency.target （紧急救援模式）
2  # rescue.target （救援模式）
3  # multi-user.target（多用户模式|字符系统模式）
4  # 无
5  # graphical.target （桌面系统）
6  # 无（重启）

# 查看默认级别
systemctl get-default

# 查看当前运行级别
runlevel

# 设置默认级别
systemctl set-default multi-user.target

# 切换运行级别
init 0|1|3|5|6
```





# 生成随机数

随机数生成器：伪随机数字，利用键盘和鼠标，块设备中断生成随机数

/dev/random：仅从熵池返回随机数；随机数用尽，阻塞

/dev/urandom：从熵池返回随机数；随机数用尽，会利用软件生成伪随机数，非阻塞

## 取随机数

```bash
# 方法一
echo $RANDOM | md5sum | cut -c 1-8
echo $RANDOM | sha256sum | cut -c 1-8
echo $RANDOM | sha256sum | cut -c 1-8

# 方法二
echo $RANDOM | sha256sum | base64 | head -1 | cut -c 1-8


# 方法三
openssl rand -base64 999| head -1 | cut -c 1-8


# 方法四
cat /dev/urandom | tr -dc '[:alnum:]' | head -c 8 ; echo
```

## 随机颜色

```bash
# \E可以用\033或\e代替，%7表示对7取模，因为是随机数，所以是0-6之间
echo -e "\E[1;$[RANDOM%7+31]mhello\E[0m"
```













# 虚拟机

vmnet1是host-only，也就是说，选择用vmnet1的话就相当于VMware给你提供了一个虚拟交换机，仅将虚拟机和真实系统连上了，虚拟机可以与真实系统相互共享文件，但是虚拟机无法访问外部互联网，而vmnet8是NAT，就是网络地址转换，相当于给你一个虚拟交换机，将虚拟机和真实系统连上去了，同时这台虚拟交换机又和外部互联网相连，这样虚拟机和真是系统可以相互共享，同时又都能访问外部互联网，而且虚拟机是借用真实系统的IP上网的，不会受到IP-MAC绑定的限制。











# 让CTRL+c无法停止脚本

默认情况下，Linux中的CTRL+C键组合被分配为中断信号（SIGINT），可以用来停止正在运行的进程或脚本。如果您想要防止CTRL+C停止正在运行的脚本，可以使用以下两种方法之一：

1. 使用trap命令忽略CTRL+C信号

使用“trap”命令可以在脚本中捕获信号，并执行一些操作。要忽略CTRL+C信号，您可以在脚本的开头添加以下行：

```
trap '' INT
```

这将将CTRL+C信号的操作设置为空操作，从而忽略该信号。这意味着如果用户按下CTRL+C键，脚本将继续运行而不会被中断。

1. 使用stty命令禁用CTRL+C键

使用“stty”命令可以设置终端的属性，包括终端驱动程序中的特殊字符和控制代码。要禁用CTRL+C键，请使用以下命令：

```
stty -echoctl
```

这将禁用CTRL+C键，并将其发送到终端驱动程序中的特殊字符队列中，从而防止中断正在运行的脚本。请注意，使用此方法可能会影响您对终端的其他操作，因为CTRL+C键已被禁用。要重新启用CTRL+C键，请使用以下命令：

```
stty echoctl
```

这将重新启用CTRL+C键，并将其发送到终端驱动程序中的特殊字符队列中，以便可以使用CTRL+C键来中断正在运行的进程或脚本。



## 111

```bash
# 方法一
#/bin/bash
while true ;do
  trap "" 2  #在脚本中要循环执行的内容前面加入此行
  echo 1
  sleep 0.5
done

# 方法二
#/bin/bash
while true ;do
  trap "" SIGINT  #在脚本中要循环执行的内容前面加入此行
  echo 1
  sleep 0.5
done
```

您提供的代码展示了两种不同的方法来防止CTRL+C停止正在运行的脚本。这些方法可以很好地解决您的问题，可以根据您的具体情况选择其中一种方法。

第一种方法是使用“trap”命令忽略CTRL+C信号。在脚本中使用“trap '' 2”将CTRL+C信号的操作设置为空操作，从而忽略该信号。这将使脚本在循环执行期间无法被CTRL+C中断。但是请注意，这种方法也可能导致脚本无法响应其他信号，例如TERM信号。

第二种方法是使用“trap”命令将SIGINT信号的操作设置为空操作，以忽略CTRL+C信号。这将使脚本在循环执行期间无法被CTRL+C中断。与第一种方法不同，这种方法只会影响SIGINT信号，不会影响其他信号。

无论您选择哪种方法，请确保在脚本的结束部分重新启用信号处理程序，以便可以恢复CTRL+C键的默认行为。例如，您可以在脚本的结尾添加以下行来恢复CTRL+C键：

```
trap - SIGINT
```

这将将SIGINT信号的操作设置为默认操作，从而恢复CTRL+C键的默认行为。















# X11 DISPLAY

**什么是 X11 DISPLAY**

X11 DISPLAY（也称为X Display）是一种用于在Linux和其他类Unix操作系统中运行图形用户界面（GUI）应用程序的协议。它允许应用程序在远程服务器上运行，并将图形显示在本地计算机的屏幕上。在这种情况下，远程服务器上运行的应用程序称为“客户端”，而本地计算机上运行的应用程序称为“服务器”。

X11 DISPLAY使用客户端/服务器模型。X11客户端应用程序使用一个称为“X Server”的后台进程来渲染图形，而X Server将其渲染的内容发送到本地计算机上运行的显示设备上。X Server还负责处理输入设备，例如鼠标和键盘，以便将其传递给客户端应用程序。

X11 DISPLAY的标识符是一个字符串，它由两部分组成：主机名和显示号。例如，如果您在名为“example.com”的远程服务器上启动了一个X11客户端应用程序，并将其显示在本地计算机上，则X11 DISPLAY标识符可能类似于“example.com:0”。在这里，“0”是显示号，它表示要在本地计算机上显示的应用程序的第一个显示。如果您在同一台远程服务器上启动了另一个X11客户端应用程序，则显示号将增加，并且显示标识符将变为“example.com:1”。



**Linux 中的 DISPLAY 变量是干什么的，应该如何定义**

Linux中的DISPLAY环境变量指定了一个X11 Display服务器的地址，X11客户端应用程序使用该地址连接到X11服务器。如果没有设置DISPLAY环境变量，那么X11客户端应用程序将无法连接到X11服务器，并且无法显示GUI界面。

要定义DISPLAY环境变量，您需要指定一个X11服务器的地址。该地址由两部分组成：主机名和显示号。例如，如果您想将X11客户端应用程序的GUI显示在本地计算机上，那么您可以使用以下命令来设置DISPLAY环境变量：

```
export DISPLAY=:0
```

其中“:0”表示本地计算机上的X11服务器的显示号为0。

如果您要将GUI显示在远程计算机上，则需要将DISPLAY设置为远程计算机的IP地址或主机名，以及X11服务器的显示号。例如，如果远程计算机的IP地址为192.168.0.100，并且X11服务器的显示号为0，则可以使用以下命令来设置DISPLAY环境变量：

```
export DISPLAY=192.168.0.100:0
```

请注意，为了能够在远程计算机上显示GUI，您需要在远程计算机上运行X11服务器。通常，您可以使用ssh连接到远程计算机并启动X11服务器。例如，您可以使用以下命令连接到远程计算机并启动X11服务器：

```
ssh -X user@remotehost
```

这将连接到远程计算机，并启动一个支持X11转发的ssh会话。接下来，您可以在远程计算机上启动X11客户端应用程序，并将其GUI显示在本地计算机上。



## 111

- 类似Windows的远程桌面，即程序在远程运行(也可以在本地运行)，而显示是在本地显示

### 先决条件

- xshell6中需要开启Xmanager-passive程序

- 安装依赖包

  - ```bash
    # centos
    xorg-x11-xauth xorg-x11-fonts-* xorg-x11-font-utils xorg-x11-fonts-Type1 libXtst
    
    
    # Ubuntu
    ...
    ```


### 范例

```bash
# 定义环境变量
export DISPLAY=10.0.0.1:0.0

# 执行带GUI的程序
virt-manager
```







# 标准 IO 重定向

下面是标准输入输出重定向的一些常见组合及其含义：

- **2>**：标准错误重定向，将标准错误输出重定向到文件或设备。例如，`command 2> error.txt` 将命令 `command` 的错误输出重定向到文件 `error.txt`。
- **1>**： 标准输出重定向，将标准输出重定向到文件或设备。例如，`command 1> output.txt` 将命令 `command` 的输出重定向到文件 `output.txt`。
- **&>**：标准输出+标准错误重定向，将标准输出和标准错误输出都重定向到文件或设备。例如，`command &> output.txt` 将命令 `command` 的输出和错误输出都重定向到文件 `output.txt`。
- **2>&1**：将标准错误输出改为标准输出，将标准错误输出重定向到标准输出。例如，`command 2>&1` 将命令 `command` 的错误输出合并到标准输出中。
- **|&**：将标准错误输出改为标准输出，将一个命令的标准输出和标准错误输出都传递给另一个命令作为输入。例如，`command1 |& command2` 将命令 `command1` 的输出和错误输出都传递给 `command2` 进行处理。
- **1>&2**：将标准输出改为标准错误输出，将标准输出重定向到标准错误输出。例如，`command 1>&2` 将命令 `command` 的输出发送到标准错误输出流中。
- **>&2**：将标准输出和标准错误输出都重定向到标准错误输出。例如，`command >&2` 将命令 `command` 的输出和错误输出都发送到标准错误输出流中。

这些组合可以根据需要进行灵活的流重定向和错误处理。需要注意的是，这些组合可能在不同的命令行环境中略有差异，具体的语法和行为可能会有所变化。



## 范例：2>&1 和 |&

```bash
# 有的命令的输出结果是标准错误，而grep只能过滤标准输出，这时可以使用 2>&1 或使用 |& 来进行过滤

# 范例：
# java | grep '-server'
...
# echo $?
1

---

# java |& grep '-server'
    -server	  to select the "server" VM
                  The default VM is server.
# echo $?
0

---

# java 2>&1 | grep '-server'
    -server	  to select the "server" VM
                  The default VM is server.
# echo $?
0
```



## 范例：\>&2

```sh
if [[ -z "$FTP_HOST" ]]; then
    echo "FTP host not defined! Use -h or --host option to specify." >&2
    echo "Try '$0 --help' for more information." >&2
    exit 1
fi
```

1. `if [[ -z "$FTP_HOST" ]]; then` 这是一个条件语句，检查环境变量 `$FTP_HOST` 是否为空。如果为空，表示 FTP 主机未定义。
2. `echo "FTP host not defined! Use -h or --host option to specify." >&2` 这行代码会将消息 "FTP host not defined! Use -h or --host option to specify." 发送到标准错误输出流，用于指示 FTP 主机未定义的错误。**使用 `>&2` 将输出重定向到 stderr。**
3. `echo "Try '$0 --help' for more information." >&2` 这行代码会将消息 "Try '$0 --help' for more information." 发送到标准错误输出流，提供更多信息的建议。同样，**使用 `>&2` 将输出重定向到 stderr。**
4. `exit 1` 这行代码会使脚本以状态码 1 退出。状态码用于表示程序执行的结果，非零状态码通常表示出现错误。

如果 `$FTP_HOST` 为空，执行这段代码会在标准错误输出流中打印两条消息，并以状态码 1 退出。可以通过 `echo $?` 命令查看上一条命令的返回值。如果 `exit 1` 被执行，`echo $?` 将显示 1。

这种设计可以帮助在脚本中进行错误处理，并将错误消息输出到标准错误流，以便用户或其他程序可以捕获和处理错误信息。





# 文件描述符

在Linux系统中，文件描述符（File Descriptor）是用于访问文件、套接字和其他I/O资源的整数标识符。它是操作系统内核用于跟踪和管理打开文件的方式之一。**文件描述符是进程级别的，每个进程都有自己独立的文件描述符表。**

以下是一些关于Linux文件描述符的详细说明：

1. 文件描述符的范围：文件描述符是非负整数。标准输入（stdin）、标准输出（stdout）和标准错误（stderr）分别使用文件描述符0、1和2。
2. 打开文件描述符：当打开一个文件或套接字时，内核会为该进程分配一个文件描述符。这可以通过系统调用如`open()`、`socket()`或`accept()`来完成。打开文件描述符的返回值就是该文件的文件描述符。
3. 文件描述符的用途：文件描述符可用于执行各种I/O操作，如读取、写入和关闭文件。通过文件描述符，进程可以直接与文件或套接字进行交互。
4. 标准文件描述符：每个进程在默认情况下都会有三个标准文件描述符打开：stdin（0）、stdout（1）和stderr（2）。它们分别与终端键盘输入、终端屏幕输出和终端屏幕错误输出相关联。可以使用`dup2()`系统调用将文件或套接字重定向到这些标准文件描述符。
5. 文件描述符表：每个进程都有一个文件描述符表，用于跟踪打开文件和套接字。该表是一个指向文件表项的指针数组。文件描述符本质上是指向该表项的索引。
6. 文件描述符的限制：操作系统对每个进程可打开的文件描述符数量有一定限制。可以使用`ulimit`命令查看和修改这些限制。
7. 文件描述符的关闭：当不再需要文件描述符时，应该关闭它们，以释放系统资源。使用`close()`系统调用关闭文件描述符。
8. 文件描述符的重定向：可以使用`dup()`、`dup2()`或`fcntl()`等系统调用将一个文件描述符复制到另一个文件描述符，实现重定向输入或输出。
9. 文件描述符的I/O操作：文件描述符可以用于各种I/O操作，包括读取和写入文件、套接字和管道。可以使用`read()`和`write()`系统调用进行读写操作。
10. 文件描述符的非阻塞模式：文件描述符可以设置为非阻塞模式，这意味着读取或写入操作不会阻塞进程，而是立即返回。可以使用`fcntl()`系统调用设置文件描述符的属性。

总之，文件描述符是Linux系统中用于访问文件和I/O资源的整数标识符。



## 创建文件描述符

- 创建前

```sh
# ls /proc/$$/fd -l
total 0
lrwx------ 1 root root 64 Jun 24 16:35 0 -> /dev/pts/0
lrwx------ 1 root root 64 Jun 24 16:35 1 -> /dev/pts/0
lrwx------ 1 root root 64 Jun 24 16:35 2 -> /dev/pts/0
lrwx------ 1 root root 64 Jun 24 16:36 255 -> /dev/pts/0
lr-x------ 1 root root 64 Jun 24 16:35 3 -> /var/lib/sss/mc/passwd
lrwx------ 1 root root 64 Jun 24 16:35 4 -> 'socket:[56277404]'
```

- 创建

```sh
# exec 8<>/dev/tcp/www.baidu.com/80
```

- 这个命令是用在Linux系统中的命令行上的，它的作用是打开一个TCP Socket，连接到百度服务器的80号端口，也就是HTTP服务的端口。
  - 其中，"8"代表使用文件描述符为8的Socket连接
  - "<> "表示打开文件描述符
  - "/dev/tcp/"用于打开一个TCP Socket连接
  - "www.baidu.com"是指连接到的目标服务器域名
  - "80"是目标服务器的端口号。
- 这个命令的应用场景通常是在需要测试网络连接或者进行网络调试时使用。



- 创建后

```sh
# ls /proc/$PPID/fd -l
total 0
lrwx------ 1 root root 64 Jun 24 16:36 0 -> /dev/null
lrwx------ 1 root root 64 Jun 24 16:36 1 -> /dev/null
l-wx------ 1 root root 64 Jun 24 16:36 10 -> /run/systemd/sessions/196.ref
lr-x------ 1 root root 64 Jun 24 16:36 11 -> 'pipe:[56277382]'
l-wx------ 1 root root 64 Jun 24 16:36 12 -> 'pipe:[56277382]'
lrwx------ 1 root root 64 Jun 24 16:36 13 -> /dev/ptmx
lrwx------ 1 root root 64 Jun 24 16:36 17 -> /dev/ptmx
lrwx------ 1 root root 64 Jun 24 16:36 18 -> /dev/ptmx
lrwx------ 1 root root 64 Jun 24 16:36 2 -> /dev/null
lrwx------ 1 root root 64 Jun 24 16:36 3 -> 'socket:[56277366]'
lr-x------ 1 root root 64 Jun 24 16:36 4 -> /var/lib/sss/mc/passwd
lrwx------ 1 root root 64 Jun 24 16:36 5 -> 'socket:[56277296]'
lrwx------ 1 root root 64 Jun 24 16:36 6 -> 'socket:[56277374]'
lr-x------ 1 root root 64 Jun 24 16:36 7 -> /var/lib/sss/mc/initgroups
lrwx------ 1 root root 64 Jun 24 16:36 8 -> 'socket:[56277316]'
lrwx------ 1 root root 64 Jun 24 16:36 9 -> 'socket:[56277369]'


# ss -nt
State       Recv-Q       Send-Q      Local Address:Port       Peer Address:Port       
ESTAB       0            0          172.27.185.115:9527    219.237.185.249:12016      
ESTAB       0            0          172.27.185.115:59272     100.100.30.26:80         
```



### 通过文件描述符访问百度

```sh
# exec 8<>/dev/tcp/www.baidu.com/80
# echo -e "GET / HTTP/1.1\n" >& 8
# cat <& 8
```

这段命令是一系列用于与百度网站进行通信的命令。下面是对每个命令的详细解释：

1. `exec 8<>/dev/tcp/www.baidu.com/80`：
   - `exec`是一个内建命令，用于在当前Shell环境中执行命令。
   - `8<>/dev/tcp/www.baidu.com/80`表示将文件描述符8与位于`www.baidu.com`的80端口的TCP连接进行关联。这使用了一种特殊的文件描述符处理方式，其中`/dev/tcp`是一个虚拟文件系统，允许通过TCP套接字进行通信。
   - 这一行的目的是在文件描述符8上创建一个与百度网站的TCP连接。
2. `echo -e "GET / HTTP/1.1\n" >& 8`：
   - `echo`命令用于向标准输出打印文本。
   - `-e`选项使得echo解释特殊字符（例如`\n`表示换行）。
   - `"GET / HTTP/1.1\n"`是要发送到百度服务器的HTTP请求，表示获取根目录的内容。
   - `>& 8`将输出重定向到文件描述符8，即发送请求到百度服务器。
3. `cat <& 8`：
   - `cat`命令用于连接文件并打印它们的内容。
   - `<& 8`将文件描述符8的输入重定向到cat命令，即接收来自百度服务器的响应并打印出来。

综上所述，这段命令的目的是使用文件描述符8与百度网站的80端口建立TCP连接，并发送一个HTTP GET请求以获取网站的根目录内容，最后将响应打印到标准输出。



在Linux下，文件描述符是由内核分配给进程来访问文件、套接字和其他I/O资源的整数标识符。文件描述符的创建通常是通过打开文件或套接字来完成。下面是几种创建文件描述符的方法：

1. 打开文件：使用`open()`系统调用可以创建一个文件描述符并打开文件。该函数接受文件路径和打开模式作为参数，并返回一个文件描述符。例如，以下代码将创建一个文件描述符并打开文件以供读取：

```c
#include <fcntl.h>

int fd = open("filename.txt", O_RDONLY);
```

1. 创建套接字：使用`socket()`系统调用可以创建一个套接字并获取一个文件描述符。套接字用于网络通信，可以是TCP套接字或UDP套接字。以下是一个创建TCP套接字的示例：

```c
#include <sys/types.h>
#include <sys/socket.h>

int sockfd = socket(AF_INET, SOCK_STREAM, 0);
```

1. 重定向标准文件描述符：可以使用`dup2()`系统调用将一个文件描述符复制到另一个文件描述符，从而创建一个新的文件描述符。这在重定向标准输入、标准输出或标准错误时很常见。例如，以下代码将将标准输出重定向到一个文件：

```c
#include <fcntl.h>
#include <unistd.h>

int fd = open("output.txt", O_WRONLY | O_CREAT, 0644);
dup2(fd, STDOUT_FILENO);
```

1. 创建管道：使用`pipe()`系统调用可以创建一个管道，并返回两个文件描述符，一个用于读取管道内容，另一个用于写入管道内容。例如，以下代码创建了一个管道并获取了读取和写入的文件描述符：

```c
#include <unistd.h>

int pipefd[2];
pipe(pipefd);
int read_fd = pipefd[0];
int write_fd = pipefd[1];
```

这些方法提供了在Linux下创建文件描述符的常见途径。具体使用哪种方法取决于所需的操作和场景。



## 查看文件描述符

- 查看当前进程的文件描述符

```sh
# ls /proc/$$/fd -l
total 0
lrwx------ 1 root root 64 Jun 24 16:35 0 -> /dev/pts/0
lrwx------ 1 root root 64 Jun 24 16:35 1 -> /dev/pts/0
lrwx------ 1 root root 64 Jun 24 16:35 2 -> /dev/pts/0
lrwx------ 1 root root 64 Jun 24 16:36 255 -> /dev/pts/0
lr-x------ 1 root root 64 Jun 24 16:35 3 -> /var/lib/sss/mc/passwd
lrwx------ 1 root root 64 Jun 24 16:35 4 -> 'socket:[56277404]'
```

- 查看父进程的文件描述符

```sh
# ls /proc/$PPID/fd -l
total 0
lrwx------ 1 root root 64 Jun 24 16:36 0 -> /dev/null
lrwx------ 1 root root 64 Jun 24 16:36 1 -> /dev/null
l-wx------ 1 root root 64 Jun 24 16:36 10 -> /run/systemd/sessions/196.ref
lr-x------ 1 root root 64 Jun 24 16:36 11 -> 'pipe:[56277382]'
l-wx------ 1 root root 64 Jun 24 16:36 12 -> 'pipe:[56277382]'
lrwx------ 1 root root 64 Jun 24 16:36 13 -> /dev/ptmx
lrwx------ 1 root root 64 Jun 24 16:36 17 -> /dev/ptmx
lrwx------ 1 root root 64 Jun 24 16:36 18 -> /dev/ptmx
lrwx------ 1 root root 64 Jun 24 16:36 2 -> /dev/null
lrwx------ 1 root root 64 Jun 24 16:36 3 -> 'socket:[56277366]'
lr-x------ 1 root root 64 Jun 24 16:36 4 -> /var/lib/sss/mc/passwd
lrwx------ 1 root root 64 Jun 24 16:36 5 -> 'socket:[56277296]'
lrwx------ 1 root root 64 Jun 24 16:36 6 -> 'socket:[56277374]'
lr-x------ 1 root root 64 Jun 24 16:36 7 -> /var/lib/sss/mc/initgroups
lrwx------ 1 root root 64 Jun 24 16:36 8 -> 'socket:[56277316]'
lrwx------ 1 root root 64 Jun 24 16:36 9 -> 'socket:[56277369]'
```



## 1

在Linux系统中，文件描述符是一种用于访问文件、套接字（sockets）、管道（pipes）和其他输入/输出资源的抽象概念。文件描述符是一个非负整数，用于唯一标识打开的文件或资源。每个进程在其进程空间内都有一张文件描述符表，该表记录了文件描述符和底层文件或资源之间的映射关系。

以下是关于Linux文件描述符的一些详细解释：

1. **标准文件描述符：**
   - **0 (STDIN)**：标准输入。通常是键盘输入。
   - **1 (STDOUT)**：标准输出。通常是显示器输出。
   - **2 (STDERR)**：标准错误输出。通常也是显示器输出，但用于错误消息。

2. **打开文件和文件描述符：**
   在程序中，可以通过系统调用（例如`open()`、`socket()`等）来打开文件或资源，并返回一个文件描述符。文件描述符是一个非负整数，通常从3开始分配，因为0、1和2已经分别用于标准输入、标准输出和标准错误输出。

3. **文件描述符的用途：**
   文件描述符允许进程与打开的文件、设备、套接字等进行交互。通过文件描述符，进程可以执行诸如读取、写入、关闭等操作。

4. **文件描述符的传递：**
   在进程间通信时，文件描述符可以在不同进程之间传递。例如，通过`fork()`系统调用创建的子进程会继承父进程的文件描述符。此外，`pipe()`、`socketpair()`等系统调用创建的通信管道也会产生可以在进程之间传递的文件描述符。

5. **文件描述符的限制：**
   每个进程都有一个限制，即可同时打开的文件描述符数量。可以使用`ulimit`命令来查看和设置这个限制。

6. **关闭文件描述符：**
   使用`close()`系统调用可以关闭一个文件描述符。关闭文件描述符会释放系统资源，并且在不再需要使用文件时是一种良好的实践，以避免资源泄漏。

7. **文件描述符表：**
   每个进程都有一个文件描述符表，该表将文件描述符映射到实际的打开文件、套接字等。这个表是进程的一部分，不同进程的文件描述符表是独立的。

8. **非阻塞I/O：**
   文件描述符可以设置为非阻塞模式，这意味着读取和写入操作不会阻塞进程的执行。这在异步I/O和事件驱动编程中非常有用。

9. **文件描述符的标志：**
   文件描述符可以附加一些标志，如`O_RDONLY`（只读）、`O_WRONLY`（只写）、`O_RDWR`（读写）、`O_CREAT`（不存在时创建）等，用于指定打开文件的行为。

总之，文件描述符是Linux系统中处理文件、设备和通信资源的关键概念之一，它提供了一种抽象的方式来管理和操作这些资源。通过文件描述符，进程可以进行各种I/O操作，实现数据的读取、写入和通信。



## 内置环境变量

Linux系统中有许多内置的环境变量。以下是一些常见的内置环境变量：

1. `HOME`：指定当前用户的主目录路径。
2. `PWD`：指定当前工作目录的路径。
3. `USER`：指定当前用户的用户名。
4. `SHELL`：指定当前用户正在使用的默认Shell。
5. `PATH`：指定系统在查找可执行文件时要搜索的路径列表。
6. `LANG`：指定默认的语言环境和字符编码。
7. `TZ`：指定当前时区。
8. `TERM`：指定当前终端类型。
9. `HOSTNAME`：指定当前主机的名称。
10. `PS1`：指定命令行提示符的格式。
11. `UID`：指定当前用户的用户ID。
12. `GID`：指定当前用户的组ID。
13. `OSTYPE`：指定当前操作系统的类型。
14. `OLDPWD`：指定之前的工作目录的路径。

这些环境变量可在Shell脚本中使用，也可在终端中通过`echo $VARIABLE_NAME`查看其值。除了这些内置的环境变量，用户还可以创建自定义的环境变量，以满足特定需求。





### LANG

`LANG=en_US.UTF-8` 是一个环境变量设置，用于指定系统的默认语言环境和字符编码。

在这个设置中，`LANG`是一个环境变量，用于定义系统的默认语言环境。`en_US`表示英语（美国）的语言，`UTF-8`表示使用UTF-8字符编码。

具体解释如下：

- `LANG`：该变量定义了系统的默认语言环境。它影响了各种程序和工具在处理文本和字符时的行为。通过设置`LANG`变量，你可以指定使用的语言和相关的本地化设置。
- `en_US`：这是语言环境的一部分，表示使用英语作为系统的语言。`en`代表英语，`US`代表美国的本地化设置。它决定了使用的语言翻译、日期格式、数字格式等。
- `UTF-8`：这是字符编码的一部分，表示使用UTF-8编码。UTF-8是一种可变长度的编码方案，可以表示世界上几乎所有的字符。它是当今互联网和大部分现代操作系统默认使用的字符编码。

通过将`LANG`设置为`en_US.UTF-8`，你告诉系统使用英语（美国）作为默认语言，并使用UTF-8编码来处理文本和字符。这样可以确保在终端、文本编辑器和其他程序中正确地显示和处理各种字符。





### $$

在Linux中，$$是一个特殊的变量，代表当前正在运行的Shell进程的进程ID（PID）。每个Shell进程都会被分配一个唯一的PID，用于在系统中标识和跟踪进程。

可以通过在命令行中输入echo $$来查看当前Shell进程的PID。例如：

```sh
$ echo $$
1234
```

在脚本中，你可以使用$$来获取脚本自身的PID，以便在需要时进行进程管理或其他操作。





### $PPID

```sh
# echo $$
3041262

# echo $PPID
3041261
```



在Linux中，$PPID是另一个特殊的变量，表示当前进程的父进程的进程ID（Parent Process ID）。每个进程在创建时都会获得一个父进程，除非它是系统的根进程（通常是init进程，其PID为1）。

你可以使用echo $PPID命令来获取当前进程的父进程ID。例如：

```sh
$ echo $PPID
5678
```

这在编写脚本时特别有用，因为你可以根据父进程的ID执行特定的操作或控制流程。




## Linux 常见发行版
# Alpine

- Alpine 是一个轻量级的 Linux 发行版
- Alpine 采用了 musl 和 busybox 以减少系统的体积和运行时资源消耗，但功能上又比 busybox 又完善的多
- Alpine 的 docker 镜像仅仅只有 5MB左右（Ubuntu 200MB左右）
- **但是生产中制作docker file时，通常还是使用centos、Ubuntu等主流镜像，因为alpine虽然轻量，但带来的缺点也是很明显的，如：常用工具较少等**



## 相关网站

- **Alpine 官网**：https://www.alpinelinux.org/
- **Alpine 官方仓库**：https://github.com/alpinelinux
- **Alpine 官方镜像**：https://hub.docker.com/_/alpine/
- **Alpine 官方镜像仓库**：https://github.com/gliderlabs/docker-alpine
- **Alpine 阿里云的镜像仓库**：https://mirrors.aliyun.com/alpine/



## Alpine 软件包管理

在 Alpine Linux 上安装软件包可以通过使用 `apk` 包管理器来完成。下面是一些常用的 `apk` 命令和示例：

### 更新软件包索引

```sh
apk update
```



### 搜索软件包

```sh
apk search <package_name>
```



### 安装软件包

```sh
apk add <package_name>
```

例如，要安装 `curl` 软件包，可以运行以下命令：

```sh
apk add curl
```



### 升级软件包

```sh
apk upgrade
```



### 卸载软件包

```sh
apk del <package_name>
```

例如，要卸载 `curl` 软件包，可以运行以下命令：

```sh
apk del curl
```



### 显示已安装的软件包

```sh
apk info
```



## Alpine 更换国内镜像

https://developer.aliyun.com/mirror/alpine?spm=a2c6h.13651102.0.0.4ed41b11l1W83u

1. 编辑 `/etc/apk/repositories`
2. 将里面 dl-cdn.alpinelinux.org 的 改成 mirrors.aliyun.com ; 保存退出即可

```sh
# 备份
cp /etc/apk/repositories{,.bak}
# 或
cp /etc/apk/repositories /etc/apk/repositories.bak


# 替换
sed -ri 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories
```





# CentOS

## Install CentOS

## Centos安装光盘的安装相关文件

```bash
# mount /dev/sr0 /mnt/
# ls  /mnt/isolinux/ | tr ' ' '\n'

boot.cat #相当于grub的第一阶段

boot.msg

grub.conf

initrd.img #ramfs文件

isolinux.bin #光盘引导程序，在mkisofs的选项中需要明确给出文件路径，这个文件属于SYSLINUX项目

isolinux.cfg #启动菜单的配置文件，当光盘启动后（即运行isolinux.bin），会自动去找此文件

memtest #内存检测程序

splash.png #光盘启动菜单界面的背景图

TRANS.TBL

vesamenu.c32 #是光盘启动后的启动菜单图形界面，也属于SYSLINUX项目，menu.c32提供纯文本的菜单

vmlinuz #是内核映像
```



## Centos安装菜单的内核参数





## Kickstart 文件

- **Kickstart是红帽官方提供的一种自动化安装方式**

- Ubuntu参考文档：https://help.ubuntu.com/community/KickstartCompatibility
- centos参考文档：
  - https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/7/html/installation_guide/sect-kickstart-syntax
  - https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/8/html/performing_an_advanced_rhel_installation/index

### Kickstart 文件格式

- kickstart文件主要包括三个部分：命令段，程序包段，脚本段
- **注意：**
  - CentOS 8,7,6 不同版本的kickstart文件格式不尽相同，不可混用
  - %addon, %packages, %onerror, %pre 、 %post 必须以%end结束，否则安装失败

#### 命令段

- 指明各种安装前配置，如键盘类型等
- 命令段中的常见命令：

```bash
keyboard #设定键盘类型
lang #语言类型
zerombr #清除mbr
clearpart #清除分区
part #创建分区
rootpw #指明root的密码
timezone #时区
text #文本安装界面
network #指定网络设置
firewall #设置防火墙设置
selinux #设置selinux设置
reboot #安装完自动重启
user #安装完成后为系统创建新用户
url #指明安装源
```

#### 程序包段

- 指明要安装的程序包组或程序包，不安装的程序包等

```bash
%packages
@^environment group #指定环境包组，如：@^minimal-environment）
@group_name
package
-package
%end
```

#### 脚本段

```bash
#安装前脚本
%pre
...
%end

------------------------------------------------------------------------

#安装后脚本
%post
...
%end
```

### 自动生成 Kickstart 文件

- 需要安装 system-config-kickstart 包（**只支持centos7**）

```BASH
yum -y install system-config-kickstart

export DISPLAY=10.0.0.1:0.0

#开启 Xmanager-Passive

#执行
system-config-kickstart
```



### Kickstart 语法检查

- 需要安装 pykickstart 包

```
ksvalidator /PATH/TO/KICKSTART_FILE
```

- **不同centos版本配置文件语法不尽相同**

```bash
#centos7
[root@centos7 ~]# ksvalidator ks.cfg

#centos8
[root@centos8 ~]# ksvalidator /data/ks/centos7-ks.cfg 
Ignoring deprecated command on line 4:  The install command has been deprecated and no longer has any effect.  It may be removed from future releases, which will result in a fatal error from kickstart.  Please modify your kickstart file to remove this command.
The authconfig command will be deprecated, use authselect instead.
```





### Kickstart 文件范例

#### CentOS 8

```bash
ignoredisk --only-use=sda
zerombr
text
reboot
clearpart --all --initlabel
selinux --disabled
firewall --disabled
url --url=http://10.0.0.8/centos/8/os/x86_64/
keyboard --vckeymap=us --xlayouts='us'
lang en_US.UTF-8
network  --bootproto=dhcp --device=ens160 --ipv6=auto --activate
network  --hostname=centos8.magedu.com
rootpw --iscrypted
$6$j9YhzDUnQVnxaAk8$qv7rkMcPAEbV5yvwsP666DXWYadd3jYjkA9fpxAo9qYotjGGBUclCGoP1TRv
gHBpqgc5n0RypMsPTQnVDcpO01
firstboot --enable
skipx
services --disabled="chronyd"
timezone Asia/Shanghai --isUtc --nontp
user --name=wang --
password=6oUfb/02CWfLb5l8f$sgEZeR7c7DpqfpmFDH6huSmDbW1XQNR4qKl2EPns.gOXqlnAIgv9p
TogtFVaDtEpMOC.SWXKYqxfVtd9MCwxb1 --iscrypted --gecos="wang"
part / --fstype="xfs" --ondisk=sda --size=102400
part /data --fstype="xfs" --ondisk=sda --size=51200
part swap --fstype="swap" --ondisk=sda --size=2048
part /boot --fstype="ext4" --ondisk=sda --size=1024
%packages
@^minimal-environment
kexec-tools
%end
%addon com_redhat_kdump --enable --reserve-mb='auto'
%end
%anaconda
pwpolicy root --minlen=6 --minquality=1 --notstrict --nochanges --notempty
pwpolicy user --minlen=6 --minquality=1 --notstrict --nochanges --emptyok
pwpolicy luks --minlen=6 --minquality=1 --notstrict --nochanges --notempty
%end
%post
useradd mage
echo magedu | passwd --stdin azheng &> /dev/null
%end
```

#### CentOS 7

```sh
install
xconfig  --startxonboot
keyboard --vckeymap=us --xlayouts='us'
rootpw --iscrypted $1$bpNEv8S5$lK.CjNkf.YCpFPHskSNiN0
url --url="http://10.0.0.8/centos/7/os/x86_64" #要和repo目录同级
lang en_US
auth  --useshadow  --passalgo=sha512
text
firstboot --enable
selinux --disabled
skipx
services --disabled="chronyd"
ignoredisk --only-use=sda
firewall --disabled
network  --bootproto=dhcp --device=ens33
reboot
timezone Asia/Shanghai --nontp
bootloader --append="crashkernel=auto" --location=mbr --boot-drive=sda
zerombr
clearpart --all --initlabel
part swap --fstype="swap" --ondisk=sda --size=3072
part / --fstype="xfs" --ondisk=sda --size=51200
part /boot --fstype="xfs" --ondisk=sda --size=1024
part /data --fstype="xfs" --ondisk=sda --size=30720
%post
useradd wang
%end
%packages
@^minimal
vim-enhanced
%end
```

#### CentOS 6

```bash
install
text
reboot
url --url=http://10.0.0.8/centos/6/os/x86_64/
lang en_US.UTF-8
keyboard us
network --onboot yes --device eth0 --bootproto dhcp  --noipv6
rootpw  --iscrypted
$6$b6C5mM/BwOMBoK8H$cYZFrHoNlOL0iDsxOTRhwnWJ3yfFmf7mRJBOxEqGoI56UMrT8J7qlrGwX7tSnOf7wKxYR2hAvAREILDgOgsFe1
firewall --disabled
authconfig --enableshadow --passalgo=sha512
selinux --disabled
timezone Asia/Shanghai
bootloader --location=mbr --driveorder=sda --append="crashkernel=auto rhgb 
quiet"
zerombr
clearpart --all --initlabel
part /boot --fstype=ext4 --size=1024
part / --fstype=ext4 --size=50000
part /data --fstype=ext4 --size=30000
part swap --size=2048

%packages
@core
@server-policy
@workstation-policy
autofs
vim-enhanced
%end

%post
useradd wang 
echo magedu | passwd --stdin wang &> /dev/null
mkdir /etc/yum.repos.d/bak
mv /etc/yum.repos.d/* /etc/yum.repos.d/bak
cat > /etc/yum.repos.d/base.repo <<EOF
[base]
name=base
baseurl=file:///misc/cd
gpgcheck=0
EOF
%end
```







## 利用制作的引导文件安装

- 可以制作引导光盘或U盘 并结合Kickstart文件实现半自动化安装

### 注意事项

- 需要网络中有DHCP服务器，否则会因获取不到IP而无法下载网络上的数据（WMware中要开启DHCP）

### 拷贝安装光盘中所需的文件

```bash
#将安装系统的光盘挂载到本地
# mount /dev/sr0 /mnt/

#准备目录
# mkdir /data/myiso/

#将光盘中所需的文件拷贝到本地目录
# cp -r /mnt/isolinux/ /data/myiso/
# tree /data/myiso/isolinux/
/data/myiso/isolinux/
├── boot.cat
├── boot.msg
├── grub.conf
├── initrd.img
├── isolinux.bin
├── isolinux.cfg
├── memtest
├── splash.png
├── TRANS.TBL
├── vesamenu.c32
└── vmlinuz
```

### 修改拷贝的文件

#### 方法1：应答方件放在ISO文件里

- CentOS 7

```bash
# vim /data/myiso/isolinux/isolinux.cfg
...
label linux
  menu label ^Auto Install CentOS 7
  kernel vmlinuz
  append initrd=initrd.img text ks=cdrom:/myks.cfg 
...
```

- CentOS 8

```bash
# vim /data/myiso/isolinux/isolinux.cfg
...
label linux
 menu label ^Auto Install CentOS Linux 8
 kernel vmlinuz
  initrd=initrd.img text ks=cdrom:/myks.cfg #指定ks文件
...
```

#### 方法2：应答方件放在http服务器上

```bash
# vim /data/myiso/isolinux/isolinux.cfg
...
label linux
 menu label ^Auto Install CentOS Linux 8
 kernel vmlinuz
 append initrd=initrd.img quiet ks=http://10.0.0.8/ksdir/centos8.cfg
label rescue
 menu label ^Rescue a CentOS Linux system
 kernel vmlinuz
 append initrd=initrd.img inst.repo=http://10.0.0.8/centos/8 rescue quiet
label local
 menu default
 menu label Boot from ^local drive
 localboot 0xffff
...
```

### 准备 Kickstart 文件

- Kickstart 文件的名称可以自定义，但必须以 .cfg 结尾

```bash
# vim /data/myiso/myks.cfg
install
xconfig  --startxonboot
keyboard --vckeymap=us --xlayouts='us'
rootpw --iscrypted $1$bpNEv8S5$lK.CjNkf.YCpFPHskSNiN0
url --url="http://10.0.0.101/"
lang en_US
auth  --useshadow  --passalgo=sha512
text
firstboot --enable
selinux --disabled
skipx
services --disabled="chronyd"
ignoredisk --only-use=sda
firewall --disabled
network  --bootproto=dhcp --device=ens33
reboot
timezone Asia/Shanghai --nontp
bootloader --append="crashkernel=auto" --location=mbr --boot-drive=sda
zerombr
clearpart --all --initlabel
part swap --fstype="swap" --ondisk=sda --size=3072
part / --fstype="xfs" --ondisk=sda --size=51200
part /boot --fstype="xfs" --ondisk=sda --size=1024
part /data --fstype="xfs" --ondisk=sda --size=30720

%packages
@^minimal
vim-enhanced
tcpdump
%end

%post
useradd azheng
mkdir /test
%end
```

### 构建iso文件

- 注意：以下相对路径都是相对于光盘的根，和工作目录无关

```bash
dnf -y install mkisofs

#在哪个目录执行都可以
mkisofs -R -J -T -v --no-emul-boot --boot-load-size 4 --boot-info-table -V "CentOS 8.0 x86_64 boot" -b isolinux/isolinux.bin -c isolinux/boot.cat -o /root/boot.iso /data/myiso/

#检查生成的iso文件
# ls -lh /root/boot.iso
-rw-r--r-- 1 root root 60M Mar 29 23:01 /root/boot.iso

#上传到桌面
sz /root/boot.iso
```

### 准备光盘源

- 如果可以连外网，也可以执行国内的阿里、清华源
- 可以在本机安装，也可以在其他主机安装，其他主机安装还需事先将光盘文件拷贝过来

```bash
# apt -y install nginx

# vim /etc/nginx/sites-enabled/default
...
server {
    listen 80 default_server;
    server_name _;
    root /mnt/;
    autoindex on;
    autoindex_localtime on;
    limit_rate 1024k;
}
...

#浏览器测试访问
```

### 安装

- 将制作的ISO引导文件导入到U盘等设备中，然后通过U盘等设备进行引导安装
- 进入GRUB后，选择刚才设置的 Auto Install CentOS 这个菜单进行安装，或者设置了此菜单为默认菜单的话则无需再点击，等待其自动安装完成即可



## 利用 PXE 实现自动安装

- **PXE**：Preboot Excution Environment，预启动执行环境，是由Intel公司研发，基于Client/Server的网络模式，支持远程主机通过网络从远端服务器下载映像，并由此支持通过网络启动操作系统，可以引导和安装Windows，linux等多种操作系统

### PXE 实现自动安装过程

1. Client向PXE Server上的DHCP发送IP地址请求消息，DHCP检测Client是否合法（主要是检测Client的网卡MAC地址），如果合法则返回Client的IP地址，同时将启动文件pxelinux.0的所在TFTP服务器地址信息一并传送给Client
2. Client向TFTP服务器发送获取pxelinux.0请求消息，TFTP服务器接收到消息之后，向Client发送pxelinux.0大小信息，试探Client是否满意，当TFTP收到Client发回的同意大小信息之后，正式向Client发送pxelinux.0
3. Client执行接收到的pxelinux.0文件，并利用此文件启动
4. Client向TFTP 服务器发送请求针对本机的配置信息文件（在TFTP 服务器的pxelinux.cfg目录下），TFTP服务器将启动菜单配置文件发回Client，继而Client根据启动菜单配置文件执行后续操作
5. Client根据启动菜单配置文件里的信息，向TFTP发送Linux内核和initrd文件请求信息，TFTP接收到消息之后将内核和initrd文件发送给Client
6. Client向TFTP发送根文件请求信息，TFTP接收到消息之后返回Linux根文件系统
7. Client启动Linux内核,加载相关的内核参数
8. Client通过内核参数下载kickstart文件，并根据kickstart文件里的安装信息，下载安装源文件进行自动化安装

### 注意事项

- 如果在WMware环境，需要关闭网络自身携带的DHCP服务 并基于NAT模式，以避免安装过程受到干扰

### 环境说明

- nginx也可以部署在其他主机

| OS         | IP        | Service       |
| ---------- | --------- | ------------- |
| CentOS 8.3 | 10.0.0.18 | DHCP-server   |
| CentOS 8.3 | 10.0.0.18 | TFTP          |
| CentOS 8.3 | 10.0.0.18 | HTTP（Nginx） |

- **下面是同时实现安装centos7、8的流程：**

### 安装 dhcp

```bash
#安装
yum -y install dhcp-server

#拷贝配置文件模板
cp /usr/share/doc/dhcp-server/dhcpd.conf.example /etc/dhcp/dhcpd.conf

#修改配置文件模板
# vim /etc/dhcp/dhcpd.conf
option domain-name "baidu.com";
option domain-name-servers 223.5.5.5, 180.76.76.76, 223.6.6.6;
default-lease-time 86400;
max-lease-time 106400;
subnet 10.0.0.0 netmask 255.255.255.0 {
  range 10.0.0.66 10.0.0.88;
  option routers 10.0.0.2;
  filename "pxelinux.0";
  next-server 10.0.0.18; #这里指的是tftp服务器的地址，因为tftp和本机安装在了一起，所以写了本机的IP
}

#启动服务
systemctl enable --now dhcpd

#查看端口是否开启
# ss -ntua|grep 67
udp    UNCONN  0        0                  0.0.0.0:67            0.0.0.0:*
```



### 安装 tftp

```bash
yum -y install tftp-server
```



### 安装 nginx

- 这里使用yum安装，生产中一般需要使用编译安装

```nginx
#安装
yum -y install nginx

# vim /etc/nginx/nginx.conf
#修改配置文件
...
http {
...
    include             /etc/nginx/mime.types;
    default_type        text/plain;
    charset utf-8;
...
server {
    listen 80 default_server;
    server_name _;
    root /mnt/;
    autoindex on;
    autoindex_localtime on;
}
...

#启动服务
systemctl enable --now nginx.service
```





### 将系统光盘挂载

- 生产中通常要将光盘直接拷贝到主机中

#### 准备所需目录

```bash
# mkdir -p /data/{ks,centos/{7,8}/os/x86_64/}
[root@dhcp-server ~]# tree /data/
/data/
├── centos
│   ├── 7
│   │   └── os
│   │       └── x86_64
│   └── 8
│       └── os
│           └── x86_64
└── ks
```

#### 挂载

```bash
mount /dev/sr0 /data/centos/7/os/x86_64/

mount /dev/sr1 /data/centos/8/os/x86_64/
```



### 安装 syslinux-nonlinux 包

- 来自Base源

```bash
#安装
yum -y install syslinux-nonlinux

#所需文件
rpm -ql syslinux-nonlinux
...
/usr/share/syslinux/pxelinux.0
/usr/share/syslinux/menu.c32 #建议的菜单文件
```

### 拷贝内核映像等相关文件

```bash
#准备相关目录
mkdir /var/lib/tftpboot/centos{7,8}

#拷贝内核映像文件 和 ramfs文件（注意每个内核映像文件对应一个系统，不要搞错）
cp /data/centos/7/os/x86_64/isolinux/{vmlinuz,initrd.img} /var/lib/tftpboot/centos7/
cp /data/centos/8/os/x86_64/isolinux/{vmlinuz,initrd.img} /var/lib/tftpboot/centos8/

#拷贝 pxelinux.0文件 和 简易菜单文件
cp /usr/share/syslinux/{pxelinux.0,menu.c32} /var/lib/tftpboot/

#拷贝三个CentOS8安装所必须文件，CentOS6，7则不需要
cp /data/centos/8/os/x86_64/isolinux/{ldlinux.c32,libcom32.c32,libutil.c32}  /var/lib/tftpboot/

# tree /var/lib/tftpboot/
/var/lib/tftpboot/
├── centos7
│   ├── initrd.img
│   └── vmlinuz
├── centos8
│   ├── initrd.img
│   └── vmlinuz
├── ldlinux.c32
├── libcom32.c32
├── libutil.c32
├── menu.c32
└── pxelinux.0
```



### 准备启动菜单文件

```bash
# mkdir /var/lib/tftpboot/pxelinux.cfg/
# vim /var/lib/tftpboot/pxelinux.cfg/default 

default menu.c32
timeout 600
menu title Install CentOS Linux

label linux8
 menu label Auto Install CentOS Linux ^8
 kernel centos8/vmlinuz
 append initrd=centos8/initrd.img ks=http://10.0.0.18/ks/centos8-ks.cfg

label linux7
 menu label Auto Install CentOS Linux ^7
 kernel centos7/vmlinuz
 append initrd=centos7/initrd.img ks=http://10.0.0.18/ks/centos7-ks.cfg

label rescue
 menu label ^Rescue a CentOS Linux system 8
 kernel centos8/vmlinuz
 append initrd=centos8/initrd.img  inst.repo=http://10.0.0.18/centos/8/os/x86_64/ rescue
  
label local
 menu default
 menu label Boot from ^local drive
 localboot 0xffff
```

### 准备 kickstart 文件

#### centos7

```bash
mkdir /mnt/ks

vim /mnt/ks/centos7-ks.cfg

---------------------------------------------------------------------------

#platform=x86, AMD64, or Intel EM64T
#version=DEVEL
# Install OS instead of upgrade
install
# Keyboard layouts
keyboard 'us'
# Root password
rootpw --iscrypted $1$qaFmIiHP$tTy.0GvmJlaDlFaXKkCSo/
# System language
lang en_US
# System authorization information
auth  --useshadow  --passalgo=sha512
# Use text mode install
text
firstboot --disable
# SELinux configuration
selinux --disabled
# Do not configure the X Window System
skipx


# Firewall configuration
firewall --disabled
# Network information
network  --bootproto=dhcp --device=eth0
# Reboot after installation
reboot
# System timezone
timezone Asia/Shanghai
# Use network installation
url --url="http://10.0.0.8/centos/7/os/x86_64/"
# System bootloader configuration
bootloader --location=mbr
# Clear the Master Boot Record
zerombr
# Partition clearing information
clearpart --all --initlabel
# Disk partitioning information
part /boot --fstype="ext4" --size=1024
part /data --fstype="ext4" --size=51200
part / --fstype="ext4" --size=51200

%packages
@^minimal
vim-enhanced
tcpdump
%end

%post
useradd azheng
mkdir /test
%end
```

#### centos8

```bash
mkdir /mnt/ks

vim /mnt/ks/centos7-ks.cfg

---------------------------------------------------------------------------
#platform=x86, AMD64, or Intel EM64T
#version=DEVEL
# Keyboard layouts
keyboard 'us'
# Root password
rootpw --iscrypted $1$qaFmIiHP$tTy.0GvmJlaDlFaXKkCSo/
# System language
lang en_US
# System authorization information
authselect  --useshadow  --passalgo=sha512
# Use text mode install
text
firstboot --disable
# SELinux configuration
selinux --disabled
# Do not configure the X Window System
skipx


# Firewall configuration
firewall --disabled
# Network information
network  --bootproto=dhcp --device=eth0
# Reboot after installation
reboot
# System timezone
timezone Asia/Shanghai
# Use network installation
url --url="http://10.0.0.18/centos/8/os/x86_64/"
# System bootloader configuration
bootloader --location=mbr
# Clear the Master Boot Record
zerombr
# Partition clearing information
clearpart --all --initlabel
# Disk partitioning information
part /boot --fstype="ext4" --size=1024
part /data --fstype="ext4" --size=51200
part / --fstype="ext4" --size=51200

%packages
vim
tcpdump
%end

%post
useradd azheng
mkdir /test
%end
```

### 安装系统

- 启动机器，然后等待DHCP获取IP地址，最后选择菜单进行安装



## 利用 Cobbler 实现自动化安装

- 官方文档：https://cobbler.readthedocs.io/en/latest/









## Centos 常用软件包

```bash
traceroute tcpdump lrzsz vim bridge-utils netcat httpd-tools gcc make autoconf gcc-c++ glibc glibc-devel pcre pcre-devel openssl openssl-devel systemd-devel zlib-devel vim lrzsz tree tmux lsof tcpdump wget net-tools iotop bc bzip2 zip unzip nfs-utils man-pages rsync tzdata
```

## 最小化安装后无法tab键补全

```sh
bash-completion  #此安装包可解决最小化安装后无法tab键补全命令选项的问题
```



## 防止误操作重启

```bash
# centos7,8禁用ctrl+alt+delete（重启）
1.systemctl mask ctrl-alt-del.target
2.init q（重新加载配置文件，等价于systemctl daemon-reload）
```



## rpm

- 此命令在生产中主要用于查询，安装主要还是使用yum，因为yum能很好的解决软件包之间的依赖问题


```bash
-qf `which cmd` #查看命令来自哪个包
```



## yum

- 底层还是依赖于rpm

- Centos8 yum命令改为dnf，但yum命令依旧可以用，两者为软连接关系

- ```bash
  [root@centos8 ~]$ll /usr/bin/yum
  lrwxrwxrwx. 1 root root 5 Aug  5  2020 /usr/bin/yum -> dnf-3
  ```



## 常用选项

```bash
dnf -y install package #自动yes安装包

yum history [info|redo|undo] [#] #显示yum安装的历史ID编号,[]中表示根据历史安装ID来查看更详细的安装信息|重新安装|取消安装



```

------

## 配置文件

```bash
/etc/yum.conf #为所有仓库提供公共配置
/etc/yum.repos.d/*.repo #为每个仓库的提供配置文件
```



## 相关变量

```bash
#yum的repo配置文件中可用的变量：
$releasever: 当前OS的发行版的主版本号，如：8，7，6
$arch: CPU架构，如：aarch64, i586, i686，x86_64等
$basearch：系统基础平台；i386, x86_64
```



## yum仓库搭建

```bash
1.touch  /etc/yum.repos.d/*.repo
2.vim /etc/yum.repos.d/*.repo
3.主要配置如下：#为必选项
 name=仓库名称
#[仓库ID]
#baseurl=file://（基于本地路径）| http://，https://，ftp://（基于网络路径）*同时基于本地和网络有可能会出问题，*多个路径需对齐，在等号之后
#gpgcheck={0|1}（是否通过密钥来检查软件包完整性，0为不检查，1为检查(默认) ）
enabled=1 #是否启用该仓库，1表示启用，0表示不启用，默认启用
```

------

## 故障排错

**大多数都是仓库缓存出了错误，执行yum clean all 清理缓存即可**



## 国内yum源地址

### 网易

```bash
[root@centos8 yum.repos.d]$cat CentOS-Linux-AppStream.repo 
[APP]
name=APP
baseurl=http://mirrors.163.com/centos/8.3.2011/AppStream/x86_64/os/
gpgcheck=0

[root@centos8 yum.repos.d]$cat CentOS-Linux-BaseOS.repo
[BASE]
name=BASE
baseurl=http://mirrors.163.com/centos/8.3.2011/BaseOS/x86_64/os/
gpgcheck=0
```

### 清华

```bash
[app]
name=app
baseurl=https://mirrors.tuna.tsinghua.edu.cn/centos/8/AppStream/x86_64/os/
enable=1
gpkcheck=0

[base]
name=base
baseurl=https://mirrors.tuna.tsinghua.edu.cn/centos/8/BaseOS/x86_64/os/
enable=1
gpkcheck=0

[epel]
name=epel
baseurl=https://mirrors.tuna.tsinghua.edu.cn/epel/8/Everything/x86_64/
enable=1
gpkcheck=0
```



## 破解 root 密码

### centos7、8

#### 方法一

```bash
启动时任意键暂停启动
按e键进入编辑模式
将光标移动linux 开始的行，添加内核参数rd.break
按ctrl-x启动
mount –o remount,rw /sysroot
chroot /sysroot
passwd root

#如果SELinux是启用的,才需要执行下面操作,如查没有启动,不需要执行
touch /.autorelabel
exit
reboot
```

#### 方法二

```bash
启动时任意键暂停启动
按e键进入编辑模式
将光标移动linux 开始的行，改为rw init=/sysroot/bin/sh
按ctrl-x启动
chroot /sysroot
passwd root

#如果SELinux是启用的,才需要执行下面操作,如查没有启动,不需要执行
touch /.autorelabel

exit
reboot
```



# Ubuntu

## Ubuntu 版本命名方式

Ubuntu操作系统的LTS（Long Term Support）版本通常使用以下命名方案，其中每个版本都有对应的单词：

1. Ubuntu 12.04 LTS：Precise Pangolin
2. Ubuntu 14.04 LTS：Trusty Tahr
3. Ubuntu 16.04 LTS：Xenial Xerus
4. Ubuntu 18.04 LTS：Bionic Beaver
5. Ubuntu 20.04 LTS：Focal Fossa
6. Ubuntu 22.04 LTS：TBD（尚未发布，因此还没有相关单词）

这些单词是由Ubuntu团队为每个LTS版本选择的动物名字和形容词，用于辨识和区分不同版本。



## Install Ubuntu

### Preseeds

- preseeds是Ubuntu官方提供的一种自动化安装方式

- 官方文档：https://ubuntu.com/server/docs/install/autoinstall



## Ubuntu 常用软件包

```
lrzsz traceroute tcpdump vim bridge-utils netcat wget tree inetutils-ping make lsof iproute2 net-tools curl tzdata
```

### 网络相关

- 1804

```sh
apt-get update && \
    apt-get install -y \
    tcpreplay \
    apt-transport-https \
    tzdata \
    vim \
    iproute2 \
    iputils-ping \
    tcpdump \
    traceroute \
    wget \
    nmap \
    dnsutils \
    iftop \
    nethogs \
    net-tools \
    telnet
```





## Ubuntu 系统安装后初始化操作

```bash
sudo -i #切换为root
```





## Ubuntu 查看版本

```sh
root@ubuntu:~# cat /etc/issue
Ubuntu 20.04.1 LTS \n \l

root@ubuntu:~# uname -a
Linux ubuntu 5.4.0-42-generic #46-Ubuntu SMP Fri Jul 10 00:24:02 UTC 2020 x86_64 x86_64 x86_64 GNU/Linux
```



## Ubuntu 设置root自动登录

```sh
root@ubuntu:~# vim /etc/ssh/sshd_config
#修改此行
PermitRootLogin yes

root@ubuntu:~# systemctl restart sshd
```





## Ubuntu 查看域名解析

```sh
root@ubuntu:~# systemd-resolve --status |grep -iA6 'dns servers'
         DNS Servers: 10.0.0.2
                      8.8.8.8 
```

