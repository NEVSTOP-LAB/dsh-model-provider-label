#!/usr/bin/env node
/**
 * 校验「图标三处一致」：assets/icons/*.svg 是唯一源文件，lib/client.js 内联同一份 path 数据，
 * assets/hero/source.html 通过相对路径引用同一批 SVG。
 *
 * 零依赖 Node ESM。解析每个 SVG 的 path/circle/rect 几何属性，逐条 d 必须在 client.js 源码中
 * 逐字出现；文件名必须在 FEATURE_ICONS 中有对应键；hero 头图必须引用该 SVG。
 * 任何一项缺失即打印缺失图标名并以退出码 1 结束；全部命中输出一行 icons verified: <n>。
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const iconDir = join(root, 'assets', 'icons')
const clientPath = join(root, 'lib', 'client.js')
const heroPath = join(root, 'assets', 'hero', 'source.html')

const client = readFileSync(clientPath, 'utf8')
const hero = existsSync(heroPath) ? readFileSync(heroPath, 'utf8') : null

/** 读取一个 SVG 中 path/circle/rect 的几何属性。 */
function shapesOf(svg) {
  const shapes = []
  for (const match of svg.matchAll(/<(path|circle|rect)\b([^>]*)>/g)) {
    const attrs = {}
    for (const pair of match[2].matchAll(/([\w-]+)\s*=\s*"([^"]*)"/g)) attrs[pair[1]] = pair[2]
    shapes.push({ tag: match[1], attrs })
  }
  return shapes
}

const files = readdirSync(iconDir)
  .filter((name) => name.endsWith('.svg'))
  .sort()

const missing = []

for (const file of files) {
  const name = file.slice(0, -'.svg'.length)
  const svg = readFileSync(join(iconDir, file), 'utf8')
  const shapes = shapesOf(svg)

  if (!new RegExp(`\\b${name}:\\s*\\[`).test(client)) missing.push(`${name} (FEATURE_ICONS 缺少键)`)
  for (const shape of shapes) {
    if (shape.attrs.d !== undefined && !client.includes(shape.attrs.d)) {
      missing.push(`${name} (${shape.tag} d="${shape.attrs.d}" 未内联)`)
    }
  }
  if (hero !== null && !hero.includes(`icons/${file}`)) missing.push(`${name} (assets/hero/source.html 未引用)`)
}

if (missing.length > 0) {
  for (const item of missing) console.error(`missing icon: ${item}`)
  process.exit(1)
}

console.log(`icons verified: ${files.length}`)
