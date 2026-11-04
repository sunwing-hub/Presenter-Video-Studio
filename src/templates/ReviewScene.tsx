import {forwardRef,type ReactNode} from 'react'
import {eased, type ReviewParams} from './reviewModel.mjs'
export const ReviewScene=forwardRef<HTMLVideoElement,{p:ReviewParams;time:number;videoUrl?:string;videoNode?:ReactNode}>(({p,time,videoUrl,videoNode},ref)=>{
 const intro=eased(time,0,p.enterDuration),split=eased(time,p.review,.65),exit=1-eased(time,p.duration-.45,.45)
 return <div className="review-scene" data-template-stage style={{'--accent':p.accent} as React.CSSProperties}>
  <div className="review-scene__grid"/>
  <div className="review-scene__header"><span>成果审阅</span><span>TEAM / 01</span></div>
  <h2 className="review-scene__title" style={{opacity:intro*exit,transform:`translateY(${(1-intro)*20}px)`}}>{p.title}</h2>
  <div className="review-scene__body" style={{opacity:intro*exit}}>
   <div className="review-scene__artifact" style={{width:`${76-23*split}%`,transform:`perspective(1000px) rotateY(${(1-intro)*-14}deg) translateY(${(1-intro)*24}px)`}}>
    <div className="review-scene__window"><i/><i/><i/><span>成果预览</span></div>
    <div className="review-scene__media">{videoNode??(videoUrl?<video ref={ref} src={videoUrl} muted playsInline preload="auto"/>:<div className="review-scene__example"><small>示意内容 · 可替换为成果视频</small><h3>让每次交付<br/>成为下一次的起点</h3><div>{['输入','处理','成果'].map((v,i)=><span key={v} style={{opacity:eased(time,.2+i*.18,.4),transform:`translateY(${(1-eased(time,.2+i*.18,.4))*15}px)`}}>{v}</span>)}</div></div>)}</div>
    <div className="review-scene__scan" style={{left:`${Math.min(100,intro*120)}%`,opacity:time<p.enterDuration? .8:0}}/>
   </div>
   <div className="review-scene__checks" style={{opacity:split,width:`${37*split}%`}}>{p.checks.map((v,i)=>{const t=eased(time,p.review+i*p.stagger,.4);return <div key={i} style={{opacity:t,transform:`translateX(${(1-t)*30}px)`}}><b>{String(i+1).padStart(2,'0')}</b><span>{v}</span><i>✓</i></div>})}</div>
  </div>
  <div className="review-scene__conclusion" style={{opacity:eased(time,p.conclude,.45)*exit,transform:`translateY(${(1-eased(time,p.conclude,.45))*16}px)`}}><span/>{p.conclusion}</div>
 </div>
})
