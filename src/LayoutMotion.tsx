import {useId} from 'react'
export type LayoutEffect='layout-hook'|'layout-punch'|'layout-speed'|'layout-judge'
const ease=(v:number)=>1-(1-Math.max(0,Math.min(1,v)))**3

/** Editorial layout changes inferred from the reference; all words remain layer content. */
export function LayoutMotion({effect,text,time,duration}:{effect:LayoutEffect;text:string;time:number;duration:number}){
 const id=useId().replace(/:/g,''),words=text.split('|'),p=(d=0,l=.4)=>ease((time-d)/l)
 const dark=effect==='layout-speed',ink=dark?'#f4f1e9':'#172e49',accent=dark?'#ffbd64':'#296ce5',paper=dark?'#101927':'#f2f0ea'
 const font={fontFamily:'PingFang SC, sans-serif',fontWeight:850}
 const txt=(x:number,y:number,s:string,size=62,color=ink)=><text x={x} y={y} fill={color} fontSize={size} {...font}>{s}</text>
 const line=(x1:number,y1:number,x2:number,y2:number,delay=0,color=accent)=> <path d={`M${x1} ${y1}L${x2} ${y2}`} stroke={color} strokeWidth="5" strokeLinecap="round" pathLength="1" strokeDasharray={`${p(delay,.7)} 1`}/>
 const enter=(d=0,dx=0,dy=26)=>({opacity:p(d),transform:`translate(${dx*(1-p(d))} ${dy*(1-p(d))})`})
 if(effect==='layout-judge')return <svg viewBox="0 0 590 700" className="layout-motion" aria-label={words.join('，')}>
  <g {...enter(.6)}>{txt(15,45,'变贵的，是',40,'#5d6d80')}{line(16,74,530,74,.75,'#a4aebb')}</g>
  <g {...enter(2.15)}>{txt(10,171,words[0]||'判断',105)}<rect x="10" y="193" width={330*p(2.2,.45)} height="12" fill={accent}/></g>
  {[1,2].map((i)=><g key={i} {...enter(i===1?2.25:3.7,35,0)}><text x="17" y={225+i*125} fill={accent} fontSize="36" {...font}>0{i}</text>{txt(95,225+i*125,words[i]||'',43)}{line(15,253+i*125,550,253+i*125,i===1?2.5:3.95,'#b3bac4')}</g>)}
  <g {...enter(4.7)}>{txt(15,633,'先看反馈，再做决定',30,'#596c83')}</g>
 </svg>
 const end=1-ease((time-(duration-.3))/.3),reveal=1700*p(0,.32)
 return <svg viewBox="0 0 1440 1080" className="layout-motion" role="img" aria-label={words.join('，')}>
  <defs><clipPath id={`${id}reveal`}><circle cx="720" cy="540" r={reveal}/></clipPath></defs>
  <g clipPath={`url(#${id}reveal)`} transform={`translate(${-1500*(1-end)} 0)`}>
   <rect width="1440" height="1080" fill={paper}/>
   <g opacity={dark?.06:.07} stroke={ink} strokeWidth="1">{Array.from({length:14},(_,i)=><path key={i} d={`M${55+i*103} 35V1045`}/>)}<path d="M40 116H1400M40 928H1400"/></g>
   <path d="M65 80H105" stroke={accent} strokeWidth="7"/>{txt(130,90,effect==='layout-hook'?'创业试错':effect==='layout-punch'?'成本变化':'换个角度',24)}
   {effect==='layout-hook'&&<>
    <g {...enter(.15)}>{txt(75,239,words[0]||'试错周期，变了',67)}{line(78,274,1350,274,.35,'#a3abb6')}</g>
    <g opacity={p(.95)*(1-.68*p(2.7))} transform={`translate(${-35*p(2.7)} 0)`}>
     {txt(90,400,'过去',34,'#697487')}{txt(85,605,words[1]||'两年',162)}{txt(90,690,'活不到',42,'#697487')}
    </g>
    <g {...enter(2.65,150,0)}><path d="M625 537H735m-30-27 30 27-30 27" fill="none" stroke={accent} strokeWidth="10" strokeLinejoin="round"/>
     <rect x="799" y="340" width="551" height="410" rx="13" fill="#fff" stroke="#c3d4ee" strokeWidth="3"/>{txt(840,405,'现在',34,accent)}{txt(838,608,words[2]||'两周',160,accent)}{txt(845,693,'活不到',42,accent)}
    </g>
    <g {...enter(3.15)}>{line(835,640,1250,640,3.15,accent)}</g>
   </>}
   {effect==='layout-punch'&&<>
    <g {...enter(.12,-70,0)}>{txt(82,300,words[0]||'失败的代价',78)}</g>
    <g {...enter(.5,0,45)}>{txt(82,474,words[1]||'缩水了',125)}{line(83,518,596,518,.6)}</g>
    <g {...enter(1.85,90,0)}><path d="M737 365H1345V754H737Z" fill={accent} transform="rotate(-3 1041 560)"/>{txt(778,521,'两个',109,'#fff')}{txt(778,669,'数量级',121,'#fff')}</g>
    <path d="M94 768H1318" stroke="#a4adba" strokeWidth="3"/><circle cx={94+1224*p(.1,2.6)} cy="768" r="9" fill={accent}/>
   </>}
   {effect==='layout-speed'&&<>
    <g {...enter(.15)}>{txt(85,300,words[0]||'死亡没有变多',78)}{line(87,350,1320,350,.4,'#4d5d70')}</g>
    <g opacity={p(.6)*(1-.6*p(1.65))}>{txt(95,581,'变多？',112,'#8796ab')}{line(92,528,448,591,1.15,'#ffbd64')}</g>
    <g {...enter(1.8,150,0)}>{txt(660,600,words[1]||'只是变快了',110,accent)}{line(660,646,1330,646,1.95)}</g>
    <g opacity={p(2.45)}><path d="M96 782H1315" stroke="#4d5d70" strokeWidth="4"/>{[0,1,2,3].map(i=><circle key={i} cx={96+(180+i*210)*p(2.45,.9)} cy="782" r="10" fill={i===3?accent:'#91a2b8'}/>)}</g>
   </>}
  </g>
 </svg>
}
