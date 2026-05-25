/**
 * 菜单页「按钮绑定 / API 绑定」：
 * - 仅 MENU 类型在界面展示配置区；目录 CATALOG 由 POST /menu 的 menuButtons 空数组触发服务端写入隐式「查看」。
 * - 按钮/API 的增删改仅更新本地状态，点击菜单「提交」时由 useMenuController 将 buildMenuButtonsForMenuSave() 并入 MenuInfoVO。
 */
import { computed, nextTick, ref, watch, type ComputedRef, type Ref } from 'vue'
import type { ElTable } from 'element-plus'
import { ElMessage } from 'element-plus'
import {
  apiMetaToButtonApi,
  buttonApiToApiMeta,
  type MenuButtonInfoItem,
  type MenuInfoVO,
  type MenuMgmtVO,
} from '../../models/menuMgmt'
import type {
  ApiMetaDTO,
  ButtonDictVO,
  DraftMenuButtonSlot,
  MenuButtonPickerRow,
} from '../../models/permission'
import type { ServiceVO } from '../../models/discovery'
import type { MenuPanelMode } from './useMenuController'
import { fetchButtonDict } from '../../api/permission'
import { fetchDiscoveryServices } from '../../api/discovery'
import { isSessionExpiredError } from '../../utils/sessionExpired'
const VIEW_CODE = 'BTN_QUERY'
const DRAFT_ROW_PREFIX = '__draft__'
function newDraftTempKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `t${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
}
export function apiRowKeyFn(row: ApiMetaDTO) {
  return `${(row.method ?? '').toUpperCase()}::${row.urlPath ?? ''}`
}
function isDraftSyntheticMenuButtonId(id: unknown): id is string {
  return typeof id === 'string' && id.startsWith(DRAFT_ROW_PREFIX)
}
function draftTempKeyFromRowId(id: string): string {
  return id.slice(DRAFT_ROW_PREFIX.length)
}
/** 深拷贝本地按钮槽（用于「菜单→目录→菜单」恢复，避免引用污染） */
function cloneMenuButtonSlots(slots: DraftMenuButtonSlot[]): DraftMenuButtonSlot[] {
  return slots.map((s) => ({
    tempKey: s.tempKey,
    dictButtonId: s.dictButtonId,
    menuButtonId: s.menuButtonId,
    buttonCode: s.buttonCode,
    buttonName: s.buttonName,
    apis: s.apis.map((a) => ({ ...a })),
  }))
}
function hydrateSlotsFromMenuButtons(items: MenuButtonInfoItem[] | null | undefined): DraftMenuButtonSlot[] {
  const slots: DraftMenuButtonSlot[] = []
  for (const item of items ?? []) {
    const mb = item.menuButton
    if (mb == null) {
      continue
    }
    const dictId = mb.buttonId
    if (dictId == null || dictId === '') {
      continue
    }
    slots.push({
      tempKey: newDraftTempKey(),
      dictButtonId: String(dictId),
      menuButtonId: mb.id != null && mb.id !== '' ? String(mb.id) : undefined,
      buttonCode: mb.buttonCode ?? '',
      buttonName: mb.buttonName ?? '',
      apis: (item.buttonApis ?? []).map((a) => buttonApiToApiMeta(a)),
    })
  }
  return slots
}
export function useMenuPermission(
  formModel: Ref<MenuMgmtVO>,
  panelMode: Ref<MenuPanelMode>,
  showEditor: ComputedRef<boolean>,
  permissionBootstrapNonce: Ref<number>,
  menuInfo: Ref<MenuInfoVO | null>,
) {
  const permLoading = ref(false)
  const buttonDict = ref<ButtonDictVO[]>([])
  /**
   * 本地按钮槽：新建与编辑 MENU 均只改此结构，提交菜单时并入 POST /menu 的 menuButtons。
   */
  const localButtonSlots = ref<DraftMenuButtonSlot[]>([])
  /**
   * 从「非目录」切到「目录」时快照按钮+API，切回「菜单」时还原（同一菜单 id 下操作才生效；换树节点会清空）。
   * 若菜单最初即为目录，快照可能为空。
   */
  const savedNonDirectoryButtonsAndApis = ref<DraftMenuButtonSlot[] | null>(null)
  const isMenuType = computed(() => formModel.value.menuType === 'MENU')
  /** 新建且尚无菜单 id：绑定区需先保存菜单主体 */
  const isDraftMode = computed(
    () =>
      panelMode.value === 'create' &&
      isMenuType.value &&
      (formModel.value.id == null || formModel.value.id === ''),
  )
  const menuButtonTableRows = computed((): MenuButtonPickerRow[] =>
    localButtonSlots.value.map((s) => ({
      menuButtonId: `${DRAFT_ROW_PREFIX}${s.tempKey}`,
      dictButtonId: s.dictButtonId,
      buttonCode: s.buttonCode,
      buttonName: s.buttonName,
    })),
  )
  const selectedLeftRow = ref<MenuButtonPickerRow | null>(null)
  const rightApis = ref<ApiMetaDTO[]>([])
  const rightApisLoading = ref(false)
  const leftButtonTableRef = ref<InstanceType<typeof ElTable> | null>(null)
  const dictShuttleVisible = ref(false)
  const apiShuttleVisible = ref(false)
  const apiShuttleSeedApis = ref<ApiMetaDTO[]>([])
  /** API 弹窗标题用：当前选中的按钮展示名 */
  const apiShuttleButtonLabel = ref('')
  const apiEditDraftTempKey = ref<string | null>(null)
  const discoveryServices = ref<ServiceVO[]>([])
  const apiPickerLoading = ref(false)
  const viewDictId = computed(() => {
    const hit = buttonDict.value.find((d: ButtonDictVO) => d.buttonCode === VIEW_CODE)
    return hit?.id != null ? String(hit.id) : null
  })
  /** 绑定按钮弹窗回显：本地槽顺序 */
  const dictShuttleSeedIds = computed(() => {
    const ids = localButtonSlots.value
      .map((s) => (s.dictButtonId != null ? String(s.dictButtonId) : ''))
      .filter((x): x is string => !!x)
    return [...new Set(ids)]
  })
  watch(
    () => [formModel.value.id, formModel.value.menuType] as const,
    ([id, t], oldPair) => {
      if (oldPair == null) {
        return
      }
      const [oldId, oldT] = oldPair
      if (String(id ?? '') !== String(oldId ?? '')) {
        savedNonDirectoryButtonsAndApis.value = null
        return
      }
      if (oldT === 'MENU' && t === 'CATALOG') {
        savedNonDirectoryButtonsAndApis.value = cloneMenuButtonSlots(localButtonSlots.value)
        localButtonSlots.value = []
        selectedLeftRow.value = null
        rightApis.value = []
      } else if (oldT === 'CATALOG' && t === 'MENU') {
        const snap = savedNonDirectoryButtonsAndApis.value
        localButtonSlots.value = snap?.length ? cloneMenuButtonSlots(snap) : []
        savedNonDirectoryButtonsAndApis.value = null
      }
    },
  )
  const reloadPermissionSectionFromServer = async () => {
    selectedLeftRow.value = null
    rightApis.value = []
    if (!showEditor.value) {
      buttonDict.value = []
      localButtonSlots.value = []
      return
    }
    const midRaw = formModel.value.id
    const hasId = midRaw != null && midRaw !== ''
    const isMenu = formModel.value.menuType === 'MENU'
    const isCreateNoId = panelMode.value === 'create' && !hasId
    if (!isMenu) {
      if (!buttonDict.value.length) {
        permLoading.value = true
        try {
          buttonDict.value = await fetchButtonDict()
        } catch (e) {
          if (!isSessionExpiredError(e)) {
            ElMessage.error(e instanceof Error ? e.message : '加载字典失败')
          }
          buttonDict.value = []
        } finally {
          permLoading.value = false
        }
      }
      localButtonSlots.value = []
      return
    }
    if (isCreateNoId) {
      permLoading.value = true
      try {
        if (!buttonDict.value.length) {
          buttonDict.value = await fetchButtonDict()
        }
      } catch (e) {
        if (!isSessionExpiredError(e)) {
          ElMessage.error(e instanceof Error ? e.message : '加载字典失败')
        }
        buttonDict.value = []
      } finally {
        permLoading.value = false
      }
      return
    }
    if (!hasId) {
      localButtonSlots.value = []
      return
    }
    const mid = String(midRaw)
    permLoading.value = true
    try {
      if (!buttonDict.value.length) {
        buttonDict.value = await fetchButtonDict()
      }
      const info = menuInfo.value
      if (info?.menu?.id != null && String(info.menu.id) === mid) {
        localButtonSlots.value = hydrateSlotsFromMenuButtons(info.menuButtons)
        await selectFirstButtonRowIfNone()
      } else {
        localButtonSlots.value = []
      }
    } catch (e) {
      if (!isSessionExpiredError(e)) {
        ElMessage.error(e instanceof Error ? e.message : '加载按钮权限数据失败')
      }
      buttonDict.value = []
      localButtonSlots.value = []
    } finally {
      permLoading.value = false
    }
  }
  watch(
    () =>
      [showEditor.value, formModel.value.id, panelMode.value, permissionBootstrapNonce.value] as const,
    () => {
      void reloadPermissionSectionFromServer()
    },
    { immediate: true },
  )
  function getDraftSlotByRow(row: MenuButtonPickerRow | null): DraftMenuButtonSlot | null {
    const mid = row?.menuButtonId
    if (mid == null || !isDraftSyntheticMenuButtonId(mid)) {
      return null
    }
    const tk = draftTempKeyFromRowId(mid)
    return localButtonSlots.value.find((s) => s.tempKey === tk) ?? null
  }
  function loadRightPanelApisFromLocal() {
    const row = selectedLeftRow.value
    const slot = getDraftSlotByRow(row)
    if (slot) {
      rightApis.value = [...slot.apis]
      return
    }
    rightApis.value = []
  }
  watch(
    () => selectedLeftRow.value?.menuButtonId,
    () => {
      loadRightPanelApisFromLocal()
    },
  )
  watch(menuButtonTableRows, (rows) => {
    const cur = selectedLeftRow.value
    if (cur == null) {
      return
    }
    const sid = String(cur.menuButtonId ?? '')
    const found = rows.find((r) => String(r.menuButtonId ?? '') === sid)
    if (!found) {
      selectedLeftRow.value = null
    } else {
      selectedLeftRow.value = found
    }
  })
  function mergeLocalSlotsFromDictOrder(orderedDictIds: string[]) {
    const prevByDict = new Map(localButtonSlots.value.map((s) => [s.dictButtonId, s]))
    const next: DraftMenuButtonSlot[] = []
    for (const did of orderedDictIds) {
      const dict = buttonDict.value.find((d) => String(d.id) === did)
      const code = dict?.buttonCode ?? ''
      const name = dict?.buttonName ?? ''
      const prev = prevByDict.get(did)
      if (prev) {
        next.push(prev)
      } else {
        next.push({
          tempKey: newDraftTempKey(),
          dictButtonId: did,
          buttonCode: code,
          buttonName: name,
          apis: [],
        })
      }
    }
    localButtonSlots.value = next
  }
  const openDictPicker = async () => {
    if (!isDraftMode.value && (formModel.value.id == null || formModel.value.id === '')) {
      ElMessage.warning('请先保存菜单基本信息后再配置按钮。')
      return
    }
    if (permLoading.value) {
      return
    }
    permLoading.value = true
    try {
      if (!buttonDict.value.length) {
        buttonDict.value = await fetchButtonDict()
      }
      dictShuttleVisible.value = true
    } catch (e) {
      if (!isSessionExpiredError(e)) {
        ElMessage.error(e instanceof Error ? e.message : '加载字典失败')
      }
    } finally {
      permLoading.value = false
    }
  }
  const onDictShuttleConfirm = async (orderedIds: string[]) => {
    const vid = viewDictId.value
    const ids = [...orderedIds]
    if (vid && !ids.includes(vid)) {
      ids.unshift(vid)
    }
    const beforeDictIdSet = new Set(localButtonSlots.value.map((s) => s.dictButtonId))
    mergeLocalSlotsFromDictOrder(ids)
    dictShuttleVisible.value = false
    const added = localButtonSlots.value.filter((s) => !beforeDictIdSet.has(s.dictButtonId))
    let target: MenuButtonPickerRow | null = null
    if (added.length > 0) {
      const s = added[added.length - 1]!
      target = {
        menuButtonId: `${DRAFT_ROW_PREFIX}${s.tempKey}`,
        dictButtonId: s.dictButtonId,
        buttonCode: s.buttonCode,
        buttonName: s.buttonName,
      }
    } else if (localButtonSlots.value.length === 1) {
      const s = localButtonSlots.value[0]!
      target = {
        menuButtonId: `${DRAFT_ROW_PREFIX}${s.tempKey}`,
        dictButtonId: s.dictButtonId,
        buttonCode: s.buttonCode,
        buttonName: s.buttonName,
      }
    }
    if (target != null) {
      selectedLeftRow.value = target
      await nextTick()
      leftButtonTableRef.value?.setCurrentRow(target)
      loadRightPanelApisFromLocal()
    }
  }
  const removeMenuButtonRow = (row: MenuButtonPickerRow) => {
    if (row.buttonCode === VIEW_CODE || (viewDictId.value != null && String(row.dictButtonId) === viewDictId.value)) {
      ElMessage.warning('「查看」为必选按钮，不可移除。')
      return
    }
    const slot = getDraftSlotByRow(row)
    if (!slot) {
      return
    }
    localButtonSlots.value = localButtonSlots.value.filter((s) => s.tempKey !== slot.tempKey)
    if (selectedLeftRow.value?.menuButtonId === row.menuButtonId) {
      selectedLeftRow.value = null
      rightApis.value = []
    }
  }
  const onLeftButtonCurrentChange = (row: MenuButtonPickerRow | undefined) => {
    selectedLeftRow.value = row ?? null
  }
  /** 打开 API 弹窗前：无当前行时自动选中首行并同步右侧列表 */
  async function resolveApiPickerTargetRow(): Promise<MenuButtonPickerRow | null> {
    const cur = selectedLeftRow.value
    if (cur != null && getDraftSlotByRow(cur)) {
      return cur
    }
    const rows = menuButtonTableRows.value
    if (!rows.length) {
      ElMessage.warning('请先在左侧「+」绑定至少一个按钮')
      return null
    }
    const pick = rows[0]!
    selectedLeftRow.value = pick
    await nextTick()
    leftButtonTableRef.value?.setCurrentRow(pick)
    loadRightPanelApisFromLocal()
    return pick
  }
  /** 从服务端加载按钮槽后：默认高亮首行，便于直接点右侧「+」绑 API */
  async function selectFirstButtonRowIfNone() {
    if (selectedLeftRow.value != null) {
      return
    }
    const rows = menuButtonTableRows.value
    if (!rows.length) {
      return
    }
    const pick = rows[0]!
    selectedLeftRow.value = pick
    await nextTick()
    leftButtonTableRef.value?.setCurrentRow(pick)
    loadRightPanelApisFromLocal()
  }
  const openApiPickerDialog = async () => {
    if (apiPickerLoading.value) {
      return
    }
    const row = await resolveApiPickerTargetRow()
    if (row == null) {
      return
    }
    const draftSlot = getDraftSlotByRow(row)
    if (!draftSlot) {
      ElMessage.warning('未找到按钮绑定数据，请重新选择左侧按钮')
      return
    }
    apiShuttleButtonLabel.value = (row.buttonName ?? '').trim() || (row.buttonCode ?? '').trim() || ''
    apiEditDraftTempKey.value = draftSlot.tempKey
    apiShuttleSeedApis.value = [...draftSlot.apis]
    // 先打开弹窗，再拉服务列表，避免接口失败时用户误以为「没弹窗」
    apiShuttleVisible.value = true
    apiPickerLoading.value = true
    try {
      discoveryServices.value = await fetchDiscoveryServices()
    } catch (e) {
      if (!isSessionExpiredError(e)) {
        ElMessage.error(e instanceof Error ? e.message : '加载服务列表失败')
      }
      discoveryServices.value = []
    } finally {
      apiPickerLoading.value = false
    }
  }
  const onApiShuttleConfirm = (apis: ApiMetaDTO[]) => {
    const dtk = apiEditDraftTempKey.value
    if (dtk != null) {
      const slot = localButtonSlots.value.find((s) => s.tempKey === dtk)
      if (slot) {
        slot.apis = [...apis]
      }
      apiShuttleVisible.value = false
      loadRightPanelApisFromLocal()
    }
  }
  /** 取消新建等场景：丢弃本地绑定草稿 */
  const abortCreateDraft = () => {
    localButtonSlots.value = []
    savedNonDirectoryButtonsAndApis.value = null
    selectedLeftRow.value = null
    rightApis.value = []
  }
  /**
   * 组装 POST /menu 的 menuButtons；目录传空数组由服务端仅写入 BTN_QUERY。
   */
  function buildMenuButtonsForMenuSave(): MenuButtonInfoItem[] {
    const t = formModel.value.menuType
    if (t === 'CATALOG') {
      return []
    }
    if (t !== 'MENU') {
      return []
    }
    return localButtonSlots.value.map((s) => ({
      menuButton: {
        ...(s.menuButtonId != null ? { id: s.menuButtonId } : {}),
        buttonId: s.dictButtonId,
        buttonCode: s.buttonCode,
        buttonName: s.buttonName,
      },
      buttonApis: s.apis.map((a) => apiMetaToButtonApi(a)),
    }))
  }
  return {
    permLoading,
    buttonDict,
    draftButtonSlots: localButtonSlots,
    localButtonSlots,
    isDraftMode,
    menuButtonTableRows,
    selectedLeftRow,
    onLeftButtonCurrentChange,
    rightApis,
    rightApisLoading,
    leftButtonTableRef,
    dictShuttleVisible,
    dictShuttleSeedIds,
    viewDictId,
    openDictPicker,
    onDictShuttleConfirm,
    removeMenuButtonRow,
    isMenuType,
    discoveryServices,
    apiShuttleVisible,
    apiShuttleSeedApis,
    apiShuttleButtonLabel,
    apiPickerLoading,
    openApiPickerDialog,
    onApiShuttleConfirm,
    apiRowKeyFn,
    abortCreateDraft,
    buildMenuButtonsForMenuSave,
  }
}
