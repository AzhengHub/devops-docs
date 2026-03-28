---
title: "GitLab CI/CD"
---

## GitLab vs Jenkins

在 Jenkins 中，需要配置各种插件、管理节点（Nodes），并在 Jenkins UI 或 Jenkinsfile 中定义流水线。GitLab CI 将这些概念做了极大的简化，并且更倾向于云原生的思维。

下面这两者的核心概念映射表：

| Jenkins 概念 🏗️ | GitLab CI 概念 🦊 | 核心差异与说明 |
| :--- | :--- | :--- |
| **Jenkins Master** | **GitLab Server** | GitLab 代码仓库自带 CI/CD 的调度能力，你不需要像 Jenkins 那样去额外搭建和维护一个独立的控制中心。 |
| **Agent / Node / Slave** | **GitLab Runner** | Runner 是实际干活（执行代码构建、测试）的机器。它可以是你局域网里的一台物理机，也可以是云上的动态容器。 |
| **Jenkinsfile (Groovy)** | **`.gitlab-ci.yml` (YAML)** | 流水线配置文件。GitLab 要求它放在代码仓库的根目录，并使用更具可读性的 YAML 语法，而不是像 Jenkins 那样使用 Groovy 脚本。 |
| **Plugins (插件生态)** | **Docker Images (容器镜像)** | **这是最大的思维转变。** Jenkins 极度依赖插件（如 Maven 插件、NodeJS 插件），而 GitLab CI 提倡“一切皆容器”。你需要什么环境，就在代码里直接指定对应的 Docker 镜像。 |
| **Stage & Step** | **Stage & Job & Script** | 层级关系非常相似。一条 Pipeline 包含多个 Stage（阶段），Stage 包含多个平行运行的 Job（任务），Job 中包含具体执行的 Script（脚本命令）。 |



**💡 核心思维转变：从“装插件”到“拉镜像”**

假设你的项目既需要 Java 环境编译后端，又需要 Node.js 环境打包前端：
* **在 Jenkins 中：** 你通常需要在 Jenkins Master 上安装相关的环境插件，或者在 Agent 机器上提前手动装好 JDK 和 Node 环境。如果不同项目需要的版本冲突了，管理起来会很头疼。
* **在 GitLab CI 中：** 你只需要在后端的任务里写一行 `image: maven:3.8`，在前端的任务里写一行 `image: node:18`。GitLab Runner 会自动拉取这两个纯净的 Docker 镜像，在隔离的容器里执行你的命令，执行完毕后容器直接销毁，干脆利落。

