<?php

namespace App\Observers;

use App\Models\Agent;
use App\Models\GraphNode;
use App\Models\GraphEdge;
use Illuminate\Support\Facades\Log;

class AgentGraphObserver
{
    /**
     * Agent 创建时 → 自动创建图谱节点 + 技能 + 协作关系
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

                // 创建技能节点 + 建立 uses 边
                $this->createSkillNodes($agent, $childNode);

                // 与同组其他 Agent 建立协作关系
                $this->createCollaborationEdges($agent, $childNode);
            } else {
                // 顶级 Agent（可能是组或独立 Agent）
                $isGroup = $agent->type === 'team' || $agent->children()->count() > 0;

                $node = GraphNode::create([
                    'type' => $isGroup ? 'agent_group' : 'agent',
                    'name' => $agent->name,
                    'description' => mb_substr($agent->system_prompt ?? '', 0, 200) ?: ($isGroup ? '智能体团队: ' : '独立智能体: ') . $agent->name,
                    'agent_id' => $agent->id,
                    'metadata' => [
                        'model' => $agent->model,
                        'executor_type' => $agent->executor_type,
                    ],
                ]);

                // 独立 Agent 也创建技能节点
                if (!$isGroup) {
                    $this->createSkillNodes($agent, $node);
                }
            }

            Log::info("[图谱同步] Agent 创建: {$agent->name} (ID: {$agent->id})");
        } catch (\Exception $e) {
            Log::error("[图谱同步] Agent 创建同步失败: {$e->getMessage()}");
        }
    }

    /**
     * Agent 更新时 → 同步更新图谱节点 + 技能
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

            // 如果 system_prompt 变动，刷新技能节点
            if ($agent->wasChanged('system_prompt')) {
                $this->refreshSkillNodes($agent, $node);
            }

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

            // 删除该节点相关的所有边
            GraphEdge::where('source_id', $node->id)->delete();
            GraphEdge::where('target_id', $node->id)->delete();

            // 删除孤立的技能节点（只有该 Agent 引用的技能）
            $skillEdges = GraphEdge::where('source_id', $node->id)
                ->where('relation_type', 'uses')
                ->get();
            foreach ($skillEdges as $edge) {
                $otherEdges = GraphEdge::where('target_id', $edge->target_id)
                    ->where('source_id', '!=', $node->id)
                    ->count();
                if ($otherEdges === 0) {
                    GraphNode::where('id', $edge->target_id)->delete();
                }
            }

            $node->delete();

            Log::info("[图谱同步] Agent 删除: {$agent->name} (ID: {$agent->id})");
        } catch (\Exception $e) {
            Log::error("[图谱同步] Agent 删除同步失败: {$e->getMessage()}");
        }
    }

    /**
     * 为 Agent 创建技能节点
     */
    private function createSkillNodes(Agent $agent, GraphNode $agentNode): void
    {
        $skills = $this->extractSkills($agent->system_prompt, $agent->name);

        foreach ($skills as $skillName) {
            $skillNode = GraphNode::updateOrCreate(
                ['type' => 'skill', 'name' => $skillName],
                ['description' => "由 {$agent->name} 提供的技能: {$skillName}"]
            );

            $exists = GraphEdge::where('source_id', $agentNode->id)
                ->where('target_id', $skillNode->id)
                ->where('relation_type', 'uses')
                ->exists();

            if (!$exists) {
                GraphEdge::create([
                    'source_id' => $agentNode->id,
                    'target_id' => $skillNode->id,
                    'relation_type' => 'uses',
                    'label' => '使用',
                ]);
            }
        }
    }

    /**
     * 刷新技能节点（system_prompt 变动时）
     */
    private function refreshSkillNodes(Agent $agent, GraphNode $agentNode): void
    {
        // 删除旧的 uses 边
        $oldEdges = GraphEdge::where('source_id', $agentNode->id)
            ->where('relation_type', 'uses')
            ->get();

        foreach ($oldEdges as $edge) {
            // 检查技能节点是否被其他 Agent 引用
            $otherRefs = GraphEdge::where('target_id', $edge->target_id)
                ->where('source_id', '!=', $agentNode->id)
                ->count();
            $edge->delete();
            if ($otherRefs === 0) {
                GraphNode::where('id', $edge->target_id)->delete();
            }
        }

        // 创建新的技能节点
        $this->createSkillNodes($agent, $agentNode);
    }

    /**
     * 建立同组 Agent 之间的协作关系
     */
    private function createCollaborationEdges(Agent $agent, GraphNode $newNode): void
    {
        if (!$agent->parent_id) return;

        // 找到同组的其他 Agent 的图谱节点
        $siblingAgentIds = Agent::where('parent_id', $agent->parent_id)
            ->where('id', '!=', $agent->id)
            ->pluck('id');

        $siblingNodes = GraphNode::whereIn('agent_id', $siblingAgentIds)
            ->where('type', 'agent')
            ->get();

        foreach ($siblingNodes as $sibling) {
            $exists = GraphEdge::where('source_id', $newNode->id)
                ->where('target_id', $sibling->id)
                ->where('relation_type', 'collaborates')
                ->exists();

            if (!$exists) {
                GraphEdge::create([
                    'source_id' => $newNode->id,
                    'target_id' => $sibling->id,
                    'relation_type' => 'collaborates',
                    'label' => '协作',
                ]);
            }

            // 反向边
            $existsRev = GraphEdge::where('source_id', $sibling->id)
                ->where('target_id', $newNode->id)
                ->where('relation_type', 'collaborates')
                ->exists();

            if (!$existsRev) {
                GraphEdge::create([
                    'source_id' => $sibling->id,
                    'target_id' => $newNode->id,
                    'relation_type' => 'collaborates',
                    'label' => '协作',
                ]);
            }
        }
    }

    /**
     * 同步父级关系边
     */
    private function syncParentEdge(Agent $agent, GraphNode $node): void
    {
        // 删除旧的 contains 边
        GraphEdge::where('target_id', $node->id)
            ->where('relation_type', 'contains')
            ->delete();

        // 删除旧的协作边
        GraphEdge::where('source_id', $node->id)
            ->where('relation_type', 'collaborates')
            ->delete();
        GraphEdge::where('target_id', $node->id)
            ->where('relation_type', 'collaborates')
            ->delete();

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

            // 重建协作关系
            $this->createCollaborationEdges($agent, $node);
        }
    }

    /**
     * 从 system_prompt 提取技能关键词
     */
    private function extractSkills(?string $prompt, string $agentName): array
    {
        if (empty($prompt)) {
            return [$agentName . ' 核心能力'];
        }

        $skills = [];

        // 匹配特定能力关键词
        $keywords = [
            '选品' => '选品分析',
            '调研' => '市场调研',
            '财务' => '财务管理',
            '运营' => '运营管理',
            '决策' => '决策分析',
            '分析' => '数据分析',
            '客服' => '客户服务',
            '文案' => '文案撰写',
            '图片' => '图片处理',
            '定价' => '定价策略',
            '库存' => '库存管理',
            '售后' => '售后服务',
            '营销' => '营销推广',
        ];

        foreach ($keywords as $keyword => $skill) {
            if (mb_strpos($prompt, $keyword) !== false) {
                $skills[] = $skill;
            }
        }

        // 去重，最多取5个
        $skills = array_unique($skills);
        return array_slice($skills, 0, 5);
    }
}
