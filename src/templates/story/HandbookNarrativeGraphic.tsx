import type {ReactNode} from 'react'
import {ease,type StoryProject,type StoryScene} from './storyModel.mjs'
const C={ink:'#f1f6fa',muted:'#a5bbcd',line:'#42647c',green:'#8ce2c7',warm:'#f1c38a',panel:'#142c42'}
function Text({x,y,children,size=40,color=C.ink,anchor='start'}:{x:number;y:number;children:ReactNode;size?:number;color?:string;anchor?:'start'|'middle'}){return <text x={x} y={y} textAnchor={anchor} fontSize={size} fontWeight={650} fill={color}>{children}</text>}
function Enter({p,children}:{p:number;children:ReactNode}){return <g opacity={p} transform={`translate(0 ${20*(1-p)})`}>{children}</g>}
export function HandbookNarrativeGraphic({s,project,time}:{s:StoryScene;project:StoryProject;time:number}){
 const h=s.handbook!,local=time-s.start,p=(delay=0)=>ease((local-delay)/.55),hero=s.presenter==='hero',beat=(i:number)=>ease((time-(s.beats?.[i]??s.start)-.2)/.55)
 const items=h.items??[],titleY=hero?1080:300
 const ratio=h.imageAspect??1,iw=Math.min(904,614*ratio),ih=iw/ratio,ix=88+(904-iw)/2,iy=488+(614-ih)/2,f=h.focus
 return <>
 {!hero&&<><Text x={80} y={135} size={27} color={C.muted}>{h.chapter} · {h.header??'场景叙事 / 证据解读'}</Text><path d="M80 190H1000" stroke={C.line} strokeWidth={2}/><path d="M80 190H1000" stroke={C.green} strokeWidth={4} pathLength={1} strokeDasharray={1} strokeDashoffset={1-time/project.duration}/></>}
 {s.title.split('\n').map((line,i)=><Enter p={p(.12+i*.16)} key={line}><Text x={80} y={titleY+i*90} size={line.length>12?57:line.length>10?65:76} color={i?C.green:C.ink}>{line}</Text></Enter>)}
 {h.layout==='evidence'&&<Enter p={p(.38)}><rect x={70} y={470} width={940} height={650} rx={24} fill="#fff"/><image href={'/__studio/media/'+s.evidenceMediaId} x={88} y={488} width={904} height={614} preserveAspectRatio="xMidYMid meet"/>{f&&<rect x={ix+f.x*iw} y={iy+f.y*ih} width={f.w*iw} height={f.h*ih} rx={8} fill="#8ce2c710" stroke={C.green} strokeWidth={4} pathLength={1} strokeDasharray={1} strokeDashoffset={1-beat(2)} opacity={beat(2)}/>}{h.source&&<Text x={80} y={1165} size={26} color={C.muted}>{h.source}</Text>}</Enter>}
 {h.layout==='flow'&&<>{items.map((item,i)=><g key={item}><Enter p={beat(i)}><rect x={100} y={535+i*225} width={880} height={158} rx={25} fill={i===items.length-1?'#193f43':C.panel} stroke={i===items.length-1?C.green:C.line} strokeWidth={2}/><Text x={540} y={630+i*225} size={item.length>18?35:45} anchor="middle" color={i===items.length-1?C.green:C.ink}>{item}</Text></Enter>{i<items.length-1&&<path d={`M540 ${693+i*225}V${760+i*225}m-15 -16l15 16 15 -16`} fill="none" stroke={C.green} strokeWidth={4} pathLength={1} strokeDasharray={1} strokeDashoffset={1-beat(i+1)}/>}</g>)}</>}
 {h.layout==='evidence'&&items.length>0&&<Enter p={beat(1)}><rect x={80} y={1200} width={920} height={86} rx={20} fill="#193f43" stroke={C.green} strokeWidth={2}/><Text x={540} y={1256} size={items[0].length>22?30:38} color={C.green} anchor="middle">{items[0]}</Text></Enter>}
 {hero&&<Enter p={p(.65)}>{items.slice(0,3).map((item,i)=><g key={item}><rect x={80+i*310} y={1305} width={290} height={140} rx={23} fill={C.panel} stroke={C.line} strokeWidth={2}/><Text x={225+i*310} y={1390} size={item.length>8?27:34} anchor="middle" color={i===2?C.green:C.ink}>{item}</Text></g>)}</Enter>}
 {!hero&&<Enter p={p(.75)}>{(h.notes??[]).map((note,i)=><Text key={note} x={350} y={1360+i*48} size={note.length>25?25:29} color={i===0?C.warm:C.muted}>{note}</Text>)}</Enter>}
 </>
}
