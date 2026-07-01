<?php

namespace App\Console\Commands;

use App\Models\Agent;
use App\Models\ExecutionLog;
use App\Models\Report;
use App\Services\ReportSummaryService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ImportLocalData extends Command
{
    protected $signature = 'data:import 
                            {--logs : 仅导入执行日志}
                            {--reports : 仅导入报告}
                            {--all : 导入全部（默认）}';
    
    protected $description = '从本地报告文件导入执行日志和报告数据';

    private string $reportDir;

    public function __construct()
    {
        parent::__construct();
        $this->reportDir = ($_SERVER['HOME'] ?? '/home/cheng') . '/local-ai/agents/开店团队/报告';
    }

    public function handle(): int
    {
        $doLogs = $this->option('logs') || $this->option('all') || (!$this->option('logs') && !$this->option('reports'));
        $doReports = $this->option('reports') || $this->option('all') || (!$this->option('logs') && !$this->option('reports'));

        $this->info('📦 导入本地数据...');
        $this->newLine();

        // 找到开店团队的 Agent
        $team = Agent::where('name', '开店团队')->first();
        if (!$team) {
            $this->error('❌ 未找到"开店团队" Agent');
            return self::FAILURE;
        }

        // 扫描所有报告文件
        $files = $this->scanReportFiles();
        $this->info("📂 找到 " . count($files) . " 个报告文件");
        $this->newLine();

        $logCount = 0;
        $reportCount = 0;

        foreach ($files as $file) {
            $content = file_get_contents($file['path']);
            $content = mb_convert_encoding($content, 'UTF-8', 'UTF-8');

            // 导入执行日志
            if ($doLogs) {
                $exists = ExecutionLog::where('agent_group', '开店团队')
                    ->whereDate('created_at', $file['date'])
                    ->exists();

                if (!$exists) {
                    $summary = ReportSummaryService::generate($content);
                    ExecutionLog::create([
                        'agent_id' => $team->id,
                        'agent_group' => '开店团队',
                        'task_id' => 'daily_inspection_' . str_replace('-', '', $file['date']),
                        'status' => 'success',
                        'input' => '热销商品调研任务 - ' . $file['date'],
                        'output' => mb_substr($content, 0, 5000),
                        'result_summary' => $summary,
                        'created_at' => $file['date'] . ' 09:00:00',
                        'updated_at' => $file['date'] . ' 09:00:00',
                    ]);
                    $logCount++;
                    $this->line("  📝 日志 {$file['date']}: " . mb_substr($summary, 0, 60));
                }
            }

            // 导入报告
            if ($doReports) {
                $exists = Report::where('title', 'LIKE', '%' . $file['date'] . '%')
                    ->where('type', $file['type'])
                    ->exists();

                if (!$exists) {
                    Report::create([
                        'title' => $file['title'],
                        'type' => $file['type'],
                        'format' => 'md',
                        'file_path' => $file['path'],
                        'content' => mb_substr($content, 0, 10000),
                        'metadata' => [
                            'date' => $file['date'],
                            'source' => 'local',
                            'size' => filesize($file['path']),
                        ],
                        'generated_by' => null,
                        'created_at' => $file['date'] . ' 09:00:00',
                        'updated_at' => $file['date'] . ' 09:00:00',
                    ]);
                    $reportCount++;
                    $this->line("  📊 报告 {$file['date']}: {$file['title']}");
                }
            }
        }

        $this->newLine();

        if ($doLogs) {
            $totalLogs = ExecutionLog::count();
            $this->info("✅ 执行日志: 新增 {$logCount} 条，总计 {$totalLogs} 条");
        }

        if ($doReports) {
            $totalReports = Report::count();
            $this->info("✅ 报告: 新增 {$reportCount} 条，总计 {$totalReports} 条");
        }

        return self::SUCCESS;
    }

    /**
     * 扫描本地报告文件，返回文件信息
     */
    private function scanReportFiles(): array
    {
        $files = [];
        
        if (!is_dir($this->reportDir)) {
            $this->warn("⚠️ 报告目录不存在: {$this->reportDir}");
            return $files;
        }

        $globFiles = glob($this->reportDir . '/*.md');
        
        foreach ($globFiles as $file) {
            $filename = basename($file);
            
            // 跳过非报告文件
            if (!preg_match('/热销商品调研|智能感应垃圾桶/', $filename)) {
                continue;
            }

            // 提取日期
            $date = null;
            if (preg_match('/(\d{4}-\d{2}-\d{2})/', $filename, $m)) {
                $date = $m[1];
            } elseif (preg_match('/(\d{8})/', $filename, $m)) {
                $d = $m[1];
                $date = substr($d, 0, 4) . '-' . substr($d, 4, 2) . '-' . substr($d, 6, 2);
            }

            if (!$date) continue;

            // 判断类型
            $type = 'selection'; // 选品报告
            if (str_contains($filename, '智能感应垃圾桶')) {
                $type = 'custom';
            }

            $title = str_replace('.md', '', $filename);
            // 清理标题中的日期后缀
            $title = preg_replace('/_\d{8}_\d+/', '', $title);
            $title = preg_replace('/_\d{4}-\d{2}-\d{2}/', '', $title);

            $files[] = [
                'path' => $file,
                'filename' => $filename,
                'date' => $date,
                'title' => $title . ' ' . $date,
                'type' => $type,
            ];
        }

        // 按日期排序
        usort($files, fn($a, $b) => strcmp($a['date'], $b['date']));

        return $files;
    }
}
