import {spawn} from 'node:child_process'
import {once} from 'node:events'
import ffmpegStatic from 'ffmpeg-static'
import {resolve} from 'node:path'
import {rename} from 'node:fs/promises'
export async function composePresenter({pip:p,mainFile,silent,directory,fps,total,run,encoding}){
 const probe=spawn(process.env.OVERLAY_FFMPEG||ffmpegStatic,['-i',mainFile],{stdio:['ignore','ignore','pipe']});let info='';probe.stderr.on('data',b=>info+=b);await once(probe,'exit');const dims=info.match(/Video:[^\n]*?\b(\d{2,5})x(\d{2,5})\b/),length=info.match(/Duration:\s*(\d+):(\d+):([\d.]+)/);if(!dims||Number(dims[1])!==p.sourceWidth||Number(dims[2])!==p.sourceHeight)throw Error('圆窗源视频尺寸与工程声明不符');const duration=length?Number(length[1])*3600+Number(length[2])*60+Number(length[3]):0;if(!duration||p.segments.some(s=>s.sourceStart+(s.end-s.start)*s.rate>duration+.08))throw Error('圆窗源素材不足以覆盖时间映射');
 const face=resolve(directory,'presenter-silent.mp4'),out=resolve(directory,'presenter-composed.mp4'),segments=[]
 for(let i=0;i<p.segments.length;i++){const s=p.segments[i];segments.push(`[1:v]trim=start=${s.sourceStart}:end=${s.sourceStart+(s.end-s.start)*s.rate},setpts=(PTS-STARTPTS)/${s.rate},crop=${p.crop.width}:${p.crop.height}:${p.crop.x}:${p.crop.y}[s${i}]`)}
 // Trim each source range before concatenating; final target frame count is authoritative.
 const b=p.border??3,n=Math.round(p.size),r=n/2
 const mask=`format=rgba,geq=r='if(gt(hypot(X-${r},Y-${r}),${r-b}),255,r(X,Y))':g='if(gt(hypot(X-${r},Y-${r}),${r-b}),255,g(X,Y))':b='if(gt(hypot(X-${r},Y-${r}),${r-b}),255,b(X,Y))':a='if(lte(hypot(X-${r},Y-${r}),${r}),255,0)'`
 const shadow=Math.round(p.shadow??0)
 const composite=shadow?`[face]split[fg][sb];[sb]colorchannelmixer=rr=0:gg=0:bb=0:aa=0.4,pad=iw+${2*shadow}:ih+${2*shadow}:${shadow}:${shadow}:color=black@0,boxblur=${shadow}:1[shadow];[0:v][shadow]overlay=${p.x-shadow}:${p.y-shadow+3}:eof_action=pass:format=auto[under];[under][fg]overlay=${p.x}:${p.y}:eof_action=pass:format=auto[v]`:`[0:v][face]overlay=${p.x}:${p.y}:eof_action=pass:format=auto[v]`
 const filter=segments.join(';')+';'+p.segments.map((_,i)=>`[s${i}]`).join('')+`concat=n=${segments.length}:v=1:a=0,fps=${fps},tpad=stop_mode=clone:stop_duration=0.08,scale=${n}:${n},${mask}[face];${composite}`
 const execute=hw=>run(['-y','-i',silent,...(hw?['-hwaccel','videotoolbox']:[]),'-i',mainFile,'-filter_complex',filter,'-map','[v]','-an','-frames:v',String(total),'-r',String(fps),...encoding,out]);if(process.platform==='darwin'){try{await execute(true)}catch(e){await execute(false)}}else await execute(false);await rename(out,silent)
}
