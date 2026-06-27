<?php

namespace App\Console\Commands;

use App\Jobs\ExecuteCronJob;
use App\Models\CronJob;
use Illuminate\Console\Command;

/**
 * 检查并执行到期的定时任务
 * 每分钟由 Laravel Scheduler 调用
 */
class CheckCronJobs extends Command
{
    protected $signature = 'cronjobs:check';
    protected $description = '检查并执行到期的定时任务';

    public function handle(): int
    {
        $now = now();

        // 查找所有到期的活跃任务
        $dueJobs = CronJob::where('status', 'active')
            ->where('next_run_at', '<=', $now)
            ->get();

        if ($dueJobs->isEmpty()) {
            $this->info("没有到期的任务");
            return Command::SUCCESS;
        }

        $this->info("发现 {$dueJobs->count()} 个到期任务");

        foreach ($dueJobs as $job) {
            // 立即更新下次执行时间，防止重复调度
            $job->update([
                'next_run_at' => $job->calculateNextRun(),
            ]);

            // 分发到队列异步执行
            ExecuteCronJob::dispatch($job->id);

            $this->line("  ✓ 已调度: [{$job->id}] {$job->name} (next: {$job->next_run_at})");
        }

        return Command::SUCCESS;
    }
}
