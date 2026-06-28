#!/bin/bash
# Agent Monitor 启动脚本
# 功能：自动恢复数据 + 迁移 + 填充 + 启动服务

set -e

PROJECT_DIR="/home/cheng/projects/agent-monitor"
API_DIR="$PROJECT_DIR/agent-api"
cd "$API_DIR"

# 1. 检查数据库是否已有数据
echo "🔍 检查数据库状态..."
AGENT_COUNT=$(php artisan tinker --execute="echo App\Models\Agent::count();" 2>/dev/null | tail -1)
LOG_COUNT=$(php artisan tinker --execute="echo App\Models\ExecutionLog::count();" 2>/dev/null | tail -1)

if [ "$AGENT_COUNT" = "0" ] || [ "$LOG_COUNT" = "0" ]; then
    echo "⚠️  检测到数据缺失（智能体: $AGENT_COUNT, 日志: $LOG_COUNT），开始恢复..."
    
    # 2. 从最新备份恢复数据
    echo "🔄 检查备份..."
    bash "$PROJECT_DIR/backup-db.sh" restore
    
    # 3. 如果恢复后仍然没有数据，运行自动恢复脚本
    AGENT_COUNT=$(php artisan tinker --execute="echo App\Models\Agent::count();" 2>/dev/null | tail -1)
    if [ "$AGENT_COUNT" = "0" ]; then
        echo "🔄 运行自动恢复脚本..."
        bash "$PROJECT_DIR/auto-restore.sh"
    fi
else
    echo "✅ 数据正常（智能体: $AGENT_COUNT, 日志: $LOG_COUNT）"
fi

# 4. 执行数据库迁移（新增表/字段）
echo "🔄 执行数据库迁移..."
php artisan migrate --force

# 5. 启动服务
echo "🚀 启动 Laravel 后端服务..."
php artisan serve --host=0.0.0.0 --port=8000
