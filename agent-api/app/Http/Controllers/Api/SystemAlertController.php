<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SystemAlertRule;
use App\Models\AlertHistory;
use App\Models\SystemLog;
use App\Services\SystemAlertService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SystemAlertController extends Controller
{
    protected $alertService;

    public function __construct(SystemAlertService $alertService)
    {
        $this->alertService = $alertService;
    }

    /**
     * 获取告警规则列表
     */
    public function index(Request $request): JsonResponse
    {
        $query = SystemAlertRule::query();

        if ($request->has('resource_type')) {
            $query->forResource($request->resource_type);
        }

        if ($request->has('is_enabled')) {
            $query->where('is_enabled', $request->boolean('is_enabled'));
        }

        $perPage = $request->get('per_page', 20);
        $rules = $query->orderBy('created_at', 'desc')->paginate($perPage);

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
            'resource_type' => 'required|in:cpu,memory,disk',
            'threshold' => 'required|numeric|min:0|max:100',
            'severity' => 'required|in:info,warning,critical',
            'check_interval_minutes' => 'required|integer|min:1|max:1440',
            'is_enabled' => 'boolean',
            'notify_method' => 'required|in:webhook,email',
            'webhook_url' => 'nullable|url',
            'email_recipients' => 'nullable|array',
            'cooldown_minutes' => 'required|integer|min:1|max:1440',
            'description' => 'nullable|string|max:500',
        ]);

        if ($validated['notify_method'] === 'webhook' && empty($validated['webhook_url'])) {
            return response()->json([
                'success' => false,
                'message' => 'Webhook 通知方式需要填写 Webhook URL',
            ], 422);
        }

        $rule = SystemAlertRule::create($validated);

        // 记录系统日志
        SystemLog::system('create_alert_rule', "创建系统告警规则：{$rule->name}", [
            'rule_id' => $rule->id,
            'resource_type' => $rule->resource_type,
            'threshold' => $rule->threshold,
        ]);

        return response()->json([
            'success' => true,
            'data' => $rule,
            'message' => '告警规则创建成功',
        ], 201);
    }

    /**
     * 获取告警规则详情
     */
    public function show(SystemAlertRule $systemAlertRule): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $systemAlertRule,
        ]);
    }

    /**
     * 更新告警规则
     */
    public function update(Request $request, SystemAlertRule $systemAlertRule): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'string|max:100',
            'resource_type' => 'in:cpu,memory,disk',
            'threshold' => 'numeric|min:0|max:100',
            'severity' => 'in:info,warning,critical',
            'check_interval_minutes' => 'integer|min:1|max:1440',
            'is_enabled' => 'boolean',
            'notify_method' => 'in:webhook,email',
            'webhook_url' => 'nullable|url',
            'email_recipients' => 'nullable|array',
            'cooldown_minutes' => 'integer|min:1|max:1440',
            'description' => 'nullable|string|max:500',
        ]);

        $systemAlertRule->update($validated);

        // 记录系统日志
        SystemLog::system('update_alert_rule', "更新系统告警规则：{$systemAlertRule->name}", [
            'rule_id' => $systemAlertRule->id,
        ]);

        return response()->json([
            'success' => true,
            'data' => $systemAlertRule,
            'message' => '告警规则更新成功',
        ]);
    }

    /**
     * 删除告警规则
     */
    public function destroy(SystemAlertRule $systemAlertRule): JsonResponse
    {
        $name = $systemAlertRule->name;
        $systemAlertRule->delete();

        // 记录系统日志
        SystemLog::system('delete_alert_rule', "删除系统告警规则：{$name}");

        return response()->json([
            'success' => true,
            'message' => '告警规则删除成功',
        ]);
    }

    /**
     * 手动检查告警
     */
    public function check(): JsonResponse
    {
        $results = $this->alertService->checkAll();

        return response()->json([
            'success' => true,
            'data' => $results,
        ]);
    }

    /**
     * 获取告警历史列表
     */
    public function histories(Request $request): JsonResponse
    {
        $query = AlertHistory::query();

        if ($request->has('alert_type')) {
            $query->alertType($request->alert_type);
        }

        if ($request->has('resource_type')) {
            $query->forResource($request->resource_type);
        }

        if ($request->has('severity')) {
            $query->severity($request->severity);
        }

        if ($request->has('resolved')) {
            if ($request->boolean('resolved')) {
                $query->resolved();
            } else {
                $query->unresolved();
            }
        }

        $perPage = $request->get('per_page', 20);
        $histories = $query->orderBy('created_at', 'desc')->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $histories,
        ]);
    }

    /**
     * 获取告警历史详情
     */
    public function historyShow(AlertHistory $alertHistory): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $alertHistory,
        ]);
    }

    /**
     * 处理告警
     */
    public function resolve(Request $request, AlertHistory $alertHistory): JsonResponse
    {
        $validated = $request->validate([
            'note' => 'nullable|string|max:500',
        ]);

        $userName = auth()->user()->name ?? 'system';
        $alertHistory->resolve($userName, $validated['note'] ?? null);

        // 记录系统日志
        SystemLog::system('resolve_alert', "处理告警：{$alertHistory->title}", [
            'alert_id' => $alertHistory->id,
            'resolved_by' => $userName,
        ]);

        return response()->json([
            'success' => true,
            'data' => $alertHistory,
            'message' => '告警已处理',
        ]);
    }

    /**
     * 获取告警统计
     */
    public function stats(): JsonResponse
    {
        $total = AlertHistory::count();
        $unresolved = AlertHistory::unresolved()->count();
        $resolved = AlertHistory::resolved()->count();

        // 按严重程度统计
        $bySeverity = AlertHistory::selectRaw('severity, COUNT(*) as count')
            ->groupBy('severity')
            ->pluck('count', 'severity');

        // 按资源类型统计
        $byResource = AlertHistory::selectRaw('resource_type, COUNT(*) as count')
            ->whereNotNull('resource_type')
            ->groupBy('resource_type')
            ->pluck('count', 'resource_type');

        // 最近24小时告警数
        $last24h = AlertHistory::where('created_at', '>=', now()->subDay())->count();

        return response()->json([
            'success' => true,
            'data' => [
                'total' => $total,
                'unresolved' => $unresolved,
                'resolved' => $resolved,
                'by_severity' => $bySeverity,
                'by_resource' => $byResource,
                'last_24h' => $last24h,
            ],
        ]);
    }
}
