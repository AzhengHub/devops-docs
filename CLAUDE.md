# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

"阿征的运维笔记" —— 基于 Hugo + Docsy 主题构建的中文运维文档站点，内容涵盖 Kubernetes、Linux、KVM 虚拟化、AWS、CI/CD、数据库、容器等运维方向。

## 常用命令

```sh
# 本地开发（带热重载）
npm run serve

# 构建静态文件到 public/（开发模式，含草稿）
npm run build

# 生产构建
npm run build:production

# 直接调用 Hugo 构建（最快，不走 npm 脚本）
hugo

# 清理构建产物
npm run clean
```

## 部署架构

- Hugo 构建输出到 `public/` 目录
- Caddy 作为静态文件服务器（监听 `10.0.0.100:80`），配置在 `Caddyfile`
- 生产环境通过 systemd 服务 `caddy-hugo.service` 管理，`ExecStartPre` 先执行 `hugo` 构建再启动 Caddy

## 前端样式定制（核心）

Docsy 主题基于 Bootstrap，样式扩展入口只有两个文件：

| 文件 | 用途 |
|------|------|
| `assets/scss/_variables_project.scss` | 覆盖 Bootstrap / Docsy 的 SCSS 变量（**改颜色从这里入手**） |
| `assets/scss/_styles_project.scss` | 追加自定义 CSS 规则 |

**改主色调示例**（在 `_variables_project.scss` 中）：
```scss
$primary: #0f4c81;      // 主色（按钮、链接、标题）
$secondary: #6c757d;    // 次色
$link-color: #1565c0;   // 链接色
```

`_styles_project.scss` 已有的自定义内容：
- 深色模式增强（导入 Docsy 内置的 `td/color-adjustments-dark`、`td/code-dark`、`td/gcs-search-dark`）
- `collapse` 折叠块样式（配合 `layouts/shortcodes/collapse.html`）
- 隐藏侧边栏 taxonomy 标签云的 CSS

## Hugo 配置关键点

`hugo.yaml` 中的重要设置：
- 内容目录：`content/zh`（纯中文站点，英文已注释）
- 站点标题：`params.languages.zh.title`
- 深色/浅色模式切换：`params.ui.showLightDarkModeMenu: true`
- 代码高亮：Chroma，样式为 `tango`
- 侧边栏：`sidebar_menu_foldable: true`，支持折叠展开

## 自定义 Shortcode

`{{< collapse summary="标题" >}} 内容 {{< /collapse >}}`  
→ 渲染为可折叠的 `<details>` 块，样式定义在 `_styles_project.scss`

## 依赖说明

- Hugo Extended ≥ 0.146.0（需要 extended 版本才能编译 SCSS）
- Node.js ≥ 22
- Docsy 主题通过 Hugo Modules 引入，vendored 到 `_vendor/github.com/google/docsy`
- Bootstrap 在 `_vendor/github.com/twbs/bootstrap`
