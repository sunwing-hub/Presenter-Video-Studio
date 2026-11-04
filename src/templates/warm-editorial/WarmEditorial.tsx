import {MaterialVideo} from '../../MaterialVideo'
import {storyAt,storyCaptionAt,ease,type StoryProject} from '../story/storyModel.mjs'
const ink='#21342f',green='#226d53',red='#b34332',paper='#f0ede5',muted='#69766d'
const lerp=(a:number,b:number,t:number)=>a+(b-a)*t
import {numberLanding} from './motion'
function Text({x=80,y,size=60,children,fill=ink,anchor='start',weight=700}:{x?:number;y:number;size?:number;children:React.ReactNode;fill?:string;anchor?:'start'|'middle'|'end';weight?:number}){return <text x={x} y={y} fontSize={Math.min(size,(anchor==='middle'?920:1000-x)/Math.max(1,Array.from(String(children)).reduce((n,c)=>n+(/[^\u0000-\u00ff]/.test(c)?1:.55),0)))} fill={fill} textAnchor={anchor} fontWeight={weight}>{children}</text>}
export function WarmEditorial({project,time,playing=false,rendering=false}:{project:StoryProject;time:number;portrait:boolean;playing?:boolean;rendering?:boolean}){
 const state=storyAt(project,time),s=state.scene,k=s.narrativeKind??'view',c=s.editorial!,local=state.local,p=(delay=0)=>ease((local-delay)/.55),study=['metric','comparison','caution','metric-steps'].includes(k),prevStudy=state.previous&&['metric','comparison','caution','metric-steps'].includes(state.previous.narrativeKind??'')
 const box=(small:boolean)=>small?{x:82,y:1175,w:248,h:300}:{x:140,y:105,w:800,h:1010},a=box(!!prevStudy),b=box(study),q=state.previous?ease(local/.55):1,r={x:lerp(a.x,b.x,q),y:lerp(a.y,b.y,q),w:lerp(a.w,b.w,q),h:lerp(a.h,b.h,q)}
 const textGate=state.previous&&Boolean(prevStudy)!==study?ease((local-.52)/.24):1
 const cap=storyCaptionAt(project.cues,time,18),title=s.title.split('\n')
 const block=(x:number,y:number,w:number,h:number,title:string,sub:string,delay=0,accent=false)=><g opacity={p(delay)} transform={`translate(0 ${18*(1-p(delay))})`}><rect x={x} y={y} width={w} height={h} rx={20} fill={accent?green:'#faf9f4'} stroke={accent?green:'#c6cbbf'} strokeWidth={2}/><Text x={x+25} y={y+65} size={Math.min(48,(w-50)/Math.max(1,title.length))} fill={accent?'#ffffff':ink}>{title}</Text><Text x={x+25} y={y+h-28} size={28} fill={accent?'#d9e8db':muted} weight={500}>{sub}</Text></g>
 return <div data-story-stage data-scene={s.id} style={{position:'relative',width:'100%',height:'100%',background:paper,overflow:'hidden'}}>
 <div className='editorial-figure' style={{position:'absolute',left:r.x/10.8+'%',top:r.y/19.2+'%',width:r.w/10.8+'%',height:r.h/19.2+'%',borderRadius:24,overflow:'hidden'}}><MaterialVideo src={'/__studio/media/'+project.video!.id} time={time} start={0} end={project.duration} playing={playing} rendering={rendering}/>{!study&&<div style={{position:'absolute',inset:0,background:'linear-gradient(0deg,#f0ede5 0%,#f0ede500 35%)'}}/>}</div>
 <style>{'.editorial-figure video{object-fit:cover!important;object-position:50% 30%!important}'}</style>
 <svg viewBox="0 0 1080 1920" style={{position:'absolute',inset:0,width:'100%',height:'100%',fontFamily:'"PingFang SC","Microsoft YaHei",sans-serif'}}>
 <Text y={64} size={26} fill={muted} weight={500}>{project.editorialHeader}</Text><path d="M80 87H1000" stroke="#b9c2b7" strokeWidth={2}/>
 {k==='opening'?<>
 {Array.from(c.value).map((v,i)=>{const d=numberLanding(local,.34+(i<2?i:2)*.16),x=160+i*(570/Math.max(3,c.value.length-1));return <g key={i} opacity={d.opacity} transform={`translate(${x} ${1300-d.height}) scale(${d.ratio} ${1/d.ratio})`}><text fontSize={Math.min(225,900/c.value.length)} fontWeight={850} fill={red} textAnchor="middle">{v}</text></g>})}
 <g opacity={ease((local-.8)/.25)}><Text x={Math.min(930,160+(c.value.length-1)*(570/Math.max(3,c.value.length-1))+175)} y={1290} size={48} fill={red}>{c.unit}</Text></g><Text y={1400} size={42}>{c.label}</Text>
 <g opacity={ease((local-2.75)/.5)}><Text y={1510} size={70}>{c.question}</Text><Text y={1570} size={30} fill={muted}>{c.detail}</Text></g>
 </>:<g opacity={textGate}>
 {title.map((t,i)=><g key={i} opacity={p(i*.1)}><Text y={(study?230:1125)+i*88} size={t.length>12?56:72} fill={i?green:ink}>{t}</Text></g>)}
 {k==='contrast'&&<>{block(80,1310,440,170,c.leftTitle,c.leftDetail,.2)}{block(550,1310,450,170,c.rightTitle,c.rightDetail,.48,true)}<Text y={1550} size={29} fill={muted}>{c.note}</Text></>}
 {k==='focus'&&<>{block(80,1320,920,190,c.title,c.detail,.15)}<Text y={1570} size={32} fill={muted}>{c.note}</Text></>}
 {k==='metric-steps'&&<><g opacity={p(.2)}><Text y={510} size={160} fill={green}>{c.value}</Text><Text y={580} size={36}>{c.label}</Text></g>{[c.step1,c.step2,c.step3].map((v,i)=>block(80,680+i*155,920,125,v,c.stepDetail,.45+i*.28,i===2))}<Text x={370} y={1270} size={32}>{c.annotation}</Text><Text y={1510} size={25} fill={muted}>{c.source}</Text><Text y={1550} size={25} fill={muted}>{c.note}</Text></>}
 {k==='steps'&&<>{[c.step1,c.step2,c.step3].map((v,i)=>block(80+i*312,1325,290,160,v,c.stepDetail,.18+i*.22,i===2))}<Text y={1560} size={30} fill={muted}>{c.note}</Text></>}
 {k==='viewpoint'&&<>{block(80,1340,920,160,c.title,c.detail,.25,true)}</>}
 {k==='metric'&&<><Text y={530} size={170} fill={green}>{c.value}</Text><Text y={620} size={47}>{c.label}</Text>{block(80,740,920,180,c.cardTitle,c.cardDetail,.35)}{block(80,980,920,150,c.caveatTitle,c.caveatDetail,.65)}<Text x={370} y={1290} size={34}>{c.annotation}</Text><Text y={1510} size={25} fill={muted}>{c.source}</Text></>}
 {k==='comparison'&&<>{block(80,540,920,170,c.sample,c.sampleDetail,.15)}<g opacity={p(.35)}><Text x={90} y={950} size={128}>{c.leftValue}</Text><Text x={620} y={950} size={128} fill={green}>{c.rightValue}</Text><Text x={90} y={1020} size={35}>{c.leftLabel}</Text><Text x={620} y={1020} size={35}>{c.rightLabel}</Text></g><path d="M530 805V1090" stroke="#b5c0b3" strokeWidth={2}/><Text x={370} y={1290} size={32}>{c.annotation}</Text><Text y={1510} size={25} fill={muted}>{c.source}</Text><Text y={1550} size={25} fill={muted}>{c.note}</Text></>}
 {k==='caution'&&<>{block(80,600,920,185,c.title,c.detail,.15,true)}{block(80,865,920,185,c.secondTitle,c.secondDetail,.5)}<Text x={370} y={1290} size={32}>{c.annotation}</Text><Text y={1510} size={25} fill={muted}>{c.source}</Text></>}
 {k==='pair'&&<>{block(80,1325,440,170,c.leftTitle,c.leftDetail,.15)}{block(550,1325,450,170,c.rightTitle,c.rightDetail,.45,true)}<Text y={1550} size={29} fill={muted}>{c.note}</Text></>}
 {k==='closing'&&<>{block(80,1345,920,190,c.title,c.detail,.45,true)}</>}
 </g>}
 {cap&&<g data-caption={cap.text}><rect x={55} y={1645} width={970} height={105} rx={15} fill="#f9f7f0ed"/><Text x={540} y={1715} size={cap.text.length>19?39:46} anchor="middle">{cap.text}</Text></g>}
 </svg></div>
}
