<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;

abstract class TestCase extends BaseTestCase
{
    use DatabaseTransactions;

    /**
     * 清理所有业务表数据（DELETE 可被事务回滚，不影响生产数据）
     */
    protected function cleanTables(): void
    {
        $tables = DB::select("
            SELECT tablename FROM pg_tables 
            WHERE schemaname = 'public' 
            AND tablename NOT IN ('migrations', 'personal_access_tokens')
        ");
        
        // 按依赖关系逆序删除（先删子表）
        foreach ($tables as $table) {
            DB::statement("DELETE FROM \"{$table->tablename}\"");
        }
    }

    /**
     * 在事务内清理表，确保干净状态（回滚后生产数据不受影响）
     */
    protected function setUp(): void
    {
        parent::setUp();
        $this->cleanTables();
    }
}
