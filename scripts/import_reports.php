<?php
/**
 * 导入历史报告到数据库
 * 使用 PDO 直接插入，避免 Laravel Eloquent 的编码问题
 */

require __DIR__ . '/../agent-api/vendor/autoload.php';

$app = require_once __DIR__ . '/../agent-api/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;
use App\Services\ReportSummaryService;

// 清空执行日志
DB::table('execution_logs')->delete();
echo "已清空执行日志\n";

// 导入报告
$reportDir = $_SERVER['HOME'] . '/local-ai/agents/开店团队/报告';
$files = glob($reportDir . '/热销商品调研_*.md');

$count = 0;
$pdo = DB::connection()->getPdo();

foreach (sorted($files) as $file) {
    $filename = basename($file);
    
    // 提取日期
    if (!preg_match('/(\d{4}-\d{2}-\d{2}|\d{8})/', $filename, $matches)) {
        continue;
    }
    
    $dateStr = $matches[1];
    if (strlen($dateStr) === 8) {
        $date = substr($dateStr, 0, 4) . '-' . substr($dateStr, 4, 2) . '-' . substr($dateStr, 6, 2);
    } else {
        $date = $dateStr;
    }
    
    // 读取内容
    $content = file_get_contents($file);
    $content = mb_convert_encoding($content, 'UTF-8', 'UTF-8');
    
    // 使用新的结果汇总服务
    $summary = ReportSummaryService::generate($content);
    
    // 检查是否已存在
    $exists = DB::table('execution_logs')
        ->where('agent_group', '开店团队')
        ->whereDate('created_at', $date)
        ->exists();
    
    if ($exists) {
        echo "⏭️ {$date} (已存在)\n";
        continue;
    }
    
    // 使用 PDO 直接插入
    $stmt = $pdo->prepare('INSERT INTO execution_logs (agent_id, agent_group, task_id, status, input, output, result_summary, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    
    $stmt->execute([
        null,
        '开店团队',
        'daily_inspection_' . str_replace('-', '', $date),
        'success',
        '热销商品调研任务',
        mb_substr($content, 0, 5000),
        $summary,
        $date . ' 09:00:00',
        $date . ' 09:00:00',
    ]);
    
    $count++;
    echo "✅ {$date}: " . mb_substr($summary, 0, 60) . "\n";
}

// 验证
$total = DB::table('execution_logs')->count();
echo "\n导入完成: {$count} 条\n";
echo "总日志数: {$total}\n";

// 显示最新记录
$logs = DB::table('execution_logs')
    ->where('agent_group', '开店团队')
    ->orderBy('created_at', 'desc')
    ->limit(3)
    ->get(['created_at', 'result_summary']);

echo "\n最新记录:\n";
foreach ($logs as $log) {
    echo "  {$log->created_at} | " . mb_substr($log->result_summary, 0, 60) . "...\n";
}

/**
 * 排序文件
 */
function sorted(array $files): array
{
    sort($files);
    return $files;
}
