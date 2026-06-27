<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Ollama 本地模型服务
 * 对接本地部署的 Ollama 大模型
 */
class OllamaService
{
    private string $baseUrl;
    private string $model;
    private string $systemPrompt;

    public function __construct()
    {
        $this->baseUrl = config('ollama.base_url', 'http://localhost:11434');
        $this->model = config('ollama.model', 'qwen2.5:3b');
        $this->systemPrompt = $this->buildSystemPrompt();
    }

    /**
     * 构建系统提示词
     */
    private function buildSystemPrompt(): string
    {
        return <<<PROMPT
你是 Agent Monitor 智能体监控系统的AI客服助手，名叫"小助手"。

你的职责：
1. 回答用户关于系统使用的各种问题
2. 帮助用户理解和操作系统的各项功能
3. 在无法解决问题时，建议用户联系人工客服

系统功能概览：
- 仪表盘：查看所有Agent的运行状态和统计数据
- Agent列表：管理和查看各个智能体（选品专家、运营管家、财务顾问、决策引擎、分析专家）
- 执行日志：查看Agent的执行历史和结果
- 错误日志：查看系统错误记录，支持筛选和搜索
- 登录注册：支持邮箱密码登录，本地IP可快捷登录（admin/123456）

常见问题：
- Q: 如何添加新的Agent？
  A: 在"Agent列表"页面点击"新增"按钮即可创建。

- Q: 怎么查看Agent运行是否正常？
  A: 在"仪表盘"页面可以查看所有Agent的运行状态，绿色表示正常。

- Q: 本地怎么快速登录？
  A: 在本机访问时，邮箱输入"admin"，密码输入"123456"即可快捷登录。

- Q: 报错了怎么办？
  A: 在"错误日志"页面查看错误详情，可以按类型和严重程度筛选。

回复风格：
- 简洁友好，不要太长
- 使用中文回复
- 可以使用emoji增加亲和力
- 如果不确定答案，坦诚说明并建议联系人工客服
PROMPT;
    }

    /**
     * 发送对话请求（非流式）
     */
    public function chat(array $messages): ?string
    {
        try {
            // 构建完整的消息列表（注入系统提示词）
            $fullMessages = array_merge(
                [['role' => 'system', 'content' => $this->systemPrompt]],
                $messages
            );

            $response = Http::timeout(120)->post("{$this->baseUrl}/api/chat", [
                'model' => $this->model,
                'messages' => $fullMessages,
                'stream' => false,
                'options' => [
                    'temperature' => 0.7,
                    'num_predict' => 512,
                ],
            ]);

            if ($response->successful()) {
                return $response->json('message.content', '');
            }

            Log::error('Ollama请求失败', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            return null;
        } catch (\Exception $e) {
            Log::error('Ollama连接异常', ['error' => $e->getMessage()]);
            return null;
        }
    }

    /**
     * 流式对话（返回Generator）
     */
    public function chatStream(array $messages): \Generator
    {
        $fullMessages = array_merge(
            [['role' => 'system', 'content' => $this->systemPrompt]],
            $messages
        );

        $response = Http::timeout(60)->withOptions([
            'stream' => true,
        ])->post("{$this->baseUrl}/api/chat", [
            'model' => $this->model,
            'messages' => $fullMessages,
            'stream' => true,
            'options' => [
                'temperature' => 0.7,
                'num_predict' => 512,
            ],
        ]);

        $body = $response->getBody();
        while (!$body->eof()) {
            $line = $body->read(1024);
            // Ollama 返回 NDJSON 格式
            foreach (explode("\n", $line) as $chunk) {
                $chunk = trim($chunk);
                if (empty($chunk)) continue;
                $data = json_decode($chunk, true);
                if ($data && isset($data['message']['content'])) {
                    yield $data['message']['content'];
                }
                if ($data['done'] ?? false) {
                    return;
                }
            }
        }
    }

    /**
     * 使用指定模型对话（供 AgentExecutor 调用）
     *
     * @param array $messages 完整消息列表（含 system prompt）
     * @param string $modelName 模型名
     * @return string|null
     */
    public function chatWithModel(array $messages, string $modelName): ?string
    {
        try {
            $response = Http::timeout(60)->post("{$this->baseUrl}/api/chat", [
                'model' => $modelName,
                'messages' => $messages,
                'stream' => false,
                'options' => [
                    'temperature' => 0.7,
                    'num_predict' => 1024,
                ],
            ]);

            if ($response->successful()) {
                return $response->json('message.content', '');
            }

            Log::error('Ollama chatWithModel 请求失败', [
                'model' => $modelName,
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            return null;
        } catch (\Exception $e) {
            Log::error('Ollama chatWithModel 异常', [
                'model' => $modelName,
                'error' => $e->getMessage(),
            ]);
            return null;
        }
    }

    /**
     * 检查 Ollama 是否可用
     */
    public function isAvailable(): bool
    {
        try {
            $response = Http::timeout(5)->get("{$this->baseUrl}/api/tags");
            return $response->successful();
        } catch (\Exception) {
            return false;
        }
    }

    /**
     * 获取可用模型列表
     */
    public function getModels(): array
    {
        try {
            $response = Http::timeout(5)->get("{$this->baseUrl}/api/tags");
            if ($response->successful()) {
                return array_map(
                    fn($m) => ['name' => $m['name'], 'size' => $m['size'] ?? 0],
                    $response->json('models', [])
                );
            }
        } catch (\Exception) {}
        return [];
    }
}
