#!/usr/bin/env node
/**
 * 把 README 头图的 HTML 源渲染成 PNG。
 *
 * 只使用 Node 内置模块，调用本机 Chromium 系浏览器（Microsoft Edge / Google Chrome / Chromium）
 * 的无头模式截图，不引入 Playwright / Puppeteer 等依赖。浏览器探测与 capture.mjs 共用 browser.mjs。
 *
 * 用法：
 *   node scripts/hero/render.mjs
 *   node scripts/hero/render.mjs --source assets/hero/source.html --out assets/hero.png --size 1600x1215 --scale 2
 *
 * 截图后会读取 PNG 的 IHDR 校验实际像素等于 size × scale；不相等时退出码非 0。
 */

import { spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { pathToFileURL } from 'node:url'
import { BrowserMissingError, resolveBrowser } from './browser.mjs'

const DEFAULTS = {
  source: 'assets/hero/source.html',
  out: 'assets/hero.png',
  size: '1600x1215',
  scale: '2',
}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
const RENDER_TIMEOUT_MS = 120_000

class UsageError extends Error {}

/** 仓库内路径统一用正斜杠显示，方便贴进文档与日志。 */
function displayPath(absolutePath) {
  const relativePath = relative(process.cwd(), absolutePath)
  const shown = relativePath === '' ? '.' : relativePath
  return sep === '/' ? shown : shown.split(sep).join('/')
}

function usage() {
  return [
    '用法：node scripts/hero/render.mjs [选项]',
    '',
    '选项：',
    `  --source <文件>   头图 HTML 源，默认 ${DEFAULTS.source}`,
    `  --out <文件>      PNG 输出，默认 ${DEFAULTS.out}`,
    `  --size <WxH>     CSS 画布尺寸，默认 ${DEFAULTS.size}`,
    `  --scale <倍数>   设备像素比，默认 ${DEFAULTS.scale}（输出 PNG 为 W*scale x H*scale）`,
    '  -h, --help       显示本帮助',
    '',
    '浏览器：优先使用环境变量 HERO_BROWSER，否则自动探测本机的 Edge / Chrome / Chromium。',
  ].join('\n')
}

function parseArgs(argv) {
  const options = { ...DEFAULTS }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '-h' || arg === '--help') {
      return { help: true, options }
    }
    const matched = /^--(source|out|size|scale)(?:=(.*))?$/.exec(arg)
    if (matched === null) {
      throw new UsageError(`未知参数：${arg}`)
    }
    const [, key, inlineValue] = matched
    const value = inlineValue ?? argv[(index += 1)]
    if (value === undefined || value.trim() === '') {
      throw new UsageError(`参数 --${key} 需要一个值`)
    }
    options[key] = value.trim()
  }
  return { help: false, options }
}

function parseSize(raw) {
  const matched = /^(\d+)\s*[xX*×]\s*(\d+)$/.exec(raw.trim())
  if (matched === null) {
    throw new UsageError(`--size 需要形如 1600x1215 的尺寸，收到：${raw}`)
  }
  const width = Number(matched[1])
  const height = Number(matched[2])
  if (width <= 0 || height <= 0) {
    throw new UsageError(`--size 的宽高必须为正数，收到：${raw}`)
  }
  return { width, height }
}

function parseScale(raw) {
  const scale = Number(raw)
  if (!Number.isInteger(scale) || scale < 1 || scale > 8) {
    throw new UsageError(`--scale 需要 1 到 8 之间的整数，收到：${raw}`)
  }
  return scale
}

/** 读取 PNG 的 IHDR 宽高；不是 PNG 或文件被截断时抛错。 */
function readPngSize(file) {
  const buffer = readFileSync(file)
  if (buffer.length < 24) {
    throw new Error(`截图不是有效的 PNG（文件太短）：${displayPath(file)}`)
  }
  if (!buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new Error(`截图不是 PNG（签名不符）：${displayPath(file)}`)
  }
  if (buffer.toString('ascii', 12, 16) !== 'IHDR') {
    throw new Error(`截图 PNG 缺少 IHDR 头：${displayPath(file)}`)
  }
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) }
}

