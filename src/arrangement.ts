import {validateLayouts,type LayoutClip} from './layoutTimeline.ts'
/** Serializable contract shared by the editor and the Presenter Video Studio skill. Times are seconds. */
export type SubtitleCue = { id: string; start: number; end: number; text: string }
export const scriptTemplates = [
  { id: 'orbitcards', label: '彩色卡片环绕展开' },
  { id: 'metric', label: '核心数字' }, { id: 'compare', label: '左右对比' },
  { id: 'rail', label: '分步信息' }, { id: 'list', label: '要点清单' },
  { id: 'question', label: '提问引导' }, { id: 'bottomquote', label: '底部金句' },
  { id: 'transition', label: '章节过渡' }, { id: 'agenda', label: '目录导览' },
  { id: 'timeline', label: '时间轴' }, { id: 'tags', label: '标签云' },
  { id: 'triad', label: '三列重点' }, { id: 'progress', label: '进度展示' },
  { id: 'person', label: '人物介绍' }, { id: 'loop', label: '闭环流程' },
  { id: 'ring', label: '圆环进度' }, { id: 'gauge', label: '半圆仪表' },
  { id: 'fan', label: '扇形要点' }, { id: 'bubbles', label: '圆形关键词' },
  { id: 'ribbon', label: '长条重点' }, { id: 'orbitflow', label: '环形协作' },
  { id: 'embed', label: '方案嵌入' }, { id: 'merge', label: '能力汇合' },
  { id: 'symbol', label: '符号叙事' },
  { id: 'skillorbit', label: '技能环绕' }, { id: 'mediawall', label: '素材拼贴' }, { id: 'pipeline', label: '流程泳道' },
  { id: 'appcluster', label: '应用聚合' }, { id: 'splitboard', label: '左右双面板' }, { id: 'documentgrid', label: '资料网格' },
  { id: 'flowline', label: '横向流程' }, { id: 'floatingframes', label: '浮动截图' }, { id: 'dualmetric', label: '双指标' },
  { id: 'archflow', label: '拱形连接' },
  { id: 'thinkcloud', label: '思考云' }, { id: 'questionstack', label: '问句气泡' },
  { id: 'appburst', label: '应用喷发' }, { id: 'docrelay', label: '文档接力' },
  { id: 'choicehub', label: '选项聚焦' }, { id: 'checknote', label: '逐项勾选' },
  { id: 'growthpath', label: '阶梯成长' }, { id: 'actionwindow', label: '界面操作' },
  { id: 'alertstamp', label: '撕纸强调' },
  { id: 'arrowcallout', label: '操作箭头' }, { id: 'beforeafter', label: '前后变形' },
  { id: 'filedrawer', label: '文件收纳' }, { id: 'insightpulse', label: '观点汇合' },
  { id: 'editpain', label: '剪辑耗时 · 剪刀与时间轴' }, { id: 'commandrun', label: '命令成片 · 输入到输出' },
  { id: 'workflowmap', label: '五步流程 · 图标路径' }, { id: 'scriptread', label: '字幕文档 · 时间对齐' },
  { id: 'rhythmscan', label: '气口节奏 · 波形扫描' }, { id: 'motionmatch', label: '语义匹配 · 图标组合' },
  { id: 'screenblend', label: '窗口融合 · 拖动缩放' }, { id: 'exportpaths', label: '双格式导出 · 文件层' },
  { id: 'commentprompt', label: '评论互动 · 对话与邀请' },
] as const
export type ScriptTemplate = typeof scriptTemplates[number]['id']
export type ScriptContent = { title: string; items: string[]; value: string; note: string; placement: 'left' | 'right' | 'bottom'; palette?: 'indigo' | 'blue' | 'warm' | 'symbol' | 'flow'; motion?: number; minimal?: boolean }
export type PlanCard = { start: number; end: number; sceneId: ScriptTemplate; content: ScriptContent; cueIds: string[]; reason: string }
export type ArrangementPlan = { format: 'overlay-studio-plan'; version: 1; cards: PlanCard[]; layouts?:LayoutClip[] }

