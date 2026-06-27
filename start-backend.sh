#!/bin/bash
# Agent Monitor 启动脚本
# 功能：自动迁移数据库 + 填充种子数据 + 启动后端服务

set -e

PROJECT_DIR="/home/cheng/projects/agent-monitor/agent-api"
cd "$PROJECT_DIR"

echo "🔄 执行数据库迁移..."
php artisan migrate --force

echo "🌱 填充种子数据（幂等，已有数据不会重复）..."
php artisan db:seed --force

echo "🚀 启动 Laravel 后端服务..."
php artisan serve --host=0.0.0.0 --port=8000
