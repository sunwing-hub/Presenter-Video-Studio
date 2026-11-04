import assert from 'node:assert/strict'
import {reviewDefaults,validateReview,validateReviewProject,reviewEvents,cueSample} from '../src/templates/reviewModel.mjs'
import {mixReview} from '../scripts/review-export.mjs'
const p=validateReview({...reviewDefaults,duration:6,review:2,conclude:4.5})
assert.throws(()=>validateReview({...p,conclude:2.1}),/动作时间/)
assert.throws(()=>validateReview({...p,volume:NaN}),/有效数字/)
assert.throws(()=>validateReview({...p,title:' '}))
assert.throws(()=>validateReview({...p,unknown:1}))
assert.throws(()=>validateReviewProject({format:'overlay-review-project',version:1,params:p,media:{voice:{id:'../../x',name:'bad'}}}))
const project=validateReviewProject({format:'overlay-review-project',version:1,params:p,media:{}}),job={}
const wav=await mixReview(project,{},job),view=new DataView(wav.buffer),sr=48000
assert.equal(view.getUint32(24,true),sr)
assert.equal(view.getUint32(40,true),6*sr*4)
const energy=(at)=>{let n=0;for(let f=Math.round(at*sr);f<Math.round((at+.15)*sr);f++)n+=Math.abs(view.getInt16(44+f*4,true));return n}
assert(energy(2)>10000);assert.equal(energy(1),0);assert(energy(4.5)>10000)
const changed={...project,params:{...p,review:2.5}},wav2=await mixReview(changed,{},{}),v2=new DataView(wav2.buffer)
assert.equal(v2.getInt16(44+Math.round(2.05*sr)*4,true),0)
assert(reviewEvents(changed.params).some(e=>e.at===2.5))
assert.equal(cueSample(.7,0),0)
assert.notEqual(cueSample(.5,4),0)
assert(energy(5)>0,'结论音效尾音应完整进入混音')
assert.equal(Buffer.compare(Buffer.from(wav),Buffer.from(await mixReview(project,{},{}))),0)
const muted=await mixReview({...project,params:{...p,sound:false}},{},{})
assert(muted.slice(44).every(n=>n===0))
console.log('PASS: review project validation, dependent events, exact PCM duration, deterministic SFX, event retiming, mute and path rejection')
// Verify speech-triggered music attenuation, recovery, and explicit loop behavior.
const {mkdtemp,writeFile,rm}=await import('node:fs/promises'),{tmpdir}=await import('node:os'),{join}=await import('node:path'),{wavStereo}=await import('../src/templates/reviewModel.mjs')
const tmp=await mkdtemp(join(tmpdir(),'overlay-review-mix-'))
try{
 const voice=new Float32Array(6*sr*2),music=new Float32Array(2*sr*2)
 for(let f=0;f<2*sr;f++){voice[f*2]=voice[f*2+1]=.2*Math.sin(2*Math.PI*220*f/sr);music[f*2]=music[f*2+1]=.15*Math.sin(2*Math.PI*110*f/sr)}
 const vf=join(tmp,'voice.wav'),mf=join(tmp,'music.wav');await writeFile(vf,wavStereo(voice));await writeFile(mf,wavStereo(music))
 const params={...p,sound:false,musicLoop:true,musicFade:0,musicVolume:.5}
 const v=await mixReview({...project,params},{voice:{file:vf}},{}),normal=await mixReview({...project,params:{...params,ducking:false}},{voice:{file:vf},music:{file:mf}},{}),ducked=await mixReview({...project,params},{voice:{file:vf},music:{file:mf}},{}),noLoop=await mixReview({...project,params:{...params,musicLoop:false}},{music:{file:mf}},{})
 const residual=(bytes,start)=>{const d=new DataView(bytes.buffer),vd=new DataView(v.buffer);let total=0;for(let f=start*sr;f<(start+.5)*sr;f++){const x=d.getInt16(44+f*4,true)-vd.getInt16(44+f*4,true);total+=x*x}return Math.sqrt(total/(sr*.5))}
 assert(residual(ducked,1)/residual(normal,1)<.5)
 assert(residual(ducked,4)/residual(normal,4)>.95)
 assert.equal(new DataView(noLoop.buffer).getInt16(44+4*sr*4,true),0)
 console.log('PASS: voice activity ducks music, music recovers, looping is explicit')
}finally{await rm(tmp,{recursive:true,force:true})}
