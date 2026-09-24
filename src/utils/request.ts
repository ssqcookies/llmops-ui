// 需求清点：
// 超时 100s；
// 不自动拼接接口前缀，url 传入写完整路径；
// 封装 GET / POST；
// 内部自动执行 response.json()，外部直接拿业务数据；
// 处理网络异常、http 错误（4xx/5xx）、超时中断；
// 支持 AbortController，方便对话场景停止请求；
// 可扩展统一请求头（Token 鉴权）。
import { Message } from '@arco-design/web-vue'
import { useCredentialStore, useAccountStore } from '@/stores'

import { apiPrefix, httpCode } from "@/config"
import router from '@/router'


// 1.超时时间为100s
const TIME_OUT = 100 * 1000

// 2.基础的配置
const baseFetchOptions = {
  method: 'GET',
  mode: 'cors',
  // credentials: 'include',//默认跨域 credentials:include，携带 Cookie
  headers: new Headers({
    'Content-Type': 'application/json',
  }),


  redirect: 'follow',
}

// 3.fetch参数类型：自定义请求参数类型 FetchOptionType
/**
 利用 Omit 工具类型基于浏览器原生 RequestInit 扩展，剔除原生 body 类型，新增业务自定义的 params、body；
既复用浏览器内置类型，又扩展我们业务需要的查询参数，保证请求配置拥有完整代码提示。

 */
type FetchOptionType = Omit<RequestInit, 'body'> & {
  params?: Record<string, any>
  body?: BodyInit | Record<string, any> | null
  /** 业务错误（code !== success）时是否 reject；默认 true。为 false 时 resolve 完整响应供调用方自行判断 code。 */
  rejectOnBusinessError?: boolean
}

// 4.封装基础的fetch请求
const baseFetch = <T>(url: string, fetchOptions: FetchOptionType): Promise<T> => {
  // 5.将 rejectOnBusinessError 从 fetch 配置中剥离
  const { rejectOnBusinessError = true, ...restFetchOptions } = fetchOptions
  // 6.将所有的配置信息合并起来
  const options: typeof baseFetchOptions & Omit<FetchOptionType, 'rejectOnBusinessError'> = Object.assign(
    {},
    baseFetchOptions,
    restFetchOptions,
  )
  const { credential, clear: clearCredential } = useCredentialStore()
  const { clear: clearAccount } = useAccountStore()
  const access_token = credential.access_token
  if (access_token) options.headers.set('Authorization', `Bearer ${access_token}`)

  // 7.组装url
  let urlWithPrefix = `${apiPrefix}${url.startsWith('/') ? url : `/${url}`}`

  // 8.解构出对应的请求方法、params、body参数
  const { method, params, body } = options

  // 8.如果请求是GET方法，并且传递了params参数
  if (method === 'GET' && params) {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null) {
        searchParams.append(key, String(val))
      }
    })
    const queryStr = searchParams.toString()
    if (queryStr) {
      urlWithPrefix += urlWithPrefix.includes('?') ? `&${queryStr}` : `?${queryStr}`
    }
    delete options.params
  }

  // 9.处理post传递的数据（内部自动执行 res.json()，外部直接拿到解析后数据）
  if (body && !(body instanceof FormData)) {
    options.body = JSON.stringify(body)
  }

  // 10.同时发起两个Promise(或者是说两个操作，看谁先返回，就先结束)
  return Promise.race([
    // 11.使用定时器来检测是否超时（采用 Promise.race 实现超时控制）
    new Promise((resolve, reject) => {
      setTimeout(() => {
        reject('接口已超时')
      }, TIME_OUT)
    }),
    // 12.发起一个正常请求 globalThis获取对应的上下文信息
    new Promise((resolve, reject) => {
      globalThis
        .fetch(urlWithPrefix, options as RequestInit)
        .then(async (res) => {
          // ✅ 优先拦截HTTP异常状态（404/500/403等）
          if (!res.ok) {
            // 登录态失效（HTTP 401）：清理本地缓存并回登录页
            if (res.status === 401) {
              clearCredential()
              clearAccount()
              await router.replace({ path: '/auth/login' })
              return reject(new Error('登录已失效'))
            }
            // 无访问权限（HTTP 403）：跳转 403 页面
            if (res.status === 403) {
              await router.replace({ path: '/403' })
              return reject(new Error('没有访问权限'))
            }
            const rawText = await res.text();
            Message.error(`请求错误：${res.status} ${res.statusText}`);
            return reject(new Error(`HTTP ${res.status}`));
          }

          const raw = await res.text();
          if (!raw) {
            throw new Error("服务端返回空数据");
          }
          const json = JSON.parse(raw);
          if (json.code === httpCode.success) {
            resolve(json);
          } else if (json.code === httpCode.unauthorized) {
            clearCredential()
            clearAccount()
            await router.replace({ path: '/auth/login' })
            reject(new Error('登录已失效'))
          } else if (json.code === httpCode.notFound) {
            await router.push({ name: 'errors-not-found' })
          } else if (json.code === httpCode.forbidden) {
            await router.push({ name: 'errors-forbidden' })
          } else {
            Message.error(json.message);
            if (rejectOnBusinessError) {
              reject(new Error(json.message));
            } else {
              resolve(json);
            }
          }
        })
        .catch((err) => {
          Message.error(err.message)
          reject(err)
        })
    }),
  ]) as Promise<T>
}


