import { ref, shallowRef, type Ref } from 'vue'
import { request } from '@/api'

export interface UseRequestOptions {
  immediate?: boolean
  initialData?: unknown
}

/**
 * 通用请求组合式函数，封装 loading / error / data 状态
 */
export function useRequest<T = unknown>(
  fetcher: () => Promise<T>,
  options: UseRequestOptions = {},
) {
  const { immediate = false, initialData } = options

  const data = shallowRef<T>((initialData as T) ?? (undefined as unknown as T)) as Ref<T>
  const loading = ref(false)
  const error = ref<Error | null>(null)

  async function run() {
    loading.value = true
    error.value = null
    try {
      data.value = await fetcher()
      return data.value
    } catch (err) {
      error.value = err as Error
      throw err
    } finally {
      loading.value = false
    }
  }

  if (immediate) {
    run().catch(() => {
      /* 错误已写入 error，业务侧自行处理 */
    })
  }

  return { data, loading, error, run, refresh: run }
}

/** 便捷封装：直接传 url 与 options 调用 request */
export function useGet<T = unknown>(url: string, params?: unknown) {
  return useRequest<T>(() => request<T>(url, { method: 'GET', body: params }))
}
