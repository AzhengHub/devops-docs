---
title: "实现企业自建 DNS 服务"
---

## 一、项目背景
- 为解决公司内网服务通过IP访问所带来的不便记忆、IP变化需全局通知等弊端，决定采用 BIND9 + LVS + Prometheus 技术栈，构建一套高性能、高可用的域名解析平台，为服务提供域名入口。



## 二、架构概览
![](/docs/基础服务/dns/实践案例/主从DNS.jpg)


| 虚拟机名称      | hostname      | OS           | CPU  | 内存 | 磁盘  | IP |
| --------------- | ------------- | ------------ | ---- | ---- | ---- | ---- |
| 北京主DNS服务器 | bj-dns-master | Ubuntu 22.04 | 4U   | 8G   | 100G | 172.16.0.223 |
| 北京从DNS服务器 | bj-dns-slave  | Ubuntu 22.04 | 4U   | 8G   | 100G | 172.16.0.225 |

**注意事项：**
- 主从服务器需保持时间同步
- 主从 BIND9 版本需保持一致

## 三、安装 BIND9
- 在主从服务器下分别执行以下命令：
```sh
apt update

apt install bind9
```


## 四、配置 BIND9

### 主 DNS 服务器配置
#### 1. 修改全局配置文件
- 这种配置下，内网域名由自己权威快速返回，外网域名通过转发到可靠公共 DNS 解析。方便内网机器直接使用这套 DNS 即可访问互联网域名。
- 在纯内网环境下，只需设置 `recursion no;` 明确关闭递归查询（只做权威解析），并删除 `recursion`、`forwarders` 配置段即可。

```bind {filename="/etc/bind/named.conf.options"}
options {
    directory "/var/cache/bind";               // BIND的工作目录，用来存放缓存、zone文件副本、统计数据等

    // 只允许内网查询（防止外部用户滥用此DNS服务器）
    allow-query { 172.16.128.2; 172.16.0.0/18; localhost; };  // 只接受来自172.16网段和本机的查询请求，外网直接拒绝

    // 开启递归查询（允许服务器代替客户端去互联网上帮查域名）
    recursion yes;

    // 转发外部查询到公共 DNS（当需要递归查询外部域名时，不自己从根服务器开始查，而是直接转发给这些上游DNS）
    forwarders {
        223.5.5.5;  // 阿里公共DNS
        223.6.6.6;  // 阿里公共DNS备用地址
    };

    forward only;   // 只使用转发模式：如果forwarders都不可达，就直接返回失败，不尝试自己去根服务器递归

    // 隐藏版本信息等（防止攻击者通过版本号探测漏洞）
    version "not available";          // 查询版本时返回“不告诉你”，隐藏BIND版本
    hostname "none";                  // 查询hostname时不返回真实主机名
    server-id "none";                 // 查询server-id时也不返回，增强匿名性

    // 安全选项
    allow-transfer { none; };         // 全局禁止任何服务器拉取zone数据（实际在本地zone里单独允许Slave，更安全）
    minimal-responses yes;            // 回复时只给必要信息，不多给额外记录，减少信息泄露

    // DNSSEC
    dnssec-validation no;           // 关闭 DNSSEC 校验，以避免信任链断裂

    // 监听地址
    listen-on { any; };   // LVS DR 模式下，需监听所有IP，即包含 lo 接口，否则会导致 VIP 不可用
    listen-on-v6 { none; };  // 不监听在IPv6
};

// 开启统计通道，允许本机（Exporter）访问
statistics-channels {
    inet 127.0.0.1 port 8053 allow { 127.0.0.1; };
};
```

#### 2. 配置本地 zone
```bind {filename="/etc/bind/named.conf.local"}
// 内网正向解析
zone "internal.example.com" {
    type master;  // 类型为主节点
    file "/etc/bind/zones/db.internal.example.com";   // 区文件路径（自己创建目录）
    allow-transfer { 172.16.0.225; }; // 只允许指定 Slave 传输
    also-notify { 172.16.0.225; };    // 变更时主动通知 Slave
    notify yes;                       // 启用 notify
};

// 如果需要反向解析（如 192.168.1.x），可选添加
// zone "1.168.192.in-addr.arpa" {
//     type master;
//     file "/etc/bind/zones/db.192.168.1";
//     allow-transfer { 172.16.0.225; };
//     also-notify { 172.16.0.225; };
// };
```
#### 3. 配置区域数据库
- 区域数据库由众多资源记录（Resource Record, RR）组成，每个域名对应一个区域数据库。

