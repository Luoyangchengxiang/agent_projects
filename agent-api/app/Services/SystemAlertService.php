<?php

namespace App\Services;

use App\Models\SystemAlertRule;
use App\Models\AlertHistory;
use App\Models\SystemLog;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SystemAlertService
{
    /**
     * 检查所有系统资源告警
     */
    public function checkAll(): array
    {
        $results = [];

        // 获取当前系统状态
        $systemStatus = $this->getSystemStatus();

        // 检查每种资源类型的告警规则
        foreach (['cpu', 'memory', 'disk'] as $resourceType) {
            $rules = SystemAlertRule::enabled()
                ->forResource($resourceType)
                ->get();

            foreach ($rules as $rule) {
                $currentValue = $systemStatus[$resourceType]['usage'] ?? 0;
                $result = $this->checkRule($rule, $currentValue);
                $results[] = $result;
            }
        }

        return $results;
    }

    /**
     * 检查单个规则
     */
    public function checkRule(SystemAlertRule $rule, float $currentValue): array
    {
        // 检查是否在冷却期内
        if ($rule->isInCooldown()) {
            return [
                'rule_id' => $rule->id,
                'rule_name' => $rule->name,
                'resource_type' => $rule->resource_type,
                'current_value' => $currentValue,
                'threshold' => $rule->threshold,
                'triggered' => false,
                'reason' => 'cooldown',
            ];
        }

        // 检查是否触发阈值
        if (!$rule->isTriggered($currentValue)) {
            return [
                'rule_id' => $rule->id,
                'rule_name' => $rule->name,
                'resource_type' => $rule->resource_type,
                'current_value' => $currentValue,
                'threshold' => $rule->threshold,
                'triggered' => false,
                'reason' => 'below_threshold',
            ];
        }

        // 触发告警
        $notifySuccess = false;
        $notifyError = null;

        try {
            $this->sendNotification($rule, $currentValue);
            $notifySuccess = true;
        } catch (\Exception $e) {
            $notifyError = $e->getMessage();
            Log::error('发送告警通知失败: ' . $e->getMessage());
        }

        // 记录告警历史
        $alertHistory = AlertHistory::createSystemResourceAlert(
            $rule,
            $currentValue,
            $notifySuccess,
            $notifyError
        );

        // 记录触发
        $rule->recordTrigger();

        // 记录系统日志
        SystemLog::alert(
            'system_resource_alert',
            "系统资源告警：{$rule->name}",
            [
                'rule_id' => $rule->id,
                'resource_type' => $rule->resource_type,
                'current_value' => $currentValue,
                'threshold' => $rule->threshold,
                'notify_success' => $notifySuccess,
            ]
        );

        return [
            'rule_id' => $rule->id,
            'rule_name' => $rule->name,
            'resource_type' => $rule->resource_type,
            'current_value' => $currentValue,
            'threshold' => $rule->threshold,
            'triggered' => true,
            'notify_success' => $notifySuccess,
            'notify_error' => $notifyError,
            'alert_history_id' => $alertHistory->id,
        ];
    }

    /**
     * 获取系统状态
     */
    protected function getSystemStatus(): array
    {
        // CPU 使用率
        $cpuUsage = $this->getCpuUsage();

        // 内存使用率
        $memoryInfo = $this->getMemoryInfo();

        // 磁盘使用率
        $diskInfo = $this->getDiskInfo();

        return [
            'cpu' => ['usage' => $cpuUsage],
            'memory' => ['usage' => $memoryInfo['usage'] ?? 0],
            'disk' => ['usage' => $diskInfo['usage'] ?? 0],
        ];
    }

    /**
     * 获取 CPU 使用率
     */
    protected function getCpuUsage(): float
    {
        try {
            $stat = file_get_contents('/proc/stat');
            if ($stat === false) {
                return 0;
            }

            $lines = explode("\n", $stat);
            foreach ($lines as $line) {
                if (preg_match('/^cpu\s/', $line)) {
                    $parts = preg_split('/\s+/', trim($line));
                    $user = $parts[1] ?? 0;
                    $nice = $parts[2] ?? 0;
                    $system = $parts[3] ?? 0;
                    $idle = $parts[4] ?? 0;
                    $iowait = $parts[5] ?? 0;
                    $irq = $parts[6] ?? 0;
                    $softirq = $parts[7] ?? 0;
                    $steal = $parts[8] ?? 0;

                    $total = $user + $nice + $system + $idle + $iowait + $irq + $softirq + $steal;
                    $busy = $total - $idle - $iowait;

                    return $total > 0 ? round(($busy / $total) * 100, 1) : 0;
                }
            }
        } catch (\Exception $e) {
            // 忽略错误
        }

        return 0;
    }

    /**
     * 获取内存信息
     */
    protected function getMemoryInfo(): array
    {
        try {
            $meminfo = file_get_contents('/proc/meminfo');
            if ($meminfo === false) {
                return ['usage' => 0];
            }

            $total = 0;
            $available = 0;

            if (preg_match('/MemTotal:\s+(\d+)/', $meminfo, $matches)) {
                $total = (int) $matches[1];
            }

            if (preg_match('/MemAvailable:\s+(\d+)/', $meminfo, $matches)) {
                $available = (int) $matches[1];
            }

            $used = $total - $available;
            $usage = $total > 0 ? round(($used / $total) * 100, 1) : 0;

            return ['usage' => $usage];
        } catch (\Exception $e) {
            return ['usage' => 0];
        }
    }

    /**
     * 获取磁盘信息
     */
    protected function getDiskInfo(): array
    {
        try {
            $root = disk_free_space('/');
            $total = disk_total_space('/');

            if ($root === false || $total === false) {
                return ['usage' => 0];
            }

            $used = $total - $root;
            $usage = $total > 0 ? round(($used / $total) * 100, 1) : 0;

            return ['usage' => $usage];
        } catch (\Exception $e) {
            return ['usage' => 0];
        }
    }

    /**
     * 发送通知
     */
    protected function sendNotification(SystemAlertRule $rule, float $currentValue): void
    {
        $resourceNames = [
            'cpu' => 'CPU',
            'memory' => '内存',
            'disk' => '磁盘',
        ];

        $resourceName = $resourceNames[$rule->resource_type] ?? $rule->resource_type;

        $message = [
            'title' => "🚨 {$resourceName}使用率告警",
            'content' => "**{$rule->name}**\n\n{$resourceName}使用率: **{$currentValue}%**\n阈值: {$rule->threshold}%\n严重程度: {$rule->severity}\n时间: " . now()->format('Y-m-d H:i:s'),
        ];

        if ($rule->notify_method === 'webhook' && $rule->webhook_url) {
            $this->sendWebhook($rule->webhook_url, $message);
        } elseif ($rule->notify_method === 'email' && $rule->email_recipients) {
            $this->sendEmail(json_decode($rule->email_recipients, true), $message);
        }
    }

    /**
     * 发送 Webhook 通知
     */
    protected function sendWebhook(string $url, array $message): void
    {
        $response = Http::timeout(10)->post($url, [
            'msg_type' => 'text',
            'content' => ['text' => $message['content']],
        ]);

        if ($response->failed()) {
            throw new \Exception('Webhook 请求失败: ' . $response->body());
        }
    }

    /**
     * 发送邮件通知
     */
    protected function sendEmail(array $recipients, array $message): void
    {
        // TODO: 实现邮件发送
        Log::info('发送邮件告警通知', ['recipients' => $recipients, 'message' => $message]);
    }
}
