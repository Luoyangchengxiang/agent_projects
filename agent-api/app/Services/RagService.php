<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;

/**
 * RAG 客服服务
 * 基于文档向量检索回答用户问题
 */
class RagService
{
    private string $ollamaUrl;
    private string $embeddingModel = 'nomic-embed-text';
    private ?array $knowledgeBase = null;

    // 相似度阈值
    private float $highThreshold = 0.6;   // 精确匹配
    private float $lowThreshold = 0.4;    // 模糊匹配

    // 预设常见问题
    private array $faq = [
        ['q' => '如何添加新的 Agent？', 'a' => '在"Agent列表"页面点击"新增"按钮即可创建。'],
        ['q' => '怎么查看 Agent 运行是否正常？', 'a' => '在"仪表盘"页面可以查看所有 Agent 的运行状态，绿色表示正常。'],
        ['q' => '本地怎么快速登录？', 'a' => '在本机访问时，用户名输入"admin"，密码输入"123456"即可快捷登录。'],
        ['q' => '报错了怎么办？', 'a' => '在"错误日志"页面查看错误详情，可以按类型和严重程度筛选。'],
        ['q' => '如何查看执行日志？', 'a' => '点击左侧菜单"执行日志"即可查看所有 Agent 的执行历史。'],
        ['q' => '如何配置定时任务？', 'a' => '在"定时任务"页面可以创建、编辑和管理定时任务。'],
    ];

    public function __construct()
    {
        $this->ollamaUrl = config('ollama.base_url', 'http://localhost:11434');
    }

    /**
     * 回答用户问题
     * 
     * @return array ['type' => 'answer'|'faq'|'fallback', 'content' => string, 'source' => string|null]
     */
    public function answer(string $question): array
    {
        // 1. 加载知识库
        $kb = $this->loadKnowledgeBase();
        if (!$kb || empty($kb['chunks'])) {
            return $this->fallbackResponse();
        }

        // 2. 生成问题向量
        $questionEmbedding = $this->getEmbedding($question);
        if (!$questionEmbedding) {
            return $this->fallbackResponse();
        }

        // 3. 检索最相关的文档块
        $results = $this->search($questionEmbedding, $kb['chunks'], 3);

        if (empty($results)) {
            return $this->fallbackResponse();
        }

        $topResult = $results[0];
        $similarity = $topResult['similarity'];

        // 4. 根据相似度返回不同结果
        if ($similarity >= $this->highThreshold) {
            // 精确匹配：返回文档内容
            return [
                'type' => 'answer',
                'content' => $this->formatAnswer($topResult),
                'source' => $topResult['source'] . ' > ' . $topResult['heading'],
                'similarity' => $similarity,
            ];
        }

        if ($similarity >= $this->lowThreshold) {
            // 模糊匹配：返回相关摘要 + 建议
            $suggestions = array_map(fn($r) => $r['heading'], $results);
            return [
                'type' => 'fuzzy',
                'content' => "我不太确定你的问题，但以下内容可能相关：\n\n" .
                             implode("\n", array_map(fn($r) => "• {$r['heading']}", $results)) .
                             "\n\n请尝试更具体的问题，或者查看下方常见问题。",
                'suggestions' => $suggestions,
                'similarity' => $similarity,
            ];
        }

        // 低相似度：兜底
        return $this->fallbackResponse();
    }

    /**
     * 兜底回复（含常见问题）
     */
    private function fallbackResponse(): array
    {
        $faqText = "🤔 抱歉，我暂时无法理解你的问题。\n\n";
        $faqText .= "📌 **常见问题：**\n";
        foreach ($this->faq as $i => $item) {
            $faqText .= ($i + 1) . ". {$item['q']}\n";
        }
        $faqText .= "\n💬 你也可以点击下方按钮转接人工客服。";

        return [
            'type' => 'fallback',
            'content' => $faqText,
            'faq' => $this->faq,
        ];
    }

    /**
     * 格式化答案
     */
    private function formatAnswer(array $result): string
    {
        $text = $result['text'];
        
        // 清理 markdown 标记，保留内容
        $text = preg_replace('/^#{1,3}\s+/m', '📌 ', $text);
        
        return $text;
    }

    /**
     * 获取文本的向量嵌入
     */
    private function getEmbedding(string $text): ?array
    {
        try {
            $response = Http::timeout(10)->post("{$this->ollamaUrl}/api/embed", [
                'model' => $this->embeddingModel,
                'input' => [$text],
            ]);

            if ($response->successful()) {
                $embeddings = $response->json('embeddings', []);
                return $embeddings[0] ?? null;
            }
        } catch (\Exception $e) {
            Log::error('RAG 向量生成失败', ['error' => $e->getMessage()]);
        }

        return null;
    }

    /**
     * 向量相似度检索
     */
    private function search(array $queryEmbedding, array $chunks, int $topK = 3): array
    {
        $scored = [];

        foreach ($chunks as $chunk) {
            if (empty($chunk['embedding'])) continue;

            $similarity = $this->cosineSimilarity($queryEmbedding, $chunk['embedding']);
            
            $scored[] = [
                'source' => $chunk['source'],
                'heading' => $chunk['heading'],
                'text' => $chunk['text'],
                'similarity' => $similarity,
            ];
        }

        // 按相似度降序排序
        usort($scored, fn($a, $b) => $b['similarity'] <=> $a['similarity']);

        return array_slice($scored, 0, $topK);
    }

    /**
     * 计算余弦相似度
     */
    private function cosineSimilarity(array $a, array $b): float
    {
        if (count($a) !== count($b)) return 0;

        $dotProduct = 0;
        $normA = 0;
        $normB = 0;

        for ($i = 0; $i < count($a); $i++) {
            $dotProduct += $a[$i] * $b[$i];
            $normA += $a[$i] * $a[$i];
            $normB += $b[$i] * $b[$i];
        }

        $normA = sqrt($normA);
        $normB = sqrt($normB);

        if ($normA == 0 || $normB == 0) return 0;

        return $dotProduct / ($normA * $normB);
    }

    /**
     * 加载知识库
     */
    private function loadKnowledgeBase(): ?array
    {
        if ($this->knowledgeBase !== null) {
            return $this->knowledgeBase;
        }

        $path = storage_path('app/knowledge-base.json');
        if (!file_exists($path)) {
            Log::warning('知识库文件不存在，请运行 php artisan knowledge:build');
            return null;
        }

        $content = file_get_contents($path);
        $this->knowledgeBase = json_decode($content, true);

        return $this->knowledgeBase;
    }

    /**
     * 获取常见问题列表
     */
    public function getFaq(): array
    {
        return $this->faq;
    }
}
