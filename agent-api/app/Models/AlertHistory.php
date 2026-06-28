<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AlertHistory extends BaseModel
{
    protected $fillable = [
        'alert_type',
        'resource_type',
        'severity',
        'title',
        'message',
        'current_value',
        'threshold_value',
        'context',
        'notify_method',
        'notify_success',
        'notify_error',
        'resolved_by',
        'resolved_at',
        'resolved_note',
    ];

    protected $casts = [
        'context' => 'array',
        'notify_success' => 'boolean',
        'current_value' => 'float',
        'threshold_value' => 'float',
        'resolved_at' => 'datetime',
    ];

    /**
     * 按告警类型筛选
     */
    public function scopeAlertType($query, string $type)
    {
        return $query->where('alert_type', $type);
    }

    /**
     * 按资源类型筛选
     */
    public function scopeForResource($query, string $resourceType)
    {
        return $query->where('resource_type', $resourceType);
    }

    /**
     * 按严重程度筛选
     */
    public function scopeSeverity($query, string $severity)
    {
        return $query->where('severity', $severity);
    }

    /**
     * 未处理的告警
     */
    public function scopeUnresolved($query)
    {
        return $query->whereNull('resolved_at');
    }

    /**
     * 已处理的告警
     */
    public function scopeResolved($query)
    {
        return $query->whereNotNull('resolved_at');
    }

    /**
     * 标记为已处理
     */
    public function resolve(string $resolvedBy, ?string $note = null): void
    {
        $this->update([
            'resolved_by' => $resolvedBy,
            'resolved_at' => now(),
            'resolved_note' => $note,
        ]);
    }

    /**
     * 创建系统资源告警
     */
    public static function createSystemResourceAlert(
        SystemAlertRule $rule,
        float $currentValue,
        bool $notifySuccess = false,
        ?string $notifyError = null
    ): self {
        $resourceNames = [
            'cpu' => 'CPU',
            'memory' => '内存',
            'disk' => '磁盘',
        ];

        $resourceName = $resourceNames[$rule->resource_type] ?? $rule->resource_type;

        return self::create([
            'alert_type' => 'system_resource',
            'resource_type' => $rule->resource_type,
            'severity' => $rule->severity,
            'title' => "{$resourceName}使用率告警",
            'message' => "{$resourceName}使用率达到 {$currentValue}%，超过阈值 {$rule->threshold}%",
            'current_value' => $currentValue,
            'threshold_value' => $rule->threshold,
            'context' => [
                'rule_id' => $rule->id,
                'rule_name' => $rule->name,
                'check_interval' => $rule->check_interval_minutes,
            ],
            'notify_method' => $rule->notify_method,
            'notify_success' => $notifySuccess,
            'notify_error' => $notifyError,
        ]);
    }
}
