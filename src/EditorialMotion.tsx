import {useId} from 'react'

export type EditorialEffect=`editorial-${string}`
const ease=(v:number)=>1-(1-Math.max(0,Math.min(1,v)))**3
const C={ink:'#15304d',blue:'#2676ec',gold:'#ffb64e',orange:'#ef831e',mint:'#92ead6',line:'#b7cae0',white:'#fbfdff'}

/** Narrative objects, with editable pipe-separated labels and deterministic seeking. */
export function EditorialMotion({effect,time,text}:{effect:EditorialEffect;time:number;text:string}){
 const id=useId().replace(/:/g,'');const kind=effect.slice(10);const words=text.split('|')
 const tall=['drawer','receipt','bubble','decision','stamp','table'].includes(kind)
 const W=tall?560:1000,H=tall?460:330
 const p=(d=0,l=.55)=>ease((time-d)/l)
 const ink={fontFamily:'PingFang SC, sans-serif',fontWeight:800}
 const txt=(x:number,y:number,s:string,size=32,color=C.ink,anchor:'start'|'middle'|'end'='start')=><text x={x} y={y} fontSize={size} fill={color} textAnchor={anchor} {...ink}>{s}</text>
 const caption=(x:number,y:number,s:string,size=32)=><text x={x} y={y} fontSize={size} fill={C.white} stroke="#12283b" strokeWidth="5" paintOrder="stroke" strokeLinejoin="round" {...ink}>{s}</text>
 const label=(i:number,fallback:string)=>words[i]||fallback
 const paper=`url(#${id}paper)`,gold=`url(#${id}gold)`,blue=`url(#${id}blue)`
 const appear=(delay=0,dx=0,dy=40)=>({opacity:p(delay),transform:`translate(${dx*(1-p(delay))} ${dy*(1-p(delay))})`})
 const draw=(delay=0,length=.65)=>({pathLength:1,strokeDasharray:`${p(delay,length)} 1`})
 const lines=(x:number,y:number,w:number)=><g stroke={C.line} strokeWidth="5" strokeLinecap="round"><path d={`M${x} ${y}h${w}M${x} ${y+19}h${w*.7}`}/></g>
 const arrow=(x:number,y:number,delay=0)=><g opacity={p(delay)}><path d={`M${x} ${y}h80m-23-20 23 20-23 20`} fill="none" stroke={C.gold} strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" {...draw(delay)}/></g>
 const tick=(x:number,y:number,delay=0)=><path d={`m${x} ${y} 15 16 33-37`} stroke={C.blue} strokeWidth="8" fill="none" strokeLinecap="round" strokeLinejoin="round" {...draw(delay)}/>
 const sheet=(x:number,y:number,w:number,h:number,title:string,index:number,delay=0)=> <g key={`${x}-${y}`} {...appear(delay)}><g transform={`rotate(${[-4,2,5][index%3]} ${x+w/2} ${y+h/2})`}>
  <path d={`M${x} ${y}h${w-27}l27 27v${h-27}h-${w}Z`} fill={paper} stroke={C.line} strokeWidth="3"/><path d={`M${x+w-27} ${y}v27h27`} fill="#c7dafa"/>
  {txt(x+18,y+37,`0${index+1}`,21,C.blue)}{txt(x+w/2,y+90,title,Math.min(33,w/(title.length+.5)),C.ink,'middle')}{lines(x+24,y+h-57,w-48)}
 </g></g>
 const coin=(x:number,y:number,delay=0)=> <g {...appear(delay,0,-60)}><ellipse cx={x} cy={y+6} rx="30" ry="13" fill="#af6217"/><ellipse cx={x} cy={y} rx="30" ry="13" fill={gold} stroke="#ffe0a1" strokeWidth="3"/>{txt(x,y+6,'¥',17,C.ink,'middle')}</g>
 return <svg viewBox={`0 0 ${W} ${H}`} className="editorial-motion" role="img" aria-label={words.join('，')} data-editorial={kind}>
  <defs><linearGradient id={`${id}paper`} x2=".35" y2="1"><stop stopColor="#fff"/><stop offset="1" stopColor="#e3edff"/></linearGradient><linearGradient id={`${id}gold`} x2=".7" y2="1"><stop stopColor="#ffda83"/><stop offset=".52" stopColor="#ffb94e"/><stop offset="1" stopColor="#c57428"/></linearGradient><linearGradient id={`${id}blue`} x2=".7" y2="1"><stop stopColor="#61b1ff"/><stop offset="1" stopColor="#1555c2"/></linearGradient></defs>

  {kind==='calendar'&&<>
   {[0,1].map(i=><g key={i} {...appear(i*1.7,i?110:-70)}><g transform={`rotate(${i?3:-5} ${245+i*515} 160)`}>
    <rect x={70+i*515} y="20" width="320" height="275" rx="20" fill="#9eafca"/><rect x={65+i*515} y="12" width="320" height="275" rx="20" fill={paper} stroke={C.line} strokeWidth="3"/><path d={`M${65+i*515} 72h320`} stroke={i?C.orange:C.blue} strokeWidth="65"/>
    {[118,330].map(x=><rect key={x} x={x+i*515} y="0" width="14" height="40" rx="7" fill={C.ink}/>)}
    {txt(225+i*515,86,i?'现在':'过去',29,C.white,'middle')}{txt(225+i*515,198,label(i,i?'两周':'两年'),85,C.ink,'middle')}{txt(225+i*515,254,label(i+2,i?'快速验证':'漫长试错'),28,C.blue,'middle')}
   </g></g>)}{arrow(437,156,1.15)}
   <path d="M76 207l270-65" stroke={C.orange} strokeWidth="8" opacity={p(1.25)} {...draw(1.25,.5)}/>
  </>}

  {kind==='receipt'&&<>
   <g {...appear()} transform={`translate(0 ${30*(1-p())}) rotate(-4 280 240)`}><path d="M66 24H485V417l-26-12-26 12-26-12-26 12-26-12-26 12-26-12-26 12-26-12-26 12-26-12-26 12-26-12-29 12Z" fill={paper} stroke={C.line} strokeWidth="3"/>
    <rect x="189" y="8" width="167" height="38" rx="7" fill={blue}/>{txt(100,99,label(0,'试错账单'),36)}<path d="M99 120H446" stroke={C.line} strokeWidth="3" strokeDasharray="8 7"/>
    {[1,2,3].map((i)=><g key={i} opacity={p(.45+(i-1)*.85)}>{txt(102,151+i*57,['','时间','投入','结果'][i],23,C.blue)}{txt(442,151+i*57,label(i,['','三年多','几百万元','才看清需求'][i]),i===2?36:30,C.ink,'end')}</g>)}
    <g opacity={p(3)} transform={`rotate(-5 310 377)`}><rect x="176" y="350" width="270" height="50" rx="4" stroke={C.orange} fill="none" strokeWidth="5"/>{txt(310,386,label(4,'试错太晚'),32,C.orange,'middle')}</g>
   </g>
  </>}

  {kind==='lab'&&<>
   {sheet(25,45,240,235,label(0,'一个想法'),0)}
   {arrow(289,156,.7)}
   <g {...appear(1,60)}><rect x="395" y="20" width="265" height="260" rx="20" fill={paper} stroke={C.line} strokeWidth="4"/><rect x="395" y="20" width="265" height="42" rx="18" fill={blue}/>{txt(527,51,'需求验证',23,C.white,'middle')}{lines(423,94,188)}
    <circle cx="503" cy="179" r="51" fill="#cdefff" fillOpacity=".6" stroke={C.blue} strokeWidth="10"/><path d="m540 216 40 38" stroke={C.orange} strokeWidth="18" strokeLinecap="round" transform={`rotate(${12*(1-p(1,1.4))} 503 179)`}/>
   </g>{arrow(688,156,2)}
   <g {...appear(2.3)}><rect x="802" y="70" width="173" height="172" rx="23" fill={gold}/>{txt(888,143,label(1,'先试水'),34,C.ink,'middle')}{txt(888,196,label(2,'再投入'),30,C.ink,'middle')}</g>
  </>}

  {(kind==='build'||kind==='launch')&&<>
   <g {...appear()}><rect x="190" y="8" width="610" height="258" rx="19" fill="#182943" stroke="#a8bbd6" strokeWidth="6"/><rect x="207" y="25" width="577" height="218" rx="9" fill={paper}/><rect x="207" y="25" width="577" height="44" rx="9" fill={C.blue}/>{[233,252,271].map(x=><circle key={x} cx={x} cy="47" r="5" fill={C.white}/>)}{txt(493,56,label(0,'产品开发'),23,C.white,'middle')}
    <g opacity={p(.4)}><rect x="228" y="84" width="155" height="131" rx="9" fill="#dae9ff"/>{txt(305,166,kind==='build'?'APP':'AI',54,C.blue,'middle')}</g>
    {[0,1,2].map(i=><g key={i} opacity={p(.6+i*.65)}><rect x={410+i*116} y="87" width="97" height="73" rx="9" fill={i===1?gold:blue}/>{txt(458+i*116,133,['想法','原型','验证'][i],23,C.white,'middle')}</g>)}
    <path d="M416 196H745" stroke={C.line} strokeWidth="9" strokeLinecap="round"/><path d="M416 196H745" stroke={C.blue} strokeWidth="9" strokeLinecap="round" {...draw(.5,2.1)}/><path d="M153 269H836L802 296H185Z" fill={paper} stroke={C.line} strokeWidth="4"/><path d="M441 270H554l-8 10h-97Z" fill={C.line}/>
   </g>
   <g {...appear(.5,-60)}><path d="M8 99h155v140H8Z" fill={gold}/>{txt(84,150,label(1,'2–4周'),31,C.ink,'middle')}{txt(84,196,label(2,'几百元'),29,C.ink,'middle')}</g>
   <g {...appear(1.6,60)}><circle cx="901" cy="162" r="72" fill={paper} stroke={C.blue} strokeWidth="5"/>{kind==='launch'?tick(878,159,2):txt(901,175,'2–3人',31,C.blue,'middle')}{caption(848,270,label(3,'一人 + AI'),27)}</g>
  </>}

  {kind==='compare'&&<>
   {[0,1].map(i=><g key={i} {...appear(i*.85,i?70:-70)}><path d={`M${20+i*550} 18h405v277h-405v-96q22-14 0-28Z`} fill={i?gold:paper} stroke={i?'#ffe3a3':C.line} strokeWidth="3"/>
    {txt(48+i*550,61,i?'NOW / 现在':'THEN / 以前',24,i?C.ink:C.blue)}<path d={`M${45+i*550} 85h353`} stroke={i?'#b97830':C.line} strokeWidth="3" strokeDasharray="8 6"/>
    <g opacity={i&&words[6]==='timed'?p(3):1}>{txt(223+i*550,163,label(i*3,i?'2–4周':'6个月+'),68,C.ink,'middle')}</g>
    <g opacity={i&&words[6]==='timed'?p(4.2):1}>{txt(223+i*550,219,label(i*3+1,i?'几百元':'好几万美金'),35,C.ink,'middle')}</g>
    <g opacity={i&&words[6]==='timed'?p(5.7):1}>{txt(223+i*550,268,label(i*3+2,i?'一人 + AI':'两三名工程师'),26,C.ink,'middle')}</g>
   </g>)}{arrow(455,163,.6)}
  </>}

  {kind==='filter'&&<>
   {[0,1,2].map(i=><g key={i} opacity={p(i*.3)*(i<2?1-p(1.6+i*.55)*.6:1)} transform={`translate(${i<2?-70*p(1.6+i*.55):75*p(2.5)} ${i<2?45*p(1.6+i*.55):-25*p(2.5)})`}>
    {sheet(65+i*285,35,230,231,label(i,['信息差','渠道资金','好产品'][i]),i,i*.3)}
    {i<2?<path d={`M${110+i*285} 120l130 70m0-70-130 70`} stroke={C.orange} strokeWidth="9" opacity={p(1.6+i*.55)} {...draw(1.6+i*.55)}/>:<g opacity={p(2.5)}><circle cx="822" cy="255" r="39" fill={C.blue}/><path d="m804 254 14 15 26-31" fill="none" stroke="white" strokeWidth="7"/></g>}
   </g>)}
   <g opacity={p(2.5)}>{coin(610,284,2.6)}{coin(665,278,2.85)}</g>
  </>}

  {kind==='drawer'&&<>
   <rect x="35" y="264" width="487" height="150" rx="18" fill="#a96829" stroke="#ffd58d" strokeWidth="4"/>
   {[0,1,2].map(i=><g key={i} transform={`translate(0 ${95*(1-p(.2+i*1.5))-20*p(4.2+i*.2)})`} opacity={p(.2+i*1.5)}>
    {sheet(48+i*155,45+[10,0,14][i],155,254,label(i,['验证什么','哪里判断错','下一步'][i]),i)}
    <g opacity={p(.85+i*1.5)}>{tick(99+i*155,199,.85+i*1.5)}</g>
   </g>)}
   <g {...appear(.05,0,20)}><path d="M30 310Q30 296 44 296H513Q527 296 527 310V421Q527 437 511 437H46Q30 437 30 421Z" fill={gold} stroke="#ffe1a0" strokeWidth="4"/><rect x="225" y="353" width="108" height="18" rx="9" fill="#9f5f21" stroke="#ffe2aa" strokeWidth="3"/>{txt(278,411,label(3,'留下经验'),28,C.ink,'middle')}</g>
  </>}

  {kind==='decision'&&<>
   <g {...appear()}><rect x="69" y="22" width="422" height="402" rx="19" fill={paper} stroke={C.line} strokeWidth="4"/><rect x="196" y="6" width="161" height="37" rx="8" fill={blue}/>{txt(100,108,label(0,'继续，还是停？'),36)}
    {[1,2,3].map(i=><g key={i} opacity={p(.35+i*.65)}><rect x="103" y={101+i*76} width="31" height="31" rx="5" fill="#e2eeff" stroke={C.line} strokeWidth="3"/>{txt(156,128+i*76,label(i,['','看需求','看反馈','再决定'][i]),32)}{tick(100,115+i*76,.8+i*.65)}</g>)}
    <rect x="89" y="163" width="382" height="58" rx="7" stroke={C.orange} fill="none" strokeWidth="5" {...draw(2.7)}/>
   </g><g opacity={p(2.4)} transform={`translate(${437-58*p(2.4)} ${349-129*p(2.4)})`}><path d="M0 0 12 64 29 43 53 51Z" fill={C.orange} stroke="white" strokeWidth="4"/></g>
  </>}

  {kind==='bubble'&&<g {...appear()}><path d="M32 58Q32 22 68 22H487Q522 22 522 58V327Q522 362 487 362H182L87 429V362H68Q32 362 32 327Z" fill={paper} stroke={C.line} strokeWidth="4"/>
   <circle cx="119" cy="129" r="57" fill={gold}/>{txt(119,158,'?',86,C.ink,'middle')}
   {words.slice(0,3).map((w,i)=><g key={i} opacity={p(.25+i*.4)}>{txt(203,i===0?116:116+i*68,w,Math.min(40,285/(w.length+.1)),i===0?C.blue:C.ink)}</g>)}
   <path d="M205 293H447" stroke={C.orange} strokeWidth="8" strokeLinecap="round" {...draw(1.1)}/>
  </g>}

  {kind==='stamp'&&<g opacity={p()} transform={`translate(280 220) rotate(${-6-15*(1-p())}) scale(${1+.35*(1-p())}) translate(-280 -220)`}>
   <path d="M34 104l30-13 29 10 30-10 30 10 30-10 30 10 30-10 30 10 30-10 30 10 30-10 30 10 30-10 39 13v217l-30 10-30-10-30 10-30-10-30 10-30-10-30 10-30-10-30 10-30-10-30 10-30-10-39 10Z" fill={gold}/>
   {txt(280,191,label(0,'不是坚持'),57,C.ink,'middle')}{txt(280,272,label(1,'是舍不得认输'),43,C.ink,'middle')}<path d="M92 289H462" stroke={C.ink} strokeWidth="4" {...draw(.5)}/>
  </g>}

  {kind==='table'&&<>
   <ellipse cx="280" cy="332" rx="258" ry="94" fill="#142c4a" stroke="#75a6ea" strokeWidth="5"/><ellipse cx="280" cy="318" rx="258" ry="89" fill="#275a7b" stroke={C.mint} strokeWidth="3"/>
   {sheet(102,55,155,211,label(0,'经验'),0)}{sheet(285,49,155,211,label(1,'判断'),1,.7)}
   {[0,1,2].map(i=><g key={i}>{coin(204+i*66,316-i*7,.4+i*.4)}</g>)}
   <path d="M154 365Q280 407 413 365" stroke={C.gold} strokeWidth="6" fill="none" {...draw(1.5)}/>{caption(103,449,label(2,'继续留在牌桌'),38)}
  </>}

  {kind==='pivot'&&<>
   <path d="M50 275H270V153H520V239H745V80H932" fill="none" stroke="#dce9fb" strokeWidth="19" strokeLinecap="round" strokeLinejoin="round"/>
   <path d="M50 275H270V153H520V239H745V80H932" fill="none" stroke={C.blue} strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" {...draw(.25,2.5)}/>
   {[[70,275],[270,153],[520,239]].map(([x,y],i)=><g key={i} opacity={p(.3+i*.7)}><circle cx={x} cy={y} r="18" fill={C.gold} stroke="white" strokeWidth="4"/>{caption(x-30,y-43,['尝试','转向','再验证'][i],27)}</g>)}
   <g {...appear(3.3)}><rect x="780" y="120" width="208" height="160" rx="18" fill={paper} stroke={C.line} strokeWidth="3"/>{txt(884,166,'用户增长',29,C.ink,'middle')}{txt(884,248,'3.6×',74,C.blue,'middle')}</g>
  </>}
 </svg>
}
