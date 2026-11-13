#!/usr/bin/env node
/**
 * 采集 README 头图用的真实界面截图：
 *   assets/hero/main.png      1600x1000  设置页打开到 NEVSTOP-LAB 的整屏
 *   assets/hero/composer.png   460x78    输入区控制条（模型按钮 / 余额圆环 / 发送按钮）
 *
 * 只使用 Node 内置模块：用本机 Chromium 系浏览器（Edge / Chrome / Chromium）的无头模式打开 DSH Web，
 * 通过 CDP（DevTools 协议，Node 22+ 内置 WebSocket）驱动交互并裁剪截图，不引入 Playwright / Puppeteer。
 *
 * 用法：
 *   node scripts/hero/capture.mjs --url 'http://127.0.0.1:<port>/?token=<token>'
 *   node scripts/hero/capture.mjs --url '...' --out-dir work/tmp/hero
 *   node scripts/hero/capture.mjs --url '...' --browser '<浏览器可执行文件路径>'
 *
 * 截图必须在无个人数据的环境里重拍：临时 DSH_HOME、演示会话、假 API key。
 * 步骤见 docs/hero.md「干净实例」。
 */

import { spawn, spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { join, relative, resolve, sep } from 'node:path'
import { BrowserMissingError, resolveBrowser } from './browser.mjs'

const DEFAULTS = {
  outDir: 'assets/hero',
}

// 与真实 DSH 窗口一致的视口；截图按 clip 缩放后得到目标像素。
const PAGE_WIDTH = 1920
const PAGE_HEIGHT = 1200
const PAGE_DEVICE_SCALE = 2
const MAIN_CLIP = { x: 0, y: 0, width: 1920, height: 1200, scale: 5 / 12 } // 1600x1000（视口 1920，PAGE_DEVICE_SCALE=2）
const COMPOSER_CLIP = { x: 1150, y: 1120, width: 440, height: 75, scale: 460 / 880 } // 460x78

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
const BROWSER_START_TIMEOUT_MS = 30_000
const WAIT_TIMEOUT_MS = 45_000
const APP_SETTLE_MS = 3000

class UsageError extends Error {}

const sleep = (milliseconds) => new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds))

/** 仓库内路径统一用正斜杠显示。 */
function displayPath(absolutePath) {
  const relativePath = relative(process.cwd(), absolutePath)
  const shown = relativePath === '' ? '.' : relativePath
  return sep === '/' ? shown : shown.split(sep).join('/')
}

function usage() {
  return [
    '用法：node scripts/hero/capture.mjs --url <DSH Web URL> [选项]',
    '',
    '选项：',
    `  --url <url>       必填，运行中 DSH 实例的 Web 地址（含 token）`,
    `  --out-dir <目录>  截图输出目录，默认 ${DEFAULTS.outDir}`,
    '  --browser <路径>  浏览器可执行文件；缺省时读 HERO_BROWSER，再自动探测 Edge / Chrome / Chromium',
    '  -h, --help        显示本帮助',
    '',
    '输出：main.png（1600x1000）与 composer.png（460x78），并校验实际像素。',
  ].join('\n')
}

function parseArgs(argv) {
  const options = { outDir: DEFAULTS.outDir, url: '', browser: '' }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '-h' || arg === '--help') {
      return { help: true, options }
    }
    const matched = /^--(url|out-dir|browser)(?:=(.*))?$/.exec(arg)
    if (matched === null) {
      throw new UsageError(`未知参数：${arg}`)
    }
    const [, key, inlineValue] = matched
    const value = inlineValue ?? argv[(index += 1)]
    if (value === undefined || value.trim() === '') {
      throw new UsageError(`参数 --${key} 需要一个值`)
    }
    if (key === 'out-dir') options.outDir = value.trim()
    else if (key === 'url') options.url = value.trim()
    else options.browser = value.trim()
  }
  if (options.url === '') throw new UsageError('缺少必填参数 --url（运行中 DSH 实例的 Web 地址，含 token）')
  return { help: false, options }
}

function parseUrl(raw) {
  let url
  try {
    url = new URL(raw)
  } catch {
    throw new UsageError(`--url 不是合法地址：${raw}`)
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new UsageError(`--url 需要 http(s) 地址，收到：${raw}`)
  }
  return url.href
}

