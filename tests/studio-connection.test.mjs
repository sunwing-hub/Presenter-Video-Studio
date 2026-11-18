import assert from 'node:assert/strict'
import {createServer} from 'node:http'
import {once} from 'node:events'
import {inspectStudio,sameStudio,studioRoot} from '../scripts/studio-connection.mjs'
import {studioInfoServer} from '../scripts/studio-info-server.mjs'
let reply={app:'presenter-video-studio',root:studioRoot}
const server=createServer((req,res)=>{res.end(typeof reply==='string'?reply:JSON.stringify(reply))})
server.listen(0,'127.0.0.1');await once(server,'listening');const origin=`http://127.0.0.1:${server.address().port}`
try{
 assert.equal((await inspectStudio(origin)).state,'ready')
 reply={...reply,root:studioRoot+'-another-install'};assert.equal((await inspectStudio(origin)).state,'foreign')
 reply='<html>another app</html>';assert.equal((await inspectStudio(origin)).state,'foreign')
 assert.equal(sameStudio({root:studioRoot}),false)
}finally{server.close();await once(server,'close')}
assert.equal((await inspectStudio(origin)).state,'offline')
let middleware
studioInfoServer().configureServer({middlewares:{use(fn){middleware=fn}}})
const info=createServer((req,res)=>middleware(req,res,()=>{res.statusCode=404;res.end()}))
info.listen(0,'127.0.0.1');await once(info,'listening');const base=`http://127.0.0.1:${info.address().port}`
try{
 assert.equal((await inspectStudio(base)).state,'ready')
 assert.equal((await fetch(base+'/__studio/info',{headers:{Origin:'https://example.com'}})).status,403)
 assert.equal((await fetch(base+'/__studio/info',{method:'POST'})).status,405)
}finally{info.close();await once(info,'close')}
console.log('PASS: correct install identity, different-root and unrelated-service rejection, offline detection, same-origin/read-only info endpoint')
// Regression: strings must be inspected before the object recursion guard.
const {mkdtemp,writeFile,rm}=await import('node:fs/promises')
const {tmpdir}=await import('node:os')
const {join}=await import('node:path')
const {execFileSync}=await import('node:child_process')
const directory=await mkdtemp(join(tmpdir(),'presenter-path-test-'))
try{
 const file=join(directory,'project.json'),missing=join(directory,'missing.mp4')
 await writeFile(file,JSON.stringify({media:[{source:missing}]}))
 const report=JSON.parse(execFileSync(process.execPath,[join(studioRoot,'scripts/studio-cli.mjs'),'open-project',file],{encoding:'utf8'}))
 assert.equal(report.localMediaRefs,1);assert.deepEqual(report.missingMedia,[missing])
 console.log('PASS: project inspector reports missing absolute media paths')
}finally{await rm(directory,{recursive:true,force:true})}
