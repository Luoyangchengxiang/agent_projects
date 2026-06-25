<?php

namespace App\Models;

use App\Enums\ErrorType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;

class ErrorLog extends Model
{
    protected $fillable = [
        'error_type',
        'error_code',
        'message',
        'stack_trace',
        'file',
        'line',
        'url',
        'method',
        'context',
        'headers',
        'ip',
        'user_agent',
        'severity',
        'is_resolved',
        'resolution_notes',
    ];

    protected $casts = [
        'context' => 'array',
        'headers' => 'array',
        'is_resolved' => 'boolean',
        'line' => 'integer',
    ];

    /**
     * 获取错误类型的中文标签
     */
    public function getTypeLabelAttribute(): string
    {
        try {
            return ErrorType::from($this->error_type)->label();
        } catch (\ValueError $e) {
            return $this->error_type;
        }
    }

    /**
     * 按错误类型筛选
     */
    public function scopeOfType(Builder $query, string $type): Builder
    {
        return $query->where('error_type', $type);
    }

    /**
     * 按严重程度筛选
     */
    public function scopeOfSeverity(Builder $query, string $severity): Builder
    {
        return $query->where('severity', $severity);
    }

    /**
     * 只显示未解决的
     */
    public function scopeUnresolved(Builder $query): Builder
    {
        return $query->where('is_resolved', false);
    }

    /**
     * 只显示已解决的
     */
    public function scopeResolved(Builder $query): Builder
    {
        return $query->where('is_resolved', true);
    }

    /**
     * 按时间范围筛选
     */
    public function scopeDateRange(Builder $query, string $startDate, string $endDate): Builder
    {
        return $query->whereBetween('created_at', [$startDate, $endDate]);
    }

    /**
     * 标记为已解决
     */
    public function markAsResolved(string $notes = null): bool
    {
        return $this->update([
            'is_resolved' => true,
            'resolution_notes' => $notes,
        ]);
    }

    /**
     * 记录错误日志
     */
    public static function log(
        ErrorType $type,
        string $message,
        ?string $errorCode = null,
        ?string $stackTrace = null,
        ?string $file = null,
        ?int $line = null,
        ?string $url = null,
        ?string $method = null,
        ?array $context = null,
        ?array $headers = null,
        ?string $ip = null,
        ?string $userAgent = null
    ): self {
        return self::create([
            'error_type' => $type->value,
            'error_code' => $errorCode,
            'message' => $message,
            'stack_trace' => $stackTrace,
            'file' => $file,
            'line' => $line,
            'url' => $url,
            'method' => $method,
            'context' => $context,
            'headers' => $headers,
            'ip' => $ip,
            'user_agent' => $userAgent,
            'severity' => $type->severity(),
        ]);
    }
}
