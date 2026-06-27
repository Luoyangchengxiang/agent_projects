<?php

namespace Tests\Unit\Services;

use App\Models\AlertRule;
use App\Models\ErrorLog;
use App\Services\AlertService;
use Tests\TestCase;
use Illuminate\Support\Facades\Log;

class AlertServiceTest extends TestCase
{
    private AlertService $alertService;

    protected function setUp(): void
    {
        parent::setUp();

        $this->alertService = new AlertService();

        AlertRule::query()->delete();
        ErrorLog::query()->delete();
    }

    // ========== 规则检查 ==========

    public function test_check_returns_triggered_when_threshold_exceeded(): void
    {
        $rule = AlertRule::create([
            'name' => '测试规则',
            'error_type' => 'system_error',
            'threshold_count' => 3,
            'time_window_minutes' => 60,
            'is_enabled' => true,
        ]);

        // 创建 3 条错误日志
        for ($i = 0; $i < 3; $i++) {
            ErrorLog::create([
                'error_type' => 'system_error',
                'message' => "错误 {$i}",
                'severity' => 'critical',
            ]);
        }

        $result = $rule->check();

        $this->assertTrue($result['triggered']);
        $this->assertEquals(3, $result['count']);
        $this->assertEquals(3, $result['threshold']);
    }

    public function test_check_returns_not_triggered_when_below_threshold(): void
    {
        $rule = AlertRule::create([
            'name' => '测试规则',
            'error_type' => 'system_error',
            'threshold_count' => 10,
            'time_window_minutes' => 60,
            'is_enabled' => true,
        ]);

        ErrorLog::create([
            'error_type' => 'system_error',
            'message' => '错误',
            'severity' => 'critical',
        ]);

        $result = $rule->check();

        $this->assertFalse($result['triggered']);
        $this->assertEquals(1, $result['count']);
    }

    public function test_check_filters_by_error_type(): void
    {
        $rule = AlertRule::create([
            'name' => '系统错误规则',
            'error_type' => 'system_error',
            'threshold_count' => 2,
            'time_window_minutes' => 60,
            'is_enabled' => true,
        ]);

        // 创建不同类型错误
        ErrorLog::create(['error_type' => 'system_error', 'message' => '系统错误', 'severity' => 'critical']);
        ErrorLog::create(['error_type' => 'api_error', 'message' => 'API错误', 'severity' => 'medium']);
        ErrorLog::create(['error_type' => 'database_error', 'message' => '数据库错误', 'severity' => 'critical']);

        $result = $rule->check();

        $this->assertFalse($result['triggered']);
        $this->assertEquals(1, $result['count']); // 只统计 system_error
    }

    public function test_check_filters_by_severity(): void
    {
        $rule = AlertRule::create([
            'name' => '严重错误规则',
            'severity' => 'critical',
            'threshold_count' => 2,
            'time_window_minutes' => 60,
            'is_enabled' => true,
        ]);

        ErrorLog::create(['error_type' => 'system_error', 'message' => '严重', 'severity' => 'critical']);
        ErrorLog::create(['error_type' => 'api_error', 'message' => '中等', 'severity' => 'medium']);
        ErrorLog::create(['error_type' => 'database_error', 'message' => '严重', 'severity' => 'critical']);

        $result = $rule->check();

        $this->assertTrue($result['triggered']);
        $this->assertEquals(2, $result['count']); // 只统计 critical
    }

    public function test_check_ignores_old_errors_outside_window(): void
    {
        $rule = AlertRule::create([
            'name' => '短期规则',
            'error_type' => 'system_error',
            'threshold_count' => 2,
            'time_window_minutes' => 5,
            'is_enabled' => true,
        ]);

        // 创建旧错误（1小时前）
        $oldError = ErrorLog::create([
            'error_type' => 'system_error',
            'message' => '旧错误',
            'severity' => 'critical',
        ]);
        \Illuminate\Support\Facades\DB::table('error_logs')
            ->where('id', $oldError->id)
            ->update(['created_at' => now()->subHour()]);

        // 创建新错误
        ErrorLog::create([
            'error_type' => 'system_error',
            'message' => '新错误',
            'severity' => 'critical',
        ]);

        $result = $rule->check();

        $this->assertFalse($result['triggered']);
        $this->assertEquals(1, $result['count']); // 只统计窗口内的
    }

    // ========== checkAll ==========

    public function test_check_all_returns_triggered_alerts(): void
    {
        AlertRule::create([
            'name' => '规则1',
            'error_type' => 'system_error',
            'threshold_count' => 2,
            'time_window_minutes' => 60,
            'is_enabled' => true,
        ]);

        AlertRule::create([
            'name' => '规则2',
            'error_type' => 'api_error',
            'threshold_count' => 100,
            'time_window_minutes' => 60,
            'is_enabled' => true,
        ]);

        for ($i = 0; $i < 3; $i++) {
            ErrorLog::create(['error_type' => 'system_error', 'message' => "错误{$i}", 'severity' => 'critical']);
        }

        $alerts = $this->alertService->checkAll();

        $this->assertCount(1, $alerts);
        $this->assertEquals('规则1', $alerts[0]['rule_name']);
    }

    public function test_check_all_skips_disabled_rules(): void
    {
        AlertRule::create([
            'name' => '禁用规则',
            'error_type' => 'system_error',
            'threshold_count' => 1,
            'time_window_minutes' => 60,
            'is_enabled' => false,
        ]);

        ErrorLog::create(['error_type' => 'system_error', 'message' => '错误', 'severity' => 'critical']);

        $alerts = $this->alertService->checkAll();

        $this->assertCount(0, $alerts);
    }

    // ========== 触发记录 ==========

    public function test_record_trigger_updates_trigger_count(): void
    {
        $rule = AlertRule::create([
            'name' => '测试规则',
            'threshold_count' => 1,
            'time_window_minutes' => 60,
            'is_enabled' => true,
            'trigger_count' => 0,
        ]);

        ErrorLog::create(['error_type' => 'system_error', 'message' => '错误', 'severity' => 'critical']);

        $this->alertService->checkAll();

        $rule->refresh();
        $this->assertEquals(1, $rule->trigger_count);
        $this->assertNotNull($rule->last_triggered_at);
    }

    // ========== AlertRule model ==========

    public function test_enabled_scope_filters_correctly(): void
    {
        AlertRule::create(['name' => '启用', 'threshold_count' => 1, 'time_window_minutes' => 60, 'is_enabled' => true]);
        AlertRule::create(['name' => '禁用', 'threshold_count' => 1, 'time_window_minutes' => 60, 'is_enabled' => false]);

        $this->assertEquals(1, AlertRule::enabled()->count());
    }

    public function test_check_rule_returns_null_when_disabled(): void
    {
        $rule = AlertRule::create([
            'name' => '禁用规则',
            'threshold_count' => 1,
            'time_window_minutes' => 60,
            'is_enabled' => false,
        ]);

        $result = $this->alertService->checkRule($rule);

        $this->assertNull($result);
    }
}
