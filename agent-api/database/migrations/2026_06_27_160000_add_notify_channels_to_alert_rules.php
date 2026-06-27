<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('alert_rules', function (Blueprint $table) {
            $table->json('notify_channels')->nullable()->after('webhook_url')
                ->comment('通知渠道: ["log","email","wechat","dingtalk","feishu","webhook"]');
            $table->json('email_recipients')->nullable()->after('notify_channels')
                ->comment('邮件收件人列表');
            $table->integer('cooldown_minutes')->default(5)->after('email_recipients')
                ->comment('冷却时间(分钟): 同一规则在此时间内不重复通知');
        });
    }

    public function down(): void
    {
        Schema::table('alert_rules', function (Blueprint $table) {
            $table->dropColumn(['notify_channels', 'email_recipients', 'cooldown_minutes']);
        });
    }
};
