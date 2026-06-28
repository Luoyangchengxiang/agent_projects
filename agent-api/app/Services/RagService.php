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

    // 缓存配置
    private int $cacheTtl = 3600; // 缓存1小时
    private string $cachePrefix = 'rag_answer_';

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
        // 1. 检查缓存
        $cacheKey = $this->cachePrefix . md5($question);
        $cached = cache()->get($cacheKey);
        if ($cached) {
            Log::info('RAG 缓存命中', ['question' => $question]);
            return $cached;
        }

        // 2. 加载知识库
        $kb = $this->loadKnowledgeBase();
        if (!$kb || empty($kb['chunks'])) {
            return $this->fallbackResponse($question);
        }

        // 3. 向量检索
        $questionEmbedding = $this->getEmbedding($question);
        if (!$questionEmbedding) {
            return $this->fallbackResponse($question);
        }

        $results = $this->search($questionEmbedding, $kb['chunks'], 3);
        if (empty($results)) {
            return $this->fallbackResponse($question);
        }

        $topResult = $results[0];
        $similarity = $topResult['similarity'];

        // 4. 根据相似度分层处理
        if ($similarity >= $this->highThreshold) {
            // 高相似度：用 LLM 基于文档生成回答
            $llmAnswer = $this->askLlm($question, $results);
            $content = $llmAnswer ?? $this->formatAnswer($topResult);
            // 过滤代码块
            $content = $this->filterCodeBlocks($content);
            
            // 如果过滤后内容太短，使用FAQ回答
            if (mb_strlen($content) < 20) {
                return $this->fallbackResponse($question);
            }
            
            $response = [
                'type' => 'answer',
                'content' => $content,
                'source' => $topResult['source'] . ' > ' . $topResult['heading'],
                'similarity' => $similarity,
            ];
            
            // 缓存回答（包括文档原文）
            cache()->put($cacheKey, $response, $this->cacheTtl);
            
            return $response;
        }

        if ($similarity >= $this->lowThreshold) {
            // 中相似度：LLM 尝试综合多篇文档回答
            $llmAnswer = $this->askLlm($question, $results);
            if ($llmAnswer) {
                // 过滤代码块
                $llmAnswer = $this->filterCodeBlocks($llmAnswer);
                
                // 如果过滤后内容太短，使用FAQ回答
                if (mb_strlen($llmAnswer) < 20) {
                    return $this->fallbackResponse($question);
                }
                
                $response = [
                    'type' => 'answer',
                    'content' => $llmAnswer,
                    'source' => $results[0]['source'] . ' > ' . $results[0]['heading'],
                    'similarity' => $similarity,
                ];
                
                // 缓存 LLM 回答
                cache()->put($cacheKey, $response, $this->cacheTtl);
                
                return $response;
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
        return $this->fallbackResponse($question);
    }

    /**
     * 调用 LLM 基于检索结果生成回答
     */
    private function askLlm(string $question, array $contextChunks): ?string
    {
        // 只取最相关的1个chunk，减少上下文长度
        $chunk = $contextChunks[0];
        $context = "【{$chunk['heading']}】\n{$chunk['text']}";

        // 简化 prompt，减少 token 消耗
        $prompt = <<<PROMPT
根据以下资料回答用户问题。用简洁的中文，2-3句话。

要求：
- 用自然语言回答，不要输出代码块或文件结构
- 用项目符号列表（•）代替代码块
- 避免使用 ``` 代码块语法
- 保持回答简洁易懂

资料：{$context}

问题：{$question}

回答：
PROMPT;

        try {
            // 使用非流式请求，优化参数，缩短超时
            $response = Http::timeout(10)->post("{$this->ollamaUrl}/api/generate", [
                'model' => $this->chatModel,
                'prompt' => $prompt,
                'stream' => false,
                'options' => [
                    'temperature' => 0.1,
                    'num_predict' => 100,
                    'top_k' => 10,
                    'top_p' => 0.5,
                    'repeat_penalty' => 1.1,
                ],
            ]);

            if ($response->successful()) {
                $answer = trim($response->json('response', ''));
                if (!empty($answer)) {
                    return $answer;
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
    private function fallbackResponse(string $question = ''): array
    {
        // 检查问题是否匹配FAQ
        if (!empty($question)) {
            foreach ($this->faq as $item) {
                // 检查问题是否包含FAQ关键词
                if (str_contains($question, $item['q']) || 
                    str_contains($item['q'], $question) ||
                    similar_text($question, $item['q']) / max(strlen($question), strlen($item['q'])) > 0.6) {
                    return [
                        'type' => 'faq',
                        'content' => $item['a'],
                        'faq' => $this->faq,
                    ];
                }
            }
        }
        
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
     * 过滤代码块，用项目符号列表代替
     */
    private function filterCodeBlocks(string $content): string
    {
        // 移除代码块（```...```）
        $content = preg_replace('/```[\s\S]*?```/', '', $content);
        
        // 移除行内代码块（`...`）但保留内容
        $content = preg_replace('/`([^`]+)`/', '$1', $content);
        
        // 移除文件路径和文件结构
        $content = preg_replace('/[a-zA-Z]:\\\\[^\n]+/', '', $content);
        $content = preg_replace('/\/[a-zA-Z_][a-zA-Z0-9_\/]*\.[a-zA-Z]+/', '', $content);
        
        // 移除多余的空行
        $content = preg_replace('/\n{3,}/', "\n\n", $content);
        
        return trim($content);
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
