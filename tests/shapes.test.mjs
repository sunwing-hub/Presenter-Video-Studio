import assert from 'node:assert/strict'
import { validatePlan, scriptTemplates } from '../src/arrangement.ts'
const sceneIds=['ring','gauge','fan','bubbles','ribbon','orbitflow']
for(const sceneId of sceneIds){
  assert.ok(scriptTemplates.some(t=>t.id===sceneId))
  const plan={format:'overlay-studio-plan',version:1,cards:[{sceneId,start:0,end:6,cueIds:[],reason:'手动卡片',content:{title:'测试',value:'75%',items:['看清','听懂','会用'],note:'',placement:'left',palette:'blue',motion:1.5}}]}
  assert.deepEqual(validatePlan(JSON.parse(JSON.stringify(plan)),[],undefined,true),plan)
  assert.throws(()=>validatePlan(plan,[]))
  assert.throws(()=>validatePlan({...plan,cards:[{...plan.cards[0],content:{...plan.cards[0].content,motion:Infinity}}]},[],undefined,true))
}
console.log('PASS: new templates and editable project round-trip; invalid motion and missing subtitle links rejected.')
