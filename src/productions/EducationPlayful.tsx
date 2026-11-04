import {MaterialVideo} from '../MaterialVideo'
import {storyAt,ease,type StoryProject,type StoryScene} from '../templates/story/storyModel.mjs'
import type {CSSProperties} from 'react'
type Edu={layout:'intro'|'overview'|'evidence'|'flow'|'close';number?:string;subtitle?:string;source?:string;asset?:{id:string;type:'video'|'image';duration?:number;offset?:number};focus?:{x:number;y:number;scale:number};steps?:string[];timingNote?:string}
const ink='#163d37',accent='#ed7645',green='#147864',paper='#f8faf5',muted='#667c72'
const mix=(a:number,b:number,p:number)=>a+(b-a)*p
const rect=(s:StoryScene)=>((s.education as Edu)?.layout==='intro'||(s.education as Edu)?.layout==='close'||(s.education as Edu)?.layout==='overview')?{x:160,y:360,w:760,h:810,r:56}:{x:777,y:1420,w:215,h:260,r:110}
function T({x=80,y,size=55,fill=ink,children,weight=750,anchor='start'}:{x?:number;y:number;size?:number;fill?:string;children:React.ReactNode;weight?:number;anchor?:'start'|'middle'|'end'}){return <text x={x} y={y} fontSize={size} fill={fill} fontWeight={weight} textAnchor={anchor}>{children}</text>}
export function EducationPlayful({project,time,playing=false,rendering=false}:{project:StoryProject;time:number;portrait:boolean;playing?:boolean;rendering?:boolean}){
 const st=storyAt(project,time),s=st.scene,e=(s.education??{layout:'intro'}) as Edu,local=st.local,hero=e.layout==='intro'||e.layout==='close'||e.layout==='overview',p=(delay=0)=>ease((local-delay)/.52),old=st.previous?rect(st.previous):rect(s),target=rect(s),q=st.previous?ease(local/.65):1,r={x:mix(old.x,target.x,q),y:mix(old.y,target.y,q),w:mix(old.w,target.w,q),h:mix(old.h,target.h,q),radius:mix(old.r,target.r,q)}
 const coords=(x:number,y:number,w:number,h:number):CSSProperties=>({position:'absolute',left:x/10.8+'%',top:y/19.2+'%',width:w/10.8+'%',height:h/19.2+'%'})
 const cue=project.cues.find(c=>time>=c.start&&time<c.end),cap=cue?.text.replace(/[，。！？；：、,.!?;:—…\s]+$/u,'')??'',lexicon=project.highlightLexicon??['AI','动手','免费','知识点','复习','原理'],tokens=cap.split(new RegExp('('+lexicon.join('|')+')','gu'))
 const focus=e.focus??{x:50,y:50,scale:1},zoom=1+(focus.scale-1)*ease((local-1.4)/1.0),gate=st.previous&&((st.previous.education as Edu)?.layout==='intro')?ease((local-.4)/.3):1
 return <div className="education-playful" data-story-stage data-scene={s.id} style={{position:'relative',width:'100%',height:'100%',overflow:'hidden',background:paper,fontFamily:'"PingFang SC","Microsoft YaHei",sans-serif'}}>
 <style>{`.education-playful .edu-presenter video{object-fit:cover!important;object-position:55% 28%!important}.education-playful .edu-asset video,.education-playful .edu-asset img{width:100%;height:100%;object-fit:contain!important}.education-playful .edu-caption{white-space:nowrap;font-size:4.9cqw;font-weight:800;line-height:1.45;color:${ink};text-align:center}.education-playful mark{background:none;color:${accent}}`}</style>
 <svg viewBox="0 0 1080 1920" style={{position:'absolute',inset:0,width:'100%',height:'100%'}}>
 <path d="M80 92H1000" stroke="#cdded2" strokeWidth={2}/><T y={67} size={22} fill={muted} weight={600}>AI + 教育 / 一起动手学</T><circle cx={983} cy={58} r={8} fill={accent}/>
 <circle cx={-30} cy={1380} r={230} fill="#e6f0df"/><circle cx={1090} cy={300} r={180} fill="#fff0da"/>
 {hero?<><T y={205} size={74}>{s.title.split('\n')[0]}</T><T y={295} size={74} fill={green}>{s.title.split('\n')[1]??''}</T></>:<g opacity={p()} transform={`translate(0 ${20*(1-p())})`}><T y={193} size={76} fill={accent}>{e.number}</T><T x={230} y={193} size={62}>{s.title}</T><T x={230} y={251} size={30} fill={muted} weight={500}>{e.subtitle}</T></g>}
 </svg>
 <div className="edu-presenter" data-presenter-window style={{...coords(r.x,r.y,r.w,r.h),borderRadius:r.radius/10.8+'cqw',overflow:'hidden',boxShadow:'0 15px 40px #163d3716',zIndex:2}}><MaterialVideo src={'/__studio/media/'+project.video!.id} time={time} start={0} end={project.duration} playing={playing} rendering={rendering}/></div>
 {!hero&&e.asset&&<div className="edu-asset" data-evidence style={{...coords(60,335,960,910),opacity:gate,borderRadius:'3cqw',overflow:'hidden',background:'#fff',boxShadow:'0 15px 55px #163d3714',border:'1px solid #dce8de'}}><div data-evidence-transform style={{width:'100%',height:'100%',transform:`scale(${zoom})`,transformOrigin:`${focus.x}% ${focus.y}%`}}>{e.asset.type==='video'?<MaterialVideo src={'/__studio/media/'+e.asset.id} time={Math.min(e.asset.duration??local,local%(Math.max(.1,(e.asset.duration??20)-.08)))} start={0} end={10000} offset={e.asset.offset??0} playing={playing} rendering={rendering}/>:<img src={'/__studio/media/'+e.asset.id} alt={e.source}/>}</div></div>}
 <svg viewBox="0 0 1080 1920" style={{position:'absolute',inset:0,width:'100%',height:'100%',zIndex:3,pointerEvents:'none'}}>
 {hero?<>
 {s.labels.map((v,i)=>{const k=p(.35+i*.38),y=1240+i*128;return <g key={v} opacity={k} transform={`translate(${35*(1-k)} 0)`}><rect x={95} y={y} width={890} height={100} rx={28} fill={i===2?green:'#e9f0e4'}/><circle cx={150} cy={y+50} r={22} fill={i===2?'#fff':'#d0e2cc'}/><T x={150} y={y+59} size={26} fill={green} anchor="middle">{i+1}</T><T x={205} y={y+64} size={43} fill={i===2?'#fff':ink}>{v}</T></g>})}
 </>:<>
 <g opacity={gate}><rect x={80} y={361} width={180} height={43} rx={21} fill="#f8faf5ef"/><T x={170} y={391} size={24} anchor="middle" weight={600}>{e.asset?.type==='image'?'官方界面截图':'工具实际画面'}</T></g>
 {s.labels.slice(0,3).map((v,i)=>{const at=s.beats?.[i]??s.start+.6+i*.6,k=ease((time-at)/.4),x=65+i*323,y=1310;return <g key={i} opacity={k} transform={`translate(0 ${25*(1-k)})`}>
 {i>0&&<path d={`M${x-24} ${y+64}H${x-3}`} stroke={green} strokeWidth={3} strokeDasharray="4 4"/>}<rect x={x} y={y} width={300} height={125} rx={28} fill={i===2?green:'#e6eee1'}/><T x={x+150} y={y+77} size={v.length>6?31:39} fill={i===2?'#fff':ink} anchor="middle">{v}</T></g>})}
 <T y={1520} size={30} fill={muted} weight={500}>{s.note??''}</T>
 <T y={1580} size={26} fill={muted} weight={500}>{e.source??''}</T>
 {e.timingNote&&<T y={1635} size={24} fill={accent} weight={500}>{e.timingNote}</T>}
 </>}
 <path d="M80 1790H1000" stroke="#cdded2" strokeWidth={2}/><path d={`M80 1790H${80+920*time/project.duration}`} stroke={accent} strokeWidth={5}/>
 <T y={1845} size={21} fill={muted} weight={500}>跟着原理学 / 选适合孩子的工具</T><T x={1000} y={1845} size={21} fill={muted} anchor="end" weight={500}>SUNWING</T>
 </svg>
 {cap&&<div data-caption={cap} style={{...coords(55,1685,970,82),display:'flex',alignItems:'center',justifyContent:'center',zIndex:4}}><div className="edu-caption">{tokens.map((t,i)=>lexicon.includes(t)?<mark key={i}>{t}</mark>:<span key={i}>{t}</span>)}</div></div>}
 </div>
}
