---
title: "实现个人项目的自动化部署（GitHub Actions + 阿里云ECS）"
---


## 项目概述

之前每次写完项目笔记推送到 GitHub 后，我都得手动 SSH 登录到阿里云服务器，执行 `git pull` 拉取最新代码，然后再重启相关的 Hugo 服务。这个过程虽然不难，但每次更新都要重复操作，比较麻烦。再加上国内云服务器拉取 GitHub 时经常遇到网络超时或连接重置，导致手动部署的体验极其糟糕。

为了彻底解决这个痛点，我用 GitHub Actions 跑通了一套极简的自动化部署流程。现在只要将代码 push 到 `main` 分支，流水线就会自动通过 SSH 登录服务器完成代码的强制同步和 Caddy 服务重启。为了应对偶尔的网络抽风，脚本里专门加了最大 5 次的超时重试机制，并且在整个流程结束后，还会把部署成功或报错的结果推送到我的 QQ 邮箱。

下面是具体的实现方式。


---

## 第一步：在阿里云服务器配置 SSH 密钥登录

为了让 GitHub Actions 能够自动登录服务器并执行命令，需要配置免密登录。在阿里云服务器上执行以下命令：

```Bash
# 准备存放密钥对的目录
mkdir -p github-actions-deploy
cd github-actions-deploy

# 生成一个专门用于部署的 SSH 密钥对，一路回车即可。
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ./deploy_key

# 将生成的公钥（deploy_key.pub 的内容）追加到阿里云服务器的 /root/.ssh/authorized_keys 文件中。
cat deploy_key.pub >> /root/.ssh/authorized_keys

# 将私钥拷贝到一台服务器上测试免密登录（可选）
chmod 600 deploy_key
ssh -i ./deploy_key root@服务器IP
```



## 第二步：配置 GitHub Repository Secrets

将服务器信息安全地存放在 GitHub 仓库中，避免硬编码。

在 GitHub 仓库中，进入 **Settings** -> **Secrets and variables** -> **Actions**，点击 **New repository secret**，添加以下几个变量：

- `SERVER_HOST`：阿里云服务器公网 IP。
- `SERVER_USER`：`root`
- `SERVER_SSH_KEY`：刚刚生成的**私钥**（`deploy_key` 文件中的全部内容，包含 `-----BEGIN...` 和 `-----END...`）。
- `MAIL_USERNAME`：发送方 QQ 邮箱（例如 `12345678@qq.com`）
- `MAIL_PASSWORD`：刚刚获取的 **QQ邮箱 SMTP 授权码**（千万别填邮箱登录密码）
- `MAIL_TO`：接收结果的邮箱地址（可以是同一个 QQ 邮箱，也可以是其他邮箱）



## 第三步：编写 GitHub Actions 工作流文件

在代码仓库根目录下，创建文件 `.github/workflows/deploy.yml`，填入以下内容：

```YAML
name: Deploy Docs to Alibaba Cloud

on:
  push:
    branches:
      - main  # 部署的分支名
jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Execute deployment script via SSH
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SERVER_SSH_KEY }}
          script: |
            cd /root/devops-docs/
            
            # 考虑到阿里云拉取 GitHub 经常超时，设置最大重试 5 次
            MAX_RETRIES=5
            RETRY_COUNT=0
            PULL_SUCCESS=false
            
            # 使用 fetch + reset --hard 覆盖本地，避免线上由于意外修改导致拉取冲突
            while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
              echo "Attempting to fetch code from GitHub (Attempt $((RETRY_COUNT+1))/$MAX_RETRIES)..."
              
              if git fetch origin main && git reset --hard origin/main; then
                PULL_SUCCESS=true
                break
              else
                echo "Git pull failed. Retrying in 10 seconds..."
                RETRY_COUNT=$((RETRY_COUNT+1))
                sleep 10
              fi
            done
            
            if [ "$PULL_SUCCESS" = false ]; then
              echo "Deployment failed: Unable to pull code from GitHub after $MAX_RETRIES attempts."
              exit 1
            fi
            
            echo "Code updated successfully! Restarting caddy-hugo.service..."
            systemctl restart caddy-hugo.service
            
            echo "Service restarted. Deployment completed!"

      - name: Send email notification
        uses: dawidd6/action-send-mail@v3
        if: always()  # 不管上成功还是失败，这步都会执行
        with:
          # QQ 邮箱 SMTP 服务器配置
          server_address: smtp.qq.com
          server_port: 465
          secure: true
          # 认证信息
          username: ${{ secrets.MAIL_USERNAME }}
          password: ${{ secrets.MAIL_PASSWORD }}
          # 邮件内容配置
          subject: "阿里云自动部署结果: ${{ job.status }} 🚀"
          to: ${{ secrets.MAIL_TO }}
          from: GitHub Actions <${{ secrets.MAIL_USERNAME }}>
          body: |
            项目: ${{ github.repository }}
            触发人: ${{ github.actor }}
            提交信息: ${{ github.event.head_commit.message }}
            最终状态: ${{ job.status }}
            
            如需查看详情，请前往 GitHub Actions 页面: 
            https://github.com/${{ github.repository }}/actions/runs/${{ github.run_id }}
```

