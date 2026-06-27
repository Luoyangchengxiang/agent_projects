<?php

namespace Tests\Feature;

use Tests\TestCase;

/**
 * 备份/恢复脚本测试
 *
 * 部分测试依赖本地环境（.env、crontab、pg_dump），CI 环境自动跳过。
 * 恢复功能通过 backup-db.sh 手动验证（与 Laravel 事务冲突无法自动化）。
 */
class BackupRestoreTest extends TestCase
{
    private string $backupDir;
    private string $backupScript;
    private bool $isCI;

    protected function setUp(): void
    {
        parent::setUp();
        $this->backupDir = base_path('../backups');
        $this->backupScript = base_path('../backup-db.sh');
        $this->isCI = getenv('CI') === 'true' || getenv('GITHUB_ACTIONS') === 'true';
    }

    /**
     * 测试备份脚本存在
     */
    public function test_backup_script_exists(): void
    {
        $this->assertFileExists($this->backupScript);
    }

    /**
     * 测试启动脚本存在
     */
    public function test_start_script_exists(): void
    {
        $this->assertFileExists(base_path('../start-backend.sh'));
    }

    /**
     * 测试 backups 目录存在
     */
    public function test_backup_directory_exists(): void
    {
        $this->assertDirectoryExists($this->backupDir);
    }

    /**
     * 测试备份功能：生成 gzip 文件
     */
    public function test_backup_creates_gzip_file(): void
    {
        if ($this->isCI) {
            $this->markTestSkipped('需要本地 .env 和 PostgreSQL');
        }

        $output = shell_exec("bash {$this->backupScript} backup 2>&1");
        $this->assertStringContainsString('备份完成', $output);

        $backups = glob($this->backupDir . '/backup_*.sql.gz');
        $this->assertGreaterThan(0, count($backups));

        $latest = end($backups);
        $this->assertGreaterThan(0, filesize($latest));

        // 验证 gzip 魔数
        $handle = fopen($latest, 'rb');
        $magic = fread($handle, 2);
        fclose($handle);
        $this->assertEquals("\x1f\x8b", $magic);
    }

    /**
     * 测试备份保留策略
     */
    public function test_backup_cleanup_policy(): void
    {
        if ($this->isCI) {
            $this->markTestSkipped('需要本地 .env 和 PostgreSQL');
        }

        foreach (glob($this->backupDir . '/backup_*.sql.gz') as $f) unlink($f);

        // 创建 4 个假旧备份
        for ($i = 4; $i >= 1; $i--) {
            $ts = date('Ymd_His', time() - $i * 3600);
            file_put_contents($this->backupDir . "/backup_{$ts}.sql.gz", 'fake');
        }

        shell_exec("bash {$this->backupScript} backup 2>&1");

        $backups = glob($this->backupDir . '/backup_*.sql.gz');
        $this->assertLessThanOrEqual(3, count($backups));
    }

    /**
     * 测试无备份时恢复优雅跳过
     */
    public function test_restore_with_no_backup_skips(): void
    {
        if ($this->isCI) {
            $this->markTestSkipped('需要本地 .env 和 PostgreSQL');
        }

        // 临时移走备份文件
        $tempDir = sys_get_temp_dir() . '/backup_test_' . time();
        mkdir($tempDir);
        $moved = [];
        foreach (glob($this->backupDir . '/backup_*.sql.gz') as $f) {
            rename($f, $tempDir . '/' . basename($f));
            $moved[] = basename($f);
        }

        $output = shell_exec("bash {$this->backupScript} restore 2>&1");
        $this->assertStringContainsString('没有找到备份文件', $output);

        // 恢复
        foreach ($moved as $name) {
            rename($tempDir . '/' . $name, $this->backupDir . '/' . $name);
        }
        rmdir($tempDir);
    }

    /**
     * 测试 crontab 已配置
     */
    public function test_crontab_has_backup_job(): void
    {
        if ($this->isCI) {
            $this->markTestSkipped('CI 环境无 crontab');
        }

        $crontab = shell_exec('crontab -l 2>/dev/null');
        $this->assertStringContainsString('backup-db.sh', $crontab ?? '');
    }

    /**
     * 测试 backup-db.sh 支持三个子命令
     */
    public function test_backup_script_help(): void
    {
        if ($this->isCI) {
            $this->markTestSkipped('需要本地 .env');
        }

        $output = shell_exec("bash {$this->backupScript} help 2>&1");
        $this->assertStringContainsString('backup', $output);
        $this->assertStringContainsString('restore', $output);
        $this->assertStringContainsString('clean', $output);
    }
}
