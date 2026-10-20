import {audioGain} from './trackModel.ts'
export type SyncState={time?:number;active?:boolean;playing?:boolean;pending?:boolean;failed?:boolean;lastSeek?:number}
export function syncAudio(a:HTMLMediaElement,time:number,playing:boolean,clip:{start:number;end:number;offset:number;volume:number;loop?:boolean;fadeIn?:number;fadeOut?:number},state:SyncState,report:(message:string)=>void=()=>{}){
 const active=time>=clip.start&&time<clip.end,at=Math.max(0,clip.offset+time-clip.start)
 const jumped=state.time!==undefined&&(time<state.time-.05||time-state.time>.5)
 const entering=active&&!state.active,resuming=playing&&!state.playing
 state.time=time;state.active=active;state.playing=playing
 a.volume=audioGain(clip,time)
 if(jumped||resuming||entering)state.failed=false
 if(a.readyState<1)return
 const sourceLength=Number.isFinite(a.duration)&&a.duration>0?a.duration:0
 // FFmpeg loops the entire source. Offset applies once, not to each repeat.
 const playableAt=clip.loop&&sourceLength?at%sourceLength:at
 const target=Math.min(playableAt,Math.max(0,sourceLength-.001)),drift=Math.abs(a.currentTime-target)
 // Never seek repeatedly while decoding/buffering; use natural playback for small drift.
 if(active&&!a.seeking&&drift>.03&&(entering||resuming||jumped||!playing||(drift>.75&&a.readyState>=3&&performance.now()-(state.lastSeek??-Infinity)>1500))){a.currentTime=target;state.lastSeek=performance.now()}
 if(!active||!playing||(!clip.loop&&at>=a.duration)){if(!a.paused)a.pause();return}
 if(a.paused&&!state.pending&&!state.failed){state.pending=true;void a.play().catch(e=>{if(e.name!=='AbortError'){state.failed=true;report(e.name==='NotAllowedError'?'浏览器阻止了音乐播放，请再点击一次播放。':'音乐无法播放，请检查素材格式。')}}).finally(()=>{state.pending=false})}
}
