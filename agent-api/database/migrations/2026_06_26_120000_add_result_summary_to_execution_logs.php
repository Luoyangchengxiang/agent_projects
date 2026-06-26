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
            $table->text('result_summary')->nullable()->after('output')->comment('执行结果汇总');
            $table->string('agent_group')->nullable()->after('agent_id')->comment('智能体组');
            $table->index(['agent_group', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('execution_logs', function (Blueprint $table) {
            $table->dropColumn(['result_summary', 'agent_group']);
            $table->dropIndex(['agent_group', 'created_at']);
        });
    }
};
