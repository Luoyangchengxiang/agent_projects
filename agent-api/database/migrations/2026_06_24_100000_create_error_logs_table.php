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
        Schema::create('error_logs', function (Blueprint $table) {
            $table->id();
            $table->string('error_type')->comment('错误类型');
            $table->string('error_code')->nullable()->comment('错误代码');
            $table->text('message')->comment('错误消息');
            $table->text('stack_trace')->nullable()->comment('堆栈跟踪');
            $table->string('file')->nullable()->comment('错误文件');
            $table->integer('line')->nullable()->comment('错误行号');
            $table->string('url')->nullable()->comment('请求URL');
            $table->string('method')->nullable()->comment('请求方法');
            $table->json('context')->nullable()->comment('上下文信息');
            $table->json('headers')->nullable()->comment('请求头');
            $table->string('ip')->nullable()->comment('IP地址');
            $table->string('user_agent')->nullable()->comment('用户代理');
            $table->string('severity')->default('info')->comment('严重程度: critical/high/medium/low/info');
            $table->boolean('is_resolved')->default(false)->comment('是否已解决');
            $table->text('resolution_notes')->nullable()->comment('解决方案');
            $table->timestamps();

            $table->index(['error_type', 'created_at']);
            $table->index(['severity', 'created_at']);
            $table->index('is_resolved');
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('error_logs');
    }
};
