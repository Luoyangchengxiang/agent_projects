<?php

namespace App\Services;

use App\Models\Agent;
use App\Models\AgentMetric;
use App\Models\AlertRule;
use App\Models\ErrorLog;
use App\Models\ExecutionLog;
use App\Models\Report;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Carbon;

class ReportService
{
    /**
     * 生成周报
     */
    public function generateWeeklyReport(?int $userId = null): Report
    {
        $startDate = Carbon::now()->subWeek()->startOfWeek();
        $endDate = Carbon::now()->subWeek()->endOfWeek();

        return $this->generateReport('weekly', $startDate, $endDate, $userId);
    }

    /**
     * 生成月报
     */
    public function generateMonthlyReport(?int $userId = null): Report
    {
        $startDate = Carbon::now()->subMonth()->startOfMonth();
        $endDate = Carbon::now()->subMonth()->endOfMonth();

        return $this->generateReport('monthly', $startDate, $endDate, $userId);
    }

    /**
     * 生成选品报告
     */
    public function generateSelectionReport(?int $userId = null): Report
    {
        $startDate = Carbon::now()->subDays(30);
        $endDate = Carbon::now();

        return $this->generateReport('selection', $startDate, $endDate, $userId);
    }

    /**
     * 生成自定义报告
     */
    public function generateCustomReport(string $startDate, string $endDate, ?int $userId = null): Report
    {
        $start = Carbon::parse($startDate);
        $end = Carbon::parse($endDate);

        return $this->generateReport('custom', $start, $end, $userId);
    }

    /**
     * 核心生成逻辑
     */
    protected function generateReport(string $type, Carbon $startDate, Carbon $endDate, ?int $userId): Report
    {
        // 获取时间范围内的执行日志
        $logs = ExecutionLog::whereBetween('created_at', [$startDate, $endDate])
            ->with('agent')
            ->orderBy('created_at', 'desc')
            ->get();

        // 获取错误统计
        $errors = ErrorLog::whereBetween('created_at', [$startDate, $endDate])->get();

        // 获取告警触发记录
        $alerts = AlertRule::whereNotNull('last_triggered_at')
            ->whereBetween('last_triggered_at', [$startDate, $endDate])
            ->get();

        // 获取 Agent 状态快照
        $agents = Agent::all();

        // 生成统计摘要
        $summary = $this->generateSummary($logs, $errors, $alerts, $agents, $startDate, $endDate);

        // 生成 CSV 文件
        $csvPath = $this->generateCsv($logs, $type, $startDate, $endDate);

        // 生成 Markdown 内容
        $markdownContent = $this->generateMarkdown($summary, $logs, $errors, $alerts, $type, $startDate, $endDate);

        // 保存报告记录
        $report = Report::create([
            'title' => $this->getTitle($type, $startDate, $endDate),
            'type' => $type,
            'format' => 'csv',
            'file_path' => $csvPath,
            'content' => $markdownContent,
            'metadata' => [
                'start_date' => $startDate->toDateString(),
                'end_date' => $endDate->toDateString(),
                'total_logs' => $logs->count(),
                'success_count' => $logs->where('status', 'success')->count(),
                'failed_count' => $logs->where('status', 'failed')->count(),
                'total_errors' => $errors->count(),
                'total_alerts' => $alerts->count(),
                'total_agents' => $agents->count(),
            ],
            'generated_by' => $userId,
        ]);

        return $report;
    }

