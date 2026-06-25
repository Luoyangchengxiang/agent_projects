<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Agent;
use App\Models\ExecutionLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    /**
     * 获取统计数据
     */
    public function stats(): JsonResponse
    {
        // Agent统计
        $totalAgents = Agent::count();
        $onlineAgents = Agent::where('status', 'online')->count();
        $offlineAgents = Agent::where('status', 'offline')->count();
        $errorAgents = Agent::where('status', 'error')->count();

        // 执行统计
        $totalExecutions = ExecutionLog::count();
        $successExecutions = ExecutionLog::where('status', 'success')->count();
        $failedExecutions = ExecutionLog::where('status', 'failed')->count();

        // 成功率
        $successRate = $totalExecutions > 0
            ? round(($successExecutions / $totalExecutions) * 100, 1)
            : 0;

        // 平均耗时
        $avgDuration = ExecutionLog::where('status', 'success')
            ->whereNotNull('duration')
            ->avg('duration');

        return response()->json([
            'success' => true,
            'data' => [
                'total_agents' => $totalAgents,
                'online_agents' => $onlineAgents,
                'offline_agents' => $offlineAgents,
                'error_agents' => $errorAgents,
                'total_executions' => $totalExecutions,
                'success_rate' => $successRate,
                'avg_duration' => $avgDuration ? round($avgDuration / 1000, 1) : 0,
            ],
        ]);
    }

    /**
     * 获取图表数据
     */
    public function charts(): JsonResponse
    {
        // 最近7天的执行趋势
        $dailyStats = ExecutionLog::select(
            DB::raw('DATE(created_at) as date'),
            DB::raw('COUNT(*) as total'),
            DB::raw('SUM(CASE WHEN status = "success" THEN 1 ELSE 0 END) as success'),
            DB::raw('SUM(CASE WHEN status = "failed" THEN 1 ELSE 0 END) as failed')
        )
            ->where('created_at', '>=', now()->subDays(7))
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        // Agent状态分布
        $agentStatus = Agent::select('status', DB::raw('COUNT(*) as count'))
            ->groupBy('status')
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'daily_stats' => $dailyStats,
                'agent_status' => $agentStatus,
            ],
        ]);
    }
}
