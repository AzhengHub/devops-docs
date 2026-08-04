---
title: "Zabbix 相关调试工具"
---

# zabbix_get

**检测 zabbix-agent 是否生效**

- agent 配置文件中的 Server 项没配置时无法使用，但是 ServerActive 指向了 proxy 还是一样可以监控到数据
- 在zabbix server上执行：

```bash
# zabbix_get -s 10.0.0.18 -p 10050 -k "agent.ping"
1   #1表示在线，即可用，只要有返回的数据就说明能与agent建立连接 反之则无法建立连接


# zabbix-server上存在多个IP时需要 -I 指定源地址
# zabbix_get -s 10.0.0.18 -p 10050 -I 10.0.0.8 -k "agent.ping"
1
```



