#!/usr/bin/env node
// 统一模板目录生成器（方案第一阶段）
// 唯一事实来源：templates/*/*/manifest.json + templates/README.md + src/templates/referenceLibrary.ts
// 用法：
//   node scripts/template-catalog.mjs            # 生成 templates/catalog.json
//   node scripts/template-catalog.mjs --check    # 校验 catalog.json 是否与当前模板状态一致
//   node scripts/template-catalog.mjs --stdout   # 只打印，不写文件
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const TPL_DIR = path.join(ROOT, 'templates')
const OUT = path.join(TPL_DIR, 'catalog.json')

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'))
}

// referenceLibrary.ts 是页面展示用的轻量目录（const 数组，非标准 JSON），用正则提取条目
function parseReferenceLibrary() {
  const src = fs.readFileSync(path.join(ROOT, 'src/templates/referenceLibrary.ts'), 'utf8')
  const entries = []
  const re = /\{\s*id:'([^']+)'\s*,\s*name:'([^']+)'\s*,\s*kind:'([^']+)'\s*,\s*description:'([^']*)'\s*,\s*previewUrl:'([^']*)'\s*,\s*coverUrl:'([^']*)'\s*,?\s*\}/g
  let m
  while ((m = re.exec(src))) {
    entries.push({ id: m[1], name: m[2], kind: m[3], description: m[4], previewUrl: m[5], coverUrl: m[6] })
  }
  return entries
}

function categorize(manifest, relDir) {
  if (manifest.kind === 'learning-reference' || manifest.referenceOnly) return 'learning-reference'
  if (manifest.kind === 'native-template' || manifest.kind === 'native-audio-explainer') return 'native-template'
  if (manifest.visualTheme && !manifest.kind) return 'visual-theme'
  if (relDir.startsWith('professional-extension')) return 'archive-candidate'
  return 'unclassified'
}

const CATEGORY_LABEL = {
  'learning-reference': '学习参考：只用于提炼编排方式，不作为可直接渲染的模板',
  'native-template': '原生可制作模板：有专用渲染器，可创建新片（验收状态见 acceptance）',
  'visual-theme': '全片主题约束：同片单主题，不按镜头切换深浅',
  'archive-candidate': '历史候选/溯源：不作为新片默认入口',
  unclassified: '未分类：需人工确认',
}

// 展示口径补充（manifest 未覆盖的字段），带来源说明，避免机读目录凭空断言
const PRESENTATION = {
  'team.yanye-faceless': '无露脸：全片无人物视频，原声驱动整屏图解（manifest: nativeDedicatedRenderer, AIenabled=false）',
  'team.yanye-knowledge-paid': '真人出镜参考片（学习用，不代表自有制作需要真人）',
  'team.scene-narration': '真人讲述＋场景补充＋数据关系图解；AI 只补关键场景',
  'team.dark-tech': '与镜头类型无关；仅约束全片底色与强调色',
  'team.white-flow': '与镜头类型无关；仅约束全片底色与强调色',
}

function buildEntry(manifestPath, refLibrary) {
  const manifest = readJson(manifestPath)
  const versionDir = path.dirname(manifestPath)
  const relVersionDir = path.relative(ROOT, versionDir)
  const relDir = path.relative(TPL_DIR, path.dirname(versionDir))
  const category = categorize(manifest, relDir)
  const normId = manifest.id.replace(/\.native$/, '')
  const lib = refLibrary.find(e => e.id.replace(/\.native$/, '') === normId)
  const status = manifest.status || ''
  const exists = p => p && fs.existsSync(path.resolve(versionDir, p))

  return {
    id: manifest.id,
    version: manifest.version,
    name: manifest.name,
    category,
    categoryNote: CATEGORY_LABEL[category],
    description: lib?.description || manifest.description || null,
    production: {
      readyForNewFilm: category === 'native-template' || category === 'visual-theme',
      pendingUserReview: /待用户审片|待验证|pending|review/i.test(status) && !/通过.*验收|userAccepted/.test(status),
      statusRaw: status,
    },
    presentation: PRESENTATION[manifest.id] || null,
    visualThemes: {
      default: manifest.defaultVisualTheme || manifest.visualTheme || null,
      allowed: manifest.allowedVisualThemes || (manifest.visualTheme ? [manifest.visualTheme] : null),
      themePolicy: manifest.themePolicy || '同片单主题（templates/README.md 长期偏好）',
    },
    canvas: {
      verified: manifest.verifiedCanvas || manifest.aspects || null,
      sourceCanvas: manifest.sourceCanvas || null,
      sourceFps: manifest.sourceFps || null,
    },
    paths: {
      manifest: path.relative(ROOT, manifestPath),
      versionDir: relVersionDir,
      spec: exists('README.md') ? path.join(relVersionDir, 'README.md') : null,
      controls: exists(manifest.controls) ? path.join(relVersionDir, manifest.controls) : null,
      recipe: exists(manifest.recipe) ? path.join(relVersionDir, manifest.recipe) : null,
      analysis: exists(manifest.analysis) ? path.join(relVersionDir, manifest.analysis) : null,
      aiShots: manifest.aiShots && exists(manifest.aiShots) ? path.join(relVersionDir, manifest.aiShots) : null,
      renderer: manifest.renderer || manifest.entry || null,
      factory: manifest.factory || null,
      validation: manifest.validation || manifest.contract || null,
    },
    assets: {
      exampleProject: manifest.exampleProject && fs.existsSync(path.resolve(versionDir, manifest.exampleProject))
        ? path.relative(ROOT, path.resolve(versionDir, manifest.exampleProject)) : null,
      deliveryVideo: manifest.deliveryVideo || null,
      previewUrl: manifest.previewUrl || lib?.previewUrl || null,
      coverUrl: manifest.coverUrl || lib?.coverUrl || null,
      sourceAsset: manifest.sourceAsset || null,
      sourceSha256: manifest.sourceSha256 || null,
    },
    constraints: {
      nativeDedicatedRenderer: manifest.nativeDedicatedRenderer ?? null,
      referenceOnly: manifest.referenceOnly ?? null,
      AIenabled: manifest.AIenabled ?? null,
      adoption: manifest.adoption || null,
      nativeIntegration: manifest.nativeIntegration || null,
      notSupported: manifest.support?.notSupported || null,
      revisionNotes: manifest.revisionNotes || null,
      provenance: manifest.provenance || null,
    },
  }
}

