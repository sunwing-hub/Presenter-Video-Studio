#!/usr/bin/env node
// Overlay Studio 本地通用调用入口（第一阶段：只读）
// 对应接入方案 §5「拟提供的通用操作」的首批子集，均为只读，不产生付费任务、不修改工程。
// 用法：
//   node scripts/studio-cli.mjs env-check
//   node scripts/studio-cli.mjs list-templates [--category native-template] [--json]
//   node scripts/studio-cli.mjs read-spec <templateId> [--version <v>] [--json]
//   node scripts/studio-cli.mjs open-project <工程.json路径> [--json]
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const CATALOG = path.join(ROOT, 'templates/catalog.json')
const RULES = path.join(ROOT, 'templates/team-rules.json')

const args = process.argv.slice(2)
const cmd = args[0]
const flags = {}
const positional = []
for (let i = 1; i < args.length; i++) {
  if (args[i].startsWith('--')) { flags[args[i].slice(2)] = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : true }
  else positional.push(args[i])
}

function loadCatalog({ allowStale = false } = {}) {
  if (!fs.existsSync(CATALOG)) return { error: 'templates/catalog.json 不存在，请先运行 node scripts/template-catalog.mjs' }
  try {
    execFileSync(process.execPath, [path.join(ROOT, 'scripts/template-catalog.mjs'), '--check'], { cwd: ROOT, stdio: 'pipe' })
  } catch {
    if (!allowStale) return { error: 'catalog.json 已过期（模板状态有变化），请先运行 node scripts/template-catalog.mjs 重新生成' }
  }
  return { catalog: JSON.parse(fs.readFileSync(CATALOG, 'utf8')) }
}

