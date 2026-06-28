<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class RememberToken extends Model
{
    protected $fillable = [
        'user_id',
        'token_hash',
        'token_prefix',
        'expires_at',
        'device_info',
        'ip_address',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
    ];

    // Token 前缀，用于识别 remember_token
    const TOKEN_PREFIX = 'remember_';

    // 默认过期天数
    const DEFAULT_EXPIRE_DAYS = 30;

    /**
     * 关联用户
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * 生成 remember_token
     */
    public static function generateToken(): string
    {
        return self::TOKEN_PREFIX . Str::random(64);
    }

    /**
     * 计算 token 哈希
     */
    public static function hashToken(string $token): string
    {
        return hash('sha256', $token);
    }

    /**
     * 获取 token 前缀（用于快速查找）
     */
    public static function getTokenPrefix(string $token): string
    {
        return substr($token, 0, 20);
    }

    /**
     * 检查 token 是否过期
     */
    public function isExpired(): bool
    {
        return $this->expires_at && $this->expires_at->isPast();
    }

    /**
     * 创建新的 remember_token
     */
    public static function createForUser(User $user, ?string $deviceInfo = null, ?string $ipAddress = null): string
    {
        $token = self::generateToken();
        
        self::create([
            'user_id' => $user->id,
            'token_hash' => self::hashToken($token),
            'token_prefix' => self::getTokenPrefix($token),
            'expires_at' => now()->addDays(self::DEFAULT_EXPIRE_DAYS),
            'device_info' => $deviceInfo,
            'ip_address' => $ipAddress,
        ]);

        return $token;
    }

    /**
     * 根据 token 查找并验证
     */
    public static function findByToken(string $token): ?self
    {
        $prefix = self::getTokenPrefix($token);
        $hash = self::hashToken($token);

        $record = self::where('token_prefix', $prefix)
            ->where('token_hash', $hash)
            ->first();

        if ($record && !$record->isExpired()) {
            return $record;
        }

        return null;
    }

    /**
     * 清理过期 token
     */
    public static function cleanupExpired(): int
    {
        return self::where('expires_at', '<', now())->delete();
    }
}
