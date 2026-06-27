# 告警规则 API

## 列表

```
GET /api/alerts?is_enabled=true
```

## 创建

```
POST /api/alerts

{
  "name": "系统错误过多",
  "error_type": "system_error",
  "severity": "critical",
  "threshold_count": 10,
  "time_window_minutes": 60,
  "notify_method": "webhook",
  "webhook_url": "https://hooks.example.com/alert"
}
```

## 检查所有规则

```
GET /api/alerts/check
```

**响应：**

```json
{
  "success": true,
  "data": {
    "alerts": [
      {
        "rule_name": "系统错误过多",
        "count": 15,
        "threshold": 10,
        "triggered_at": "2026-06-27T12:00:00Z"
      }
    ],
    "triggered_count": 1
  }
}
```

## 检查单条规则

```
POST /api/alerts/{id}/check
```
