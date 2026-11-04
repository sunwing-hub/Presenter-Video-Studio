import assert from 'node:assert/strict'
import {studioOrigin} from '../scripts/studio-origin.mjs'
import {sourceAudioGain} from '../scripts/source-audio.mjs'
import {validateExport} from '../scripts/export-server.mjs'
import {readFileSync} from 'node:fs'
assert.equal(studioOrigin({OVERLAY_STUDIO_PORT:'5174'}),'http://127.0.0.1:5174')
assert.equal(studioOrigin({STUDIO_ORIGIN:'http://127.0.0.1:5191',OVERLAY_STUDIO_PORT:'5174'}),'http://127.0.0.1:5191')
assert.throws(()=>studioOrigin({STUDIO_ORIGIN:'https://example.com'}))
const clip={mediaId:'voice',start:0,end:10,offset:0,loop:false,volume:1}
const p={canvasLayers:[{story:{audio:{id:'voice'}}}],audioClips:[clip]}
assert.equal(sourceAudioGain(p,10),0)
assert.equal(sourceAudioGain({...p,sourceAudioMode:'keep'},10),1)
assert.equal(sourceAudioGain({...p,audioClips:[{...clip,mediaId:'bgm'}]},10),1)
assert.equal(sourceAudioGain({...p,audioClips:[{...clip,end:5}]},10),1)
assert.equal(sourceAudioGain({...p,audioClips:[{...clip,volume:0}]},10),1)
assert.equal(sourceAudioGain({videoMuted:true},10),0)
assert.equal(sourceAudioGain({videoVolume:35},10),.35)
const request=JSON.parse(readFileSync(new URL('./fixtures/export-project.json',import.meta.url)));assert.throws(()=>validateExport({fps:30,duration:4,project:{...request,sourceAudioMode:'bad'}}))
console.log('PASS: custom ports, voice mix replacement, BGM/partial/inaudible preservation, explicit mute and gain')
