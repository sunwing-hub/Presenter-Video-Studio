import type {ReactNode} from 'react'
import {ease,type StoryScene} from './storyModel.mjs'
type P={s:StoryScene;time:number;phase:number;speed:number;portrait?:boolean}
const blue='var(--blue)',green='var(--green)',orange='var(--orange)'
function Label({x,y,text,size=32,color='var(--ink)',anchor='middle'}:{x:number;y:number;text:string;size?:number;color?:string;anchor?:'middle'|'start'}){return <text x={x} y={y} textAnchor={anchor} fill={color} fontSize={size} fontWeight="650">{text}</text>}
function Box({x,y,w=280,h=120,label,sub,color=blue,opacity=1}:{x:number;y:number;w?:number;h?:number;label:string;sub?:string;color?:string;opacity?:number}){return <g opacity={opacity}><rect x={x} y={y} width={w} height={h} rx="22" fill="var(--panel)" stroke={color} strokeWidth="2"/><rect x={x+20} y={y+23} width="5" height={h-46} rx="2" fill={color}/><Label x={x+w/2+6} y={y+h/2+(sub?-2:11)} text={label} size={label.length>10?27:33}/>{sub&&<Label x={x+w/2} y={y+h/2+35} text={sub} size={21} color="var(--muted)"/>}</g>}
function Arrow({x1,y1,x2,y2,p=1,color=green}:{x1:number;y1:number;x2:number;y2:number;p?:number;color?:string}){return <path d={`M${x1} ${y1} L${x1+(x2-x1)*p} ${y1+(y2-y1)*p}`} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" markerEnd={p>.85?'url(#arrow-head)':undefined}/>}
function Person({x,y,label,color=green}:{x:number;y:number;label:string;color?:string}){return <g><circle cx={x} cy={y-28} r="28" fill={color}/><path d={`M${x-48} ${y+60}v-20a48 48 0 0 1 96 0v20`} fill="var(--panel)" stroke={color} strokeWidth="3"/><Label x={x} y={y+108} text={label} size={25}/></g>}
function Doc({x,y,label,p=1,color=blue}:{x:number;y:number;label:string;p?:number;color?:string}){return <g opacity={p} transform={`translate(${x} ${y+25*(1-p)})`}><rect x="0" y="0" width="145" height="180" rx="15" fill="var(--paper)" stroke={color} strokeWidth="2"/><path d="M30 40h70M30 65h86M30 90h50" stroke={color} strokeWidth="7" strokeLinecap="round"/><Label x={72} y={143} text={label} size={24} color="#24344c"/></g>}
function Orbit({radius=210,p=1}:{radius?:number;p?:number}){return <ellipse cx="500" cy="310" rx={radius} ry={radius*.72} fill="none" stroke={green} strokeOpacity={.5} strokeWidth="3" strokeDasharray={`${p*1400} 1400`}/>}
export function StoryGraphics({s,time,phase,speed,portrait=false}:P){
 const t=time-s.start,p=(delay=0)=>ease((t-delay)/speed),event=(i:number)=>s.events[i]?ease((time-s.events[i].at)/speed):0,labels=s.labels
 let body:ReactNode
 switch(s.kind){
 case 'hook':case 'clarify':case 'paths':{
  const global=time,restore=ease((global-2.45)/.5),connect=ease((global-3.61)/.65),isPaths=s.kind==='paths'
  const x=120+160*(1-restore)-30*connect,y=210+35*(1-restore)
  body=<><path d="M80 440h840" stroke="var(--grid)" strokeWidth="2"/><g transform={`translate(${x} ${y}) rotate(${-5*(1-restore)})`}><Box x={0} y={0} w={340} h={155} label="专业经验" sub="你的业务积累" color={green}/></g><g transform={`translate(${625-180*connect} ${190+60*connect})`}><Box x={0} y={0} w={240} h={125} label="AI" sub={connect>.5?'能力接口':'追逐新工具'} color={blue}/></g>{global<2.45&&<><path d="M560 260H480" stroke={orange} strokeWidth="10" markerEnd="url(#arrow-head)"/><Label x={500} y={490} text="追上了 AI，却丢了自己的专业？" size={34} color={orange}/></>}{global>=2.45&&global<3.61&&<g opacity={restore}><Label x={500} y={480} text="躺平" size={56} color="var(--muted)"/><path d={`M${430} 460L${430+140*restore} 480`} stroke={orange} strokeWidth="7"/><Label x={500} y={565} text="不放弃，也不盲目换行" size={32}/></g>}{(isPaths||connect>.01)&&<g opacity={connect}><Arrow x1={440} y1={310} x2={520} y2={310} p={connect}/><Box x={220} y={485} w={560} h={95} label="专业接上 AI，能力向外延展" color={green}/><Label x={500} y={650} text="别丢专业，用 AI 延展" size={40} color={green}/></g>}</>
  break
 }
 case 'extend':case 'feedback':{
  const grow=event(1),flow=ease((t-.25)/1.3),steps=s.kind==='feedback'?['交付作品','收集反馈','迭代能力']:['业务判断','流程设计','结果交付']
  body=<>
   <rect x="45" y="30" width="910" height="650" rx="40" fill="var(--panel)" stroke={green} strokeWidth="3"/>
   <path d="M115 335H885" stroke={green} strokeWidth="5" pathLength="1" strokeDasharray={`${flow} 1`}/>
   <g transform={`translate(${500-155*grow} 180)`}><circle r={116+12*grow} fill="var(--bg)" stroke={green} strokeWidth="6"/><circle r={145+22*grow} fill="none" stroke={green} strokeOpacity=".3" strokeWidth="3" strokeDasharray="14 10"/><Label x={0} y={-6} text={labels[0]||'业务专业'} size={44}/><Label x={0} y={45} text="保留你的根基" size={25} color="var(--muted)"/></g>
   <g opacity={flow} transform={`translate(${655-25*grow} ${75+22*(1-flow)})`}><rect width="230" height="170" rx="30" fill={blue}/><Label x={115} y={83} text="AI" size={68} color="#fff"/><Label x={115} y={130} text="能力放大器" size={26} color="#fff"/></g>
   <g opacity={grow}><Arrow x1={495} y1={175} x2={605} y2={175} p={grow}/></g>
   {steps.map((label,i)=>{const show=ease((t-.55-i*.26)/speed),height=85+(45+i*27)*grow;return <g key={label} opacity={show} transform={`translate(${95+i*290} ${560-height+22*(1-show)})`}><rect width="230" height={height} rx="20" fill="var(--bg)" stroke={i===1?blue:green} strokeWidth="3"/><Label x={115} y={height/2+13} text={label} size={34}/><rect x="25" y={height+18} width={180*grow} height="8" rx="4" fill={green}/></g>})}
   <Label x={500} y={635} text={s.kind==='feedback'?'验证使用意愿，再扩一圈':'专业 × AI → 能力向外延展'} size={38} color={green}/>
  </>
  break
 }
 case 'detour':{
  const e=event(1),e2=event(2),returning=s.id==='S005'
  body=<><path d="M130 490H850" stroke="var(--grid)" strokeWidth="5"/><Box x={70} y={420} w={250} label="业务专业" color={green}/><path d="M315 470Q700 50 780 255Q900 470 500 480" fill="none" stroke={orange} strokeWidth="6" strokeDasharray={`${p()*1000} 1000`}/><Box x={365} y={120} w={280} label={labels[0]||'走过的弯路'} color={orange} opacity={p(.15)}/><Box x={680} y={255} w={240} label={labels[1]||'回到业务'} color={blue} opacity={e}/>{returning?<g opacity={e2}><Arrow x1={330} y1={485} x2={755} y2={485} p={e2}/><Label x={570} y={625} text="转的是能力边界" size={42} color={green}/></g>:<Label x={500} y={640} text="绕开了业务问题，方向先走偏了" size={33}/>}</>
  break
 }
 case 'expertise':{
  const build=p(),activate=ease((t-.65)/1.15),business=event(1),result=event(2)
  body=<>
   <rect x="35" y="30" width="930" height="650" rx="35" fill="var(--panel)" stroke={blue} strokeWidth="3"/>
   <g opacity={build} transform={`translate(0 ${35*(1-build)})`}><path d="M95 205L300 75 505 205Z" fill="var(--bg)" stroke={blue} strokeWidth="7"/><path d="M115 225H485M105 440H495M90 465H510" stroke={blue} strokeWidth="12"/>{[155,250,345,440].map((x,i)=><rect key={x} x={x} y={425-180*ease((t-.18-i*.12)/speed)} width="26" height={180*ease((t-.18-i*.12)/speed)} rx="4" fill={blue}/>)}<Label x={300} y={535} text="全国商业银行" size={37}/><Label x={300} y={580} text="业务经验" size={29} color="var(--muted)"/></g>
   <path d="M515 315H560" stroke={green} strokeWidth="7" pathLength="1" strokeDasharray={`${activate} 1`}/>
   <g opacity={activate}><rect x="575" y="90" width="340" height="235" rx="24" fill="var(--bg)" stroke={green} strokeWidth="3"/><Label x={745} y={145} text="业务运营" size={37}/>{[0,1,2,3].map(i=><rect key={i} x={615+i*70} y={285-(45+i*25)*activate} width="40" height={(45+i*25)*activate} rx="5" fill={i===3?green:blue}/>)}<path d="M605 295H885" stroke="var(--muted)" strokeWidth="2"/></g>
   <g opacity={business}><Box x={565} y={365} w={360} h={100} label={labels[0]||'数字化营销'} color={green}/><Box x={565} y={490} w={360} h={100} label={labels[1]||'私域运营'} color={blue}/></g>
   <g opacity={result}><rect x="135" y="610" width="730" height="55" rx="13" fill={green}/><Label x={500} y={649} text={labels[2]||'理解业务模式'} size={33} color="var(--on-green)"/></g>
  </>
  break
 }
 case 'amplify':case 'asset':{
  const nodes=[{x:330,y:50,w:340,h:120},{x:35,y:420,w:340,h:120},{x:625,y:420,w:340,h:120}]
  // Edges are drawn first; endpoints stay outside the opaque text-bearing cards.
  body=<><ellipse cx="500" cy="330" rx="390" ry="255" fill="none" stroke={green} strokeWidth="3" strokeOpacity=".35"/>
   <Arrow x1={500} y1={235} x2={500} y2={185} p={p(.25)}/>
   <Arrow x1={400} y1={380} x2={330} y2={410} p={p(.4)}/>
   <Arrow x1={600} y1={380} x2={670} y2={410} p={p(.55)}/>
   <circle cx="500" cy="330" r={110+8*event(1)} fill="var(--panel)" stroke={green} strokeWidth="5"/>
   <Label x={500} y={342} text="专业经验" size={38}/>
   {nodes.map((node,i)=><g key={i} opacity={p(i*.18)}><Box {...node} label={labels[i]||'业务积累'} color={i===0?green:blue}/></g>)}
   <g opacity={event(s.events.length-1)}><Box x={210} y={600} w={580} h={100} label={s.kind==='asset'?'核心资产':'AI 让积累更值钱'} color={green}/></g></>
  break
 }
 case 'delegate':{
  const moving=event(1),done=event(2)
  body=<><g transform={`translate(${260*moving} ${110*moving}) scale(${1-.4*moving})`}><Doc x={80} y={100} label="整理" p={p()}/><Doc x={255} y={145} label="录入" p={p(.15)}/></g><g opacity={done} transform={`translate(${60+380*done} ${440-130*done}) scale(${1-.35*done})`}><Doc x={0} y={0} label="周报"/></g><Box x={420} y={240} w={250} h={180} label="AI 处理" sub="先交出重复的活" color={blue}/><Arrow x1={680} y1={330} x2={815} y2={330} p={done}/><g opacity={done}><Doc x={805} y={240} label="完成" color={green}/></g><Label x={500} y={640} text="重复任务交给 AI，时间留给判断" size={34} color={green}/></>
  break
 }
 case 'agency':{
  body=<><Box x={45} y={130} w={410} h={180} label="被动等待" sub="收到替代通知" color={orange}/><Box x={545} y={130} w={410} h={180} label="主动替代重复工作" sub="自己先采取行动" color={green}/><path d="M500 80v480" stroke="var(--grid)" strokeWidth="2"/><g opacity={event(1)}><Arrow x1={750} y1={320} x2={750} y2={470} p={event(1)}/><Box x={555} y={480} w={390} label="只有你能干的事" sub="沟通 · 判断 · 交付" color={green}/><rect x={70+450*event(1)} y={385} width="155" height="55" rx="12" fill={green}/><Label x={148+450*event(1)} y={423} text="时间" size={27} color="var(--on-green)"/></g></>
  break
 }
 case 'card':{
  const turn=ease((t-.15)/.7),scale=Math.max(.04,Math.abs(Math.cos(turn*Math.PI))),front=turn<.5
  body=<><g transform={`translate(500 320) scale(${scale} 1)`}><rect x="-220" y="-240" width="440" height="500" rx="35" fill={front?'var(--panel)':'var(--paper)'} stroke={green} strokeWidth="4"/><rect x="-195" y="-215" width="390" height="450" rx="25" fill="none" stroke={green} strokeOpacity=".4" strokeWidth="2"/><Label x={0} y={-30} text={front?'老本事':'专业经验'} size={60} color={front?'var(--ink)':'#173c35'}/><Label x={0} y={58} text={front?'别扔':'你的底牌'} size={44} color={green}/></g><Label x={500} y={680} text="与 AI 组队，先保住你的优势" size={33}/></>
  break
 }
 case 'board':{
  const ready=event(2)
  if(portrait){body=<>{labels.slice(0,3).map((l,i)=><g key={l} opacity={p(.2+i*.22)} transform={`translate(65 ${65+i*185})`}><rect width="870" height="155" rx="24" fill="var(--panel)" stroke={i===2?green:blue} strokeWidth="2"/><circle cx="85" cy="78" r="38" fill="none" stroke={green} strokeWidth="3"/><Label x={85} y={90} text={'0'+(i+1)} size={32} color={green}/><Label x={440} y={70} text={l} size={43}/><Label x={440} y={116} text={['理解业务如何运转','判断投入与回报','让交付形成闭环'][i]} size={28} color="var(--muted)"/><path d="M775 80l20 20 35-45" fill="none" stroke={green} strokeWidth="5" pathLength="1" strokeDasharray={`${ready} 1`}/></g>)}<Label x={500} y={710} text="专业能力，才是交付底盘" size={38} color={green}/></>;break}
  body=<><path d="M170 245H830" stroke={green} strokeWidth="4" strokeDasharray={`${ready*660} 660`}/>{labels.slice(0,3).map((l,i)=><g key={l} opacity={p(.2+i*.2)} transform={`translate(${i*300+65} ${80+35*(1-ready)})`}><rect width="270" height="440" rx="24" fill="var(--panel)" stroke={i===2?green:blue} strokeWidth="2"/><Label x={135} y={58} text={l} size={30}/>{i===0?<g fill="none" stroke={blue} strokeWidth="4"><rect x="60" y="130" width="150" height="65" rx="12"/><path d="M135 195v50M75 245h120M75 245v55M195 245v55"/><circle cx="75" cy="320" r="24"/><circle cx="195" cy="320" r="24"/></g>:i===1?<g stroke={blue} strokeWidth="5" fill="none"><path d="M135 130v225M60 355h150M55 185h160M80 185l-35 90h70ZM190 185l-35 90h70Z"/><circle cx="135" cy="170" r="12" fill={blue}/></g>:<g fill="none" stroke={green} strokeWidth="6"><path d="M135 130l75 30v70q0 70-75 105-75-35-75-105v-70Z"/><path d="M95 230l27 29 55-64" strokeDasharray={`${ready*150} 150`}/></g>}<Label x={135} y={400} text={['业务流程','投入产出','结果担当'][i]} size={24} color="var(--muted)"/></g>)}<Label x={500} y={645} text="AI 项目，靠的是专业底层能力" size={36} color={green}/></>
  break
 }
 case 'meeting':{
  const travel=ease((t-.45)/1.2)
  body=<><g transform={`translate(${100+570*travel} ${160-50*travel}) scale(${1-.3*travel})`}><Doc x={0} y={0} label="方案"/></g><Box x={50} y={395} w={280} label="AI 写方案" color={blue}/><g opacity={travel}><ellipse cx="690" cy="390" rx="230" ry="90" fill="var(--panel)" stroke={green} strokeWidth="4"/><Person x={530} y={225} label="客户"/><Person x={850} y={225} label="交付者"/><path d="M490 440v95M890 440v95" stroke={green} strokeWidth="6"/><Label x={690} y={615} text="客户现场，需要你在场" size={34} color={green}/></g><path d="M345 330v210" stroke={orange} strokeWidth="4" strokeDasharray="9 10"/></>
  break
 }
 case 'choice':{
  const focus=event(s.events.length-1)
  body=<>{labels.slice(0,3).map((l,i)=><g key={l} transform={`translate(${i*310+45} ${160-20*focus})`} opacity={p(.2+i*.22)*(1-.55*focus)}><Box x={0} y={0} w={285} h={160} label={l} color={orange}/><path d={`M40 50L${40+205*focus} ${50+70*focus}`} stroke={orange} strokeWidth="5"/></g>)}<g opacity={focus}><Arrow x1={500} y1={360} x2={500} y2={450} p={focus}/><Box x={180} y={480} w={640} h={145} label="先在原来的业务里，试一件事" sub="不是不变，是别乱动" color={green}/></g></>
  break
 }
 case 'interface':case 'delivery':{
  const isDelivery=s.kind==='delivery',positions=[{x:70,y:170},{x:375,y:300},{x:680,y:170}],v=labels.slice(0,3)
  body=<>{positions.map((xy,i)=><g key={i} opacity={event(Math.min(i,s.events.length-1))}><Box x={xy.x} y={xy.y} w={250} h={150} label={v[i]} color={i===1?blue:green}/>{i<2&&<Arrow x1={xy.x+255} y1={xy.y+80} x2={positions[i+1].x-5} y2={positions[i+1].y+80} p={event(Math.min(i+1,s.events.length-1))}/>}</g>)}{isDelivery?<g opacity={event(s.events.length-1)}><path d="M800 335Q800 560 530 560" fill="none" stroke={green} strokeWidth="5" strokeDasharray={`${event(s.events.length-1)*500} 500`}/><Person x={390} y={510} label="身边使用者"/><Label x={620} y={660} text="先交付，再验证" size={36} color={green}/></g>:<><Label x={500} y={580} text="不必从零换行，先把接口接起来" size={35}/><Label x={500} y={645} text="业务 → 接入 → 可用功能" size={27} color="var(--muted)"/></>}</>
  break
 }
 case 'reframe':case 'roots':{
  const grow=s.kind==='reframe'?ease((t-.3)/.8):1,root=s.kind==='roots'?event(1):0,branch=s.kind==='roots'?event(2):0
  body=<><path d="M500 170v290" stroke={green} strokeWidth="24" strokeLinecap="round"/><path d="M80 465H920" stroke="var(--muted)" strokeOpacity=".35" strokeWidth="2"/>{[-1,1].flatMap(side=>[0,1,2].map((i)=>{const x=500+side*(120+i*105),y=100+i*80;return <g key={side+'-'+i}><path d={`M500 ${370-i*65}Q${500+side*80} ${y+50} ${x} ${y}`} fill="none" stroke={green} strokeWidth={12-i*2} pathLength="1" strokeDasharray={`${grow*(.55+.45*branch)} 1`}/><ellipse cx={x} cy={y} rx={32+12*branch} ry="20" fill={green} opacity={grow*(.5+.5*branch)} transform={`rotate(${side*-30} ${x} ${y})`}/><path d={`M500 465Q${500+side*(65+i*30)} 530 ${500+side*(120+i*95)} ${570+i*35}`} fill="none" stroke={blue} strokeWidth={8-i} pathLength="1" strokeDasharray={`${grow*(.45+.55*root)} 1`}/></g>}))}<Box x={280} y={580} w={440} h={95} label="专业经验，是根本" color={blue}/>{s.kind==='reframe'?<g opacity={event(1)}><rect x="265" y="40" width="470" height="100" rx="18" fill="var(--panel)"/><Label x={500} y={108} text="不是转型，是延展" size={44} color={green}/></g>:<><Label x={840} y={100} text="AI" size={46} color={green}/><path d="M835 125Q785 180 750 240" fill="none" stroke={green} strokeWidth="4" strokeDasharray={`${branch*180} 180`}/></>}</>
  break
 }
 default:body=<Box x={200} y={230} w={600} label={s.title}/>
 }
 return <svg className="story-graphic-svg" viewBox="0 0 1000 740" role="img" aria-label={s.title}><defs><marker id="arrow-head" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto"><path d="M0 0L6 3 0 6Z" fill={green}/></marker></defs>{body}</svg>
}
