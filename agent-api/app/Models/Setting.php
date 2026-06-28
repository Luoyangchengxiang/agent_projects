<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class Setting extends BaseModel
{
    protected $fillable = [
        'group_name',
        'key',
        'value',
        'type',
        'description',
    ];

    /**
     * 获取设置值（带缓存）
     */
    public static function getValue(string $key, $default = null)
    {
        return Cache::remember("setting.{$key}", 3600, function () use ($key, $default) {
            $setting = static::where('key', $key)->first();
            if (!$setting) return $default;

            return match ($setting->type) {
                'boolean' => (bool) $setting->value,
                'number' => (float) $setting->value,
                'json' => json_decode($setting->value, true),
                default => $setting->value,
            };
        });
    }

    /**
     * 设置值（更新或创建）
     */
    public static function setValue(string $key, $value, string $type = 'string', ?string $description = null, ?string $group = null): void
    {
        $storeValue = is_array($value) ? json_encode($value, JSON_UNESCAPED_UNICODE) : (string) $value;

        static::updateOrCreate(
            ['key' => $key],
            [
                'value' => $storeValue,
                'type' => $type,
                'description' => $description,
                'group_name' => $group ?? 'system',
            ]
        );

        Cache::forget("setting.{$key}");
    }

    /**
     * 获取某组的所有设置
     */
    public static function getGroup(string $group): array
    {
        return static::where('group_name', $group)
            ->get()
            ->mapWithKeys(function ($s) {
                $val = match ($s->type) {
                    'boolean' => (bool) $s->value,
                    'number' => (float) $s->value,
                    'json' => json_decode($s->value, true),
                    default => $s->value,
                };
                return [$s->key => $val];
            })
            ->toArray();
    }
}
