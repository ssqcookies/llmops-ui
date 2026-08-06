/** 通用格式化工具函数 */

/** 格式化时间戳为本地时间字符串 */
export function formatTime(value: number | string | Date, template = 'YYYY-MM-DD HH:mm:ss'): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const pad = (n: number) => String(n).padStart(2, '0')
  return template
    .replace('YYYY', String(date.getFullYear()))
    .replace('MM', pad(date.getMonth() + 1))
    .replace('DD', pad(date.getDate()))
    .replace('HH', pad(date.getHours()))
    .replace('mm', pad(date.getMinutes()))
    .replace('ss', pad(date.getSeconds()))
}

/** 文件大小字节数转人类可读 */
export function formatFileSize(bytes: number): string {
  if (bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`
}

/** 千分位分隔 */
export function formatNumber(num: number | string): string {
  return String(num).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}
