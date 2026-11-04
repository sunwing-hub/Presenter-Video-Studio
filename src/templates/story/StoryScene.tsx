import {EducationPlayful} from '../../productions/EducationPlayful'
import {WarmEditorial} from '../warm-editorial/WarmEditorial'
import {MicrosoftEditorial} from '../../productions/MicrosoftEditorial'
import {PresenterOverlay} from './PresenterVideoOverlay'
import type {CSSProperties} from 'react'
import {MaterialVideo} from '../../MaterialVideo'
import {StoryBroll} from './StoryBroll'
import {StoryGraphics} from './StoryGraphics'
import {ease,storyAt,storyCaptionAt,storyCaptionTokens,type StoryProject,type StoryScene} from './storyModel.mjs'
import './story.css'
import {FacelessScene} from './FacelessScene'
import {NarrativeScene} from './NarrativeScene'
type Props={project:StoryProject;time:number;portrait:boolean;playing?:boolean;rendering?:boolean}
const interpolate=(a:number,b:number,t:number)=>a+(b-a)*t
function rectangle(s:StoryScene,portrait:boolean){
 if(portrait)return s.presenter==='hero'?{x:0,y:0,w:1080,h:1350,r:0}:s.presenter==='split'?{x:130,y:1160,w:750,h:420,r:28}:{x:715,y:135,w:235,h:235,r:118}
 return s.presenter==='hero'?{x:0,y:0,w:1920,h:1080,r:0}:s.presenter==='split'?{x:1260,y:200,w:540,h:650,r:28}:{x:1510,y:110,w:260,h:260,r:130}
}
export function StoryScene({project,time,portrait,playing=false,rendering=false}:Props){
 if(project.presentationStyle==='education-custom')return <EducationPlayful project={project} time={time} portrait={portrait} playing={playing} rendering={rendering}/>
 if(project.presentationStyle==='warm-editorial')return <WarmEditorial project={project} time={time} portrait={portrait} playing={playing} rendering={rendering}/>
 if(project.presentationStyle==='editorial-custom')return <MicrosoftEditorial project={project} time={time} portrait={portrait} playing={playing} rendering={rendering}/>
 if(project.presentationStyle==='scene-narration')return <NarrativeScene project={project} time={time} portrait={portrait} playing={playing} rendering={rendering}/>
 if(project.presenterMode==='none')return <div style={{position:'relative',width:'100%',height:'100%'}}><FacelessScene project={project} time={time} portrait={portrait}/>{project.presenterOverlay&&!rendering&&<PresenterOverlay config={project.presenterOverlay} time={time} playing={playing} rendering={rendering}/>}</div>
 const state=storyAt(project,time),{scene:s,previous,local,preset}=state,opening=state.index<3&&['hook','clarify','paths'].includes(s.kind),hero=s.presenter==='hero',size=portrait?{w:1080,h:1920}:{w:1920,h:1080}
 const clarify=project.scenes.find(x=>x.kind==='clarify'),paths=project.scenes.find(x=>x.kind==='paths'),confirmAt=project.scenes[0].end,returnAt=clarify?.events[1]?.at??clarify?.start??confirmAt,connectAt=paths?.start??returnAt+.5
 const target=rectangle(s,portrait),from=previous?rectangle(previous,portrait):target,r=Object.fromEntries(Object.keys(target).map(k=>[k,interpolate(from[k as keyof typeof from],target[k as keyof typeof target],state.enter)])) as typeof target
 const pos=(x:number,y:number,w:number,h:number):CSSProperties=>({left:x/size.w*100+'%',top:y/size.h*100+'%',width:w/size.w*100+'%',height:h/size.h*100+'%'})
 const caption=storyCaptionAt(project.cues,time,portrait?15:26),captionTokens=storyCaptionTokens(caption?.text||'')
 const transition=state.enter<1&&previous&&s.transition==='window',titleProgress=ease((local-(previous&&previous.presenter!==s.presenter?preset.window:transition?.15:0))/preset.motion)
 const title=s.title.split('\n'),nextFrame=previous?Math.max(previous.start,previous.end-.02):time
 const graphicPos=portrait?pos(35,440,1010,s.presenter==='split'?690:1040):pos(60,260,s.presenter==='split'?1160:1360,650)
 const currentGraphic=s.broll?<StoryBroll s={s} time={time} playing={playing} rendering={rendering}/>:<StoryGraphics s={s} time={time} phase={state.phase} speed={preset.motion} portrait={portrait}/>
 return <div className={`story-stage story-${portrait?'portrait':'landscape'} story-theme-${s.theme} ${project.visualTheme?'story-style-'+project.visualTheme:''} story-${project.platform} ${hero?'story-is-hero':''}`} data-story-stage data-scene={s.id} data-platform={project.platform}>
  <div className="story-grid"/>
  <div className="story-presenter" style={{...pos(r.x,r.y,r.w,r.h),borderRadius:r.r/(portrait?10.8:19.2)+'cqw'}}><div className="story-presenter-plane"><MaterialVideo src={`/__studio/media/${project.video!.id}`} time={time} start={0} end={project.duration} offset={0} playing={playing} rendering={rendering}/></div></div>
  {hero&&<div className="story-hero-shade"/>}
  <div className="story-heading" style={{opacity:opening?1:titleProgress,transform:opening?'none':`translateY(${(1-titleProgress)*24}px)`}}>{title.map((line,i)=><div key={i}>{line}</div>)}</div>
  {opening?<div className="story-hook-stage">
    {project.hookVariant==='comparison'?<div className="story-comparison-hook"><div><small>错误方向</small><b>丢下专业 → 只追 AI</b></div><div><small>延展方向</small><b>专业经验 ＋ AI</b></div></div>:<div className="story-hook-cards"><div className="story-profession" style={{transform:`translateX(${18*ease(time/.5)*(1-ease((time-returnAt)/.5))}%) rotate(${-4*(1-ease((time-returnAt)/.5))}deg)`}}><small>你的积累</small><strong>专业经验</strong><span>业务 · 判断 · 交付</span></div><span className="story-hook-connector">{time<connectAt?'←':'＋'}</span><div className="story-ai-card"><small>{time<connectAt?'盲目追逐':'接入工具'}</small><strong>AI</strong></div></div>}

   </div>:<div className="story-graphic-viewport" style={graphicPos}>
    {transition&&<div className="story-graphic-plane story-previous">{previous.broll?<StoryBroll s={previous} time={nextFrame} playing={false} rendering={rendering}/>:<StoryGraphics s={previous} time={nextFrame} phase={previous.events.length} speed={preset.motion} portrait={portrait}/>} </div>}
    <div className="story-graphic-plane" style={transition?{clipPath:`inset(0 0 0 ${(1-state.enter)*100}%)`,background:'var(--bg)'}:undefined}>{currentGraphic}</div>
   </div>}
  {!opening&&!s.broll&&s.note?.includes('示意')&&<div className="story-disclosure">画面为业务示意</div>}
  <div className="story-caption-zone"><div className="story-captions">{captionTokens.map((token,i)=>token.emphasis?<mark key={i}>{token.text}</mark>:<span key={i}>{token.text}</span>)}</div></div>
  <div className="story-progress"><i style={{width:Math.min(100,time/(project.progressDuration??project.duration)*100)+'%'}}/></div>
 </div>
}
