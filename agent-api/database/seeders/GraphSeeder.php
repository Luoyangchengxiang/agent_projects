<?php

namespace Database\Seeders;

use App\Models\GraphNode;
use App\Models\GraphEdge;
use Illuminate\Database\Seeder;

class GraphSeeder extends Seeder
{
    public function run(): void
    {
        // 创建开店智能体组
        $group = GraphNode::create([
            'type' => 'agent_group',
            'name' => '开店智能体组',
            'description' => '负责电商开店全流程的智能体团队',
        ]);

        // 创建子 Agent
        $agents = [
            [
                'name' => '主控Agent',
                'description' => '负责任务调度和流程控制',
            ],
            [
                'name' => '选品Agent',
                'description' => '负责热销商品调研和选品分析',
            ],
            [
                'name' => '内容Agent',
                'description' => '负责商品详情页和营销文案生成',
            ],
            [
                'name' => '客服Agent',
                'description' => '负责客户咨询和售后处理',
            ],
        ];

        $agentNodes = [];
        foreach ($agents as $agentData) {
            $agentNode = GraphNode::create([
                'type' => 'agent',
                'name' => $agentData['name'],
                'description' => $agentData['description'],
            ]);
            $agentNodes[] = $agentNode;

            // 创建包含关系
            GraphEdge::create([
                'source_id' => $group->id,
                'target_id' => $agentNode->id,
                'relation_type' => 'contains',
                'label' => '包含',
            ]);
        }

        // 创建知识库节点
        $knowledgeNodes = [
            [
                'name' => '1688热销数据',
                'description' => '来自1688平台的热销商品数据',
            ],
            [
                'name' => '用户画像',
                'description' => '目标用户的消费习惯和偏好',
            ],
            [
                'name' => '竞品分析',
                'description' => '竞争对手的商品和策略分析',
            ],
        ];

        foreach ($knowledgeNodes as $kData) {
            $kNode = GraphNode::create([
                'type' => 'knowledge',
                'name' => $kData['name'],
                'description' => $kData['description'],
            ]);

            // 选品Agent使用这些知识库
            GraphEdge::create([
                'source_id' => $agentNodes[1]->id, // 选品Agent
                'target_id' => $kNode->id,
                'relation_type' => 'uses',
                'label' => '使用',
            ]);
        }

        // 创建技能节点
        $skillNodes = [
            [
                'name' => '商品调研',
                'description' => '分析热销商品趋势和利润率',
            ],
            [
                'name' => '文案撰写',
                'description' => '生成商品标题和详情描述',
            ],
            [
                'name' => '图片处理',
                'description' => '商品图片优化和主图生成',
            ],
        ];

        foreach ($skillNodes as $sData) {
            $sNode = GraphNode::create([
                'type' => 'skill',
                'name' => $sData['name'],
                'description' => $sData['description'],
            ]);

            // 不同Agent使用不同技能
            if ($sData['name'] === '商品调研') {
                GraphEdge::create([
                    'source_id' => $agentNodes[1]->id, // 选品Agent
                    'target_id' => $sNode->id,
                    'relation_type' => 'uses',
                    'label' => '使用',
                ]);
            } elseif ($sData['name'] === '文案撰写') {
                GraphEdge::create([
                    'source_id' => $agentNodes[2]->id, // 内容Agent
                    'target_id' => $sNode->id,
                    'relation_type' => 'uses',
                    'label' => '使用',
                ]);
            } elseif ($sData['name'] === '图片处理') {
                GraphEdge::create([
                    'source_id' => $agentNodes[2]->id, // 内容Agent
                    'target_id' => $sNode->id,
                    'relation_type' => 'uses',
                    'label' => '使用',
                ]);
            }
        }

        // 创建产出物节点
        $outputNodes = [
            [
                'name' => '选品报告',
                'description' => '热销商品调研报告',
            ],
            [
                'name' => '商品详情页',
                'description' => '商品详情描述和图片',
            ],
        ];

        foreach ($outputNodes as $oData) {
            $oNode = GraphNode::create([
                'type' => 'output',
                'name' => $oData['name'],
                'description' => $oData['description'],
            ]);

            // 不同Agent产出不同内容
            if ($oData['name'] === '选品报告') {
                GraphEdge::create([
                    'source_id' => $agentNodes[1]->id, // 选品Agent
                    'target_id' => $oNode->id,
                    'relation_type' => 'produces',
                    'label' => '产出',
                ]);
            } elseif ($oData['name'] === '商品详情页') {
                GraphEdge::create([
                    'source_id' => $agentNodes[2]->id, // 内容Agent
                    'target_id' => $oNode->id,
                    'relation_type' => 'produces',
                    'label' => '产出',
                ]);
            }
        }

        // 创建Agent之间的协作关系
        GraphEdge::create([
            'source_id' => $agentNodes[0]->id, // 主控Agent
            'target_id' => $agentNodes[1]->id, // 选品Agent
            'relation_type' => 'collaborates',
            'label' => '调度',
        ]);

        GraphEdge::create([
            'source_id' => $agentNodes[0]->id, // 主控Agent
            'target_id' => $agentNodes[2]->id, // 内容Agent
            'relation_type' => 'collaborates',
            'label' => '调度',
        ]);

        GraphEdge::create([
            'source_id' => $agentNodes[0]->id, // 主控Agent
            'target_id' => $agentNodes[3]->id, // 客服Agent
            'relation_type' => 'collaborates',
            'label' => '调度',
        ]);
    }
}
