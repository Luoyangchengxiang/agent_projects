<?php

namespace App\Http\Controllers;

use App\Models\VersionUpdate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class VersionUpdateController extends Controller
{
    /**
     * 获取版本更新列表
     */
    public function index(Request $request): JsonResponse
    {
        $perPage = min($request->get('per_page', 20), 100);

        $query = VersionUpdate::orderBy('release_date', 'desc');

        // 按类型筛选
        if ($type = $request->get('type')) {
            $query->where('type', $type);
        }

        // 只看高亮
        if ($request->boolean('highlight_only')) {
            $query->where('is_highlight', true);
        }

        $updates = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $updates->items(),
            'pagination' => [
                'total' => $updates->total(),
                'current_page' => $updates->currentPage(),
                'last_page' => $updates->lastPage(),
                'per_page' => $updates->perPage(),
            ],
        ]);
    }

    /**
     * 获取最新版本（用于通知中心）
     */
    public function latest(): JsonResponse
    {
        $updates = VersionUpdate::orderBy('release_date', 'desc')
            ->limit(10)
            ->get()
            ->map(fn ($item) => [
                'id' => $item->id,
                'version' => $item->version,
                'title' => $item->title,
                'content' => $item->content,
                'type' => $item->type,
                'type_label' => $item->type_label,
                'type_color' => $item->type_color,
                'release_date' => $item->release_date->format('Y-m-d'),
                'is_highlight' => $item->is_highlight,
            ]);

        return response()->json([
            'success' => true,
            'data' => $updates,
        ]);
    }

    /**
     * 创建版本更新（管理员）
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'version' => 'required|string|max:20',
            'title' => 'required|string|max:255',
            'content' => 'required|string',
            'type' => 'in:feature,fix,perf,security',
            'release_date' => 'required|date',
            'is_highlight' => 'boolean',
        ]);

        $update = VersionUpdate::create($validated);

        return response()->json([
            'success' => true,
            'data' => $update,
            'message' => '版本更新已创建',
        ], 201);
    }

    /**
     * 更新版本记录（管理员）
     */
    public function update(Request $request, VersionUpdate $versionUpdate): JsonResponse
    {
        $validated = $request->validate([
            'version' => 'string|max:20',
            'title' => 'string|max:255',
            'content' => 'string',
            'type' => 'in:feature,fix,perf,security',
            'release_date' => 'date',
            'is_highlight' => 'boolean',
        ]);

        $versionUpdate->update($validated);

        return response()->json([
            'success' => true,
            'data' => $versionUpdate,
            'message' => '版本更新已修改',
        ]);
    }

    /**
     * 删除版本记录（管理员）
     */
    public function destroy(VersionUpdate $versionUpdate): JsonResponse
    {
        $versionUpdate->delete();

        return response()->json([
            'success' => true,
            'message' => '版本更新已删除',
        ]);
    }
}
