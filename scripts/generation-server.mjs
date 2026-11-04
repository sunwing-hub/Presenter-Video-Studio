import {resolve} from 'node:path'
import {createGenerationStore,publicGeneration} from './generation-store.mjs'
import {runningHubConfig,runningHubClient} from './runninghub-client.mjs'
import {downloadGeneratedVideo,importGeneratedVideo} from './generation-media.mjs'
import {generationModels} from '../src/templates/story/generationModel.mjs'
const client={async previewPrice(p){return runningHubClient(await runningHubConfig()).previewPrice(p)},async submit(p){return runningHubClient(await runningHubConfig()).submit(p)},async query(t){return runningHubClient(await runningHubConfig()).query(t)}}
export const generationStore=createGenerationStore(undefined,{client})
let collecting=false
export async function collectGeneration(id){
 if(collecting)throw Error('正在接收其他生成素材，请稍后重试')
 collecting=true
 try{const job=await generationStore.read(id);if(job.asset)return job;if(job.status!=='generated')throw Error('生成任务尚未成功');const dir=generationStore.folder(id);await downloadGeneratedVideo(job.resultUrl,resolve(dir,'source.mp4'));return await generationStore.attach(id,await importGeneratedVideo(job,dir))}finally{collecting=false}
}
export async function generationRoute(req,res,path){
 if(!path.startsWith('/__studio/generation'))return false
 const reply=(status,data)=>{res.statusCode=status;res.setHeader('Content-Type','application/json');res.end(JSON.stringify(data))}
 const body=async()=>{if(!req.headers['content-type']?.startsWith('application/json'))throw Error('需要JSON参数');let size=0;const chunks=[];for await(const c of req){size+=c.length;if(size>64000)throw Error('生成请求过大');chunks.push(c)}return JSON.parse(Buffer.concat(chunks).toString('utf8'))}
 try{
  if(path==='/__studio/generation/capabilities'&&req.method==='GET'){const c=await runningHubConfig();reply(200,{provider:'runninghub',configured:Boolean(c.key),models:generationModels,firstTest:{maxTasks:1,maxGeneratedSeconds:5},liveGenerationVerified:(await generationStore.list()).some(j=>j.request.mode==='live'&&j.status==='ready')});return true}
  if(path==='/__studio/generation/jobs'&&req.method==='GET'){reply(200,(await generationStore.list()).map(publicGeneration));return true}
  if(path==='/__studio/generation/plans'&&req.method==='POST'){reply(201,publicGeneration(await generationStore.plan(await body())));return true}
  const m=path.match(/^\/__studio\/generation\/([a-f0-9-]{36})(?:\/(submit|poll|collect|reconcile|quote))?$/)
  if(!m){reply(404,{error:'生成接口不存在'});return true}
  if(req.method==='GET'&&!m[2]){reply(200,publicGeneration(await generationStore.read(m[1])));return true}
  if(req.method==='POST'){
   let j
   if(m[2]==='quote')j=await generationStore.quote(m[1])
   else if(m[2]==='submit')j=await generationStore.submit(m[1],await body())
   else if(m[2]==='poll')j=await generationStore.poll(m[1])
   else if(m[2]==='collect')j=await collectGeneration(m[1])
   else if(m[2]==='reconcile')j=await generationStore.reconcile(m[1],(await body()).taskId)
   else throw Error('生成操作无效')
   reply(200,publicGeneration(j));return true
  }
  reply(405,{error:'生成请求方法无效'})
 }catch(e){reply(e.code==='ENOENT'?404:400,{error:e.message})}
 return true
}
