<?php

namespace App\Enums;

/**
 * 错误类型枚举
 */
enum ErrorType: string
{
    // 系统错误
    case SYSTEM_ERROR = 'system_error';
    case DATABASE_ERROR = 'database_error';
    case CACHE_ERROR = 'cache_error';
    case QUEUE_ERROR = 'queue_error';

    // API错误
    case API_ERROR = 'api_error';
    case AUTH_ERROR = 'auth_error';
    case VALIDATION_ERROR = 'validation_error';
    case NOT_FOUND = 'not_found';
    case METHOD_NOT_ALLOWED = 'method_not_allowed';
    case RATE_LIMIT = 'rate_limit';

    // 业务错误
    case AGENT_ERROR = 'agent_error';
    case EXECUTION_ERROR = 'execution_error';
    case TASK_ERROR = 'task_error';

    // 外部服务错误
    case EXTERNAL_SERVICE_ERROR = 'external_service_error';
    case NETWORK_ERROR = 'network_error';
    case TIMEOUT_ERROR = 'timeout_error';

    // 其他
    case UNKNOWN = 'unknown';

    /**
     * 获取错误类型的中文描述
     */
    public function label(): string
    {
        return match ($this) {
            self::SYSTEM_ERROR => '系统错误',
            self::DATABASE_ERROR => '数据库错误',
            self::CACHE_ERROR => '缓存错误',
            self::QUEUE_ERROR => '队列错误',
            self::API_ERROR => 'API错误',
            self::AUTH_ERROR => '认证错误',
            self::VALIDATION_ERROR => '验证错误',
            self::NOT_FOUND => '未找到',
            self::METHOD_NOT_ALLOWED => '方法不允许',
            self::RATE_LIMIT => '请求限流',
            self::AGENT_ERROR => 'Agent错误',
            self::EXECUTION_ERROR => '执行错误',
            self::TASK_ERROR => '任务错误',
            self::EXTERNAL_SERVICE_ERROR => '外部服务错误',
            self::NETWORK_ERROR => '网络错误',
            self::TIMEOUT_ERROR => '超时错误',
            self::UNKNOWN => '未知错误',
        };
    }

    /**
     * 获取错误严重程度
     */
    public function severity(): string
    {
        return match ($this) {
            self::SYSTEM_ERROR, self::DATABASE_ERROR => 'critical',
            self::CACHE_ERROR, self::QUEUE_ERROR, self::EXTERNAL_SERVICE_ERROR => 'high',
            self::API_ERROR, self::AGENT_ERROR, self::EXECUTION_ERROR => 'medium',
            self::AUTH_ERROR, self::VALIDATION_ERROR, self::NOT_FOUND, self::RATE_LIMIT => 'low',
            default => 'info',
        };
    }

    /**
     * 获取所有错误类型
     */
    public static function all(): array
    {
        return collect(self::cases())->map(fn ($type) => [
            'value' => $type->value,
            'label' => $type->label(),
            'severity' => $type->severity(),
        ])->toArray();
    }
}
