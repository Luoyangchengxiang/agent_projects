<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

/**
 * API限流中间件
 * 防止DDoS和暴力破解
 *
 * 策略：
 * - 登录/注册：每分钟最多10次
 * - 普通API：每分钟最多120次
 * - 触发限制后封禁IP 2分钟（开发环境放宽）
 */
class ApiRateLimit
{
    /**
     * 限流规则配置
     */
    private const RULES = [
        // 登录接口：中等限制
        'login' => [
            'max_attempts' => 10,
            'decay_minutes' => 1,
            'lockout_minutes' => 2,
        ],
        // 注册接口：中等限制
        'register' => [
            'max_attempts' => 5,
            'decay_minutes' => 1,
            'lockout_minutes' => 5,
        ],
        // 普通接口：宽松限制
        'default' => [
            'max_attempts' => 120,
            'decay_minutes' => 1,
            'lockout_minutes' => 2,
        ],
    ];

    public function handle(Request $request, Closure $next): Response
    {
        $ip = $request->ip();
        $route = $this->detectRoute($request);
        $rule = self::RULES[$route] ?? self::RULES['default'];

        // 检查是否被封禁
        $lockKey = "rate_limit:lock:{$route}:{$ip}";
        if (Cache::has($lockKey)) {
            $remainingMinutes = Cache::get($lockKey);
            return response()->json([
                'success' => false,
                'message' => "请求过于频繁，请{$remainingMinutes}分钟后再试",
                'error_type' => 'rate_limit',
                'retry_after' => $remainingMinutes * 60,
            ], 429)->withHeaders([
                'Retry-After' => $remainingMinutes * 60,
                'X-RateLimit-Limit' => $rule['max_attempts'],
                'X-RateLimit-Remaining' => 0,
            ]);
        }

        // 计数
        $countKey = "rate_limit:count:{$route}:{$ip}";
        $attempts = Cache::get($countKey, 0);

        if ($attempts >= $rule['max_attempts']) {
            // 触发封禁
            $lockMinutes = $rule['lockout_minutes'];
            Cache::put($lockKey, $lockMinutes, now()->addMinutes($lockMinutes));
            Cache::forget($countKey);

            return response()->json([
                'success' => false,
                'message' => "请求过于频繁，已被封禁{$lockMinutes}分钟",
                'error_type' => 'rate_limit',
                'retry_after' => $lockMinutes * 60,
            ], 429)->withHeaders([
                'Retry-After' => $lockMinutes * 60,
                'X-RateLimit-Limit' => $rule['max_attempts'],
                'X-RateLimit-Remaining' => 0,
            ]);
        }

        // 递增计数
        Cache::put($countKey, $attempts + 1, now()->addMinutes($rule['decay_minutes']));

        // 执行请求
        $response = $next($request);

        // 附加限流信息到响应头
        $remaining = max(0, $rule['max_attempts'] - $attempts - 1);
        $response->headers->set('X-RateLimit-Limit', $rule['max_attempts']);
        $response->headers->set('X-RateLimit-Remaining', $remaining);

        return $response;
    }

    /**
     * 检测请求路由类型
     */
    private function detectRoute(Request $request): string
    {
        $path = $request->path();

        if (str_contains($path, 'auth/login')) {
            return 'login';
        }

        if (str_contains($path, 'auth/register')) {
            return 'register';
        }

        return 'default';
    }
}
