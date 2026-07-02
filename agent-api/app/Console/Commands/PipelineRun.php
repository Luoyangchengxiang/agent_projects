<?php

namespace App\Console\Commands;

use App\Services\PipelineService;
use Illuminate\Console\Command;

class PipelineRun extends Command
{
    protected $signature = 'pipeline:run {--topic=今日热销商品调研 : 选题主题}';
    protected $description = '执行开店团队流水线协作';

    public function handle(PipelineService $pipeline): int
    {
        $topic = $this->option('topic');

        $this->info("🚀 开始执行流水线...");
        $this->info("📋 选题: {$topic}");
        $this->newLine();

        $result = $pipeline->run($topic);

        if ($result['success']) {
            $this->newLine();
            $this->info("✅ 流水线执行完成！");
            $this->info("⏱️  总耗时: {$result['duration']}ms");
            $this->newLine();

            // 显示各步骤耗时
            $this->table(
                ['步骤', 'Agent', '耗时'],
                collect($result['results'])->except('summary')->map(function ($step, $key) {
                    $stepName = match($key) {
                        'selection' => '1. 选品调研',
                        'analysis' => '2. 市场分析',
                        'financial' => '3. 财务评估',
                        'decision' => '4. 最终决策',
                        'operation' => '5. 运营方案',
                        default => $key,
                    };
                    return [$stepName, $step['agent'], $step['duration'] . 'ms'];
                })->values()->toArray()
            );

            // 保存汇总报告到文件
            $filename = 'pipeline_report_' . now()->format('Y-m-d_His') . '.md';
            $path = storage_path('app/reports/' . $filename);

            if (!is_dir(dirname($path))) {
                mkdir(dirname($path), 0755, true);
            }

            file_put_contents($path, $result['summary']);
            $this->newLine();
            $this->info("📄 汇总报告已保存: {$path}");

            return self::SUCCESS;
        }

        $this->error("❌ 流水线执行失败: " . $result['error']);
        return self::FAILURE;
    }
}
