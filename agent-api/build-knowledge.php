#!/usr/bin/env php
<?php
/**
 * 知识库构建脚本（断点续传版）
 */

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\Http;

$projectRoot = dirname(__DIR__);
$ollamaUrl = 'http://localhost:11434';
$model = 'nomic-embed-text';
$outputPath = storage_path('app/knowledge-base.json');

// 1. 加载已有进度
$existing = ['chunks' => [], 'total_chunks' => 0];
if (file_exists($outputPath)) {
    $existing = json_decode(file_get_contents($outputPath), true) ?: $existing;
}
$vectors = $existing['chunks'] ?? [];
$processedIds = array_column($vectors, 'id');
echo "📂 已有 " . count($vectors) . " 个向量，跳过已处理的块\n";

// 2. 扫描文档
$chunks = [];
$docsDirs = [$projectRoot . '/docs-site', $projectRoot . '/docs'];
$rootFiles = [$projectRoot . '/README.md'];

foreach ($docsDirs as $dir) {
    if (!is_dir($dir)) continue;
    $iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($dir, RecursiveDirectoryIterator::SKIP_DOTS));
    foreach ($iterator as $file) {
        if ($file->getExtension() !== 'md') continue;
        $relativePath = str_replace($projectRoot . '/', '', $file->getPathname());
        if (str_contains($relativePath, 'node_modules') || str_contains($relativePath, 'vendor')) continue;
        $content = file_get_contents($file->getPathname());
        $chunks = array_merge($chunks, splitByHeading($content, $relativePath));
    }
}
foreach ($rootFiles as $file) {
    if (file_exists($file)) {
        $relativePath = str_replace($projectRoot . '/', '', $file);
        $content = file_get_contents($file);
        $chunks = array_merge($chunks, splitByHeading($content, $relativePath));
    }
}
echo "📂 共 " . count($chunks) . " 个文档块\n\n";

// 3. 逐条生成向量（跳过已完成的）
$failed = 0;
$total = count($chunks);

foreach ($chunks as $i => $chunk) {
    if (in_array($i, $processedIds)) continue; // 断点跳过
    
    try {
        $response = Http::timeout(60)->post("{$ollamaUrl}/api/embed", [
            'model' => $model,
            'input' => [$chunk['text']],
        ]);
        
        if ($response->successful()) {
            $embedding = $response->json('embeddings.0');
            if ($embedding) {
                $vectors[] = [
                    'id' => $i,
                    'source' => $chunk['source'],
                    'heading' => $chunk['heading'],
                    'text' => $chunk['text'],
                    'embedding' => $embedding,
                ];
                echo "[" . ($i + 1) . "/{$total}] ✓ {$chunk['heading']}\n";
                
                // 每 10 条保存一次进度
                if (count($vectors) % 10 === 0) {
                    saveProgress($outputPath, $model, $vectors);
                    echo "   💾 进度已保存 (" . count($vectors) . " 条)\n";
                }
            }
        } else {
            $failed++;
            echo "[" . ($i + 1) . "/{$total}] ✗ HTTP {$response->status()}\n";
        }
    } catch (\Exception $e) {
        $failed++;
        echo "[" . ($i + 1) . "/{$total}] ✗ " . substr($e->getMessage(), 0, 80) . "\n";
        // 连续失败时等待一下
        if ($failed % 5 === 0) {
            echo "   ⏳ 等待 5 秒...\n";
            sleep(5);
        }
    }
}

// 4. 最终保存
saveProgress($outputPath, $model, $vectors);

echo "\n✅ 知识库构建完成！\n";
echo "   成功: " . count($vectors) . " 个块\n";
echo "   失败: {$failed} 个块\n";
echo "   保存到: {$outputPath}\n";
echo "   文件大小: " . round(filesize($outputPath) / 1024 / 1024, 2) . " MB\n";

// ==================== 辅助函数 ====================
function saveProgress($path, $model, $vectors) {
    $data = [
        'version' => '1.0',
        'model' => $model,
        'built_at' => now()->toISOString(),
        'total_chunks' => count($vectors),
        'chunks' => $vectors,
    ];
    file_put_contents($path, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
}

function splitByHeading(string $content, string $source): array
{
    $chunks = [];
    $lines = explode("\n", $content);
    $currentHeading = '';
    $currentText = '';
    $maxChunkSize = 1000;

    foreach ($lines as $line) {
        if (preg_match('/^(#{2,3})\s+(.+)/', $line, $m)) {
            if (trim($currentText) && mb_strlen($currentText) > 30) {
                $chunks[] = ['source' => $source, 'heading' => $currentHeading ?: '概述', 'text' => trim($currentText)];
            }
            $currentHeading = $m[2];
            $currentText = $line . "\n";
        } else {
            $currentText .= $line . "\n";
            if (mb_strlen($currentText) > $maxChunkSize && trim($line) === '') {
                if (mb_strlen(trim($currentText)) > 30) {
                    $chunks[] = ['source' => $source, 'heading' => $currentHeading ?: '概述', 'text' => trim($currentText)];
                }
                $currentText = '';
            }
        }
    }

    if (trim($currentText) && mb_strlen($currentText) > 30) {
        $chunks[] = ['source' => $source, 'heading' => $currentHeading ?: '概述', 'text' => trim($currentText)];
    }

    return $chunks;
}
