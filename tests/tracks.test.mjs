import assert from 'node:assert/strict'
import {validateAudio,validateCaption,captionDefault} from '../src/trackModel.ts'
const clip={id:'test',mediaId:'11111111-1111-1111-1111-111111111111',name:'音效',track:'sfx',start:1,end:3,offset:.2,volume:.5}
assert.deepEqual(validateAudio([clip],4),[{...clip,loop:true}])
for(const patch of [{start:-1},{end:1},{end:5},{offset:-1},{volume:2},{volume:NaN},{track:'material'},{mediaId:'../secret'}])assert.throws(()=>validateAudio([{...clip,...patch}],4))
assert.throws(()=>validateAudio([clip,clip]))
assert.deepEqual(validateCaption(undefined),captionDefault)
assert.throws(()=>validateCaption({fontSize:NaN}))
assert.throws(()=>validateCaption({color:'red'}))
assert.throws(()=>validateCaption({strokeWidth:13}))
assert.equal(validateCaption({strokeWidth:4,fontSize:44}).strokeWidth,4)
assert.equal(validateCaption({enabled:true,fontSize:80}).fontSize,80)
console.log('PASS: audio track types, timing, volume, media validation, caption defaults and style validation.')
