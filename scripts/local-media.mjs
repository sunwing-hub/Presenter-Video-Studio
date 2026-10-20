import {mkdir,open,readFile,writeFile,stat,unlink,rename} from 'node:fs/promises'
import {createReadStream} from 'node:fs'
import {resolve} from 'node:path'
import {randomUUID} from 'node:crypto'
import {spawn} from 'node:child_process'
import ffmpegPath from 'ffmpeg-static'
export const mediaDir=resolve(import.meta.dirname,'../media')
const playableJobs=new Map()

export function parseByteRange(header,size){
 const match=/^bytes=(\d*)-(\d*)$/.exec(header)
 if(!match||(!match[1]&&!match[2])||size<1)return null
 if(!match[1]){
  const suffix=Number(match[2]);if(!Number.isSafeInteger(suffix)||suffix<=0)return null
  return {start:Math.max(0,size-suffix),end:size-1}
 }
 const start=Number(match[1]),requestedEnd=match[2]?Number(match[2]):size-1
 if(!Number.isSafeInteger(start)||!Number.isSafeInteger(requestedEnd)||start>=size||requestedEnd<start)return null
 return {start,end:Math.min(requestedEnd,size-1)}
}

// Some .mp4-named exports are actually QuickTime files with PCM audio. Keep
// the original bytes and remux only the browser preview (H.264 stays lossless).
export async function browserMedia(meta){
 const original=resolve(mediaDir,meta.id)
 if(meta.type!=='video')return {file:original,mime:meta.mime}
 const handle=await open(original,'r'),header=Buffer.alloc(12)
 try{await handle.read(header,0,header.length,0)}finally{await handle.close()}
 if(header.toString('latin1',8,12)!=='qt  ')return {file:original,mime:meta.mime}
 const playable=resolve(mediaDir,`${meta.id}.browser.mp4`)
 try{if((await stat(playable)).size>0)return {file:playable,mime:'video/mp4'}}catch{}
 let job=playableJobs.get(meta.id)
 if(!job){
  job=(async()=>{
   const temporary=`${playable}.${randomUUID()}.tmp`
   try{
    await new Promise((done,fail)=>{
     const process=spawn(ffmpegPath,['-hide_banner','-loglevel','error','-y','-i',original,'-map','0:v:0','-map','0:a?','-c:v','copy','-c:a','aac','-b:a','192k','-movflags','+faststart','-f','mp4',temporary],{stdio:['ignore','ignore','pipe']})
     let errors='';process.stderr.on('data',chunk=>{errors+=chunk.toString().slice(0,2000)})
     process.on('error',fail);process.on('close',code=>code===0?done():fail(Error(errors||`视频兼容处理失败 (${code})`)))
    })
    if((await stat(temporary)).size===0)throw Error('视频兼容处理生成了空文件')
    await rename(temporary,playable)
   }catch(error){await unlink(temporary).catch(()=>{});throw error}
  })().finally(()=>playableJobs.delete(meta.id))
  playableJobs.set(meta.id,job)
 }
 await job
 return {file:playable,mime:'video/mp4'}
}
export async function getMedia(id){
 if(typeof id!=='string'||!/^[a-f0-9-]{36}$/.test(id))throw Error('素材编号无效')
 const meta=JSON.parse(await readFile(resolve(mediaDir,`${id}.json`),'utf8'))
 return {...meta,file:resolve(mediaDir,id)}
}
export async function mediaRoute(req,res,path){
 if(path==='/__studio/media'&&req.method==='POST'){
  const mime=(req.headers['content-type']||'').split(';')[0]
  if(!['video/mp4','video/quicktime','video/webm','image/png','image/jpeg','image/webp','audio/mpeg','audio/mp3','audio/mp4','audio/x-m4a','audio/wav','audio/x-wav','audio/aac','audio/ogg','audio/flac','audio/webm'].includes(mime))throw Error('请选择常见视频、图片或 MP3、M4A、WAV 音频')
  await mkdir(mediaDir,{recursive:true});const id=randomUUID(),file=resolve(mediaDir,id),handle=await open(file,'wx');let size=0
  try{for await(const chunk of req){size+=chunk.length;if(size>4*1024**3)throw Error('单个素材不能超过 4GB');await handle.write(chunk)}}catch(e){await handle.close();await unlink(file).catch(()=>{});throw e}
  await handle.close()
  const meta={id,mime,type:mime.startsWith('audio/')?'audio':mime.startsWith('video/')?'video':'image',name:decodeURIComponent(req.headers['x-media-name']||'素材').slice(0,250),url:`/__studio/media/${id}`}
  await writeFile(resolve(mediaDir,`${id}.json`),JSON.stringify(meta))
  res.setHeader('Content-Type','application/json');res.end(JSON.stringify(meta));return true
 }
 const match=path.match(/^\/__studio\/media\/([a-f0-9-]{36})$/)
 if(match&&['GET','HEAD'].includes(req.method)){
  const m=await getMedia(match[1]),browser=await browserMedia(m),size=(await stat(browser.file)).size
  const range=req.headers.range?parseByteRange(req.headers.range,size):{start:0,end:size-1}
  res.setHeader('Accept-Ranges','bytes')
  if(!range){res.statusCode=416;res.setHeader('Content-Range',`bytes */${size}`);res.end();return true}
  if(req.headers.range){res.statusCode=206;res.setHeader('Content-Range',`bytes ${range.start}-${range.end}/${size}`)}
  res.setHeader('Content-Type',browser.mime);res.setHeader('Content-Length',range.end-range.start+1)
  if(req.method==='HEAD')res.end();else createReadStream(browser.file,{start:range.start,end:range.end}).pipe(res);return true
 }
 return false
}
