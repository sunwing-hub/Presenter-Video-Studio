import {ReviewScene} from './ReviewScene'
import {MaterialVideo} from '../MaterialVideo'
import type {ReviewBinding} from './reviewTimeline.mjs'
export function ReviewTimeline({binding,time,start,end,playing,rendering}:{binding:ReviewBinding;time:number;start:number;end:number;playing:boolean;rendering:boolean}){
 const {project}=binding,p=project.params,elapsed=Math.max(0,time-start)
 const m=project.media.video
 return <ReviewScene p={p} time={elapsed} videoNode={m?<MaterialVideo src={`/__studio/media/${m.id}`} time={time} start={start} end={end} offset={p.videoOffset} playing={playing} rendering={rendering}/>:undefined}/>
}
