/**
 * Client 半边：NEVSTOP-LAB 的 DSH 定制口味。
 *
 * 功能列表（设置页可逐项开关）：
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
    const KEY_BEHAVIORS = ['newline', 'send']

    const DEFAULTS = {
      features: { providerLabel: true, composerKeys: true },
      composerKeys: { enter: 'newline', ctrlEnter: 'send', shiftEnter: 'newline' },
    }

    function normalize(raw) {
      const src = raw !== null && typeof raw === 'object' ? raw : {}
      const features = src.features !== null && typeof src.features === 'object' ? src.features : {}
      const keys = src.composerKeys !== null && typeof src.composerKeys === 'object' ? src.composerKeys : {}
      const pick = (value, fallback) => (KEY_BEHAVIORS.includes(value) ? value : fallback)
      return {
        features: {
          providerLabel: typeof features.providerLabel === 'boolean' ? features.providerLabel : DEFAULTS.features.providerLabel,
          composerKeys: typeof features.composerKeys === 'boolean' ? features.composerKeys : DEFAULTS.features.composerKeys,
        },
        composerKeys: {
          enter: pick(keys.enter, DEFAULTS.composerKeys.enter),
          ctrlEnter: pick(keys.ctrlEnter, DEFAULTS.composerKeys.ctrlEnter),
          shiftEnter: pick(keys.shiftEnter, DEFAULTS.composerKeys.shiftEnter),
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
        if (event.altKey) return
        if (event.shiftKey && (event.ctrlKey || event.metaKey)) return
        if (event.ctrlKey && event.metaKey) return

        const card = input.closest('[data-composer-card]')
        const scope = card !== null ? card : document
        if (scope.querySelector('[data-trigger-menu], [data-composer-overlay] [role="listbox"]') !== null) return

        try {
          Object.defineProperty(event, HANDLED, { value: true })
        } catch {
          // 标记失败不影响判断。
        }

        const accelerated = event.ctrlKey || event.metaKey
        const behavior = accelerated
          ? cfg.composerKeys.ctrlEnter
          : event.shiftKey
            ? cfg.composerKeys.shiftEnter
            : cfg.composerKeys.enter

        if (behavior === 'newline') {
          rewrite(event, input, { shiftKey: true, ctrlKey: false, metaKey: false })
          return
        }
        rewrite(event, input, { shiftKey: false, ctrlKey: false, metaKey: false })
      } catch (error) {
        console.error('[nevstop-lab-flavor] enter handling failed', error)
      }
    }

    // ---------- settings section ----------

    const sectionStyle = { display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: '720px' }
    const rowStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', minHeight: '32px' }
    const titleStyle = { margin: 0, fontSize: '16px', fontWeight: 500 }
    const noteStyle = { margin: 0, fontSize: '13px', opacity: 0.7 }
    const indent = { display: 'flex', flexDirection: 'column', gap: '10px', paddingLeft: '22px' }
    const selectStyle = { minWidth: '120px', padding: '4px 8px', color: 'inherit', background: 'transparent' }

    function FeatureRow(props) {
      return h(
        'label',
        { style: rowStyle },
        h(
          'span',
          { style: { display: 'flex', flexDirection: 'column', gap: '2px' } },
          h('span', null, props.title),
          props.hint ? h('span', { style: noteStyle }, props.hint) : null,
        ),
        h('input', {
          type: 'checkbox',
          checked: props.checked,
          onChange: (event) => props.onChange(event.target.checked),
        }),
      )
    }

    function KeyRow(props) {
      return h(
        'label',
        { style: rowStyle },
        h('span', null, props.title),
        h(
          'select',
          {
            style: selectStyle,
            value: props.value,
            disabled: props.disabled,
            onChange: (event) => props.onChange(event.target.value),
          },
          h('option', { value: 'newline' }, '换行'),
          h('option', { value: 'send' }, '发送'),
        ),
      )
    }

    function SettingsSection() {
      const config = useConfig()
      const setFeature = (key, value) => save({ ...config, features: { ...config.features, [key]: value } })
      const setKey = (key, value) => save({ ...config, composerKeys: { ...config.composerKeys, [key]: value } })
      const keysDisabled = !config.features.composerKeys
      return h(
        'section',
        { style: sectionStyle },
        h('h3', { style: titleStyle }, 'NEVSTOP-LAB 定制'),
        h('p', { style: noteStyle }, 'NEVSTOP-LAB 对 DSH 的本地化微调，逐项开关；修改即时生效并持久化到插件自己的配置文件。'),
        h(FeatureRow, {
          title: '模型供应商前缀',
          hint: '输入区模型按钮与菜单当前值显示「供应商 · 模型」',
          checked: config.features.providerLabel,
          onChange: (value) => setFeature('providerLabel', value),
        }),
        h(FeatureRow, {
          title: '编写器键位',
          hint: 'Enter 换行、Ctrl/Cmd+Enter 发送；菜单、输入法组词与 Alt 组合一律放行',
          checked: config.features.composerKeys,
          onChange: (value) => setFeature('composerKeys', value),
        }),
        h(
          'div',
          { style: indent },
          h(KeyRow, { title: 'Enter', value: config.composerKeys.enter, disabled: keysDisabled, onChange: (value) => setKey('enter', value) }),
          h(KeyRow, { title: 'Ctrl / Cmd + Enter', value: config.composerKeys.ctrlEnter, disabled: keysDisabled, onChange: (value) => setKey('ctrlEnter', value) }),
          h(KeyRow, { title: 'Shift + Enter', value: config.composerKeys.shiftEnter, disabled: keysDisabled, onChange: (value) => setKey('shiftEnter', value) }),
        ),
      )
    }

    function apply(ctx) {
      load()
      ctx.effect(
        () => {
          window.addEventListener('keydown', onKeyDown, true)
          return () => window.removeEventListener('keydown', onKeyDown, true)
        },
        'nevstop-lab-flavor: composer key capture',
      )
      ctx.slots.inject?.('conversation.input.model.label', () =>
        ctx.slots.register({ name: 'conversation.input.model.label', priority: 0 }, ProviderModelLabel),
      )
      ctx.slots.inject?.('settings.section', () =>
        ctx.slots.register(
          { name: 'settings.section', id: 'nevstop-lab-flavor', order: 28, label: () => 'NEVSTOP-LAB 定制' },
          SettingsSection,
        ),
      )
    }

    return { inject: ['slots'], apply }
  },
})
