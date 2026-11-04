import assert from 'node:assert/strict'
import {mkdtemp,rm,writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {resolve} from 'node:path'
import {createGenerationStore,publicGeneration} from '../scripts/generation-store.mjs'
import {runningHubClient} from '../scripts/runninghub-client.mjs'
import {validateGenerationPlan,validateGenerationApproval} from '../src/templates/story/generationModel.mjs'
import {validateDownloadUrl,isPublicAddress} from '../scripts/generation-media.mjs'
import {bindGenerationAsset} from '../src/templates/story/generationBinding.mjs'
const directory=await mkdtemp(resolve(tmpdir(),'studio-generation-')),request={mode:'live',model:'MiniMax-H3',prompt:'Original bank scene without text',seconds:5,resolution:'768P',ratio:'1:1',slot:'bank'},approval={maxTasks:1,maxGeneratedSeconds:5,budgetCny:10,quote:{currency:'CNY',total:2,source:'test fixture, not live quote',observedAt:Date.now()}},asset={id:'22222222-2222-2222-2222-222222222222',name:'test.mp4',duration:5,width:768,height:768,type:'video'}
let submissions=0,queries=0
const client={async previewPrice(){return approval.quote},async submit(){submissions++;return '1234'},async query(){queries++;return {status:'generated',url:'https://cdn.example.org/video.mp4'}}},store=createGenerationStore(directory,{client})
try{
 const job=await store.plan(request);assert.equal((await store.plan({...request,slot:'another-scene'})).id,job.id)
 assert.throws(()=>validateGenerationPlan({...request,model:'wan'}),/尚未接入/);assert.throws(()=>validateGenerationPlan({...request,seconds:4}),/5至15/)
 assert.throws(()=>validateGenerationApproval(request,{...approval,budgetCny:1}),/报价/);assert.throws(()=>validateGenerationApproval(request,{...approval,quote:{...approval.quote,observedAt:0}}),/报价/)
 await assert.rejects(store.submit(job.id,{maxTasks:1}),/最多5秒/);assert.equal(submissions,0)
 const concurrent=await Promise.allSettled([store.submit(job.id,approval),store.submit(job.id,approval)]);assert.equal(concurrent.filter(x=>x.status==='fulfilled').length,1);assert.equal(submissions,1)
 const reloaded=createGenerationStore(directory,{client});assert.equal((await reloaded.read(job.id)).taskId,'1234');await assert.rejects(reloaded.submit(job.id,approval),/禁止重复/)
 const refreshed=await reloaded.quote(job.id);assert.equal(refreshed.quote.total,2)
 const generated=await reloaded.poll(job.id);assert.equal(generated.status,'generated');assert(!('resultUrl' in publicGeneration(generated)))
 const done=await reloaded.attach(job.id,asset);assert.equal(done.status,'ready');assert.equal((await reloaded.attach(job.id,{...asset,id:'33333333-3333-3333-3333-333333333333'})).asset.id,asset.id);await reloaded.poll(job.id);assert.equal(queries,1)
 const tooSmall=await store.plan({...request,prompt:'over budget'});await assert.rejects(store.submit(tooSmall.id,{...approval,budgetCny:1}),/报价/);assert.equal((await store.read(tooSmall.id)).attempts,0);assert.equal(submissions,1)
 const unknownStore=createGenerationStore(directory,{client:{async previewPrice(){return approval.quote},async submit(){throw Error('possibly accepted SECRET')},async query(){return {status:'running'}}}}),other=await unknownStore.plan({...request,prompt:'different shot'})
 const unknown=await unknownStore.submit(other.id,approval);assert.equal(unknown.status,'submission_unknown');assert(!JSON.stringify(unknown).includes('SECRET'));await assert.rejects(unknownStore.submit(other.id,approval),/禁止重复/);await unknownStore.reconcile(other.id,'5678');assert.equal((await unknownStore.poll(other.id)).status,'running')
 const mock=await store.plan({...request,mode:'mock'});await assert.rejects(store.submit(mock.id,approval),/演示/);const mockDone=await store.attach(mock.id,asset);assert.equal(mockDone.status,'mock_ready');assert.equal(mockDone.asset.provenance,'local-pipeline-preview-not-ai')
 let calls=0
 const http=runningHubClient({base:'https://www.runninghub.cn',key:'SECRET-TEST'},async(url,options)=>{calls++;assert.equal(options.headers.Authorization,'Bearer SECRET-TEST');assert.equal(options.redirect,'error');assert.equal(JSON.parse(options.body).duration,'5');return {ok:true,json:async()=>({taskId:'9876'})}})
 assert.equal(await http.submit(request),'9876');assert.equal(calls,1)
 const pricing=runningHubClient({base:'https://www.runninghub.cn',key:'SECRET-TEST'},async(url,opt)=>{assert(url.endsWith('/openapi/v2/price-preview/minimax/hailuo-h3/text-to-video'));assert.equal(JSON.parse(opt.body).duration,'5');return {ok:true,json:async()=>({estimatedPrice:2.4,currency:'CNY',errorCode:'',isFreeThisCall:false})}})
 const estimate=await pricing.previewPrice(request);assert.equal(estimate.total,2.4);assert.equal(estimate.currency,'CNY');assert(estimate.observedAt>0)
 const invalidCurrency=runningHubClient({base:'https://www.runninghub.cn',key:'x'},async()=>({ok:true,json:async()=>({estimatedPrice:1,currency:'USD'})}));await assert.rejects(invalidCurrency.previewPrice(request),/人民币报价/)

 const ambiguous=runningHubClient({base:'https://www.runninghub.cn',key:'x'},async()=>{calls++;throw Error('timeout')});await assert.rejects(ambiguous.submit(request));assert.equal(calls,2)
 for(const url of ['http://example.org/a','https://localhost/a','https://127.0.0.1/a','https://[::1]/a','https://user:pass@example.org/a'])await assert.rejects(validateDownloadUrl(url,async()=>[{address:'127.0.0.1'}]))
 assert.equal(await validateDownloadUrl('https://cdn.example.org/a',async()=>[{address:'8.8.8.8'}]),'https://cdn.example.org/a');assert(!isPublicAddress('169.254.169.254'));assert(!isPublicAddress('10.0.0.1'))
 const story={format:'team-story',version:1,template:'test',platform:'channels',duration:5,video:{id:'11111111-1111-1111-1111-111111111111'},scenes:[{id:'bank',kind:'expertise',title:'银行',labels:['业务'],theme:'light',presenter:'pip',transition:'carry',start:0,end:5,events:[]}],cues:[]},project={canvasLayers:[{story}]}
 const bound=bindGenerationAsset(project,'bank',mockDone);assert.equal(bound.canvasLayers[0].story.scenes[0].broll.mode,'mock');assert.equal(project.canvasLayers[0].story.scenes[0].broll,undefined);await assert.rejects(async()=>bindGenerationAsset(project,'missing',done),/不存在/)
 const unknownRestart=await store.plan({...request,prompt:'crash before submit result'});await writeFile(resolve(directory,unknownRestart.id+'.lock'),JSON.stringify({pid:2147483647}));assert.equal((await store.submit(unknownRestart.id,approval)).status,'submitted')
 console.log('PASS: generation cache, budget gate, one submit, durable recovery, ambiguous-submit block, mock provenance, secret exclusion, download constraints, template binding')
}finally{await rm(directory,{recursive:true,force:true})}