// 5.封装基于post的sse(流式事件响应)请求
export const ssePost = async (
  url: string,
  fetchOptions: FetchOptionType,
  onData: (data: { [key: string]: any }) => void,
) => {
  // 5.1 组装基础的fetch请求配置
  const options = Object.assign({}, baseFetchOptions, { method: 'POST' }, fetchOptions)
  const { credential } = useCredentialStore()
  const access_token = credential.access_token
  if (access_token) options.headers.set('Authorization', `Bearer ${access_token}`)

  // 5.2 组装请求URL
  const urlWithPrefix = `${apiPrefix}${url.startsWith('/') ? url : `/${url}`}`

  // 5.3 结构body参数，并处理body对应的数据
  const { body } = fetchOptions
  if (body) options.body = JSON.stringify(body)

  // 5.4 发起fetch请求并处理流式事件响应
  const response = await globalThis.fetch(urlWithPrefix, options as RequestInit)
  return handleStream(response, onData)
}

const handleStream = (response: Response, onData: (data: { [key: string]: any }) => void) => {
  // 1.检测网络请求是否正常
  if (!response.ok) throw new Error('网络请求失败')

  // 2.构建reader以及deocder
  const reader = response.body?.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''

  // 3.构建read函数用于去读取数据
  const read = () => {
    let hasError = false
    reader?.read().then((result: any) => {
      if (result.done) return

      buffer += decoder.decode(result.value, { stream: true })
      const lines = buffer.split('\n')

      let event = ''
      let data = ''

      try {
        lines.forEach((line) => {
          line = line.trim()
          if (line.startsWith('event:')) {
            event = line.slice(6).trim()
          } else if (line.startsWith('data:')) {
            //数据
            data = line.slice(5).trim()
          }

          // 每个事件以空行结束，只有event和data同时存在，才表示一次流式事件的数据完整获取到了
          if (line === '') {
            if (event !== '' && data !== '') {
              onData({
                event: event,
                data: JSON.parse(data),
              })
              event = ''
              data = ''
            }
          }
        })
        buffer = lines.pop() || ''
      } catch (e) {
        hasError = true
      }

      if (!hasError) read()
    })
  }
  // 4.调用read函数去执行获取对应的数据
  read()
}


