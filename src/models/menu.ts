/**
 * 菜单与页签模型定义（Model）。
 * 作者：leiyangjun
 */

import { type Component } from 'vue'

export interface MenuItem {
  index: string
  title: string
  icon: Component
}
