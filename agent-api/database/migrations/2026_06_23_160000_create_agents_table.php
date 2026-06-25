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
        Schema::create('agents', function (Blueprint $table) {
            $table->id();
            $table->string('name')->comment('Agent名称');
            $table->string('type')->comment('类型：online/local');
            $table->string('status')->default('offline')->comment('状态：online/offline/error');
            $table->json('config')->nullable()->comment('配置信息');
            $table->json('metadata')->nullable()->comment('元数据');
            $table->timestamp('last_active_at')->nullable()->comment('最后活跃时间');
            $table->timestamps();

            $table->index(['type', 'status']);
            $table->index('last_active_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('agents');
    }
};
