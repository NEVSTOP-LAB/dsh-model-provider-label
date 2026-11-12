# dsh-model-provider-label

在输入区模型按钮与模型菜单里显示「供应商 · 模型」，用于区分同名模型的不同提供方（例如 `DeepSeek · flash` 与 `opencode-go · flash`）。

## 行为

- 输入区模型按钮（`placement: trigger`）：`供应商 · 模型`；
- 模型菜单的当前值（`placement: menu`）：`供应商 · 模型`；
- 菜单里的每个选项（`placement: option`）：只显示模型名，供应商由分组标题表达。

供应商名取宿主提供的本地化显示名，缺失时退回路由 id（如 `opencode-go`）。

## 实现约束

只注册官方 `conversation.input.model.label` 槽位，渲染非交互内联内容：

- 不遮蔽 `conversation.input.model` 座位；
- 不依赖 `modelDirectories.directoryFor` 等内部接口；
- 点击、搜索、勾选状态与推理强度仍由官方选择器负责；
- 槽位不存在时用可选链跳过，不报错。

## 安装

```powershell
dsh plugin --profile desktop add github:NEVSTOP-LAB/dsh-model-provider-label
```

安装后刷新 Web 页面。

## 兼容

DSH `>=0.2.1-rc.0 <0.3.0-0`，在 `0.2.2-rc.1` 验证。

## License

MIT
