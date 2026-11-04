import {readFile} from 'node:fs/promises'
import {homedir} from 'node:os'
import {resolve} from 'node:path'
const official=new Set(['https://www.runninghub.cn','https://www.runninghub.ai'])
export async function runningHubConfig(){
 const config={...process.env}
 for(const file of [resolve('.env'),resolve(homedir(),'.codex/skills/ai-talking-head-director/.env')]){
  let text;try{text=await readFile(file,'utf8')}catch{continue}
  for(const line of text.split(/\r?\n/)){const m=line.match(/^\s*(?:export\s+)?(RUNNINGHUB_API_KEY|RUNNINGHUB_API_BASE)\s*=\s*(.*?)\s*$/);if(!m||config[m[1]])continue;config[m[1]]=m[2].replace(/^(['"])(.*)\1$/,'$2')}
 }
 const base=config.RUNNINGHUB_API_BASE||'https://www.runninghub.cn';if(!official.has(base))throw Error('RunningHub 地址必须为官方 .cn 或 .ai')
 return {base,key:config.RUNNINGHUB_API_KEY||''}
}
export function runningHubClient(config,request=fetch){
 async function post(path,body){
  if(!config.key)throw Error('RunningHub API Key 尚未配置')
  const r=await request(config.base+path,{method:'POST',redirect:'error',headers:{Authorization:'Bearer '+config.key,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(180000)})
  if(!r.ok)throw Error('RunningHub HTTP '+r.status)
  const d=await r.json();if(d.errorCode||![undefined,null,0,'0'].includes(d.code))throw Error('RunningHub 返回服务错误')
  return d
 }
 return {
  async previewPrice(plan){const path='/openapi/v2/price-preview/minimax/hailuo-h3/text-to-video',d=await post(path,{prompt:plan.prompt,resolution:plan.resolution,duration:String(plan.seconds),ratio:plan.ratio});if(d.currency!=='CNY'||!Number.isFinite(d.estimatedPrice)||d.estimatedPrice<0)throw Error('RunningHub 未返回有效人民币报价');return {currency:d.currency,total:d.estimatedPrice,source:config.base+path,observedAt:Date.now(),isFreeThisCall:d.isFreeThisCall===true}},
  async submit(plan){const d=await post('/openapi/v2/minimax/hailuo-h3/text-to-video',{prompt:plan.prompt,resolution:plan.resolution,duration:String(plan.seconds),ratio:plan.ratio});if(!d.taskId)throw Error('提交结果缺少taskId，请核对账户任务后再处理');return String(d.taskId)},
  async query(taskId){const d=await post('/openapi/v2/query',{taskId});const status=d.status;if(status==='SUCCESS'){const file=(d.results??[]).find(x=>['mp4','video','mov'].includes(String(x.outputType).toLowerCase())||/\.mp4(?:\?|$)/i.test(x.url??''));if(!file?.url)throw Error('任务成功但缺少视频结果');return {status:'generated',url:file.url}}
   if(['FAILED','FAILURE','ERROR','CANCELED','CANCELLED'].includes(status))return {status:'failed'}
   if(['RUNNING','QUEUED','PENDING','WAITING','PROCESSING'].includes(status))return {status:'running'}
   throw Error('无法识别的任务状态；请核对RunningHub任务')
  }
 }
}
