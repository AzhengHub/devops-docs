---
title: "面试宝典"
weight: 999
---

## Base
{{< collapse summary="**谈谈你对 SRE 的理解**" >}}
SRE 是 Google 提出来的概念，它的全称是站点可靠性工程（Site Reliability Engineering），其核心目标是 **通过工程化手段，提升系统的稳定性、可靠性**，当落实到实际应用场景时：
1. 可以通过监控、告警、日志采集等手段提高系统整体的可观测性，并在出现故障时可及时发现；
2. 通过一些辅助手段，例如状态检测脚本，定期检测后端服务可用性，当出现宕机时将流量转移并尝试对其重启恢复。还可以通过 keepalived + VIP 的方式为服务提供统一的访问入口，防止单点失败的情况发生。
{{< /collapse >}}

{{< collapse summary="***谈谈你对 Devops 的理解**" >}}
- xxx
{{< /collapse >}}

**实践场景：**
{{< collapse summary="**一个项目运维交给你后，你会如何梳理，以实现快速上手**" >}}
1. 信息收集：根据现有的材料，了解：
    - 当前网络拓扑
    - 服务部署方式（容器/service，以及部署数量）
    - 并根据服务配置文件，判断有哪些依赖组件（数据库、外部接口、以及像kafka等其他中间件）
    - 是否有监控、告警、日志采集等运维系统
    - CICD流程等
2. 信息梳理：将收集的信息，通过表格、拓扑图等方式进行整理归纳；
3. 运维阶段：分析系统薄弱环节，并进行优化，例如：是否有单点失败问题？重要数据是否有备份？监控是否全面？告警策略是否合理？
{{< /collapse >}}

{{< collapse summary="**项目要进行重保，前期、期间、后期如何处理？**" >}}
“项目重保（重点保障）”通常是指某个重要时期的系统稳定性保障，比如：618、双11、促销活动、系统迁移、重大发布、节假日流量高峰等。
- 重保前期：
    1. 系统巡检，确认关键服务、依赖组件、数据库、缓存等状态正常；
    2. 准备应急预案，例如线上服务出现问题时的紧急回滚策略等；
    3. 权限冻结，只允许紧急变更；
    4. 安全漏扫
- 重保期间：
    1. 24h实时监控，关注核心指标（QPS、RT、错误率、CPU、延迟等）；
    2. 灰度/限流策略：根据流量情况动态限流或启用熔断；
    3. 扩缩容策略：自动/手动扩容，保证服务稳定；
    3. xxx
- 重保后期：
    1. 复盘，总结经验
{{< /collapse >}}

{{< collapse summary="**遇到过最复杂的问题与解决方案？**" >}}
磁盘空间使用率超过百分之80%
- 排查思路：
    1. 通过 `du -sh /*` 从根开始逐级排查大文件，发现应用日志占用了大约 100G 的空间，但将日志删除后，磁盘空间并未释放
    2. 使用 `lsof | grep 文件名` 后发现，该文件仍被进程所占用，进而导致文件描述符未被释放 
- 解决方案： 
    1. 重启 `lsof` 中显示的进程，磁盘空间释放，问题解决
    2. 以后再删除大文件，找到了一个更好的方案，就是使用 `> 文件`，通过标准输出重定向的方式将文件置为空，这样可以使磁盘空间立刻得到释放

安装完 docker 并启动容器后，发现宿主机无法访问其他网段的IP
- 排查思路：
    1. 使用 `traceroute 其他网段的IP` 跟踪路由后，发现数据包到达的网关不对，而且没有下一跳了
    2. 通过 `ip a` 查看 IP 、`ip r` 查看路由表后，发现新创建的容器网段与目标网段冲突了
- 解决方案： 
    1. 删除容器，通过 `docker network create` 新建一个没有冲突的其他网段，启动容器时指定该自定义网段

ping 不通服务器，但 telnet IP+端口正常
- 排查思路：
    1. 登录到服务器，发现 ping 自己也 ping 不同，于是通过 tcpdump 抓包查看，发现只有请求包，没有响应包。
- 解决方案： 
    - 内核参数中禁ping了，修改 `/etc/sysctl.conf`，添加 `net.ipv4.icmp_echo_ignore_all = 0`，并执行 `sysctl -p` 生效
{{< /collapse >}}


## 计算机基础
{{< collapse summary="***进程、线程、协程的区别？**" >}}
- 进程有独立的内存空间，所以隔离性比较好，崩溃不会影响其他进程。但创建和销毁的开销比较大，而且进程间通信也比较麻烦。
- 线程是共享进程内存的，所以通信快。
- 协程可以理解为‘用户态的轻量级线程’，通过代码控制，类似一个小函数。
{{< /collapse >}}

{{< collapse summary="***多进程和多线程又有啥区别，什么场景下会使用多进程，什么场景下又用多线程。？**" >}}
多进程和多线程区别：
- 多进程时，进程与进程间完全独立，某个进程出现问题时不会影响其他进程，所以安全性更高。
- 多线程时，安全性不及多进程，但因为线程共享进程的内存空间，所以线程间通信效率要比进程间通信高。

应用场景：
- 多进程适合 CPU 密集型任务，例如视频编码/解码、数据加密/解密、AI 模型训练。
- 多线程适合 I/O 密集型任务，即网络IO、磁盘IO相关的，（多线程 I/O 等待时切换效率更高，所以更适合）。
    - PS：在现代编程中，协程（Coroutines） 进一步优化了切换效率，因为协程的切换（也叫“任务切换”）完全发生在用户态，避免了内核介入，开销比线程切换还要小得多，是处理 I/O 密集型任务的最理想模型。
{{< /collapse >}}

{{< collapse summary="***一个进程在操作系统中，它有哪几种状态表现？**" >}}
- R（Running）运行态：表示进程正在CPU上执行。
- S（Sleeping）可中断睡眠态：表示空闲进程正在等待一个事件，可以被信号中断。
- D（Disk Sleep）不可中断睡眠态：进程正在等待I/O完成，这个状态不能被信号中断。
- Z（Zombie）僵尸态：进程已经终止，但父进程并未将其回收（调用 wait() 或 waitpid() 系统调用来回收其资源和退出状态信息）。
- T（Stopped）停止态：进程被信号（如 SIGSTOP 或 SIGTSTP）暂停执行。它可以通过 SIGCONT 信号恢复执行。
{{< /collapse >}}

{{< collapse summary="**IPC 方式有哪些？**" >}}
- 管道
- 消息队列
- Socket
- 共享内存
- 信号
- 信号量
{{< /collapse >}}

{{< collapse summary="**用户态和内核态的区别，本质上是啥？在什么情况下会发生内核态和用户态的切换？**" >}}
- 本质区别：内核态可以直接操作硬件资源，而用户态需要通过系统调用间接操纵。
- 常见发生场景：执行系统调用时、程序发生异常时、硬件中断时。
{{< /collapse >}}

{{< collapse summary="**零拷贝是什么？**" >}}
- 零拷贝简单来说就是文件内容直接从内核缓冲区传输到 socket 缓冲区，无需经过用户空间，从而提高性能。
- 底层基于 Linux `sendfile()` 系统调用
{{< /collapse >}}

{{< collapse summary="**堆和栈的区别？**" >}}
- 存放内容：栈存放局部变量等信息，而堆存放对象实例等信息；
- 大小：栈较小，且访问速度快，而堆较大，访问速度较慢；
- 生命周期：栈随函数调用结束自动释放，堆需要垃圾回收。
{{< /collapse >}}

## 网络
{{< collapse summary="***访问一个网站背后的过程？**" >}}
1. 首先通过DNS解析，将域名解析为对应的IP地址，解析顺序依次为 “浏览器缓存” → “本地 hosts 文件” → “递归查询（本地 DNS）” → “迭代查询（根→顶级→权威）”；
2. 获取到IP地址后，进行TCP三次握手建立连接；
3. 如果请求的域名是HTTPS的，客户端和服务器还会通过 TLS 握手，服务端会将证书发送给客户端（其中包含公钥），客户端会校验证书的合法性（是否由权威CA签发、是否过期等，有问题的话会在浏览器弹出告警对话框），然后客户端会生成一个对称密钥，用服务端的公钥把对称密钥进行非对称加密，服务端收到后会用私钥解密，后续数据传输都使用这个对称密钥进行；
4. 之后向服务端发送HTTP请求报文，请求报文中包含方法（GET/POST/PUT/DELETE等）、路径、HTTP版本号、首部字段（一组键值对，如 Host、User-Agent、Accept 等  ）、请求体（可选，例如在 POST 请求中携带 JSON 数据）；
5. 服务端收到后，返回HTTP响应报文，其中包含版本号、状态码、短语、首部字段（Content-Type、Server等）、空行、数据实体；
{{< /collapse >}}

{{< collapse summary="***GET 和 POST 的区别？**" >}}
1. 用途：GET 表示向服务器获取数据，POST 用于向服务器发送数据。
2. 数据存放位置：GET 数据存储在 URL 中，POST 数据放在请求体（Request Body）中。
3. 幂等性：GET 幂等（多次请求结果相同），POST 非幂等（多次请求结果不同）。
4. 能否被缓存：GET 可被浏览器缓存，POST 不会被浏览器缓存。
{{< /collapse >}}

{{< collapse summary="***TCP三次握手的过程？**" >}}
- 第一次握手（SYN）：客户端向服务器发送一个 SYN。此时，客户端进入 SYN_SENT 状态；
- 第二次握手（SYN-ACK）：服务器收到客户端的 SYN 报文后，会发送一个 SYN-ACK（同步确认）报文段作为响应。此时，服务器进入 SYN_RCVD 状态；
- 第三次握手（ACK）：客户端收到服务器的 SYN-ACK 报文后，发送一个 ACK（确认）报文段作为最终确认。此时，客户端进入 ESTABLISHED 状态。服务器收到客户端的 ACK 后也进入 ESTABLISHED 状态，连接正式建立。
{{< /collapse >}}

{{< collapse summary="***TCP和UDP的区别？**" >}}
- 连接与可靠性：TCP是面向连接的，会通过三次握手、流量和拥塞控制、重传等机制使传输更可靠  ；而UDP仅提供最基本的数据传输能力，只管发送，不管对方是否收到。
- 传输速度：UDP要高于TCP。
- 通信方式：TCP 仅支持一对一通信（四元组唯一标识连接）；UDP支持一对一、一对多的方式通信。
- 应用场景：TCP 适合下载文件等对数据传输可靠性要求高的场景；而 UDP 更多的用于在线视频、语音等对数据实时传输效率要求高的场景，像 DNS、DHCP 协议是基于 UDP 的。
{{< /collapse >}}

{{< collapse summary="***OSI七层模型指的是哪几层？分别有什么协议？**" >}}
1. 物理层，负责传输比特流（0和1）；
2. 数据链路层，负责在同一局域网内通过 MAC 地址传输数据帧，相关协议有：IEEE 802.1Q（以太网 VLAN 标签协议）、STP/RSTP/MSTP（生成树协议）、PPP（点对点链路协议）等；
3. 网络层，通过 IP 和路由实现跨网络的数据传输。相关协议有：IP、ICMP、ARP（IP 地址解析为 MAC 地址）、OSPF/RIP/BGP（动态路由选择协议）等；
4. 传输层，定义数据的传输方式，主要标识为端口号，相关协议有 TCP（可靠、面向连接）、UDP（不可靠、无连接）等；
5. 会话层，建立、管理和终止会话；
6. 表示层，数据表现形式（格式、加密、压缩等）；
7. 应用层，具体的应用服务，相关协议有 HTTP、HTTPS、FTP、SMTP、POP3、IMAP、DNS、Telnet、SNMP 等。
{{< /collapse >}}

{{< collapse summary="***三次握手四次挥手有几个状态？**" >}}
连接建立阶段（三次握手）：
1. LISTEN 服务器监听客户端请求。
2. SYN-SENT 客户端发送 SYN，等待服务器回应。
3. SYN-RECEIVED 服务器收到 SYN 并回应 SYN+ACK，等待客户端 ACK。
4. ESTABLISHED 三次握手完成，连接建立成功。

连接释放阶段（四次挥手）：
1. FIN-WAIT-1 主动关闭端发送 FIN。
2. FIN-WAIT-2 对方确认 FIN，等待对方发送 FIN。
3. CLOSE-WAIT 被动关闭端收到 FIN，等待应用层关闭连接。
4. CLOSING 双方几乎同时发送 FIN。
5. LAST-ACK	被动关闭端发送 FIN，等待 ACK。
6. TIME-WAIT 主动关闭端等待 2MSL 后真正关闭。
{{< /collapse >}}

{{< collapse summary="***TIME-WAIT 会出现在连接的哪一方？**" >}}
- 客户端和服务端都有可能出现，但一般是在客户端。
{{< /collapse >}}

