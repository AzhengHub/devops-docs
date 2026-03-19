---
title: "GitLab CI/CD"
---
* **核心逻辑**：将重复性劳动转化为代码（Pipeline as Code），以及控制面（GitLab Server）与数据面（GitLab Runner）的解耦。
* **具体内容**：
    * GitLab Server 与 GitLab Runner 的通信原理。
    * `.gitlab-ci.yml` 的声明式语法解析（Stages, Jobs, Scripts）。
    * 环境变量与制品（Artifacts）在 Pipeline 中的传递。
    * *实践：注册一个 Runner 并跑通一个简单的 Echo Pipeline。*