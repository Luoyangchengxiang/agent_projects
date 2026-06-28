#!/bin/bash
# =============================================================================
# Agent Monitor 自动恢复脚本
# 功能：WSL 重启后自动检查数据库，如果数据丢失则恢复
# =============================================================================

set -e

# 配置
PROJECT_DIR="/home/cheng/projects/agent-monitor/agent-api"
REPORT_DIR="/home/cheng/local-ai/agents/开店团队/报告"
LOG_FILE="/home/cheng/projects/agent-monitor/logs/auto-restore.log"

# 颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
    log "SUCCESS: $1"
}

warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    log "WARN: $1"
}

error() {
    echo -e "${RED}❌ $1${NC}"
    log "ERROR: $1"
}

# 创建日志目录
mkdir -p "$(dirname "$LOG_FILE")"

log "=========================================="
log "开始自动恢复检查..."
log "=========================================="

# 等待 PostgreSQL 就绪
log "等待 PostgreSQL 启动..."
for i in {1..30}; do
    if pg_isready -q 2>/dev/null; then
        success "PostgreSQL 已就绪"
        break
    fi
    if [ $i -eq 30 ]; then
        error "PostgreSQL 启动超时"
        exit 1
    fi
    sleep 1
done

# 切换到项目目录
cd "$PROJECT_DIR"

# 检查智能体数量
AGENT_COUNT=$(php artisan tinker --execute="echo App\Models\Agent::count();" 2>/dev/null | tail -1)
log "当前智能体数量: $AGENT_COUNT"

# 如果智能体为空，执行恢复
if [ "$AGENT_COUNT" = "0" ]; then
    warn "检测到数据丢失，开始恢复..."
    
    # 1. 运行 Seeder 恢复智能体
    log "恢复智能体数据..."
    php artisan db:seed --class=AgentSeeder --force 2>&1 | tee -a "$LOG_FILE"
    success "智能体恢复完成"
    
    # 2. 导入历史报告
    log "导入历史报告..."
    php artisan tinker --execute="
use App\Models\Agent;
use App\Models\ExecutionLog;

\$agent = Agent::where('name', '选品专家')->first();
if (!\$agent) {
    echo '选品专家不存在';
    exit;
}

\$reportDir = '/home/cheng/local-ai/agents/开店团队/报告';
\$files = glob(\$reportDir . '/热销商品调研_*.md');

\$count = 0;
foreach (\$files as \$file) {
    \$filename = basename(\$file);
    preg_match('/(\d{4}-\d{2}-\d{2}|\d{8})/', \$filename, \$matches);
    \$dateStr = \$matches[1] ?? '';
    
    if (strlen(\$dateStr) === 8) {
        \$date = substr(\$dateStr, 0, 4) . '-' . substr(\$dateStr, 4, 2) . '-' . substr(\$dateStr, 6, 2);
    } else {
        \$date = \$dateStr;
    }
    
    \$content = file_get_contents(\$file);
    \$size = strlen(\$content);
    
    \$exists = ExecutionLog::where('agent_id', \$agent->id)
        ->whereDate('created_at', \$date)
        ->exists();
    
    if (!\$exists) {
        ExecutionLog::create([
            'agent_id' => \$agent->id,
            'task_id' => 'daily_inspection_' . str_replace('-', '', \$date),
            'status' => 'success',
            'output' => mb_substr(\$content, 0, 5000),
            'result_summary' => '热销商品调研报告，大小: ' . round(\$size/1024, 1) . 'KB',
            'agent_group' => '开店团队',
            'executor_type' => 'ollama',
            'created_at' => \$date . ' 09:00:00',
            'updated_at' => \$date . ' 09:00:00',
        ]);
        \$count++;
    }
}

echo '导入完成: ' . \$count . ' 条';
" 2>&1 | tee -a "$LOG_FILE"
    
    success "历史报告导入完成"
    
    # 3. 验证恢复结果
    FINAL_COUNT=$(php artisan tinker --execute="echo App\Models\Agent::count();" 2>/dev/null | tail -1)
    LOG_COUNT=$(php artisan tinker --execute="echo App\Models\ExecutionLog::count();" 2>/dev/null | tail -1)
    
    success "恢复完成！智能体: $FINAL_COUNT 个，执行日志: $LOG_COUNT 条"
else
    success "数据正常，无需恢复"
fi

log "=========================================="
log "自动恢复检查完成"
log "=========================================="
