import {mkdir,readFile,writeFile,stat,unlink} from 'node:fs/promises'
import {createReadStream} from 'node:fs'
import {resolve} from 'node:path'
import {randomUUID} from 'node:crypto'
import {spawn} from 'node:child_process'
import {once} from 'node:events'
import {chromium} from 'playwright'
import ffmpeg from 'ffmpeg-static'
import {getMedia,mediaDir} from './local-media.mjs'
import {reviewSignature} from '../src/templates/reviewTimeline.mjs'
import {validateReviewProject,reviewEvents,cueSample,cueDuration,reviewSoundRevision,wavStereo} from '../src/templates/reviewModel.mjs'
const directory=resolve(import.meta.dirname,'../exports/review-lab'),jobs=new Map();let busy=false
const json=(res,status,data)=>{res.statusCode=status;res.setHeader('Content-Type','application/json');res.end(JSON.stringify(data))}
async function body(req){if(!req.headers['content-type']?.startsWith('application/json'))throw Error('需要 JSON');const chunks=[];let size=0;for await(const c of req){size+=c.length;if(size>64000)throw Error('工程参数过大');chunks.push(c)}return JSON.parse(Buffer.concat(chunks).toString())}
async function run(args,job,{capture=false}={}){
 if(job.cancelled)throw Error('已取消')
 const child=spawn(ffmpeg,['-hide_banner','-loglevel','error',...args],{stdio:['ignore',capture?'pipe':'ignore','pipe']});job.child=child;const parts=[];let err='';child.stderr.on('data',c=>err=(err+c).slice(-2500));if(capture)child.stdout.on('data',c=>parts.push(c));const [code]=await once(child,'close');job.child=null;if(job.cancelled)throw Error('已取消');if(code!==0)throw Error(err||'音视频处理失败');return Buffer.concat(parts)
}
async function mediaInfo(m){const child=spawn(ffmpeg,['-hide_banner','-i',m.file],{stdio:['ignore','ignore','pipe']});let text='';child.stderr.on('data',c=>text+=c);await once(child,'close');const d=text.match(/Duration:\s*(\d+):(\d+):([\d.]+)/);return {duration:d?+d[1]*3600+ +d[2]*60+ +d[3]:0,hasAudio:/Stream.*Audio:/.test(text)}}
async function resolveInputs(project){const result={};for(const role of ['video','voice','music']){const m=project.media[role];if(!m)continue;const local=await getMedia(m.id);if(role==='video'?local.type!=='video':local.type!=='audio')throw Error(role==='video'?'成果槽位需要视频':'声音槽位需要音频');const info=await mediaInfo(local);if(!info.duration)throw Error(`无法识别素材时长：${m.name}`);const offset=project.params[role+'Offset'];if(offset>=info.duration)throw Error(`素材起点超出时长：${m.name}`);if((role==='video'||role==='voice')&&info.duration-offset+.03<project.params.duration)throw Error(`${m.name} 剩余 ${Math.max(0,info.duration-offset).toFixed(2)} 秒，短于场景；请缩短场景或更换素材`);if(role!=='video'&&!info.hasAudio)throw Error('声音素材没有可用音轨');result[role]={...local,...info}}return result}
export async function mixReview(project,inputs,job){
 const p=project.params,sr=48000,frames=Math.round(p.duration*sr),mix=new Float32Array(frames*2);let duck=new Float32Array(frames).fill(1)
 for(const role of ['voice','music']){
  const m=inputs[role];if(!m)continue
  const args=[];if(role==='music'&&p.musicLoop)args.push('-stream_loop','-1');args.push('-ss',String(p[role+'Offset']),'-i',m.file,'-t',String(p.duration),'-vn','-ar',String(sr),'-ac','2','-f','f32le','pipe:1')
  const b=await run(args,job,{capture:true}),samples=new Float32Array(b.buffer,b.byteOffset,Math.floor(b.byteLength/4))
  if(role==='voice'&&p.ducking){
   const win=1440,energy=[];let peak=0
   for(let start=0;start<frames;start+=win){let sum=0,n=0;for(let f=start;f<Math.min(frames,start+win,samples.length/2);f++){sum+=(samples[f*2]**2+samples[f*2+1]**2)/2;n++}const rms=n?Math.sqrt(sum/n)*p.voiceVolume:0;energy.push(rms);peak=Math.max(peak,rms)}
   const threshold=Math.max(.008,peak*.12);let gain=1
   for(let f=0;f<frames;f++){const target=energy[Math.floor(f/win)]>threshold?p.duckLevel:1,rate=1-Math.exp(-1/(sr*(target<gain?.12:.45)));gain+=(target-gain)*rate;duck[f]=gain}
  }
  for(let i=0;i<Math.min(samples.length,mix.length);i++){const t=(i>>1)/sr;let gain=p[role+'Volume'];if(role==='music'){gain*=duck[i>>1];const fade=Math.min(p.musicFade,p.duration/2);if(fade>0)gain*=Math.min(1,t/fade,(p.duration-t)/fade)}mix[i]+=samples[i]*gain}
 }
 if(p.sound)for(const [i,e] of reviewEvents(p).entries()){const begin=Math.round(e.at*sr),end=Math.min(frames,begin+Math.ceil(cueDuration(i)*sr));for(let f=begin;f<end;f++){const v=cueSample((f-begin)/sr,i)*p.volume;mix[f*2]+=v;mix[f*2+1]+=v}}
 let peak=0;for(let i=0;i<mix.length;i++)peak=Math.max(peak,Math.abs(mix[i]));const gain=peak>.95?.95/peak:1;if(gain<1)for(let i=0;i<mix.length;i++)mix[i]*=gain
 job.mix={soundRevision:reviewSoundRevision,peakBefore:peak,masterGain:gain,voice:!!inputs.voice,music:!!inputs.music,sfx:p.sound,ducking:p.ducking&&!!inputs.voice&&!!inputs.music,events:reviewEvents(p)}
 return wavStereo(mix,sr)
}
async function persist(job){const {project,child,browser,...safe}=job;await writeFile(resolve(directory,job.id+'.json'),JSON.stringify(safe,null,2))}
async function produce(job,origin){let browser,encoder;try{
 job.status='mixing';await persist(job);const inputs=await resolveInputs(job.project),wav=resolve(directory,job.id+'.wav');await writeFile(wav,await mixReview(job.project,inputs,job));job.audioFile=wav
 if(job.kind==='audio'){job.file=wav;job.status='done';return}
 const p=job.project.params,fps=job.fps,total=Math.ceil(p.duration*fps),silent=resolve(directory,job.id+'.silent.mp4');job.total=total;job.status='rendering';await persist(job)
 browser=await chromium.launch({headless:true});job.browser=browser;const page=await browser.newPage({viewport:{width:1600,height:1100},deviceScaleFactor:1});await page.route('**/*',r=>r.request().url().startsWith(origin+'/')||r.request().url().startsWith('data:')?r.continue():r.abort());await page.goto(`${origin}/?templateLab&reviewRender=${job.id}`);await page.waitForFunction(()=>typeof window.templateLabRender==='function',null,{timeout:45000});await page.evaluate(async()=>{await document.fonts.ready;const v=document.querySelector('[data-template-stage] video');if(v&&v.readyState<2)await new Promise((ok,no)=>{v.addEventListener('loadeddata',ok,{once:true});v.addEventListener('error',()=>no(Error('视频加载失败')),{once:true});setTimeout(()=>no(Error('素材加载超时')),15000)})})
 await page.locator('[data-template-stage]').evaluate((e,width)=>{e.style.width=width+'px';e.style.height=width*9/16+'px';e.style.flexShrink='0'},job.width)
 encoder=spawn(ffmpeg,['-hide_banner','-loglevel','error','-y','-f','image2pipe','-framerate',String(fps),'-i','pipe:0','-an','-c:v','libx264','-preset','fast','-crf','19','-pix_fmt','yuv420p',silent],{stdio:['pipe','ignore','pipe']});job.child=encoder;let errors='';encoder.stderr.on('data',c=>errors=(errors+c).slice(-2000));encoder.stdin.on('error',()=>{});const finished=once(encoder,'close')
 for(let frame=0;frame<total;frame++){
  if(job.cancelled)throw Error('已取消');if(encoder.exitCode!==null)throw Error(errors||'编码器退出')
  await page.evaluate(t=>window.templateLabRender(t),frame/fps);const png=await page.locator('[data-template-stage]').screenshot({animations:'allow'});await new Promise((ok,no)=>encoder.stdin.write(png,e=>e?no(e):ok()));job.frame=frame+1;if(frame%30===0)await persist(job)
 }
 encoder.stdin.end();if((await finished)[0]!==0)throw Error(errors||'编码失败');job.child=null;job.status='encoding';await persist(job)
 await run(['-y','-i',silent,'-i',wav,'-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-b:a','192k','-af','apad','-t',String(total/fps),'-movflags','+faststart',job.file],job)
 await unlink(silent);job.status='done'
 }catch(e){job.status=job.cancelled?'cancelled':'error';job.error=e.message;encoder?.kill('SIGTERM');if(job.kind!=='audio')await unlink(job.file).catch(()=>{})}finally{await browser?.close().catch(()=>{});job.browser=null;job.child=null;busy=false;await persist(job)}}
