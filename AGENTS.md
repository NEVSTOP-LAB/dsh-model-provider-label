# dsh-nevstop-lab-flavor 开发约定

## README 头图

README 顶部的 `assets/hero.png` 由真实界面截图与叠加层组成：`assets/hero/main.png`（设置页打开到 NEVSTOP-LAB）、`assets/hero/composer.png`（输入区控制条）来自无个人数据的干净 DSH 实例，`assets/hero/source.html` 负责标题、spotlight 与图例。

必须更新：

- 功能新增、删除或改名；
- 任何功能的默认开关值变化；
- 设置页结构或文案变化（卡片、开关、配置项、提示语）；
- 头图的图例、标注、spotlight 指向或文字变化；
- 标注的界面位置随 DSH 版本变化。

不必更新：

- 纯内部修复（选择器、时序、错误处理），界面外观与文案不变；
- 依赖升级、版本号、CI 与构建配置调整；
- 不影响界面文案与布局的重构。

更新方式：

1. 在干净实例上重拍截图：`node scripts/hero/capture.mjs --url <带 token 的 DSH Web URL>`，写回 `assets/hero/main.png`、`assets/hero/composer.png`；干净实例的启动与会话准备见 `docs/hero.md`；
2. 按需改 `assets/hero/source.html`（画布 1600 × 1215）后运行 `npm run hero` 生成 `assets/hero.png`（3200 × 2430，2x）；
3. 目视检查 PNG：无空白错位、无调试文字、无个人数据、标注与设置页文案一致。

> [!NOTE]
> 头图与 README 功能表、设置页是同一套说法；改其中一处时核对另外两处。

## 图标三处一致

图标以 `assets/icons/` 下的 SVG 为唯一源文件，另有头图与界面两处使用：

- `assets/icons/`：唯一源文件，改图标先改这里；
- `assets/hero/source.html`：用 `<img src="../icons/<名称>.svg">` 相对路径引用同一批 SVG；
- `lib/client.js`：内联同一份 path 数据（不读 SVG 文件）。

三处由 `scripts/icons/verify.mjs` 校验一致，改完随 `npm run check` 运行。颜色在 SVG 内写死 `#5686FE`，不要改成 `currentColor`：README 在 GitHub 亮/暗主题下都要看得见。

## 更多

头图分层、干净实例、重新生成命令与新增功能时的改动清单见 `docs/hero.md`。
