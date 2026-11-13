/**
 * Host 半边：为 NEVSTOP-LAB 定制口味插件提供配置读写。
 *
 * - 路由 `GET/POST /__dsh-nevstop-lab-flavor/config`；
 * - 配置存 `$DSH_HOME/plugin-data/dsh-nevstop-lab-flavor/config.json`（默认 `~/.dsh/...`）；
 * - 写入要求同源请求，读取不设限；
 * - 校验是「总量式」的：任何缺字段、手改坏值都回落到该字段默认值，绝不因配置把插件带崩。
 */
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { BalanceRingService } from './balance/index.js'
import { CONFIG_PATH as BALANCE_CONFIG_PATH, handleConfigRequest as handleBalanceConfigRequest } from './balance/config.js'
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
    sidebarPanels: true,
    balanceChip: true,
    activeSessions: true,
    busyWorkspaceCompat: true,
  },
  composerKeys: {
    enter: 'newline',
    ctrlEnter: 'queue',
    shiftEnter: 'newline',
    altEnter: 'steer',
  },
  activeSessions: {
    windowHours: 12,
    fallbackCount: 5,
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

function count(value, fallback, min, max) {
  if (value === null || value === undefined || value === '') return fallback
  const number = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.min(max, Math.max(min, Math.round(number)))
}

/** Coerce any stored value into a complete, valid config. */
export function normalizeConfig(raw) {
  const src = raw !== null && typeof raw === 'object' ? raw : {}
  const features = src.features !== null && typeof src.features === 'object' ? src.features : {}
  const keys = src.composerKeys !== null && typeof src.composerKeys === 'object' ? src.composerKeys : {}
  const active = src.activeSessions !== null && typeof src.activeSessions === 'object' ? src.activeSessions : {}
  return {
    features: {
      providerLabel: bool(features.providerLabel, DEFAULTS.features.providerLabel),
      composerKeys: bool(features.composerKeys, DEFAULTS.features.composerKeys),
      sidebarPanels: bool(features.sidebarPanels, DEFAULTS.features.sidebarPanels),
      balanceChip: bool(features.balanceChip, DEFAULTS.features.balanceChip),
      activeSessions: bool(features.activeSessions, DEFAULTS.features.activeSessions),
      busyWorkspaceCompat: bool(features.busyWorkspaceCompat, DEFAULTS.features.busyWorkspaceCompat),
    },
    composerKeys: {
      enter: behavior(keys.enter, DEFAULTS.composerKeys.enter),
      ctrlEnter: behavior(keys.ctrlEnter, DEFAULTS.composerKeys.ctrlEnter),
      shiftEnter: behavior(keys.shiftEnter, DEFAULTS.composerKeys.shiftEnter),
      altEnter: behavior(keys.altEnter, DEFAULTS.composerKeys.altEnter),
    },
    activeSessions: {
      windowHours: count(active.windowHours, DEFAULTS.activeSessions.windowHours, 1, 168),
      fallbackCount: count(active.fallbackCount, DEFAULTS.activeSessions.fallbackCount, 1, 50),
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
  ctx.plugin(BalanceRingService)
  ctx.inject(['webServer'], (scope) => {
    const webServer = scope.get('webServer')
    scope.effect(
      () => webServer.register({ kind: 'exact', path: ROUTE, handler: handleConfigRequest }),
      'dsh-nevstop-lab-flavor: config route',
    )
    scope.effect(() => webServer.register({ kind: 'exact', path: BALANCE_CONFIG_PATH, handler: handleBalanceConfigRequest }), 'dsh-nevstop-lab-flavor: balance config route')
  })
}

