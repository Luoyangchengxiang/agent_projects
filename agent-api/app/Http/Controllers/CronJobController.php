<?php

namespace App\Http\Controllers;

use App\Models\CronJob;
use App\Models\CronJobLog;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class CronJobController extends Controller
{
    /**
     * 获取定时任务列表
     */
    public function index(Request $request): JsonResponse
    {
        $query = CronJob::with('creator');

        // 按状态筛选
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // 搜索
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ILIKE', "%{$search}%")
                  ->orWhere('prompt', 'ILIKE', "%{$search}%");
            });
        }

        // 排序（白名单校验）
        $allowedSortColumns = ['name', 'status', 'schedule', 'run_count', 'last_run_at', 'created_at'];
        $sortBy = in_array($request->get('sort_by'), $allowedSortColumns) 
            ? $request->get('sort_by') 
            : 'created_at';
        $sortDir = $request->get('sort_dir') === 'asc' ? 'asc' : 'desc';
        $query->orderBy($sortBy, $sortDir);

        // 分页
        $perPage = $request->get('per_page', 15);
        $jobs = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $jobs->items(),
            'pagination' => [
                'total' => $jobs->total(),
                'current_page' => $jobs->currentPage(),
                'last_page' => $jobs->lastPage(),
                'per_page' => $jobs->perPage(),
            ],
        ]);
    }

    /**
     * 获取定时任务详情
     */
    public function show(CronJob $cronjob): JsonResponse
    {
        $cronjob->load(['creator', 'logs' => function ($query) {
            $query->latest()->limit(20);
        }]);

        return response()->json([
            'success' => true,
            'data' => $cronjob,
        ]);
    }

    /**
     * 创建定时任务
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'prompt' => 'nullable|string',
            'schedule' => 'required|string|max:50|regex:/^[\d\*\-\/\,\s]+$/',
            'config' => 'nullable|array',
            'config.model' => 'nullable|string',
            'config.skills' => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => '参数验证失败',
                'errors' => $validator->errors(),
            ], 422);
        }

        $job = CronJob::create([
            ...$request->only(['name', 'prompt', 'schedule', 'config']),
            'created_by' => Auth::id(),
            'status' => 'active',
            'next_run_at' => now()->addMinute(), // 默认1分钟后首次执行
        ]);

        return response()->json([
            'success' => true,
            'message' => '定时任务创建成功',
            'data' => $job,
        ], 201);
    }

    /**
     * 更新定时任务
     */
    public function update(Request $request, CronJob $cronjob): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255',
            'prompt' => 'nullable|string',
            'schedule' => 'sometimes|required|string|max:50',
            'config' => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => '参数验证失败',
                'errors' => $validator->errors(),
            ], 422);
        }

        $cronjob->update($request->only(['name', 'prompt', 'schedule', 'config']));

        // 如果修改了 schedule，重新计算下次执行时间
        if ($request->has('schedule')) {
            $cronjob->update(['next_run_at' => $cronjob->calculateNextRun()]);
        }

        return response()->json([
            'success' => true,
            'message' => '定时任务更新成功',
            'data' => $cronjob,
        ]);
    }

    /**
     * 删除定时任务
     */
    public function destroy(CronJob $cronjob): JsonResponse
    {
        $cronjob->delete();

        return response()->json([
            'success' => true,
            'message' => '定时任务删除成功',
        ]);
    }

    /**
     * 暂停定时任务
     */
    public function pause(CronJob $cronjob): JsonResponse
    {
        $cronjob->update([
            'status' => 'paused',
            'next_run_at' => null,
        ]);

        return response()->json([
            'success' => true,
            'message' => '定时任务已暂停',
        ]);
    }

    /**
     * 恢复定时任务
     */
    public function resume(CronJob $cronjob): JsonResponse
    {
        $cronjob->update([
            'status' => 'active',
            'next_run_at' => $cronjob->calculateNextRun(),
        ]);

        return response()->json([
            'success' => true,
            'message' => '定时任务已恢复',
        ]);
    }

    /**
     * 手动执行定时任务
     */
    public function run(CronJob $cronjob): JsonResponse
    {
        // 分发到队列执行
        \App\Jobs\ExecuteCronJob::dispatch($cronjob->id, isManual: true);

        return response()->json([
            'success' => true,
            'message' => '任务已提交执行',
        ]);
    }

    /**
     * 获取执行日志
     */
    public function logs(Request $request, CronJob $cronjob): JsonResponse
    {
        $perPage = $request->get('per_page', 20);
        $logs = $cronjob->logs()->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $logs->items(),
            'pagination' => [
                'total' => $logs->total(),
                'current_page' => $logs->currentPage(),
                'last_page' => $logs->lastPage(),
                'per_page' => $logs->perPage(),
            ],
        ]);
    }

    /**
     * 获取统计信息
     */
    public function stats(): JsonResponse
    {
        $total = CronJob::count();
        $active = CronJob::where('status', 'active')->count();
        $paused = CronJob::where('status', 'paused')->count();
        $error = CronJob::where('status', 'error')->count();

        $totalRuns = CronJob::sum('run_count');
        $totalFails = CronJob::sum('fail_count');

        return response()->json([
            'success' => true,
            'data' => [
                'total' => $total,
                'active' => $active,
                'paused' => $paused,
                'error' => $error,
                'total_runs' => $totalRuns,
                'total_fails' => $totalFails,
                'success_rate' => $totalRuns > 0 ? round(($totalRuns - $totalFails) / $totalRuns * 100, 1) : 0,
            ],
        ]);
    }
}
