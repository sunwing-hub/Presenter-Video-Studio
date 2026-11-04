import {validateEditorialScene} from '../warm-editorial/content.mjs'
import {validatePresenterOverlay} from './presenterOverlay.mjs'
export const storyThemes={
 'dark-tech':{name:'深色科技风',theme:'dark',template:'team.dark-tech@0.1.0-candidate'},
 'white-flow':{name:'白色流程风',theme:'light',template:'team.white-flow@0.1.0-candidate'},
}
export function withStoryTheme(input,visualTheme){
 const preset=storyThemes[visualTheme];if(!preset)throw Error('请选择深色科技风或白色流程风')
 return validateStory({...input,visualTheme,template:preset.template,scenes:input.scenes.map(s=>({...s,theme:preset.theme}))})
}
export const storyKinds=['hook','clarify','paths','extend','detour','expertise','amplify','delegate','agency','card','board','meeting','asset','choice','interface','delivery','feedback','reframe','roots']
export const storyPresets={douyin:{name:'抖音',motion:.38,window:.48},channels:{name:'视频号',motion:.55,window:.65}}
export const clamp=n=>Math.max(0,Math.min(1,n))
export const ease=n=>1-(1-clamp(n))**3
export function validateStory(input){
 if(input?.format!=='team-story'||input.version!==1)throw Error('全片模板格式无效')
 if(input.visualTheme!==undefined&&!Object.hasOwn(storyThemes,input.visualTheme))throw Error('全片主题无效')
 if(input.presentationStyle==='scene-narration'&&input.visualTheme!=='dark-tech')throw Error('当前场景叙事原生模板使用深色科技风')
 if(input.backdropMediaId!==undefined&&!/^[a-f0-9-]{36}$/.test(input.backdropMediaId))throw Error('背景素材无效')
 if(input.presentationStyle!==undefined&&!['scene-narration','editorial-custom','warm-editorial','education-custom'].includes(input.presentationStyle))throw Error('场景叙事样式无效')
 if(input.presentationStyle==='education-custom'&&input.visualTheme!=='white-flow')throw Error('教育定制工程须保持白色流程主题')
 if(input.presentationStyle==='scene-narration'){if(!Array.isArray(input.brands)||!input.brands.length||input.brands.length>3||input.brands.some(a=>!a.id||typeof a.name!=='string'||a.name.length>40||!/^[a-f0-9-]{36}$/.test(a.logoMediaId??'')))throw Error('需要有效的本地官方Logo素材')}
 if(input.hookVariant!==undefined&&!['conflict','comparison'].includes(input.hookVariant))throw Error('开场版本无效')
 if(!storyPresets[input.platform]||!Number.isFinite(input.duration)||input.duration<5||input.duration>3600)throw Error('平台或时长无效')
 if(input.motionVersion!==undefined&&input.motionVersion!==2)throw Error('动效版本无效')
 validatePresenterOverlay(input.presenterOverlay,input.duration)
 if(input.presenterOverlay&&(input.presenterMode!=='none'||input.visualTheme!=='white-flow'))throw Error('可选圆窗目前仅支持白色无露脸图解')
 if(input.presentationStyle==='warm-editorial'&&(input.template!=='team.warm-editorial@0.1.0'||input.visualTheme!==undefined||typeof input.editorialHeader!=='string'||input.editorialHeader.length>28||/[\r\n]/.test(input.editorialHeader)))throw Error('暖纸模板标识或页眉无效')
 const faceless=input.presenterMode==='none'
 if(faceless&&input.visualTheme!=='white-flow')throw Error('当前无露脸讲解模板使用白色流程风')
 if(faceless){if(input.video||!/^[a-f0-9-]{36}$/.test(input.audio?.id||''))throw Error('无露脸工程需要本机音轨，不应绑定人物视频')}
 else if(!/^[a-f0-9-]{36}$/.test(input.video?.id||''))throw Error('需要本机口播素材')
 if(!Array.isArray(input.scenes)||!input.scenes.length||input.scenes.length>100)throw Error('镜头数量无效')
 if(input.progressDuration!==undefined&&(!Number.isFinite(input.progressDuration)||input.progressDuration<input.duration))throw Error('完整片长无效')
 const ids=new Set();const scenes=input.scenes.map((s,i)=>{
  if(!s||typeof s.id!=='string'||ids.has(s.id)||!storyKinds.includes(s.kind)||!Number.isFinite(s.start)||!Number.isFinite(s.end)||s.start<0||s.end<=s.start||s.end>input.duration+.01||i&&s.start<input.scenes[i-1].end-.001)throw Error('镜头顺序或边界无效')
  if(typeof s.title!=='string'||s.title.length>60||!Array.isArray(s.labels)||s.labels.length>8||s.labels.some(x=>typeof x!=='string'||x.length>30))throw Error('镜头文字超出范围')
  if(!['dark','light'].includes(s.theme)||!['hero','split','pip','none'].includes(s.presenter)||!['carry','window','match'].includes(s.transition))throw Error('镜头布局无效')
  if((s.presenter==='none')!==faceless)throw Error('无露脸布局与工程声音模式不一致')
  if(faceless&&!['clock','growth','contrast','focus','toolbox','barrier','problems','access','principle','deconstruct','questions','practice','pareto','pyramid','consequences','simplify','review','coach','calendar','summary','resource'].includes(s.diagram))throw Error('无露脸镜头图解类型无效')
  if(input.presentationStyle==='scene-narration'&&(!['hook','promise','identity','workflow','access','bridge','communication','skills','ecosystem','opinion','proactive','approval','boundary','model','comparison','close','evidence'].includes(s.narrativeKind)||s.brandId&&!input.brands.some(a=>a.id===s.brandId)))throw Error('场景叙事镜头或主体无效')
  if(s.narrativeKind==='evidence'&&(!/^[a-f0-9-]{36}$/.test(s.evidenceMediaId??'')))throw Error('证据版式需要本地图片素材')
  if(input.visualTheme&&s.theme!==storyThemes[input.visualTheme].theme)throw Error('全片主题已锁定，不能在镜头之间切换深浅背景')
  if(s.beats&&(!Array.isArray(s.beats)||s.beats.some((v,j)=>!Number.isFinite(v)||v<s.start-.001||v>=s.end||j&&v<s.beats[j-1])))throw Error('图解动作时间无效')
  if(!Array.isArray(s.events)||s.events.some(x=>!Number.isFinite(x.at)||x.at<s.start-.001||x.at>=s.end||typeof x.cueId!=='string'))throw Error('镜头事件无效')
  if(s.broll){const b=s.broll;if(!/^[a-f0-9-]{36}$/.test(b.mediaId??'')||!/^[a-f0-9-]{36}$/.test(b.jobId??'')||!['live','mock'].includes(b.mode)||!['cover','contain'].includes(b.fit)||!Number.isFinite(b.offset)||b.offset<0||!Number.isFinite(b.sourceDuration)||b.sourceDuration<=b.offset||!['hold'].includes(b.endBehavior))throw Error('场景生成素材绑定无效')}
  if(s.broll&&((s.broll.startAt!==undefined&&(!Number.isFinite(s.broll.startAt)||s.broll.startAt<s.start||s.broll.startAt>=s.end))||(s.broll.endAt!==undefined&&(!Number.isFinite(s.broll.endAt)||s.broll.endAt<=(s.broll.startAt??s.start)||s.broll.endAt>s.end))))throw Error('补景时间范围无效')
  if(input.presentationStyle==='education-custom'){const e=s.education;if(!e||!['intro','overview','evidence','flow','close'].includes(e.layout)||e.asset&&(!/^[a-f0-9-]{36}$/.test(e.asset.id??'')||!['video','image'].includes(e.asset.type)))throw Error('教育镜头内容或本地素材无效')}
  if(input.presentationStyle==='warm-editorial')validateEditorialScene(s)
  ids.add(s.id);return {...s,labels:[...s.labels],events:s.events.map(x=>({...x}))}
 })
 if(Math.abs(scenes[0].start)>1e-5||Math.abs(scenes.at(-1).end-input.duration)>.01||scenes.some((s,i)=>i&&Math.abs(s.start-scenes[i-1].end)>.001))throw Error('全片镜头必须连续覆盖声音')
 if(!Array.isArray(input.cues)||input.cues.some((c,i)=>!c.id||typeof c.text!=='string'||!Number.isFinite(c.start)||!Number.isFinite(c.end)||c.start<0||c.end<=c.start||c.end>input.duration+.01||i&&c.start<input.cues[i-1].end-.001))throw Error('字幕时间无效')
 for(const cue of input.cues){
  if(cue.captionPhrases&&(!Array.isArray(cue.captionPhrases)||cue.captionPhrases.some(s=>typeof s!=='string'||!s.trim())))throw Error('字幕短句无效')
  if(cue.captionSegments&&(!Array.isArray(cue.captionSegments)||!cue.captionSegments.length||cue.captionSegments.some((s,i)=>typeof s.text!=='string'||!s.text.trim()||!Number.isFinite(s.start)||!Number.isFinite(s.end)||s.start<cue.start-.001||s.end>cue.end+.001||s.end<=s.start||i&&Math.abs(s.start-cue.captionSegments[i-1].end)>.001)||Math.abs(cue.captionSegments[0].start-cue.start)>.001||Math.abs(cue.captionSegments.at(-1).end-cue.end)>.001))throw Error('字幕短句时间无效')
 }
 return {...input,scenes,cues:input.cues.map(c=>({...c})),...(input.video?{video:{id:input.video.id,name:String(input.video.name||'口播')}}:{})}
}
export function storyAt(story,time){
 const index=Math.max(0,story.scenes.findIndex(s=>time>=s.start&&time<s.end));const i=time>=story.duration?story.scenes.length-1:index
 const scene=story.scenes[i],p=storyPresets[story.platform],local=Math.max(0,time-scene.start),enter= i===0?1:ease(local/p.window)
 return {scene,index:i,local,enter,previous:i?story.scenes[i-1]:null,phase:scene.events.filter(e=>e.at<=time+.0001).length,preset:p}
}
export function storyTextLines(text,max=15){
 const words=String(text).match(/知识库|小作品|小服务|专业|业务|能力|边界|转型|延展|周报|客户|投入|产出|客服|AI|[A-Za-z0-9]+|./gu)||[];const lines=[];let line=''
 for(const word of words){if(Array.from(line+word).length>max&&line&&!/^[，。！？；：、,.!?]$/.test(word)){lines.push(line);line=''}line+=word}if(line)lines.push(line)
 return lines
}

