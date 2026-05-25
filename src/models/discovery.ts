/**
 * 服务发现相关前端模型（对接 peach-common-service GET /admin/discovery）。
 */

/** 与后端 ServiceVO 对齐 */
export interface ServiceVO {
  serviceId: string
  serviceName: string
}
