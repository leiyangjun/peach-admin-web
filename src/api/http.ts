import axios from 'axios'
import { rejectAxiosResponse } from './axiosResponseHandler'

/**
 * 开发环境：Vite 将 /api 固定代理至网关（8090），并重写为 /peach-auth-service/**。
 * 生产环境：请在 Nginx 等对 /api 转发至同一网关入口（路径前缀与部署一致）。
 */
const http = axios.create({
  baseURL: '/api',
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
