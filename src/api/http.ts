import axios from 'axios'
import { ADMIN_API_PATH_PREFIX } from '../config/adminApiPrefix'
import { setupAuthInterceptors } from './setupAuthInterceptors'

/**
 * 开发环境：Vite 将 `/api` + 管理前缀代理至网关（8090），并重写为 `/peach-auth-service` + 同前缀。
 * 生产环境：请在 Nginx 等对 `/api` + 同前缀转发至同一网关入口。
 */
const http = axios.create({
  baseURL: `/api${ADMIN_API_PATH_PREFIX}`,
  timeout: 10000,
})

setupAuthInterceptors(http)

export default http