{{< collapse summary="***静态路由与动态路由的区别？**" >}}
| 对比维度| 静态路由       |  动态路由 |
| -------  | ------------- |  -------------  |
| `配置方式`| 手动配置  |   自动学习   |
| `可扩展性`| 差，仅适用于小型网络 |  好，适合大型复杂网络  |
| `CPU/带宽开销	`| 极低   |  较高（需周期性交换路由信息）  |
| `安全性`  | 高（不易被外部影响） |  相对较低（可能受攻击伪造LSA）  |
| `依赖协议` |  无       |  OSPF、RIP、BGP等  |
{{< /collapse >}}

{{< collapse summary="**DNS 解析流程？**" >}}
将域名解析为对应的IP地址，解析顺序依次为 “浏览器缓存” → “本地 hosts 文件” → “递归查询（本地 DNS）” → “迭代查询（根→顶级域→权威）
- 递归查询：假设宿主机的 DNS 服务器指向了 223.5.5.5（阿里云DNS），本机向这个 DNS 服务器发起的查询就是递归查询。
- 迭代查询：这个DNS服务器（223.5.5.5），如果没有命中缓存，它会向根服务器（返回 .com 的 DNS 地址）、顶级域服务器（返回 baidu.com 的 DNS 地址）、权威服务器（返回 www.baidu.com 的 IP）发起的查询，就叫迭代查询。

DNS相关的测试工具有 dig、nslookup
{{< /collapse >}}

{{< collapse summary="**以太网帧结构？**" >}}
帧就是给网络层传来的 IP 数据包（相当于快递里的物品），加上 “头部” 和 “尾部” 包装，形成的一个完整传输单元。头部里装着接收方的 MAC 地址（相当于收件人地址）、发送方的 MAC 地址（相当于寄件人地址），尾部则负责校验数据是否损坏。
| 字段名称            | 作用（类比快递）                        | 长度（参考） |
| ------------------- | --------------------------------------- | ------------ |
| 前导码（Preamble）  | 告诉接收设备 “准备接收数据”             | 7 字节       |
| 帧起始定界符（SFD） | 标记帧的正式开始                        | 1 字节       |
| 目的 MAC 地址       | 接收设备的 “硬件地址”                   | 6 字节       |
| 源 MAC 地址         | 发送设备的 “硬件地址”                   | 6 字节       |
| 类型 / 长度字段     | 说明帧内包裹的 “数据类型”（如 IP 数据） | 2 字节       |
| 数据字段            | 真正要传的内容（即 IP 数据包）          | 46-1500 字节 |
| 帧校验序列（FCS）   | 检查数据在传输中是否损坏                | 4 字节       |
{{< /collapse >}}

{{< collapse summary="**常见服务的端口号**" >}}
- 未特别说明的，均为TCP，但有些服务，既支持UDP，又支持TCP
| Port     | Service       |
| -------  | ------------- |
| `20`     | ftp-data      |
| `21`     | ftp           |
| `22`     | ssh           |
| `23`     | telnet        |
| `25`     | smtp          |
| `53/udp` | dns           |
| `67/udp` | dhcp          |
| `68/udp` | dhcp-client   |
| `69/udp` | tftp          |
| `80`     | http          |
| `110`    | pop3          |
| `119`    | nntp          |
| `123/udp`| ntp           |
| `443`    | https         |
| `465`    | smtps         |
| `514/udp`| syslog        |
| `873`    | rsync         |
| `995`    | pop3s         |
| `1521`   | oracle        |
| `2049`   | nfs           |
| `3306`   | mysql         |
| `3389`   | rdp           |
| `5432`   | postgresql    |
| `5672`   | RabbitMQ      |
| `6379`   | redis         |
| `8080`   | tomcat        |
| `9092`   | Kafka         |
| `9200`   | elasticsearch |
| `11211`  | memcached     |
{{< /collapse >}}

**实践场景：**
{{< collapse summary="***网络丢包如何排查？**" >}}
1. 先从不同的客户端 ping 服务端，排除客户端的问题。如果所有客户端都丢包，看客户端和服务端是否位于同一网段。

2. 位于同一网段，排查二层网络，排查内容包括：
    - 分别在客户端和服务端执行 `watch 'ip n | grep 172.16.30.65'` 排查 arp 表中的 mac 地址是否和目标相符、arp 缓存是否频繁失效（频繁变为 STALE 或 FAILED）
    - 分别在客户端和服务端执行 `tcpdump -i ens160 -nn 'host 172.16.30.65 and (arp or icmp)'` 查看 arp 和 icmp 报文的请求和响应是否正常

3. 不在同一网段，排查三层网络，最简单的方式，可以使用 `mtr -n 172.16.30.65`（icmp） 或 `mtr -n --tcp -p 22 -r -c 10 101.201.46.185` 查看具体是到哪一跳丢包了
    - 如果是中间的某一跳丢包，排查该跳的网络设备是否正常，如交换机、路由器等
    - 如果是最后一跳丢包，排查服务端是否正常，一般使用 `ethtool -S <网卡接口名> | grep -E 'drop|error'` 查看是否有大量的 rx_dropped (接收丢弃), tx_dropped (发送丢弃) 或 CRC 校验错误。还可以使用 `dmesg -T | grep -E 'drop|error'` 查看是否有其他错误信息。

4. 还可以使用 `tcpdump` 导出 pcap 包，通过 wireshark 等工具分析，重点看 TCP 的 Retransmission（重传）、Out-of-Order（乱序），或者是否有异常的 RST 包。
{{< /collapse >}}

{{< collapse summary="***网络中服务慢怎么排查，具体到链路之间呢？**" >}}
1. 从不同客户端访问服务，先判断是客户端慢还是服务端慢，如果是服务端慢，可以从应用层到网络层依次排查；
2. 应用层排查内容：看监控，包括服务运行运行节点的负载、CPU、内存使用率、应用日志、数据库慢查询日志等，如果都没问题，则从网络层排查；
3. 网络层排查内容：看具体的拓扑，比如从 防火墙 -> 负载均衡 -> 应用 -> 数据库 等依次排查，再配合一些工具，比如：
    - mtr 查看路由延迟，判断是否有丢包
    - ping 查看延迟、是否丢包
    - traceroute 查看路由延迟
    - tcpdump 抓包看有没有异常报文
    - ss -s 查看 socket 信息，例如 TIME_WAIT 是否过多
    - 结合监控大盘，或云厂商的VPC流日志排查
{{< /collapse >}}

{{< collapse summary="***主机网络不通，如何排查？**" >}}
1. 先看 IP 地址、掩码、网关是否配置正确，网卡、网线是否工作正常，如果没问题，看与目标主机是否在同一网段； 
2. 位于同一网段，排查二层网络，可以使用 `ip n` 命令查看 arp 表中的 IP 与 Mac 是否映射正确（如果不对可能是 IP 冲突），防火墙是否有限制；
3. 不在同一网段，排查三层网络，可以先 ping 网关，看看到网关通不通，如果网关通，再使用 `mtr`、`traceroute` 查看具体是到哪一跳丢包了；
4. 还可以使用 `tcpdump` 抓包分析流量。
{{< /collapse >}}

{{< collapse summary="***程序上线后，服务器出现了很多 time_wait 的连接状态，原因是什么？如何解决？**" >}}
这种情况的原因是：服务器作为主动断开连接的一方，频繁地在关闭大量短连接（ TCP 四次挥手中，只有主动发起 FIN 包的那一端，才会进入 TIME_WAIT 状态）

这个情况，可以先执行 `ss -ntap`，查看是哪些端口产生的 TIME-WAIT 状态的连接，有两种场景：
1. 服务器作为 Client 端，频繁调用下游的 MySQL、Redis 或其他 HTTP API，但没有使用连接池，每次请求完都主动断开。
2. 服务器作为 Server 端，但没有开启 keepalive 长连接（包括前端和后端），或最大请求数设置得太小。
```conf
http {
    # 1. 前端长连接配置
    keepalive_timeout  60s; # 前端长连接超时时间，单位秒。
    keepalive_requests 10000; # 一个 TCP 长连接上最多能处理多少个 HTTP 请求。

    upstream my_backend {
        server 10.0.0.1:8080;
        server 10.0.0.2:8080;
        
        # 2. 后端长连接池，每个 worker 保留 300 个空闲连接
        keepalive 300; # 每个 Nginx Worker 进程与后端服务保持的“最大空闲连接池大小”。
        keepalive_timeout 60s; # 后端长连接超时时间，单位秒。
        keepalive_requests 10000; # 一个 TCP 长连接上最多能处理多少个 HTTP 请求。
    }

    server {
        listen 80;
        location /api/ {
            proxy_pass http://my_backend;
            
            # 3. 核心避坑：开启 HTTP/1.1 并清空 Connection 头
            proxy_http_version 1.1;
            proxy_set_header Connection "";
        }
    }
}
```
{{< /collapse >}}

{{< collapse summary="***DNS解析缓慢如何排查？**" >}}
1. 使用 `dig` 命令，分别选择默认DNS（`dig baidu.com`）、 其他DNS（`dig @223.5.5.5 baidu.com`）解析测试，将两者的解析耗时进行对比（观察 Query time 字段），确定是否是 DNS 解析慢；
    - 如果仅默认 DNS 解析慢，说明本机指向的 DNS 服务器有问题，可以尝试换 DNS，如果是自己搭建的内网 DNS 服务器，可以登录查看其CPU/内存使用率、负载、日志有无报错；
    - 如果更换 DNS IP 还是慢，说明是网络有问题，使用 `mtr --udp -p 53 <DNS_IP>` 观察路径。DNS 使用 UDP，链路稍微丢包就会触发客户端的超时重试，感官上就是“解析慢”。
{{< /collapse >}}

{{< collapse summary="**172.16.0.120/18 和 172.16.30.65/18 受否在同一网段？**" >}}
1. 确定子网掩码：它们的子网掩码都是 /18，这表示子网掩码中有 18 个连续的 1，即子网掩码为 255.255.192.0
    - 补充：子网掩码中，连续的 1 是网络位，末尾连续的 0 是主机位
2. 计算网络地址：将 IP 地址和子网掩码进行位逻辑与运算（都是 1 时，结果位才是 1。只要有一个是 0，结果就是 0。）。
```sh
# 172.16.0.120/18
# IP 地址 (二进制)	
10101100.00010000.00000000.01111000
# 掩码 (二进制)	
11111111.11111111.11000000.00000000
# 逻辑与结果 (网络地址)
10101100.00010000.00000000.00000000 # 网络地址为 172.16.0.0


# 172.16.30.65/18
# IP 地址 (二进制)	
10101100.00010000.00011110.01000001
# 掩码 (二进制)	
11111111.11111111.11000000.00000000
# 逻辑与结果 (网络地址)
10101100.00010000.00000000.00000000 # 网络地址为 172.16.0.0
```
3. 因为它们的网络地址相同，所以 172.16.0.120/18 和 172.16.30.65/18 在同一个网段内。
{{< /collapse >}}

## Linux
{{< collapse summary="***ext4 和 xfs 文件系统的区别？**" >}}
- ext4 稳定性、兼容性比较好
- xfs 性能比较好，擅长处理大文件和高并发场景
- inode 的管理方式不同，ext4 是预先分配，xfs 是动态、按需分配
{{< /collapse >}}

{{< collapse summary="***du -sh /data 和 df -h /data 看到的数据大小一样吗？**" >}}
不一样，`du -sh /data` 看到的是目录或文件大小，而 `df -h /data` 看到的是分区大小。
{{< /collapse >}}

{{< collapse summary="***free -h 会输出哪些内容？ buff/cache 的区别？**" >}}
- total：内存总量
- used：内存使用量
- free：空闲内存
- shared：共享内存量
- buff/cache：
    - buff 负责写缓冲，提高写入效率。
        - 它主要作为数据的暂存区，将零散的写入请求集中起来，然后一次性、批量地写入磁盘。这种批量操作减少了对磁盘I/O的次数，从而提高了系统的写入效率。
    - cache 负责读缓存，提高读取速度。
        - 它缓存了从磁盘读取过的数据。当程序需要再次读取相同数据时，可以直接从速度快得多的内存中获取（称为缓存命中），而无需再次访问慢速的磁盘，从而显著提高了读取速度。
- available：实际可用内存，available ≈ free + 可回收的 buff/cache（因为 buff/cache 所占用的空间可被释放，用于其他程序运行）
- Swap：将磁盘空间临时充当内存来使用，性能很差，通常建议关闭。
{{< /collapse >}}

{{< collapse summary="**Linux 系统启动流程是怎样的？**" >}}
1. BIOS/UEFI 加电自检，检查 CPU、内存、硬盘、网卡等硬件是否正常；
2. 加载 Bootloader（GRUB），包含内核镜像（vmlinuz）和 initramfs（临时根文件系统）；
3. 内核初始化，内核解压缩并加载到内存、初始化硬件驱动（存储、网络、文件系统等）、启动第一个用户空间进程（systemd）；
4. 根据 /etc/fstab 挂载磁盘分区；
5. 启动系统服务（syslog、network、sshd）和用户空间服务（nginx、docker...）；
6. 最后进入 ssh 登录界面。
{{< /collapse >}}