const timestamp = (value: string) => {
  const match = value.trim().match(/^(\d{2,}):([0-5]\d):([0-5]\d)[,.](\d{3})$/)
  return match ? Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]) + Number(match[4]) / 1000 : NaN
}
export function parseSrt(raw: string): { cues: SubtitleCue[]; warnings: string[] } {
  const cues: SubtitleCue[] = [], warnings: string[] = []
  const blocks = raw.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').trim().split(/\n\s*\n/)
  blocks.forEach((block, index) => {
    const lines = block.split('\n'), timeLine = lines.findIndex(line => line.includes('-->'))
    if (timeLine < 0) { warnings.push(`第 ${index + 1} 段缺少时间码，已跳过。`); return }
    const [from, to] = lines[timeLine].split('-->'), start = timestamp(from), end = timestamp(to)
    const text = lines.slice(timeLine + 1).join(' ').replace(/<[^>]*>/g, '').trim()
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || !text) {
      warnings.push(`第 ${index + 1} 段时间或文字无效，已跳过。`); return
    }
    cues.push({ id: `cue-${index + 1}`, start, end, text })
  })
  if (!cues.length) throw new Error('没有读到有效字幕，请选择 UTF-8 编码、带时间码的 SRT 文件。')
  if (cues.length > 20000) throw new Error('字幕超过 20000 段，请分段导入。')
  cues.sort((a, b) => a.start - b.start)
  if (cues.some((cue, i) => i > 0 && cue.start < cues[i - 1].end)) warnings.push('部分字幕时间重叠；草稿会避免卡片互相叠加。')
  return { cues, warnings }
}

export function validateCues(input: unknown): SubtitleCue[] {
  if (!Array.isArray(input) || input.length > 20000) throw new Error('字幕数据格式不正确。')
  const ids = new Set<string>()
  return input.map(cue => {
    if (!cue || typeof cue.id !== 'string' || ids.has(cue.id) || typeof cue.text !== 'string' || !cue.text.trim() || !Number.isFinite(cue.start) || !Number.isFinite(cue.end) || cue.start < 0 || cue.end <= cue.start) throw new Error('字幕编号、文字或时间无效。')
    ids.add(cue.id)
    return { id: cue.id, text: cue.text, start: cue.start, end: cue.end }
  }).sort((a, b) => a.start - b.start)
}

