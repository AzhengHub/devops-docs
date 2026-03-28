---
title: "Shell 脚本大全"
---

## 系统初始化脚本
```sh {filename="init_os.sh"}
#!/bin/bash
# Description: 通用系统初始化脚本 (Ubuntu, CentOS, openEuler, Kylin)
# Run as root

set -e

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info() { echo -e "${YELLOW}[INFO] $1${NC}"; }
success() { echo -e "${GREEN}[SUCCESS] $1${NC}"; }
error() { echo -e "${RED}[ERROR] $1${NC}"; }

# 确保以 root 身份运行
if [ "$EUID" -ne 0 ]; then
  error "请使用 root 权限运行此脚本。"
  exit 1
fi

# 获取系统信息
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
    VERSION=$VERSION_ID
else
    error "无法检测到系统版本 (/etc/os-release 不存在)。"
    exit 1
fi

info "检测到系统: $OS $VERSION"

# ==========================================
# 1. 允许 SSH root 远程登录
# ==========================================
info "配置 SSH 允许 root 登录..."
if [ -f /etc/ssh/sshd_config ]; then
    sed -i 's/^#*PermitRootLogin.*/PermitRootLogin yes/' /etc/ssh/sshd_config
    if systemctl restart sshd 2>/dev/null || systemctl restart ssh 2>/dev/null; then
        success "SSH root 登录已启用并重启服务。"
    else
        error "重启 SSH 服务失败。"
    fi
else
    error "未找到 /etc/ssh/sshd_config 文件。"
fi

# ==========================================
# 2. 时区更改为 Asia/Shanghai
# ==========================================
info "配置系统时区为 Asia/Shanghai..."
timedatectl set-timezone Asia/Shanghai
success "时区已设置为: $(timedatectl | grep 'Time zone' | awk '{print $3}')"

# ==========================================
# 3. 替换 yum/apt 源为清华源 (TUNA)
# ==========================================
info "配置软件源..."
case $OS in
    ubuntu)
        if [[ "$VERSION" == "24.04" ]]; then
            # Ubuntu 24.04 采用了新的 DEB822 格式
            if [ -f /etc/apt/sources.list.d/ubuntu.sources ]; then
                sed -i 's/archive.ubuntu.com/mirrors.tuna.tsinghua.edu.cn/g' /etc/apt/sources.list.d/ubuntu.sources
                sed -i 's/security.ubuntu.com/mirrors.tuna.tsinghua.edu.cn/g' /etc/apt/sources.list.d/ubuntu.sources
            fi
        else
            cp /etc/apt/sources.list /etc/apt/sources.list.bak
            sed -i 's/archive.ubuntu.com/mirrors.tuna.tsinghua.edu.cn/g' /etc/apt/sources.list
            sed -i 's/security.ubuntu.com/mirrors.tuna.tsinghua.edu.cn/g' /etc/apt/sources.list
        fi
        apt-get update -y > /dev/null 2>&1
        success "Ubuntu 源已替换为清华源并更新缓存。"
        ;;
    centos)
        # CentOS 8 已 EOL，需使用 vault 源
        sed -i 's/mirrorlist/#mirrorlist/g' /etc/yum.repos.d/CentOS-Linux-*.repo 2>/dev/null || true
        sed -i 's|#baseurl=http://mirror.centos.org|baseurl=https://mirrors.tuna.tsinghua.edu.cn/centos-vault|g' /etc/yum.repos.d/CentOS-Linux-*.repo 2>/dev/null || true
        yum makecache > /dev/null 2>&1
        success "CentOS 8 源已替换为清华 vault 源并更新缓存。"
        ;;
    openeuler)
        cp /etc/yum.repos.d/openEuler.repo /etc/yum.repos.d/openEuler.repo.bak
        sed -i 's/repo.openeuler.org/mirrors.tuna.tsinghua.edu.cn\/openeuler/g' /etc/yum.repos.d/openEuler.repo
        yum makecache > /dev/null 2>&1
        success "openEuler 源已替换为清华源并更新缓存。"
        ;;
    kylin)
        info "Kylin V10 系统通常使用官方商业源或内网自建源，为防止破坏依赖，跳过自动替换。"
        # 如果你有内网源，可以在这里添加命令，例如：
        # echo -e "[internal]\nname=Internal Repo\nbaseurl=http://your-internal-repo/kylin\ngpgcheck=0\nenabled=1" > /etc/yum.repos.d/internal.repo
        ;;
    *)
        error "未支持的系统发行版: $OS，跳过换源。"
        ;;
esac

# ==========================================
# 4. 修改最大文件描述符数量为 65535
# ==========================================
info "配置文件描述符最大数量限制..."
LIMITS_FILE="/etc/security/limits.conf"
# 避免重复追加
sed -i '/^\*.*nofile.*/d' $LIMITS_FILE
sed -i '/^root.*nofile.*/d' $LIMITS_FILE

cat >> $LIMITS_FILE << EOF
* soft nofile 65535
* hard nofile 65535
root soft nofile 65535
root hard nofile 65535
EOF
success "文件描述符限制已更新到 65535 (重新登录后生效)。"

# ==========================================
# 5. 时间同步 (配置 Chrony 指向国内阿里云 NTP)
# ==========================================
info "配置 NTP 时间同步 (Chrony)..."
NTP_SERVER="ntp.aliyun.com"

if [[ "$OS" == "ubuntu" ]]; then
    export DEBIAN_FRONTEND=noninteractive
    apt-get install -y chrony > /dev/null 2>&1
    CHRONY_CONF="/etc/chrony/chrony.conf"
else
    yum install -y chrony > /dev/null 2>&1
    CHRONY_CONF="/etc/chrony.conf"
fi

if [ -f "$CHRONY_CONF" ]; then
    # 注释掉默认源，添加阿里云 NTP
    sed -i 's/^pool /#pool /g' $CHRONY_CONF
    sed -i 's/^server /#server /g' $CHRONY_CONF
    grep -q "$NTP_SERVER" $CHRONY_CONF || echo "server $NTP_SERVER iburst" >> $CHRONY_CONF
    
    systemctl enable chronyd > /dev/null 2>&1 || systemctl enable chrony > /dev/null 2>&1
    systemctl restart chronyd > /dev/null 2>&1 || systemctl restart chrony > /dev/null 2>&1
    success "时间同步已配置，NTP 指向 $NTP_SERVER。"
else
    error "未找到 Chrony 配置文件。"
fi

# ==========================================
# 6. 关闭 Swap
# ==========================================
info "关闭 Swap..."
swapoff -a
sed -i '/\sswap\s/s/^/#/' /etc/fstab
success "Swap 已临时关闭，并在 /etc/fstab 中注释。"

# ==========================================
# 7. 关闭 SELinux
# ==========================================
info "配置关闭 SELinux..."
if command -v setenforce &> /dev/null; then
    setenforce 0 2>/dev/null || true
    if [ -f /etc/selinux/config ]; then
        sed -i 's/^SELINUX=.*/SELINUX=disabled/' /etc/selinux/config
    elif [ -f /etc/sysconfig/selinux ]; then
        sed -i 's/^SELINUX=.*/SELINUX=disabled/' /etc/sysconfig/selinux
    fi
    success "SELinux 已设置为 Disabled。"
else
    info "未检测到 SELinux (可能为 Ubuntu 或已移除)，跳过此步骤。"
fi

# ==========================================
# 8. 关闭系统自带防火墙
# ==========================================
info "配置关闭系统自带防火墙..."
if command -v firewalld &> /dev/null; then
    systemctl stop firewalld > /dev/null 2>&1 || true
    systemctl disable firewalld > /dev/null 2>&1 || true
    success "Firewalld 防火墙已停止并禁用。"
elif command -v ufw &> /dev/null; then
    ufw disable > /dev/null 2>&1 || true
    success "UFW 防火墙已禁用。"
else
    info "未检测到 firewalld 或 ufw，跳过防火墙配置。"
fi

# ==========================================
# 9. 状态检查输出
# ==========================================
echo -e "\n${YELLOW}================ 初始化状态检查 =================${NC}"

# SSH Root 检查
SSH_STATUS=$(sshd -T 2>/dev/null | grep -i permitrootlogin || echo "未知")
echo -e "SSH Root 登录  : ${GREEN}${SSH_STATUS}${NC}"

# 时区检查
TZ_STATUS=$(timedatectl | grep 'Time zone' | sed -e 's/^[[:space:]]*//')
echo -e "系统时区       : ${GREEN}${TZ_STATUS}${NC}"

# 文件描述符检查 (当前会话可能不准，读取配置文件验证)
LIMIT_STATUS=$(grep 'root hard nofile' /etc/security/limits.conf | awk '{print $4}')
echo -e "最大文件描述符 : ${GREEN}65535 (配置值: ${LIMIT_STATUS})${NC} *需重新登录生效*"

# NTP 同步状态检查
if command -v chronyc &> /dev/null; then
    CHRONY_STATUS=$(chronyc sources | grep '^*' | awk '{print $2}')
    if [ -z "$CHRONY_STATUS" ]; then
        echo -e "NTP 同步状态   : ${YELLOW}未就绪 (或正在同步中)${NC}"
    else
        echo -e "NTP 同步状态   : ${GREEN}已同步至 $CHRONY_STATUS${NC}"
    fi
fi

# Swap 状态检查
SWAP_STATUS=$(free -m | grep Swap | awk '{print $2}')
if [ "$SWAP_STATUS" == "0" ]; then
    echo -e "Swap 状态      : ${GREEN}已关闭 (Size: 0)${NC}"
else
    echo -e "Swap 状态      : ${RED}未完全关闭 (Size: $SWAP_STATUS)${NC}"
fi

# SELinux 状态检查
if command -v getenforce &> /dev/null; then
    SELINUX_STATUS=$(getenforce)
    echo -e "SELinux 状态   : ${GREEN}${SELINUX_STATUS}${NC}"
else
    echo -e "SELinux 状态   : ${GREEN}未安装 (通常为 Ubuntu)${NC}"
fi

# 防火墙状态检查
if command -v firewalld &> /dev/null; then
    FW_STATUS=$(systemctl is-active firewalld || echo "inactive")
    if [ "$FW_STATUS" == "inactive" ]; then
        echo -e "防火墙状态     : ${GREEN}已关闭 (firewalld)${NC}"
    else
        echo -e "防火墙状态     : ${RED}未关闭 (firewalld: $FW_STATUS)${NC}"
    fi
elif command -v ufw &> /dev/null; then
    FW_STATUS=$(ufw status | grep -i "Status: inactive" || echo "active")
    if [[ "$FW_STATUS" == *"inactive"* ]]; then
        echo -e "防火墙状态     : ${GREEN}已关闭 (ufw)${NC}"
    else
        echo -e "防火墙状态     : ${RED}未关闭 (ufw)${NC}"
    fi
else
    echo -e "防火墙状态     : ${GREEN}未安装 (无 ufw/firewalld)${NC}"
fi

echo -e "${YELLOW}=================================================${NC}\n"
success "系统初始化配置完成！建议重启系统 (reboot) 以确保内核参数和 Limits 完全生效。"
```

