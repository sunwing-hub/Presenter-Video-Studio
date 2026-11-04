import {validateReviewProject,reviewSoundRevision} from './reviewModel.mjs'
export function reviewSignature(project){return reviewSoundRevision+':'+JSON.stringify(validateReviewProject(project))}
export function validateReviewBinding(value){
 const project=validateReviewProject(value?.project),binding={project}
 if(value.audio!=null){if(!/^[a-f0-9-]{36}$/.test(value.audio.id)||typeof value.audio.name!=='string')throw Error('模板声音引用无效');binding.audio={id:value.audio.id,name:value.audio.name}}
 if(value.signature!==undefined){if(typeof value.signature!=='string'||value.signature.length>16000)throw Error('模板混音标识无效');binding.signature=value.signature}
 return binding
}
export function resizeReviewBinding(binding,start,end){
 if(!Number.isFinite(start)||!Number.isFinite(end)||start<0||end<=start)throw Error('模板时间范围无效')
 const length=Number((end-start).toFixed(6));if(Math.abs(length-binding.project.params.duration)<.00001)return binding
 const project=validateReviewProject({...binding.project,params:{...binding.project.params,duration:length}})
 return {project}
}
export function reviewAudioClip(layer){
 if(!layer.visible||!layer.review?.audio)return null
 const b=layer.review;let key;try{key=reviewSignature(b.project)}catch{return null}
 if(key!==b.signature)return null
 return {id:`template-mix:${layer.id}`,mediaId:b.audio.id,name:`模板混音 · ${b.project.params.title}`,track:'sfx',start:layer.start??0,end:layer.end??(layer.start??0)+b.project.params.duration,offset:0,volume:1,loop:false}
}
