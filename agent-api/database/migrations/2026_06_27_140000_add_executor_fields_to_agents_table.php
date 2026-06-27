<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('agents', function (Blueprint $table) {
            $table->string('executor_type', 20)->default('ollama')->after('status')
                ->comment('执行器类型: ollama/shell/api');
            $table->json('executor_config')->nullable()->after('executor_type')
                ->comment('执行器配置');
            $table->string('model', 100)->nullable()->after('executor_config')
                ->comment('使用的模型名');
            $table->text('system_prompt')->nullable()->after('model')
                ->comment('系统提示词');
        });
    }

    public function down(): void
    {
        Schema::table('agents', function (Blueprint $table) {
            $table->dropColumn(['executor_type', 'executor_config', 'model', 'system_prompt']);
        });
    }
};
