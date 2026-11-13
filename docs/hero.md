# README 头图

README 顶部的 `assets/hero.png` 是一张带标注的真实界面图：底层是 DSH 的真实截图，上层由 `assets/hero/source.html` 叠加标题、spotlight 与图例。它跟随代码更新。

## 组成

| 文件 | 作用 | 尺寸 |
|---|---|---|
| `assets/hero/main.png` | DSH 真实截图：设置页打开到 NEVSTOP-LAB | 1600 × 1000 |
| `assets/hero/composer.png` | 输入区控制条真实裁剪：模型按钮 / 余额圆环 / 发送按钮 | 460 × 78 |
| `assets/hero/source.html` | 叠加层：标题、真实截图、输入区细节卡、六处虚线高亮与图标编号、图例 | 1600 × 1215 |
| `assets/hero.png` | 渲染产物 | 3200 × 2430（2x） |
| `scripts/hero/capture.mjs` | 从运行中的 DSH Web 采集上面两张真实截图 | — |
| `scripts/hero/render.mjs`、`scripts/hero/browser.mjs` | 渲染叠加层、探测本机 Chromium 系浏览器 | — |

## 重新生成

前提：Node 22+（`capture.mjs` 用内置 WebSocket 走 CDP）与本机 Edge / Chrome / Chromium。

```bash
npm run hero
```

等价于 `node scripts/hero/render.mjs`，默认参数 `--source assets/hero/source.html --out assets/hero.png --size 1600x1215 --scale 2`。成功输出 `hero written: assets/hero.png (3200x2430, <KB> KB)`；脚本会校验 PNG 像素尺寸，不符时退出码非 0。浏览器探测优先取 `HERO_BROWSER`，否则按平台查找。

## 干净实例

截图必须在不含个人数据的 DSH 实例里重拍，不要用真实的 `~/.dsh`。步骤（`DSH_HOME` 指向临时目录）：

1. 用临时数据目录启动 Web 实例，记下输出的带 token URL：

   ```powershell
   $env:DSH_HOME = '<临时目录>'
   dsh web --no-open --port 0
   ```

2. 把本仓库插件装进该实例的 web profile：

   ```powershell
   dsh plugin --profile web add "file:<本仓库路径>"
   ```

3. 准备演示数据：设置假 `DEEPSEEK_API_KEY`（模型目录可见、余额查询失败，不涉及真实账户），用 `dsh headless "<演示文案>"` 生成 2–3 条会话。headless 会因假 Key 在调用模型时报错，但会话已落盘；不要手改会话 JSONL，事件序列不完整会让 host 判定会话无效。
4. 重启 Web 实例后运行采集脚本，把两张图写回 `assets/hero/`：

   ```bash
   node scripts/hero/capture.mjs --url 'http://127.0.0.1:<port>/?token=<token>'
   ```

   脚本会打开设置 → NEVSTOP-LAB、滚动到「新会话默认模型」卡片后截主图，再打开一条活跃会话把输入区落到底部截控制条；输出 `captured main.png (1600x1000)` 与 `captured composer.png (460x78)`。
5. `npm run hero` 重新渲染，目视检查 `assets/hero.png`。

## 更新判定

| 改动 | 头图 |
|---|---|
| 新增、删除功能，或功能改名 | 必须更新 |
| 任何功能的默认开关值变化 | 必须更新 |
| 设置页卡片、开关、配置项或提示文案变化 | 必须更新 |
| 侧栏、输入区、发送按钮等界面外观或文案变化 | 必须重拍截图并更新 |
| 图标变化 | 必须更新，且三处同步 |
| README 功能表或一句话说明变化 | 必须更新，且图例与标注同步 |
| 纯内部修复：选择器、时序、错误处理，界面不变 | 不必更新 |
| 依赖升级、版本号、CI 配置、构建调整 | 不必更新 |
| 文档错别字、注释修正 | 不必更新 |

不确定时按「必须」处理：头图过时比多拍一次代价大得多。

## 新增一个功能时要改哪几处

1. `lib/index.js`：`DEFAULTS` 与 `normalizeConfig`；
2. `lib/client.js`：设置页卡片、开关、中英文案与界面逻辑；
3. `assets/icons/`：新增图标并接入 `FEATURE_ICONS`；
4. `README.md`：功能一览表与对应小节；
5. `assets/hero/source.html`：图例、spotlight 与细节卡按需调整；
6. 重拍截图并 `npm run hero`；
7. PR 里勾选头图评估项。

## 图标同步

同一枚图标出现在三处，改一处必须同步另外两处：`assets/icons/`（源文件）、`assets/hero/source.html`（`<img>` 引用）、`lib/client.js`（内联 path）。`scripts/icons/verify.mjs` 随 `npm run check` 校验；颜色固定 `#5686FE`，保证 README 亮/暗主题都可见。
