#!/bin/bash
# Agent监控系统 - 依赖安装脚本（优化版）
# 支持国内镜像源，减少VPN依赖

set -e

echo "=========================================="
echo "🔧 Agent监控系统 - 依赖安装脚本"
echo "=========================================="

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 检查是否以root权限运行
if [ "$EUID" -eq 0 ]; then
    echo -e "${RED}请不要以root权限运行此脚本${NC}"
    echo "请使用: bash install-deps.sh"
    exit 1
fi

echo ""
echo -e "${YELLOW}此脚本需要sudo权限来安装系统依赖${NC}"
echo "请输入你的密码（如果需要）"
echo ""

# 询问是否使用VPN
read -p "是否开启VPN？(y/n): " use_vpn
if [[ "$use_vpn" =~ ^[Yy]$ ]]; then
    echo -e "${GREEN}建议开启VPN后再继续${NC}"
    echo "请确保VPN已连接，然后按Enter继续..."
    read -p ""
fi

# 更新系统
echo -e "${GREEN}[1/7] 更新系统包...${NC}"
sudo apt update

# 配置PHP PPA源（使用国内镜像）
echo -e "${GREEN}[2/7] 配置软件源...${NC}"
sudo apt install -y software-properties-common

# 添加PHP PPA
sudo add-apt-repository -y ppa:ondrej/php
sudo apt update

# 安装PHP 8.2
echo -e "${GREEN}[3/7] 安装PHP 8.2...${NC}"
sudo apt install -y php8.2 \
    php8.2-cli \
    php8.2-common \
    php8.2-mbstring \
    php8.2-xml \
    php8.2-curl \
    php8.2-zip \
    php8.2-pgsql \
    php8.2-redis \
    php8.2-bcmath \
    php8.2-fpm

# 验证PHP安装
echo ""
echo "PHP版本："
php -v

# 安装Composer（使用国内镜像）
echo -e "${GREEN}[4/7] 安装Composer...${NC}"
# 尝试使用国内镜像
if curl -sS https://getcomposer.org/installer | php; then
    sudo mv composer.phar /usr/local/bin/composer
else
    echo "官方源失败，尝试使用国内镜像..."
    # 使用阿里云镜像
    curl -sS https://mirrors.aliyun.com/composer/composer.phar -o composer.phar
    sudo mv composer.phar /usr/local/bin/composer
fi

# 配置Composer国内镜像
composer config -g repo.packagist composer https://mirrors.aliyun.com/composer/

# 验证Composer安装
echo ""
echo "Composer版本："
composer --version

# 安装PostgreSQL
echo -e "${GREEN}[5/7] 安装PostgreSQL...${NC}"
sudo apt install -y postgresql postgresql-contrib

# 启动PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# 创建数据库用户和数据库
echo ""
echo "创建数据库用户和数据库..."
sudo -u postgres psql -c "CREATE USER agent_monitor WITH PASSWORD 'agent_monitor_password';"
sudo -u postgres psql -c "CREATE DATABASE agent_monitor OWNER agent_monitor;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE agent_monitor TO agent_monitor;"

# 验证PostgreSQL安装
echo ""
echo "PostgreSQL版本："
psql --version

# 安装Redis
echo -e "${GREEN}[6/7] 安装Redis...${NC}"
sudo apt install -y redis-server

# 启动Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server

# 验证Redis安装
echo ""
echo "Redis版本："
redis-server --version

# 验证所有服务
echo -e "${GREEN}[7/7] 验证所有服务...${NC}"
echo ""

# 检查PostgreSQL状态
if sudo systemctl is-active --quiet postgresql; then
    echo -e "✅ PostgreSQL: ${GREEN}运行中${NC}"
else
    echo -e "❌ PostgreSQL: ${RED}未运行${NC}"
    echo "尝试启动PostgreSQL..."
    sudo systemctl start postgresql
fi

# 检查Redis状态
if sudo systemctl is-active --quiet redis-server; then
    echo -e "✅ Redis: ${GREEN}运行中${NC}"
else
    echo -e "❌ Redis: ${RED}未运行${NC}"
    echo "尝试启动Redis..."
    sudo systemctl start redis-server
fi

# 检查PHP
if command -v php &> /dev/null; then
    echo -e "✅ PHP: ${GREEN}已安装${NC} ($(php -v | head -1))"
else
    echo -e "❌ PHP: ${RED}未安装${NC}"
fi

# 检查Composer
if command -v composer &> /dev/null; then
    echo -e "✅ Composer: ${GREEN}已安装${NC} ($(composer --version))"
else
    echo -e "❌ Composer: ${RED}未安装${NC}"
fi

echo ""
echo "=========================================="
echo -e "${GREEN}✅ 安装完成！${NC}"
echo "=========================================="
echo ""
echo "数据库信息："
echo "  - 数据库: agent_monitor"
echo "  - 用户名: agent_monitor"
echo "  - 密码: agent_monitor_password"
echo "  - 端口: 5432"
echo ""
echo "Redis信息："
echo "  - 主机: 127.0.0.1"
echo "  - 端口: 6379"
echo ""
echo "Composer镜像："
echo "  - 已配置阿里云镜像"
echo ""
echo "下一步："
echo "  1. 运行 'php -v' 验证PHP安装"
echo "  2. 运行 'composer --version' 验证Composer安装"
echo "  3. 运行 'psql -U agent_monitor -d agent_monitor' 测试数据库连接"
echo "  4. 运行 'redis-cli ping' 测试Redis连接"
echo ""
echo "如果遇到网络问题，可以："
echo "  1. 开启VPN后重新运行脚本"
echo "  2. 或手动配置代理：export http_proxy=http://127.0.0.1:7890"
echo ""
