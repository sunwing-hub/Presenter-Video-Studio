import assert from 'node:assert/strict'
import {syncAudio} from '../src/audioSync.ts'
let pos=0;const a={readyState:4,duration:3,seeking:false,paused:true,volume:1,get currentTime(){return pos},set currentTime(v){pos=v},play(){this.paused=false;return Promise.resolve()},pause(){this.paused=true}}
const s={};syncAudio(a,0,true,{start:0,end:8,offset:0,volume:1,loop:true},s);syncAudio(a,4,true,{start:0,end:8,offset:0,volume:1,loop:true},s);assert.ok(pos<3);syncAudio(a,4,false,{start:0,end:8,offset:0,volume:1,loop:true},s);assert.equal(a.paused,true);console.log('PASS: looped audio remains audible beyond source duration.')
