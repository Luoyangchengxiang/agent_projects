<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * IP检测中间件
 * 记录请求IP，检测异常登录行为
 */
class IpDetection
{
    /**
     * 本地IP段
     */
    private const LOCAL_PREFIXES = ['127.0.0.', '192.168.', '10.', '172.'];
    private const LOCAL_EXACT = ['127.0.0.1', '::1', 'localhost'];

    /**
     * 处理请求
     */
    public function handle(Request $request, Closure $next): Response
    {
        $ip = $request->ip();
        $isLocal = $this->isLocalIp($ip);

        // 将IP信息注入到请求中，供后续使用
        $request->attributes->set('client_ip', $ip);
        $request->attributes->set('is_local_ip', $isLocal);

        $response = $next($request);

        // 在响应头中附加IP信息（仅开发环境）
        if (app()->environment('local')) {
            $response->headers->set('X-Client-IP', $ip);
            $response->headers->set('X-Is-Local', $isLocal ? 'true' : 'false');
        }

        return $response;
    }

    /**
     * 判断是否为本地IP
     */
    private function isLocalIp(string $ip): bool
    {
        if (in_array($ip, self::LOCAL_EXACT)) {
            return true;
        }

        foreach (self::LOCAL_PREFIXES as $prefix) {
            if (str_starts_with($ip, $prefix)) {
                return true;
            }
        }

        return false;
    }
}
