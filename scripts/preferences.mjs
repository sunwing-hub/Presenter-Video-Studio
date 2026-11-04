import fs from 'node:fs/promises'
import {resolve,dirname} from 'node:path'
import {fileURLToPath,pathToFileURL} from 'node:url'
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..')
export const defaults={fontFamily:'"PingFang SC","Microsoft YaHei","Noto Sans CJK SC",sans-serif',captions:'single-line-semantic',music:'user-library',bgmLibrary:'',missingMusic:'ask-or-silent',sfx:'sparse-generated',loudnessLUFS:-16,truePeakDbtp:-1,speed:1,theme:'per-template',instructions:''}
export function validatePreferences(input){
 if(!input||!['default','custom'].includes(input.mode))throw Error('请选择 default 或 custom；不会自动代用户确认')
 const settings={...defaults,...(input.settings??{})},keys=Object.keys(defaults)
 if(Object.keys(settings).some(k=>!keys.includes(k)))throw Error('未知标准字段')
 for(const k of ['fontFamily','bgmLibrary'])if(typeof settings[k]!=='string'||settings[k].length>500||/[\x00-\x1f<>]/.test(settings[k]))throw Error('字体或曲库路径无效')
 if(typeof settings.instructions!=='string'||settings.instructions.length>2000)throw Error('自定标准说明过长或无效')
 if(!['single-line-semantic','custom'].includes(settings.captions)||!['user-library','none'].includes(settings.music)||!['ask-or-silent','silent'].includes(settings.missingMusic)||!['sparse-generated','none','user-library'].includes(settings.sfx)||settings.theme!=='per-template')throw Error('标准选项无效')
 if(!Number.isFinite(settings.loudnessLUFS)||settings.loudnessLUFS< -30||settings.loudnessLUFS> -10||!Number.isFinite(settings.truePeakDbtp)||settings.truePeakDbtp> -1||settings.truePeakDbtp< -12||!Number.isFinite(settings.speed)||settings.speed<.5||settings.speed>2)throw Error('响度、峰值或速度超出范围')
 return {schema:'overlay-studio/preferences@1',mode:input.mode,settings,confirmedAt:new Date().toISOString()}
}
export async function readPreferences(root=ROOT){try{return JSON.parse(await fs.readFile(resolve(root,'user-data/preferences.json'),'utf8'))}catch(e){if(e.code==='ENOENT')return null;throw e}}
export async function savePreferences(input,root=ROOT){const p=validatePreferences(input),dir=resolve(root,'user-data');await fs.mkdir(dir,{recursive:true});const file=resolve(dir,'preferences.json');await fs.writeFile(file+'.tmp',JSON.stringify(p,null,2),{mode:0o600});await fs.rename(file+'.tmp',file);return p}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 try{const cmd=process.argv[2];if(cmd==='status'){const profile=await readPreferences();console.log(JSON.stringify({needsChoice:!profile,defaults,profile},null,2))}
 else if(cmd==='defaults'){console.log(JSON.stringify(await savePreferences({mode:'default'}),null,2))}
 else if(cmd==='custom'&&process.argv[3]){console.log(JSON.stringify(await savePreferences({mode:'custom',settings:JSON.parse(await fs.readFile(resolve(process.argv[3]),'utf8'))}),null,2))}
 else throw Error('用法：preferences.mjs status | defaults（用户明确选择后）| custom 标准.json')
 }catch(e){console.error(e.message);process.exitCode=1}
}
