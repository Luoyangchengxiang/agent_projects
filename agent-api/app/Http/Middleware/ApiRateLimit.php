<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

/**
 * API限流中间件 v3
 *
 * 策略：
 * - GET 请求：完全不限流（只读、幂等、安全）
 * - 登录/注册：每分钟最多 20 次（防暴力破解）
 * - 写操作（POST/PUT/DELETE/PATCH）：每 10 秒最多 60 次
 * - 触发限制后只拒绝当前请求，不封禁IP（429 + Retry-After）
 */
class ApiRateLimit
{
    private const RULES = [
        'login' => [
            'max_attempts' => 20,
            'window_seconds' => 60,
        ],
        'register' => [
            'max_attempts' => 5,
            'window_seconds' => 60,
        ],
        'default' => [
            'max_attempts' => 60,       // 10秒60次写操作
            'window_seconds' => 10,
        ],
    ];

    public function handle(Request $request, Closure $next): Response
    {
        // GET/HEAD/OPTIONS 完全不限流（只读、幂等）
        if ($request->isMethodCacheable() || $request->isMethod('OPTIONS')) {
            return $next($request);
        }

        $ip = $request->ip();
        $route = $this->detectRoute($request);
        $rule = self::RULES[$route] ?? self::RULES['default'];

        // 窗口计数
        $windowKey = "rate_limit:{$route}:{$ip}";
        $windowCount = (int) Cache::get($windowKey, 0);

        if ($windowCount >= $rule['max_attempts']) {
            return $this->tooManyResponse($rule['window_seconds'], $rule);
        }

        Cache::put($windowKey, $windowCount + 1, now()->addSeconds($rule['window_seconds']));

        $response = $next($request);

        $remaining = max(0, $rule['max_attempts'] - $windowCount - 1);
        $response->headers->set('X-RateLimit-Limit', $rule['max_attempts']);
        $response->headers->set('X-RateLimit-Remaining', $remaining);

        return $response;
    }

    private function tooManyResponse(int $retryAfter, array $rule): Response
    {
        return response()->json([
            'success' => false,
            'message' => "请求过于频繁，请 {$retryAfter} 秒后再试",
            'error_type' => 'rate_limit',
            'retry_after' => $retryAfter,
        ], 429)->withHeaders([
            'Retry-After' => $retryAfter,
        ]);
    }

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