创建`/etc/bind/zones`目录后，编辑：

```bind {filename="/etc/bind/zones/db.internal.example.com"}
$TTL    86400
@       IN      SOA     ns1.internal.example.com. admin.internal.example.com. (
                     2025122201         ; Serial（每次修改+1）
                     3600               ; Refresh
                     1800               ; Retry
                     604800             ; Expire
                     86400 )            ; Minimum TTL

@       IN      NS      ns1.internal.example.com.
@       IN      NS      ns2.internal.example.com.

ns1     IN      A       172.16.0.223
ns2     IN      A       172.16.0.225

app1.bj   IN      A       172.16.0.1
app2.bj   IN      A       172.16.0.2
app3.bj   IN      A       172.16.0.3

gitlab.bj   IN      A       172.16.0.100
harbor.bj   IN      A       172.16.0.101
grafana.bj   IN      A       172.16.0.102
mysql.bj   IN      A       172.16.0.103
jenkins.bj   IN      A       172.16.0.104
```
- 区域数据库配置详细说明参考：[https://llinux.cn/基础服务/bind9-dns/#区域数据库](https://llinux.cn/%E5%9F%BA%E7%A1%80%E6%9C%8D%E5%8A%A1/bind9-dns/#%e5%8c%ba%e5%9f%9f%e6%95%b0%e6%8d%ae%e5%ba%93)

#### 4. 测试
```sh
# 检查配置文件语法
named-checkconf

# 重新加载配置文件
systemctl reload bind9

# 测试内网 DNS 解析
root@local-server:~# nslookup app1.bj.internal.example.com 172.16.0.223
Server:		172.16.0.223
Address:	172.16.0.223#53

Name:	app1.bj.internal.example.com
Address: 172.16.0.1

root@local-server:~# nslookup mysql.bj.internal.example.com 172.16.0.223
Server:		172.16.0.223
Address:	172.16.0.223#53

Name:	mysql.bj.internal.example.com
Address: 172.16.0.103


# 测试公网 DNS 解析
root@local-server:~# nslookup baidu.com 172.16.0.223
Server:		172.16.0.223
Address:	172.16.0.223#53

Non-authoritative answer:
Name:	baidu.com
Address: 111.63.65.247
Name:	baidu.com
Address: 110.242.74.102
Name:	baidu.com
Address: 111.63.65.103
Name:	baidu.com
Address: 124.237.177.164

root@local-server:~# nslookup qq.com 172.16.0.223
Server:		172.16.0.223
Address:	172.16.0.223#53

Non-authoritative answer:
Name:	qq.com
Address: 123.150.76.218
Name:	qq.com
Address: 203.205.254.157
Name:	qq.com
Address: 113.108.81.189

```

### 从 DNS 服务器配置
- 从 DNS 服务器无需配置区域数据库，而是向主服务器同步。

#### 1. 修改全局配置文件
- `/etc/bind/named.conf.options` 与主节点一致。

#### 2. 配置本地 zone
```bind {filename="/etc/bind/named.conf.local"}
zone "internal.example.com" {
    type slave; // 类型为从节点
    file "/var/cache/bind/db.internal.example.com";   // Slave 自动写入这里（AppArmor 允许）
    masters { 172.16.0.223; };                      // Master IP
    allow-notify { 172.16.0.223; };                 // 只接受 Master notify
};

// 反向区同理（可选）
// zone "1.168.192.in-addr.arpa" {
//     type slave;
//     file "/var/cache/bind/db.192.168.1";
//     masters { 172.16.0.223; };
// };
```

#### 3. 测试
```sh
# 检查配置文件语法
named-checkconf

# 重新加载配置文件
systemctl reload bind9

# 查看同步的 zone 文件
root@bj-dns-slave:~# named-compilezone -f raw -F text -o - internal.example.com /var/cache/bind/db.internal.example.com
zone internal.example.com/IN: loaded serial 2025122201
internal.example.com.			      86400 IN SOA	ns1.internal.example.com. admin.internal.example.com. 2025122201 3600 1800 604800 86400
internal.example.com.			      86400 IN NS	ns1.internal.example.com.
internal.example.com.			      86400 IN NS	ns2.internal.example.com.
app1.bj.internal.example.com.		      86400 IN A	172.16.0.1
app2.bj.internal.example.com.		      86400 IN A	172.16.0.2
app3.bj.internal.example.com.		      86400 IN A	172.16.0.3
gitlab.bj.internal.example.com.		      86400 IN A	172.16.0.100
grafana.bj.internal.example.com.		      86400 IN A	172.16.0.102
harbor.bj.internal.example.com.		      86400 IN A	172.16.0.101
jenkins.bj.internal.example.com.		      86400 IN A	172.16.0.104
mysql.bj.internal.example.com.		      86400 IN A	172.16.0.103
ns1.internal.example.com.			      86400 IN A	172.16.0.223
ns2.internal.example.com.			      86400 IN A	172.16.0.225
OK

# 验证 DNS 主从同步状态，修改主节点 /etc/bind/zones/db.internal.example.com 文件中的任意域名指向，以及Serial编号后，重载配置文件后在从节点测试：
root@local-server:~# nslookup grafana.bj.internal.example.com 172.16.0.225
Server:		172.16.0.225
Address:	172.16.0.225#53

Name:	grafana.bj.internal.example.com
Address: 172.16.0.222
```



## 五、纳入负载均衡（LVS DR）
- 前端负载均衡为 LVS DR 模式

### 1. 主从 DNS 修改 arp 相关内核参数
{{% alert title="<i class='fa-solid fa-exclamation-triangle pe-1'></i> 注意" color=warning %}}
修改arp相关内核参数一定要先于绑定VIP，否则会因添加VIP后产生的免费arp广播而导致地址冲突
{{% /alert %}}

```sh
# 忽略arp广播
echo 'net.ipv4.conf.lo.arp_ignore=1' >> /etc/sysctl.conf
echo 'net.ipv4.conf.all.arp_ignore=1' >> /etc/sysctl.conf

# 对外不公开arp
echo 'net.ipv4.conf.lo.arp_announce=2' >> /etc/sysctl.conf
echo 'net.ipv4.conf.all.arp_announce=2' >> /etc/sysctl.conf

# 使配置生效
sysctl -p
```

### 2. 主从 DNS 绑定 VIP 到 lo 接口
```sh {filename="/etc/netplan/02-vip.yaml"}
network:
  version: 2
  ethernets:
    lo:
      match:
        name: lo
      addresses:
        - 172.16.0.100/32 # VIP
```
- 执行 `netplan apply` 应用配置

### 3. LVS 配置
```nginx {filename="/etc/keepalived/conf.d/dns.conf"}
# DNS UDP 53 转发
virtual_server 172.16.0.100 53 {
    delay_loop 6 # 轮询间隔时间
    lb_algo rr # 负载均衡算法，轮询
    lb_kind DR # DR 模式
    protocol UDP # 协议，UDP 协议

    # 第一个 DNS 服务器
    real_server 172.16.0.223 53 {
        weight 1 # 权重，默认值为 1
        # 健康检查
        DNS_CHECK {
            name gitlab.bj.internal.example.com # 检查的域名
            retry 3 # 重试次数
            delay_before_retry 3 # 每次重试间隔时间
        }
    }

    # 第二个 DNS 服务器
    real_server 172.16.0.225 53 {
        weight 1
        DNS_CHECK {
            name gitlab.bj.internal.example.com
            retry 3
            delay_before_retry 3
        }
    }
}

# DNS TCP 53 转发
virtual_server 172.16.0.100 53 {
    delay_loop 6
    lb_algo rr
    lb_kind DR
    protocol TCP

    real_server 172.16.0.223 53 {
        weight 1
        TCP_CHECK {
            connect_timeout 3
        }
    }

    real_server 172.16.0.225 53 {
        weight 1
        TCP_CHECK {
            connect_timeout 3
        }
    }
}
```
- 执行 `systemctl reload keepalived` 重载 Keepalived 配置

### 4. 测试
```sh
# 从客户端通过 VIP 测试解析是否正常
dig grafana.bj.internal.example.com @172.16.0.100
dig grafana.bj.internal.example.com @172.16.0.100 +tcp
```


## 六、下发 DNS 配置
1. 修改VPN服务端的首选DNS，指向 VIP `172.16.0.100`

## 七、遇到的坑与解决方案
- <span style="color: red;">下面的内容，点击展开</span>

{{< collapse summary="**客户端与 DNS 服务器的 IP 与 53端口通，但无法解析域名**" >}}
日志如下：
- ```sh
  # journalctl -u named -f
  ...
  Dec 23 04:02:35 bj-dns-master named[2564]: client @0x7f8e680900a8 172.16.128.2#62971 (ns1.internal.example.com): query 'ns1.internal.example.com/A/IN' denied
  Dec 23 04:02:42 bj-dns-master named[2564]: client @0x7f8e640089a8 172.16.128.2#62972 (ns2.internal.example.com): query 'ns2.internal.example.com/A/IN' denied
  ```
原因：
- `172.16.128.2` 不在子网 `172.16.0.0/18` 中，导致查询请求被拒绝。

解决方案：
- 修改 `/etc/bind/named.conf.options`，allow-query 中添加被拒绝的IP：`allow-query { 172.16.128.2; 172.16.0.0/18; localhost; };`
{{< /collapse >}}

{{< collapse summary="**内网域名可解析，但互联网域名无法解析**" >}}
日志如下：
- ```sh
  # journalctl -u named -f
  ...
  Dec 23 04:21:32 bj-dns-master named[2649]:   validating com/DS: bad cache hit (./DNSKEY)
  Dec 23 04:21:32 bj-dns-master named[2649]: broken trust chain resolving 'baidu.com/A/IN': 223.6.6.6#53
  ```

原因：
- BIND 开启了 DNSSEC 自动校验`dnssec-validation auto;`，但在转发模式`forward only;`下，上游 DNS（如 223.6.6.6）返回的加密验证信息无法通过 BIND 本地的安全性检查，导致“信任链断裂”。

解决方案：
- 修改 `/etc/bind/named.conf.options`，关闭 DNSSEC 校验，以避免信任链断裂：`dnssec-validation no;`
{{< /collapse >}}

{{< collapse summary="**Master 上修改了区文件并重载了服务，但 Slave 上查询还是旧数据**" >}}
原因：
- Master SOA 记录中的 Serial 序列号没有增加，导致 Slave 认为 Master 没有更新，从而不触发 zone transfer。

解决方案：
  - 在 Master 上修改区文件后，增加 Serial 序列号，格式为 `YYYYMMDDnn`（年月日+序号），每次修改都需要增加。
  - 例如：如果当前 Serial 为 `2025010202`，则下一次修改后 Serial 应为 `2025010203`。
  - 确保 Slave 上的 Serial 与 Master 一致，才能触发 zone transfer。
{{< /collapse >}}


## 八、压力测试
```sh
# 生成 10000 条查询记录
for i in {1..10000}; do echo "grafana.bj.internal.example.com A" > queryfile.txt; done

# 测试 100 个并发查询，每个查询持续 60 秒
dnsperf -s 172.16.0.100 -d queryfile.txt -c 100 -l 60
```



## 九、纳入监控体系
### 监控

**1. 部署 BIND Exporter：**
- 分别在主从 DNS 服务器上部署 BIND Exporter。
```sh
# 创建 prometheus 用户
useradd -rs /bin/false prometheus

# 下载最新的 v0.7.0 版本（支持 BIND 9.18+ JSON/XML）
wget https://github.com/prometheus-community/bind_exporter/releases/download/v0.7.0/bind_exporter-0.7.0.linux-amd64.tar.gz

# 解压
tar -xvf bind_exporter-0.7.0.linux-amd64.tar.gz \
    -C /usr/bin/ \
    --strip-components=1 \
    bind_exporter-0.7.0.linux-amd64/bind_exporter

# 创建 systemd 服务文件
cat >> /etc/systemd/system/bind-exporter.service <<EOF
[Unit]
Description=Prometheus exporter for Bind
Documentation=https://github.com/digital_ocean/bind_exporter

[Service]
Restart=on-failure
User=prometheus
EnvironmentFile=/etc/default/bind_exporter
ExecStart=/usr/bin/bind_exporter $ARGS

[Install]
WantedBy=multi-user.target  
EOF

# 创建环境变量文件
cat >> /etc/default/bind_exporter <<EOF
ARGS="
--bind.stats-url http://localhost:8053/json
--bind-address=0.0.0.0:9119
"
EOF

# 启动并设置开机自启
systemctl daemon-reload
systemctl enable --now bind-exporter

# promenade 主机测试数据采集
root@k8s-master-1:~# curl -s http://172.16.0.223:9119/metrics  | grep zone_name
bind_zone_serial{view="_default",zone_name="0.in-addr.arpa"} 1
bind_zone_serial{view="_default",zone_name="127.in-addr.arpa"} 1
bind_zone_serial{view="_default",zone_name="255.in-addr.arpa"} 1
bind_zone_serial{view="_default",zone_name="internal.example.com"} 2.026010301e+09
bind_zone_serial{view="_default",zone_name="localhost"} 2
root@k8s-master-1:~# curl -s http://172.16.0.225:9119/metrics  | grep zone_name
bind_zone_serial{view="_default",zone_name="0.in-addr.arpa"} 1
bind_zone_serial{view="_default",zone_name="127.in-addr.arpa"} 1
bind_zone_serial{view="_default",zone_name="255.in-addr.arpa"} 1
bind_zone_serial{view="_default",zone_name="internal.example.com"} 2.026010301e+09
bind_zone_serial{view="_default",zone_name="localhost"} 2
```

**2. Prometheus 配置：**
```yaml {filename="/root/k8s/helm/prometheus/values-prometheus-25.8.2.yaml"}
...
extraScrapeConfigs: |
  - job_name: 'bind-dns'
    scrape_interval: 15s
    metrics_path: /metrics
    static_configs:
      - targets:
        - '172.16.0.223:9119'
        labels:
          env: 'prod'
          service: 'dns'
          role: 'master'
      - targets:
        - '172.16.0.225:9119'
        labels:
          env: 'prod'
          service: 'dns'
          role: 'slave'
...
```

```sh
# 升级 prometheus 配置
helm upgrade prometheus ./prometheus-25.8.2.tgz -f values-prometheus-25.8.2.yaml -n monitoring

# 重启 prometheus-server 使配置生效
kubectl delete pod -n monitoring prometheus-server-7968f8d597-mbg2g
```

### 展示
- 该面板地址：[github](https://github.com/example/dns-monitoring-dashboard)
![](/docs/基础服务/dns/实践案例/主从DNS监控面板.png)

### 告警
...

## 十、运维阶段
### 更新 DNS 记录
在 BIND 主从架构中，更新域名记录只需要在 **主服务器 (Master, 172.16.0.223)** 上操作，从服务器会自动同步。

**1. 登录到主服务器 (`172.16.0.223`)，修改区域文件：**
```bind {filename="/etc/bind/zones/db.internal.example.com"}
$TTL    86400
@       IN      SOA     ns1.internal.example.com. admin.internal.example.com. (
                     2026010301         ; Serial（每次修改+1）建议格式：YYYYMMDDnn (年月日+序号)
                     3600               ; Refresh
                     1800               ; Retry
                     604800             ; Expire
                     86400 )            ; Minimum TTL
...
harbor.bj	IN      A       172.16.0.100 ; 修改 IP
...
```
{{% alert title="<i class='fa-solid fa-exclamation-triangle pe-1'></i>" color=warning %}}
- 每次修改区文件后，都需要增加 Serial 序列号，这是触发主从同步的关键。
{{% /alert %}}

**2. 检查语法并重载服务：**
```sh
# 检查配置文件语法
named-checkconf
# 输出应为: OK

# 重新加载配置文件
systemctl reload bind9
```
**3. 测试域名解析结果：**
```sh
# 从客户端通过 DNS Master 测试解析是否正常
dig harbor.bj.internal.example.com @172.16.0.223
dig harbor.bj.internal.example.com @172.16.0.223 +tcp

# 从客户端通过 DNS Slave 测试解析是否正常
dig harbor.bj.internal.example.com @172.16.0.225
dig harbor.bj.internal.example.com @172.16.0.225 +tcp

# 从客户端通过 VIP 测试解析是否正常
dig harbor.bj.internal.example.com @172.16.0.100
dig harbor.bj.internal.example.com @172.16.0.100 +tcp
```

