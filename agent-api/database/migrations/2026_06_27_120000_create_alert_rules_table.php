<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('alert_rules', function (Blueprint $table) {
            $table->id();
            $table->string('name')->comment('规则名称');
            $table->string('error_type')->nullable()->comment('错误类型，null表示全部');
            $table->string('severity')->nullable()->comment('严重程度筛选');
            $table->integer('threshold_count')->default(10)->comment('阈值：触发数量');
            $table->integer('time_window_minutes')->default(60)->comment('时间窗口（分钟）');
            $table->boolean('is_enabled')->default(true)->comment('是否启用');
            $table->string('notify_method')->default('log')->comment('通知方式: log/webhook');
            $table->string('webhook_url')->nullable()->comment('Webhook通知地址');
            $table->text('description')->nullable()->comment('规则描述');
            $table->timestamp('last_triggered_at')->nullable()->comment('上次触发时间');
            $table->integer('trigger_count')->default(0)->comment('累计触发次数');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('alert_rules');
    }
};
