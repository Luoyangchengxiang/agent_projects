<?php

namespace App\Exceptions;

use App\Enums\ErrorType;
use App\Models\ErrorLog;
use Illuminate\Foundation\Exceptions\Handler as ExceptionHandler;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\HttpKernel\Exception\MethodNotAllowedHttpException;
use Symfony\Component\HttpKernel\Exception\TooManyRequestsHttpException;
use Throwable;

class Handler extends ExceptionHandler
{
    /**
     * The list of the inputs that are never flashed to the session on validation exceptions.
     */
    protected $dontFlash = [
        'current_password',
        'password',
        'password_confirmation',
    ];

    /**
     * Register the exception handling callbacks for the application.
     */
    public function register(): void
    {
        $this->reportable(function (Throwable $e) {
            // 记录错误到数据库
            $this->logErrorToDatabase($e);
        });
    }

    /**
     * Render an exception into an HTTP response.
     */
    public function render($request, Throwable $e)
    {
        // API请求返回JSON
        if ($request->is('api/*') || $request->wantsJson()) {
            return $this->renderJsonResponse($e);
        }

        // 非API请求返回简单JSON
        return response()->json([
            'success' => false,
            'message' => 'Error'
        ], method_exists($e, 'getStatusCode') ? $e->getStatusCode() : 500);
    }

    /**
     * 渲染JSON响应
     */
    protected function renderJsonResponse(Throwable $e): \Illuminate\Http\JsonResponse
    {
        $statusCode = method_exists($e, 'getStatusCode') ? $e->getStatusCode() : 500;
        $errorType = $this->getErrorType($e);

        // 验证错误特殊处理
        if ($e instanceof ValidationException) {
            return response()->json([
                'success' => false,
                'message' => 'Validation Error',
                'errors' => $e->errors(),
            ], 422);
        }

        return response()->json([
            'success' => false,
            'message' => $this->getErrorMessage($e, $statusCode),
            'error_type' => $errorType->value,
        ], $statusCode);
    }

    /**
     * 记录错误到数据库
     */
    protected function logErrorToDatabase(Throwable $e): void
    {
        try {
            $request = request();
            $errorType = $this->getErrorType($e);

            ErrorLog::log(
                type: $errorType,
                message: $e->getMessage(),
                errorCode: $e->getCode() ?: null,
                stackTrace: $e->getTraceAsString(),
                file: $e->getFile(),
                line: $e->getLine(),
                url: $request->fullUrl(),
                method: $request->method(),
                context: [
                    'query' => $request->query(),
                    'input' => $this->sanitizeInput($request->all()),
                ],
                headers: $this->sanitizeHeaders($request->headers->all()),
                ip: $request->ip(),
                userAgent: $request->userAgent()
            );
        } catch (Throwable $e) {
            // 避免记录日志时出错导致无限循环
            report($e);
        }
    }

    /**
     * 获取错误类型
     */
    protected function getErrorType(Throwable $e): ErrorType
    {
        if ($e instanceof NotFoundHttpException) {
            return ErrorType::NOT_FOUND;
        }

        if ($e instanceof MethodNotAllowedHttpException) {
            return ErrorType::METHOD_NOT_ALLOWED;
        }

        if ($e instanceof ValidationException) {
            return ErrorType::VALIDATION_ERROR;
        }

        if ($e instanceof TooManyRequestsHttpException) {
            return ErrorType::RATE_LIMIT;
        }

        // 根据错误消息判断类型
        $message = strtolower($e->getMessage());

        if (str_contains($message, 'database') || str_contains($message, 'sql')) {
            return ErrorType::DATABASE_ERROR;
        }

        if (str_contains($message, 'cache') || str_contains($message, 'redis')) {
            return ErrorType::CACHE_ERROR;
        }

        if (str_contains($message, 'timeout') || str_contains($message, 'timed out')) {
            return ErrorType::TIMEOUT_ERROR;
        }

        if (str_contains($message, 'network') || str_contains($message, 'connection')) {
            return ErrorType::NETWORK_ERROR;
        }

        if (str_contains($message, 'agent')) {
            return ErrorType::AGENT_ERROR;
        }

        return ErrorType::SYSTEM_ERROR;
    }

    /**
     * 获取错误消息（隐藏敏感信息）
     */
    protected function getErrorMessage(Throwable $e, int $statusCode): string
    {
        // 生产环境隐藏详细错误
        if (config('app.env') === 'production') {
            return match ($statusCode) {
                404 => 'Not Found',
                405 => 'Method Not Allowed',
                429 => 'Too Many Requests',
                500 => 'Internal Server Error',
                default => 'Error',
            };
        }

        return $e->getMessage();
    }

    /**
     * 清理输入数据（移除敏感信息）
     */
    protected function sanitizeInput(array $input): array
    {
        $sensitiveFields = ['password', 'password_confirmation', 'token', 'secret', 'credit_card'];

        foreach ($sensitiveFields as $field) {
            if (isset($input[$field])) {
                $input[$field] = '***';
            }
        }

        return $input;
    }

    /**
     * 清理请求头（移除敏感信息）
     */
    protected function sanitizeHeaders(array $headers): array
    {
        $sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];

        foreach ($sensitiveHeaders as $header) {
            if (isset($headers[$header])) {
                $headers[$header] = ['***'];
            }
        }

        return $headers;
    }
}
