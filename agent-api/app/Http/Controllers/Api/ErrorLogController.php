<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Enums\ErrorType;
use App\Models\ErrorLog;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class ErrorLogController extends Controller
{
    /**
     * 获取错误日志列表
     */
    public function index(Request $request): JsonResponse
    {
        $query = ErrorLog::query();

        // 按错误类型筛选
        if ($request->has('error_type')) {
            $query->ofType($request->error_type);
        }

        // 按严重程度筛选
        if ($request->has('severity')) {
            $query->ofSeverity($request->severity);
        }

        // 按解决状态筛选
        if ($request->has('is_resolved')) {
            $request->is_resolved ? $query->resolved() : $query->unresolved();
        }

        // 按时间范围筛选
        if ($request->has('start_date') && $request->has('end_date')) {
            $query->dateRange($request->start_date, $request->end_date);
        }

        // 搜索
        if ($request->has('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('message', 'like', '%' . $request->search . '%')
                  ->orWhere('error_type', 'like', '%' . $request->search . '%')
                  ->orWhere('url', 'like', '%' . $request->search . '%');
            });
        }

        // 排序
        $sortBy = $request->get('sort_by', 'created_at');
        $sortOrder = $request->get('sort_order', 'desc');
        $query->orderBy($sortBy, $sortOrder);

        // 分页
        $perPage = $request->get('per_page', 20);
        $logs = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $logs,
        ]);
    }

    /**
     * 获取错误日志详情
     */
    public function show(ErrorLog $errorLog): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $errorLog,
        ]);
    }

    /**
     * 标记为已解决
     */
    public function resolve(Request $request, ErrorLog $errorLog): JsonResponse
    {
        $request->validate([
            'resolution_notes' => 'nullable|string|max:1000',
        ]);

        $errorLog->markAsResolved($request->resolution_notes);

        return response()->json([
            'success' => true,
            'data' => $errorLog,
            'message' => '已标记为已解决',
        ]);
    }

    /**
     * 获取错误统计
     */
    public function stats(): JsonResponse
    {
        // 总数统计
        $total = ErrorLog::count();
        $unresolved = ErrorLog::unresolved()->count();
        $resolved = ErrorLog::resolved()->count();

        // 按严重程度统计
        $bySeverity = ErrorLog::selectRaw('severity, COUNT(*) as count')
            ->groupBy('severity')
            ->pluck('count', 'severity');

        // 按类型统计（最近7天）
        $byType = ErrorLog::selectRaw('error_type, COUNT(*) as count')
            ->where('created_at', '>=', now()->subDays(7))
            ->groupBy('error_type')
            ->orderBy('count', 'desc')
            ->limit(10)
            ->pluck('count', 'error_type');

        // 最近24小时错误趋势（PostgreSQL语法）
        $hourlyTrend = ErrorLog::selectRaw('EXTRACT(HOUR FROM created_at)::integer as hour, COUNT(*) as count')
            ->where('created_at', '>=', now()->subDay())
            ->groupBy('hour')
            ->orderBy('hour')
            ->pluck('count', 'hour');

        return response()->json([
            'success' => true,
            'data' => [
                'total' => $total,
                'unresolved' => $unresolved,
                'resolved' => $resolved,
                'by_severity' => $bySeverity,
                'by_type' => $byType,
                'hourly_trend' => $hourlyTrend,
            ],
        ]);
    }

    /**
     * 获取所有错误类型
     */
    public function types(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => ErrorType::all(),
        ]);
    }

    /**
     * 删除错误日志
     */
    public function destroy(ErrorLog $errorLog): JsonResponse
    {
        $errorLog->delete();

        return response()->json([
            'success' => true,
            'message' => '已删除',
        ]);
    }

    /**
     * 批量删除
     */
    public function batchDestroy(Request $request): JsonResponse
    {
        $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'integer',
        ]);

        ErrorLog::whereIn('id', $request->ids)->delete();

        return response()->json([
            'success' => true,
            'message' => '批量删除成功',
        ]);
    }
}
