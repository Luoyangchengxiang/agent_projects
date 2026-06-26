<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cronjobs', function (Blueprint $table) {
            $table->id();
            $table->string('name');                          // 任务名称
            $table->text('prompt')->nullable();              // 任务提示词
            $table->string('schedule');                      // Cron 表达式
            $table->string('status', 20)->default('active'); // active/paused/error
            $table->json('config')->nullable();              // 任务配置（模型、技能等）
            $table->timestamp('last_run_at')->nullable();    // 上次执行时间
            $table->timestamp('next_run_at')->nullable();    // 下次执行时间
            $table->integer('run_count')->default(0);        // 执行次数
            $table->integer('fail_count')->default(0);       // 失败次数
            $table->text('last_error')->nullable();          // 最近错误信息
            $table->unsignedBigInteger('created_by')->nullable();
            $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();
            $table->timestamps();

            $table->index('status');
            $table->index('next_run_at');
        });

        Schema::create('cronjob_logs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('cronjob_id');
            $table->foreign('cronjob_id')->references('id')->on('cronjobs')->onDelete('cascade');
            $table->string('status', 20);                   // success/failed/timeout
            $table->text('output')->nullable();              // 执行输出
            $table->text('error')->nullable();               // 错误信息
            $table->integer('duration')->nullable();         // 耗时（毫秒）
            $table->timestamps();

            $table->index(['cronjob_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cronjob_logs');
        Schema::dropIfExists('cronjobs');
    }
};
