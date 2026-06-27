/**
 * HTML 工具函数
 * 防止 XSS 注入的转义工具
 */

/**
 * 转义 HTML 特殊字符，防止 XSS
 * @param {any} str - 需要转义的值
 * @returns {string} 转义后的安全字符串
 */
export const escapeHtml = (str) => {
  if (!str) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
