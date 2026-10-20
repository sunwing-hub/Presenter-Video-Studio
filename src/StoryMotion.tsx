import {useId} from 'react'

export type StoryEffect='story-business'|'story-abilities'|'story-tasks'|'story-disconnect'|'story-wait'|'story-benefits'|'story-choice'|'story-watch'|'story-person'|'story-service'|'story-engine'
const clamp=(v:number)=>Math.max(0,Math.min(1,v))
const ease=(v:number)=>1-(1-clamp(v))**3
const C={blue:'#2868e8',orange:'#f58a28',ink:'#142749',paper:'#f8fbff',line:'#a5bada',pale:'#deebff'}
function Car({ghost=false,turn=0}:{ghost?:boolean;turn?:number}){return <g fill={ghost?'#e0e6ef':C.blue} stroke={ghost?'#6d809c':C.ink} strokeWidth="5" strokeLinejoin="round"><path d="M8 75V45L40 38 66 9H139L169 41H190Q203 41 203 56V75Z"/><path d="M74 18H105V38H55ZM116 18H135L155 38H116Z" fill={C.paper}/>{[48,162].map(x=><g key={x} transform={`translate(${x} 77) rotate(${turn})`}><circle r="22" fill={C.ink}/><circle r="11" fill={C.paper}/><path d="M0-11V11M-11 0H11" stroke={C.line} strokeWidth="3"/></g>)}</g>}
function Folder(){return <g><path d="M10 50V19Q10 8 21 8H75L94 27H181Q192 27 192 40V139H10Z" fill="#cb6415"/><path d="M10 48H192L179 153H23Z" fill={C.orange} stroke="#ffd49e" strokeWidth="3"/><rect x="72" y="91" width="59" height="8" rx="4" fill="#914115"/></g>}
function Gear({turn=0}:{turn?:number}){return <g transform={`rotate(${turn} 75 75)`} fill={C.blue} stroke={C.ink} strokeWidth="4"><path d="M57 6H93L98 25 113 34 133 28 151 58 137 72 137 89 150 103 132 133 112 126 98 134 93 153H57L52 135 35 126 17 132 0 102 14 89 14 71 0 57 18 27 37 34 52 25Z"/><circle cx="75" cy="80" r="32" fill={C.paper}/><path d="M66 55H86L77 77H95L65 107 71 85H54Z" fill={C.orange} stroke="none"/></g>}

