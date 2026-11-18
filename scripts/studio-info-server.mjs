import {readFileSync} from 'node:fs'
import {join} from 'node:path'
import {studioRoot} from './studio-connection.mjs'
export function studioInfoServer(){return {name:'presenter-studio-info',configureServer(server){
 server.middlewares.use((req,res,next)=>{
  if(new URL(req.url,'http://localhost').pathname!=='/__studio/info')return next()
  res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store')
  if(req.method!=='GET'){res.statusCode=405;return res.end(JSON.stringify({error:'Method not allowed'}))}
  if(req.headers.origin&&req.headers.origin!==`http://${req.headers.host}`){res.statusCode=403;return res.end(JSON.stringify({error:'仅允许本机同源访问'}))}
  res.end(JSON.stringify({app:'presenter-video-studio',root:studioRoot,pid:process.pid,version:JSON.parse(readFileSync(join(studioRoot,'package.json'),'utf8')).version,channel:'test'}))
 })
}}}
