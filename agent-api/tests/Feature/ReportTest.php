<?php

namespace Tests\Feature;

use App\Models\Agent;
use App\Models\ErrorLog;
use App\Models\ExecutionLog;
use App\Models\Report;
use App\Models\User;
use App\Services\ReportService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReportTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private string $token;
    private ReportService $reportService;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create([
            'role' => 'admin',
            'email' => 'admin@test.com',
            'password' => bcrypt('password'),
        ]);
        $this->token = $this->user->createToken('test')->plainTextToken;
        $this->reportService = new ReportService();
    }

    public function test_generate_weekly_report(): void
    {
        $agent = Agent::create(['name' => '测试Agent', 'type' => 'local', 'status' => 'online']);

        // 创建上周的执行日志（周报统计的是上周）
        $lastWeek = now()->subWeek()->startOfWeek()->addDays(2);
        for ($i = 0; $i < 5; $i++) {
            ExecutionLog::create([
                'agent_id' => $agent->id,
                'task_id' => "task_{$i}",
                'status' => $i < 4 ? 'success' : 'failed',
                'input' => "输入{$i}",
                'output' => "输出{$i}",
                'duration' => 100 + $i * 50,
                'error' => $i >= 4 ? '测试错误' : null,
                'created_at' => $lastWeek->copy()->addHours($i),
            ]);
        }

        $report = $this->reportService->generateWeeklyReport($this->user->id);

        $this->assertInstanceOf(Report::class, $report);
        $this->assertEquals('weekly', $report->type);
        $this->assertNotNull($report->content);
        $this->assertStringContainsString('执行概览', $report->content);
        $this->assertNotNull($report->file_path);
        $this->assertFileExists($report->file_path);
        $this->assertEquals(5, $report->metadata['total_logs']);
        $this->assertEquals(4, $report->metadata['success_count']);
        $this->assertEquals(1, $report->metadata['failed_count']);
    }

    public function test_generate_monthly_report(): void
    {
        $report = $this->reportService->generateMonthlyReport($this->user->id);

        $this->assertEquals('monthly', $report->type);
        $this->assertStringContainsString('月报', $report->title);
    }

    public function test_generate_selection_report(): void
    {
        $report = $this->reportService->generateSelectionReport($this->user->id);

        $this->assertEquals('selection', $report->type);
        $this->assertStringContainsString('选品报告', $report->title);
    }

    public function test_generate_custom_report(): void
    {
        $report = $this->reportService->generateCustomReport(
            '2026-06-01',
            '2026-06-27',
            $this->user->id
        );

        $this->assertEquals('custom', $report->type);
        $this->assertEquals('2026-06-01', $report->metadata['start_date']);
        $this->assertEquals('2026-06-27', $report->metadata['end_date']);
    }

    public function test_report_includes_error_stats(): void
    {
        $lastWeek = now()->subWeek()->startOfWeek()->addDays(2)->format('Y-m-d H:i:s');

        \Illuminate\Support\Facades\DB::table('error_logs')->insert([
            'error_type' => 'system_error',
            'message' => '测试错误',
            'severity' => 'critical',
            'created_at' => $lastWeek,
            'updated_at' => $lastWeek,
        ]);

        $report = $this->reportService->generateWeeklyReport();
        $this->assertGreaterThan(0, $report->metadata['total_errors']);
    }

    public function test_report_includes_agent_status(): void
    {
        Agent::create(['name' => '在线Agent', 'type' => 'local', 'status' => 'online']);
        Agent::create(['name' => '离线Agent', 'type' => 'local', 'status' => 'offline']);

        $report = $this->reportService->generateWeeklyReport();
        $this->assertEquals(2, $report->metadata['total_agents']);
    }

    public function test_report_csv_download(): void
    {
        $agent = Agent::create(['name' => '下载测试', 'type' => 'local']);
        ExecutionLog::create([
            'agent_id' => $agent->id,
            'task_id' => 'dl1',
            'status' => 'success',
            'input' => '测试输入',
            'output' => '测试输出',
        ]);

        $report = $this->reportService->generateWeeklyReport();

        $response = $this->withHeader('Authorization', "Bearer {$this->token}")
            ->get("/api/reports/{$report->id}/download");

        $response->assertStatus(200);
        $response->assertHeaderContains('Content-Type', 'text/csv');
    }

    public function test_report_list_api(): void
    {
        $this->reportService->generateWeeklyReport($this->user->id);

        $response = $this->withHeader('Authorization', "Bearer {$this->token}")
            ->getJson('/api/reports');

        $response->assertStatus(200)
            ->assertJson(['success' => true]);
    }

    public function test_report_delete(): void
    {
        $report = $this->reportService->generateWeeklyReport($this->user->id);
        $filePath = $report->file_path;

        $response = $this->withHeader('Authorization', "Bearer {$this->token}")
            ->deleteJson("/api/reports/{$report->id}");

        $response->assertStatus(200);
        $this->assertDatabaseMissing('reports', ['id' => $report->id]);
        $this->assertFileDoesNotExist($filePath);
    }

    public function test_report_requires_auth(): void
    {
        $response = $this->getJson('/api/reports');
        $response->assertStatus(401);
    }

    public function test_generate_report_endpoint(): void
    {
        $response = $this->withHeader('Authorization', "Bearer {$this->token}")
            ->postJson('/api/reports/generate/weekly');

        $response->assertStatus(200)
            ->assertJson(['success' => true]);
    }
}
