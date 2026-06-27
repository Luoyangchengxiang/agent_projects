<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AlertRule;
use App\Services\AlertService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class AlertController extends Controller
{
    public function __construct(
        private AlertService $alertService
    ) {}

    /**
     * 告警规则列表
     */
    public function index(Request $request): JsonResponse
    {
        $query = AlertRule::query();

        if ($request->has('is_enabled')) {
            $query->where('is_enabled', $request->boolean('is_enabled'));
        }

        $rules = $query->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 20));

        return response()->json([
            'success' => true,
            'data' => $rules,
        ]);
    }

    /**
     * 创建告警规则
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'error_type' => 'nullable|string|max:50',
            'severity' => 'nullable|in:critical,high,medium,low,info',
            'threshold_count' => 'required|integer|min:1|max:10000',
            'time_window_minutes' => 'required|integer|min:1|max:1440',
            'is_enabled' => 'boolean',
            'notify_method' => 'in:log,webhook',
            'webhook_url' => 'nullable|url|max:500',
            'description' => 'nullable|string|max:500',
        ]);

        $rule = AlertRule::create($validated);

        return response()->json([
            'success' => true,
            'data' => $rule,
            'message' => '告警规则创建成功',
        ], 201);
    }

    /**
     * 告警规则详情
     */
    public function show(AlertRule $alertRule): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $alertRule,
        ]);
    }

    /**
     * 更新告警规则
     */
    public function update(Request $request, AlertRule $alertRule): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'string|max:100',
            'error_type' => 'nullable|string|max:50',
            'severity' => 'nullable|in:critical,high,medium,low,info',
            'threshold_count' => 'integer|min:1|max:10000',
            'time_window_minutes' => 'integer|min:1|max:1440',
            'is_enabled' => 'boolean',
            'notify_method' => 'in:log,webhook',
            'webhook_url' => 'nullable|url|max:500',
            'description' => 'nullable|string|max:500',
        ]);

        $alertRule->update($validated);

        return response()->json([
            'success' => true,
            'data' => $alertRule,
            'message' => '告警规则更新成功',
        ]);
    }

    /**
     * 删除告警规则
     */
    public function destroy(AlertRule $alertRule): JsonResponse
    {
        $alertRule->delete();

        return response()->json([
            'success' => true,
            'message' => '告警规则已删除',
        ]);
    }

    /**
     * 手动执行告警检查
     */
    public function check(): JsonResponse
    {
        $alerts = $this->alertService->checkAll();

        return response()->json([
            'success' => true,
            'data' => [
                'alerts' => $alerts,
                'triggered_count' => count($alerts),
                'checked_at' => now()->toISOString(),
            ],
            'message' => count($alerts) > 0
                ? "检查完成，触发 {count($alerts)} 条告警"
                : '检查完成，无告警触发',
        ]);
    }

    /**
     * 检查单条规则
     */
    public function checkRule(AlertRule $alertRule): JsonResponse
    {
        $result = $alertRule->check();

        return response()->json([
            'success' => true,
            'data' => [
                'rule_id' => $alertRule->id,
                'rule_name' => $alertRule->name,
                'triggered' => $result['triggered'],
                'current_count' => $result['count'],
                'threshold' => $result['threshold'],
                'window_minutes' => $result['window_minutes'],
            ],
        ]);
    }
}
