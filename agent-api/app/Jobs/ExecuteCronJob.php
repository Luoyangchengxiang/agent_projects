<?php

namespace App\Jobs;

use App\Models\CronJob;
use App\Models\CronJobLog;
use App\Services\AgentExecutor;
use App\Services\PipelineService;
use App\Models\Agent;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * 定时任务执行 Job
 * 从队列中取出并执行 CronJob
 */
class ExecuteCronJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;
    public int $maxExceptions = 3;
    public int $timeout = 300; // 5分钟超时

    public function __construct(
        public int $cronJobId,
        public bool $isManual = false
    ) {}

    public function handle(AgentExecutor $executor, PipelineService $pipeline): void
    {
        $cronJob = CronJob::find($this->cronJobId);

        if (!$cronJob) {
            Log::warning("CronJob #{$this->cronJobId} 不存在，跳过执行");
            return;
        }

        if ($cronJob->status === 'paused' && !$this->isManual) {
            Log::info("CronJob #{$this->cronJobId} 已暂停，跳过执行");
            return;
        }

        $startTime = microtime(true);

        Log::info("开始执行 CronJob #{$cronJob->id}: {$cronJob->name}", [
            'schedule' => $cronJob->schedule,
            'is_manual' => $this->isManual,
        ]);

        try {
            // 检查是否为流水线模式
            $mode = $cronJob->config['mode'] ?? 'single';

            if ($mode === 'pipeline') {
                // 流水线模式：执行完整协作流程
                $this->executePipeline($cronJob, $pipeline, $startTime);
            } else {
                // 单Agent模式：原有逻辑
                $this->executeSingle($cronJob, $executor, $startTime);
            }

        } catch (\Exception $e) {
            $duration = (int) ((microtime(true) - $startTime) * 1000);

            // 记录失败日志
            CronJobLog::create([
                'cronjob_id' => $cronJob->id,
                'status' => 'failed',
                'error' => $e->getMessage(),
                'duration' => $duration,
            ]);

            $cronJob->markFailed($e->getMessage());

            Log::error("CronJob #{$cronJob->id} 执行失败", [
                'error' => $e->getMessage(),
                'duration' => $duration . 'ms',
            ]);
        }
    }

    /**
     * 单Agent模式执行
     */
    private function executeSingle(CronJob $cronJob, AgentExecutor $executor, float $startTime): void
    {
        $agentId = $cronJob->config['agent_id'] ?? null;
        $agent = $agentId ? Agent::find($agentId) : Agent::first();

        if (!$agent) {
            throw new \RuntimeException('没有可用的 Agent');
        }

        $input = $cronJob->prompt ?? $cronJob->name;
        $context = [
            'source' => 'cronjob',
            'cronjob_id' => $cronJob->id,
            'cronjob_name' => $cronJob->name,
            'is_manual' => $this->isManual,
        ];

        $executionLog = $executor->execute($agent, $input, $context);
        $duration = (int) ((microtime(true) - $startTime) * 1000);

        if ($executionLog->status === 'success') {
            CronJobLog::create([
                'cronjob_id' => $cronJob->id,
                'status' => 'success',
                'output' => $executionLog->output,
                'duration' => $duration,
            ]);

            $cronJob->markSuccess();

            Log::info("CronJob #{$cronJob->id} 执行成功", [
                'duration' => $duration . 'ms',
            ]);
        } else {
            throw new \RuntimeException($executionLog->error ?? '执行失败');
        }
    }

    /**
     * 流水线模式执行
     */
    private function executePipeline(CronJob $cronJob, PipelineService $pipeline, float $startTime): void
    {
        $topic = $cronJob->prompt ?? $cronJob->name;

        Log::info("CronJob #{$cronJob->id} 启动流水线模式", ['topic' => $topic]);

        $result = $pipeline->run($topic);
        $duration = (int) ((microtime(true) - $startTime) * 1000);

        if ($result['success']) {
            // 记录成功日志
            CronJobLog::create([
                'cronjob_id' => $cronJob->id,
                'status' => 'success',
                'output' => $result['summary'] ?? '流水线执行完成',
                'duration' => $duration,
            ]);

            $cronJob->markSuccess();

            Log::info("CronJob #{$cronJob->id} 流水线执行成功", [
                'pipeline_id' => $result['pipeline_id'],
                'duration' => $duration . 'ms',
            ]);
        } else {
            throw new \RuntimeException($result['error'] ?? '流水线执行失败');
        }
    }
}
