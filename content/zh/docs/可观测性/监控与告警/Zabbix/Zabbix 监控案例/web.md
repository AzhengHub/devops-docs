---
title: "web"
---




# 监控 web

- zabbix提供web监控的功能，但**通常只用于监测公司内部的web界面**，因为使用zabbix上的主机来监控公司的主页面不能真正的模拟用户访问，真实的用户访问是从国内乃至世界的各个角落来的
- 一般的公司web页面监控都是使用专用的监控工具，如：监控宝、听云等... 
- **公司内部的页面必须要设置监控，因为假设一个页面无法访问 那么虽然负载均衡会完成故障的切换，但是这种切换无法给运维人员返回明显的报警，如果这时只剩下一台正常运行的web服务器 那么就很危险了**



## 实现监控主页状态

- 实现监控xiangzheng.vip主页状态
- 官方文档：https://www.zabbix.com/documentation/5.0/zh/manual/web_monitoring/items

## web界面配置

- 配置 --> 主机 --> 选择一个主机点击web监测 如：Zabbix server（主机只要是能访问到被监控的web就可以） --> 创建web场景
- 场景：
  - 名称 如：xiangzheng.vip主页监控
  - 更新间隔 如：30s
  - 尝试次数 如：3
  - 客户端 如：chrome 80 (Windows)
  - 代理：可选 如果本主机上不了网通 需要代理进行上网的话则此项需添加
- 步骤：
  - 添加
    - 名称 如：xiangzheng.vip主页
    - URL 如：https://www.xiangzheng.vip/
    - 跟随跳转：√
    - 超时 如：5s（根据情况设置 一般3-5s）
    - 要求的状态码 如：200
- 添加



## 测试

- 监测 --> 主机 --> 选择主机 --> web监测



## 配置触发器

- 实现故障通知以及监控页面主页展示

- 配置 --> 主机 --> Zabbix server --> 触发器 --> 创建触发器
- 触发器：
  - 名称 如：www.xiangzheng.vip主页无法访问
  - 严重性 如：灾难
  - 表达式：添加
    - 监控项：{Zabbix server:web.test.fail[xiangzheng.vip主页监控].last()}<>0
    - 结果：<> 200
- 添加



## 创建动作

- 配置触发器只能在监控上显示，而创建动作则可以实现故障通知，前提是设置了报警媒介以及接受通知的用户

- 配置 --> 动作 --> 创建动作
- 动作：
  - 名称 如：www.xiangzheng.vip主页无法访问
  - 条件 如：添加 --> 类型 --> 触发器 --> 等于 Zabbix server: www.xiangzheng.vip主页无法访问
- 操作：
  - 默认操作步骤持续时间：60s（多少秒执行一次下面的步骤）
  - 暂停操作以制止问题：√
  - 操作：
    - 操作类型：发送消息
    - 步骤：1-3（根据情况设置，此处1-3表示 总共发送3次 每次间隔60s 因为默认操作步骤持续时间设定的是60s）
    - Send to users：Admin (Zabbix Administrator)
    - 仅送到：网易163邮箱报警媒介
    - Custom message：√
    - 主题：业务报警：www.xiangzheng.vip主页无法访问
    - 消息：XXX
  - 恢复操作：
    - 操作类型：发送消息
    - Send to users：Admin (Zabbix Administrator)
    - 仅送到：网易163邮箱报警媒介
    - 主题：业务报警：www.xiangzheng.vip主页恢复正常
    - 消息：XXX

