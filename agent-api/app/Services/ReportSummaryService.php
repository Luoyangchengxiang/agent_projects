<?php

namespace App\Services;

/**
 * 报告摘要生成服务
 * 从完整报告中提取关键信息生成摘要
 */
class ReportSummaryService
{
    /**
     * 从报告内容生成摘要
     *
     * @param string $content 完整报告内容
     * @return string 摘要
     */
    public static function generate(string $content): string
    {
        $summary = [];
        
        // 1. 提取调研日期
        if (preg_match('/调研日期[：:]\s*(.+)/', $content, $matches)) {
            $summary[] = '调研日期：' . trim($matches[1]);
        }
        
        // 2. 统计品类数量
        $categoryCount = preg_match_all('/###\s*\d+\.\s*(.+)/', $content, $categoryMatches);
        if ($categoryCount > 0) {
            $summary[] = '分析品类：' . $categoryCount . '个';
            // 取前3个品类名
            $categories = array_slice($categoryMatches[1], 0, 3);
            $summary[] = '主要品类：' . implode('、', $categories);
        }
        
        // 3. 提取热销商品数量
        $hotProductCount = preg_match_all('/热销TOP\s*(\d+)/i', $content, $hotMatches);
        if ($hotProductCount > 0) {
            $totalHot = array_sum($hotMatches[1]);
            $summary[] = '热销商品：' . $totalHot . '个';
        }
        
        // 4. 提取推荐商品数量
        $recommendCount = preg_match_all('/推荐[选选]品[：:]\s*(\d+)/i', $content, $recMatches);
        if ($recommendCount > 0) {
            $summary[] = '推荐选品：' . $recMatches[1][0] . '个';
        }
        
        // 5. 提取高潜力品类
        if (preg_match('/高潜力品类[：:]\s*(.+)/i', $content, $matches)) {
            $summary[] = '高潜力品类：' . trim($matches[1]);
        }
        
        // 6. 提取注意事项数量
        $noteCount = preg_match_all('/^\s*[-*]\s+(.+)$/m', $content, $noteMatches);
        if ($noteCount > 0) {
            $summary[] = '注意事项：' . $noteCount . '条';
        }
        
        // 7. 提取报告大小
        $size = strlen($content);
        $summary[] = '报告大小：' . round($size / 1024, 1) . 'KB';
        
        return implode(' | ', $summary);
    }
    
    /**
     * 从文件生成摘要
     *
     * @param string $filePath 文件路径
     * @return string 摘要
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
