---
title: "TCP连接状态"
---


# 监控 TCP连接状态

## TCP连接核心监控点

- ESTAB 建立连接的数量
- TIME-WAIT 等待连接关闭数量

## 准备监控tcp连接数脚本

- 脚本是放在被监控的主机上的


```sh
[root@nginx-web1 ~]# vim /etc/zabbix/zabbix_agentd.d/tcp_conn_stat.sh
#!/bin/bash
#Author:Xiang Zheng
tcp_conn_status(){
    TCP_STAT=$1
    ss -nta | awk 'NR>1 {++s[$1]} END {for(k in s) print k,s[k]}' > /tmp/tcp_conn.txt
    TCP_NUM=$(grep "$TCP_STAT" /tmp/tcp_conn.txt | cut -d ' ' -f2)
    if [ -z $TCP_NUM ];then
            TCP_NUM=0
    fi
    echo $TCP_NUM
}

main(){
    case $1 in
        tcp_status)
            tcp_conn_status $2;
            ;;
    esac
}

main $1 $2
```

## agent中添加自定义监控项

- **说明：**
- **Format:** UserParameter=<key>,<shell command>
- tcp_status[\*] 表示key的名称和接受的参数，[ ]表示接受的参数，[*]表示所有参数
- /bin/bash 表示执行的命令，通常写绝对路径
- "$1" "$2" 表示接受的参数，参数来自tcp_status后面括号中的内容

```bash
[root@nginx-web1 ~]# vim /etc/zabbix/zabbix_agentd.conf
...
UserParameter=tcp_status[*],/bin/bash /etc/zabbix/zabbix_agentd.d/tcp_conn_stat.sh "$1" "$2"
...

#修改配置文件后重启服务使其生效
[root@nginx-web1 ~]# systemctl restart zabbix-agent.service 
```

## 测试脚本是否有效

- proxy或server进行测试

```bash
[root@zabbix-server ~]# zabbix_get -s 10.0.0.28 -p 10050 -k 'tcp_status[tcp_status,LISTEN]'
4
[root@zabbix-server ~]# zabbix_get -s 10.0.0.28 -p 10050 -k 'tcp_status[tcp_status,TIME-WAIT]'
2
```

## web界面配置

- 配置 --> 主机 --> 选择主机 --> 监控项 --> 创建监控项
  - 名称 如：tcp已连接统计
  - 类型 如：Zabbix客户端(主动式)
  - 键值 如：tcp_status[tcp_status,ESTAB]
- 配置 --> 主机 --> 选择主机 --> 监控项 --> 创建图形
  - 名称 如：tcp已连接统计
  - 监控项 如：tcp已连接统计



