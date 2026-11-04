import {mkdir,readFile,writeFile,rename,readdir,open,unlink} from 'node:fs/promises'
import {resolve} from 'node:path'
import {randomUUID,createHash} from 'node:crypto'
import {validateGenerationPlan,validateGenerationApproval,validateGenerationBudget} from '../src/templates/story/generationModel.mjs'
export const generationRoot=resolve(import.meta.dirname,'../exports/.generation')
export function createGenerationStore(directory=generationRoot,{client}={}){
 const valid=id=>{if(!/^[a-f0-9-]{36}$/.test(id))throw Error('生成任务编号无效');return id}
 const folder=id=>resolve(directory,valid(id)),file=id=>resolve(folder(id),'state.json')
 const read=id=>readFile(file(id),'utf8').then(JSON.parse)
 const save=async j=>{j.updatedAt=Date.now();const tmp=file(j.id)+'.'+randomUUID()+'.tmp';await writeFile(tmp,JSON.stringify(j,null,2));await rename(tmp,file(j.id));return j}
 const list=async()=>{await mkdir(directory,{recursive:true});return (await Promise.all((await readdir(directory)).filter(n=>/^[a-f0-9-]{36}$/.test(n)).map(n=>read(n).catch(()=>null)))).filter(Boolean)}
 const lock=async(id,action)=>{await mkdir(directory,{recursive:true});const path=resolve(directory,id+'.lock');let handle;try{handle=await open(path,'wx');await handle.writeFile(JSON.stringify({pid:process.pid}))}catch{
  let stale=false;try{const owner=JSON.parse(await readFile(path,'utf8'));try{process.kill(owner.pid,0)}catch(e){stale=e.code==='ESRCH'}}catch{}
  if(stale){await unlink(path).catch(()=>{});return lock(id,action)}
  throw Error('任务操作进行中；请等待完成，勿重复提交')
 }try{return await action()}finally{await handle.close();await unlink(path)}}
 return {read,list,folder,
  async plan(input){const request=validateGenerationPlan(input),fingerprint=createHash('sha256').update(JSON.stringify({...request,slot:undefined})).digest('hex');return lock('plan',async()=>{const prior=(await list()).find(x=>x.fingerprint===fingerprint);if(prior)return prior;const j={id:randomUUID(),request,fingerprint,status:'planned',createdAt:Date.now(),attempts:0};await mkdir(folder(j.id),{recursive:true});return save(j)})},
  async quote(id){return lock(valid(id),async()=>{const j=await read(id);if(j.request.mode!=='live')throw Error('本地演示不需要真实模型报价');j.quote=await client.previewPrice(j.request);return save(j)})},
  async submit(id,approval){return lock(valid(id),async()=>{const j=await read(id);if(j.request.mode!=='live')throw Error('演示任务不能提交真实生成');if(j.status!=='planned')throw Error('任务已提交或结果待核实，禁止重复收费提交');validateGenerationBudget(j.request,approval);j.quote=await client.previewPrice(j.request);await save(j);j.approval=validateGenerationApproval(j.request,{...approval,quote:j.quote});j.status='submitting';j.attempts++;await save(j)
   try{j.taskId=await client.submit(j.request);j.status='submitted';await save(j)}catch{j.status='submission_unknown';j.error='提交结果不确定。请核对RunningHub账户任务，禁止自动重提';await save(j)}return j})},
  async reconcile(id,taskId){return lock(valid(id),async()=>{const j=await read(id);if(!['submission_unknown','submitting'].includes(j.status)||typeof taskId!=='string'||!/^\d{1,80}$/.test(taskId))throw Error('只允许对待核实任务补录官方taskId');j.taskId=taskId;j.status='submitted';delete j.error;return save(j)})},
  async poll(id){return lock(valid(id),async()=>{const j=await read(id);if(['ready','mock_ready','failed'].includes(j.status))return j;if(!j.taskId||!['submitted','running','generated'].includes(j.status))throw Error('没有可恢复查询的真实任务');const result=await client.query(j.taskId);j.status=result.status;if(result.url)j.resultUrl=result.url;return save(j)})},
  async attach(id,asset){return lock(valid(id),async()=>{const j=await read(id);if(j.asset)return j;if(!['generated','planned'].includes(j.status)||j.status==='planned'&&j.request.mode!=='mock')throw Error('任务尚无生成结果');if(!asset||!/^[a-f0-9-]{36}$/.test(asset.id)||!Number.isFinite(asset.duration)||asset.duration<j.request.seconds-.1||asset.type!=='video')throw Error('素材必须为时长足够的本地视频');j.asset={id:asset.id,name:String(asset.name),type:'video',duration:asset.duration,width:asset.width,height:asset.height,sha256:asset.sha256,provenance:j.request.mode==='mock'?'local-pipeline-preview-not-ai':'runninghub-generated',taskId:j.taskId};j.status=j.request.mode==='mock'?'mock_ready':'ready';delete j.resultUrl;return save(j)})}
 }
}
export function publicGeneration(job){const {resultUrl,...safe}=job;return safe}
