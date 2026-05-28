import axios from 'axios'
import { buildGatewayServiceBaseUrl, PEACH_AUTH_SERVICE } from '../config/gatewayOrigin'
import { setupAuthInterceptors } from './setupAuthInterceptors'

/** peach-auth-service：经网关访问，baseURL = 网关 origin + `/peach-gateway/peach-auth-service` + 管理 API 前缀。 */
const http = axios.create({
  baseURL: buildGatewayServiceBaseUrl(PEACH_AUTH_SERVICE),
  timeout: 10000,
})

setupAuthInterceptors(http)

export default http
