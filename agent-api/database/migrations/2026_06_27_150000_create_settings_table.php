<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('settings', function (Blueprint $table) {
            $table->id();
            $table->string('group_name', 50)->comment('分组: ollama/notification/system');
            $table->string('key', 100)->unique()->comment('设置键');
            $table->text('value')->nullable()->comment('设置值');
            $table->string('type', 20)->default('string')->comment('类型: string/boolean/json/number');
            $table->string('description', 255)->nullable()->comment('说明');
            $table->timestamps();

            $table->index('group_name');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('settings');
    }
};
