import {MaterialVideo} from '../../MaterialVideo'
import {ease,type StoryScene} from './storyModel.mjs'
export function StoryBroll({s,time,playing,rendering}:{s:StoryScene;time:number;playing:boolean;rendering:boolean}){
 const b=s.broll!
 return <div className={`story-broll story-broll-${b.fit}`} data-broll-mode={b.mode}>
  <MaterialVideo src={`/__studio/media/${b.mediaId}`} time={time} start={s.start} end={s.end} offset={b.offset} playing={playing} rendering={rendering}/>
  <div className="story-broll-shade"/>
  <span className="story-broll-badge">{b.mode==='mock'?'链路演示 · 非AI生成':'AI场景示意'}</span>
  <div className="story-broll-labels">{s.labels.slice(0,2).map((label,i)=><div key={i} style={{opacity:ease((time-(s.events[s.kind==='expertise'?1:Math.min(i+1,s.events.length-1)]?.at??s.start))/.45)}}>{label}</div>)}</div>
 </div>
}
