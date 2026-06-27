<?php

namespace App\Services;

use App\Models\Agent;
use App\Models\ExecutionLog;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Agent 执行引擎
 * 根据 Agent 的 executor_type 分发到不同的执行器
 */
class AgentExecutor
{
    public function __construct(
        private OllamaService $ollama
    ) {}

    /**
     * 执行 Agent 任务
     *
     * @param Agent $agent 要执行的 Agent
     * @param string $input 用户输入
     * @param array $context 额外上下文
     * @return ExecutionLog 执行日志
     */
    public function execute(Agent $agent, string $input, array $context = []): ExecutionLog
    {
        $taskId = 'task_' . Str::uuid();
        $startTime = microtime(true);

        // 创建执行日志（状态：running）
        $log = ExecutionLog::create([
            'agent_id' => $agent->id,
            'task_id' => $taskId,
            'status' => 'running',
            'input' => $input,
            'context' => $context,
        ]);

        // 更新 Agent 状态为在线
        $agent->update([
            'status' => 'online',
            'last_active_at' => now(),
        ]);

        try {
            // 根据执行器类型分发
            $output = match ($agent->executor_type) {
                'ollama' => $this->executeOllama($agent, $input, $context),
                'api' => $this->executeApi($agent, $input, $context),
                'shell' => $this->executeShell($agent, $input, $context),
                default => throw new \RuntimeException("不支持的执行器类型: {$agent->executor_type}"),
            };

            $duration = (int) ((microtime(true) - $startTime) * 1000);

            // 生成结果摘要（取前200字）
            $resultSummary = mb_strlen($output) > 200
                ? mb_substr($output, 0, 200) . '...'
                : $output;

            // 更新日志为成功
            $log->update([
                'status' => 'success',
                'output' => $output,
                'result_summary' => $resultSummary,
                'duration' => $duration,
            ]);

            Log::info("Agent [{$agent->name}] 执行成功", [
                'task_id' => $taskId,
                'duration' => $duration . 'ms',
            ]);

        } catch (\Exception $e) {
            $duration = (int) ((microtime(true) - $startTime) * 1000);

            // 更新日志为失败
            $log->update([
                'status' => 'failed',
                'error' => $e->getMessage(),
                'duration' => $duration,
            ]);

            // 更新 Agent 状态为错误
            $agent->update(['status' => 'error']);

            Log::error("Agent [{$agent->name}] 执行失败", [
                'task_id' => $taskId,
                'error' => $e->getMessage(),
            ]);
        }

        return $log->fresh();
    }

    /**
     * Ollama 执行器 — 调用本地大模型
     */
    private function executeOllama(Agent $agent, string $input, array $context): string
    {
        // 检查 Ollama 是否可用
        if (!$this->ollama->isAvailable()) {
            throw new \RuntimeException('Ollama 服务不可用，请检查是否已启动 (ollama serve)');
        }

        $modelName = $agent->getModelName();
        $systemPrompt = $agent->getSystemPrompt();

        // 构建消息
        $messages = [
            ['role' => 'system', 'content' => $systemPrompt],
        ];

        // 如果有上下文历史，加入对话
        if (!empty($context['history'])) {
            foreach ($context['history'] as $msg) {
                $messages[] = [
                    'role' => $msg['role'] ?? 'user',
                    'content' => $msg['content'] ?? '',
                ];
            }
        }

        $messages[] = ['role' => 'user', 'content' => $input];

        // 调用 Ollama
        $response = $this->ollama->chatWithModel($messages, $modelName);

        if ($response === null) {
            throw new \RuntimeException('Ollama 返回为空，请检查模型是否可用');
        }

        return $response;
    }

    /**
     * API 执行器 — 调用外部 API
     */
    private function executeApi(Agent $agent, string $input, array $context): string
    {
        $config = $agent->executor_config ?? [];
        $apiUrl = $config['api_url'] ?? null;
        $apiKey = $config['api_key'] ?? null;
        $method = strtoupper($config['method'] ?? 'POST');

        if (!$apiUrl) {
            throw new \RuntimeException('未配置 API 地址');
        }

        $headers = ['Content-Type' => 'application/json'];
        if ($apiKey) {
            $headers['Authorization'] = "Bearer {$apiKey}";
        }

        $payload = array_merge($config['default_params'] ?? [], [
            'input' => $input,
            'context' => $context,
        ]);

        $response = match ($method) {
            'GET' => \Illuminate\Support\Facades\Http::timeout(30)
                ->withHeaders($headers)
                ->get($apiUrl, $payload),
            default => \Illuminate\Support\Facades\Http::timeout(30)
                ->withHeaders($headers)
                ->post($apiUrl, $payload),
        };

        if ($response->failed()) {
            throw new \RuntimeException("API 请求失败: HTTP {$response->status()}");
        }

        // 尝试从响应中提取内容
        $data = $response->json();
        if (is_array($data)) {
            return $data['content'] ?? $data['message'] ?? $data['result'] ?? json_encode($data, JSON_UNESCAPED_UNICODE);
        }

        return (string) $data;
    }

    /**
     * Shell 执行器 — 执行本地命令（受限沙箱）
     */
    private function executeShell(Agent $agent, string $input, array $context): string
    {
        $config = $agent->executor_config ?? [];
        $allowedCommands = $config['allowed_commands'] ?? ['echo', 'date', 'ls', 'cat'];

        // 解析输入为命令
        $command = trim($input);

        // 安全检查：只允许白名单命令
        $firstWord = explode(' ', $command)[0];
        if (!in_array($firstWord, $allowedCommands)) {
            throw new \RuntimeException("命令 '{$firstWord}' 不在白名单中，允许的命令: " . implode(', ', $allowedCommands));
        }

        // 防止命令注入
        if (preg_match('/[;&|`$(){}]/', $command)) {
            throw new \RuntimeException('命令包含非法字符');
        }

        $output = [];
        $exitCode = 0;

        exec($command . ' 2>&1', $output, $exitCode);

        $result = implode("\n", $output);

        if ($exitCode !== 0) {
            throw new \RuntimeException("命令执行失败 (exit code: {$exitCode}): {$result}");
        }

        return $result ?: '(无输出)';
    }
}
