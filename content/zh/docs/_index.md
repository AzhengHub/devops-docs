---
title: 文档首页
layout: home-terminal
no_list: true
body_class: td-home-terminal
---

{{< terminal title="azheng@devops: ~ — bash" >}}
{{< termcmd "whoami" >}}
{{< termout >}}
👋 Hi，我是 **阿征**，一名资深的运维工程师 👨‍💻，擅长 Kubernetes、CICD、监控等技术栈。欢迎来到我的个人主页 ✨ 在这里一起解锁 DevOps/SRE 的运维魔法吧～
{{< /termout >}}
{{< termcmd "tree ~/docs" >}}
{{< termout >}}
**🐳 容器与编排**

- [Kubernetes](/docs/kubernetes/) — K8s 集群管理、Pod、Service、Ingress、RBAC、CRD 等核心组件与实践
- [容器](/docs/容器/) — Docker、Containerd、Cgroup 等容器技术

**🔄 CI/CD 与自动化**

- [CI/CD](/docs/cicd/) — Jenkins、GitLab CI、SonarQube、Git 等持续集成与持续部署
- [GitOps](/docs/gitops/) — GitOps 实践与工具

**📊 监控与可观测性**

- [监控与告警](/docs/监控与告警/) — Prometheus、Grafana、Zabbix、Alertmanager 等监控解决方案
- [日志采集](/docs/日志采集/) — Vector、Loki、ELK Stack、Fluentd、Filebeat 等日志收集与分析

**🌐 网络与服务**

- [HTTP](/docs/http/) — Nginx、Apache、Tomcat、CA 证书管理等 Web 技术
- [负载均衡与高可用](/docs/负载均衡与高可用/) — HAProxy、Keepalived、LVS 等负载均衡技术
- [基础服务](/docs/基础服务/) — DNS、DHCP、FTP、SAMBA、NTP、Nexus、SSH 等基础服务

**💾 存储与数据**

- [存储](/docs/存储/) — Ceph、NFS 等存储解决方案
- [关系型与非关系型数据库](/docs/关系型与非关系型数据库/) — 各类数据库技术与实践

**🔐 安全与审计**

- [VPN](/docs/vpn/) — OpenVPN 等 VPN 技术
- [堡垒机](/docs/堡垒机/) — JumpServer 等堡垒机技术

**🖥️ 基础设施**

- [Linux](/docs/linux/) — 系统管理、网络管理、磁盘管理、内存管理、Systemd 等
- [Shell](/docs/shell/) — Shell 脚本编写与最佳实践
- [虚拟化](/docs/虚拟化/) — KVM 等虚拟化技术
- [AWS](/docs/aws/) — 云平台相关实践

**📨 中间件与大数据**

- [中间件](/docs/中间件/) — Kafka、RabbitMQ、ZooKeeper 等分布式中间件
- [大数据](/docs/大数据/) — Hive 等大数据技术

**💻 编程语言**

- [Python](/docs/python/) — Python 编程、Flask、FastAPI、SQLAlchemy 等
- [编程语言](/docs/编程语言/) — Go、Java、C、SQL、前端开发等多语言技术

**📖 面试与学习**

- [面试宝典](/docs/面试宝典/) — 常见面试题汇总与解答
{{< /termout >}}
{{< termcmd "cat features.md" >}}
{{< termout >}}
**🎯 文档特点**

- **实战导向** — 所有内容都来自实际生产环境的实践和总结
- **持续更新** — 随着技术栈的演进和经验的积累，文档会持续更新
- **最佳实践** — 不仅介绍工具使用方法，更注重分享最佳实践和踩坑经验
{{< /termout >}}
{{< termcmd "echo $WELCOME" >}}
{{< termout >}}
🚀 你可以通过左侧导航栏浏览各个分类，或者使用搜索功能快速找到你需要的内容。

*希望这些文档能帮助你在 DevOps/SRE 的道路上少走弯路，共同成长！* 🎉
{{< /termout >}}
{{< /terminal >}}
