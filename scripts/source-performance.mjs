// Offline source inspection and deterministic seek cache; never overwrite the user's media.
import {spawn} from 'node:child_process'
import {once} from 'node:events'
import {mkdir,readFile,writeFile,rename,stat,unlink} from 'node:fs/promises'
import {resolve} from 'node:path'
import ffmpegStatic from 'ffmpeg-static'
import {digest,fileDigest,pruneCache} from './render-cache.mjs'
const ffmpeg=process.env.OVERLAY_FFMPEG||ffmpegStatic,root=resolve(import.meta.dirname,'../exports/.render-cache/sources'),pending=new Map()
export const supportedFps=[24,25,30,50,60]
export function parseSourceInfo(stderr){const fps=Number(stderr.match(/Video:[^\n]*?([\d.]+) fps/)?.[1]);const m=stderr.match(/Duration:\s*(\d+):(\d+):([\d.]+)/);return {sourceFps:Number.isFinite(fps)&&fps>0?fps:null,fps:fps>0?supportedFps.reduce((a,b)=>Math.abs(a-fps)<=Math.abs(b-fps)?a:b):30,duration:m?Number(m[1])*3600+Number(m[2])*60+Number(m[3]):null}}
async function command(args,onProcess){const child=spawn(ffmpeg,['-hide_banner',...args],{stdio:['ignore','ignore','pipe']});onProcess?.(child);let log='';child.stderr.on('data',b=>log=(log+b).slice(-20000));const [code]=await once(child,'exit');return {code,log}}
export async function sourceInfo(file){return parseSourceInfo((await command(['-i',file])).log)}
export async function seekableSource(file,options={}){
 if(process.env.OVERLAY_SOURCE_CACHE==='0')return {file,cached:false}
 const s=await stat(file),identity=file+':'+s.size+':'+s.mtimeMs
 if(pending.has(identity))return pending.get(identity)
 const work=(async()=>{
  const key=digest('seek-v1-crf16-copyts:'+await fileDigest(file)),target=resolve(root,key+'.mp4'),meta=target+'.json';await mkdir(root,{recursive:true})
  try{const m=JSON.parse(await readFile(meta,'utf8'));if(m.original)return {file,cached:false,alreadySeekable:true};if(m.bytes===(await stat(target)).size&&m.sha256===await fileDigest(target))return {file:target,cached:true,reused:true}}catch{}
  // Do not transcode an already all-intra source. Inspect actual key frames, not file names.
  const probe=await command(['-loglevel','info','-i',file,'-t','2','-map','0:v:0','-vf',"select='not(key)',showinfo",'-an','-f','null','-'],options.onProcess)
  if(probe.code===0&&!/Parsed_showinfo_[^\n]*\bn:\s*\d+\s+pts:/.test(probe.log)){await writeFile(meta,JSON.stringify({original:true}));return {file,cached:false,alreadySeekable:true}}
  const tmp=target+'.tmp.mp4'
  try{
   const r=await command(['-loglevel','error','-y','-copyts','-start_at_zero','-i',file,'-map','0:v:0','-map','0:a?','-map_metadata','0','-c:v','libx264','-preset','veryfast','-threads','4','-crf','16','-g','1','-keyint_min','1','-fps_mode','passthrough','-c:a','aac','-b:a','192k','-movflags','+faststart',tmp],options.onProcess);if(r.code!==0)throw Error(r.log)
   await rename(tmp,target);await writeFile(meta,JSON.stringify({bytes:(await stat(target)).size,sha256:await fileDigest(target)}));return {file:target,cached:true,reused:false}
  }catch(e){await unlink(tmp).catch(()=>{});return {file,cached:false,warning:String(e.message)}}
 })();pending.set(identity,work);try{return await work}catch(e){pending.delete(identity);throw e}
}

export const pruneSourceCache=()=>pruneCache(root)
