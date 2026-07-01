<?php

namespace Tests\Feature;

use App\Models\Setting;
use App\Models\User;
use Tests\TestCase;

class SettingTest extends TestCase
{

    private User $admin;
    private string $token;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create([
            'role' => 'admin',
            'email' => 'admin@test.com',
            'password' => bcrypt('password'),
        ]);

        $this->token = $this->admin->createToken('test-token')->plainTextToken;
    }

    public function test_can_get_all_settings(): void
    {
        Setting::setValue('ollama.base_url', 'http://localhost:11434', 'string', 'Ollama地址', 'ollama');
        Setting::setValue('system.name', 'Test System', 'string', '系统名', 'system');

        $response = $this->withHeader('Authorization', "Bearer {$this->token}")
            ->getJson('/api/settings');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'ollama' => ['ollama.base_url' => 'http://localhost:11434'],
                    'system' => ['system.name' => 'Test System'],
                ],
            ]);
    }

    public function test_can_get_settings_by_group(): void
    {
        Setting::setValue('ollama.base_url', 'http://localhost:11434', 'string', '', 'ollama');
        Setting::setValue('system.name', 'Test', 'string', '', 'system');

        $response = $this->withHeader('Authorization', "Bearer {$this->token}")
            ->getJson('/api/settings?group=ollama');

        $response->assertStatus(200);
        $data = $response->json('data');
        $this->assertArrayHasKey('ollama', $data);
        $this->assertArrayNotHasKey('system', $data);
    }

    public function test_can_update_settings(): void
    {
        Setting::setValue('ollama.base_url', 'http://old:11434', 'string', 'Ollama地址', 'ollama');

        $response = $this->withHeader('Authorization', "Bearer {$this->token}")
            ->postJson('/api/settings', [
                'group' => 'ollama',
                'settings' => [
                    'ollama.base_url' => 'http://new:11434',
                ],
            ]);

        $response->assertStatus(200)
            ->assertJson(['success' => true]);

        $this->assertEquals('http://new:11434', Setting::getValue('ollama.base_url'));
    }

    public function test_can_create_new_setting(): void
    {
        $response = $this->withHeader('Authorization', "Bearer {$this->token}")
            ->postJson('/api/settings', [
                'group' => 'system',
                'settings' => [
                    'system.new_key' => 'new_value',
                ],
            ]);

        $response->assertStatus(200);
        $this->assertEquals('new_value', Setting::getValue('system.new_key'));
    }

    public function test_can_get_single_setting(): void
    {
        Setting::setValue('ollama.base_url', 'http://localhost:11434', 'string', 'Ollama地址', 'ollama');

        $response = $this->withHeader('Authorization', "Bearer {$this->token}")
            ->getJson('/api/settings/ollama.base_url');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'key' => 'ollama.base_url',
                    'value' => 'http://localhost:11434',
                    'type' => 'string',
                    'group' => 'ollama',
                ],
            ]);
    }

    public function test_404_for_nonexistent_setting(): void
    {
        $response = $this->withHeader('Authorization', "Bearer {$this->token}")
            ->getJson('/api/settings/nonexistent.key');

        $response->assertStatus(404);
    }

    public function test_setting_model_type_casting(): void
    {
        Setting::setValue('bool_key', '1', 'boolean', '', 'test');
        Setting::setValue('num_key', '42.5', 'number', '', 'test');
        Setting::setValue('json_key', ['a' => 1], 'json', '', 'test');

        $this->assertTrue(Setting::getValue('bool_key'));
        $this->assertEquals(42.5, Setting::getValue('num_key'));
        $this->assertEquals(['a' => 1], Setting::getValue('json_key'));
    }

    public function test_setting_model_get_group(): void
    {
        Setting::setValue('a.key1', 'val1', 'string', '', 'group_a');
        Setting::setValue('a.key2', 'val2', 'string', '', 'group_a');
        Setting::setValue('b.key1', 'val3', 'string', '', 'group_b');

        $groupA = Setting::getGroup('group_a');
        $this->assertCount(2, $groupA);
        $this->assertEquals('val1', $groupA['a.key1']);
    }

    public function test_setting_requires_auth(): void
    {
        $response = $this->getJson('/api/settings');
        $response->assertStatus(401);
    }
}
