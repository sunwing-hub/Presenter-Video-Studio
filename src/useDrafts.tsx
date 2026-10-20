import {useEffect,useRef,useState} from 'react'
import {uploadLocalMedia} from './layoutTimeline'
type Project=Record<string,unknown>
type Summary={id:string;title:string;revision:number;savedAt:string}
type RecordDraft=Summary&{project:Project}
const persistedMedia=new Map<string,Promise<{name:string;url:string}>>()
async function preserveMedia(value:unknown){
 const media=value as {url:string;name:string}|null
 if(!media)return null
 if(media.url.startsWith('/__studio/media/'))return media
 let pending=persistedMedia.get(media.url)
 if(!pending){pending=(async()=>{const response=await fetch(media.url);if(!response.ok)throw Error(`无法读取素材 ${media.name}`);const m=await uploadLocalMedia(await response.blob(),media.name);return {name:media.name,url:m.url}})();persistedMedia.set(media.url,pending);pending.catch(()=>persistedMedia.delete(media.url))}
 return pending
}
async function request<T>(url:string,options?:RequestInit):Promise<T>{const r=await fetch(url,options),data=await r.json();if(!r.ok)throw Error(data.error||'无法连接本地草稿服务');return data}
export function useDrafts(project:Project,restore:(project:Project)=>void,disabled:boolean){
 const [ready,setReady]=useState(disabled),[opening,setOpening]=useState(!disabled),[status,setStatus]=useState('读取本地草稿…'),[error,setError]=useState(''),[drafts,setDrafts]=useState<Summary[]>([]),[title,setTitle]=useState('未命名草稿'),[savedAt,setSavedAt]=useState(''),[saving,setSaving]=useState(false)
 const snapshot=useRef(project);snapshot.current=project
 const restoreRef=useRef(restore);restoreRef.current=restore
 const identity=useRef<Summary|null>(null),baseline=useRef(''),initialized=useRef(false),dirty=useRef(false),queue=useRef<Promise<unknown>>(Promise.resolve()),name=useRef(title);name.current=title
 const refresh=async()=>{const list=await request<Summary[]>('/__studio/drafts');setDrafts(list);return list}
 useEffect(()=>{
  if(disabled)return
  let cancelled=false
  void Promise.all([
   request<Summary[]>('/__studio/drafts'),
   request<{id?:string;subtitleName?:string}>('/__studio/arrangement').catch(()=>({} as {id?:string;subtitleName?:string}))
  ]).then(async ([list,arrangement])=>{
   if(cancelled)return;setDrafts(list)
   if(list.length){
    const record=await request<RecordDraft>(`/__studio/drafts/${list[0].id}`);if(cancelled)return
    const latestArrangementId=typeof arrangement?.id==='string'?arrangement.id:''
    const savedArrangementId=typeof record.project?.arrangementId==='string'?record.project.arrangementId:''
    const draftMedia=record.project.draftMedia as {video?:{url?:string;name?:string}|null;source?:{url?:string;name?:string}|null;insert?:{url?:string;name?:string}|null}|undefined
    // A previous startup race could have saved the new cards before the
    // imported video finished persisting. Recover only the matching media from
    // an older draft; never copy its canvas layers or other project content.
    if(typeof record.project.subtitleName==='string' && !draftMedia?.video && list.length>1){
     for(const candidateSummary of list.slice(1)){
      const candidate=await request<RecordDraft>(`/__studio/drafts/${candidateSummary.id}`)
      const candidateMedia=candidate.project.draftMedia as {video?:{url?:string;name?:string}|null;source?:{url?:string;name?:string}|null;insert?:{url?:string;name?:string}|null}|undefined
      if(candidate.project.subtitleName===record.project.subtitleName && candidateMedia?.video){
       record.project={...record.project,draftMedia:candidate.project.draftMedia,videoDuration:record.project.videoDuration||candidate.project.videoDuration}
       break
      }
     }
    }
    // A newly published plan must win over a stale draft. Once the plan has
    // been applied, the draft stores its arrangementId and can be restored.
    if(latestArrangementId && savedArrangementId!==latestArrangementId){
      // Older drafts (created before arrangementId was persisted) may coexist
      // with a plan that was already marked as consumed by the previous build.
      // Clear that stale marker so App can deliver the plan again.
      sessionStorage.removeItem('overlay-incoming-id')
      const sameSubtitle=typeof arrangement?.subtitleName!=='string' || arrangement.subtitleName===record.project.subtitleName
      const pendingProject={
       ...record.project,
       // Keep the matching video's media and canvas settings, but never show
       // stale cards while the incoming plan is being applied.
       canvasLayers:[],
       ...(sameSubtitle?{}:{draftMedia:{video:null,source:null,insert:null},videoDuration:0,materials:[],cues:[]}),
      }
      restoreRef.current(pendingProject)
      identity.current=record;setTitle(record.title);setSavedAt(record.savedAt)
      setStatus('检测到新的助手编排，正在载入…')
    }else{
     if(latestArrangementId && savedArrangementId===latestArrangementId) sessionStorage.setItem('overlay-incoming-id',latestArrangementId)
     restoreRef.current(record.project);identity.current=record;setTitle(record.title);setSavedAt(record.savedAt);setStatus('已恢复上次草稿')
    }
   }
   else setStatus('自动保存已开启')
   if(!cancelled){setReady(true);setOpening(false)}
  }).catch(e=>{if(!cancelled){setError(`读取草稿失败：${e.message}。未覆盖原草稿，请检查本地启动器后重新打开页面。`);setOpening(false)}})
  return()=>{cancelled=true}
 },[disabled])
 const save=(copy=false)=>{
  const captured=snapshot.current,capturedTitle=name.current,signature=JSON.stringify({project:captured,title:capturedTitle})
  const operation=queue.current.then(async()=>{
   setSaving(true);setStatus('正在保存（含视频素材）…');setError('')
   const media=captured.draftMedia as Record<string,unknown>|undefined
   const [video,source,insert]=await Promise.all([preserveMedia(media?.video),preserveMedia(media?.source),preserveMedia(media?.insert)])
   const payload={...captured,draftMedia:{video,source,insert}}
   const result=await request<Summary>('/__studio/drafts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...(copy?{}:identity.current?{id:identity.current.id,revision:identity.current.revision}:{}),title:capturedTitle,project:payload})})
   identity.current=result;baseline.current=signature;dirty.current=JSON.stringify({project:snapshot.current,title:name.current})!==signature
   setSavedAt(result.savedAt);setStatus(dirty.current?'有新修改待保存':'已自动保存');await refresh();return result
  }).catch(e=>{dirty.current=true;setError(`保存失败：${e.message}`);setStatus('尚未保存');throw e}).finally(()=>setSaving(false))
  queue.current=operation.catch(()=>{});return operation
 }
 const saveRef=useRef(save);saveRef.current=save
 useEffect(()=>{
  if(disabled||!ready||opening)return
  const signature=JSON.stringify({project,title})
  if(!initialized.current){initialized.current=true;baseline.current=signature;return}
  if(signature===baseline.current)return
  dirty.current=true;setStatus('有修改，等待保存…')
  const timer=setTimeout(()=>{void saveRef.current().catch(()=>{})},600)
  return()=>clearTimeout(timer)
 },[project,title,disabled,ready,opening])
 useEffect(()=>{if(disabled)return;const leaving=(e:BeforeUnloadEvent)=>{if(dirty.current){e.preventDefault();e.returnValue=''}};const hidden=()=>{if(document.visibilityState==='hidden'&&dirty.current&&ready)void saveRef.current().catch(()=>{})};window.addEventListener('beforeunload',leaving);document.addEventListener('visibilitychange',hidden);return()=>{window.removeEventListener('beforeunload',leaving);document.removeEventListener('visibilitychange',hidden)}},[disabled,ready])
 const open=async(id:string,previous=false)=>{
  setOpening(true)
  try{
   await queue.current
   const record=await request<RecordDraft>(`/__studio/drafts/${id}${previous?'/previous':''}`)
   if(dirty.current)await saveRef.current()
   // Reopening a current draft after saving must load the new revision, not a stale one.
   let target=!previous&&identity.current?.id===id?await request<RecordDraft>(`/__studio/drafts/${id}`):record
   if(previous){const copied=await request<Summary>('/__studio/drafts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:`${target.title} · 恢复副本`,project:target.project})});target={...target,...copied}}
   restoreRef.current(target.project);identity.current=target;initialized.current=false;dirty.current=false;setTitle(target.title);setSavedAt(target.savedAt);setError('');setStatus(previous?'上一版已恢复并保存为副本':'已恢复草稿');setReady(true);await refresh()
  }catch(e){setError((e as Error).message)}finally{setOpening(false)}
 }
 return {ready,opening,status,error,drafts,title,setTitle,savedAt,saving,save,open,refresh}
}
export function DraftPanel({draft}:{draft:ReturnType<typeof useDrafts>}){
 const [expanded,setExpanded]=useState(false)
 return <section className="draft-panel"><div><b>本地自动保存</b><span role="status">{draft.status}{draft.savedAt&&!draft.saving?` · ${new Date(draft.savedAt).toLocaleTimeString()}`:''}</span><button disabled={!draft.ready||draft.saving||draft.opening} onClick={()=>void draft.save().catch(()=>{})}>立即保存</button><button onClick={()=>{setExpanded(!expanded);void draft.refresh().catch(()=>{})}}>草稿箱（{draft.drafts.length}）</button></div>{draft.error&&<p role="alert">{draft.error}</p>}{expanded&&<div className="draft-library"><label>草稿名称<input value={draft.title} onChange={e=>draft.setTitle(e.target.value)} maxLength={100}/></label><button disabled={!draft.ready||draft.saving||draft.opening} onClick={()=>void draft.save(true).catch(()=>{})}>另存为新草稿</button><small>草稿保存在本机项目 drafts 文件夹；视频和素材保存在 media。保存完成后可安全关闭。</small>{draft.drafts.map(d=><article key={d.id}><b>{d.title}</b><time>{new Date(d.savedAt).toLocaleString()}</time><button disabled={draft.opening||draft.saving} onClick={()=>void draft.open(d.id)}>打开</button>{d.revision>1&&<button disabled={draft.opening||draft.saving} onClick={()=>void draft.open(d.id,true)}>恢复上一版</button>}</article>)}{!draft.drafts.length&&<p>修改后会自动创建第一份草稿，也可以点击立即保存。</p>}</div>}</section>
}
