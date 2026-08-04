---
title: "WireGuard"
weight: 20
---


## 文件说明

- wireguard-linux-compat-1.0.20220627.zip 主程序
- wireguard-tools-1.0.20250521.zip 相关工具集



## 安装方式

主程序：解压 wireguard-linux-compat-1.0.20220627.zip进src，make 然后 make install，如果报错 ipv6_dst_lookup 注释 compat/compat.h 的93行就行，都装完后 wg version 验证。

工具集：解压 wireguard-tools-1.0.20250521.zip 进src，make 然后 make install。



## 配置 wg 客户端与服务端通信

### 服务端

- 服务端配置公私钥过程省略，此处仅演示重启wg网卡命令。

```sh
# 一、生成服务端私钥
wg genkey > /etc/wireguard/server-prikey

# 二、生成服务端公钥
cat /etc/wireguard/server-prikey | wg pubkey > /etc/wireguard/server-pubkey

# 三、一键生成客户端配置文件
cat > /etc/wireguard/server-wg0.conf <<EOF 
[Interface]
# 1. 服务端的私钥
PrivateKey = $(cat /etc/wireguard/server-prikey) 
# 2. 服务端的虚拟网卡 IP，这是 WireGuard 自己创建的虚拟内网 IP（Overlay IP）。它和宿主机的物理网卡 IP（管理口 IP / 业务 IP）没有任何直接关系，完全是两个维度的东西。
# 挂载在 server-wg0 或 client-wg0 这种虚拟网卡上。当物理层面的连接打通后，WireGuard 相当于在两台机器之间拉了一根“虚拟网线”，并在这个虚拟局域网里重新分配了 IP。
Address = 10.8.0.1/24

# 3. 真实物理网卡监听的udp端口，必须与客户端 Endpoint 中的端口 (50046) 保持一致
ListenPort = 50046

# (可选但推荐) 如果你要 ping 通服务端背后的 240.240.0.1，服务端需要开启 NAT 转发。
# 注意：请将下面的 eth0 替换为你服务端实际连通外网或目标网段的物理网卡名称 (可通过 ip a 命令查看)
# PostUp = iptables -A FORWARD -i server-wg0 -j ACCEPT; iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
# PostDown = iptables -D FORWARD -i server-wg0 -j ACCEPT; iptables -t nat -D POSTROUTING -o eth0 -j MASQUERADE
EOF

# 启动服务端wg服务
systemctl enable --now wg-quick@server-wg0

# 重启 wg 网卡（可选）
wg-quick down server-wg0 && wg-quick up server-wg0
```

### 客户端

```sh
# 生成客户端私钥
wg genkey > /etc/wireguard/client-prikey

# 生成客户端公钥
cat /etc/wireguard/client-prikey | wg pubkey > /etc/wireguard/client-pubkey

# 一键生成客户端配置文件
cat > /etc/wireguard/client-wg0.conf <<EOF 
[Interface]
PrivateKey = $(cat /etc/wireguard/client-prikey) 
Address = 10.8.0.2
ListenPort = 50046

[Peer]
PublicKey = R4RJipH+D8lr9ULIL/TpTm0aYvt5W0m8fpX3GY/BnDk= # 服务端的公钥
AllowedIPs = 240.240.0.0/16
Endpoint = 10.20.8.207:50046 # 服务端的管理口IP
PersistentKeepalive = 25 
EOF

# 启动客户端wg服务
systemctl enable --now wg-quick@client-wg0

# 查看客户端，用于添加到服务端配置文件
cat /etc/wireguard/pubkey

# 重启客户端wg网卡（可选）
wg-quick down client-wg0 && wg-quick up client-wg0
```

### 客户端配置追加到服务端

- 在服务端执行

```sh
cat >> /etc/wireguard/server-wg0.conf <<EOF 
[Peer]
# 1. 客户端的公钥 (在客户端执行 cat /etc/wireguard/client-pubkey 得到的值)
PublicKey = d/Gd0TYpf6Zr1YsK7BDrFnQXD/WCnNVy96CDARSXGk4=

# 2. 允许该客户端使用的 IP。为了安全防欺骗，通常服务端会严格限定客户端只能使用分配给它的那个 IP
AllowedIPs = 10.8.0.2/32
EOF
```



### 测试
ping -c1 240.240.0.1   从客户端执行这个命令 ping 服务端

如果没有该IP，可以通过以下命令临时创建测试

```sh
# 1. 创建一张名为 dummy-test 的虚拟网卡
sudo ip link add dummy-test type dummy

# 2. 给这张网卡分配 240.240.0.1 的 IP
sudo ip addr add 240.240.0.1/16 dev dummy-test

# 3. 启动这张网卡
sudo ip link set dummy-test up

# 4. 验证是否添加成功
ip a show dummy-test

# 5. 删除测试网卡
sudo ip link del dummy-test
```


