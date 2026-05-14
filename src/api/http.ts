import axios from 'axios'
import { ADMIN_API_PATH_PREFIX } from '../config/adminApiPrefix'
import { rejectAxiosResponse } from './axiosResponseHandler'

/**
 * 开发环境：Vite 将 `/api` + 管理前缀代理至网关（8090），并重写为 `/peach-auth-service` + 同前缀。
 * 生产环境：请在 Nginx 等对 `/api` + 同前缀转发至同一网关入口。
 */
const http = axios.create({
  baseURL: `/api${ADMIN_API_PATH_PREFIX}`,
  timeout: 10000,
})

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('peach_admin_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

/** HTTP 非 2xx：401 由全局注册的 {@link registerSessionExpiredHandler} 跳转登录；其余抛出后端 msg */
http.interceptors.response.use(
  (response) => response,
  (error) => rejectAxiosResponse(error),
)

export default http
