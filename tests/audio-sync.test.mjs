import assert from 'node:assert/strict'
import {syncAudio} from '../src/audioSync.ts'
let seeks=0,plays=0,position=0
const a={readyState:4,duration:24,seeking:false,paused:true,volume:1,get currentTime(){return position},set currentTime(v){seeks++;position=v},play(){plays++;this.paused=false;return Promise.resolve()},pause(){this.paused=true}}
const c={start:0,end:24,offset:0,volume:.25},s={}
syncAudio(a,0,true,c,s)
for(let i=1;i<300;i++){position=i/60-.2;syncAudio(a,i/60,true,c,s)}
assert.equal(plays,1);assert.equal(seeks,0,'normal small drift must not interrupt playback')
syncAudio(a,10,true,c,s);assert.equal(seeks,1)
a.seeking=true;position=2;syncAudio(a,10.1,true,c,s);assert.equal(seeks,1,'do not seek during a pending seek')
a.seeking=false;syncAudio(a,10.1,false,c,s);assert.equal(a.paused,true)
syncAudio(a,25,true,c,s);assert.equal(a.paused,true)
console.log('PASS: uninterrupted audio, explicit scrub, pending seek protection and clip end.')
