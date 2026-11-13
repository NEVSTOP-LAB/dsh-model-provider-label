# README 头图

README 顶部的 `assets/hero.png` 是一张模拟 DSH 界面的说明图，用来一眼交代插件长什么样、改了哪几处。它由 `assets/hero/source.html` 渲染而来，跟代码一起更新。

## 画布与输出

| 项 | 值 |
|---|---|
| CSS 画布 | 1600 × 1000 |
| 设备像素比 | 2 |
| PNG 实际像素 | 3200 × 2000 |
| 源文件 | `assets/hero/source.html`：单文件自包含（内联样式、内联 UI 图标，功能图标引用 `assets/icons/`） |
| 产物 | `assets/hero.png` |

渲染脚本用本机 Chromium 系浏览器的无头模式截图。不要把字体、图片、外部样式挂到网络或磁盘外部资源上，否则截图可能拍在资源加载完成之前。

## 分层

头图自上而下由五层叠成，改图时按层定位：

| 层 | 内容 | 改动信号 |
|---|---|---|
| 背景层 | 整幅底色、渐变、网格或光晕 | 换主题色、品牌色 |
| DSH 窗口层 | 模拟的 DSH 主窗口：标题栏、左侧栏、活跃会话区、输入区与发送按钮 | 侧栏结构、输入区控件、发送按钮外观或文案变化 |
| 设置弹层 | 叠在窗口上的 NEVSTOP-LAB 设置页：功能卡片、齿轮按钮、开关与提示语 | 卡片增删、齿轮展开行为、开关默认值、配置项或提示文案变化 |
| spotlight 层 | 高亮框、连接线与图标编号，指向窗口或设置页里的具体控件 | 被标注的控件位置或名称变化 |
| 图例层 | 底部图例，解释标注与功能名 | 新增/删除标注、功能改名 |

标注、图例与 README 功能表是同一套说法：改一处就要顺带核对另外两处。

## 涉及文件

| 文件 | 作用 |
|---|---|
| `assets/hero/source.html` | 头图源，唯一手改的文件 |
| `assets/hero.png` | 渲染产物，由脚本生成，不手改 |
| `scripts/hero/render.mjs`、`scripts/hero/browser.mjs` | 渲染脚本与浏览器探测，零依赖 Node ESM |
| `README.md` | 顶部引用 `assets/hero.png` |
| `assets/icons/` | 图标源文件 |
| `lib/client.js` | 界面里内联的图标 path 与设置页文案 |
| `docs/hero.md` | 本文件：分层、判定与同步规则 |
| `.github/workflows/hero-reminder.yml` | 改了界面或说明却没更新头图时给 PR 一条 warning |
| `.github/pull_request_template.md` | PR 里的头图自检复选框 |

## 重新生成

在仓库根目录：

```bash
npm run hero
```

等价于 `node scripts/hero/render.mjs`，默认参数是 `--source assets/hero/source.html --out assets/hero.png --size 1600x1000 --scale 2`。任意参数可覆盖，便于调试或单独出图：

```bash
node scripts/hero/render.mjs --source path/to/source.html --out path/to/out.png --size 800x500 --scale 2
```

脚本成功后输出一行：`hero written: assets/hero.png (3200x2000, <KB> KB)`。它会把截图写入输出目录下的临时目录，解析 PNG 的 IHDR 校验实际像素等于 `宽 × scale`、`高 × scale`，不符或没有截图时退出码非 0；临时目录用完即删，输出目录不存在时自动创建。

浏览器优先取环境变量 `HERO_BROWSER` 指向的可执行文件，否则自动探测本机的 Edge / Chrome / Chromium。没有可用浏览器时脚本会列出查找过的位置，并提示安装或设置 `HERO_BROWSER`：

```powershell
$env:HERO_BROWSER = '<浏览器可执行文件路径>'
npm run hero
```

生成后目视检查 `assets/hero.png`：没有空白或错位、没有残留调试文字、标注指向的控件确实在图上、与设置页当前文案一致。

## 更新判定

| 改动 | 头图 |
|---|---|
| 新增、删除功能，或功能改名 | 必须更新 |
| 任何功能的默认开关值变化 | 必须更新 |
| 设置页卡片、齿轮展开行为、开关、配置项或提示文案变化 | 必须更新 |
| 侧栏、输入区、发送按钮等界面外观或文案变化 | 必须更新 |
| 图标变化 | 必须更新，且三处同步 |
| README 功能表或一句话说明变化 | 必须更新，且图例与标注同步 |
| 纯内部修复：选择器、时序、错误处理，界面不变 | 不必更新 |
| 依赖升级、版本号、CI 配置、构建调整 | 不必更新 |
| 不影响界面文案与布局的重构 | 不必更新 |
| 文档错别字、注释修正 | 不必更新 |

不确定时按「必须」处理：头图过时比多渲染一次代价大得多。

## 新增一个功能时要改哪几处

1. `lib/index.js`：`DEFAULTS` 里加功能默认值，`normalizeConfig` 里加校验回落；
2. `lib/client.js`：`DEFAULTS.features`、设置页卡片与开关、`DICT` 的中英文案、需要的界面逻辑；
3. `assets/icons/`：新增图标并接入 `FEATURE_ICONS`；
4. `README.md`：功能一览表加一行并链接到 `docs/features/<名称>.md`，功能细节写在该文件；
5. `assets/hero/source.html`：DSH 窗口层、设置弹层卡片、spotlight 标注与图例；
6. 运行 `npm run hero`，目视检查 `assets/hero.png`；
7. PR 里勾选「已评估 README 头图（`assets/hero.png`）是否需要更新」。

只加代码不改头图的 PR，需要能说清为什么界面没变。

## 图标同步

同一枚图标出现在三处，改一处必须同步另外两处：

| 位置 | 形态 |
|---|---|
| `assets/icons/` | 源文件（SVG），命名与用途对应 |
| `assets/hero/source.html` | 用 `<img>` 引用同一批 SVG |
| `lib/client.js` | 内联同一份 path 数据 |

同步要点：

- 几何与 `viewBox` 保持一致，头图里的显示尺寸按 CSS 尺寸写，导出时由 2x 放大；
- 颜色固定 `#5686FE`，保证 README 在 GitHub 亮/暗主题都可见；
- 改完运行 `npm run check`，`scripts/icons/verify.mjs` 会校验三处一致。
