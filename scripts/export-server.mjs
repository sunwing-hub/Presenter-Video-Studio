import { spawn } from 'node:child_process'
import { copyFile, mkdir, rename, stat, unlink } from 'node:fs/promises'
import { createReadStream } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { resolve } from 'node:path'
import { once } from 'node:events'
import { chromium } from 'playwright'
import { validatePlan, validateCues } from '../src/arrangement.ts'
import {validateLayouts} from '../src/layoutTimeline.ts'
import {mediaRoute,getMedia} from './local-media.mjs'
import {draftRoute} from './draft-store.mjs'
import {renderFull} from './render-full.mjs'
import {validateAudio,validateCaption} from '../src/trackModel.ts'
import {transcriptionRoute} from './transcription-server.mjs'
import {mixMovAudio} from './mix-mov-audio.mjs'
import {readJob,listJobs,launchJob,cancelJob} from './export-jobs.mjs'

const root = resolve(import.meta.dirname, '..')
const outputDir = resolve(root, 'exports')
const encoder = resolve(root, 'node_modules/.cache/overlay-alpha-encoder')
const jobs = new Map()
let active = null
let arrangement = null
const localMediaUrl = /^\/__studio\/media\/[a-f0-9-]{36}$/
const imageDataUrl = /^data:image\/(png|jpeg|webp|gif);base64,/
const safeFileName = (value,ext='mov') => {
  const base=String(value || '动效图层').replace(/\.(mov|mp4)$/i,'').replace(/[\x00-\x1f/:*?"<>|\\]/g,'-').replace(/^\.+|\.+$/g,'').trim().slice(0,80)
  if(!base) throw Error('请输入有效文件名。')
  return `${base}.${ext}`
}
async function availableOutput(name) {
  const ext=name.split('.').pop(),stem=name.slice(0,-ext.length-1)
  const reserved=new Set((await listJobs()).map(j=>j.file))
  for(let index=1;index<1000;index++) {const candidate=resolve(outputDir,index===1?name:`${stem}-${index}.${ext}`);if(!reserved.has(candidate)&&!await stat(candidate).then(()=>true).catch(()=>false))return candidate}
  throw Error('同名导出文件过多，请更换文件名。')
}
async function chooseSaveLocation(defaultName) {
  if(process.platform!=='darwin') return undefined
  const script=[
    'on run argv',
    'try',
    'set destinationFile to choose file name with prompt "保存导出视频" default name (item 1 of argv) default location (path to desktop folder)',
    'return POSIX path of destinationFile',
    'on error number -128',
    'return "__CANCELLED__"',
    'end try',
    'end run',
  ]
  const child=spawn('/usr/bin/osascript',script.flatMap(line=>['-e',line]).concat(defaultName))
  let output='',errors=''
  child.stdout.on('data',chunk=>output+=chunk)
  child.stderr.on('data',chunk=>errors+=chunk)
  const [code]=await once(child,'exit')
  if(code!==0) throw Error(errors.trim() || '无法打开系统保存窗口。')
  const destination=output.trim()
  return destination==='__CANCELLED__'?null:destination
}
export function validateExport(body) {
  if(body?.kind!==undefined&&!['mov','mp4'].includes(body.kind))throw Error('导出格式无效')
  if (!body || ![24,25,30,50,60].includes(body.fps)) throw Error('请选择 24 / 25 / 30 / 50 / 60 fps。')
  if (!Number.isFinite(body.duration) || body.duration <= 0 || body.duration > 3600) throw Error('导出时长需在 0–3600 秒之间。')
  const p = body.project, c = p?.canvas
  if (!c || !Number.isInteger(c.width) || !Number.isInteger(c.height) || c.width<2 || c.height<2 || c.width>3840 || c.height>3840) throw Error('画布尺寸无效。')
  const dimensions = {'16/9':[1920,1080],'4/3':[1440,1080],'1/1':[1080,1080],'3/4':[1080,1440],'9/16':[1080,1920],'4/5':[1080,1350]}
  const expected = dimensions[c.aspectRatio]
  if(!expected || c.width!==expected[0] || c.height!==expected[1]) throw Error('画布比例与尺寸不匹配，请在工作台重新选择比例。')
  if (!Array.isArray(p.canvasLayers) || (body.kind!=='mp4'&&!p.canvasLayers.length) || p.canvasLayers.length>500) throw Error('请先添加动效或文字（最多 500 层）。')
  if (body.kind!=='mp4'&&!p.canvasLayers.some(l=>l.visible !== false)) throw Error('没有可导出的可见图层。')
  p.audioClips=validateAudio(p.audioClips??[],body.duration)
  if(body.kind==='mp4'){
    p.captionStyle=validateCaption(p.captionStyle)
    p.cues=validateCues(p.cues??[])
    if(!/^[a-f0-9-]{36}$/.test(body.mainMediaId??''))throw Error('请导入人物视频')
    p.layouts=validateLayouts(p.layouts??[],body.duration)
    if(p.presenter)validateLayouts([{id:'fallback',start:0,end:body.duration,settings:p.presenter,transition:0,offset:0}],body.duration)
    // Split/circle layouts can be filled by the editable motion-card plane.
    // A separate content video is optional; requiring mediaId here made the
    // preview work but blocked the final MP4 export for card-only layouts.
    if(p.presenter?.mode&&p.presenter.mode!=='full'&&(p.layouts.length===0||p.layouts[0].start>0||p.layouts.at(-1).end<body.duration||p.layouts.some((c,i)=>i>0&&c.start>p.layouts[i-1].end)))throw Error('布局空档没有内容素材，请把上方默认人物布局设为人物全屏，或用布局时间段覆盖整个视频。')
  }
  for(const layer of p.canvasLayers) {
    if(!layer || !['card','text','image'].includes(layer.type) || !['x','y','width','height','fontSize','zIndex'].every(k=>Number.isFinite(layer[k]))) throw Error('图层位置或尺寸无效。')
    if(layer.width<=0 || layer.height<=0 || (layer.start!==undefined && (!Number.isFinite(layer.start)||!Number.isFinite(layer.end)||layer.start<0||layer.end<=layer.start))) throw Error('图层时间或大小无效。')
    if(layer.type==='image' && layer.mediaType==='video') {
      if(!/^\/__studio\/media\/[a-f0-9-]{36}$/.test(layer.assetUrl || '') || !Number.isFinite(layer.sourceOffset??0) || (layer.sourceOffset??0)<0) throw Error('视频素材地址或起始时间无效。')
    } else if(layer.type==='image' && !localMediaUrl.test(layer.assetUrl || '') && (!imageDataUrl.test(layer.assetUrl || '') || layer.assetUrl.length>45e6)) throw Error(`图片「${layer.assetName || layer.id}」地址无效或过大，请重新导入本地图片。`)
  }
  for(const image of [body.sourceImage,body.insertImage]) if(image && (!/^data:image\/(png|jpeg|webp|gif);base64,/.test(image.url) || image.url.length>45e6)) throw Error('图片仅支持本地 PNG、JPEG、WebP、GIF，单张不超过 32MB。')
  body.fileName=safeFileName(body.fileName,body.kind==='mp4'?'mp4':'mov')
  return body
}
// Library uploads and restored drafts reference persisted media rather than
// base64 strings. Validate the stored file before starting either export path.
export async function validateExportImages(body, lookup=getMedia, fileStat=stat) {
  const checked=new Set()
  for(const layer of body.project.canvasLayers){
    if(layer.type!=='image'||layer.mediaType==='video'||!localMediaUrl.test(layer.assetUrl || '')||checked.has(layer.assetUrl))continue
    const label=layer.assetName || layer.id
    let media,info
    try{media=await lookup(layer.assetUrl.split('/').at(-1));info=await fileStat(media.file)}
    catch{throw Error(`图片「${label}」的本地文件丢失或无法读取，请重新导入。`)}
    if(media.type!=='image'||!['image/png','image/jpeg','image/webp','image/gif'].includes(media.mime))throw Error(`图片「${label}」不是支持的 PNG、JPEG、WebP 或 GIF 图片。`)
    if(!info.isFile()||info.size<=0)throw Error(`图片「${label}」为空或无效，请重新导入。`)
    if(info.size>32*1024**2)throw Error(`图片「${label}」超过 32MB，请缩小这张图片后重新导入。`)
    checked.add(layer.assetUrl)
  }
}
async function ensureEncoder() {
  if(process.platform!=='darwin') throw Error('此透明 MOV 导出器目前仅支持 macOS。')
  const source=resolve(root,'scripts/encode-alpha.m')
  if(await stat(encoder).then(async s=>s.mtimeMs >= (await stat(source)).mtimeMs).catch(()=>false)) return
  await mkdir(resolve(root,'node_modules/.cache'),{recursive:true})
  const child=spawn('/usr/bin/clang',['-fobjc-arc','-fno-modules','-framework','AVFoundation','-framework','Foundation','-framework','CoreVideo','-framework','CoreMedia','-framework','ImageIO','-framework','CoreGraphics',source,'-o',encoder])
  let errors=''; child.stderr.on('data',b=>errors+=b)
  const [code]=await once(child,'exit')
  if(code!==0) throw Error('本地 MOV 编码器准备失败，请安装 Apple Command Line Tools。'+errors.slice(-300))
}
export async function renderTransparent(job, origin) {
  let browser, child, muxed
  try {
    await ensureEncoder()
    if(job.cancelled) return
    await mkdir(outputDir,{recursive:true})
    browser=await chromium.launch({headless:true})
    job.stop=()=>{ child?.kill('SIGTERM'); void browser?.close() }
    if(job.cancelled) {job.stop();return}
    const {project,fps,duration}=job.payload, {width,height}=project.canvas
    const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1})
    const cdp=await page.context().newCDPSession(page)
    await cdp.send('Emulation.setDefaultBackgroundColorOverride',{color:{r:0,g:0,b:0,a:0}})
    // Rendering never needs network access beyond this same local server.
    await page.route('**/*', route=>{const url=route.request().url();return url.startsWith(origin+'/') || url.startsWith('data:') || url.startsWith('blob:') ? route.continue() : route.abort()})
    await page.goto(`${origin}/?renderJob=${job.id}`,{waitUntil:'domcontentloaded'})
    await page.waitForFunction(()=>window.__overlayReady===true,{},{timeout:30000})
    const total=Math.ceil(duration*fps)
    job.total=total;job.status='rendering'
    child=spawn(encoder,[job.file,String(width),String(height),String(fps),String(total)],{stdio:['pipe','ignore','pipe']})
    let errors=''; child.stderr.on('data',b=>errors=(errors+b).slice(-3000))
    child.stdin.on('error',()=>{})
    const completion=once(child,'exit')
    for(let frame=0;frame<total;frame++) {
      if(job.cancelled) throw Error('已取消导出')
      if(child.exitCode!==null) throw Error(errors || '编码器提前退出')
      await page.evaluate(t=>window.__overlayRenderAt(t),frame/fps)
      const capture=await cdp.send('Page.captureScreenshot',{format:'png',optimizeForSpeed:true,captureBeyondViewport:false})
      const png=Buffer.from(capture.data,'base64')
      const header=Buffer.alloc(4);header.writeUInt32BE(png.length)
      const buffer=Buffer.concat([header,png])
      await new Promise((res,rej)=>child.stdin.write(buffer,e=>e?rej(e):res()))
      job.frame=frame+1
    }
    job.status='encoding'; child.stdin.end()
    const [code]=await completion
    if(code!==0) throw Error(errors || 'MOV 编码失败')
    if(project.audioClips.length){
      muxed=`${job.file}.${randomUUID()}.mov`
      const sounds=await Promise.all(project.audioClips.map(async clip=>({...clip,file:(await getMedia(clip.mediaId)).file})))
      await mixMovAudio(job.file,muxed,sounds,duration,process=>{child=process})
      await rename(muxed,job.file);muxed=undefined
    }
    job.status='done';job.bytes=(await stat(job.file)).size
    delete job.payload // release image data when finished
  } catch(error) {
    job.status=job.cancelled?'cancelled':'error';job.error=String(error.message || error)
    child?.kill('SIGTERM')
  } finally {
    await browser?.close().catch(()=>{})
    if(job.cancelled) job.status='cancelled'
    if(['cancelled','error'].includes(job.status)) await unlink(job.file).catch(()=>{})
    if(muxed)await unlink(muxed).catch(()=>{})
    delete job.payload
    delete job.stop;active=null
  }
}
export function exportServer() {
  const attach=server=>{ server.middlewares.use(async(req,res,next)=>{
    if(!req.url?.startsWith('/__studio/')) return next()
    const origin=`http://${req.headers.host}`
    const reply=(status,data)=>{res.statusCode=status;res.setHeader('Content-Type','application/json');res.end(JSON.stringify(data))}
    try {
      if(!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin) || (req.headers.origin && req.headers.origin!==origin)) return reply(403,{error:'仅允许同源本机请求'})
      const path=new URL(req.url,origin).pathname
      if(await draftRoute(req,res,path))return
      if(await transcriptionRoute(req,res,path))return
      if(await mediaRoute(req,res,path))return
      if(path==='/__studio/export-jobs'&&req.method==='GET')return reply(200,(await listJobs()).map(({id,status,frame,total,error,bytes,fileName,file,createdAt,kind})=>({id,status,frame,total,error,bytes,fileName,createdAt,kind,path:status==='done'?file:undefined})))
      if(path==='/__studio/arrangement' && req.method==='GET') return reply(200,arrangement)
      if(path==='/__studio/arrangement' && req.method==='POST') {
        if(!req.headers['content-type']?.startsWith('application/json')) return reply(415,{error:'需要 JSON'})
        let size=0;const chunks=[]
        for await(const chunk of req) {size+=chunk.length;if(size>5e6)return reply(413,{error:'编排文件过大'});chunks.push(chunk)}
        const input=JSON.parse(Buffer.concat(chunks).toString('utf8')), cues=validateCues(input.cues), plan=validatePlan(input.plan,cues)
        arrangement={id:randomUUID(),plan,cues,subtitleName:typeof input.subtitleName==='string'?input.subtitleName:'助手字幕'}
        return reply(201,{id:arrangement.id,cards:plan.cards.length})
      }
      if(path==='/__studio/export' && req.method==='POST') {
        if(active) return reply(409,{error:'已有导出任务，请等待完成或先取消。'})
        if(!req.headers['content-type']?.startsWith('application/json')) return reply(415,{error:'需要 JSON'})
        let size=0;const chunks=[]
        for await(const chunk of req) {size+=chunk.length;if(size>100e6) return reply(413,{error:'素材超过 100MB，请缩小插入图片。'});chunks.push(chunk)}
        const payload=validateExport(JSON.parse(Buffer.concat(chunks).toString('utf8'))),id=randomUUID()
        await validateExportImages(payload)
        for(const layer of payload.project.canvasLayers)if(layer.type==='image'&&layer.mediaType==='video'){
          const media=await getMedia(layer.assetUrl.split('/').at(-1));if(media.type!=='video')throw Error('视频图层需要视频素材')
        }
        if(payload.kind==='mp4'){await getMedia(payload.mainMediaId);for(const c of payload.project.layouts)if(c.mediaId)await getMedia(c.mediaId)}
        for(const c of payload.project.audioClips){const m=await getMedia(c.mediaId);if(m.type!=='audio')throw Error('音效轨道只能放音频素材')}
        await mkdir(outputDir,{recursive:true})
        const job={id,status:'preparing',frame:0,total:Math.ceil(payload.duration*payload.fps),payload,file:await availableOutput(payload.fileName),fileName:payload.fileName}
        await launchJob({...job,kind:payload.kind??'mov'})
        reply(202,{id});return
      }
      const match=path.match(/^\/__studio\/export\/([a-f0-9-]+)(?:\/(payload|file|cancel|reveal|save-as|resume))?$/)
      const job=match && (jobs.get(match[1])??await readJob(match[1]));if(!job) return reply(404,{error:'任务不存在，请重新导出。'})
      if(match[2]==='resume'&&req.method==='POST'){
        if(!['error','interrupted','cancelled'].includes(job.status))return reply(409,{error:'此任务不需要恢复。'})
        // Never overwrite a completed file, even for tasks created before reservations existed.
        if(await stat(job.file).then(()=>true).catch(()=>false))job.file=await availableOutput(job.fileName)
        await launchJob(job,{resume:true});return reply(202,{id:job.id})
      }
      if(match[2]==='payload' && req.method==='GET') return reply(200,job.payload ?? {})
      if(match[2]==='cancel' && req.method==='POST') {await cancelJob(job.id);return reply(200,{ok:true})}
      if(match[2]==='reveal' && req.method==='POST') {if(job.status!=='done')return reply(409,{error:'文件尚未完成'});spawn('/usr/bin/open',['-R',job.file],{detached:true,stdio:'ignore'}).unref();return reply(200,{ok:true})}
      if(match[2]==='save-as' && req.method==='POST') {
        if(job.status!=='done') return reply(409,{error:'文件尚未完成'})
        const destination=await chooseSaveLocation(job.fileName)
        if(destination===undefined) return reply(501,{error:'当前系统不支持原生保存窗口'})
        if(destination===null) return reply(200,{cancelled:true})
        await copyFile(job.file,destination)
        return reply(200,{ok:true,path:destination})
      }
      if(match[2]==='file' && req.method==='GET') {
        if(job.status!=='done') return reply(409,{error:'文件尚未完成'})
        res.setHeader('Content-Type',job.fileName.endsWith('.mp4')?'video/mp4':'video/quicktime');res.setHeader('Content-Disposition',`attachment; filename*=UTF-8''${encodeURIComponent(job.fileName)}`)
        res.setHeader('Content-Length',String(job.bytes));createReadStream(job.file).pipe(res);return
      }
      if(!match[2] && req.method==='GET') return reply(200,{id:job.id,status:job.status,frame:job.frame,total:job.total,error:job.error,bytes:job.bytes,fileName:job.fileName,path:job.status==='done'?job.file:undefined})
      reply(405,{error:'不支持此操作'})
    }catch(error){reply(400,{error:String(error.message || error)})}
  }) }
  return {name:'overlay-local-export',configureServer:attach,configurePreviewServer:attach}
}