type ReferenceMatch = { sceneId: ScriptTemplate; reason: string; title: string; items: string[]; note?: string }
/** Conservative matches: a visual metaphor is used only when the narration actually supplies its parts. */
export function matchReferenceMotion(text: string): ReferenceMatch | null {
  const clauses = text.split(/[，,；;。！？?!\n]/).map(s => s.trim()).filter(Boolean)
  const short = text.trim()
  if (/(?:朋友|同行|同事).*(?:聊|讨论|交流)/.test(text) && /(?:相近|类似|几乎一样).*(?:判断|结论|看法)/.test(text)) {
    const group = text.match(/(?:企业服务的朋友|几位朋友|同行|同事)/)?.[0] ?? '交流中的观点'
    const finding = text.match(/(?:几乎一样的判断|相近的判断|类似的判断|几乎一样的结论|相近的结论|类似的看法)/)?.[0]
    if (finding) return { sceneId: 'insightpulse', reason: '口播先说与多人交流，再说判断趋同；线条逐段汇合，不虚构具体意见。', title: finding, items: [group] }
  }
  const orderedStages = (patterns: RegExp[]) => {
    const picked: string[] = []
    let next = 0
    for (const pattern of patterns) {
      const index = clauses.findIndex((clause, at) => at >= next && pattern.test(clause))
      if (index < 0) return null
      picked.push(clauses[index])
      next = index + 1
    }
    return picked
  }
  const documentStages = orderedStages([/(?:初稿|草稿)/, /(?:人工|自己|手动).*(?:修改|调整|审核)/, /(?:完成|成稿|交付)/])
  if (documentStages) {
    return { sceneId: 'docrelay', reason: '文案明确包含初稿、人工修改和完成三个步骤。', title: '从初稿到完成', items: documentStages }
  }
  if (/(?:待办|核对|检查)清单/.test(text) && clauses.length >= 3) {
    return { sceneId: 'checknote', reason: '文案明确列出可逐项勾选的清单。', title: clauses[0], items: clauses.slice(1, 5) }
  }
  if (/(?:资料|文件|文档)/.test(text) && /(?:整理|归档|收纳)/.test(text) && clauses.length >= 3) {
    return { sceneId: 'filedrawer', reason: '文案列出了要整理或归档的资料。', title: clauses[0], items: clauses.slice(1, 4) }
  }
  const before = clauses.find(clause => /(?:普通|一般|通用)/.test(clause) && !/(?:专属|个性|像你|更像)/.test(clause))
  const after = clauses.find(clause => /(?:专属|个性|像你|更像)/.test(clause) && !/(?:普通|一般|通用)/.test(clause))
  if (before && after) {
    return { sceneId: 'beforeafter', reason: '文案给出了明确的前后两种状态。', title: '前后变化', items: [before, after] }
  }
  const growthStages = orderedStages([/(?:先做|先从|第一步|先完成|先把|一步步从)/, /(?:养成习惯|第二步|然后)/, /(?:再加|第三步|最后再)/])
  if (growthStages) {
    return { sceneId: 'growthpath', reason: '文案包含递进的三个阶段。', title: '一步步向前', items: growthStages }
  }
  if (/(?:工具|应用|软件)/.test(text) && /(?:包括|包含|整合|汇集)/.test(text) && clauses.length >= 4) {
    return { sceneId: 'appburst', reason: '文案在介绍多种工具或应用的汇集。', title: clauses[0], items: clauses.slice(1, 5) }
  }
  if (/(?:筛选|比较|排除)/.test(text) && /(?:最终|最后).*(?:选择|选中|留下)/.test(text) && clauses.length >= 3) {
    return { sceneId: 'choicehub', reason: '文案列出备选项，并明确给出最终选择。', title: clauses.at(-1)!, items: clauses.slice(0, -1).slice(0, 4) }
  }
  const questions = short.match(/[？?]/g)?.length ?? 0
  if (questions >= 2 && clauses.length >= 2) {
    return { sceneId: 'questionstack', reason: '文案连续提出多个具体问题。', title: '这些问题，都可以问', items: clauses.slice(0, 4) }
  }
  if (questions && /(?:到底|究竟|能帮|能做|怎么办)/.test(text) && short.length <= 36) {
    return { sceneId: 'thinkcloud', reason: '短设问适合以思考云展开。', title: short, items: [] }
  }
  if (/(?:点击|点开|按下).*(?:保存|创建|确认)|保存为(?:智能体|助手)/.test(text) && short.length <= 36) {
    const button = short.replace(/^(?:点击|点开|按下)(?:按钮)?/, '').replace(/[。！!]+$/, '').trim()
    return { sceneId: 'actionwindow', reason: '文案描述一次明确的界面操作。', title: short, items: [], note: button || short }
  }
  if (/^(?:复制粘贴|直接使用|下一步|立即开始|开始行动)/.test(short) && short.length <= 16) {
    return { sceneId: 'arrowcallout', reason: '短操作指令适合方向箭头。', title: short, items: [] }
  }
  if (/^(?:别等|别再|注意|警惕|马上|立即)/.test(short) && short.length <= 16) {
    return { sceneId: 'alertstamp', reason: '短促提醒适合强调贴纸。', title: short, items: [] }
  }
  return null
}

