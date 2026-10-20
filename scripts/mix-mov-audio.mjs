import {spawn} from 'node:child_process'
import {once} from 'node:events'
import ffmpeg from 'ffmpeg-static'
import {audioClipFilter} from './audio-filter.mjs'

/** Copy the ProRes alpha stream and add timed sound effects, without re-encoding video. */
export async function mixMovAudio(input,output,clips,duration,onSpawn=()=>{}){
 if(!clips.length)return
 const args=['-y','-i',input],filters=[],labels=[]
 for(let i=0;i<clips.length;i++){
  const clip=clips[i]
  if(clip.loop!==false)args.push('-stream_loop','-1')
  args.push('-i',clip.file)
  filters.push(audioClipFilter(clip,`[${i+1}:a:0]`,`[a${i}]`))
  labels.push(`[a${i}]`)
 }
 filters.push(`${labels.join('')}amix=inputs=${labels.length}:normalize=0,alimiter=limit=0.95:latency=1,apad,atrim=duration=${duration}[mix]`)
 args.push('-filter_complex',filters.join(';'),'-map','0:v:0','-map','[mix]','-c:v','copy','-c:a','pcm_s16le','-t',String(duration),'-f','mov',output)
 const child=spawn(ffmpeg,args,{stdio:['ignore','ignore','pipe']})
 onSpawn(child)
 let errors='';child.stderr.on('data',chunk=>errors=(errors+chunk).slice(-3000))
 const [code]=await once(child,'exit')
 if(code!==0)throw Error(errors||'MOV 音效合成失败')
}
