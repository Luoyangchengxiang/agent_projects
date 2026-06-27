<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class PermissionController extends Controller
{
    /**
     * 获取用户列表（管理员）
     */
    public function index(Request $request): JsonResponse
    {
        // 检查权限
        if (!$request->user()->canManageUsers()) {
            return response()->json([
                'success' => false,
                'message' => '无权限访问',
            ], 403);
        }

        $query = User::query();

        // 搜索
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        // 角色筛选
        if ($request->has('role')) {
            $query->where('role', $request->role);
        }

        $users = $query->select('id', 'name', 'email', 'role', 'status', 'permissions', 'last_login_at', 'created_at')
            ->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 20));

        return response()->json([
            'success' => true,
            'data' => $users,
        ]);
    }

    /**
     * 更新用户角色
     */
    public function updateRole(Request $request, int $id): JsonResponse
    {
        // 检查权限
        if (!$request->user()->canManageUsers()) {
            return response()->json([
                'success' => false,
                'message' => '无权限访问',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'role' => 'required|in:user,vip,support,admin',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => '参数错误',
                'errors' => $validator->errors(),
            ], 422);
        }

        $user = User::find($id);
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => '用户不存在',
            ], 404);
        }

        // 不能修改自己的角色
        if ($user->id === $request->user()->id) {
            return response()->json([
                'success' => false,
                'message' => '不能修改自己的角色',
            ], 422);
        }

        $user->update(['role' => $request->role]);

        return response()->json([
            'success' => true,
            'message' => '角色更新成功',
            'data' => $user,
        ]);
    }

    /**
     * 更新用户权限
     */
    public function updatePermissions(Request $request, int $id): JsonResponse
    {
        // 检查权限
        if (!$request->user()->canManageUsers()) {
            return response()->json([
                'success' => false,
                'message' => '无权限访问',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'permissions' => 'required|array',
            'permissions.*' => 'string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => '参数错误',
                'errors' => $validator->errors(),
            ], 422);
        }

        $user = User::find($id);
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => '用户不存在',
            ], 404);
        }

        $user->update(['permissions' => $request->permissions]);

        return response()->json([
            'success' => true,
            'message' => '权限更新成功',
            'data' => $user,
        ]);
    }

    /**
     * 创建用户（管理员）
     */
    public function store(Request $request): JsonResponse
    {
        if (!$request->user()->canManageUsers()) {
            return response()->json([
                'success' => false,
                'message' => '无权限访问',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:50|regex:/^[a-zA-Z0-9_-]+$/|unique:users,name',
            'password' => 'required|string|min:6|max:100',
            'role' => 'nullable|in:user,vip,support,admin',
        ], [
            'name.required' => '请输入用户名',
            'name.regex' => '用户名只能包含字母、数字、下划线和短横线',
            'name.unique' => '该用户名已存在',
            'name.max' => '用户名不能超过50个字符',
            'password.required' => '请输入密码',
            'password.min' => '密码不能少于6位',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => '参数错误',
                'errors' => $validator->errors(),
            ], 422);
        }

        $user = User::create([
            'name' => $request->name,
            'nickname' => '用户_' . $request->name,
            'email' => $request->name . '@local',
            'password' => $request->password,
            'role' => $request->role ?? 'user',
            'status' => 'active',
        ]);

        return response()->json([
            'success' => true,
            'message' => '用户创建成功',
            'data' => $user,
        ], 201);
    }

    /**
     * 删除用户（管理员）
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        if (!$request->user()->canManageUsers()) {
            return response()->json([
                'success' => false,
                'message' => '无权限访问',
            ], 403);
        }

        $user = User::find($id);
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => '用户不存在',
            ], 404);
        }

        // 不能删除自己
        if ($user->id === $request->user()->id) {
            return response()->json([
                'success' => false,
                'message' => '不能删除自己',
            ], 422);
        }

        $user->delete();

        return response()->json([
            'success' => true,
            'message' => '用户已删除',
        ]);
    }

    /**
    * 获取当前用户权限信息
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'role_name' => $user->role_name,
                'permissions' => $user->permissions ?? [],
                'can_view_full_execution' => $user->canViewFullExecution(),
                'can_manage_users' => $user->canManageUsers(),
            ],
        ]);
    }
}
