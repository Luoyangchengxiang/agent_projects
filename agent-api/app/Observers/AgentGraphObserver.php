<?php

namespace App\Observers;

use App\Models\Agent;
use App\Models\GraphNode;
use App\Models\GraphEdge;
use Illuminate\Support\Facades\Log;

class AgentGraphObserver
{
    /**
     * Agent 创建时 → 自动创建图谱节点
     */
    public function created(Agent $agent): void
    {
        try {
            if ($agent->parent_id) {
                // 子 Agent：创建节点 + 建立与父组的边
                $childNode = GraphNode::create([
                    'type' => 'agent',
                    'name' => $agent->name,
                    'description' => mb_substr($agent->system_prompt ?? '', 0, 200) ?: '智能体: ' . $agent->name,
                    'agent_id' => $agent->id,
                    'metadata' => [
                        'model' => $agent->model,
                        'executor_type' => $agent->executor_type,
                    ],
                ]);

                // 找到父组的图谱节点，建立 contains 边
                $parentNode = GraphNode::where('agent_id', $agent->parent_id)
                    ->where('type', 'agent_group')
                    ->first();

                if ($parentNode) {
                    GraphEdge::create([
                        'source_id' => $parentNode->id,
                        'target_id' => $childNode->id,
                        'relation_type' => 'contains',
                        'label' => '包含',
                    ]);
                }
            } else {
                // 顶级 Agent（可能是组或独立 Agent）
                // 检查是否有子级来判断是否是组
                $isGroup = $agent->type === 'team' || $agent->children()->count() > 0;

                GraphNode::create([
                    'type' => $isGroup ? 'agent_group' : 'agent',
                    'name' => $agent->name,
                    'description' => mb_substr($agent->system_prompt ?? '', 0, 200) ?: ($isGroup ? '智能体团队: ' : '独立智能体: ') . $agent->name,
                    'agent_id' => $agent->id,
                    'metadata' => [
                        'model' => $agent->model,
                        'executor_type' => $agent->executor_type,
                    ],
                ]);
            }

            Log::info("[图谱同步] Agent 创建: {$agent->name} (ID: {$agent->id})");
        } catch (\Exception $e) {
            Log::error("[图谱同步] Agent 创建同步失败: {$e->getMessage()}");
        }
    }

    /**
     * Agent 更新时 → 同步更新图谱节点
     */
    public function updated(Agent $agent): void
    {
        try {
            $node = GraphNode::where('agent_id', $agent->id)->first();
            if (!$node) return;

            // 更新节点基本信息
            $node->update([
                'name' => $agent->name,
                'description' => mb_substr($agent->system_prompt ?? '', 0, 200) ?: $node->description,
                'metadata' => [
                    'model' => $agent->model,
                    'executor_type' => $agent->executor_type,
                ],
            ]);

            // 如果 parent_id 变动，更新边关系
            if ($agent->wasChanged('parent_id')) {
                $this->syncParentEdge($agent, $node);
            }

            Log::info("[图谱同步] Agent 更新: {$agent->name} (ID: {$agent->id})");
        } catch (\Exception $e) {
            Log::error("[图谱同步] Agent 更新同步失败: {$e->getMessage()}");
        }
    }

    /**
     * Agent 删除时 → 删除图谱节点和相关边
     */
    public function deleted(Agent $agent): void
    {
        try {
            $node = GraphNode::where('agent_id', $agent->id)->first();
            if (!$node) return;

            // 删除相关的边
            GraphEdge::where('source_id', $node->id)->delete();
            GraphEdge::where('target_id', $node->id)->delete();

            // 删除节点
            $node->delete();

            Log::info("[图谱同步] Agent 删除: {$agent->name} (ID: {$agent->id})");
        } catch (\Exception $e) {
            Log::error("[图谱同步] Agent 删除同步失败: {$e->getMessage()}");
        }
    }

    /**
     * 同步父级关系边
     */
    private function syncParentEdge(Agent $agent, GraphNode $node): void
    {
        // 删除旧的 contains 边（指向该节点的）
        GraphEdge::where('target_id', $node->id)
            ->where('relation_type', 'contains')
            ->delete();

        // 如果有新的父级，建立新边
        if ($agent->parent_id) {
            $parentNode = GraphNode::where('agent_id', $agent->parent_id)
                ->where('type', 'agent_group')
                ->first();

            if ($parentNode) {
                GraphEdge::create([
                    'source_id' => $parentNode->id,
                    'target_id' => $node->id,
                    'relation_type' => 'contains',
                    'label' => '包含',
                ]);
            }
        }
    }
}
