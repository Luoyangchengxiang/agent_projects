<?php

namespace App\Services;

/**
 * 报告摘要生成服务
 * 从完整报告中提取关键信息生成结果汇总
 */
class ReportSummaryService
{
    /**
     * 从报告内容生成结果汇总
     *
     * @param string $content 完整报告内容
     * @return string 结果汇总
     */
    public static function generate(string $content): string
    {
        $summary = [];
        
        // 1. 提取调研日期
        if (preg_match('/调研日期[：:]\\s*\\*\\*\\s*(.+)/u', $content, $matches)) {
            $date = trim($matches[1]);
            // 清理日期中的特殊字符
            $date = preg_replace('/[^\\x{4e00}-\\x{9fa5}\\d年月日星期（）()\\s-]/u', '', $date);
            $summary[] = '📅 ' . $date;
        }
        
        // 2. 提取今日品类
        $categories = [];
        if (preg_match('/核心品类\\s*\\|\\s*\\*\\*(.+?)\\*\\*/u', $content, $matches)) {
            $categories[] = trim($matches[1]);
        }
        if (preg_match('/探索品类A\\s*\\|\\s*\\*\\*(.+?)\\*\\*/u', $content, $matches)) {
            $categories[] = trim($matches[1]);
        }
        if (preg_match('/探索品类B\\s*\\|\\s*\\*\\*(.+?)\\*\\*/u', $content, $matches)) {
            $categories[] = trim($matches[1]);
        }
        if (!empty($categories)) {
            $summary[] = '📊 品类：' . implode('、', $categories);
        }
        
        // 3. 提取首推SKU
        if (preg_match('/首推SKU[：:]\\s*(.+?)\\n/ui', $content, $matches)) {
            $sku = trim($matches[1]);
            // 清理 markdown 格式
            $sku = preg_replace('/\\*\\*/u', '', $sku);
            $summary[] = '⭐ 首推：' . $sku;
        }
        
        // 4. 提取首推利润率
        if (preg_match('/首推SKU[\\s\\S]*?预估利润[：:]\\s*(.+?)\\n/ui', $content, $matches)) {
            $profit = trim($matches[1]);
            $profit = preg_replace('/\\*\\*/u', '', $profit);
            $summary[] = '💰 利润：' . $profit;
        }
        
        // 5. 提取预估月利润
        if (preg_match('/预估月利润[：:]\\s*(.+?)\\n/ui', $content, $matches)) {
            $profit = trim($matches[1]);
            $profit = preg_replace('/\\*\\*/u', '', $profit);
            $summary[] = '💰 月利润：' . $profit;
        }
        
        // 如果没有提取到有意义的信息，返回默认汇总
        if (count($summary) < 2) {
            return self::generateDefaultSummary($content);
        }
        
        return implode(' | ', $summary);
    }
    
    /**
     * 生成默认汇总（当无法提取关键信息时）
     */
    private static function generateDefaultSummary(string $content): string
    {
        $parts = [];
        
        // 统计品类数量
        $categoryCount = preg_match_all('/###\\s*\\d+\\.\\s*(.+)/u', $content, $matches);
        if ($categoryCount > 0) {
            $parts[] = '分析' . $categoryCount . '个品类';
        }
        
        // 统计热销商品
        $hotCount = preg_match_all('/热销前三名/u', $content);
        if ($hotCount > 0) {
            $parts[] = $hotCount . '个热销商品';
        }
        
        // 报告大小
        $size = strlen($content);
        $parts[] = round($size / 1024, 1) . 'KB';
        
        return implode('，', $parts);
    }
    
    /**
     * 从文件生成结果汇总
     *
     * @param string $filePath 文件路径
     * @return string 结果汇总
     */
    public static function generateFromFile(string $filePath): string
    {
        if (!file_exists($filePath)) {
            return '文件不存在';
        }
        
        $content = file_get_contents($filePath);
        return self::generate($content);
    }
}