{{< collapse summary="**如何排查一台 Linux 服务器的负载过高问题？**" >}}
1. 首先应该确定负载是否真的过高：
    - 使用 w、uptime 等命令查看，平均负载 > CPU核心数 = 高（CPU 和 IO 的排队时间）
    - 其次还要看 1 分钟、5 分钟、15 分钟的平均负载（load average），如果 1 分钟的平均负载偏高，有可能是瞬时的，可以继续观察，如果如果 15 分钟的平均负载也高，则需要继续排查
2. 如果确定负载过高，定位进程和线程以及状态：
    - 使用 top 命令，按大写的 P 按 CPU 使用率排序，找出占用 CPU 最高的进程 PID
    - 观察是用户态（us）、内核态（sy）、等待 IO（wa）、空闲（id）等状态，查看是哪个指标偏高
3. 具体分析：
    - 纯 CPU 使用率高（us / sy 高）：用 `top -H -p <PID>` 找出具体是哪个线程。
        - 如果是 Java 程序，可以把线程 ID 转换为十六进制，然后使用 jstack 分析，例如 `jstack <PID> | grep -A 100 0x<线程ID>`。
        - 如果是 C/Go 程序，可以使用 `perf top -p <PID>`分析。
    - I/O 等待导致负载高（wa 高，大量 D 状态进程）：`iostat -x 1` 看磁盘的 `%util`（使用率）是否过高，或者用 `iotop` 直接看是哪个进程在疯狂读写磁盘。
    - 内存 Swap 引发的假性 I/O 高：用 `free -m` 或 `vmstat 1`。如果发现物理内存快用光了，且 Swap 的 si/so 交换极其频繁，说明程序发生内存泄漏，或宿主机内存达到瓶颈需要扩容。
{{< /collapse >}}

{{< collapse summary="**请解释 top 命令输出中 load average 的含义。**" >}}
- top 的 load average 表示在过去 1、5、15 分钟内，系统中处于**运行态**和**不可中断睡眠态**的进程的平均数量；
    - 运行态 (R) → 正在使用 CPU 或等待 CPU 的进程。
    - 不可中断睡眠态 (D) → 一般是等待 I/O（如磁盘或网络）的进程的平均数量。
- 是否算高要结合 CPU 核心数来看，正常应该 load < CPU 核数，例如1核CPU的负载应小于1.0、8核CPU的负载应小于8.0。
- 通常当 load 达到 CPU 核数的 0.7 ~ 0.8 倍时（如 4 核机器 load 达到 3.0），系统就已经缺乏缓冲余地，需要触发告警排查。
- 若 1 分钟高但 15 分钟正常，多为瞬时抖动；若 15 分钟的平均值也居高不下，说明系统存在持续的性能瓶颈。
{{< /collapse >}}

{{< collapse summary="**如何查看和分析内存使用情况？**" >}}
- free -h 查看内存和SWAP的总体使用情况
- 还可以使用 top 命令 + M 按内存使用率排序
    - 注意区分进程的 VIRT（虚拟内存，不代表真实占用）和 RES（常驻内存，进程真正吃掉的物理内存）。
- 如果发现业务进程突然消失，大概率是被内核的 OOM Killer 杀掉了。使用 `dmesg -T | grep -i oom` 查看具体的 OOM 信息。
{{< /collapse >}}

{{< collapse summary="**硬盘空间满了你会如何排查？**" >}}
定位：
1. 先使用 `df -h` 查看是哪块磁盘满了，以及对应的挂载点；
2. 然后使用 `du -sh /挂载点/*`，逐级定位是哪个目录或者文件占用空间大，也可以使用`find / -xdev -type f -size +1G` 搜索大于指定大小的文件；

解决方案：
1. 如果是日志等无用的文件，可以先使用`>文件名`立即释放磁盘空间，持久解决方案可以选择使用逻辑卷扩展。其他的优化手段，比如减少程序的日志写入量等；

其他场景：
1. df -h 显示磁盘还有剩余，但程序依然报错 No space left on device。使用 df -i 查看 Inode 使用率。如果达 100%，通常是因为目录下产生了数百万个极小的碎文件（如定时任务发往本地的碎邮件、Session 文件等）。找出该目录并清理。
2. df -h 显示磁盘 100%，但用 du -sh 把所有目录加起来却发现根本没那么大。这是因为某个大文件被执行了 rm 删除，但依然有运行中的进程（如 Java 或 Nginx）持有它的文件描述符（FD）。使用 lsof | grep deleted 找出持有该文件的进程 PID，将进程 kill 掉或平滑重启服务后，空间才会真正释放给操作系统。
{{< /collapse >}}

{{< collapse summary="***磁盘空间还有，但数据无法写入是什么原因？**" >}}
- inode 用尽，可以使用 df -i 检查；
- 文件系统只读，可以使用 mount  | grep 挂载点 检查，ro 表示只读，rw 读写；
- 用户没有写权限。
- 设置了隐藏属性，需要使用 `lsattr 文件名` 检查是否带有 i 或 a 属性；若有，必须用 `chattr -i` 或 `chattr -a` 解除限制后才能写入。
{{< /collapse >}}

{{< collapse summary="**删除文件后，磁盘空间并未释放，为什么？**" >}}
- 是因为这个文件的 inode 仍然被其他进程持有，可以使用 `lsof | grep 文件名` 定位到进程后重启进程。
{{< /collapse >}}

{{< collapse summary="**你如何查看某个进程打开了哪些文件？**" >}}
- 可以使用 `lsof -p <PID>` 查看进程打开的所有文件。
{{< /collapse >}}

{{< collapse summary="**软链接和硬链接的区别？**" >}}
- 软连接相当于Windows下的快捷键方式，而硬链接本质上是同一个文件；
- 软连接与源文件的 inode 不同，而硬链接与源文件的 inode 是相同的；
- 软链接可跨分区，硬链接不可以；
- 源文件删除，软链接不可访问，硬链接可以；
- 软链接可以对文件、目录创建，而硬链接只能针对文件。
{{< /collapse >}}

{{< collapse summary="**你如何限制某个用户的资源使用（CPU、内存等）？**" >}}
- 可以用 ulimit 限制用户的 CPU 时间、内存、进程数和打开文件数；更精细的可以用 cgroups 限制 CPU、内存、IO；如果是 systemd 管理的服务，也可以在 service 文件里配置 CPUQuota 和 MemoryMax。
{{< /collapse >}}

{{< collapse summary="**什么是文件描述符？如何查看和调整目前文件描述符的限制量？**" >}}
- 文件描述符是一个非负整数，用于标识进程打开的文件或 I/O 资源（包括普通文件、目录、设备、管道、socket 等）。
- 查看进程打开的文件描述符，有两种方案，一种是 `ls -l /proc/<pid>/fd`，另一种是 `lsof -p <pid>`。在较新的系统中，比如 Ubuntu 2404，还可以使用 `lsfd` 命令查看。
- 如果程序打开文件过多导致 "too many open files" 错误，可以通过 ulimit 临时调整上限，或编辑 /etc/security/limits.conf 永久修改。
    - 临时查看进程能打开的文件描述符上限：`ulimit -n`
    - `/etc/security/limits.conf` 中的软/硬限制含义：硬限制（hard）表示最高能开多高，软限制（soft）当前用户可调整的数量，但不能超过硬限制。
{{< /collapse >}}

{{< collapse summary="**Linux 系统级优化你做过哪些？**" >}}
- apt/yum 源指向内部仓库或国内镜像站。
- 修改打开文件描述符的最大数量（/etc/security/limits.conf 文件），通常软硬限制都设置为 65535。
- 时间同步，ntp源指向内部或国内NTP服务器。
- 服务器多 CPU 场景下，调整 NUMA node ，让 CPU 优先访问本地内存，以避免跨 NUMA 节点的远程内存访问带来的延迟损耗。
    - 一般通过 BIOS/UEFI 配置调整。
    - 假设服务器 2 个 CPU，每个 8 核，512 GB 内存。CPU 0-7 属于 node 0，CPU 8-15 属于 node 1，给每个 NUMA 节点 256 GB 内存。
    - 可以用 `numactl -H`、`numastat -m`、`lscpu` 查看目前 NUMA 分配情况。
- 关闭 Swap、SELinux
{{< /collapse >}}

**实践场景：**
{{< collapse summary="**CPU 使用率高如何排查？**" >}}
1. 使用 top 命令，按大写的 P 按 CPU 使用率排序，找出占用 CPU 最高的进程 PID
2. 执行 `top -H -p <PID>` 定位这个进程中哪个线程占用 CPU 高
3. 如果是 Java 进程，可以把线程 ID 转换为十六进制，然后使用 jstack 查看线程状态，例如 `jstack <PID> | grep -A 100 0x<线程ID>`。
{{< /collapse >}}


{{< collapse summary="**如果一个磁盘目前使用率是99%，该怎么去止损和解决问题？**" >}}
1. 首先，磁盘使用率达到99%说明有可能马上或已经影响服务的正常运行，当务之急应该先找到无用的大文件进行删除，让磁盘空间腾出地方，保证服务不受影响；
    - 无用文件包括镜像构建时的缓存、旧的日志等。像文件类型的文件，可以优先使用大于号＞，即标准输入重定向将其置为空，以防文件被其他进程占用，而导致磁盘空间无法立刻得到释放；
2. 后续排查阶段，可以使用`du -sh /挂载点/*`，逐级定位是哪个目录或者文件占用空间大，也可以使用`find / -xdev -type f -size +1G` 搜索大于指定大小的文件，排查磁盘空间满的原因；
    - 是程序日志打印多了？还是磁盘空间应该扩容了？前者减少日志打印，例如关闭debug、后者可以使用LVM扩容。
{{< /collapse >}}

{{< collapse summary="**如果发现某个进程占用的内存很高，该如何排查来解决这个问题？**" >}}
1. `free -h` 查看整体内存使用
2. `top + 大写M` 找出占用内存最多的进程
3. 通过查看日志、并结合一些工具进行排查Java（jmap、jstack）、Python（objgraph）。常见原因：
    - 内存泄漏，程序不断申请内存但不释放。
    - 缓存/数据积累，程序大量缓存数据或加载大文件。
    - 外部依赖问题，数据库连接、线程池、队列（消息积压）等未正确释放。
4. 如果内存剩余空间非常少，已经快要影响程序运行，可以先将程序重启，但不是根本解决方案
{{< /collapse >}}

{{< collapse summary="**如何查看服务器防火墙状态？**" >}}
不同系统所使用的防火墙工具不同，如 CentOS 系使用 firewalld，Ubuntu 系使用 UFW，但本质上都是基于 iptables
- firewall-cmd --list-all
- ufw status
- iptables -vnL
{{< /collapse >}}

## SQL
{{< collapse summary="**SQL语句执行过程？**" >}}
1. 客户端（如 Navicat 或 JDBC）发送 SQL 请求时，服务端进行TCP连接、校验用户名密码；
2. 查询缓存（MySQL 8.0 之后 已移除查询缓存，因为维护缓存反而降低性能。）；
3. 解析器检查 SQL 语法；
4. 预处理器检查表是否存在、字段是否存在等；
5. 执行器发起查询，查找索引（如果存在），以及对应值；
    - 如果是 MySQL，B+tree索引，还会根据其左前缀索引特性，从根节点、枝节点依次发起查询，最终从叶子节点获取数据。
6. 最后，数据库把结果数据发送给客户端。
{{< /collapse >}}

### 笔试
```sql
SELECT 列名或表达式               -- 选择要查询的列或计算结果
FROM 表名                         -- 指定要查询的数据表
WHERE 条件                        -- （可选）过滤行：先筛选出满足条件的记录
GROUP BY 分组列                   -- （可选）按某些列对结果进行分组
HAVING 分组条件                   -- （可选）过滤分组：筛选满足条件的分组（作用于聚合结果）
ORDER BY 列名 [ASC|DESC]          -- （可选）对结果排序：ASC升序（默认），DESC降序
LIMIT 数量 [OFFSET 起始位置]       -- （可选）限制返回的结果行数（分页或取前N条）
```