export const upload = <T>(url: string, options: any = {}): Promise<T> => {
  // 1 组装请求URL
  const urlWithPrefix = `${apiPrefix}${url.startsWith('/') ? url : `/${url}`}`

  // 2.组装xhr请求配置信息
  const defaultOptions = {
    method: 'POST',
    url: urlWithPrefix,
    headers: {},
    data: {},
  }
  options = {
    ...defaultOptions,
    ...options,
    headers: { ...defaultOptions.headers, ...options.headers },
  }
  const { credential, clear: clearCredential } = useCredentialStore()
  const { clear: clearAccount } = useAccountStore()
  const access_token = credential.access_token
  if (access_token) options.headers['Authorization'] = `Bearer ${access_token}`

  // 3.构建promise并使用xhr完成文件上传
  return new Promise((resolve, reject) => {
    // 4.创建xhr服务
    const xhr = new XMLHttpRequest()

    // 5.初始化xhr请求并配置headers
    xhr.open(options.method, options.url)
    for (const key in options.headers) {
      xhr.setRequestHeader(key, options.headers[key])
    }

    // 6.设置xhr响应格式并携带授权凭证（例如cookie）
    xhr.withCredentials = true
    xhr.responseType = 'json'

    // 7.监听xhr状态变化并导出数据
    xhr.onreadystatechange = async () => {
      // 8.判断xhr的状态是不是为4，如果为4则代表已经传输完成（涵盖成功与失败）
      if (xhr.readyState === 4) {
        // 9.检查响应状态码，当HTTP状态码为200的时候表示请求成功
        if (xhr.status === 200) {
          // 10.判断业务状态码是否正常
          const response = xhr.response
          if (response.code === httpCode.success) {
            resolve(response)
          } else if (response.code === httpCode.unauthorized) {
            clearCredential()
            clearAccount()
            await router.replace({ path: '/auth/login' })
            reject(new Error('登录已失效'))
          } else {
            reject(xhr.response)
          }
        } else if (xhr.status === 401) {
          // 登录态失效（HTTP 401）：清理本地缓存并回登录页
          clearCredential()
          clearAccount()
          await router.replace({ path: '/auth/login' })
          reject(new Error('登录已失效'))
        } else if (xhr.status === 403) {
          // 无访问权限（HTTP 403）：跳转 403 页面
          await router.replace({ path: '/403' })
          reject(new Error('没有访问权限'))
        } else {
          reject(xhr)
        }
      }
    }

    // 10.添加xhr进度监听
    xhr.upload.onprogress = options.onprogress

    // 11.发送请求
    xhr.send(options.data)
  })
}


export const request = <T>(url: string, options = {}) => {
  return baseFetch<T>(url, options)
}

export const get = <T>(url: string, options = {}) => {
  return request<T>(url, Object.assign({}, options, { method: 'GET' }))
}

export const post = <T>(url: string, options = {}) => {
  return request<T>(url, Object.assign({}, options, { method: 'POST' }))
}

// 14. 保留业务错误 code 的请求封装（用于需要调用方自行判断 code 的场景）
export const requestWithCode = <T extends { code: string }>(url: string, options = {}) => {
  return baseFetch<T>(url, Object.assign({}, options, { rejectOnBusinessError: false }))
}

// 15. 获取原始 Response（用于图片流/svg 源码等非 JSON 响应）
export const requestRaw = (url: string, fetchOptions: FetchOptionType = {}): Promise<Response> => {
  const options: typeof baseFetchOptions & FetchOptionType = Object.assign(
    {},
    baseFetchOptions,
    fetchOptions,
  )

  let urlWithPrefix = `${apiPrefix}${url.startsWith('/') ? url : `/${url}`}`
  const { method, params, body } = options

  if (method === 'GET' && params) {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null) {
        searchParams.append(key, String(val))
      }
    })
    const queryStr = searchParams.toString()
    if (queryStr) {
      urlWithPrefix += urlWithPrefix.includes('?') ? `&${queryStr}` : `?${queryStr}`
    }
    delete options.params
  }

  if (body && !(body instanceof FormData)) {
    options.body = JSON.stringify(body)
  }

  return Promise.race([
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('接口已超时')), TIME_OUT)
    }),
    globalThis.fetch(urlWithPrefix, options as RequestInit).then((res) => {
      if (!res.ok) {
        return Promise.reject(new Error(`HTTP ${res.status}`))
      }
      return res
    }),
  ])
}
