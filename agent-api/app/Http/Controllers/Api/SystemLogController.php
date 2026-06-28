<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SystemLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SystemLogController extends Controller
{
    /**
     * 获取系统日志列表
     */
    public function index(Request $request): JsonResponse
    {
        $query = SystemLog::query();

        if ($request->has('level')) {
            $query->level($request->level);
        }

        if ($request->has('category')) {
            $query->category($request->category);
        }

        if ($request->has('user_name')) {
            $query->forUser($request->user_name);
        }

        if ($request->has('start_date')) {
            $query->where('created_at', '>=', $request->start_date);
        }

        if ($request->has('end_date')) {
            $query->where('created_at', '<=', $request->end_date);
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('message', 'like', "%{$search}%")
                  ->orWhere('action', 'like', "%{$search}%");
            });
        }

        $perPage = $request->get('per_page', 50);
        $logs = $query->orderBy('created_at', 'desc')->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $logs,
        ]);
    }

    /**
     * 获取日志详情
     */
    public function show(SystemLog $systemLog): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $systemLog,
        ]);
    }

    /**
     * 获取日志统计
     */
    public function stats(): JsonResponse
    {
        $total = SystemLog::count();

        // 按级别统计
        $byLevel = SystemLog::selectRaw('level, COUNT(*) as count')
            ->groupBy('level')
            ->pluck('count', 'level');

        // 按分类统计
        $byCategory = SystemLog::selectRaw('category, COUNT(*) as count')
            ->groupBy('category')
            ->pluck('count', 'category');

        // 最近24小时日志数
        $last24h = SystemLog::where('created_at', '>=', now()->subDay())->count();

        // 最近1小时错误数
        $lastHourErrors = SystemLog::where('level', 'error')
            ->where('created_at', '>=', now()->subHour())
            ->count();

        return response()->json([
            'success' => true,
            'data' => [
                'total' => $total,
                'by_level' => $byLevel,
                'by_category' => $byCategory,
                'last_24h' => $last24h,
                'last_hour_errors' => $lastHourErrors,
            ],
        ]);
    }

    /**
     * 清理旧日志
     */
    public function cleanup(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'days' => 'required|integer|min:1|max:365',
        ]);

        $deleted = SystemLog::where('created_at', '<', now()->subDays($validated['days']))->delete();

        // 记录系统日志
        \App\Models\SystemLog::system('cleanup_logs', "清理 {$validated['days']} 天前的系统日志", [
            'deleted_count' => $deleted,
            'days' => $validated['days'],
        ]);

        return response()->json([
            'success' => true,
            'data' => ['deleted_count' => $deleted],
            'message' => "已清理 {$deleted} 条 {$validated['days']} 天前的日志",
        ]);
    }

    /**
     * 获取日志分类列表
     */
    public function categories(): JsonResponse
    {
        $categories = SystemLog::distinct()->pluck('category');

        return response()->json([
            'success' => true,
            'data' => $categories,
        ]);
    }

    /**
     * 获取日志级别列表
     */
    public function levels(): JsonResponse
    {
        $levels = SystemLog::distinct()->pluck('level');

        return response()->json([
            'success' => true,
            'data' => $levels,
        ]);
    }
}