{{< collapse summary="**练习表**" >}}
- 在数据库中执行该sql语句，创建练习表
```sql
-- 创建测试数据库
CREATE DATABASE IF NOT EXISTS test;

-- 使用该数据库
USE test;

-- 创建部门表
CREATE TABLE departments (
    department_id INT PRIMARY KEY,
    department_name VARCHAR(100) NOT NULL
);

-- 插入部门数据
INSERT INTO departments VALUES
(1, 'Engineering'),
(2, 'Human Resources'),
(3, 'Marketing'),
(4, 'Finance');

-- 创建员工表
CREATE TABLE employees (
    employee_id INT PRIMARY KEY,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    gender CHAR(1),
    hire_date DATE,
    department_id INT,
    FOREIGN KEY (department_id) REFERENCES departments(department_id)
);

-- 插入员工数据
INSERT INTO employees VALUES
(101, 'Alice', 'Smith', 'F', '2015-03-01', 1),
(102, 'Bob', 'Johnson', 'M', '2017-07-15', 1),
(103, 'Carol', 'Williams', 'F', '2019-01-10', 2),
(104, 'David', 'Brown', 'M', '2018-11-23', 3),
(105, 'Eve', 'Davis', 'F', '2020-06-17', 4);

-- 创建薪资表
CREATE TABLE salaries (
    salary_id INT PRIMARY KEY,
    employee_id INT,
    salary DECIMAL(10,2),
    from_date DATE,
    to_date DATE,
    FOREIGN KEY (employee_id) REFERENCES employees(employee_id)
);

-- 插入薪资数据
INSERT INTO salaries VALUES
(1, 101, 80000, '2020-01-01', '2021-12-31'),
(2, 101, 85000, '2022-01-01', '9999-12-31'),
(3, 102, 75000, '2019-01-01', '9999-12-31'),
(4, 103, 60000, '2019-01-10', '9999-12-31'),
(5, 104, 72000, '2018-11-23', '9999-12-31'),
(6, 105, 68000, '2020-06-17', '9999-12-31');

-- 创建项目表
CREATE TABLE projects (
    project_id INT PRIMARY KEY,
    project_name VARCHAR(100),
    start_date DATE,
    end_date DATE
);

-- 插入项目数据
INSERT INTO projects VALUES
(1, 'Project Apollo', '2021-01-01', '2021-12-31'),
(2, 'Project Zephyr', '2022-03-01', NULL),
(3, 'Project Orion', '2020-06-01', '2021-06-30');

-- 创建员工-项目关系表（多对多）
CREATE TABLE employee_projects (
    employee_id INT,
    project_id INT,
    role VARCHAR(50),
    PRIMARY KEY (employee_id, project_id),
    FOREIGN KEY (employee_id) REFERENCES employees(employee_id),
    FOREIGN KEY (project_id) REFERENCES projects(project_id)
);

-- 插入员工项目关系数据
INSERT INTO employee_projects VALUES
(101, 1, 'Developer'),
(101, 2, 'Lead Developer'),
(102, 1, 'Tester'),
(103, 2, 'HR Manager'),
(104, 3, 'Marketing Lead'),
(105, 2, 'Accountant');
```
{{< /collapse >}}

{{< collapse summary="**练习题 1：查询所有员工的姓名及其所在部门名称**" >}}
- 查询每位员工的 first_name、last_name 和其对应的 department_name。
- 提示：内连接（INNER JOIN）
```sql
SELECT e.first_name, e.last_name, d.department_name
FROM employees e
JOIN departments d ON e.department_id = d.department_id;
```
- `SELECT e.first_name, e.last_name, d.department_name` 指定要查询的列，来自员工表 e 的 first_name、last_name，以及来自部门表 d 的 department_name。
- `FROM employees e` 指定主表是 employees，并给它起一个别名 e（简化书写）。
- `JOIN departments d` 使用 内连接（INNER JOIN，INNER 可省略） 把员工表和部门表连接起来。departments 起别名为 d。
- `ON e.department_id = d.department_id` 指定连接条件，员工表中的 department_id 必须和部门表中的 department_id 相匹配。

PS：
如果有员工暂时没有部门（department_id 为 NULL 或未匹配），则不会出现在结果中。如果希望“即使没部门也显示员工”，可以用 LEFT JOIN（左外连接），它会保留左表（FROM 后面的表）中的所有记录，LEFT JOIN 后面表匹配不到则显示 NULL：`SELECT e.first_name, e.last_name, d.department_name FROM employees e LEFT JOIN departments d ON e.department_id = d.department_id;`
{{< /collapse >}}

{{< collapse summary="**练习题 2：查询当前薪资最高的员工信息**" >}}
- 找出当前薪资（to_date = '9999-12-31'）最高的员工的姓名和薪资。
```sql
SELECT e.first_name, e.last_name, s.salary
FROM salaries s
JOIN employees e ON s.employee_id = e.employee_id
WHERE s.to_date = '9999-12-31'
ORDER BY s.salary DESC
LIMIT 1;
```
{{< /collapse >}}

{{< collapse summary="**练习题 3：统计每个部门员工的平均薪资**" >}}
```sql
SELECT d.department_name, AVG(s.salary) AS average_salary
FROM employees e
JOIN departments d ON e.department_id = d.department_id
JOIN salaries s ON e.employee_id = s.employee_id
WHERE s.to_date = '9999-12-31'
GROUP BY d.department_name;
```
- GROUP BY 是用来聚合数据的。没有 GROUP BY，SQL 只能对整张表做汇总；有了 GROUP BY，SQL 可以对“每个部门”“每个性别”“每年”等进行单独统计。
- 只要你在 SELECT 中用了 聚合函数（aggregate functions），就可能需要 GROUP BY。
{{< /collapse >}}

{{< collapse summary="**练习题 4：列出参与了“Project Zephyr”的员工及其角色**" >}}
```sql
SELECT e.first_name, e.last_name, ep.role
FROM employee_projects ep
JOIN employees e ON ep.employee_id = e.employee_id
JOIN projects p ON ep.project_id = p.project_id
WHERE p.project_name = 'Project Zephyr';
```
{{< /collapse >}}

{{< collapse summary="**练习题 5：查询至少参与了两个项目的员工**" >}}
- 列出参与两个或以上项目的员工的姓名和项目数量。
```sql
SELECT e.first_name, e.last_name, COUNT(ep.project_id) AS project_count
FROM employee_projects ep
JOIN employees e ON ep.employee_id = e.employee_id
GROUP BY e.employee_id
HAVING COUNT(ep.project_id) >= 2;
```
{{< /collapse >}}

{{< collapse summary="**练习题 6：查询“Engineering”部门的所有员工当前薪资**" >}}
- 显示 Engineering 部门所有员工的姓名及其当前薪资。
```sql
SELECT e.first_name, e.last_name, s.salary
FROM employees e
JOIN departments d ON e.department_id = d.department_id
JOIN salaries s ON e.employee_id = s.employee_id
WHERE d.department_name = 'Engineering'
  AND s.to_date = '9999-12-31';
```
{{< /collapse >}}

{{< collapse summary="**练习题 7：查询所有项目的负责人（Lead Developer 或 Manager）**" >}}
- 列出所有项目的名称、员工姓名及他们担任的领导角色（如包含“Lead”或“Manager”的角色）。
```sql
SELECT p.project_name, e.first_name, e.last_name, ep.role
FROM employee_projects ep
JOIN employees e ON ep.employee_id = e.employee_id
JOIN projects p ON ep.project_id = p.project_id
WHERE ep.role LIKE '%Lead%' OR ep.role LIKE '%Manager%';
```
{{< /collapse >}}

{{< collapse summary="**练习题 8：查询未参与任何项目的员工**" >}}
- 列出没有参与任何项目的员工。
```sql
SELECT e.first_name, e.last_name
FROM employees e
LEFT JOIN employee_projects ep ON e.employee_id = ep.employee_id
WHERE ep.project_id IS NULL;
```
{{< /collapse >}}

**实践场景：**
{{< collapse summary="**如何修改表中某行某字段值？**" >}}
1. 最安全的方式其实是使用事务，`BEGIN;`开启事务，然后用 SELECT 查看要修改的范围是否符合预期 `SELECT * from employees WHERE employee_id='101';`
2. 使用 UPDATE 更新内容 `UPDATE employees SET first_name='Azheng' WHERE employee_id='101';`
    - 注意：更新表时一定要加 WHERE，否则可能会导致全表修改。
3. 发现修改错误后使用`ROLLBACK;`撤销，无误后使用`COMMIT;`提交。
{{< /collapse >}}

{{< collapse summary="**内连接和外连接是什么？**" >}}
1. 内连接（INNER JOIN）相当于取两张或多张表的交集。
2. 外连接分为左外连接（LEFT JOIN）、右外连接（RIGHT JOIN）、完全外连接（FULL JOIN）。
    - 左外连接保留左表全部内容，右表未匹配的显示为NULL
    - 右外连接保留右表全部内容，左表未匹配的显示为NULL
    - 完全外连接会将左右不匹配的行全显示出来，并置为NULL（MySQL不支持）
3. 还有一种是自连接，相当于把一张表想象成两张表进行查询。
{{< /collapse >}}


## 监控与告警
{{< collapse summary="***Prometheus 服务发现和 relabel 原理？**" >}}
第一阶段（抓取哪些服务）：取决于服务发现类型，常见的有基于 K8s 的、基于文件、基于 consul 的等：
- kubernetes_sd：通过监听 Kubernetes API Server，获取 node、service、pod、endpoints、endpointslice、ingress 的信息。
- file_sd：监听文件变化，动态发现新的目标。

第二阶段（抓取服务中的哪些指标）：向 Target 发起 pull 请求，获取指标数据。

第三阶段（保留指标中的哪些数据）：向 Target 发起 pull 请求，获取指标数据。


发现到目标后，会进行两个操作，relabel 和 metric_relabel。
- relabel 决定抓取哪些目标（Target）
- metric_relabel 对抓取到的指标进行标签处理，例如保留（Keep）、丢弃（Drop）、重写（Replace）等。
    - 过滤（Drop/Keep）：比如只保留带有 prometheus.io/scrape: "true" 注解的 Pod，把其他的直接丢弃。
    - 重写（Replace）：将底层长串的元数据标签（如 __meta_kubernetes_pod_name）转换为更友好的业务标签（如 pod_name）。
{{< /collapse >}}

{{< collapse summary="***Prometheus Metric 类型有哪些？**" >}}
- Counter 计数器：记录单调递增（只增不减，例如年龄）的数据，例如 HTTP GET 数量 ，通常与 rate()、irate() 等函数配合使用。
- Gauge 仪表盘：记录可增可减的数据，例如 CPU、内存 的使用率。
- Histogram 直方图：它会在一段时间范围内对数据进行采样，是一组统计数据，需要在服务端 (Prometheus) 使用 histogram_quantile() 函数计算分位数。
- Summary 摘要：与 Histogram 类似，都是在一段时间内对数据进行采样，但它直接在客户端（被监控的应用端）计算分位数。

PS：分位数是把数据平均分成多份，分别统计
{{< /collapse >}}

{{< collapse summary="***Prometheus有哪些查询函数？**" >}}
- xxx
{{< /collapse >}}

{{< collapse summary="***Prometheus 查询函数中 rate 和 irate 的区别？**" >}}
首先，rate 和 irate 都是计算 counter 类型指标的增长速率，但 irate 是高灵敏函数，他会选择单位时间内的最后两个值进行计算，而 rate 是选择第一个和最后一个进行计算。
- rate 适合 CPU 使用率、磁盘 IO 这种场景，线条比较平滑。
- irate 适合 HTTP 请求速率（QPS）、突发性网络流量这种场景，线条比较陡峭。
简单来讲，irare 更加敏感，它能看到一些瞬时、突发的情况。而 rate 更平滑，
{{< /collapse >}}

{{< collapse summary="**Prometheus 主要由哪些组件组成？**" >}}
- Prometheus Server：负责数据采集、存储和查询。
- Exporter：指标暴露器，负责把应用/系统的监控数据转成 Prometheus 能识别的格式。
    - Node Exporter：采集主机 CPU、内存、磁盘、网络等系统指标
    - cAdvisor：采集容器运行时的资源指标
    - MySQL/Redis/Kafka Exporter：采集中间件运行指标
- Pushgateway：用于 短生命周期任务 或 无法被主动拉取的任务。用于 短生命周期任务 或 无法被主动拉取的任务。
    - 场景：一次性批处理任务（job 运行几秒就结束，Prometheus 来不及拉取）。Job 可以把指标主动 推送（push） 给 Pushgateway，Prometheus 再去拉取 Pushgateway。
- Alertmanager：处理告警通知。
    - 去重（避免重复通知）
    - 分组（相似告警合并）
    - 抑制（例如主机宕机时抑制其子服务告警）
    - 静默（临时屏蔽某些告警的通知）
    - 路由（邮件、Slack、钉钉、企业微信等）
- Grafana（可选，用于可视化）
{{< /collapse >}}

{{< collapse summary="**Prometheus 的数据模型是什么？**" >}}
Prometheus 使用多维数据模型，每个时间序列由以下部分组成：
- 指标名称（Metric Name）：说明“监控的是什么”。（如 http_requests_total）。
- 标签（Labels）：区分相同指标的不同维度。（如 method="GET"、status="200"）。
- 时间戳（Timestamp）：表示采样的时间点。
- 值（Value）：表示该时间点的数值。
{{< /collapse >}}

{{< collapse summary="**如何监控 K8s 集群？**" >}}
- 通常的方案是 Prometheus + Grafana + Alertmanager，Prometheus作为时序数据库采集指标数据，Grafana 基于 Prometheus 的指标进行图形展示，Alertmanager 实现告警；
- 还可以通过 KubeSphere、Rancher 等 K8s 管理平台实现监控，这些平台都集成了监控告警功能；
- 常见的监控指标：
    - Node：CPU、内存、磁盘使用率、磁盘IO
    - Pod/容器：CPU、内存使用情况
    - Pod 状态：Running、Pending、CrashLoopBackOff 等
    - API Server 的每秒请求数、请求延迟
    - 网络流量和带宽使用情况
    - 存储类的使用情况
{{< /collapse >}}

