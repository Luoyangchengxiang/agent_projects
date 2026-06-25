<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ExecutionLog;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class ExecutionLogController extends Controller
{
    /**
     * 获取执行日志列表
     */
    public function index(Request $request): JsonResponse
    {
        $query = ExecutionLog::with('agent');

        // 按Agent筛选
        if ($request->has('agent_id')) {
            $query->where('agent_id', $request->agent_id);
        }

        // 按状态筛选
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // 按任务ID筛选
        if ($request->has('task_id')) {
            $query->where('task_id', $request->task_id);
        }

        // 按时间范围筛选
        if ($request->has('start_date')) {
            $query->where('created_at', '>=', $request->start_date);
        }
        if ($request->has('end_date')) {
            $query->where('created_at', '<=', $request->end_date);
        }

        // 排序
        $query->orderBy('created_at', 'desc');

        // 分页
        $perPage = $request->get('per_page', 20);
        $logs = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $logs,
        ]);
    }

    /**
     * 获取日志详情
     */
    public function show(ExecutionLog $executionLog): JsonResponse
    {
        $executionLog->load('agent');

        return response()->json([
            'success' => true,
            'data' => $executionLog,
        ]);
    }
}
