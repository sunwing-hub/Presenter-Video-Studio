import type { CSSProperties } from 'react'
import type { ScriptContent } from './arrangement'
import { stagedConnectorProgress } from './shapeTiming'
import { MotionIcon } from './MotionIcon'

export const shapeScenes = ['ring', 'gauge', 'fan', 'bubbles', 'ribbon', 'orbitflow', 'embed', 'merge'] as const
export function ShapeCard({scene, content, elapsed, duration}: {scene:string;content:ScriptContent;elapsed:number;duration:number}) {
  const enter=(i=0):CSSProperties=>{const p=Math.max(0,Math.min(1,(elapsed-i*.24)/.8)),e=1-(1-p)**3;return {opacity:e,transform:`translateY(${(1-e)*48*(content.motion??1)}px) scale(${.76+.24*e})`}}
  const headingEnter=scene==='fan'?{opacity:1,transform:'translateY(0) scale(1)'}:enter()
  const progress=Math.max(0,Math.min(1,elapsed/1.5))
  const lineProgress=Math.max(0,Math.min(1,elapsed/Math.max(.1,duration)))
  const {first:embedFirstLine,second:embedSecondLine}=stagedConnectorProgress(elapsed,duration)
  const numeric=Number.parseFloat(content.value)
  const percent=Number.isFinite(numeric)?Math.max(0,Math.min(100,numeric)):0
  const items=content.items.length?content.items:['输入','处理','结果']
  const part=(id:string,label:string)=>({'data-part-id':id,'data-part-label':label})
  return <div className={`shape-card shape-card--${scene}`} style={{'--line-progress':lineProgress} as CSSProperties}>
    {(scene==='ring'||scene==='gauge') ? <>
      <div className="script-part shape-meter" {...part('meter','进度图形')} style={enter()}>
        <svg viewBox={scene==='gauge'?'0 0 320 190':'0 0 320 320'} aria-label={`${percent}%`}>
          {scene==='ring'?<><circle className="meter-track" cx="160" cy="160" r="132"/><circle className="meter-fill" cx="160" cy="160" r="132" pathLength="100" strokeDasharray={`${percent*progress} 100`} transform="rotate(-90 160 160)"/></>:<><path className="meter-track" d="M28 164 A132 132 0 0 1 292 164"/><path className="meter-fill" d="M28 164 A132 132 0 0 1 292 164" pathLength="100" strokeDasharray={`${percent*progress} 100`}/></>}
        </svg>
        <strong className="script-part shape-number" {...part('value','数字')} >{content.value || '0%'}</strong>
      </div>
      <strong className="script-part shape-title" {...part('title','标题')} style={enter(1)}>{content.title}</strong>
    </>:scene==='embed'?<>
      <div className="shape-embed">
        <svg className="script-part shape-embed-link" {...part('connector','逐步生长的连接线')} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <path d="M53 11 C83 10 84 45 68 45" pathLength="1" strokeDasharray={`${embedFirstLine} 1`}/>
          <path d="M23 46 C-1 48 -2 76 8 80" pathLength="1" strokeDasharray={`${embedSecondLine} 1`}/>
          <path className="shape-embed-tracer" d="M53 11 C83 10 84 45 68 45" pathLength="1" strokeDasharray=".09 1" strokeDashoffset={-Math.max(0,embedFirstLine-.09)} style={{opacity:embedFirstLine>0&&embedFirstLine<1?1:0}}/>
          <path className="shape-embed-tracer" d="M23 46 C-1 48 -2 76 8 80" pathLength="1" strokeDasharray=".09 1" strokeDashoffset={-Math.max(0,embedSecondLine-.09)} style={{opacity:embedSecondLine>0&&embedSecondLine<1?1:0}}/>
          <circle cx="68" cy="45" r="1.7" style={{opacity:embedFirstLine}}/>
          <circle cx="8" cy="80" r="1.7" style={{opacity:embedSecondLine}}/>
        </svg>
        <strong className="script-part shape-embed-source" {...part('title','方案')} style={enter()}><MotionIcon text={content.title}/><span>{content.title}</span></strong>
        <strong className="script-part shape-embed-target" {...part('text-0','客户场景')} style={enter(6)}><MotionIcon text={items[0]} index={1}/><span>{items[0]}</span></strong>
        {content.note&&<strong className="script-part shape-embed-result" {...part('note','结果')} style={enter(13)}><MotionIcon text={content.note} index={2}/><span>{content.note}</span></strong>}
      </div>
    </>:scene==='merge'?<>
      <strong className="script-part shape-title" {...part('title','能力主体')} style={enter()}>{content.title}</strong>
      <div className="shape-merge-inputs">{items.slice(0,2).map((item,i)=><div className="script-part shape-merge-input" {...part(`text-${i}`,`能力 ${i+1}`)} style={enter(i+1)} key={i}><MotionIcon text={item} index={i}/><span>{item}</span></div>)}</div>
      <div className="script-part shape-merge-connector" {...part('connector','逐步汇合的连接线')} aria-hidden="true"><svg viewBox="0 0 100 34"><path pathLength="1" d="M18 1 Q24 24 50 32" strokeDasharray={`${lineProgress} 1`}/><path pathLength="1" d="M82 1 Q76 24 50 32" strokeDasharray={`${lineProgress} 1`}/><circle cx="50" cy="32" r="3" style={{opacity:lineProgress}}/></svg></div>
      <strong className="script-part shape-merge-result" {...part('note','补齐结果')} style={enter(3)}><MotionIcon text={content.note || '能力补齐'} index={2}/><span>{content.note || '能力补齐'}</span></strong>
    </>:scene==='ribbon'?<>
      <strong className="script-part shape-title" {...part('title','标题')} style={enter()}>{content.title}</strong>
      {items.map((item,i)=><div className="script-part shape-ribbon" {...part(`row-${i}`,`长条 ${i+1}`)} style={enter(i+1)} key={i}><MotionIcon text={item} index={i} className="script-part"/><span className="script-part" {...part(`text-${i}`,'要点文字')}>{item}</span></div>)}
    </>:<>
      <strong className="script-part shape-title" {...part('title','标题')} style={headingEnter}>{content.title}</strong>
      <div className="shape-cluster">
        {scene==='orbitflow'&&<div className="script-part shape-orbit" {...part('orbit','逐步绘制的协作环')} aria-hidden="true"><svg viewBox="0 0 100 100"><circle className="shape-orbit-track" cx="50" cy="50" r="45"/><circle className="shape-orbit-progress" cx="50" cy="50" r="45" pathLength="1" strokeDasharray={`${lineProgress} 1`} transform="rotate(-90 50 50)"/></svg><i>+</i></div>}
        {scene==='bubbles'&&<svg className="shape-arch-link" viewBox="0 0 100 100" aria-hidden="true"><path pathLength="1" d="M25 50 Q50 -140 76 50" strokeDasharray={`${lineProgress} 1`}/><circle cx="76" cy="50" r="3" style={{opacity:lineProgress}}/></svg>}
        {scene==='fan'&&<svg className="shape-fan-link" viewBox="0 0 100 100" aria-hidden="true"><path pathLength="1" d="M50 94 C34 71 23 45 17 14 M50 94 C66 71 77 45 83 14" strokeDasharray={`${lineProgress} 1`}/></svg>}
        {items.map((item,i)=><div className="shape-slot" key={i} style={{'--i':i,'--count':items.length} as CSSProperties}><div className="script-part shape-node" {...part(`row-${i}`,`节点 ${i+1}`)} style={enter(i+1)}><MotionIcon text={item} index={i} className="script-part"/><strong className="script-part" {...part(`text-${i}`,'要点文字')}>{item}</strong></div></div>)}
      </div>
    </>}
    {content.note&&scene!=='merge'&&scene!=='embed'&&<p className="script-part shape-note" {...part('note','说明')} style={enter(2)}>{content.note}</p>}
  </div>
}
