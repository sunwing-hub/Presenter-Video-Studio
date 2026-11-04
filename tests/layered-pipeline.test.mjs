import assert from 'node:assert/strict'
import {validatePresenterOverlay,overlaySourceAt} from '../src/templates/story/presenterOverlay.mjs'
const p={mediaId:'11111111-1111-4111-8111-111111111111',x:712,y:48,size:320,sourceWidth:2880,sourceHeight:2160,crop:{x:940,y:80,width:1000,height:1000},border:3,shadow:8,segments:[{start:0,end:5,sourceStart:0,rate:1.18},{start:5,end:10,sourceStart:8,rate:1}]}
assert.doesNotThrow(()=>validatePresenterOverlay(p,10));assert.equal(overlaySourceAt(p,5),8);assert.equal(overlaySourceAt(p,2),2.36)
assert.throws(()=>validatePresenterOverlay({...p,x:1000},10));assert.throws(()=>validatePresenterOverlay({...p,crop:{...p.crop,x:2700}},10));assert.throws(()=>validatePresenterOverlay({...p,segments:[{start:0,end:10,sourceStart:0,rate:0}]},10));assert.throws(()=>validatePresenterOverlay({...p,segments:[{start:1,end:10,sourceStart:0,rate:1}]},10))
console.log('PASS: optional presenter, independent source clock, cut/retiming map and crop/geometry rejection')
