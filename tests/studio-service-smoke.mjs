// Isolated lifecycle test. No user profile is created or changed.
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {once} from 'node:events'
import {createServer} from 'node:net'
import {readFile,mkdir,rm} from 'node:fs/promises'
import {resolve} from 'node:path'
import {studioRoot,inspectStudio} from '../scripts/studio-connection.mjs'
const socket=createServer();socket.listen(0,'127.0.0.1');await once(socket,'listening');const port=socket.address().port;await new Promise(resolve=>socket.close(resolve))
const env={...process.env,OVERLAY_STUDIO_PORT:String(port),STUDIO_ORIGIN:'',OVERLAY_STUDIO_URL:''}
const runtime=resolve(studioRoot,'user-data/runtime.json')
const old=await readFile(runtime).catch(e=>{if(e.code!=='ENOENT')throw e;return null})
async function run(command){const child=spawn(process.execPath,['scripts/studio-service.mjs',command],{cwd:studioRoot,env,stdio:['ignore','pipe','pipe']});let out='',err='';child.stdout.on('data',x=>out+=x);child.stderr.on('data',x=>err+=x);const [code]=await once(child,'exit');assert.equal(code,0,out+err);return JSON.parse(out)}
try{
 const started=await run('start');assert.equal(started.state,'ready')
 const status=await run('status');assert.equal(status.info.root,studioRoot)
 const again=await run('start');assert.equal(again.info.pid,status.info.pid)
 const stopped=await run('stop');assert.equal(stopped.state,'stopped')
 assert.equal((await inspectStudio(started.origin)).state,'offline')
 console.log('PASS: detached launch survives command exit, status/root identity, repeated start reuses process, tracked stop')
}finally{
 if((await inspectStudio(`http://127.0.0.1:${port}`)).state==='ready')await run('stop')
 if(old){await mkdir(resolve(studioRoot,'user-data'),{recursive:true});const {writeFile}=await import('node:fs/promises');await writeFile(runtime,old)}else await rm(runtime,{force:true})
}
