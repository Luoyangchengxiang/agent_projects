<?php

namespace App\Services;

use App\Models\Setting;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * 多渠道通知服务
 * 支持: log / email / wechat / dingtalk / feishu / webhook
 */
class NotificationService
{
    /**
     * 发送告警通知到所有配置的渠道
     */
    public function sendAlert(array $channels, array $alert, array $options = []): array
    {
        $results = [];

        foreach ($channels as $channel) {
            try {
                $result = match ($channel) {
                    'log' => $this->sendLog($alert),
                    'email' => $this->sendEmail($alert, $options['email_recipients'] ?? []),
                    'wechat' => $this->sendWechat($alert),
                    'dingtalk' => $this->sendDingtalk($alert),
                    'feishu' => $this->sendFeishu($alert),
                    'webhook' => $this->sendWebhook($alert, $options['webhook_url'] ?? ''),
                    default => ['success' => false, 'error' => "未知渠道: {$channel}"],
                };

                $results[$channel] = $result;
            } catch (\Exception $e) {
                $results[$channel] = ['success' => false, 'error' => $e->getMessage()];
                Log::error("通知发送失败 [{$channel}]", ['error' => $e->getMessage()]);
            }
        }

        return $results;
    }

    /**
     * 日志通知
     */
    private function sendLog(array $alert): array
    {
        Log::warning("🚨 告警触发: {$alert['rule_name']}", $alert);
        return ['success' => true];
    }

    /**
     * 邮件通知
     */
    private function sendEmail(array $alert, array $recipients): array
    {
        if (empty($recipients)) {
            return ['success' => false, 'error' => '未配置收件人'];
        }

        $enabled = Setting::getValue('notification.email_enabled', false);
        if (!$enabled) {
            return ['success' => false, 'error' => '邮件通知未启用'];
        }

        $subject = "🚨 Agent Monitor 告警: {$alert['rule_name']}";
        $body = $this->buildEmailBody($alert);

        foreach ($recipients as $email) {
            try {
                Mail::raw($body, function ($message) use ($email, $subject) {
                    $message->to($email)->subject($subject);
                });
            } catch (\Exception $e) {
                Log::error("邮件发送失败: {$email}", ['error' => $e->getMessage()]);
                return ['success' => false, 'error' => $e->getMessage()];
            }
        }

        return ['success' => true, 'recipients' => count($recipients)];
    }

    /**
     * 企业微信 Webhook
     */
    private function sendWechat(array $alert): array
    {
        $webhookUrl = Setting::getValue('notification.wechat_webhook');
        if (!$webhookUrl) {
            return ['success' => false, 'error' => '未配置企业微信 Webhook'];
        }

        $severity = $this->formatSeverity($alert['severity'] ?? 'unknown');

        $content = "## 🚨 告警: {$alert['rule_name']}\n";
        $content .= "> **严重程度**: {$severity}\n";
        $content .= "> **错误类型**: " . ($alert['error_type'] ?? '全部') . "\n";
        $content .= "> **触发数量**: {$alert['count']} / {$alert['threshold']}\n";
        $content .= "> **时间窗口**: {$alert['window_minutes']} 分钟\n";
        $content .= "> **触发时间**: {$alert['triggered_at']}";

        return $this->postWebhook($webhookUrl, [
            'msgtype' => 'markdown',
            'markdown' => ['content' => $content],
        ]);
    }

    /**
     * 钉钉 Webhook
     */
    private function sendDingtalk(array $alert): array
    {
        $webhookUrl = Setting::getValue('notification.dingtalk_webhook');
        if (!$webhookUrl) {
            return ['success' => false, 'error' => '未配置钉钉 Webhook'];
        }

        $errorType = $alert['error_type'] ?? '全部';
        $severity = $alert['severity'] ?? '未指定';

        $text = "## 🚨 告警: {$alert['rule_name']}\n";
        $text .= "- **严重程度**: {$severity}\n";
        $text .= "- **错误类型**: {$errorType}\n";
        $text .= "- **触发数量**: {$alert['count']} / {$alert['threshold']} ({$alert['window_minutes']}分钟内)\n";
        $text .= "- **触发时间**: {$alert['triggered_at']}";

        return $this->postWebhook($webhookUrl, [
            'msgtype' => 'markdown',
            'markdown' => [
                'title' => "告警: {$alert['rule_name']}",
                'text' => $text,
            ],
        ]);
    }

    /**
     * 飞书 Webhook
     */
    private function sendFeishu(array $alert): array
    {
        $webhookUrl = Setting::getValue('notification.feishu_webhook');
        if (!$webhookUrl) {
            return ['success' => false, 'error' => '未配置飞书 Webhook'];
        }

        $severity = $alert['severity'] ?? '未指定';
        $errorType = $alert['error_type'] ?? '全部';

        $content = "**严重程度**: {$severity}\n";
        $content .= "**错误类型**: {$errorType}\n";
        $content .= "**触发数量**: {$alert['count']} / {$alert['threshold']} ({$alert['window_minutes']}分钟内)\n";
        $content .= "**触发时间**: {$alert['triggered_at']}";

        return $this->postWebhook($webhookUrl, [
            'msg_type' => 'interactive',
            'card' => [
                'header' => [
                    'title' => ['tag' => 'plain_text', 'content' => "🚨 告警: {$alert['rule_name']}"],
                    'template' => 'red',
                ],
                'elements' => [
                    [
                        'tag' => 'div',
                        'text' => ['tag' => 'lark_md', 'content' => $content],
                    ],
                ],
            ],
        ]);
    }

    /**
     * 自定义 Webhook
     */
    private function sendWebhook(array $alert, string $url): array
    {
        if (!$url) {
            return ['success' => false, 'error' => '未配置 Webhook URL'];
        }

        return $this->postWebhook($url, [
            'event' => 'alert',
            'data' => $alert,
        ]);
    }

    /**
     * 发送 HTTP POST 请求
     */
    private function postWebhook(string $url, array $payload): array
    {
        try {
            $response = Http::timeout(10)
                ->withHeaders(['Content-Type' => 'application/json'])
                ->post($url, $payload);

            if ($response->successful()) {
                return ['success' => true];
            }

            return ['success' => false, 'error' => "HTTP {$response->status()}"];
        } catch (\Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * 格式化严重程度
     */
    private function formatSeverity(string $severity): string
    {
        return match ($severity) {
            'critical' => '🔴 严重',
            'high' => '🟠 高',
            'medium' => '🟡 中',
            'low' => '🟢 低',
            default => '⚪ 未知',
        };
    }

    /**
     * 构建邮件正文
     */
    private function buildEmailBody(array $alert): string
    {
        $errorType = $alert['error_type'] ?? '全部';
        $severity = $alert['severity'] ?? '未指定';

        return "Agent Monitor 告警通知\n\n"
            . "规则名称: {$alert['rule_name']}\n"
            . "错误类型: {$errorType}\n"
            . "严重程度: {$severity}\n"
            . "触发数量: {$alert['count']} / {$alert['threshold']} ({$alert['window_minutes']}分钟内)\n"
            . "触发时间: {$alert['triggered_at']}\n\n"
            . "请及时处理！";
    }
}
