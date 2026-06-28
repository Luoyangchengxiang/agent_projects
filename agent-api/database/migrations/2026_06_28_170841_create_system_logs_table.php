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
        Schema::create('system_logs', function (Blueprint $table) {
            $table->id();
            $table->string('level', 20)->default('info')->comment('日志级别：debug/info/warning/error/critical');
            $table->string('category', 50)->comment('日志分类：auth/system/agent/api/alert');
            $table->string('action', 100)->comment('操作：login/logout/create/update/delete/error');
            $table->text('message')->comment('日志消息');
            $table->json('context')->nullable()->comment('上下文数据（JSON）');
            $table->string('user_name', 100)->nullable()->comment('操作用户名');
            $table->string('ip_address', 45)->nullable()->comment('IP地址');
            $table->string('user_agent', 500)->nullable()->comment('User Agent');
            $table->timestamps();

            $table->index(['level', 'created_at']);
            $table->index(['category', 'created_at']);
            $table->index('user_name');
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('system_logs');
    }
};
