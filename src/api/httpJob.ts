import axios from 'axios'
import JSONbigint from 'json-bigint'
import { buildGatewayServiceBaseUrl, PEACH_JOB_SERVICE } from '../config/gatewayOrigin'
import { setupAuthInterceptors } from './setupAuthInterceptors'

const jsonParser = JSONbigint({ storeAsString: true })

/** peach-job-service：经网关访问，baseURL = 网关 origin + `/peach-job-service` + 管理 API 前缀。 */
const httpJob = axios.create({
  baseURL: buildGatewayServiceBaseUrl(PEACH_JOB_SERVICE),
  timeout: 20000,
  transformResponse: [
    (data) => {
      if (data == null || data === '') {
        return data
      }
      if (typeof data !== 'string') {
        return data
      }
      try {
        return jsonParser.parse(data) as unknown
      } catch {
        return data
      }
    },
  ],
})

setupAuthInterceptors(httpJob)

export default httpJob
