<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\Agent;
use App\Models\ExecutionLog;
use App\Models\GraphNode;
use App\Models\GraphEdge;
use App\Models\Setting;
use App\Models\VersionUpdate;
use App\Models\User;

class SeederIdempotencyTest extends TestCase
{

    /**
     * 测试 AgentSeeder 幂等性：运行两次不插入重复数据
     */
    public function test_agent_seeder_is_idempotent(): void
    {
        $this->seed(\Database\Seeders\AgentSeeder::class);
        $agentCount1 = Agent::count();
        $logCount1 = ExecutionLog::count();
        $this->assertGreaterThan(0, $agentCount1);

        $this->seed(\Database\Seeders\AgentSeeder::class);
        $this->assertEquals($agentCount1, Agent::count(), 'Agent 不应重复');
        $this->assertEquals($logCount1, ExecutionLog::count(), 'ExecutionLog 不应重复');
    }

    /**
     * 测试 GraphSeeder 幂等性：已有数据时跳过
     */
    public function test_graph_seeder_is_idempotent(): void
    {
        // 先创建 Agent 数据（GraphSeeder 依赖 Agent 表）
        $this->seed(\Database\Seeders\AgentSeeder::class);
        
        // 创建一个组 Agent 和子 Agent（用 save() 触发 Observer）
        $group = \App\Models\Agent::create([
            'name' => '测试团队',
            'type' => 'team',
            'status' => 'offline',
        ]);
        
        $agent1 = \App\Models\Agent::where('name', '选品专家')->first();
        $agent1->parent_id = $group->id;
        $agent1->save();
        
        $agent2 = \App\Models\Agent::where('name', '运营管家')->first();
        $agent2->parent_id = $group->id;
        $agent2->save();

        $this->seed(\Database\Seeders\GraphSeeder::class);
        $nodeCount1 = GraphNode::count();
        $edgeCount1 = GraphEdge::count();
        $this->assertGreaterThan(0, $nodeCount1);

        $this->seed(\Database\Seeders\GraphSeeder::class);
        $this->assertEquals($nodeCount1, GraphNode::count(), 'GraphNode 不应重复');
        $this->assertEquals($edgeCount1, GraphEdge::count(), 'GraphEdge 不应重复');
    }

    /**
     * 测试 VersionUpdateSeeder 幂等性
     */
    public function test_version_update_seeder_is_idempotent(): void
    {
        $this->seed(\Database\Seeders\VersionUpdateSeeder::class);
        $count1 = VersionUpdate::count();
        $this->assertGreaterThan(0, $count1);

        $this->seed(\Database\Seeders\VersionUpdateSeeder::class);
        $this->assertEquals($count1, VersionUpdate::count(), 'VersionUpdate 不应重复');
    }

    /**
     * 测试 AdminSeeder 幂等性
     */
    public function test_admin_seeder_is_idempotent(): void
    {
        $this->seed(\Database\Seeders\AdminSeeder::class);
        $count1 = User::where('role', 'admin')->count();
        $this->assertGreaterThan(0, $count1);

        $this->seed(\Database\Seeders\AdminSeeder::class);
        $this->assertEquals($count1, User::where('role', 'admin')->count());
    }

    /**
     * 测试 SettingSeeder 幂等性
     */
    public function test_setting_seeder_is_idempotent(): void
    {
        $this->seed(\Database\Seeders\SettingSeeder::class);
        $count1 = Setting::count();
        $this->assertGreaterThan(0, $count1);

        $this->seed(\Database\Seeders\SettingSeeder::class);
        $this->assertEquals($count1, Setting::count(), 'Setting 不应重复');
    }

    /**
     * 测试 DatabaseSeeder 完整运行
     */
    public function test_full_database_seeder_runs_without_error(): void
    {
        $this->seed(\Database\Seeders\DatabaseSeeder::class);

        $this->assertGreaterThan(0, User::count());
        $this->assertGreaterThan(0, Agent::count());
        $this->assertGreaterThan(0, GraphNode::count());
        $this->assertGreaterThan(0, Setting::count());
        $this->assertGreaterThan(0, VersionUpdate::count());
    }

    /**
     * 测试完整 seeder 运行两次不重复
     */
    public function test_full_database_seeder_is_idempotent(): void
    {
        $this->seed(\Database\Seeders\DatabaseSeeder::class);
        $agents1 = Agent::count();
        $nodes1 = GraphNode::count();
        $versions1 = VersionUpdate::count();
        $settings1 = Setting::count();

        $this->seed(\Database\Seeders\DatabaseSeeder::class);
        $this->assertEquals($agents1, Agent::count());
        $this->assertEquals($nodes1, GraphNode::count());
        $this->assertEquals($versions1, VersionUpdate::count());
        $this->assertEquals($settings1, Setting::count());
    }

    /**
     * 测试 AgentSeeder 创建正确的 Agent 和日志
     */
    public function test_agent_seeder_creates_expected_agents(): void
    {
        $this->seed(\Database\Seeders\AgentSeeder::class);

        foreach (['选品专家', '运营管家', '财务顾问', '决策引擎', '分析专家'] as $name) {
            $this->assertTrue(Agent::where('name', $name)->exists(), "应存在: {$name}");
        }

        // Agent 数量应该正确
        $this->assertEquals(5, Agent::count(), '应有 5 个智能体');

        // 执行日志不再由 seeder 创建（由实际执行生成）
        foreach (Agent::all() as $agent) {
            $this->assertEquals(0, $agent->executionLogs()->count(),
                "{$agent->name} 初始化时应无日志（日志由实际执行生成）");
        }
    }

    /**
     * 测试 GraphSeeder 创建正确的图谱结构（基于 Agent 列表动态生成）
     */
    public function test_graph_seeder_creates_expected_structure(): void
    {
        // 先创建 Agent 数据（GraphSeeder 依赖 Agent 表）
        $this->seed(\Database\Seeders\AgentSeeder::class);
        
        // 创建一个组 Agent 和子 Agent（用 save() 触发 Observer）
        $group = \App\Models\Agent::create([
            'name' => '测试团队',
            'type' => 'team',
            'status' => 'offline',
        ]);
        
        // 用单个模型更新触发 Observer（mass update 不触发事件）
        $agent1 = \App\Models\Agent::where('name', '选品专家')->first();
        $agent1->parent_id = $group->id;
        $agent1->save();
        
        $agent2 = \App\Models\Agent::where('name', '运营管家')->first();
        $agent2->parent_id = $group->id;
        $agent2->save();

        $this->seed(\Database\Seeders\GraphSeeder::class);

        // 至少应有 agent_group 和 agent 节点
        $this->assertGreaterThan(0, GraphNode::where('type', 'agent_group')->count(),
            '应有至少1个智能体组');
        $this->assertGreaterThan(0, GraphNode::where('type', 'agent')->count(),
            '应有至少1个智能体节点');
        
        // 每个图谱节点应关联到 Agent
        $nodesWithAgent = GraphNode::whereNotNull('agent_id')->count();
        $this->assertGreaterThan(0, $nodesWithAgent, '图谱节点应关联到 Agent');
        
        // 应有包含关系边
        $this->assertGreaterThan(0, GraphEdge::where('relation_type', 'contains')->count(),
            '应有包含关系边');
    }
}
