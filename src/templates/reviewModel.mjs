export const reviewDefaults={title:'成果审阅',checks:['内容完整','重点清晰','可以复用'],conclusion:'从一次交付到持续复用',review:4,conclude:8.6,duration:14,volume:.15,sound:true,accent:'#729aff',stagger:.3,enterDuration:.65,voiceVolume:1,musicVolume:.12,musicLoop:false,musicFade:1,ducking:true,duckLevel:.35,videoOffset:0,voiceOffset:0,musicOffset:0}
export function validateReview(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('模板参数无效')
 const p={...reviewDefaults,...input}
 if(Object.keys(p).some(k=>!Object.prototype.hasOwnProperty.call(reviewDefaults,k)))throw Error('包含未支持的模板参数')
 for(const [k,max] of [['title',28],['conclusion',28]])if(typeof p[k]!=='string'||!p[k].trim()||Array.from(p[k]).length>max)throw Error('标题和结论需要填写，最多 28 字')
 if(!Array.isArray(p.checks)||p.checks.length!==3||p.checks.some(v=>typeof v!=='string'||!v.trim()||Array.from(v).length>24))throw Error('需要三项审阅内容，每项不超过 24 字')
 for(const k of ['review','conclude','duration','volume','stagger','enterDuration','voiceVolume','musicVolume','musicFade','duckLevel','videoOffset','voiceOffset','musicOffset'])if(!Number.isFinite(p[k]))throw Error('时间和音量必须是有效数字')
 if(p.duration<4||p.duration>120||p.review<p.enterDuration||p.conclude<p.review+2*p.stagger+.5||p.conclude+.6>p.duration)throw Error('请给进入、三项审阅与结论保留完整动作时间')
 if(p.enterDuration<.2||p.enterDuration>2||p.stagger<.1||p.stagger>1||p.musicFade<0||p.musicFade>5)throw Error('动作间隔、入场或淡入淡出超出范围')
 if(typeof p.ducking!=='boolean'||p.duckLevel<0||p.duckLevel>1)throw Error('配乐避让参数无效')
 if(p.volume<0||p.volume>.5||p.voiceVolume<0||p.voiceVolume>1||p.musicVolume<0||p.musicVolume>1)throw Error('音量超出范围')
 if([p.videoOffset,p.voiceOffset,p.musicOffset].some(v=>v<0||v>86400))throw Error('素材起点无效')
 if(typeof p.sound!=='boolean'||typeof p.musicLoop!=='boolean'||!/^#[0-9a-fA-F]{6}$/.test(p.accent))throw Error('配色或声音开关无效')
 return {...p,checks:[...p.checks]}
}
export function reviewEvents(p){return [{id:'entry',label:'成果进入',at:0},{id:'review.0',label:'审阅一',at:p.review},{id:'review.1',label:'审阅二',at:p.review+p.stagger},{id:'review.2',label:'审阅三',at:p.review+2*p.stagger},{id:'conclusion',label:'结论',at:p.conclude}]}
export const progress=(time,start,duration)=>Math.max(0,Math.min(1,(time-start)/duration))
export const eased=(time,start,duration)=>1-(1-progress(time,start,duration))**3
export function validateReviewProject(input){
 if(input?.format!=='overlay-review-project'||input.version!==1)throw Error('请选择成果审阅工程 v1')
 const media={video:null,voice:null,music:null}
 for(const role of Object.keys(media)){
  const m=input.media?.[role]
  if(m!=null){if(typeof m.id!=='string'||!/^[a-f0-9-]{36}$/.test(m.id)||typeof m.name!=='string'||m.name.length>250)throw Error('素材引用无效');media[role]={id:m.id,name:m.name}}
 }
 return {format:'overlay-review-project',version:1,template:'team.artifact-review@0.2.0',params:validateReview(input.params),media}
}
// Original deterministic sound design. No source-template audio or random runtime state.
export const reviewSoundRevision='studio-sfx-2'
export const cueDuration=index=>index===0?.48:index===4?.72:.22
export function cueSample(t,index){
 const dur=cueDuration(index);if(t<0||t>=dur)return 0
 const edge=Math.min(1,t/.006,(dur-t)/.025)
 // A fixed multisine gives a soft air texture without nondeterministic noise.
 const air=(Math.sin(2*Math.PI*(1733*t+2600*t*t))+Math.sin(2*Math.PI*2797*t)+Math.sin(2*Math.PI*4159*t))/3
 if(index===0)return edge*(air*.38*Math.sin(Math.PI*t/dur)**2+Math.sin(2*Math.PI*(100*t-55*t*t))*.48*Math.exp(-t*12))
 if(index===4)return edge*(Math.sin(2*Math.PI*523.251*t)*.38+Math.sin(2*Math.PI*659.255*t)*.22+Math.sin(2*Math.PI*783.991*t)*.16)*Math.exp(-t*7)
 const f=600+(index-1)*100
 return edge*(Math.sin(2*Math.PI*(f*t-180*t*t))*.62*Math.exp(-t*27)+air*.15*Math.exp(-t*65))
}
export function wavStereo(samples,sampleRate=48000){
 const buffer=new ArrayBuffer(44+samples.length*2),v=new DataView(buffer)
 const txt=(at,s)=>{for(let i=0;i<s.length;i++)v.setUint8(at+i,s.charCodeAt(i))}
 txt(0,'RIFF');v.setUint32(4,36+samples.length*2,true);txt(8,'WAVE');txt(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,2,true);v.setUint32(24,sampleRate,true);v.setUint32(28,sampleRate*4,true);v.setUint16(32,4,true);v.setUint16(34,16,true);txt(36,'data');v.setUint32(40,samples.length*2,true)
 for(let i=0;i<samples.length;i++)v.setInt16(44+i*2,Math.round(Math.max(-1,Math.min(1,samples[i]))*32767),true)
 return new Uint8Array(buffer)
}
