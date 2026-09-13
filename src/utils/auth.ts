import storage from './storage'

/**
 * 判断当前是否已登录：
 * - credential 存在且 access_token 非空
 * - expire_at 未过期
 * 未登录时清理本地所有缓存（含用户信息 + 授权凭证）。
 */
const isLogin = (): boolean => {
  const credential = storage.get('credential')

  const now = Math.floor(Date.now() / 1000)
  if (
    !credential ||
    !credential.access_token ||
    !credential.expire_at ||
    credential.expire_at < now
  ) {
    storage.clear()
    return false
  }
  return true
}

export default isLogin
