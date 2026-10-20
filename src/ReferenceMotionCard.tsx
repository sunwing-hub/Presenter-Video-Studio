import type { CSSProperties } from 'react'
import type { ScriptContent, ScriptTemplate } from './arrangement'

export const referenceScenes = [
  'thinkcloud', 'questionstack', 'appburst', 'docrelay',
  'choicehub', 'checknote', 'growthpath', 'actionwindow', 'alertstamp',
  'arrowcallout', 'beforeafter', 'filedrawer', 'insightpulse',
] as const satisfies readonly ScriptTemplate[]

type ReferenceScene = typeof referenceScenes[number]

const clamp = (value: number) => Math.max(0, Math.min(1, value))
const ease = (value: number) => 1 - (1 - clamp(value)) ** 3

function Glyph({ index }: { index: number }) {
  const paths = [
    <><rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/></>,
    <><path d="M3 13h3l2-6 4 10 3-7 2 3h4"/><circle cx="18" cy="5" r="1"/></>,
    <><path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11Z"/><circle cx="12" cy="10" r="2.2"/></>,
    <><path d="M4 5h7l2 2h7v12H4z"/><path d="M7 11h10M7 14h7"/></>,
  ]
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[index % paths.length]}</svg>
}

/** All motion is a pure function of the video playhead, including reverse seeking and export. */
export function ReferenceMotionCard({ scene, content, elapsed, duration }: { scene: ReferenceScene; content: ScriptContent; elapsed: number; duration: number }) {
  const phase = clamp(elapsed / Math.max(.1, duration))
  const amplitude = Math.max(.5, Math.min(2, content.motion ?? 1))
  const progress = (from: number, length = .18) => ease((phase - from) / length)
  const rise = (from: number, distance = 24): CSSProperties => {
    const p = progress(from)
    return { opacity: p, transform: `translateY(${(1 - p) * distance * amplitude}px) scale(${.9 + .1 * p})` }
  }
  const draw = (from: number, length = .6) => `${progress(from, length)} 1`
  const part = (id: string, label: string) => ({ 'data-part-id': id, 'data-part-label': label })
  const items = content.items.filter(Boolean)
  const title = content.title || '这一刻，值得看清'
  const note = content.note || ''

  return <div className={`ref-motion ref-motion--${scene} ${content.minimal ? 'ref-motion--minimal' : ''}`} {...part('panel', '参考动效面板')}>
    {scene === 'thinkcloud' && <>
      <span className="ref-kicker" style={rise(.02)}>QUESTION / THINK</span>
      <div className="ref-think-wrap">
        <div className="ref-think-dot ref-think-dot--one" style={rise(.06)} />
        <div className="ref-think-dot ref-think-dot--two" style={rise(.13)} />
        <svg className="ref-think-cloud" viewBox="0 0 600 360" preserveAspectRatio="none" aria-hidden="true">
          <path className="ref-think-fill" d="M120 305C40 300 15 230 67 176C61 97 139 45 210 72C261 12 365 20 413 84C503 53 570 112 548 193C605 248 552 319 477 309Z"/>
          <path className="ref-think-outline" d="M120 305C40 300 15 230 67 176C61 97 139 45 210 72C261 12 365 20 413 84C503 53 570 112 548 193C605 248 552 319 477 309Z" pathLength="1" strokeDasharray={draw(.04, .58)}/>
        </svg>
        <strong className="ref-think-title" {...part('title', '思考问题')} style={rise(.23)}>{title}</strong>
      </div>
      {note && <span className="ref-footnote" {...part('note', '补充说明')} style={rise(.55)}>{note}</span>}
    </>}

    {scene === 'questionstack' && <>
      <span className="ref-kicker" style={rise(.02)}>IDEAS / QUESTIONS</span>
      <strong className="ref-heading" {...part('title', '标题')} style={rise(.04)}>{title}</strong>
      <div className="ref-speech-stack">
        {(items.length ? items : ['第一步是什么？', '接下来怎么做？', '最后得到什么？']).slice(0, 4).map((item, index) => <div className={`ref-speech ref-speech--${index + 1}`} {...part(`row-${index}`, `问句 ${index + 1}`)} style={rise(.16 + index * .15, 36)} key={`${index}-${item}`}>
          <span className="ref-speech-icon"><Glyph index={index} /></span>
          <b {...part(`text-${index}`, `问句文字 ${index + 1}`)}>{item}</b>
        </div>)}
      </div>
      {note && <span className="ref-footnote" {...part('note', '补充说明')} style={rise(.75)}>{note}</span>}
    </>}

    {scene === 'appburst' && <>
      <span className="ref-kicker" style={rise(.02)}>TOOLKIT / IN MOTION</span>
      <strong className="ref-heading" {...part('title', '工具主题')} style={rise(.04)}>{title}</strong>
      <div className="ref-app-stage">
        <div className="ref-phone" style={rise(.08)}><div className="ref-phone-glow"/><div className="ref-phone-screen"><span/><b>AI</b><i/></div></div>
        {(items.length ? items : ['输入', '定位', '声音', '交付']).slice(0, 4).map((item, index) => {
          const p = progress(.17 + index * .13)
          return <div className={`ref-app-icon ref-app-icon--${index + 1}`} {...part(`row-${index}`, `应用图标 ${index + 1}`)} style={{ opacity: p, transform: `translateY(${(1 - p) * 75 * amplitude}px) rotate(${(1 - p) * (index % 2 ? 18 : -18)}deg) scale(${.5 + .5 * p})` }} key={`${index}-${item}`}>
            <Glyph index={index}/><b {...part(`text-${index}`, `应用名称 ${index + 1}`)}>{item}</b>
          </div>
        })}
      </div>
      {note && <span className="ref-footnote" {...part('note', '补充说明')} style={rise(.77)}>{note}</span>}
    </>}

    {scene === 'docrelay' && <>
      <strong className="ref-heading" {...part('title', '流程标题')} style={{opacity:1,transform:'none'}}>{title}</strong>
      <div className="ref-doc-rail">
        <svg className="ref-doc-connector" viewBox="0 0 600 70" preserveAspectRatio="none" aria-hidden="true"><path d="M70 35H530" pathLength="1" strokeDasharray={draw(.16, .58)}/><path d="m520 24 14 11-14 11" style={{opacity:progress(.68)}}/></svg>
        {(items.length ? items : ['生成', '修改', '完成']).slice(0, 3).map((item, index) => <div className={`ref-doc-step ref-doc-step--${index + 1}`} {...part(`row-${index}`, `文档步骤 ${index + 1}`)} style={rise(.13 + index * .23)} key={`${index}-${item}`}>
          <div className="ref-doc-paper"><i/><i/><i/>{index === 2 && <span className="ref-doc-check" style={rise(.7)}>✓</span>}{index === 1 && <span className="ref-doc-pencil">╱</span>}</div>
          <b {...part(`text-${index}`, `步骤文字 ${index + 1}`)}>{item}</b>
        </div>)}
      </div>
      {note && <span className="ref-footnote" {...part('note', '补充说明')} style={rise(.78)}>{note}</span>}
    </>}

    {scene === 'choicehub' && <>
      <span className="ref-kicker" style={rise(.02)}>FILTER / FOCUS</span>
      <div className="ref-choice-stage">
        {(items.length ? items : ['选项 A', '选项 B', '选项 C', '选项 D']).slice(0, 4).map((item, index) => <span className={`ref-choice-option ref-choice-option--${index + 1}`} {...part(`row-${index}`, `备选项 ${index + 1}`)} style={rise(.1 + index * .12)} key={`${index}-${item}`}><Glyph index={index}/><b {...part(`text-${index}`, `选项文字 ${index + 1}`)}>{item}</b><i style={{opacity:progress(.58 + index * .05)}}>×</i></span>)}
        <strong className="ref-choice-core" {...part('title', '聚焦结论')} style={rise(.62, 0)}><span>✓</span>{title}</strong>
      </div>
      {note && <span className="ref-footnote" {...part('note', '补充说明')} style={rise(.82)}>{note}</span>}
    </>}

    {scene === 'checknote' && <>
      <div className="ref-check-sheet" style={rise(.03)}>
        <span className="ref-check-bookmark"/>
        <span className="ref-kicker">TO DO / CONFIRM</span>
        <strong className="ref-heading" {...part('title', '清单标题')}>{title}</strong>
        <div className="ref-check-rows">{(items.length ? items : ['明确目标', '完成核对', '交付结果']).slice(0, 4).map((item, index) => <div className="ref-check-row" {...part(`row-${index}`, `清单项 ${index + 1}`)} style={rise(.17 + index * .16)} key={`${index}-${item}`}><span className="ref-check-box"><i style={{opacity:progress(.25 + index * .16),transform:`scale(${.6 + .4 * progress(.25 + index * .16)})`}}>✓</i></span><b {...part(`text-${index}`, `清单文字 ${index + 1}`)}>{item}</b></div>)}</div>
        {note && <small className="ref-check-note" {...part('note', '清单说明')} style={rise(.8)}>{note}</small>}
      </div>
    </>}

    {scene === 'growthpath' && <>
      <span className="ref-kicker" style={rise(.02)}>STEP BY STEP / GROWTH</span>
      <strong className="ref-heading" {...part('title', '增长主题')} style={rise(.04)}>{title}</strong>
      <div className="ref-growth-stage">
        <svg className="ref-growth-curve" viewBox="0 0 600 330" preserveAspectRatio="none" aria-hidden="true"><path d="M34 282 C160 281 170 250 240 210 C338 160 403 142 538 29" pathLength="1" strokeDasharray={draw(.13, .68)}/><path d="m510 35 33-17-4 41" style={{opacity:progress(.75)}}/></svg>
        {(items.length ? items : ['起步', '养成习惯', '持续增加']).slice(0, 3).map((item, index) => <div className={`ref-growth-step ref-growth-step--${index + 1}`} {...part(`row-${index}`, `增长阶段 ${index + 1}`)} style={rise(.18 + index * .19)} key={`${index}-${item}`}><small>0{index + 1}</small><b {...part(`text-${index}`, `阶段文字 ${index + 1}`)}>{item}</b></div>)}
      </div>
      {note && <span className="ref-footnote" {...part('note', '补充说明')} style={rise(.8)}>{note}</span>}
    </>}

    {scene === 'actionwindow' && <>
      <div className="ref-window" style={rise(.03)}>
        <div className="ref-window-bar"><i/><i/><i/><span>ASSISTANT / ACTION</span></div>
        <div className="ref-window-body"><div className="ref-window-avatar"><Glyph index={0}/></div><strong {...part('title', '窗口标题')} style={rise(.12)}>{title}</strong>{items[0] && <p {...part('text-0', '窗口说明')} style={rise(.27)}>{items[0]}</p>}<div className="ref-window-action" {...part('note', '操作按钮')} style={rise(.48)}>{note || title}<span>↗</span></div><svg className="ref-window-cursor" viewBox="0 0 55 70" style={{opacity:progress(.64),transform:`translate(${(1-progress(.64))*50}px,${(1-progress(.64))*38}px)`}} aria-hidden="true"><path d="M5 3 6 56 19 44 31 66 43 60 31 39 49 37Z"/></svg></div>
      </div>
    </>}

    {scene === 'alertstamp' && <>
      <span className="ref-kicker" style={rise(.02)}>ATTENTION / KEY POINT</span>
      <div className="ref-alert-paper" style={{opacity:progress(.14),transform:`rotate(${(1-progress(.14))*-9-3}deg) scale(${.66 + .34*progress(.14)})`}}>
        <strong {...part('title', '强调词')}>{title}</strong><span className="ref-alert-mark">!</span>
      </div>
      {note && <span className="ref-footnote" {...part('note', '补充说明')} style={rise(.55)}>{note}</span>}
    </>}

    {scene === 'arrowcallout' && <>
      <span className="ref-kicker" style={rise(.02)}>ACTION / NEXT STEP</span>
      <div className="ref-arrow-callout" style={{opacity:progress(.08),transform:`scaleX(${.12+.88*progress(.08,.44)})`}}>
        <svg className="ref-arrow-silhouette" viewBox="0 0 670 250" preserveAspectRatio="none" aria-hidden="true"><path d="M35 25H465V3L652 125 465 247V225H35Q10 225 10 200V50Q10 25 35 25Z"/></svg>
        <strong {...part('title', '箭头文案')} style={{opacity:progress(.48)}}>{title}</strong>
      </div>
      {note && <span className="ref-footnote" {...part('note', '补充说明')} style={rise(.7)}>{note}</span>}
    </>}

    {scene === 'beforeafter' && <>
      <span className="ref-kicker" style={rise(.02)}>BEFORE / AFTER</span>
      <strong className="ref-heading" {...part('title', '对比主题')} style={rise(.04)}>{title}</strong>
      <div className="ref-beforeafter-stage">
        <div className="ref-before-card" {...part('row-0', '原有状态')} style={rise(.15)}><small>BEFORE</small><b {...part('text-0', '原有状态文字')}>{items[0] || '普通输出'}</b><i/><i/><i/></div>
        <span className="ref-compare-arrow" style={{opacity:progress(.33),transform:`translateX(${(1-progress(.33))*-24}px)`}}>→</span>
        <div className="ref-after-card" {...part('row-1', '改进状态')} style={rise(.46)}><small>AFTER</small><b {...part('text-1', '改进状态文字')}>{items[1] || '更像你写的'}</b><svg viewBox="0 0 130 130" aria-hidden="true"><path d="M65 18C37 18 19 38 19 63c0 21 7 31 7 47M65 29C43 29 31 46 31 65c0 20 9 32 11 49M65 42c-13 0-22 9-22 22 0 18 8 31 16 48M65 18c28 0 47 20 47 46 0 18-3 37-14 53M65 30c21 0 35 15 35 34 0 17-4 35-13 49M65 44c12 0 20 10 20 23 0 17-2 30-8 42M65 57c-5 0-9 5-9 12 0 12 4 24 9 35M70 60c5 10 2 24 0 32" pathLength="1" strokeDasharray={draw(.57,.35)}/></svg></div>
      </div>
      {note && <span className="ref-footnote" {...part('note', '补充说明')} style={rise(.82)}>{note}</span>}
    </>}

    {scene === 'filedrawer' && <>
      <span className="ref-kicker" style={rise(.02)}>FILE / ORGANIZE</span>
      <strong className="ref-heading" {...part('title', '整理主题')} style={rise(.04)}>{title}</strong>
      <div className={`ref-file-stage ${items.length > 3 ? 'ref-file-stage--four' : ''}`}>
        <div className="ref-folder-back" style={rise(.1)}/>
        {(items.length ? items : ['资料一','资料二','资料三']).slice(0,4).map((item,index)=><div className={`ref-folder-paper ref-folder-paper--${index+1}`} {...part(`row-${index}`,`资料 ${index+1}`)} style={{opacity:progress(.18+index*.16),transform:`translateY(${(1-progress(.18+index*.16))*-94}px)`}} key={`${index}-${item}`}><span>0{index+1}</span><b {...part(`text-${index}`,`资料名称 ${index+1}`)}>{item}</b><i/><i/></div>)}
        <div className="ref-folder-front" style={rise(.52)}><span>ARCHIVE</span><i/></div>
      </div>
      {note && <span className="ref-footnote" {...part('note', '补充说明')} style={rise(.82)}>{note}</span>}
    </>}

    {scene === 'insightpulse' && <>
      <span className="ref-kicker" style={rise(.02)}>FIELD VOICES / SHARED SIGNAL</span>
      <div className="ref-insight-stage">
        <div className="ref-insight-source" {...part('row-0', '交流对象')} style={rise(.08)}><span>✦</span><b {...part('text-0', '交流对象文字')}>{items[0] || '交流中的观点'}</b></div>
        <svg className="ref-insight-lines" viewBox="0 0 620 390" preserveAspectRatio="none" aria-hidden="true">
          <path d="M122 150 C198 165 250 260 405 305" pathLength="1" strokeDasharray={draw(.28,.4)}/>
          <path d="M485 133 C475 187 445 265 405 305" pathLength="1" strokeDasharray={draw(.37,.4)}/>
          <path d="M255 262 C310 285 352 304 405 305" pathLength="1" strokeDasharray={draw(.44,.34)}/>
        </svg>
        {[0,1,2].map(index => <div className={`ref-insight-voice ref-insight-voice--${index+1}`} style={rise(.17+index*.12,35)} key={index}><i/><i/><i/></div>)}
        <div className="ref-insight-core" {...part('title', '汇合判断')} style={rise(.62,28)}><span>≈</span><strong>{title}</strong></div>
      </div>
      {note && <span className="ref-footnote" {...part('note', '补充说明')} style={rise(.8)}>{note}</span>}
    </>}
  </div>
}
