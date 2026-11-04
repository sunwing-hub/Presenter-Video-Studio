import {readFile} from 'node:fs/promises'
import {resolve,dirname} from 'node:path'
import {fileURLToPath} from 'node:url'
import {defaults,readPreferences,savePreferences} from './preferences.mjs'
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..')
export function userSettingsServer(){return {name:'overlay-user-settings',configureServer(server){server.middlewares.use(async(req,res,next)=>{
 const path=new URL(req.url,'http://localhost').pathname;if(!['/__studio/preferences','/__studio/templates'].includes(path))return next()
 res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store')
 try{
 if(req.method==='GET'){
 if(path.endsWith('preferences'))return res.end(JSON.stringify({defaults,profile:await readPreferences()}))
 const catalog=JSON.parse(await readFile(resolve(ROOT,'templates/catalog.json'),'utf8'));return res.end(JSON.stringify(catalog.templates.filter(t=>t.releaseChannel==='production')))
 }
 if(req.method!=='POST'||path!=='/__studio/preferences'){res.statusCode=405;return res.end(JSON.stringify({error:'Method not allowed'}))}
 if(req.headers.origin&&req.headers.origin!==`http://${req.headers.host}`){res.statusCode=403;return res.end(JSON.stringify({error:'仅允许本机同源设置'}))}
 let body='';for await(const chunk of req){body+=chunk;if(body.length>8192)throw Error('设置内容过大')}
 res.end(JSON.stringify(await savePreferences(JSON.parse(body))))
 }catch(e){res.statusCode=400;res.end(JSON.stringify({error:e.message}))}
 })}}}
