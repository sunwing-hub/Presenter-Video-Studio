import {useId} from 'react'

export type VentureEffect =
  | 'venture-calendar' | 'venture-doubt' | 'venture-rope' | 'venture-ledger' | 'venture-radar'
  | 'venture-oldbuild' | 'venture-cost' | 'venture-burn' | 'venture-shrink' | 'venture-prototype' | 'venture-switch' | 'venture-filter'
  | 'venture-pivot' | 'venture-survey' | 'venture-regret'
  | 'venture-review' | 'venture-table' | 'venture-question'

const C={blue:'#3479e9',orange:'#ff8a34',ink:'#152544',paper:'#fbfdff',line:'#a6bbdc',pale:'#e8f1ff',soft:'#fff0dc'}
const clamp=(n:number)=>Math.max(0,Math.min(1,n))
const ease=(n:number)=>1-(1-clamp(n))**3
const font={fontFamily:'PingFang SC, sans-serif',fontWeight:850}

/** Each frame is determined solely by the playhead, including seeks and export. */
export function VentureMotion({effect,time,text}:{effect:VentureEffect;time:number;text:string}){
 const uid=useId().replace(/:/g,'')
 const p=(delay=0,duration=.42)=>ease((time-delay)/duration)
 const stroke=(delay=0,duration=.55)=>({pathLength:1,strokeDasharray:`${p(delay,duration)} 1`})
 const rise=(delay=0,dist=38)=>({opacity:p(delay),transform:`translate(0 ${dist*(1-p(delay))})`})
 const paper=`url(#${uid}paper)`
 const title=(x:number,y:number,label:string,size=38)=><text x={x} y={y} fill={C.ink} fontSize={size} {...font}>{label}</text>
 const note=(x:number,y:number,label:string,size=25)=><text x={x} y={y} fill="#4e668b" fontSize={size} {...font}>{label}</text>
 const outside=(x:number,y:number,label:string,size=33)=><text x={x} y={y} fill={C.paper} stroke={C.ink} strokeWidth="5" paintOrder="stroke" strokeLinejoin="round" fontSize={size} {...font}>{label}</text>
 const pill=(x:number,y:number,w:number,label:string,fill=C.blue)=><g><rect x={x} y={y} width={w} height="43" rx="20" fill={fill}/><text x={x+w/2} y={y+30} textAnchor="middle" fill={C.paper} fontSize="24" {...font}>{label}</text></g>
 return <svg className="venture-motion" viewBox="0 0 640 430" role="img" aria-label={text} data-venture-effect={effect}>
  <defs><linearGradient id={`${uid}paper`} x2=".8" y2="1"><stop stopColor="#fff"/><stop offset="1" stopColor="#e8f1ff"/></linearGradient></defs>

  {effect==='venture-calendar'&&<>
   <g style={rise()} transform={`translate(${-40*p(.5)} 0)`}><rect x="39" y="85" width="262" height="251" rx="21" fill={paper} stroke={C.line} strokeWidth="5"/><rect x="39" y="85" width="262" height="58" rx="20" fill={C.blue}/>{[89,244].map(x=><circle key={x} cx={x} cy="91" r="12" fill={C.ink}/>)}{title(79,227,'两年',64)}{note(88,278,'漫长试错',25)}</g>
   <path d="M278 205H365m-24-22 24 22-24 22" fill="none" stroke={C.orange} strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" {...stroke(.28)}/>
   <g opacity={p(.42)} transform={`translate(${65*(1-p(.42))} ${-20*(1-p(.42))}) rotate(${9*(1-p(.42))} 464 209)`}><rect x="372" y="112" width="214" height="200" rx="22" fill={C.soft} stroke={C.orange} strokeWidth="5"/><rect x="372" y="112" width="214" height="50" rx="20" fill={C.orange}/>{title(397,234,'两周',61)}{note(398,279,'快速验证',25)}</g>
  </>}

  {effect==='venture-doubt'&&<>
   <g style={rise()}><circle cx="194" cy="190" r="115" fill={C.pale} stroke={C.blue} strokeWidth="8"/><path d="M145 161q0-57 55-57 58 0 58 45 0 34-48 55v23" fill="none" stroke={C.ink} strokeWidth="21" strokeLinecap="round"/><circle cx="209" cy="259" r="12" fill={C.orange}/></g>
   <g opacity={p(.35)} transform={`translate(${38*(1-p(.35))} 0)`}><path d="M315 150H568" stroke={C.line} strokeWidth="6"/><path d="M315 224H530" stroke={C.line} strokeWidth="6"/>{pill(332,170,188,'换个角度',C.orange)}{outside(314,310,text||'真的坏吗？',text.length>6?36:46)}</g>
  </>}

  {effect==='venture-rope'&&<>
   <g style={rise()}><rect x="89" y="155" width="173" height="185" rx="21" fill={C.ink} stroke={C.blue} strokeWidth="6"/><text x="175" y="260" textAnchor="middle" fill={C.paper} fontSize="45" {...font}>硬熬</text><path d="M251 220Q336 74 502 162" fill="none" stroke={C.line} strokeWidth="18" strokeLinecap="round"/><path d="M251 220Q336 74 502 162" fill="none" stroke={C.orange} strokeWidth="12" strokeLinecap="round" {...stroke(.1,1.5)}/></g>
   <g opacity={p(.6)} transform={`translate(${65*(1-p(.6))} 0)`}><circle cx="502" cy="162" r="59" fill={C.soft} stroke={C.orange} strokeWidth="6"/><path d="m473 163 18 20 41-43" fill="none" stroke={C.blue} strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" {...stroke(.75)}/>{outside(359,303,'坚持 ≠ 硬熬',38)}</g>
  </>}

  {effect==='venture-ledger'&&<>
   <g style={rise()} transform="rotate(-4 301 222)"><rect x="79" y="57" width="440" height="315" rx="15" fill={paper} stroke={C.line} strokeWidth="5"/><rect x="79" y="57" width="440" height="66" rx="15" fill={C.blue}/><text x="107" y="103" fill={C.paper} fontSize="32" {...font}>一次昂贵的试错</text>
    {[0,1,2].map((i)=><g key={i} opacity={p(.14+i*.18)}><circle cx="129" cy={168+i*64} r="17" fill={i===2?C.orange:C.pale}/><path d={`M173 ${168+i*64}H456`} stroke={C.line} strokeWidth="6" strokeLinecap="round"/><text x="176" y={159+i*64} fill={C.ink} fontSize="27" {...font}>{['做了三年多','投入几百万元','才看清需求'][i]}</text></g>)}
   </g><path d="M401 289l27 26 56-63" fill="none" stroke={C.orange} strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" {...stroke(.75)}/>
  </>}

  {effect==='venture-radar'&&<>
   <g style={rise()}><circle cx="221" cy="215" r="151" fill={C.pale} stroke={C.line} strokeWidth="5"/><circle cx="221" cy="215" r="101" fill="none" stroke={C.blue} strokeWidth="5"/><circle cx="221" cy="215" r="49" fill="none" stroke={C.blue} strokeWidth="5"/><path d="M221 215V64A151 151 0 0 1 361 271Z" fill={C.blue} opacity=".18" transform={`rotate(${p(0,2.2)*165} 221 215)`}/><circle cx="305" cy="178" r="13" fill={C.orange} opacity={p(.3)}/></g>
   <g opacity={p(.55)} transform={`translate(${55*(1-p(.55))} 0)`}><rect x="378" y="120" width="211" height="175" rx="16" fill={paper} stroke={C.line} strokeWidth="4"/>{note(403,168,'市场需求',29)}{title(409,239,'先验证',45)}<path d="M406 257H554" stroke={C.orange} strokeWidth="8" strokeLinecap="round" {...stroke(.7)}/></g>
  </>}

  {effect==='venture-cost'&&<>
   <g style={rise()}><rect x="48" y="108" width="243" height="206" rx="17" fill={paper} stroke={C.line} strokeWidth="5"/>{pill(76,81,188,'以前',C.ink)}{title(75,180,'6 个月+',48)}{note(74,227,'好几万美金')}{note(74,264,'两三名工程师')}</g>
   <path d="M291 206H357m-22-22 22 22-22 22" fill="none" stroke={C.orange} strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" {...stroke(.3)}/>
   <g style={rise(.48)}><rect x="367" y="108" width="230" height="206" rx="17" fill={C.soft} stroke={C.orange} strokeWidth="5"/>{pill(390,81,178,'现在',C.orange)}{title(389,180,'2–4 周',49)}{note(389,227,'几百元')}{note(389,264,'一人 + AI')}</g>
  </>}

  {effect==='venture-oldbuild'&&<>
   <g style={rise()}><rect x="107" y="72" width="391" height="251" rx="19" fill={C.ink} stroke={C.blue} strokeWidth="7"/><rect x="107" y="72" width="391" height="49" rx="17" fill={C.blue}/>{[139,162,185].map(x=><circle key={x} cx={x} cy="97" r="6" fill={C.paper}/>)}<path d="M140 159H275M140 190H305M140 221H249" stroke={C.pale} strokeWidth="10" strokeLinecap="round"/><rect x="350" y="155" width="101" height="92" rx="12" fill={C.pale}/><path d="M351 283H455" stroke={C.orange} strokeWidth="10" strokeLinecap="round" {...stroke(.2,1.5)}/></g>
   {[0,1,2].map(i=><g key={i} opacity={p(.35+i*.34)} transform={`translate(${145+i*126} ${-45*(1-p(.35+i*.34))})`}><circle cy="364" r="24" fill={C.soft} stroke={C.orange} strokeWidth="4"/><text y="373" textAnchor="middle" fill={C.orange} fontSize="25" {...font}>¥</text></g>)}
   <g opacity={p(1.15)}>{pill(204,21,224,'6 个月起步',C.orange)}{outside(135,408,'好几万美金 · 两三名工程师',29)}</g>
  </>}

  {effect==='venture-burn'&&<>
   <g style={rise()}><path d="M166 70H419M166 345H419M190 87Q190 159 283 207Q190 259 190 329H396Q396 259 303 207Q396 159 396 87Z" fill={C.pale} stroke={C.blue} strokeWidth="8" strokeLinejoin="round"/><path d="M215 113H373Q357 169 293 190Q229 169 215 113Z" fill={C.soft}/><path d="M227 315Q292 267 361 315Z" fill={C.orange} opacity={p(.5)}/><path d="M292 197V290" stroke={C.orange} strokeWidth="8" strokeLinecap="round" {...stroke(.25,1.3)}/></g>
   <g opacity={p(.5)}>{pill(42,135,154,'两三年',C.ink)}{pill(414,248,198,'几十上百万',C.orange)}</g>
  </>}

  {effect==='venture-shrink'&&<>
   <g style={rise()}>{[0,1,2,3].map(i=><g key={i} opacity={p(i*.15)}><ellipse cx="177" cy={298-i*42} rx="84" ry="21" fill={i%2?C.soft:C.orange} stroke={C.orange} strokeWidth="5"/><path d={`M93 ${298-i*42}v18q84 41 168 0v-18`} fill={i%2?C.soft:C.orange} stroke={C.orange} strokeWidth="5"/></g>)}
    <path d="M294 209H395m-27-25 27 25-27 25" fill="none" stroke={C.blue} strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" {...stroke(.35)}/>
    <g opacity={p(.65)}><ellipse cx="499" cy="306" rx="65" ry="17" fill={C.soft} stroke={C.orange} strokeWidth="5"/><path d="M434 306v18q65 33 130 0v-18" fill={C.soft} stroke={C.orange} strokeWidth="5"/></g>
   </g>{outside(165,399,'失败代价缩水',40)}
  </>}

  {effect==='venture-prototype'&&<>
   <g style={rise()}><rect x="72" y="84" width="492" height="255" rx="18" fill={C.ink} stroke={C.blue} strokeWidth="6"/><rect x="72" y="84" width="492" height="43" rx="17" fill={C.blue}/>{[102,126,150].map(x=><circle key={x} cx={x} cy="106" r="6" fill={C.paper}/>)}<rect x="103" y="156" width="146" height="142" rx="10" fill={C.pale}/><rect x="274" y="155" width="252" height="25" rx="6" fill={C.paper}/>{[0,1,2].map(i=><rect key={i} x={274+i*81} y="202" width="66" height="65" rx="10" fill={i===1?C.orange:C.blue} opacity={p(.2+i*.18)}/>)}</g>
   <path d="M99 323H538" stroke={C.line} strokeWidth="8" strokeLinecap="round"/><path d="M99 323H538" stroke={C.orange} strokeWidth="8" strokeLinecap="round" {...stroke(.2,1.7)}/><g opacity={p(1.3)}><circle cx="545" cy="325" r="34" fill={C.orange}/><path d="m528 325 13 13 23-28" fill="none" stroke={C.paper} strokeWidth="7" strokeLinecap="round" {...stroke(1.35)}/></g>
  </>}

  {effect==='venture-switch'&&<>
   <g style={rise()}><rect x="65" y="90" width="246" height="252" rx="18" fill={paper} stroke={C.line} strokeWidth="5"/><rect x="95" y="122" width="184" height="100" rx="12" fill={C.pale}/><path d="M108 278H262" stroke={C.line} strokeWidth="9" strokeLinecap="round"/><text x="141" y="186" fontSize="52" fill={C.blue} {...font}>旧想法</text></g>
   <g opacity={p(.4)} transform={`translate(${52*(1-p(.4))} 0)`}><path d="M333 205H391m-22-22 22 22-22 22" fill="none" stroke={C.orange} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" {...stroke(.4)}/><rect x="407" y="112" width="184" height="190" rx="18" fill={C.soft} stroke={C.orange} strokeWidth="5"/>{title(434,199,'下一次',35)}{note(439,248,'带走经验',23)}</g>
   <path d="M107 145l158 133m0-133L107 278" stroke={C.orange} strokeWidth="9" strokeLinecap="round" opacity={p(.9)} {...stroke(.9)}/>
  </>}

  {effect==='venture-filter'&&<>
   {[0,1,2].map(i=><g key={i} opacity={p(i*.15)} transform={`translate(${45+i*92} ${64+13*i+22*(1-p(i*.15))}) rotate(${[-9,0,9][i]} 105 116)`}><rect x="12" y="15" width="178" height="225" rx="14" fill={i===2?C.soft:paper} stroke={i===2?C.orange:C.line} strokeWidth="4"/><circle cx="102" cy="88" r="39" fill={i===2?C.orange:C.pale}/><path d="M53 165H156M69 187H145" stroke={C.line} strokeWidth="7" strokeLinecap="round"/></g>)}
   <g opacity={p(.55)}><path d="M450 172H537m-24-22 24 22-24 22" fill="none" stroke={C.orange} strokeWidth="10" strokeLinecap="round" {...stroke(.55)}/><circle cx="544" cy="254" r="51" fill={C.blue}/><path d="m515 255 19 20 37-42" fill="none" stroke={C.paper} strokeWidth="10" strokeLinecap="round" {...stroke(.8)}/></g>
  </>}

  {effect==='venture-pivot'&&<>
   <g style={rise()}><path d="M78 326V133H304V217H479V99" fill="none" stroke={C.line} strokeWidth="18" strokeLinecap="round" strokeLinejoin="round"/><path d="M78 326V133H304V217H479V99" fill="none" stroke={C.blue} strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" {...stroke(.12,1.2)}/>{[[78,326],[304,217],[479,99]].map(([x,y],i)=><circle key={i} cx={x} cy={y} r="19" fill={i===2?C.orange:C.paper} stroke={C.blue} strokeWidth="6" opacity={p(.2+i*.23)}/>)}<path d="m451 128 28-29 26 31" fill="none" stroke={C.orange} strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" opacity={p(.8)}/></g>
   <g opacity={p(.65)}><rect x="145" y="256" width="255" height="97" rx="20" fill={paper} stroke={C.line} strokeWidth="4"/>{title(172,325,'1–2 次转向',39)}</g>
   <g opacity={p(3.3,.45)} transform={`translate(0 ${-35*(1-p(3.3,.45))})`}><rect x="423" y="250" width="154" height="86" rx="18" fill={C.soft} stroke={C.orange} strokeWidth="5"/><text x="500" y="307" textAnchor="middle" fill={C.orange} fontSize="47" {...font}>3.6×</text></g>
  </>}

  {effect==='venture-survey'&&<>
   <g style={rise()}><rect x="58" y="59" width="518" height="303" rx="17" fill={paper} stroke={C.line} strokeWidth="5"/><rect x="58" y="59" width="518" height="57" rx="17" fill={C.blue}/><text x="83" y="99" fill={C.paper} fontSize="27" {...font}>创始人调查 · 资金耗尽</text>
    <g opacity={1-p(4,.3)}>{[0,1,2,3,4].map((i)=><g key={i}><circle cx={149+i*79} cy="202" r="24" fill={i%2?C.soft:C.pale} stroke={i%2?C.orange:C.blue} strokeWidth="4"/><path d={`M${128+i*79} 250q21-28 42 0`} fill="none" stroke={i%2?C.orange:C.blue} strokeWidth="6" strokeLinecap="round"/></g>)}{title(191,315,'200 位创始人',36)}</g>
    <g opacity={p(4,.3)}><text x="89" y="183" fill={C.ink} fontSize="39" {...font}>2023</text><path d="M237 165H514" stroke={C.pale} strokeWidth="24" strokeLinecap="round"/><path d="M237 165H514" stroke={C.orange} strokeWidth="24" strokeLinecap="round" {...stroke(4,.8)}/><text x="503" y="222" fill={C.orange} fontSize="47" textAnchor="end" {...font}>38%</text></g>
    <g opacity={p(7,.3)}><text x="89" y="274" fill={C.ink} fontSize="39" {...font}>2026</text><path d="M237 256H514" stroke={C.pale} strokeWidth="24" strokeLinecap="round"/><path d="M237 256H419" stroke={C.blue} strokeWidth="24" strokeLinecap="round" {...stroke(7,.8)}/><text x="503" y="317" fill={C.blue} fontSize="47" textAnchor="end" {...font}>25%</text></g>
   </g>
  </>}

  {effect==='venture-regret'&&<>
   <g style={rise()}><circle cx="190" cy="216" r="126" fill={C.soft} stroke={C.orange} strokeWidth="8"/><path d="M190 216V121A95 95 0 1 1 102 253" fill="none" stroke={C.orange} strokeWidth="18" strokeLinecap="round" {...stroke(.12,.85)}/><path d="m88 218 14 35 34-15" fill="none" stroke={C.orange} strokeWidth="10" strokeLinecap="round"/><text x="190" y="235" textAnchor="middle" fill={C.ink} fontSize="67" {...font}>42%</text></g>
   <g opacity={p(.55)} transform={`translate(${46*(1-p(.55))} 0)`}><rect x="352" y="118" width="224" height="176" rx="18" fill={paper} stroke={C.line} strokeWidth="5"/>{title(376,176,'更早转向',34)}{note(376,226,'受访创始人',25)}<path d="M377 251H544" stroke={C.blue} strokeWidth="8" strokeLinecap="round" {...stroke(.7)}/></g>
  </>}

  {effect==='venture-review'&&<>
   {[0,1,2].map(i=><g key={i} opacity={p(.12+i*.25)} transform={`translate(${39+i*183} ${84+(i%2)*27+27*(1-p(.12+i*.25))}) rotate(${[-5,3,-2][i]} 110 110)`}><rect x="0" y="0" width="174" height="222" rx="15" fill={paper} stroke={C.line} strokeWidth="4"/><rect x="0" y="0" width="174" height="49" rx="14" fill={i===2?C.orange:C.blue}/><text x="87" y="36" textAnchor="middle" fill={C.paper} fontSize="25" {...font}>{['验证','判断','下一步'][i]}</text><circle cx="86" cy="122" r="37" fill={i===2?C.soft:C.pale}/><text x="86" y="137" textAnchor="middle" fill={i===2?C.orange:C.blue} fontSize="53" {...font}>{['✓','?','→'][i]}</text><path d="M32 187H140" stroke={C.line} strokeWidth="7" strokeLinecap="round"/></g>)}
   <path d="M104 363H535" stroke={C.orange} strokeWidth="8" strokeLinecap="round" {...stroke(.7,1.1)}/><circle cx={104+431*p(.7,1.1)} cy="363" r="12" fill={C.blue} stroke={C.paper} strokeWidth="4"/>
  </>}

  {effect==='venture-table'&&<>
   <g style={rise()}><ellipse cx="315" cy="318" rx="263" ry="58" fill={C.ink} stroke={C.blue} strokeWidth="8"/><ellipse cx="315" cy="301" rx="263" ry="58" fill={C.pale} stroke={C.blue} strokeWidth="7"/><rect x="110" y="70" width="139" height="192" rx="14" fill={paper} stroke={C.line} strokeWidth="5" transform="rotate(-8 179 166)"/><rect x="360" y="65" width="139" height="192" rx="14" fill={C.soft} stroke={C.orange} strokeWidth="5" transform="rotate(8 429 160)"/></g>
   <g opacity={p(.45)} transform={`translate(0 ${-56*(1-p(.45))})`}><circle cx="319" cy="191" r="55" fill={C.orange} stroke={C.paper} strokeWidth="6"/><text x="319" y="208" textAnchor="middle" fill={C.paper} fontSize="56" {...font}>+</text></g>
   <path d="M199 291Q315 339 432 291" fill="none" stroke={C.orange} strokeWidth="8" {...stroke(.7)}/>
  </>}

  {effect==='venture-question'&&<>
   <g style={rise()}><path d="M65 77Q65 53 89 53H518Q543 53 543 78V296Q543 320 518 320H233L145 388V320H89Q65 320 65 296Z" fill={paper} stroke={C.blue} strokeWidth="6"/><circle cx="172" cy="177" r="61" fill={C.soft}/><text x="172" y="212" textAnchor="middle" fill={C.orange} fontSize="103" {...font}>?</text>{title(272,160,'你的答案',41)}{note(272,217,'评论区聊聊',32)}<path d="M272 246H490" stroke={C.orange} strokeWidth="9" strokeLinecap="round" {...stroke(.3)}/></g>
   <circle cx="534" cy="334" r={16+24*p(.75)} fill="none" stroke={C.orange} strokeWidth="5" opacity={1-p(.75)}/>
  </>}
 </svg>
}
