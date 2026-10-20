import type { CSSProperties, ReactNode } from 'react'
import type { ScriptContent, ScriptTemplate } from './arrangement'

export const promoScenes = ['editpain','commandrun','workflowmap','scriptread','rhythmscan','motionmatch','screenblend','exportpaths','commentprompt'] as const satisfies readonly ScriptTemplate[]
type PromoScene = typeof promoScenes[number]
const part = (id:string,label:string) => ({'data-part-id':id,'data-part-label':label})

function Icon({kind}:{kind:string}) {
  const paths:Record<string,ReactNode> = {
    scissors:<><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="m8 8 12 12M8 16 20 4M14 10l-2 2"/></>,
    film:<><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4m-10-5 4 2-4 2z"/></>,
    spark:<><path d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5Z"/><path d="M20 2v4M18 4h4"/></>,
    clock:<><circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 3"/></>,
    document:<><path d="M6 2h9l4 4v16H6zM15 2v5h4M9 11h7M9 15h7M9 19h4"/></>,
    wave:<path d="M3 9v6M6 5v14M9 8v8M12 2v20M15 6v12M18 4v16M21 9v6"/>,
    layers:<><path d="m12 3 10 6-10 6L2 9Zm-9 11 9 6 9-6M3 18l9 5 9-5"/></>,
    window:<><rect x="2" y="3" width="20" height="18" rx="3"/><path d="M2 8h20M6 5.5h.1M9 5.5h.1M12 5.5h.1m-3 7 6 3-6 3z"/></>,
    download:<><path d="M12 2v13m-5-5 5 5 5-5M4 16v6h16v-6"/></>,
    compare:<><rect x="2" y="4" width="8" height="16" rx="2"/><rect x="14" y="4" width="8" height="16" rx="2"/><path d="M5 9h2M17 15h2M5 13h2M17 9h2"/></>,
    number:<><path d="M8 3 6 21M17 3l-2 18M3 9h18M2 15h18"/></>,
    steps:<><path d="M2 21h6v-6h6V9h8V3M4 4h6M4 8h3"/></>,
    chat:<><path d="M4 3h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H9l-6 4V5a2 2 0 0 1 1-2Z"/><path d="M7 8h10M7 12h6"/></>,
    gift:<><rect x="3" y="9" width="18" height="4" rx="1"/><path d="M5 13v9h14v-9M12 9v13"/><path d="M12 9C4 9 4 1 9 3c3 1 3 6 3 6Zm0 0c8 0 8-8 3-6-3 1-3 6-3 6Z"/></>,
    cursor:<path d="M4 2v18l5-5 4 7 4-2-4-7h7Z"/>,
  }
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[kind]??paths.spark}</svg>
}

