import {lookup} from 'node:dns/promises'
import {isIP} from 'node:net'
import {get as httpsGet} from 'node:https'
import {open,writeFile,readFile,mkdir,rename,stat,unlink} from 'node:fs/promises'
import {resolve} from 'node:path'
import {createHash,randomUUID} from 'node:crypto'
import {spawn} from 'node:child_process'
import ffmpeg from 'ffmpeg-static'
import {mediaDir} from './local-media.mjs'
export function isPublicAddress(address){
 if(address.includes(':'))return /^2[0-9a-f]{3}:/i.test(address)||/^3[0-9a-f]{3}:/i.test(address)
 const p=address.split('.').map(Number);return p.length===4&&p.every(x=>Number.isInteger(x)&&x>=0&&x<=255)&&![0,10,127].includes(p[0])&&!(p[0]===169&&p[1]===254)&&!(p[0]===172&&p[1]>=16&&p[1]<=31)&&!(p[0]===192&&p[1]===168)&&!(p[0]===100&&p[1]>=64&&p[1]<=127)&&p[0]<224
}
async function inspectDownloadUrl(value,resolver=lookup){
 const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||u.port&&u.port!=='443')throw Error('生成素材下载地址不合法')
 const host=u.hostname.replace(/^\[|\]$/g,'');const addresses=isIP(host)?[{address:host,family:isIP(host)}]:await resolver(host,{all:true});if(!addresses.length||addresses.some(x=>!isPublicAddress(x.address)))throw Error('生成素材仅允许公网HTTPS地址');return {url:u.href,addresses}
}
export async function validateDownloadUrl(value,resolver=lookup){return (await inspectDownloadUrl(value,resolver)).url}
function pinnedHttps(url,addresses){return new Promise((done,fail)=>{
 const req=httpsGet(url,{lookup:(host,options,callback)=>options.all?callback(null,addresses.map(x=>({address:x.address,family:x.family||isIP(x.address)}))):callback(null,addresses[0].address,addresses[0].family||isIP(addresses[0].address))},res=>{const headers=new Headers();for(const [k,v] of Object.entries(res.headers))if(v!==undefined)headers.set(k,Array.isArray(v)?v.join(','):v);done({ok:res.statusCode>=200&&res.statusCode<300,status:res.statusCode,headers,body:res})})
 req.setTimeout(180000,()=>req.destroy(Error('生成视频下载超时')));req.on('error',()=>fail(Error('生成视频下载连接失败')))
})}
export async function downloadGeneratedVideo(url,destination,request){
 let address=url,response
 for(let n=0;n<4;n++){const checked=await inspectDownloadUrl(address);address=checked.url;response=request?await request(address,{redirect:'manual',signal:AbortSignal.timeout(180000)}):await pinnedHttps(address,checked.addresses);if([301,302,303,307,308].includes(response.status)){const next=response.headers.get('location');if(response.body?.cancel)await response.body.cancel();else response.body?.destroy();if(!next)throw Error('素材重定向缺少地址');address=new URL(next,address).href;continue}break}
 if(!response?.ok||response.status>=300)throw Error('生成视频下载失败')
 const max=512*1024*1024;if(Number(response.headers.get('content-length'))>max){if(response.body?.cancel)await response.body.cancel();else response.body?.destroy();throw Error('生成视频超过512MB')}
 const temp=destination+'.part',file=await open(temp,'w');let size=0
 try{for await(const chunk of response.body){size+=chunk.length;if(size>max)throw Error('生成视频超过512MB');await file.write(chunk)}if(size<1000)throw Error('生成视频为空或格式不正确');await file.close();await rename(temp,destination)}catch(e){await file.close().catch(()=>{});await unlink(temp).catch(()=>{});throw e}
}
function run(args,expectProbe=false){return new Promise((done,fail)=>{const c=spawn(ffmpeg,['-hide_banner',...args],{stdio:['ignore','ignore','pipe']});let errors='';c.stderr.on('data',b=>errors=(errors+b).slice(-12000));c.on('error',()=>fail(Error('本机视频处理程序不可用')));c.on('close',code=>expectProbe||code===0?done(errors):fail(Error('生成素材格式处理失败')))})}
export async function importGeneratedVideo(job,directory){
 const source=resolve(directory,'source.mp4'),target=resolve(directory,'normalized.mp4');if((await stat(source)).size>512*1024*1024)throw Error('生成素材过大')
 const info=await run(['-i',source],true),d=info.match(/Duration:\s*(\d+):(\d+):([\d.]+)/),size=info.match(/Video:[^\n]*?\b(\d{2,5})x(\d{2,5})\b/)
 const length=d?Number(d[1])*3600+Number(d[2])*60+Number(d[3]):0;if(!size||length<job.request.seconds-.15||length>60)throw Error('生成视频时长或画面格式不符合规格')
 const [rw,rh]=job.request.ratio.split(':').map(Number);if(Math.abs((+size[1]/+size[2])/(rw/rh)-1)>.08)throw Error('生成素材比例与槽位请求不一致')
 await run(['-loglevel','error','-y','-i',source,'-map','0:v:0','-an','-t',String(job.request.seconds),'-vf','fps=25,tpad=stop_mode=clone:stop_duration=0.2,format=yuv420p','-c:v','libx264','-crf','19','-preset','fast','-movflags','+faststart',target])
 const bytes=await readFile(target),id=randomUUID(),name=(job.request.mode==='mock'?'链路演示-':'AI镜头-')+job.request.slot+'.mp4',meta={id,name,type:'video',mime:'video/mp4',url:'/__studio/media/'+id,sha256:createHash('sha256').update(bytes).digest('hex'),duration:job.request.seconds,width:+size[1],height:+size[2],generation:{jobId:job.id,taskId:job.taskId,mode:job.request.mode}}
 await mkdir(mediaDir,{recursive:true});await writeFile(resolve(mediaDir,id),bytes,{flag:'wx'});await writeFile(resolve(mediaDir,id+'.json'),JSON.stringify(meta),{flag:'wx'});return meta
}