    /**
     * 生成统计摘要
     */
    protected function generateSummary($logs, $errors, $alerts, $agents, Carbon $startDate, Carbon $endDate): array
    {
        $total = $logs->count();
        $success = $logs->where('status', 'success')->count();
        $failed = $logs->where('status', 'failed')->count();
        $running = $logs->where('status', 'running')->count();

        $avgDuration = $logs->where('duration', '>', 0)->avg('duration') ?? 0;

        // 按 Agent 分组统计
        $byAgent = $logs->groupBy('agent.name')->map(function ($group) {
            return [
                'total' => $group->count(),
                'success' => $group->where('status', 'success')->count(),
                'failed' => $group->where('status', 'failed')->count(),
                'avg_duration' => round($group->where('duration', '>', 0)->avg('duration') ?? 0),
            ];
        });

        // 按日期分组统计
        $byDate = $logs->groupBy(function ($log) {
            return Carbon::parse($log->created_at)->toDateString();
        })->map(function ($group) {
            return [
                'total' => $group->count(),
                'success' => $group->where('status', 'success')->count(),
                'failed' => $group->where('status', 'failed')->count(),
            ];
        });

        // 错误按类型分组
        $errorsByType = $errors->groupBy('error_type')->map(function ($group) {
            return $group->count();
        });

        // 错误按严重程度分组
        $errorsBySeverity = $errors->groupBy('severity')->map(function ($group) {
            return $group->count();
        });

        return [
            'period' => [
                'start' => $startDate->toDateString(),
                'end' => $endDate->toDateString(),
            ],
            'overview' => [
                'total' => $total,
                'success' => $success,
                'failed' => $failed,
                'running' => $running,
                'success_rate' => $total > 0 ? round($success / $total * 100, 2) : 0,
                'avg_duration_ms' => round($avgDuration),
            ],
            'by_agent' => $byAgent,
            'by_date' => $byDate,
            'errors' => [
                'total' => $errors->count(),
                'by_type' => $errorsByType,
                'by_severity' => $errorsBySeverity,
            ],
            'alerts' => [
                'total' => $alerts->count(),
                'rules' => $alerts->map(fn($r) => [
                    'name' => $r->name,
                    'trigger_count' => $r->trigger_count,
                    'last_triggered' => $r->last_triggered_at?->format('Y-m-d H:i'),
                ]),
            ],
            'agents' => [
                'total' => $agents->count(),
                'online' => $agents->where('status', 'online')->count(),
                'offline' => $agents->where('status', 'offline')->count(),
                'error' => $agents->where('status', 'error')->count(),
            ],
        ];
    }

    /**
     * 生成 CSV 文件
     */
    protected function generateCsv($logs, string $type, Carbon $startDate, Carbon $endDate): string
    {
        $filename = "reports/{$type}_{$startDate->format('Ymd')}_{$endDate->format('Ymd')}_" . time() . '.csv';
        $path = storage_path('app/public/' . $filename);

        if (!is_dir(dirname($path))) {
            mkdir(dirname($path), 0755, true);
        }

        $fp = fopen($path, 'w');
        fprintf($fp, chr(0xEF) . chr(0xBB) . chr(0xBF));

        fputcsv($fp, ['执行ID', 'Agent名称', '状态', '任务ID', '输入内容', '输出摘要', '耗时(ms)', '错误信息', '执行时间']);

        foreach ($logs as $log) {
            fputcsv($fp, [
                $log->id,
                $log->agent->name ?? '未知',
                $this->getStatusLabel($log->status),
                $log->task_id ?? '-',
                mb_substr($log->input ?? '', 0, 200),
                mb_substr($log->output ?? '', 0, 200),
                $log->duration ?? '-',
                mb_substr($log->error ?? '', 0, 200),
                $log->created_at->format('Y-m-d H:i:s'),
            ]);
        }

        fclose($fp);
        return $path;
    }

