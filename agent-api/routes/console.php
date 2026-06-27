<?php

use Illuminate\Support\Facades\Schedule;

// 每分钟检查到期的定时任务
Schedule::command('cronjobs:check')->everyMinute()->withoutOverlapping();