/** 启动无头浏览器，调试端口交给系统分配（--remote-debugging-port=0）。 */
function launchBrowser(browserPath, profileDir) {
  const args = [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--hide-scrollbars',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    `--window-size=${PAGE_WIDTH},${PAGE_HEIGHT}`,
    '--remote-debugging-port=0',
    `--user-data-dir=${profileDir}`,
    'about:blank',
  ]
  return spawn(browserPath, args, { stdio: 'ignore', windowsHide: true })
}

async function waitForDevToolsPort(profileDir, timeoutMs = BROWSER_START_TIMEOUT_MS) {
  const portFile = join(profileDir, 'DevToolsActivePort')
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (existsSync(portFile)) {
      const firstLine = readFileSync(portFile, 'utf8').split(/\r?\n/, 1)[0]?.trim() ?? ''
      const port = Number(firstLine)
      if (Number.isInteger(port) && port > 0) return port
    }
    await sleep(150)
  }
  throw new Error(`浏览器没有在 ${timeoutMs / 1000} 秒内打开调试端口。`)
}

async function waitForDebugger(port, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`)
      if (response.ok) return
    } catch {
      // 浏览器还没起来，继续等。
    }
    await sleep(150)
  }
  throw new Error(`浏览器调试端口 ${port} 无响应。`)
}

/** 极简 CDP 客户端：Node 22+ 内置 WebSocket，无第三方依赖。 */
function createCdp(webSocketUrl) {
  if (typeof WebSocket !== 'function') {
    throw new Error('需要 Node 22 或更高版本（脚本使用 Node 内置的 WebSocket 连接 CDP）。')
  }

  const socket = new WebSocket(webSocketUrl)
  const pending = new Map()
  let nextId = 0

  const ready = new Promise((resolvePromise, rejectPromise) => {
    socket.onopen = () => resolvePromise()
    socket.onerror = () => rejectPromise(new Error('CDP WebSocket 连接失败。'))
  })

  socket.onmessage = (event) => {
    let message
    try {
      message = JSON.parse(typeof event.data === 'string' ? event.data : Buffer.from(event.data).toString('utf8'))
    } catch {
      return
    }
    if (typeof message.id !== 'number') return
    const call = pending.get(message.id)
    if (call === undefined) return
    pending.delete(message.id)
    if (message.error) call.reject(new Error(`CDP ${call.method} 失败：${JSON.stringify(message.error)}`))
    else call.resolve(message.result)
  }

  socket.onclose = () => {
    for (const call of pending.values()) call.reject(new Error('CDP 连接已关闭。'))
    pending.clear()
  }

  const send = (method, params = {}) =>
    new Promise((resolvePromise, rejectPromise) => {
      const id = (nextId += 1)
      pending.set(id, { resolve: resolvePromise, reject: rejectPromise, method })
      socket.send(JSON.stringify({ id, method, params }))
    })

  return { ready, send, close: () => socket.close() }
}

async function evaluate(cdp, expression) {
  const result = await cdp.send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
    userGesture: true,
  })
  if (result.exceptionDetails) {
    throw new Error(`页面脚本执行失败：${JSON.stringify(result.exceptionDetails)}`)
  }
  return result.result?.value
}

async function waitFor(description, check, timeoutMs = WAIT_TIMEOUT_MS) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      if (await check()) return
    } catch {
      // 页面还在导航，重试。
    }
    await sleep(250)
  }
  throw new Error(`等待超时：${description}`)
}

/** 读取 PNG 的 IHDR 宽高；不是 PNG 或文件被截断时抛错。 */
function readPngSize(file) {
  const buffer = readFileSync(file)
  if (buffer.length < 24) throw new Error(`截图不是有效的 PNG（文件太短）：${displayPath(file)}`)
  if (!buffer.subarray(0, 8).equals(PNG_SIGNATURE)) throw new Error(`截图不是 PNG（签名不符）：${displayPath(file)}`)
  if (buffer.toString('ascii', 12, 16) !== 'IHDR') throw new Error(`截图 PNG 缺少 IHDR 头：${displayPath(file)}`)
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) }
}

async function preparePage(cdp, url) {
  await cdp.send('Page.enable')
  await cdp.send('Runtime.enable')
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    deviceScaleFactor: PAGE_DEVICE_SCALE,
    mobile: false,
  })
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }] })
  await cdp.send('Page.navigate', { url })
  await waitFor('DSH 页面加载完成', async () => (await evaluate(cdp, "document.readyState === 'complete'")) === true)
  await waitFor('DSH 输入区渲染', async () => (await evaluate(cdp, "document.querySelector('[data-composer-card]') !== null")) === true)
  await sleep(APP_SETTLE_MS)
}

async function pressKey(cdp, key, code, modifiers, windowsVirtualKeyCode) {
  const base = { key, code, modifiers, windowsVirtualKeyCode, nativeVirtualKeyCode: windowsVirtualKeyCode }
  await cdp.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', ...base })
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', ...base })
}

async function capture(cdp, { clip, fileName, outDir, tempDir }) {
  const shot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false, clip })
  if (typeof shot?.data !== 'string' || shot.data === '') {
    throw new Error(`${fileName} 截图失败：没有拿到 PNG 数据。`)
  }
  const tempFile = join(tempDir, fileName)
  writeFileSync(tempFile, Buffer.from(shot.data, 'base64'))

  const expected = {
    width: Math.round(clip.width * clip.scale * PAGE_DEVICE_SCALE),
    height: Math.round(clip.height * clip.scale * PAGE_DEVICE_SCALE),
  }
  const actual = readPngSize(tempFile)
  if (actual.width !== expected.width || actual.height !== expected.height) {
    throw new Error(
      `${fileName} 尺寸不符：期望 ${expected.width}x${expected.height}，实际 ${actual.width}x${actual.height}。` +
        `请确认浏览器视口为 ${PAGE_WIDTH}x${PAGE_HEIGHT}，且 --force-device-scale-factor 未被本机缩放覆盖。`,
    )
  }

  const outFile = join(outDir, fileName)
  try {
    renameSync(tempFile, outFile)
  } catch {
    copyFileSync(tempFile, outFile)
    rmSync(tempFile, { force: true })
  }
  return actual
}

async function captureMain(cdp, context) {
  await pressKey(cdp, ',', 'Comma', 3, 188) // Ctrl+Alt+,
  await waitFor('设置面板打开', async () =>
    (await evaluate(
      cdp,
      "(() => Array.from(document.querySelectorAll('button')).some((b) => (b.innerText || '').trim() === 'NEVSTOP-LAB'))()",
    )) === true,
  )
  const clicked = await evaluate(
    cdp,
    "(() => { const b = Array.from(document.querySelectorAll('button')).find((n) => (n.innerText || '').trim() === 'NEVSTOP-LAB'); if (!b) return false; b.click(); return true })()",
  )
  if (clicked !== true) throw new Error('没有找到设置页里的 NEVSTOP-LAB 入口。')

  const cardExpression = `(() => Array.from(document.querySelectorAll('*')).find((el) => (el.innerText || '').trim().startsWith('新会话默认模型') && el.querySelectorAll('select').length >= 1))()`
  await waitFor('「新会话默认模型」卡片渲染', async () => (await evaluate(cdp, `Boolean(${cardExpression})`)) === true)
  const scrolled = await evaluate(
    cdp,
    `(() => { const card = ${cardExpression}; if (!card) return false; card.scrollIntoView({ block: 'center' }); return true })()`,
  )
  if (scrolled !== true) throw new Error('没有找到「新会话默认模型」卡片。')
  await sleep(1500)

  return capture(cdp, { clip: MAIN_CLIP, fileName: 'main.png', ...context })
}

async function captureComposer(cdp, url, context) {
  await cdp.send('Page.navigate', { url })
  await waitFor('DSH 页面加载完成', async () => (await evaluate(cdp, "document.readyState === 'complete'")) === true)
  await waitFor('DSH 输入区渲染', async () => (await evaluate(cdp, "document.querySelector('[data-composer-card]') !== null")) === true)
  await sleep(APP_SETTLE_MS)

  await waitFor('活跃会话列表', async () => {
    const count = await evaluate(
      cdp,
      "(() => { const rows = document.querySelectorAll('[data-dsh-nlf-active] [data-session-id]'); return (rows.length > 0 ? rows : document.querySelectorAll('[data-session-id]')).length })()",
    )
    return typeof count === 'number' && count > 0
  })

  const opened = await evaluate(
    cdp,
    "(() => { const rows = document.querySelectorAll('[data-dsh-nlf-active] [data-session-id]'); const row = (rows.length > 0 ? rows : document.querySelectorAll('[data-session-id]'))[0]; if (!row) return null; row.click(); return (row.innerText || '').slice(0, 60) })()",
  )
  if (opened === null || opened === undefined) throw new Error('没有可打开的会话：请确认干净实例里有演示会话。')

  await waitFor('输入区落到底部', async () => {
    const atBottom = await evaluate(
      cdp,
      `(() => {
        const button = document.querySelector('button[aria-label="发送消息"]') ?? document.querySelector('button[aria-label="Send message"]');
        if (button === null) return false;
        const rect = button.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && rect.top > innerHeight * 0.85;
      })()`,
    )
    return atBottom === true
  })
  await sleep(1500)

  return capture(cdp, { clip: COMPOSER_CLIP, fileName: 'composer.png', ...context })
}

/** 通过 CDP 让浏览器自己退出，避免留下占用临时 profile 的进程。 */
async function closeBrowser(port) {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/json/version`)
    if (!response.ok) return
    const version = await response.json()
    const cdp = createCdp(version.webSocketDebuggerUrl)
    await cdp.ready
    await cdp.send('Browser.close')
    cdp.close()
  } catch {
    // 浏览器可能已退出，交给后续的进程兜底清理。
  }
}

