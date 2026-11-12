/**
 * Host 半边：为 NEVSTOP-LAB 定制口味插件提供配置读写。
 *
 * - 路由 `GET/POST /__dsh-nevstop-lab-flavor/config`；
 * - 配置存 `$DSH_HOME/plugin-data/dsh-nevstop-lab-flavor/config.json`（默认 `~/.dsh/...`）；
 * - 写入要求同源请求，读取不设限；
 * - 校验是「总量式」的：任何缺字段、手改坏值都回落到该字段默认值，绝不因配置把插件带崩。
 */
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

export const name = 'dsh-nevstop-lab-flavor'

/** Hard dependency: the HTTP carrier must exist before the route registers. */
export const inject = ['webServer']

export const ROUTE = '/__dsh-nevstop-lab-flavor/config'

export const KEY_BEHAVIORS = ['newline', 'queue', 'steer']

export const DEFAULTS = {
  features: {
    providerLabel: true,
    composerKeys: true,
  },
  composerKeys: {
    enter: 'newline',
    ctrlEnter: 'queue',
    shiftEnter: 'newline',
  },
}

const LIMIT = 8192

function configFile() {
  const home = process.env.DSH_HOME || join(homedir(), '.dsh')
  return join(home, 'plugin-data', 'dsh-nevstop-lab-flavor', 'config.json')
}

function bool(value, fallback) {
  return typeof value === 'boolean' ? value : fallback
}

function behavior(value, fallback) {
  return KEY_BEHAVIORS.includes(value) ? value : fallback
}

/** Coerce any stored value into a complete, valid config. */
export function normalizeConfig(raw) {
  const src = raw !== null && typeof raw === 'object' ? raw : {}
  const features = src.features !== null && typeof src.features === 'object' ? src.features : {}
  const keys = src.composerKeys !== null && typeof src.composerKeys === 'object' ? src.composerKeys : {}
  return {
    features: {
      providerLabel: bool(features.providerLabel, DEFAULTS.features.providerLabel),
      composerKeys: bool(features.composerKeys, DEFAULTS.features.composerKeys),
    },
    composerKeys: {
      enter: behavior(keys.enter, DEFAULTS.composerKeys.enter),
      ctrlEnter: behavior(keys.ctrlEnter, DEFAULTS.composerKeys.ctrlEnter),
      shiftEnter: behavior(keys.shiftEnter, DEFAULTS.composerKeys.shiftEnter),
    },
  }
}

export async function readConfig() {
  try {
    const raw = await readFile(configFile(), 'utf8')
    return normalizeConfig(JSON.parse(raw))
  } catch {
    return normalizeConfig(DEFAULTS)
  }
}

export async function writeConfig(value) {
  const config = normalizeConfig(value)
  const file = configFile()
  await mkdir(dirname(file), { recursive: true })
  const tmp = file + '.tmp-' + process.pid
  await writeFile(tmp, JSON.stringify(config, null, 2) + '\n', 'utf8')
  await rename(tmp, file)
  return config
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let text = ''
    req.on('data', (chunk) => {
      text += chunk
      if (text.length > LIMIT) {
        reject(new Error('too large'))
        req.destroy()
      }
    })
    req.on('end', () => resolve(text))
    req.on('error', reject)
  })
}

function sendJson(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
  res.end(JSON.stringify(body))
}

function sameOrigin(req) {
  const origin = req.headers.origin
  if (typeof origin !== 'string' || origin === '') return false
  try {
    return new URL(origin).host === req.headers.host
  } catch {
    return false
  }
}

export async function handleConfigRequest(req, res) {
  try {
    if (req.method === 'GET' || req.method === 'HEAD') {
      sendJson(res, 200, { ok: true, config: await readConfig() })
      return
    }
    if (req.method !== 'POST') {
      res.writeHead(405, { allow: 'GET, HEAD, POST' })
      res.end()
      return
    }
    if (!sameOrigin(req)) {
      sendJson(res, 403, { ok: false, error: 'same-origin request required' })
      return
    }
    const text = await readBody(req)
    let parsed = {}
    try {
      parsed = JSON.parse(text || '{}')
    } catch {
      sendJson(res, 400, { ok: false, error: 'invalid json' })
      return
    }
    sendJson(res, 200, { ok: true, config: await writeConfig(parsed) })
  } catch {
    sendJson(res, 400, { ok: false, error: 'bad request' })
  }
}

export function apply(ctx) {
  ctx.inject(['webServer'], (scope) => {
    const webServer = scope.get('webServer')
    scope.effect(
      () => webServer.register({ kind: 'exact', path: ROUTE, handler: handleConfigRequest }),
      'dsh-nevstop-lab-flavor: config route',
    )
  })
}
