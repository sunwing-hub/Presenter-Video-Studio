export type PresenterSettings={mode:'full'|'right'|'left'|'circle'|'window';x:number;y:number;zoom:number;size:number;frame?:{left:number;top:number;width:number;height:number;radius:number};backdrop?:'paper'|'ink';aboveEffects?:boolean}
export const presenterDefault:PresenterSettings={mode:'full',x:50,y:35,zoom:1,size:24}
export const presenterModes=[['full','人物全屏'],['right','左内容 · 右人物'],['left','右内容 · 左人物'],['circle','录屏 · 圆形人物'],['window','人物悬浮窗']] as const
export type LayoutClip={id:string;start:number;end:number;settings:PresenterSettings;transition:number;mediaId?:string;mediaName?:string;mediaType?:'image'|'video';offset:number;cueIds?:string[];reason?:string}
export function validateLayouts(value:unknown,duration=3600):LayoutClip[]{
 if(!Array.isArray(value)||value.length>500)throw Error('布局时间段格式不正确')
 const ids=new Set<string>()
 return value.map((c:LayoutClip)=>{
  if(!c||typeof c.id!=='string'||ids.has(c.id)||!Number.isFinite(c.start)||!Number.isFinite(c.end)||c.start<0||c.end<=c.start||c.end>duration+.05)throw Error('布局编号或时间无效')
  ids.add(c.id);const s=c.settings
  if(!s||!presenterModes.some(([m])=>m===s.mode)||!['x','y','zoom','size'].every(k=>Number.isFinite(s[k as keyof PresenterSettings])))throw Error('人物布局参数无效')
  if(s.x<0||s.x>100||s.y<0||s.y>100||s.zoom<1||s.zoom>4||s.size<12||s.size>40)throw Error('人物裁切参数超出范围')
  if(s.backdrop!==undefined&&!['paper','ink'].includes(s.backdrop))throw Error('人物背景无效')
  if(s.aboveEffects!==undefined&&typeof s.aboveEffects!=='boolean')throw Error('人物叠放参数无效')
  if(s.frame){const f=s.frame;if(![f.left,f.top,f.width,f.height,f.radius].every(Number.isFinite)||f.left<0||f.top<0||f.width<=0||f.height<=0||f.left+f.width>100||f.top+f.height>100||f.radius<0||f.radius>50)throw Error('人物窗口超出画布')}
  if(!Number.isFinite(c.transition)||c.transition<0||c.transition>2||!Number.isFinite(c.offset)||c.offset<0)throw Error('转场或素材起点无效')
  if(c.mediaId!==undefined&&!/^[a-f0-9-]{36}$/.test(c.mediaId))throw Error('素材编号无效')
  if(c.mediaType!==undefined&&!['image','video'].includes(c.mediaType))throw Error('素材类型无效')
  return {...c,settings:{...s}}
 }).sort((a,b)=>a.start-b.start).map((c,i,all)=>{if(i&&c.start<all[i-1].end)throw Error('布局时间段不能重叠');return c})
}
export const layoutAt=(clips:LayoutClip[],time:number)=>clips.find(c=>time>=c.start&&time<c.end)
export function presenterRect(s:PresenterSettings,aspect:number){return s.mode==='full'?{left:0,top:0,width:100,height:100,radius:0}:s.mode==='window'?s.frame??{left:7,top:27,width:46,height:Math.min(58,46*aspect*.75),radius:3}:s.mode==='circle'?s.frame??{left:3,top:97-s.size*aspect,width:s.size,height:s.size*aspect,radius:50}:{left:s.mode==='right'?50:0,top:0,width:50,height:100,radius:0}}
export function contentRect(s:PresenterSettings){return {left:s.mode==='left'?50:0,top:0,width:s.mode==='left'||s.mode==='right'?50:100,height:100}}
// Keep imported image layers within their assigned split region at every aspect ratio.
export function fitMaterialRect<T extends {x:number;y:number;width:number;height:number}>(layer:T,s:PresenterSettings,width:number,height:number):T{
 if(s.mode!=='left'&&s.mode!=='right')return layer
 const r=contentRect(s),pad=Math.min(width,height)*.015,left=r.left/100*width+pad,top=pad,w=r.width/100*width-2*pad,h=height-2*pad
 const scale=Math.min(1,w/layer.width,h/layer.height),lw=layer.width*scale,lh=layer.height*scale
 return {...layer,width:lw,height:lh,x:Math.max(left,Math.min(left+w-lw,layer.x)),y:Math.max(top,Math.min(top+h-lh,layer.y))}
}
export function animatedRect(clips:LayoutClip[],time:number,fallback:PresenterSettings,aspect:number):ReturnType<typeof presenterRect>{
 const clip=layoutAt(clips,time),target=presenterRect(clip?.settings??fallback,aspect)
 if(!clip){
  const previous=[...clips].sort((a,b)=>b.end-a.end).find(c=>c.end<=time)
  if(!previous?.transition||time>=previous.end+previous.transition)return target
  const from=presenterRect(previous.settings,aspect),p=Math.min(1,(time-previous.end)/previous.transition),e=1-(1-p)**3
  return Object.fromEntries(Object.entries(target).map(([key,v])=>[key,from[key as keyof typeof from]+(v-from[key as keyof typeof from])*e])) as typeof target
 }
 if(!clip.transition)return target
 const previous=clips.find(c=>Math.abs(c.end-clip.start)<.001)
 // A new window can begin while the previous one is still returning to full.
 // Start at that exact interpolated pose, avoiding a one-frame full-screen jump.
 const from=previous?presenterRect(previous.settings,aspect):animatedRect(clips.filter(c=>c.end<=clip.start),clip.start,fallback,aspect)
 const p=Math.max(0,Math.min(1,(time-clip.start)/Math.min(clip.transition,clip.end-clip.start))),e=1-(1-p)**3
 return Object.fromEntries(Object.entries(target).map(([key,v])=>[key,from[key as keyof typeof from]+(v-from[key as keyof typeof from])*e])) as typeof target
}
export async function uploadLocalMedia(blob:Blob,name:string){
 const response=await fetch('/__studio/media',{method:'POST',headers:{'Content-Type':blob.type||'application/octet-stream','X-Media-Name':encodeURIComponent(name)},body:blob})
 const data=await response.json();if(!response.ok)throw Error(data.error||'素材保存失败');return data as {id:string;name:string;type:'image'|'video';url:string}
}
