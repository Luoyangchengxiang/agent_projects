<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Agent;
use App\Services\AgentExecutor;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class AgentController extends Controller
{
    /**
     * 获取Agent列表
     */
    public function index(Request $request): JsonResponse
    {
        $query = Agent::query();

        // 按类型筛选
        if ($request->has('type')) {
            $query->where('type', $request->type);
        }

        // 按状态筛选
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // 搜索
        if ($request->has('search')) {
            $query->where('name', 'like', '%' . $request->search . '%');
        }

        // 排序
        $sortBy = $request->get('sort_by', 'created_at');
        $sortOrder = $request->get('sort_order', 'desc');
        $query->orderBy($sortBy, $sortOrder);

        // 分页
        $perPage = $request->get('per_page', 15);
        $agents = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $agents,
        ]);
    }

    /**
     * 创建Agent
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'type' => 'required|in:online,local,team',
            'executor_type' => 'nullable|in:ollama,api,shell',
            'executor_config' => 'nullable|array',
            'model' => 'nullable|string|max:100',
            'system_prompt' => 'nullable|string|max:2000',
            'config' => 'nullable|array',
            'metadata' => 'nullable|array',
        ]);

        $validated['status'] = 'offline';
        $validated['executor_type'] = $validated['executor_type'] ?? 'ollama';

        $agent = Agent::create($validated);

        return response()->json([
            'success' => true,
            'data' => $agent,
            'message' => 'Agent创建成功',
        ], 201);
    }

    /**
     * 获取Agent详情
     */
    public function show(Agent $agent): JsonResponse
    {
        $agent->load(['latestLog', 'metrics' => function ($query) {
            $query->orderBy('recorded_at', 'desc')->limit(10);
        }]);

        return response()->json([
            'success' => true,
            'data' => $agent,
        ]);
    }

    /**
     * 更新Agent
     */
    public function update(Request $request, Agent $agent): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'type' => 'sometimes|in:online,local,team',
            'status' => 'sometimes|in:online,offline,error',
            'executor_type' => 'sometimes|in:ollama,api,shell',
            'executor_config' => 'nullable|array',
            'model' => 'nullable|string|max:100',
            'system_prompt' => 'nullable|string|max:2000',
            'config' => 'nullable|array',
            'metadata' => 'nullable|array',
        ]);

        $agent->update($validated);

        return response()->json([
            'success' => true,
            'data' => $agent,
            'message' => 'Agent更新成功',
        ]);
    }

    /**
     * 删除Agent
     */
    public function destroy(Agent $agent): JsonResponse
    {
        $agent->delete();

        return response()->json([
            'success' => true,
            'message' => 'Agent删除成功',
        ]);
    }

    /**
     * 执行 Agent 任务
     * POST /api/agents/{agent}/run
     */
    public function run(Request $request, Agent $agent, AgentExecutor $executor): JsonResponse
    {
        $validated = $request->validate([
            'input' => 'required|string|max:5000',
            'context' => 'nullable|array',
        ]);

        try {
            $log = $executor->execute(
                $agent,
                $validated['input'],
                $validated['context'] ?? []
            );

            return response()->json([
                'success' => $log->status === 'success',
                'data' => [
                    'task_id' => $log->task_id,
                    'status' => $log->status,
                    'input' => $log->input,
                    'output' => $log->output,
                    'error' => $log->error,
                    'duration' => $log->duration,
                    'duration_formatted' => $log->formatted_duration,
                    'created_at' => $log->created_at,
                ],
            ], $log->status === 'success' ? 200 : 500);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => '执行失败: ' . $e->getMessage(),
            ], 500);
        }
    }
}