{{< collapse summary="**如何监控应用程序？**" >}}
- Prometheus + 第三方或程序内部集成的  /metrics 端点。
{{< /collapse >}}

{{< collapse summary="**如何设计一个有效的监控系统？**" >}}
- 全面覆盖：监控系统应覆盖所有关键组件，包括服务器、网络设备、数据库、应用层等。
- 多维度监控：不仅要监控硬件资源（如CPU、内存、磁盘），还要监控应用性能（如请求延迟、错误率）和服务健康状态（如服务可用性）。
- 实时性：监控数据应尽可能实时更新，以便及时发现问题。
- 告警机制：设置合理的告警阈值和通知渠道（如邮件、短信、Slack等），确保问题能够被及时发现和处理。
- 可视化：通过仪表盘展示关键指标，便于快速了解系统状态。
- 历史数据分析：保留历史数据，便于分析趋势和排查问题。
{{< /collapse >}}

{{< collapse summary="**如何设置合理的告警阈值？**" >}}
- 基于历史数据：分析历史数据，了解系统的正常运行范围，确定合适的阈值。
- 区分紧急和非紧急告警：对于影响用户体验的关键指标（如请求失败率），设置较为严格的阈值；对于次要指标（如磁盘使用率），可以适当放宽。
- 动态调整：随着系统负载的变化，定期调整告警阈值，确保其始终处于合理范围内。
- 避免误报：设置合理的触发条件，避免频繁的误报。例如，可以通过多次采样确认异常后再触发告警。
{{< /collapse >}}

{{< collapse summary="**如何减少告警风暴？**" >}}
1. 分级：例如将告警分为P0-P3，每个级别通知的人群不同，像P0级别就全员发送，快速处理。像磁盘空间大于80%这种告警仅发送给相关负责人；
2. 聚合：例如节点故障，输出“5 分钟内有 12 个节点异常”，而不是 12 条独立告警； 
3. 抑制：例如 Redis 宕机，就不发送上游的 API 超时告警了。 
{{< /collapse >}}

**实践场景：**
{{< collapse summary="**宿主机（物理机/虚拟机）的核心监控指标有哪些？**" >}}
- CPU使用率、内存使用率、系统1分钟、5分钟、15分钟的平均负载、系统运行时间；
- 磁盘：磁盘分区使用率、磁盘IO、Inode使用率；
- 网络：内网和公网的流入流出带宽、TCP 连接数，以及各种状态的数量（ESTABLISHED、TIME-WAIT等）；
- 进程：进程数量、进程打开的文件描述符数量等。
{{< /collapse >}}

{{< collapse summary="**JVM 的核心监控指标有哪些？**" >}}
- 堆内存（Heap）使用率；
- 垃圾回收（GC）次数、耗时、频率；
- 当前活跃线程总数、运行以来的最大线程数；
- 类加载（Class Loading）：已加载类总数、累计加载类数量、卸载类数量；
- 运行时（Runtime）：JVM 启动时间 / 运行时长、Java 版本。
- 宿主机
{{< /collapse >}}

{{< collapse summary="**Elasticsearch 的核心监控指标有哪些？**" >}}
- 写入和查询的 QPS
- 集群健康状态（green、yellow、red）
- 索引（index）与分片（shard）状态
- 宿主机、JVM
{{< /collapse >}}

{{< collapse summary="**MySQL 的核心监控指标有哪些？**" >}}
- SQL 的 QPS
- 当前连接数、最大连接数
- 主从复制延迟、I/O 线程与 SQL 线程状态
- 宿主机
{{< /collapse >}}

{{< collapse summary="**Kafka 的核心监控指标有哪些？**" >}}
- 生产者（Producer）和消费者（Consumer）的 QPS、延迟
- Topic 与 Partition 的状态
- 宿主机、JVM
{{< /collapse >}}

{{< collapse summary="**K8s 的核心监控指标有哪些？**" >}}
- Pod 状态，比如：Running、Pending、CrashLoopBackOff 等
- API Server状态，比如：每秒请求数、请求延迟
- xxx 状态，比如：
- 宿主机
{{< /collapse >}}

## CI/CD

{{< collapse summary="***cicd 使用中遇到什么问题，如果处理解决的？**" >}}
1. xxx
{{< /collapse >}}

{{< collapse summary="***cicd 如何触发自动构建？**" >}}
1. xxx
{{< /collapse >}}


{{< collapse summary="**如何配置CICD流水线？**" >}}
Jenkins ：
- 配置 Gitlab 登录凭据，定义 pipeline 或 Jenkinsfile ，添加构建流程、构建分支等。

Gitlab ：
- 配置 webhook，添加Jenkins 项目的 URL。

配置完成后的数据流：
```
# pipeline
GitLab → Webhook → Jenkins Job → 执行 pipeline（拉代码 + 构建 + 部署）

# Jenkinsfile 
GitLab → Webhook → Jenkins Job → Git clone → 找到 Jenkinsfile → 执行 pipeline
```
{{< /collapse >}}

{{< collapse summary="**如何用 git 创建和切换一个分支？**" >}}
- git checkout -b branch_name
{{< /collapse >}}

## 容器
### docker
{{< collapse summary="***容器与虚拟机的区别？**" >}}
- 容器使用宿主机的内核，而每个虚拟机都有自己独立的内核。
- 容器更加轻量，迁移和部署都比虚拟机更加方便，并且启动速度也要比虚拟机快。
- 容器的隔离性不如虚拟机，因为容器是公用宿主机的内核 + 通过内核的 namespace 实现隔离。
{{< /collapse >}}

{{< collapse summary="**Dockerfile 的指令有哪些？**" >}}
- FROM 指定基础镜像。
- LABEL 给镜像打标签。
- COPY 和 ADD，都可以将宿主机的文件拷贝至容器，但 ADD 还可以将压缩包解压缩拷贝，以及从 URL 下载文件拷贝至镜像。
- RUN 指定镜像构建时执行的shell命令，每个 RUN 指令都会在镜像中新增一层。
- ARG 和 ENV，ARG 是 “构建时变量”，ENV 是 “运行时变量”。
- USER 指定容器运行时的用户。
- WORKDIR 为后续的RUN、COPY、ADD、CMD、ENTRYPOINT等指令设置工作目录”（构建和运行阶段均生效）
- EXPOSE 声明容器运行时 “监听的端口”（仅为元数据说明，不实际映射端口）。
- VOLUME 定义容器中的 “匿名卷”（持久化数据的目录），避免容器内的数据随容器删除而丢失。
- ONBUILD 定义 “触发器”，当当前镜像被用作其他镜像的基础镜像时，自动执行ONBUILD后的指令。
- STOPSIGNAL 指定容器停止时发送的系统信号（默认是SIGTERM），用于优雅关闭应用。
- CMD 和 ENTRYPOINT，都是指定容器启动时的命令，但 ENTRYPOINT 不可变。CMD 通常作为容器启动时的参数，可以被覆盖。
{{< /collapse >}}

{{< collapse summary="**Dockerfile 中的 COPY 和 ADD 有什么区别？**" >}}
- COPY 和 ADD，都可以将宿主机的文件拷贝至容器，但 ADD 还可以将压缩包解压缩拷贝，以及从 URL 下载文件拷贝至镜像。
{{< /collapse >}}

{{< collapse summary="**Dockerfile 中的 CMD 和 ENTRYPOINT 有什么区别？**" >}}
- CMD 和 ENTRYPOINT，都是指定容器启动时的命令，但 ENTRYPOINT 不可变。CMD 通常作为容器启动时的参数，可以被覆盖。
{{< /collapse >}}

{{< collapse summary="**namespace 有哪些？**" >}}
- Network namespace：隔离网络资源（如网卡、IP 地址、端口等）
- PID namespace：隔离进程 ID（每个 namespace 中的进程看到的 PID 是独立的）
- IPC namespace：隔离进程间通信（如信号量、消息队列等）
- User namespace：隔离用户和组 ID
- UTS namespace：隔离主机名和域名
- Mount namespace：隔离文件系统挂载点
{{< /collapse >}}

{{< collapse summary="**Overlay 与 Underlay 的区别？**" >}}
Overlay 与 Underlay 的本质上都是为了解决容器跨宿主机通信的问题
- Overlay 是在底层网络之上构建一层虚拟网络（典型代表有 Calico 的 IPIP/VxLAN 模式），来实现容器跨宿主机通信。而 Underlay 是直接使用底层网络，来实现容器跨宿主机通信（ K8s 的 hostNetwork 模式）。
- IP 方面，Overlay 网络下，容器 IP 有独立的地址段，而 Underlay 网络下，容器需要和宿主机处于同一网段。
- 性能开销方面，Overlay 封装 / 解封装会带来少量 CPU 开销，Underlay 无封装 / 解封装过程，转发效率接近物理网络。
{{< /collapse >}}

{{< collapse summary="**Docker 的网络模式有哪些？containerd呢？**" >}}
- bridge（默认），容器连接到一个虚拟网桥（docker0），容器间可互通，可通过端口映射与宿主机交互。
- host，容器与宿主机共用网络命名空间，没有隔离，性能好但安全性低。
- none，容器没有网络，只有 loopback。
- container，多个容器共享同一个容器的网络命名空间。
- overlay，用于多主机网络，常结合 Swarm 或 Kubernetes。
PS：containerd 本身不提供复杂网络模式，只负责容器运行。但它对外提供了 CNI 接口，可对接不同的网络插件。
{{< /collapse >}}

{{< collapse summary="**Docker 的 bridge 网络模式工作原理？**" >}}
Docker 在 bridge 网络模式下，默认会创建一个 docker0 的网桥，它相当于虚拟的二层交换机，同时它还会被分配一个IP，作为容器跨网段通信的网关；
当创建容器时，会生成一个 Veth Pair（一对虚拟网卡），**它就像一个虚拟网线**，一端在容器（通常命名为 eth0），另一端在主机（通常命名为 vethxxxxxx），主机这端的 vethxxxxxx 还会连接 docker0 网桥。

容器间通信，需要容器都归属同一个网桥，因为二层可达，所以可直接通信：`[容器A eth0] ⇆ [vethA] ⇆ [docker0 bridge] ⇆ [vethB] ⇆ [容器B eth0]`

容器与外部通信：`[容器 eth0] ⇆ [vethX] ⇆ [docker0 bridge] ⇆ [NAT 到宿主机网卡] ⇆ [Internet]`
{{< /collapse >}}

**实践场景：**
{{< collapse summary="***容器化改造的过程？**" >}}
- xxx
{{< /collapse >}}

{{< collapse summary="**如何定位容器的异常网络流量？如何对其进行封禁？**" >}}
1. 首先通过看日志等方式，定位到对方的源IP地址；
2. 进行抓包，但抓包方式取决于容器的运行方式；
    - host 网络模式：可以直接在宿主机抓。
    - bridge 网络模式：两种方案：
        1. `docker inspect -f '{{.State.Pid}}'  ced6cf42f7d3` 定位到容器的 PID，然后使用 `nsenter --target 3981895 --net` 进入到该容器的 netns 使用 `tcpdump` 进行抓包；
        2. 进入容器，使用`ip a` 命令找到宿主机对应的网卡（vethxxxxx）对，宿主机对应的网卡对上抓。
3. 使用 iptables 或 WAF 上进行封禁，封禁时要注意规则下发的细粒度，需精确到IP端口，以免影响正常客户端访问。
    - `iptables -I INPUT -s <malicious-ip> -j DROP`
{{< /collapse >}}

{{< collapse summary="**使用 Dockerfile 制作镜像时，如何减少镜像的大小？**" >}}
- 使用轻量级镜像，如 alpine。
- 清理无用的缓存文件。
- 尽量减少 RUN 指令的使用，以减少镜像分层。
- 使用多阶段构建，比如第一阶段使用nodejs镜像构建前端代码，第二阶段仅把前端构建结果拷贝至nginx镜像。
{{< /collapse >}}

### K8s
{{< collapse summary="***Service 的类型有哪些？**" >}}
- ClusterIP（默认）：提供一个仅在集群内部可访问的虚拟 IP。
- NodePort：在每个节点上打开一个端口，通过 NodeIP:NodePort 的方式访问服务。
    - 在生成 NodePort 的同时，也会生成一个 ClusterIP。可以通过 NodeIP:NodePort 从外部访问服务；但在集群内部，依然可以通过 ClusterIP 来访问。
- LoadBalancer：在公有云（如 AWS、GCP、Azure）中使用时，会自动创建一个云负载均衡器，将外部流量转发到 Service。常用于生产环境对外暴露服务。
    - 会生成一个 ClusterIP + NodePort，然后再由云提供商创建一个外部的负载均衡器，转发流量到 NodePort。
    - 请求流程：外部 → LoadBalancer 公网 IP → NodePort → ClusterIP → Pod。
