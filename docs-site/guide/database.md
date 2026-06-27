# 数据库设计

## 核心表结构

### agents (Agent 表)

```sql
CREATE TABLE agents (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    description TEXT,
    config JSONB,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

### error_logs (错误日志)

```sql
CREATE TABLE error_logs (
    id BIGSERIAL PRIMARY KEY,
    error_type VARCHAR(50) NOT NULL,
    error_code VARCHAR(50),
    message TEXT NOT NULL,
    stack_trace TEXT,
    severity VARCHAR(20) DEFAULT 'info',
    is_resolved BOOLEAN DEFAULT false,
    resolution_notes TEXT,
    url VARCHAR(500),
    method VARCHAR(10),
    ip VARCHAR(45),
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE INDEX idx_error_logs_type_date ON error_logs(error_type, created_at);
CREATE INDEX idx_error_logs_severity ON error_logs(severity, created_at);
```

### alert_rules (告警规则)

```sql
CREATE TABLE alert_rules (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    error_type VARCHAR(50),
    severity VARCHAR(20),
    threshold_count INTEGER DEFAULT 10,
    time_window_minutes INTEGER DEFAULT 60,
    is_enabled BOOLEAN DEFAULT true,
    notify_method VARCHAR(20) DEFAULT 'log',
    webhook_url VARCHAR(500),
    last_triggered_at TIMESTAMP,
    trigger_count INTEGER DEFAULT 0,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

### agent_metrics (性能指标)

```sql
CREATE TABLE agent_metrics (
    id BIGSERIAL PRIMARY KEY,
    agent_id BIGINT REFERENCES agents(id) ON DELETE CASCADE,
    metric_name VARCHAR(50) NOT NULL,
    metric_value DOUBLE PRECISION NOT NULL,
    tags JSONB,
    recorded_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE INDEX idx_metrics_agent_name_time ON agent_metrics(agent_id, metric_name, recorded_at);
```

## 迁移命令

```bash
# 创建迁移
php artisan make:migration create_agents_table

# 运行迁移
php artisan migrate

# 回滚
php artisan migrate:rollback

# 重置
php artisan migrate:fresh
```

## 常用查询模式

### 分页 + 筛选

```php
$agents = Agent::query()
    ->when($request->status, fn($q, $s) => $q->where('status', $s))
    ->orderBy('created_at', 'desc')
    ->paginate($request->get('per_page', 20));
```

### 聚合统计

```php
$stats = ErrorLog::selectRaw('
    severity,
    COUNT(*) as total,
    SUM(CASE WHEN is_resolved THEN 1 ELSE 0 END) as resolved
')
->groupBy('severity')
->get();
```

### JSON 查询

```php
// PostgreSQL JSON 查询
$agents = Agent::where('config->model', 'qwen2.5')->get();
```
