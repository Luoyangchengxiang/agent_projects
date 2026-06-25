<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Agent;
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
            'type' => 'required|in:online,local',
            'config' => 'nullable|array',
            'metadata' => 'nullable|array',
        ]);

        $validated['status'] = 'offline';

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
            'type' => 'sometimes|in:online,local',
            'status' => 'sometimes|in:online,offline,error',
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
}
