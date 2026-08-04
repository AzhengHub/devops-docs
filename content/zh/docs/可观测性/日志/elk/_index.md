---
title: "ELK"
---

# ELK 概述

- ELK是由 Elasticsearch、Logstash、Kibana 三个开源软件组成的组合体，ELK 是 elastic 公司研发的一套完整的日志收集、分析和展示的企业级解决方案


- **组件调用关系：**客户端打开Kibana浏览器界面向Elasticsearch获取信息，而Elasticsearch的信息是由Logstash或beats获取的



# 安装要求：

- 磁盘空间一定要大，并且推荐每个服务器存储空间相同，都为固态盘、或高转速机械等做RAID10
- CPU：2*E5 2660 2.2Ghz+
- 内存：64/96/128G，elasticsearch本身26-30G内存就够用，剩下的留给系统用
- elasticsearch默认是不允许使用root账号启动的，所以需要对elasticsearch这个用户单独做优化，或者配置文件用户处直接*
- **安装一定要注意三个程序的版本号一定要统一，否则会出现功能不全甚至无法使用等情况**