/** Object actions are tied to the playhead; seeking and exporting show identical states. */
export function StoryMotion({effect,time,text}:{effect:StoryEffect;time:number;text:string}){
 const uid=useId().replace(/:/g,'')
 const p=(delay=0,duration=.45)=>ease((time-delay)/duration)
 const tall=['story-business','story-wait','story-choice','story-person','story-service','story-engine'].includes(effect)
 const W=tall?560:1000,H=tall?430:300
 const inkText={fill:C.ink,fontWeight:850,fontFamily:'PingFang SC, sans-serif'}
 const caption={fill:C.paper,stroke:C.ink,strokeWidth:6,paintOrder:'stroke' as const,strokeLinejoin:'round' as const,fontWeight:850,fontFamily:'PingFang SC, sans-serif'}
 const slide=(delay=0,distance=50)=>({opacity:p(delay),transform:`translateY(${distance*(1-p(delay))}px)`})
 const check=(delay:number)=>({strokeDasharray:`${p(delay)} 1`,pathLength:1})
 return <svg className="story-motion" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={text} data-story-effect={effect}>
  <defs><linearGradient id={`${uid}paper`} x2=".8" y2="1"><stop stopColor="#fff"/><stop offset="1" stopColor="#dce9ff"/></linearGradient><linearGradient id={`${uid}orange`} x2="0" y2="1"><stop stopColor="#ffb24b"/><stop offset="1" stopColor="#ee761d"/></linearGradient></defs>
  {effect==='story-person'&&<g style={slide(0,24)}>
   <path d="M28 63H470L535 128V330Q535 353 512 353H28Q9 353 9 334V82Q9 63 28 63Z" fill={`url(#${uid}paper)`} stroke={C.line} strokeWidth="3"/>
   <path d="M470 63V128H535" fill={C.pale}/><rect x="34" y="40" width="168" height="58" rx="16" fill={C.blue}/>
   <text x="118" y="79" textAnchor="middle" fill={C.paper} fontSize="29" fontWeight="800">人物介绍</text>
   <text x="44" y="210" fontSize="78" {...inkText}>{text}</text>
   <path d="M45 239H385" stroke={C.orange} strokeWidth="10" strokeLinecap="round" {...check(.3)}/>
   <text x="44" y="300" fontSize="32" fill="#46628a" fontWeight="650">Mark Zuckerberg</text>
  </g>}
  {effect==='story-service'&&<>
   <g style={slide(0,25)}><path d="M31 28H230Q248 28 248 46V194Q248 212 230 212H90L58 239V212H31Q13 212 13 194V46Q13 28 31 28Z" fill={`url(#${uid}paper)`} stroke={C.line} strokeWidth="3"/>
    <path d="M86 108V90a47 47 0 0 1 94 0v42" fill="none" stroke={C.blue} strokeWidth="12"/>
    <rect x="75" y="94" width="24" height="47" rx="10" fill={C.blue}/><rect x="167" y="94" width="24" height="47" rx="10" fill={C.blue}/>
    <path d="M178 141Q178 158 150 158" fill="none" stroke={C.blue} strokeWidth="7"/><rect x="128" y="148" width="31" height="17" rx="8" fill={C.orange}/>
    <g opacity={p(.25)} transform={`translate(${24*(1-p(.25))} 0)`}><rect x="72" y="178" width="156" height="53" rx="18" fill={C.blue}/>{[0,1,2].map(i=><circle key={i} cx={113+i*35} cy="203" r="7" fill={C.paper} opacity={p(.28+i*.13)}/>)}</g>
    <text x="132" y="306" textAnchor="middle" fontSize="40" {...caption}>AI 客服</text>
   </g>
   <g style={slide(.18,38)}><g transform="rotate(4 401 142)"><rect x="290" y="29" width="240" height="233" rx="18" fill={`url(#${uid}paper)`} stroke={C.line} strokeWidth="3"/><rect x="355" y="13" width="110" height="30" rx="9" fill={C.orange}/>
    {[0,1,2].map(i=><g key={i}><rect x="312" y={72+i*54} width="33" height="33" rx="7" fill={C.pale}/><path d={`m318 ${87+i*54} 8 9 16-20`} fill="none" stroke={C.blue} strokeWidth="6" strokeLinecap="round" {...check(.38+i*.22)}/><path d={`M365 ${88+i*54}H496`} stroke={C.line} strokeWidth="7" strokeLinecap="round"/></g>)}
   </g><text x="410" y="306" textAnchor="middle" fontSize="40" {...caption}>AI 跟单</text></g>
   <path d="M76 366H489" stroke={C.paper} strokeWidth="7" strokeLinecap="round" opacity=".55"/><path d="M76 366H489" stroke={C.orange} strokeWidth="7" strokeLinecap="round" {...check(.35)}/><circle cx={76+413*p(.35,1.3)} cy="366" r="12" fill={C.blue} stroke={C.paper} strokeWidth="4"/>
  </>}
  {effect==='story-engine'&&<>
   <g opacity={1-p(.05,.36)} transform={`translate(${-150*p(.05,.36)} 0)`}><rect x="60" y="75" width="179" height="171" rx="26" fill="#d6e0ee" stroke={C.line} strokeWidth="4"/><text x="149" y="176" textAnchor="middle" fontSize="41" fill="#74879f" fontWeight="800">模型</text></g>
   <g opacity={p(.12,.4)} transform={`translate(${140*(1-p(.12,.4))} 0)`}><rect x="139" y="55" width="252" height="208" rx="28" fill={`url(#${uid}paper)`} stroke={C.blue} strokeWidth="5"/><g transform="translate(203 84) scale(.82)"><Gear turn={Math.min(time,1.2)*140}/></g></g>
   <path d="M100 66Q137 6 215 26m-23-16 23 16-29 11M425 238Q410 299 332 290m24-12-24 12 24 17" fill="none" stroke={C.orange} strokeWidth="9" strokeLinecap="round" {...check(.08)}/>
   <g opacity={p(.64,.2)} transform="translate(392 246)"><circle r="36" fill={C.blue} stroke={C.paper} strokeWidth="4"/><path d="m-17 0 12 13 25-28" stroke={C.paper} strokeWidth="8" fill="none" strokeLinecap="round" {...check(.66)}/></g>
   <text x="275" y="378" textAnchor="middle" fontSize="45" {...caption}>{text}</text>
  </>}
  {effect==='story-business'&&<>
   <g style={slide(0)}><path d="M75 175H410V357H75Z" fill={`url(#${uid}paper)`} stroke={C.line} strokeWidth="4"/><rect x="95" y="225" width="135" height="109" rx="6" fill={C.blue}/><path d="M257 356V226H368V356" fill={C.pale} stroke={C.line} strokeWidth="4"/><circle cx="347" cy="293" r="5" fill={C.orange}/>
   <g transform={`translate(0 ${-50*(1-p(.12))})`} opacity={p(.12)}><path d="M62 171 91 111H399L426 171Z" fill={C.orange}/>{[0,1,2,3,4].map(i=><path key={i} d={`M${87+i*68} 112h30l15 59h-43z`} fill={C.paper}/>)}{[0,1,2,3,4,5].map(i=><path key={i} d={`M${62+i*61} 171h61v14q-30 30-61 0z`} fill={i%2?C.paper:C.orange}/>)}<rect x="102" y="53" width="286" height="59" rx="12" fill={C.ink}/><text x="245" y="94" textAnchor="middle" fontSize="34" fill={C.paper} fontWeight="800">你的生意</text></g></g>
   <g opacity={p(.55)} transform={`translate(${80*(1-p(.55))} ${-24*p(.55)}) rotate(8 424 287)`}><path d="M356 202H491V370L477 362 462 372 447 362 432 372 417 362 402 372 388 362 372 372 356 362Z" fill={C.paper} stroke={C.line} strokeWidth="3"/><text x="423" y="246" textAnchor="middle" fontSize="30" {...inkText}>业务</text><path d="M380 267H465M380 284H445" stroke={C.line} strokeWidth="6"/><path d="m389 316 20 19 44-46" stroke={C.blue} strokeWidth="10" fill="none" strokeLinecap="round" {...check(.85)}/></g>
   <text x="270" y="414" textAnchor="middle" fontSize="38" {...caption}>跟你的生意有关</text>
  </>}
  {effect==='story-abilities'&&<>
   <g style={slide(0)}><g transform="translate(100 60)"><rect x="34" y="0" width="133" height="130" rx="10" fill={C.paper} stroke={C.line} strokeWidth="3" transform={`translate(0 ${-20*p(.3)})`}/><path d="M55 30H142M55 48H127M55 66H139" stroke={C.line} strokeWidth="6"/><g transform="translate(0 48)"><Folder/></g></g><text x="202" y="274" textAnchor="middle" fontSize="40" {...caption}>主动记忆</text></g>
   <g opacity={p(.2)}><path d="M400 160H570" stroke={C.paper} strokeWidth="4" strokeDasharray="9 10"/><circle cx={410+145*p(.5,.8)} cy="160" r="9" fill={C.orange}/><text x="490" y="82" textAnchor="middle" fontSize="54" {...caption}>两项能力</text></g>
   <g style={slide(.16)}><g transform="translate(742 139)"><circle r="91" fill={C.paper} stroke={C.blue} strokeWidth="12"/><circle r="62" fill={C.pale} stroke={C.blue} strokeWidth="8"/><circle r="31" fill={C.orange}/><g transform={`translate(${65*(1-p(.5))} ${-50*(1-p(.5))})`} opacity={p(.5)}><path d="M-4 5 89-81" stroke={C.ink} strokeWidth="12"/><path d="m69-88 33-6-6 33-18-7Z" fill={C.orange}/></g><circle r={35+32*p(.9)} fill="none" stroke={C.orange} strokeWidth="4" opacity={1-p(.9)}/></g><text x="742" y="274" textAnchor="middle" fontSize="40" {...caption}>主动专注</text></g>
  </>}
  {effect==='story-tasks'&&<>
   {[0,1,2].map((i)=><g key={i} style={slide(i*.13)}><g transform={`translate(${50+i*320} 12) rotate(${[-4,3,-2][i]} 135 130)`}><path d="M10 28Q10 8 30 8H239L264 35V248H10Z" fill={`url(#${uid}paper)`} stroke={C.line} strokeWidth="3"/><path d="M239 8V35H264" fill={C.pale}/><rect x="95" y="0" width="90" height="17" rx="7" fill={i===1?C.orange:C.blue}/>
    {i===0?<><circle cx="135" cy="84" r="27" fill={C.blue}/><path d="M86 145Q86 105 135 108Q184 105 184 145" fill={C.blue}/><path d="M56 172H214" stroke={C.line} strokeWidth="7"/><path d="m201 95 14 14 28-31" stroke={C.orange} strokeWidth="9" fill="none" {...check(.45)}/></>:i===1?<><circle cx="137" cy="106" r="59" fill={C.paper} stroke={C.orange} strokeWidth="10"/><path d="M137 58V106L171 125" stroke={C.ink} strokeWidth="8" fill="none" transform={`rotate(${p(.35,1.4)*125} 137 106)`}/><path d="M65 179H214" stroke={C.line} strokeWidth="8"/><path d={`M65 179H${65+149*p(.35,1.4)}`} stroke={C.blue} strokeWidth="8"/></>:<><text x="55" y="104" fontSize="61" fill={C.blue} fontWeight="900">¥</text><path d="M114 67H216M114 96H191" stroke={C.line} strokeWidth="9"/><path d="M60 139H210" stroke={C.orange} strokeWidth="5" {...check(.55)}/><path d="M60 163H197" stroke={C.blue} strokeWidth="9" {...check(.8)}/><g transform={`translate(${40*(1-p(.65))} ${-25*(1-p(.65))})`}><path d="m182 143 47-52 15 14-47 53-23 9Z" fill={C.orange} stroke={C.ink} strokeWidth="3"/></g></>}
    <text x="137" y="230" textAnchor="middle" fontSize="36" {...inkText}>{['记客户','盯进度','改报价'][i]}</text></g></g>)}
  </>}
  {effect==='story-disconnect'&&<>
   <g transform="translate(75 46)"><Gear turn={Math.min(time,2)*75}/><path d="M190 140V44m-25 25 25-25 25 25" fill="none" stroke={C.orange} strokeWidth="10" strokeLinecap="round" {...check(.15)}/></g>
   <path d="M366 126H635" stroke={C.paper} strokeWidth="7" strokeDasharray="14 14" opacity={.8-p(.45)*.45}/><g transform={`translate(501 126) rotate(${-20*(1-p(.5))})`} opacity={p(.5)}><circle r="43" fill={C.orange}/><path d="m-17-17 34 34m0-34-34 34" stroke={C.paper} strokeWidth="10" strokeLinecap="round"/></g>
   <g transform="translate(711 71)"><Car ghost/><path d="M-10 132H227" stroke={C.line} strokeWidth="5" strokeDasharray="12 8"/></g>
   <text x="200" y="278" textAnchor="middle" fontSize="37" {...caption}>模型在升级</text><text x="815" y="278" textAnchor="middle" fontSize="37" {...caption}>你还没有车</text>
  </>}
  {effect==='story-wait'&&<>
   <g transform="translate(102 104)"><circle r="72" fill={C.paper} stroke={C.blue} strokeWidth="12"/><path d="M-19-89H19" stroke={C.orange} strokeWidth="11" strokeLinecap="round"/><path d="M0-48V0L31 19" stroke={C.ink} strokeWidth="8" fill="none" transform={`rotate(${Math.min(time,3)*145})`}/><circle r="7" fill={C.orange}/></g><text x="227" y="110" fontSize="44" {...caption}>你还在等</text>
   <path d="M30 327H530" stroke={C.paper} strokeWidth="5" strokeDasharray="22 18"/><g transform={`translate(${66+190*p(.45,2)} 208)`}><Car turn={time*160}/></g>
   <g opacity={p(.7)} stroke={C.orange} strokeWidth="6" strokeLinecap="round"><path d={`M${70+130*p(.7)} 240h-47m29 25h-52`}/></g><text x="280" y="396" textAnchor="middle" fontSize="38" {...caption}>别人已经上车</text>
  </>}
  {effect==='story-benefits'&&<>
   <text x="40" y="96" fontSize="44" {...caption}>现在动手</text><text x="40" y="163" fontSize="57" fill={C.orange} stroke={C.ink} strokeWidth="5" paintOrder="stroke" fontWeight="900">三个好处</text>
   {[0,1,2].map(i=><g key={i} opacity={p(i*.14)} transform={`translate(${330+i*202} ${15+([18,0,22][i])}) rotate(${[-7,3,8][i]*p(i*.14)} 95 120)`}><g transform={`translate(0 ${120*(1-p(i*.14))})`}><path d="M7 0H175V77Q150 91 175 105V244H7V105Q32 91 7 77Z" fill={i===1?C.blue:C.paper} stroke={i===1?'#88aeff':C.line} strokeWidth="3"/><path d="M30 90H153" stroke={i===1?C.paper:C.line} strokeWidth="3" strokeDasharray="7 6"/><text x="91" y="64" textAnchor="middle" fontSize="28" fill={i===1?C.paper:C.ink} fontWeight="800">好处</text><text x="91" y="188" textAnchor="middle" fontSize="94" fontWeight="900" fill={i===1?C.paper:C.orange}>{i+1}</text><circle cx="92" cy="218" r="5" fill={i===1?C.orange:C.blue}/></g></g>)}
  </>}
  {effect==='story-choice'&&<>
   <g transform="rotate(-4 252 208)" style={{opacity:p()}}><rect x="57" y="22" width="400" height="325" rx="19" fill={`url(#${uid}paper)`} stroke={C.line} strokeWidth="4"/><rect x="185" y="6" width="144" height="37" rx="11" fill={C.blue}/><text x="90" y="101" fontSize="33" {...inkText}>第一个 AI 环节</text>
    {['客服','跟单','报价'].map((label,i)=><g key={i} opacity={p(.15+i*.12)}><rect x="95" y={129+i*60} width="34" height="34" rx="7" fill={C.paper} stroke={C.line} strokeWidth="3"/><text x="152" y={157+i*60} fontSize="32" {...inkText}>{label}</text><path d={`M245 ${151+i*60}H410`} stroke={C.line} strokeWidth="5"/></g>)}
    <rect x="79" y="118" width="349" height="58" rx="12" fill="none" stroke={C.orange} strokeWidth="5" {...check(.85)}/>
   </g><g opacity={p(.6)} transform={`translate(${380-77*p(.6)} ${270-119*p(.6)})`}><path d="M0 0 14 75 32 52 58 60Z" fill={C.orange} stroke={C.paper} strokeWidth="5"/></g>
   <path d="M86 375H433" stroke={C.orange} strokeWidth="34" strokeLinecap="round" opacity={p(1)}/><text x="259" y="392" textAnchor="middle" fontSize="40" {...caption}>定了吗？</text>
  </>}
  {effect==='story-watch'&&<>
   <g style={slide(0)}><rect x="30" y="15" width="390" height="220" rx="19" fill={C.ink} stroke={C.line} strokeWidth="5"/><rect x="48" y="33" width="354" height="183" rx="9" fill="#eff5ff"/>{[0,1,2].map(i=><g key={i}><rect x={74+i*104} y="74" width="88" height="94" rx="11" fill={i===1?C.blue:C.pale}/><text x={118+i*104} y="132" textAnchor="middle" fontSize="33" fontWeight="900" fill={i===1?C.paper:C.ink}>AI</text></g>)}<path d="M6 239H443L413 268H35Z" fill={C.line}/><rect x="193" y="239" width="67" height="11" rx="5" fill={C.ink}/></g>
   <g opacity={1-p(1.25,.4)}><rect x={62+315*p(.18,1.1)} y="45" width="8" height="156" rx="4" fill={C.orange}/><rect x={48+300*p(.18,1.1)} y="45" width="33" height="156" fill={C.orange} opacity=".14"/></g>
   <g opacity={p(.9)} transform="translate(385 196)"><circle r="43" fill={C.orange} stroke={C.paper} strokeWidth="5"/><path d="m-21 0 15 16 29-34" fill="none" stroke={C.paper} strokeWidth="9" strokeLinecap="round" {...check(.96)}/></g>
   <text x="490" y="112" fontSize="52" {...caption}>模型的事</text><text x="490" y="199" fontSize="70" fill={C.orange} stroke={C.ink} strokeWidth="7" paintOrder="stroke" fontWeight="900">我替你盯</text>
  </>}
 </svg>
}
