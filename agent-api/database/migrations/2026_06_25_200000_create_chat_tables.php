<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 对话表
        Schema::create('conversations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('status')->default('active')->comment('active/closed/transferred');
            $table->string('mode')->default('ai')->comment('ai=AI回复/human=人工接管');
            $table->foreignId('human_agent_id')->nullable()->comment('接管的真人客服ID');
            $table->timestamp('last_message_at')->nullable();
            $table->json('metadata')->nullable()->comment('扩展字段');
            $table->timestamps();

            $table->index(['user_id', 'status']);
            $table->index(['mode', 'status']);
            $table->index('last_message_at');
        });

        // 消息表
        Schema::create('chat_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('conversation_id')->constrained()->onDelete('cascade');
            $table->string('sender_type')->comment('user/ai/human');
            $table->foreignId('sender_id')->nullable()->comment('发送者ID');
            $table->text('content');
            $table->json('metadata')->nullable()->comment('token用量/耗时/模型等');
            $table->timestamps();

            $table->index(['conversation_id', 'created_at']);
            $table->index('sender_type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('chat_messages');
        Schema::dropIfExists('conversations');
    }
};
