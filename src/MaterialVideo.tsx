import {useEffect,useRef,useState} from 'react'

/** Silent B-roll follows the project clock, including paused seeks and export. */
export function MaterialVideo({src,time,start,end,offset=0,playing,rendering=false}:{src:string;time:number;start:number;end:number;offset?:number;playing:boolean;rendering?:boolean}){
 const ref=useRef<HTMLVideoElement>(null)
 const [error,setError]=useState('')
 const active=time>=start&&time<end
 const at=Math.max(0,time-start+offset)
 const sync=()=>{
  const video=ref.current
  if(!video||rendering||video.readyState<1)return
  const target=Math.min(at,Math.max(0,video.duration-.04))
  if(Math.abs(video.currentTime-target)>(playing&&active ? .18 : .015))video.currentTime=target
  if(playing&&active&&at<video.duration)void video.play().catch(e=>{if(e.name!=='AbortError')setError('素材视频未能播放，请重新点击播放。')})
  else video.pause()
 }
 useEffect(sync,[src,time,start,end,offset,playing,rendering])
 return <><video ref={ref} className="material-canvas-image" data-render-time={at} src={src} muted playsInline preload="auto" onLoadedMetadata={sync} onCanPlay={sync} onError={()=>setError('素材视频无法解码，请使用 H.264 MP4。')}/>{error&&<span role="alert" className="audio-playback-error">{error}</span>}</>
}

export function readVideoMetadata(url:string):Promise<{duration:number;width:number;height:number}>{
 return new Promise((resolve,reject)=>{
  const video=document.createElement('video')
  const finish=()=>{clearTimeout(timer);video.removeAttribute('src');video.load()}
  const timer=setTimeout(()=>{finish();reject(Error('视频读取超时，请使用 H.264 MP4。'))},45000)
  video.preload='metadata'
  video.onloadedmetadata=()=>{
   const data={duration:video.duration,width:video.videoWidth,height:video.videoHeight}
   if(!Number.isFinite(data.duration)||data.duration<=0){finish();reject(Error('视频时长无效'));return}
   finish();resolve(data)
  }
  video.onerror=()=>{finish();reject(Error('视频无法读取，请使用 H.264 MP4。'))}
  video.src=url
 })
}
