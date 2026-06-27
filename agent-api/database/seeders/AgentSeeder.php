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
            if ($agent->executionLogs()->count() === 0) {
                $statuses = ['success', 'success', 'success', 'failed', 'success'];
                foreach ($statuses as $i => $status) {
                    ExecutionLog::create([
                        'agent_id' => $agent->id,
                        'task_id' => 'task_' . str_pad($i + 1, 3, '0', STR_PAD_LEFT),
                        'status' => $status,
                        'input' => '分析热销商品数据',
                        'output' => $status === 'success' ? '分析完成，生成报告' : null,
                        'duration' => rand(1000, 5000),
                        'error' => $status === 'failed' ? 'API调用超时' : null,
                        'created_at' => now()->subHours(rand(1, 48)),
                    ]);
                }
            }
        }
    }
}
