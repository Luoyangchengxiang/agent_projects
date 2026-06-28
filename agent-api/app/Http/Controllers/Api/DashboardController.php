<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Agent;
use App\Models\ExecutionLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
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

    /**
     * 获取执行结果汇总（按智能体或智能体组）
     */
    public function resultSummaries(Request $request): JsonResponse
    {
        $query = ExecutionLog::with('agent')
            ->whereNotNull('result_summary')
            ->orderBy('created_at', 'desc');

        // 按智能体筛选
        if ($request->has('agent_id')) {
            $query->where('agent_id', $request->agent_id);
        }

        // 按智能体组筛选
        if ($request->has('agent_group')) {
            $query->where('agent_group', $request->agent_group);
        }

        // 按时间范围筛选
        if ($request->has('start_date')) {
            $query->where('created_at', '>=', $request->start_date);
        }
        if ($request->has('end_date')) {
            $query->where('created_at', '<=', $request->end_date);
        }

        // 分页
        $perPage = $request->get('per_page', 10);
        $summaries = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $summaries,
        ]);
    }

    /**
     * 获取智能体组列表
     */
    public function agentGroups(): JsonResponse
    {
        $groups = ExecutionLog::whereNotNull('agent_group')
            ->select('agent_group', DB::raw('COUNT(*) as count'))
            ->groupBy('agent_group')
            ->orderBy('count', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $groups,
        ]);
    }

    /**
     * 获取系统状态（CPU、内存、磁盘）
     */
    public function system(): JsonResponse
    {
        // CPU 使用率
        $cpuUsage = $this->getCpuUsage();

        // 内存使用率
        $memoryInfo = $this->getMemoryInfo();

        // 磁盘使用率
        $diskInfo = $this->getDiskInfo();

        // 运行时间
        $uptime = $this->getUptime();

        return response()->json([
            'success' => true,
            'data' => [
                'cpu' => [
                    'usage' => $cpuUsage,
                    'cores' => $this->getCpuCores(),
                ],
                'memory' => $memoryInfo,
                'disk' => $diskInfo,
                'uptime' => $uptime,
                'timestamp' => now()->toISOString(),
            ],
        ]);
    }

    /**
     * 获取 CPU 使用率
     */
    private function getCpuUsage(): float
    {
        try {
            // 读取 /proc/stat 获取 CPU 信息
            $stat = file_get_contents('/proc/stat');
            if ($stat === false) {
                return 0;
            }

            $lines = explode("\n", $stat);
            foreach ($lines as $line) {
                if (preg_match('/^cpu\s/', $line)) {
                    $parts = preg_split('/\s+/', trim($line));
                    // user, nice, system, idle, iowait, irq, softirq, steal
                    $user = $parts[1] ?? 0;
                    $nice = $parts[2] ?? 0;
                    $system = $parts[3] ?? 0;
                    $idle = $parts[4] ?? 0;
                    $iowait = $parts[5] ?? 0;
                    $irq = $parts[6] ?? 0;
                    $softirq = $parts[7] ?? 0;
                    $steal = $parts[8] ?? 0;

                    $total = $user + $nice + $system + $idle + $iowait + $irq + $softirq + $steal;
                    $busy = $total - $idle - $iowait;

                    return $total > 0 ? round(($busy / $total) * 100, 1) : 0;
                }
            }
        } catch (\Exception $e) {
            // 非 Linux 系统或读取失败
        }

        return 0;
    }

    /**
     * 获取 CPU 核心数
     */
    private function getCpuCores(): int
    {
        try {
            $cores = shell_exec('nproc 2>/dev/null || echo 1');
            return (int) trim($cores);
        } catch (\Exception $e) {
            return 1;
        }
    }

    /**
     * 获取内存信息
     */
    private function getMemoryInfo(): array
    {
        try {
            $meminfo = file_get_contents('/proc/meminfo');
            if ($meminfo === false) {
                return ['total' => 0, 'used' => 0, 'free' => 0, 'usage' => 0];
            }

            $total = 0;
            $available = 0;

            if (preg_match('/MemTotal:\s+(\d+)/', $meminfo, $matches)) {
                $total = (int) $matches[1]; // KB
            }

            if (preg_match('/MemAvailable:\s+(\d+)/', $meminfo, $matches)) {
                $available = (int) $matches[1]; // KB
            }

            $used = $total - $available;
            $usage = $total > 0 ? round(($used / $total) * 100, 1) : 0;

            return [
                'total' => round($total / 1024 / 1024, 2), // GB
                'used' => round($used / 1024 / 1024, 2),   // GB
                'free' => round($available / 1024 / 1024, 2), // GB
                'usage' => $usage,
            ];
        } catch (\Exception $e) {
            return ['total' => 0, 'used' => 0, 'free' => 0, 'usage' => 0];
        }
    }

    /**
     * 获取磁盘信息
     */
    private function getDiskInfo(): array
    {
        try {
            $root = disk_free_space('/');
            $total = disk_total_space('/');

            if ($root === false || $total === false) {
                return ['total' => 0, 'used' => 0, 'free' => 0, 'usage' => 0];
            }

            $used = $total - $root;
            $usage = $total > 0 ? round(($used / $total) * 100, 1) : 0;

            return [
                'total' => round($total / 1024 / 1024 / 1024, 2), // GB
                'used' => round($used / 1024 / 1024 / 1024, 2),   // GB
                'free' => round($root / 1024 / 1024 / 1024, 2),   // GB
                'usage' => $usage,
            ];
        } catch (\Exception $e) {
            return ['total' => 0, 'used' => 0, 'free' => 0, 'usage' => 0];
        }
    }

    /**
     * 获取系统运行时间
     */
    private function getUptime(): string
    {
        try {
            $uptime = file_get_contents('/proc/uptime');
            if ($uptime === false) {
                return '未知';
            }

            $parts = explode(' ', $uptime);
            $seconds = (float) $parts[0];

            $days = floor($seconds / 86400);
            $hours = floor(($seconds % 86400) / 3600);
            $minutes = floor(($seconds % 3600) / 60);

            if ($days > 0) {
                return "{$days}天 {$hours}小时 {$minutes}分钟";
            } elseif ($hours > 0) {
                return "{$hours}小时 {$minutes}分钟";
            } else {
                return "{$minutes}分钟";
            }
        } catch (\Exception $e) {
            return '未知';
        }
    }
}
