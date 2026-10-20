import type {CSSProperties,ReactNode} from 'react'
import {mediaFrames,mediaMotions,type MediaPresentation} from './mediaPresentation'
export function MediaCard({presentation={},children}:{presentation?:MediaPresentation;children:ReactNode}){
 const c=presentation.crop
 return <div className={`media-card media-card--${presentation.frame??'plain'}`} style={{'--media-fit':presentation.fit??'contain','--phone-aspect':presentation.phoneAspect??'9/16'} as CSSProperties}>
  {presentation.frame==='web'&&<div className="media-browser-bar"><i/><i/><i/><span>{presentation.title||'资料引用'}</span></div>}
  <div className="media-card-screen">{c?<div className="media-card-crop" style={{position:'absolute',left:`${-c.x/c.width*100}%`,top:`${-c.y/c.height*100}%`,width:`${100/c.width}%`,height:`${100/c.height}%`}}>{children}</div>:children}</div>
  {presentation.title&&presentation.frame!=='web'&&<div className="media-card-title">{presentation.title}</div>}
 </div>
}
export function MediaControls({value={},onChange}:{value?:MediaPresentation;onChange:(p:MediaPresentation)=>void}){
 const patch=(p:MediaPresentation)=>onChange({...value,...p})
 return <div className="media-presentation-controls">
  <label>素材样式<select value={value.frame??'plain'} onChange={e=>patch({frame:e.target.value as MediaPresentation['frame']})}>{mediaFrames.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
  {value.frame==='phone'&&<label>手机比例<select value={value.phoneAspect??'9/16'} onChange={e=>patch({phoneAspect:e.target.value as MediaPresentation['phoneAspect']})}><option value="9/16">9:16</option><option value="9/19.5">9:19.5</option></select></label>}
  <label>画面适配<select value={value.fit??'contain'} onChange={e=>patch({fit:e.target.value as MediaPresentation['fit']})}><option value="contain">完整显示</option><option value="cover">裁切铺满</option></select></label>
  <label>进出动画<select value={value.motion??'none'} onChange={e=>patch({motion:e.target.value as MediaPresentation['motion']})}>{mediaMotions.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
  <label>动画时长（秒）<input type="number" min="0.1" max="2" step="0.1" value={value.motionDuration??.55} onChange={e=>patch({motionDuration:Math.max(.1,Math.min(2,Number(e.target.value)||.55))})}/></label>
  <label>素材标题<input maxLength={160} value={value.title??''} onChange={e=>patch({title:e.target.value})}/></label>
 </div>
}
