import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createWarmEditorial} from '../scripts/create-warm-editorial.mjs'
import {validateExport} from '../scripts/export-server.mjs'
const sample=JSON.parse(readFileSync('templates/warm-editorial/0.1.0/sample-plan.json','utf8'))
const a=createWarmEditorial(sample),story=a.project.canvasLayers[0].story
assert.equal(story.template,'team.warm-editorial@0.1.0')
assert.equal(a.project.videoMuted,true)
assert.equal(a.project.sourceAudioMode,'mute')
assert.equal(a.project.audioClips[0].mediaId,sample.audio.id)
assert.equal(new Set(story.scenes.map(s=>s.narrativeKind)).size,11)
assert.deepEqual(sample.scenes[0].content,{value:'4800',unit:'人',label:'微软裁员',question:'AI开始抢工作？',detail:'先看岗位与投入发生了什么变化'})
const substitute=structuredClone(sample);substitute.header='门店经营观察';substitute.cues=[]
substitute.scenes.forEach(s=>{s.title='门店经营\n每周复盘';for(const k of Object.keys(s.content))s.content[k]='';s.content.value='1234';if(!['opening','metric','metric-steps'].includes(s.layout))delete s.content.value})
substitute.scenes[0].content={value:'1234',unit:'单',label:'演示数据',question:'如何改进流程',detail:'此处为模板替换测试'}
const fresh=createWarmEditorial(substitute)
assert(!/微软|Copilot|McKinsey|客服|4800|55.8%/.test(JSON.stringify(fresh.project.canvasLayers[0].story)))
assert.equal(story.scenes[0].editorial.value,'4800')
for(const n of ['1','123456']){const p=structuredClone(substitute);p.scenes[0].content.value=n;assert.doesNotThrow(()=>createWarmEditorial(p))}
const bad=structuredClone(sample);delete bad.scenes[0].content.question;assert.throws(()=>createWarmEditorial(bad),/文案/)
const tooLong=structuredClone(sample);tooLong.scenes[0].content.value='1234567';assert.throws(()=>createWarmEditorial(tooLong),/整数/)
const gap=structuredClone(sample);gap.scenes[1].start+=.1;assert.throws(()=>createWarmEditorial(gap),/覆盖/)
const mixed=structuredClone(a);mixed.project.canvasLayers[0].story.scenes[0].theme='dark';assert.throws(()=>validateExport(mixed),/暖色/)
const landscape=structuredClone(a);landscape.project.canvas={width:1920,height:1080,aspectRatio:'16/9'};assert.throws(()=>validateExport(landscape),/仅支持竖屏/)
console.log('PASS: all 11 layouts, independent topic substitution, no legacy topic fallback, original untouched, complete mixed audio, gap/mixed-theme/missing-field/landscape rejection')
