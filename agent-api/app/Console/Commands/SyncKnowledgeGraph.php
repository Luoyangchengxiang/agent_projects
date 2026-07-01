<?php

namespace App\Console\Commands;

use App\Models\Agent;
use App\Models\GraphNode;
use App\Models\GraphEdge;
use Illuminate\Console\Command;

class SyncKnowledgeGraph extends Command
{
    protected $signature = 'graph:sync 
                            {--clear : 清空现有图谱数据后重新生成}';
    
    protected $description = '从 Agent 列表自动生成知识图谱（节点+边）';

    public function handle(): int
    {
        $clear = $this->option('clear');

        if ($clear) {
            $this->warn('🗑️  清空现有图谱数据...');
            GraphEdge::query()->delete();
            GraphNode::query()->delete();
        }

        $agents = Agent::active()->with('children')->get();
        
        if ($agents->isEmpty()) {
            $this->error('❌ 没有找到任何 Agent，请先同步 Agent 数据');
            return self::FAILURE;
        }

        $this->info('🔗 开始同步知识图谱...');
        $this->newLine();

        $stats = ['groups' => 0, 'agents' => 0, 'skills' => 0, 'edges' => 0];

        // 1. 处理组（有子级的 Agent）
        $groups = $agents->filter(fn($a) => $a->children->count() > 0);
        foreach ($groups as $group) {
            $groupNode = GraphNode::updateOrCreate(
                ['agent_id' => $group->id],
                [
                    'type' => 'agent_group',
                    'name' => $group->name,
                    'description' => $group->system_prompt 
                        ? mb_substr($group->system_prompt, 0, 200) 
                        : '智能体团队: ' . $group->name,
                ]
            );
            $stats['groups']++;

            // 2. 处理子 Agent
            foreach ($group->children as $child) {
                $childNode = GraphNode::updateOrCreate(
                    ['agent_id' => $child->id],
                    [
                        'type' => 'agent',
                        'name' => $child->name,
                        'description' => $child->system_prompt 
                            ? mb_substr($child->system_prompt, 0, 200) 
                            : '智能体: ' . $child->name,
                        'metadata' => [
                            'model' => $child->model,
                            'executor_type' => $child->executor_type,
                        ],
                    ]
                );
                $stats['agents']++;

                // 组 → 子 Agent (contains)
                GraphEdge::updateOrCreate(
                    [
                        'source_id' => $groupNode->id,
                        'target_id' => $childNode->id,
                        'relation_type' => 'contains',
                    ],
                    ['label' => '包含']
                );
                $stats['edges']++;

                // 3. 从 system_prompt 提取技能关键词，创建技能节点
                $skills = $this->extractSkills($child->system_prompt, $child->name);
                foreach ($skills as $skillName) {
                    $skillNode = GraphNode::updateOrCreate(
                        [
                            'type' => 'skill',
                            'name' => $skillName,
                        ],
                        [
                            'description' => "由 {$child->name} 提供的技能: {$skillName}",
                        ]
                    );
                    $stats['skills']++;

                    // Agent → 技能 (uses)
                    $exists = GraphEdge::where('source_id', $childNode->id)
                        ->where('target_id', $skillNode->id)
                        ->where('relation_type', 'uses')
                        ->exists();
                    
                    if (!$exists) {
                        GraphEdge::create([
                            'source_id' => $childNode->id,
                            'target_id' => $skillNode->id,
                            'relation_type' => 'uses',
                            'label' => '使用',
                        ]);
                        $stats['edges']++;
                    }
                }
            }
        }

        // 4. 处理独立 Agent（无父级、无子级）
        $standalone = $agents->filter(fn($a) => $a->parent_id === null && $a->children->count() === 0);
        foreach ($standalone as $agent) {
            $node = GraphNode::updateOrCreate(
                ['agent_id' => $agent->id],
                [
                    'type' => 'agent',
                    'name' => $agent->name,
                    'description' => $agent->system_prompt 
                        ? mb_substr($agent->system_prompt, 0, 200) 
                        : '独立智能体: ' . $agent->name,
                    'metadata' => [
                        'model' => $agent->model,
                        'executor_type' => $agent->executor_type,
                    ],
                ]
            );
            $stats['agents']++;

            // 提取技能
            $skills = $this->extractSkills($agent->system_prompt, $agent->name);
            foreach ($skills as $skillName) {
                $skillNode = GraphNode::updateOrCreate(
                    [
                        'type' => 'skill',
                        'name' => $skillName,
                    ],
                    [
                        'description' => "由 {$agent->name} 提供的技能: {$skillName}",
                    ]
                );
                $stats['skills']++;

                $exists = GraphEdge::where('source_id', $node->id)
                    ->where('target_id', $skillNode->id)
                    ->where('relation_type', 'uses')
                    ->exists();
                
                if (!$exists) {
                    GraphEdge::create([
                        'source_id' => $node->id,
                        'target_id' => $skillNode->id,
                        'relation_type' => 'uses',
                        'label' => '使用',
                    ]);
                    $stats['edges']++;
                }
            }
        }

        // 5. 建立 Agent 之间的协作关系（同组内的子 Agent 互相协作）
        foreach ($groups as $group) {
            $childNodes = GraphNode::whereIn('agent_id', $group->children->pluck('id'))->get();
            foreach ($childNodes as $i => $nodeA) {
                foreach ($childNodes as $j => $nodeB) {
                    if ($i >= $j) continue;
                    $exists = GraphEdge::where('source_id', $nodeA->id)
                        ->where('target_id', $nodeB->id)
                        ->where('relation_type', 'collaborates')
                        ->exists();
                    if (!$exists) {
                        GraphEdge::create([
                            'source_id' => $nodeA->id,
                            'target_id' => $nodeB->id,
                            'relation_type' => 'collaborates',
                            'label' => '协作',
                        ]);
                        $stats['edges']++;
                    }
                }
            }
        }

        $this->newLine();
        $this->info('✅ 知识图谱同步完成！');
        $this->table(
            ['类型', '数量'],
            [
                ['智能体组', $stats['groups']],
                ['智能体', $stats['agents']],
                ['技能', $stats['skills']],
                ['关系边', $stats['edges']],
            ]
        );

        return self::SUCCESS;
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

        // 匹配 "你负责XXX" / "你的任务是XXX" / "职责：XXX"
        $patterns = [
            '/你[是负责]+([^，。,.\n]{2,20})/u',
            '/职责[：:]\\s*(.+)/u',
            '/主要[任务职责]+[：:]\\s*(.+)/u',
            '/ROLE[：:]\\s*(.+)/i',
            '/擅长[^，。,.\n]{2,15}/u',
        ];

        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $prompt, $m)) {
                $skill = trim($m[1] ?? $m[0]);
                // 清理标点
                $skill = preg_replace('/[，。、,.]/u', '', $skill);
                if (mb_strlen($skill) >= 2 && mb_strlen($skill) <= 20) {
                    $skills[] = $skill;
                }
            }
        }

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
            if (mb_strpos($prompt, $keyword) !== false && !in_array($skill, $skills)) {
                $skills[] = $skill;
            }
        }

        // 去重，最多取5个
        $skills = array_unique($skills);
        return array_slice($skills, 0, 5);
    }
}
