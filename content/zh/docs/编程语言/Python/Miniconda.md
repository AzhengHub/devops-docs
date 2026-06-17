---
title: "Miniconda"
---

## Miniconda 概述

**Miniconda** 是 Anaconda 的精简版，是一个开源的 **包管理系统** 和 **环境管理系统**。

简单来说，如果把 Python 比作一个厨师，那么 Miniconda 就是一个**多功能厨房管理系统**：

* **环境管理（Virtual Environments）：** 它可以为你创建无数个独立的“厨房”。在这个厨房里用 Python 3.10 做川菜，在那个厨房里用 Python 3.11 做粤菜，互不干扰，彻底解决“依赖版本冲突”的头疼问题。
* **包管理（Package Management）：** 它能自动帮你下载、安装和更新各种库（如 NumPy, Pandas, Playwright），并自动处理这些库之间复杂的“谁依赖谁”的关系。

**与 Anaconda 的区别：**

* **Anaconda：** 就像一个精装修、带全套家电（预装了 1500+ 个科学计算包）的大豪宅。优点是省心，缺点是极其臃肿（占用数 GB 空间）。
* **Miniconda：** 就像一个清水房。它只包含最核心的 Conda 和 Python，剩下的家具（库）由你根据需求自己去买。它非常轻量，适合开发者和资源受限的服务器。

---

## Miniconda 安装

```sh
# 下载 Miniconda 安装脚本
wget https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh

# 运行安装脚本
bash ~/Miniconda3-latest-Linux-x86_64.sh

# 激活 Conda 环境
source ~/.bashrc
```


## 使用 Miniconda

### 1. 管理虚拟环境

```sh
# 创建环境
conda create --name honey-test python=3.12

# 查看所有已创建的环境
conda env list

# 进入环境
conda activate honey-test

# 退出当前环境
conda deactivate

# 删除环境
conda remove --name honey-test --all
```

## 2. 管理包
在激活环境后，你可以安装所需的工具。

* **安装包：**
`conda install numpy` (或者使用 `pip install numpy`)
* **卸载包：**
`conda remove numpy`
* **查看当前环境已安装的包：**
`conda list`

## 3. 进阶：配置国内镜像源

由于 Conda 默认服务器在海外，下载速度可能较慢。建议替换为清华大学或阿里云的镜像：

```bash
conda config --add channels https://mirrors.tuna.tsinghua.edu.cn/anaconda/pkgs/free/
conda config --set show_channel_urls yes

```

---

## 典型的开发工作流示例

假设你要开始一个 Playwright 自动化项目：

1. **打开终端**。
2. **创建专属环境**：`conda create -n web_test python=3.10`。
3. **进入环境**：`conda activate web_test`。
4. **安装依赖**：`pip install pytest-playwright`。
5. **开始写代码**：此时你的全局 Python 环境依然干净，所有改动都只在这个 `web_test` 抽屉里。

