# dsh-nevstop-lab-flavor 开发约定

## README 头图

README 顶部的 `assets/hero.png` 是一张模拟 DSH 界面的说明图，由单文件 `assets/hero/source.html` 渲染：画布 1600 × 1000，内联样式与 UI 图标，功能图标引用 `assets/icons/`。

必须更新：

- 功能新增、删除或改名；
- 任何功能的默认开关值变化；
- 设置页结构或文案变化（卡片、开关、配置项、提示语）；
- 头图的图例、标注、spotlight 指向或文字变化；
- 模拟界面与真实 DSH 的布局出现明显偏差。

不必更新：

- 纯内部修复（选择器、时序、错误处理），界面外观与文案不变；
- 依赖升级、版本号、CI 与构建配置调整；
- 不影响界面文案与布局的重构。

更新方式：

1. 改 `assets/hero/source.html`；
2. 运行 `npm run hero` 生成 `assets/hero.png`（3200 × 2000，2x）；
3. 目视检查 PNG：无空白错位、无调试文字、标注与设置页文案一致。

> [!NOTE]
> 头图与 README 功能表、设置页是同一套说法；改其中一处时核对另外两处。

## 图标三处一致

图标以 `assets/icons/` 下的 SVG 为唯一源文件，另有头图与界面两处使用：

- `assets/icons/`：唯一源文件，改图标先改这里；
- `assets/hero/source.html`：用 `<img src="../icons/<名称>.svg">` 相对路径引用同一批 SVG；
- `lib/client.js`：内联同一份 path 数据（不读 SVG 文件）。

三处由 `scripts/icons/verify.mjs` 校验一致，随 `npm run check` 运行。颜色在 SVG 内写死 `#5686FE`，不要改成 `currentColor`：README 在 GitHub 亮/暗主题下都要看得见。

## 更多

头图分层、重新生成命令、更新判定表与新增功能时的改动清单见 `docs/hero.md`。
