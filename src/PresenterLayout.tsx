import {useEffect,useRef,useState,type ReactNode,type CSSProperties} from 'react'
export type PresenterSettings={mode:'full'|'right'|'left'|'circle';x:number;y:number;zoom:number;size:number}
export const presenterDefault:PresenterSettings={mode:'full',x:50,y:35,zoom:1,size:24}
export const presenterModes=[['full','人物全屏'],['right','左内容 · 右人物'],['left','右内容 · 左人物'],['circle','录屏 · 圆形人物']] as const
export function PresenterLayout({settings,children,time,playing,aspect}:{settings:PresenterSettings;children:ReactNode;time:number;playing:boolean;aspect:number}){
 const [media,setMedia]=useState<{url:string;type:string;name:string}|null>(null)
 const video=useRef<HTMLVideoElement>(null)
 useEffect(()=>()=>{if(media)URL.revokeObjectURL(media.url)},[media])
 useEffect(()=>{const v=video.current;if(!v)return;if(Number.isFinite(v.duration)&&Math.abs(v.currentTime-time)>.3)v.currentTime=Math.min(time,v.duration);if(playing&&time<v.duration)void v.play().catch(()=>{});else v.pause()},[time,playing,media])
 const s=settings
 const rect=s.mode==='full'?{left:'0%',top:'0%',width:'100%',height:'100%',borderRadius:'0%'}:s.mode==='circle'?{left:'3%',top:`${97-s.size*aspect}%`,width:`${s.size}%`,height:`${s.size*aspect}%`,borderRadius:'50%'}:{left:s.mode==='right'?'50%':'0%',top:'0%',width:'50%',height:'100%',borderRadius:'0%'}
 return <div className={`presenter-layout presenter-layout--${s.mode}`}>
 {s.mode!=='full'&&<div className="presenter-content" style={{left:s.mode==='left'?'50%':'0%',width:s.mode==='circle'?'100%':'50%'}}>
 {media?.type==='video'?<video ref={video} src={media.url} muted playsInline/>:media?<img src={media.url} alt={media.name}/>:<span>导入图片或视频，放在这里</span>}
 <label className="presenter-upload">{media?'更换内容':'＋ 导入内容'}<input type="file" accept="image/*,video/*" onChange={e=>{const f=e.target.files?.[0];if(f)setMedia({url:URL.createObjectURL(f),type:f.type.startsWith('video/')?'video':'image',name:f.name});e.target.value=''}}/></label>
 {media&&<button className="presenter-clear" onClick={()=>setMedia(null)} type="button">移除内容</button>}
 </div>}
 <div className="presenter-window" style={{...rect,'--presenter-x':`${s.x}%`,'--presenter-y':`${s.y}%`,'--presenter-zoom':s.zoom} as CSSProperties}>{children}</div>
 </div>
}
