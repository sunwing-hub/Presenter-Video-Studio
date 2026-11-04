import assert from 'node:assert/strict'
import {createNarrationPlan} from '../scripts/create-narration-plan.mjs'
const input={format:'team-scene-narration-input',duration:12,aspect:'9:16',theme:'dark-tech',cues:[{id:'a',start:.12,end:2.6,text:'新的开场问题'},{id:'b',start:3,end:7,text:'新的场景解释'},{id:'c',start:8,end:11.8,text:'回到真人提问'}],segments:[{kind:'presenter-hook',fromCue:'a',toCue:'a'},{kind:'benefit-build',fromCue:'b',toCue:'b',AI:{mode:'planned',purpose:'办公场景'}},{kind:'presenter-close',fromCue:'c',toCue:'c'}]}
const p=createNarrationPlan(input);assert.equal(p.scenes[0].start,0);assert.equal(p.scenes.at(-1).end,12);assert.equal(p.scenes[1].start,3);assert.equal(p.scenes[1].end,8);assert.equal(p.generatedTasks,0);assert.equal(p.sharedPresenterWindow.keyframes.length,4);assert(p.scenes.every(s=>s.motion.sameAudioClock))
const gap=structuredClone(input);gap.segments.splice(1,1);assert.throws(()=>createNarrationPlan(gap),/覆盖/)
const metric=structuredClone(input);metric.segments[1].metrics=[{value:470,unit:'亿美元',source:'参考视频'}];assert.throws(()=>createNarrationPlan(metric),/核验/)
const bad=structuredClone(input);bad.segments[1].AI.mode='submit';assert.throws(()=>createNarrationPlan(bad),/不自动提交/)
const fake=structuredClone(input);fake.segments[1].phraseAnchors=[{at:87,text:'参考片旧时间'}];assert.throws(()=>createNarrationPlan(fake),/锚点/)
console.log('PASS: new-audio coverage, shared presenter-window plan, unverified metric rejection, old-time rejection, no paid submission')
