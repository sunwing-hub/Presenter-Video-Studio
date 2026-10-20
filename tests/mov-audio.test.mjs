import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {once} from 'node:events'
import {mkdtemp,readFile,rm,writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import ffmpeg from 'ffmpeg-static'
import {mixMovAudio} from '../scripts/mix-mov-audio.mjs'
import {makeSfxWav} from '../src/sfx.ts'

async function run(args){
 const child=spawn(ffmpeg,args,{stdio:['ignore','ignore','pipe']})
 let output='';child.stderr.on('data',chunk=>output+=chunk)
 assert.equal((await once(child,'exit'))[0],0,output)
 return output
}
const directory=await mkdtemp(join(tmpdir(),'overlay-mov-audio-'))
try{
 const source=join(directory,'transparent.mov'),result=join(directory,'with-sfx.mov'),sound=join(directory,'pop.wav')
 await writeFile(sound,Buffer.from(await makeSfxWav('pop').arrayBuffer()))
 await run(['-y','-f','lavfi','-i','color=c=black:s=64x64:r=12:d=1','-vf','format=rgba,colorchannelmixer=aa=0','-c:v','prores_ks','-profile:v','4','-pix_fmt','yuva444p10le','-t','1',source])
 await mixMovAudio(source,result,[{file:sound,start:.2,end:.58,offset:0,volume:.3,loop:false}],1)
 const before=await run(['-i',source,'-f','null','-'])
 const after=await run(['-i',result,'-f','null','-'])
 assert.match(before,/Video: prores/)
 assert.match(after,/Video: prores/)
 assert.match(after,/Audio: pcm_s16le/)
 assert.ok((await readFile(result)).byteLength>0)
 console.log('PASS: transparent ProRes MOV keeps video codec and gains a timed PCM sound track.')
}finally{await rm(directory,{recursive:true,force:true})}
