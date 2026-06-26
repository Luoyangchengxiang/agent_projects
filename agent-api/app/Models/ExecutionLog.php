<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ExecutionLog extends Model
{
    protected $fillable = [
        'agent_id',
        'agent_group',
        'task_id',
        'status',
        'input',
        'output',
        'result_summary',
        'context',
        'duration',
        'error',
    ];

    protected $casts = [
        'context' => 'array',
        'duration' => 'integer',
    ];

    /**
     * 关联Agent
     */
    public function agent(): BelongsTo
    {
        return $this->belongsTo(Agent::class);
    }

    /**
     * 检查是否成功
     */
    public function isSuccess(): bool
    {
        return $this->status === 'success';
    }

    /**
     * 检查是否失败
     */
    public function isFailed(): bool
    {
        return $this->status === 'failed';
    }

    /**
     * 检查是否运行中
     */
    public function isRunning(): bool
    {
        return $this->status === 'running';
    }

    /**
     * 获取格式化的耗时
     */
    public function getFormattedDurationAttribute(): string
    {
        if (!$this->duration) return '-';

        if ($this->duration < 1000) {
            return $this->duration . 'ms';
        }

        return round($this->duration / 1000, 1) . 's';
    }
}