- ExternalName：把集群外部服务引入到集群内。
{{< /collapse >}}

{{< collapse summary="***Kubernetes 的核心组件有哪些？**" >}}
**Master 节点**
- API Server：提供 Kubernetes API，是集群的前端接口。
- Controller Manager：管理各种控制器（如 Deployment、StatefulSet、DaemonSet等），确保实际状态与期望状态一致。
    - 比如：Deployment Controller 会监控实际状态，发现副本数不匹配后，会自动创建一个新的 Pod，确保实际状态与期望状态一致。
- Scheduler：负责将 Pod 调度到合适的节点上。
- etcd：分布式键值存储，保存集群的所有配置数据。

**Worker 节点**
- Kubelet：管理节点上的 Pod，并定期向 API Server 报告 Pod 状态。
- Kube Proxy：负责 Service 的负载均衡和流量转发，确保客户端请求的流量转发到对应的 Pod 上，有 iptables 和 IPVS 两种模式。
- Container Runtime：运行容器的引擎（如 Docker、containerd）。

**其他：**
- CoreDNS：集群内部 DNS 服务。
- 网络插件 (CNI)：如 Flannel、Calico 等，负责实现 Pod 之间的跨主机通信。
{{< /collapse >}}

{{< collapse summary="***kubernetes 中的 Pod 是什么？**" >}}
- 在 Kubernetes 中，Pod 是最小的调度和运行单位，Pod 中可以包含一个或多个容器，这些容器共享网络和存储资源。
    - 共享网络是指 Pod 内所有容器共享同一个网络命名空间，容器之间可以通过 localhost 直接通信。
    - 共享存储是指 可以挂载同一个 Volume，多个容器可同时读写，常用于日志共享、配置共享等。
{{< /collapse >}}

{{< collapse summary="***Pod 状态有哪些？**" >}}
- Pending：Pod 已创建，但还没有被调度到节点上。
- Running：Pod 中的所有容器都已启动并运行。
- Succeeded：在一次性任务中出现，表示任务已成功执行完毕。
- Terminating：Pod 已经收到了删除请求，但还没有完全删除，正在进行资源清理和容器终止的过程。
- CrashLoopBackOff（容器状态）：表示容器启动失败并多次重启失败。
- Failed：表示 Pod 中的容器以非零状态码退出。
- Unknown：Kubelet 无法获取 Pod 的状态。
{{< /collapse >}}

{{< collapse summary="***Deployment 如何实现滚动更新？**" >}}
- 通过 Deployment 的 strategy 字段定义滚动更新策略，并通过 maxUnavailable、maxSurge 控制速率。
    - maxUnavailable 表示升级时最多有几个 Pod 不可用。
    - maxSurge 表示升级时最多比期望副本数多出的 Pod 数量。
- 最常见配置（高可用）：maxUnavailable = 0，maxSurge = 1，先多启动一个新 Pod，确认可用后再删旧的，不会出现服务空档。
{{< /collapse >}}

{{< collapse summary="***Pod 创建过程？**" >}}
1. 首先 kubectl 或其他客户端会向 kube-apiserver 发送 PodTemplate；
2. API Server 对请求进行 认证、鉴权、准入控制；
    - 认证：你是谁？（比如通过证书验证身份）
    - 鉴权：你有没有权限做这个操作？（比如基于角色的访问控制中，Alice 是否有 "create pods" 这个权限。）
    - 准入控制：这个操作是否合法、合规？（namespace的Pod 数量、CPU、内存使用总量是否超限？PodSecurity、ResourceQuota、LimitRanger 这三种都属于准入控制器）
3. 验证通过后，Pod 对象被转换成 json 格式存入 etcd；
4. Controller Manager 监控到 etcd 中有新的 Pod 资源对象后，会将 Pod 状态置为 Pending；
5. Scheduler 从 etcd 拿到 Pending 状态的 Pod 后，根据调度策略（资源量、亲和性/反亲和、污点/容忍、优先级等）选择合适的节点，把调度结果（Pod.Spec.NodeName） 通过 API Server 写回 etcd；
6. kubelet 监听到本节点被分配了新的 Pod 后，根据 Pod 定义（PodSpec），就会开始调用 CNI 插件配置网络，CSI 插件挂载持久化存储，CRI拉镜像、启动 pause 容器和业务容器，以及启动、就绪、存活探针开始探测；
7. 最后 kubelet 会定期向 API Server 上报 Pod 状态（Pending、Running、Succeeded、Failed…）。
{{< /collapse >}}

{{< collapse summary="***Pod 是如何调度的？**" >}}
1. xxx
{{< /collapse >}}

{{< collapse summary="***k8s pod 状态不正常如何排查？**" >}}
1. `kubectl get pod -n <namespace>` 查看 Pod 的 STATUS
    - Pending：Pod 已创建，但还没有被调度到节点上。
    - Failed：表示 Pod 中的容器以非零状态码退出。
    - Unknown：Kubelet 无法获取 Pod 的状态。
    - CrashLoopBackOff（容器状态）：表示容器启动失败并多次重启失败。
2. `kubectl describe pod <pod-name> -n <namespace>` 查看 Pod 的详细信息，包括事件（Events）、容器状态（Container Statuses）、挂载的卷（Mounts）等。
3. `kubectl logs <pod-name> -n <namespace>` 查看 Pod 的日志，检查是否有异常输出。
4. `kubectl exec -it <pod-name> -n <namespace> -- /bin/bash` 进入 Pod 内的 Shell 环境，检查容器是否正常运行。
5. `kubectl get events -n <namespace>` 查看 Pod 的事件记录，检查是否有异常事件。

{{< /collapse >}}

{{< collapse summary="***k8s 容忍度和打标签什么命令？**" >}}

```sh
# 给指定的节点添加一个标签（例如 disktype=ssd）：
kubectl label nodes <node-name> disktype=ssd
```

污点（Taint）是打在 Node 上的，用来排斥 Pod；而容忍度（Toleration）是配置在 Pod 上的，用来允许 Pod 调度到有对应污点的 Node 上。

```sh
# 给节点添加一个键为 key1，值为 value1，效果为 NoSchedule 的污点：
kubectl taint nodes <node-name> key1=value1:NoSchedule 

# 容忍度没有直接的命令行参数，它必须写在 Pod 的 YAML 配置文件中的 spec.tolerations 字段下。
apiVersion: v1
kind: Pod
metadata:
  name: my-pod
spec:
  containers:
  - name: my-container
    image: nginx
  # 在这里配置容忍度
  tolerations:
  - key: "key1"
    operator: "Equal"    # 可选 Equal (等于) 或 Exists (存在此key即可)
    value: "value1"
    effect: "NoSchedule"
```
{{< /collapse >}}

{{< collapse summary="***k8s 如何查询 pod 或者 node 资源使用率？**" >}}
- 必须已经安装并运行了 Metrics Server。如果没有安装，执行 kubectl top 命令时通常会收到类似 Metrics API not available 的报错。
- kubectl top 只能提供**实时（当前时刻）**的资源使用快照。
```sh
# 查看所有节点的资源使用率：
kubectl top node

# 查看特定节点的资源使用率：
kubectl top node <节点名称>

# 查看当前默认命名空间下所有 Pod 的使用率：
kubectl top pod

# 查看特定命名空间下的 Pod：
kubectl top pod -n <命名空间名称>

# 查看所有命名空间下的 Pod：
kubectl top pod -A

# 查看 Pod 内每个容器的详细使用率：
kubectl top pod --containers

# 按 CPU 或内存消耗进行排序：
kubectl top pod --sort-by=cpu
kubectl top pod --sort-by=memory
```
{{< /collapse >}}


{{< collapse summary="**pause 容器是干嘛的？**" >}}
- 每个 Pod 启动时，都会启动一个 pause 容器，这个容器用于维护 Pod 的 namespaces，在一个 Pod 中，多个业务容器共享以下命名空间：
    - Network Namespace（网络）
    - IPC Namespace（进程间通信）
    - UTS Namespace（主机名等）
{{< /collapse >}}

{{< collapse summary="**Pod 运行模式？**" >}}
- 单容器应用：一个 Pod 就运行一个业务容器（最常见）。
- Sidecar 模式：在主应用容器旁边放一个辅助容器（如日志收集、监控代理）。
- Adapter 模式：主应用容器不变，旁边加一个数据转换容器。
- Ambassador 模式：通过代理容器来与外部服务通信。
{{< /collapse >}}

{{< collapse summary="**Pod 控制器有哪些？**" >}}
- 在 K8s 中，常见的 Pod 控制器有 Deployment、StatefulSet、DaemonSet、Job、CronJob；
- Deployment 是 ReplicaSet 增强版，主要用于运行无状态服务。
- StatefulSet 主要用于运行有状态服务。
- DaemonSet 确保在集群的每个 Worker 节点上都运行一个 Pod，通常用于集群级别的服务，如日志收集器、监控代理等。
- Job 用于执行一次性任务，任务完成后 Pod 会被终止。
- CronJob 是周期性任务，任务会定时执行。
{{< /collapse >}}

{{< collapse summary="**Deployment 和 StatefulSet 有什么区别？**" >}}
- Deployment 通常用于运行无状态服务，而 StatefulSet 通常用于运行有状态服务；
- Pod 名称方面，Deployment 是随机分配的，而 StatefulSet 有固定的名称后缀，比如-0、-1、-2；
- 启动和删除顺序方面，Deployment 没有要求，而 StatefulSet 启动和删除都有严格的先后顺序要求；
{{< /collapse >}}

{{< collapse summary="**ReplicaSet 和 Deployment 有什么区别？**" >}}
- Deployment 是 ReplicaSet 增强版，增加了滚动更新和回滚功能。
{{< /collapse >}}

{{< collapse summary="**Pod 删除过程？**" >}}
1. 首先 kubectl 或其他客户端向 kube-apiserver 发送 Pod 删除请求；
2. API Server 将 Pod 标记为 Terminating 状态，并设置一个宽限期（默认30秒）。在宽限期内，kubelet 会尝试优雅地停止 Pod 中的容器；
    - 如果定义了停止前钩子（preStop Hook），会在此期间执行。
3. 如果宽限期内容器仍未停止，kubelet 会向容器发送 9（SIGKILL） 信号，强制终止进程；
4. 最后 kubelet 会向 API Server 报告 Pod 已终止，API Server 收到后，最终会把 Pod 对象从 etcd 中移除。
{{< /collapse >}}

{{< collapse summary="**Pod 的探针有哪些？**" >}}
- Startup Probe（启动探针）：检查容器是否成功启动。
- Readiness Probe（就绪探针）：检查容器是否已准备好接收流量，探测成功才会通过 Service 将流量路由到该容器。
- Liveness Probe（存活探针）：周期性检查容器是否健康。
- PS：
    - 探测方式有三种，分别是基于命令、基于 HTTP 状态码、基于 TCP 连接。
        - 基于命令是根据命令执行的退出状态码判断是否执行成功，0表示成功，非0表示失败；
        - 基于 HTTP 状态码，2xx、3xx表示成功，否则表示失败；
        - 基于 TCP 连接，是根据能否建立 TCP 连接来判断（类似 telnet）
    - 执行顺序上，启动探针是首先执行，启动探针探测成功后，就绪和存活探针并行执行。
    - 启动探针成功后不再持续探测，存活和就绪探针会在容器运行期间进行周期性探测。
{{< /collapse >}}

{{< collapse summary="**kubernetes 中的 Service 是什么？**" >}}
- kubernetes 中的 Service 是 Pod 的代理，可以为 Pod 提供一个稳定的访问入口，并且 Pod 之间还可以通过 Service 的域名进行通信；
- Service 的代理是基于 iptables 或 ipvs 的。
{{< /collapse >}}


{{< collapse summary="**什么是 Headless Service？它与普通 Service 有什么区别？**" >}}
- Headless Service 是一种特殊的 Service 类型，它与普通的 Service 主要区别在于不分配 Cluster IP。
- Headless Service 的核心作用在于它改变了 DNS 解析的行为。
    - 对于普通 Service：当你查询其 DNS 名称时，DNS 服务器会返回 Service 的 Cluster IP。
    - 对于 Headless Service：当你查询其 DNS 名称时，DNS 服务器会返回与该 Service 相关联的所有 Pod 的 IP 地址。
- 说白了就是可以实现 Pod 间直接进行通信，而不使用 service 进行负载均衡，通常用于有状态服务需要通过 Pod IP 直接通信的场景。
- 定义方式是在 Service 的 clusterIP 处定义为 None。
{{< /collapse >}}

{{< collapse summary="**kubernetes 中的 Ingress 是什么？**" >}}
- “Kubernetes 中的 Ingress 是一种 API 对象，主要作用是管理集群外部到内部服务的 HTTP/HTTPS 流量路由。简单说，它就像集群的‘入口网关’，能根据域名、路径等规则，把外部请求转发到对应的内部 Service；
- Ingress 本身只是规则的定义，必须配合 Ingress 控制器（比如 Nginx Ingress Controller）才能生效，常见的控制器有 Nginx、Traefik、Istio。
{{< /collapse >}}

