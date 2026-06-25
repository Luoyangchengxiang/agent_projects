<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\ChatMessage;
use App\Services\OllamaService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class ChatController extends Controller
{
    public function __construct(
        private OllamaService $ollama
    ) {}

    /**
     * POST /api/chat/conversations
     * 创建新对话
     */
    public function createConversation(Request $request): JsonResponse
    {
        // 检查是否有活跃对话，有则复用
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
            'content' => '你好！我是小助手 🤖 有什么关于系统的问题都可以问我哦~',
        ]);

        return response()->json([
            'success' => true,
            'data' => $this->formatConversation($conversation),
        ], 201);
    }

    /**
     * GET /api/chat/conversations
     * 获取对话列表（管理后台用）
     */
    public function conversations(Request $request): JsonResponse
    {
        $query = Conversation::with(['user', 'humanAgent', 'lastMessage'])
            ->orderBy('last_message_at', 'desc');

        // 管理员看所有，普通用户只看自己的
        if ($request->user()->role !== 'admin') {
            $query->where('user_id', $request->user()->id);
        }

        // 筛选
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
     * 获取单个对话详情（含消息）
     */
    public function conversationDetail(Request $request, Conversation $conversation): JsonResponse
    // 安全检查：非管理员只能看自己的对话
    {
        if ($request->user()->role !== 'admin' && $conversation->user_id !== $request->user()->id) {
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
     * 发送消息并获取AI回复
     */
    public function sendMessage(Request $request): JsonResponse
    {
        $request->validate([
            'conversation_id' => 'required|exists:conversations,id',
            'content' => 'required|string|max:2000',
        ]);

        $conversation = Conversation::findOrFail($request->conversation_id);

        // 安全检查
        if ($request->user()->role !== 'admin' && $conversation->user_id !== $request->user()->id) {
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

        // 根据模式决定回复方式
        if ($conversation->mode === 'human') {
            // 人工接管模式：不自动回复，通知真人客服
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

        // AI模式：调用Ollama获取回复
        $aiReply = $this->getAiReply($conversation);

        $aiMessage = ChatMessage::create([
            'conversation_id' => $conversation->id,
            'sender_type' => 'ai',
            'sender_id' => null,
            'content' => $aiReply ?: '抱歉，我暂时无法回答这个问题 😅 建议联系人工客服获取帮助。',
            'metadata' => $aiReply ? ['model' => config('ollama.model')] : ['error' => 'ollama_failed'],
        ]);

        $conversation->update(['last_message_at' => now()]);

        return response()->json([
            'success' => true,
            'data' => [
                'user_message' => $this->formatMessage($userMessage),
                'ai_message' => $this->formatMessage($aiMessage),
                'mode' => 'ai',
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

        // 系统消息
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

        if ($conversation->human_agent_id !== $request->user()->id && $request->user()->role !== 'admin') {
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
     * GET /api/chat/status
     * 检查客服系统状态
     */
    public function status(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => [
                'ollama_available' => $this->ollama->isAvailable(),
                'models' => $this->ollama->getModels(),
                'active_conversations' => Conversation::active()->count(),
                'human_mode_conversations' => Conversation::active()->humanMode()->count(),
            ],
        ]);
    }

    // ==================== 私有方法 ====================

    /**
     * 获取AI回复
     */
    private function getAiReply(Conversation $conversation): ?string
    {
        // 取最近10条消息作为上下文
        $history = $conversation->messages()
            ->where('sender_type', '!=', 'system')
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get()
            ->reverse()
            ->map(fn($m) => [
                'role' => $m->sender_type === 'user' ? 'user' : 'assistant',
                'content' => $m->content,
            ])
            ->toArray();

        return $this->ollama->chat($history);
    }

    /**
     * 格式化对话数据
     */
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

    /**
     * 格式化消息数据
     */
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
