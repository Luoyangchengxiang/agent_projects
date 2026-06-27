#!/bin/bash
# Agent Monitor 启动脚本
# 功能：自动恢复数据 + 迁移 + 填充 + 启动服务

set -e

PROJECT_DIR="/home/cheng/projects/agent-monitor"
API_DIR="$PROJECT_DIR/agent-api"
cd "$API_DIR"

# 1. 从最新备份恢复数据
echo "🔄 检查备份..."
bash "$PROJECT_DIR/backup-db.sh" restore

# 2. 执行数据库迁移（新增表/字段）
echo "🔄 执行数据库迁移..."
php artisan migrate --force

# 3. 填充种子数据（幂等，已有数据不重复）
echo "🌱 填充种子数据..."
php artisan db:seed --force

# 4. 启动前备份当前数据（确保下次重启有最新快照）
echo "📦 启动前备份..."
bash "$PROJECT_DIR/backup-db.sh" backup

# 5. 启动服务
echo "🚀 启动 Laravel 后端服务..."
php artisan serve --host=0.0.0.0 --port=8000
