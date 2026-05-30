/**
 * 菜单图标：数据库存组件名（PascalCase），与动态侧栏 {@link resolveMenuIconComponent} 一致。
 */

import type { Component } from 'vue'
import {
  Avatar,
  Bell,
  Box,
  Briefcase,
  Calendar,
  ChatDotRound,
  CircleCheck,
  Clock,
  Collection,
  Compass,
  CopyDocument,
  Cpu,
  CreditCard,
  DataAnalysis,
  DataBoard,
  Delete,
  Document,
  Download,
  EditPen,
  Expand,
  Files,
  Fold,
  FolderOpened,
  Finished,
  Goods,
  Guide,
  Grid,
  Help,
  Hide,
  Histogram,
  House,
  Key,
  Link,
  List,
  Location,
  Lock,
  Management,
  Medal,
  Menu,
  Message,
  Monitor,
  Notebook,
  OfficeBuilding,
  Operation,
  Phone,
  Picture,
  PieChart,
  Platform,
  Plus,
  Printer,
  Promotion,
  Refresh,
  Search,
  Service,
  SetUp,
  Setting,
  Share,
  ShoppingCart,
  Stamp,
  Star,
  Ticket,
  Tools,
  TrendCharts,
  Unlock,
  Upload,
  User,
  VideoCamera,
  View,
  Wallet,
  Warning,
} from '@element-plus/icons-vue'

/** 单条可选图标：value 写入库表 icon 字段 */
export interface MenuIconOption {
  label: string
  /** 与 @element-plus/icons-vue 导出组件名一致，如 House、User */
  value: string
  component: Component | null
}

/** 「无图标」占位，value 为空串 */
export const MENU_ICON_NONE: MenuIconOption = { label: '无图标', value: '', component: null }

/**
 * 预置图标列表（含当前后台左侧已用的 House/User/Lock/Menu 及常用管理类图标）。
 */
export const MENU_ICON_OPTIONS: MenuIconOption[] = [
  MENU_ICON_NONE,
  { label: '首页', value: 'House', component: House },
  { label: '用户', value: 'User', component: User },
  { label: '权限锁', value: 'Lock', component: Lock },
  { label: '解锁', value: 'Unlock', component: Unlock },
  { label: '密钥', value: 'Key', component: Key },
  { label: '菜单', value: 'Menu', component: Menu },
  { label: '集合', value: 'Collection', component: Collection },
  { label: '设置', value: 'Setting', component: Setting },
  { label: '文档', value: 'Document', component: Document },
  { label: '文件夹', value: 'FolderOpened', component: FolderOpened },
  { label: '多文件', value: 'Files', component: Files },
  { label: '编辑', value: 'EditPen', component: EditPen },
  { label: '删除', value: 'Delete', component: Delete },
  { label: '搜索', value: 'Search', component: Search },
  { label: '新增', value: 'Plus', component: Plus },
  { label: '上传', value: 'Upload', component: Upload },
  { label: '下载', value: 'Download', component: Download },
  { label: '图片', value: 'Picture', component: Picture },
  { label: '收藏', value: 'Star', component: Star },
  { label: '链接', value: 'Link', component: Link },
  { label: '分享', value: 'Share', component: Share },
  { label: '显示器', value: 'Monitor', component: Monitor },
  { label: 'CPU', value: 'Cpu', component: Cpu },
  { label: '网格', value: 'Grid', component: Grid },
  { label: '列表', value: 'List', component: List },
  { label: '操作', value: 'Operation', component: Operation },
  { label: '柱状图', value: 'Histogram', component: Histogram },
  { label: '工具', value: 'Tools', component: Tools },
  { label: '楼宇', value: 'OfficeBuilding', component: OfficeBuilding },
  { label: '商品', value: 'Goods', component: Goods },
  { label: '购物车', value: 'ShoppingCart', component: ShoppingCart },
  { label: '包裹', value: 'Box', component: Box },
  { label: '钱包', value: 'Wallet', component: Wallet },
  { label: '银行卡', value: 'CreditCard', component: CreditCard },
  { label: '时钟', value: 'Clock', component: Clock },
  { label: '日历', value: 'Calendar', component: Calendar },
  { label: '铃铛', value: 'Bell', component: Bell },
  { label: '消息', value: 'Message', component: Message },
  { label: '会话', value: 'ChatDotRound', component: ChatDotRound },
  { label: '电话', value: 'Phone', component: Phone },
  { label: '定位', value: 'Location', component: Location },
  { label: '促销', value: 'Promotion', component: Promotion },
  { label: '成功', value: 'CircleCheck', component: CircleCheck },
  { label: '警告', value: 'Warning', component: Warning },
  { label: '展开', value: 'Expand', component: Expand },
  { label: '折叠', value: 'Fold', component: Fold },
  { label: '完成', value: 'Finished', component: Finished },
  { label: '向导', value: 'Guide', component: Guide },
  { label: '配置', value: 'SetUp', component: SetUp },
  { label: '管理', value: 'Management', component: Management },
  { label: '平台', value: 'Platform', component: Platform },
  { label: '服务', value: 'Service', component: Service },
  { label: '头像', value: 'Avatar', component: Avatar },
  { label: '查看', value: 'View', component: View },
  { label: '隐藏', value: 'Hide', component: Hide },
  { label: '刷新', value: 'Refresh', component: Refresh },
  { label: '复制', value: 'CopyDocument', component: CopyDocument },
  { label: '数据分析', value: 'DataAnalysis', component: DataAnalysis },
  { label: '数据看板', value: 'DataBoard', component: DataBoard },
  { label: '饼图', value: 'PieChart', component: PieChart },
  { label: '趋势', value: 'TrendCharts', component: TrendCharts },
  { label: '票据', value: 'Ticket', component: Ticket },
  { label: '笔记本', value: 'Notebook', component: Notebook },
  { label: '勋章', value: 'Medal', component: Medal },
  { label: '公文包', value: 'Briefcase', component: Briefcase },
  { label: '指南针', value: 'Compass', component: Compass },
  { label: '打印', value: 'Printer', component: Printer },
  { label: '摄像', value: 'VideoCamera', component: VideoCamera },
  { label: '印章', value: 'Stamp', component: Stamp },
  { label: '帮助', value: 'Help', component: Help },
]

const ICON_MAP = new Map<string, Component>()
for (const o of MENU_ICON_OPTIONS) {
  if (o.value && o.component) {
    ICON_MAP.set(o.value, o.component)
  }
}

/** 按库中存放的组件名字符串解析图标，未知则返回 null */
export function resolveMenuIconComponent(name: string | null | undefined): Component | null {
  if (name == null || !String(name).trim()) {
    return null
  }
  return ICON_MAP.get(String(name).trim()) ?? null
}
