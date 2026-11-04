// Agent entry: node scripts/render-template-lab.mjs project.json output.mp4 [--full]
import {readFile,writeFile,mkdir} from 'node:fs/promises'
import {resolve,dirname} from 'node:path'
import {reviewDefaults,validateReviewProject} from '../src/templates/reviewModel.mjs'
const origin=process.env.STUDIO_ORIGIN||'http://127.0.0.1:5184'
if(!/^http:\/\/127\.0\.0\.1:\d+$/.test(origin))throw Error('需要本机工作台地址')
const project=validateReviewProject(process.argv[2]?JSON.parse(await readFile(resolve(process.argv[2]),'utf8')):{format:'overlay-review-project',version:1,params:reviewDefaults,media:{}})
const out=resolve(process.argv[3]||'output/template-lab/control-sample-v02.mp4'),full=process.argv.includes('--full')
await mkdir(dirname(out),{recursive:true})
const start=await fetch(origin+'/__studio/review/jobs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({project,kind:'video',width:full?1920:960,fps:full?60:30})}),created=await start.json()
if(!start.ok)throw Error(created.error)
await writeFile(out+'.job.json',JSON.stringify({id:created.id,origin,project},null,2));console.log('Job',created.id)
let job,last=''
for(;;){
 await new Promise(r=>setTimeout(r,2000))
 const res=await fetch(`${origin}/__studio/review/jobs/${created.id}`);job=await res.json();if(!res.ok)throw Error(job.error)
 const progress=job.status+':'+Math.floor((job.frame||0)/Math.max(1,job.total)*10)
 if(progress!==last){console.log(job.status,job.frame+'/'+job.total);last=progress}
 if(['done','error','cancelled'].includes(job.status))break
}
await writeFile(out+'.receipt.json',JSON.stringify(job,null,2))
if(job.status!=='done')throw Error(job.error||job.status)
const file=await fetch(origin+job.url);if(!file.ok)throw Error('无法下载输出')
await writeFile(out,new Uint8Array(await file.arrayBuffer()));console.log(out)
