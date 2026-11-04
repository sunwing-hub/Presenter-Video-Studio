import assert from 'node:assert/strict'
import {mkdtemp,rm,stat} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {resolve} from 'node:path'
import {spawnSync} from 'node:child_process'
import ffmpeg from 'ffmpeg-static'
import {seekableSource,sourceInfo} from '../scripts/source-performance.mjs'
const dir=await mkdtemp(resolve(tmpdir(),'overlay-source-test-')),source=resolve(dir,'source.mp4');const run=args=>{const r=spawnSync(ffmpeg,['-hide_banner','-loglevel','error',...args],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);return r}
try{
 run(['-y','-f','lavfi','-i','testsrc2=size=320x180:rate=25','-f','lavfi','-i','sine=frequency=1000:sample_rate=48000','-t','3','-c:v','libx264','-g','50','-c:a','aac',source]);const a=await seekableSource(source);assert.equal(a.cached,true);assert.notEqual(a.file,source);assert.ok((await stat(a.file)).size>0);const info=await sourceInfo(a.file);assert.equal(info.fps,25);assert.ok(Math.abs(info.duration-3)<.08);const b=await seekableSource(source);assert.equal(b.file,a.file);assert.equal((await seekableSource(a.file)).alreadySeekable,true)
 // Intra cache must retain frame count and perceptually preserve the moving pattern.
 const r=spawnSync(ffmpeg,['-hide_banner','-i',source,'-i',a.file,'-filter_complex','[0:v][1:v]ssim','-an','-f','null','-'],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);const m=r.stderr.match(/All:([\d.]+)/);assert.ok(m&&Number(m[1])>.99,r.stderr);console.log('PASS: cached source keeps 25fps, duration and motion; SSIM',m[1]);
}finally{await rm(dir,{recursive:true,force:true})}
