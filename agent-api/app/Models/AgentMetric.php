<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AgentMetric extends BaseModel
{
    protected $fillable = [
        'agent_id',
        'metric_name',
        'metric_value',
        'tags',
        'recorded_at',
    ];

    protected $casts = [
        'metric_value' => 'float',
        'tags' => 'array',
        'recorded_at' => 'datetime',
    ];

    public function agent(): BelongsTo
    {
        return $this->belongsTo(Agent::class);
    }

    /**
     * 按指标名筛选
     */
    public function scopeOfMetric(Builder $query, string $name): Builder
    {
        return $query->where('metric_name', $name);
    }

    /**
     * 按时间范围筛选
     */
    public function scopeDateRange(Builder $query, string $start, string $end): Builder
    {
        return $query->whereBetween('recorded_at', [$start, $end]);
    }

    /**
     * 最近N条记录
     */
    public function scopeRecent(Builder $query, int $limit = 100): Builder
    {
        return $query->orderBy('recorded_at', 'desc')->limit($limit);
    }

    /**
     * 获取指标汇总统计
     */
    public static function getStats(int $agentId, string $metricName, int $minutes = 60): array
    {
        $query = self::where('agent_id', $agentId)
            ->where('metric_name', $metricName)
            ->where('recorded_at', '>=', now()->subMinutes($minutes));

        $values = $query->pluck('metric_value');

        if ($values->isEmpty()) {
            return [
                'count' => 0,
                'avg' => 0,
                'min' => 0,
                'max' => 0,
                'latest' => 0,
            ];
        }

        return [
            'count' => $values->count(),
            'avg' => round($values->avg(), 2),
            'min' => round($values->min(), 2),
            'max' => round($values->max(), 2),
            'latest' => round($values->last(), 2),
        ];
    }

    /**
     * 获取趋势数据（按小时聚合）
     */
    public static function getTrend(int $agentId, string $metricName, int $hours = 24): array
    {
        return self::where('agent_id', $agentId)
            ->where('metric_name', $metricName)
            ->where('recorded_at', '>=', now()->subHours($hours))
            ->selectRaw("DATE_TRUNC('hour', recorded_at) as time_bucket, AVG(metric_value) as avg_value, MIN(metric_value) as min_value, MAX(metric_value) as max_value, COUNT(*) as sample_count")
            ->groupBy('time_bucket')
            ->orderBy('time_bucket')
            ->get()
            ->map(fn ($row) => [
                'time' => $row->time_bucket,
                'avg' => round($row->avg_value, 2),
                'min' => round($row->min_value, 2),
                'max' => round($row->max_value, 2),
                'count' => $row->sample_count,
            ])
            ->toArray();
    }

    /**
     * 记录指标
     */
    public static function record(
        int $agentId,
        string $metricName,
        float $value,
        ?array $tags = null,
        ?string $recordedAt = null
    ): self {
        return self::create([
            'agent_id' => $agentId,
            'metric_name' => $metricName,
            'metric_value' => $value,
            'tags' => $tags,
            'recorded_at' => $recordedAt ?? now(),
        ]);
    }
}
