---
title: "Caddy"
---

## Caddy 概述

Caddy 是一个现代的、开源的 Web 服务器，以其自动 HTTPS、简单配置和强大功能而闻名。Caddy 是用 Go 语言编写的，具有跨平台、高性能和易于使用的特点。

## 为什么选择 Caddy

- **自动 HTTPS**：默认启用 HTTPS，自动获取和续订 Let's Encrypt 证书
- **简单配置**：使用 Caddyfile 配置，语法简洁直观
- **现代化特性**：支持 HTTP/2、HTTP/3、WebSockets、Server-Sent Events 等
- **高性能**：基于 Go 语言的高性能网络库
- **跨平台**：支持 Linux、macOS、Windows 等多种操作系统
- **可扩展**：通过插件系统扩展功能

## Caddy 特性

- **自动 HTTPS**：无需手动配置证书，自动处理证书获取和续订
- **HTTP/2 & HTTP/3 支持**：默认启用现代 HTTP 协议
- **反向代理**：强大的反向代理功能，支持负载均衡
- **静态文件服务**：高性能的静态文件服务
- **API**：内置 RESTful API，用于动态配置
- **插件系统**：丰富的插件生态系统，支持各种功能扩展
- **日志记录**：灵活的日志配置
- **访问控制**：支持 IP 白名单、密码认证等

## Caddy 安装

### 包管理器安装

#### Ubuntu/Debian

```bash
# 添加 Caddy 官方仓库
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list

# 更新包列表并安装 Caddy
sudo apt update
sudo apt install caddy
```

#### CentOS/RHEL

```bash
# 添加 Caddy 官方仓库
sudo yum install -y yum-utils
sudo yum-config-manager --add-repo https://dl.cloudsmith.io/public/caddy/stable/rpm/el/$(rpm -E %{rhel})/x86_64/caddy-stable.repo

# 安装 Caddy
sudo yum install caddy
```

### 二进制安装

从 [Caddy 官方网站](https://caddyserver.com/download) 下载适合您系统的二进制文件。

```bash
# 下载 Caddy
wget https://github.com/caddyserver/caddy/releases/download/v2.7.6/caddy_2.7.6_linux_amd64.tar.gz

# 解压文件
tar -xzf caddy_2.7.6_linux_amd64.tar.gz

# 移动二进制文件到 /usr/local/bin
sudo mv caddy /usr/local/bin/

# 验证安装
caddy version
```

### Docker 安装

```bash
docker run -d -p 80:80 -p 443:443 -v /path/to/Caddyfile:/etc/caddy/Caddyfile -v caddy_data:/data -v caddy_config:/config caddy
```

## Caddy 命令

### 基本命令

```bash
# 启动 Caddy（使用当前目录下的 Caddyfile）
caddy run

# 启动 Caddy（指定配置文件）
caddy run --config /path/to/Caddyfile

# 停止 Caddy
caddy stop

# 重新加载配置
caddy reload

# 验证配置文件
caddy validate

# 查看版本
caddy version

# 查看帮助
caddy help
```

### 服务管理

如果使用包管理器安装，Caddy 会自动配置为系统服务：

```bash
# 启动 Caddy 服务
sudo systemctl start caddy

# 停止 Caddy 服务
sudo systemctl stop caddy

# 重启 Caddy 服务
sudo systemctl restart caddy

# 重新加载 Caddy 配置
sudo systemctl reload caddy

# 查看 Caddy 服务状态
sudo systemctl status caddy

# 设置 Caddy 开机自启
sudo systemctl enable caddy
```

## Caddy 配置文件

Caddy 使用 Caddyfile 作为主要配置文件格式，语法简洁直观。

### 配置文件位置

- 包管理器安装：`/etc/caddy/Caddyfile`
- 二进制安装：默认使用当前目录下的 `Caddyfile`

### 基本配置结构

```caddy
# 站点配置
example.com {
    # 配置指令
    root * /var/www/html
    file_server
}
```

### 常见配置示例

#### https


```caddy
llinux.cn {
    root * ./public
    file_server

    # 设置 favicon.ico 的缓存头，缓存 30 天
    handle /favicon.ico {
        header Cache-Control "public, max-age=2592000"  # 30 天
        file_server
    }

    # 启用访问日志
    log {
        output file /var/log/caddy/access.log
        format json
    }
    
    # 处理404错误页面
    handle_errors {
        rewrite * /404.html
        file_server
    }
}
```

#### http
- 测试使用
```caddy
{
    # 彻底关闭自动 HTTPS 功能
    auto_https off
}


10.0.0.100:80 {  # 监听 10.0.0.100:80 端口
    root * ./public
    file_server
...
}

```


## Caddy 基本使用

### 启动第一个站点

1. 创建 Caddyfile：

```caddy
localhost {
    root * /var/www/html
    file_server
}
```

2. 创建网站目录和测试文件：

```bash
sudo mkdir -p /var/www/html
echo "Hello, Caddy!" | sudo tee /var/www/html/index.html
```

3. 启动 Caddy：

```bash
sudo caddy run --config Caddyfile
```

4. 在浏览器中访问 `http://localhost`，您将看到 "Hello, Caddy!"

### 使用自动 HTTPS

只需在 Caddyfile 中使用您的域名，Caddy 将自动配置 HTTPS：

```caddy
example.com {
    root * /var/www/html
    file_server
}
```

启动 Caddy 后，访问 `https://example.com`，您将看到安全的网站。

## Caddy API

Caddy 提供了 RESTful API，用于动态配置：

```bash
# 查看当前配置
curl localhost:2019/config/

# 更改配置
curl -X POST localhost:2019/config/apps/http/servers/srv0/routes/0/handle/0 -H "Content-Type: application/json" -d '{
    "handler": "file_server",
    "root": "/var/www/html"
}'
```

## 日志管理

### 访问日志

```caddy
example.com {
    root * /var/www/html
    file_server
    log {
        output file /var/log/caddy/access.log
        format json
    }
}
```

### 错误日志

```caddy
example.com {
    root * /var/www/html
    file_server
    log {
        output file /var/log/caddy/error.log
        level error
    }
}
```

## 总结

Caddy 是一个现代、强大且易于使用的 Web 服务器，特别适合需要简单配置和自动 HTTPS 的场景。通过本文的介绍，您应该已经了解了 Caddy 的基本概念、安装方法、配置和使用。

如需更详细的信息，请参考 [Caddy 官方文档](https://caddyserver.com/docs/)。