{{< collapse summary="**Service 和 Ingress 的区别？**" >}}
- 在 K8s 中，Service 和 Ingress 都是对外暴露流量的方式；
- Service 是给一个或多个 Pod 提供稳定访问入口，负责四层（TCP/UDP）负载均衡，有 ClusterIP、NodePort 和 LoadBalancer 类型，适合内部访问或者简单对外暴露；
- Ingress 是给一个或多个 Service 提供稳定访问入口，负责七层（HTTP/HTTPS）路由规则，需要依赖 Ingress Controller，比如 Nginx、Traefik、Istio，支持基于域名和路径的流量分发，还可以配置 TLS；
- 简单来讲，Ingress 通过七层代理转发到 Service，Service 通过四层代理转发到Pod。
```
外部请求 → Ingress Controller → Service → Pod
```
{{< /collapse >}}

{{< collapse summary="**Service 怎么让集群外部访问？**" >}}
- NodePort：定义 NodePort 类型的 Service，客户端访问 任意节点IP（Master 或 Worker）+ NodePort，NodePort 默认端口范围在 30000–32767 之间。
- Ingress：将 Service 通过 Ingress 映射，客户端访问 IngressControllerIP + IngressControllerPort。
- LoadBalancer：定义 LoadBalancer 类型的 Service，客户端访问 外部负载均衡器IP + ServicePort。
{{< /collapse >}}

{{< collapse summary="**kubernetes 中的 Namespace 是什么？**" >}}
- Namespace 实现了 K8s 中各种资源的逻辑隔离；
- 默认的 Namespace 有 default、kube-system、kube-public、kube-node-lease。
    - kube-system 下默认运行了coredns、etcd、apiserver、controller-manager、kube-proxy、scheduler。
{{< /collapse >}}

{{< collapse summary="**kubernetes 中的 Configmap 和 Secret 是什么？**" >}}
- Configmap：用于存储非敏感的配置数据（如环境变量、配置文件）。
- Secret：用于存储敏感数据（如密码、密钥），内容经过 Base64 编码。
{{< /collapse >}}

{{< collapse summary="**k8s 中 StorageClass、PV、PVC的关系是？**" >}}
- 这三个是 K8s 中最常用的持久化存储解决方案，可以实现静态或动态供应持久化存储资源；
- 静态供应（Static Provisioning）
    1. 管理员手动创建好 PV；
    2. 用户创建 PVC；
    3. 系统自动将 PVC 和符合条件的 PV 绑定；
    4. StorageClass 可选。
- 动态供应（Dynamic Provisioning）
    1. 用户创建 PVC，并指定 StorageClass；
    2. StorageClass 的 Provisioner 插件会自动创建一个 PV，并且 PVC 会自动绑定这个 PV；
    3. 这是现代集群更常用的方式。
{{< /collapse >}}

{{< collapse summary="**kubernetes 中的 Volume 有哪些？**" >}}
- 临时卷：
    - emptyDir：在 Pod 被分配到节点时创建，生命周期与 Pod 一致。当 Pod 从节点移除时，emptyDir 中的数据会被永久删除。常用于 Pod 内多个容器之间共享数据。
- 持久卷：
    - PersistentVolume（PV）：由管理员配置的集群级存储资源，独立于 Pod 生命周期。
    - PersistentVolumeClaim（PVC）：由用户申请的存储资源，类似 “存储需求订单”，Kubernetes 会自动匹配满足条件的 PV。
- 本地存储卷
    - hostPath：宿主机的文件系统路径直接挂载到 Pod 中。
    - local：与 hostPath 类似，但更强调稳定性，需要显式指定节点亲和性，适用于需要高性能本地存储的场景（如数据库）。
- 配置类卷：
    - Configmap：用于存储非敏感的配置数据（如环境变量、配置文件）。
    - Secret：用于存储敏感数据（如密码、密钥），内容经过 Base64 编码。
    - downwardAPI：将 Pod 或容器的元数据（如 Pod 名称、IP、标签等）以文件形式暴露给容器。
- 网络存储卷
    - nfs：挂载 NFS（网络文件系统）共享目录，适用于需要多节点共享数据的场景。
{{< /collapse >}}

{{< collapse summary="**K8s 如何实现蓝绿部署？**" >}}
- 蓝绿部署是指存在A、B两套环境，平常A对外提供服务，当B升级测试完成后，把流量迁移到B环境中；
- K8s中要实现蓝绿部署，可以基于 service 的标签选择器，切换到不同的 Pod 控制器来实现。 
{{< /collapse >}}

{{< collapse summary="**K8s 如何实现金丝雀发布？**" >}}
- 金丝雀发布又称灰度部署，指的是先进行小范围的升级，当运行一段时间没问题后，再进行增量或全量替换。
- K8s中要实现灰度部署，可以通过 service 的标签选择器控制转发的后端 Pod。也可以使用服务网格（如 Istio），通过基于权重的方式实现流量控制。
{{< /collapse >}}

{{< collapse summary="**K8s 如何实现金丝雀发布？**" >}}
- 金丝雀发布又称灰度部署，指的是先进行小范围的升级，当运行一段时间没问题后，再进行增量或全量替换。
- K8s中要实现灰度部署，可以通过 service 的标签选择器控制转发的后端 Pod。也可以使用服务网格（如 Istio），通过基于权重的方式实现流量控制。
{{< /collapse >}}

{{< collapse summary="**K8s 中的 CRD 和 Operator 是什么？**" >}}
- CRD 是自定义资源类型，Operator 是一个自定义的控制器，两者结合通常用于管理有状态应用。
{{< /collapse >}}

{{< collapse summary="**什么是 Helm？**" >}}
- Helm 是 Kubernetes 的包管理工具，类似于 Linux 的 apt 或 yum，也像 Node.js 的 npm。
- 它把一组 Kubernetes 资源（Deployment、Service、ConfigMap、Ingress 等）打包成一个 Chart，可以安装、升级、回滚和删除。
{{< /collapse >}}

{{< collapse summary="**Helm 相关组件有哪些？**" >}}
- Chart：类似于 yum/apt 里的软件包；
- Release：Chart 的一次部署实例，支持版本回滚；
- Repo：Chart 的仓库；
- Values：Chart 的配置文件；
- Templates：通过 Go 模板机制渲染生成最终的 K8s YAML。
{{< /collapse >}}

{{< collapse summary="**什么是 Helm？**" >}}
- Helm 是 Kubernetes 的包管理工具，类似于 Linux 的 apt 或 yum，也像 Node.js 的 npm。
- 它把一组 Kubernetes 资源（Deployment、Service、ConfigMap、Ingress 等）打包成一个 Chart，可以安装、升级、回滚和删除。
{{< /collapse >}}

{{< collapse summary="**nodeSelector 和 nodeAffinity 有什么区别？**" >}}
- nodeSelector 仅支持简单的节点 K/V 标签来选择 Pod 调度的节点。
- nodeAffinity 功能更加强大，支持权重、软亲和、硬亲和、表达式等功能。
    - 硬亲和：必须完全匹配，否则 Pod 将处于 pending 状态。
    - 软亲和：尽量匹配，没有匹配的就运行到其他节点。
{{< /collapse >}}

**实践场景：**
{{< collapse summary="**K8S 备份恢复如何实现？**" >}}
- xxx
{{< /collapse >}}



## 中间件
### Kafka
{{< collapse summary="***Kafka的核心组件有哪些？**" >}}
Kafka自身：
- Broker：Kafka 集群中的每个节点称为 Broker，负责接收、存储和传输消息。
- Topic：Kafka 中消息的逻辑分类单元。
- Partition：Topic 的物理分片，可以提高并行处理和扩展性。
- Replica：Partition 的备份副本，生产环境一般最少为3个（1 个 Leader 加上 2 个 Follower）。
- Zookeeper / KRaft：早期版本用于管理集群元数据，Kafka 2.8+ 开始，使用 KRaft（Kafka Raft Metadata mode） 模式，作为 Zookeeper 的替代方案。

客户端：
- Producer（生产者）：负责将数据发布（写入）到 Kafka 的 Topic 中。
- Consumer（消费者）：订阅并消费 Kafka 中的消息。
{{< /collapse >}}

{{< collapse summary="***Kafka 的 Partition 一般配置几个？**" >}}
- 底线：取决于消费者数量，一般是大于等于消费者数量，如果少的话，会有闲置的消费者。
- 经验值：通常设为消费者数量的 2 到 3 倍。主要是为了防患于未然，以后业务量涨了，直接加机器就能干活，不用麻烦地去改 Partition 数量。
- 上限：单台机器分担的 Partition 总数最好别超过 1000 到 2000 个（8U 32G 机器），设得太大容易把节点拖垮。
{{< /collapse >}}

### MongoDB
- xxx


### MySQL
{{< collapse summary="***MySQL 如何实现主从复制？**" >}}
1. 主库上创建创建复制账号；
2. 主库（Master） 定义 server-id、开启 binlog（二进制日志）；
3. 从库（Slave）定义 server-id、开启 relay-log（中继日志）、开启只读，执行 CHANGE MASTER TO 输出主库相关信息，START SLAVE 启动复制，SHOW SLAVE STATUS 验证 IO 和 SQL 线程的状态；
4. 主库创建测试库或表，从库验证复制状态。
{{< /collapse >}}

{{< collapse summary="***MySQL 主从复制的原理？复制模式有哪些？**" >}}
1. 主库（Master） 开启 binlog（二进制日志），记录所有更改数据的 SQL 操作。
2. 从库（Slave） 通过 I/O 线程 连接主库，请求 binlog。
3. 主库将 binlog 内容发送给从库，从库保存到自己的 relay log（中继日志）。
4. 从库的 SQL 线程 读取 relay log，执行其中的 SQL，从而使数据与主库保持一致。
```
客户端写主库
       ↓
主库执行并写入 binlog
       ↓
从库 I/O 线程读取 binlog → 写入 relay log
       ↓
从库 SQL 线程重放 relay log → 数据同步完成
```

全量复制：主库首次向从库复制时为全量复制，后续通过 binlog 增量复制。

异步复制（默认）：主库事务提交成功后，不等待从库确认。性能最好，但可能丢失数据

半同步复制：主库事务提交成功后，至少有一个从库 relay log 写入成功后，主库才认为事务提交成功。性能略差，但数据安全性高。

全同步复制（Group Replication）：需要所有节点数据同步完成，性能最差，但数据安全性最高。
{{< /collapse >}}

{{< collapse summary="***MySQL 如何做备份和恢复？**" >}}
备份（看数据量）：
- 较小：每日全量备份（每日定时任务，K8s 或系统 crontab） + 开启二进制日志（binlog），工具可以使用 mysqldump。
- 较大：每周或每月全量备份 + 每日增量备份 + 开启二进制日志（binlog），工具可以使用 xtrabackup（xtrabackup 既支持全量备份，也支持增量备份，但不支持差异备份）。
- PS：结合 rsync、scp 等工具同步到其他主机或云储存做冗余，再配合 shell 脚本（用 find -mtime +N 查找文件修改时间超过 N 天的备份）或工具定期清理历史备份以防磁盘空间满。

恢复（看使用的工具和备份时所采用的方式）：
- mysqldump：mysql -u root -p < full_backup.sql（标准输入重定向）。
- 增量备份：仅备份自上次备份以来变化的数据，恢复时必须按顺序应用：全量 → 第1次增量 → 第2次增量 → …
- binlog 恢复到某个时间点（例如误操作前）：mysqlbinlog --start-datetime="2025-10-14 10:00:00" --stop-datetime="2025-10-14 10:30:00" /var/lib/mysql/binlog.000123 | mysql -u root -p
{{< /collapse >}}

{{< collapse summary="***MySQL 慢查询如何排查？**" >}}
1. 开启慢查询日志，阈值看场景，一般不超过3秒（一秒两秒较常见）；
2. 结合 mysqldumpslow、pt-query-digest（更推荐）、EXPLAIN 等工具分析慢查询日志，重点关注：
    - **执行时间（Query_time）**：这是判断一个查询是否慢的直接指标。
    - **锁的等待时间（Lock_time）**：高锁等待时间表明查询被其他事务阻塞，可能存在事务设计或并发问题。
    - **扫描的行数（Rows_examined）、返回的行数（Rows_sent）**：这是最重要的优化指标之一。扫描行数远大于返回行数（Rows_sent）时，说明查询效率低下，通常是索引缺失或使用不当。
    - **是否使用索引**：通过 EXPLAIN 查看 key 字段，确保使用了合适的索引。
{{< /collapse >}}

{{< collapse summary="***如何避免慢查询？**" >}}
1. 对合适的字段定义索引：
2. 查询时基于 B+ 树的左前缀特性，充分利用索引来查询；
3. 在虚拟机或物理机部署 MySQL，且磁盘采用 SSD，以提升 MySQL 性能。
{{< /collapse >}}

