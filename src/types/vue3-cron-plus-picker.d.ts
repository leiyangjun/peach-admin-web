declare module 'vue3-cron-plus-picker' {
  import type { DefineComponent } from 'vue'

  export const Vue3CronPlusPicker: DefineComponent<{
    expression?: string
  /** second/min/hour/day/mouth/week/year/result */
    hideComponent?: string[]
  }>
}
declare module 'vue3-cron-plus-picker/style.css'
