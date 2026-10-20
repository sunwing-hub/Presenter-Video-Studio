import {mkdir,readFile,writeFile,rename,readdir} from 'node:fs/promises'
import {resolve} from 'node:path'
import {randomUUID} from 'node:crypto'

export function createDraftStore(directory){
 let queue=Promise.resolve()
 const valid=id=>{if(!/^[a-f0-9-]{36}$/.test(id))throw Error('草稿编号无效');return id}
 const read=(id,previous=false)=>readFile(resolve(directory,`${valid(id)}${previous?'.previous':''}.json`),'utf8').then(JSON.parse)
 const atomic=async(path,data)=>{const tmp=`${path}.${randomUUID()}.tmp`;await writeFile(tmp,JSON.stringify(data));await rename(tmp,path)}
 const list=async()=>{await mkdir(directory,{recursive:true});const names=(await readdir(directory)).filter(n=>/^[a-f0-9-]{36}\.json$/.test(n));const records=await Promise.all(names.map(n=>read(n.slice(0,-5)).catch(()=>null)));return records.filter(Boolean).map(({id,title,revision,savedAt})=>({id,title,revision,savedAt})).sort((a,b)=>b.savedAt.localeCompare(a.savedAt))}
 const save=input=>{
  const operation=queue.then(async()=>{
   if(!input?.project||!Array.isArray(input.project.canvasLayers)||input.project.version!==7)throw Error('草稿工程格式无效')
   const id=input.id?valid(input.id):randomUUID();let old=null
   if(input.id){old=await read(id);if(old.revision!==input.revision){const e=Error('该草稿已在另一个窗口更新。请另存为新草稿，避免覆盖。');e.status=409;throw e}}
   const record={id,title:String(input.title||'未命名草稿').slice(0,100),revision:(old?.revision??0)+1,savedAt:new Date().toISOString(),project:input.project}
   await mkdir(directory,{recursive:true})
   if(old)await atomic(resolve(directory,`${id}.previous.json`),old)
   await atomic(resolve(directory,`${id}.json`),record)
   return {id:record.id,title:record.title,revision:record.revision,savedAt:record.savedAt}
  })
  queue=operation.catch(()=>{});return operation
 }
 return {read,list,save}
}
const store=createDraftStore(process.env.OVERLAY_DRAFT_DIR||resolve(import.meta.dirname,'../drafts'))
export async function draftRoute(req,res,path){
 if(!path.startsWith('/__studio/drafts'))return false
 const reply=(status,data)=>{res.statusCode=status;res.setHeader('Content-Type','application/json');res.end(JSON.stringify(data))}
 try{
  if(path==='/__studio/drafts'&&req.method==='GET'){reply(200,await store.list());return true}
  if(path==='/__studio/drafts'&&req.method==='POST'){
   let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>100e6)throw Error('草稿超过 100MB，请缩小图片');chunks.push(chunk)}
   reply(200,await store.save(JSON.parse(Buffer.concat(chunks).toString('utf8'))));return true
  }
  const m=path.match(/^\/__studio\/drafts\/([a-f0-9-]{36})(\/previous)?$/)
  if(m&&req.method==='GET'){reply(200,await store.read(m[1],Boolean(m[2])));return true}
  reply(404,{error:'草稿不存在'})
 }catch(e){reply(e.status|| (e.code==='ENOENT'?404:400),{error:e.message})}
 return true
}
