<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CronJobLog extends BaseModel
{
    protected $fillable = [
        'cronjob_id',
        'status',
        'output',
        'error',
        'duration',
    ];

    protected $casts = [
        'duration' => 'integer',
    ];

    /**
     * 关联定时任务
     */
    public function cronjob(): BelongsTo
    {
        return $this->belongsTo(CronJob::class);
    }

    /**
     * 获取状态中文名
     */
    public function getStatusLabelAttribute(): string
    {
        return match ($this->status) {
            'success' => '成功',
            'failed' => '失败',
            'timeout' => '超时',
            default => $this->status,
        };
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
