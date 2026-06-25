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
        Schema::create('execution_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('agent_id')->constrained()->onDelete('cascade');
            $table->string('task_id')->comment('任务ID');
            $table->string('status')->comment('状态：pending/running/success/failed');
            $table->text('input')->nullable()->comment('输入');
            $table->text('output')->nullable()->comment('输出');
            $table->json('context')->nullable()->comment('上下文');
            $table->integer('duration')->nullable()->comment('耗时(ms)');
            $table->text('error')->nullable()->comment('错误信息');
            $table->timestamps();

            $table->index(['agent_id', 'created_at']);
            $table->index(['task_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('execution_logs');
    }
};
