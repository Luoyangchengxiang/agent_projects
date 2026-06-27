<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Agent;
use App\Models\AgentMetric;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class MetricController extends Controller
{
    /**
     * 获取指标列表
     */
    public function index(Request $request): JsonResponse
    {
        $query = AgentMetric::query();

        if ($request->has('agent_id')) {
            $query->where('agent_id', $request->agent_id);
        }

        if ($request->has('metric_name')) {
            $query->ofMetric($request->metric_name);
        }

        if ($request->has('start_date') && $request->has('end_date')) {
            $query->dateRange($request->start_date, $request->end_date);
        }

        $perPage = $request->get('per_page', 50);
        $metrics = $query->orderBy('recorded_at', 'desc')->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $metrics,
        ]);
    }

    /**
     * 记录指标
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'agent_id' => 'required|exists:agents,id',
            'metric_name' => 'required|string|max:50',
            'metric_value' => 'required|numeric',
            'tags' => 'nullable|array',
            'recorded_at' => 'nullable|date',
        ]);

        $metric = AgentMetric::record(
            $validated['agent_id'],
            $validated['metric_name'],
            (float) $validated['metric_value'],
            $validated['tags'] ?? null,
            $validated['recorded_at'] ?? null,
        );

        return response()->json([
            'success' => true,
            'data' => $metric,
            'message' => '指标记录成功',
        ], 201);
    }

    /**
     * 批量记录指标
     */
    public function batchStore(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'metrics' => 'required|array|min:1|max:100',
            'metrics.*.agent_id' => 'required|exists:agents,id',
            'metrics.*.metric_name' => 'required|string|max:50',
            'metrics.*.metric_value' => 'required|numeric',
            'metrics.*.tags' => 'nullable|array',
            'metrics.*.recorded_at' => 'nullable|date',
        ]);

        $count = 0;
        foreach ($validated['metrics'] as $item) {
            AgentMetric::record(
                $item['agent_id'],
                $item['metric_name'],
                (float) $item['metric_value'],
                $item['tags'] ?? null,
                $item['recorded_at'] ?? null,
            );
            $count++;
        }

        return response()->json([
            'success' => true,
            'data' => ['recorded_count' => $count],
            'message' => "成功记录 {$count} 条指标",
        ], 201);
    }

    /**
     * 获取指标统计
     */
    public function stats(Request $request, int $agentId): JsonResponse
    {
        $metricName = $request->get('metric_name', 'cpu');
        $minutes = (int) $request->get('minutes', 60);

        $stats = AgentMetric::getStats($agentId, $metricName, $minutes);

        return response()->json([
            'success' => true,
            'data' => $stats,
        ]);
    }

    /**
     * 获取指标趋势
     */
    public function trend(Request $request, int $agentId): JsonResponse
    {
        $metricName = $request->get('metric_name', 'cpu');
        $hours = (int) $request->get('hours', 24);

        $trend = AgentMetric::getTrend($agentId, $metricName, $hours);

        return response()->json([
            'success' => true,
            'data' => $trend,
        ]);
    }

    /**
     * 获取所有指标类型
     */
    public function metricNames(): JsonResponse
    {
        $names = AgentMetric::distinct()->pluck('metric_name');

        return response()->json([
            'success' => true,
            'data' => $names,
        ]);
    }

    /**
     * 获取 Agent 概览（所有指标最新值）
     */
    public function overview(int $agentId): JsonResponse
    {
        $metrics = AgentMetric::where('agent_id', $agentId)
            ->selectRaw("metric_name, AVG(metric_value) as avg_value, MAX(metric_value) as max_value, COUNT(*) as count")
            ->groupBy('metric_name')
            ->get()
            ->mapWithKeys(fn ($m) => [$m->metric_name => [
                'avg' => round($m->avg_value, 2),
                'max' => round($m->max_value, 2),
                'count' => $m->count,
            ]]);

        return response()->json([
            'success' => true,
            'data' => $metrics,
        ]);
    }

    /**
     * 删除指标数据
     */
    public function destroy(Request $request): JsonResponse
    {
        $request->validate([
            'agent_id' => 'required|exists:agents,id',
            'before_date' => 'nullable|date',
        ]);

        $query = AgentMetric::where('agent_id', $request->agent_id);

        if ($request->has('before_date')) {
            $query->where('recorded_at', '<', $request->before_date);
        }

        $deleted = $query->delete();

        return response()->json([
            'success' => true,
            'data' => ['deleted_count' => $deleted],
            'message' => "已删除 {$deleted} 条指标数据",
        ]);
    }
}
