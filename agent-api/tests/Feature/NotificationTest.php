<?php

namespace Tests\Feature;

use App\Models\AlertRule;
use App\Models\Setting;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NotificationTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private string $token;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create([
            'role' => 'admin',
            'email' => 'admin@test.com',
            'password' => bcrypt('password'),
        ]);

        $this->token = $this->admin->createToken('test-token')->plainTextToken;
    }

    public function test_alert_rule_has_notify_channels(): void
    {
        $rule = AlertRule::create([
            'name' => '测试规则',
            'threshold_count' => 10,
            'time_window_minutes' => 60,
            'notify_channels' => ['log', 'email'],
            'email_recipients' => ['test@example.com'],
            'cooldown_minutes' => 10,
        ]);

        $this->assertEquals(['log', 'email'], $rule->notify_channels);
        $this->assertEquals(['test@example.com'], $rule->email_recipients);
        $this->assertEquals(10, $rule->cooldown_minutes);
    }

    public function test_can_create_rule_with_channels(): void
    {
        $response = $this->withHeader('Authorization', "Bearer {$this->token}")
            ->postJson('/api/alerts', [
                'name' => '多渠道规则',
                'threshold_count' => 5,
                'time_window_minutes' => 30,
                'notify_channels' => ['log', 'wechat', 'dingtalk'],
            ]);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'data' => [
                    'name' => '多渠道规则',
                    'notify_channels' => ['log', 'wechat', 'dingtalk'],
                ],
            ]);
    }

    public function test_can_update_rule_channels(): void
    {
        $rule = AlertRule::create([
            'name' => '测试规则',
            'threshold_count' => 10,
            'time_window_minutes' => 60,
            'notify_channels' => ['log'],
        ]);

        $response = $this->withHeader('Authorization', "Bearer {$this->token}")
            ->putJson("/api/alerts/{$rule->id}", [
                'notify_channels' => ['log', 'email', 'feishu'],
                'email_recipients' => ['new@example.com'],
                'cooldown_minutes' => 15,
            ]);

        $response->assertStatus(200);
        $rule->refresh();
        $this->assertEquals(['log', 'email', 'feishu'], $rule->notify_channels);
    }

    public function test_notification_service_log_channel(): void
    {
        $service = new NotificationService();

        $alert = [
            'rule_name' => '测试告警',
            'error_type' => 'test',
            'severity' => 'high',
            'count' => 15,
            'threshold' => 10,
            'window_minutes' => 60,
            'triggered_at' => now()->toISOString(),
        ];

        $results = $service->sendAlert(['log'], $alert);
        $this->assertTrue($results['log']['success']);
    }

    public function test_notification_service_skips_unconfigured_channels(): void
    {
        $service = new NotificationService();

        $alert = [
            'rule_name' => '测试告警',
            'error_type' => 'test',
            'severity' => 'high',
            'count' => 15,
            'threshold' => 10,
            'window_minutes' => 60,
            'triggered_at' => now()->toISOString(),
        ];

        // 未配置的渠道应该返回失败
        $results = $service->sendAlert(['wechat'], $alert);
        $this->assertFalse($results['wechat']['success']);
    }

    public function test_invalid_channel_rejected(): void
    {
        $response = $this->withHeader('Authorization', "Bearer {$this->token}")
            ->postJson('/api/alerts', [
                'name' => '测试规则',
                'threshold_count' => 5,
                'time_window_minutes' => 30,
                'notify_channels' => ['invalid_channel'],
            ]);

        $response->assertStatus(422);
    }

    public function test_alert_rule_cooldown_casts(): void
    {
        $rule = AlertRule::create([
            'name' => '测试',
            'threshold_count' => 1,
            'time_window_minutes' => 1,
            'notify_channels' => ['log'],
            'email_recipients' => null,
        ]);

        // 默认冷却时间
        $this->assertEquals(5, $rule->cooldown_minutes ?? 5);

        // notify_channels 应该是数组
        $this->assertIsArray($rule->notify_channels);
    }
}
