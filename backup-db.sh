#!/bin/bash
# Agent Monitor 数据库备份脚本
# 用法: ./backup-db.sh [backup|restore|clean]

set -e

PROJECT_DIR="/home/cheng/projects/agent-monitor"
BACKUP_DIR="$PROJECT_DIR/backups"
KEEP_COUNT=3  # 保留最近 N 份备份

# 从 .env 读取数据库配置
DB_HOST=$(grep DB_HOST "$PROJECT_DIR/agent-api/.env" | cut -d= -f2)
DB_PORT=$(grep DB_PORT "$PROJECT_DIR/agent-api/.env" | cut -d= -f2)
DB_NAME=$(grep DB_DATABASE "$PROJECT_DIR/agent-api/.env" | cut -d= -f2)
DB_USER=$(grep DB_USERNAME "$PROJECT_DIR/agent-api/.env" | cut -d= -f2)
DB_PASS=$(grep DB_PASSWORD "$PROJECT_DIR/agent-api/.env" | cut -d= -f2)

export PGPASSWORD="$DB_PASS"

mkdir -p "$BACKUP_DIR"

# ========== 备份 ==========
do_backup() {
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local file="$BACKUP_DIR/backup_${timestamp}.sql.gz"
    
    echo "📦 备份数据库 $DB_NAME..."
    pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        --no-owner --no-privileges | gzip > "$file"
    
    local size=$(du -h "$file" | cut -f1)
    echo "✅ 备份完成: $file ($size)"
    
    # 清理旧备份
    do_clean
}

# ========== 恢复 ==========
do_restore() {
    local latest=$(ls -t "$BACKUP_DIR"/backup_*.sql.gz 2>/dev/null | head -1)
    
    if [ -z "$latest" ]; then
        echo "⚠️  没有找到备份文件，跳过恢复"
        return 0
    fi
    
    local size=$(du -h "$latest" | cut -f1)
    local time=$(stat -c %y "$latest" 2>/dev/null | cut -d. -f1)
    echo "📥 从备份恢复: $(basename $latest) ($size, $time)"
    
    # 先清空现有数据（保留表结构）
    echo "   清空现有数据..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -q \
        -c "TRUNCATE TABLE execution_logs, agent_metrics, error_logs, graph_edges, graph_nodes, cron_job_logs, cron_jobs, reports, settings, version_updates, agents, alert_rules CASCADE;" 2>/dev/null || true
    
    # 恢复数据
    echo "   导入数据..."
    gunzip -c "$latest" | psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -q 2>/dev/null
    
    echo "✅ 恢复完成"
    
    # 恢复成功后清理旧备份（只保留最新 1 份）
    echo "🧹 清理旧备份（保留最新 1 份）..."
    local count=0
    for f in $(ls -t "$BACKUP_DIR"/backup_*.sql.gz 2>/dev/null); do
        count=$((count + 1))
        if [ $count -gt 1 ]; then
            rm -f "$f"
            echo "   删除: $(basename $f)"
        fi
    done
}

# ========== 清理 ==========
do_clean() {
    local count=0
    for f in $(ls -t "$BACKUP_DIR"/backup_*.sql.gz 2>/dev/null); do
        count=$((count + 1))
        if [ $count -gt $KEEP_COUNT ]; then
            rm -f "$f"
            echo "🧹 清理旧备份: $(basename $f)"
        fi
    done
}

# ========== 主逻辑 ==========
case "${1:-backup}" in
    backup)  do_backup ;;
    restore) do_restore ;;
    clean)   do_clean ;;
    *)
        echo "用法: $0 [backup|restore|clean]"
        echo "  backup  - 备份数据库（默认）"
        echo "  restore - 从最新备份恢复"
        echo "  clean   - 清理旧备份，保留最近 $KEEP_COUNT 份"
        exit 1
        ;;
esac
