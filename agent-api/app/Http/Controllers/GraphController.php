<?php

namespace App\Http\Controllers;

use App\Models\GraphNode;
use App\Models\GraphEdge;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class GraphController extends Controller
{
    /**
     * 获取整个图谱数据
     */
    public function index(Request $request): JsonResponse
    {
        $query = GraphNode::with(['agent', 'outgoingEdges', 'incomingEdges']);

        // 按类型筛选
        if ($request->has('type')) {
            $query->where('type', $request->type);
        }

        // 搜索
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ILIKE', "%{$search}%")
                  ->orWhere('description', 'ILIKE', "%{$search}%");
            });
        }

        $nodes = $query->get();

        // 获取所有相关的边
        $nodeIds = $nodes->pluck('id');
        $edges = GraphEdge::whereIn('source_id', $nodeIds)
            ->orWhereIn('target_id', $nodeIds)
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'nodes' => $nodes,
                'edges' => $edges,
            ],
        ]);
    }

    /**
     * 获取节点详情
     */
    public function show(GraphNode $node): JsonResponse
    {
        $node->load(['agent', 'creator', 'outgoingEdges.target', 'incomingEdges.source']);

        return response()->json([
            'success' => true,
            'data' => $node,
        ]);
    }

    /**
     * 创建节点
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'type' => 'required|in:agent_group,agent,knowledge,skill,output',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'metadata' => 'nullable|array',
            'agent_id' => 'nullable|exists:agents,id',
        ]);

        $node = GraphNode::create([
            ...$request->only(['type', 'name', 'description', 'metadata', 'agent_id']),
            'created_by' => Auth::id(),
        ]);

        return response()->json([
            'success' => true,
            'message' => '节点创建成功',
            'data' => $node,
        ], 201);
    }

    /**
     * 更新节点
     */
    public function update(Request $request, GraphNode $node): JsonResponse
    {
        $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'metadata' => 'nullable|array',
            'agent_id' => 'nullable|exists:agents,id',
        ]);

        $node->update($request->only(['name', 'description', 'metadata', 'agent_id']));

        return response()->json([
            'success' => true,
            'message' => '节点更新成功',
            'data' => $node,
        ]);
    }

    /**
     * 删除节点
     */
    public function destroy(GraphNode $node): JsonResponse
    {
        $node->delete();

        return response()->json([
            'success' => true,
            'message' => '节点删除成功',
        ]);
    }

    /**
     * 创建边（关系）
     */
    public function storeEdge(Request $request): JsonResponse
    {
        $request->validate([
            'source_id' => 'required|exists:graph_nodes,id',
            'target_id' => 'required|exists:graph_nodes,id|different:source_id',
            'relation_type' => 'required|in:contains,uses,produces,depends_on,collaborates',
            'label' => 'nullable|string',
            'metadata' => 'nullable|array',
        ]);

        // 检查是否已存在
        $exists = GraphEdge::where('source_id', $request->source_id)
            ->where('target_id', $request->target_id)
            ->where('relation_type', $request->relation_type)
            ->exists();

        if ($exists) {
            return response()->json([
                'success' => false,
                'message' => '该关系已存在',
            ], 422);
        }

        $edge = GraphEdge::create($request->only(['source_id', 'target_id', 'relation_type', 'label', 'metadata']));

        return response()->json([
            'success' => true,
            'message' => '关系创建成功',
            'data' => $edge,
        ], 201);
    }

    /**
     * 删除边
     */
    public function destroyEdge(GraphEdge $edge): JsonResponse
    {
        $edge->delete();

        return response()->json([
            'success' => true,
            'message' => '关系删除成功',
        ]);
    }

    /**
     * 获取节点的关联节点（用于展开子图）
     */
    public function neighbors(GraphNode $node): JsonResponse
    {
        $outgoing = $node->outgoingEdges()->with('target')->get()->map(function ($edge) {
            return [
                'node' => $edge->target,
                'edge' => $edge,
                'direction' => 'outgoing',
            ];
        });

        $incoming = $node->incomingEdges()->with('source')->get()->map(function ($edge) {
            return [
                'node' => $edge->source,
                'edge' => $edge,
                'direction' => 'incoming',
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $outgoing->merge($incoming)->values(),
        ]);
    }

    /**
     * 搜索节点
     */
    public function search(Request $request): JsonResponse
    {
        $request->validate([
            'q' => 'required|string|min:1',
        ]);

        $search = $request->q;

        $nodes = GraphNode::where('name', 'ILIKE', "%{$search}%")
            ->orWhere('description', 'ILIKE', "%{$search}%")
            ->limit(20)
            ->get();

        return response()->json([
            'success' => true,
            'data' => $nodes,
        ]);
    }
}
