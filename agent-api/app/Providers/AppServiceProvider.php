<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Carbon;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // 设置 API 日期序列化格式为 Y-m-d H:i:s
        Carbon::serializeUsing(function ($carbon) {
            return $carbon->format('Y-m-d H:i:s');
        });

        // Agent 变动时自动同步知识图谱
        \App\Models\Agent::observe(\App\Observers\AgentGraphObserver::class);
    }
}