{{< collapse summary="**事务特性有哪些？**" >}}
- 原子性（Atomicity）：整个事务中的所有操作要么全部成功执行，要么全部失败后回滚。
- 一致性（Consistency）：事务做完后，数据得保持前后一致（比如转账时，A少了100块，B就必须多100块）。
- 隔离性（Isolation）：事务在未提交前不可见，但有多种隔离级别：读未提交、读已提交、可重复读、串行化。
    - MySQL 的 InnoDB 存储引擎默认是可重复读。
- 持久性（Durability）：事务一旦提交，其所做的修改会永久保存于数据库中。
PS：事务还依赖于事务日志，其中包含 redo log 和 undo log，redo log保障事务的持久性，undo log保障事务的原子性。
{{< /collapse >}}

{{< collapse summary="**MySQL 的锁有哪几种？**" >}}
- 按粒度划分：全局锁、表锁、行锁；
- 按类型划分：共享锁（读锁）和排他锁（写锁）。
{{< /collapse >}}

{{< collapse summary="**MySQL最常用的高可用方案？**" >}}
- 8.0 以上推荐用 MGR (MySQL Group Replication)	
{{< /collapse >}}

{{< collapse summary="**如果数据库 CPU 飙高怎么排查？**" >}}
1. 首先使用 top 等命令排查是否是 MySQL 本身导致 CPU 飙高；
2. SHOW PROCESSLIST 或 SHOW FULL PROCESSLIST（Info 列显示完整的 SQL 语句），检查慢查询、是否有全表扫描、索引是否失效；
3. Redis 缓存失效，导致查询全到 MySQL，也会导致 MySQL CPU 飙高。
{{< /collapse >}}

{{< collapse summary="**什么是 B+ 树，有什么特点？**" >}}
B+ 是一种多路平衡查找树，使用左前缀作为索引条件
- 它的根节点和枝节点不存储数据，而是存储键和指向子节点的指针，叶子节点存储数据。
- MySQL 的 InnoDB 存储引擎使用 B+ 树作为索引类型
{{< /collapse >}}

{{< collapse summary="**MYSQL数据库有哪些常见索引？**" >}}
按数据结构分类：主要是 B+Tree 索引（此外还有 Hash 索引、全文索引）；
按字段特性分类：主键索引、唯一索引、普通索引、前缀索引；
按字段数量分类：单列索引、联合索引。
{{< /collapse >}}

**实践场景：**
{{< collapse summary="**假如说是银行转账这种对于一致性要求极高的场景，在主从复制场景下，你会怎么保证写mysql主库后，用户读从库数据是一致的？**" >}}
- 可以开启半同步复制或全同步复制
    - 半同步复制下，至少有一个从节点事务日志写入成功（relay log），才会给客户端返回成功的结果
    - 全同步复制下，所有的从节点事务日志写入成功，才会给客户端返回成功的结果
    - PS：但半同步和全同步复制都会影响性能
- 代码层面：像银行转账成功后的余额查询，直接读主库，保证读写一致。其他非关键查询走从库，兼顾性能。
{{< /collapse >}}

{{< collapse summary="**创建索引可以提高查询效率，那么在创建索引时需要注意什么？**" >}}
- 选择经常出现在 WHERE、JOIN、ORDER BY、GROUP BY 的列，避免对布尔类型字段建立索引（例如性别字段）；
- 避免创建过多的索引，因为会影响写性能；
- 定期使用 EXPLAIN（MySQL）或 EXPLAIN ANALYZE（PostgreSQL）分析查询计划，确认索引是否被实际使用。
{{< /collapse >}}

### Redis
{{< collapse summary="***redis 持久化方式有哪些？**" >}}
- RDB：基于内存的快照，有自动触发和手动触发两种方式：
    - 自动触发：定义配置文件（save 多少秒内 有多少key被修改）就触发。
    - 手动触发：SAVE、BGSAVE，SAVE 阻塞 Redis，立即生成 RDB，BGSAVE 后台异步生成 RDB，不阻塞客户端。
- AOF：每次写命令（修改数据的命令），追加到 .aof 文件，可定义写入策略（appendfsync 参数）：
    - always：每次写命令都同步，数据安全性最高，但性能也是最差；
    - everysec：每秒同步一次，默认，性能与安全平衡；
    - no：由操作系统决定何时写入（通常是当缓冲区满了之后），最快，数据安全性最低。
- 混合模式：RDB + AOF，生产环境推荐，兼顾“性能 + 数据安全”，AOF 文件的开头部分存储 RDB 快照（快速加载），后续是增量的 AOF 命令（高可靠性）。
{{< /collapse >}}

{{< collapse summary="***为什么同时需要aof和rdb，他们分别有什么局限性？**" >}}
RDB：
- 优点：恢复速度快（二进制快照文件）、文件体积小（经过压缩）、对性能影响小（bgsave 子进程完成，主线程继续处理请求）
- 缺点：数据丢失风险较高，因为快照是定时生成的，Redis 异常宕机时，会丢失最后一次快照之后的所有写操作。

AOF：
- 优点：数据更可靠（每次写都追加，或每秒追加一次）、可读性强
- 缺点：文件体积较大（但 AOF 会通过重写将日志压缩为等价的最小命令集，避免文件无限膨胀）

生产环境推荐混合模式（aof-use-rdb-preamble yes），兼顾“性能 + 数据安全”，AOF 文件的开头部分存储 RDB 快照（快速加载），后续是增量的 AOF 命令（高可靠性）。
{{< /collapse >}}

{{< collapse summary="***aof 日志能直接看到数据吗，如果不能需要经过什么处理？**" >}}
- AOF 文件不是直接存储“数据”的，而是存储“写命令”，且写命令为 Redis 的特有格式。要看的话，需要启动 Redis 时指定 AOF 文件，恢复后查看。
{{< /collapse >}}

{{< collapse summary="**redis 的过期 key 删除策略有哪些？**" >}}
| 策略类型 | 触发时机 | 优点      | 缺点      | Redis 默认启用？ |
| ---- | ---- | ------- | ------- | ----------- |
| 定时删除 | 到期立即 | 实时清理    | CPU 开销大 | ❌           |
| 惰性删除 | 被访问时 | 简单高效    | 可能占用内存  | ✅           |
| 定期删除 | 定期扫描 | 平衡性能与内存 | 非实时     | ✅           |
{{< /collapse >}}

**实践场景：**
{{< collapse summary="***rdb 做快照，周期一般该设置为多少？**" >}}
- 需要根据数据重要性、写入频率等指标综合判断，大部分生产环境：
```sh
# Redis 会按条件触发快照（满足任意一条即可）
save 900 1   # 900 秒内至少有 1 次写操作就触发快照
save 300 10  # 300 秒内至少有 10 次写操作就触发快照
save 60 10000 # 60 秒内至少有 10000 次写操作就触发快照
```
生产环境推荐混合模式（aof-use-rdb-preamble yes），兼顾“性能 + 数据安全”，AOF 文件的开头部分存储 RDB 快照（快速加载），后续是增量的 AOF 命令（高可靠性）。
{{< /collapse >}}


{{< collapse summary="***假如说我现在想对线上的redis数据库做数据备份，你会怎么做？**" >}}
- 可以使用 RDB 或 AOF 进行备份，但生产环境一半推荐使用混合模式（文件后缀为 .aof），混合模式中前部分为RDB快照，后部分为AOF追加的写命令，这样可以兼顾“性能 + 数据安全”。
- 配合定时任务，例如每天凌晨三点将备份数据拷贝至备份服务器，或云储存。还可以删除旧的备份，以防磁盘空间沾满。
{{< /collapse >}}



## 负载均衡与高可用

{{< collapse summary="***LVS 为什么选 DR 模式而不是 NAT？**" >}}
1. 因为 NAT 模式下，客户端如果和 RS 在同一网段的话，将无法经过 NAT 转发，而是直接走二层 ARP 广播了；
2. 但最重要的一点是，NAT 模式下，所有进出流量都会经过 LVS，所以性能不好。
{{< /collapse >}}


{{< collapse summary="***常见的负载均衡算法有哪些？**" >}}
四层：
- 轮询
- 加权轮询
- 最少连接
- 加权最少连接
- 源地址哈希

七层（基于应用层特征）：
- 四层负载均衡算法
- 基于请求的 uri、客户端 IP 哈希、cookie
{{< /collapse >}}

{{< collapse summary="***负载均衡中的 VIP 是什么？**" >}}
- VIP（Virtual IP Address），可以为客户端提供一个统一的访问入口，防止后端服务器出现宕机等问题后，产生服务不可用的问题。
- 通常的解决方案为 keepalived + LVS、Nginx等负载均衡服务搭配使用，keepalived 可以在检测节点或服务的状态，在出现问题时，将 VIP 漂移到健康的节点，其本质上是通过 VRRP （虚拟路由冗余协议）实现的。
{{< /collapse >}}

**实践场景：**
{{< collapse summary="***说说你对高可用的理解**" >}}
- xxx
{{< /collapse >}}

{{< collapse summary="***gitlab 高可用如何实现？**" >}}
- xxx
{{< /collapse >}}

{{< collapse summary="***如何保证负载均衡器不会把流量负载到宕机/不健康的节点？**" >}}
- 配置健康检查策略，自动下线不健康的节点；
- 健康检查策略分为很多种，例如：基于TCP的三次握手是否成功、请求某个URI，且状态码返回200等；
- 还有一些其他配置项，比如：检测间隔、重试次数、失败阈值（几次探测失败即认为失败）等
{{< /collapse >}}

## Web 服务
{{< collapse summary="***nginx location 的匹配规则是怎样的？**" >}}
取决于匹配表达式的符号，优先级从高到低依次为：
1. `=` 精确匹配
2. `^~` 前缀匹配
3. `~` 区分大小写的正则匹配
4. `~*` 不区分大小写的正则匹配
5. 没有符号优先级最低

最后会根据请求的 uri，location 会从上到下依次匹配，找到匹配结果将直接返回。
{{< /collapse >}}

{{< collapse summary="**常见 http 状态码以及含义？**" >}}
**2XX（成功）：**
- `200 OK` 成功，且有内容返回
- `204 No Content` 成功，但没有内容返回（在现代 RESTful API 设计中，能用 204 的地方尽量用 204，能更准确地表达意图，也能节省不必要的流量。）

**3XX（重定向）：**

**4XX（客户端错误）：**
- `499 Client Closed Request` 后端服务响应前，客户端主动关闭连接。

**5XX（服务端错误）：**
- `502 Bad Gateway` 后端服务不可用。
- `504 Gateway Timeout` 后端服务响应超时。

{{< /collapse >}}

{{< collapse summary="**配置 Nginx 作为 Web Server 时，你常用的优化配置有哪些？**" >}}
- 性能优化：
    1. 开启和 CPU 核心数相同的 worker 进程（worker_processes auto;）
    2. worker 进程与 CPU 亲缘性绑定（worker_cpu_affinity 0001 0010 0100 1000;  # 假设4核CPU，绑定每个进程到特定核心）
    3. 增大 worker 进程的最大连接数（worker_connections 10240;）
    4. 使用 epoll 事件通知模型
    5. 开启 gzip 压缩
    6. 客户端频繁请求的场景下，开启 keepalive，并设置合理的 timeout
- 安全优化：
    1. 普通用户运行 worker 进程（user www-data; # master 进程还是以 root 身份运行，因为只有 root 身份才能绑定 <1024 的特权端口）
    2. 隐藏 Nginx 版本号（server_tokens off;）
    3. 防盗链（仅允许指定域名访问图片等静态资源）
- 反向代理：
    1. 开启缓存
    2. 开启客户端 IP 透传（proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;）
- 其他：
    1. 日志输出改为 json 格式（便于 ELK 分析）
{{< /collapse >}}

## Shell
**实践场景：**
{{< collapse summary="***写过的 Shell 脚本有哪些？**" >}}
- 一键部署服务
- 自动构建镜像，并推送到 harbor
- 批量测试域名解析结果
- 批量处理文本，统计境内外 IP 数量
- 通过 es 接口查询 index 内容
{{< /collapse >}}


## 自动化运维
**实践场景：**
{{< collapse summary="***ansible在一百台机器上创建一个目录怎么做？**" >}}
`ansible all -i hosts.ini -b -m file -a "path=/opt/mydir state=directory mode=0755"`
- 用 file 模块而不是 shell，因为 file 模块是幂等的，多次执行不会重复创建或报错。
{{< /collapse >}}

## 公有云
{{< collapse summary="***VPC 是做什么的？**" >}}
- 专有网络 VPC（Virtual Private Cloud）提供云上安全隔离的虚拟网络环境。
- 每个 VPC 至少由三部分组成：私网网段、交换机和路由表。
{{< /collapse >}}

{{< collapse summary="***阿里云你用过哪些组件？**" >}}
- xxx
{{< /collapse >}}

{{< collapse summary="***AWS你用过哪些组件？**" >}}
- xxx
{{< /collapse >}}


## 其他
{{< collapse summary="***设备配置规划？**" >}}
- 比如根据访问量定义CPU内存等硬件资源
{{< /collapse >}}