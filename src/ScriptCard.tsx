import type { CSSProperties } from 'react'
import {memo} from 'react'
import {ReferenceMotion} from './ReferenceMotion'
import type { ScriptContent, ScriptTemplate } from './arrangement'
import { ShapeCard, shapeScenes } from './ShapeCard'
import { ReferenceMotionCard, referenceScenes } from './ReferenceMotionCard'
import { MotionIcon } from './MotionIcon'
import { WorkbenchPromoCard, promoScenes } from './WorkbenchPromoCard'

const wideScenes = ['mediawall', 'pipeline', 'appcluster', 'splitboard', 'documentgrid', 'flowline', 'floatingframes', 'dualmetric'] as const

function WideReferenceCard({ scene, content, elapsed }: { scene: typeof wideScenes[number]; content: ScriptContent; elapsed: number }) {
  const reveal = (delay = 0): CSSProperties => {
    const t = Math.max(0, Math.min(1, (elapsed - delay) / .45)), eased = 1 - (1 - t) ** 3
    return { opacity: eased, transform: `translateY(${(1 - eased) * 24}px) scale(${.94 + eased * .06})` }
  }
  const items = content.items.length ? content.items : ['输入', '协作', '结果']
  const title = content.title || '一套流程，连接完整结果'
  if (scene === 'appcluster') return <div className="app-cluster-layout" data-part-id="panel" data-part-label="应用聚合面板">
    <small>WORKBUDDY / OPEN ECOSYSTEM</small><strong style={reveal(.05)}>{title}</strong>
    <div className="app-cluster-core" style={reveal(.22)}>AI<br /><span>WORKFLOW</span></div>
    {items.slice(0, 6).map((item, index) => <div className={`app-chip app-chip--${index + 1}`} key={item} style={reveal(.28 + index * .1)}><i>{String(index + 1).padStart(2, '0')}</i><b>{item}</b></div>)}
  </div>
  if (scene === 'mediawall') return <div className="media-wall-layout" data-part-id="panel" data-part-label="素材拼贴面板">
    <small>ECOSYSTEM / COLLABORATION</small><strong style={reveal(.05)}>{title}</strong>
    <div className="media-wall-grid">{items.slice(0, 6).map((item, index) => <div className={`media-tile media-tile--${index + 1}`} key={item} style={reveal(.18 + index * .1)}><i /><b>{item}</b></div>)}</div>
  </div>
  if (scene === 'pipeline') return <div className="pipeline-layout" data-part-id="panel" data-part-label="流程泳道面板">
    <small>OPEN NETWORK / 30+ INDUSTRIES</small><strong style={reveal(.05)}>{title}</strong>
    <div className="pipeline-track">{items.slice(0, 4).map((item, index) => <div className={`pipeline-step pipeline-step--${index + 1}`} key={item} style={reveal(.18 + index * .12)}><i>{String(index + 1).padStart(2, '0')}</i><b>{item}</b><span>{index === 0 ? '连接输入' : index === 1 ? '能力协同' : index === 2 ? '行业共建' : 'AI 落地'}</span></div>)}</div>
  </div>
  if (scene === 'splitboard') return <div className="split-board-layout" data-part-id="panel" data-part-label="左右双面板">
    <div className="split-board-pane" style={reveal(.12)}><small>单一厂商</small><strong>{items[0] || '单点能力'}</strong><span>能力发布</span></div><div className="split-board-center" style={reveal(.3)}>→</div><div className="split-board-pane split-board-pane--right" style={reveal(.42)}><small>开放生态</small><strong>{items[1] || '生态共赢'}</strong><span>共同建设</span></div>
  </div>
  if (scene === 'documentgrid') return <div className="document-grid-layout" data-part-id="panel" data-part-label="资料三列面板">
    <small>INDUSTRY / KNOWLEDGE INPUT</small><strong style={reveal(.05)}>{title}</strong><div>{items.slice(0, 3).map((item, index) => <article key={item} style={reveal(.16 + index * .14)}><i>{String(index + 1).padStart(2, '0')}</i><b>{item}</b><span>AI 连接资料</span></article>)}</div>
  </div>
  if (scene === 'flowline') return <div className="flow-line-layout" data-part-id="panel" data-part-label="横向流程面板">
    <small>ONE CLEAR PIPELINE</small><strong style={reveal(.05)}>{title}</strong><div className="flow-line-track">{items.slice(0, 4).map((item, index) => <span key={item} style={reveal(.14 + index * .14)}><i>{String(index + 1).padStart(2, '0')}</i><b>{item}</b></span>)}</div>
  </div>
  if (scene === 'dualmetric') return <div className="dual-metric-layout" data-part-id="panel" data-part-label="双指标面板">
    <small>WHO BENEFITS / OUTCOME</small><strong style={reveal(.05)}>{title}</strong><div className="dual-metric-item dual-metric-item--left" style={reveal(.18)}><b>{items[0] || '成本降低'}</b><span>更廉价</span></div><div className="dual-metric-line" /><div className="dual-metric-item dual-metric-item--right" style={reveal(.38)}><b>{items[1] || '使用便捷'}</b><span>更快捷</span></div>
  </div>
  return <div className="floating-frames-layout" data-part-id="panel" data-part-label="浮动截图组">{items.slice(0, 5).map((item, index) => <div className={`floating-frame floating-frame--${index + 1}`} key={item} style={reveal(.14 + index * .1)}><b>{item}</b><span>{String(index + 1).padStart(2, '0')}</span></div>)}</div>
}

