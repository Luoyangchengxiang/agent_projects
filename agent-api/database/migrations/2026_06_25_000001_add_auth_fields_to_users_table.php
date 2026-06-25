<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('role')->default('user')->after('email')->comment('角色: admin, user');
            $table->string('status')->default('active')->after('role')->comment('状态: active, disabled');
            $table->timestamp('last_login_at')->nullable()->after('status')->comment('最后登录时间');
            $table->string('last_login_ip')->nullable()->after('last_login_at')->comment('最后登录IP');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['role', 'status', 'last_login_at', 'last_login_ip']);
        });
    }
};
