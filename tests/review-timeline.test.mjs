import assert from 'node:assert/strict'
import {reviewDefaults} from '../src/templates/reviewModel.mjs'
import {reviewSignature,resizeReviewBinding,reviewAudioClip} from '../src/templates/reviewTimeline.mjs'
import {validateExport} from '../scripts/export-server.mjs'
const project={format:'overlay-review-project',version:1,params:{...reviewDefaults,duration:6,review:2,conclude:4.5},media:{}},binding={project,audio:{id:'11111111-1111-1111-1111-111111111111',name:'mix.wav'},signature:reviewSignature(project)},layer={id:'layer-test',type:'card',sceneId:'team-review',x:0,y:0,width:1920,height:1080,fontSize:48,zIndex:1,visible:true,start:0,end:6,review:binding}
const moved={...layer,start:2,end:8,review:resizeReviewBinding(binding,2,8)}
assert.equal(moved.review,binding);assert.equal(reviewAudioClip(moved).start,2);assert.equal(reviewAudioClip(moved).end,8)
const longer={...moved,end:9,review:resizeReviewBinding(binding,2,9)}
assert.equal(longer.review.project.params.duration,7);assert.equal(longer.review.project.params.conclude,4.5);assert.equal(reviewAudioClip(longer),null)
assert.throws(()=>resizeReviewBinding(binding,2,6),/动作时间/)
assert.equal(reviewAudioClip({...layer,visible:false}),null)
assert.equal(reviewAudioClip({...layer,review:{...binding,project:{...project,params:{...project.params,volume:.2}}}}),null)
function payload(l=layer){return {kind:'mp4',fps:30,duration:l.end,fileName:'test',project:{canvas:{width:1920,height:1080,aspectRatio:'16/9'},canvasLayers:[structuredClone(l)],audioClips:reviewAudioClip(l)?[reviewAudioClip(l)]:[]}}}
assert.doesNotThrow(()=>validateExport(payload()))
assert.doesNotThrow(()=>validateExport(payload(moved)))
assert.throws(()=>validateExport(payload(longer)),/声音尚未更新/)
const drift=payload(moved);drift.project.audioClips[0].start=0;assert.throws(()=>validateExport(drift),/没有同步/)
const overlap=payload();overlap.duration=7;overlap.project.canvasLayers.push({...structuredClone(layer),id:'other',start:1,end:7});overlap.project.audioClips.push({...reviewAudioClip(layer),id:'template-mix:other',start:1,end:7});assert.throws(()=>validateExport(overlap),/不支持重叠/)
console.log('PASS: template movement preserves local events, audio follows position, resize invalidates mix, hidden scene is silent, incomplete shrink/overlap/stale audio rejected, standalone MP4 accepted')
