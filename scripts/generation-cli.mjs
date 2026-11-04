import {studioOrigin} from './studio-origin.mjs'
import {readFile,writeFile} from 'node:fs/promises'
import {resolve} from 'node:path'
const [action,...args]=process.argv.slice(2),origin=studioOrigin()
async function api(path,body){const r=await fetch(origin+'/__studio/generation'+path,body===undefined?undefined:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const d=await r.json();if(!r.ok)throw Error(d.error);return d}
const json=file=>readFile(resolve(file),'utf8').then(JSON.parse)
if(action==='capabilities')console.log(JSON.stringify(await api('/capabilities'),null,2))
else if(action==='plan')console.log(JSON.stringify(await api('/plans',await json(args[0])),null,2))
else if(action==='status')console.log(JSON.stringify(await api('/'+args[0]),null,2))
else if(action==='quote')console.log(JSON.stringify(await api('/'+args[0]+'/quote',{}),null,2))
else if(action==='submit'){if(!args.includes('--live'))throw Error('真实提交需要明确的 --live 和预算文件；服务器自动核实报价');console.log(JSON.stringify(await api('/'+args[0]+'/submit',await json(args[1])),null,2))}
else if(action==='reconcile')console.log(JSON.stringify(await api('/'+args[0]+'/reconcile',{taskId:args[1]}),null,2))
else if(action==='poll'){
 let j
 do{j=await api('/'+args[0]+'/poll',{});console.log(j.id,j.status);if(!args.includes('--wait')||j.status!=='running')break;await new Promise(r=>setTimeout(r,10000))}while(true)
}
else if(action==='collect')console.log(JSON.stringify(await api('/'+args[0]+'/collect',{}),null,2))
else if(action==='bind'){
 const [id,scene,input,output]=args,j=await api('/'+id),data=await json(input),{bindGenerationAsset}=await import('../src/templates/story/generationBinding.mjs'),p=bindGenerationAsset(data.project??data,scene,j)
 const bound=data.project?{...data,project:p}:p;await writeFile(resolve(output),JSON.stringify(bound,null,2),{flag:'wx'});console.log(resolve(output))
}
else if(action==='mock'){
 const {generationStore}=await import('./generation-server.mjs'),{importGeneratedVideo}=await import('./generation-media.mjs'),{spawn}=await import('node:child_process'),{default:ff}=await import('ffmpeg-static');const j=await generationStore.read(args[0]);if(j.request.mode!=='mock'||j.status!=='planned')throw Error('需要未运行的本地演示任务')
 const font='/System/Library/Fonts/Supplemental/Arial.ttf',dir=generationStore.folder(j.id)
 const ratio=j.request.ratio,[w,h]=ratio==='1:1'?[768,768]:ratio==='9:16'?[432,768]:[768,432]
 const filters=[`drawgrid=w=64:h=64:t=1:c=white@0.08`,`drawtext=fontfile=${font}:text='LOCAL PIPELINE PREVIEW':fontcolor=white:fontsize=${Math.round(w*.035)}:x=(w-tw)/2:y=h*0.08`,`drawtext=fontfile=${font}:text='NOT AI GENERATED':fontcolor=0x7ee8c7:fontsize=${Math.round(w*.03)}:x=(w-tw)/2:y=h*0.85`,...[0,1,2,3].map(i=>`drawbox=x=iw*${.2+i*.15}:y=ih*0.38:w=iw*0.07:h=ih*0.28:c=0x7ee8c7:t=fill`),`drawbox=x=iw*0.15:y=ih*0.33:w=iw*0.7:h=ih*0.025:c=white:t=fill`,`drawbox=x=iw*0.15:y=ih*0.69:w=iw*0.7:h=ih*0.025:c=white:t=fill`,`drawtext=fontfile=${font}:text='BANK SCENE SLOT':fontcolor=white:fontsize=${Math.round(w*.04)}:x=(w-tw)/2+12*sin(t*2):y=h*0.22`]
 await new Promise((done,fail)=>{const c=spawn(ff,['-v','error','-y','-f','lavfi','-i',`color=c=0x12304f:s=${w}x${h}:r=25:d=${j.request.seconds}`,'-vf',filters.join(','),'-an','-c:v','libx264','-pix_fmt','yuv420p',resolve(dir,'source.mp4')],{stdio:['ignore','ignore','pipe']});let e='';c.stderr.on('data',b=>e+=b);c.on('error',fail);c.on('close',code=>code?fail(Error(e)):done())})
 const asset=await importGeneratedVideo(j,dir);console.log(JSON.stringify(await generationStore.attach(j.id,asset),null,2))
}else throw Error('用法: generation-cli capabilities | plan JSON | status ID | quote ID | submit ID APPROVAL --live | poll ID [--wait] | collect ID | bind ID SCENE PROJECT OUTPUT | mock ID | reconcile ID TASK_ID')
