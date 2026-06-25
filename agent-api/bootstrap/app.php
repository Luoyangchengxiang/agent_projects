<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // 注册中间件别名
        $middleware->alias([
            'ip.detect' => App\Http\Middleware\IpDetection::class,
            'rate.limit' => App\Http\Middleware\ApiRateLimit::class,
            'auth:sanctum' => \Laravel\Sanctum\Http\Middleware\AuthenticateWithSanctum::class,
        ]);

        // API请求自动添加限流和IP检测
        $middleware->api(prepend: [
            App\Http\Middleware\ApiRateLimit::class,
            App\Http\Middleware\IpDetection::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // API 认证失败返回 JSON 而不是重定向
        $exceptions->shouldRenderJsonWhen(function () {
            return true;
        });

        $exceptions->render(function (\Illuminate\Auth\AuthenticationException $e) {
            return response()->json([
                'success' => false,
                'message' => '未授权，请先登录',
                'error_type' => 'unauthorized',
            ], 401);
        });
    })->create();
