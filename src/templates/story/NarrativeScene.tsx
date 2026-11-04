import type {CSSProperties,ReactNode} from 'react'
import {HandbookNarrativeGraphic} from './HandbookNarrativeGraphic'
import {EnterpriseNarrativeGraphic} from './EnterpriseNarrativeGraphic'
import {MaterialVideo} from '../../MaterialVideo'
import {ease,storyAt,storyCaptionAt,type StoryProject} from './storyModel.mjs'
const K={bg:'#081523',panel:'#142c42',line:'#42647c',ink:'#f1f6fa',muted:'#a5bbcd',accent:'#8ce2c7',warm:'#f1c38a'}
const lerp=(a:number,b:number,p:number)=>a+(b-a)*p
function Txt({x,y,children,size=42,fill=K.ink,anchor='middle',weight=700}:{x:number;y:number;children:ReactNode;size?:number;fill?:string;anchor?:'start'|'middle'|'end';weight?:number}){return <text x={x} y={y} fontSize={size} fill={fill} textAnchor={anchor} fontWeight={weight}>{children}</text>}
function Reveal({p,children,dx=0}:{p:number;children:ReactNode;dx?:number}){return <g opacity={p} transform={`translate(${dx*(1-p)} ${18*(1-p)})`}>{children}</g>}
function Panel({x,y,w=830,h=160,title,sub,p=1,accent=false}:{x:number;y:number;w?:number;h?:number;title:string;sub?:string;p?:number;accent?:boolean}){
 const linear=1-Math.cbrt(1-p),label=ease((linear-.15)/.55),detail=ease((linear-.42)/.5)
 return <g opacity={p}><rect x={x} y={y} width={w} height={h} rx={25} fill={accent?'#193f43':K.panel} stroke={accent?K.accent:K.line} strokeWidth={2.5}/><g opacity={label} transform={`translate(0 ${11*(1-label)})`}><Txt x={x+w/2} y={y+(sub?h*.43:h/2+15)} size={Math.min(48,(w-70)/[...title].reduce((n,c)=>n+(/[\u0000-\u007f]/.test(c)?.55:1),0))} fill={accent?K.accent:K.ink}>{title}</Txt></g>{sub&&<g opacity={detail}><Txt x={x+w/2} y={y+h*.76} size={28} fill={K.muted} weight={500}>{sub}</Txt></g>}</g>
}
function Line({d,p=1}:{d:string;p?:number}){return <path d={d} fill="none" stroke={K.accent} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1-p} opacity={p>0?1:0}/>}
export function NarrativeScene({project,time,portrait,playing=false,rendering=false}:{project:StoryProject;time:number;portrait:boolean;playing?:boolean;rendering?:boolean}){
 const state=storyAt(project,time),s=state.scene,mode=s.narrativeKind??'statement',brands=project.brands??[],b=s.beats??s.events.map(e=>e.at),p=(i:number,delay=0,duration=.65)=>ease((time-(b[i]??s.start)-delay)/duration)
 // 参数化：labels 驱动图解文案；未提供 labels 的旧工程回落到默认文案，保证历史工程复现不变样
 const lab=(i:number,fallback:string)=>(s.labels&&typeof s.labels[i]==='string'&&s.labels[i].trim())||fallback
 const W=portrait?1080:1920,H=portrait?1920:1080,rect=(hero:boolean,opening=false)=>portrait?(hero?(opening?{x:160,y:80,w:760,h:1100,r:34}:{x:40,y:80,w:1000,h:1460,r:34}):{x:72,y:1290,w:235,h:235,r:118}):(hero?{x:0,y:0,w:1920,h:1080,r:0}:{x:65,y:770,w:235,h:235,r:118})
 const target=rect(s.presenter==='hero',mode==='hook'||mode==='evidence'),from=state.previous?rect(state.previous.presenter==='hero',state.previous.narrativeKind==='hook'||state.previous.narrativeKind==='evidence'):target,enter=ease(state.local/.62),r=Object.fromEntries(Object.keys(target).map(k=>[k,lerp(from[k as keyof typeof from],target[k as keyof typeof target],enter)])) as typeof target
 const heroRatio=lerp(state.previous?(state.previous.presenter==='hero'?1:0):(s.presenter==='hero'?1:0),s.presenter==='hero'?1:0,enter)
 const pos=(x:number,y:number,w:number,h:number):CSSProperties=>({position:'absolute',left:x/W*100+'%',top:y/H*100+'%',width:w/W*100+'%',height:h/H*100+'%'})
 const brand=brands.find(a=>a.id===s.brandId),caption=storyCaptionAt(project.cues,time,18),base=s.broll,at=base?.startAt??s.start,until=base?.endAt??s.end,showBroll=!!base&&time>=at&&time<until
 const scale=portrait?1:.63,ox=portrait?0:630,oy=portrait?0:-40,blockOpacity=state.previous&&s.presenter!==state.previous.presenter?ease((state.local-.22)/.4):ease(state.local/.4)
 const lines=s.title.split('\n')
 // 字幕高亮词表：工程可传 highlightLexicon；未提供时回落到历史词表，旧工程不变样
 const esc=(v:string)=>v.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')
 const lex=(project.highlightLexicon&&project.highlightLexicon.length?project.highlightLexicon:['AI Agent','OpenAI dots','Grok Bot','Claude Duet','Skills','4000','Opus 5.5','确认','授权']).map(esc)
 const highlightRe=lex.length?new RegExp('('+lex.join('|')+')','g'):/(?!)/g
 const brandCard=(id:string,x:number,y:number,w:number,h:number,progress:number,selected=false)=>{const a=brands.find(v=>v.id===id);if(!a)return null;const logoSize=Math.min(135,w*.48);return <Reveal key={id} p={progress}><rect x={x} y={y} width={w} height={h} rx={28} fill={selected?'#1a4145':K.panel} stroke={selected?K.accent:K.line} strokeWidth={selected?4:2}/><image href={'/__studio/media/'+a.logoMediaId} x={x+(w-logoSize)/2} y={y+24} width={logoSize} height={logoSize}/><g opacity={ease((progress-.3)/.7)}><Txt x={x+w/2} y={y+h-47} size={w<300?32:45}>{a.name}</Txt>{a.subtitle&&<Txt x={x+w/2} y={y+h-12} size={22} fill={K.muted}>{a.subtitle}</Txt>}</g></Reveal>}
 const heading=(hero=false)=><g>{lines.map((t,i)=><Reveal key={i} p={ease((state.local-.12-i*.12)/.45)}><Txt x={80} y={(hero?1070:355)+i*96} size={t.length>11?65:80} anchor="start" fill={i?K.accent:K.ink}>{t}</Txt></Reveal>)}</g>
 let graphic:ReactNode=null
 switch(mode){
 case 'hook':graphic=<>{heading(true)}{brands.map((a,i)=>brandCard(a.id,75+i*310,1295,280,230,ease((state.local-.45-i*.22)/.6)))}</>;break
 case 'promise':graphic=<>{heading()}<Line d="M540 760V905M520 885L540 905L560 885" p={p(0,.22)}/><Panel x={125} y={585} title="交给 Agent 的任务" sub="目标 · 上下文 · 所需工具" p={p(0)}/><Panel x={125} y={930} title="带回可检查的交付" sub="文件 / 工作流 / 待审结果" p={p(0,.48)} accent/><Reveal p={p(1)}><Txt x={540} y={1220} size={40} fill={K.warm}>第三款：关注审批边界</Txt></Reveal></>;break
 case 'identity':graphic=<>{heading()}{brand&&brandCard(brand.id,230,610,620,320,p(0))}<Panel x={125} y={1020} title={s.labels[0]??'持续工作的 Agent'} sub={s.labels[1]} p={p(1)} accent/></>;break
 case 'workflow':graphic=<>{heading()}<Line d="M540 710V845M540 1010V1125" p={p(1,-.16)}/><Panel x={125} y={535} h={175} title={lab(0,'自有云电脑')} sub={lab(1,'一个持续工作的执行环境')} p={p(0)}/><Panel x={125} y={845} h={165} title={lab(2,'插件与 App 生态')} sub={lab(3,'按连接、授权与任务使用')} p={p(1)} accent/>{(s.labels[5]??'4000+')&&<Reveal p={p(1,.26)}><Txt x={865} y={803} anchor="end" size={77} fill={K.accent}>{lab(5,'4000+')}</Txt></Reveal>}<Panel x={125} y={1125} h={140} title={lab(4,'跨应用交付')} sub={lab(7,'')} p={p(2)}/></>;break
 case 'access':graphic=<>{heading()}<Panel x={125} y={650} h={230} title={lab(0,'Pro / Business Premium')} sub={lab(1,'相应订阅与开放资格')} p={p(1)}/><Panel x={125} y={1030} h={170} title={lab(2,'依地区、账户逐步开放')} sub={lab(3,'以官方当前说明为准')} p={p(2)} accent/></>;break
 case 'bridge':graphic=<>{heading(true)}{brand&&brandCard(brand.id,610,1280,335,245,p(0))}</>;break
 case 'communication':graphic=<>{heading()}{[0,1,2].map(i=><Panel key={i} x={125} y={575+i*225} title={lab(i,['电话 / 工具接入','邮件处理','支付操作与确认边界'][i])} sub={lab(3+i,['按工具与账户权限配置','准备内容，再按权限执行','仅作能力说明，不展示实际交易'][i])} p={p(i===2?1:0,i===1?.26:0)} accent={i===2}/>)}<Reveal p={p(1,.5)}><Txt x={540} y={1300} size={27} fill={K.muted}>{lab(6,'场景与流程示意')}</Txt></Reveal></>;break
 case 'skills':graphic=<>{heading()}<Line d="M540 725V820M540 985V1080" p={p(0,.2)}/>{[0,1,2].map(i=><Panel key={i} x={150} y={560+i*260} w={780} h={165} title={lab(i,['Skills 方法','执行具体任务','交付文件'][i])} sub={lab(3+i,['可复用步骤与规则','按任务调用工具','结果仍需检查'][i])} p={p(0,i*.3)} accent={i===2}/>)}</>;break
 case 'ecosystem':graphic=<>{heading()}<Panel x={125} y={610} h={210} title="Grok 模型 × Cursor" sub="开发工具中的模型能力" p={p(0)} accent/><Line d="M540 820V965" p={p(0,.35)}/><Panel x={125} y={965} h={210} title="Grok Bot 执行任务" sub="区分模型接入与 Bot 产品" p={p(0,.55)}/></>;break
 case 'opinion':graphic=<>{heading(true)}<Panel x={150} y={1290} w={780} h={170} title={lab(0,'任务执行 · 工具生态')} sub={lab(1,'本期使用侧重')} p={p(0)} accent/></>;break
 case 'proactive':graphic=<>{heading()}<Line d="M540 710V805M540 970V1065" p={p(1,-.16)}/>{[0,1,2].map(i=><Panel key={i} x={125} y={545+i*260} h={165} title={lab(i,['已授权的应用','发现与整理待办','草拟并准备下一步'][i])} p={p(i?1:0,i===2?.3:0)} accent={i===2}/>)}</>;break
 case 'approval':graphic=<>{heading()}{['付款','签署','删除'].map((v,i)=><Panel key={v} x={80+i*315} y={650} w={290} h={170} title={v} p={p(i?1:0,i===2?.23:0)}/>)}<Line d="M225 820V905H855V820M540 905V1020" p={p(2,-.18)}/><Panel x={125} y={1020} h={220} title="等待你确认" sub="关键操作前停下" p={p(2)} accent/><Reveal p={p(2,.4)}><Txt x={540} y={1330} size={28} fill={K.muted}>流程示意</Txt></Reveal></>;break
 case 'boundary':graphic=<>{heading(true)}<Panel x={125} y={1260} h={170} title="关键操作先确认" p={p(0)} accent/></>;break
 case 'model':graphic=<>{heading()}<Panel x={125} y={570} h={180} title={lab(0,'Claude Opus 5.5')} sub={lab(1,'模型能力与任务适配')} p={p(0)} accent/><Line d="M540 750V845M310 845H770M310 845V925M770 845V925" p={p(1,-.15)}/><Panel x={100} y={925} w={410} h={210} title={lab(2,'代码文件')} sub={lab(3,'任务输入 → 执行')} p={p(1)}/><Panel x={570} y={925} w={410} h={210} title={lab(4,'专业文档')} sub={lab(5,'输出 → 待审交付')} p={p(1,.25)}/></>;break
 case 'comparison':graphic=<>{heading()}{brands.map((a,i)=>{const active=time>=(b[i]??Infinity)&&time<(b[i+1]??s.end);return <g key={a.id}>{brandCard(a.id,105,525+i*245,290,220,ease((time-s.start-i*.18)/.65),active)}<Reveal p={ease((time-s.start-.25-i*.18)/.65)}><Txt x={450} y={645+i*245} anchor="start" size={43} fill={active?K.accent:K.ink}>{s.labels[i]??''}</Txt></Reveal></g>})}</>;break
 case 'evidence':{const ev=s.evidenceMediaId,ew=880,eh=ew*1280/1950,ex=(W-ew)/2,ey=470;graphic=<>{heading()}<Reveal p={p(0,.3)}><g><rect x={ex-14} y={ey-14} width={ew+28} height={eh+28} rx={30} fill={K.panel} stroke={K.accent} strokeWidth={3}/><clipPath id={'evclip-'+s.id}><rect x={ex} y={ey} width={ew} height={eh} rx={18}/></clipPath>{ev&&<image href={'/__studio/media/'+ev} x={ex} y={ey} width={ew} height={eh} clipPath={'url(#evclip-'+s.id+')'} preserveAspectRatio="xMidYMid meet"/>}{s.labels[0]&&<Reveal p={p(1,.5)}><Txt x={W/2} y={ey+eh+70} size={38} fill={K.warm}>{s.labels[0]}</Txt></Reveal>}</g></Reveal></>;break}
 case 'close':graphic=<>{heading(true)}{brands.map((a,i)=>brandCard(a.id,75+i*310,1295,280,230,p(0,.1+i*.15)))}</>;break
 default:graphic=heading()
 }
 if(s.diagram?.startsWith('handbook-')&&s.handbook)graphic=<HandbookNarrativeGraphic project={project} s={s} time={time}/>
 if(s.diagram?.startsWith('qiwei-'))graphic=<EnterpriseNarrativeGraphic project={project} s={s} time={time}/>
 return <div data-story-stage data-scene={s.id} className="narrative-stage" style={{position:'relative',width:'100%',height:'100%',overflow:'hidden',containerType:'inline-size',background:K.bg}}>
  <style>{'.narrative-stage .material-canvas-image{width:100%;height:100%;object-fit:cover}.narrative-stage .narrative-figure video{object-position:50% '+((s.diagram?.startsWith('qiwei-')||s.diagram?.startsWith('handbook-'))?28*(1-heroRatio):0)+'%}.narrative-stage text{paint-order:stroke fill}'}</style>
  {brands.map(a=><img key={a.id} src={'/__studio/media/'+a.logoMediaId} alt="" style={{position:'absolute',width:1,height:1,opacity:0}}/>)}
  <div style={{position:'absolute',inset:0,filter:'blur(15px)',opacity:s.presenter==='hero'?.38:.16,transform:'scale(1.08)'}}>{project.backdropMediaId&&<img alt="" src={'/__studio/media/'+project.backdropMediaId} style={{width:'100%',height:'100%',objectFit:'cover'}}/>}</div>
  {showBroll&&<div data-ai-broll={base!.jobId} style={{position:'absolute',inset:0,opacity:ease((time-at)/.3)*Math.min(1,(until-time)/.22)}}><MaterialVideo src={'/__studio/media/'+base!.mediaId} time={time} start={at} end={until} offset={base!.offset} playing={playing} rendering={rendering}/></div>}
  <div style={{position:'absolute',inset:0,background:'linear-gradient(180deg,#0815236e,#08152336 35%,#081523cc 75%,#081523 100%)'}}/>
  <div className="narrative-figure" style={{...pos(r.x,r.y,r.w,r.h),borderRadius:r.r/(portrait?10.8:19.2)+'cqw',overflow:'hidden',border:heroRatio<.9?'2px solid #8ce2c770':'none',boxSizing:'border-box'}}><MaterialVideo src={'/__studio/media/'+project.video!.id} time={time} start={0} end={project.duration} playing={playing} rendering={rendering}/><div style={{position:'absolute',inset:0,background:`linear-gradient(0deg,rgba(8,21,35,${.94*heroRatio}),transparent ${80*heroRatio}%)`}}/></div>
  <svg viewBox={`0 0 ${W} ${H}`} style={{position:'absolute',inset:0,width:'100%',height:'100%',fontFamily:'"PingFang SC",sans-serif'}}>
   <g transform={`translate(${ox} ${oy}) scale(${scale})`} opacity={blockOpacity}>{s.presenter!=='hero'&&brand&&<g><image href={'/__studio/media/'+brand.logoMediaId} x={80} y={95} width={112} height={112}/><Txt x={225} y={160} anchor="start" size={45}>{brand.name}</Txt></g>}{graphic}</g>
   {caption&&<g data-caption={caption.text}><rect x={(W-Math.min(portrait?950:1400,caption.text.length*(portrait?43:35)+70))/2} y={portrait?1600:970} width={Math.min(portrait?950:1400,caption.text.length*(portrait?43:35)+70)} height={portrait?104:70} rx={23} fill="#071523e8"/><Txt x={W/2} y={portrait?1670:1020} size={portrait?(caption.text.length>20?38:45):36}>{caption.text.split(highlightRe).map((v,i)=><tspan key={i} fill={i%2?K.accent:K.ink}>{v}</tspan>)}</Txt></g>}
  </svg>
 </div>
}