function waitForExit(child, timeoutMs) {
  if (child.exitCode !== null) return Promise.resolve()
  return new Promise((resolvePromise) => {
    const timer = setTimeout(resolvePromise, timeoutMs)
    child.once('exit', () => {
      clearTimeout(timer)
      resolvePromise()
    })
  })
}

function killTree(child) {
  try {
    if (process.platform === 'win32') {
      spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' })
    } else {
      child.kill('SIGKILL')
    }
  } catch {
    // 进程可能已不存在。
  }
}

async function removeDir(dir) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      rmSync(dir, { recursive: true, force: true })
    } catch {
      // Windows 上文件可能仍被浏览器占用，稍后重试。
    }
    if (!existsSync(dir)) return
    await sleep(200)
  }
  console.error(`临时目录未能删除：${displayPath(dir)}（可手动删除）`)
}

async function run(options) {
  const url = parseUrl(options.url)
  const outDir = resolve(options.outDir)
  mkdirSync(outDir, { recursive: true })

  const browserPath = resolveBrowser(undefined, options.browser)
  const tempDir = join(outDir, `.capture-${process.pid}-${Date.now()}`)
  const profileDir = join(tempDir, 'profile')
  mkdirSync(profileDir, { recursive: true })

  const child = launchBrowser(browserPath, profileDir)
  let cdp = null
  let port = null

  try {
    port = await waitForDevToolsPort(profileDir)
    await waitForDebugger(port)
    const listResponse = await fetch(`http://127.0.0.1:${port}/json/list`)
    const targets = await listResponse.json()
    const page = targets.find((target) => target.type === 'page' && target.webSocketDebuggerUrl)
    if (page === undefined) throw new Error('浏览器没有可用的页面标签。')

    cdp = createCdp(page.webSocketDebuggerUrl)
    await cdp.ready
    await preparePage(cdp, url)

    const context = { outDir, tempDir }
    const main = await captureMain(cdp, context)
    const composer = await captureComposer(cdp, url, context)

    console.log(`captured main.png (${main.width}x${main.height})`)
    console.log(`captured composer.png (${composer.width}x${composer.height})`)
  } finally {
    if (cdp !== null) cdp.close()
    if (port !== null) await closeBrowser(port)
    await waitForExit(child, 5000)
    if (child.exitCode === null) {
      killTree(child)
      await waitForExit(child, 3000)
    }
    await removeDir(tempDir)
  }
}

async function main(argv) {
  const { help, options } = parseArgs(argv)
  if (help) {
    console.log(usage())
    return
  }
  await run(options)
}

main(process.argv.slice(2)).catch((error) => {
  if (error instanceof UsageError) {
    console.error(`参数错误：${error.message}\n\n${usage()}`)
    process.exitCode = 2
  } else if (error instanceof BrowserMissingError) {
    console.error(error.message)
    process.exitCode = 1
  } else {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
})
