<?php

namespace Tests\Feature;

use App\Models\Agent;
use App\Models\ExecutionLog;
use App\Models\User;
use App\Services\AgentExecutor;
use App\Services\OllamaService;
use Mockery;
use Tests\TestCase;

class AgentExecutionTest extends TestCase
{

    private User $user;
    private string $token;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create([
            'role' => 'admin',
            'email' => 'test@test.com',
            'password' => bcrypt('password'),
        ]);

        $this->token = $this->user->createToken('test-token')->plainTextToken;
    }

    public function test_agent_has_executor_fields(): void
    {
        $agent = Agent::create([
            'name' => '测试Agent',
            'type' => 'local',
            'executor_type' => 'ollama',
            'model' => 'qwen2.5:3b',
            'system_prompt' => '你是一个测试助手',
        ]);

        $this->assertEquals('ollama', $agent->executor_type);
        $this->assertEquals('qwen2.5:3b', $agent->model);
        $this->assertEquals('你是一个测试助手', $agent->system_prompt);
    }

    public function test_agent_get_model_name(): void
    {
        // 优先用自己的 model
        $agent = Agent::create([
            'name' => '测试Agent',
            'type' => 'local',
            'model' => 'custom-model',
            'config' => ['model' => 'config-model'],
        ]);
        $this->assertEquals('custom-model', $agent->getModelName());

        // 回退到 config.model
        $agent2 = Agent::create([
            'name' => '测试Agent2',
            'type' => 'local',
            'config' => ['model' => 'config-model'],
        ]);
        $this->assertEquals('config-model', $agent2->getModelName());

        // 都没有则返回默认
        $agent3 = Agent::create([
            'name' => '测试Agent3',
            'type' => 'local',
        ]);
        $this->assertEquals('qwen2.5:3b', $agent3->getModelName());
    }

    public function test_run_endpoint_requires_input(): void
    {
        $agent = Agent::create([
            'name' => '测试Agent',
            'type' => 'local',
            'executor_type' => 'ollama',
        ]);

        $response = $this->withHeader('Authorization', "Bearer {$this->token}")
            ->postJson("/api/agents/{$agent->id}/run", []);

        $response->assertStatus(422);
    }

    public function test_run_endpoint_creates_execution_log(): void
    {
        $agent = Agent::create([
            'name' => '测试Agent',
            'type' => 'local',
            'executor_type' => 'ollama',
            'model' => 'test-model',
        ]);

        // Mock OllamaService
        $ollamaMock = Mockery::mock(OllamaService::class);
        $ollamaMock->shouldReceive('isAvailable')->andReturn(true);
        $ollamaMock->shouldReceive('chatWithModel')->andReturn('你好！我是测试助手。');

        $this->app->instance(OllamaService::class, $ollamaMock);

        $response = $this->withHeader('Authorization', "Bearer {$this->token}")
            ->postJson("/api/agents/{$agent->id}/run", [
                'input' => '你好',
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'status' => 'success',
                    'input' => '你好',
                    'output' => '你好！我是测试助手。',
                ],
            ]);

        // 验证执行日志已创建
        $this->assertDatabaseHas('execution_logs', [
            'agent_id' => $agent->id,
            'status' => 'success',
            'input' => '你好',
        ]);

        // 验证 Agent 状态更新为 online
        $agent->refresh();
        $this->assertEquals('online', $agent->status);
    }

    public function test_run_endpoint_handles_ollama_unavailable(): void
    {
        $agent = Agent::create([
            'name' => '测试Agent',
            'type' => 'local',
            'executor_type' => 'ollama',
        ]);

        // Mock OllamaService 不可用
        $ollamaMock = Mockery::mock(OllamaService::class);
        $ollamaMock->shouldReceive('isAvailable')->andReturn(false);

        $this->app->instance(OllamaService::class, $ollamaMock);

        $response = $this->withHeader('Authorization', "Bearer {$this->token}")
            ->postJson("/api/agents/{$agent->id}/run", [
                'input' => '你好',
            ]);

        $response->assertStatus(500)
            ->assertJson([
                'success' => false,
            ]);

        // 验证 Agent 状态更新为 error
        $agent->refresh();
        $this->assertEquals('error', $agent->status);
    }

    public function test_run_endpoint_rejects_invalid_executor_type(): void
    {
        $agent = Agent::create([
            'name' => '测试Agent',
            'type' => 'local',
            'executor_type' => 'invalid',
        ]);

        // Mock Ollama
        $ollamaMock = Mockery::mock(OllamaService::class);
        $this->app->instance(OllamaService::class, $ollamaMock);

        $response = $this->withHeader('Authorization', "Bearer {$this->token}")
            ->postJson("/api/agents/{$agent->id}/run", [
                'input' => '你好',
            ]);

        $response->assertStatus(500);
    }

    public function test_create_agent_with_executor_fields(): void
    {
        $response = $this->withHeader('Authorization', "Bearer {$this->token}")
            ->postJson('/api/agents', [
                'name' => '新Agent',
                'type' => 'local',
                'executor_type' => 'ollama',
                'model' => 'qwen2.5:3b',
                'system_prompt' => '你是一个新助手',
            ]);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'data' => [
                    'name' => '新Agent',
                    'executor_type' => 'ollama',
                    'model' => 'qwen2.5:3b',
                ],
            ]);
    }

    public function test_update_agent_executor_type(): void
    {
        $agent = Agent::create([
            'name' => '测试Agent',
            'type' => 'local',
            'executor_type' => 'ollama',
        ]);

        $response = $this->withHeader('Authorization', "Bearer {$this->token}")
            ->putJson("/api/agents/{$agent->id}", [
                'executor_type' => 'api',
                'executor_config' => ['api_url' => 'https://api.example.com'],
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'executor_type' => 'api',
                ],
            ]);
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }
}
