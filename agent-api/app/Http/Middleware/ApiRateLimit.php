<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

/**
 * API限流中间件 v2
 * 防止DDoS和暴力破解，同时不影响正常使用
 *
 * 策略：
 * - 登录/注册：每分钟最多 20 次（防暴力破解）
 * - 普通API：每 10 秒最多 30 次（防刷接口）
 * - 突发请求：每秒最多 10 次（防瞬时DDoS）
 * - 触发限制后只拒绝当前请求，不封禁IP（429 + Retry-After）
 */
class ApiRateLimit
{
    /**
     * 限流规则配置
     */
    private const RULES = [
        // 登录接口：防暴力破解
        'login' => [
            'max_attempts' => 20,       // 每窗口最大次数
            'window_seconds' => 60,     // 窗口大小（秒）
            'burst_max' => 5,           // 每秒最大次数
        ],
        // 注册接口：防批量注册
        'register' => [
            'max_attempts' => 5,
            'window_seconds' => 60,
            'burst_max' => 2,
        ],
        // 普通接口：宽松限制
        'default' => [
            'max_attempts' => 30,       // 10秒内30次（正常使用足够）
            'window_seconds' => 10,
            'burst_max' => 10,          // 每秒10次（防瞬时DDoS）
        ],
    ];

    public function handle(Request $request, Closure $next): Response
    {
        $ip = $request->ip();
        $route = $this->detectRoute($request);
        $rule = self::RULES[$route] ?? self::RULES['default'];

        // 1. 突发检测：每秒级限制
        $burstKey = "rate_limit:burst:{$route}:{$ip}";
        $burstCount = (int) Cache::get($burstKey, 0);
        if ($burstCount >= $rule['burst_max']) {
            return $this->tooManyResponse(1, $rule);
        }
        Cache::put($burstKey, $burstCount + 1, now()->addSeconds(2));

        // 2. 窗口计数：滑动窗口限制
        $windowKey = "rate_limit:window:{$route}:{$ip}";
        $windowCount = (int) Cache::get($windowKey, 0);

        if ($windowCount >= $rule['max_attempts']) {
            return $this->tooManyResponse($rule['window_seconds'], $rule);
        }

        // 递增窗口计数
        Cache::put($windowKey, $windowCount + 1, now()->addSeconds($rule['window_seconds']));

        // 3. 执行请求
        $response = $next($request);

        // 4. 附加限流信息到响应头
        $remaining = max(0, $rule['max_attempts'] - $windowCount - 1);
        $response->headers->set('X-RateLimit-Limit', $rule['max_attempts']);
        $response->headers->set('X-RateLimit-Remaining', $remaining);
        $response->headers->set('X-RateLimit-Window', $rule['window_seconds'] . 's');

        return $response;
    }

    /**
     * 返回 429 响应
     */
    private function tooManyResponse(int $retryAfter, array $rule): Response
    {
        return response()->json([
            'success' => false,
            'message' => "请求过于频繁，请 {$retryAfter} 秒后再试",
            'error_type' => 'rate_limit',
            'retry_after' => $retryAfter,
        ], 429)->withHeaders([
            'Retry-After' => $retryAfter,
            'X-RateLimit-Limit' => $rule['max_attempts'],
            'X-RateLimit-Remaining' => 0,
            'X-RateLimit-Window' => $rule['window_seconds'] . 's',
        ]);
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
