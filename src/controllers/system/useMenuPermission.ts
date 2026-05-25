/**
 * 菜单页「按钮绑定 / API 绑定」：
 * - 仅 MENU 类型在界面展示配置区；目录 CATALOG 保存时仍提交 BTN_QUERY 一条（无 API），与 MENU 默认「查看」一致。
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
import { fetchButtonAll } from '../../api/button'
import { fetchDiscoveryServices } from '../../api/discovery'
import { isSessionExpiredError } from '../../utils/sessionExpired'
import { CMN_BUTTON, CMN_BUTTON_LABEL } from '../../constants/cmnButton'
const VIEW_CODE = CMN_BUTTON.QUERY
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
/** 判断是否为必选「查询」按钮行（BTN_QUERY，不可删除） */
function isRequiredQueryButtonRow(
  row: MenuButtonPickerRow,
  viewDictId: string | null,
): boolean {
  return (
    row.buttonCode === VIEW_CODE ||
    (viewDictId != null && String(row.dictButtonId) === viewDictId)
  )
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
    if (hit?.id != null) {
      return String(hit.id)
    }
    const slot = localButtonSlots.value.find((s) => s.buttonCode === VIEW_CODE)
    return slot?.dictButtonId ?? null
  })
  /** 绑定按钮弹窗：右侧已选行的 code/name 回显 */
  const dictShuttleSeedRows = computed((): ButtonDictVO[] =>
    localButtonSlots.value.map((s) => ({
      id: s.dictButtonId,
      buttonCode: s.buttonCode,
      buttonName: s.buttonName,
    })),
  )
  /** 按需拉取全量字典（新建 MENU、目录保存、类型切回 MENU 等） */
  async function loadButtonAllIfNeeded(): Promise<boolean> {
    if (buttonDict.value.length) {
      return true
    }
    try {
      buttonDict.value = await fetchButtonAll()
      return true
    } catch (e) {
      if (!isSessionExpiredError(e)) {
        ElMessage.error(e instanceof Error ? e.message : '加载按钮字典失败')
      }
      buttonDict.value = []
      return false
    }
  }
  /** 新建/编辑 MENU：确保本地槽首行含 BTN_QUERY（字典 id 来自 loadButtonDict） */
  function ensureDefaultQueryButton() {
    const dict = buttonDict.value.find((d) => d.buttonCode === VIEW_CODE)
    const dictId = dict?.id != null ? String(dict.id) : null
    if (!dictId) {
      return
    }
    const code = dict?.buttonCode ?? VIEW_CODE
    const name = dict?.buttonName ?? CMN_BUTTON_LABEL[VIEW_CODE]
    const existing = localButtonSlots.value.find(
      (s) => s.buttonCode === VIEW_CODE || s.dictButtonId === dictId,
    )
    if (existing) {
      if (localButtonSlots.value[0] !== existing) {
        localButtonSlots.value = [
          existing,
          ...localButtonSlots.value.filter((s) => s !== existing),
        ]
      }
      return
    }
    localButtonSlots.value = [
      {
        tempKey: newDraftTempKey(),
        dictButtonId: dictId,
        buttonCode: code,
        buttonName: name,
        apis: [],
      },
      ...localButtonSlots.value,
    ]
  }
  function isRequiredQueryButton(row: MenuButtonPickerRow): boolean {
    return isRequiredQueryButtonRow(row, viewDictId.value)
  }
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
        void (async () => {
          await loadButtonAllIfNeeded()
          ensureDefaultQueryButton()
        })()
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
      localButtonSlots.value = []
      return
    }
    if (isCreateNoId) {
      localButtonSlots.value = []
      savedNonDirectoryButtonsAndApis.value = null
      selectedLeftRow.value = null
      rightApis.value = []
      dictShuttleVisible.value = false
      apiShuttleVisible.value = false
      permLoading.value = true
      try {
        await loadButtonAllIfNeeded()
        ensureDefaultQueryButton()
        await selectFirstButtonRowIfNone()
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
      const info = menuInfo.value
      if (info?.menu?.id != null && String(info.menu.id) === mid) {
        localButtonSlots.value = hydrateSlotsFromMenuButtons(info.menuButtons)
        ensureDefaultQueryButton()
        await selectFirstButtonRowIfNone()
      } else {
        localButtonSlots.value = []
      }
    } catch (e) {
      if (!isSessionExpiredError(e)) {
        ElMessage.error(e instanceof Error ? e.message : '加载按钮权限数据失败')
      }
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
  function mergeLocalSlotsFromDictOrder(orderedDictIds: string[], rows?: ButtonDictVO[]) {
    const rowById = new Map((rows ?? []).map((r) => [String(r.id), r]))
    const prevByDict = new Map(localButtonSlots.value.map((s) => [s.dictButtonId, s]))
    const next: DraftMenuButtonSlot[] = []
    for (const did of orderedDictIds) {
      const row = rowById.get(did) ?? buttonDict.value.find((d) => String(d.id) === did)
      const code = row?.buttonCode ?? ''
      const name = row?.buttonName ?? ''
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
  const openDictPicker = () => {
    if (!isDraftMode.value && (formModel.value.id == null || formModel.value.id === '')) {
      ElMessage.warning('请先保存菜单基本信息后再配置按钮。')
      return
    }
    if (permLoading.value) {
      return
    }
    dictShuttleVisible.value = true
  }
  const onDictShuttleConfirm = async (orderedRows: ButtonDictVO[]) => {
    const vid = viewDictId.value
    let rows = [...orderedRows]
    if (vid && !rows.some((r) => r.id != null && String(r.id) === vid)) {
      const fromDict = buttonDict.value.find((d) => String(d.id) === vid)
      const fromSlot = localButtonSlots.value.find((s) => s.dictButtonId === vid)
      rows.unshift({
        id: vid,
        buttonCode: fromDict?.buttonCode ?? fromSlot?.buttonCode ?? VIEW_CODE,
        buttonName: fromDict?.buttonName ?? fromSlot?.buttonName ?? CMN_BUTTON_LABEL[VIEW_CODE],
      })
    }
    const ids = rows
      .map((r) => (r.id != null ? String(r.id) : ''))
      .filter((x): x is string => !!x)
    const beforeDictIdSet = new Set(localButtonSlots.value.map((s) => s.dictButtonId))
    mergeLocalSlotsFromDictOrder(ids, rows)
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
    if (isRequiredQueryButton(row)) {
      ElMessage.warning('「查询（BTN_QUERY）」为必选，不可移除。')
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
  /** 目录保存前懒加载 BTN_QUERY 字典 id */
  async function prepareMenuButtonsForSave(): Promise<void> {
    if (formModel.value.menuType === 'CATALOG') {
      await loadButtonAllIfNeeded()
    }
  }
  /** 目录保存：提交必选「查询」按钮行（无 API），与 MENU 的 ensureDefaultQueryButton 对齐 */
  function buildCatalogQueryMenuButton(): MenuButtonInfoItem | null {
    const dictId = viewDictId.value
    if (!dictId) {
      return null
    }
    const dict = buttonDict.value.find((d) => d.buttonCode === VIEW_CODE)
    return {
      menuButton: {
        buttonId: dictId,
        buttonCode: dict?.buttonCode ?? VIEW_CODE,
        buttonName: dict?.buttonName ?? CMN_BUTTON_LABEL[VIEW_CODE],
      },
      buttonApis: [],
    }
  }
  /**
   * 组装 POST /menu 的 menuButtons；CATALOG 带 BTN_QUERY 一条（界面不展示绑定区）。
   */
  function buildMenuButtonsForMenuSave(): MenuButtonInfoItem[] {
    const t = formModel.value.menuType
    if (t === 'CATALOG') {
      const item = buildCatalogQueryMenuButton()
      return item ? [item] : []
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
      // 每条 API 须带当前按钮字典 ID，后端写入 cmn_button_api.button_id（非 null）
      buttonApis: s.apis.map((a) => apiMetaToButtonApi(a, s.dictButtonId)),
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
    dictShuttleSeedRows,
    viewDictId,
    openDictPicker,
    onDictShuttleConfirm,
    removeMenuButtonRow,
    isRequiredQueryButton,
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
    prepareMenuButtonsForSave,
    buildMenuButtonsForMenuSave,
  }
}
