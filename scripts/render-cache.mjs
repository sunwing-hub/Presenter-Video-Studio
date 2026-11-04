// Content-addressed silent video segments. Audio is always remixed separately.
import {createHash,randomUUID} from 'node:crypto'
import {createReadStream} from 'node:fs'
import {mkdir,readFile,writeFile,rename,copyFile,stat,readdir,unlink,utimes} from 'node:fs/promises'
import {resolve} from 'node:path'
export const stable=value=>JSON.stringify(value,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v)
export const digest=value=>createHash('sha256').update(value).digest('hex')
export async function fileDigest(file){const hash=createHash('sha256');for await(const chunk of createReadStream(file))hash.update(chunk);return hash.digest('hex')}
export async function treeDigest(directory){const entries=await readdir(directory,{withFileTypes:true});const parts=[];for(const entry of entries.sort((a,b)=>a.name.localeCompare(b.name))){if(entry.name==='ready')continue;const f=resolve(directory,entry.name);parts.push([entry.name,entry.isDirectory()?await treeDigest(f):await fileDigest(f)])}return digest(stable(parts))}
const ids=value=>[...new Set(stable(value).match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/g)??[])].sort()
export function segmentDependencies(payload,startFrame,endFrame){
 const {project:p,fps,duration,sourceImage,insertImage,mainMediaId}=payload,start=startFrame/fps,end=endFrame/fps
 const {canvasLayers=[],layouts=[],cues=[],audioClips,finalAudioCopy,currentTime,editorMode,showLayoutGuides,selectedLayerId,draftMedia,videoMuted,videoVolume,sourceAudioMode,subtitleName,arrangementId,...rest}=p
 const active=(l,pad=0)=>(l.start??0)<end+pad&&(l.end??duration)+pad>start
 return {version:1,fps,duration,startFrame,endFrame,mainMediaId,sourceImage,insertImage,project:rest,
  // Include nearby layouts conservatively: transitions interpolate from previous poses.
  layouts:layouts.filter(l=>active(l,2)),canvasLayers:canvasLayers.filter(l=>l.visible!==false&&active(l)),cues:p.captionStyle?.enabled?cues.filter(c=>active(c)):[]}
}
export async function segmentKey(payload,start,end,{renderer,mediaFingerprint}){const dependencies=segmentDependencies(payload,start,end);const media=await Promise.all(ids(dependencies).map(async id=>[id,await mediaFingerprint(id)]));return digest(stable({dependencies,media,renderer}))}
export async function restoreSegment(cache,key,destination,frames){
 try{const file=resolve(cache,key+'.mp4'),meta=JSON.parse(await readFile(file+'.json','utf8')),s=await stat(file);if(meta.frames!==frames||meta.bytes!==s.size||meta.sha256!==await fileDigest(file))return false;await copyFile(file,destination);await utimes(file,new Date(),new Date()).catch(()=>{});return true}catch{return false}
}
export async function saveSegment(cache,key,file,frames){
 await mkdir(cache,{recursive:true});const target=resolve(cache,key+'.mp4'),tmp=target+'.'+randomUUID()+'.tmp';await copyFile(file,tmp);const info={frames,bytes:(await stat(tmp)).size,sha256:await fileDigest(tmp)};await rename(tmp,target);await writeFile(target+'.json',JSON.stringify(info))
}
export async function pruneCache(cache,maxBytes=8*1024**3){
 const files=await readdir(cache).catch(()=>[]);const entries=(await Promise.all(files.filter(n=>n.endsWith('.mp4')).map(async n=>{const file=resolve(cache,n);try{return {file,...await stat(file)}}catch{return null}}))).filter(Boolean).sort((a,b)=>b.mtimeMs-a.mtimeMs);let total=0;for(const s of entries){total+=s.size;if(total>maxBytes){await unlink(s.file).catch(()=>{});await unlink(s.file+'.json').catch(()=>{})}}
}
