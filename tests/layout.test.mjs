import assert from 'node:assert/strict'
import {validateLayouts,layoutAt,presenterDefault,presenterRect,animatedRect,fitMaterialRect} from '../src/layoutTimeline.ts'
const clip={id:'one',start:1,end:3,settings:{...presenterDefault,mode:'circle'},transition:.5,offset:0}
assert.deepEqual(validateLayouts([clip],4),[clip])
assert.throws(()=>validateLayouts([clip,{...clip,id:'two',start:2}],4),/重叠/)
assert.throws(()=>validateLayouts([{...clip,end:6}],4),/时间/)
assert.throws(()=>validateLayouts([{...clip,settings:{...clip.settings,zoom:NaN}}],4))
assert.equal(layoutAt([clip],1)?.id,'one')
assert.equal(layoutAt([clip],3),undefined)
const full=presenterRect(presenterDefault,16/9),circle=presenterRect(clip.settings,16/9)
assert.deepEqual(animatedRect([clip],1,presenterDefault,16/9),full)
assert.deepEqual(animatedRect([clip],2,presenterDefault,16/9),circle)
assert.deepEqual(animatedRect([clip],3,presenterDefault,16/9),circle)
assert.deepEqual(animatedRect([clip],3.5,presenterDefault,16/9),full)
assert.ok(animatedRect([clip],3.25,presenterDefault,16/9).width>circle.width)
assert.deepEqual(animatedRect([clip],1,presenterDefault,16/9),full)
assert.equal(circle.height*1080,circle.width*1920)
const corner={...clip,settings:{...clip.settings,aboveEffects:true,frame:{left:80,top:3,width:17,height:17*4/3,radius:50}}}
assert.deepEqual(validateLayouts([corner],4),[corner])
assert.deepEqual(presenterRect(corner.settings,4/3),corner.settings.frame)
assert.equal(presenterRect(corner.settings,4/3).height*1080,presenterRect(corner.settings,4/3).width*1440)
assert.throws(()=>validateLayouts([{...corner,settings:{...corner.settings,aboveEffects:'yes'}}],4))
console.log('PASS: layout validation, boundaries, deterministic seeking, circular aspect, enter/exit transitions.')
for(const [w,h] of [[1920,1080],[1080,1920],[1080,1440],[1080,1080]])for(const mode of ['left','right']){
 const source={id:'oversized',x:0,y:-100,width:3000,height:2200},s={...presenterDefault,mode}
 const fitted=fitMaterialRect(source,s,w,h)
 assert.equal(source.width,3000)
 assert.ok(Math.abs(fitted.width/fitted.height-source.width/source.height)<1e-10)
 assert.ok(fitted.y>=0&&fitted.y+fitted.height<=h)
 assert.ok(mode==='right'?fitted.x+fitted.width<=w/2:fitted.x>=w/2)
 const again=fitMaterialRect(fitted,s,w,h)
 for(const key of ['x','y','width','height'])assert.ok(Math.abs(again[key]-fitted[key])<1e-8)
}
console.log('PASS: split material containment and aspect preservation for landscape, portrait and square canvases.')
const floating={...clip,id:'floating',settings:{...presenterDefault,mode:'window'}}
assert.equal(validateLayouts([floating],4)[0].settings.mode,'window')
const windowRect=presenterRect(floating.settings,4/3)
assert.equal(windowRect.width,windowRect.height)
assert.ok(windowRect.left+windowRect.width<=55)
assert.ok(windowRect.top+windowRect.height<90)
assert.deepEqual(animatedRect([floating],1,presenterDefault,4/3),presenterRect(presenterDefault,4/3))
assert.deepEqual(animatedRect([floating],2,presenterDefault,4/3),windowRect)
assert.deepEqual(animatedRect([floating],3.5,presenterDefault,4/3),presenterRect(presenterDefault,4/3))
assert.ok(animatedRect([floating],3.25,presenterDefault,4/3).width>windowRect.width)
console.log('PASS: floating presenter preserves source aspect, reserves text/caption space, and returns to full frame deterministically.')
const custom={...floating,settings:{...floating.settings,backdrop:'ink',frame:{left:52,top:25,width:43,height:43,radius:2}}}
assert.deepEqual(validateLayouts([custom],4)[0].settings,custom.settings)
assert.deepEqual(animatedRect([custom],2,presenterDefault,4/3),custom.settings.frame)
assert.throws(()=>validateLayouts([{...custom,settings:{...custom.settings,frame:{...custom.settings.frame,left:70}}}],4),/超出画布/)
const moved={...custom,id:'move',start:3,end:5,settings:{...custom.settings,frame:{left:63,top:43,width:30,height:30,radius:2}}}
assert.deepEqual(animatedRect([custom,moved],3,presenterDefault,4/3),custom.settings.frame)
assert.deepEqual(animatedRect([custom,moved],3.5,presenterDefault,4/3),moved.settings.frame)
const afterGap={...moved,start:3.2}
assert.deepEqual(animatedRect([custom,afterGap],3.2,presenterDefault,4/3),animatedRect([custom],3.2,presenterDefault,4/3))
console.log('PASS: custom presenter placement survives validation, joins adjacent movements and rejects off-canvas frames.')
