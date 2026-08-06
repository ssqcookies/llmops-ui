import { useAuthStore } from '@/stores'

export interface RequestOptions {
  /** 请求方法 */
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  /** 请求头 */
  headers?: Record<string, string>
  /** 请求体，GET 时会作为 query 拼接到 URL */
  body?: unknown
  /** 是否携带鉴权 token，默认 true */
  auth?: boolean
  /** 自定义错误处理 */
  onError?: (message: string) => void
}

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'

/** 将对象序列化为 query string */
function toQueryString(params: Record<string, unknown>): string {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      search.append(key, String(value))
    }
  })
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

/** 统一请求封装，基于 fetch，业务侧直接消费 res.data */
export async function request<T = unknown>(
  url: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = 'GET', headers = {}, body, auth = true } = options

  const finalHeaders = new Headers(headers)
  if (finalHeaders.get('Content-Type') === null && body && method !== 'GET') {
    finalHeaders.set('Content-Type', 'application/json;charset=utf-8')
  }
  if (auth) {
    const authStore = useAuthStore()
    if (authStore.token) {
      finalHeaders.set('Authorization', `Bearer ${authStore.token}`)
    }
  }

  let finalUrl = `${BASE_URL}${url}`
  let payload: BodyInit | undefined
  if (body && method === 'GET') {
    finalUrl += toQueryString(body as Record<string, unknown>)
  } else if (body) {
    payload = JSON.stringify(body)
  }

  const response = await fetch(finalUrl, {
    method,
    headers: finalHeaders,
    body: payload,
  })

  if (response.status === 401) {
    const authStore = useAuthStore()
    authStore.logout()
    throw new Error('未授权，请重新登录')
  }

  const result = (await response.json()) as { code: number; message: string; data: T }

  if (!response.ok || result.code !== 0) {
    const message = result.message ?? `请求失败：${response.status}`
    options.onError?.(message)
    throw new Error(message)
  }

  return result.data
}
