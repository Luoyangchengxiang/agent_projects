#!/usr/bin/env python3
"""
导入历史报告到数据库
"""
import os
import glob
import re
import psycopg2

def generate_summary(content):
    """生成报告摘要"""
    summary_parts = []
    
    # 统计品类数量
    categories = re.findall(r'###\s*\d+\.\s*(.+)', content)
    if categories:
        summary_parts.append(f"分析品类：{len(categories)}个")
        summary_parts.append(f"主要品类：{'、'.join(categories[:3])}")
    
    # 统计热销商品
    hot_products = re.findall(r'热销TOP\s*(\d+)', content, re.IGNORECASE)
    if hot_products:
        total_hot = sum(int(x) for x in hot_products)
        summary_parts.append(f"热销商品：{total_hot}个")
    
    # 统计注意事项
    notes = re.findall(r'^\s*[-*]\s+(.+)$', content, re.MULTILINE)
    if notes:
        summary_parts.append(f"注意事项：{len(notes)}条")
    
    # 报告大小
    size = len(content)
    summary_parts.append(f"报告大小：{round(size/1024, 1)}KB")
    
    return " | ".join(summary_parts)

def main():
    conn = psycopg2.connect(
        host="127.0.0.1",
        port=5432,
        database="agent_monitor",
        user="cheng",
        password=""
    )
    cur = conn.cursor()
    
    # 清空执行日志
    cur.execute("DELETE FROM execution_logs")
    conn.commit()
    print("已清空执行日志")
    
    # 导入报告
    report_dir = os.path.expanduser("~/local-ai/agents/开店团队/报告")
    files = glob.glob(os.path.join(report_dir, "热销商品调研_*.md"))
    
    count = 0
    for file_path in sorted(files):
        filename = os.path.basename(file_path)
        
        match = re.search(r'(\d{4}-\d{2}-\d{2}|\d{8})', filename)
        if not match:
            continue
        
        date_str = match.group(1)
        if len(date_str) == 8:
            date = f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:8]}"
        else:
            date = date_str
        
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
        
        summary = generate_summary(content)
        
        cur.execute("""
            SELECT COUNT(*) FROM execution_logs 
            WHERE agent_group = %s AND DATE(created_at) = %s
        """, ("开店团队", date))
        
        if cur.fetchone()[0] > 0:
            print(f"⏭️ {date} (已存在)")
            continue
        
        cur.execute("""
            INSERT INTO execution_logs 
            (agent_id, agent_group, task_id, status, input, output, result_summary, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            None,
            "开店团队",
            f"daily_inspection_{date.replace('-', '')}",
            "success",
            "热销商品调研任务",
            content[:5000],
            summary,
            f"{date} 09:00:00",
            f"{date} 09:00:00"
        ))
        
        count += 1
        print(f"✅ {date}: {summary[:60]}...")
    
    conn.commit()
    
    cur.execute("SELECT COUNT(*) FROM execution_logs")
    total = cur.fetchone()[0]
    print(f"\n导入完成: {count} 条")
    print(f"总日志数: {total}")
    
    cur.close()
    conn.close()

if __name__ == "__main__":
    main()
