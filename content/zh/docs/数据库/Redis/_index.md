---
title: "Redis"
---


# Redis 特点

- **redis为非关系型数据库(nosql)，是基于键值对的数据库(key value)**

- 速度快，10W QPS，基于内存，C语言实现
- 单线程（6.0后发布了多线程功能）
- 持久化（支持将数据存放在磁盘上）
- 支持多种数据结构
- 支持多种编程语言
- 功能丰富：支持Lua脚本，发布订阅，事务，pipeline等功能
- 简单：代码短小精悍(单机核心代码只有23000行左右)，单线程开发容易，不依赖外部库，使用简单
- 主从复制
- 支持高可用和分布式





# Redis 应用场景

- **session共享**：常见于web集群中的Tomcat或者PHP中的web服务器session共享
- **缓存**：数据查询、电商网站商品信息、新闻内容
- **计数器**：访问排行榜、商品浏览数等和次数相关的数值统计场景
- **微博/微信社交场合**：共同好友、粉丝数、关注、点赞评论等
- **消息队列**：ELK的日志缓存、部分业务的订阅发布系统
- **地理位置**：基于GEO(地理信息定位)、实现摇一摇、附近的人、外卖等功能













# Redis 基础操作

##  启动

```bash
#前台启动
[root@centos8 ~]$sed -Ei 's/^(daemonize ).*$/\1 no/' /apps/redis/etc/redis.conf
[root@centos8 /]$redis-server /apps/redis/etc/redis.conf #启动服务

#后台启动
systemctl enable --now redis
```

## 登录

- **redis只有一个账号**

```bash
#登录
[root@aliyun ~]# redis-cli

#交互式验证密码登录
[root@aliyun ~]# redis-cli  
127.0.0.1:6379> info
NOAUTH Authentication required.
127.0.0.1:6379> auth 123456
OK

#非交互式密码验证登录
[root@aliyun ~]# redis-cli -a 123456
127.0.0.1:6379> info
或者
[root@aliyun ~]# redis-cli -a 123456 info

#指定主机登录
[root@aliyun ~]# redis-cli -a 123456 -h 10.0.0.8

#redis帮助文档
[root@centos8 ~]$redis-cli --help

#redis的详细信息
[root@centos8 ~]$redis-cli info

#使用密码进行交互式操作
10.0.0.8:6379> auth password
#或者
[root@centos8 ~]$redis-cli -h 10.0.0.8 -p 6379 -a passwd info

#保存内容
127.0.0.1:6379>save
```

## 添加数据

```bash
#添加数据，abc为key，123为value
127.0.0.1:6379> SET abc 123
OK
#查看数据
127.0.0.1:6379> get abc
"123"

#可以看到增加了一个数值
127.0.0.1:6379> info keyspace
# Keyspace
db0:keys=1,expires=0,avg_ttl=0
```







# Redis info 说明

