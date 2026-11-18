#!/usr/bin/env node
// Machine-readable lifecycle for assistants; no client-specific configuration.
import {spawn} from 'node:child_process'
import {openSync,closeSync} from 'node:fs'
import {mkdir,writeFile,rename} from 'node:fs/promises'
import {join} from 'node:path'
import {studioRoot,inspectStudio,storedConnection} from './studio-connection.mjs'
const command=process.argv[2]||'status'
const saved=storedConnection()
const explicit=process.env.STUDIO_ORIGIN||process.env.OVERLAY_STUDIO_URL
const port=Number(process.env.OVERLAY_STUDIO_PORT||(!explicit&&saved?new URL(saved.origin).port:5173))
const origin=explicit||`http://127.0.0.1:${port}`
const log=join(studioRoot,'user-data/service.log')
function report(data){console.log(JSON.stringify({root:studioRoot,origin,log,...data},null,2))}
try{
 if(!/^http:\/\/127\.0\.0\.1:\d+$/.test(origin)||!Number.isInteger(Number(new URL(origin).port))||Number(new URL(origin).port)<1024||Number(new URL(origin).port)>65535)throw Error('请指定本机地址和 1024–65535 端口')
 const status=await inspectStudio(origin)
 if(command==='status'){report(status);if(status.state!=='ready')process.exitCode=1}
 else if(command==='start'){
  if(status.state==='ready'){
   await mkdir(join(studioRoot,'user-data'),{recursive:true})
   const record={root:studioRoot,origin,pid:status.info.pid,launcherPid:saved?.pid===status.info.pid?saved.launcherPid:null}
   const file=join(studioRoot,'user-data/runtime.json');await writeFile(file+'.tmp',JSON.stringify(record,null,2));await rename(file+'.tmp',file)
   report({...status,connectionFile:file})
  }
  else{
   if(status.state!=='offline')throw Error('目标端口已被占用或无法确认身份；请设置 OVERLAY_STUDIO_PORT 为其他空闲端口，不能混用其他工作台。')
   await mkdir(join(studioRoot,'user-data'),{recursive:true})
   const fd=openSync(log,'a')
   const child=spawn(process.execPath,['scripts/studio-launcher.mjs','--no-open'],{cwd:studioRoot,detached:true,stdio:['ignore',fd,fd],env:{...process.env,OVERLAY_STUDIO_PORT:new URL(origin).port}})
   const launched=new Promise((resolve,reject)=>{child.once('spawn',resolve);child.once('error',reject)})
   closeSync(fd);await launched;child.unref()
   let found
   for(let n=0;n<100;n++){
    found=await inspectStudio(origin)
    if(found.state==='ready')break
    if(child.exitCode!==null)throw Error('启动进程已退出，请读取 service.log；缺少依赖时先 npm run setup。')
    await new Promise(resolve=>setTimeout(resolve,300))
   }
   if(found.state!=='ready'){try{process.kill(child.pid,'SIGTERM')}catch{};throw Error('启动超时，请读取 service.log')}
   const record={root:studioRoot,origin,pid:found.info.pid,launcherPid:child.pid,startedAt:new Date().toISOString()}
   const file=join(studioRoot,'user-data/runtime.json');await writeFile(file+'.tmp',JSON.stringify(record,null,2));await rename(file+'.tmp',file)
   report({...found,connectionFile:file})
  }
 }
 else if(command==='stop'){
  if(status.state==='offline'){report({state:'offline'})}
  else{
   if(status.state!=='ready'||!saved?.launcherPid||saved.origin!==origin||saved.pid!==status.info.pid)throw Error('不是本入口启动的工作台，不能自动停止；请在原启动窗口退出。')
   process.kill(status.info.pid,'SIGTERM')
   let result
   for(let n=0;n<50;n++){result=await inspectStudio(origin);if(result.state==='offline')break;await new Promise(resolve=>setTimeout(resolve,100))}
   if(result.state!=='offline')throw Error('服务仍在运行，请检查日志')
   report({state:'stopped'})
  }
 }else throw Error('用法：studio-service.mjs start | status | stop')
}catch(error){report({state:'error',error:error.message});process.exitCode=1}
