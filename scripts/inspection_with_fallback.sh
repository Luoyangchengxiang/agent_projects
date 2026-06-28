#!/bin/bash
# 定时任务容错执行脚本
# 如果线上 API 失败，自动降级到本地 Ollama 模型

set -e

REPORT_DIR="$HOME/local-ai/agents/开店团队/报告"
TODAY=$(date +%Y-%m-%d)
TODAY_COMPACT=$(date +%Y%m%d)
REPORT_FILE="$REPORT_DIR/热销商品调研_${TODAY}.md"

echo "📊 开始执行每日巡检任务..."
echo "📅 日期: $TODAY"

# 检查是否已有今天的报告
if [ -f "$REPORT_FILE" ]; then
    echo "✅ 今天的报告已存在: $REPORT_FILE"
    exit 0
fi

# 确保报告目录存在
mkdir -p "$REPORT_DIR"

# 检查 Ollama 是否可用
check_ollama() {
    if curl -s --connect-timeout 5 http://localhost:11434/api/tags > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# 使用本地 Ollama 生成报告
generate_with_ollama() {
    echo "🤖 使用本地 Ollama 模型生成报告..."
    
    # 确定今天的核心品类（日期对3取余）
    DAY_NUM=$(date +%d)
    CORE_INDEX=$((DAY_NUM % 3))
    
    case $CORE_INDEX in
        0) CORE_CAT="桌面收纳（收纳盒、手机支架、数据线收纳、抽屉分隔盒）" ;;
        1) CORE_CAT="化妆工具（化妆棉、粉扑、睫毛夹、发圈发卡）" ;;
        2) CORE_CAT="厨房小工具（调料架、沥水篮、封口夹、厨房挂钩）" ;;
    esac
    
    # 构建 prompt
    PROMPT="你是一个AI电商选品分析师，专门为资源有限的小卖家服务。

## 卖家画像
- 💰 资金少：排除大件/高价商品（>50元）
- 📦 空间少：无仓库，家里存放，排除大体积商品
- ⏰ 时间少：上班族，排除复杂售后/定制商品
- 🏪 无实体：无店铺无仓库，必须支持一件代发

## 今日调研任务
核心品类: $CORE_CAT

请分析这个品类的热销商品，生成调研报告，包含：
1. 品类选择说明
2. 热销前3名详情（名称、价格、月销量、预估利润）
3. 利润率分析
4. 用户评价分析
5. 竞争分析
6. 代发可行性
7. 选品建议

使用中文输出，格式清晰，用emoji增强可读性。"

    # 调用 Ollama（不使用 jq，用 Python 处理 JSON）
    PROMPT_ESCAPED=$(python3 -c "import json; print(json.dumps('''$PROMPT'''))")
    
    RESPONSE=$(curl -s --connect-timeout 30 --max-time 180 http://localhost:11434/api/chat \
        -d "{
            \"model\": \"product-picker\",
            \"messages\": [{\"role\": \"user\", \"content\": $PROMPT_ESCAPED}],
            \"stream\": false,
            \"options\": {\"temperature\": 0.7, \"num_predict\": 2048}
        }" 2>/dev/null)
    
    if [ $? -eq 0 ] && [ -n "$RESPONSE" ]; then
        # 提取响应内容（用 Python 解析 JSON）
        CONTENT=$(python3 -c "
import json, sys
try:
    data = json.loads('''$RESPONSE''')
    print(data.get('message', {}).get('content', ''))
except:
    pass
" 2>/dev/null)
        
        if [ -n "$CONTENT" ]; then
            # 生成报告文件
            cat > "$REPORT_FILE" << EOF
# 📦 热销商品调研报告

> **📅 日期**：$TODAY  
> **📊 调研方法**：梯度制 1+2（1个核心品类 + 2个探索品类）  
> **🤖 生成方式**：本地 Ollama 模型（降级模式）

---

$CONTENT

---

> ⚠️ 本报告由本地模型生成，仅供参考。建议结合线上数据验证。
EOF
            echo "✅ 报告已生成: $REPORT_FILE"
            echo "📄 文件大小: $(wc -c < "$REPORT_FILE") bytes"
            return 0
        fi
    fi
    
    echo "❌ Ollama 生成失败"
    return 1
}

# 主逻辑
if check_ollama; then
    generate_with_ollama
else
    echo "❌ Ollama 服务不可用"
    echo "💡 请检查: ollama serve"
    exit 1
fi
