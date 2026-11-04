import{readFile,writeFile}from'node:fs/promises'
import{resolve}from'node:path'
import{fileURLToPath}from'node:url'
export function reviewSubtitleOverlaps(input,{singleSpeaker=false,maxOverlap=.12,minDuration=.25}={}){
 const cues=structuredClone(input),changes=[],warnings=[]
 if(!Array.isArray(cues)||cues.some(c=>!Number.isFinite(c.start)||!Number.isFinite(c.end)||c.end<=c.start))throw Error('需要start/end秒制字幕数组')
 for(let i=1;i<cues.length;i++){const c=cues[i],prev=cues[i-1],overlap=prev.end-c.start;if(overlap<=.001)continue
  if(singleSpeaker&&overlap<=maxOverlap&&c.end-prev.end>=minDuration&&!c.captionSegments&&!c.words&&c.start>=prev.start){changes.push({id:c.id,index:i,oldStart:c.start,newStart:prev.end,overlap,reason:'单说话人轻微边界重叠建议，仍需听校'});c.start=prev.end}
  else warnings.push({id:c.id,index:i,overlap,reason:'需要人工确认；未钳制、未改写内容'})
 }
 return{cues,changes,warnings,requiresListeningReview:true}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const[input,output,...flags]=process.argv.slice(2);if(!input||!output)throw Error('用法：subtitle-overlap-review 输入.json 新报告.json [--single-speaker]；不修改输入，不自动提交工程')
 const source=JSON.parse(await readFile(resolve(input),'utf8')),report=reviewSubtitleOverlaps(Array.isArray(source)?source:source.cues,{singleSpeaker:flags.includes('--single-speaker')});await writeFile(resolve(output),JSON.stringify(report,null,2),{flag:'wx'});console.log(JSON.stringify({suggestions:report.changes.length,manual:report.warnings.length,output:resolve(output)}))
}
