<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SystemAlertRule extends BaseModel
{
    protected $fillable = [
        'name',
        'resource_type',
        'threshold',
        'severity',
        'check_interval_minutes',
        'is_enabled',
        'notify_method',
        'webhook_url',
        'email_recipients',
        'cooldown_minutes',
        'description',
        'last_triggered_at',
        'trigger_count',
    ];

    protected $casts = [
        'is_enabled' => 'boolean',
        'threshold' => 'float',
        'check_interval_minutes' => 'integer',
        'cooldown_minutes' => 'integer',
        'trigger_count' => 'integer',
        'last_triggered_at' => 'datetime',
    ];

    /**
     * 获取启用的规则
     */
    public function scopeEnabled($query)
    {
        return $query->where('is_enabled', true);
    }

    /**
     * 按资源类型筛选
     */
    public function scopeForResource($query, string $resourceType)
    {
        return $query->where('resource_type', $resourceType);
    }

    /**
     * 检查是否在冷却期内
     */
    public function isInCooldown(): bool
    {
        if (!$this->last_triggered_at) {
            return false;
        }

        return $this->last_triggered_at->addMinutes($this->cooldown_minutes)->isFuture();
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

    /**
     * 检查阈值是否触发
     */
    public function isTriggered(float $currentValue): bool
    {
        return $currentValue >= $this->threshold;
    }
}
