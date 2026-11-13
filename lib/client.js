/**
 * Client 半边：NEVSTOP-LAB 的 DSH 定制口味。
 *
 * 功能列表（设置页逐项开关，关闭时收起该功能的配置）：
 *   1. 模型供应商前缀 —— 注册官方 `conversation.input.model.label` 槽位，
 *      在 trigger / menu 显示「供应商 · 模型」，option 保持模型名；
 *   2. 编写器键位 —— window 捕获阶段改写 keydown 的修饰键，
 *      让内置键盘映射走换行或发送分支，纯 Enter 默认换行。
 *
 * 配置走宿主路由 `GET/POST /__dsh-nevstop-lab-flavor/config`，持久化到插件自己的 JSON。
 * 所有 DOM 标记缺失、标记不匹配或改写出错时一律放行内置行为；最坏是「不生效」，不会误发送。
 */
window.__ModuleLoader__.load({
  id: 'dsh-nevstop-lab-flavor',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    const CONFIG_URL = '/__dsh-nevstop-lab-flavor/config'
    const KEY_BEHAVIORS = ['newline', 'queue', 'steer']

    const DEFAULTS = {
      features: { providerLabel: true, composerKeys: true, sidebarPanels: true, balanceChip: true, defaultModel: true, activeSessions: true, busyWorkspaceCompat: true },
      composerKeys: { enter: 'newline', ctrlEnter: 'queue', shiftEnter: 'newline', altEnter: 'steer' },
      defaultModel: { provider: '', model: '', reasoningEffort: '' },
      activeSessions: { windowHours: 12, fallbackCount: 5 },
    }

    // ---------- 界面文案（跟随 DSH 语言设置） ----------

    const LOCALE_NS = 'dsh-nevstop-lab-flavor'
    /**
     * 插件自绘界面的文案。DSH 的 locale 服务按「当前语言 → 其回退链 → en」查找，
     * 所以这里只需要给出 zh 与 en，其余语言自动回退英文；切换语言时 slot 会重渲染。
     */
    const DICT = {
      zh: {
        intro: 'NEVSTOP-LAB 对 DSH 的本地化微调。每项可单独开关，关闭即恢复 DSH 原生行为。',
        note: '改动即时生效并持久化到插件配置文件。',
        reset: '恢复默认',
        example: '示例',
        'key.newline': '换行',
        'key.queue': '排队发送',
        'key.steer': '插话发送',
        'key.short.newline': '换行',
        'key.short.queue': '排队',
        'key.short.steer': '插话',
        'key.hint.enter': '草稿里换行',
        'key.hint.ctrlEnter': '运行中按所选方式投递',
        'key.hint.shiftEnter': '默认换行',
        'key.hint.altEnter': '默认插话发送（内置原本忽略此组合）',
        'providerLabel.title': '模型供应商前缀',
        'providerLabel.desc': '输入区模型按钮与菜单当前值显示「供应商 · 模型」，用于区分同名模型的不同提供方。',
        'composerKeys.title': '编写器键位',
        'composerKeys.desc': '每个键单独选择「换行 / 排队发送 / 插话发送」；空输入框的占位提示与发送按钮的方形外观、快捷键提示都跟随这里，关闭后恢复 DSH 原生按钮；菜单、输入法组词与 Alt 组合保持原生行为。',
        'sidebarPanels.title': '侧边栏面板图标',
        'sidebarPanels.desc': '左侧栏顶部只显示一排图标：「新会话」与面板列表并排，鼠标悬停显示名称。',
        'balanceChip.title': '余额圆环',
        'balanceChip.desc': '输入框右侧显示余额或用量圆环：悬停看详情，点击可刷新并在面板里配置满格参考金额。',
        'defaultModel.title': '新会话默认模型',
        'defaultModel.desc': '打开新会话时固定使用这里选择的模型，而不是沿用上一个会话的模型，避免选错模型造成额外花费。已有会话不受影响。',
        'defaultModel.provider': '供应商',
        'defaultModel.model': '模型',
        'defaultModel.none': '未选择',
        'defaultModel.loading': '正在读取可用模型…',
        'defaultModel.unavailable': '无法读取模型目录，请确认已登录或已配置 API Key。',
        'defaultModel.missing': '已保存的模型不在当前目录中，请重新选择。',
        'defaultModel.pickFirst': '请选择供应商与模型后生效。',
        'defaultModel.applied': '新会话将使用 {provider} · {model}',
        'settingsFailed': 'NEVSTOP-LAB 设置加载失败，请刷新页面重试；若持续出现请反馈。',
        'activeSessions.title': '活跃会话区',
        'activeSessions.desc': '在「工作区」上方列出最近活跃的会话，按最后活动时间倒序；「工作区」列表折成一行标题、默认折叠。',
        'activeSessions.window': '活跃窗口（小时）',
        'activeSessions.fallback': '无活跃会话时显示数量',
        'activeSessions.heading': '活跃会话',
        'activeSessions.empty': '最近 {hours} 小时暂无活跃会话',
        'activeSessions.fallbackHint': '最近 {hours} 小时无活跃会话，显示最近 {count} 个会话',
        'activeSessions.untitled': '未命名',
        'activeSessions.ungrouped': '未分组',
        'activeSessions.defaultWorkspace': '默认工作区',
        'activeSessions.toggle': '折叠或展开活跃会话区',
        'activeSessions.actions': '会话操作',
        'activeSessions.running': '运行中',
        'activeSessions.idle': '空闲',
        'busyCompat.title': '兼容 busy-workspace',
        'busyCompat.desc': '活跃会话行沿用 dsh-plugin-busy-workspace 的注意力着色、状态徽标与子智能体胶囊；未安装该插件时此项无影响。',
        'busy.pending.approval': '待审批',
        'busy.pending.planReview': '计划待审',
        'busy.pending.question': '待回答',
        'busy.pending.default': '待处理',
        'busy.subagentsRunning': '{n} 个子智能体运行中',
        'busy.age.now': '刚刚',
        'busy.age.minutes': '{n}分钟',
        'busy.age.hours': '{n}小时',
        'busy.age.days': '{n}天',
        'busy.age.months': '{n}个月',
        'busy.age.years': '{n}年',
        'time.now': '刚刚',
        'time.minutes': '{n} 分钟前',
        'time.hours': '{n} 小时前',
        'time.days': '{n} 天前',
        'time.date': '{date}',
        'ring.creditUnit': ' 额度单位',
        'ring.status.connecting': '正在连接余额服务…',
        'ring.status.loading': '正在查询余额…',
        'ring.status.unsupported': '该供应商不支持余额查询',
        'ring.status.unconfigured': '未找到可用的 API 凭证',
        'ring.status.permission': '余额接口权限不足',
        'ring.status.malformed': '余额接口返回格式异常',
        'ring.status.failed': '余额查询失败',
        'ring.status.timeout': '余额查询超时',
        'ring.status.unavailable': '账号服务不可用',
        'ring.status.signedOut': '未登录 DeepSeek 账号',
        'ring.status.default': '余额暂不可用',
        'ring.title.go': 'Go 套餐剩余',
        'ring.title.keyLimit': 'API Key 剩余额度',
        'ring.title.quotaUnits': '剩余额度',
        'ring.title.balance': '账户余额',
        'ring.provider.current': '当前供应商',
        'ring.stale': '（上次查询值）',
        'ring.window': '窗口',
        'ring.windowLeft': '{label} 剩余',
        'ring.resetAt': ' · 重置 {time}',
        'ring.paid': '充值余额',
        'ring.bonus': '赠金余额',
        'ring.reference': '参考金额配置',
        'ring.refreshing': '查询中…',
        'ring.refresh': '刷新',
        'ring.provider.reading': '正在读取当前模型',
        'ring.showingLast': '{status}，显示上次查询值',
        'ring.updated': '更新于 {time}',
        'ring.autoRefresh': '随模型切换刷新 · 每 60 秒更新',
        'ring.referenceCny': '满格参考（CNY）',
        'ring.referenceUsd': '满格参考（USD）',
        'ring.saving': '保存中…',
        'ring.saved': '已保存',
        'ring.saveFailed': '保存失败',
        'ring.save': '保存',
        'ring.usageSource': '来源：opencode Go 用量接口 · 圆环为剩余百分比（外圈滚动 / 中圈周 / 内圈月），不代表金额',
        'ring.referenceFoot': '圆环显示参考：{unit}{per} / 圈 × {rings} 圈（最多 {unit}{total}），不代表账户额度上限',
      },
      en: {
        intro: 'NEVSTOP-LAB tweaks for DSH. Each item switches independently; turn one off to restore native behavior.',
        note: 'Changes apply immediately and are saved to the plugin config file.',
        reset: 'Reset to defaults',
        example: 'Example',
        'key.newline': 'New line',
        'key.queue': 'Queue send',
        'key.steer': 'Steer send',
        'key.short.newline': 'new line',
        'key.short.queue': 'queue',
        'key.short.steer': 'steer',
        'key.hint.enter': 'New line in the draft',
        'key.hint.ctrlEnter': 'Deliver the selected way while running',
        'key.hint.shiftEnter': 'New line by default',
        'key.hint.altEnter': 'Steer by default (DSH ignores this combination natively)',
        'providerLabel.title': 'Model provider prefix',
        'providerLabel.desc': 'The composer model button and menu show "Provider · model" for the active model, so same-named models from different providers stay distinguishable.',
        'composerKeys.title': 'Composer keys',
        'composerKeys.desc': 'Pick new line / queue send / steer send for each key. The empty composer hint and the send button (square shape plus shortcut) follow this mapping; turn it off to restore the native button. Menus, IME composition and Alt combinations keep native behavior.',
        'sidebarPanels.title': 'Sidebar panel icons',
        'sidebarPanels.desc': 'The sidebar top becomes one row of icons: "New session" sits beside the panels, with names on hover.',
        'balanceChip.title': 'Balance ring',
        'balanceChip.desc': 'A balance or usage ring on the right of the composer: hover for details, click to refresh, and set the reference amounts of a full ring in the panel.',
        'defaultModel.title': 'New session default model',
        'defaultModel.desc': 'Every new session starts with the model chosen here instead of the model of the previous session, so a wrong pick cannot cost extra. Existing sessions are untouched.',
        'defaultModel.provider': 'Provider',
        'defaultModel.model': 'Model',
        'defaultModel.none': 'Not selected',
        'defaultModel.loading': 'Reading the available models…',
        'defaultModel.unavailable': 'The model catalog could not be read. Check that you are signed in or that an API key is configured.',
        'defaultModel.missing': 'The saved model is not in the current catalog; pick it again.',
        'defaultModel.pickFirst': 'Pick a provider and a model to enable this.',
        'defaultModel.applied': 'New sessions will use {provider} · {model}',
        'settingsFailed': 'Loading the NEVSTOP-LAB settings failed. Refresh the page; report it if it keeps happening.',
        'activeSessions.title': 'Active sessions region',
        'activeSessions.desc': 'Lists recently active sessions above Workspaces, newest activity first; the Workspaces list folds into one title row and starts collapsed.',
        'activeSessions.window': 'Active window (hours)',
        'activeSessions.fallback': 'Rows when nothing is active',
        'activeSessions.heading': 'Active sessions',
        'activeSessions.empty': 'No active sessions in the last {hours} hours',
        'activeSessions.fallbackHint': 'No active sessions in the last {hours} hours; showing the {count} most recent',
        'activeSessions.untitled': 'Untitled',
        'activeSessions.ungrouped': 'Ungrouped',
        'activeSessions.defaultWorkspace': 'Default workspace',
        'activeSessions.toggle': 'Collapse or expand the active sessions region',
        'activeSessions.actions': 'Session actions',
        'activeSessions.running': 'Running',
        'activeSessions.idle': 'Idle',
        'busyCompat.title': 'busy-workspace compatibility',
        'busyCompat.desc': 'Active session rows follow dsh-plugin-busy-workspace attention colours, status badges and the subagent chip. Has no effect when that plugin is not installed.',
        'busy.pending.approval': 'Approval',
        'busy.pending.planReview': 'Plan review',
        'busy.pending.question': 'Answer',
        'busy.pending.default': 'Pending',
        'busy.subagentsRunning': '{n} subagents running',
        'busy.age.now': 'now',
        'busy.age.minutes': '{n}min',
        'busy.age.hours': '{n}h',
        'busy.age.days': '{n}d',
        'busy.age.months': '{n}mo',
        'busy.age.years': '{n}y',
        'time.now': 'now',
        'time.minutes': '{n} min ago',
        'time.hours': '{n} h ago',
        'time.days': '{n} d ago',
        'time.date': '{date}',
        'ring.creditUnit': ' credit',
        'ring.status.connecting': 'Connecting to the balance service…',
        'ring.status.loading': 'Reading the balance…',
        'ring.status.unsupported': 'This provider has no balance API',
        'ring.status.unconfigured': 'No usable API credential found',
        'ring.status.permission': 'The balance API denied access',
        'ring.status.malformed': 'The balance API returned an unexpected shape',
        'ring.status.failed': 'Balance read failed',
        'ring.status.timeout': 'Balance read timed out',
        'ring.status.unavailable': 'The account service is unavailable',
        'ring.status.signedOut': 'Not signed in to DeepSeek',
        'ring.status.default': 'Balance unavailable',
        'ring.title.go': 'Go plan remaining',
        'ring.title.keyLimit': 'API key remaining quota',
        'ring.title.quotaUnits': 'Remaining quota',
        'ring.title.balance': 'Account balance',
        'ring.provider.current': 'Current provider',
        'ring.stale': ' (last known value)',
        'ring.window': 'Window',
        'ring.windowLeft': '{label} remaining',
        'ring.resetAt': ' · resets {time}',
        'ring.paid': 'Paid balance',
        'ring.bonus': 'Bonus balance',
        'ring.reference': 'Reference amounts',
        'ring.refreshing': 'Reading…',
        'ring.refresh': 'Refresh',
        'ring.provider.reading': 'Reading the current model',
        'ring.showingLast': '{status} — showing the last known value',
        'ring.updated': 'Updated {time}',
        'ring.autoRefresh': 'Refreshes on model switch · every 60 seconds',
        'ring.referenceCny': 'Full ring (CNY)',
        'ring.referenceUsd': 'Full ring (USD)',
        'ring.saving': 'Saving…',
        'ring.saved': 'Saved',
        'ring.saveFailed': 'Save failed',
        'ring.save': 'Save',
        'ring.usageSource': 'Source: opencode Go usage API · rings show remaining percentage (outer: rolling, middle: weekly, inner: monthly), not an amount',
        'ring.referenceFoot': 'Ring reference: {unit}{per} per ring × {rings} rings (up to {unit}{total}); not an account limit',
      },
    }

    /** 当前语言的翻译函数；apply 时绑定到 locale 服务，未绑定时原样返回键。 */
    let t = (key) => key

    /**
     * 内置发送按钮的本地化标签，用来判断「普通回车当前会走哪种投递」。
     * 运行中且草稿可发送时，主按钮 aria-label 就是排队发送 / 插话发送之一。
     * 任一都匹配不上按「空闲 / 未知」处理，回退普通回车。
     */
    const QUEUE_LABELS = ['排队发送', 'Mensagem de fila', 'mensaje de cola', "Message de file d'attente", 'Queue message', 'Warteschlangennachricht', 'Сообщение в очереди', 'メッセージをキューに追加']
    const STEER_LABELS = ['插话发送', '実行中の指示にメッセージを追加', 'Guider avec ce message', 'Mit Nachricht lenken', 'Orientar com mensagem', 'Redirigir mensaje', 'Steer message', 'Направить сообщение']

    function clampInt(value, fallback, min, max) {
      if (value === null || value === undefined || value === '') return fallback
      const number = typeof value === 'number' ? value : Number(value)
      if (!Number.isFinite(number)) return fallback
      return Math.min(max, Math.max(min, Math.round(number)))
    }

    function text(value, fallback) {
      return typeof value === 'string' ? value.trim() : fallback
    }

    function normalize(raw) {
      const src = raw !== null && typeof raw === 'object' ? raw : {}
      const features = src.features !== null && typeof src.features === 'object' ? src.features : {}
      const keys = src.composerKeys !== null && typeof src.composerKeys === 'object' ? src.composerKeys : {}
      const active = src.activeSessions !== null && typeof src.activeSessions === 'object' ? src.activeSessions : {}
      const fixModel = src.defaultModel !== null && typeof src.defaultModel === 'object' ? src.defaultModel : {}
      const pick = (value, fallback) => (KEY_BEHAVIORS.includes(value) ? value : fallback)
      return {
        features: {
          providerLabel: typeof features.providerLabel === 'boolean' ? features.providerLabel : DEFAULTS.features.providerLabel,
          composerKeys: typeof features.composerKeys === 'boolean' ? features.composerKeys : DEFAULTS.features.composerKeys,
          sidebarPanels: typeof features.sidebarPanels === 'boolean' ? features.sidebarPanels : DEFAULTS.features.sidebarPanels,
          balanceChip: typeof features.balanceChip === 'boolean' ? features.balanceChip : DEFAULTS.features.balanceChip,
          activeSessions: typeof features.activeSessions === 'boolean' ? features.activeSessions : DEFAULTS.features.activeSessions,
          defaultModel: typeof features.defaultModel === 'boolean' ? features.defaultModel : DEFAULTS.features.defaultModel,
          busyWorkspaceCompat: typeof features.busyWorkspaceCompat === 'boolean' ? features.busyWorkspaceCompat : DEFAULTS.features.busyWorkspaceCompat,
        },
        composerKeys: {
          enter: pick(keys.enter, DEFAULTS.composerKeys.enter),
          ctrlEnter: pick(keys.ctrlEnter, DEFAULTS.composerKeys.ctrlEnter),
          shiftEnter: pick(keys.shiftEnter, DEFAULTS.composerKeys.shiftEnter),
          altEnter: pick(keys.altEnter, DEFAULTS.composerKeys.altEnter),
        },
        activeSessions: {
          windowHours: clampInt(active.windowHours, DEFAULTS.activeSessions.windowHours, 1, 168),
          fallbackCount: clampInt(active.fallbackCount, DEFAULTS.activeSessions.fallbackCount, 1, 50),
        },
        defaultModel: {
          provider: text(fixModel.provider, DEFAULTS.defaultModel.provider),
          model: text(fixModel.model, DEFAULTS.defaultModel.model),
          reasoningEffort: text(fixModel.reasoningEffort, DEFAULTS.defaultModel.reasoningEffort),
        },
      }
    }

    let cfg = normalize(DEFAULTS)
    const listeners = new Set()

    function emit() {
      for (const listener of listeners) listener(cfg)
    }

    function load() {
      fetch(CONFIG_URL, { headers: { accept: 'application/json' } })
        .then((response) => response.json())
        .then((body) => {
          if (body && body.config) {
            cfg = normalize(body.config)
            emit()
          }
        })
        .catch(() => {})
    }

    function save(next) {
      cfg = normalize(next)
      emit()
      fetch(CONFIG_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(cfg),
      }).catch(() => {})
    }

    function useConfig() {
      const [value, setValue] = React.useState(cfg)
      React.useEffect(() => {
        const listener = (next) => setValue(next)
        listeners.add(listener)
        setValue(cfg)
        return () => listeners.delete(listener)
      }, [])
      return value
    }

    // ---------- feature 1: provider label ----------

    const providerName = (provider) => {
      if (!provider) return ''
      const name = typeof provider.name === 'string' ? provider.name.trim() : ''
      if (name) return name
      return typeof provider.id === 'string' ? provider.id.trim() : ''
    }

    const modelName = (model) => {
      if (!model) return ''
      const name = typeof model.name === 'string' ? model.name.trim() : ''
      if (name) return name
      return typeof model.id === 'string' ? model.id.trim() : ''
    }

    const muted = { opacity: 0.62, fontWeight: 400 }

    function ProviderModelLabel(props) {
      const config = useConfig()
      const model = modelName(props && props.model)
      const provider = providerName(props && props.provider)
      const placement = props && props.placement
      if (!config.features.providerLabel || !provider || placement === 'option') {
        return h('span', { className: 'dsnvpf-model' }, model)
      }
      return h(
        'span',
        { className: 'dsnvpf-root', 'data-placement': placement || '' },
        h('span', { className: 'dsnvpf-provider', style: muted }, provider),
        h('span', { className: 'dsnvpf-sep', style: muted, 'aria-hidden': 'true' }, ' · '),
        h('span', { className: 'dsnvpf-model' }, model),
      )
    }

    // ---------- feature 2: composer keys ----------

    const HANDLED = Symbol.for('dsh-nevstop-lab-flavor/handled')
    const REPLAY = Symbol.for('dsh-nevstop-lab-flavor/replay')

    function shadow(event, flags) {
      let ok = true
      for (const key of Object.keys(flags)) {
        const value = flags[key]
        try {
          Object.defineProperty(event, key, { value, configurable: true })
        } catch {
          ok = false
        }
        if (event[key] !== value) ok = false
      }
      return ok
    }

    function replay(event, input, flags) {
      try {
        event.preventDefault()
        event.stopPropagation()
        if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation()
        const next = new KeyboardEvent('keydown', {
          key: 'Enter',
          code: 'Enter',
          bubbles: true,
          cancelable: true,
          composed: true,
          shiftKey: flags.shiftKey === true,
          ctrlKey: flags.ctrlKey === true,
          metaKey: flags.metaKey === true,
        })
        Object.defineProperty(next, REPLAY, { value: true })
        input.dispatchEvent(next)
      } catch {
        // 合成失败时宁可不动：误发半截提示词才是要解决的问题。
      }
    }

    function rewrite(event, input, flags) {
      if (shadow(event, flags)) return
      replay(event, input, flags)
    }

    function onKeyDown(event) {
      try {
        if (!cfg.features.composerKeys) return
        if (event[REPLAY] === true || event[HANDLED] === true) return
        if (event.key !== 'Enter') return
        if (event.defaultPrevented) return
        if (event.isComposing || event.keyCode === 229) return

        const target = event.target
        if (!(target instanceof Element)) return
        const input = target.closest('[data-composer-input]')
        if (input === null || input.isContentEditable !== true) return
        if (typeof event.getModifierState === 'function' && event.getModifierState('AltGraph')) return
        if (event.shiftKey && (event.ctrlKey || event.metaKey)) return
        if (event.ctrlKey && event.metaKey) return

        const card = input.closest('[data-composer-card]')
        const scope = card !== null ? card : document
        if (scope.querySelector('[data-trigger-menu], [data-composer-overlay] [role="listbox"]') !== null) return

        const altOnly = event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey
        if (event.altKey && !altOnly) return
        const behavior = altOnly
          ? cfg.composerKeys.altEnter
          : event.ctrlKey || event.metaKey
            ? cfg.composerKeys.ctrlEnter
            : event.shiftKey
              ? cfg.composerKeys.shiftEnter
              : cfg.composerKeys.enter

        try {
          Object.defineProperty(event, HANDLED, { value: true })
        } catch {
          // 标记失败不影响判断。
        }

        if (behavior === 'newline') {
          rewrite(event, input, { altKey: false, shiftKey: true, ctrlKey: false, metaKey: false })
          return
        }

        // 排队 / 插话：先判断内置的普通回车当前走哪种投递，再决定用普通还是加速手势。
        const emptyDraft = scope.querySelector('[data-composer-placeholder]') !== null
        let plainMode = null
        for (const button of scope.querySelectorAll('button[aria-label]')) {
          const label = button.getAttribute('aria-label') || ''
          if (QUEUE_LABELS.includes(label)) {
            plainMode = 'queue'
            break
          }
          if (STEER_LABELS.includes(label)) {
            plainMode = 'steer'
            break
          }
        }

        // 草稿为空时把回车让给内置：Ctrl/Cmd+Enter 保留「插话发送全部排队消息」，普通回车为空不发送。
        if (emptyDraft) return
        if (plainMode === null || behavior === plainMode) {
          rewrite(event, input, { altKey: false, shiftKey: false, ctrlKey: false, metaKey: false })
          return
        }
        rewrite(event, input, { altKey: false, shiftKey: false, ctrlKey: true, metaKey: false })
      } catch (error) {
        console.error('[nevstop-lab-flavor] enter handling failed', error)
      }
    }

    // ---------- placeholder hint ----------

    const PLACEHOLDER_SELECTOR = '[data-composer-placeholder]'
    /** 每个占位元素最近的基线文案与上次写入的文案，用于识别官方是否换了文案。 */
    const baseText = new WeakMap()
    let hintObserver = null
    let hintScheduled = false

    function behaviorShort(behavior) {
      return t('key.short.' + behavior)
    }

    function keyboardHint() {
      const keys = cfg.composerKeys
      return 'Enter ' + behaviorShort(keys.enter) + ' · Ctrl+Enter ' + behaviorShort(keys.ctrlEnter) + ' · Shift+Enter ' + behaviorShort(keys.shiftEnter) + ' · Alt+Enter ' + behaviorShort(keys.altEnter)
    }

    function syncPlaceholder(element) {
      try {
        const current = element.textContent || ''
        // 运行中且有排队消息时，官方会换成「Cmd/Ctrl+Enter 插话发送全部排队消息」，保持原生语义不改。
        if (current.indexOf('Cmd/Ctrl+Enter') !== -1 || current.indexOf('Cmd/Strg') !== -1) return
        const previous = baseText.get(element)
        // 语言切换或状态变化后官方会换掉整段文案：此时把当前文案当新基线，
        // 否则基线会一直停在首次看到的语言。
        const base = previous === undefined || current !== previous.next ? current : previous.base
        const next = cfg.features.composerKeys ? base + ' · ' + keyboardHint() : base
        baseText.set(element, { base, next })
        if (current !== next) element.textContent = next
      } catch {
        // 占位提示只是装饰，失败时保持官方文案。
      }
    }

    function syncPlaceholders() {
      if (typeof document === 'undefined') return
      for (const element of document.querySelectorAll(PLACEHOLDER_SELECTOR)) syncPlaceholder(element)
    }

    function watchPlaceholders() {
      syncPlaceholders()
      hintObserver = new MutationObserver(() => {
        if (hintScheduled) return
        hintScheduled = true
        requestAnimationFrame(() => {
          hintScheduled = false
          syncPlaceholders()
        })
      })
      hintObserver.observe(document.body, { childList: true, subtree: true, characterData: true })
      const onConfig = () => syncPlaceholders()
      listeners.add(onConfig)
      return () => {
        listeners.delete(onConfig)
        if (hintObserver !== null) {
          hintObserver.disconnect()
          hintObserver = null
        }
      }
    }

    // ---------- composer send button ----------

    const SEND_BUTTON_SELECTOR = '[data-composer-card] button[class*="_primary"]'
    const SEND_STYLE_ID = 'dsh-nevstop-lab-flavor-send-style'
    const SEND_HINT_ATTR = 'data-dsh-nlf-send-hint'
    const SEND_CSS = [
      // 内置发送/停止按钮是 34px 圆形并上移 2px：改成 28px 高、圆角 12px（28px 高时 >=14px 会被裁成胶囊），按钮内横排图标与快捷键。
      '[data-composer-card] button[class*="_primary"]{width:auto;min-width:28px;height:28px;padding:0 6px;border-radius:var(--dsw-radius-md);transform:none;display:flex;align-items:center;justify-content:center;gap:4px}',
      '[' + SEND_HINT_ATTR + ']{font-size:10px;line-height:12px;font-weight:500;white-space:nowrap;user-select:none;pointer-events:none;color:inherit;opacity:.85}',
      '@media (width<=767px){[' + SEND_HINT_ATTR + ']{display:none}}',
    ].join('')

    let sendHint = null

    /** 当前配置里用于发送的快捷键文本（优先「排队发送」键，其次「插话发送」键）。 */
    function sendKeyLabel() {
      const darwin = document.documentElement.getAttribute('data-platform') === 'darwin'
      const rows = [
        ['enter', 'Enter'],
        ['ctrlEnter', darwin ? 'Cmd+Enter' : 'Ctrl+Enter'],
        ['shiftEnter', 'Shift+Enter'],
        ['altEnter', 'Alt+Enter'],
      ]
      const pick = (behavior) => {
        const row = rows.find(([key]) => cfg.composerKeys[key] === behavior)
        return row === undefined ? null : row[1]
      }
      return pick('queue') ?? pick('steer')
    }

    function clearSendButton() {
      const style = document.getElementById(SEND_STYLE_ID)
      if (style !== null) style.remove()
      if (sendHint !== null) {
        sendHint.remove()
        sendHint = null
      }
    }

    function syncSendButton() {
      try {
        // 方形外观、发送键与 Esc 提示都跟随「编写器键位」开关，关闭即恢复原生按钮。
        if (!cfg.features.composerKeys) {
          clearSendButton()
          return
        }
        if (document.getElementById(SEND_STYLE_ID) === null) {
          const style = document.createElement('style')
          style.id = SEND_STYLE_ID
          style.textContent = SEND_CSS
          document.head.appendChild(style)
        }
        const buttons = document.querySelectorAll(SEND_BUTTON_SELECTOR)
        const button = buttons.length === 0 ? null : buttons[buttons.length - 1]
        // 图标形状区分状态：方块 = 停止（连按两次 ESC），圆环 = 发送中，箭头 = 可发送。
        // 内置的停止快捷键是「双击 ESC」：第一次只记录，第二次才真正取消，所以提示写两次。
        const icon = button === null ? null : button.querySelector('svg')
        const stops = icon !== null && icon.querySelector('rect') !== null
        const sending = icon !== null && icon.querySelector('circle') !== null
        const label = button === null ? null : stops ? 'ESC ESC' : sending || icon === null ? null : sendKeyLabel()
        if (button === null || label === null) {
          if (sendHint !== null) {
            sendHint.remove()
            sendHint = null
          }
          return
        }
        if (sendHint === null || sendHint.parentElement !== button) {
          sendHint = document.createElement('span')
          sendHint.setAttribute(SEND_HINT_ATTR, '')
          sendHint.setAttribute('aria-hidden', 'true')
        }
        if (sendHint.textContent !== label) sendHint.textContent = label
        // 放在箭头图标右侧、按钮内部。
        if (sendHint.previousElementSibling !== icon) button.insertBefore(sendHint, icon.nextSibling)
      } catch {
        // 装饰失败时保持原生按钮外观。
      }
    }

    function watchSendButton() {
      syncSendButton()
      let scheduled = false
      const observer = new MutationObserver(() => {
        if (scheduled) return
        scheduled = true
        requestAnimationFrame(() => {
          scheduled = false
          syncSendButton()
        })
      })
      observer.observe(document.body, { childList: true, subtree: true })
      const onConfig = () => syncSendButton()
      listeners.add(onConfig)
      return () => {
        listeners.delete(onConfig)
        observer.disconnect()
        clearSendButton()
      }
    }

    // ---------- sidebar panel icons ----------

    const PANEL_STYLE_ID = 'dsh-nevstop-lab-flavor-panel-style'
    const PANEL_LIST_SELECTOR = 'nav[class*="_panelList"]'
    const NEW_SESSION_SELECTOR = 'button[class*="_newSession"]'
    const NEW_SESSION_HIDDEN_ATTR = 'data-dsh-nlf-new-session-hidden'
    const PANEL_CSS = [
      '[data-dsh-nlf-panels]{display:flex;flex-direction:row;flex-wrap:wrap;align-items:center;gap:6px;justify-content:flex-start}',
      '[data-dsh-nlf-panels]>button{width:auto;min-width:34px;height:34px;padding:0 8px;justify-content:center}',
      '[data-dsh-nlf-panels] button span[class*="_panelTitle"]{display:none}',
      '[data-dsh-nlf-panels]>button:hover{background:var(--dsw-alias-interactive-bg-hover)}',
      '[data-dsh-nlf-new-session]{display:inline-flex;align-items:center;justify-content:center;padding:0;border:0;border-radius:var(--dsw-radius-md);background:transparent;color:var(--dsw-alias-label-primary);cursor:pointer}',
      '[data-dsh-nlf-new-session]>svg{width:16px;height:16px;flex:none}',
      '[data-dsh-nlf-new-session]:focus-visible{outline:var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:-2px}',
      '[' + NEW_SESSION_HIDDEN_ATTR + ']{display:none!important}',
    ].join('')

    /** 收进图标排的「新会话」按钮：我们自己的节点，点击转发给内置按钮。 */
    let newSessionClone = null
    let newSessionIconMarkup = ''

    function restoreNewSession() {
      for (const button of document.querySelectorAll('[' + NEW_SESSION_HIDDEN_ATTR + ']')) {
        button.removeAttribute(NEW_SESSION_HIDDEN_ATTR)
      }
      if (newSessionClone !== null) {
        newSessionClone.remove()
        newSessionClone = null
        newSessionIconMarkup = ''
      }
    }

    /**
     * 内置「新会话」按钮是单独一行的大按钮；把它收进面板图标排的第一个位置。
     * 不改 React 管理的节点：隐藏原按钮，插入我们自己的图标按钮转发点击。
     * 侧边栏收起成窄栏时内置按钮本身就是图标，保持原样。
     */
    function syncNewSession(list) {
      const source = document.querySelector(NEW_SESSION_SELECTOR)
      const root = list === null ? null : list.parentElement
      const collapsed =
        root !== null &&
        String(root.className || '')
          .split(/\s+/)
          .some((name) => name.endsWith('_collapsed'))
      const svg = source === null ? null : source.querySelector('svg')
      if (list === null || source === null || svg === null || collapsed) {
        restoreNewSession()
        return
      }
      if (newSessionClone === null) {
        const clone = document.createElement('button')
        clone.type = 'button'
        clone.setAttribute('data-dsh-nlf-new-session', '')
        clone.addEventListener('click', () => {
          const target = document.querySelector(NEW_SESSION_SELECTOR)
          if (target !== null) target.click()
        })
        newSessionClone = clone
      }
      const markup = svg.outerHTML
      if (markup !== newSessionIconMarkup) {
        newSessionClone.innerHTML = markup
        newSessionIconMarkup = markup
      }
      const label = (source.getAttribute('aria-label') || '').trim()
      if (label !== '') {
        if (newSessionClone.getAttribute('title') !== label) newSessionClone.setAttribute('title', label)
        if (newSessionClone.getAttribute('aria-label') !== label) newSessionClone.setAttribute('aria-label', label)
      }
      const shortcut = source.getAttribute('aria-keyshortcuts')
      if (shortcut !== null && newSessionClone.getAttribute('aria-keyshortcuts') !== shortcut) {
        newSessionClone.setAttribute('aria-keyshortcuts', shortcut)
      }
      if (source.getAttribute(NEW_SESSION_HIDDEN_ATTR) === null) {
        source.setAttribute(NEW_SESSION_HIDDEN_ATTR, '')
      }
      if (list.firstElementChild !== newSessionClone) {
        list.insertBefore(newSessionClone, list.firstElementChild)
      }
    }

    function clearSidebarPanels() {
      const style = document.getElementById(PANEL_STYLE_ID)
      if (style !== null) style.remove()
      restoreNewSession()
      for (const list of document.querySelectorAll('[data-dsh-nlf-panels]')) {
        list.removeAttribute('data-dsh-nlf-panels')
        for (const button of list.querySelectorAll('button')) {
          if (button.getAttribute('data-dsh-nlf-tip') === '1') {
            button.removeAttribute('title')
            button.removeAttribute('data-dsh-nlf-tip')
          }
        }
      }
    }

    function syncSidebarPanels() {
      try {
        if (!cfg.features.sidebarPanels) {
          clearSidebarPanels()
          return
        }
        const list = document.querySelector(PANEL_LIST_SELECTOR)
        if (list === null) {
          restoreNewSession()
          return
        }
        list.setAttribute('data-dsh-nlf-panels', '')
        if (document.getElementById(PANEL_STYLE_ID) === null) {
          const style = document.createElement('style')
          style.id = PANEL_STYLE_ID
          style.textContent = PANEL_CSS
          document.head.appendChild(style)
        }
        for (const button of list.querySelectorAll('button')) {
          const text = (button.getAttribute('aria-label') || '').trim()
          if (text === '') continue
          if (button.getAttribute('title') !== text) button.setAttribute('title', text)
          if (button.getAttribute('data-dsh-nlf-tip') !== '1') button.setAttribute('data-dsh-nlf-tip', '1')
        }
        syncNewSession(list)
      } catch {
        // 侧边栏装饰失败时保持原样。
      }
    }

    function watchSidebarPanels() {
      syncSidebarPanels()
      let scheduled = false
      const observer = new MutationObserver(() => {
        if (scheduled) return
        scheduled = true
        requestAnimationFrame(() => {
          scheduled = false
          syncSidebarPanels()
        })
      })
      observer.observe(document.body, { childList: true, subtree: true, characterData: true })
      const onConfig = () => syncSidebarPanels()
      listeners.add(onConfig)
      return () => {
        listeners.delete(onConfig)
        observer.disconnect()
        clearSidebarPanels()
      }
    }

    // ---------- feature 5: active sessions ----------

    const ACTIVE_STYLE_ID = 'dsh-nevstop-lab-flavor-active-style'
    const REGION_SELECTOR = 'div[class*="_regionArea"]'
    const ACTIVE_ATTR = 'data-dsh-nlf-active'
    const WORKSPACES_ATTR = 'data-dsh-nlf-workspaces'
    const WORKSPACE_HEADER_ATTR = 'data-dsh-nlf-workspace-header'
    const WORKSPACES_COLLAPSED_ATTR = 'data-dsh-nlf-workspaces-collapsed'
    const ACTIVE_CSS = [
      '[' + ACTIVE_ATTR + ']{display:flex;flex-direction:column;min-height:0;flex:0 1 auto;max-height:40%;margin-top:2px}',
      '[' + ACTIVE_ATTR + '][hidden]{display:none!important}',
      '.nlf-head{display:flex;align-items:center;gap:4px;width:100%;height:36px;padding:0 0 0 var(--dsh-sidebar-row-padding);box-sizing:border-box;border:0;border-radius:var(--dsw-radius-md);background:transparent;color:var(--dsw-alias-label-tertiary);font:inherit;font-size:14px;line-height:20px;cursor:pointer;text-align:left;overflow:hidden}',
      '.nlf-head:hover{color:var(--dsw-alias-label-secondary)}',
      '.nlf-head:focus-visible{outline:var(--dsh-focus-ring-width) solid var(--dsh-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:-2px}',
      '.nlf-head-chevron{width:0;height:0;border-left:5px solid currentColor;border-top:4px solid transparent;border-bottom:4px solid transparent;flex:none;transform:rotate(90deg);transition:transform 120ms ease}',
      '.nlf-head[aria-expanded="false"] .nlf-head-chevron{transform:rotate(0deg)}',
      '.nlf-head-label{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.nlf-body{display:flex;flex-direction:column;min-height:0;overflow-x:hidden;overflow-y:auto;padding-bottom:4px;scrollbar-gutter:stable}',
      '.nlf-body[hidden]{display:none}',
      '.nlf-caption{margin:2px 0 4px;padding-left:var(--dsh-sidebar-row-padding);font-size:10px;line-height:14px;color:var(--dsw-alias-label-tertiary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.nlf-empty{padding:2px var(--dsh-sidebar-row-padding) 6px;font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary)}',
      '.nlf-row{display:flex;flex-direction:column;justify-content:center;gap:0;padding:3px 8px;border-inline:var(--dsh-sidebar-paint-inset) solid transparent;border-radius:var(--dsw-radius-md);background-clip:padding-box;box-sizing:border-box;color:var(--dsw-alias-label-primary);cursor:pointer;-webkit-user-select:none;user-select:none;padding-inline-start:calc(var(--dsh-sidebar-row-padding) - var(--dsh-sidebar-paint-inset))}',
      '.nlf-row:hover,.nlf-row.nlf-selected:not([data-busy-session]){background-color:var(--dsw-alias-interactive-bg-hover)}',
      '.nlf_state_dot,.nlf_time,.nlf_slot{display:none!important}',
      '.nlf-row:focus-visible{outline:var(--dsh-focus-ring-width) solid var(--dsh-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:-2px}',
      '.nlf-row-main{display:flex;align-items:center;gap:var(--dsh-sidebar-label-gap);min-width:0;height:20px}',
      '.nlf-status{width:16px;height:16px;flex:none;display:inline-flex;align-items:center;justify-content:center}',
      '.nlf-dot{width:6px;height:6px;border-radius:50%;background:var(--dsw-alias-brand-primary);animation:nlf-pulse 1.2s ease-in-out infinite}',
      '@keyframes nlf-pulse{0%,100%{opacity:1}50%{opacity:.35}}',
      '.nlf-title{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:14px;line-height:20px}',
      '.nlf-more{width:24px;height:24px;margin:-4px;padding:0;border:0;border-radius:var(--dsw-radius-xs);background:transparent;color:var(--dsw-alias-label-tertiary);display:inline-flex;align-items:center;justify-content:center;flex:none;cursor:pointer;opacity:0}',
      '.nlf-row:hover .nlf-more,.nlf-row:focus-within .nlf-more{opacity:1}',
      '.nlf-more:hover{color:var(--dsw-alias-label-primary)}',
      '.nlf-more:focus-visible{opacity:1;outline-offset:-2px}',
      '.nlf-meta{font-size:10px;line-height:14px;color:var(--dsw-alias-label-tertiary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding-left:calc(16px + var(--dsh-sidebar-label-gap))}',
      '.nlf-card{position:fixed;z-index:1100;display:flex;flex-direction:column;gap:4px;max-width:280px;padding:10px 12px;border:1px solid var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-alias-bg-overlay);color:var(--dsw-alias-label-primary);box-shadow:0 8px 24px rgba(0,0,0,.24);pointer-events:none}',
      '.nlf-card[hidden]{display:none}',
      '.nlf-card-title{font-size:14px;line-height:20px;overflow-wrap:break-word}',
      '.nlf-card-path,.nlf-card-time{font-size:12px;line-height:16px;color:var(--dsw-alias-label-secondary);overflow-wrap:break-word;word-break:break-all}',
      '[' + WORKSPACES_ATTR + '][' + WORKSPACES_COLLAPSED_ATTR + ']{flex:0 0 auto!important}',
      '[' + WORKSPACES_ATTR + '][' + WORKSPACES_COLLAPSED_ATTR + ']>:not([' + WORKSPACE_HEADER_ATTR + ']){display:none!important}',
      '[' + WORKSPACE_HEADER_ATTR + ']{cursor:pointer}',
      '[' + WORKSPACE_HEADER_ATTR + ']::before{content:"";width:0;height:0;border-left:5px solid currentColor;border-top:4px solid transparent;border-bottom:4px solid transparent;margin-right:4px;flex:none;transform:rotate(90deg);transition:transform 120ms ease}',
      '[' + WORKSPACES_ATTR + '][' + WORKSPACES_COLLAPSED_ATTR + ']>[' + WORKSPACE_HEADER_ATTR + ']::before{transform:rotate(0deg)}',
    ].join('')

    const active = {
      services: null,
      container: null,
      head: null,
      headLabel: null,
      body: null,
      card: null,
      timer: 0,
      hoverSessionId: null,
      workspaceCollapsed: true,
      collapsed: false,
      enabled: false,
      dirty: false,
      searchExpanded: false,
      statuses: null,
      schedule: null,
      signature: '',
    }

    function activeStyleEnsure() {
      if (document.getElementById(ACTIVE_STYLE_ID) !== null) return
      const style = document.createElement('style')
      style.id = ACTIVE_STYLE_ID
      style.textContent = ACTIVE_CSS
      document.head.appendChild(style)
    }

    function relativeLabel(ms) {
      const minutes = Math.floor(Math.max(0, Date.now() - ms) / 60000)
      if (minutes < 1) return t('time.now')
      if (minutes < 60) return t('time.minutes', { n: minutes })
      const hours = Math.floor(minutes / 60)
      if (hours < 24) return t('time.hours', { n: hours })
      const days = Math.floor(hours / 24)
      if (days < 30) return t('time.days', { n: days })
      const date = new Date(ms)
      return t('time.date', {
        date: date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0'),
      })
    }

    function pendingLabelOf(pending) {
      const kind = pending !== null && pending !== undefined && typeof pending === 'object' ? pending.kind : null
      if (kind === 'approval') return t('busy.pending.approval')
      if (kind === 'plan-review') return t('busy.pending.planReview')
      if (kind === 'question') return t('busy.pending.question')
      return t('busy.pending.default')
    }

    /**
     * 与内置会话行一致的四态推导：优先用根钩子 sessionStatus，缺失时退回快照里的 running。
     * 供自绘行写出 dsh-plugin-busy-workspace 读取的 data-state 契约。
     */
    function sessionStateOf(sessionId, session) {
      const map = active.statuses
      const status = map !== null && map !== undefined && typeof map.get === 'function' ? map.get(sessionId) : undefined
      const pending = status !== null && status !== undefined ? status.pendingInteraction : undefined
      const running = status !== null && status !== undefined && status.running !== undefined ? status.running === true : session.running === true
      const unread = status !== null && status !== undefined ? status.completionUnread === true : false
      const hasPending = pending !== null && pending !== undefined
      return {
        pending: hasPending ? pending : null,
        running,
        unread,
        state: hasPending ? 'warning' : running ? 'ongoing' : unread ? 'done' : 'idle',
      }
    }

    /** 运行中的直接子智能体数量；与内置行一致，供 busy-workspace 的子智能体胶囊读取。 */
    function runningSubagentCount(sessionId) {
      try {
        if (active.services === null) return 0
        const list = active.services.sessions.list.getSnapshot()
        const catalog = list.projectionsBySession !== null && list.projectionsBySession !== undefined && list.projectionsBySession[sessionId] !== undefined
          ? list.projectionsBySession[sessionId].values
          : undefined
        const children = catalog !== null && catalog !== undefined && Array.isArray(catalog.subagentCatalog) ? catalog.subagentCatalog : []
        let count = 0
        for (const child of children) {
          if (child === null || child === undefined) continue
          const status = active.statuses !== null && active.statuses !== undefined && typeof active.statuses.get === 'function' ? active.statuses.get(child.id) : undefined
          const running = status !== undefined ? status.running === true : list.byId[child.id] !== undefined && list.byId[child.id].running === true
          if (running) count += 1
        }
        return count
      } catch {
        return 0
      }
    }

    /** busy-workspace 的时间解析要求「5分钟」这种整串格式，带「前」会解析失败。 */
    function busyAgeLabel(ms) {
      const minutes = Math.floor(Math.max(0, Date.now() - ms) / 60000)
      if (minutes < 1) return t('busy.age.now')
      if (minutes < 60) return t('busy.age.minutes', { n: minutes })
      const hours = Math.floor(minutes / 60)
      if (hours < 24) return t('busy.age.hours', { n: hours })
      const days = Math.floor(hours / 24)
      if (days < 30) return t('busy.age.days', { n: days })
      if (days < 365) return t('busy.age.months', { n: Math.floor(days / 30) })
      return t('busy.age.years', { n: Math.floor(days / 365) })
    }

    /**
     * 状态桥：注册在常驻的 shell.overlay 槽位上，用槽位的标准属性 useSessionStatus
     * 读取内置四态与待处理分类，供自绘行和 dsh-plugin-busy-workspace 的契约共享。
     */
    function ActiveStatusSource(props) {
      const hook = props !== null && props !== undefined ? props.useSessionStatus : undefined
      if (typeof hook !== 'function') return null
      return h(ActiveStatusBridge, props)
    }

    function ActiveStatusBridge(props) {
      const statuses = props.useSessionStatus((state) => state)
      React.useEffect(() => {
        if (statuses === null || statuses === undefined || typeof statuses.get !== 'function') return
        if (active.statuses === statuses) return
        active.statuses = statuses
        active.signature = ''
        if (typeof active.schedule === 'function') active.schedule()
      }, [statuses])
      return null
    }

    function entryTitle(entry) {
      const raw = typeof entry.session.title === 'string' ? entry.session.title.trim() : ''
      return raw !== '' ? raw : t('activeSessions.untitled')
    }

    function workspaceLabel(entry) {
      const workspace = entry.workspace
      if (workspace === null) return t('activeSessions.ungrouped')
      const raw = typeof workspace.title === 'string' ? workspace.title.trim() : ''
      if (raw === '' || raw === 'default-workspace') return t('activeSessions.defaultWorkspace')
      return raw
    }

    /** 按最后活动时间倒序取活跃会话；窗口内为空时退回最近的若干条。 */
    function sessionEntries(services) {
      const hours = cfg.activeSessions.windowHours
      const fallbackCount = cfg.activeSessions.fallbackCount
      const empty = { entries: [], fallback: false, hours, fallbackCount }
      try {
        const list = services.sessions.list.getSnapshot()
        const workspaces = services.workspaces.list.getSnapshot()
        if (list === null || list === undefined || workspaces === null || workspaces === undefined) return empty
        const byId = list.byId !== null && typeof list.byId === 'object' ? list.byId : {}
        const ids = Array.isArray(list.ids) ? list.ids : Object.keys(byId)
        const archived = new Set(Array.isArray(workspaces.archivedSessionIds) ? workspaces.archivedSessionIds : [])
        const bySession = new Map()
        for (const workspace of Array.isArray(workspaces.items) ? workspaces.items : []) {
          if (workspace === null || workspace === undefined) continue
          for (const id of Array.isArray(workspace.sessionIds) ? workspace.sessionIds : []) bySession.set(id, workspace)
        }
        const cutoff = Date.now() - hours * 3600000
        const pool = []
        for (const id of ids) {
          const session = byId[id]
          if (session === null || session === undefined) continue
          if (session.blank === true) continue
          if (session.origin === 'subagent') continue
          if (archived.has(id)) continue
          if (typeof session.updatedAt !== 'number') continue
          pool.push({
            session,
            workspace: bySession.has(id) ? bySession.get(id) : null,
            activeNow: session.updatedAt >= cutoff || session.running === true,
          })
        }
        const newest = (left, right) => right.session.updatedAt - left.session.updatedAt || String(left.session.id).localeCompare(String(right.session.id))
        const activeRows = pool.filter((entry) => entry.activeNow === true).sort(newest)
        if (activeRows.length > 0) return { entries: activeRows, fallback: false, hours, fallbackCount }
        return { entries: pool.sort(newest).slice(0, fallbackCount), fallback: true, hours, fallbackCount }
      } catch {
        return empty
      }
    }

    function activeSignature(model) {
      const compat = cfg.features.busyWorkspaceCompat === true
      const ids = model.entries.map((entry) => {
        const session = entry.session
        const status = sessionStateOf(session.id, session)
        const timeWord = status.pending !== null ? pendingLabelOf(status.pending) : busyAgeLabel(session.updatedAt)
        const selected = session.retainedBy !== null && session.retainedBy !== undefined && (session.retainedBy.mainView || 0) > 0
        return [String(session.id), String(session.updatedAt), status.state, timeWord, compat ? String(runningSubagentCount(session.id)) : '0', selected ? 's' : ''].join(':')
      }).join(',')
      return JSON.stringify([
        cfg.features.activeSessions,
        cfg.features.busyWorkspaceCompat,
        cfg.activeSessions.windowHours,
        cfg.activeSessions.fallbackCount,
        model.fallback,
        model.hours,
        active.workspaceCollapsed,
        active.collapsed,
        Math.floor(Date.now() / 30000),
        t('activeSessions.heading'),
        ids,
      ])
    }

    function ensureActiveContainer(region) {
      let container = region.querySelector('[' + ACTIVE_ATTR + ']')
      if (container !== null && container === active.container) return container
      if (container === null) {
        container = document.createElement('div')
        container.setAttribute(ACTIVE_ATTR, '')
        const head = document.createElement('button')
        head.type = 'button'
        head.className = 'nlf-head'
        const chevron = document.createElement('span')
        chevron.className = 'nlf-head-chevron'
        chevron.setAttribute('aria-hidden', 'true')
        const label = document.createElement('span')
        label.className = 'nlf-head-label'
        head.appendChild(chevron)
        head.appendChild(label)
        const body = document.createElement('div')
        body.className = 'nlf-body'
        body.setAttribute('role', 'list')
        body.addEventListener('scroll', hideActiveCard, { passive: true })
        head.addEventListener('click', () => {
          active.collapsed = active.collapsed !== true
          head.setAttribute('aria-expanded', String(active.collapsed !== true))
          body.hidden = active.collapsed
          hideActiveCard()
        })
        container.appendChild(head)
        container.appendChild(body)
      }
      active.container = container
      active.head = container.querySelector('.nlf-head')
      active.headLabel = container.querySelector('.nlf-head-label')
      active.body = container.querySelector('.nlf-body')
      if (region.firstElementChild !== container) region.insertBefore(container, region.firstElementChild)
      return container
    }

    function ensureActiveCard() {
      if (active.card !== null && active.card.isConnected) return active.card
      const card = document.createElement('div')
      card.className = 'nlf-card'
      card.hidden = true
      document.body.appendChild(card)
      active.card = card
      return card
    }

    function hideActiveCard() {
      if (typeof window !== 'undefined') window.clearTimeout(active.timer)
      active.hoverSessionId = null
      if (active.card !== null && active.card.hidden === false) active.card.hidden = true
    }

    function showActiveCard(row, entry) {
      if (!row.isConnected) return
      const card = ensureActiveCard()
      const session = entry.session
      while (card.firstChild !== null) card.removeChild(card.firstChild)
      const title = document.createElement('div')
      title.className = 'nlf-card-title'
      title.textContent = entryTitle(entry)
      card.appendChild(title)
      const path = entry.workspace !== null && typeof entry.workspace.path === 'string' ? entry.workspace.path : ''
      if (path !== '') {
        const pathLine = document.createElement('div')
        pathLine.className = 'nlf-card-path'
        pathLine.textContent = path
        card.appendChild(pathLine)
      }
      const time = document.createElement('div')
      time.className = 'nlf-card-time'
      const state = sessionStateOf(session.id, session)
      const phase = state.pending !== null
        ? pendingLabelOf(state.pending)
        : state.running === true
          ? t('activeSessions.running')
          : t('activeSessions.idle')
      time.textContent = relativeLabel(session.updatedAt) + ' · ' + phase
      card.appendChild(time)
      active.hoverSessionId = session.id
      card.hidden = false
      const rect = row.getBoundingClientRect()
      const width = card.offsetWidth
      const height = card.offsetHeight
      let left = rect.right + 8
      if (left + width > window.innerWidth - 8) left = rect.left - width - 8
      if (left < 8) left = 8
      let top = rect.top
      if (top + height > window.innerHeight - 8) top = Math.max(8, window.innerHeight - height - 8)
      card.style.left = left + 'px'
      card.style.top = top + 'px'
    }

    function scheduleActiveCard(row, entry) {
      window.clearTimeout(active.timer)
      if (active.card !== null && active.card.isConnected && active.card.hidden === false) {
        if (active.hoverSessionId !== entry.session.id) showActiveCard(row, entry)
        return
      }
      active.timer = window.setTimeout(() => showActiveCard(row, entry), 600)
    }

    function openActiveEntry(entry) {
      try {
        active.services.uiWorkspace.openSession(entry.session.id)
      } catch {
        // 导航失败时保持原样。
      }
    }

    function openActiveMenu(entry, event) {
      const menus = typeof active.services.getMenus === 'function' ? active.services.getMenus() : null
      if (menus === null || menus === undefined || typeof menus.open !== 'function') return
      const session = entry.session
      let point
      if (event !== null && event !== undefined && typeof event.clientX === 'number' && event.type === 'contextmenu') {
        point = { x: event.clientX, y: event.clientY }
      } else if (event !== null && event !== undefined && event.currentTarget !== null && typeof event.currentTarget.getBoundingClientRect === 'function') {
        const rect = event.currentTarget.getBoundingClientRect()
        point = { x: rect.right - 6, y: rect.bottom + 4 }
      }
      const current = menus.active !== null && menus.active !== undefined && typeof menus.active.getSnapshot === 'function' ? menus.active.getSnapshot() : null
      const same = current !== null && current !== undefined && current.kind === 'session' && current.value !== null && current.value !== undefined && current.value.sessionId === session.id
      if (event !== null && event !== undefined && event.type === 'click' && same === true && typeof menus.close === 'function') menus.close()
      else menus.open({ kind: 'session', value: { sessionId: session.id, displayTitle: entryTitle(entry) } }, point)
    }

    function createActiveRow(entry) {
      const session = entry.session
      const state = sessionStateOf(session.id, session)
      const compat = cfg.features.busyWorkspaceCompat === true
      const selected = session.retainedBy !== null && session.retainedBy !== undefined && (session.retainedBy.mainView || 0) > 0
      const timeWord = state.pending !== null ? pendingLabelOf(state.pending) : busyAgeLabel(session.updatedAt)
      const subagents = compat ? runningSubagentCount(session.id) : 0
      const row = document.createElement('div')
      // nlf_sessionRow / nlf_title / nlf_time / nlf_selected 是 dsh-plugin-busy-workspace
      // 读取的官方 DOM 契约后缀；兼容开关关闭时不写，避免该插件对我们生效。
      row.className = 'nlf-row'
        + (compat ? ' nlf_sessionRow' : '')
        + (selected ? ' nlf-selected' + (compat ? ' nlf_selected' : '') : '')
      row.setAttribute('role', 'listitem')
      if (compat) {
        row.setAttribute('aria-selected', selected ? 'true' : 'false')
        row.setAttribute('data-row-key', 'session:' + String(session.id))
      }
      row.tabIndex = 0
      row.dataset.sessionId = String(session.id)
      row.title = entryTitle(entry)
      const main = document.createElement('div')
      main.className = 'nlf-row-main'
      const statusCell = document.createElement('span')
      statusCell.className = 'nlf-status'
      if (state.running === true) {
        const dot = document.createElement('span')
        dot.className = 'nlf-dot'
        dot.setAttribute('aria-hidden', 'true')
        statusCell.appendChild(dot)
      }
      const title = document.createElement('span')
      title.className = 'nlf-title' + (compat ? ' nlf_title' : '')
      title.textContent = entryTitle(entry)
      const more = document.createElement('button')
      more.type = 'button'
      more.className = 'nlf-more'
      more.tabIndex = -1
      more.setAttribute('aria-label', t('activeSessions.actions'))
      more.title = t('activeSessions.actions')
      const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      icon.setAttribute('viewBox', '0 0 16 16')
      icon.setAttribute('width', '16')
      icon.setAttribute('height', '16')
      icon.setAttribute('fill', 'currentColor')
      icon.setAttribute('aria-hidden', 'true')
      for (const cx of ['3', '8', '13']) {
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
        circle.setAttribute('cx', cx)
        circle.setAttribute('cy', '8')
        circle.setAttribute('r', '1.3')
        icon.appendChild(circle)
      }
      more.appendChild(icon)
      main.appendChild(statusCell)
      main.appendChild(title)
      main.appendChild(more)
      const meta = document.createElement('div')
      meta.className = 'nlf-meta'
      meta.textContent = workspaceLabel(entry) + ' · ' + (state.pending !== null ? pendingLabelOf(state.pending) : relativeLabel(session.updatedAt))
      row.appendChild(main)
      row.appendChild(meta)
      if (compat) {
        // 以下三个节点只供 busy-workspace 读取，不参与布局；开关关闭时不写。
        const stateDot = document.createElement('span')
        stateDot.className = 'nlf_state_dot'
        stateDot.setAttribute('data-state', state.state)
        stateDot.setAttribute('aria-hidden', 'true')
        const timeNode = document.createElement('span')
        timeNode.className = 'nlf_time'
        timeNode.textContent = timeWord
        const slot = document.createElement('span')
        slot.className = 'nlf_slot'
        if (subagents > 0) {
          const label = document.createElement('span')
          label.className = 'nlf_visuallyHidden'
          label.textContent = t('busy.subagentsRunning', { n: subagents })
          slot.appendChild(label)
        }
        row.appendChild(stateDot)
        row.appendChild(timeNode)
        row.appendChild(slot)
      }
      row.addEventListener('click', (event) => {
        if (event.target !== null && event.target !== undefined && typeof event.target.closest === 'function' && event.target.closest('.nlf-more') !== null) return
        hideActiveCard()
        openActiveEntry(entry)
      })
      row.addEventListener('contextmenu', (event) => {
        event.preventDefault()
        hideActiveCard()
        openActiveMenu(entry, event)
      })
      row.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ' && event.key !== 'Spacebar') return
        event.preventDefault()
        hideActiveCard()
        openActiveEntry(entry)
      })
      more.addEventListener('click', (event) => {
        event.stopPropagation()
        hideActiveCard()
        openActiveMenu(entry, event)
      })
      row.addEventListener('pointerenter', () => scheduleActiveCard(row, entry))
      row.addEventListener('pointerleave', hideActiveCard)
      row.addEventListener('focus', () => scheduleActiveCard(row, entry))
      row.addEventListener('blur', hideActiveCard)
      return row
    }

    function renderActiveRows(model) {
      const body = active.body
      if (body === null) return
      while (body.firstChild !== null) body.removeChild(body.firstChild)
      if (model.entries.length === 0) {
        const empty = document.createElement('div')
        empty.className = 'nlf-empty'
        empty.textContent = t('activeSessions.empty', { hours: model.hours })
        body.appendChild(empty)
        return
      }
      if (model.fallback === true) {
        const hint = document.createElement('div')
        hint.className = 'nlf-caption'
        hint.textContent = t('activeSessions.fallbackHint', { hours: model.hours, count: model.entries.length })
        body.appendChild(hint)
      }
      for (const entry of model.entries) body.appendChild(createActiveRow(entry))
    }

    function sidebarIsCollapsed(region) {
      const root = region.parentElement
      if (root === null) return false
      for (const name of root.classList) if (name.endsWith('_collapsed')) return true
      return false
    }

    function syncActiveSessions() {
      try {
        if (!cfg.features.activeSessions || active.services === null) {
          teardownActiveSessions()
          return
        }
        if (active.enabled !== true) {
          active.enabled = true
          active.workspaceCollapsed = true
          active.collapsed = false
          active.searchExpanded = false
          active.signature = ''
        }
        const region = document.querySelector(REGION_SELECTOR)
        if (region === null) {
          teardownActiveSessions()
          return
        }
        activeStyleEnsure()
        const container = ensureActiveContainer(region)
        if (container === null) return
        active.dirty = true
        // 槽位渲染器会在 regionArea 与 WorkSpaceBrowser 之间放一层 display:contents 锚点，
        // 所以以分区标题的直接父节点作为折叠锚点，而不是 regionArea 的相邻兄弟。
        const header = region.querySelector('[class*="_sectionHeader"]')
        if (header === null || header.parentElement === null) {
          if (container.hidden !== true) container.hidden = true
          hideActiveCard()
          return
        }
        const browser = header.parentElement
        if (!browser.hasAttribute(WORKSPACES_ATTR)) browser.setAttribute(WORKSPACES_ATTR, '')
        if (!header.hasAttribute(WORKSPACE_HEADER_ATTR)) header.setAttribute(WORKSPACE_HEADER_ATTR, '')
        for (const stale of region.querySelectorAll('[' + WORKSPACES_ATTR + ']')) {
          if (stale !== browser) {
            stale.removeAttribute(WORKSPACES_ATTR)
            stale.removeAttribute(WORKSPACES_COLLAPSED_ATTR)
          }
        }
        for (const stale of region.querySelectorAll('[' + WORKSPACE_HEADER_ATTR + ']')) {
          if (stale !== header) stale.removeAttribute(WORKSPACE_HEADER_ATTR)
        }
        const collapsed = sidebarIsCollapsed(region)
        if (collapsed) {
          // rail 状态下内置浏览器只留图标，不能再折叠。
          if (browser.hasAttribute(WORKSPACES_COLLAPSED_ATTR)) browser.removeAttribute(WORKSPACES_COLLAPSED_ATTR)
          if (container.hidden !== true) container.hidden = true
          hideActiveCard()
          return
        }
        if (container.hidden !== false) container.hidden = false
        const searchExpanded = browser.querySelector('[class*="_searchExpanded"]') !== null
        if (active.workspaceCollapsed === true) {
          // 折叠时工作区只保留标题行，紧贴在活跃会话区下方。
          if (!browser.hasAttribute(WORKSPACES_COLLAPSED_ATTR)) browser.setAttribute(WORKSPACES_COLLAPSED_ATTR, '')
          if (searchExpanded && active.searchExpanded !== true) {
            active.searchExpanded = true
            setWorkspaceCollapsed(false)
            const input = browser.querySelector('input[class*="_searchInput"]')
            if (input !== null && typeof input.focus === 'function') requestAnimationFrame(() => {
              try {
                input.focus()
              } catch {
                // 聚焦失败不阻塞展开。
              }
            })
            return
          }
          if (!searchExpanded) active.searchExpanded = false
        } else {
          if (browser.hasAttribute(WORKSPACES_COLLAPSED_ATTR)) browser.removeAttribute(WORKSPACES_COLLAPSED_ATTR)
          active.searchExpanded = searchExpanded
        }
        const model = sessionEntries(active.services)
        const signature = activeSignature(model)
        if (signature === active.signature) return
        active.signature = signature
        if (active.headLabel !== null) active.headLabel.textContent = t('activeSessions.heading')
        if (active.head !== null) {
          active.head.setAttribute('aria-label', t('activeSessions.toggle'))
          active.head.setAttribute('aria-expanded', String(active.collapsed !== true))
        }
        if (active.body !== null) active.body.hidden = active.collapsed === true
        renderActiveRows(model)
        if (active.body !== null && active.body.hidden === true && active.collapsed === true) hideActiveCard()
      } catch {
        // 装饰失败时保持内置侧栏原样。
      }
    }

    function setWorkspaceCollapsed(value) {
      active.workspaceCollapsed = value === true
      active.signature = ''
      syncActiveSessions()
    }

    function teardownActiveSessions() {
      active.enabled = false
      if (active.dirty !== true) return
      active.dirty = false
      active.signature = ''
      if (active.container !== null && active.container.parentElement !== null) active.container.remove()
      active.container = null
      active.head = null
      active.headLabel = null
      active.body = null
      const style = document.getElementById(ACTIVE_STYLE_ID)
      if (style !== null) style.remove()
      for (const browser of document.querySelectorAll('[' + WORKSPACES_ATTR + ']')) {
        browser.removeAttribute(WORKSPACES_ATTR)
        browser.removeAttribute(WORKSPACES_COLLAPSED_ATTR)
      }
      for (const header of document.querySelectorAll('[' + WORKSPACE_HEADER_ATTR + ']')) header.removeAttribute(WORKSPACE_HEADER_ATTR)
      hideActiveCard()
      if (active.card !== null) {
        active.card.remove()
        active.card = null
      }
    }

    function watchActiveSessions(services) {
      active.services = services
      active.workspaceCollapsed = true
      active.collapsed = false
      active.signature = ''
      let scheduled = false
      const schedule = () => {
        if (scheduled) return
        scheduled = true
        requestAnimationFrame(() => {
          scheduled = false
          syncActiveSessions()
        })
      }
      active.schedule = schedule
      const subscriptions = []
      for (const store of [services.sessions.list, services.workspaces.list]) {
        if (store !== null && store !== undefined && typeof store.subscribe === 'function') {
          try {
            subscriptions.push(store.subscribe(schedule))
          } catch {
            // 订阅失败时仍保留周期刷新。
          }
        }
      }
      const observer = new MutationObserver(schedule)
      observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] })
      const interval = window.setInterval(schedule, 30000)
      const onRegionClick = (event) => {
        const target = event.target
        if (target === null || target === undefined || typeof target.closest !== 'function') return
        const header = target.closest('[' + WORKSPACE_HEADER_ATTR + ']')
        if (header === null) return
        const interactive = target.closest('button, input, textarea, select, a, [contenteditable="true"]')
        if (interactive !== null) {
          setWorkspaceCollapsed(false)
          return
        }
        setWorkspaceCollapsed(active.workspaceCollapsed !== true)
      }
      const onFocusIn = (event) => {
        const target = event.target
        if (target === null || target === undefined || typeof target.closest !== 'function') return
        if (target.closest('input[class*="_searchInput"]') !== null) setWorkspaceCollapsed(false)
      }
      document.addEventListener('click', onRegionClick, true)
      document.addEventListener('focusin', onFocusIn, true)
      const onConfig = () => schedule()
      listeners.add(onConfig)
      syncActiveSessions()
      return () => {
        for (const dispose of subscriptions) {
          try {
            dispose()
          } catch {
            // 已失效的订阅直接忽略。
          }
        }
        observer.disconnect()
        window.clearInterval(interval)
        listeners.delete(onConfig)
        document.removeEventListener('click', onRegionClick, true)
        document.removeEventListener('focusin', onFocusIn, true)
        active.services = null
        active.schedule = null
        active.statuses = null
        teardownActiveSessions()
        active.workspaceCollapsed = true
        active.collapsed = false
      }
    }

    // ---------- feature 5: new-session default model ----------

    /** apply 时绑定，供设置页读取模型目录。 */
    let runtime = null

    const modelCatalog = { value: null, pending: null, listeners: new Set() }

    function catalogEmit() {
      for (const listener of modelCatalog.listeners) listener(modelCatalog.value)
    }

    /** 读取一次可用模型目录（供应商 → 模型），供设置页下拉使用。 */
    function catalogEnsure() {
      if (modelCatalog.value !== null) return Promise.resolve(modelCatalog.value)
      if (modelCatalog.pending !== null) return modelCatalog.pending
      if (runtime === null) return Promise.resolve(null)
      const remote = runtime.remote
      const namespace = remote !== null && remote !== undefined ? remote.session : undefined
      if (namespace === null || namespace === undefined || typeof namespace.modelCatalog !== 'function') return Promise.resolve(null)
      // Remote 在未连接或命名空间尚未就绪时可能同步抛错；这里必须兜住，
      // 否则异常会在设置页的 effect 中冒泡，导致该 section 白屏。
      let request
      try {
        request = namespace.modelCatalog()
      } catch {
        return Promise.resolve(null)
      }
      modelCatalog.pending = Promise.resolve(request)
        .then((response) => {
          modelCatalog.pending = null
          if (response !== null && response !== undefined && response.ok === true && response.value !== null && response.value !== undefined) {
            modelCatalog.value = response.value
            catalogEmit()
          }
          return modelCatalog.value
        })
        .catch(() => {
          modelCatalog.pending = null
          return null
        })
      return modelCatalog.pending
    }

    function catalogGroups() {
      const value = modelCatalog.value
      const groups = value !== null && value !== undefined && Array.isArray(value.groups) ? value.groups : []
      return groups.filter((group) => group !== null && group !== undefined && typeof group.id === 'string')
    }

    function useModelCatalog() {
      const [value, setValue] = React.useState(modelCatalog.value)
      const [, setStatus] = React.useState('idle')
      React.useEffect(() => {
        let alive = true
        setStatus('loading')
        catalogEnsure().then((loaded) => {
          if (!alive) return
          setValue(loaded)
          setStatus(loaded === null ? 'error' : 'ready')
        })
        const listener = (next) => setValue(next)
        modelCatalog.listeners.add(listener)
        return () => {
          alive = false
          modelCatalog.listeners.delete(listener)
        }
      }, [])
      return value
    }

    /** 当前主视图会话的摘要行。 */
    function mainSummary(services) {
      try {
        const list = services.sessions.list.getSnapshot()
        if (list === null || list === undefined) return null
        const ids = Array.isArray(list.ids) ? list.ids : Object.keys(list.byId !== null && list.byId !== undefined ? list.byId : {})
        for (const id of ids) {
          const row = list.byId !== null && list.byId !== undefined ? list.byId[id] : undefined
          if (row !== null && row !== undefined && (row.retainedBy !== null && row.retainedBy !== undefined ? row.retainedBy.mainView ?? 0 : 0) > 0) return row
        }
      } catch {
        // 读取失败时按没有主视图会话处理。
      }
      return null
    }

    const defaultModelState = { applied: new Set(), inFlight: new Set(), attempts: new Map() }
    /** 同一空白会话最多尝试次数；失败到上限后放弃，等配置变更再重来。 */
    const DEFAULT_MODEL_MAX_ATTEMPTS = 3

    /**
     * 把当前未开始的空白会话钉到配置的默认模型。
     * 只在 blank 会话首次出现时执行一次；用户随后手动换模型不会被覆盖。
     */
    function applyDefaultModel(services) {
      try {
        if (!cfg.features.defaultModel) return
        const want = cfg.defaultModel
        if (want.provider === '' || want.model === '') return
        const summary = mainSummary(services)
        if (summary === null || summary.blank !== true) return
        const id = summary.id
        if (defaultModelState.applied.has(id) || defaultModelState.inFlight.has(id)) return
        const remote = services.remote
        const namespace = remote !== null && remote !== undefined ? remote.session : undefined
        if (namespace === null || namespace === undefined || typeof namespace.selectModel !== 'function') return
        defaultModelState.inFlight.add(id)
        const request = { sessionId: id, provider: want.provider, model: want.model }
        Promise.resolve(namespace.selectModel(request))
          .then((result) => {
            defaultModelState.inFlight.delete(id)
            if (result !== null && result !== undefined && result.ok === false) {
              const attempts = (defaultModelState.attempts.get(id) ?? 0) + 1
              defaultModelState.attempts.set(id, attempts)
              if (attempts >= DEFAULT_MODEL_MAX_ATTEMPTS) defaultModelState.applied.add(id)
              return
            }
            defaultModelState.attempts.delete(id)
            defaultModelState.applied.add(id)
          })
          .catch(() => {
            defaultModelState.inFlight.delete(id)
            const attempts = (defaultModelState.attempts.get(id) ?? 0) + 1
            defaultModelState.attempts.set(id, attempts)
            if (attempts >= DEFAULT_MODEL_MAX_ATTEMPTS) defaultModelState.applied.add(id)
          })
      } catch {
        // 设置失败时保留内置模型行为。
      }
    }

    function watchDefaultModel(services) {
      let scheduled = false
      const schedule = () => {
        if (scheduled) return
        scheduled = true
        requestAnimationFrame(() => {
          scheduled = false
          applyDefaultModel(services)
        })
      }
      const subscriptions = []
      const store = services.sessions.list
      if (store !== null && store !== undefined && typeof store.subscribe === 'function') {
        try {
          subscriptions.push(store.subscribe(schedule))
        } catch {
          // 订阅失败时仍保留初次应用。
        }
      }
      const onConfig = () => {
        defaultModelState.applied.clear()
        defaultModelState.attempts.clear()
        schedule()
      }
      listeners.add(onConfig)
      applyDefaultModel(services)
      return () => {
        for (const dispose of subscriptions) {
          try {
            dispose()
          } catch {
            // 已失效的订阅直接忽略。
          }
        }
        listeners.delete(onConfig)
        defaultModelState.applied.clear()
        defaultModelState.inFlight.clear()
        defaultModelState.attempts.clear()
      }
    }

    // ---------- settings section ----------

    const T = {
      labelPrimary: 'var(--dsw-alias-label-primary)',
      labelSecondary: 'var(--dsw-alias-label-secondary)',
      labelTertiary: 'var(--dsw-alias-label-tertiary)',
      borderL1: 'var(--dsw-alias-border-l1)',
      borderL2: 'var(--dsw-alias-border-l2)',
      layer1: 'var(--dsw-alias-bg-layer-1)',
      layer2: 'var(--dsw-alias-bg-layer-2)',
      brand: 'var(--dsw-alias-brand-primary)',
      hover: 'var(--dsw-alias-interactive-bg-hover)',
    }

    const styles = {
      section: { display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '760px' },
      header: { display: 'flex', flexDirection: 'column', gap: '6px' },
      title: { margin: 0, fontSize: '17px', fontWeight: 600, color: T.labelPrimary, letterSpacing: '0.2px' },
      intro: { margin: 0, fontSize: '13px', lineHeight: '20px', color: T.labelTertiary },
      card: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        padding: '14px 16px',
        border: `1px solid ${T.borderL2}`,
        borderRadius: '10px',
        background: T.layer1,
      },
      cardHead: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' },
      cardText: { display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0 },
      cardTitle: { fontSize: '14px', fontWeight: 500, color: T.labelPrimary },
      cardDesc: { fontSize: '12px', lineHeight: '18px', color: T.labelTertiary },
      switch: (on) => ({
        flex: '0 0 auto',
        position: 'relative',
        width: '38px',
        height: '22px',
        marginTop: '2px',
        padding: 0,
        border: 'none',
        borderRadius: '999px',
        cursor: 'pointer',
        background: on ? T.brand : T.borderL2,
        transition: 'background 120ms ease',
      }),
      knob: (on) => ({
        position: 'absolute',
        top: '2px',
        left: on ? '18px' : '2px',
        width: '18px',
        height: '18px',
        borderRadius: '50%',
        background: '#fff',
        boxShadow: '0 1px 2px rgba(0,0,0,0.28)',
        transition: 'left 120ms ease',
      }),
      config: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        paddingTop: '12px',
        borderTop: `1px solid ${T.borderL1}`,
      },
      keyRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', minHeight: '30px' },
      keyName: { display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 },
      keyChip: {
        flex: '0 0 auto',
        padding: '2px 8px',
        border: `1px solid ${T.borderL2}`,
        borderRadius: '6px',
        background: T.layer2,
        fontSize: '12px',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
        color: T.labelSecondary,
      },
      keyHint: { fontSize: '12px', color: T.labelTertiary },
      select: {
        flex: '0 0 auto',
        minWidth: '104px',
        padding: '5px 8px',
        border: `1px solid ${T.borderL2}`,
        borderRadius: '6px',
        background: T.layer2,
        color: T.labelPrimary,
        fontSize: '12px',
        cursor: 'pointer',
      },
      number: {
        flex: '0 0 auto',
        width: '84px',
        padding: '5px 8px',
        border: `1px solid ${T.borderL2}`,
        borderRadius: '6px',
        background: T.layer2,
        color: T.labelPrimary,
        fontSize: '12px',
      },
      footer: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' },
      note: { margin: 0, fontSize: '12px', color: T.labelTertiary },
      reset: {
        padding: '5px 12px',
        border: `1px solid ${T.borderL2}`,
        borderRadius: '6px',
        background: 'transparent',
        color: T.labelSecondary,
        fontSize: '12px',
        cursor: 'pointer',
      },
    }

    function Toggle(props) {
      return h(
        'button',
        {
          type: 'button',
          role: 'switch',
          'aria-checked': props.checked,
          'aria-label': props.title,
          title: props.title,
          style: styles.switch(props.checked),
          onClick: () => props.onChange(!props.checked),
        },
        h('span', { style: styles.knob(props.checked), 'aria-hidden': 'true' }),
      )
    }

    function FeatureCard(props) {
      return h(
        'div',
        { style: styles.card },
        h(
          'div',
          { style: styles.cardHead },
          h(
            'div',
            { style: styles.cardText },
            h('span', { style: styles.cardTitle }, props.title),
            h('span', { style: styles.cardDesc }, props.description),
          ),
          h(Toggle, { checked: props.checked, title: props.title, onChange: props.onChange }),
        ),
        props.checked && props.children ? h('div', { style: styles.config }, props.children) : null,
      )
    }

    function KeyRow(props) {
      return h(
        'div',
        { style: styles.keyRow },
        h(
          'span',
          { style: styles.keyName },
          h('span', { style: styles.keyChip }, props.keys),
          h('span', { style: styles.keyHint }, props.hint),
        ),
        h(
          'select',
          {
            style: styles.select,
            value: props.value,
            onChange: (event) => props.onChange(event.target.value),
          },
          h('option', { value: 'newline' }, t('key.newline')),
          h('option', { value: 'queue' }, t('key.queue')),
          h('option', { value: 'steer' }, t('key.steer')),
        ),
      )
    }

    function NumberRow(props) {
      return h(
        'div',
        { style: styles.keyRow },
        h('span', { style: styles.keyName }, h('span', { style: styles.keyHint }, props.label)),
        h('input', {
          style: styles.number,
          type: 'number',
          min: props.min,
          max: props.max,
          value: props.value,
          onChange: (event) => props.onChange(event.target.value === '' ? props.min : Number(event.target.value)),
        }),
      )
    }

    function ToggleRow(props) {
      return h(
        'div',
        { style: styles.keyRow },
        h('span', { style: styles.keyName }, h('span', { style: styles.keyHint, title: props.description }, props.label)),
        h(Toggle, { checked: props.checked, title: props.label, onChange: props.onChange }),
      )
    }

    function DefaultModelPicker(props) {
      const config = props.config
      const catalog = useModelCatalog()
      try {
        return renderDefaultModelPicker(config, catalog)
      } catch (error) {
        // 目录或配置异常时只降级这一块，不牵连整页设置。
        try {
          console.error('[nevstop-lab-flavor] default model picker failed:', error)
        } catch {
          // 控制台不可用时忽略。
        }
        return h('p', { style: styles.note }, t('defaultModel.unavailable'))
      }
    }

    function renderDefaultModelPicker(config, catalog) {
      const groups = catalog !== null && catalog !== undefined && Array.isArray(catalog.groups) ? catalog.groups : []
      const current = config !== null && config !== undefined && config.defaultModel !== null && config.defaultModel !== undefined
        ? config.defaultModel
        : { provider: '', model: '' }
      const provider = groups.find((group) => group !== null && group !== undefined && group.id === current.provider) || null
      const models = provider !== null && Array.isArray(provider.models) ? provider.models : []
      const setModel = (patch) => save({ ...config, defaultModel: { ...current, ...patch } })
      const onProvider = (value) => {
        const next = groups.find((group) => group !== null && group !== undefined && group.id === value) || null
        const first = next !== null && Array.isArray(next.models) && next.models.length > 0 && next.models[0] !== null && typeof next.models[0].id === 'string' ? next.models[0].id : ''
        setModel({ provider: value, model: first })
      }
      let hint = ''
      if (catalog === null || catalog === undefined) hint = groups.length === 0 ? t('defaultModel.unavailable') : ''
      else if (current.provider === '' || current.model === '') hint = t('defaultModel.pickFirst')
      else if (provider === null || !models.some((model) => model !== null && model.id === current.model)) hint = t('defaultModel.missing')
      else hint = t('defaultModel.applied', { provider: provider.name || provider.id, model: current.model })
      return h(
        'div',
        { style: styles.config },
        catalog === null || catalog === undefined
          ? h('p', { style: styles.note }, t('defaultModel.loading'))
          : h(
              'div',
              { style: styles.keyRow },
              h('span', { style: styles.keyName }, h('span', { style: styles.keyHint }, t('defaultModel.provider'))),
              h(
                'select',
                { style: styles.select, value: current.provider, onChange: (event) => onProvider(event.target.value) },
                h('option', { value: '' }, t('defaultModel.none')),
                groups.map((group) => h('option', { key: group.id, value: group.id }, group.name || group.id)),
              ),
            ),
        catalog !== null && catalog !== undefined
          ? h(
              'div',
              { style: styles.keyRow },
              h('span', { style: styles.keyName }, h('span', { style: styles.keyHint }, t('defaultModel.model'))),
              h(
                'select',
                {
                  style: styles.select,
                  value: current.model,
                  disabled: provider === null,
                  onChange: (event) => setModel({ model: event.target.value }),
                },
                h('option', { value: '' }, t('defaultModel.none')),
                models.map((model) => h('option', { key: model.id, value: model.id }, model.name || model.id)),
              ),
            )
          : null,
        hint === '' ? null : h('p', { style: styles.note }, hint),
      )
    }

    function SettingsSection() {
      const config = useConfig()
      const setFeature = (key, value) => save({ ...config, features: { ...config.features, [key]: value } })
      const setKey = (key, value) => save({ ...config, composerKeys: { ...config.composerKeys, [key]: value } })
      const setActive = (key, value) => save({ ...config, activeSessions: { ...config.activeSessions, [key]: value } })
      return h(
        'section',
        { style: styles.section },
        h(
          'div',
          { style: styles.header },
          h('h2', { style: styles.title }, 'NEVSTOP-LAB'),
          h('p', { style: styles.intro }, t('intro')),
        ),
        h(
          FeatureCard,
          {
            title: t('providerLabel.title'),
            description: t('providerLabel.desc'),
            checked: config.features.providerLabel,
            onChange: (value) => setFeature('providerLabel', value),
          },
          h(
            'div',
            { style: styles.keyRow },
            h(
              'span',
              { style: styles.keyName },
              h('span', { style: styles.keyChip }, t('example')),
              h('span', { style: styles.keyHint }, 'DeepSeek · flash / opencode-go · flash'),
            ),
          ),
        ),
        h(
          FeatureCard,
          {
            title: t('composerKeys.title'),
            description: t('composerKeys.desc'),
            checked: config.features.composerKeys,
            onChange: (value) => setFeature('composerKeys', value),
          },
          h(KeyRow, {
            keys: 'Enter',
            hint: t('key.hint.enter'),
            value: config.composerKeys.enter,
            onChange: (value) => setKey('enter', value),
          }),
          h(KeyRow, {
            keys: 'Ctrl / Cmd + Enter',
            hint: t('key.hint.ctrlEnter'),
            value: config.composerKeys.ctrlEnter,
            onChange: (value) => setKey('ctrlEnter', value),
          }),
          h(KeyRow, {
            keys: 'Shift + Enter',
            hint: t('key.hint.shiftEnter'),
            value: config.composerKeys.shiftEnter,
            onChange: (value) => setKey('shiftEnter', value),
          }),
          h(KeyRow, {
            keys: 'Alt + Enter',
            hint: t('key.hint.altEnter'),
            value: config.composerKeys.altEnter,
            onChange: (value) => setKey('altEnter', value),
          }),
        ),
        h(
          FeatureCard,
          {
            title: t('sidebarPanels.title'),
            description: t('sidebarPanels.desc'),
            checked: config.features.sidebarPanels,
            onChange: (value) => setFeature('sidebarPanels', value),
          },
        ),
        h(
          FeatureCard,
          {
            title: t('activeSessions.title'),
            description: t('activeSessions.desc'),
            checked: config.features.activeSessions,
            onChange: (value) => setFeature('activeSessions', value),
          },
          h(NumberRow, {
            label: t('activeSessions.window'),
            min: 1,
            max: 168,
            value: config.activeSessions.windowHours,
            onChange: (value) => setActive('windowHours', value),
          }),
          h(NumberRow, {
            label: t('activeSessions.fallback'),
            min: 1,
            max: 50,
            value: config.activeSessions.fallbackCount,
            onChange: (value) => setActive('fallbackCount', value),
          }),
          h(ToggleRow, {
            label: t('busyCompat.title'),
            description: t('busyCompat.desc'),
            checked: config.features.busyWorkspaceCompat,
            onChange: (value) => setFeature('busyWorkspaceCompat', value),
          }),
          h('p', { style: styles.note }, t('busyCompat.desc')),
        ),
        h(
          FeatureCard,
          {
            title: t('defaultModel.title'),
            description: t('defaultModel.desc'),
            checked: config.features.defaultModel,
            onChange: (value) => setFeature('defaultModel', value),
          },
          h(DefaultModelPicker, { config }),
        ),
        h(
          FeatureCard,
          {
            title: t('balanceChip.title'),
            description: t('balanceChip.desc'),
            checked: config.features.balanceChip,
            onChange: (value) => setFeature('balanceChip', value),
          },
        ),        h(
          'div',
          { style: styles.footer },
          h('p', { style: styles.note }, t('note')),
          h(
            'button',
            { type: 'button', style: styles.reset, onClick: () => save(DEFAULTS) },
            t('reset'),
          ),
        ),
      )
    }

    /**
     * 设置页错误边界：任何子组件在渲染或 effect 中抛错时，只让这一块显示提示，
     * 不会把整个设置页拖成白屏；同时把错误摘要显示出来并打到控制台，便于反馈。
     */
    class SettingsErrorBoundary extends React.Component {
      constructor(props) {
        super(props)
        this.state = { failed: false, message: '' }
      }

      static getDerivedStateFromError(error) {
        const message = error !== null && error !== undefined && typeof error.message === 'string' ? error.message : String(error)
        return { failed: true, message }
      }

      componentDidCatch(error, info) {
        try {
          console.error('[nevstop-lab-flavor] settings section failed:', error, info !== null && info !== undefined ? info.componentStack : '')
        } catch {
          // 控制台不可用时忽略。
        }
      }

      render() {
        if (this.state.failed) {
          return h(
            'section',
            { style: styles.section },
            h('p', { style: styles.note }, t('settingsFailed')),
            h('p', { style: styles.note, title: this.state.message }, this.state.message),
          )
        }
        return this.props.children
      }
    }

    function SettingsSectionSafe(props) {
      return h(SettingsErrorBoundary, null, h(SettingsSection, props))
    }

    // ---------- balance ring (imported from dsh-balance-chip, MIT) ----------
    function balanceChipPlugin(require, isEnabled) {
  const react = require('react')
  const { jsx: h, jsxs } = require('react/jsx-runtime')
  const { Tooltip } = require('@deepseek-ai/dsh-client-ui-primitives')
  const { createPortal } = require('react-dom')
  const NS = 'dsh-balance-chip'
  const CSS = '.dbc_root{position:relative;display:flex;align-items:center}.dbc_trigger{appearance:none;display:grid;place-items:center;width:28px;height:28px;padding:0;border:0;border-radius:50%;background:transparent;color:var(--dsw-alias-label-tertiary);cursor:pointer}.dbc_trigger:hover{background:var(--dsw-alias-interactive-bg-hover)}.dbc_trigger:focus-visible,.dbc_refresh:focus-visible{outline:2px solid var(--dsw-focus-ring-color,#60a5fa);outline-offset:2px}.dbc_ring{width:20px;height:20px;overflow:visible}.dbc_track{stroke:var(--dsw-alias-border-l3,#555)}.dbc_fill{transition:stroke-dashoffset .25s,stroke .25s;transform:rotate(-90deg);transform-origin:center}.dbc_panel{position:absolute;bottom:calc(100% + 9px);right:0;z-index:1000;width:min(280px,calc(100vw - 32px));box-sizing:border-box;padding:16px;border:1px solid var(--dsw-alias-border-l3,#454545);border-radius:14px;background:var(--dsw-alias-bg-layer-2,var(--dsw-alias-bg-base,#303033));color:var(--dsw-alias-label-primary,#eee);box-shadow:0 8px 32px #0004;font-family:var(--dsw-font-family);font-size:12px;line-height:20px}.dbc_heading{display:flex;justify-content:space-between;align-items:center;gap:12px;font-weight:600}.dbc_provider{color:var(--dsw-alias-label-secondary,#bbb);overflow-wrap:anywhere;margin:4px 0 12px}.dbc_amount{font-size:26px;line-height:34px;font-weight:600;font-variant-numeric:tabular-nums;margin:3px 0 10px}.dbc_row{display:flex;justify-content:space-between;gap:12px;font-variant-numeric:tabular-nums}.dbc_foot{color:var(--dsw-alias-label-tertiary,#999);font-size:11px;margin-top:12px}.dbc_refresh{border:0;border-radius:6px;padding:3px 7px;background:var(--dsw-alias-interactive-bg-hover,#444);color:inherit;cursor:pointer;font:inherit}.dbc_refresh:disabled{opacity:.5;cursor:wait}.dbc_tip{font-size:12px;white-space:pre-line}.dbc_status{color:var(--dsw-alias-label-secondary,#bbb)}.dbc_cfg{border-top:1px solid var(--dsw-alias-border-l3,#454545);margin-top:12px;padding-top:10px;display:grid;gap:8px}.dbc_input{width:96px;box-sizing:border-box;border:1px solid var(--dsw-alias-border-l3,#454545);border-radius:6px;background:transparent;color:inherit;font:inherit;padding:3px 6px}.dbc_input:focus-visible{outline:2px solid var(--dsw-focus-ring-color,#60a5fa);outline-offset:1px}.dbc_cfgbtns{display:flex;gap:8px;align-items:center;justify-content:flex-end}.dbc_btn{border:0;border-radius:6px;padding:3px 8px;background:var(--dsw-alias-interactive-bg-hover,#444);color:inherit;cursor:pointer;font:inherit}.dbc_actions{display:flex;align-items:center;gap:6px}.dbc_gear{appearance:none;display:grid;place-items:center;width:22px;height:22px;padding:0;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary,#bbb);cursor:pointer}.dbc_gear:hover{background:var(--dsw-alias-interactive-bg-hover,#444)}.dbc_gear:focus-visible{outline:2px solid var(--dsw-focus-ring-color,#60a5fa);outline-offset:2px}.dbc_gear[aria-expanded="true"]{background:var(--dsw-alias-interactive-bg-hover,#444);color:var(--dsw-alias-label-primary,#eee)}'
  function styles() {
    if (typeof document === 'undefined') return () => {}
    const previous = document.querySelector('style[data-plugin-css="' + NS + '"]')
    const tag = document.createElement('style')
    tag.dataset.pluginCss = NS
    tag.textContent = CSS
    previous?.remove()
    document.head.appendChild(tag)
    return () => tag.remove()
  }
  function formatAmount(raw) {
    const value = Number(raw)
    if (!Number.isFinite(value)) return '—'
    // Truncate decimal text before converting: 0.29 * 100 can be 28.999999999999996.
    const decimal = String(raw).trim().match(/^(-?)(\d+)(?:\.(\d*))?$/)
    const truncated = decimal ? Number(decimal[1] + decimal[2] + '.' + (decimal[3] ?? '').slice(0, 2)) : Math.trunc(value * 100) / 100
    return truncated.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }
  // Reference amounts live on the host; the panel edits them.
  const CONFIG_PATH = '/__dsh-balance-chip/config'
  const REFERENCE_KEYS = { CNY: 'referenceCny', USD: 'referenceUsd' }
  const REFERENCE_DEFAULTS = { referenceCny: 50, referenceUsd: 10 }
  function referenceOf(config, currency) {
    const key = REFERENCE_KEYS[currency]
    if (!key) return null
    const value = Number(config?.[key])
    return Number.isFinite(value) && value > 0 ? value : REFERENCE_DEFAULTS[key]
  }
  // Three concentric rings, each covering 100% of the reference (300% in total).
  const RINGS = [8.4, 5.6, 2.8]
  const RING_OPACITY = [1, 0.72, 0.5]
  function ringFractions(value, reference) {
    if (!Number.isFinite(value) || !Number.isFinite(reference) || reference <= 0) return null
    const ratio = Math.max(0, value / reference)
    return RINGS.map((_, index) => Math.max(0, Math.min(1, ratio - index)))
  }
  // Inner rings only appear once they hold something; an empty one stays hidden.
  function ringVisible(index, fill) {
    return index === 0 || (fill !== null && fill > 0)
  }
  // Usage percentages are floored so the number and the ring agree, and 99.x% never looks like 100%.
  function usagePercent(row) {
    const value = Number(row.total)
    return Number.isFinite(value) ? Math.max(0, Math.min(100, Math.floor(value))) : 0
  }
  function usageFractions(wallets) {
    return wallets.map(row => usagePercent(row) / 100)
  }
  // Usage rings colour by remaining percentage, mirroring the balance thresholds.
  function usageHealth(remaining) {
    return remaining <= 0 ? '#ef6464' : remaining < 10 ? '#f2b84b' : '#67c58a'
  }
  function resetText(iso) {
    const date = new Date(iso)
    if (Number.isNaN(date.getTime())) return ''
    const sameDay = date.toDateString() === new Date().toDateString()
    return sameDay
      ? date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
      : date.toLocaleString(undefined, { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
  }
  function money(row) { return ({ CNY: '¥ ', USD: '$ ', CREDIT: '' }[row.currency] ?? row.currency + ' ') + formatAmount(row.total) + (row.currency === 'CREDIT' ? t('ring.creditUnit') : '') }
  function decorate(wallets) { return (Array.isArray(wallets) ? wallets : []).map(row => ({ currency: row.currency, total: String(row.balance) })).filter(row => row.total.trim() !== '' && Number.isFinite(Number(row.total))) }
  function clockText(at) { return new Date(at).toLocaleTimeString() }
  function createBalanceStore(ctx) {
      const IDLE = { state: 'idle' }
      let snapshot = { status: 'starting', attempt: null, remote: false, waiting: true, read: IDLE }
      let revision = 0
      let reading = null
      const listeners = new Set()
      /** When this store began looking for the account namespace. */
      const lookedAt = Date.now()
      /** How long "still looking" is reported as an attempt rather than an absence. */
      const REACHABLE_WINDOW_MS = 20_000

      const publish = (next) => {
        snapshot = next
        for (const listener of listeners) listener()
      }

      /** Update only the connection half of the snapshot. */
      const publishConnection = (patch) => {
        publish({ ...snapshot, ...patch })
      }

      /** Optional services must be resolved individually through Cordis's public lookup. */
      const accountServices = () => {
        const remote = ctx.get('remote')
        const api = ctx.get('remote.account')
        return typeof remote?.$stream === 'function'
          && typeof api?.getBalance === 'function'
          && typeof api?.watch === 'function'
          ? { remote, api }
          : null
      }

      const clientMetadata = () => ({
        version: '0.2.0-rc.2',
        locale: ctx.locale.getSnapshot().active,
        timezoneOffsetSeconds: -new Date().getTimezoneOffset() * 60,
      })

      /** Read the wallet summary once; concurrent callers share the in-flight read. */
      const read = () => {
        if (reading !== null) return reading
        if (snapshot.status !== 'credential-stored') return Promise.resolve()
        const services = accountServices()
        if (services === null) {
          publish({ ...snapshot, read: { state: 'failed', reason: 'no-account-service' } })
          return Promise.resolve()
        }
        const generation = revision
        const keeping = snapshot.read.state === 'ready' ? snapshot.read : { state: 'reading' }
        publish({ ...snapshot, read: keeping })
        const request = (async () => {
          const failed = (reason) => publish({ ...snapshot, read: snapshot.read.state === 'ready' ? { ...snapshot.read, stale: true, failure: reason } : { state: 'failed', reason } })
          try {
            const result = await services.api.getBalance(clientMetadata())
            if (generation !== revision) return
            if (result === null || typeof result !== 'object' || result.ok !== true) {
              failed('remote')
              return
            }
            const value = result.value ?? {}
            publish({
              ...snapshot,
              read: {
                state: 'ready',
                wallets: decorate(value.value),
                bonusWallets: decorate(value.bonusWallets),
                at: Date.now(),
              },
            })
          } catch {
            if (generation === revision) failed('threw')
          }
        })()
        reading = request
        const settle = () => { if (reading === request) reading = null }
        request.then(settle, settle)
        return request
      }

      /** Fold one account-state frame in and re-read whenever the credential can have changed. */
      const applyState = (view) => {
        const status = typeof view?.status === 'string' ? view.status : 'unknown'
        const previous = snapshot
        const signedInBefore = previous.status === 'credential-stored'
        const signedIn = status === 'credential-stored'
        if (!signedIn) { revision++; reading = null }
        publish({
          status,
          attempt: view?.attempt ?? null,
          remote: true,
          read: signedIn && signedInBefore ? previous.read : IDLE,
        })
        if (signedIn) void read()
      }

      /**
       * Own the account stream for this store's lifetime, waiting for the
       * namespace to appear and reconnecting if a stream instance ends.
       *
       * @returns disposer that stops the provider loop and the active stream.
       */
      const start = () => {
        let disposed = false
        let retryTimer = null
        let attempt = 0
        let everConnected = false
        let activeStream = null

        /** The retry cadence: quick while the page is still composing, then gentle. */
        const retryDelay = () => Math.min(500 * 2 ** Math.min(attempt, 5), 15_000)

        /** True while "no account API yet" should read as an attempt, not an absence. */
        const stillTrying = () => !everConnected && Date.now() - lookedAt < REACHABLE_WINDOW_MS

        const run = () => {
          if (disposed) return
          const services = accountServices()
          if (services === null) {
            publishConnection({ remote: false, waiting: stillTrying() })
            attempt += 1
            retryTimer = setTimeout(run, retryDelay())
            return
          }
          attempt = 0
          everConnected = true
          publishConnection({ remote: true, waiting: false })

          let stream = null
          const receive = async () => {
            try {
              for await (const frame of stream) {
                if (disposed) return
                applyState(frame.value)
                frame.accept()
              }
            } catch {
              /* the reconnect below owns the recovery */
            }
            if (activeStream === stream) activeStream = null
            if (disposed) return
            // The stream is over (or its opener threw). Wait, then take a fresh
            // one: a host-side reconnect must not leave a dead chip.
            publishConnection({ remote: false, waiting: true })
            if (retryTimer !== null) clearTimeout(retryTimer)
            retryTimer = setTimeout(run, retryDelay())
          }

          try {
            // The opener is invoked by the stream, so a throwing `watch()` lands
            // in `receive`'s catch instead of escaping the owning effect.
            stream = services.remote.$stream({
              name: NS,
              open: (signal) => services.api.watch(signal),
              ended: () => new Error('dsh-balance-chip: account stream ended'),
            })
            activeStream = stream
            void receive()
          } catch {
            publishConnection({ remote: false, waiting: true })
            retryTimer = setTimeout(run, retryDelay())
          }
        }

        run()

        // Safety net for a composition whose account stream stays silent.
        const poll = setInterval(() => {
          if (snapshot.status === 'credential-stored') void read()
        }, 60_000)

        return () => {
          disposed = true
          revision++
          clearInterval(poll)
          if (retryTimer !== null) clearTimeout(retryTimer)
          const stream = activeStream
          activeStream = null
          return stream?.dispose()
        }
      }

      return {
        subscribe(listener) {
          listeners.add(listener)
          return () => { listeners.delete(listener) }
        },
        getSnapshot() {
          return snapshot
        },
        start,
        reread: read,
      }
    }

  // Handwritten strict JSON codecs for the installed Harness 0.2 Typert factory contract.
function parseProvider(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/.test(value)) throw new TypeError('Invalid provider')
  return value
}
function parseView(value) {
  const states = ['ready', 'unsupported', 'unconfigured', 'permission', 'malformed', 'failed', 'timeout']
  if (!value || !states.includes(value.state) || !Number.isFinite(value.at) || !Array.isArray(value.wallets)) throw new TypeError('Invalid balance view')
  const wallets = value.wallets.map(row => {
    if (!row || typeof row.currency !== 'string' || !/^[A-Z]{3,12}$/.test(row.currency) || typeof row.total !== 'string' || row.total.trim() === '' || !Number.isFinite(Number(row.total))) throw new TypeError('Invalid wallet')
    const result = { currency: row.currency, total: row.total }
    for (const key of ['paid', 'bonus']) if (row[key] !== undefined) {
      if (typeof row[key] !== 'string' || row[key].trim() === '' || !Number.isFinite(Number(row[key]))) throw new TypeError('Invalid wallet breakdown')
      result[key] = row[key]
    }
    for (const key of ['label', 'resetAt']) if (row[key] !== undefined) {
      if (typeof row[key] !== 'string' || row[key].trim() === '') throw new TypeError('Invalid wallet label')
      result[key] = row[key]
    }
    return result
  })
  if (value.state === 'ready' && wallets.length === 0) throw new TypeError('Empty balance')
  const result = { state: value.state, wallets, at: value.at }
  if (value.kind !== undefined) {
    if (!['balance', 'key-limit', 'quota-units', 'usage-percent'].includes(value.kind)) throw new TypeError('Invalid balance kind')
    result.kind = value.kind
  }
  return result
}
function contribution() {
  return { package: 'dsh-balance-chip', descriptors: [{
    id: 'dsh-balance-chip#balanceRing/get', service: 'balanceRing', namespace: 'balanceRing', method: 'get',
    invocation: { kind: 'direct' },
    parameters: [{ name: 'provider', wire: 'provider', source: 'json', codec: { mode: 'strict', typeSymbol: 'dsh-balance-chip#Provider', create: () => ({ parse: parseProvider }) } }],
    result: { mode: 'strict', typeSymbol: 'dsh-balance-chip#View', create: () => ({ parse: parseView }), decode: parseView, encode: parseView },
  }] }
}

  /** Per-composer model subscription; a previous provider's reply never wins a model switch. */
  function createProviderStore(ctx, sessionId, account) {
    let snapshot = { provider: null, model: null, state: 'connecting', wallets: [], refreshing: false }
    let revision = 0, reading = null, selectionKey = null, unsubscribeDirectory = null, directory = null, stopAccount = null
    let disposed = false, retry = null, poll = null
    const listeners = new Set()
    const publish = next => { snapshot = next; for (const fn of listeners) fn() }
    const read = () => {
      if (disposed || !snapshot.provider) return Promise.resolve()
      if (reading) return reading
      if (snapshot.provider === 'deepseek-account') return account.getSnapshot().status === 'credential-stored' ? account.reread() : Promise.resolve()
      const api = ctx.get('remote.balanceRing')
      if (!api?.get) { publish({ ...snapshot, state: 'connecting' }); return Promise.resolve() }
      const generation = revision
      const provider = snapshot.provider
      publish({ ...snapshot, refreshing: true })
      const operation = (async () => {
        try {
          const result = await api.get(provider)
          if (disposed || generation !== revision) return
          const view = result?.ok === true ? parseView(result.value) : { state: 'failed', wallets: [], at: Date.now() }
          // Preserve only this provider's last successful value; label a failed refresh explicitly.
          publish(view.state !== 'ready' && snapshot.wallets.length ? { ...snapshot, refreshing: false, stale: true, failure: view.state } : { ...snapshot, ...view, refreshing: false, stale: false, failure: null })
        } catch {
          if (!disposed && generation === revision) publish({ ...snapshot, state: snapshot.wallets.length ? 'ready' : 'failed', stale: snapshot.wallets.length > 0, failure: 'failed', refreshing: false })
        }
      })()
      reading = operation
      operation.finally(() => { if (reading === operation) reading = null })
      return operation
    }
    const accountChanged = () => {
      if (disposed || snapshot.provider !== 'deepseek-account') return
      const current = account.getSnapshot()
      const readState = current.read
      const state = !current.remote ? current.waiting ? 'connecting' : 'unavailable' : current.status !== 'credential-stored' ? 'signed-out' : readState.state === 'ready' && readState.wallets.length ? 'ready' : readState.state === 'failed' || readState.state === 'ready' ? 'failed' : 'loading'
      const wallets = state === 'ready' ? readState.wallets.map(row => ({ ...row, paid: row.total, bonus: readState.bonusWallets.find(b => b.currency === row.currency)?.total ?? '0', total: String(Number(row.total) + Number(readState.bonusWallets.find(b => b.currency === row.currency)?.total ?? 0)) })) : []
      publish({ ...snapshot, state, wallets, kind: 'balance', at: readState.at, refreshing: false, stale: readState.stale === true, failure: readState.stale === true ? 'failed' : null })
    }
    function changed() {
      const current = directory.store.getSnapshot()
      const selected = current.current
      if (!selected?.provider || !selected?.model) return
      const key = JSON.stringify([selected.provider, selected.model])
      if (key === selectionKey) return
      selectionKey = key
      revision++
      reading = null
      stopAccount?.(); stopAccount = null
      publish({ provider: selected.provider, model: selected.model, state: 'loading', wallets: [], refreshing: false })
      if (selected.provider === 'deepseek-account') {
        stopAccount = account.subscribe(accountChanged)
        accountChanged()
        if (account.getSnapshot().status === 'credential-stored') void account.reread()
      } else void read()
    }
    function connect() {
      if (disposed) return
      if (snapshot.state === 'connecting' && ctx.get('remote.balanceRing')?.get) void read()
      const resolver = ctx.get('modelDirectories')
      if (!directory && resolver?.directoryFor) {
        try {
          directory = resolver.directoryFor(sessionId)
          unsubscribeDirectory = directory.store.subscribe(changed)
          changed()
          void directory.load().catch(() => {})
        } catch { directory = null }
      }
      retry = setTimeout(connect, directory && ctx.get('remote.balanceRing') ? 15000 : 1000)
    }
    return {
      subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn) },
      getSnapshot: () => snapshot,
      reread: read,
      start() {
        disposed = false
        connect()
        poll = setInterval(() => { if (typeof document === 'undefined' || !document.hidden) void read() }, 60000)
        return () => { disposed = true; revision++; clearTimeout(retry); clearInterval(poll); unsubscribeDirectory?.(); stopAccount?.(); unsubscribeDirectory = null; stopAccount = null; directory = null; selectionKey = null; reading = null }
      },
    }
  }
  const statusText = state => ({ connecting: t('ring.status.connecting'), loading: t('ring.status.loading'), unsupported: t('ring.status.unsupported'), unconfigured: t('ring.status.unconfigured'), permission: t('ring.status.permission'), malformed: t('ring.status.malformed'), failed: t('ring.status.failed'), timeout: t('ring.status.timeout'), unavailable: t('ring.status.unavailable'), 'signed-out': t('ring.status.signedOut') }[state] ?? t('ring.status.default'))
  // Same geometry as the DSH settings icon, inlined so the panel never depends on the icon export.
  function GearIcon({ size = 14 }) {
    return jsxs('svg', { width: size, height: size, viewBox: '0 0 14 14', fill: 'none', 'aria-hidden': true, children: [
      h('path', { d: 'M12.1192 4.91016C11.9392 4.52714 11.7007 4.1292 11.4483 3.78809C11.385 3.70258 11.3517 3.68409 11.2462 3.67383C10.7419 3.6248 10.2318 3.69454 9.72662 3.64551C9.29108 3.60318 8.93739 3.40341 8.67682 3.05176C8.38762 2.66127 8.19217 2.20926 7.90338 1.81934C7.83985 1.73359 7.80848 1.71542 7.70221 1.70508C7.24758 1.6609 6.7511 1.66104 6.29791 1.70508C6.19164 1.71542 6.16027 1.73359 6.09674 1.81934C5.80775 2.20954 5.61248 2.66131 5.3233 3.05176C5.06273 3.40341 4.70904 3.60318 4.2735 3.64551C3.76831 3.69454 3.25825 3.6248 2.75397 3.67383C2.6484 3.68409 2.61509 3.70258 2.55182 3.78809C2.30019 4.12814 2.06125 4.52646 1.88092 4.91016C1.83256 5.01309 1.83242 5.04912 1.88092 5.15235C2.07954 5.57482 2.37449 5.94529 2.5733 6.36817C2.76971 6.78606 2.76964 7.21293 2.5733 7.63086C2.37462 8.05374 2.07947 8.42453 1.88092 8.84668C1.83235 8.95004 1.83257 8.98695 1.88092 9.08985C2.06098 9.47285 2.2994 9.87079 2.55182 10.2119C2.61509 10.2974 2.6484 10.3159 2.75397 10.3262C3.25879 10.3753 3.76834 10.3055 4.2735 10.3545C4.70904 10.3968 5.06273 10.5966 5.3233 10.9482C5.6125 11.3387 5.80795 11.7907 6.09674 12.1807C6.16027 12.2664 6.19164 12.2846 6.29791 12.2949C6.7511 12.339 7.24758 12.3391 7.70221 12.2949C7.80848 12.2846 7.83985 12.2664 7.90338 12.1807C8.19237 11.7905 8.38764 11.3387 8.67682 10.9482C8.93739 10.5966 9.29108 10.3968 9.72662 10.3545C10.2318 10.3055 10.7419 10.3752 11.2462 10.3262C11.3517 10.3159 11.385 10.2974 11.4483 10.2119C11.7007 9.87079 11.9391 9.47285 12.1192 9.08985C12.1675 8.98695 12.1678 8.95004 12.1192 8.84668C11.9205 8.42428 11.6255 8.05377 11.4268 7.63086C11.2305 7.21293 11.2304 6.78606 11.4268 6.36817C11.6256 5.94531 11.9207 5.5746 12.1192 5.15235C12.1677 5.04912 12.1676 5.01309 12.1192 4.91016ZM13.2051 5.66309C13.0064 6.08573 12.7114 6.45579 12.5128 6.87793C12.4642 6.98123 12.4645 7.01829 12.5128 7.1211C12.7112 7.54328 13.0064 7.91405 13.2051 8.33692C13.4015 8.75487 13.4015 9.18169 13.2051 9.59961C12.9911 10.0551 12.7109 10.5221 12.4122 10.9258C12.1522 11.277 11.7974 11.4782 11.3624 11.5205C10.8573 11.5696 10.3477 11.4999 9.84283 11.5488C9.73621 11.5592 9.70429 11.5772 9.64069 11.6631C9.35229 12.0526 9.15705 12.5044 8.86823 12.8945C8.60854 13.2452 8.25275 13.447 7.81842 13.4893C7.28749 13.5409 6.71096 13.5407 6.1817 13.4893C5.74737 13.447 5.39158 13.2452 5.1319 12.8945C4.84312 12.5045 4.64808 12.0529 4.35944 11.6631C4.29583 11.5772 4.26392 11.5592 4.15729 11.5488C3.65283 11.5 3.14295 11.5696 2.63776 11.5205C2.20274 11.4782 1.84796 11.277 1.58795 10.9258C1.28834 10.5209 1.00864 10.0543 0.794982 9.59961C0.598644 9.18169 0.598598 8.75487 0.794982 8.33692C0.993688 7.91405 1.28889 7.54328 1.48737 7.1211C1.53567 7.01829 1.53593 6.98123 1.48737 6.87793C1.28887 6.45603 0.993667 6.08569 0.794982 5.66309C0.598535 5.24516 0.59869 4.81829 0.794982 4.40039C1.00898 3.94492 1.28922 3.47791 1.58795 3.07422C1.84796 2.723 2.20274 2.5218 2.63776 2.47949C3.14295 2.43038 3.65283 2.50003 4.15729 2.45117C4.26391 2.44081 4.29583 2.4228 4.35944 2.33692C4.64783 1.94742 4.84308 1.49557 5.1319 1.10547C5.39158 0.754835 5.74737 0.553005 6.1817 0.510744C6.71263 0.459147 7.28917 0.459309 7.81842 0.510744C8.25275 0.553005 8.60854 0.754835 8.86823 1.10547C9.157 1.49551 9.35204 1.94708 9.64069 2.33692C9.70429 2.4228 9.73621 2.44081 9.84283 2.45117C10.3477 2.50007 10.8573 2.43039 11.3624 2.47949C11.7974 2.5218 12.1522 2.723 12.4122 3.07422C12.7118 3.47909 12.9915 3.94567 13.2051 4.40039C13.4014 4.81829 13.4016 5.24516 13.2051 5.66309Z', fill: 'currentColor' }),
      h('path', { d: 'M7.9317 7C7.9317 6.48569 7.51438 6.06836 7.00006 6.06836C6.48575 6.06836 6.06842 6.48569 6.06842 7C6.06842 7.51432 6.48575 7.93164 7.00006 7.93164C7.51438 7.93164 7.9317 7.51432 7.9317 7ZM9.13092 7C9.13092 8.17706 8.17712 9.13086 7.00006 9.13086C5.823 9.13086 4.8692 8.17706 4.8692 7C4.8692 5.82294 5.823 4.86914 7.00006 4.86914C8.17712 4.86914 9.13092 5.82294 9.13092 7Z', fill: 'currentColor' }),
    ] })
  }
  function BalanceRing({ store }) {
    const snapshot = react.useSyncExternalStore(store.subscribe, store.getSnapshot)
    const [open, setOpen] = react.useState(false)
    const rootRef = react.useRef(null)
    const panelRef = react.useRef(null)
    const [position, setPosition] = react.useState(null)
    react.useLayoutEffect(() => {
      if (!open || typeof window === 'undefined') return
      const place = () => {
        const rect = rootRef.current?.getBoundingClientRect()
        if (!rect) return
        const width = Math.min(280, window.innerWidth - 32)
        const height = panelRef.current?.offsetHeight ?? 240
        setPosition({ position: 'fixed', bottom: 'auto', right: 'auto', left: Math.max(16, Math.min(rect.right - width, window.innerWidth - width - 16)), top: Math.max(16, Math.min(rect.top - height - 9, window.innerHeight - height - 16)), maxHeight: window.innerHeight - 32, overflowY: 'auto' })
      }
      place()
      window.addEventListener('resize', place)
      window.addEventListener('scroll', place, true)
      const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(place)
      if (panelRef.current) observer?.observe(panelRef.current)
      return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true); observer?.disconnect() }
    }, [open])
    react.useEffect(() => {
      if (!open || typeof document === 'undefined') return
      const outside = event => { if (!rootRef.current?.contains(event.target) && !panelRef.current?.contains(event.target)) setOpen(false) }
      const escape = event => { if (event.key === 'Escape') { setOpen(false); rootRef.current?.querySelector('button')?.focus() } }
      document.addEventListener('pointerdown', outside)
      document.addEventListener('keydown', escape)
      return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape) }
    }, [open])
    const [showConfig, setShowConfig] = react.useState(false)
    const [config, setConfig] = react.useState(null)
    react.useEffect(() => {
      let alive = true
      fetch(CONFIG_PATH).then(response => response.json()).then(body => { if (alive && body?.ok) setConfig(body.config) }).catch(() => {})
      return () => { alive = false }
    }, [])
    const cnyInput = react.useRef(null)
    const usdInput = react.useRef(null)
    react.useEffect(() => {
      if (!showConfig || !config) return
      if (cnyInput.current) cnyInput.current.value = String(config.referenceCny)
      if (usdInput.current) usdInput.current.value = String(config.referenceUsd)
    }, [showConfig, config])
    const primary = snapshot.wallets[0]
    // Usage rings, outer to inner: rolling (shortest), weekly, monthly (longest).
    const usageMode = snapshot.kind === 'usage-percent'
    const usageWallets = usageMode ? snapshot.wallets.slice(0, RINGS.length) : []
    const amount = primary ? money(primary) : statusText(snapshot.state)
    // Monetary reference is a display scale, not a claim about the account's maximum.
    const reference = primary && !usageMode ? referenceOf(config, primary.currency) : null
    const value = primary ? Number(primary.total) : null
    const fractions = usageMode
      ? usageFractions(usageWallets)
      : reference === null || value === null ? null : ringFractions(value, reference)
    const percent = reference === null || value === null ? null : Math.round(Math.max(0, value / reference) * 100)
    const color = snapshot.stale || !primary || reference === null ? 'var(--dsw-alias-label-tertiary,#999)' : value <= 0 ? '#ef6464' : reference && value < reference / 10 ? '#f2b84b' : '#67c58a'
    // A stale ring keeps its last good colours; only the labels say the value is old.
    const usageColor = row => usageHealth(usagePercent(row))
    const title = usageMode ? t('ring.title.go') : snapshot.kind === 'key-limit' ? t('ring.title.keyLimit') : snapshot.kind === 'quota-units' ? t('ring.title.quotaUnits') : t('ring.title.balance')
    const label = usageMode
      ? (snapshot.provider ?? t('ring.provider.current')) + ' · ' + title + ' · ' + usageWallets.map(row => (row.label ?? '') + ' ' + usagePercent(row) + '%').join(' · ') + (snapshot.stale ? t('ring.stale') : '')
      : (snapshot.provider ?? t('ring.provider.current')) + ' · ' + title + ' · ' + amount + (percent === null ? '' : ' · ' + percent + '%') + (snapshot.stale ? t('ring.stale') : '')
    const [saveState, setSaveState] = react.useState(null)
    const readAmount = (input, key) => {
      const raw = input?.value?.trim() ?? ''
      const value = Number(raw)
      return raw !== '' && Number.isFinite(value) && value > 0 ? value : REFERENCE_DEFAULTS[key]
    }
    const saveReference = () => {
      const next = { referenceCny: readAmount(cnyInput.current, 'referenceCny'), referenceUsd: readAmount(usdInput.current, 'referenceUsd') }
      setSaveState('saving')
      fetch(CONFIG_PATH, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(next) })
        .then(response => response.json())
        .then(body => { if (body?.ok) { setConfig(body.config); setSaveState('saved') } else setSaveState('failed') })
        .catch(() => setSaveState('failed'))
    }
    const resetReference = () => {
      if (cnyInput.current) cnyInput.current.value = String(REFERENCE_DEFAULTS.referenceCny)
      if (usdInput.current) usdInput.current.value = String(REFERENCE_DEFAULTS.referenceUsd)
      saveReference()
    }
    const toggleConfig = () => {
      if (!showConfig && !config) {
        fetch(CONFIG_PATH).then(response => response.json()).then(body => { if (body?.ok) setConfig(body.config) }).catch(() => {})
      }
      setShowConfig(previous => !previous)
    }
    const trigger = h('button', {
      type: 'button', className: 'dbc_trigger', 'aria-label': label, 'aria-haspopup': 'dialog', 'aria-expanded': open,
      onClick: () => { setOpen(previous => !previous); if (!open) void store.reread() },
      children: jsxs('svg', { className: 'dbc_ring', viewBox: '0 0 20 20', 'aria-hidden': true, children: RINGS.flatMap((radius, index) => {
        const circumference = 2 * Math.PI * radius
        const fill = fractions === null ? null : fractions[index]
        // Usage mode draws one ring per window; balance mode hides rings that hold nothing.
        const visible = usageMode ? index < usageWallets.length : ringVisible(index, fill)
        if (!visible) return []
        const stroke = usageMode ? usageColor(usageWallets[index]) : color
        return [
          h('circle', { key: 'track-' + index, className: 'dbc_track', cx: 10, cy: 10, r: radius, fill: 'none', strokeWidth: 1.6 }),
          h('circle', { key: 'fill-' + index, className: 'dbc_fill', cx: 10, cy: 10, r: radius, fill: 'none', strokeWidth: 1.6, stroke, strokeOpacity: usageMode ? 1 : RING_OPACITY[index], strokeLinecap: 'round', strokeDasharray: fill === null ? '1 4' : circumference, strokeDashoffset: fill === null ? 0 : circumference * (1 - fill) }),
        ]
      }) }),
    })
    const rows = []
    if (usageMode) {
      for (const row of usageWallets) rows.push(jsxs('div', { className: 'dbc_row', children: [h('span', { children: t('ring.windowLeft', { label: row.label ?? t('ring.window') }) }), h('span', { children: usagePercent(row) + '%' + (row.resetAt ? t('ring.resetAt', { time: resetText(row.resetAt) }) : '') })] }, 'usage-' + (row.label ?? row.currency)))
    } else {
      for (const row of snapshot.wallets) {
        rows.push(h('div', { className: 'dbc_amount', children: money(row) }, row.currency + '-total'))
        for (const key of ['paid', 'bonus']) if (row[key] !== undefined) rows.push(jsxs('div', { className: 'dbc_row', children: [h('span', { children: key === 'paid' ? t('ring.paid') : t('ring.bonus') }), h('span', { children: money({ ...row, total: row[key] }) })] }, row.currency + '-' + key))
      }
    }
    return jsxs('div', { className: 'dbc_root', ref: rootRef, children: [
      h(Tooltip, { label: h('div', { className: 'dbc_tip', children: label }), side: 'top', align: 'end', portal: true, disabled: open, delayMs: 200, children: trigger }),
      open && createPortal(jsxs('div', { className: 'dbc_panel', style: position ?? { visibility: 'hidden', position: 'fixed' }, ref: panelRef, role: 'dialog', 'aria-label': title, children: [
        jsxs('div', { className: 'dbc_heading', children: [
          h('span', { children: title }),
          jsxs('div', { className: 'dbc_actions', children: [
            !usageMode && h('button', { className: 'dbc_gear', type: 'button', 'aria-expanded': showConfig, 'aria-label': t('ring.reference'), title: t('ring.reference'), onClick: toggleConfig, children: h(GearIcon, { size: 14 }) }),
            h('button', { className: 'dbc_refresh', type: 'button', disabled: snapshot.refreshing, onClick: () => { void store.reread() }, children: snapshot.refreshing ? t('ring.refreshing') : t('ring.refresh') }),
          ] }),
        ] }),
        h('div', { className: 'dbc_provider', children: (snapshot.provider ?? t('ring.provider.reading')) + (snapshot.model ? ' / ' + snapshot.model : '') }),
        ...rows,
        !primary && h('div', { className: 'dbc_status', children: statusText(snapshot.state) }),
        snapshot.stale && h('div', { className: 'dbc_status', children: t('ring.showingLast', { status: statusText(snapshot.failure) }) }),
        h('div', { className: 'dbc_foot', children: (snapshot.at ? t('ring.updated', { time: clockText(snapshot.at) }) + ' · ' : '') + t('ring.autoRefresh') }),
        !usageMode && showConfig && jsxs('div', { className: 'dbc_cfg', children: [
          jsxs('div', { className: 'dbc_row', children: [h('span', { children: t('ring.referenceCny') }), h('input', { className: 'dbc_input', type: 'number', min: '0', step: 'any', ref: cnyInput, defaultValue: String(REFERENCE_DEFAULTS.referenceCny) })] }),
          jsxs('div', { className: 'dbc_row', children: [h('span', { children: t('ring.referenceUsd') }), h('input', { className: 'dbc_input', type: 'number', min: '0', step: 'any', ref: usdInput, defaultValue: String(REFERENCE_DEFAULTS.referenceUsd) })] }),
          jsxs('div', { className: 'dbc_cfgbtns', children: [
            h('span', { className: 'dbc_status', children: saveState === 'saving' ? t('ring.saving') : saveState === 'saved' ? t('ring.saved') : saveState === 'failed' ? t('ring.saveFailed') : '' }),
            h('button', { className: 'dbc_btn', type: 'button', onClick: resetReference, children: t('reset') }),
            h('button', { className: 'dbc_btn', type: 'button', onClick: saveReference, children: t('ring.save') }),
          ] }),
        ] }),
        usageMode && h('div', { className: 'dbc_foot', children: t('ring.usageSource') }),
        !usageMode && reference !== null && h('div', { className: 'dbc_foot', children: t('ring.referenceFoot', { unit: primary.currency === 'CNY' ? '¥ ' : '$ ', per: String(Number(reference.toFixed(2))), total: String(Number((reference * RINGS.length).toFixed(2))), rings: RINGS.length }) }),
      ] }), document.body),
    ] })
  }
  return {
    name: NS, inject: ['slots', 'locale'], createProviderStore, createBalanceStore, formatAmount,
    apply(ctx) {
      ctx.effect(styles, 'balance-ring: styles')
      // Mount one namespace for the plugin, shared by all composers.
      ctx.inject(['remote'], async scope => { await scope.get('remote').$mount(contribution()) })
      const account = createBalanceStore(ctx)
      ctx.effect(() => account.start(), 'balance-ring: account')
      ctx.slots.inject('conversation.input.right', () => ctx.slots.register({
        name: 'conversation.input.right', id: NS, order: 10,
        inject(sessionId) {
          return { context: ctx, sessionId, account }
        },
      }, function MountedRing({ context, sessionId, account }) {
      if (typeof isEnabled === 'function' && !isEnabled()) return null
        // Slot props may be recomputed on UI updates. The mounted component owns one stable store.
        const store = react.useMemo(() => createProviderStore(context, sessionId, account), [context, sessionId, account])
        react.useEffect(() => store.start(), [store])
        return h(BalanceRing, { store })
      }))
    },
  }
    }

    function apply(ctx) {
      load()
      t = ctx.locale.bind(LOCALE_NS)
      ctx.effect(() => ctx.locale.register(LOCALE_NS, DICT), 'nevstop-lab-flavor: locale dictionaries')
      ctx.effect(
        () => {
          window.addEventListener('keydown', onKeyDown, true)
          return () => window.removeEventListener('keydown', onKeyDown, true)
        },
        'nevstop-lab-flavor: composer key capture',
      )
      ctx.effect(() => watchPlaceholders(), 'nevstop-lab-flavor: placeholder hint')
      ctx.effect(() => watchSidebarPanels(), 'nevstop-lab-flavor: sidebar panel icons')
      ctx.effect(() => watchSendButton(), 'nevstop-lab-flavor: composer send button')
      // 新会话默认模型依赖会话列表与 remote.session；服务不在时静默跳过。
      runtime = { remote: ctx.get('remote') }
      ctx.inject(['sessions', 'remote'], (scope) => {
        runtime = { remote: scope.get('remote') }
        scope.effect(
          () => watchDefaultModel({ sessions: scope.get('sessions'), remote: scope.get('remote') }),
          'nevstop-lab-flavor: new-session default model',
        )
      })
      // 活跃会话区依赖侧栏的会话与工作区服务；服务不在时不注册，插件其余功能照常工作。
      ctx.inject(['sessions', 'workspaces', 'uiWorkspace'], (scope) => {
        const activeServices = {
          sessions: scope.get('sessions'),
          workspaces: scope.get('workspaces'),
          uiWorkspace: scope.get('uiWorkspace'),
          getMenus: () => ctx.get('contextMenus'),
        }
        scope.effect(() => watchActiveSessions(activeServices), 'nevstop-lab-flavor: active sessions')
      })
      // 常驻无渲染组件：借槽位标准属性读取内置 sessionStatus，供活跃行写出 busy-workspace 契约。
      ctx.slots.inject?.('shell.overlay', () =>
        ctx.slots.register(
          { name: 'shell.overlay', id: 'nevstop-lab-flavor.session-status' },
          ActiveStatusSource,
        ),
      )
      // slot 里的文案随 locale 版本自动重渲染；这里把直接改 DOM 的两处也跟着刷新。
      // 语言切换时 React 可能尚未提交新文案，下一帧再同步一次，避免标题/占位提示停在旧语言。
      ctx.effect(
        () => {
          syncPlaceholders()
          syncSidebarPanels()
          return ctx.locale.subscribe(() => {
            const refresh = () => {
              syncPlaceholders()
              syncSidebarPanels()
              active.signature = ''
              syncActiveSessions()
            }
            refresh()
            requestAnimationFrame(refresh)
          })
        },
        'nevstop-lab-flavor: locale switch refresh',
      )
      const balanceChip = balanceChipPlugin(require, () => cfg.features.balanceChip)
      balanceChip.apply(ctx)
      ctx.slots.inject?.('conversation.input.model.label', () =>
        ctx.slots.register({ name: 'conversation.input.model.label', priority: 0 }, ProviderModelLabel),
      )
      ctx.slots.inject?.('settings.section', () =>
        ctx.slots.register(
          { name: 'settings.section', id: 'nevstop-lab-flavor', order: 28, label: () => 'NEVSTOP-LAB' },
          SettingsSectionSafe,
        ),
      )
    }

    return { inject: ['slots', 'locale'], apply }
  },
})

