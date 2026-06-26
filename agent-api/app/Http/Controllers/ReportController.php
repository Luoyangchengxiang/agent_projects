<?php

namespace App\Http\Controllers;

use App\Models\Report;
use App\Services\ReportService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportController extends Controller
{
    protected ReportService $reportService;

    public function __construct(ReportService $reportService)
    {
        $this->reportService = $reportService;
    }

    /**
     * 获取报告列表
     */
    public function index(Request $request): JsonResponse
    {
        $query = Report::with('generator');

        // 按类型筛选
        if ($request->has('type')) {
            $query->where('type', $request->type);
        }

        // 按时间排序
        $sortBy = $request->get('sort_by', 'created_at');
        $sortDir = $request->get('sort_dir', 'desc');
        $query->orderBy($sortBy, $sortDir);

        // 分页
        $perPage = $request->get('per_page', 15);
        $reports = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $reports->items(),
            'pagination' => [
                'total' => $reports->total(),
                'current_page' => $reports->currentPage(),
                'last_page' => $reports->lastPage(),
                'per_page' => $reports->perPage(),
            ],
        ]);
    }

    /**
     * 获取报告详情
     */
    public function show(Report $report): JsonResponse
    {
        $report->load('generator');

        return response()->json([
            'success' => true,
            'data' => $report,
        ]);
    }

    /**
     * 生成周报
     */
    public function generateWeekly(Request $request): JsonResponse
    {
        $report = $this->reportService->generateWeeklyReport(Auth::id());

        return response()->json([
            'success' => true,
            'message' => '周报生成成功',
            'data' => $report,
        ]);
    }

    /**
     * 生成月报
     */
    public function generateMonthly(Request $request): JsonResponse
    {
        $report = $this->reportService->generateMonthlyReport(Auth::id());

        return response()->json([
            'success' => true,
            'message' => '月报生成成功',
            'data' => $report,
        ]);
    }

    /**
     * 生成选品报告
     */
    public function generateSelection(Request $request): JsonResponse
    {
        $report = $this->reportService->generateSelectionReport(Auth::id());

        return response()->json([
            'success' => true,
            'message' => '选品报告生成成功',
            'data' => $report,
        ]);
    }

    /**
     * 生成自定义报告
     */
    public function generateCustom(Request $request): JsonResponse
    {
        $request->validate([
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
        ]);

        $report = $this->reportService->generateCustomReport(
            $request->start_date,
            $request->end_date,
            Auth::id()
        );

        return response()->json([
            'success' => true,
            'message' => '自定义报告生成成功',
            'data' => $report,
        ]);
    }

    /**
     * 下载报告文件
     */
    public function download(Report $report): StreamedResponse
    {
        $data = $this->reportService->getDownloadData($report);

        if (!$data) {
            abort(404, '报告文件不存在');
        }

        return response()->streamDownload(function () use ($data) {
            readfile($data['path']);
        }, $data['filename'], [
            'Content-Type' => $data['mime'],
        ]);
    }

    /**
     * 删除报告
     */
    public function destroy(Report $report): JsonResponse
    {
        // 删除文件
        if ($report->file_path && file_exists($report->file_path)) {
            unlink($report->file_path);
        }

        $report->delete();

        return response()->json([
            'success' => true,
            'message' => '报告已删除',
        ]);
    }
}
