/**
 * 浏览器探测：render.mjs 与 capture.mjs 共用。
 *
 * 优先使用调用方传入的路径或环境变量 HERO_BROWSER，否则按平台探测本机
 * Microsoft Edge / Google Chrome / Chromium 的常见安装位置与 PATH。
 */

import { existsSync, statSync } from 'node:fs'
import { delimiter, join, resolve, sep } from 'node:path'

export class BrowserMissingError extends Error {}

function stripQuotes(value) {
  return value.trim().replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1')
}

/** 浏览器常见安装位置；Windows 上按需求顺序：Edge（x86 / 64 位）、Chrome（Program Files / 用户目录）。 */
export function browserCandidates() {
  const candidates = []
  const add = (value) => {
    if (typeof value !== 'string' || value === '') return
    if (!candidates.includes(value)) candidates.push(value)
  }

  if (process.platform === 'win32') {
    const programFilesX86 = process.env['ProgramFiles(x86)']
    const programFiles = process.env.ProgramFiles
    const localAppData = process.env.LOCALAPPDATA
    if (programFilesX86) add(join(programFilesX86, 'Microsoft', 'Edge', 'Application', 'msedge.exe'))
    if (programFiles) add(join(programFiles, 'Microsoft', 'Edge', 'Application', 'msedge.exe'))
    if (programFiles) add(join(programFiles, 'Google', 'Chrome', 'Application', 'chrome.exe'))
    if (localAppData) add(join(localAppData, 'Google', 'Chrome', 'Application', 'chrome.exe'))
  } else if (process.platform === 'darwin') {
    add('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
    add('/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge')
    add('/Applications/Chromium.app/Contents/MacOS/Chromium')
    add('/opt/homebrew/bin/chromium')
    add('/usr/local/bin/chromium')
  } else {
    add('/usr/bin/google-chrome')
    add('/usr/bin/google-chrome-stable')
    add('/usr/bin/chromium')
    add('/usr/bin/chromium-browser')
    add('/snap/bin/chromium')
  }

  // PATH 里的浏览器同样算数（Linux 发行版、Homebrew、scoop 等都走这里）。
  const names =
    process.platform === 'win32'
      ? ['msedge.exe', 'chrome.exe']
      : ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'microsoft-edge']
  const pathEntries = (process.env.PATH ?? '').split(delimiter).filter((entry) => entry !== '')
  for (const name of names) {
    for (const entry of pathEntries) add(join(entry, name))
  }

  return candidates
}

/** 返回可用的浏览器可执行文件绝对路径；找不到时抛 BrowserMissingError。 */
export function resolveBrowser(candidates = browserCandidates(), overrideValue = process.env.HERO_BROWSER) {
  const override = stripQuotes(overrideValue ?? '')
  if (override !== '') {
    const absolute = resolve(override)
    if (existsSync(absolute) && statSync(absolute).isFile()) return absolute
    if (!override.includes('/') && !override.includes('\\')) {
      for (const candidate of candidates) {
        if (candidate.toLowerCase().endsWith(sep + override.toLowerCase())) return candidate
      }
    }
    throw new BrowserMissingError(
      `HERO_BROWSER 指定的浏览器不可用：${override}\n请把它指向浏览器可执行文件的完整路径，或删除该环境变量改用自动探测。`,
    )
  }

  for (const candidate of candidates) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate
  }

  throw new BrowserMissingError(
    [
      '未找到可用的 Chromium 系浏览器（Microsoft Edge / Google Chrome / Chromium）。',
      '',
      '已查找：',
      ...candidates.map((candidate) => `  - ${candidate}`),
      '',
      '任选一种方式：',
      '  1) 安装 Microsoft Edge 或 Google Chrome（macOS / Linux 也可安装 Chromium）；',
      '  2) 设置环境变量 HERO_BROWSER 指向浏览器可执行文件，例如：',
      "       Windows PowerShell:  $env:HERO_BROWSER = '<浏览器路径>'",
      '       macOS / Linux:      HERO_BROWSER=/path/to/chrome npm run hero',
    ].join('\n'),
  )
}
