export const generationModels=[
 {id:'MiniMax-H3',provider:'runninghub',status:'adapter-ready',resolutions:['768P','2K'],minSeconds:5,maxSeconds:15},
 {id:'wan',provider:'runninghub',status:'planned'},
 {id:'ltx',provider:'runninghub',status:'planned'},
]
export function validateGenerationPlan(input){
 if(!input||!['live','mock'].includes(input.mode??'live')||input.model!=='MiniMax-H3')throw Error('本轮仅开放 MiniMax-H3；Wan / LTX 尚未接入')
 const prompt=String(input.prompt??'').trim();if(!prompt||prompt.length>6000)throw Error('需要不超过6000字的镜头提示词')
 if(!['768P','2K'].includes(input.resolution)||!['1:1','9:16','16:9'].includes(input.ratio))throw Error('生成规格无效')
 if(!Number.isInteger(input.seconds)||input.seconds<5||input.seconds>15)throw Error('生成时长需要5至15秒的整数')
 const slot=String(input.slot??'').trim();if(!/^[A-Za-z0-9_.-]{1,80}$/.test(slot))throw Error('镜头槽位编号无效')
 return {version:1,provider:'runninghub',model:'MiniMax-H3',mode:input.mode??'live',prompt,resolution:input.resolution,ratio:input.ratio,seconds:input.seconds,slot}
}
export function validateGenerationBudget(plan,input){
 if(input?.maxTasks!==1||!Number.isFinite(input.maxGeneratedSeconds)||input.maxGeneratedSeconds<plan.seconds||input.maxGeneratedSeconds>5)throw Error('首轮测试只允许一次、最多5秒生成')
 if(!Number.isFinite(input.budgetCny)||input.budgetCny<=0)throw Error('真实提交前需要明确的人民币预算上限')
 return {maxTasks:1,maxGeneratedSeconds:input.maxGeneratedSeconds,budgetCny:input.budgetCny}
}
export function validateGenerationApproval(plan,input,now=Date.now()){
 validateGenerationBudget(plan,input)
 const q=input.quote
 if(!Number.isFinite(input.budgetCny)||input.budgetCny<=0||q?.currency!=='CNY'||!Number.isFinite(q.total)||q.total<0||q.total>input.budgetCny||typeof q.source!=='string'||!q.source.trim()||!Number.isFinite(q.observedAt)||q.observedAt>now+1000||now-q.observedAt>3600000)throw Error('真实提交前需要一小时内的账户报价和明确的人民币预算上限')
 return {maxTasks:1,maxGeneratedSeconds:input.maxGeneratedSeconds,budgetCny:input.budgetCny,quote:{currency:'CNY',total:q.total,source:q.source,observedAt:q.observedAt},priceEnforcement:'preflight quote comparison; final provider billing is authoritative'}
}
