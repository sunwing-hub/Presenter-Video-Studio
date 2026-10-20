import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { parseSrt, validateCues, draftCards, validatePlan, isLayerActive, matchReferenceMotion, scriptTemplates } from '../src/arrangement.ts'
const fixture = readFileSync(new URL('./fixtures/arrangement.srt', import.meta.url), 'utf8')
const { cues, warnings } = parseSrt('\uFEFF' + fixture.replaceAll('\n', '\r\n'))
assert.equal(cues.length, 8)
assert.deepEqual(warnings, [])
assert.equal(cues[0].start, 1)
assert.equal(cues[0].end, 4.5)
assert.equal(parseSrt('1\n00:00:01.000 --> 00:00:02.200\n<b>一行</b>\n二行').cues[0].text, '一行 二行')
assert.throws(() => parseSrt('这不是字幕文件'))
assert.throws(() => parseSrt('1\n00:00:99,000 --> 00:00:02,000\n错误'))
assert.equal(parseSrt(fixture + '\n\n9\n00:00:02,000 --> 00:00:01,000\n倒序').warnings.length, 1)
assert.equal(parseSrt('1\n00:00:01,000 --> 00:00:04,000\n一\n\n2\n00:00:03,000 --> 00:00:05,000\n二').warnings.length, 1)
const cards = draftCards(cues, 40)
assert.deepEqual(cards.map(card => card.sceneId), ['question', 'progress', 'compare', 'rail', 'transition', 'bottomquote', 'agenda', 'list'])
assert.equal(cards[1].content.value, '38%')
assert.equal(draftCards([{ id: 'n', start: 1, end: 5, text: '测试变化为-12.5%。' }])[0].content.value, '-12.5%')
assert.equal(draftCards([{ id: 'n', start: 1, end: 5, text: '样本为1,200个。' }])[0].content.value, '1,200个')
assert.ok(cards.every((card, i) => card.cueIds.every(id => cues.some(cue => cue.id === id)) && (!i || card.start >= cards[i - 1].end)))
assert.ok(draftCards(cues, 7).every(card => card.end <= 7 && card.cueIds.every(id => cues.find(cue => cue.id === id).end <= 7)))
const plan = { format: 'overlay-studio-plan', version: 1, cards }
assert.deepEqual(validatePlan(JSON.parse(JSON.stringify(plan)), cues, 40), plan)
for (const patch of [{ end: Infinity }, { start: -1 }, { end: 100 }, { cueIds: ['missing'] }, { sceneId: 'fake' }, { content: { ...cards[0].content, title: 'x'.repeat(141) } }]) assert.throws(() => validatePlan({ ...plan, cards: [{ ...cards[0], ...patch }] }, cues, 40))
assert.throws(() => validatePlan({ ...plan, cards: [{ ...cards[2], content: { ...cards[2].content, items: ['只有一项'] } }] }, cues, 40))
assert.throws(() => validateCues([cues[0], cues[0]]))
assert.equal(isLayerActive(1, 1, 2), true)
assert.equal(isLayerActive(2, 1, 2), false)
assert.equal(isLayerActive(.9, 1, 2), false)
assert.equal(isLayerActive(123), true)
// Typical exported speech captions omit punctuation and split each thought across cues.
const speechCues = [
  '整个流程5步', '读取脚本、拆解视频', '匹配动效、画面融合、成片导出',
  '第一步读取脚本', '它先读你的字幕',
  '第二步拆解视频', '它听气口看节奏',
  '第三步匹配动效', '它照着字幕内容自动配',
  '第四步画面融合', '截图和素材导进来',
  '第五步成片导出', '可以合成完整MP4',
  '以前一句一句手动做图对动效', '一晚上就没了', '现在给命令等结果',
  '匹配素材和动效要花多久',
].map((text, i) => ({id:`speech-${i}`,start:i*2,end:i*2+1.8,text}))
const speechCards = draftCards(speechCues, 34)
assert.equal(speechCards.find(card => card.sceneId === 'metric')?.content.value, '5步')
assert.deepEqual(speechCards.filter(card => card.sceneId === 'transition').map(card => card.content.title), [
  '第一步读取脚本','第二步拆解视频','第三步匹配动效','第四步画面融合','第五步成片导出',
])
assert.deepEqual(speechCards.find(card => card.sceneId === 'compare')?.content.items, ['以前一句一句手动做图对动效，一晚上就没了','现在给命令等结果'])
assert.ok(speechCards.some(card => card.sceneId === 'question' && card.content.title.includes('多久')))
assert.equal(validatePlan({format:'overlay-studio-plan',version:1,cards:speechCards},speechCues,34).cards.length,speechCards.length)
assert.deepEqual(draftCards([{id:'plain',start:0,end:4,text:'今天随便聊聊'}]),[], 'ordinary unpunctuated speech must not force a card')
const clone = structuredClone(cards)
clone[0].content.title = '独立编辑'
assert.notEqual(clone[0].content.title, cards[0].content.title)
assert.deepEqual(clone[1], cards[1])
const extended = [
  { sceneId: 'tags', items: ['法律', '金融'] },
  { sceneId: 'triad', items: ['输入', '处理', '输出'] },
  { sceneId: 'timeline', items: ['开始', '发展'] },
  { sceneId: 'loop', items: ['输入', '复盘'] },
].map((entry, index) => ({ start: 30 + index * 2, end: 31.5 + index * 2, sceneId: entry.sceneId, content: { title: '', items: entry.items, value: '', note: '', placement: 'left' }, cueIds: [cues[0].id], reason: '扩展模板测试' }))
assert.equal(validatePlan({ format: 'overlay-studio-plan', version: 1, cards: extended }, cues).cards.length, 4)
const referenceCases = [
  ['AI先出初稿，人工修改文案，最后完成交付。', 'docrelay'],
  ['检查清单，核对合同，确认信息。', 'checknote'],
  ['把资料整理归档，说明书，客户档案。', 'filedrawer'],
  ['以前普通AI输出，现在更像你写的。', 'beforeafter'],
  ['工作工具包括：地图，声音，文档，导出。', 'appburst'],
  ['我们先筛选方案，比较成本，最后选择A。', 'choicehub'],
  ['这是什么？它能做什么？下一步怎样做？', 'questionstack'],
  ['AI到底能帮我做什么？', 'thinkcloud'],
  ['点击按钮保存为智能体。', 'actionwindow'],
  ['复制粘贴。', 'arrowcallout'],
  ['别等！', 'alertstamp'],
  ['一步步从一件事做起，养成习惯，再加一件事。', 'growthpath'],
  ['我最近跟几位做企业服务的朋友深聊，听到了几乎一样的判断。', 'insightpulse'],
]
for (const [text, expected] of referenceCases) {
  assert.equal(matchReferenceMotion(text)?.sceneId, expected, text)
  assert.equal(draftCards([{id:'reference-cue',start:0,end:4,text}])[0]?.sceneId, expected, text)
  assert.ok(scriptTemplates.some(template => template.id === expected))
}
assert.deepEqual(matchReferenceMotion('这其实很简单，AI出初稿，你自己修改，最后完成。')?.items, ['AI出初稿','你自己修改','最后完成'])
assert.deepEqual(matchReferenceMotion('今天说个方法，先做一件事，养成习惯，再加一件。')?.items, ['先做一件事','养成习惯','再加一件'])
assert.deepEqual(matchReferenceMotion('更像你写的版本，比普通AI输出更好。')?.items, ['比普通AI输出更好','更像你写的版本'])
const actionDraft = draftCards([{id:'action-cue',start:0,end:4,text:'点击确认删除文件。'}])[0]
assert.equal(actionDraft.sceneId,'actionwindow')
assert.deepEqual(actionDraft.content.items,[])
assert.equal(actionDraft.content.note,'确认删除文件')
assert.equal(matchReferenceMotion('AI 很有用。'), null, 'vague text must not force a reference effect')
const refPlan = (sceneId, items) => ({format:'overlay-studio-plan',version:1,cards:[{start:0,end:4,sceneId,cueIds:[cues[0].id],reason:'参考动效测试',content:{title:'测试标题',items,value:'',note:'',placement:'left'}}]})
for (const sceneId of ['thinkcloud','questionstack','appburst','docrelay','choicehub','checknote','growthpath','actionwindow','alertstamp','arrowcallout','beforeafter','filedrawer','insightpulse']) {
  const items = sceneId === 'docrelay' || sceneId === 'growthpath' ? ['一','二','三'] : sceneId === 'beforeafter' ? ['之前','之后'] : ['要点一','要点二']
  assert.equal(validatePlan(refPlan(sceneId,items),cues).cards[0].sceneId,sceneId)
}
assert.throws(()=>validatePlan(refPlan('docrelay',['一','二']),cues))
assert.throws(()=>validatePlan(refPlan('beforeafter',['一']),cues))
console.log('PASS: SRT parsing, validation, expanded template matches, original numbers, duration clipping, non-overlap, plan round-trip, invalid-plan rejection, timing boundaries, independent content.')
