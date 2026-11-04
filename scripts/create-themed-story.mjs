import {studioOrigin} from './studio-origin.mjs'
import {readFile,writeFile,mkdir} from 'node:fs/promises'
import {resolve,dirname} from 'node:path'
import {withStoryTheme,storyThemes} from '../src/templates/story/storyModel.mjs'
const [theme,input,output,...args]=process.argv.slice(2)
if(!Object.hasOwn(storyThemes,theme)||!input||!output)throw Error('用法：create-themed-story dark-tech|white-flow 输入工程.json 新工程.json [--save-draft]；每条视频必须选择一种全片主题')
const data=JSON.parse(await readFile(resolve(input),'utf8')),project=structuredClone(data.project??data),layers=project.canvasLayers?.filter(l=>l.story)
if(!layers?.length)throw Error('需要包含全片模板的工程')
for(const layer of layers)layer.story=withStoryTheme(layer.story,theme)
const result=data.project?{...data,project,fileName:(data.fileName||'视频')+'-'+storyThemes[theme].name}:project
await mkdir(dirname(resolve(output)),{recursive:true});await writeFile(resolve(output),JSON.stringify(result,null,2),{flag:'wx'})
let draft
if(args.includes('--save-draft')){const origin=studioOrigin(),r=await fetch(origin+'/__studio/drafts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:storyThemes[theme].name+' · 全片模板预览',project})});draft=await r.json();if(!r.ok)throw Error(draft.error);await writeFile(resolve(output)+'.draft.json',JSON.stringify({...draft,url:origin+'/?storyLab&draft='+draft.id},null,2),{flag:'wx'})}
console.log(JSON.stringify({theme:storyThemes[theme].name,template:layers[0].story.template,sceneCount:layers[0].story.scenes.length,output:resolve(output),draft},null,2))
