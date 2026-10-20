import {spawn} from 'node:child_process'
import {once} from 'node:events'
import {stat,unlink,mkdir,readFile,writeFile,rename} from 'node:fs/promises'
import {resolve} from 'node:path'
import {chromium} from 'playwright'
import ffmpeg from 'ffmpeg-static'
import {getMedia} from './local-media.mjs'
import {audioClipFilter} from './audio-filter.mjs'

export function nativeSegment(project,start,end){
 const p=project.presenter??{mode:'full',x:50,y:35,zoom:1}
 if(p.mode!=='full'||p.zoom!==1||project.captionStyle?.enabled)return false
 if((project.canvasLayers??[]).some(l=>l.visible!==false&&(l.start??0)<end&&(l.end??Infinity)>start))return false
 if((project.layouts??[]).some(c=>c.start<end&&c.end+(c.transition??0)>start))return false
 return true
}
export function frameSegments(total,fps,seconds=10){const size=Math.max(1,Math.round(fps*seconds));return Array.from({length:Math.ceil(total/size)},(_,i)=>({start:i*size,end:Math.min(total,(i+1)*size)}))}

export async function renderFull(job,origin){
 let browser,child,page,cdp
 const silent=job.file+'.silent.mp4',directory=job.directory??job.file+'.work'
 const checkpoint=resolve(directory,'segments');await mkdir(checkpoint,{recursive:true})
 const run=async(args)=>{
  if(job.cancelled)throw Error('已取消')
  child=spawn(ffmpeg,['-hide_banner','-loglevel','error',...args],{stdio:['ignore','ignore','pipe']})
  let errors='';child.stderr.on('data',b=>errors=(errors+b).slice(-3000))
  const [code]=await once(child,'exit');if(code!==0)throw Error(errors||'视频处理失败');if(job.cancelled)throw Error('已取消')
 }
 job.stop=()=>{child?.kill('SIGTERM');void browser?.close()}
 try{
  await stat(ffmpeg).catch(()=>{throw Error('本地 FFmpeg 尚未安装完成')})
  const {project,fps,duration,mainMediaId}=job.payload,{width,height}=project.canvas,main=await getMedia(mainMediaId)
  const probe=spawn(ffmpeg,['-i',main.file],{stdio:['ignore','ignore','pipe']});let sourceInfo='';probe.stderr.on('data',b=>sourceInfo+=b);await once(probe,'exit')
  const length=sourceInfo.match(/Duration:\s*(\d+):(\d+):([\d.]+)/),sourceDuration=length?Number(length[1])*3600+Number(length[2])*60+Number(length[3]):0
  const sourceFps=Number(sourceInfo.match(/Video:[^\n]*?([\d.]+) fps/)?.[1])
  const compatibleNative=sourceDuration>0&&Math.abs(sourceFps-fps)<.001&&!/rotation of (?!-?0\.00 degrees)/.test(sourceInfo)&&!(/SAR /.test(sourceInfo)&&!/SAR 1:1/.test(sourceInfo))
  const encoding=['-c:v','libx264','-preset','fast','-crf','19','-pix_fmt','yuv420p','-colorspace','bt709','-color_primaries','bt709','-color_trc','bt709','-video_track_timescale',String(fps*1000)]
  const preparePage=async()=>{
   if(page)return
   browser=await chromium.launch({headless:true});page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1})
   await page.route('**/*',r=>r.request().url().startsWith(origin+'/')||r.request().url().startsWith('data:')||r.request().url().startsWith('blob:')?r.continue():r.abort())
   await page.goto(`${origin}/?renderJob=${job.id}`,{waitUntil:'domcontentloaded'})
   await page.waitForFunction(()=>window.__overlayReady===true,{},{timeout:45000})
   cdp=await page.context().newCDPSession(page)
  }
  const segments=frameSegments(job.total,fps)
  job.status='rendering';job.frame=0;job.reusedFrames=0;job.nativeFrames=0
  for(const segment of segments){
   if(job.cancelled)throw Error('已取消')
   const {start,end}=segment,file=resolve(checkpoint,`${start}-${end}.mp4`),marker=file+'.json',temporary=file+'.part.mp4'
   let ready=false
   try{const saved=JSON.parse(await readFile(marker,'utf8'));ready=saved.formatVersion===2&&saved.bytes===(await stat(file)).size&&saved.frames===end-start}catch{}
   if(ready){job.frame=end;job.reusedFrames+=end-start;continue}
   if(compatibleNative&&start/fps<sourceDuration&&nativeSegment(project,start/fps,end/fps)){
    const p=project.presenter??{x:50,y:35}
    await run(['-y','-ss',String(start/fps),'-i',main.file,'-an','-vf',`scale=${width}:${height}:force_original_aspect_ratio=increase:out_color_matrix=bt709,crop=${width}:${height}:(iw-ow)*${p.x/100}:(ih-oh)*${p.y/100},setsar=1,fps=${fps},tpad=stop_mode=clone:stop_duration=${(end-start)/fps}`,'-frames:v',String(end-start),...encoding,temporary])
    job.nativeFrames+=end-start;job.frame=end
   }else{
    await preparePage()
    child=spawn(ffmpeg,['-hide_banner','-loglevel','error','-y','-f','image2pipe','-vcodec','png','-framerate',String(fps),'-i','pipe:0','-an','-vf','scale=out_color_matrix=bt709',...encoding,temporary],{stdio:['pipe','ignore','pipe']})
    let errors='';child.stderr.on('data',b=>errors=(errors+b).slice(-2000));child.stdin.on('error',()=>{})
    const complete=once(child,'exit')
    for(let frame=start;frame<end;frame++){
     if(job.cancelled)throw Error('已取消');if(child.exitCode!==null)throw Error(errors||'编码器提前退出')
     await page.evaluate(t=>window.__overlayRenderAt(t),frame/fps)
     // Fast PNG compression remains lossless; no JPEG quality loss for type/icons.
     const capture=await cdp.send('Page.captureScreenshot',{format:'png',optimizeForSpeed:true,captureBeyondViewport:false})
     await new Promise((res,rej)=>child.stdin.write(Buffer.from(capture.data,'base64'),e=>e?rej(e):res()));job.frame=frame+1
    }
    child.stdin.end();if((await complete)[0]!==0)throw Error(errors||'片段编码失败')
   }
   if(job.cancelled)throw Error('已取消')
   await rename(temporary,file)
   await writeFile(marker,JSON.stringify({formatVersion:2,frames:end-start,bytes:(await stat(file)).size}))
  }
  job.status='encoding'
  const list=resolve(checkpoint,'concat.txt')
  await writeFile(list,segments.map(({start,end})=>`file '${start}-${end}.mp4'`).join('\n'))
  await run(['-y','-f','concat','-safe','1','-i',list,'-an','-c:v','copy',silent])
  const sounds=project.audioClips??[];let args=['-y','-i',silent,'-i',main.file]
  if(sounds.length){
   const hasVoice=/Stream.*Audio:/.test(sourceInfo),filters=[],labels=[]
   if(hasVoice){filters.push(`[1:a:0]apad,atrim=duration=${duration},asetpts=PTS-STARTPTS[voice]`);labels.push('[voice]')}
   for(let i=0;i<sounds.length;i++){
    const c=sounds[i],media=await getMedia(c.mediaId);if(c.loop!==false)args.push('-stream_loop','-1');args.push('-i',media.file)
    filters.push(audioClipFilter(c,`[${i+2}:a:0]`,`[a${i}]`));labels.push(`[a${i}]`)
   }
   filters.push(`${labels.join('')}amix=inputs=${labels.length}:normalize=0,alimiter=limit=0.95:latency=1,apad,atrim=duration=${duration}[mix]`)
   args.push('-filter_complex',filters.join(';'),'-map','0:v:0','-map','[mix]')
  }else args.push('-map','0:v:0','-map','1:a:0?','-af','apad')
  args.push('-c:v','copy','-c:a','aac','-b:a','192k','-t',String(duration),'-movflags','+faststart',job.file)
  await run(args);job.bytes=(await stat(job.file)).size;job.status='done'
 }catch(e){job.status=job.cancelled?'cancelled':'error';job.error=e.message;child?.kill('SIGTERM')}
 finally{await browser?.close().catch(()=>{});await unlink(silent).catch(()=>{});if(job.status!=='done')await unlink(job.file).catch(()=>{});delete job.payload;delete job.stop}
}
