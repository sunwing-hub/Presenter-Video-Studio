import {useId} from 'react'
import type {ScriptContent} from './arrangement'
export type ReferenceEffect=`ref-${string}`
const clamp=(n:number)=>Math.max(0,Math.min(1,n))
const ease=(n:number)=>1-(1-clamp(n))**3
const C={paper:'#f3f1eb',ink:'#131020',purple:'#9468f5',lime:'#d6ff69',pink:'#f18fc5',blue:'#514bec',muted:'#99969c',red:'#c73150'}

/** Reference-led state changes. Time is driven by the playhead, including reverse seeks. */
export function ReferenceMotion({effect,text,time:t,duration,content}:{effect:ReferenceEffect;text:string;time:number;duration:number;content?:ScriptContent}){
 const id=useId().replace(/:/g,''),kind=effect.slice(4).replace(/-pip$/,''),w=text.split('|')
 const cool=effect.endsWith('-pip')||kind==='orbitcards',paper=cool?'#edf3fa':C.paper
 const p=(d=0,l=.45)=>ease((t-d)/l),label=(i:number,f:string)=>w[i]||f
 const dark=!cool&&['compare','speed','outro'].includes(kind)
 const full=['hook','timeline','cost','compare','punch','speed','orbitcards'].includes(kind)
 const ink=dark?C.paper:C.ink,accent=dark?C.lime:C.blue
 const font={fontFamily:'PingFang SC, sans-serif',fontWeight:850}
 const txt=(x:number,y:number,s:string,size=54,color=ink,anchor:'start'|'middle'|'end'='start')=><text x={x} y={y} fontSize={size} fill={color} textAnchor={anchor} {...font}>{s}</text>
 const en=(d=0,dx=0,dy=30)=>({opacity:p(d),transform:`translate(${dx*(1-p(d))} ${dy*(1-p(d))})`})
 const path=(d:string,delay=0,color=accent,width=4,len=.6)=><path d={d} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" pathLength="1" strokeDasharray={`${p(delay,len)} 1`}/>
 const footer=(s:string)=><g opacity={p(.6)}>{txt(68,922,s,23,dark?'#aaa5bd':'#77727f')}<path d="M68 946H1372" stroke={dark?'#5b536c':'#cbc7ce'} strokeWidth="1"/></g>
 const title=(s:string,sub:string)=><g {...en(.5)}>{txt(68,100,sub,21,accent)}{txt(68,195,s,Math.min(62,960/Math.max(1,s.length)))}{path(`M68 228H${cool?1090:1372}`,.65,dark?'#514860':'#bdb9bf',2)}</g>
 const header=(s:string)=> <g opacity={p(.2)}>{txt(68,80,'创业试错 / '+s,20,accent)}{!cool&&txt(1370,80,'观察 · 验证 · 复盘',18,dark?'#aaa5bd':'#77727f','end')}</g>
 const card=(x:number,y:number,width:number,height:number,color:string,number:string,heading:string,delay:number,rotation=0)=>{
  const a=p(delay,.6)
  return <g opacity={a} transform={`translate(${x} ${y+70*(1-a)}) rotate(${rotation+18*(1-a)} ${width/2} ${height/2})`}>
   <rect x="6" y="12" width={width} height={height} rx="8" fill="#000" opacity=".12"/>
   <rect width={width} height={height} rx="8" fill={color}/>{txt(25,48,number,25,C.ink)}
   {txt(25,height*.56,heading,Math.min(68,(width-50)/Math.max(1,heading.length)),C.ink)}
   {path(`M25 ${height-55}q${width*.22} -65 ${width*.42} 0t${width*.4} -4`,delay+.2,C.ink,4,.9)}
  </g>
 }
 const exit=full?p(duration-.25,.25):0
 return <svg viewBox="0 0 1440 1080" className="reference-motion" aria-label={w.join('，')} data-reference={kind}>
  <defs>
   <pattern id={`${id}grid`} width="120" height="120" patternUnits="userSpaceOnUse"><path d="M0 0V120" stroke={dark?'#c4b7e5':'#18151e'} opacity=".065" strokeWidth="1"/></pattern>
   <clipPath id={`${id}page`}><rect x={-1440*exit} y="0" width={1440*p(0,.25)} height="1080"/></clipPath>
  </defs>
  <g clipPath={full?`url(#${id}page)`:undefined}>
   {full&&<><rect width="1440" height="1080" fill={dark?C.ink:paper}/><rect width="1440" height="1080" fill={`url(#${id}grid)`}/></>}

   {kind==='hook'&&<>
    {header('时间压缩')}
    <g {...en(.15)}>{txt(70,235,label(0,'创业这件事'),76)}{txt(72,293,'正在改变的，是试错周期',30,'#79737e')}</g>
    <g opacity={p(.85)*(1-.65*p(2.6))} transform={`translate(${-40*p(2.6)} 0) rotate(${-7*p(2.6)} 350 570)`}>
     <rect x="100" y="370" width="510" height="430" rx="8" fill={C.purple}/>{txt(140,439,'以前 / 活不到',34,C.ink)}{txt(140,650,'两年',156,C.ink)}{path('M140 701H560',1.1,C.ink,3)}
    </g>
    <g {...en(2.45,170,0)}><g transform={`rotate(${5+15*(1-p(2.45))} 1042 568)`}><rect x="794" y="365" width="510" height="430" rx="8" fill="#000" opacity=".12"/><rect x="787" y="353" width="510" height="430" rx="8" fill={C.lime}/>{txt(827,424,'现在 / 活不到',34,C.ink)}{txt(827,641,'两周',156,C.ink)}{path('M827 692H1247',2.75,C.ink,3)}</g>{path('M621 573H741m-28-25 28 25-28 25',2.65,C.ink,6)}</g>
    {footer('时间变短，意味着什么？')}
   </>}

   {kind==='question'&&<>
    {header('先别急着下结论')}
    <g {...en(.65,-35,0)}>{txt(75,335,'死得快',82)}{txt(75,445,'就是浮躁？',82,C.blue)}{path('M76 482H630',1.2,C.blue,4)}</g>
    <g opacity={p(1)}><text x="405" y="760" fontSize="260" fill="none" stroke="#9a91ac" strokeWidth="2" {...font}>?</text></g>
    <g {...en(2.4)}>{txt(75,640,'沉不住气',43,'#817a89')}{txt(75,704,'还是更快得到反馈？',35)}</g>
    {footer('同一件事，换一个观察角度')}
   </>}

   {kind==='audit'&&<>
    {header('亲身复盘')}
    <g {...en(.65)}>{txt(775,280,'钱亏在了哪里？',58)}{path('M775 315H1360',.8,C.ink,2)}</g>
    {['不是不努力','不是没坚持','是试错太晚'].map((s,i)=><g key={s} {...en(1+i*1.15,40,0)}>
     <rect x="778" y={365+i*145} width="570" height="110" rx="5" fill={i===2?C.lime:'#fff'}/>
     {txt(803,435+i*145,'0'+(i+1),28,i===2?C.ink:C.muted)}{txt(870,435+i*145,s,49)}
     {i<2&&path(`M865 ${419+i*145}H1260`,1.8+i*1.15,C.red,4)}
    </g>)}
    {footer('回看投入，也回看验证的时机')}
   </>}

   {kind==='timeline'&&<>
    {title('同一件事，两种试法','TIME / 先验证需求')}
    <g opacity={p(.6)*(1-.6*p(2.8))}>{txt(85,375,'耗两年多',80)}{txt(85,440,'投入几百万元，才看清需求',35,'#77727f')}
     {Array.from({length:24},(_,i)=><rect key={i} x={90+i*51} y="500" width="37" height="86" rx="3" fill={i%3===0?C.purple:'#d8d3df'} opacity={p(.7+i*.035)}/>)}
    </g>
    <g {...en(2.55,0,50)}>{txt(88,737,'先花两周',110,C.blue)}{txt(858,732,'弄清需求',74)}{path('M615 700H795m-25-22 25 22-25 22',2.9,C.blue,6)}</g>
    <g opacity={p(3.1)}>{[0,1].map(i=><rect key={i} x={93+i*61} y="790" width="46" height="40" rx="3" fill={C.lime} stroke={C.ink} strokeWidth="2"/>)}</g>
    {footer('先获得答案，再决定投入')}
   </>}

   {kind==='test'&&<>
    {header('把试错提前')}
    <g {...en(.6)}>{txt(75,286,'先做一个',69)}{txt(75,381,'小实验',98,C.blue)}</g>
    {['两周试水','看真实反馈','再决定投入'].map((s,i)=><g key={s} opacity={p([.8,2.3,3.7][i])}>
     <circle cx="95" cy={497+i*119} r="22" fill={i===2?C.lime:C.purple}/>{txt(95,505+i*119,`${i+1}`,23,C.ink,'middle')}{txt(140,512+i*119,s,46)}
     {i<2&&path(`M95 ${527+i*119}v59`,[1,2.5][i],'#aaa3b5',2)}
    </g>)}
    {footer('如果当时先试一遍，结果会不会不同？')}
   </>}

   {(kind==='cost'||kind==='orbitcards')&&<>
    {title(content?.title??'先投入，再找答案',kind==='orbitcards'?'IDEAS / 彩色卡片环绕':'THEN / 以前做一款产品')}
    {kind==='cost'&&<>
    {card(80,365,380,390,C.purple,'01 / 时间','6个月+',Math.max(.7,7.37),-5)}
    {card(530,365,380,390,C.pink,'02 / 资金','好几万美金',8.3,2)}
    {card(975,365,380,390,C.lime,'03 / 团队','两三名工程师',9.17,5)}
    </>}
    <g opacity={kind==='orbitcards'?1:1-p(7.15,.28)}>
     {Array.from({length:6},(_,i)=>{
      const spread=p(.8+i*.08,1.2),phase=(i*60-115+32*p(2.2,4))*Math.PI/180
      const rx=450*spread,ry=200*spread,cx=720+Math.cos(phase)*rx,cy=565+Math.sin(phase)*ry
      const turn=(1-spread)*75+Math.cos(phase)*25,projection=Math.cos(turn*Math.PI/180)
      return <g key={i} opacity={p(.4+i*.06)} transform={`translate(${cx} ${cy}) rotate(${Math.sin(phase)*17*spread}) scale(${projection} 1) translate(-94 -128)`}>
       <rect x="8" y="12" width="188" height="256" rx="7" fill="#000" opacity=".12"/><rect width="188" height="256" rx="7" fill={[C.purple,C.lime,C.pink,C.ink,C.purple,C.lime][i]}/>
       {txt(20,40,'0'+(i+1),25,i===3?C.paper:C.ink)}{txt(94,130,content?.items[i]??['产品','时间','资金','团队','客户','需求'][i],Math.min(53,155/Math.max(1,(content?.items[i]??'产品').length)),i===3?C.paper:C.ink,'middle')}
       {path('M22 192q37-45 72 0t72 0',.9+i*.08,i===3?C.lime:C.ink,3)}
      </g>
     })}
     <g opacity={p(1.8)}><rect x="580" y="514" width="280" height="105" rx="3" fill={paper}/>{txt(720,585,content?.value||'先投入',Math.min(66,250/Math.max(1,(content?.value||'先投入').length)),C.ink,'middle')}</g>
    </g>{footer(content?.note??'需求有没有人买单，仍然要等产品做完才知道')}
   </>}

   {kind==='compare'&&<>
    {title('现在，把门槛降下来','NOW / 小成本跑一遍')}
    <g opacity={.3*p(.4)}><rect x="80" y="325" width="545" height="500" rx="5" fill="#fff"/>{txt(120,393,'以前',35,C.ink)}{txt(120,525,'6个月+',96,C.ink)}{txt(120,638,'好几万美金',54,C.ink)}{txt(120,740,'两三名工程师',41,C.ink)}</g>
    <g {...en(2.4,100,0)}><rect x="803" y="325" width="555" height="500" rx="5" fill={C.lime}/>{txt(845,393,'现在',35,C.ink)}
     <g opacity={p(3.35)}>{txt(845,525,'2–4周',98,C.ink)}</g><g opacity={p(4.27)}>{txt(845,638,'几百元',68,C.ink)}</g><g opacity={p(5.2)}>{txt(845,740,'一人 + AI',60,C.ink)}</g>
    </g>{path('M654 567H765m-25-24 25 24-25 24',2.65,C.purple,7)}{footer('先验证，再追加投入')}
   </>}

   {kind==='flow'&&<>
    {header('两周跑一遍')}
    <g {...en(.65)}>{txt(760,280,'把想法送进',57)}{txt(760,370,'验证流程',78,C.blue)}</g>
    <g {...en(.8)}><rect x="760" y="466" width="195" height="195" fill={C.ink}/>{txt(857,580,'想法',61,C.paper,'middle')}</g>
    {path('M967 564H1055m-22-20 22 20-22 20',1.5,C.blue,5)}
    <g {...en(1.85,50,0)}><rect x="1080" y="466" width="270" height="195" fill={C.lime}/>{txt(1215,580,'试一遍',61,C.ink,'middle')}</g>
    <g opacity={p(3.4)}>{path('M1215 680V758H824',3.4,C.blue,4)}{txt(815,820,'跑不通，就换下一个',39)}</g>
    {footer('想法 → 原型 → 真实反馈')}
   </>}

   {kind==='punch'&&<>
    {header('成本变化')}
    <g {...en(.2)}>{txt(90,300,'失败的代价',94)}</g>
    {[0,1,2,3,4,5].map(i=><g key={i} opacity={p(.3+i*.05)} transform={`translate(${95+i*205} ${400+70*p(1.25)}) scale(${1-.8*p(1.25)})`}><rect width="170" height="230" rx="5" fill={[C.purple,C.pink,C.lime][i%3]}/><path d="M25 55H145M25 83H105" stroke={C.ink} strokeWidth="4"/></g>)}
    <g {...en(1.8,0,55)}><rect x="85" y="650" width={1260*p(1.8,.4)} height="152" fill={C.lime}/>{txt(115,762,'缩水了两个数量级',110,C.ink)}</g>{footer('试一次的成本，已经发生变化')}
   </>}

   {kind==='speed'&&<>
    {header('换个角度')}
    <g {...en(.2)}>{txt(90,320,'死亡没有变多',92)}</g>
    <g {...en(1.65,120,0)}>{txt(90,483,'只是',85)}{txt(290,483,'变快了',114,cool?C.blue:C.lime)}</g>
    {[0,1,2].map(i=><g key={i} opacity={p(2+i*.12)}><path d={`M95 ${620+i*76}H1345`} stroke="#4a415c" strokeWidth="3"/>
     <rect x={100+1150*clamp((t-2-i*.18)/1.6)} y={605+i*76} width="80" height="30" rx="15" fill={[C.purple,C.lime,C.pink][i]}/>
    </g>)}{footer('更早获得结果，也更早做下一次判断')}
   </>}

   {kind==='judge'&&<>
    {header('真正变贵的能力')}
    <g {...en(.65)}>{txt(770,282,'变贵的，是',53)}<g opacity={p(2.2)}>{txt(765,413,'判断',125,C.blue)}{path('M775 451H1345',2.3,C.blue,5)}</g></g>
    {['什么时候继续','什么时候该停'].map((s,i)=><g key={s} {...en(i?3.7:2.3,50,0)}><rect x="775" y={516+i*151} width="565" height="110" rx="5" fill={i?C.pink:C.lime}/>{txt(804,590+i*151,i?'02':'01',30,C.ink)}{txt(877,590+i*151,s,48,C.ink)}</g>)}
    {footer('先看反馈，再做决定')}
   </>}

   {kind==='pivot'&&<>
    {title('转向 1–2 次','PIVOT / 有依据地调整方向')}
    <g opacity={p(.8)}>{path('M510 750H1330M510 750V340',.8,'#b2adb8',2)}
     {path('M512 744C660 720 690 716 760 618S945 590 1005 472 1180 405 1315 315',1,C.blue,7,1.5)}
     <circle cx="760" cy="618" r={12*p(1.5)} fill={C.purple}/><circle cx="1005" cy="472" r={12*p(2)} fill={C.pink}/>
    </g>
    <g {...en(2.2)}><rect x="1055" y="510" width="280" height="168" rx="4" fill={C.lime}/>{txt(1080,559,'用户增长',30,C.ink)}{txt(1080,644,'3.6×',84,C.ink)}</g>
    <g opacity={p(3)}>{txt(510,823,'对比：不转向，或转向超过两次的公司',31)}{txt(510,870,'曲线为关系示意，并非原始数据点',23,'#817a89')}</g>
   </>}

   {kind==='archive'&&<>
    {header('结束一次，也留下经验')}
    <g {...en(.65)}>{txt(73,275,'经验不会清零',71)}{path('M75 310H635',.8,C.blue,3)}</g>
    <rect x="115" y="390" width="440" height="420" rx="8" fill={C.ink} opacity={p(.7)}/>
    {[C.lime,C.purple,C.pink].map((color,i)=>{
     const q=p(1.2+i*.8),shift=p(3.3+i*.35)
     return <g key={color} opacity={q} transform={`translate(${-65*shift+i*25*shift} ${-25*shift}) rotate(${(i-1)*5*shift} 330 ${470+i*106})`}>
      <rect x="135" y={420+i*108} width="400" height="88" rx="4" fill={color}/>{txt(158,475+i*108,['验证结果','判断失误','下一步'][i],43,C.ink)}{path(`M472 ${460+i*108}l14 14 24-31`,1.65+i*.8,C.ink,4)}
     </g>
    })}
    {footer('每次试错，都带走一点有用的东西')}
   </>}

   {kind==='outro'&&<>
    {header('评论区聊聊')}
    <g {...en(.6)}>{txt(75,299,'你最快的一次',59)}{txt(75,400,'创业',103,C.purple)}{txt(75,495,'多久结束？',79)}</g>
    <g {...en(2.8,0,60)}><path d="M74 574H627V764H165L110 814V764H74Z" fill={C.lime}/>{txt(110,648,'时间 · 结果',46,C.ink)}{txt(110,713,'你带走了什么？',42,C.ink)}</g>
    {footer('工具会变，判断与复盘会留下来')}
   </>}
  </g>
 </svg>
}
