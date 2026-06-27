# 性能指标 API

## 记录指标

```
POST /api/metrics

{
  "agent_id": 1,
  "metric_name": "cpu",
  "metric_value": 55.5,
  "tags": { "host": "server1" }
}
```

## 批量记录

```
POST /api/metrics/batch

{
  "metrics": [
    { "agent_id": 1, "metric_name": "cpu", "metric_value": 50 },
    { "agent_id": 1, "metric_name": "memory", "metric_value": 70 }
  ]
}
```

## 获取统计

```
GET /api/metrics/{agentId}/stats?metric_name=cpu&minutes=60
```

**响应：**

```json
{
  "success": true,
  "data": {
    "count": 100,
    "avg": 45.5,
    "min": 10,
    "max": 90,
    "latest": 55
  }
}
```

## 获取趋势

```
GET /api/metrics/{agentId}/trend?metric_name=cpu&hours=24
```

**响应：**

```json
{
  "success": true,
  "data": [
    {
      "time": "2026-06-27T10:00:00",
      "avg": 45,
      "min": 30,
      "max": 60,
      "count": 10
    }
  ]
}
```

## 获取概览

```
GET /api/metrics/{agentId}/overview
```
