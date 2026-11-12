# dsh-nevstop-lab-flavor

NEVSTOP-LAB 的 DSH 定制口味：把所有「本地化微调」收在一个插件里。

- 功能列表写在设置页，逐项开关；**关闭某项后该功能的配置区整块收起**；
- 配置持久化到插件自己的 JSON，改完即时生效；
- 每个功能都可单独开、单独关，关掉即恢复 DSH 原生行为。

## 功能列表

| 功能 | 默认 | 说明 |
|---|---|---|
| 模型供应商前缀 | 开 | 输入区模型按钮与模型菜单当前值显示「供应商 · 模型」（如 `DeepSeek · flash`、`opencode-go · flash`），菜单选项保持模型名；只注册官方 `conversation.input.model.label` 槽位，不遮蔽模型座位 |
| 编写器键位 | 开 | Enter / Ctrl+Cmd+Enter / Shift+Enter 三行各选「换行 / 排队发送 / 插话发送」；`/` 与 `@` 菜单、输入法组词、Alt 组合、Ctrl+Shift 一律放行 |

后续需求继续加在「功能列表」里。

## 设置页

入口：**设置 → NEVSTOP-LAB**。每个功能一张卡片，卡片右侧是开关：

- 开启：展开该功能的配置（如键位三行选项）；
- 关闭：配置区收起，只保留标题与开关；
- 底部「恢复默认」一次性还原所有功能与键位。

样式使用 DSH 主题变量（`--dsw-alias-*`），跟随亮/暗色主题。

## 键位语义

| 选项 | 行为 |
|---|---|
| 换行 | 改写 `shiftKey`，由内置换行分支插入换行 |
| 排队发送 | 命中内置 `queue` 投递：运行中排进队列，空闲时立即发送 |
| 插话发送 | 命中内置 `steer` 投递：运行中把这条消息插进当前回合 |

判断方式：先读发送按钮的本地化 `aria-label`（覆盖中、英、日、法、德、俄、西、葡），确定内置普通回车当前走哪种投递，再用普通或加速手势精确命中所选语义。草稿为空、空闲或判断不出时交回内置行为——最坏是「不生效」，不会误发送。

## 安装

```powershell
dsh plugin --profile desktop add github:NEVSTOP-LAB/dsh-nevstop-lab-flavor
```

安装后刷新 Web 页面。

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

- 校验是总量式的：缺字段或手改坏值都回落到默认值，不会因配置把插件带崩；
- 客户端改动刷新页面后生效；宿主半侧改动需要重组合或重启 DSH。

## 实现约束

- 供应商前缀只注册官方 `conversation.input.model.label` 槽位，不遮蔽 `conversation.input.model` 座位、不依赖 `modelDirectories`；
- 键位在 `window` 捕获阶段改写 `keydown` 的修饰键，让内置键盘映射走自己的分支，不改编辑器内容；依赖 `[data-composer-input]`（要求 `isContentEditable`）、`[data-composer-card]`、`[data-trigger-menu]`、`[data-composer-placeholder]`，任一缺失即回退；
- 宿主半侧只为配置路由与持久化存在，读取失败时客户端沿用默认值。

## 兼容

DSH `>=0.2.1-rc.0 <0.3.0-0`，在 `0.2.2-rc.1` 验证。

## License

MIT
