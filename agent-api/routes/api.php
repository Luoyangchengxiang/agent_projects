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

    // ==================== 性能指标 ====================
    Route::prefix('metrics')->group(function () {
        Route::get('/', [App\Http\Controllers\Api\MetricController::class, 'index']);
        Route::post('/', [App\Http\Controllers\Api\MetricController::class, 'store']);
        Route::post('/batch', [App\Http\Controllers\Api\MetricController::class, 'batchStore']);
        Route::get('/names', [App\Http\Controllers\Api\MetricController::class, 'metricNames']);
        Route::get('/{agentId}/stats', [App\Http\Controllers\Api\MetricController::class, 'stats']);
        Route::get('/{agentId}/trend', [App\Http\Controllers\Api\MetricController::class, 'trend']);
        Route::get('/{agentId}/overview', [App\Http\Controllers\Api\MetricController::class, 'overview']);
        Route::delete('/', [App\Http\Controllers\Api\MetricController::class, 'destroy']);
    });

    // ==================== 告警规则 ====================
    Route::prefix('alerts')->group(function () {
        Route::get('/', [App\Http\Controllers\Api\AlertController::class, 'index']);
        Route::post('/', [App\Http\Controllers\Api\AlertController::class, 'store']);
        Route::get('/check', [App\Http\Controllers\Api\AlertController::class, 'check']);
        Route::get('/{alertRule}', [App\Http\Controllers\Api\AlertController::class, 'show']);
        Route::put('/{alertRule}', [App\Http\Controllers\Api\AlertController::class, 'update']);
        Route::delete('/{alertRule}', [App\Http\Controllers\Api\AlertController::class, 'destroy']);
        Route::post('/{alertRule}/check', [App\Http\Controllers\Api\AlertController::class, 'checkRule']);
    });

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

    // ==================== 报告系统 ====================
    Route::prefix('reports')->group(function () {
        Route::get('/', [App\Http\Controllers\ReportController::class, 'index']);
        Route::get('/{report}', [App\Http\Controllers\ReportController::class, 'show']);
        Route::get('/{report}/download', [App\Http\Controllers\ReportController::class, 'download']);
        Route::delete('/{report}', [App\Http\Controllers\ReportController::class, 'destroy']);
        
        // 生成报告
        Route::post('/generate/weekly', [App\Http\Controllers\ReportController::class, 'generateWeekly']);
        Route::post('/generate/monthly', [App\Http\Controllers\ReportController::class, 'generateMonthly']);
        Route::post('/generate/selection', [App\Http\Controllers\ReportController::class, 'generateSelection']);
        Route::post('/generate/custom', [App\Http\Controllers\ReportController::class, 'generateCustom']);
    });

    // ==================== 知识图谱 ====================
    Route::prefix('graph')->group(function () {
        Route::get('/', [App\Http\Controllers\GraphController::class, 'index']);
        Route::get('/search', [App\Http\Controllers\GraphController::class, 'search']);
        Route::post('/nodes', [App\Http\Controllers\GraphController::class, 'store']);
        Route::get('/nodes/{node}', [App\Http\Controllers\GraphController::class, 'show']);
        Route::put('/nodes/{node}', [App\Http\Controllers\GraphController::class, 'update']);
        Route::delete('/nodes/{node}', [App\Http\Controllers\GraphController::class, 'destroy']);
        Route::get('/nodes/{node}/neighbors', [App\Http\Controllers\GraphController::class, 'neighbors']);
        Route::post('/edges', [App\Http\Controllers\GraphController::class, 'storeEdge']);
        Route::delete('/edges/{edge}', [App\Http\Controllers\GraphController::class, 'destroyEdge']);
    });

    // ==================== 定时任务 ====================
    Route::prefix('cronjobs')->group(function () {
        Route::get('/', [App\Http\Controllers\CronJobController::class, 'index']);
        Route::get('/stats', [App\Http\Controllers\CronJobController::class, 'stats']);
        Route::post('/', [App\Http\Controllers\CronJobController::class, 'store']);
        Route::get('/{cronjob}', [App\Http\Controllers\CronJobController::class, 'show']);
        Route::put('/{cronjob}', [App\Http\Controllers\CronJobController::class, 'update']);
        Route::delete('/{cronjob}', [App\Http\Controllers\CronJobController::class, 'destroy']);
        Route::post('/{cronjob}/pause', [App\Http\Controllers\CronJobController::class, 'pause']);
        Route::post('/{cronjob}/resume', [App\Http\Controllers\CronJobController::class, 'resume']);
        Route::post('/{cronjob}/run', [App\Http\Controllers\CronJobController::class, 'run']);
        Route::get('/{cronjob}/logs', [App\Http\Controllers\CronJobController::class, 'logs']);
    });

    // ==================== 版本更新 ====================
    Route::prefix('version-updates')->group(function () {
        Route::get('/', [App\Http\Controllers\VersionUpdateController::class, 'index']);
        Route::get('/latest', [App\Http\Controllers\VersionUpdateController::class, 'latest']);
        Route::post('/', [App\Http\Controllers\VersionUpdateController::class, 'store']);
        Route::put('/{versionUpdate}', [App\Http\Controllers\VersionUpdateController::class, 'update']);
        Route::delete('/{versionUpdate}', [App\Http\Controllers\VersionUpdateController::class, 'destroy']);
    });
});
