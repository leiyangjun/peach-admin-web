declare module 'no-vue3-cron' {
  import type { DefineComponent, Plugin } from 'vue'

  export const noVue3Cron: DefineComponent<{
    cronValue?: string
    maxHeight?: string
    i18n?: 'en' | 'cn'
  }>

  interface NoVue3CronModule {
    noVue3Cron: typeof noVue3Cron
    default: Plugin
  }

  const lib: NoVue3CronModule
  export default lib
}

declare module 'no-vue3-cron/lib/noVue3Cron.css'
