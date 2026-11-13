# dsh-nevstop-lab-flavor

![dsh-nevstop-lab-flavor 头图：DSH 界面中央打开 NEVSTOP-LAB 设置页，六项改动以带图标的 spotlight 标出](assets/hero.png)

让 DSH 更贴合 NEVSTOP-LAB 使用习惯的本地化定制插件。功能逐项开关，关掉即恢复 DSH 原生行为。

## 功能一览

| 图标 | 功能 | 默认 | 一句话 |
|---|---|---|---|
| <img src="assets/icons/provider.svg" width="20" height="20" alt=""> | [模型供应商前缀](docs/features/provider-label.md) | 开 | 在模型名旁标出供应商，同名模型一眼可辨，不会选错来源。 |
| <img src="assets/icons/keys.svg" width="20" height="20" alt=""> | [编写器键位](docs/features/composer-keys.md) | 开 | 自定义每个键是换行、排队还是插话，让发送手感贴合个人习惯。 |
| <img src="assets/icons/sidebar.svg" width="20" height="20" alt=""> | [侧边栏面板图标](docs/features/sidebar-panels.md) | 开 | 侧栏顶部只留一排图标，把纵向空间让给会话列表；末尾按钮可切回官方列表。 |
| <img src="assets/icons/sessions.svg" width="20" height="20" alt=""> | [活跃会话区](docs/features/active-sessions.md) | 开 | 在「工作区」上方列出最近活跃的会话，随时切回正在处理的工作。 |
| <img src="assets/icons/model.svg" width="20" height="20" alt=""> | [新会话默认模型](docs/features/default-model.md) | 开 | 新会话固定使用指定模型，避免沿用上个会话的选择多花冤枉钱。 |
| <img src="assets/icons/balance.svg" width="20" height="20" alt=""> | [余额圆环](docs/features/balance-ring.md) | 开 | 在输入框右侧显示余额或用量，随时知道还能用多少。 |

设置入口：**设置 → NEVSTOP-LAB**。发送按钮的外观与快捷键提示跟随「编写器键位」开关，不单独占开关。

界面文案跟随 DSH 的语言设置：提供简体中文与英文，其余语言自动回退英文。

## 设置页

每个功能一张卡片，右侧是开关；点卡片上的齿轮展开该项配置，同一时间只展开一张。详见 [设置页](docs/settings.md)。

## 安装

```powershell
dsh plugin --profile desktop add github:NEVSTOP-LAB/dsh-nevstop-lab-flavor
```

安装后刷新 Web 页面。

## 配置

设置保存在 `%USERPROFILE%\.dsh\plugin-data\dsh-nevstop-lab-flavor\config.json`，也可以在设置页里直接改。

## 兼容

DSH `>=0.2.1-rc.0 <0.3.0-0`。

## 维护

- `assets/hero.png` 是 README 顶图的渲染产物，源文件为 `assets/hero/source.html`：改完界面或功能文案后运行 `npm run hero` 重新生成，判定标准见 [docs/hero.md](docs/hero.md)。
- `assets/icons/` 是功能图标的唯一源文件，README、头图与插件设置页共用；改动时三处同步。
- 每个功能的细节写在 `docs/features/`，README 只保留一览表里的一句话。
- PR 模板里有对应的评估项，CI 会在界面改动而头图未更新时给出提醒。

## License

MIT
