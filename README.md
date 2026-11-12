# dsh-nevstop-lab-flavor

NEVSTOP-LAB 的 DSH 定制口味：把所有「本地化微调」收在一个插件里，设置页逐项开关，配置持久化到插件自己的 JSON。

## 功能列表

| 功能 | 默认 | 说明 |
|---|---|---|
| 模型供应商前缀 | 开 | 输入区模型按钮与模型菜单当前值显示「供应商 · 模型」（如 `DeepSeek · flash`、`opencode-go · flash`），菜单选项保持模型名；只注册官方 `conversation.input.model.label` 槽位，不遮蔽模型座位 |
| 编写器键位 | 开 | Enter / Ctrl+Cmd+Enter / Shift+Enter 三行各选「换行 / 排队发送 / 插话发送」；排队与插话按内置投递语义执行，`/` 与 `@` 菜单、输入法组词、Alt 组合、Ctrl+Shift 一律放行 |

后续需求继续加在「功能列表」里；每项都在设置页有独立开关，关掉即恢复 DSH 原生行为。

## 安装

```powershell
dsh plugin --profile desktop add github:NEVSTOP-LAB/dsh-nevstop-lab-flavor
```

安装后刷新 Web 页面。设置入口：**设置 → NEVSTOP-LAB 定制**。

## 配置

- 路由：`GET/POST /__dsh-nevstop-lab-flavor/config`（写入要求同源请求）；
- 文件：`%USERPROFILE%\.dsh\plugin-data\dsh-nevstop-lab-flavor\config.json`；
- 结构：

```json
{
  "features": { "providerLabel": true, "composerKeys": true },
  "composerKeys": { "enter": "newline", "ctrlEnter": "queue", "shiftEnter": "newline" }
}
```

- 校验是总量式的：缺字段或手改坏值都回落到默认值，不会因配置把插件带崩。

## 实现约束

- 供应商前缀只注册官方 `conversation.input.model.label` 槽位，不遮蔽 `conversation.input.model` 座位、不依赖 `modelDirectories`；
- 键位在 `window` 捕获阶段改写 `keydown` 的修饰键，让内置键盘映射走自己的分支，不改编辑器内容；DOM 标记任一缺失即回退内置行为，最坏是「不生效」而不是误发送；
- 宿主半侧只为配置路由与持久化存在，配置读写失败时客户端沿用默认值。

## 兼容

DSH `>=0.2.1-rc.0 <0.3.0-0`，在 `0.2.2-rc.1` 验证。

## License

MIT
