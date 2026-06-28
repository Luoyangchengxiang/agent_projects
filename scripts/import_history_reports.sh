#!/bin/bash
# 导入历史报告到数据库
# 用法: ./import_history_reports.sh

set -e

REPORT_DIR="$HOME/local-ai/agents/开店团队/报告"
AGENT_NAME="开店团队"
TASK_PREFIX="daily_inspection"

echo "📊 开始导入历史报告..."

cd /home/cheng/projects/agent-monitor/agent-api

# 获取或创建 Agent
AGENT_ID=$(php artisan tinker --execute="
use App\Models\Agent;
\$agent = Agent::where('name', '${AGENT_NAME}')->first();
if (!\$agent) {
    \$agent = Agent::create([
        'name' => '${AGENT_NAME}',
        'type' => 'group',
        'status' => 'online',
        'executor_type' => 'ollama',
        'config' => ['model' => 'qwen2.5:3b'],
    ]);
}
echo \$agent->id;
")

echo "Agent ID: $AGENT_ID"

# 遍历所有报告文件
IMPORTED=0
SKIPPED=0

for REPORT_FILE in "$REPORT_DIR"/热销商品调研_*.md; do
    if [ ! -f "$REPORT_FILE" ]; then
        continue
    fi
    
    FILENAME=$(basename "$REPORT_FILE")
    
    # 提取日期
    if [[ "$FILENAME" =~ 热销商品调研_([0-9]{4}-[0-9]{2}-[0-9]{2})\.md ]]; then
        DATE="${BASH_REMATCH[1]}"
        DATE_COMPACT="${DATE//-/}"
    elif [[ "$FILENAME" =~ 热销商品调研_([0-9]{8})\.md ]]; then
        DATE_COMPACT="${BASH_REMATCH[1]}"
        DATE="${DATE_COMPACT:0:4}-${DATE_COMPACT:4:2}-${DATE_COMPACT:6:2}"
    else
        echo "⚠️  无法解析日期: $FILENAME"
        continue
    fi
    
    TASK_ID="${TASK_PREFIX}_${DATE_COMPACT}"
    CREATED_AT="${DATE}T01:00:00Z"
    
    # 检查是否已存在
    EXISTING=$(php artisan tinker --execute="
    echo App\Models\ExecutionLog::where('task_id', '${TASK_ID}')->count();
    ")
    
    if [ "$EXISTING" -gt 0 ]; then
        echo "⏭️  跳过 ${DATE} (已存在)"
        SKIPPED=$((SKIPPED + 1))
        continue
    fi
    
    # 读取报告内容
    OUTPUT=$(cat "$REPORT_FILE")
    FILE_SIZE=$(wc -c < "$REPORT_FILE")
    DURATION=$((FILE_SIZE / 100 * 1000 + 30000))
    
    # 提取摘要（前500字）
    SUMMARY=$(head -c 500 "$REPORT_FILE")
    
    # 写入数据库
    php artisan tinker --execute="
    use App\Models\ExecutionLog;
    use Carbon\Carbon;
    
    \$createdAt = Carbon.parse('${CREATED_AT}');
    
    ExecutionLog::create([
        'agent_id' => ${AGENT_ID},
        'task_id' => '${TASK_ID}',
        'status' => 'success',
        'input' => '每日热销商品调研',
        'output' => file_get_contents('${REPORT_FILE}'),
        'context' => json_encode(['source' => 'history_import', 'report_file' => '${FILENAME}']),
        'duration' => ${DURATION},
        'result_summary' => mb_substr(file_get_contents('${REPORT_FILE}'), 0, 500, 'UTF-8') . '...',
        'agent_group' => '${AGENT_NAME}',
        'created_at' => \$createdAt,
        'updated_at' => \$createdAt,
    ]);
    
    echo 'OK';
    "
    
    echo "✅ 导入 ${DATE}"
    IMPORTED=$((IMPORTED + 1))
done

echo ""
echo "🎉 导入完成！"
echo "   导入: ${IMPORTED} 条"
echo "   跳过: ${SKIPPED} 条"