export async function reviewRoute(req,res,path,origin){
 if(!path.startsWith('/__studio/review'))return false
 if(path==='/__studio/review/bind'&&req.method==='POST'){
  const b=await body(req),project=validateReviewProject(b.project),inputs=await resolveInputs(project),id=randomUUID(),wav=await mixReview(project,inputs,{})
  await mkdir(mediaDir,{recursive:true});await writeFile(resolve(mediaDir,id),wav,{flag:'wx'})
  const meta={id,name:`模板混音 · ${project.params.title}.wav`,mime:'audio/wav',type:'audio',url:`/__studio/media/${id}`};await writeFile(resolve(mediaDir,id+'.json'),JSON.stringify(meta),{flag:'wx'})
  json(res,201,{project,audio:{id,name:meta.name},signature:reviewSignature(project)});return true
 }
 if(path==='/__studio/review/jobs'&&req.method==='POST'){
  if(busy){json(res,409,{error:'已有模板任务，请等待完成'});return true}
  const b=await body(req),project=validateReviewProject(b.project),kind=b.kind==='audio'?'audio':'video',width=b.width===1920?1920:960,fps=b.fps===60?60:30,id=randomUUID();await mkdir(directory,{recursive:true});
  const job={id,status:'queued',frame:0,total:Math.ceil(project.params.duration*fps),project,kind,width,fps,file:resolve(directory,id+(kind==='audio'?'.wav':'.mp4')),createdAt:new Date().toISOString()};jobs.set(id,job);await writeFile(resolve(directory,id+'.project.json'),JSON.stringify(project,null,2));busy=true;void produce(job,origin);json(res,202,{id});return true
 }
 const match=path.match(/^\/__studio\/review\/jobs\/([a-f0-9-]{36})(?:\/(project|file|cancel))?$/);if(!match){json(res,404,{error:'未找到模板任务'});return true}
 const id=match[1];let job=jobs.get(id);if(!job){try{job=JSON.parse(await readFile(resolve(directory,id+'.json'),'utf8'));if(!['done','error','cancelled'].includes(job.status))job={...job,status:'error',error:'工作台重启中断了任务，请重新导出'}}catch{json(res,404,{error:'未找到模板任务'});return true}}
 if(match[2]==='cancel'&&req.method==='POST'){job.cancelled=true;job.child?.kill('SIGTERM');void job.browser?.close();json(res,200,{ok:true});return true}
 if(match[2]==='project'&&req.method==='GET'){const data=job.project??JSON.parse(await readFile(resolve(directory,id+'.project.json'),'utf8'));json(res,200,data);return true}
 if(match[2]==='file'&&req.method==='GET'){if(job.status!=='done'){json(res,409,{error:'文件尚未就绪'});return true}res.setHeader('Content-Type',job.kind==='audio'?'audio/wav':'video/mp4');res.setHeader('Content-Length',(await stat(job.file)).size);createReadStream(job.file).pipe(res);return true}
 if(!match[2]&&req.method==='GET'){const {project,child,browser,file,audioFile,...safe}=job;json(res,200,{...safe,url:job.status==='done'?`/__studio/review/jobs/${id}/file`:undefined});return true}
 json(res,405,{error:'请求方式无效'});return true
}