function buildCatalog() {
  const refLibrary = parseReferenceLibrary()
  const entries = []
  const versionsWithoutManifest = []
  for (const tpl of fs.readdirSync(TPL_DIR, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (!tpl.isDirectory() || tpl.name === '.DS_Store') continue
    for (const ver of fs.readdirSync(path.join(TPL_DIR, tpl.name), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (!ver.isDirectory()) continue
      const mf = path.join(TPL_DIR, tpl.name, ver.name, 'manifest.json')
      if (fs.existsSync(mf)) entries.push(buildEntry(mf, refLibrary))
      else versionsWithoutManifest.push(`templates/${tpl.name}/${ver.name}`)
    }
  }
  const libOnly = refLibrary.filter(e => !entries.some(t => t.id.replace(/\.native$/, '') === e.id.replace(/\.native$/, '')))
  return {
    schema: 'overlay-studio/template-catalog@1',
    generatedAt: new Date().toISOString(),
    generator: 'scripts/template-catalog.mjs',
    sourceOfTruth: 'templates/*/*/manifest.json（本文件为派生汇总，请勿手工编辑；改模板后重新生成）',
    workbenchRoot: '.',
    notes: [
      '学习参考（learning-reference）只用于提炼编排方式，不标为可直接渲染模板。',
      '成片已产出不等于所有题材均可直接套用；换题材需按 controls/规范参数化场景内文。',
      '模板版本在任务创建时固定，中心更新不影响已建任务。',
      versionsWithoutManifest.length ? `以下版本目录暂无 manifest.json，未列入模板条目：${versionsWithoutManifest.join('、')}` : null,
      libOnly.length ? `以下条目仅存在于页面展示目录 referenceLibrary.ts，无模板版本目录：${libOnly.map(e => e.id).join('、')}` : null,
    ].filter(Boolean),
    referenceLibraryPage: refLibrary,
    templates: entries,
  }
}

const arg = process.argv[2] || ''
const catalog = buildCatalog()
const json = JSON.stringify(catalog, null, 2) + '\n'
if (arg === '--stdout') {
  process.stdout.write(json)
} else if (arg === '--check') {
  if (!fs.existsSync(OUT)) { console.error('catalog.json 不存在，请先生成'); process.exit(1) }
  const current = fs.readFileSync(OUT, 'utf8')
  // generatedAt 每次变化，仅比较 templates/notes 等内容部分
  const strip = s => { const o = JSON.parse(s); delete o.generatedAt; return JSON.stringify(o) }
  if (strip(current) === strip(json)) { console.log('OK: catalog.json 与当前模板状态一致') }
  else { console.error('STALE: 模板状态已变化，请重新运行 node scripts/template-catalog.mjs'); process.exit(2) }
} else {
  fs.writeFileSync(OUT, json)
  console.log(`已生成 ${path.relative(ROOT, OUT)}：${catalog.templates.length} 个模板条目，${catalog.referenceLibraryPage.length} 个页面展示条目`)
  for (const n of catalog.notes) console.log(`  - ${n}`)
}
