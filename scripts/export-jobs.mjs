import {mkdir,readFile,writeFile,rename,readdir,open,unlink,stat} from 'node:fs/promises'
import {resolve} from 'node:path'
import {spawn} from 'node:child_process'
export const jobRoot=resolve(import.meta.dirname,'../exports/.jobs')
const valid=id=>typeof id==='string'&&/^[a-f0-9-]{36}$/.test(id)
export function jobDirectory(id){if(!valid(id))throw Error('导出任务编号无效');return resolve(jobRoot,id)}
export async function writeJson(file,value){const temp=file+'.tmp';await writeFile(temp,JSON.stringify(value));await rename(temp,file)}
export const alive=pid=>{try{if(!Number.isInteger(pid)||pid<=0)return false;process.kill(pid,0);return true}catch{return false}}
export async function readJob(id){
 if(!valid(id))return null
 try{const j=JSON.parse(await readFile(resolve(jobDirectory(id),'status.json'),'utf8'))
  if(!['done','error','cancelled','interrupted'].includes(j.status)&&!alive(j.pid)&&Date.now()-(j.updatedAt??0)>10000)j.status='interrupted'
  return j
 }catch{return null}
}
export async function listJobs(){
 const ids=await readdir(jobRoot).catch(()=>[])
 return (await Promise.all(ids.filter(valid).map(readJob))).filter(Boolean).sort((a,b)=>b.createdAt-a.createdAt)
}
export async function launchJob(job,{resume=false}={}){
 await mkdir(jobRoot,{recursive:true})
 // Exclusive launch lock protects double clicks and concurrent tabs, including after Vite restarts.
 const lock=resolve(jobRoot,'launch.lock');let handle
 try{handle=await open(lock,'wx')}catch{
  const info=await stat(lock).catch(()=>null)
  if(info&&Date.now()-info.mtimeMs>30000){await unlink(lock).catch(()=>{});return launchJob(job,{resume})}
  throw Error('正在启动另一项导出，请稍后再试。')
 }
 try{
  if((await listJobs()).some(j=>!['done','error','cancelled','interrupted'].includes(j.status)))throw Error('已有后台导出任务，请等待完成或取消。')
  const directory=jobDirectory(job.id);await mkdir(directory,{recursive:true})
  if(!resume)await writeJson(resolve(directory,'payload.json'),job.payload)
  await unlink(resolve(directory,'cancel')).catch(()=>{})
  const status={...job,payload:undefined,pid:undefined,error:undefined,cancelled:undefined,status:'preparing',createdAt:job.createdAt??Date.now(),updatedAt:Date.now(),directory}
  await writeJson(resolve(directory,'status.json'),status)
  const log=await open(resolve(directory,'worker.log'),'a')
  try{
   const child=spawn(process.execPath,[resolve(import.meta.dirname,'export-worker.mjs'),job.id],{detached:true,stdio:['ignore',log.fd,log.fd],env:process.env})
   await new Promise((done,fail)=>{child.once('spawn',done);child.once('error',fail)})
   status.pid=child.pid;await writeJson(resolve(directory,'status.json'),status);child.unref()
  }finally{await log.close()}
  return status
 }finally{await handle.close();await unlink(lock).catch(()=>{})}
}
export async function cancelJob(id){const j=await readJob(id);if(j&&!['done','error','cancelled','interrupted'].includes(j.status))await writeFile(resolve(jobDirectory(id),'cancel'),'cancel');return j}
