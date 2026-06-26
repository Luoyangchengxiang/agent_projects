<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// 测试路由
Route::get('/test', function () {
    return response()->json([
        'success' => true,
        'message' => 'Agent监控系统API运行正常',
        'version' => '1.0.0',
        'timestamp' => now()->toISOString()
    ]);
});

// ==================== 认证路由（无需登录） ====================
Route::prefix('auth')->group(function () {
    Route::post('/login', [App\Http\Controllers\Api\AuthController::class, 'login']);
    Route::post('/register', [App\Http\Controllers\Api\AuthController::class, 'register']);
});

// ==================== 需要认证的路由 ====================
Route::middleware('auth:sanctum')->group(function () {

    // 认证相关
    Route::prefix('auth')->group(function () {
        Route::get('/me', [App\Http\Controllers\Api\AuthController::class, 'me']);
        Route::post('/logout', [App\Http\Controllers\Api\AuthController::class, 'logout']);
        Route::put('/mascot', [App\Http\Controllers\Api\AuthController::class, 'updateMascot']);
        Route::put('/password', [App\Http\Controllers\Api\AuthController::class, 'updatePassword']);
    });

    // Agent相关
    Route::apiResource('agents', App\Http\Controllers\Api\AgentController::class);

    // 执行日志
    Route::apiResource('execution-logs', App\Http\Controllers\Api\ExecutionLogController::class)->only(['index', 'show']);

    // 仪表盘
    Route::get('/dashboard/stats', [App\Http\Controllers\Api\DashboardController::class, 'stats']);
    Route::get('/dashboard/charts', [App\Http\Controllers\Api\DashboardController::class, 'charts']);
    Route::get('/dashboard/result-summaries', [App\Http\Controllers\Api\DashboardController::class, 'resultSummaries']);
    Route::get('/dashboard/agent-groups', [App\Http\Controllers\Api\DashboardController::class, 'agentGroups']);

    // 错误日志
    Route::get('/error-logs/stats', [App\Http\Controllers\Api\ErrorLogController::class, 'stats']);
    Route::get('/error-logs/types', [App\Http\Controllers\Api\ErrorLogController::class, 'types']);
    Route::post('/error-logs/batch-destroy', [App\Http\Controllers\Api\ErrorLogController::class, 'batchDestroy']);
    Route::put('/error-logs/{errorLog}/resolve', [App\Http\Controllers\Api\ErrorLogController::class, 'resolve']);
    Route::apiResource('error-logs', App\Http\Controllers\Api\ErrorLogController::class)->only(['index', 'show', 'destroy']);

    // ==================== 客服系统 ====================
    Route::prefix('chat')->group(function () {
        // 对话管理
        Route::post('/conversations', [App\Http\Controllers\Api\ChatController::class, 'createConversation']);
        Route::get('/conversations', [App\Http\Controllers\Api\ChatController::class, 'conversations']);
        Route::get('/conversations/{conversation}', [App\Http\Controllers\Api\ChatController::class, 'conversationDetail']);

        // 消息
        Route::post('/messages', [App\Http\Controllers\Api\ChatController::class, 'sendMessage']);

        // 人工接管/释放
        Route::post('/takeover', [App\Http\Controllers\Api\ChatController::class, 'takeover']);
        Route::post('/release', [App\Http\Controllers\Api\ChatController::class, 'release']);
        Route::post('/close', [App\Http\Controllers\Api\ChatController::class, 'close']);
        Route::post('/human-reply', [App\Http\Controllers\Api\ChatController::class, 'humanReply']);

        // 系统状态
        Route::get('/status', [App\Http\Controllers\Api\ChatController::class, 'status']);
    });

    // ==================== 权限管理 ====================
    Route::prefix('permissions')->group(function () {
        Route::get('/me', [App\Http\Controllers\Api\PermissionController::class, 'me']);
        Route::get('/users', [App\Http\Controllers\Api\PermissionController::class, 'index']);
        Route::put('/users/{id}/role', [App\Http\Controllers\Api\PermissionController::class, 'updateRole']);
        Route::put('/users/{id}/permissions', [App\Http\Controllers\Api\PermissionController::class, 'updatePermissions']);
    });
});
