<?php

namespace Tests\Feature;

use App\Jobs\ExecuteCronJob;
use App\Models\Agent;
use App\Models\CronJob;
use App\Models\CronJobLog;
use App\Models\User;
use App\Services\AgentExecutor;
use App\Services\OllamaService;
use App\Services\PipelineService;
use Illuminate\Support\Facades\Queue;
use Mockery;
use Tests\TestCase;

class CronJobSchedulerTest extends TestCase
{

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create([
            'role' => 'admin',
            'email' => 'admin@test.com',
            'password' => bcrypt('password'),
        ]);
    }

    public function test_check_cronjobs_command_exists(): void
    {
        $this->artisan('cronjobs:check')
            ->assertExitCode(0);
    }

    public function test_check_cronjobs_dispatches_due_jobs(): void
    {
        Queue::fake();

        // 创建一个到期的任务
        $job = CronJob::create([
            'name' => '测试任务',
            'prompt' => '执行测试',
            'schedule' => '0 9 * * *',
            'status' => 'active',
            'next_run_at' => now()->subMinute(),
            'created_by' => $this->user->id,
        ]);

        $this->artisan('cronjobs:check');

        Queue::assertPushed(ExecuteCronJob::class, function ($q) use ($job) {
            return $q->cronJobId === $job->id;
        });

        // 验证 next_run_at 已更新
        $job->refresh();
        $this->assertNotNull($job->next_run_at);
        $this->assertTrue($job->next_run_at->isFuture());
    }

    public function test_check_cronjobs_skips_paused_jobs(): void
    {
        Queue::fake();

        CronJob::create([
            'name' => '暂停任务',
            'prompt' => '不会执行',
            'schedule' => '0 9 * * *',
            'status' => 'paused',
            'next_run_at' => now()->subMinute(),
            'created_by' => $this->user->id,
        ]);

        $this->artisan('cronjobs:check');

        Queue::assertNothingPushed();
    }

    public function test_check_cronjobs_skips_not_due_jobs(): void
    {
        Queue::fake();

        CronJob::create([
            'name' => '未来任务',
            'prompt' => '还没到时间',
            'schedule' => '0 9 * * *',
            'status' => 'active',
            'next_run_at' => now()->addHour(),
            'created_by' => $this->user->id,
        ]);

        $this->artisan('cronjobs:check');

        Queue::assertNothingPushed();
    }

    public function test_manual_run_dispatches_job(): void
    {
        Queue::fake();

        $token = $this->user->createToken('test')->plainTextToken;

        $job = CronJob::create([
            'name' => '手动任务',
            'prompt' => '手动执行',
            'schedule' => '0 9 * * *',
            'status' => 'active',
            'created_by' => $this->user->id,
        ]);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/cronjobs/{$job->id}/run");

        $response->assertStatus(200)
            ->assertJson(['success' => true]);

        Queue::assertPushed(ExecuteCronJob::class);
    }

    public function test_execute_cronjob_creates_log_on_success(): void
    {
        $agent = Agent::create([
            'name' => '测试Agent',
            'type' => 'local',
            'executor_type' => 'ollama',
            'model' => 'test-model',
        ]);

        $cronJob = CronJob::create([
            'name' => '成功任务',
            'prompt' => '测试执行',
            'schedule' => '0 9 * * *',
            'status' => 'active',
            'created_by' => $this->user->id,
        ]);

        // Mock AgentExecutor
        $executorMock = Mockery::mock(AgentExecutor::class);
        $executorMock->shouldReceive('execute')->once()->andReturn(
            new \App\Models\ExecutionLog([
                'status' => 'success',
                'output' => '执行完成',
                'duration' => 100,
            ])
        );
        $this->app->instance(AgentExecutor::class, $executorMock);

        // Mock PipelineService（handle() 签名新增了此参数）
        $pipelineMock = Mockery::mock(PipelineService::class);
        $this->app->instance(PipelineService::class, $pipelineMock);

        $job = new ExecuteCronJob($cronJob->id);
        $job->handle($executorMock, $pipelineMock);

        $this->assertDatabaseHas('cron_job_logs', [
            'cronjob_id' => $cronJob->id,
            'status' => 'success',
        ]);

        $cronJob->refresh();
        $this->assertEquals(1, $cronJob->run_count);
        $this->assertNull($cronJob->last_error);
    }

    public function test_execute_cronjob_creates_log_on_failure(): void
    {
        $agent = Agent::create([
            'name' => '测试Agent',
            'type' => 'local',
            'executor_type' => 'ollama',
        ]);

        $cronJob = CronJob::create([
            'name' => '失败任务',
            'prompt' => '会失败',
            'schedule' => '0 9 * * *',
            'status' => 'active',
            'created_by' => $this->user->id,
        ]);

        // Mock AgentExecutor 抛异常
        $executorMock = Mockery::mock(AgentExecutor::class);
        $executorMock->shouldReceive('execute')->once()->andThrow(new \RuntimeException('Ollama不可用'));
        $this->app->instance(AgentExecutor::class, $executorMock);

        // Mock PipelineService
        $pipelineMock = Mockery::mock(PipelineService::class);
        $this->app->instance(PipelineService::class, $pipelineMock);

        $job = new ExecuteCronJob($cronJob->id);
        $job->handle($executorMock, $pipelineMock);

        $this->assertDatabaseHas('cron_job_logs', [
            'cronjob_id' => $cronJob->id,
            'status' => 'failed',
        ]);

        $cronJob->refresh();
        $this->assertEquals('error', $cronJob->status);
        $this->assertEquals(1, $cronJob->fail_count);
        $this->assertStringContainsString('Ollama不可用', $cronJob->last_error);
    }

    public function test_cronjob_calculate_next_run(): void
    {
        $job = CronJob::create([
            'name' => '每天9点',
            'schedule' => '0 9 * * *',
            'status' => 'active',
            'created_by' => $this->user->id,
        ]);

        $next = $job->calculateNextRun();
        $this->assertNotNull($next);
        $this->assertTrue($next->isFuture() || $next->isToday());
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }
}
