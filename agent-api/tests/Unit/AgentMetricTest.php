<?php

namespace Tests\Unit\Models;

use App\Models\Agent;
use App\Models\AgentMetric;
use Tests\TestCase;

class AgentMetricTest extends TestCase
{
    private Agent $agent;

    protected function setUp(): void
    {
        parent::setUp();

        // 创建测试 Agent
        $this->agent = Agent::firstOrCreate(
            ['name' => '测试Agent-指标'],
            ['type' => 'test', 'status' => 'active', 'description' => '用于指标测试']
        );

        // 清理旧数据
        AgentMetric::where('agent_id', $this->agent->id)->delete();
    }

    // ========== 记录指标 ==========

    public function test_record_creates_metric(): void
    {
        $metric = AgentMetric::record($this->agent->id, 'cpu', 55.5, ['host' => 'server1']);

        $this->assertNotNull($metric->id);
        $this->assertEquals($this->agent->id, $metric->agent_id);
        $this->assertEquals('cpu', $metric->metric_name);
        $this->assertEquals(55.5, $metric->metric_value);
        $this->assertEquals(['host' => 'server1'], $metric->tags);
        $this->assertNotNull($metric->recorded_at);
    }

    public function test_record_with_custom_timestamp(): void
    {
        $time = '2026-06-27 10:00:00';
        $metric = AgentMetric::record($this->agent->id, 'memory', 70.0, null, $time);

        $this->assertEquals($time, $metric->recorded_at->format('Y-m-d H:i:s'));
    }

    // ========== 统计 ==========

    public function test_get_stats_returns_correct_values(): void
    {
        // 创建 5 条指标
        foreach ([10, 20, 30, 40, 50] as $value) {
            AgentMetric::record($this->agent->id, 'cpu', $value);
        }

        $stats = AgentMetric::getStats($this->agent->id, 'cpu', 60);

        $this->assertEquals(5, $stats['count']);
        $this->assertEquals(30, $stats['avg']);
        $this->assertEquals(10, $stats['min']);
        $this->assertEquals(50, $stats['max']);
    }

    public function test_get_stats_returns_zero_for_empty(): void
    {
        $stats = AgentMetric::getStats($this->agent->id, 'nonexistent', 60);

        $this->assertEquals(0, $stats['count']);
        $this->assertEquals(0, $stats['avg']);
    }

    public function test_get_stats_filters_by_metric_name(): void
    {
        AgentMetric::record($this->agent->id, 'cpu', 50);
        AgentMetric::record($this->agent->id, 'memory', 80);

        $cpuStats = AgentMetric::getStats($this->agent->id, 'cpu', 60);
        $memStats = AgentMetric::getStats($this->agent->id, 'memory', 60);

        $this->assertEquals(1, $cpuStats['count']);
        $this->assertEquals(50, $cpuStats['avg']);
        $this->assertEquals(1, $memStats['count']);
        $this->assertEquals(80, $memStats['avg']);
    }

    // ========== 趋势 ==========

    public function test_get_trend_returns_hourly_data(): void
    {
        // 创建不同时间的指标
        AgentMetric::record($this->agent->id, 'cpu', 40, null, now()->subHours(2));
        AgentMetric::record($this->agent->id, 'cpu', 60, null, now()->subHours(2));
        AgentMetric::record($this->agent->id, 'cpu', 50, null, now()->subHour());

        $trend = AgentMetric::getTrend($this->agent->id, 'cpu', 24);

        $this->assertIsArray($trend);
        $this->assertNotEmpty($trend);
        // 每个小时桶应有 avg/min/max/count
        foreach ($trend as $bucket) {
            $this->assertArrayHasKey('time', $bucket);
            $this->assertArrayHasKey('avg', $bucket);
            $this->assertArrayHasKey('min', $bucket);
            $this->assertArrayHasKey('max', $bucket);
            $this->assertArrayHasKey('count', $bucket);
        }
    }

    // ========== Scope ==========

    public function test_scope_of_metric_filters(): void
    {
        AgentMetric::record($this->agent->id, 'cpu', 50);
        AgentMetric::record($this->agent->id, 'memory', 80);

        $cpuCount = AgentMetric::ofMetric('cpu')->where('agent_id', $this->agent->id)->count();
        $memCount = AgentMetric::ofMetric('memory')->where('agent_id', $this->agent->id)->count();

        $this->assertEquals(1, $cpuCount);
        $this->assertEquals(1, $memCount);
    }

    public function test_scope_recent_limits_results(): void
    {
        for ($i = 0; $i < 10; $i++) {
            AgentMetric::record($this->agent->id, 'cpu', $i * 10);
        }

        $recent = AgentMetric::where('agent_id', $this->agent->id)->recent(5)->get();

        $this->assertEquals(5, $recent->count());
    }

    // ========== 关联 ==========

    public function test_agent_relationship(): void
    {
        $metric = AgentMetric::record($this->agent->id, 'cpu', 50);

        $this->assertNotNull($metric->agent);
        $this->assertEquals($this->agent->id, $metric->agent->id);
    }
}
