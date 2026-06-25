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
        Schema::create('agent_metrics', function (Blueprint $table) {
            $table->id();
            $table->foreignId('agent_id')->constrained()->onDelete('cascade');
            $table->string('metric_name')->comment('指标名称：cpu/memory/response_time');
            $table->float('metric_value')->comment('指标值');
            $table->json('tags')->nullable()->comment('标签');
            $table->timestamp('recorded_at')->comment('记录时间');
            $table->timestamps();

            $table->index(['agent_id', 'metric_name', 'recorded_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('agent_metrics');
    }
};
