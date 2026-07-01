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
        Schema::table('agents', function (Blueprint $table) {
            // 树状结构：父级ID
            $table->foreignId('parent_id')->nullable()->after('id')
                ->constrained('agents')->nullOnDelete();
            
            // 逻辑删除
            $table->boolean('is_deleted')->default(false)->after('status');
            $table->timestamp('deleted_at')->nullable()->after('is_deleted');
            
            // 创建者（用于权限控制）
            $table->foreignId('created_by')->nullable()->after('deleted_at')
                ->constrained('users')->nullOnDelete();
            
            // 索引
            $table->index('parent_id');
            $table->index('is_deleted');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('agents', function (Blueprint $table) {
            $table->dropForeign(['parent_id']);
            $table->dropForeign(['created_by']);
            $table->dropColumn(['parent_id', 'is_deleted', 'deleted_at', 'created_by']);
        });
    }
};
