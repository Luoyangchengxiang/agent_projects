#!/bin/bash
# =============================================================================
# 备份验证脚本 - 检查备份文件是否正常
# =============================================================================

set -e

BACKUP_DIR="/home/cheng/projects/agent-monitor/backups"
LOG_FILE="/home/cheng/projects/agent-monitor/logs/backup-verify.log"

mkdir -p "$(dirname "$LOG_FILE")"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "=========================================="
log "开始备份验证..."
log "=========================================="

# 检查备份目录
if [ ! -d "$BACKUP_DIR" ]; then
    log "❌ 备份目录不存在: $BACKUP_DIR"
    exit 1
fi

# 获取最新的备份文件
LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/backup_*.sql.gz 2>/dev/null | head -1)

if [ -z "$LATEST_BACKUP" ]; then
    log "❌ 没有找到备份文件"
    exit 1
fi

log "最新备份: $LATEST_BACKUP"

# 检查文件大小
FILE_SIZE=$(stat -f%z "$LATEST_BACKUP" 2>/dev/null || stat -c%s "$LATEST_BACKUP" 2>/dev/null)
log "文件大小: $FILE_SIZE 字节"

# 检查文件是否为空或过小（小于 100 字节可能是损坏的）
if [ "$FILE_SIZE" -lt 100 ]; then
    log "❌ 备份文件过小，可能已损坏"
    exit 1
fi

# 检查文件是否可以解压
if gunzip -t "$LATEST_BACKUP" 2>/dev/null; then
    log "✅ 备份文件格式正常"
else
    log "❌ 备份文件损坏，无法解压"
    exit 1
fi

# 检查备份内容是否包含关键表
if zcat "$LATEST_BACKUP" | grep -q "CREATE TABLE.*agents" 2>/dev/null; then
    log "✅ 备份包含 agents 表"
else
    log "⚠️  备份可能不完整（未找到 agents 表）"
fi

# 检查备份时间
BACKUP_DATE=$(basename "$LATEST_BACKUP" | grep -oE '[0-9]{8}_[0-9]{6}')
log "备份时间: $BACKUP_DATE"

# 检查是否是今天的备份
TODAY=$(date +%Y%m%d)
if echo "$BACKUP_DATE" | grep -q "$TODAY"; then
    log "✅ 是今天的备份"
else
    log "⚠️  不是今天的备份，建议手动备份"
fi

log "=========================================="
log "备份验证完成"
log "=========================================="
