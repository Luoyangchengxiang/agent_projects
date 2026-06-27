/**
 * escapeHtml 单元测试
 */
import { describe, it, expect } from 'vitest'
import { escapeHtml } from '../utils/htmlUtils'

describe('escapeHtml', () => {
  it('正常字符串不改变', () => {
    expect(escapeHtml('hello world')).toBe('hello world')
  })

  it('转义 < 和 >', () => {
    expect(escapeHtml('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;')
  })

  it('转义双引号', () => {
    expect(escapeHtml('a"b')).toBe('a&quot;b')
  })

  it('转义单引号', () => {
    expect(escapeHtml("a'b")).toBe('a&#039;b')
  })

  it('转义 & 符号（必须最先处理）', () => {
    expect(escapeHtml('a&b')).toBe('a&amp;b')
  })

  it('混合特殊字符', () => {
    expect(escapeHtml('<img src="x" onerror=\'alert(1)\'>')).toBe(
      '&lt;img src=&quot;x&quot; onerror=&#039;alert(1)&#039;&gt;'
    )
  })

  it('null 返回空字符串', () => {
    expect(escapeHtml(null)).toBe('')
  })

  it('undefined 返回空字符串', () => {
    expect(escapeHtml(undefined)).toBe('')
  })

  it('空字符串返回空字符串', () => {
    expect(escapeHtml('')).toBe('')
  })

  it('数字转为字符串后不改变', () => {
    expect(escapeHtml(12345)).toBe('12345')
  })

  it('对象转为字符串后转义', () => {
    // String({}) === '[object Object]' — 无特殊字符
    expect(escapeHtml({})).toBe('[object Object]')
  })

  it('包含 HTML 实体的字符串不双重转义', () => {
    // &amp; 中的 & 会被转义为 &amp;amp; — 这是预期行为（输入已经转义过的情况）
    expect(escapeHtml('&amp;')).toBe('&amp;amp;')
  })

  it('连续特殊字符', () => {
    expect(escapeHtml('<<<>>>')).toBe('&lt;&lt;&lt;&gt;&gt;&gt;')
  })

  it('中文内容正常保留', () => {
    expect(escapeHtml('智能体<运行中>')).toBe('智能体&lt;运行中&gt;')
  })
})