/** The playback clock, not wall time, drives these cards, including reverse seeking. */
export const ScriptCard=memo(function ScriptCard({ scene, content, elapsed, duration, portrait }: { scene: ScriptTemplate; content: ScriptContent; elapsed: number; duration: number; portrait: boolean }) {
  if(scene==='orbitcards')return <ReferenceMotion effect="ref-orbitcards" text={content.title} content={content} time={elapsed} duration={duration}/>
  const reveal = (delay = 0): CSSProperties => {
    const t = Math.max(0, Math.min(1, (elapsed - delay) / .45)), eased = 1 - (1 - t) ** 3
    return { opacity: eased, transform: `translateY(${(1 - eased) * 44 * (content.motion ?? 1)}px) scale(${.88 + eased * .12})` }
  }
  const placement = portrait ? 'bottom' : content.placement
  const typed = Array.from(content.title).slice(0, Math.max(0, Math.floor((elapsed - .15) * 18))).join('')
  const number = Number.parseFloat(content.value.replace(/[^\d.-]/g, ''))
  if ((promoScenes as readonly string[]).includes(scene)) return <WorkbenchPromoCard scene={scene as typeof promoScenes[number]} content={content} elapsed={elapsed} duration={duration} portrait={portrait}/>
  if ((wideScenes as readonly string[]).includes(scene)) return <WideReferenceCard scene={scene as typeof wideScenes[number]} content={content} elapsed={elapsed} />
  if ((referenceScenes as readonly string[]).includes(scene)) return <div className={`script-layout script-layout--${placement} script-layout--${scene} palette-${content.palette ?? 'blue'} ${portrait ? 'script-portrait' : ''}`}><ReferenceMotionCard scene={scene as typeof referenceScenes[number]} content={content} elapsed={elapsed} duration={duration}/></div>
  if (scene === 'symbol') return <div className={`script-layout script-layout--${placement} script-layout--symbol palette-${content.palette ?? 'symbol'} ${portrait ? 'script-portrait' : ''}`}>
    <div className="symbol-story" data-part-id="panel" data-part-label="符号叙事卡">
      <div className="symbol-bubble symbol-bubble--top" style={reveal(.05)}><span className="script-part" data-part-id="title" data-part-label="上方对话">{content.title || '输入被转化为结果'}</span></div>
      <div className="symbol-connector" style={reveal(.2)}><i className="symbol-orb"/><b>→</b><i className="symbol-orb symbol-orb--accent"/></div>
      {content.items.slice(0, 2).map((item, i) => <div key={i} className={`symbol-bubble symbol-bubble--${i ? 'bottom' : 'side'}`} style={reveal(.3 + i * .2)}><span className="script-part" data-part-id={`text-${i}`} data-part-label={`符号说明 ${i + 1}`}>{item}</span></div>)}
      <div className="symbol-conclusion script-part" data-part-id="value" data-part-label="结论牌" style={reveal(.55)}>{content.note || content.value || '关键结论'}</div>
    </div>
  </div>
  const lineProgress = Math.max(0, Math.min(1, elapsed / Math.max(.1, duration)))
  const lineStyle = { '--line-progress': lineProgress } as CSSProperties
  if ((shapeScenes as readonly string[]).includes(scene)) return <div className={`script-layout script-layout--${placement} script-layout--${scene} palette-${content.palette ?? 'indigo'} ${portrait ? 'script-portrait' : ''}`} style={lineStyle}><ShapeCard scene={scene} content={content} elapsed={elapsed} duration={duration}/></div>
  return <div className={`script-layout script-layout--${placement} script-layout--${scene} palette-${content.palette ?? 'indigo'} ${portrait ? 'script-portrait' : ''}`} style={lineStyle}>
    {scene === 'compare' ? <div className="script-comparison">
      {content.items.map((item, i) => <div className="script-part script-option" data-part-id={`option-${i}`} data-part-label={`对比卡 ${i+1}`} key={i} style={reveal(i * .25)}><MotionIcon text={item} index={i} className="script-part"/><strong className="script-part" data-part-id={`text-${i}`} data-part-label={`选项文字 ${i+1}`}>{item}</strong></div>)}
      <span className="script-part script-versus" data-part-id="vs" data-part-label="VS 标记" style={reveal(.15)}>VS</span>
      {content.title && <div className="script-part script-caption" data-part-id="title" data-part-label="标题" style={reveal()}>{content.title}</div>}
    </div> : scene === 'tags' ? <div className="script-part script-panel script-tag-panel" data-part-id="panel" data-part-label="标签云面板" style={reveal()}>
      {content.title && <div className="script-part script-heading" data-part-id="title" data-part-label="标题">{content.title}</div>}
      <div className="script-tag-cloud"><svg className="script-tag-network" viewBox="0 0 100 62" preserveAspectRatio="none" aria-hidden="true"><path pathLength="1" d="M18 15 C36 15 60 15 82 15 L82 47 C60 47 40 47 18 47" strokeDasharray={`${lineProgress} 1`} /></svg>{content.items.map((item, i) => <span className="script-part" data-part-id={`text-${i}`} data-part-label={`标签 ${i + 1}`} key={i} style={reveal(.12 + i * .18)}><MotionIcon text={item} index={i}/><b>{item}</b></span>)}</div>
    </div> : scene === 'triad' ? <div className="script-part script-panel script-triad-panel" data-part-id="panel" data-part-label="三列重点面板" style={reveal()}>
      {content.title && <div className="script-part script-heading" data-part-id="title" data-part-label="标题">{content.title}</div>}
      <div className="script-triad-grid">{content.items.map((item, i) => <div className="script-part" data-part-id={`row-${i}`} data-part-label={`重点 ${i + 1}`} key={i} style={reveal(.15 + i * .22)}><MotionIcon text={item} index={i}/><strong className="script-part" data-part-id={`text-${i}`} data-part-label={`重点文字 ${i + 1}`}>{item}</strong></div>)}</div>
    </div> : scene === 'timeline' ? <div className="script-part script-panel script-timeline-panel" data-part-id="panel" data-part-label="时间轴面板" style={reveal()}>
      {content.title && <div className="script-part script-heading" data-part-id="title" data-part-label="标题">{content.title}</div>}
      <div className="script-time-rail">{content.items.map((item, i) => <div className="script-part" data-part-id={`row-${i}`} data-part-label={`节点 ${i + 1}`} key={i} style={reveal(.15 + i * .22)}><i /><MotionIcon text={item} index={i}/><span className="script-part" data-part-id={`text-${i}`} data-part-label={`节点文字 ${i + 1}`}>{item}</span></div>)}</div>
    </div> : scene === 'progress' ? <div className="script-part script-panel script-progress-panel" data-part-id="panel" data-part-label="进度面板" style={reveal()}>
      <div className="script-part script-value" data-part-id="value" data-part-label="进度数值" style={reveal(.1)}>{content.value}</div>
      {content.title && <div className="script-part script-heading" data-part-id="title" data-part-label="标题">{content.title}</div>}
      <div className="script-progress-track"><i style={{width:`${Math.max(0,Math.min(100,Number.isFinite(number)?number:60))}%`}} /></div>
      {content.note && <div className="script-part script-note" data-part-id="note" data-part-label="补充说明">{content.note}</div>}
    </div> : scene === 'person' ? <div className="script-part script-panel script-person-panel" data-part-id="panel" data-part-label="人物履历面板" style={reveal()}>
      <div className="script-person-mark" style={reveal(.08)}><MotionIcon text={content.value || content.title} index={-1}/><span>经验</span></div>
      <div className="script-person-copy">
        {content.value && <div className="script-part script-person-fact script-person-fact--primary" data-part-id="value" data-part-label="主要履历" style={reveal(.16)}><MotionIcon text={content.value} index={-1}/><b>{content.value}</b></div>}
        {content.note && <div className="script-part script-person-fact" data-part-id="note" data-part-label="近期履历" style={reveal(.3)}><MotionIcon text={content.note} index={-1}/><span>{content.note}</span></div>}
        <div className="script-part script-heading" data-part-id="title" data-part-label="履历结论" style={reveal(.42)}>{content.title}</div>
      </div>
    </div> : scene === 'loop' ? <div className="script-part script-panel script-loop-panel" data-part-id="panel" data-part-label="闭环流程面板" style={reveal()}>
      {content.title && <div className="script-part script-heading" data-part-id="title" data-part-label="标题">{content.title}</div>}
      <div className="script-loop-flow" style={{'--node-count':content.items.length} as CSSProperties}>{content.items.map((item, i) => <div className="script-part" data-part-id={`row-${i}`} data-part-label={`流程节点 ${i + 1}`} key={i} style={{...reveal(.15 + i * .22),'--node-index':i} as CSSProperties}><MotionIcon text={item} index={i}/><span className="script-part" data-part-id={`text-${i}`} data-part-label={`节点文字 ${i + 1}`}>{item}</span></div>)}</div>
    </div> : <div className="script-part script-panel" data-part-id="panel" data-part-label="卡片面板" style={reveal()}>
      {scene === 'question' && <span className="script-part script-question" data-part-id="question" data-part-label="问号">?</span>}
      {scene === 'metric' && <div className="script-part script-value" data-part-id="value" data-part-label="核心数值" style={reveal(.15)}>{content.value}</div>}
      {content.title && <div className="script-part script-heading" data-part-id="title" data-part-label="标题">{scene === 'bottomquote' ? <><span className="script-type-reserve" aria-hidden="true">{content.title}</span><span className="script-type-live">{typed}</span></> : content.title}</div>}
      {content.items.length > 0 && <div className="script-items">{content.items.map((item, i) => <div className="script-part script-item" data-part-id={`row-${i}`} data-part-label={`要点行 ${i+1}`} key={i} style={reveal(.2 + i * .35)}><MotionIcon text={item} index={i} className="script-part"/><span className="script-part" data-part-id={`text-${i}`} data-part-label={`要点文字 ${i+1}`}>{item}</span></div>)}</div>}
      {content.note && <div className="script-part script-note" data-part-id="note" data-part-label="补充说明" style={reveal(.35)}>{content.note}</div>}
    </div>}
  </div>
})
