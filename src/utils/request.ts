// 需求清点：
// 超时 100s；
// 不自动拼接接口前缀，url 传入写完整路径；
// 封装 GET / POST；
// 内部自动执行 response.json()，外部直接拿业务数据；
// 处理网络异常、http 错误（4xx/5xx）、超时中断；
// 支持 AbortController，方便对话场景停止请求；
// 可扩展统一请求头（Token 鉴权）。
import { Message } from '@arco-design/web-vue'

import {apiPrefix,httpCode} from "@/config"


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
}

// 4.封装基础的fetch请求
const baseFetch = <T>(url: string, fetchOptions: FetchOptionType): Promise<T> => {
  // 5.将所有的配置信息合并起来
  const options: typeof baseFetchOptions & FetchOptionType = Object.assign(
    {},
    baseFetchOptions,
    fetchOptions,
  )

  // 6.组装url
  let urlWithPrefix = `${apiPrefix}${url.startsWith('/') ? url : `/${url}`}`

  // 7.解构出对应的请求方法、params、body参数
  const { method, params, body } = options

  // 8.如果请求是GET方法，并且传递了params参数
  if (method === 'GET' && params) {
    // const paramsArray: string[] = []
    // Object.keys(params).forEach((key) => {
    //   paramsArray.push(`${key}=${encodeURIComponent(params[key])}`)
    // })
    // if (urlWithPrefix.search(/\?/) === -1) {
    //   urlWithPrefix += `?${paramsArray.join('&')}`
    // } else {
    //   urlWithPrefix += `&${paramsArray.join('&')}`
    // }
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
          const rawText = await res.text();
          console.log("HTTP异常响应文本：", rawText);
          Message.error(`请求错误：${res.status} ${res.statusText}`);
          return reject(new Error(`HTTP ${res.status}`));
        }

        const raw = await res.text();
        console.log("原始响应文本：", raw);
        if (!raw) {
          throw new Error("服务端返回空数据");
        }
        const json = JSON.parse(raw);
        if (json.code === httpCode.success) {
          resolve(json);
        } else {
          Message.error(json.message);
          reject(new Error(json.message));
        }
  //        const raw = await res;
  // console.log("原始响应文本：", raw); // 重点观察！
  // const json = JSON.parse(raw);
  //         if (json.code === httpCode.success) {
  //           resolve(json)
  //         } else {
  //           Message.error(json.message)
  //           reject(new Error(json.message))
  //         }
        })
        .catch((err) => {
          Message.error(err.message)
          reject(err)
        })
    }),
  ]) as Promise<T>
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
