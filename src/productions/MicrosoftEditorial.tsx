import {MaterialVideo} from '../MaterialVideo'
import {storyAt,storyCaptionAt,ease,type StoryProject} from '../templates/story/storyModel.mjs'
const ink='#21342f',green='#226d53',red='#b34332',paper='#f0ede5',muted='#69766d'
const lerp=(a:number,b:number,t:number)=>a+(b-a)*t
import {numberLanding} from '../templates/warm-editorial/motion'
export {numberLanding}
function Text({x=80,y,size=60,children,fill=ink,anchor='start',weight=700}:{x?:number;y:number;size?:number;children:React.ReactNode;fill?:string;anchor?:'start'|'middle'|'end';weight?:number}){return <text x={x} y={y} fontSize={size} fill={fill} textAnchor={anchor} fontWeight={weight}>{children}</text>}
export function MicrosoftEditorial({project,time,playing=false,rendering=false}:{project:StoryProject;time:number;portrait:boolean;playing?:boolean;rendering?:boolean}){
 const state=storyAt(project,time),s=state.scene,k=s.narrativeKind??'view',local=state.local,p=(delay=0)=>ease((local-delay)/.55),study=['copilot','support','forecast','delivery'].includes(k),prevStudy=state.previous&&['copilot','support','forecast','delivery'].includes(state.previous.narrativeKind??'')
 const box=(small:boolean)=>small?{x:82,y:1175,w:248,h:300}:{x:140,y:105,w:800,h:1010},a=box(!!prevStudy),b=box(study),q=state.previous?ease(local/.55):1,r={x:lerp(a.x,b.x,q),y:lerp(a.y,b.y,q),w:lerp(a.w,b.w,q),h:lerp(a.h,b.h,q)}
 const textGate=state.previous&&Boolean(prevStudy)!==study?ease((local-.52)/.24):1
 const cap=storyCaptionAt(project.cues,time,18),title=s.title.split('\n')
 const block=(x:number,y:number,w:number,h:number,title:string,sub:string,delay=0,accent=false)=><g opacity={p(delay)} transform={`translate(0 ${18*(1-p(delay))})`}><rect x={x} y={y} width={w} height={h} rx={20} fill={accent?green:'#faf9f4'} stroke={accent?green:'#c6cbbf'} strokeWidth={2}/><Text x={x+25} y={y+65} size={Math.min(48,(w-50)/Math.max(1,title.length))} fill={accent?'#ffffff':ink}>{title}</Text><Text x={x+25} y={y+h-28} size={28} fill={accent?'#d9e8db':muted} weight={500}>{sub}</Text></g>
 return <div data-story-stage data-scene={s.id} style={{position:'relative',width:'100%',height:'100%',background:paper,overflow:'hidden'}}>
 <div className='editorial-figure' style={{position:'absolute',left:r.x/10.8+'%',top:r.y/19.2+'%',width:r.w/10.8+'%',height:r.h/19.2+'%',borderRadius:24,overflow:'hidden'}}><MaterialVideo src={'/__studio/media/'+project.video!.id} time={time} start={0} end={project.duration} playing={playing} rendering={rendering}/>{!study&&<div style={{position:'absolute',inset:0,background:'linear-gradient(0deg,#f0ede5 0%,#f0ede500 35%)'}}/>}</div>
 <style>{'.editorial-figure video{object-fit:cover!important;object-position:50% 30%!important}'}</style>
 <svg viewBox="0 0 1080 1920" style={{position:'absolute',inset:0,width:'100%',height:'100%',fontFamily:'"PingFang SC","Microsoft YaHei",sans-serif'}}>
 <Text y={64} size={26} fill={muted} weight={500}>工作正在怎样变化</Text><path d="M80 87H1000" stroke="#b9c2b7" strokeWidth={2}/>
 {k==='opening'?<>
 {['4','8','0','0'].map((v,i)=>{const d=numberLanding(local,.34+(i<2?i:2)*.16),x=160+i*190;return <g key={i} opacity={d.opacity} transform={`translate(${x} ${1300-d.height}) scale(${d.ratio} ${1/d.ratio})`}><text fontSize={225} fontWeight={850} fill={red} textAnchor="middle">{v}</text></g>})}
 <g opacity={ease((local-.8)/.25)}><Text x={905} y={1290} size={48} fill={red}>人</Text></g><Text y={1400} size={42}>微软裁员</Text>
 <g opacity={ease((local-2.75)/.5)}><Text y={1510} size={70}>AI开始抢工作？</Text><Text y={1570} size={30} fill={muted}>先看岗位与投入发生了什么变化</Text></g>
 </>:<g opacity={textGate}>
 {title.map((t,i)=><g key={i} opacity={p(i*.1)}><Text y={(study?230:1125)+i*88} size={t.length>12?56:72} fill={i?green:ink}>{t}</Text></g>)}
 {k==='contrast'&&<>{block(80,1310,440,170,'裁减岗位','报道中的岗位调整',.2)}{block(550,1310,450,170,'AI方向投入','另一侧的业务动向',.48,true)}<Text y={1550} size={29} fill={muted}>两种动向并存，不等于证明单一裁员原因</Text></>}
 {k==='hiring'&&<>{block(80,1320,920,190,'招聘与业务方向','具体岗位数量与统计口径需另行核实',.15)}<Text y={1570} size={32} fill={muted}>岗位要求，需要结合具体职责看</Text></>}
 {k==='delivery'&&<><g opacity={p(.2)}><Text y={510} size={160} fill={green}>6,000+</Text><Text y={580} size={36}>行业与工程专家 · 整合协作</Text></g>{['理解业务','接入工具','检验交付'].map((v,i)=>block(80,680+i*155,920,125,v,'流程示意',.45+i*.28,i===2))}<Text x={370} y={1270} size={32}>AI落地看的是交付过程</Text><Text y={1510} size={25} fill={muted}>资料：微软2026年报 / Frontier Company</Text><Text y={1550} size={25} fill={muted}>整合团队，不代表新增招聘人数</Text></>}
 {k==='skills'&&<>{['完成任务','使用工具','检查结果'].map((v,i)=>block(80+i*312,1325,290,160,v,'能力侧重点',.18+i*.22,i===2))}<Text y={1560} size={30} fill={muted}>岗位与能力的关系，需要结合实际任务看</Text></>}
 {k==='judgment'&&<>{block(80,1340,920,160,'关注工作方式的变化','主持人观点',.25,true)}</>}
 {k==='copilot'&&<><Text y={530} size={170} fill={green}>55.8%</Text><Text y={620} size={47}>特定编程实验中的任务表现</Text>{block(80,740,920,180,'JavaScript HTTP服务器','相同实验任务下的两组对照',.35)}{block(80,980,920,150,'研究结果有适用范围','不能推广为所有开发任务的通用收益',.65)}<Text x={370} y={1290} size={34}>GitHub Copilot研究</Text><Text y={1510} size={25} fill={muted}>来源：Microsoft Research，2023</Text></>}
 {k==='support'&&<>{block(80,540,920,170,'5,179名客服','研究样本',.15)}<g opacity={p(.35)}><Text x={90} y={950} size={128}>14%</Text><Text x={620} y={950} size={128} fill={green}>34%</Text><Text x={90} y={1020} size={35}>整体平均</Text><Text x={620} y={1020} size={35}>新手／较低技能</Text></g><path d="M530 805V1090" stroke="#b5c0b3" strokeWidth={2}/><Text x={370} y={1290} size={32}>群体不同，收益也不同</Text><Text y={1510} size={25} fill={muted}>来源：NBER Working Paper 31161（2023）</Text><Text y={1550} size={25} fill={muted}>不是所有客服都提升34%</Text></>}
 {k==='forecast'&&<>{block(80,600,920,185,'研究实测 ≠ 潜力估计','不同口径不能直接排成同一张榜单',.15,true)}{block(80,865,920,185,'模型估计需要说明范围','对软件工程职能价值潜力的估算',.5)}<Text x={370} y={1290} size={32}>区分已观测与估计</Text><Text y={1510} size={25} fill={muted}>参考：McKinsey，生成式AI经济潜力（2023）</Text></>}
 {k==='organization'&&<>{block(80,1325,440,170,'任务如何分工','组织讨论',.15)}{block(550,1325,450,170,'结果怎样检查','价值判断',.45,true)}<Text y={1550} size={29} fill={muted}>流程示意，不是微软内部组织或产出数据</Text></>}
 {k==='closing'&&<>{block(80,1345,920,190,'你的工作，哪一步接上AI？','从一个具体任务开始',.45,true)}</>}
 </g>}
 {cap&&<g data-caption={cap.text}><rect x={55} y={1645} width={970} height={105} rx={15} fill="#f9f7f0ed"/><Text x={540} y={1715} size={cap.text.length>19?39:46} anchor="middle">{cap.text}</Text></g>}
 </svg></div>
}
