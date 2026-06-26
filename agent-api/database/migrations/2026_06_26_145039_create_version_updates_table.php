<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('version_updates', function (Blueprint $table) {
            $table->id();
            $table->string('version', 20);               // 版本号，如 v1.2.0
            $table->string('title');                       // 版本标题
            $table->text('content');                       // 更新内容（支持多行）
            $table->string('type', 20)->default('feature'); // feature/fix/perf/security
            $table->date('release_date');                  // 发布日期
            $table->boolean('is_highlight')->default(false); // 是否高亮显示
            $table->timestamps();

            $table->index('release_date');
            $table->index('type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('version_updates');
    }
};
