import { useEffect, useState } from 'react'
type Job = { id: string; status: string; frame: number; total: number; error?: string; bytes?: number; path?: string; fileName?: string;kind?:string;reusedFrames?:number;crossJobReusedFrames?:number }
export function ExportPanel({ kind='mov',open, close, duration, width, height, makePayload,sourceMediaId }: { kind?:'mov'|'mp4';open: boolean; close: () => void; duration: number; width: number; height: number; makePayload: () => Promise<unknown>;sourceMediaId?:string }) {
  const [fps,setFps]=useState(30),[fileName,setFileName]=useState('动效图层'),[job,setJob]=useState<Job|null>(null),[error,setError]=useState(''),[starting,setStarting]=useState(false),[saving,setSaving]=useState(false),[savedPath,setSavedPath]=useState('')
  const [history,setHistory]=useState<Job[]>([])
  const [detectedFps,setDetectedFps]=useState<number|null>(null)
  const resolveFps=async(payload:unknown)=>{const id=(payload as {mainMediaId?:string}).mainMediaId;if(!id)return 30;const r=await fetch(`/__studio/media/${id}/info`);if(!r.ok)throw Error('无法读取原片帧率，请手动选择帧率');const info=await r.json();setDetectedFps(info.fps);return info.fps as number}
  useEffect(()=>{setDetectedFps(null);if(!open||kind!=='mp4'||!sourceMediaId)return;let stopped=false;void fetch(`/__studio/media/${sourceMediaId}/info`).then(async r=>{if(r.ok){const info=await r.json();if(!stopped)setDetectedFps(info.fps)}}).catch(()=>{});return()=>{stopped=true}},[open,kind,sourceMediaId])
  const terminal=['done','error','cancelled','interrupted']
  const busy=starting || Boolean(job && !terminal.includes(job.status))
  useEffect(()=>{if(!open)return;void fetch('/__studio/export-jobs').then(r=>r.json()).then((items:Job[])=>{if(!Array.isArray(items))return;const matching=items.filter(j=>j.kind===kind);setHistory(matching);setJob(current=>current??matching.find(j=>!terminal.includes(j.status))??null)}).catch(()=>{})},[open,kind])
  useEffect(()=>{setFps(kind==='mp4'?0:30);setDetectedFps(null);setJob(null);setError('');setSavedPath('');setFileName(kind==='mp4'?'完整视频':'动效图层')},[kind])
  useEffect(()=>{
    if(!job || terminal.includes(job.status)) return
    let stopped=false
    const timer=setInterval(()=>{void fetch(`/__studio/export/${job.id}`).then(async r=>{const data=await r.json();if(!r.ok)throw Error(data.error);if(!stopped)setJob(data)}).catch(e=>{if(!stopped)setError(`无法查询导出状态：${e.message}。请保持本地启动器运行。`)})},1000)
    return ()=>{stopped=true;clearInterval(timer)}
  },[job?.id,job?.status])
  const start=async()=>{
    setStarting(true);setError('');setJob(null);setSavedPath('')
    try {
      const payload=await makePayload()
      const outputFps=fps===0?await resolveFps(payload):fps
      const response=await fetch('/__studio/export',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...payload as object,fps:outputFps,duration,fileName})})
      const result=await response.json();if(!response.ok)throw Error(result.error)
      setJob({id:result.id,status:'preparing',frame:0,total:Math.ceil(duration*outputFps)})
    }catch(e){setError((e as Error).message)}finally{setStarting(false)}
  }
  const saveAs=async()=>{
    if(!job || job.status!=='done')return
    setSaving(true);setError('')
    try{
      const nativeResponse=await fetch(`/__studio/export/${job.id}/save-as`,{method:'POST'})
      const nativeResult=await nativeResponse.json()
      if(nativeResponse.ok){if(nativeResult.path)setSavedPath(nativeResult.path);return}
      if(nativeResponse.status!==501)throw Error(nativeResult.error)
      const response=await fetch(`/__studio/export/${job.id}/file`);if(!response.ok)throw Error((await response.json()).error)
      const blob=await response.blob(),suggestedName=job.fileName || `${fileName.trim() || '动效图层'}.${kind}`
      const picker=(window as unknown as {showSaveFilePicker?: (options:unknown)=>Promise<{createWritable:()=>Promise<{write:(data:Blob)=>Promise<void>;close:()=>Promise<void>}>}>}).showSaveFilePicker
      if(picker){const handle=await picker({suggestedName,types:[{description:kind==='mp4'?'完整视频':'透明 MOV 动效',accept:{[kind==='mp4'?'video/mp4':'video/quicktime']:[`.${kind}`]}}]});const writable=await handle.createWritable();await writable.write(blob);await writable.close()}
      else {const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=suggestedName;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
    }catch(e){if((e as Error).name!=='AbortError')setError(`保存失败：${(e as Error).message}`)}finally{setSaving(false)}
  }
  const reveal=async()=>{try{const response=await fetch(`/__studio/export/${job?.id}/reveal`,{method:'POST'}),result=await response.json();if(!response.ok)throw Error(result.error)}catch(e){setError(`无法打开文件位置：${(e as Error).message}`)}}
  const resume=async()=>{if(!job)return;setStarting(true);setError('');try{const r=await fetch(`/__studio/export/${job.id}/resume`,{method:'POST'}),data=await r.json();if(!r.ok)throw Error(data.error);setJob({...job,status:'preparing',error:undefined})}catch(e){setError((e as Error).message)}finally{setStarting(false)}}
  if(!open) return null
  return <div className="export-dialog-backdrop"><section className="export-dialog" role="dialog" aria-modal="true" aria-label={kind==='mp4'?'导出完整视频':'导出透明 MOV'}>
    <header><h2>{kind==='mp4'?'导出完整视频 MP4':'导出透明动效层'}</h2><button onClick={close} type="button" aria-label="关闭导出窗口">×</button></header>
    <p>{kind==='mp4'?'MP4 · H.264 · 人物原声＋布局＋素材＋动效':'QuickTime MOV · Apple ProRes 4444 · RGB＋Alpha'}</p>
    <div className="export-facts"><b>{width} × {height}</b><b>{duration.toFixed(2)} 秒 · 从 00:00 开始</b></div>
    <label>文件名<input value={fileName} disabled={busy} maxLength={80} onChange={e=>setFileName(e.target.value)} placeholder="例如：WorkBuddy-视频" /><small>系统自动补充 .{kind}。</small></label>
    <label>导出帧率<select value={fps} disabled={busy} onChange={e=>setFps(Number(e.target.value))}>{kind==='mp4'&&<option value={0}>自动匹配原片{detectedFps?`（${detectedFps} fps）`:''}</option>}{[24,25,30,50,60].map(n=><option key={n} value={n}>{n} fps</option>)}</select></label>
    <p>{kind==='mp4'?'合成人物原声、素材、动效及音乐音效；字幕仅在开启“显示导入的字幕”后写入视频。素材视频静音，结束后停留最后一帧。':'按各图层显示开关导出透明动效；有音效片段时一并写入音轨。不含原视频、人物原声、字幕和编辑框。'}</p>
    <p>独立后台导出：可以关闭此窗口继续编辑，刷新工作台不影响任务。请保持电脑开机，不要手动休眠或合盖。{kind==='mp4'?'每完成约10秒保存一次；再次导出会复用画面未变化的片段，声音重新合成。':'MOV 中断后可重新尝试，但需要从头渲染。'} 新的编辑不会改变本次快照。</p>
    {history.length>0&&<label>后台任务记录<select aria-label="后台任务记录" value={job?.id??''} onChange={e=>{setJob(history.find(j=>j.id===e.target.value)??null);setError('');setSavedPath('')}}><option value="">查看任务…</option>{history.map(j=><option value={j.id} key={j.id}>{j.fileName} · {({done:'完成',error:'失败',interrupted:'已中断',cancelled:'已取消'} as Record<string,string>)[j.status]??'处理中'}</option>)}</select></label>}
    {Boolean(job?.crossJobReusedFrames)&&<p>已复用未改动画面：{job?.crossJobReusedFrames} 帧</p>}
    {job && <><progress value={job.frame} max={job.total} /><p role="status">{({preparing:'准备独立渲染器',rendering:'正在渲染',encoding:'正在完成视频文件',done:'导出完成',cancelled:'已取消',error:'导出失败',interrupted:'任务已中断，可恢复'} as Record<string,string>)[job.status]} · {job.frame}/{job.total} 帧</p></>}
    {job&&['error','interrupted','cancelled'].includes(job.status)&&<button className="editor-action" disabled={starting} onClick={resume}>{kind==='mp4'?'恢复这次导出（复用完成片段）':'重新尝试这次 MOV 导出'}</button>}
    {(error || job?.error) && <p className="arrange-warning" role="alert">{error || job?.error}</p>}
    {job?.status==='done' && <><div className="export-save-actions"><button className="editor-action editor-action--primary" disabled={saving} onClick={saveAs} type="button">{saving?'正在等待保存位置…':'另存为… 选择桌面或文件夹'}</button><button className="editor-action" onClick={reveal} type="button">在访达中显示本地副本</button></div>{savedPath && <p className="export-file-path"><b>已保存到</b><br/>{savedPath}</p>}<p className="export-file-path"><b>项目内备份</b><br/>{job.path}</p><p>{kind==='mp4'?'完整视频已包含人物原声、布局、素材和动效，可直接播放。':'播放器可能把透明区域显示成黑色。请在剪映中放到原视频上方验证，不需要抠像或混合模式。'}</p></>}
    <footer><button className="editor-action editor-action--primary" disabled={busy} onClick={start} type="button">{starting?'正在准备素材…':`确认并导出 ${kind.toUpperCase()}`}</button>{busy && job && <button className="editor-action" onClick={()=>{void fetch(`/__studio/export/${job.id}/cancel`,{method:'POST'}).catch(e=>setError(e.message))}} type="button">取消导出</button>}</footer>
  </section></div>
}
