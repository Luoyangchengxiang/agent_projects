<?php
/**
 * 导入历史报告到数据库
 * 使用 PDO 直接插入，避免 Laravel Eloquent 的编码问题
 */

require __DIR__ . '/../agent-api/vendor/autoload.php';

$app = require_once __DIR__ . '/../agent-api/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;

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
    
    // 生成摘要
    $summary = generateSummary($content);
    
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
    echo "✅ {$date}: " . mb_substr($summary, 0, 60) . "...\n";
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
 * 生成报告摘要
 */
function generateSummary(string $content): string
{
    $summary = [];
    
    // 统计品类数量
    if (preg_match_all('/###\s*\d+\.\s*(.+)/', $content, $matches)) {
        $count = count($matches[1]);
        $summary[] = "分析品类：{$count}个";
        $categories = array_slice($matches[1], 0, 3);
        $summary[] = "主要品类：" . implode('、', $categories);
    }
    
    // 统计热销商品
    if (preg_match_all('/热销TOP\s*(\d+)/i', $content, $matches)) {
        $total = array_sum(array_map('intval', $matches[1]));
        $summary[] = "热销商品：{$total}个";
    }
    
    // 统计注意事项
    if (preg_match_all('/^\s*[-*]\s+(.+)$/m', $content, $matches)) {
        $count = count($matches[1]);
        $summary[] = "注意事项：{$count}条";
    }
    
    // 报告大小
    $size = strlen($content);
    $summary[] = "报告大小：" . round($size / 1024, 1) . "KB";
    
    return implode(' | ', $summary);
}

/**
 * 排序文件
 */
function sorted(array $files): array
{
    sort($files);
    return $files;
}
