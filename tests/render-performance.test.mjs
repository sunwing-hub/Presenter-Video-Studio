import assert from 'node:assert/strict'
import {mkdtemp,writeFile,readFile,rm,mkdir} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {resolve} from 'node:path'
import {segmentKey,saveSegment,restoreSegment,pruneCache,treeDigest} from '../scripts/render-cache.mjs'
import {parseSourceInfo} from '../scripts/source-performance.mjs'
const p={fps:25,duration:30,mainMediaId:'11111111-1111-4111-8111-111111111111',project:{canvas:{width:1080,height:1920},duration:30,presenter:{mode:'full'},captionStyle:{enabled:true},cues:[{start:2,end:3,text:'甲'},{start:22,end:23,text:'乙'}],canvasLayers:[{id:'a',start:5,end:7,text:'标题',visible:true},{id:'b',start:21,end:22,text:'尾段',visible:true}],layouts:[],audioClips:[{volume:.1}],currentTime:4}}
const options={renderer:'one',mediaFingerprint:async()=> 'bytes-v1'},key=(x,a=0,b=250,o=options)=>segmentKey(x,a,b,o),edit=fn=>{const x=structuredClone(p);fn(x);return x}
const k=await key(p)
assert.equal(await key(edit(x=>x.project.currentTime=17)),k)
assert.equal(await key(edit(x=>x.project.audioClips[0].volume=.8)),k,'audio-only edits reuse silent video')
assert.equal(await key(edit(x=>x.project.cues[1].text='new')),k,'distant cue must not invalidate beginning')
assert.equal(await key(edit(x=>x.project.canvasLayers[1].text='new')),k,'distant layer must not invalidate beginning')
assert.notEqual(await key(edit(x=>x.project.cues[0].text='new')),k)
assert.notEqual(await key(edit(x=>x.project.canvasLayers[0].start=6)),k)
assert.notEqual(await key(p,0,250,{...options,renderer:'two'}),k)
assert.notEqual(await key(p,0,250,{...options,mediaFingerprint:async()=> 'bytes-v2'}),k)
assert.notEqual(await key(edit(x=>x.project.presenter.mode='window')),k)
assert.notEqual(await key(edit(x=>x.fps=30)),k)
assert.notEqual(await key(edit(x=>x.project.layouts.push({start:9.9,end:12,transition:1,settings:{x:1}}))),k,'layout transition dependencies')
assert.notEqual(await key(edit(x=>x.project.cues[0].start=12)),k,'moving a cue invalidates its old segment')
const moved=edit(x=>{x.project.canvasLayers[0].start=12;x.project.canvasLayers[0].end=14});assert.notEqual(await key(moved,250,500),await key(p,250,500),'moving a layer invalidates its new segment')
assert.equal(parseSourceInfo('Video: h264, 1920x1080, 25 fps').fps,25)
assert.equal(parseSourceInfo('Video: h264, 29.97 fps').fps,30)
assert.equal(parseSourceInfo('Audio: aac').fps,30)
const dir=await mkdtemp(resolve(tmpdir(),'overlay-cache-test-'))
try{const file=resolve(dir,'input'),cache=resolve(dir,'cache'),out=resolve(dir,'out');await writeFile(file,'encoded-frames');await saveSegment(cache,k,file,250);assert.equal(await restoreSegment(cache,k,out,250),true);assert.equal(await readFile(out,'utf8'),'encoded-frames');assert.equal(await restoreSegment(cache,k,out,249),false);await writeFile(resolve(cache,k+'.mp4'),'corrupt-frames');assert.equal(await restoreSegment(cache,k,out,250),false);await saveSegment(cache,k,file,250);await pruneCache(cache,0);assert.equal(await restoreSegment(cache,k,out,250),false);await mkdir(resolve(dir,'web'));await writeFile(resolve(dir,'web','x.js'),'a');const hash=await treeDigest(resolve(dir,'web'));await writeFile(resolve(dir,'web','ready'),'changing-build-time');assert.equal(await treeDigest(resolve(dir,'web')),hash);await writeFile(resolve(dir,'web','x.js'),'b');assert.notEqual(await treeDigest(resolve(dir,'web')),hash)}finally{await rm(dir,{recursive:true,force:true})}
console.log('PASS: timing/text/layout/source/renderer invalidation; audio-only and distant edits reuse; corruption rejected; bounds and fps detection')
