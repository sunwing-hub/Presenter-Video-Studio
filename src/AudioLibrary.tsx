import {useRef,useState} from 'react'
import {uploadLocalMedia} from './layoutTimeline'
import type {AudioClip} from './trackModel'

export function AudioLibrary({clips,onChange,duration,time}:{clips:AudioClip[];onChange:(fn:(clips:AudioClip[])=>AudioClip[])=>void;duration:number;time:number}){
 const [busy,setBusy]=useState(false),[error,setError]=useState('')
 const input=useRef<HTMLInputElement>(null),track=useRef<'music'|'sfx'>('music')
 const update=(id:string,patch:Partial<AudioClip>)=>onChange(all=>all.map(c=>c.id===id?{...c,...patch}:c))
 const importFile=async(file:File)=>{
  setBusy(true);setError('')
  const url=URL.createObjectURL(file),audio=new Audio()
  try{
   const seconds=await new Promise<number>((resolve,reject)=>{
    const timer=setTimeout(()=>reject(Error('读取音频超时，请换用 MP3、M4A 或 WAV。')),15000)
    audio.onloadedmetadata=()=>{clearTimeout(timer);Number.isFinite(audio.duration)&&audio.duration>0?resolve(audio.duration):reject(Error('无法读取音频时长'))}
    audio.onerror=()=>{clearTimeout(timer);reject(Error('音频无法解码，请换用 MP3、M4A 或 WAV。'))};audio.src=url
   })
   const kind=track.current,mimes:Record<string,string>={mp3:'audio/mpeg',wav:'audio/wav',m4a:'audio/mp4',aac:'audio/aac',ogg:'audio/ogg',flac:'audio/flac'}
   const mime=mimes[file.name.split('.').pop()?.toLowerCase()??'']??file.type
   const media=await uploadLocalMedia(new Blob([file],{type:mime}),file.name)
   const start=kind==='music'?0:Math.min(time,Math.max(0,duration-.05)),end=kind==='music'?duration:Math.min(duration,start+seconds)
   onChange(all=>[...all,{id:crypto.randomUUID(),mediaId:media.id,name:file.name,track:kind,start,end,offset:0,volume:kind==='music'?.12:.3,loop:kind==='music',fadeIn:kind==='music'?.8:0,fadeOut:kind==='music'?1.5:0}])
  }catch(e){setError((e as Error).message)}finally{audio.removeAttribute('src');audio.load();URL.revokeObjectURL(url);setBusy(false)}
 }
 return <section className="settings-section audio-library" aria-label="音乐与音效"><div className="section-title">音乐与音效</div>
 <p className="editor-hint">音乐默认从开头铺满，低音量循环播放；音效加在当前播放位置。两者都可在时间轴拖动，不改变人物原声。</p>
 <input hidden ref={input} type="file" accept="audio/*,.mp3,.m4a,.wav,.aac,.ogg,.flac" onChange={e=>{const f=e.target.files?.[0];if(f)void importFile(f);e.target.value=''}}/>
 <div className="project-actions"><button className="editor-action editor-action--primary" disabled={busy||clips.length>=100} onClick={()=>{track.current='music';input.current?.click()}}>＋ 添加背景音乐</button><button className="editor-action" disabled={busy||clips.length>=100} onClick={()=>{track.current='sfx';input.current?.click()}}>＋ 导入音效</button></div>
 {busy&&<p role="status">正在读取并保存音频…</p>}{error&&<p role="alert">{error}</p>}
 {clips.map(c=><details key={c.id}><summary>{c.track==='music'?'♫ 音乐':'♪ 音效'} · {c.name}</summary><audio controls preload="none" src={`/__studio/media/${c.mediaId}`}/><small>上方试听原文件；实际混音请用工作台播放。</small>
 <label>音量 {Math.round(c.volume*100)}%<input aria-label={`${c.name} 音量`} type="range" min="0" max="1" step=".01" value={c.volume} onChange={e=>update(c.id,{volume:Number(e.target.value)})}/></label>
 {(['start','end','offset','fadeIn','fadeOut'] as const).map(k=><label key={k}>{{start:'开始位置',end:'结束位置',offset:'素材起点',fadeIn:'淡入',fadeOut:'淡出'}[k]}（秒）<input type="number" min="0" max={k==='start'||k==='end'?duration:k==='offset'?undefined:30} step=".1" value={c[k]??0} onChange={e=>{const n=Number(e.target.value);if(!Number.isFinite(n)||n<0)return;if(k==='start'&&n>=c.end||k==='end'&&(n<=c.start||n>duration)||((k==='fadeIn'||k==='fadeOut')&&n>30))return;update(c.id,{[k]:n})}}/></label>)}
 <label><input type="checkbox" checked={c.loop!==false} onChange={e=>update(c.id,{loop:e.target.checked})}/>循环补足片段时长</label><button className="editor-action" onClick={()=>onChange(all=>all.filter(x=>x.id!==c.id))}>移除这段音频</button></details>)}
 <p className="editor-hint">请使用你有权用于发布的音乐。MP4 和透明 MOV 都会带上这里的音乐与音效；不需要时可把音量设为 0。</p></section>
}