export function draftCards(cues: SubtitleCue[], videoDuration?: number): PlanCard[] {
  const cards: PlanCard[] = []
  const stepHeading = /^(?:第[一二三四五六七八九十\d]+(?:步|点|章|部分)|第[一二三四五六七八九十\d]+个[，,：:\s]?)/
  const topicHeading = (text: string) => stepHeading.test(text.trim()) || /^(?:(?:整个|全部|完整)?流程\s*[一二三四五六七八九十\d]+步|以前|过去)/.test(text.trim())
  let lastEnd = -2
  for (let i = 0; i < cues.length; i++) {
    if (cards.length >= 500) break
    const first = cues[i]
    if (videoDuration && first.end > videoDuration) continue
    if (first.start < lastEnd) continue
    const group = [first]
    // Keep a complete thought together, without consuming the following topic.
    while (i + 1 < cues.length && !topicHeading(cues[i + 1].text) && !(/^(?:以前|过去)/.test(first.text) && group.some(c => /^(?:而现在|现在|如今)/.test(c.text))) && (!videoDuration || cues[i + 1].end <= videoDuration) && group.map(c => c.text).join('').length < 48 && !/[。？！?!]$|多久|多少/.test(group.at(-1)!.text) && cues[i + 1].end - first.start <= 9 && cues[i + 1].start - group.at(-1)!.end < 1) group.push(cues[++i])
    const text = group.map(c => c.text).join(' ')
    const sentences = text.split(/[，,；;。\n]/).map(s => s.trim()).filter(Boolean)
    const number = text.match(/[+−-]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?\s*(?:%|％|亿|万|元|倍|小时|分钟|秒|个|年|步)/)?.[0]
    const spokenClauses = group.flatMap(cue => cue.text.split(/[，,；;。\n]/).map(s => s.trim()).filter(Boolean))
    const nowIndex = spokenClauses.findIndex((clause, index) => index > 0 && /^(?:而现在|现在|如今)/.test(clause))
    const spokenCompare = nowIndex > 0 && /(?:以前|过去)/.test(spokenClauses.slice(0, nowIndex).join(''))
      ? [spokenClauses.slice(0, nowIndex).join('，'), spokenClauses.slice(nowIndex).join('，')] : null
    const referenceMatch = matchReferenceMotion(text)
    let sceneId: ScriptTemplate = 'bottomquote', reason = '提取当前字幕中的完整短句。'
    if (stepHeading.test(first.text)) { sceneId = 'transition'; reason = '字幕出现步骤或章节标题，按原时间点呈现，不依赖标点。' }
    else if (referenceMatch) { sceneId = referenceMatch.sceneId; reason = referenceMatch.reason }
    else if (/[？?]|为什么|如何|你会|怎么选|多久|多少/.test(text)) { sceneId = 'question'; reason = '字幕包含提问。' }
    else if (/第[一二三四五六七八九十\d]+(?:步|点|章|部分)/.test(text)) { sceneId = 'transition'; reason = '字幕出现章节提示。' }
    else if (/(首先|第一).*(然后|其次|第二)/.test(text) && sentences.length > 1) { sceneId = 'rail'; reason = '字幕包含有顺序的步骤。' }
    else if (/今天.*(讲|聊|分享)/.test(text) && sentences.length > 1) { sceneId = 'agenda'; reason = '字幕在介绍本期内容。' }
    else if (/(历程|发展|从.*到|阶段|时间线)/.test(text) && sentences.length > 1) { sceneId = 'timeline'; reason = '字幕在回顾多个发展节点。' }
    else if (/(闭环|循环|回流|持续迭代)/.test(text) && sentences.length > 1) { sceneId = 'loop'; reason = '字幕描述循环或闭环关系。' }
    else if (/(关键词|标签|领域|行业)/.test(text) && /(比如|包括|涵盖|分别)/.test(text) && sentences.length > 1) { sceneId = 'tags'; reason = '字幕包含多个并列关键词或领域。' }
    else if (/(三点|三个|三项)/.test(text) && sentences.length >= 3) { sceneId = 'triad'; reason = '字幕明确包含三项并列重点。' }
    else if (/(完成率|进度|达成率|占比|评分)/.test(text) && number) { sceneId = 'progress'; reason = '字幕包含进度或比例数值。' }
    else if (/(嘉宾|创始人|负责人|专家|老师)/.test(text) && sentences.length > 1) { sceneId = 'person'; reason = '字幕在介绍人物与身份。' }
    else if (spokenCompare || (/(相比|对比|但是|而现在|以前|过去)/.test(text) && sentences.length >= 2)) { sceneId = 'compare'; reason = '字幕包含两个对照分句，请核对两者是否构成对比。' }
    else if (number) { sceneId = 'metric'; reason = '字幕包含明确数字与单位；未补充其他数据。' }
    else if (sentences.length >= 3) { sceneId = 'list'; reason = '字幕包含多个并列分句，请核对要点。' }
    else if (!/[。！？?!]|关键|记住|核心|重要/.test(text)) continue
    const start = first.start, end = Math.min(group.at(-1)!.end + .6, cues[i + 1]?.start ?? Infinity, videoDuration || Infinity, sceneId === 'transition' ? first.start + 6 : Infinity)
    if (end - start < 1.2) continue
    // Long sentences are left to human/assistant editing rather than clipped mid-claim.
    if (text.length > 140 || sentences.some(s => s.length > 100)) continue
    const items = (sceneId === 'transition' ? [] : referenceMatch?.items) ?? (sceneId === 'compare' && spokenCompare ? spokenCompare : ['rail', 'agenda', 'list', 'compare', 'timeline', 'tags', 'triad', 'loop'].includes(sceneId) ? sentences.slice(0, sceneId === 'compare' ? 2 : sceneId === 'triad' ? 3 : 4) : [])
    if (!referenceMatch && !(sceneId === 'compare' && spokenCompare) && items.length && sentences.length > items.length) continue
    cards.push({ start, end, sceneId, cueIds: group.map(c => c.id), reason,
      content: { title: sceneId === 'transition' && stepHeading.test(first.text) ? first.text : referenceMatch?.title ?? (items.length ? '' : text), items, value: sceneId === 'metric' || sceneId === 'progress' ? number! : '', note: referenceMatch?.note ?? '', placement: referenceMatch ? 'left' : sceneId === 'bottomquote' || sceneId === 'compare' || sceneId === 'transition' ? 'bottom' : cards.length % 2 ? 'right' : 'left' } })
    lastEnd = end
  }
  return cards
}