// Display phrase timing is proportional within the original sentence cue, not word alignment.
// Canonical cue text and timing remain unchanged and can be replaced by verified phrase cues.
export function storyCaptionPhrases(text,max=15){
 const phrases=String(text).split(/[，。！？；：、,.!?;:—…\n]+/u).map(s=>s.trim()).filter(Boolean)
 return phrases.flatMap(phrase=>storyTextLines(phrase,max)).map(s=>s.replace(/[\s，。！？；：、,.!?;:…—]+$/u,'')).filter(Boolean)
}
export function storyCaptionAt(cues,time,max=15){
 const cue=cues.find(c=>time>=c.start&&time<c.end);if(!cue)return null
 if(cue.captionSegments){const segment=cue.captionSegments.find(s=>time>=s.start&&time<s.end);if(segment)return {...segment,text:segment.text.replace(/[\s，。！？；：、,.!?;:…—]+$/u,''),sourceCueId:cue.id,timing:'local-forced-word-boundary'};return null}
 const phrases=cue.captionPhrases?cue.captionPhrases.flatMap(text=>storyCaptionPhrases(text,max)):storyCaptionPhrases(cue.text,max),weights=phrases.map(s=>Array.from(s).length),sum=weights.reduce((a,b)=>a+b,0)
 let start=cue.start
 for(let i=0;i<phrases.length;i++){const end=i===phrases.length-1?cue.end:start+(cue.end-cue.start)*weights[i]/sum;if(time<end)return {text:phrases[i],start,end,sourceCueId:cue.id,timing:'proportional-display'};start=end}
 return null
}
export function storyCaptionTokens(text){
 return String(text).split(/(专业经验|专业|业务|AI|延展|转型|积累|底牌|核心资产|流程|投入产出|交付|主动|小作品|小服务|知识库|客服|能力边界|重复工作|判断)/gu).filter(Boolean).map(text=>({text,emphasis:/^(专业经验|专业|业务|AI|延展|转型|积累|底牌|核心资产|流程|投入产出|交付|主动|小作品|小服务|知识库|客服|能力边界|重复工作|判断)$/u.test(text)}))
}
