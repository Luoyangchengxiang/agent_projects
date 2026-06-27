<?php

namespace App\Services;

use App\Models\AlertRule;
use Illuminate\Support\Facades\Log;

class AlertService
{
    public function __construct(
        private NotificationService $notification
    ) {}

    /**
     * 检查所有启用的告警规则
     */
    public function checkAll(): array
    {
        $alerts = [];

        foreach (AlertRule::enabled()->get() as $rule) {
            $result = $rule->check();

            if ($result['triggered']) {
                // 检查冷却时间
                if ($this->isInCooldown($rule)) {
                    continue;
                }

                $rule->recordTrigger();
                $alert = [
                    'rule_id' => $rule->id,
                    'rule_name' => $rule->name,
                    'error_type' => $rule->error_type,
                    'severity' => $rule->severity,
                    'count' => $result['count'],
                    'threshold' => $result['threshold'],
                    'window_minutes' => $result['window_minutes'],
                    'triggered_at' => now()->toISOString(),
                ];

                $this->notify($rule, $alert);
                $alerts[] = $alert;
            }
        }

        return $alerts;
    }

    /**
     * 检查单条规则
     */
    public function checkRule(AlertRule $rule): ?array
    {
        if (!$rule->is_enabled) {
            return null;
        }

        $result = $rule->check();

        if ($result['triggered']) {
            if ($this->isInCooldown($rule)) {
                return null;
            }

            $rule->recordTrigger();
            $alert = [
                'rule_id' => $rule->id,
                'rule_name' => $rule->name,
                'error_type' => $rule->error_type,
                'severity' => $rule->severity,
                'count' => $result['count'],
                'threshold' => $result['threshold'],
                'window_minutes' => $result['window_minutes'],
                'triggered_at' => now()->toISOString(),
            ];

            $this->notify($rule, $alert);
            return $alert;
        }

        return null;
    }

    /**
     * 检查是否在冷却期内
     */
    private function isInCooldown(AlertRule $rule): bool
    {
        if (!$rule->last_triggered_at) {
            return false;
        }

        $cooldownMinutes = $rule->cooldown_minutes ?? 5;
        return $rule->last_triggered_at->addMinutes($cooldownMinutes)->isFuture();
    }

    /**
     * 发送通知（支持多渠道）
     */
    private function notify(AlertRule $rule, array $alert): void
    {
        // 获取通知渠道
        $channels = $rule->notify_channels ?? [$rule->notify_method ?? 'log'];

        $options = [
            'email_recipients' => $rule->email_recipients ?? [],
            'webhook_url' => $rule->webhook_url ?? '',
        ];

        $results = $this->notification->sendAlert($channels, $alert, $options);

        Log::info("告警通知发送完成", [
            'rule_id' => $rule->id,
            'channels' => array_keys($results),
            'results' => $results,
        ]);
    }
}
