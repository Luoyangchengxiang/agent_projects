<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Agent;
use App\Models\ExecutionLog;

class AgentSeeder extends Seeder
{
    public function run(): void
    {
        $agents = [
            ['name' => '选品专家', 'type' => 'local', 'status' => 'online', 'config' => ['model' => 'qwen2.5:3b'], 'last_active_at' => now()],
            ['name' => '运营管家', 'type' => 'local', 'status' => 'online', 'config' => ['model' => 'qwen2.5:3b'], 'last_active_at' => now()],
            ['name' => '财务顾问', 'type' => 'local', 'status' => 'offline', 'config' => ['model' => 'qwen2.5:3b'], 'last_active_at' => now()->subHours(6)],
            ['name' => '决策引擎', 'type' => 'online', 'status' => 'error', 'config' => ['model' => 'qwen2.5:3b'], 'last_active_at' => now()->subMinutes(30)],
            ['name' => '分析专家', 'type' => 'local', 'status' => 'online', 'config' => ['model' => 'qwen2.5:3b'], 'last_active_at' => now()],
        ];

        foreach ($agents as $data) {
            $agent = Agent::firstOrCreate(
                ['name' => $data['name']],
                $data
            );

            // 只在没有日志时才创建（避免重复）
            // 注意：不再创建写死的测试数据，执行日志应由真实任务生成
            // 如需测试数据，请手动触发定时任务或导入历史报告
        }
    }
}
