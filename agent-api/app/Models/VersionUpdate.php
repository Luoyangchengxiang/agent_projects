<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class VersionUpdate extends Model
{
    protected $fillable = [
        'version',
        'title',
        'content',
        'type',
        'release_date',
        'is_highlight',
    ];

    protected $casts = [
        'release_date' => 'date',
        'is_highlight' => 'boolean',
    ];

    /**
     * 获取类型中文名
     */
    public function getTypeLabelAttribute(): string
    {
        return match ($this->type) {
            'feature' => '新功能',
            'fix' => '修复',
            'perf' => '性能优化',
            'security' => '安全更新',
            default => $this->type,
        };
    }

    /**
     * 获取类型颜色
     */
    public function getTypeColorAttribute(): string
    {
        return match ($this->type) {
            'feature' => '#06b6d4',
            'fix' => '#52c41a',
            'perf' => '#722ed1',
            'security' => '#ff4d4f',
            default => '#8c8c8c',
        };
    }
}
