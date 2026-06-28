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
        Schema::create('remember_tokens', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('token_hash', 64)->unique(); // 哈希后的 token
            $table->string('token_prefix', 10); // token 前缀，用于快速查找
            $table->timestamp('expires_at')->nullable();
            $table->string('device_info', 255)->nullable(); // 设备信息
            $table->string('ip_address', 45)->nullable(); // IP 地址
            $table->timestamps();

            // 索引
            $table->index(['user_id', 'expires_at']);
            $table->index('token_prefix');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('remember_tokens');
    }
};
