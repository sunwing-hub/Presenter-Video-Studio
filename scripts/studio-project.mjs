#!/usr/bin/env node
import {readFile,writeFile,access,mkdir} from 'node:fs/promises'
import {resolve,dirname} from 'node:path'
import {studioOrigin} from './studio-origin.mjs'
import {inspectStudio} from './studio-connection.mjs'
const [command,...args]=process.argv.slice(2),origin=studioOrigin()
async function request(path,body){
 const response=await fetch(origin+path,body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})
 const data=await response.json();if(!response.ok)throw Error(data.error||`HTTP ${response.status}`);return data
}
try{
 if(!['new','save'].includes(command))throw Error('用法：studio-project.mjs new 模板ID 版本 新工程.json | save 工程.json')
 if((await inspectStudio(origin)).state!=='ready')throw Error('请先运行 npm run service:start；当前端口未就绪或属于其他安装目录')
 if(command==='new'){
  const [id,version,file]=args;if(!id||!version||!file)throw Error('new 需要模板ID、版本、新工程路径')
  const output=resolve(file)
  if(await access(output).then(()=>true,()=>false))throw Error('文件已存在，请使用新的工程名')
  const {profile}=await request('/__studio/preferences');if(!profile)throw Error('首次使用尚未确认剪辑标准；先询问用户并保存选择，不自动采用默认值')
  await mkdir(dirname(output),{recursive:true})
  const draft=await request('/__studio/templates/create',{id,version})
  const record=await request('/__studio/drafts/'+draft.id)
  await writeFile(output,JSON.stringify(record,null,2),{flag:'wx'})
  console.log(JSON.stringify({file:output,draft,origin,demoContent:true,next:'已创建工作台示例草稿；须替换示例文案和媒体、落实已确认标准，再预览与导出'},null,2))
 }else{
  if(!args[0])throw Error('save 需要工程JSON路径')
  const data=JSON.parse(await readFile(resolve(args[0]),'utf8'))
  const draft=await request('/__studio/drafts',data.project?data:{title:'助手工程',project:data})
  // Persist the new revision locally, so subsequent saves retain concurrency protection.
  const record=await request('/__studio/drafts/'+draft.id)
  const file=resolve(args[0]);await writeFile(file+'.tmp',JSON.stringify(record,null,2));const {rename}=await import('node:fs/promises');await rename(file+'.tmp',file)
  console.log(JSON.stringify({file,draft,origin},null,2))
 }
}catch(error){console.error(error.message);process.exitCode=1}
