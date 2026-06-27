<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;

/**
 * RAG + LLM 客服服务
 * 向量检索找文档 → 大模型生成回答
 */
class RagService
{
    private string $ollamaUrl;
    private string $embeddingModel = 'nomic-embed-text';
    private string $chatModel = 'qwen2.5:1.5b';
    private ?array $knowledgeBase = null;

    // 相似度阈值
    private float $highThreshold = 0.6;
    private float $lowThreshold = 0.4;

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

        // 2. 向量检索
        $questionEmbedding = $this->getEmbedding($question);
        if (!$questionEmbedding) {
            return $this->fallbackResponse();
        }

        $results = $this->search($questionEmbedding, $kb['chunks'], 3);
        if (empty($results)) {
            return $this->fallbackResponse();
        }

        $topResult = $results[0];
        $similarity = $topResult['similarity'];

        // 3. 根据相似度分层处理
        if ($similarity >= $this->highThreshold) {
            // 高相似度：用 LLM 基于文档生成回答
            $llmAnswer = $this->askLlm($question, $results);
            return [
                'type' => 'answer',
                'content' => $llmAnswer ?? $this->formatAnswer($topResult),
                'source' => $topResult['source'] . ' > ' . $topResult['heading'],
                'similarity' => $similarity,
            ];
        }

        if ($similarity >= $this->lowThreshold) {
            // 中相似度：LLM 尝试综合多篇文档回答
            $llmAnswer = $this->askLlm($question, $results);
            if ($llmAnswer) {
                return [
                    'type' => 'answer',
                    'content' => $llmAnswer,
                    'source' => $results[0]['source'] . ' > ' . $results[0]['heading'],
                    'similarity' => $similarity,
                ];
            }

            // LLM 失败则返回建议列表
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
     * 调用 LLM 基于检索结果生成回答
     */
    private function askLlm(string $question, array $contextChunks): ?string
    {
        // 拼接知识库上下文
        $contextParts = [];
        foreach (array_slice($contextChunks, 0, 2) as $chunk) {
            $contextParts[] = "【{$chunk['heading']}】\n{$chunk['text']}";
        }
        $context = implode("\n\n---\n\n", $contextParts);

        // 追加 FAQ 作为参考
        $faqText = '';
        foreach ($this->faq as $item) {
            $faqText .= "问：{$item['q']}\n答：{$item['a']}\n\n";
        }

        $prompt = <<<PROMPT
你是 Agent Monitor 系统的智能客服。用户问了一个问题，请根据下面的参考资料用你自己的话简洁回答。

规则：
1. 用自然的中文回答，像朋友聊天一样
2. 不要复制粘贴参考资料的原文，要用自己的话重新组织
3. 如果参考资料里没有答案，就说"这个问题我不太确定，建议转交人工客服"
4. 回答控制在 3-5 句话以内
5. 不要出现"根据资料""参考资料显示"这类词

参考资料：
{$context}

常见问题参考：
{$faqText}

用户问：{$question}
PROMPT;

        try {
            // 使用流式响应，超时 120 秒（CPU 模型慢）
            $response = Http::timeout(120)->post("{$this->ollamaUrl}/api/generate", [
                'model' => $this->chatModel,
                'prompt' => $prompt,
                'stream' => true,
                'options' => [
                    'temperature' => 0.3,
                    'num_predict' => 200,
                ],
            ]);

            if ($response->successful()) {
                // 流式响应拼接
                $fullAnswer = '';
                $lines = explode("\n", $response->body());
                foreach ($lines as $line) {
                    if (empty(trim($line))) continue;
                    $chunk = json_decode($line, true);
                    if (isset($chunk['response'])) {
                        $fullAnswer .= $chunk['response'];
                    }
                }
                $fullAnswer = trim($fullAnswer);
                if (!empty($fullAnswer)) {
                    return $fullAnswer;
                }
            }
        } catch (\Exception $e) {
            Log::warning('LLM 回答生成失败，回退到文档原文', ['error' => $e->getMessage()]);
        }

        return null;
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
     * 格式化答案（LLM 失败时的降级方案）
     */
    private function formatAnswer(array $result): string
    {
        $text = $result['text'];
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
