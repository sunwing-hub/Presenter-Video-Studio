export type AudioClip={id:string;mediaId:string;name:string;track:'music'|'sfx';start:number;end:number;offset:number;volume:number;loop?:boolean;fadeIn?:number;fadeOut?:number;origin?:'auto-emphasis';cueId?:string}
export function audioGain(clip:Pick<AudioClip,'start'|'end'|'volume'|'fadeIn'|'fadeOut'>,time:number){
 const length=clip.end-clip.start,at=time-clip.start
 if(at<0||at>=length)return 0
 const fadeIn=Math.min(clip.fadeIn??0,length),fadeOut=Math.min(clip.fadeOut??0,length)
 return clip.volume*(fadeIn?Math.min(1,at/fadeIn):1)*(fadeOut?Math.min(1,(length-at)/fadeOut):1)
}
export type CaptionStyle={enabled:boolean;fontFamily:string;fontSize:number;color:string;bottom:number;strokeWidth:number}
export const captionDefault:CaptionStyle={enabled:false,fontFamily:'sans-serif',fontSize:44,color:'#ffffff',bottom:8,strokeWidth:4}
export function validateAudio(value:unknown,duration=86400):AudioClip[]{
 if(!Array.isArray(value)||value.length>100)throw Error('音频片段最多 100 个')
 const ids=new Set<string>()
 return value.map((c:AudioClip)=>{
  if(!c||typeof c.id!=='string'||ids.has(c.id)||!/^[a-f0-9-]{36}$/.test(c.mediaId)||!['music','sfx'].includes(c.track)||typeof c.name!=='string'||!['start','end','offset','volume'].every(k=>Number.isFinite(c[k as keyof AudioClip]))||c.start<0||c.end<=c.start||c.end>duration+.05||c.offset<0||c.volume<0||c.volume>1||c.origin!==undefined&&c.origin!=='auto-emphasis')throw Error('音频片段时间、音量或素材编号无效')
  if(c.loop!==undefined&&typeof c.loop!=='boolean'||[c.fadeIn,c.fadeOut].some(n=>n!==undefined&&(!Number.isFinite(n)||n<0||n>30)))throw Error('淡入淡出须为 0–30 秒，循环开关无效')
  ids.add(c.id);return {...c,loop:c.loop!==false}
 })
}
export function validateCaption(value:unknown):CaptionStyle{
 const s={...captionDefault,...value as Partial<CaptionStyle>}
 if(typeof s.enabled!=='boolean'||typeof s.fontFamily!=='string'||s.fontFamily.length>200||!/^#[a-fA-F0-9]{6}$/.test(s.color)||!Number.isFinite(s.fontSize)||s.fontSize<16||s.fontSize>160||!Number.isFinite(s.bottom)||s.bottom<0||s.bottom>80||!Number.isFinite(s.strokeWidth)||s.strokeWidth<0||s.strokeWidth>12)throw Error('字幕样式无效')
 return s
}