function render(options) {
  // 先校验参数，再看文件与浏览器：参数写错时立刻给出参数错误，而不是先报找不到源文件。
  const { width, height } = parseSize(options.size)
  const scale = parseScale(options.scale)

  const source = resolve(options.source)
  if (!existsSync(source) || !statSync(source).isFile()) {
    throw new Error(
      `找不到头图 HTML 源：${displayPath(source)}\n请先创建 ${DEFAULTS.source}，或用 --source 指定其它文件。`,
    )
  }

  const out = resolve(options.out)
  const browser = resolveBrowser()
  const expected = { width: width * scale, height: height * scale }

  // 临时目录放在输出目录里：路径显式，且与输出同盘，不依赖 TMP / TEMP 环境变量。
  const outDir = dirname(out)
  mkdirSync(outDir, { recursive: true })
  const tempDir = join(outDir, `.hero-render-${process.pid}-${Date.now()}`)
  const screenshot = join(tempDir, 'screenshot.png')
  const profile = join(tempDir, 'profile')
  mkdirSync(profile, { recursive: true })

  try {
    const args = [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      `--force-device-scale-factor=${scale}`,
      `--window-size=${width},${height}`,
      '--virtual-time-budget=4000',
      '--no-first-run',
      '--no-default-browser-check',
      `--user-data-dir=${profile}`,
      `--screenshot=${screenshot}`,
      pathToFileURL(source).href,
    ]

    const result = spawnSync(browser, args, {
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: RENDER_TIMEOUT_MS,
      windowsHide: true,
    })

    const stderr = (result.stderr ?? '').trim()
    const stdout = (result.stdout ?? '').trim()

    if (result.error) {
      const reason = result.error.code === 'ETIMEDOUT' ? `浏览器 ${RENDER_TIMEOUT_MS / 1000} 秒内没有结束` : result.error.message
      throw new Error(`启动浏览器失败：${reason}\n浏览器：${browser}`)
    }
    if (result.signal) {
      throw new Error(`浏览器被信号 ${result.signal} 终止。\n浏览器：${browser}`)
    }
    if (!existsSync(screenshot)) {
      const detail = [stderr, stdout].filter((line) => line !== '').join('\n')
      throw new Error(
        `浏览器没有生成截图（退出码 ${result.status}）。\n浏览器：${browser}${detail === '' ? '' : `\n输出：\n${detail}`}`,
      )
    }

    const actual = readPngSize(screenshot)
    if (actual.width !== expected.width || actual.height !== expected.height) {
      throw new Error(
        [
          `截图尺寸不符：期望 ${expected.width}x${expected.height}（${width}x${height} @${scale}x），实际 ${actual.width}x${actual.height}。`,
          '浏览器可能没有应用 --force-device-scale-factor 或 --window-size；',
          '可先删除 --out 指向的文件再重试，或检查 --size / --scale 是否传对。',
        ].join('\n'),
      )
    }

    try {
      renameSync(screenshot, out)
    } catch {
      copyFileSync(screenshot, out)
      rmSync(screenshot, { force: true })
    }

    const kilobytes = Math.max(1, Math.round(statSync(out).size / 1024))
    console.log(`hero written: ${displayPath(out)} (${actual.width}x${actual.height}, ${kilobytes} KB)`)
  } finally {
    rmSync(tempDir, { recursive: true, force: true })
  }
}

function main(argv) {
  const { help, options } = parseArgs(argv)
  if (help) {
    console.log(usage())
    return
  }
  render(options)
}

try {
  main(process.argv.slice(2))
} catch (error) {
  if (error instanceof UsageError) {
    console.error(`参数错误：${error.message}\n\n${usage()}`)
    process.exitCode = 2
  } else {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}
