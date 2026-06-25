<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ChatMessage extends Model
{
    protected $fillable = [
        'conversation_id',
        'sender_type',
        'sender_id',
        'content',
        'metadata',
    ];

    protected $casts = [
        'metadata' => 'array',
    ];

    // 关联：所属对话
    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class);
    }

    // 关联：发送者
    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_id');
    }

    // 是否AI发送
    public function isAi(): bool
    {
        return $this->sender_type === 'ai';
    }

    // 是否用户发送
    public function isUser(): bool
    {
        return $this->sender_type === 'user';
    }

    // 是否人工发送
    public function isHuman(): bool
    {
        return $this->sender_type === 'human';
    }

    // 作用域：按对话
    public function scopeOfConversation($query, int $conversationId)
    {
        return $query->where('conversation_id', $conversationId);
    }
}
