<?php

namespace Tests\Unit\Middleware;

use App\Http\Middleware\ApiRateLimit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;
use Symfony\Component\HttpFoundation\Response;

class ApiRateLimitTest extends TestCase
{
    private ApiRateLimit $middleware;

    protected function setUp(): void
    {
        parent::setUp();

        $this->middleware = new ApiRateLimit();

        // 清除限流缓存
        Cache::flush();
    }

    /**
     * 创建请求并通过中间件
     */
    private function handleRequest(string $method, string $path): Response
    {
        $request = Request::create("http://localhost/api/{$path}", $method);
        return $this->middleware->handle($request, function () {
            return response()->json(['success' => true]);
        });
    }

    // ========== GET 请求不限流 ==========

    public function test_get_requests_bypass_rate_limit(): void
    {
        // 50 个 GET 请求全部应成功
        for ($i = 0; $i < 50; $i++) {
            $response = $this->handleRequest('GET', 'agents');
            $this->assertEquals(200, $response->getStatusCode());
        }
    }

    public function test_head_requests_bypass_rate_limit(): void
    {
        $response = $this->handleRequest('HEAD', 'agents');
        $this->assertEquals(200, $response->getStatusCode());
    }

    public function test_options_requests_bypass_rate_limit(): void
    {
        $response = $this->handleRequest('OPTIONS', 'agents');
        $this->assertEquals(200, $response->getStatusCode());
    }

    // ========== POST 请求限流 ==========

    public function test_post_requests_within_limit_succeed(): void
    {
        // 60 个 POST 请求在 10 秒窗口内应全部成功
        for ($i = 0; $i < 60; $i++) {
            $response = $this->handleRequest('POST', 'agents');
            $this->assertEquals(200, $response->getStatusCode());
        }
    }

    public function test_post_requests_exceed_limit_return_429(): void
    {
        // 触发限流
        for ($i = 0; $i < 60; $i++) {
            $this->handleRequest('POST', 'agents');
        }

        // 第 61 个应返回 429
        $response = $this->handleRequest('POST', 'agents');
        $this->assertEquals(429, $response->getStatusCode());

        $data = json_decode($response->getContent(), true);
        $this->assertEquals('rate_limit', $data['error_type']);
        $this->assertArrayHasKey('retry_after', $data);
    }

    public function test_429_response_has_retry_after_header(): void
    {
        for ($i = 0; $i < 60; $i++) {
            $this->handleRequest('POST', 'agents');
        }

        $response = $this->handleRequest('POST', 'agents');
        $this->assertEquals(429, $response->getStatusCode());
        $this->assertNotEmpty($response->headers->get('Retry-After'));
    }

    // ========== 登录接口限流（20次/分钟） ==========

    public function test_login_rate_limit_is_20_per_minute(): void
    {
        // 20 个登录请求应成功
        for ($i = 0; $i < 20; $i++) {
            $response = $this->handleRequest('POST', 'auth/login');
            $this->assertEquals(200, $response->getStatusCode());
        }

        // 第 21 个应返回 429
        $response = $this->handleRequest('POST', 'auth/login');
        $this->assertEquals(429, $response->getStatusCode());
    }

    // ========== 注册接口限流（5次/分钟） ==========

    public function test_register_rate_limit_is_5_per_minute(): void
    {
        for ($i = 0; $i < 5; $i++) {
            $response = $this->handleRequest('POST', 'auth/register');
            $this->assertEquals(200, $response->getStatusCode());
        }

        $response = $this->handleRequest('POST', 'auth/register');
        $this->assertEquals(429, $response->getStatusCode());
    }

    // ========== 不同接口独立计数 ==========

    public function test_different_route_groups_have_independent_counters(): void
    {
        // login 和 default 是独立的路由组
        // 触发 login 限流（20次/分钟）
        for ($i = 0; $i < 20; $i++) {
            $this->handleRequest('POST', 'auth/login');
        }
        $response = $this->handleRequest('POST', 'auth/login');
        $this->assertEquals(429, $response->getStatusCode());

        // default 组不受 login 限流影响
        $response = $this->handleRequest('POST', 'agents');
        $this->assertEquals(200, $response->getStatusCode());
    }

    // ========== 响应头 ==========

    public function test_successful_response_has_ratelimit_headers(): void
    {
        $response = $this->handleRequest('POST', 'agents');

        $this->assertEquals(200, $response->getStatusCode());
        $this->assertNotEmpty($response->headers->get('X-RateLimit-Limit'));
        $this->assertNotEmpty($response->headers->get('X-RateLimit-Remaining'));
    }

    public function test_ratelimit_remaining_decreases(): void
    {
        $first = $this->handleRequest('POST', 'agents');
        $second = $this->handleRequest('POST', 'agents');

        $firstRemaining = (int) $first->headers->get('X-RateLimit-Remaining');
        $secondRemaining = (int) $second->headers->get('X-RateLimit-Remaining');

        $this->assertGreaterThan($secondRemaining, $firstRemaining);
    }

    // ========== PUT/DELETE 也限流 ==========

    public function test_put_requests_are_rate_limited(): void
    {
        for ($i = 0; $i < 60; $i++) {
            $this->handleRequest('PUT', 'agents/1');
        }

        $response = $this->handleRequest('PUT', 'agents/1');
        $this->assertEquals(429, $response->getStatusCode());
    }

    public function test_delete_requests_are_rate_limited(): void
    {
        for ($i = 0; $i < 60; $i++) {
            $this->handleRequest('DELETE', 'agents/1');
        }

        $response = $this->handleRequest('DELETE', 'agents/1');
        $this->assertEquals(429, $response->getStatusCode());
    }
}
