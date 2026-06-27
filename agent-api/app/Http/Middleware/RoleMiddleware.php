<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * 角色权限中间件
 * 用法：role:admin,support
 */
class RoleMiddleware
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next, ...$roles): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => '未登录',
            ], 401);
        }

        // 检查用户角色是否在允许列表中
        if (!in_array($user->role, $roles)) {
            return response()->json([
                'success' => false,
                'message' => '无权限访问',
            ], 403);
        }

        return $next($request);
    }
}
