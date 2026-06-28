<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SystemLog extends BaseModel
{
    protected $fillable = [
        'level',
        'category',
        'action',
        'message',
        'context',
        'user_name',
        'ip_address',
        'user_agent',
    ];

    protected $casts = [
        'context' => 'array',
    ];

    /**
     * 按级别筛选
     */
    public function scopeLevel($query, string $level)
    {
        return $query->where('level', $level);
    }

    /**
     * 按分类筛选
     */
    public function scopeCategory($query, string $category)
    {
        return $query->where('category', $category);
    }

    /**
     * 按用户筛选
     */
    public function scopeForUser($query, string $userName)
    {
        return $query->where('user_name', $userName);
    }

    /**
     * 记录日志
     */
    public static function log(
        string $level,
        string $category,
        string $action,
        string $message,
        ?array $context = null,
        ?string $userName = null,
        ?string $ipAddress = null,
        ?string $userAgent = null
    ): self {
        return self::create([
            'level' => $level,
            'category' => $category,
            'action' => $action,
            'message' => $message,
            'context' => $context,
            'user_name' => $userName,
            'ip_address' => $ipAddress,
            'user_agent' => $userAgent,
        ]);
    }

    /**
     * 认证日志
     */
    public static function auth(string $action, string $message, ?string $userName = null, ?string $ipAddress = null): self
    {
        return self::log('info', 'auth', $action, $message, null, $userName, $ipAddress);
    }

    /**
     * 系统日志
     */
    public static function system(string $action, string $message, ?array $context = null): self
    {
        return self::log('info', 'system', $action, $message, $context);
    }

    /**
     * 错误日志
     */
    public static function error(string $category, string $action, string $message, ?array $context = null): self
    {
        return self::log('error', $category, $action, $message, $context);
    }

    /**
     * 告警日志
     */
    public static function alert(string $action, string $message, ?array $context = null): self
    {
        return self::log('warning', 'alert', $action, $message, $context);
    }
}
