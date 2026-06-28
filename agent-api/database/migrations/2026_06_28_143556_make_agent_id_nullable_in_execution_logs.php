<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('execution_logs', function (Blueprint $table) {
            // 让 agent_id 可以为空（团队执行时不需要关联具体智能体）
            $table->integer('agent_id')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('execution_logs', function (Blueprint $table) {
            // 恢复为不可为空
            $table->integer('agent_id')->nullable(false)->change();
        });
    }
};
