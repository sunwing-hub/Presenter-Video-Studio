import {studioOrigin} from './studio-origin.mjs'
// Reusable assistant entry; works with any saved native project, not one topic.
// node scripts/render-studio-project.mjs project.json output.mp4 [--validate-only]
import {readFile,writeFile,mkdir,stat} from 'node:fs/promises'
import {resolve,dirname} from 'node:path'
import {validateExport} from './export-server.mjs'
const input=process.argv[2],destination=process.argv[3],origin=studioOrigin()
if(!input||!destination)throw Error('需要工程JSON与新的输出路径')
if(!/^http:\/\/127\.0\.0\.1:\d+$/.test(origin))throw Error('仅连接本机剪辑中台')
const data=JSON.parse(await readFile(resolve(input),'utf8')),project=data.project||data
const pipeline=process.argv.find(a=>a.startsWith('--pipeline='))?.split('=')[1];if(pipeline)project.renderPipeline=pipeline
const mainMediaId=data.mainMediaId||project.canvasLayers?.find(l=>l.story)?.story.video?.id||project.draftMedia?.video?.url?.split('/').at(-1)
const duration=data.duration||project.videoDuration||project.canvasLayers?.find(l=>l.story)?.story.duration||project.duration
const output=resolve(destination),payload=validateExport({kind:'mp4',mainMediaId,project,duration,fps:data.fps||25,fileName:output.split('/').at(-1)})
if(process.argv.includes('--validate-only')){console.log(JSON.stringify({status:'validated',duration:payload.duration,canvas:payload.project.canvas,layers:payload.project.canvasLayers.length}));process.exit(0)}
if(await stat(output).then(()=>true).catch(()=>false))throw Error('输出已存在，请使用新的版本名')
await mkdir(dirname(output),{recursive:true})
const r=await fetch(origin+'/__studio/export',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}),started=await r.json();if(!r.ok)throw Error(started.error)
await writeFile(output+'.job.json',JSON.stringify({id:started.id,input:resolve(input),payload},null,2),{flag:'wx'});console.log('Started',started.id)
let last=-1,job
for(;;){await new Promise(r=>setTimeout(r,3000));job=await(await fetch(origin+'/__studio/export/'+started.id)).json();const band=Math.floor(job.frame/Math.max(1,job.total)*10);if(band!==last){console.log(job.status,job.frame+'/'+job.total);last=band}if(['done','error','cancelled','interrupted'].includes(job.status))break}
await writeFile(output+'.receipt.json',JSON.stringify(job,null,2),{flag:'wx'});if(job.status!=='done')throw Error(job.error||job.status)
const file=await fetch(origin+'/__studio/export/'+job.id+'/file');if(!file.ok)throw Error('成片读取失败');await writeFile(output,new Uint8Array(await file.arrayBuffer()),{flag:'wx'});console.log(output)
