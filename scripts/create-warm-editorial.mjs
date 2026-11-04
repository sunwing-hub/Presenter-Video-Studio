import {readFile,writeFile,mkdir} from 'node:fs/promises'
import {resolve,dirname} from 'node:path'
import {pathToFileURL} from 'node:url'
import {validateStory} from '../src/templates/story/storyModel.mjs'
import {validateExport} from './export-server.mjs'
import {studioOrigin} from './studio-origin.mjs'
// All times and the input video must already use the final speech clock.
export function createWarmEditorial(plan){
 const duration=plan.duration
 if(!/^[a-f0-9-]{36}$/.test(plan.audio?.id??''))throw Error('需要本机完整预混音轨，避免原声重复或丢失')
 const story=validateStory({format:'team-story',version:1,template:'team.warm-editorial@0.1.0',presentationStyle:'warm-editorial',editorialHeader:plan.header,platform:plan.platform??'channels',duration,video:plan.video,audio:plan.audio,music:plan.music,scenes:plan.scenes.map((s,i)=>({id:'W'+String(i+1).padStart(3,'0'),kind:'card',narrativeKind:s.layout,title:s.title,editorial:structuredClone(s.content),labels:[],theme:'light',presenter:['metric','comparison','caution','metric-steps'].includes(s.layout)?'pip':'hero',transition:'window',start:s.start,end:s.end,events:[]})),cues:plan.cues??[]})
 const project={version:7,canvas:{width:1080,height:1920,aspectRatio:'9/16'},videoDuration:duration,duration,videoMuted:true,sourceAudioMode:'mute',videoVolume:100,presenter:{mode:'full',x:50,y:35,zoom:1,size:24},layouts:[],cues:story.cues,captionStyle:{enabled:false},audioClips:[{id:'full-mix',mediaId:plan.audio.id,name:plan.audio.name??'完整预混音轨',track:'music',start:0,end:duration,offset:0,volume:1,loop:false,fadeIn:0,fadeOut:0}],canvasLayers:[{id:'warm-editorial',type:'card',sceneId:'team-story',start:0,end:duration,x:0,y:0,width:1080,height:1920,fontSize:48,zIndex:1,visible:true,story}],partTransforms:{},partTextOverrides:{},draftMedia:{video:plan.video}}
 return validateExport({kind:'mp4',mainMediaId:plan.video.id,duration,fps:25,fileName:(plan.title??'暖纸数字口播')+'.mp4',project})
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const [input,output,...args]=process.argv.slice(2);if(!input||!output)throw Error('用法：node scripts/create-warm-editorial.mjs 方案.json 新工程.json [--save-draft]')
 const plan=JSON.parse(await readFile(resolve(input),'utf8')),payload=createWarmEditorial(plan)
 await mkdir(dirname(resolve(output)),{recursive:true});await writeFile(resolve(output),JSON.stringify(payload,null,2),{flag:'wx'})
 let draft
 if(args.includes('--save-draft')){const origin=studioOrigin(),r=await fetch(origin+'/__studio/drafts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:plan.title??'暖纸数字口播',project:payload.project})});draft=await r.json();if(!r.ok)throw Error(draft.error);await writeFile(resolve(output)+'.draft.json',JSON.stringify({...draft,url:origin+'/?storyLab&draft='+draft.id},null,2),{flag:'wx'})}
 console.log(JSON.stringify({output:resolve(output),template:'team.warm-editorial@0.1.0',scenes:payload.project.canvasLayers[0].story.scenes.length,draft},null,2))
}
