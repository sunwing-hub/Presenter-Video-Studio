import {realpathSync,readFileSync} from 'node:fs'
import {resolve,dirname} from 'node:path'
import {fileURLToPath} from 'node:url'
export const studioRoot=realpathSync(resolve(dirname(fileURLToPath(import.meta.url)),'..'))
export function sameStudio(info,root=studioRoot){return info?.app==='presenter-video-studio'&&info?.root===root}
export async function inspectStudio(origin,root=studioRoot,retry=true){
 try{
  const response=await fetch(origin+'/__studio/info',{signal:AbortSignal.timeout(1200)})
  if(!response.ok)return {state:'foreign',origin}
  let info;try{info=await response.json()}catch{return {state:'foreign',origin}}
  return {state:sameStudio(info,root)?'ready':'foreign',origin,info}
 }catch(error){if(retry)return inspectStudio(origin,root,false);return {state:error.cause?.code==='ECONNREFUSED'?'offline':'unreachable',origin}}
}
export function storedConnection(root=studioRoot){
 try{const data=JSON.parse(readFileSync(resolve(root,'user-data/runtime.json'),'utf8'));return data.root===root&&/^http:\/\/127\.0\.0\.1:\d+$/.test(data.origin)?data:null}catch{return null}
}
