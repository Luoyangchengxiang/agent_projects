<?php

use Illuminate\Support\Facades\Route;

// 根路径返回JSON
Route::get('/', function () {
    return response()->json([
        'status' => 'ok',
        'message' => 'Agent Monitor API Server',
        'version' => '1.0.0',
        'endpoints' => [
            'agents' => '/api/agents',
            'execution_logs' => '/api/execution-logs',
            'dashboard' => '/api/dashboard/stats',
            'error_logs' => '/api/error-logs',
        ]
    ], 200);
});

// 定义 login 命名路由（防止认证中间件报错）
Route::get('/login', function () {
    return response()->json([
        'success' => false,
        'message' => '请使用API登录: POST /api/auth/login',
    ], 401);
})->name('login');
