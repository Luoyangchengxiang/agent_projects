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
        Schema::create('alert_histories', function (Blueprint $table) {
            $table->id();
            $table->string('alert_type', 50)->comment('告警类型：system_resource/error_count');
            $table->string('resource_type', 20)->nullable()->comment('资源类型：cpu/memory/disk');
            $table->string('severity', 20)->default('warning')->comment('严重程度：info/warning/critical');
            $table->string('title', 200)->comment('告警标题');
            $table->text('message')->comment('告警消息');
            $table->float('current_value')->nullable()->comment('当前值');
            $table->float('threshold_value')->nullable()->comment('阈值');
            $table->json('context')->nullable()->comment('上下文数据（JSON）');
            $table->string('notify_method', 50)->nullable()->comment('通知方式');
            $table->boolean('notify_success')->default(false)->comment('通知是否成功');
            $table->text('notify_error')->nullable()->comment('通知错误信息');
            $table->string('resolved_by', 100)->nullable()->comment('处理人');
            $table->timestamp('resolved_at')->nullable()->comment('处理时间');
            $table->text('resolved_note')->nullable()->comment('处理备注');
            $table->timestamps();

            $table->index(['alert_type', 'created_at']);
            $table->index(['resource_type', 'created_at']);
            $table->index(['severity', 'created_at']);
            $table->index('notify_success');
            $table->index('resolved_at');
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('alert_histories');
    }
};
