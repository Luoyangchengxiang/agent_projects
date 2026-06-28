<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Conversation extends BaseModel
{
    protected $fillable = [
        'user_id',
        'status',
        'mode',
        'human_agent_id',
        'last_message_at',
        'metadata',
    ];

    protected $casts = [
        'metadata' => 'array',
        'last_message_at' => 'datetime',
    ];

    // 关联：发起用户
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    // 关联：真人客服
    public function humanAgent(): BelongsTo
    {
        return $this->belongsTo(User::class, 'human_agent_id');
    }

    // 关联：消息列表
    public function messages(): HasMany
    {
        return $this->hasMany(ChatMessage::class)->orderBy('created_at');
    }

    // 最新一条消息
    public function lastMessage()
    {
        return $this->hasOne(ChatMessage::class)->latestOfMany();
    }

    // 作用域：活跃对话
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    // 作用域：AI模式
    public function scopeAiMode($query)
    {
        return $query->where('mode', 'ai');
    }

    // 作用域：人工模式
    public function scopeHumanMode($query)
    {
        return $query->where('mode', 'human');
    }

    // 是否已接管
    public function isTakenOver(): bool
    {
        return $this->mode === 'human';
    }

    // 接管
    public function takeOver(int $agentId): void
    {
        $this->update([
            'mode' => 'human',
            'human_agent_id' => $agentId,
        ]);
    }

    // 释放给AI
    public function release(): void
    {
        $this->update([
            'mode' => 'ai',
            'human_agent_id' => null,
        ]);
    }

    // 关闭对话
    public function close(): void
    {
        $this->update(['status' => 'closed']);
    }
}