/** Illustrated objects and compact type share a protected lower-third stage. */
export function WorkbenchPromoCard({scene,content,elapsed,duration,portrait}:{scene:PromoScene;content:ScriptContent;elapsed:number;duration:number;portrait:boolean}) {
  const enter=(delay=0,rotate=0):CSSProperties=>{
    const p=Math.min(1,Math.max(0,(elapsed-delay)/.45)),e=1-(1-p)**3
    return {opacity:e,transform:`translateY(${(1-e)*22}px) rotate(${rotate}deg) scale(${.84+.16*e})`}
  }
  const items=content.items
  const token=(text:string,kind:string,index:number,delay=.12+index*.22)=><div className={`wb-object wb-object--${index}`} {...part(`row-${index}`,`图标与文字 ${index+1}`)} style={enter(delay,index%2?3:-3)} key={index}><span className="wb-object-icon"><Icon kind={kind}/></span><b {...part(`text-${index}`,`文字 ${index+1}`)}>{text}</b></div>
  const detailDelay=scene==='exportpaths'?4.13:scene==='commentprompt'&&content.value!=='gift'?3.63:scene==='editpain'&&content.value==='night'?2.4:scene==='commandrun'?2.35:.6
  return <div className={`wb-promo wb-promo--${scene} ${portrait?'wb-promo--portrait':''} palette-${content.palette??'warm'}`}>
    <div className="wb-stage" {...part('panel','插图与文案组合')}>
      <strong className="wb-heading" {...part('title','小标题')} style={enter()}>{content.title}</strong>
      <div className="wb-body">
        {scene==='editpain'&&<>
          {content.value==='scissors'?<div className="wb-cut-symbol" style={enter(.1)}><Icon kind="scissors"/><span>剪辑</span><i style={{transform:`scaleX(${Math.min(1,Math.max(0,(elapsed-2.55)/.35))})`}}/></div>:<div className="wb-pain-objects">{(items.length?items:['手动做图','对动效']).map((text,index)=>token(text,/素材|B-roll/.test(text)?'film':'spark',index))}<span className="wb-clock" style={enter(.32,8)}><Icon kind="clock"/></span></div>}
          <div className="wb-mini-timeline" aria-hidden="true">{[0,1,2,3,4,5,6].map(i=><i key={i} style={enter(.16+i*.07)}/>)}<span style={{left:`${8+76*Math.min(1,elapsed/Math.max(1,duration))}%`}}/></div>
        </>}
        {scene==='commandrun'&&<div className="wb-command"><span className="wb-command-icon" style={enter(.1)}><Icon kind="scissors"/></span><div className="wb-command-input" style={enter(.2)}><i>›</i><b>{items[0]||'给命令'}</b><span className="wb-command-caret" style={{opacity:elapsed%1<.55?1:0}}/></div><span className="wb-command-arrow" style={enter(.6)}>→</span><div className="wb-command-output" style={enter(content.value==='result'?.85:2.35)}><Icon kind="film"/><b>{items[1]||'成片'}</b></div></div>}
        {scene==='workflowmap'&&<div className="wb-workflow"><svg viewBox="0 0 1000 120" preserveAspectRatio="none" aria-hidden="true"><path d="M90 75Q195 5 290 75T490 75T690 75T910 75" pathLength="1" strokeDasharray={`${Math.min(1,elapsed/4.6)} 1`}/></svg>{items.map((text,index)=><div className="wb-workflow-node" {...part(`row-${index}`,`流程步骤 ${index+1}`)} style={enter(index<2?1.13+index*.12:3.2+(index-2)*.12)} key={index}><span><Icon kind={['document','wave','spark','layers','download'][index]}/><i>{index+1}</i></span><b {...part(`text-${index}`,`步骤 ${index+1}`)}>{text}</b></div>)}</div>}
        {scene==='scriptread'&&<div className="wb-script"><div className="wb-script-paper" style={enter(.1,-5)}><Icon kind="document"/><span>字幕</span><i/><i/><i/></div><span className="wb-link" style={enter(1.2)}>→</span><div className="wb-time-stack" style={enter(2.72)}><div><Icon kind="clock"/><b>文案</b><i>时间点</i></div><div><Icon kind="document"/><b>逐句对齐</b><span>✓</span></div></div></div>}
        {scene==='rhythmscan'&&<div className="wb-rhythm"><div className="wb-wave" style={enter(.1)}>{Array.from({length:35},(_,i)=><i key={i} style={{height:`${18+Math.abs(Math.sin(i*1.7))*74}%`,opacity:Math.min(1,Math.max(.2,(elapsed*7-i)/4))}}/>)}<span className="wb-scan-line" style={{left:`${Math.min(94,elapsed/Math.max(1,duration)*94)}%`}}/></div><div className="wb-rhythm-tags">{(items.length?items:['气口','节奏','重点']).map((text,i)=><span {...part(`text-${i}`,`节奏标记 ${i+1}`)} style={enter(1.73+i*.65)} key={i}>{text}</span>)}</div></div>}
        {scene==='motionmatch'&&<div className={`wb-match wb-match--${items.length}`}>{items.map((text,index)=>token(text,/数字/.test(text)?'number':/对比/.test(text)?'compare':'steps',index,content.value==='keywords'?.1+index*.25:1.47+index*1.43))}<span className="wb-match-link" aria-hidden="true" style={enter(.6)}>↔</span></div>}
        {scene==='screenblend'&&<div className={`wb-screen-scene ${content.value==='drag'?'wb-screen-scene--drag':''}`}><div className="wb-screen" style={enter(.12,-3)}><div className="wb-screen-top"><i/><i/><i/><span>素材窗口</span></div><div className="wb-screen-art"><Icon kind="film"/><div><i/><i/></div></div><span className="wb-corner wb-corner--tl"/><span className="wb-corner wb-corner--tr"/><span className="wb-corner wb-corner--bl"/><span className="wb-corner wb-corner--br"/></div><div className="wb-screen-tags">{items.map((text,i)=><span {...part(`text-${i}`,`融合要点 ${i+1}`)} style={enter(content.value==='drag'?.12+i*.2:1.7+i*1.3)} key={i}><Icon kind={i?'layers':'film'}/><b>{text}</b></span>)}</div><div className="wb-drag-cursor" style={{...enter(.4),transform:`translate(${Math.sin(Math.min(1,elapsed/1.2)*Math.PI)*18}px,${Math.cos(Math.min(1,elapsed/1.2)*Math.PI)*8}px)`}}><Icon kind="cursor"/></div></div>}
        {scene==='exportpaths'&&<div className="wb-export">{items.map((text,i)=><div className={`wb-export-file wb-export-file--${i}`} {...part(`row-${i}`,`导出方式 ${i+1}`)} style={enter(i?1.87:.1,i?4:-4)} key={i}><span className="wb-file-icon"><Icon kind={i?'layers':'film'}/></span><b {...part(`text-${i}`,`格式 ${i+1}`)}>{text}</b><i>{i?'透明动效层':'完整视频'}</i>{i===1&&<span className="wb-alpha-grid" aria-hidden="true"/>}</div>)}<span className="wb-export-link" style={enter(2.4)}>＋</span></div>}
        {scene==='commentprompt'&&<div className="wb-comment"><span className="wb-comment-icon" style={enter(.1,content.value==='gift'?7:-5)}><Icon kind={content.value==='gift'?'gift':'chat'}/></span><div className="wb-comment-copy" style={enter(.2)}><b>{items[0]||'你要花多久？'}</b>{content.value!=='gift'&&<div className="wb-comment-dots">{[0,1,2].map(i=><i key={i} style={{opacity:.35+.65*Math.abs(Math.sin(elapsed*3-i))}}/>)}</div>}</div></div>}
      </div>
      {content.note&&<span className="wb-note" {...part('note','补充文案')} style={enter(detailDelay)}>{content.note}</span>}
    </div>
  </div>
}
