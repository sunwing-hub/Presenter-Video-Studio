// Offline director-plan compiler. Produces a plan, never submits generation or renders media.
import {readFile,writeFile} from 'node:fs/promises'
import {pathToFileURL} from 'node:url'
const kinds=new Set(['presenter-hook','entity-conflict','product-identity','benefit-build','metric-compare','presenter-bridge','entity-lineup','action-checklist','presenter-punch','boundary-flow','presenter-question','metric-scale','kinetic-contrast','value-transfer','metric-consequence','kinetic-reframe','risk-question','permission-decision','product-boundary','permission-levels','statement','metaphor-broll','callback','kinetic-summary','presenter-close'])
const aspectRects={
 '16:9':{full:{x:0,y:0,w:1920,h:1080,r:0},pip:{x:70,y:760,w:230,h:230,r:115},intermediate:{x:55,y:575,w:580,h:326,r:65}},
 '9:16':{full:{x:0,y:0,w:1080,h:1920,r:0},pip:{x:72,y:1280,w:240,h:240,r:120},intermediate:{x:72,y:995,w:650,h:366,r:65}},
}
export function createNarrationPlan(input){
 if(!input||input.format!=='team-scene-narration-input'||!Number.isFinite(input.duration)||input.duration<=0||input.duration>3600)throw Error('需要有效新音轨时长')
 if(!Object.hasOwn(aspectRects,input.aspect)||!['dark-tech','white-flow'].includes(input.theme))throw Error('请选择一套全片主题与独立横竖画幅')
 if(!Array.isArray(input.cues)||!input.cues.length||!Array.isArray(input.segments)||!input.segments.length)throw Error('需要准确字幕和语义段落')
 const cues=input.cues,ids=new Map();for(let i=0;i<cues.length;i++){const c=cues[i];if(!c.id||ids.has(c.id)||typeof c.text!=='string'||!c.text.trim()||![c.start,c.end].every(Number.isFinite)||c.start<0||c.end<=c.start||c.end>input.duration||i&&c.start<cues[i-1].end)throw Error('字幕顺序、编号或时间无效');ids.set(c.id,i)}
 let expected=0;const windows=[],scenes=[];let previous='full'
 for(let i=0;i<input.segments.length;i++){
  const seg=input.segments[i],a=ids.get(seg.fromCue),b=ids.get(seg.toCue)
  if(a===undefined||b===undefined||a!==expected||b<a||!kinds.has(seg.kind))throw Error('段落必须依次覆盖新字幕，不能套用参考秒数或留下空档')
  expected=b+1;const start=i?cues[a].start:0,end=i===input.segments.length-1?input.duration:cues[b+1]?.start??input.duration
  const mode=input.presenter===false?'none':seg.kind.startsWith('presenter')?'full':'pip',rect=aspectRects[input.aspect]
  if(mode!=='none'&&mode!==previous){const span=Math.min(.6,(end-start)*.8),mid=start+span*.35;windows.push({at:start,to:mid,rect:rect.intermediate,source:'shared-presenter'}, {at:mid,to:start+span,rect:rect[mode],source:'shared-presenter'});previous=mode}
  for(const m of seg.metrics??[]){if(!Number.isFinite(m.value)||!['unit','scope','timeRange','source','formula'].every(k=>typeof m[k]==='string'&&m[k].trim())||m.verified!==true)throw Error('生产数据必须有数值、单位、范围、时间、来源、公式并经核验；参考片数字不能直接当事实')}
  const anchors=seg.phraseAnchors??[];if(anchors.some((e,j)=>!Number.isFinite(e.at)||e.at<start||e.at>=end||typeof e.text!=='string'||j&&e.at<anchors[j-1].at))throw Error('短语锚点必须在新片段内有序排列')
  if(seg.AI&&!['off','existing','planned'].includes(seg.AI.mode))throw Error('AI槽位只能关闭、复用或规划，不自动提交生成')
  const ai=seg.AI?{...seg.AI,maxSingleGeneratedSeconds:5,requiresSourceProvenance:true,requiresBudgetBeforeSubmit:true,submit:false}:null
  scenes.push({id:'S'+String(i+1).padStart(3,'0'),kind:seg.kind,start,end,narration:cues.slice(a,b+1).map(c=>c.text).join(''),cueIds:cues.slice(a,b+1).map(c=>c.id),presenter:mode,title:String(seg.title??''),metrics:seg.metrics??[],AI:ai,events:anchors.length?anchors:cues.slice(a,b+1).map(c=>({at:c.start,text:c.text})),timing:anchors.length?'supplied phrase anchors on final audio':'sentence anchors only; fine motion needs phrase alignment',motion:{order:['container','title','detail','relationship','result'],stagger:[.12,.35],sameAudioClock:true}})
 }
 if(expected!==cues.length)throw Error('字幕未被完整覆盖')
 return {format:'team-scene-narration-plan',version:1,template:'team.scene-narration@0.1.0-reference',theme:input.theme,aspect:input.aspect,duration:input.duration,scenes,sharedPresenterWindow:{keyframes:windows,oneSource:true,oneClock:true},audio:{source:input.audio??null,BGMlibrary:'{BGM_LIBRARY}'},caption:{singleLine:true,stripTrailingPunctuation:true},status:'DIRECTOR_PLAN_READY_NOT_RENDERED',rendererBindingRequired:true,generatedTasks:0}
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){const [a,b]=process.argv.slice(2);if(!a||!b)throw Error('create-plan.mjs 新片输入.json 新片导演编排.json');const plan=createNarrationPlan(JSON.parse(await readFile(a,'utf8')));await writeFile(b,JSON.stringify(plan,null,2),{flag:'wx'});console.log(JSON.stringify({scenes:plan.scenes.length,duration:plan.duration,generatedTasks:0}))}
