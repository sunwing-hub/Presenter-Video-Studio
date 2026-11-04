import {validateStory} from './storyModel.mjs'
export function bindGenerationAsset(project,sceneId,job){
 if(!['ready','mock_ready'].includes(job?.status)||!job.asset)throw Error('生成素材尚未入库')
 const result=structuredClone(project),layer=result.canvasLayers?.find(l=>l.story),scene=layer?.story.scenes.find(s=>s.id===sceneId)
 if(!scene)throw Error('模板镜头不存在')
 scene.broll={mediaId:job.asset.id,jobId:job.id,mode:job.request.mode,sourceDuration:job.asset.duration,offset:0,fit:'cover',endBehavior:'hold'}
 layer.story=validateStory(layer.story)
 return result
}
