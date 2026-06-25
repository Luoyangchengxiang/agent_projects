<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Agent extends Model
{
    protected $fillable = [
        'name',
        'type',
        'status',
        'config',
        'metadata',
        'last_active_at',
    ];

    protected $casts = [
        'config' => 'array',
        'metadata' => 'array',
        'last_active_at' => 'datetime',
    ];

    /**
     * 关联执行日志
     */
    public function executionLogs(): HasMany
    {
        return $this->hasMany(ExecutionLog::class);
    }

    /**
     * 关联监控指标
     */
    public function metrics(): HasMany
    {
        return $this->hasMany(AgentMetric::class);
    }

    /**
     * 获取最新日志
     */
    public function latestLog()
    {
        return $this->hasOne(ExecutionLog::class)->latestOfMany();
    }

    /**
     * 检查是否在线
     */
    public function isOnline(): bool
    {
        return $this->status === 'online';
    }

    /**
     * 检查是否有错误
     */
    public function hasError(): bool
    {
        return $this->status === 'error';
    }
}
