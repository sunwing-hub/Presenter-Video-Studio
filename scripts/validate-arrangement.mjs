import { readFileSync } from 'node:fs'
import { validatePlan, validateCues } from '../src/arrangement.ts'

const [planPath, handoffPath] = process.argv.slice(2)
try {
  if (!planPath || !handoffPath) throw new Error('用法：node scripts/validate-arrangement.mjs plan.json handoff.json')
  const handoff = JSON.parse(readFileSync(handoffPath, 'utf8'))
  if (handoff.format !== 'overlay-studio-handoff' || handoff.version !== 1) throw new Error('需要工作台导出的编排素材文件。')
  const plan = validatePlan(JSON.parse(readFileSync(planPath, 'utf8')), validateCues(handoff.cues), handoff.video?.duration)
  const sorted = [...plan.cards].sort((a, b) => a.start - b.start)
  const overlaps = sorted.filter((card, index) => index && card.start < sorted[index - 1].end).length
  console.log(`校验通过：${plan.cards.length} 张卡片。${overlaps ? `注意：有 ${overlaps} 处时间重叠，请检查布局。` : '没有相邻卡片时间重叠。'}仍需核对文案语义与画面遮挡。`)
} catch (error) { console.error(error.message); process.exitCode = 1 }
