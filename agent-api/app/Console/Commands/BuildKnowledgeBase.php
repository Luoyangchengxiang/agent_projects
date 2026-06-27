<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;

class BuildKnowledgeBase extends Command
{
    protected $signature = 'knowledge:build';
    protected $description = '构建客服知识库：解析文档 → 分块 → 生成向量';

    private string $ollamaUrl;
    private string $embeddingModel = 'nomic-embed-text';

    public function __construct()
    {
        parent::__construct();
        $this->ollamaUrl = config('ollama.base_url', 'http://localhost:11434');
    }

    public function handle(): int
    {
        // 项目根目录（agent-api 的上级）
        $basePath = dirname(base_path());
        $docsDirs = [
            $basePath . '/docs-site',
            $basePath . '/docs',
            $basePath,
        ];

        $this->info('🧠 开始构建知识库...');
        $this->newLine();

        // 1. 扫描文档
        $this->info('📂 扫描文档目录...');
        $chunks = [];
        foreach ($docsDirs as $dir) {
            if (!is_dir($dir)) continue;
            $found = $this->scanDocs($dir, $basePath);
            $chunks = array_merge($chunks, $found);
        }
        $this->info("   找到 " . count($chunks) . " 个文档块");
        $this->newLine();

        // 2. 生成向量
        $this->info("🔢 生成向量（使用 {$this->embeddingModel}）...");
        $vectors = $this->generateVectors($chunks);
        $this->newLine();

        // 3. 保存
        $outputPath = storage_path('app/knowledge-base.json');
        $this->saveKnowledgeBase($vectors, count($chunks) - count($vectors), $outputPath);

        $this->newLine();
        $this->info("✅ 知识库构建完成！");
        $this->info("   成功: " . count($vectors) . " 个块");
        $this->info("   保存到: {$outputPath}");
        $this->info("   文件大小: " . round(filesize($outputPath) / 1024 / 1024, 2) . " MB");

        return self::SUCCESS;
    }

    private function scanDocs(string $dir, string $basePath): array
    {
        $chunks = [];
        $exclude = ['node_modules', 'vendor', '.git', 'CHANGELOG.md'];

        $iterator = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($dir, \RecursiveDirectoryIterator::SKIP_DOTS)
        );

        foreach ($iterator as $file) {
            if ($file->getExtension() !== 'md') continue;

            $relativePath = str_replace($basePath . '/', '', $file->getPathname());

            $skip = false;
            foreach ($exclude as $e) {
                if (str_contains($relativePath, $e)) { $skip = true; break; }
            }
            if ($skip) continue;

            $content = file_get_contents($file->getPathname());
            $chunks = array_merge($chunks, $this->splitByHeading($content, $relativePath));
        }

        return $chunks;
    }

    private function splitByHeading(string $content, string $source): array
    {
        $chunks = [];
        $lines = explode("\n", $content);
        $currentHeading = '';
        $currentText = '';
        $maxChunkSize = 500;

        foreach ($lines as $line) {
            if (preg_match('/^(#{2,3})\s+(.+)/', $line, $m)) {
                if (trim($currentText)) {
                    $chunks[] = [
                        'source' => $source,
                        'heading' => $currentHeading ?: '概述',
                        'text' => trim($currentText),
                    ];
                }
                $currentHeading = $m[2];
                $currentText = $line . "\n";
            } else {
                $currentText .= $line . "\n";
                if (mb_strlen($currentText) > $maxChunkSize && trim($line) === '') {
                    $chunks[] = [
                        'source' => $source,
                        'heading' => $currentHeading ?: '概述',
                        'text' => trim($currentText),
                    ];
                    $currentText = '';
                }
            }
        }

        if (trim($currentText)) {
            $chunks[] = [
                'source' => $source,
                'heading' => $currentHeading ?: '概述',
                'text' => trim($currentText),
            ];
        }

        return array_values(array_filter($chunks, fn($c) => mb_strlen($c['text']) > 20));
    }

    private function generateVectors(array $chunks): array
    {
        $vectors = [];
        $batchSize = 10;
        $totalBatches = ceil(count($chunks) / $batchSize);
        $failed = 0;

        for ($batch = 0; $batch < $totalBatches; $batch++) {
            $start = $batch * $batchSize;
            $batchChunks = array_slice($chunks, $start, $batchSize);
            $texts = array_map(fn($c) => $c['text'], $batchChunks);

            try {
                $response = Http::timeout(60)->post("{$this->ollamaUrl}/api/embed", [
                    'model' => $this->embeddingModel,
                    'input' => $texts,
                ]);

                if ($response->successful()) {
                    $embeddings = $response->json('embeddings', []);
                    foreach ($embeddings as $i => $embedding) {
                        $idx = $start + $i;
                        if (isset($chunks[$idx])) {
                            $vectors[] = [
                                'id' => $idx,
                                'source' => $chunks[$idx]['source'],
                                'heading' => $chunks[$idx]['heading'],
                                'text' => $chunks[$idx]['text'],
                                'embedding' => $embedding,
                            ];
                        }
                    }
                    $this->info("   批次 " . ($batch + 1) . "/{$totalBatches} ✓");
                } else {
                    $failed += count($batchChunks);
                    $this->warn("   批次 " . ($batch + 1) . "/{$totalBatches} ✗ (HTTP {$response->status()})");
                }
            } catch (\Exception $e) {
                $failed += count($batchChunks);
                $this->warn("   批次 " . ($batch + 1) . "/{$totalBatches} ✗ ({$e->getMessage()})");
            }
        }

        return $vectors;
    }

    private function saveKnowledgeBase(array $vectors, int $failed, string $path): void
    {
        $dir = dirname($path);
        if (!is_dir($dir)) mkdir($dir, 0755, true);

        $data = [
            'version' => '1.0',
            'model' => $this->embeddingModel,
            'built_at' => now()->toISOString(),
            'total_chunks' => count($vectors),
            'chunks' => $vectors,
        ];

        file_put_contents($path, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
    }
}
