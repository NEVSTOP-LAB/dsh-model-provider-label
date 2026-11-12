/**
 * Client 半边：注册官方 `conversation.input.model.label` 槽位，
 * 在输入区模型按钮（trigger）与菜单当前值（menu）里渲染「供应商 · 模型」，
 * 菜单里的每个选项（option）保持只显示模型名——那里的分组标题已经说明供应商。
 *
 * 槽位契约由 @deepseek-ai/dsh-client-ui-model-selection 提供：
 * props 含 `provider: { id, name }`、`model`、`placement`、`selected`；
 * 贡献只渲染非交互内联内容，点击与搜索仍归官方选择器所有。
 */
window.__ModuleLoader__.load({
  id: 'dsh-model-provider-label',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    const SEPARATOR = ' · '

    const providerText = (provider) => {
      if (!provider) return ''
      const name = typeof provider.name === 'string' ? provider.name.trim() : ''
      if (name) return name
      return typeof provider.id === 'string' ? provider.id.trim() : ''
    }

    const modelText = (model) => {
      if (!model) return ''
      const name = typeof model.name === 'string' ? model.name.trim() : ''
      if (name) return name
      return typeof model.id === 'string' ? model.id.trim() : ''
    }

    const muted = { opacity: 0.62, fontWeight: 400 }

    function ProviderModelLabel(props) {
      const placement = props && props.placement
      const model = modelText(props && props.model)
      const provider = providerText(props && props.provider)

      if (!provider || placement === 'option') {
        return h('span', { className: 'dsmpl-model' }, model)
      }

      return h(
        'span',
        { className: 'dsmpl-root', 'data-placement': placement || '' },
        h('span', { className: 'dsmpl-provider', style: muted }, provider),
        h('span', { className: 'dsmpl-sep', style: muted, 'aria-hidden': 'true' }, SEPARATOR),
        h('span', { className: 'dsmpl-model' }, model),
      )
    }

    const inject = ['slots']

    function apply(ctx) {
      ctx.slots.inject?.('conversation.input.model.label', () =>
        ctx.slots.register(
          { name: 'conversation.input.model.label', priority: 0 },
          ProviderModelLabel,
        ),
      )
    }

    return { inject, apply }
  },
})
