import {useEffect,useRef,type ReactNode,type CSSProperties} from 'react'
import {animatedRect,layoutAt,contentRect,type LayoutClip,type PresenterSettings} from './layoutTimeline'
export function TimedPresenter({settings,children,time,playing,aspect,clips,rendering=false,guides=false}:{settings:PresenterSettings;children:ReactNode;time:number;playing:boolean;aspect:number;clips:LayoutClip[];rendering?:boolean;guides?:boolean}){
 const clip=layoutAt(clips,time),s=clip?.settings??settings
 const windowExit=!clip&&clips.find(c=>c.settings.mode==='window'&&c.end<=time&&time<c.end+c.transition)
 const video=useRef<HTMLVideoElement>(null),offset=clip?Math.max(0,time-clip.start+clip.offset):0
 useEffect(()=>{if(rendering)return;const v=video.current;if(!v)return;if(Number.isFinite(v.duration)&&Math.abs(v.currentTime-offset)>.2)v.currentTime=Math.min(offset,Math.max(0,v.duration-.001));if(playing&&offset<v.duration)void v.play().catch(()=>{});else v.pause()},[offset,playing,clip?.mediaId,rendering])
 const rect=animatedRect(clips,time,settings,aspect)
 const overlayExit=clip?undefined:clips.find(c=>c.settings.aboveEffects&&c.end<=time&&time<c.end+c.transition)
 const style={left:`${rect.left}%`,top:`${rect.top}%`,width:`${rect.width}%`,height:`${rect.height}%`,borderRadius:`${rect.radius}%`,'--presenter-x':`${s.x}%`,'--presenter-y':`${s.y}%`,'--presenter-zoom':s.zoom,transition:clips.length||rendering?'none':undefined,zIndex:windowExit?2:undefined,boxShadow:s.mode==='window'?'0 15px 45px rgba(15,30,50,.23)':undefined,border:s.mode==='window'?'2px solid rgba(255,255,255,.9)':undefined} as CSSProperties
 const url=clip?.mediaId?`/__studio/media/${clip.mediaId}`:undefined
 if(s.aboveEffects||overlayExit){style.zIndex=4;style.boxShadow='0 10px 30px rgba(35,50,85,.18)';style.border='4px solid #fff'}
 const previous=clip?clips.find(c=>Math.abs(c.end-clip.start)<.001):overlayExit
 if(s.aboveEffects||previous?.settings.aboveEffects){
  const from=previous?.settings??settings,to=s,transition=clip?.transition??overlayExit?.transition??0
  const progress=transition?Math.min(1,Math.max(0,(time-(clip?.start??overlayExit?.end??time))/transition)):1,ease=1-(1-progress)**3
  Object.assign(style,{'--presenter-x':`${from.x+(to.x-from.x)*ease}%`,'--presenter-y':`${from.y+(to.y-from.y)*ease}%`,'--presenter-zoom':from.zoom+(to.zoom-from.zoom)*ease})
 }
 const content=contentRect(s)
 const contentStyle={left:`${content.left}%`,top:`${content.top}%`,width:`${content.width}%`,height:`${content.height}%`}
 return <div className={`presenter-layout presenter-layout--${s.mode}`}>
 {windowExit&&<div style={{position:'absolute',inset:0,zIndex:1,background:windowExit.settings.backdrop==='ink'?'#131020':windowExit.settings.backdrop==='paper'?'#f3f1eb':'#f2f0ea',opacity:1-(time-windowExit.end)/windowExit.transition}}/>}
 {s.mode!=='full'&&<div className="presenter-content" style={contentStyle}>
 {url?(clip?.mediaType==='video'?<video key={url} data-render-time={offset} ref={video} src={url} muted playsInline preload="auto"/>:<img src={url} alt={clip?.mediaName??'内容素材'}/>):guides?<span className="presenter-content-guide-copy">动效填充区</span>:null}
 </div>}
 <div className="presenter-window" style={style}>{children}</div>
 {!rendering&&guides&&<><div className="layout-region-guide layout-region-guide--person" style={{left:style.left,top:style.top,width:style.width,height:style.height,borderRadius:style.borderRadius}}><span>人物区</span></div>{s.mode!=='full'&&<div className="layout-region-guide layout-region-guide--content" style={contentStyle}><span>素材区</span></div>}</>}
 </div>
}
