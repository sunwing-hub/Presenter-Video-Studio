// Independent local renderer: the UI/dev server may close or restart after launch.
import {createServer} from 'node:http'
import {createReadStream} from 'node:fs'
import {mkdir,readFile,stat,access} from 'node:fs/promises'
import {resolve,extname,sep} from 'node:path'
import {spawn} from 'node:child_process'
import {once} from 'node:events'
import {build} from 'vite'
import react from '@vitejs/plugin-react'
import {jobDirectory,writeJson} from './export-jobs.mjs'
import {mediaRoute} from './local-media.mjs'
import {renderFull} from './render-full.mjs'
import {renderTransparent} from './export-server.mjs'

const id=process.argv[2],directory=jobDirectory(id),root=resolve(import.meta.dirname,'..')
const job=JSON.parse(await readFile(resolve(directory,'status.json'),'utf8'))
job.payload=JSON.parse(await readFile(resolve(directory,'payload.json'),'utf8'));job.pid=process.pid;job.directory=directory
let server,timer,keeper,flushing=false
process.on('SIGTERM',()=>{job.cancelled=true;job.stop?.()})
async function flush(){if(flushing)return;flushing=true;try{await writeJson(resolve(directory,'status.json'),{...job,payload:undefined,stop:undefined,updatedAt:Date.now()})}finally{flushing=false}}
try{
 const web=resolve(directory,'web')
 // Persist a production bundle once. Resume uses the SAME visual implementation.
 try{await access(resolve(web,'ready'))}catch{
  await mkdir(web,{recursive:true})
  await build({root,configFile:false,publicDir:false,plugins:[react()],logLevel:'warn',build:{outDir:web,emptyOutDir:true}})
  await writeJson(resolve(web,'ready'),{builtAt:Date.now()})
 }
 if(process.platform==='darwin'){keeper=spawn('/usr/bin/caffeinate',['-i','-w',String(process.pid)],{stdio:'ignore'});keeper.on('error',()=>{})}
 const mediaIds=new Set(JSON.stringify(job.payload).match(/[a-f0-9]{8}-[a-f0-9-]{27}/g)??[])
 server=createServer(async(req,res)=>{
  try{
   const path=new URL(req.url,'http://localhost').pathname
   if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return}
   if(path===`/__studio/export/${id}/payload`){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(job.payload));return}
   const media=path.match(/^\/__studio\/media\/([a-f0-9-]{36})$/)
   if(media&&mediaIds.has(media[1])&&await mediaRoute(req,res,path,{render:job.payload.kind==='mp4'}))return
   if(path.startsWith('/__studio/')){res.writeHead(404);res.end();return}
   const file=resolve(web,path==='/'?'index.html':'.'+decodeURIComponent(path))
   if(!file.startsWith(web+sep)){res.writeHead(403);res.end();return}
   const info=await stat(file);if(!info.isFile())throw Error('not file')
   res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2'})[extname(file)]??'application/octet-stream')
   res.setHeader('Content-Length',info.size);createReadStream(file).pipe(res)
  }catch{res.writeHead(404);res.end('Not found')}
 })
 server.listen(0,'127.0.0.1');await once(server,'listening')
 timer=setInterval(()=>{void access(resolve(directory,'cancel')).then(()=>{job.cancelled=true;job.stop?.()}).catch(()=>{});void flush().catch(()=>{})},500)
 await flush()
 const origin=`http://127.0.0.1:${server.address().port}`
 if(job.payload.kind==='mp4')await renderFull(job,origin);else await renderTransparent(job,origin)
}catch(e){job.status=job.cancelled?'cancelled':'error';job.error=String(e.message??e)}
finally{
 clearInterval(timer);while(flushing)await new Promise(r=>setTimeout(r,20));await flush();keeper?.kill();server?.closeAllConnections();server?.close()
}
