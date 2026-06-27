# 性能监控系统

## 功能说明

记录 Agent 的 CPU、内存、响应时间等性能指标，支持统计和趋势分析。

## 数据模型

```php
// AgentMetric 字段
agent_id      // 关联 Agent
metric_name   // 指标名: cpu / memory / response_time
metric_value  // 指标值 (浮点数)
tags          // 标签 (JSON)
recorded_at   // 记录时间
```

## 后端实现

### 记录指标

```php
class AgentMetric extends Model
{
    public static function record(
        int $agentId,
        string $metricName,
        float $value,
        ?array $tags = null
    ): self {
        return self::create([
            'agent_id' => $agentId,
            'metric_name' => $metricName,
            'metric_value' => $value,
            'tags' => $tags,
            'recorded_at' => now(),
        ]);
    }
}
```

### 统计分析

```php
// 获取统计
$stats = AgentMetric::getStats($agentId, 'cpu', 60);
// 返回: { count: 100, avg: 45.5, min: 10, max: 90, latest: 55 }

// 获取趋势 (按小时聚合)
$trend = AgentMetric::getTrend($agentId, 'cpu', 24);
// 返回: [{ time, avg, min, max, count }, ...]
```

## API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/metrics | 指标列表 |
| POST | /api/metrics | 记录指标 |
| POST | /api/metrics/batch | 批量记录 |
| GET | /api/metrics/names | 指标类型列表 |
| GET | /api/metrics/{id}/stats | 统计 |
| GET | /api/metrics/{id}/trend | 趋势 |
| GET | /api/metrics/{id}/overview | 概览 |

## 前端 API

```javascript
export const metricsApi = {
  record: (data) => request.post('/metrics', data),
  batchRecord: (metrics) => request.post('/metrics/batch', { metrics }),
  getStats: (agentId, params) => 
    request.get(`/metrics/${agentId}/stats`, { params }),
  getTrend: (agentId, params) => 
    request.get(`/metrics/${agentId}/trend`, { params }),
  getOverview: (agentId) => 
    request.get(`/metrics/${agentId}/overview`),
}
```

## 测试用例

```php
public function test_get_stats_returns_correct_values(): void
{
    foreach ([10, 20, 30, 40, 50] as $value) {
        AgentMetric::record($this->agent->id, 'cpu', $value);
    }

    $stats = AgentMetric::getStats($this->agent->id, 'cpu', 60);

    $this->assertEquals(5, $stats['count']);
    $this->assertEquals(30, $stats['avg']);
    $this->assertEquals(10, $stats['min']);
    $this->assertEquals(50, $stats['max']);
}
```
