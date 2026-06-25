#!/bin/bash
# Laravel后端手动安装脚本

echo "=========================================="
echo "🔧 Laravel后端手动安装"
echo "=========================================="

# 进入项目目录
cd ~/projects/agent-api

# 终止可能卡住的composer进程
pkill -f "composer install" 2>/dev/null

# 删除可能损坏的文件
rm -rf vendor composer.lock

# 重新安装依赖
echo "正在安装依赖..."
composer install

# 检查是否成功
if [ -f "vendor/autoload.php" ]; then
    echo "✅ 依赖安装成功"
    
    # 安装Sanctum
    echo "正在安装Sanctum..."
    composer require laravel/sanctum
    
    # 发布配置
    echo "正在发布配置..."
    php artisan vendor:publish --provider="Laravel\Sanctum\SanctumServiceProvider"
    
    # 配置数据库
    echo "正在配置数据库..."
    sed -i 's/DB_CONNECTION=mysql/DB_CONNECTION=pgsql/' .env
    sed -i 's/DB_HOST=127.0.0.1/DB_HOST=127.0.0.1/' .env
    sed -i 's/DB_PORT=3306/DB_PORT=5432/' .env
    sed -i 's/DB_DATABASE=laravel/DB_DATABASE=agent_monitor/' .env
    sed -i 's/DB_USERNAME=root/DB_USERNAME=agent_monitor/' .env
    sed -i 's/DB_PASSWORD=/DB_PASSWORD=agent_monitor_password/' .env
    
    # 运行迁移
    echo "正在运行数据库迁移..."
    php artisan migrate
    
    # 启动服务器
    echo "正在启动Laravel服务器..."
    php artisan serve
else
    echo "❌ 安装失败，请检查网络连接"
    echo "建议开启VPN后重试"
fi
