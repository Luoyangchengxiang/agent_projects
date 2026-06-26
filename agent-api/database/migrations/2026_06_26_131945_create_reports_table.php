<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reports', function (Blueprint $table) {
            $table->id();
            $table->string('title');                    // 报告标题
            $table->string('type', 50);                 // weekly/monthly/custom/selection
            $table->string('format', 20)->default('csv'); // csv/markdown
            $table->string('file_path', 500)->nullable(); // 文件路径
            $table->longText('content')->nullable();    // 报告内容（Markdown格式）
            $table->json('metadata')->nullable();       // 额外数据（筛选条件等）
            $table->unsignedBigInteger('generated_by')->nullable();
            $table->foreign('generated_by')->references('id')->on('users')->nullOnDelete();
            $table->timestamps();
            
            $table->index('type');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reports');
    }
};
