#!/bin/bash
# 自动收集定时任务执行结果并写入数据库
# 每天 9:10 执行，等待 9:00 的定时任务完成

set -e

# 配置
API_BASE="http://localhost:8000/api"
TASK_PREFIX="daily_inspection"

# 开店团队成员
TEAM_AGENTS=("选品专家" "运营管家" "财务顾问" "决策引擎" "分析专家")

# 获取今天的日期
TODAY=$(date +%Y-%m-%d)
TODAY_COMPACT=$(date +%Y%m%d)
CREATED_AT="${TODAY}T01:00:00Z"

# 报告目录
REPORT_DIR="$HOME/local-ai/agents/开店团队/报告"

echo "📊 开始收集 ${TODAY} 的执行结果..."

# 查找今天的报告文件
REPORT_FILE=""
for pattern in "热销商品调研_${TODAY}.md" "热销商品调研_${TODAY_COMPACT}.md"; do
    if [ -f "${REPORT_DIR}/${pattern}" ]; then
        REPORT_FILE="${REPORT_DIR}/${pattern}"
        break
    fi
done

if [ -z "$REPORT_FILE" ]; then
    echo "⚠️  未找到今天的报告文件，跳过"
    exit 0
fi

echo "📄 找到报告文件: $(basename $REPORT_FILE)"

# 读取报告内容
OUTPUT=$(cat "$REPORT_FILE")

# 提取摘要（从报告中提取关键信息）
SUMMARY=""

# 提取调研摘要部分
if echo "$OUTPUT" | grep -q "调研摘要"; then
    SUMMARY=$(echo "$OUTPUT" | sed -n '/调研摘要/,/核心选品建议/p' | head -20)
fi

# 如果没有找到摘要，提取前500字
if [ -z "$SUMMARY" ]; then
    SUMMARY=$(echo "$OUTPUT" | head -30)
fi

# 计算报告大小作为耗时估算
FILE_SIZE=$(wc -c < "$REPORT_FILE")
DURATION=$((FILE_SIZE / 100 * 1000 + 30000))  # 估算 30-120 秒

# 检查是否已存在今天的记录
cd /home/cheng/projects/agent-monitor/agent-api
EXISTING=$(php artisan tinker --execute="
use App\Models\Agent;
use App\Models\ExecutionLog;
\$agent = Agent::where('name', '${TEAM_AGENTS[0]}')->first();
if (\$agent) {
    echo ExecutionLog::where('agent_id', \$agent->id)->whereDate('created_at', '${TODAY}')->count();
} else {
    echo 0;
}
")

if [ "$EXISTING" -gt 0 ]; then
    echo "ℹ️  今天的记录已存在，跳过"
    exit 0
fi

# 写入数据库（通过 Artisan 命令）
cd /home/cheng/projects/agent-monitor/agent-api

php artisan tinker --execute="
use App\Models\Agent;
use App\Models\ExecutionLog;
use Carbon\Carbon;

\$teamAgents = ['选品专家', '运营管家', '财务顾问', '决策引擎', '分析专家'];
\$createdAt = Carbon::parse('${CREATED_AT}');
\$output = file_get_contents('${REPORT_FILE}');

// 提取摘要
\$summary = '';
if (preg_match('/📊 调研摘要.*🎯 核心选品建议/s', \$output, \$matches)) {
    \$summary = \$matches[0];
} else {
    \$summary = mb_substr(\$output, 0, 500, 'UTF-8') . '...';
}

\$successCount = 0;
foreach (\$teamAgents as \$agentName) {
    \$agent = Agent::where('name', \$agentName)->first();
    
    if (!\$agent) {
        echo \"⚠️  Agent [\$agentName] 不存在，跳过\n\";
        continue;
    }
    
    ExecutionLog::create([
        'agent_id' => \$agent->id,
        'task_id' => '${TASK_PREFIX}_${TODAY_COMPACT}',
        'status' => 'success',
        'input' => '每日热销商品调研 - 开店团队协作',
        'output' => \$output,
        'context' => json_encode(['source' => 'cron_job', 'team' => '开店团队', 'report_file' => basename('${REPORT_FILE}')]),
        'duration' => ${DURATION},
        'result_summary' => \$summary,
        'agent_group' => '开店团队',
        'created_at' => \$createdAt,
        'updated_at' => \$createdAt,
    ]);
    
    \$successCount++;
    echo \"✅ 已写入: \$agentName\n\";
}

echo \"\n🎉 执行结果收集完成！共写入 \$successCount 条记录\n\";
"

echo "🎉 执行结果收集完成！"
