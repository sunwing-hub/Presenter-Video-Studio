import type {CSSProperties} from 'react'
import {StoryMotion,type StoryEffect} from './StoryMotion'
import {VentureMotion,type VentureEffect} from './VentureMotion'
import {EditorialMotion,type EditorialEffect} from './EditorialMotion'
import {LayoutMotion,type LayoutEffect} from './LayoutMotion'
import {ReferenceMotion,type ReferenceEffect} from './ReferenceMotion'
export type KeywordEffect='receipt'|'audit'|'route'|'comment'|'signal'|'benefits'|'clock'|StoryEffect|VentureEffect|EditorialEffect|LayoutEffect|ReferenceEffect
const ease=(t:number)=>1-(1-Math.max(0,Math.min(1,t)))**3
/** Playhead-driven illustration, not a looping CSS animation or a text zoom. */
export function KeywordMotion({effect,text,time,color,duration=7}:{effect:KeywordEffect;text:string;time:number;color?:string;duration?:number}){
 if(effect.startsWith('ref-'))return <ReferenceMotion effect={effect as ReferenceEffect} text={text} time={time} duration={duration}/>
 if(effect.startsWith('layout-'))return <LayoutMotion effect={effect as LayoutEffect} text={text} time={time} duration={duration}/>
 if(effect.startsWith('editorial-'))return <EditorialMotion effect={effect as EditorialEffect} text={text} time={time}/>
 if(effect.startsWith('story-'))return <StoryMotion effect={effect as StoryEffect} text={text} time={time}/>
 if(effect.startsWith('venture-'))return <VentureMotion effect={effect as VentureEffect} text={text} time={time}/>
 const p=(delay=0,length=.34)=>ease((time-delay)/length)
 const enter=(delay=0):CSSProperties=>({opacity:p(delay),transform:`translateY(${22*(1-p(delay))}px)`})
 const draw=(delay=0)=>`${p(delay,.45)} 1`
 const icon=effect==='receipt'?<>
  <g transform={`translate(${(1-p())*-35} 0)`}><rect x="24" y="42" width="114" height="111" rx="17" fill="#db963c"/><rect x="24" y="37" width="114" height="103" rx="16" fill="#ffc77c"/><rect x="94" y="74" width="55" height="37" rx="10" fill="#194957"/><circle cx="110" cy="92" r="5" fill="#b6f1d7"/></g>
  {[0,1,2].map(i=><g key={i} opacity={p(i*.09)} transform={`translate(${25*i} ${-35*(1-p(i*.09))})`}><circle cx="57" cy="47" r="24" fill="#ffe6ad" stroke="#bb792e" strokeWidth="4"/><text x="57" y="56" textAnchor="middle" fill="#8c551a" fontSize="26" fontWeight="900">¥</text></g>)}
  <path d="M32 154 Q84 174 148 150" stroke="#88e3be" strokeWidth="8" fill="none" pathLength="1" strokeDasharray={draw(.12)}/>
 </>:effect==='audit'?<>
  <g style={enter()}><path d="M38 23H132L156 48V173H38Z" fill="#f2f6ff" stroke="#9db7d8" strokeWidth="3"/><path d="M132 23V48H156" fill="#c8ddf5"/><path d="M57 62H119M57 82H129M57 102H97" stroke="#a0b8d6" strokeWidth="7" strokeLinecap="round"/><text x="94" y="143" textAnchor="middle" fill="#234266" fontSize="21" fontWeight="800">自测</text></g>
  <g opacity={p(.15)} transform={`translate(${40*(1-p(.15))} 0)`}><circle cx="134" cy="106" r="35" fill="#acd9ef" fillOpacity=".55" stroke="#2e87d0" strokeWidth="9"/><path d="M158 133L178 156" stroke="#ffc379" strokeWidth="13" strokeLinecap="round"/></g>
 </>:effect==='comment'?<>
  <g style={enter()}><path d="M23 40Q23 23 40 23H152Q169 23 169 40V127Q169 144 152 144H65L40 169V144Q23 144 23 127Z" fill="#f0f6ff" stroke="#8cbbec" strokeWidth="4"/>{[0,1,2].map(i=><circle key={i} cx={59+i*38} cy="84" r="9" fill="#2673cc" opacity={p(.12+i*.1)}/>)}</g>
 </>:effect==='clock'?<>
  <circle cx="96" cy="99" r="69" fill="#102b42" stroke="#ffc074" strokeWidth="9"/><path d="M80 13H111" stroke="#c5e8fa" strokeWidth="11" strokeLinecap="round"/>
  <path d="M96 49V99L127 119" stroke="#a1efcb" strokeWidth="8" fill="none" strokeLinecap="round" pathLength="1" strokeDasharray={draw(.1)}/><circle cx="96" cy="99" r="7" fill="#fff"/>
 </>:effect==='benefits'?<>
  {[0,1,2].map(i=><g key={i} style={enter(i*.12)}><rect x={20+i*51} y={110-i*35} width="43" height={65+i*35} rx="9" fill={['#ffc27a','#97e1c8','#82b7f5'][i]}/><text x={41+i*51} y={147-i*35} textAnchor="middle" fontSize="25" fill="#102c45" fontWeight="900">{i+1}</text></g>)}
 </>:effect==='route'?<>
  <path d="M24 145H76V96H121V44H176" fill="none" stroke="#92c1e7" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" pathLength="1" strokeDasharray={draw()}/>
  {[0,1,2].map((i)=><circle key={i} cx={[24,76,121][i]} cy={[145,96,44][i]} r="13" fill="#ffc075" opacity={p(i*.1)}/>)}
  <path d="M152 24L177 44L152 65" stroke="#9be8c9" strokeWidth="10" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={p(.24)}/>
 </>:<>
  <circle cx="97" cy="95" r="53" fill="#142b43" stroke="#90d7f1" strokeWidth="5"/>
  <path d="M97 44V95L139 77" stroke="#90e3c3" strokeWidth="5" fill="none" transform={`rotate(${Math.min(time,1.1)*160} 97 95)`}/>
  {[0,1,2].map(i=><path key={i} d={`M${155+i*10} ${62-i*10}Q${178+i*9} 95 ${155+i*10} ${128+i*10}`} fill="none" stroke="#ffc37c" strokeWidth="4" opacity={p(i*.13)}/>)}
 </>
 return <div className={`keyword-motion keyword-motion--${effect}`} style={{color:color||'#9be8c9'}}>
  <svg className="keyword-motion-icon" viewBox="0 0 210 195" aria-hidden="true">{icon}</svg>
  <div className="keyword-motion-copy" style={enter(.08)}><strong>{text}</strong><svg viewBox="0 0 400 12" preserveAspectRatio="none" aria-hidden="true"><path d="M0 6H400" stroke="currentColor" strokeWidth="5" pathLength="1" strokeDasharray={draw(.2)}/></svg></div>
  {effect==='audit'&&<span className="keyword-motion-not-equal" style={{opacity:p(.32),transform:`rotate(${-12*(1-p(.32))}deg)`}}>≠</span>}
 </div>
}
