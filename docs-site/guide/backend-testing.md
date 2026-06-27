# 后端测试编写

## 测试框架

- **PHPUnit**: Laravel 默认测试框架
- **Laravel TestCase**: 封装了 HTTP 测试、数据库测试

## 测试文件结构

```
tests/
├── Unit/
│   ├── ApiRateLimitTest.php   # 中间件测试
│   ├── AlertServiceTest.php  # 服务测试
│   └── AgentMetricTest.php   # 模型测试
└── Feature/
    └── ExampleTest.php
```

## 编写模型测试

```php
<?php

namespace Tests\Unit\Models;

use App\Models\AgentMetric;
use Tests\TestCase;

class AgentMetricTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        // 清理测试数据
        AgentMetric::where('agent_id', $this->agent->id)->delete();
    }

    public function test_record_creates_metric(): void
    {
        $metric = AgentMetric::record(1, 'cpu', 55.5);

        $this->assertNotNull($metric->id);
        $this->assertEquals('cpu', $metric->metric_name);
        $this->assertEquals(55.5, $metric->metric_value);
    }

    public function test_get_stats_returns_correct_values(): void
    {
        foreach ([10, 20, 30] as $value) {
            AgentMetric::record(1, 'cpu', $value);
        }

        $stats = AgentMetric::getStats(1, 'cpu', 60);

        $this->assertEquals(3, $stats['count']);
        $this->assertEquals(20, $stats['avg']);
    }
}
```

## 编写中间件测试

```php
class ApiRateLimitTest extends TestCase
{
    private ApiRateLimit $middleware;

    protected function setUp(): void
    {
        parent::setUp();
        $this->middleware = new ApiRateLimit();
        Cache::flush();
    }

    private function handleRequest(string $method, string $path): Response
    {
        $request = Request::create("/api/{$path}", $method);
        return $this->middleware->handle($request, function () {
            return response()->json(['success' => true]);
        });
    }

    public function test_get_bypasses_rate_limit(): void
    {
        for ($i = 0; $i < 50; $i++) {
            $response = $this->handleRequest('GET', 'agents');
            $this->assertEquals(200, $response->getStatusCode());
        }
    }
}
```

## 运行测试

```bash
# 运行所有测试
vendor/bin/phpunit

# 运行指定测试类
vendor/bin/phpunit --filter=AlertServiceTest

# 运行指定方法
vendor/bin/phpunit --filter=test_record_creates_metric
```

## phpunit.xml 配置

```xml
<phpunit>
    <php>
        <env name="APP_ENV" value="testing"/>
        <env name="CACHE_STORE" value="array"/>
        <env name="QUEUE_CONNECTION" value="sync"/>
    </php>
</phpunit>
```