export function validatePlan(input: unknown, cues: SubtitleCue[], videoDuration?: number, allowIncomplete = false): ArrangementPlan {
  const data = input as Partial<ArrangementPlan> | null
  if (!data || data.format !== 'overlay-studio-plan' || data.version !== 1 || !Array.isArray(data.cards) || !data.cards.length || data.cards.length > 500) throw new Error('请选择 overlay-studio-plan v1 编排文件（1–500 张卡片）。')
  const knownIds = new Set(cues.map(c => c.id))
  for (const [index, card] of data.cards.entries()) {
    const fail = (message: string) => { throw new Error(`第 ${index + 1} 张卡片：${message}`) }
    if (!card || !Number.isFinite(card.start) || !Number.isFinite(card.end) || card.start < 0 || card.end <= card.start) fail('时间范围无效。')
    if (videoDuration && card.end > videoDuration + .05) fail('结束时间超出视频，请调整编排或重新选择匹配的视频。')
    if (!scriptTemplates.some(t => t.id === card.sceneId)) fail('不支持此自动编排模板。')
    if (!Array.isArray(card.cueIds) || (!allowIncomplete && !card.cueIds.length) || card.cueIds.some(id => !knownIds.has(id))) fail('找不到对应字幕，请先导入与编排一致的 SRT。')
    if (typeof card.reason !== 'string' || card.reason.length > 500) fail('匹配说明无效。')
    const c = card.content
    if (!c || typeof c.title !== 'string' || c.title.length > 140 || typeof c.value !== 'string' || c.value.length > 24 || typeof c.note !== 'string' || c.note.length > 80 || !Array.isArray(c.items) || c.items.length > (card.sceneId === 'orbitcards' ? 6 : card.sceneId === 'workflowmap' ? 5 : 4) || c.items.some(s => typeof s !== 'string' || (!allowIncomplete && !s.trim()) || s.length > 100) || !['left', 'right', 'bottom'].includes(c.placement)) fail('内容格式或长度不正确。')
    if(c.palette!==undefined && !['indigo','blue','warm','symbol','flow'].includes(c.palette)) fail('配色无效。')
    if(c.motion!==undefined && (!Number.isFinite(c.motion)||c.motion<.5||c.motion>2)) fail('动作幅度应在 50%–200% 之间。')
    if (allowIncomplete) continue // Project saves may contain unfinished user edits.
    if ((card.sceneId === 'metric' || card.sceneId === 'progress') && !c.value.trim()) fail('数字或进度卡需要原文数值。')
    if (card.sceneId === 'compare' && c.items.length !== 2) fail('对比卡需要恰好两个选项。')
    if (['rail', 'agenda', 'list', 'timeline', 'tags', 'triad', 'loop', 'embed', 'merge', 'questionstack', 'appburst', 'docrelay', 'choicehub', 'checknote', 'growthpath', 'beforeafter', 'filedrawer', 'insightpulse'].includes(card.sceneId) && !c.items.length) fail('此卡片需要至少一个要点。')
    if (card.sceneId === 'docrelay' && c.items.length !== 3) fail('文档接力需要三个连续步骤。')
    if (card.sceneId === 'growthpath' && c.items.length !== 3) fail('阶梯成长需要三个递进阶段。')
    if (card.sceneId === 'beforeafter' && c.items.length !== 2) fail('前后变形需要两个对照内容。')
    if (card.sceneId === 'triad' && c.items.length !== 3) fail('三列重点卡需要三个要点。')
    if (['question', 'bottomquote', 'transition', 'thinkcloud', 'questionstack', 'appburst', 'docrelay', 'choicehub', 'checknote', 'growthpath', 'actionwindow', 'alertstamp', 'arrowcallout', 'beforeafter', 'filedrawer', 'insightpulse'].includes(card.sceneId) && !c.title.trim()) fail('此卡片需要标题文案。')
  }
  return { format: 'overlay-studio-plan', version: 1, cards: data.cards, ...(data.layouts!==undefined?{layouts:validateLayouts(data.layouts,videoDuration)}:{}) }
}

export const isLayerActive = (time: number, start = 0, end = Infinity) => time >= start && time < end
export const timeLabel = (seconds: number) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toFixed(1).padStart(4, '0')}`
