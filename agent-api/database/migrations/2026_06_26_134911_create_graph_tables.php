<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 知识图谱节点表
        Schema::create('graph_nodes', function (Blueprint $table) {
            $table->id();
            $table->string('type', 50);           // agent_group/agent/knowledge/skill/output
            $table->string('name');                // 节点名称
            $table->text('description')->nullable(); // 描述
            $table->json('metadata')->nullable();  // 额外属性
            $table->unsignedBigInteger('agent_id')->nullable(); // 关联 Agent
            $table->foreign('agent_id')->references('id')->on('agents')->nullOnDelete();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();
            $table->timestamps();
            
            $table->index('type');
            $table->index('name');
        });

        // 知识图谱边表（关系）
        Schema::create('graph_edges', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('source_id');
            $table->foreign('source_id')->references('id')->on('graph_nodes')->onDelete('cascade');
            $table->unsignedBigInteger('target_id');
            $table->foreign('target_id')->references('id')->on('graph_nodes')->onDelete('cascade');
            $table->string('relation_type', 50); // contains/uses/produces/depends_on
            $table->text('label')->nullable();    // 关系标签
            $table->json('metadata')->nullable();
            $table->timestamps();
            
            $table->index(['source_id', 'target_id']);
            $table->index('relation_type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('graph_edges');
        Schema::dropIfExists('graph_nodes');
    }
};