    /**
     * 生成 Markdown 内容
     */
    protected function generateMarkdown(array $summary, $logs, $errors, $alerts, string $type, Carbon $startDate, Carbon $endDate): string
    {
        $typeLabel = match ($type) {
            'weekly' => '周报',
            'monthly' => '月报',
            'selection' => '选品报告',
            'custom' => '自定义报告',
        };

        $s = $summary;

        $content = "# Agent Monitor {$typeLabel}\n\n";
        $content .= "**报告周期**: {$s['period']['start']} 至 {$s['period']['end']}\n\n";
        $content .= "---\n\n";

        // 执行概览
        $content .= "## 📊 执行概览\n\n";
        $content .= "| 指标 | 数值 |\n|------|------|\n";
        $content .= "| 总执行次数 | {$s['overview']['total']} |\n";
        $content .= "| 成功次数 | {$s['overview']['success']} |\n";
        $content .= "| 失败次数 | {$s['overview']['failed']} |\n";
        $content .= "| 成功率 | {$s['overview']['success_rate']}% |\n";
        $content .= "| 平均耗时 | {$s['overview']['avg_duration_ms']}ms |\n\n";

        // Agent 状态
        $content .= "## 🤖 Agent 状态\n\n";
        $content .= "| 指标 | 数值 |\n|------|------|\n";
        $content .= "| 总数 | {$s['agents']['total']} |\n";
        $content .= "| 在线 | {$s['agents']['online']} |\n";
        $content .= "| 离线 | {$s['agents']['offline']} |\n";
        $content .= "| 异常 | {$s['agents']['error']} |\n\n";

        // 按 Agent 统计
        if ($s['by_agent']->count() > 0) {
            $content .= "## 📈 Agent 执行统计\n\n";
            $content .= "| Agent | 总次数 | 成功 | 失败 | 平均耗时 |\n";
            $content .= "|-------|--------|------|------|----------|\n";
            foreach ($s['by_agent'] as $name => $stats) {
                $dur = $stats['avg_duration'] > 1000 ? round($stats['avg_duration']/1000, 1) . 's' : $stats['avg_duration'] . 'ms';
                $content .= "| {$name} | {$stats['total']} | {$stats['success']} | {$stats['failed']} | {$dur} |\n";
            }
            $content .= "\n";
        }

        // 错误统计
        if ($s['errors']['total'] > 0) {
            $content .= "## ❌ 错误统计 (共 {$s['errors']['total']} 条)\n\n";
            if ($s['errors']['by_type']->count() > 0) {
                $content .= "| 错误类型 | 数量 |\n|----------|------|\n";
                foreach ($s['errors']['by_type'] as $type => $count) {
                    $content .= "| {$type} | {$count} |\n";
                }
                $content .= "\n";
            }
            if ($s['errors']['by_severity']->count() > 0) {
                $content .= "| 严重程度 | 数量 |\n|----------|------|\n";
                foreach ($s['errors']['by_severity'] as $sev => $count) {
                    $content .= "| {$sev} | {$count} |\n";
                }
                $content .= "\n";
            }
        }

        // 告警统计
        if ($s['alerts']['total'] > 0) {
            $content .= "## 🚨 告警记录 ({$s['alerts']['total']} 条规则触发)\n\n";
            $content .= "| 规则名称 | 触发次数 | 最近触发 |\n|----------|----------|----------|\n";
            foreach ($s['alerts']['rules'] as $rule) {
                $content .= "| {$rule['name']} | {$rule['trigger_count']} | {$rule['last_triggered']} |\n";
            }
            $content .= "\n";
        }

        // 每日趋势
        if ($s['by_date']->count() > 0) {
            $content .= "## 📅 每日趋势\n\n";
            $content .= "| 日期 | 总次数 | 成功 | 失败 |\n|------|--------|------|------|\n";
            foreach ($s['by_date'] as $date => $stats) {
                $content .= "| {$date} | {$stats['total']} | {$stats['success']} | {$stats['failed']} |\n";
            }
            $content .= "\n";
        }

        // 失败详情
        $failedLogs = $logs->where('status', 'failed')->take(10);
        if ($failedLogs->count() > 0) {
            $content .= "## ❌ 失败任务详情 (最近10条)\n\n";
            foreach ($failedLogs as $log) {
                $agentName = $log->agent->name ?? '未知';
                $time = $log->created_at->format('Y-m-d H:i:s');
                $error = $log->error ?? '未知错误';
                $content .= "- **[{$time}]** {$agentName}: {$error}\n";
            }
            $content .= "\n";
        }

        $content .= "---\n*报告生成时间: " . now()->format('Y-m-d H:i:s') . "*\n";

        return $content;
    }

    protected function getStatusLabel(string $status): string
    {
        return match ($status) {
            'success' => '成功', 'failed' => '失败', 'running' => '运行中', 'pending' => '等待中',
            default => $status,
        };
    }

    protected function getTitle(string $type, Carbon $startDate, Carbon $endDate): string
    {
        $label = match ($type) {
            'weekly' => '周报', 'monthly' => '月报', 'selection' => '选品报告', 'custom' => '自定义报告',
        };
        return "Agent Monitor {$label} ({$startDate->format('Y.m.d')}-{$endDate->format('Y.m.d')})";
    }

    public function getDownloadData(Report $report): ?array
    {
        if (!$report->file_path || !file_exists($report->file_path)) {
            return null;
        }

        return [
            'path' => $report->file_path,
            'filename' => basename($report->file_path),
            'mime' => 'text/csv',
        ];
    }
}
