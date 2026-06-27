<?php

namespace App\Services;

use App\Models\AlertRule;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AlertService
{
    /**
     * 检查所有启用的告警规则
     * 返回触发的告警列表
     */
    public function checkAll(): array
    {
        $alerts = [];

        foreach (AlertRule::enabled()->get() as $rule) {
            $result = $rule->check();

            if ($result['triggered']) {
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
     * 发送通知
     */
    private function notify(AlertRule $rule, array $alert): void
    {
        match ($rule->notify_method) {
            'webhook' => $this->sendWebhook($rule, $alert),
            default => $this->sendLog($rule, $alert),
        };
    }

    /**
     * 日志通知
     */
    private function sendLog(AlertRule $rule, array $alert): void
    {
        Log::warning("🚨 告警触发: {$rule->name}", $alert);
    }

    /**
     * Webhook 通知
     */
    private function sendWebhook(AlertRule $rule, array $alert): void
    {
        if (!$rule->webhook_url) {
            $this->sendLog($rule, $alert);
            return;
        }

        try {
            Http::timeout(5)->post($rule->webhook_url, [
                'text' => "🚨 告警: {$rule->name}\n类型: {$alert['error_type']}\n数量: {$alert['count']}/{$alert['threshold']} ({$alert['window_minutes']}分钟内)",
                'alert' => $alert,
            ]);
        } catch (\Exception $e) {
            Log::error("Webhook通知失败: {$e->getMessage()}");
            $this->sendLog($rule, $alert);
        }
    }
}
