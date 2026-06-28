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
        Schema::create('system_alert_rules', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100)->comment('规则名称');
            $table->string('resource_type', 20)->comment('资源类型：cpu/memory/disk');
            $table->float('threshold')->comment('阈值百分比');
            $table->string('severity', 20)->default('warning')->comment('严重程度：info/warning/critical');
            $table->integer('check_interval_minutes')->default(5)->comment('检查间隔（分钟）');
            $table->boolean('is_enabled')->default(true)->comment('是否启用');
            $table->string('notify_method', 50)->default('webhook')->comment('通知方式：webhook/email');
            $table->string('webhook_url')->nullable()->comment('Webhook URL');
            $table->string('email_recipients')->nullable()->comment('邮件收件人（JSON数组）');
            $table->integer('cooldown_minutes')->default(30)->comment('冷却时间（分钟）');
            $table->text('description')->nullable()->comment('规则描述');
            $table->timestamp('last_triggered_at')->nullable()->comment('最后触发时间');
            $table->integer('trigger_count')->default(0)->comment('触发次数');
            $table->timestamps();

            $table->index(['resource_type', 'is_enabled']);
            $table->index('is_enabled');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('system_alert_rules');
    }
};
