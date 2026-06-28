<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use App\Models\Agent;
use App\Models\ExecutionLog;
use App\Models\GraphNode;
use App\Models\GraphEdge;
use App\Models\Setting;
use App\Models\VersionUpdate;
use App\Models\User;

class SeederIdempotencyTest extends TestCase
{
    use RefreshDatabase;

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
     * 测试 GraphSeeder 创建正确的图谱结构
     */
    public function test_graph_seeder_creates_expected_structure(): void
    {
        $this->seed(\Database\Seeders\GraphSeeder::class);

        $this->assertEquals(1, GraphNode::where('type', 'agent_group')->count());
        $this->assertEquals(4, GraphNode::where('type', 'agent')->count());
        $this->assertEquals(3, GraphNode::where('type', 'knowledge')->count());
        $this->assertEquals(3, GraphNode::where('type', 'skill')->count());
        $this->assertEquals(2, GraphNode::where('type', 'output')->count());
        $this->assertGreaterThan(0, GraphEdge::count(), '应有图谱边');
    }
}
