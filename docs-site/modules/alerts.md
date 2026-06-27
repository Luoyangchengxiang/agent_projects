# 错误告警系统

## 功能说明

当错误日志数量在指定时间窗口内超过阈值时，自动触发告警通知。

## 数据模型

```php
// AlertRule 字段
name              // 规则名称
error_type        // 错误类型筛选 (null=全部)
severity          // 严重程度筛选 (null=全部)
threshold_count   // 阈值数量
time_window_minutes // 时间窗口 (分钟)
is_enabled        // 是否启用
notify_method     // 通知方式: log / webhook
webhook_url       // Webhook 地址
```

## 后端实现

### AlertService

```php
class AlertService
{
    public function checkAll(): array
    {
        $alerts = [];
        
        foreach (AlertRule::enabled()->get() as $rule) {
            $result = $rule->check();
            
            if ($result['triggered']) {
                $rule->recordTrigger();
                $alert = [
                    'rule_name' => $rule->name,
                    'count' => $result['count'],
                    'threshold' => $result['threshold'],
                ];
                $this->notify($rule, $alert);
                $alerts[] = $alert;
            }
        }
        
        return $alerts;
    }
    
    private function notify(AlertRule $rule, array $alert): void
    {
        match ($rule->notify_method) {
            'webhook' => Http::timeout(5)->post($rule->webhook_url, $alert),
            default => Log::warning("告警触发: {$rule->name}", $alert),
        };
    }
}
```

### AlertRule 模型

```php
class AlertRule extends Model
{
    public function check(): array
    {
        $query = ErrorLog::where('created_at', '>=', 
            now()->subMinutes($this->time_window_minutes));

        if ($this->error_type) {
            $query->where('error_type', $this->error_type);
        }
        if ($this->severity) {
            $query->where('severity', $this->severity);
        }

        $count = $query->count();

        return [
            'triggered' => $count >= $this->threshold_count,
            'count' => $count,
            'threshold' => $this->threshold_count,
        ];
    }
}
```

## API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/alerts | 规则列表 |
| POST | /api/alerts | 创建规则 |
| GET | /api/alerts/check | 检查所有规则 |
| GET | /api/alerts/{id} | 规则详情 |
| PUT | /api/alerts/{id} | 更新规则 |
| DELETE | /api/alerts/{id} | 删除规则 |
| POST | /api/alerts/{id}/check | 检查单条规则 |

## 前端 API

```javascript
// services/alertsApi.js
export const alertsApi = {
  getList: (params) => request.get('/alerts', { params }),
  create: (data) => request.post('/alerts', data),
  update: (id, data) => request.put(`/alerts/${id}`, data),
  delete: (id) => request.delete(`/alerts/${id}`),
  checkAll: () => request.get('/alerts/check'),
  checkRule: (id) => request.post(`/alerts/${id}/check`),
}
```

## 测试用例

```php
// AlertServiceTest.php
public function test_check_returns_triggered_when_threshold_exceeded(): void
{
    $rule = AlertRule::create([
        'name' => '测试规则',
        'error_type' => 'system_error',
        'threshold_count' => 3,
        'time_window_minutes' => 60,
        'is_enabled' => true,
    ]);

    for ($i = 0; $i < 3; $i++) {
        ErrorLog::create([
            'error_type' => 'system_error',
            'message' => "错误 {$i}",
            'severity' => 'critical',
        ]);
    }

    $result = $rule->check();
    $this->assertTrue($result['triggered']);
    $this->assertEquals(3, $result['count']);
}
```
