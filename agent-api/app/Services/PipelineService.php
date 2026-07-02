<?php

namespace App\Services;

use App\Models\Agent;
use App\Models\ExecutionLog;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * 开店团队流水线协作服务
 * 
 * 流程：
 * 选品专家 → 分析专家 → 财务顾问 → 决策引擎 → 运营管家 → 汇总报告
 *                              ↘         ↙
 *                           同时接收两个结果
 */
class PipelineService
{
    public function __construct(
        private AgentExecutor $executor
    ) {}

    /**
     * 执行完整的流水线
     *
     * @param string $topic 选题主题
     * @return array 执行结果
     */
    public function run(string $topic = '今日热销商品调研'): array
    {
        $pipelineId = 'pipeline_' . Str::uuid();
        $startTime = microtime(true);
        $results = [];

        Log::info("流水线开始执行", ['pipeline_id' => $pipelineId, 'topic' => $topic]);

        try {
            // 1. 选品专家
            $selectionResult = $this->runStep('选品专家', $topic, $pipelineId);
            $results['selection'] = $selectionResult;

            // 2. 分析专家（接收选品结果）
            $analysisResult = $this->runStep(
                '分析专家',
                "请分析以下热销商品的市场情况：\n\n" . $selectionResult['output'],
                $pipelineId
            );
            $results['analysis'] = $analysisResult;

            // 3. 财务顾问（接收分析专家的结果）
            $financialResult = $this->runStep(
                '财务顾问',
                "请评估以下商品的财务可行性和利润空间：\n\n" . $analysisResult['output'],
                $pipelineId
            );
            $results['financial'] = $financialResult;

            // 4. 决策引擎（同时接收分析专家和财务顾问的结果）
            $decisionInput = <<<INPUT
请基于以下两份报告，做出最终的3款商品选择决策：

【分析专家报告】
{$analysisResult['output']}

【财务顾问报告】
{$financialResult['output']}

请综合考虑市场潜力、竞争程度、利润空间、风险因素，给出最终的3款推荐商品及理由。
INPUT;

            $decisionResult = $this->runStep('决策引擎', $decisionInput, $pipelineId);
            $results['decision'] = $decisionResult;

            // 5. 运营管家（接收决策结果）
            $operationResult = $this->runStep(
                '运营管家',
                "请根据以下商品选择，制定详细的运营方案：\n\n" . $decisionResult['output'],
                $pipelineId
            );
            $results['operation'] = $operationResult;

            // 6. 汇总报告
            $summary = $this->generateSummary($results, $topic);
            $results['summary'] = $summary;

            $duration = (int) ((microtime(true) - $startTime) * 1000);

            Log::info("流水线执行完成", [
                'pipeline_id' => $pipelineId,
                'duration' => $duration . 'ms',
                'steps' => count($results),
            ]);

            return [
                'success' => true,
                'pipeline_id' => $pipelineId,
                'duration' => $duration,
                'results' => $results,
                'summary' => $summary,
            ];

        } catch (\Exception $e) {
            Log::error("流水线执行失败", [
                'pipeline_id' => $pipelineId,
                'error' => $e->getMessage(),
            ]);

            return [
                'success' => false,
                'pipeline_id' => $pipelineId,
                'error' => $e->getMessage(),
                'results' => $results,
            ];
        }
    }

    /**
     * 执行单个步骤
     */
    private function runStep(string $agentName, string $input, string $pipelineId): array
    {
        $agent = Agent::where('name', $agentName)
            ->where('is_deleted', false)
            ->first();

        if (!$agent) {
            throw new \RuntimeException("Agent [{$agentName}] 不存在或已删除");
        }

        Log::info("流水线步骤开始", [
            'pipeline_id' => $pipelineId,
            'agent' => $agentName,
        ]);

        // 执行并获取日志
        $log = $this->executor->execute($agent, $input, [
            'pipeline_id' => $pipelineId,
        ]);

        if (!$log->isSuccess()) {
            throw new \RuntimeException("Agent [{$agentName}] 执行失败: " . $log->error);
        }

        return [
            'agent' => $agentName,
            'agent_id' => $agent->id,
            'log_id' => $log->id,
            'input' => $input,
            'output' => $log->output,
            'duration' => $log->duration,
        ];
    }

    /**
     * 生成汇总报告
     */
    private function generateSummary(array $results, string $topic): string
    {
        $date = now()->format('Y年m月d日');

        $summary = <<<SUMMARY
# 开店团队协作报告 - {$date}

## 选题
{$topic}

## 流程执行概览

| 步骤 | Agent | 耗时 |
|------|-------|------|
| 1. 选品调研 | 选品专家 | {$results['selection']['duration']}ms |
| 2. 市场分析 | 分析专家 | {$results['analysis']['duration']}ms |
| 3. 财务评估 | 财务顾问 | {$results['financial']['duration']}ms |
| 4. 最终决策 | 决策引擎 | {$results['decision']['duration']}ms |
| 5. 运营方案 | 运营管家 | {$results['operation']['duration']}ms |

---

## 一、选品专家推荐

{$results['selection']['output']}

---

## 二、市场分析报告

{$results['analysis']['output']}

---

## 三、财务评估报告

{$results['financial']['output']}

---

## 四、最终决策

{$results['decision']['output']}

---

## 五、运营方案

{$results['operation']['output']}

---

*报告生成时间：{$date}*
*流水线ID：{$results['selection']['log_id']}*
SUMMARY;

        return $summary;
    }

    /**
     * 获取流水线历史
     */
    public function getHistory(int $limit = 10): array
    {
        // 获取最近的流水线执行记录（通过pipeline_id关联）
        $logs = ExecutionLog::where('context->pipeline_id', 'like', 'pipeline_%')
            ->orderBy('created_at', 'desc')
            ->limit($limit * 6) // 每个流水线最多6个步骤
            ->get();

        // 按pipeline_id分组
        $pipelines = [];
        foreach ($logs as $log) {
            $pid = $log->context['pipeline_id'] ?? 'unknown';
            if (!isset($pipelines[$pid])) {
                $pipelines[$pid] = [
                    'pipeline_id' => $pid,
                    'created_at' => $log->created_at,
                    'steps' => [],
                ];
            }
            $pipelines[$pid]['steps'][] = [
                'agent_id' => $log->agent_id,
                'status' => $log->status,
                'duration' => $log->duration,
            ];
        }

        return array_values($pipelines);
    }
}
