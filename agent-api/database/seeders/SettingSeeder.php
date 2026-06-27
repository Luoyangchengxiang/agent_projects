<?php

namespace Database\Seeders;

use App\Models\Setting;
use Illuminate\Database\Seeder;

class SettingSeeder extends Seeder
{
    public function run(): void
    {
        $defaults = [
            // Ollama 配置
            ['group_name' => 'ollama', 'key' => 'ollama.base_url', 'value' => 'http://localhost:11434', 'type' => 'string', 'description' => 'Ollama 服务地址'],
            ['group_name' => 'ollama', 'key' => 'ollama.default_model', 'value' => 'qwen2.5:3b', 'type' => 'string', 'description' => '默认模型'],
            ['group_name' => 'ollama', 'key' => 'ollama.timeout', 'value' => '60', 'type' => 'number', 'description' => '请求超时(秒)'],

            // 通知配置
            ['group_name' => 'notification', 'key' => 'notification.email_enabled', 'value' => '0', 'type' => 'boolean', 'description' => '启用邮件通知'],
            ['group_name' => 'notification', 'key' => 'notification.email_smtp_host', 'value' => '', 'type' => 'string', 'description' => 'SMTP 服务器'],
            ['group_name' => 'notification', 'key' => 'notification.email_smtp_port', 'value' => '587', 'type' => 'number', 'description' => 'SMTP 端口'],
            ['group_name' => 'notification', 'key' => 'notification.email_from', 'value' => '', 'type' => 'string', 'description' => '发件人邮箱'],
            ['group_name' => 'notification', 'key' => 'notification.email_password', 'value' => '', 'type' => 'string', 'description' => '邮箱密码'],
            ['group_name' => 'notification', 'key' => 'notification.wechat_webhook', 'value' => '', 'type' => 'string', 'description' => '企业微信 Webhook URL'],
            ['group_name' => 'notification', 'key' => 'notification.dingtalk_webhook', 'value' => '', 'type' => 'string', 'description' => '钉钉 Webhook URL'],
            ['group_name' => 'notification', 'key' => 'notification.feishu_webhook', 'value' => '', 'type' => 'string', 'description' => '飞书 Webhook URL'],

            // 系统配置
            ['group_name' => 'system', 'key' => 'system.name', 'value' => 'Agent Monitor', 'type' => 'string', 'description' => '系统名称'],
            ['group_name' => 'system', 'key' => 'system.log_retention_days', 'value' => '90', 'type' => 'number', 'description' => '日志保留天数'],
            ['group_name' => 'system', 'key' => 'system.api_timeout', 'value' => '30', 'type' => 'number', 'description' => 'API 默认超时(秒)'],
        ];

        foreach ($defaults as $data) {
            Setting::updateOrCreate(
                ['key' => $data['key']],
                $data
            );
        }
    }
}
