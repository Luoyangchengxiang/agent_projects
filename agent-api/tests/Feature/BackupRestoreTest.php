<?php

namespace Tests\Feature;

use Tests\TestCase;

/**
 * 备份/恢复脚本测试
 *
 * 注意：restore 测试不在此处运行，因为 pg_dump 的 TRUNCATE CASCADE
 * 会与 Laravel 的 DatabaseTransactions 冲突。恢复功能通过 backup-db.sh 手动验证。
 */
class BackupRestoreTest extends TestCase
{
    private string $backupDir;
    private string $backupScript;

    protected function setUp(): void
    {
        parent::setUp();
        $this->backupDir = base_path('../backups');
        $this->backupScript = base_path('../backup-db.sh');
    }

    /**
     * 测试备份脚本存在且可执行
     */
    public function test_backup_script_exists(): void
    {
        $this->assertFileExists($this->backupScript);
        $this->assertTrue(is_executable($this->backupScript));
    }

    /**
     * 测试启动脚本存在且可执行
     */
    public function test_start_script_exists(): void
    {
        $startScript = base_path('../start-backend.sh');
        $this->assertFileExists($startScript);
        $this->assertTrue(is_executable($startScript));
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
        $output = shell_exec("bash {$this->backupScript} backup 2>&1");
        $this->assertStringContainsString('备份完成', $output);

        $backups = glob($this->backupDir . '/backup_*.sql.gz');
        $this->assertGreaterThan(0, count($backups), '应生成备份文件');

        // 验证 gzip 魔数
        $latest = end($backups);
        $this->assertGreaterThan(0, filesize($latest));

        $handle = fopen($latest, 'rb');
        $magic = fread($handle, 2);
        fclose($handle);
        $this->assertEquals("\x1f\x8b", $magic, '应为 gzip 格式');
    }

    /**
     * 测试备份保留策略：运行多次后不超过 3 份
     */
    public function test_backup_cleanup_policy(): void
    {
        // 清理
        foreach (glob($this->backupDir . '/backup_*.sql.gz') as $f) unlink($f);

        // 创建 4 个假旧备份
        for ($i = 4; $i >= 1; $i--) {
            $ts = date('Ymd_His', time() - $i * 3600);
            file_put_contents($this->backupDir . "/backup_{$ts}.sql.gz", 'fake');
        }

        // 真实备份触发清理
        shell_exec("bash {$this->backupScript} backup 2>&1");

        $backups = glob($this->backupDir . '/backup_*.sql.gz');
        $this->assertLessThanOrEqual(3, count($backups), '不应超过 3 份');
    }

    /**
     * 测试无备份时恢复优雅跳过
     */
    public function test_restore_with_no_backup_skips(): void
    {
        // 临时移走备份文件
        $tempDir = sys_get_temp_dir() . '/backup_test_' . time();
        mkdir($tempDir);
        foreach (glob($this->backupDir . '/backup_*.sql.gz') as $f) {
            rename($f, $tempDir . '/' . basename($f));
        }

        $output = shell_exec("bash {$this->backupScript} restore 2>&1");
        $this->assertStringContainsString('没有找到备份文件', $output);

        // 恢复备份文件
        foreach (glob($tempDir . '/*.sql.gz') as $f) {
            rename($f, $this->backupDir . '/' . basename($f));
        }
        rmdir($tempDir);
    }

    /**
     * 测试 crontab 已配置自动备份
     */
    public function test_crontab_has_backup_job(): void
    {
        $crontab = shell_exec('crontab -l 2>/dev/null');
        $this->assertStringContainsString('backup-db.sh', $crontab ?? '');
    }

    /**
     * 测试 backup-db.sh 支持三个子命令
     */
    public function test_backup_script_help(): void
    {
        $output = shell_exec("bash {$this->backupScript} help 2>&1");
        $this->assertStringContainsString('backup', $output);
        $this->assertStringContainsString('restore', $output);
        $this->assertStringContainsString('clean', $output);
    }
}
