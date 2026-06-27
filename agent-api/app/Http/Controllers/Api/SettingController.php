<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class SettingController extends Controller
{
    /**
     * 获取所有设置（按组）
     */
    public function index(Request $request): JsonResponse
    {
        $query = Setting::query();

        if ($request->has('group')) {
            $query->where('group_name', $request->group);
        }

        $settings = $query->orderBy('group_name')->orderBy('key')->get();

        // 按组分组
        $grouped = $settings->groupBy('group_name')->map(function ($items) {
            return $items->mapWithKeys(function ($s) {
                $val = match ($s->type) {
                    'boolean' => (bool) $s->value,
                    'number' => (float) $s->value,
                    'json' => json_decode($s->value, true),
                    default => $s->value,
                };
                return [$s->key => $val];
            });
        });

        return response()->json([
            'success' => true,
            'data' => $grouped,
        ]);
    }

    /**
     * 批量更新设置
     * POST /api/settings
     * body: { group: 'ollama', settings: { 'ollama.base_url': 'http://...', ... } }
     */
    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'group' => 'required|string|max:50',
            'settings' => 'required|array',
        ]);

        $group = $validated['group'];
        $settings = $validated['settings'];

        // 获取该组的类型定义
        $existingSettings = Setting::whereIn('key', array_keys($settings))->get()->keyBy('key');

        foreach ($settings as $key => $value) {
            $existing = $existingSettings[$key] ?? null;
            $type = $existing?->type ?? (is_bool($value) ? 'boolean' : (is_numeric($value) ? 'number' : 'string'));
            $description = $existing?->description ?? null;

            Setting::setValue($key, $value, $type, $description, $group);
        }

        return response()->json([
            'success' => true,
            'message' => '设置已保存',
        ]);
    }

    /**
     * 获取单个设置
     */
    public function show(string $key): JsonResponse
    {
        $setting = Setting::where('key', $key)->first();

        if (!$setting) {
            return response()->json([
                'success' => false,
                'message' => '设置不存在',
            ], 404);
        }

        $val = match ($setting->type) {
            'boolean' => (bool) $setting->value,
            'number' => (float) $setting->value,
            'json' => json_decode($setting->value, true),
            default => $setting->value,
        };

        return response()->json([
            'success' => true,
            'data' => [
                'key' => $setting->key,
                'value' => $val,
                'type' => $setting->type,
                'group' => $setting->group_name,
                'description' => $setting->description,
            ],
        ]);
    }
}
