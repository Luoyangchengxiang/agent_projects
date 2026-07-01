<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Agent;
use App\Services\AgentExecutor;
use App\Services\ModelfileService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class AgentController extends Controller
{
    /**
     * 获取Agent列表（支持树状结构）
     */
    public function index(Request $request): JsonResponse
    {
        $query = Agent::query();

        // 是否包含已删除
        if (!$request->boolean('include_deleted')) {
            $query->active();
        }

        // 是否只显示已删除
        if ($request->boolean('only_deleted')) {
            $query->deleted();
        }

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

        // 是否返回树状结构
        if ($request->boolean('tree')) {
            return $this->getTree($query, $request);
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
     * 获取树状结构
     */
    protected function getTree($query, Request $request): JsonResponse
    {
        // 获取顶级 Agent（无父级）
        $rootAgents = $query->root()
            ->with(['activeChildren'])
            ->orderBy('created_at', 'desc')
            ->get();

        // 构建树状结构
        $tree = $rootAgents->map(function ($agent) {
            return [
                'id' => $agent->id,
                'name' => $agent->name,
                'type' => $agent->type,
                'status' => $agent->status,
                'is_deleted' => $agent->is_deleted,
                'deleted_at' => $agent->deleted_at,
                'created_by' => $agent->created_by,
                'creator' => $agent->creator ? [
                    'id' => $agent->creator->id,
                    'name' => $agent->creator->name,
                ] : null,
                'created_at' => $agent->created_at,
                'updated_at' => $agent->updated_at,
                'executor_type' => $agent->executor_type,
                'model' => $agent->model,
                'system_prompt' => $agent->system_prompt,
                'is_group' => $agent->activeChildren->count() > 0,
                'children' => $agent->activeChildren->map(function ($child) {
                    return [
                        'id' => $child->id,
                        'name' => $child->name,
                        'type' => $child->type,
                        'status' => $child->status,
                        'executor_type' => $child->executor_type,
                        'model' => $child->model,
                        'system_prompt' => $child->system_prompt,
                        'is_deleted' => $child->is_deleted,
                        'created_by' => $child->created_by,
                        'created_at' => $child->created_at,
                        'updated_at' => $child->updated_at,
                    ];
                }),
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $tree,
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
            'parent_id' => 'nullable|exists:agents,id',
            'executor_type' => 'nullable|in:ollama,api,shell',
            'executor_config' => 'nullable|array',
            'model' => 'nullable|string|max:100',
            'system_prompt' => 'nullable|string|max:2000',
            'config' => 'nullable|array',
            'metadata' => 'nullable|array',
        ]);

        $validated['status'] = 'offline';
        $validated['executor_type'] = $validated['executor_type'] ?? 'ollama';
        $validated['created_by'] = $request->user()?->id;

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
        }, 'children', 'parent']);

        return response()->json([
            'success' => true,
            'data' => $agent,
        ]);
    }

    /**
     * 更新Agent
     */
    public function update(Request $request, Agent $agent, ModelfileService $modelfile): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'type' => 'sometimes|in:online,local,team',
            'status' => 'sometimes|in:online,offline,error',
            'parent_id' => 'nullable|exists:agents,id',
            'executor_type' => 'sometimes|in:ollama,api,shell',
            'executor_config' => 'nullable|array',
            'model' => 'nullable|string|max:100',
            'system_prompt' => 'nullable|string|max:2000',
            'config' => 'nullable|array',
            'metadata' => 'nullable|array',
        ]);

        $agent->update($validated);

        // 同步到本地 Modelfile（仅本地类型 Agent）
        $syncResult = null;
        if (in_array($agent->type, ['local']) && !$agent->is_group) {
            $syncResult = $modelfile->syncToLocal($agent);
        }

        return response()->json([
            'success' => true,
            'data' => $agent,
            'message' => 'Agent更新成功',
            'modelfile_synced' => $syncResult,
        ]);
    }

    /**
     * 逻辑删除Agent（组删除会同时删除子级）
     */
    public function destroy(Request $request, Agent $agent): JsonResponse
    {
        // 权限检查：管理员可删除任何，普通用户只能删除自己创建的
        $user = $request->user();
        if ($user->role !== 'admin' && $agent->created_by !== $user->id) {
            return response()->json([
                'success' => false,
                'message' => '无权删除此Agent',
            ], 403);
        }

        // 如果是组，同时逻辑删除所有子级
        if ($agent->isGroup()) {
            $agent->children()->active()->update([
                'is_deleted' => true,
                'deleted_at' => now(),
            ]);
        }

        $agent->softDelete();

        return response()->json([
            'success' => true,
            'message' => 'Agent删除成功',
        ]);
    }

    /**
     * 恢复已删除的Agent（仅管理员）
     */
    public function restore(Request $request, Agent $agent): JsonResponse
    {
        // 只有管理员可以恢复
        $user = $request->user();
        if ($user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => '只有管理员可以恢复已删除的Agent',
            ], 403);
        }

        // 如果是组，同时恢复所有子级
        if ($agent->children()->count() > 0) {
            $agent->children()->deleted()->update([
                'is_deleted' => false,
                'deleted_at' => null,
            ]);
        }

        $agent->restore();

        return response()->json([
            'success' => true,
            'message' => 'Agent恢复成功',
        ]);
    }

    /**
     * 获取已删除的Agent列表（仅管理员）
     */
    public function trash(Request $request): JsonResponse
    {
        $user = $request->user();
        if ($user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => '只有管理员可以查看已删除的Agent',
            ], 403);
        }

        $agents = Agent::onlyDeleted()
            ->with(['parent', 'creator'])
            ->orderBy('deleted_at', 'desc')
            ->paginate(15);

        return response()->json([
            'success' => true,
            'data' => $agents,
        ]);
    }

    /**
     * 执行 Agent 任务
     * POST /api/agents/{agent}/run
     */
    public function run(Request $request, Agent $agent, AgentExecutor $executor): JsonResponse
    {
        // 如果是组，执行所有子级
        if ($agent->isActiveGroup()) {
            return $this->runGroup($request, $agent, $executor);
        }

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

    /**
     * 执行组任务（并行执行所有子级）
     */
    protected function runGroup(Request $request, Agent $group, AgentExecutor $executor): JsonResponse
    {
        $validated = $request->validate([
            'input' => 'required|string|max:5000',
            'context' => 'nullable|array',
        ]);

        $results = [];
        $children = $group->activeChildren()->get();

        foreach ($children as $child) {
            try {
                $log = $executor->execute(
                    $child,
                    $validated['input'],
                    $validated['context'] ?? []
                );

                $results[] = [
                    'agent_id' => $child->id,
                    'agent_name' => $child->name,
                    'task_id' => $log->task_id,
                    'status' => $log->status,
                    'output' => mb_substr($log->output ?? '', 0, 500),
                    'error' => $log->error,
                    'duration' => $log->duration,
                ];
            } catch (\Exception $e) {
                $results[] = [
                    'agent_id' => $child->id,
                    'agent_name' => $child->name,
                    'status' => 'failed',
                    'error' => $e->getMessage(),
                ];
            }
        }

        $successCount = collect($results)->where('status', 'success')->count();

        return response()->json([
            'success' => $successCount > 0,
            'message' => "执行完成: {$successCount}/{$children->count()} 成功",
            'data' => $results,
        ]);
    }

    /**
     * 同步：本地 Modelfile → 数据库（全量）
     */
    public function syncFromLocal(ModelfileService $modelfile): JsonResponse
    {
        $results = $modelfile->syncAllToDatabase();
        return response()->json([
            'success' => true,
            'message' => '本地 → 数据库同步完成',
            'data' => $results,
        ]);
    }

    /**
     * 同步：数据库 → 本地 Modelfile（全量）
     */
    public function syncToLocal(ModelfileService $modelfile): JsonResponse
    {
        $results = $modelfile->syncAllToLocal();
        return response()->json([
            'success' => true,
            'message' => '数据库 → 本地同步完成',
            'data' => $results,
        ]);
    }

    /**
     * 读取单个 Agent 的本地 Modelfile 原始内容
     */
    public function getModelfile(Agent $agent, ModelfileService $modelfile): JsonResponse
    {
        $path = $modelfile->getModelfilePath($agent);
        if (!$path) {
            return response()->json([
                'success' => false,
                'message' => '未找到本地 Modelfile',
            ]);
        }

        $content = file_get_contents($path);
        $parsed = $modelfile->parseModelfile($path);

        return response()->json([
            'success' => true,
            'data' => [
                'path' => $path,
                'raw' => $content,
                'parsed' => $parsed,
            ],
        ]);
    }
}
