import {memo,useMemo,useRef,useState,useEffect,type PointerEvent,type CSSProperties} from 'react'
import type {AudioClip,CaptionStyle} from './trackModel'
import type {SubtitleCue} from './arrangement'
import {syncAudio,type SyncState} from './audioSync'
export type TrackItem={id:string;name:string;start:number;end:number;track:'person'|'material'|'subtitle'|'effect'|'sfx'|'music';select:()=>void;change?:(start:number,end:number)=>void;remove?:()=>void;volume?:number;changeVolume?:(volume:number)=>void}
const rows=[['person','人物'],['material','素材'],['subtitle','字幕'],['effect','动效 / 文字'],['music','背景音乐'],['sfx','音效']] as const
type TrackProps={items:TrackItem[];time:number;duration:number;seek:(t:number)=>void;cues:SubtitleCue[];onCues:(v:SubtitleCue[])=>void;caption:CaptionStyle;onCaption:(s:CaptionStyle)=>void;importVideo:()=>void;importMaterial:()=>void;importSubtitle:()=>void}
// Keep clip controls stable during playback; only the inherited playhead moves.
// Callback refs preserve the latest editing actions without stale closures.
export function MultiTrack(props:TrackProps){
 const live=useRef(props);live.current=props
 const actions=useMemo(()=>({seek:(t:number)=>live.current.seek(t),onCues:(v:SubtitleCue[])=>live.current.onCues(v),onCaption:(s:CaptionStyle)=>live.current.onCaption(s),importVideo:()=>live.current.importVideo(),importMaterial:()=>live.current.importMaterial(),importSubtitle:()=>live.current.importSubtitle()}),[])
 return <div style={{'--studio-playhead':`${Math.min(props.time/props.duration,1)*100}%`} as CSSProperties}><TrackEditor items={props.items} duration={props.duration} cues={props.cues} caption={props.caption} {...actions}/></div>
}
const TrackEditor=memo(function TrackEditor({items,duration,seek,cues,onCues,caption,onCaption,importVideo,importMaterial,importSubtitle}:Omit<TrackProps,'time'>){
 const [selected,setSelected]=useState(''),[zoom,setZoom]=useState(1),[error,setError]=useState('')
 const drag=useRef<{item:TrackItem;x:number;width:number;edge:'move'|'start'|'end'}|null>(null)
 const current=items.find(i=>i.id===selected),cue=cues.find(c=>`subtitle:${c.id}`===selected)
 const start=(e:PointerEvent<HTMLButtonElement>,item:TrackItem,edge:'move'|'start'|'end')=>{e.stopPropagation();setSelected(item.id);item.select();if(!item.change)return;drag.current={item,x:e.clientX,width:e.currentTarget.closest('.studio-track-lane')!.getBoundingClientRect().width,edge};e.currentTarget.setPointerCapture(e.pointerId)}
 const move=(e:PointerEvent<HTMLButtonElement>)=>{const d=drag.current;if(!d)return;const delta=(e.clientX-d.x)/d.width*duration;let {start,end}=d.item;if(d.edge==='move'){const length=end-start;start=Math.max(0,Math.min(duration-length,start+delta));end=start+length}else if(d.edge==='start')start=Math.max(0,Math.min(end-.05,start+delta));else end=Math.min(duration,Math.max(start+.05,end+delta));d.item.change?.(Math.round(start*100)/100,Math.round(end*100)/100)}
 const end=()=>{drag.current=null}
 return <section className="studio-timeline" aria-label="多轨时间轴"><header><b>时间轴 · 按类型分轨</b><label>缩放 <input aria-label="时间轴缩放" type="range" min="1" max="8" step=".5" value={zoom} onChange={e=>setZoom(Number(e.target.value))}/></label></header><p>同类片段共用一条轨道；拖动中间改位置，拖两端改时长。重叠片段可用下方列表选择。</p>
 <div className="studio-track-scroll"><div style={{minWidth:Math.max(600,600*zoom)}}><div className="studio-track-row"><span className="studio-track-name">时间 / 秒</span><div className="studio-track-ruler" onClick={e=>{const r=e.currentTarget.getBoundingClientRect();seek((e.clientX-r.left)/r.width*duration)}}>{Array.from({length:11},(_,i)=><span key={i} style={{left:`${i*10}%`}}>{(duration*i/10).toFixed(1)}</span>)}</div></div>
 {rows.map(([id,label])=><div className="studio-track-row" key={id}><div className="studio-track-name"><b>{label}</b>{id==='person'?<button onClick={importVideo}>导入</button>:id==='material'?<button onClick={importMaterial}>加素材</button>:id==='subtitle'?<button onClick={importSubtitle}>导入</button>:null}</div><div className={`studio-track-lane track-${id}`}>
 {items.filter(i=>i.track===id).map(item=><div key={item.id} className={`studio-clip ${item.id===selected?'selected':''}`} style={{left:`${item.start/duration*100}%`,width:`${(item.end-item.start)/duration*100}%`}} title={`${item.name} · ${item.start.toFixed(2)}–${item.end.toFixed(2)} 秒`}>
 {item.change&&<button aria-label={`调整开始 ${item.name}`} className="studio-clip-edge" onPointerDown={e=>start(e,item,'start')} onPointerMove={move} onPointerUp={end} onPointerCancel={end}/>}
 <button className="studio-clip-body" onPointerDown={e=>start(e,item,'move')} onPointerMove={move} onPointerUp={end} onPointerCancel={end}>{item.name}</button>
 {item.change&&<button aria-label={`调整结束 ${item.name}`} className="studio-clip-edge" onPointerDown={e=>start(e,item,'end')} onPointerMove={move} onPointerUp={end} onPointerCancel={end}/>}</div>)}
 {!items.some(i=>i.track===id)&&<span className="studio-track-empty">{id==='material'?'图片和视频素材放在这里，可拖动片段调整出现时间':id==='effect'?'从左侧添加动效，或添加自由文字':id==='sfx'?'生成重点词后，音效会出现在这里':'暂无片段'}</span>}<i className="studio-playhead" style={{left:'var(--studio-playhead)'}}/></div></div>)}
 </div></div><div className="track-inspector"><label>选择片段<select aria-label="选择时间轴片段" value={selected} onChange={e=>{setSelected(e.target.value);items.find(i=>i.id===e.target.value)?.select()}}><option value="">选择片段（含重叠片段）</option>{rows.map(([id,label])=><optgroup key={id} label={label}>{items.filter(i=>i.track===id).map(i=><option key={i.id} value={i.id}>{i.name} · {i.start.toFixed(1)}s</option>)}</optgroup>)}</select></label>
 {current&&<><b>{current.name}</b>{current.change&&<>{(['start','end'] as const).map(k=><label key={k}>{k==='start'?'开始':'结束'}（秒）<input type="number" step=".1" min="0" max={duration} value={current[k]} onChange={e=>{const n=Number(e.target.value);if(k==='start'&&n>=0&&n<current.end)current.change?.(n,current.end);if(k==='end'&&n>current.start&&n<=duration)current.change?.(current.start,n)}}/></label>)}</>}{current.changeVolume&&<label>音量 <input aria-label="音效音量" type="range" min="0" max="1" step="0.01" value={current.volume??0} onChange={e=>current.changeVolume?.(Number(e.target.value))}/>{Math.round((current.volume??0)*100)}%</label>}{current.remove&&<button onClick={()=>{current.remove?.();setSelected('')}}>删除此片段</button>}</>}
 {cue&&<label className="track-cue-text">字幕内容<textarea value={cue.text} onChange={e=>onCues(cues.map(c=>c.id===cue.id?{...c,text:e.target.value}:c))}/></label>}
 </div><details className="track-caption-settings"><summary>字幕显示与字体（全轨道）</summary><p>视频已有硬字幕时请保持关闭，避免两份字幕叠在一起。开启后会进入完整 MP4，透明 MOV 不含字幕。</p><label><input type="checkbox" checked={caption.enabled} onChange={e=>onCaption({...caption,enabled:e.target.checked})}/>显示导入的字幕</label><label>字体<select value={caption.fontFamily} onChange={e=>onCaption({...caption,fontFamily:e.target.value})}>{['sans-serif','PingFang SC','Heiti SC','Songti SC','Kaiti SC','Arial'].map(f=><option key={f}>{f}</option>)}</select></label><label>字号<input type="number" min="16" max="160" value={caption.fontSize} onChange={e=>onCaption({...caption,fontSize:Math.min(160,Math.max(16,Number(e.target.value)))})}/></label><label>黑色描边 px<input type="number" min="0" max="12" value={caption.strokeWidth} onChange={e=>onCaption({...caption,strokeWidth:Math.min(12,Math.max(0,Number(e.target.value)))})}/></label><label>颜色<input type="color" value={caption.color} onChange={e=>onCaption({...caption,color:e.target.value})}/></label><label>距底部 %<input type="number" min="0" max="80" value={caption.bottom} onChange={e=>onCaption({...caption,bottom:Math.min(80,Math.max(0,Number(e.target.value)))})}/></label></details>{error&&<p role="alert">{error}</p>}</section>
})
export function AudioPreview({clips,time,playing}:{clips:AudioClip[];time:number;playing:boolean}){
 return <>{clips.map(c=><AudioPlayer key={c.id} clip={c} time={time} playing={playing}/>)}</>
}
function AudioPlayer({clip,time,playing}:{clip:AudioClip;time:number;playing:boolean}){
 const ref=useRef<HTMLAudioElement>(null)
 const state=useRef<SyncState>({}),[error,setError]=useState('')
 const sync=()=>{if(ref.current)syncAudio(ref.current,time,playing,clip,state.current,setError)}
 useEffect(()=>{state.current={};setError('')},[clip.mediaId])
 useEffect(sync,[clip,time,playing])
 return <><audio ref={ref} preload="auto" onLoadedMetadata={sync} onCanPlay={sync} onError={()=>setError('音效素材无法解码，请换用 AAC、MP3 或 WAV。')} src={`/__studio/media/${clip.mediaId}`}/>{error&&<span className="audio-playback-error" role="alert">{clip.name}：{error}</span>}</>
}