## 域名解析测试
这个shell脚本用于批量检查域名列表中的每个域名是否能够被解析，并输出可解析域名的IP地址。

使用方式：
1. 准备一个包含域名列表的文本文件，每行一个域名，空行和以#开头的行将被忽略。
2. 执行脚本并将文件路径作为参数传递：./check_domains.sh /path/to/domains.txt3. 脚本将输出每个可解析域名及其对应的IP地址。

```sh {filename="check_domains.sh"}
#!/bin/bash

# 检查是否提供了文件
if [ $# -eq 0 ]; then
    echo "请提供一个包含域名的文件作为参数"
    exit 1
fi

# 读取域名列表文件
domain_file=$1

# 检查文件是否存在
if [ ! -f "$domain_file" ]; then
    echo "文件 $domain_file 不存在"
    exit 1
fi

# 遍历域名列表
while IFS= read -r domain; do
    # 跳过空行和以#开头的注释行
    if [[ -z "$domain" || "$domain" =~ ^# ]]; then
        continue
    fi

    # 使用nslookup测试域名解析并提取IP地址
    result=$(nslookup "$domain" 2>/dev/null)

    # 根据nslookup返回的状态码判断是否能解析
    if [ $? -eq 0 ]; then
        # 提取IP地址
        ip=$(echo "$result" | awk '/^Address: / {print $2}')
        echo "$domain 能被解析，IP地址: $ip"
    fi
done < "$domain_file"
```

假设有一个文件`domains.txt`，内容如下：
```
# 重要域名列表
example.com
nonexistent-domain.example
google.com
```
执行脚本：
`./check_domains.sh domains.txt`
输出可能是：
```
example.com 能被解析，IP地址: 93.184.216.34
google.com 能被解析，IP地址: 142.250.187.110
```