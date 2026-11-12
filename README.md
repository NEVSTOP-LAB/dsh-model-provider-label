# dsh-nevstop-lab-flavor

让 DSH 更贴合 NEVSTOP-LAB 使用习惯的本地化定制插件。功能逐项开关，关掉即恢复 DSH 原生行为。

## 功能一览

| 功能 | 默认 | 一句话 |
|---|---|---|
| 模型供应商前缀 | 开 | 在模型名旁显示它来自哪个供应商 |
| 编写器键位 | 开 | 自定义 Enter / Ctrl+Enter / Shift+Enter 的作用 |

设置入口：**设置 → NEVSTOP-LAB**。

## 模型供应商前缀

开启后，输入区模型按钮与模型菜单的当前值显示「供应商 · 模型」，例如：

- `DeepSeek · flash`
- `opencode-go · flash`

菜单里每个模型选项仍只显示模型名，供应商由分组标题表达。关闭后恢复为只显示模型名。

## 编写器键位

Enter、Ctrl（macOS 上为 Cmd）+ Enter、Shift + Enter、Alt + Enter 四行分别可选：

| 选项 | 效果 |
|---|---|
| 换行 | 在草稿里换行，不发送 |
| 排队发送 | 发送这条消息；Agent 正在运行时排进队列 |
| 插话发送 | 发送这条消息；Agent 正在运行时插进当前回合 |

默认：Enter 换行、Ctrl + Enter 排队发送、Shift + Enter 换行、Alt + Enter 插话发送。

输入框为空时，占位提示会在官方文案后追加当前键位（如 `Enter 换行 · Ctrl+Enter 排队 · Shift+Enter 换行 · Alt+Enter 插话`），改完设置立即更新。以下情况保持 DSH 原生行为：

- `/` 与 `@` 菜单打开时，Enter 仍然是选择菜单项；
- 输入法组词过程中的回车；
- Ctrl + Shift + Enter 等组合；
- 输入框为空且 Agent 正在运行时，Ctrl + Enter 仍是「插话发送全部排队消息」。

## 设置页

- 每个功能一张卡片，右侧是开关；
- 开启时展开该功能的配置，关闭时收起；
- 底部「恢复默认」一次性还原所有功能与键位；
- 修改即时生效，跟随亮/暗色主题。

## 安装

```powershell
dsh plugin --profile desktop add github:NEVSTOP-LAB/dsh-nevstop-lab-flavor
```

安装后刷新 Web 页面。

## 配置

设置保存在 `%USERPROFILE%\.dsh\plugin-data\dsh-nevstop-lab-flavor\config.json`，也可以在设置页里直接改。

## 兼容

DSH `>=0.2.1-rc.0 <0.3.0-0`。

## License

MIT
