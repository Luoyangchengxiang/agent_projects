# 定时任务模块

## 概述

定时任务模块管理 Agent 的定时执行任务，支持创建、暂停、恢复、手动执行和日志查看。

## 数据库设计

```sql
-- 定时任务表
CREATE TABLE cron_jobs (
    id BIGSERIAL PRIMARY KEY,
    agent_id BIGINT REFERENCES agents(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    schedule VARCHAR(100) NOT NULL,    -- cron 表达式，如 '0 9 * * *'
    command TEXT NOT NULL,              -- 执行的命令/提示词
    status VARCHAR(20) DEFAULT 'active', -- active/paused/error
    last_run_at TIMESTAMP,
    next_run_at TIMESTAMP,
    run_count INTEGER DEFAULT 0,
    config JSONB,                       -- 额外配置
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 执行日志表
CREATE TABLE cron_job_logs (
    id BIGSERIAL PRIMARY KEY,
    cron_job_id BIGINT REFERENCES cron_jobs(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL,       -- success/failed/timeout
    output TEXT,                        -- 执行输出
    error TEXT,                         -- 错误信息
    duration_ms INTEGER,               -- 执行耗时（毫秒）
    started_at TIMESTAMP,
    finished_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_cron_logs_job ON cron_job_logs(cron_job_id);
CREATE INDEX idx_cron_status ON cron_jobs(status);
```

## 后端 API

```php
// routes/api.php
Route::prefix('cronjobs')->group(function () {
    Route::get('/', [CronJobController::class, 'index']);          // 列表
    Route::get('/stats', [CronJobController::class, 'stats']);     // 统计
    Route::post('/', [CronJobController::class, 'store']);         // 创建
    Route::get('/{cronjob}', [CronJobController::class, 'show']);  // 详情
    Route::put('/{cronjob}', [CronJobController::class, 'update']);
    Route::delete('/{cronjob}', [CronJobController::class, 'destroy']);
    Route::post('/{cronjob}/pause', [CronJobController::class, 'pause']);   // 暂停
    Route::post('/{cronjob}/resume', [CronJobController::class, 'resume']); // 恢复
    Route::post('/{cronjob}/run', [CronJobController::class, 'run']);       // 手动执行
    Route::get('/{cronjob}/logs', [CronJobController::class, 'logs']);      // 日志
});
```

### 创建任务

```php
public function store(Request $request)
{
    $validated = $request->validate([
        'agent_id' => 'required|exists:agents,id',
        'name' => 'required|string|max:255',
        'schedule' => 'required|string',  // cron 表达式
        'command' => 'required|string',
        'config' => 'nullable|array',
    ]);

    $cronJob = CronJob::create([
        ...$validated,
        'status' => 'active',
        'next_run_at' => $this->calculateNextRun($validated['schedule']),
    ]);

    return response()->json([
        'success' => true,
        'data' => $cronJob,
    ], 201);
}
```

### 暂停 / 恢复

```php
public function pause(CronJob $cronjob)
{
    $cronjob->update(['status' => 'paused']);
    return response()->json(['success' => true, 'data' => $cronjob]);
}

public function resume(CronJob $cronjob)
{
    $cronjob->update([
        'status' => 'active',
        'next_run_at' => $this->calculateNextRun($cronjob->schedule),
    ]);
    return response()->json(['success' => true, 'data' => $cronjob]);
}
```

### 手动执行

```php
public function run(CronJob $cronjob)
{
    $startedAt = now();

    try {
        // 执行命令
        $output = $this->executeCommand($cronjob->command);

        // 记录日志
        $cronjob->logs()->create([
            'status' => 'success',
            'output' => $output,
            'duration_ms' => $startedAt->diffInMilliseconds(now()),
            'started_at' => $startedAt,
            'finished_at' => now(),
        ]);

        $cronjob->update([
            'last_run_at' => now(),
            'run_count' => $cronjob->run_count + 1,
        ]);

        return response()->json(['success' => true, 'message' => '执行成功']);
    } catch (\Exception $e) {
        $cronjob->logs()->create([
            'status' => 'failed',
            'error' => $e->getMessage(),
            'duration_ms' => $startedAt->diffInMilliseconds(now()),
            'started_at' => $startedAt,
            'finished_at' => now(),
        ]);

        return response()->json([
            'success' => false,
            'message' => '执行失败: ' . $e->getMessage(),
        ], 500);
    }
}
```

### 查看日志

```php
public function logs(Request $request, CronJob $cronjob)
{
    $logs = $cronjob->logs()
        ->orderBy('created_at', 'desc')
        ->paginate($request->input('per_page', 20));

    return response()->json(['success' => true, 'data' => $logs]);
}
```

## 前端页面

```jsx
// pages/CronJobs.jsx
const columns = [
  { title: '名称', dataIndex: 'name' },
  { title: '调度', dataIndex: 'schedule' },
  {
    title: '状态', dataIndex: 'status',
    render: (status) => (
      <Tag color={status === 'active' ? 'green' : 'orange'}>
        {status === 'active' ? '运行中' : '已暂停'}
      </Tag>
    ),
  },
  {
    title: '操作',
    render: (_, record) => (
      <Space>
        <Button onClick={() => handleRun(record.id)}>执行</Button>
        <Button onClick={() => handlePause(record.id)}>
          {record.status === 'active' ? '暂停' : '恢复'}
        </Button>
        <Button onClick={() => handleLogs(record.id)}>日志</Button>
      </Space>
    ),
  },
]
```

## Cron 表达式说明

| 表达式 | 含义 |
|--------|------|
| `0 9 * * *` | 每天 9:00 |
| `*/30 * * * *` | 每 30 分钟 |
| `0 9 * * 1-5` | 工作日 9:00 |
| `0 0 1 * *` | 每月 1 号 0:00 |
| `0 9,18 * * *` | 每天 9:00 和 18:00 |

## 测试

```php
// tests/Feature/CronJobTest.php
public function test_can_create_cron_job()
{
    $agent = Agent::factory()->create();

    $response = $this->postJson('/api/cronjobs', [
        'agent_id' => $agent->id,
        'name' => '每日报告',
        'schedule' => '0 9 * * *',
        'command' => '生成每日报告',
    ]);

    $response->assertStatus(201)
        ->assertJson(['success' => true]);
}

public function test_can_pause_and_resume()
{
    $job = CronJob::factory()->create(['status' => 'active']);

    // 暂停
    $this->postJson("/api/cronjobs/{$job->id}/pause")
        ->assertJson(['success' => true]);

    $this->assertEquals('paused', $job->fresh()->status);

    // 恢复
    $this->postJson("/api/cronjobs/{$job->id}/resume")
        ->assertJson(['success' => true]);

    $this->assertEquals('active', $job->fresh()->status);
}
```
