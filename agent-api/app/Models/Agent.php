<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Builder;

class Agent extends BaseModel
{
    protected $fillable = [
        'name',
        'type',
        'status',
        'executor_type',
        'executor_config',
        'model',
        'system_prompt',
        'config',
        'metadata',
        'last_active_at',
        'parent_id',
        'is_deleted',
        'deleted_at',
        'created_by',
    ];

    protected $casts = [
        'config' => 'array',
        'metadata' => 'array',
        'executor_config' => 'array',
        'last_active_at' => 'datetime',
        'is_deleted' => 'boolean',
        'deleted_at' => 'datetime',
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
     * 父级 Agent
     */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(Agent::class, 'parent_id');
    }

    /**
     * 子级 Agent
     */
    public function children(): HasMany
    {
        return $this->hasMany(Agent::class, 'parent_id');
    }

    /**
     * 未删除的子级
     */
    public function activeChildren(): HasMany
    {
        return $this->children()->where('is_deleted', false);
    }

    /**
     * 创建者
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
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

    /**
     * 检查是否是组（有子级）
     */
    public function isGroup(): bool
    {
        return $this->children()->count() > 0;
    }

    /**
     * 检查是否是组（有子级）
     */
    public function isActiveGroup(): bool
    {
        return $this->activeChildren()->count() > 0;
    }

    /**
     * 逻辑删除
     */
    public function softDelete(): bool
    {
        $this->is_deleted = true;
        $this->deleted_at = now();
        return $this->save();
    }

    /**
     * 恢复删除
     */
    public function restore(): bool
    {
        $this->is_deleted = false;
        $this->deleted_at = null;
        return $this->save();
    }

    /**
     * 获取模型名（优先 agent 自己的 model，否则从 config 取）
     */
    public function getModelName(): string
    {
        return $this->model ?? $this->config['model'] ?? 'qwen2.5:3b';
    }

    /**
     * 获取系统提示词
     */
    public function getSystemPrompt(): string
    {
        return $this->system_prompt ?? $this->config['prompt'] ?? '你是一个AI助手，请根据用户输入回答问题。';
    }

    /**
     * Scope: 未删除
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_deleted', false);
    }

    /**
     * Scope: 已删除
     */
    public function scopeDeleted(Builder $query): Builder
    {
        return $query->where('is_deleted', true);
    }

    /**
     * Scope: 顶级（无父级）
     */
    public function scopeRoot(Builder $query): Builder
    {
        return $query->whereNull('parent_id');
    }

    /**
     * Scope: 子级
     */
    public function scopeChildren(Builder $query): Builder
    {
        return $query->whereNotNull('parent_id');
    }
}
