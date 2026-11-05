import {readFile,writeFile,mkdir,unlink} from 'node:fs/promises'
import {resolve,sep} from 'node:path'
import {randomUUID} from 'node:crypto'
import {mediaDir} from './local-media.mjs'
import {createDraftStore} from './draft-store.mjs'
import {validateExport} from './export-server.mjs'
import {readPreferences} from './preferences.mjs'
const root=resolve(import.meta.dirname,'..'),publicDir=resolve(root,'public/template-demos'),store=createDraftStore(resolve(root,'drafts'))
export function bundledPath(url){if(typeof url!=='string'||!url.startsWith('/template-demos/'))throw Error('模板资源路径无效');const p=resolve(root,'public','.'+url);if(!p.startsWith(publicDir+sep))throw Error('模板资源越界');return p}
export async function createTemplateDraft(id,version){
 const c=JSON.parse(await readFile(resolve(root,'templates/catalog.json'),'utf8')),t=c.templates.find(t=>t.id===id&&t.version===version&&t.releaseChannel==='production');if(!t)throw Error('没有找到所选制作模板版本')
 if(!t.starterProject)throw Error('此模板尚未提供可创建的起始工程，请先完善模板规范')
 const b=JSON.parse(await readFile(bundledPath(t.starterProject),'utf8'));if(b.format!=='presenter-template-starter'||b.version!==1||b.templateId!==id||b.templateVersion!==version)throw Error('起始工程与选定模板版本不一致')
 const allowed=new Set(['video/mp4','image/png','image/jpeg','audio/flac','audio/wav']),mapping={},created=[]
 try{
  await mkdir(mediaDir,{recursive:true})
  for(const [old,asset] of Object.entries(b.bindings)){if(!/^[a-f0-9-]{36}$/.test(old)||!allowed.has(asset.mime))throw Error('模板素材描述无效');const data=await readFile(bundledPath(asset.url)),newId=randomUUID(),meta={id:newId,name:String(asset.name||'示例素材'),mime:asset.mime,type:asset.mime.startsWith('video/')?'video':asset.mime.startsWith('image/')?'image':'audio',url:'/__studio/media/'+newId};await writeFile(resolve(mediaDir,newId),data,{flag:'wx'});created.push(resolve(mediaDir,newId));await writeFile(resolve(mediaDir,newId+'.json'),JSON.stringify(meta),{flag:'wx'});created.push(resolve(mediaDir,newId+'.json'));mapping[old]=newId}
  const replace=v=>typeof v==='string'?Object.entries(mapping).reduce((s,[a,b])=>s.replaceAll(a,b),v):Array.isArray(v)?v.map(replace):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,x])=>[k,replace(x)])):v
  const project=replace(b.project),story=project.canvasLayers.find(l=>l.story)?.story;if(!story)throw Error('缺少原生模板工程')
  const profile=await readPreferences();if(profile?.settings?.fontFamily)story.fontFamily=profile.settings.fontFamily
  project.templateSelection={id,version};project.demoContent=true
  validateExport({kind:'mp4',project,mainMediaId:story.video?.id,duration:story.duration,fps:25,fileName:'模板示例.mp4'})
  return await store.save({title:t.name+' · 示例待替换',project})
 }catch(e){await Promise.all(created.map(p=>unlink(p).catch(()=>{})));throw e}
}
