import {MaterialVideo} from '../../MaterialVideo'
import {overlaySourceAt,type PresenterOverlay as Config} from './presenterOverlay.mjs'
export function PresenterOverlay({config:p,time,playing=false,rendering=false}:{config:Config;time:number;playing?:boolean;rendering?:boolean}){
 return <div data-presenter-overlay style={{position:'absolute',left:p.x/10.8+'%',top:p.y/19.2+'%',width:p.size/10.8+'%',height:p.size/19.2+'%',borderRadius:'50%',overflow:'hidden',border:`${p.border??3}px solid white`,boxSizing:'border-box',boxShadow:p.shadow?`0 3px ${p.shadow}px #0006`:undefined,zIndex:3}}><div style={{position:'absolute',left:-p.crop.x/p.crop.width*100+'%',top:-p.crop.y/p.crop.height*100+'%',width:p.sourceWidth/p.crop.width*100+'%',height:p.sourceHeight/p.crop.height*100+'%'}}><MaterialVideo src={'/__studio/media/'+p.mediaId} time={overlaySourceAt(p,time)} start={0} end={100000} playing={playing} rendering={rendering}/></div></div>
}
