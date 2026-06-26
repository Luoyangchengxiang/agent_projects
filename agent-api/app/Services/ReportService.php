<?php

namespace App\Services;

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

        // 生成统计摘要
        $summary = $this->generateSummary($logs, $startDate, $endDate);

        // 生成 CSV 文件
        $csvPath = $this->generateCsv($logs, $type, $startDate, $endDate);

        // 生成 Markdown 内容
        $markdownContent = $this->generateMarkdown($summary, $logs, $type, $startDate, $endDate);

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
            ],
            'generated_by' => $userId,
        ]);

        return $report;
    }

    /**
     * 生成统计摘要
     */
    protected function generateSummary($logs, Carbon $startDate, Carbon $endDate): array
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
        ];
    }

    /**
     * 生成 CSV 文件
     */
    protected function generateCsv($logs, string $type, Carbon $startDate, Carbon $endDate): string
    {
        $filename = "reports/{$type}_{$startDate->format('Ymd')}_{$endDate->format('Ymd')}_" . time() . '.csv';
        $path = storage_path('app/public/' . $filename);

        // 确保目录存在
        if (!is_dir(dirname($path))) {
            mkdir(dirname($path), 0755, true);
        }

        $fp = fopen($path, 'w');

        // 添加 BOM（让 Excel 正确识别 UTF-8）
        fprintf($fp, chr(0xEF) . chr(0xBB) . chr(0xBF));

        // 写入表头
        fputcsv($fp, [
            '执行ID',
            'Agent名称',
            'Agent组',
            '状态',
            '任务ID',
            '输入内容',
            '输出摘要',
            '执行结果摘要',
            '耗时(ms)',
            '错误信息',
            '执行时间',
        ]);

        // 写入数据
        foreach ($logs as $log) {
            fputcsv($fp, [
                $log->id,
                $log->agent->name ?? '未知',
                $log->agent_group ?? '-',
                $this->getStatusLabel($log->status),
                $log->task_id ?? '-',
                mb_substr($log->input ?? '', 0, 200),
                mb_substr($log->output ?? '', 0, 200),
                mb_substr($log->result_summary ?? '', 0, 200),
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
    protected function generateMarkdown(array $summary, $logs, string $type, Carbon $startDate, Carbon $endDate): string
    {
        $typeLabel = match ($type) {
            'weekly' => '周报',
            'monthly' => '月报',
            'selection' => '选品报告',
            'custom' => '自定义报告',
        };

        $content = "# Agent Monitor {$typeLabel}\n\n";
        $content .= "**报告周期**: {$summary['period']['start']} 至 {$summary['period']['end']}\n\n";
        $content .= "---\n\n";

        // 概览
        $content .= "## 📊 执行概览\n\n";
        $content .= "| 指标 | 数值 |\n";
        $content .= "|------|------|\n";
        $content .= "| 总执行次数 | {$summary['overview']['total']} |\n";
        $content .= "| 成功次数 | {$summary['overview']['success']} |\n";
        $content .= "| 失败次数 | {$summary['overview']['failed']} |\n";
        $content .= "| 运行中 | {$summary['overview']['running']} |\n";
        $content .= "| 成功率 | {$summary['overview']['success_rate']}% |\n";
        $content .= "| 平均耗时 | {$summary['overview']['avg_duration_ms']}ms |\n\n";

        // 按 Agent 统计
        if ($summary['by_agent']->count() > 0) {
            $content .= "## 🤖 Agent 执行统计\n\n";
            $content .= "| Agent名称 | 总次数 | 成功 | 失败 |\n";
            $content .= "|-----------|--------|------|------|\n";

            foreach ($summary['by_agent'] as $agentName => $stats) {
                $content .= "| {$agentName} | {$stats['total']} | {$stats['success']} | {$stats['failed']} |\n";
            }

            $content .= "\n";
        }

        // 按日期统计
        if ($summary['by_date']->count() > 0) {
            $content .= "## 📅 每日执行趋势\n\n";
            $content .= "| 日期 | 总次数 | 成功 | 失败 |\n";
            $content .= "|------|--------|------|------|\n";

            foreach ($summary['by_date'] as $date => $stats) {
                $content .= "| {$date} | {$stats['total']} | {$stats['success']} | {$stats['failed']} |\n";
            }

            $content .= "\n";
        }

        // 失败任务详情
        $failedLogs = $logs->where('status', 'failed')->take(10);
        if ($failedLogs->count() > 0) {
            $content .= "## ❌ 失败任务详情（最近10条）\n\n";

            foreach ($failedLogs as $log) {
                $content .= "### 任务 #{$log->id}\n";
                $content .= "- **Agent**: {$log->agent->name}\n";
                $content .= "- **时间**: {$log->created_at->format('Y-m-d H:i:s')}\n";
                $content .= "- **错误**: {$log->error}\n\n";
            }
        }

        $content .= "---\n\n";
        $content .= "*报告生成时间: " . now()->format('Y-m-d H:i:s') . "*\n";

        return $content;
    }

    /**
     * 获取状态中文标签
     */
    protected function getStatusLabel(string $status): string
    {
        return match ($status) {
            'success' => '成功',
            'failed' => '失败',
            'running' => '运行中',
            'pending' => '等待中',
            default => $status,
        };
    }

    /**
     * 获取报告标题
     */
    protected function getTitle(string $type, Carbon $startDate, Carbon $endDate): string
    {
        $typeLabel = match ($type) {
            'weekly' => '周报',
            'monthly' => '月报',
            'selection' => '选品报告',
            'custom' => '自定义报告',
        };

        return "Agent Monitor {$typeLabel} ({$startDate->format('Y.m.d')}-{$endDate->format('Y.m.d')})";
    }

    /**
     * 获取下载文件
     */
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
