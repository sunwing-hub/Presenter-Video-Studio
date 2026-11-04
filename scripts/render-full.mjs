import {pruneSourceCache} from './source-performance.mjs'
import {fileDigest,treeDigest,digest,segmentKey,restoreSegment,saveSegment,pruneCache} from './render-cache.mjs'
import {browserMedia} from './local-media.mjs'
import {captionRecorder} from './layered-captions.mjs'
import {staticFrameKey} from './static-frame-cache.mjs'
import {sourceAudioGain} from './source-audio.mjs'
import {spawn} from 'node:child_process'
import {once} from 'node:events'
import {stat,unlink,mkdir,readFile,writeFile,rename} from 'node:fs/promises'
import {resolve} from 'node:path'
import {chromium} from 'playwright'
import ffmpegStatic from 'ffmpeg-static'
const ffmpeg=process.env.OVERLAY_FFMPEG||ffmpegStatic
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
 let browser,child,page,cdp,lastStaticKey=null,lastStaticCapture=null
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
  const {project,fps,duration,mainMediaId}=job.payload,{width,height}=project.canvas
  const storyMode=project.canvasLayers.some(l=>l.story)
  const only=project.canvasLayers.filter(l=>l.visible!==false),layered=project.renderPipeline==='layered-v1'&&only.length===1&&only[0].story?.presenterMode==='none'&&only[0].story?.motionVersion===2&&project.canvas.aspectRatio==='9/16'
  if(project.renderPipeline==='layered-v1'&&!layered)job.layeredFallbackReason='当前工程超出已验证的单图层竖屏无露脸动效v2范围，沿用原管线'
  let captions
  job.pipeline=layered?'layered-v1':'legacy'
  let main
  if(mainMediaId)main=await getMedia(mainMediaId)
  else{const file=resolve(directory,'template-background.mp4');await run(['-y','-f','lavfi','-i',`color=c=black:s=${width}x${height}:r=${fps}`,'-t',String(duration),'-an','-c:v','libx264','-preset','ultrafast','-pix_fmt','yuv420p',file]);main={file}}
  if(mainMediaId)await browserMedia(main,{render:true,onProcess:process=>{child=process}})
  const shared=resolve(import.meta.dirname,'../exports/.render-cache/segments'),fingerprints=new Map()
  const renderer=digest(await treeDigest(resolve(directory,'web'))+await fileDigest(new URL('./render-full.mjs',import.meta.url)))
  const fingerprint=async id=>{if(!fingerprints.has(id))fingerprints.set(id,getMedia(id).then(m=>fileDigest(m.file)).catch(()=>null));return fingerprints.get(id)}
  const cacheEnabled=process.env.OVERLAY_SEGMENT_CACHE!=='0'&&project.renderPipeline!=='layered-v1'
  job.crossJobReusedFrames=0
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
   await page.addStyleTag({content:'[data-presenter-overlay]{visibility:hidden!important}'})
   if(layered){await page.evaluate(()=>{document.documentElement.dataset.overlayLayered='1'});await page.addStyleTag({content:'[data-caption],[data-presenter-overlay]{visibility:hidden!important}'});captions=await captionRecorder(browser,width,height,directory)}
  }
  const segments=frameSegments(job.total,fps)
  job.status='rendering';job.frame=0;job.reusedFrames=0;job.nativeFrames=0;job.staticReusedFrames=0
  for(const segment of segments){
   if(job.cancelled)throw Error('已取消')
   const {start,end}=segment,file=resolve(checkpoint,`${start}-${end}.mp4`),marker=file+'.json',temporary=file+'.part.mp4'
   let ready=false
   try{const saved=JSON.parse(await readFile(marker,'utf8'));ready=saved.formatVersion===2&&saved.bytes===(await stat(file)).size&&saved.frames===end-start}catch{}
   if(ready&&!layered){job.frame=end;job.reusedFrames+=end-start;continue}
   const cacheKey=cacheEnabled?await segmentKey(job.payload,start,end,{renderer,mediaFingerprint:fingerprint}):null
   if(cacheKey&&await restoreSegment(shared,cacheKey,file,end-start)){
    await writeFile(marker,JSON.stringify({formatVersion:2,frames:end-start,bytes:(await stat(file)).size}));job.frame=end;job.reusedFrames+=end-start;job.crossJobReusedFrames+=end-start;continue
   }
   if(compatibleNative&&start/fps<sourceDuration&&nativeSegment(project,start/fps,end/fps)){
    const p=project.presenter??{x:50,y:35}
    await run(['-y','-ss',String(start/fps),'-i',main.file,'-an','-vf',`scale=${width}:${height}:force_original_aspect_ratio=increase:out_color_matrix=bt709,crop=${width}:${height}:(iw-ow)*${p.x/100}:(ih-oh)*${p.y/100},setsar=1,fps=${fps},tpad=stop_mode=clone:stop_duration=${(end-start)/fps}`,'-frames:v',String(end-start),...encoding,temporary])
    job.nativeFrames+=end-start;job.frame=end
   }else{
    await preparePage()
    child=spawn(ffmpeg,['-hide_banner','-loglevel','error','-y','-f','image2pipe','-vcodec',storyMode?'mjpeg':'png','-framerate',String(fps),'-i','pipe:0','-an','-vf','scale=out_color_matrix=bt709',...encoding,temporary],{stdio:['pipe','ignore','pipe']})
    let errors='';child.stderr.on('data',b=>errors=(errors+b).slice(-2000));child.stdin.on('error',()=>{})
    const complete=once(child,'exit')
    for(let frame=start;frame<end;frame++){
     if(job.cancelled)throw Error('已取消');if(child.exitCode!==null)throw Error(errors||'编码器提前退出')
     await page.evaluate(t=>window.__overlayRenderAt(t),frame/fps)
     // Fast PNG compression remains lossless; no JPEG quality loss for type/icons.
     const backgroundKey=layered?await captions.record(page):null
     const key=layered?backgroundKey:process.env.OVERLAY_STATIC_FRAME_CACHE==='1'?await page.evaluate(staticFrameKey):null
     const reused=key!==null&&key===lastStaticKey&&lastStaticCapture
     const capture=reused||await cdp.send('Page.captureScreenshot',storyMode?{format:'jpeg',quality:95,optimizeForSpeed:true,captureBeyondViewport:false}:{format:'png',optimizeForSpeed:true,captureBeyondViewport:false})
     if(reused)job.staticReusedFrames++;lastStaticKey=key;lastStaticCapture=key?capture:null
     await new Promise((res,rej)=>child.stdin.write(Buffer.from(capture.data,'base64'),e=>e?rej(e):res()));job.frame=frame+1
    }
    child.stdin.end();if((await complete)[0]!==0)throw Error(errors||'片段编码失败')
   }
   if(job.cancelled)throw Error('已取消')
   await rename(temporary,file)
   await writeFile(marker,JSON.stringify({formatVersion:2,frames:end-start,bytes:(await stat(file)).size}))
   if(cacheKey)await saveSegment(shared,cacheKey,file,end-start).catch(()=>{})
  }
  if(cacheEnabled)await pruneCache(shared).catch(()=>{})
  job.status='encoding'
  const list=resolve(checkpoint,'concat.txt')
  await writeFile(list,segments.map(({start,end})=>`file '${start}-${end}.mp4'`).join('\n'))
  await run(['-y','-f','concat','-safe','1','-i',list,'-an','-c:v','copy',silent])
  if(layered){const cap=await captions.finish(fps),composed=resolve(directory,'captioned.mp4');job.captionImages=cap.images;job.captionRuns=cap.runs;await run(['-y','-i',silent,'-f','concat','-safe','0','-i',cap.list,'-filter_complex','[0:v][1:v]overlay=0:0:eof_action=pass:format=auto[v]','-map','[v]','-an','-frames:v',String(job.total),'-r',String(fps),...encoding,composed]);await rename(composed,silent)}
  const pip=only.length===1?only[0].story?.presenterOverlay:null
  if(pip){const {composePresenter}=await import('./compose-presenter.mjs');await composePresenter({pip,mainFile:(await getMedia(pip.mediaId)).file,silent,directory,fps,total:job.total,width,height,run,encoding})}
  if(project.finalAudioCopy){const media=await getMedia(project.finalAudioCopy.mediaId),probe=spawn(ffmpeg,['-i',media.file],{stdio:['ignore','ignore','pipe']});let info='';probe.stderr.on('data',b=>info+=b);await once(probe,'exit');const len=info.match(/Duration:\s*(\d+):(\d+):([\d.]+)/),seconds=len?Number(len[1])*3600+Number(len[2])*60+Number(len[3]):0;if(!/Audio: aac/.test(info)||seconds<duration-.05)throw Error('最终音轨复制要求足够长的AAC音轨，不自动重编码');await run(['-y','-i',silent,'-i',media.file,'-map','0:v:0','-map','1:a:0','-c','copy','-t',String(job.total/fps),'-movflags','+faststart',job.file]);job.audioCopied=true;job.bytes=(await stat(job.file)).size;job.status='done';return}
  const voiceGain=sourceAudioGain(project,duration)
  const sounds=project.audioClips??[];let args=['-y','-i',silent,'-i',main.file]
  if(sounds.length){
   const hasVoice=/Stream.*Audio:/.test(sourceInfo),filters=[],labels=[]
   if(hasVoice&&voiceGain>0){const replacements=(project.canvasLayers??[]).filter(l=>l.visible!==false&&l.review?.project.media.voice).map(l=>`,volume=0:enable='gte(t,${l.start})*lt(t,${l.end})'`).join('');filters.push(`[1:a:0]apad,atrim=duration=${duration},asetpts=PTS-STARTPTS,volume=${voiceGain}${replacements}[voice]`);labels.push('[voice]')}
   for(let i=0;i<sounds.length;i++){
    const c=sounds[i],media=await getMedia(c.mediaId);if(c.loop!==false)args.push('-stream_loop','-1');args.push('-i',media.file)
    filters.push(audioClipFilter(c,`[${i+2}:a:0]`,`[a${i}]`));labels.push(`[a${i}]`)
   }
   filters.push(`${labels.join('')}amix=inputs=${labels.length}:normalize=0,alimiter=limit=0.85:level=disabled:latency=1,apad,atrim=duration=${duration}[mix]`)
   args.push('-filter_complex',filters.join(';'),'-map','0:v:0','-map','[mix]')
  }else if(voiceGain>0)args.push('-map','0:v:0','-map','1:a:0?','-af',`volume=${voiceGain},apad`)
  else args.push('-map','0:v:0','-an')
  args.push('-c:v','copy','-c:a','aac','-b:a','192k','-t',String(duration),'-movflags','+faststart',job.file)
  await run(args);job.bytes=(await stat(job.file)).size;job.status='done'
 }catch(e){job.status=job.cancelled?'cancelled':'error';job.error=e.message;child?.kill('SIGTERM')}
 finally{await browser?.close().catch(()=>{});await pruneSourceCache().catch(()=>{});await unlink(silent).catch(()=>{});if(job.status!=='done')await unlink(job.file).catch(()=>{});delete job.payload;delete job.stop}
}
