import { readFileSync } from 'node:fs'
import { basename } from 'node:path'
import { parseSrt, validateCues, validatePlan } from '../src/arrangement.ts'
const [planPath,subtitlePath,origin='http://127.0.0.1:5173']=process.argv.slice(2)
try {
 if(!planPath || !subtitlePath) throw Error('用法：node scripts/publish-arrangement.mjs plan.json subtitle.srt（或 handoff.json） [本地网址]')
 if(!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin)) throw Error('仅允许发布到本机工作台')
 const raw=readFileSync(subtitlePath,'utf8')
 const cues=subtitlePath.toLowerCase().endsWith('.srt')?parseSrt(raw).cues:validateCues(JSON.parse(raw).cues)
 const plan=validatePlan(JSON.parse(readFileSync(planPath,'utf8')),cues)
 const response=await fetch(`${origin}/__studio/arrangement`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({plan,cues,subtitleName:basename(subtitlePath)})})
 const result=await response.json();if(!response.ok)throw Error(result.error)
 console.log(`已送达本地工作台：${result.cards} 张卡片。保持页面打开，首次自动载入；替换旧编排需要在页面确认。未启动 MOV 导出。`)
}catch(error){console.error(error.message);process.exitCode=1}
