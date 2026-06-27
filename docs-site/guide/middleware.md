# 中间件开发

## 限流中间件 (ApiRateLimit)

### 设计思路

| 请求类型 | 策略 | 原因 |
|---------|------|------|
| GET/HEAD/OPTIONS | 不限流 | 只读、幂等、安全 |
| POST/PUT/DELETE | 60次/10秒 | 写操作需限流 |
| 登录 | 20次/分钟 | 防暴力破解 |
| 注册 | 5次/分钟 | 防批量注册 |

### 完整实现

```php
<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

class ApiRateLimit
{
    private const RULES = [
        'login' => ['max_attempts' => 20, 'window_seconds' => 60],
        'register' => ['max_attempts' => 5, 'window_seconds' => 60],
        'default' => ['max_attempts' => 60, 'window_seconds' => 10],
    ];

    public function handle(Request $request, Closure $next): Response
    {
        // GET/HEAD/OPTIONS 完全不限流
        if ($request->isMethodCacheable() || $request->isMethod('OPTIONS')) {
            return $next($request);
        }

        $ip = $request->ip();
        $route = $this->detectRoute($request);
        $rule = self::RULES[$route] ?? self::RULES['default'];

        $windowKey = "rate_limit:{$route}:{$ip}";
        $windowCount = (int) Cache::get($windowKey, 0);

        if ($windowCount >= $rule['max_attempts']) {
            return response()->json([
                'success' => false,
                'message' => "请求过于频繁，请 {$rule['window_seconds']} 秒后再试",
            ], 429);
        }

        Cache::put($windowKey, $windowCount + 1, 
            now()->addSeconds($rule['window_seconds']));

        return $next($request);
    }

    private function detectRoute(Request $request): string
    {
        $path = $request->path();
        if (str_contains($path, 'auth/login')) return 'login';
        if (str_contains($path, 'auth/register')) return 'register';
        return 'default';
    }
}
```

## IP 检测中间件 (IpDetection)

```php
class IpDetection
{
    public function handle(Request $request, Closure $next): Response
    {
        // 记录请求 IP (用于安全审计)
        $response = $next($request);
        $response->headers->set('X-Client-IP', $request->ip());
        return $response;
    }
}
```

## 注册中间件

```php
// bootstrap/app.php
return Application::configure(basePath: dirname(__DIR__))
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'rate.limit' => ApiRateLimit::class,
        ]);
        
        $middleware->api(prepend: [
            ApiRateLimit::class,
            IpDetection::class,
        ]);
    })
    ->create();
```

## 测试中间件

```php
class ApiRateLimitTest extends TestCase
{
    public function test_get_bypasses_rate_limit(): void
    {
        for ($i = 0; $i < 50; $i++) {
            $response = $this->handleRequest('GET', 'agents');
            $this->assertEquals(200, $response->getStatusCode());
        }
    }

    public function test_post_exceeds_limit_returns_429(): void
    {
        for ($i = 0; $i < 60; $i++) {
            $this->handleRequest('POST', 'agents');
        }

        $response = $this->handleRequest('POST', 'agents');
        $this->assertEquals(429, $response->getStatusCode());
    }
}
```
