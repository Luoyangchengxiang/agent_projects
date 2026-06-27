<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\ChatMessage;
use App\Models\User;
use App\Services\RagService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class ChatController extends Controller
{
    public function __construct(
        private RagService $rag
    ) {}

    /**
     * POST /api/chat/conversations
     * 创建新对话
     */
    public function createConversation(Request $request): JsonResponse
    {
        $existing = Conversation::where('user_id', $request->user()->id)
            ->where('status', 'active')
            ->first();

        if ($existing) {
            return response()->json([
                'success' => true,
                'data' => $this->formatConversation($existing),
                'message' => '已有活跃对话',
            ]);
        }

        $conversation = Conversation::create([
            'user_id' => $request->user()->id,
            'status' => 'active',
            'mode' => 'ai',
        ]);

        // 发送欢迎消息
        ChatMessage::create([
            'conversation_id' => $conversation->id,
            'sender_type' => 'ai',
            'sender_id' => null,
            'content' => "你好！我是小助手 🤖\n\n我可以帮你解答关于系统使用的各种问题。你可以问我：\n\n• 如何添加新的 Agent？\n• 怎么查看运行状态？\n• 如何配置定时任务？\n• 报错了怎么办？\n\n或者直接描述你的问题，我会尽力帮你解答！",
        ]);

        return response()->json([
            'success' => true,
            'data' => $this->formatConversation($conversation),
        ], 201);
    }

    /**
     * GET /api/chat/conversations
     * 获取对话列表
     */
    public function conversations(Request $request): JsonResponse
    {
        $query = Conversation::with(['user', 'humanAgent', 'lastMessage'])
            ->orderBy('last_message_at', 'desc');

        if (!in_array($request->user()->role, ['admin', 'support'])) {
            $query->where('user_id', $request->user()->id);
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }
        if ($request->has('mode')) {
            $query->where('mode', $request->mode);
        }

        $conversations = $query->paginate($request->get('per_page', 20));

        return response()->json([
            'success' => true,
            'data' => $conversations,
        ]);
    }

    /**
     * GET /api/chat/conversations/{id}
     * 获取单个对话详情
     */
    public function conversationDetail(Request $request, Conversation $conversation): JsonResponse
    {
        if (!in_array($request->user()->role, ['admin', 'support']) && $conversation->user_id !== $request->user()->id) {
            return response()->json(['success' => false, 'message' => '无权访问'], 403);
        }

        $conversation->load(['messages' => fn($q) => $q->orderBy('created_at'), 'user', 'humanAgent']);

        return response()->json([
            'success' => true,
            'data' => $this->formatConversation($conversation),
            'messages' => $conversation->messages->map(fn($m) => $this->formatMessage($m)),
        ]);
    }

    /**
     * POST /api/chat/messages
     * 发送消息并获取回复
     */
    public function sendMessage(Request $request): JsonResponse
    {
        $request->validate([
            'conversation_id' => 'required|exists:conversations,id',
            'content' => 'required|string|max:2000',
        ]);

        $conversation = Conversation::findOrFail($request->conversation_id);

        // 安全检查
        if (!in_array($request->user()->role, ['admin', 'support']) && $conversation->user_id !== $request->user()->id) {
            return response()->json(['success' => false, 'message' => '无权操作'], 403);
        }

        if ($conversation->status !== 'active') {
            return response()->json(['success' => false, 'message' => '对话已关闭'], 400);
        }

        // 保存用户消息
        $userMessage = ChatMessage::create([
            'conversation_id' => $conversation->id,
            'sender_type' => 'user',
            'sender_id' => $request->user()->id,
            'content' => $request->content,
        ]);

        $conversation->update(['last_message_at' => now()]);

        // 人工接管模式
        if ($conversation->mode === 'human') {
            return response()->json([
                'success' => true,
                'data' => [
                    'user_message' => $this->formatMessage($userMessage),
                    'ai_message' => null,
                    'mode' => 'human',
                    'message' => '消息已发送，等待人工客服回复',
                ],
            ]);
        }

        // AI 模式：使用 RAG 检索回答
        $ragResult = $this->rag->answer($request->content);

        $aiContent = $ragResult['content'];
        $metadata = [
            'rag_type' => $ragResult['type'],
            'similarity' => $ragResult['similarity'] ?? null,
            'source' => $ragResult['source'] ?? null,
        ];

        // 附加常见问题（兜底时）
        if ($ragResult['type'] === 'fallback') {
            $metadata['faq'] = $ragResult['faq'] ?? [];
        }

        $aiMessage = ChatMessage::create([
            'conversation_id' => $conversation->id,
            'sender_type' => 'ai',
            'sender_id' => null,
            'content' => $aiContent,
            'metadata' => $metadata,
        ]);

        $conversation->update(['last_message_at' => now()]);

        return response()->json([
            'success' => true,
            'data' => [
                'user_message' => $this->formatMessage($userMessage),
                'ai_message' => $this->formatMessage($aiMessage),
                'mode' => 'ai',
                'rag_type' => $ragResult['type'],
            ],
        ]);
    }

    /**
     * POST /api/chat/takeover
     * 人工接管对话
     */
    public function takeover(Request $request): JsonResponse
    {
        $request->validate([
            'conversation_id' => 'required|exists:conversations,id',
        ]);

        $conversation = Conversation::findOrFail($request->conversation_id);
        $conversation->takeOver($request->user()->id);

        ChatMessage::create([
            'conversation_id' => $conversation->id,
            'sender_type' => 'system',
            'content' => "客服 {$request->user()->name} 已接入对话",
        ]);

        return response()->json([
            'success' => true,
            'message' => '已接管对话',
            'data' => $this->formatConversation($conversation),
        ]);
    }

    /**
     * POST /api/chat/release
     * 释放对话给AI
     */
    public function release(Request $request): JsonResponse
    {
        $request->validate([
            'conversation_id' => 'required|exists:conversations,id',
        ]);

        $conversation = Conversation::findOrFail($request->conversation_id);
        $conversation->release();

        ChatMessage::create([
            'conversation_id' => $conversation->id,
            'sender_type' => 'system',
            'content' => '对话已转交给AI助手',
        ]);

        return response()->json([
            'success' => true,
            'message' => '已释放给AI',
            'data' => $this->formatConversation($conversation),
        ]);
    }

    /**
     * POST /api/chat/close
     * 关闭对话
     */
    public function close(Request $request): JsonResponse
    {
        $request->validate([
            'conversation_id' => 'required|exists:conversations,id',
        ]);

        $conversation = Conversation::findOrFail($request->conversation_id);
        $conversation->close();

        ChatMessage::create([
            'conversation_id' => $conversation->id,
            'sender_type' => 'system',
            'content' => '对话已关闭',
        ]);

        return response()->json([
            'success' => true,
            'message' => '对话已关闭',
        ]);
    }

    /**
     * POST /api/chat/human-reply
     * 人工客服发送回复
     */
    public function humanReply(Request $request): JsonResponse
    {
        $request->validate([
            'conversation_id' => 'required|exists:conversations,id',
            'content' => 'required|string|max:2000',
        ]);

        $conversation = Conversation::findOrFail($request->conversation_id);

        if (!$conversation->isTakenOver()) {
            return response()->json(['success' => false, 'message' => '该对话未被接管'], 400);
        }

        if ($conversation->human_agent_id !== $request->user()->id && !in_array($request->user()->role, ['admin', 'support'])) {
            return response()->json(['success' => false, 'message' => '无权操作'], 403);
        }

        $message = ChatMessage::create([
            'conversation_id' => $conversation->id,
            'sender_type' => 'human',
            'sender_id' => $request->user()->id,
            'content' => $request->content,
        ]);

        $conversation->update(['last_message_at' => now()]);

        return response()->json([
            'success' => true,
            'data' => $this->formatMessage($message),
        ]);
    }

    /**
     * POST /api/chat/transfer-human
     * 用户请求转人工
     */
    public function transferToHuman(Request $request): JsonResponse
    {
        $request->validate([
            'conversation_id' => 'required|exists:conversations,id',
        ]);

        $conversation = Conversation::findOrFail($request->conversation_id);

        if ($conversation->user_id !== $request->user()->id && !in_array($request->user()->role, ['admin', 'support'])) {
            return response()->json(['success' => false, 'message' => '无权操作'], 403);
        }

        // 记录转人工请求
        ChatMessage::create([
            'conversation_id' => $conversation->id,
            'sender_type' => 'system',
            'content' => '用户请求转接人工客服，正在通知客服人员...',
        ]);

        // 通知所有 admin 和 support（存储通知到数据库或日志）
        $this->notifyAgents($conversation, $request->user());

        return response()->json([
            'success' => true,
            'message' => '已通知客服人员，请等待接入',
            'data' => [
                'conversation_id' => $conversation->id,
                'status' => 'waiting',
            ],
        ]);
    }

    /**
     * 通知客服人员有新的转人工请求
     */
    private function notifyAgents(Conversation $conversation, $user): void
    {
        // 获取所有 admin 和 support 用户
        $agents = User::whereIn('role', ['admin', 'support'])->get();

        foreach ($agents as $agent) {
            ChatMessage::create([
                'conversation_id' => $conversation->id,
                'sender_type' => 'system',
                'content' => "📢 用户 {$user->nickname}({$user->name}) 请求人工客服",
                'metadata' => [
                    'type' => 'transfer_request',
                    'target_agent_id' => $agent->id,
                ],
            ]);
        }

        \Log::info('转人工通知已发送', [
            'conversation_id' => $conversation->id,
            'user_id' => $user->id,
            'agents_notified' => $agents->pluck('id')->toArray(),
        ]);
    }

    /**
     * GET /api/chat/status
     * 检查客服系统状态
     */
    public function status(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => [
                'rag_available' => file_exists(storage_path('app/knowledge-base.json')),
                'active_conversations' => Conversation::active()->count(),
                'human_mode_conversations' => Conversation::active()->humanMode()->count(),
            ],
        ]);
    }

    // ==================== 私有方法 ====================

    private function formatConversation(Conversation $conversation): array
    {
        return [
            'id' => $conversation->id,
            'user_id' => $conversation->user_id,
            'user_name' => $conversation->user?->name,
            'status' => $conversation->status,
            'mode' => $conversation->mode,
            'human_agent_id' => $conversation->human_agent_id,
            'human_agent_name' => $conversation->humanAgent?->name,
            'last_message_at' => $conversation->last_message_at,
            'created_at' => $conversation->created_at,
        ];
    }

    private function formatMessage(ChatMessage $message): array
    {
        return [
            'id' => $message->id,
            'conversation_id' => $message->conversation_id,
            'sender_type' => $message->sender_type,
            'sender_id' => $message->sender_id,
            'content' => $message->content,
            'metadata' => $message->metadata,
            'created_at' => $message->created_at,
        ];
    }
}
