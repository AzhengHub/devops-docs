---
title: "实现个人项目的自动化部署（Github+阿里云ECS）"
---

## 一、项目背景
GitHub Actions + 阿里云ECS 实现个人项目的自动化部署
GitHub 的运行器（Runner）构建好代码后，通过 SSH 登录到您的 ECS，将文件拷贝过去并执行重启命令。

## 二、实现流程

### 1. 生成 SSH 密钥对
- 在阿里云 ECS 实例上配置 SSH 密钥对。
```sh
# 生成 deploy_key (私钥) 和 deploy_key.pub (公钥)
ssh-keygen -t rsa -b 4096 -C "github-actions-deploy" -f ./deploy_key

# 将公钥 (deploy_key.pub) 的内容追加到 ECS 需要登录用户的 ~/.ssh/authorized_keys 文件中。
cat ./deploy_key.pub >> ~/.ssh/authorized_keys
```

### 2. 配置 GitHub Secrets
- 将公钥添加到 GitHub 仓库的部署密钥中，用于从 GitHub Actions 登录到 ECS。

在 GitHub **项目**仓库中，进入 `Settings` -> `Secrets and variables` -> `Actions` -> `New repository secret`，依次添加以下变量：
- ECS_HOST: 阿里云 ECS 的公网 IP。
- ECS_USER: 登录用户名（例如 root 或 admin）。
- ECS_SSH_KEY: 私钥 (deploy_key) 的完整内容。

### 3. 创建 Workflow 文件
```sh
# 在项目根目录创建 .github/workflows 目录
mkdir /root/devops-docs/.github/workflows
```

### 4. 最小可行性测试

```yaml {filename="/root/devops-docs/.github/workflows/deploy.yml"}
name: Deploy to Aliyun ECS

on:
  push:
    branches: [ "main" ]  # 监听 main 分支的推送

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      # 1. 拉取代码
      - name: Checkout code
        uses: actions/checkout@v4

      # 2. 构建项目 (以 Node.js 为例，如果是 Go/Java 请替换相应命令)
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Install & Build
        run: |
          npm install
          npm run build
          # 假设构建产物在 dist/ 目录下

      # 3. 将构建产物传输到 ECS
      - name: Copy files via SCP
        uses: appleboy/scp-action@master
        with:
          host: ${{ secrets.ECS_HOST }}
          username: ${{ secrets.ECS_USER }}
          key: ${{ secrets.ECS_SSH_KEY }}
          source: "dist/*"        # 本地构建产物路径
          target: "/var/www/app"  # ECS 目标路径
          strip_components: 1     # 去除源路径的一层目录结构

      # 4. SSH 登录并重启服务
      - name: Restart Server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.ECS_HOST }}
          username: ${{ secrets.ECS_USER }}
          key: ${{ secrets.ECS_SSH_KEY }}
          script: |
            cd /var/www/app
            # 这里写您的重启脚本，例如：
            # pm2 restart app
            # 或者 docker-compose down && docker-compose up -d
            echo "Deployment finished!"
```

## 三、配置触发条件
- 在 Workflow 文件中配置触发条件，例如在每次推送到主分支时触发。