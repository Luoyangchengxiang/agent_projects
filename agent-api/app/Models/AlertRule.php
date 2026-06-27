<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;

class AlertRule extends Model
{
    protected $fillable = [
        'name',
        'error_type',
        'severity',
        'threshold_count',
        'time_window_minutes',
        'is_enabled',
        'notify_method',
        'webhook_url',
        'description',
        'last_triggered_at',
        'trigger_count',
    ];

    protected $casts = [
        'is_enabled' => 'boolean',
        'threshold_count' => 'integer',
        'time_window_minutes' => 'integer',
        'trigger_count' => 'integer',
        'last_triggered_at' => 'datetime',
    ];

    public function scopeEnabled(Builder $query): Builder
    {
        return $query->where('is_enabled', true);
    }

    /**
     * 检查规则是否触发
     * 返回 [triggered => bool, count => int, threshold => int]
     */
    public function check(): array
    {
        $query = ErrorLog::where('created_at', '>=', now()->subMinutes($this->time_window_minutes));

        if ($this->error_type) {
            $query->where('error_type', $this->error_type);
        }

        if ($this->severity) {
            $query->where('severity', $this->severity);
        }

        $count = $query->count();

        return [
            'triggered' => $count >= $this->threshold_count,
            'count' => $count,
            'threshold' => $this->threshold_count,
            'window_minutes' => $this->time_window_minutes,
        ];
    }

    /**
     * 记录触发
     */
    public function recordTrigger(): void
    {
        $this->update([
            'last_triggered_at' => now(),
            'trigger_count' => $this->trigger_count + 1,
        ]);
    }
}
