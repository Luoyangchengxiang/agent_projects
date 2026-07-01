<?php

namespace Database\Seeders;

use App\Models\Agent;
use App\Models\GraphNode;
use App\Models\GraphEdge;
use Illuminate\Database\Seeder;

class GraphSeeder extends Seeder
{
    public function run(): void
    {
        // 幂等：已有数据则跳过
        if (GraphNode::count() > 0) {
            return;
        }

        $agents = Agent::active()->with('children')->get();
        if ($agents->isEmpty()) {
            return;
        }

        // 处理组（有子级的 Agent）
        $groups = $agents->filter(fn($a) => $a->children->count() > 0);
        foreach ($groups as $group) {
            $groupNode = GraphNode::create([
                'type' => 'agent_group',
                'name' => $group->name,
                'description' => mb_substr($group->system_prompt ?? '', 0, 200) ?: '智能体团队: ' . $group->name,
                'agent_id' => $group->id,
            ]);

            foreach ($group->children as $child) {
                $childNode = GraphNode::create([
                    'type' => 'agent',
                    'name' => $child->name,
                    'description' => mb_substr($child->system_prompt ?? '', 0, 200) ?: '智能体: ' . $child->name,
                    'agent_id' => $child->id,
                    'metadata' => ['model' => $child->model, 'executor_type' => $child->executor_type],
                ]);

                GraphEdge::create([
                    'source_id' => $groupNode->id,
                    'target_id' => $childNode->id,
                    'relation_type' => 'contains',
                    'label' => '包含',
                ]);
            }
        }

        // 处理独立 Agent
        $standalone = $agents->filter(fn($a) => $a->parent_id === null && $a->children->count() === 0);
        foreach ($standalone as $agent) {
            GraphNode::create([
                'type' => 'agent',
                'name' => $agent->name,
                'description' => mb_substr($agent->system_prompt ?? '', 0, 200) ?: '独立智能体: ' . $agent->name,
                'agent_id' => $agent->id,
                'metadata' => ['model' => $agent->model, 'executor_type' => $agent->executor_type],
            ]);
        }
    }
}
