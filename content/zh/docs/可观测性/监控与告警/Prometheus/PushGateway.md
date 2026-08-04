---
title: "PushGateway"
---


# PushGateway 概述

- Prometheus数据采集基于Prometheus Server从Exporter pull数据，因此当网络环境不允许Prometheus Server和Exporter进行通信时，可以使用PushGateway来进行中转。
- 通过PushGateway将内部网络的监控数据主动Push到Gateway中，Prometheus Server采用针对Exporter同样的方式，将监控数据从PushGateway pull到Prometheus Server。