function envCheck() {
  const checks = []
  const add = (name, ok, detail) => checks.push({ name, ok, detail })
  const v = process.version
  add('node', (Number(v.slice(1).split('.')[0]) > 22 || (Number(v.slice(1).split('.')[0]) === 22 && Number(v.slice(1).split('.')[1]) >= 18)), v)
  const ffLocal = path.join(ROOT, 'node_modules/ffmpeg-static', process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg')
  const ffOk = fs.existsSync(ffLocal)
  add('ffmpeg(工作台内置)', ffOk, ffOk ? ffLocal : '未找到，需先 npm install')
  add('node_modules', fs.existsSync(path.join(ROOT, 'node_modules')), fs.existsSync(path.join(ROOT, 'node_modules')) ? '已安装' : '缺失')
  add('模板目录 templates/', fs.existsSync(path.join(ROOT, 'templates')), 'manifest 事实来源')
  add('团队规则 team-rules.json', fs.existsSync(RULES), fs.existsSync(RULES) ? '存在' : '缺失')
  try {
    execFileSync(process.execPath, [path.join(ROOT, 'scripts/template-catalog.mjs'), '--check'], { cwd: ROOT, stdio: 'pipe' })
    add('统一目录 catalog.json', true, '存在且与模板状态一致')
  } catch (e) {
    add('统一目录 catalog.json', false, String(e.stderr || e.message || '过期或缺失').trim().slice(0, 120))
  }
  add('导出目录 exports/', fs.existsSync(path.join(ROOT, 'exports')), fs.existsSync(path.join(ROOT, 'exports')) ? '存在' : '缺失')
  const bad = checks.filter(c => !c.ok)
  return { overall: bad.length ? 'incomplete' : 'ok', missingCount: bad.length, checks }
}

function listTemplates() {
  const { catalog, error } = loadCatalog()
  if (error) return { error }
  let list = catalog.templates
  if (flags.category) list = list.filter(t => t.category === flags.category)
  if (flags.json) return { catalog: { generatedAt: catalog.generatedAt, notes: catalog.notes, templates: list, teamRules: RULES } }
  return {
    generatedAt: catalog.generatedAt,
    notes: catalog.notes,
    teamRules: RULES,
    templates: list.map(t => ({
      id: t.id, version: t.version, name: t.name, category: t.category,
      readyForNewFilm: t.production.readyForNewFilm, pendingUserReview: t.production.pendingUserReview,
      themes: t.visualThemes.allowed, canvas: t.canvas.verified,
      statusRaw: t.production.statusRaw,
    })),
    usage: '选定后运行 read-spec <id> 读取详细控制规范；版本在任务创建时固定。',
  }
}

function readSpec(id) {
  if (!id) return { error: '用法：read-spec <templateId> [--version <v>]' }
  const { catalog, error } = loadCatalog()
  if (error) return { error }
  let entries = catalog.templates.filter(t => t.id === id || t.id.replace(/\.native$/, '') === id.replace(/\.native$/, ''))
  if (flags.version) entries = entries.filter(t => t.version === flags.version)
  if (!entries.length) return { error: `未找到模板 ${id}${flags.version ? `（版本 ${flags.version}）` : ''}；可用 list-templates 查看` }
  const pick = flags.version || entries.map(e => e.version).sort().at(-1)
  const entry = entries.find(e => e.version === pick)
  const spec = { entry }
  if (entry.paths.controls && fs.existsSync(path.join(ROOT, entry.paths.controls))) {
    const controls = JSON.parse(fs.readFileSync(path.join(ROOT, entry.paths.controls), 'utf8'))
    spec.controlsSummary = controls && typeof controls === 'object'
      ? Object.fromEntries(Object.entries(controls).map(([k, val]) => [k, Array.isArray(val) ? `array(${val.length})` : val && typeof val === 'object' ? `object(${Object.keys(val).length} keys)` : val]))
      : controls
    spec.controlsFullPath = entry.paths.controls
  }
  if (entry.paths.spec && fs.existsSync(path.join(ROOT, entry.paths.spec))) {
    spec.specMarkdown = fs.readFileSync(path.join(ROOT, entry.paths.spec), 'utf8')
  }
  return spec
}

function openProject(p) {
  if (!p) return { error: '用法：open-project <工程.json路径>' }
  const abs = path.resolve(ROOT, p)
  if (!fs.existsSync(abs)) return { error: `工程不存在：${abs}` }
  const raw = fs.readFileSync(abs, 'utf8')
  let proj
  try { proj = JSON.parse(raw) } catch (e) { return { error: `JSON 解析失败：${e.message}` } }
  const summary = {
    path: path.relative(ROOT, abs) || abs,
    bytes: raw.length,
    topLevelKeys: Object.keys(proj),
  }
  for (const key of ['visualTheme', 'fps', 'canvas', 'width', 'height']) if (proj[key] !== undefined) summary[key] = proj[key]
  for (const key of ['shots', 'scenes', 'tracks', 'clips', 'captions']) {
    if (Array.isArray(proj[key])) summary[key] = `array(${proj[key].length})`
  }
  // 扫描工程内引用的本地媒体路径（深度 6 以内），报告缺失项
  const missing = new Set()
  const refs = new Set()
  const walk = (node, depth) => {
    if (!node || typeof node !== 'object' || depth > 6) return
    if (typeof node === 'string') {
      const m = node.match(/^\/(Users|Volumes)\/.+\.(mp4|mov|wav|mp3|png|jpg|jpeg|webm|m4a|srt)$/i)
      if (m) refs.add(node)
      return
    }
    for (const v of Array.isArray(node) ? node : Object.values(node)) walk(v, depth + 1)
  }
  walk(proj, 0)
  for (const r of refs) if (!fs.existsSync(r)) missing.add(r)
  summary.localMediaRefs = refs.size
  summary.missingMedia = [...missing].slice(0, 10)
  summary.readonly = true
  return summary
}

let result
switch (cmd) {
  case 'env-check': result = envCheck(); break
  case 'list-templates': result = listTemplates(); break
  case 'read-spec': result = readSpec(positional[0]); break
  case 'open-project': result = openProject(positional[0]); break
  case 'rules': result = JSON.parse(fs.readFileSync(RULES, 'utf8')); break
  default:
    result = { error: '未知命令。可用：env-check / list-templates / read-spec <id> / open-project <path> / rules（全部只读，不产生付费任务）' }
}
const out = JSON.stringify(result, null, 2)
process.stdout.write(out + '\n')
if (result && result.error) process.exit(1)
