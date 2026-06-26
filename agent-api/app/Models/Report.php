<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Report extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'type',
        'format',
        'file_path',
        'content',
        'metadata',
        'generated_by',
    ];

    protected $casts = [
        'metadata' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * 关联生成报告的用户
     */
    public function generator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'generated_by');
    }

    /**
     * 获取格式化的文件大小
     */
    public function getFormattedSizeAttribute(): string
    {
        if (!$this->file_path || !file_exists($this->file_path)) {
            return '-';
        }

        $bytes = filesize($this->file_path);
        $units = ['B', 'KB', 'MB', 'GB'];

        $i = 0;
        while ($bytes >= 1024 && $i < count($units) - 1) {
            $bytes /= 1024;
            $i++;
        }

        return round($bytes, 2) . ' ' . $units[$i];
    }

    /**
     * 获取报告类型中文名
     */
    public function getTypeLabelAttribute(): string
    {
        return match ($this->type) {
            'weekly' => '周报',
            'monthly' => '月报',
            'selection' => '选品报告',
            'custom' => '自定义',
            default => $this->type,
        };
    }

    /**
     * 获取下载链接
     */
    public function getDownloadUrlAttribute(): ?string
    {
        if (!$this->file_path) {
            return null;
        }

        return '/api/reports/' . $this->id . '/download';
    }
}
