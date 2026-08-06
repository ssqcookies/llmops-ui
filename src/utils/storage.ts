/** 本地存储封装，统一加前缀并做 JSON 序列化 */
const PREFIX = 'llmops_'

function buildKey(key: string): string {
  return `${PREFIX}${key}`
}

export const storage = {
  get<T = unknown>(key: string, defaultValue: T): T {
    const raw = localStorage.getItem(buildKey(key))
    if (raw === null) return defaultValue
    try {
      return JSON.parse(raw) as T
    } catch {
      return defaultValue
    }
  },

  set(key: string, value: unknown): void {
    localStorage.setItem(buildKey(key), JSON.stringify(value))
  },

  remove(key: string): void {
    localStorage.removeItem(buildKey(key))
  },

  clear(): void {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(PREFIX))
      .forEach((k) => localStorage.removeItem(k))
  },
}