```bash
127.0.0.1:6379> info
# Server
redis_version:6.2.6
redis_git_sha1:00000000
redis_git_dirty:0
redis_build_id:f850a25e83382df3
redis_mode:standalone
os:Linux 4.18.0-240.el8.x86_64 x86_64
arch_bits:64
multiplexing_api:epoll
atomicvar_api:c11-builtin
gcc_version:8.5.0
process_id:21321
process_supervised:systemd
run_id:9996b66283371cbac270ca5d9a727ea0d72a8746 #每次节点启动后生成的唯一编号
tcp_port:6379
server_time_usec:1640328047050174
uptime_in_seconds:690
uptime_in_days:0
hz:10
configured_hz:10
lru_clock:12938095
executable:/apps/redis/bin/redis-server
config_file:/apps/redis/etc/redis.conf
io_threads_active:0

# Clients
connected_clients:1 #当前连接redis客户端的用户数量
cluster_connections:0
maxclients:10000
client_recent_max_input_buffer:16
client_recent_max_output_buffer:0
blocked_clients:0
tracking_clients:0
clients_in_timeout_table:0

# Memory
used_memory:873728 #使用的内存数
used_memory_human:853.25K #使用的内存数，人类好理解的方式显示
used_memory_rss:13922304
used_memory_rss_human:13.28M
used_memory_peak:931824
used_memory_peak_human:909.98K
used_memory_peak_perc:93.77%
used_memory_overhead:830496
used_memory_startup:810000
used_memory_dataset:43232
used_memory_dataset_perc:67.84%
allocator_allocated:1029784
allocator_active:1351680
allocator_resident:3895296
total_system_memory:987148288
total_system_memory_human:941.42M
used_memory_lua:37888
used_memory_lua_human:37.00K
used_memory_scripts:0
used_memory_scripts_human:0B
number_of_cached_scripts:0
maxmemory:536870912 #redis最大可以使用的内存量
maxmemory_human:512.00M #redis最大可以使用的内存量，人类好理解的方式显示
maxmemory_policy:noeviction
allocator_frag_ratio:1.31
allocator_frag_bytes:321896
allocator_rss_ratio:2.88
allocator_rss_bytes:2543616
rss_overhead_ratio:3.57
rss_overhead_bytes:10027008
mem_fragmentation_ratio:16.75
mem_fragmentation_bytes:13091344
mem_not_counted_for_evict:0
mem_replication_backlog:0
mem_clients_slaves:0
mem_clients_normal:20496
mem_aof_buffer:0
mem_allocator:jemalloc-5.1.0
active_defrag_running:0
lazyfree_pending_objects:0
lazyfreed_objects:0

# Persistence
loading:0
current_cow_size:0
current_cow_size_age:0
current_fork_perc:0.00
current_save_keys_processed:0
current_save_keys_total:0
rdb_changes_since_last_save:0
rdb_bgsave_in_progress:0 #0表示bgsave已经结束，非0表示当前gbsave正在执行
rdb_last_save_time:1640327357
rdb_last_bgsave_status:ok
rdb_last_bgsave_time_sec:-1
rdb_current_bgsave_time_sec:-1
rdb_last_cow_size:0
aof_enabled:0
aof_rewrite_in_progress:0
aof_rewrite_scheduled:0
aof_last_rewrite_time_sec:-1
aof_current_rewrite_time_sec:-1
aof_last_bgrewrite_status:ok
aof_last_write_status:ok
aof_last_cow_size:0
module_fork_in_progress:0
module_fork_last_cow_size:0

# Stats
total_connections_received:1
total_commands_processed:1
instantaneous_ops_per_sec:0
total_net_input_bytes:31
total_net_output_bytes:20324
instantaneous_input_kbps:0.01
instantaneous_output_kbps:12.28
rejected_connections:0
sync_full:0
sync_partial_ok:0
sync_partial_err:0
expired_keys:0
expired_stale_perc:0.00
expired_time_cap_reached_count:0
expire_cycle_cpu_milliseconds:13
evicted_keys:0
keyspace_hits:0
keyspace_misses:0
pubsub_channels:0
pubsub_patterns:0
latest_fork_usec:0
total_forks:0
migrate_cached_sockets:0
slave_expires_tracked_keys:0
active_defrag_hits:0
active_defrag_misses:0
active_defrag_key_hits:0
active_defrag_key_misses:0
tracking_total_keys:0
tracking_total_items:0
tracking_total_prefixes:0
unexpected_error_replies:0
total_error_replies:0
dump_payload_sanitizations:0
total_reads_processed:2
total_writes_processed:1
io_threaded_reads_processed:0
io_threaded_writes_processed:0

# Replication
role:master #主从复制的角色
connected_slaves:0
master_failover_state:no-failover
master_replid:69bf7b12a947f3760a27ef02b7a0c314f24c018d
master_replid2:0000000000000000000000000000000000000000
master_repl_offset:0 #偏移量
second_repl_offset:-1
repl_backlog_active:0
repl_backlog_size:1048576 #复制环形队列缓冲区的大小，字节为单位，默认为1M
repl_backlog_first_byte_offset:0
repl_backlog_histlen:0

# CPU
used_cpu_sys:0.477740
used_cpu_user:0.353523
used_cpu_sys_children:0.000000
used_cpu_user_children:0.000000
used_cpu_sys_main_thread:0.478628
used_cpu_user_main_thread:0.352333

# Modules

# Errorstats

# Cluster
cluster_enabled:0

# Keyspace


```

















# 容器中操作

```bash
#1.查看redis容器id     
docker ps -a       

#2. 进入redis的容器   
docker exec -it 容器ID bash       

#3.运行命令：
redis-cli

#4.查看现有的redis密码：
config get requirepass

#5.设置redis密码
config set requirepass ****（****为你要设置的密码）

#6.若出现(error) NOAUTH Authentication required.错误，则使用 auth 密码 来认证密码
```







# Redis 核心监控项

- 端口是否存活、进程是否存在
- redis的客户端连接数（会话连接数量）
- 每秒处理请求总数
- 阻塞连接数
- redis内存使用量
- 主从角色
