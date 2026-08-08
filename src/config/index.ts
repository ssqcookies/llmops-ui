// 前端配置代理，向自己地址发起请求，vite服务器去代理到5000
// export const apiPrefix = "http://localhost:5173/api"
export const apiPrefix = "http://127.0.0.1:5000"


export const httpCode = {
  success: 'success',
  fail: 'fail',
  notFound: 'not_found',
  unauthorized: 'unauthorized',
  forbidden: 'forbidden',
  validateError: 'validate_error',
}