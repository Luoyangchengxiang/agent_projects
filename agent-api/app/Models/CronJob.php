<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Carbon\Carbon;

class CronJob extends BaseModel
{
    use HasFactory;

    protected $fillable = [
        'name',
        'prompt',
        'schedule',
        'status',
        'config',
        'last_run_at',
        'next_run_at',
        'run_count',
        'fail_count',
        'last_error',
        'created_by',
    ];

    protected $casts = [
        'config' => 'array',
        'last_run_at' => 'datetime',
        'next_run_at' => 'datetime',
        'run_count' => 'integer',
        'fail_count' => 'integer',
    ];

    /**
     * 关联创建者
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * 关联执行日志
     */
    public function logs(): HasMany
    {
        return $this->hasMany(CronJobLog::class)->latest();
    }

    /**
     * 获取状态中文名
     */
    public function getStatusLabelAttribute(): string
    {
        return match ($this->status) {
            'active' => '运行中',
            'paused' => '已暂停',
            'error' => '异常',
            default => $this->status,
        };
    }

    /**
     * 计算下次执行时间
     */
    public function calculateNextRun(): ?Carbon
    {
        // 简单的 cron 解析（仅支持基本格式）
        $parts = explode(' ', $this->schedule);
        if (count($parts) !== 5) {
            return null;
        }

        [$minute, $hour, $day, $month, $weekday] = $parts;
        $next = Carbon::now()->addMinute();

        // 简化处理：只支持固定时间
        if ($minute !== '*' && $hour !== '*') {
            $next = Carbon::today()->setTime((int)$hour, (int)$minute);
            if ($next->isPast()) {
                $next->addDay();
            }
        }

        return $next;
    }

    /**
     * 标记执行成功
     */
    public function markSuccess(): void
    {
        $this->update([
            'status' => 'active',
            'last_run_at' => now(),
            'next_run_at' => $this->calculateNextRun(),
            'run_count' => $this->run_count + 1,
            'last_error' => null,
        ]);
    }

    /**
     * 标记执行失败
     */
    public function markFailed(string $error): void
    {
        $this->update([
            'status' => 'error',
            'last_run_at' => now(),
            'next_run_at' => $this->calculateNextRun(),
            'run_count' => $this->run_count + 1,
            'fail_count' => $this->fail_count + 1,
            'last_error' => $error,
        ]);
    }

    /**
     * 获取成功率
     */
    public function getSuccessRateAttribute(): float
    {
        if ($this->run_count === 0) {
            return 0;
        }

        return round(($this->run_count - $this->fail_count) / $this->run_count * 100, 1);
    }
}
