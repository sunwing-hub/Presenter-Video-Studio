import {CompanyOfficeScene,type CompanyOfficeData} from './productions/CompanyOfficeScene'
import {sourceAudioGain} from '../scripts/source-audio.mjs'
import {StoryScene} from './templates/story/StoryScene'
import {validateStory,type StoryProject} from './templates/story/storyModel.mjs'
import {ReviewTimeline} from './templates/ReviewTimelineScene'
import {ReviewInstanceControls} from './templates/ReviewInstanceControls'
import {reviewDefaults,validateReviewProject,type ReviewParams} from './templates/reviewModel.mjs'
import {reviewSignature,resizeReviewBinding,validateReviewBinding,reviewAudioClip,type ReviewBinding} from './templates/reviewTimeline.mjs'
import './templateLab.css'
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type CSSProperties, type DragEvent as ReactDragEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { draftCards, parseSrt, validatePlan, validateCues, scriptTemplates, isLayerActive, timeLabel, type SubtitleCue, type PlanCard, type ScriptContent, type ScriptTemplate } from './arrangement'
import { ScriptCard } from './ScriptCard'
import {memo} from 'react'
import {flushSync} from 'react-dom'
import { referenceScenes } from './ReferenceMotionCard'
import { ExportPanel } from './ExportPanel'
import { TimedPresenter as PresenterLayout } from './TimedPresenter'
import {presenterDefault,presenterModes,validateLayouts,uploadLocalMedia,layoutAt,fitMaterialRect,type PresenterSettings,type LayoutClip} from './layoutTimeline'
import {LayoutTimeline} from './LayoutTrackEditor'
import {MultiTrack,AudioPreview,type TrackItem} from './MultiTrack'
import {AudioLibrary} from './AudioLibrary'
import {captionDefault,validateCaption,validateAudio,type CaptionStyle,type AudioClip} from './trackModel'
import {makeSfxWav,type BuiltinSound} from './sfx'
import {useDrafts,DraftPanel} from './useDrafts'
import {MediaCard,MediaControls} from './MediaCard'
import {KeywordMotion,type KeywordEffect} from './KeywordMotion'
import {MaterialVideo,readVideoMetadata} from './MaterialVideo'
import {mediaMotion,type MediaPresentation,validMediaPresentation} from './mediaPresentation'
const RENDER_JOB = new URLSearchParams(location.search).get('renderJob')
if (RENDER_JOB) document.documentElement.classList.add('export-mode')

type InfoCardKind = 'charts' | 'timeline' | 'list' | 'tags' | 'progress' | 'person' | 'insert' | 'question' | 'vote' | 'divider' | 'outro' | 'watermark' | 'arrow' | 'calendar' | 'halo' | 'orbit' | 'triad' | 'board' | 'loop' | 'review' | 'bottomquote' | 'source' | 'transition' | 'agenda' | 'skillorbit' | 'mediawall' | 'pipeline' | 'appcluster' | 'splitboard' | 'documentgrid' | 'flowline' | 'floatingframes' | 'dualmetric' | 'archflow'
type SceneId = 'team-story' | 'team-review' | 'metric' | 'compare' | 'quote' | 'rail' | InfoCardKind | ScriptTemplate

type MetricSettings = {
  value: number
  unit: string
  label: string
  note: string
  numberOnly?: boolean
}

type CompareSettings = {
  leftTitle: string
  rightTitle: string
  leftValue: number
  rightValue: number
  split: number
}

type QuoteSettings = {
  quote: string
  source: string
  index: string
}

type RailSettings = {
  title: string
  first: string
  second: string
  third: string
  note: string
}

type CanvasLayer = {
  companyScene?: CompanyOfficeData
  id: string
  type: 'card' | 'text' | 'image'
  sceneId?: SceneId
  text?: string
  textStyle?: 'panel' | 'caption' | 'plain' | 'emphasis' | 'label' | 'kinetic'
  keywordEffect?: KeywordEffect
  textColor?: string
  fontFamily?: string
  assetId?: string
  assetUrl?: string
  assetName?: string
  mediaType?: 'video'
  sourceDuration?: number
  sourceOffset?: number
  x: number
  y: number
  width: number
  height: number
  fontSize: number
  zIndex: number
  visible: boolean
  start?: number
  end?: number
  story?: StoryProject
  review?: ReviewBinding
  script?: ScriptContent
  cueIds?: string[]
  reason?: string
  origin?: 'local' | 'assistant' | 'emphasis'
  presentation?: MediaPresentation
  locked?: boolean
  settings?: { metric: MetricSettings; compare: CompareSettings; quote: QuoteSettings; rail: RailSettings }
}

type PartTransform = { x: number; y: number; scale: number; color?: string; background?: string; opacity?: number; hidden?: boolean; fontFamily?: string }
type SelectedPart = { layerId: string; key: string; label: string }
type PartTextField = { key: string; label: string; value: string }
type MaterialAsset = { id: string; name: string; url: string; tags: string[]; kind: 'logo' | 'screenshot' | 'image' | 'video'; duration?: number; width?: number; height?: number }
type CardLayoutPreset = { x: number; y: number; width: number; height: number; fontSize: number }
type EditSnapshot = {
  canvasLayers: CanvasLayer[]; partTransforms: Record<string, Record<string, PartTransform>>; partTextOverrides: Record<string, Record<string, string>>
  cues: SubtitleCue[]; captionStyle: CaptionStyle; materials: MaterialAsset[]; presenter: PresenterSettings; layoutClips: LayoutClip[]; audioClips: AudioClip[]
  canvasAspect: (typeof CANVAS_ASPECTS)[number]['id']; metricPreset: MetricSettings; comparePreset: CompareSettings; quotePreset: QuoteSettings; railPreset: RailSettings
  cardLayoutPresets: Partial<Record<SceneId, CardLayoutPreset>>
  videoSource: { url: string; name: string } | null; videoDuration: number; sourceImage: { url: string; name: string } | null; insertImage: { url: string; name: string } | null
}
const sameEdit = (a: EditSnapshot, b: EditSnapshot) => (Object.keys(a) as (keyof EditSnapshot)[]).every(key => Object.is(a[key], b[key]))
type PauseGap = { start: number; end: number }
type AutoProcessStage = 'idle' | 'analyzing' | 'matching' | 'needs-srt' | 'done' | 'error'
type TranscriptionStage = 'idle' | 'uploading' | 'recognizing' | 'done' | 'error'

const createLayerId = () => `layer-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
const createAssetId = () => `asset-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
const EDITOR_SCHEMA_VERSION = '6'

/**
 * Analyze the imported video's audio locally. This is intentionally only a
 * pause detector: it never guesses spoken words or fabricates subtitle timecodes.
 */
async function detectPauseGaps(blob: Blob): Promise<{ gaps: PauseGap[]; duration: number }> {
  const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AudioContextClass) throw new Error('当前浏览器不支持本地声音分析。')
  const context = new AudioContextClass()
  try {
    const buffer = await context.decodeAudioData(await blob.arrayBuffer())
    const channel = buffer.getChannelData(0)
    const windowSize = Math.max(1, Math.floor(buffer.sampleRate * 0.03))
    const values: number[] = []
    for (let offset = 0; offset < channel.length; offset += windowSize) {
      const end = Math.min(channel.length, offset + windowSize)
      let sum = 0
      for (let index = offset; index < end; index += 1) sum += channel[index] * channel[index]
      values.push(Math.sqrt(sum / Math.max(1, end - offset)))
    }
    const peak = Math.max(...values, 0)
    if (peak < 0.004) return { gaps: [], duration: buffer.duration }
    const threshold = Math.max(0.008, peak * 0.08)
    const gaps: PauseGap[] = []
    let silentFrom: number | null = null
    values.forEach((rms, index) => {
      const time = index * 0.03
      if (rms < threshold) {
        if (silentFrom === null) silentFrom = time
        return
      }
      if (silentFrom !== null) {
        const end = time
        if (end - silentFrom >= 0.45 && silentFrom > 0.25 && end < buffer.duration - 0.2) gaps.push({ start: silentFrom, end })
        silentFrom = null
      }
    })
    return { gaps: gaps.filter((gap, index) => index === 0 || gap.start - gaps[index - 1].end > 0.1), duration: buffer.duration }
  } finally {
    await context.close().catch(() => {})
  }
}
const FONT_OPTIONS = [
  { label: '现代黑体', value: 'Manrope, "PingFang SC", sans-serif' },
  { label: '苹方', value: '"PingFang SC", sans-serif' },
  { label: '思源黑体', value: '"Source Han Sans SC", "Noto Sans CJK SC", sans-serif' },
  { label: '宋体', value: '"Songti SC", "STSong", serif' },
  { label: '等宽科技', value: '"DM Mono", ui-monospace, monospace' },
] as const
const CANVAS_ASPECTS = [
  { id: '16 / 9', label: '横屏 16:9' },
  { id: '4 / 3', label: '横屏 4:3' },
  { id: '1 / 1', label: '方形 1:1' },
  { id: '3 / 4', label: '竖屏 3:4' },
  { id: '9 / 16', label: '竖屏 9:16' },
  { id: '4 / 5', label: '竖屏 4:5' },
] as const
const EDITABLE_PART_SELECTOR = '.metric-content,.metric-value,.compare-card-main>strong,.question-copy,.guest-card>div,.progress-card>strong,.trend-card>strong,.halo-copy>b,.metric-side-signal,.card-avatar,.compare-title,.compare-card,.compare-divider,.quote-lockup blockquote,.quote-marker,.rail-left-panel,.rail-title,.rail-step,.info-panel,.list-row,.tag-grid>span,.time-rail>span,.vote-card,.vote-prompt,.divider-label,.divider-rule,.watermark-card,.halo-portrait,.halo-copy,.orbit-portrait,.orbit-chip,.triad-column,.board-input,.board-result,.loop-copy,.loop-node,.review-heading,.review-step,.review-message,.bottom-quote-layout,.source-layout,.chapter-two-index,.chapter-two-right,.agenda-layout,.agenda-item,.image-insert-layout'

const partLabelFromElement = (element: HTMLElement) => {
  const className = [...element.classList].find((name) => !name.startsWith('is-') && !name.includes('--')) ?? element.tagName.toLowerCase()
  const labels: Record<string, string> = {
    'metric-content': '数字主体', 'metric-side-signal': '侧边数据', 'card-avatar': '头像标识',
    'compare-title': '对比标题', 'compare-card': '对比选项', 'compare-divider': 'VS 连接',
    'quote-marker': '引号', blockquote: '金句文字', 'rail-left-panel': '步骤序号', 'rail-title': '步骤标题', 'rail-step': '单个步骤',
    'info-panel': '信息面板', 'list-row': '列表项', 'vote-card': '投票选项', 'vote-prompt': '投票引导',
    'divider-label': '章节序号', 'divider-rule': '章节标题', 'watermark-card': '账号水印',
    'halo-portrait': '人物头像', 'halo-copy': '人物数据', 'orbit-portrait': '中心人物', 'orbit-chip': '环绕标签',
    'triad-column': '重点指标', 'board-input': '输入面板', 'board-result': '结果面板', 'loop-copy': '闭环标题', 'loop-node': '流程节点',
    'review-heading': '审批标题', 'review-step': '审批步骤', 'review-message': '审批结论', 'bottom-quote-layout': '底部金句',
    'source-layout': '资料截图', 'chapter-two-index': '章节左标', 'chapter-two-right': '章节右标', 'agenda-layout': '目录面板',
    'agenda-item': '目录项', 'image-insert-layout': '插入图片',
  }
  return labels[className] ?? '卡片小组件'
}

const baseScenes: Array<{ id: SceneId; number: string; name: string; description: string }> = [
  {id:'team-story',number:'72',name:'专业延展 · 全片模板',description:'从首帧到结尾的语义编排 · 横竖独立布局'},
  {id:'team-review',number:'71',name:'深色成果审阅',description:'原生可编辑模板 · 动作与声音联动'},
  { id: 'orbitcards', number: '70', name: '彩色卡片环绕展开', description: '六卡叠放 · 环绕展开 · 可编辑文字' },
  { id: 'metric', number: '01', name: 'Metric Focus', description: '核心数字动效' },
  { id: 'compare', number: '02', name: 'Compare Split', description: '左右对比卡' },
  { id: 'quote', number: '03', name: 'Quote Lockup', description: '金句定格卡' },
  { id: 'rail', number: '04', name: 'Sequence Rail', description: '分步信息卡' },
  { id: 'ring', number: '29', name: 'Progress Ring', description: '圆环进度卡' },
  { id: 'gauge', number: '30', name: 'Half Gauge', description: '半圆仪表卡' },
  { id: 'fan', number: '31', name: 'Fan Points', description: '扇形要点卡' },
  { id: 'bubbles', number: '32', name: 'Keyword Bubbles', description: '圆形关键词卡' },
  { id: 'ribbon', number: '33', name: 'Ribbon List', description: '长条重点卡' },
  { id: 'orbitflow', number: '34', name: 'Orbit Flow', description: '环形协作卡' },
  { id: 'embed', number: '35', name: 'Embed Link', description: '方案嵌入卡' },
  { id: 'merge', number: '36', name: 'Ability Merge', description: '能力汇合卡' },
  { id: 'symbol', number: '47', name: 'Symbol Story', description: '符号叙事卡' },
  { id: 'thinkcloud', number: '48', name: 'Think Cloud', description: '思考云 · 问题浮现' },
  { id: 'questionstack', number: '49', name: 'Question Stack', description: '连续问句 · 气泡弹出' },
  { id: 'appburst', number: '50', name: 'App Burst', description: '应用图标 · 错峰升起' },
  { id: 'docrelay', number: '51', name: 'Document Relay', description: '初稿修改 · 文档接力' },
  { id: 'choicehub', number: '52', name: 'Choice Focus', description: '多项筛选 · 聚焦结论' },
  { id: 'checknote', number: '53', name: 'Check Note', description: '待办事项 · 逐项勾选' },
  { id: 'growthpath', number: '54', name: 'Growth Path', description: '阶段积累 · 阶梯生长' },
  { id: 'actionwindow', number: '55', name: 'Action Window', description: '模拟界面 · 点击反馈' },
  { id: 'alertstamp', number: '56', name: 'Alert Stamp', description: '撕纸强调 · 短句入场' },
  { id: 'arrowcallout', number: '57', name: 'Action Arrow', description: '方向箭头 · 指令推进' },
  { id: 'beforeafter', number: '58', name: 'Before / After', description: '前后对照 · 指纹描线' },
  { id: 'filedrawer', number: '59', name: 'File Drawer', description: '资料纸页 · 依次收纳' },
  { id: 'insightpulse', number: '60', name: 'Insight Pulse', description: '多人交流 · 观点汇合' },
  { id: 'editpain', number: '61', name: '剪辑耗时', description: '剪刀、图块与时间轴' },
  { id: 'commandrun', number: '62', name: '命令成片', description: '命令输入 · 视频输出' },
  { id: 'workflowmap', number: '63', name: '五步流程', description: '图标路径 · 顺序点亮' },
  { id: 'scriptread', number: '64', name: '字幕文档', description: '文案与时间点对齐' },
  { id: 'rhythmscan', number: '65', name: '气口节奏', description: '声波扫描 · 重点标记' },
  { id: 'motionmatch', number: '66', name: '语义匹配', description: '数字、对比和步骤图标' },
  { id: 'screenblend', number: '67', name: '窗口融合', description: '素材窗口 · 拖动缩放' },
  { id: 'exportpaths', number: '68', name: '双格式导出', description: '完整视频与透明动效层' },
  { id: 'commentprompt', number: '69', name: '评论邀请', description: '对话气泡 · 试用邀请' },
]

const infoCards: Array<{ id: InfoCardKind; number: string; name: string; description: string }> = [
  { id: 'charts', number: '05', name: 'Data Signals', description: '图表数据卡' },
  { id: 'timeline', number: '06', name: 'Time Trace', description: '时间轴卡' },
  { id: 'list', number: '07', name: 'Top List', description: '列表清单卡' },
  { id: 'tags', number: '08', name: 'Tag Cloud', description: '标签云卡' },
  { id: 'progress', number: '09', name: 'Progress Mark', description: '进度条卡' },
  { id: 'person', number: '10', name: 'Guest Frame', description: '人物介绍卡' },
  { id: 'insert', number: '11', name: 'Image Insert', description: '插图卡' },
  { id: 'question', number: '12', name: 'Prompt Card', description: '提问引导卡' },
  { id: 'vote', number: '13', name: 'Vote Split', description: '投票选择卡' },
  { id: 'divider', number: '14', name: 'Chapter Break', description: '转场分隔卡' },
  { id: 'outro', number: '15', name: 'Follow Endcard', description: '片尾关注卡' },
  { id: 'watermark', number: '16', name: 'Corner Mark', description: '角标水印卡' },
  { id: 'arrow', number: '17', name: 'Detail Arrow', description: '箭头标注卡' },
  { id: 'calendar', number: '18', name: 'Schedule Card', description: '日历日程卡' },
  { id: 'halo', number: '19', name: 'Halo Focus', description: '圆形人物聚焦卡' },
  { id: 'orbit', number: '20', name: 'Orbit Labels', description: '人物周边标签卡' },
  { id: 'triad', number: '21', name: 'Triad Stack', description: '三列重点指标卡' },
  { id: 'board', number: '22', name: 'Insight Board', description: '输入结果信息板' },
  { id: 'loop', number: '23', name: 'Loop Cycle', description: '内容闭环流程卡' },
  { id: 'review', number: '24', name: 'Review Flow', description: '总流程与审批卡' },
  { id: 'bottomquote', number: '25', name: 'Bottom Quote', description: '底部金句卡' },
  { id: 'source', number: '26', name: 'Source Reference', description: '资料引用卡' },
  { id: 'transition', number: '27', name: 'Point Two', description: '第二点过渡卡' },
  { id: 'agenda', number: '28', name: 'Agenda Map', description: '目录导览卡' },
  { id: 'skillorbit', number: '37', name: 'Skill Orbit', description: '技能环绕卡' },
  { id: 'mediawall', number: '38', name: 'Media Wall', description: '素材拼贴卡' },
  { id: 'pipeline', number: '39', name: 'Pipeline Board', description: '流程泳道卡' },
  { id: 'appcluster', number: '40', name: 'App Cluster', description: '应用图标聚合卡' },
  { id: 'splitboard', number: '41', name: 'Split Dashboard', description: '左右双面板卡' },
  { id: 'documentgrid', number: '42', name: 'Document Grid', description: '资料三列卡' },
  { id: 'flowline', number: '43', name: 'Flow Line', description: '横向流程节点卡' },
  { id: 'floatingframes', number: '44', name: 'Floating Frames', description: '浮动截图组卡' },
  { id: 'dualmetric', number: '45', name: 'Dual Metric', description: '人物两侧指标卡' },
  { id: 'archflow', number: '46', name: 'Arch Flow', description: '拱形连接流程卡' },
]

const scenes = [...baseScenes, ...infoCards]

const metricDefault: MetricSettings = {
  value: 91.2,
  unit: '%',
  label: 'CONVERSION LIFT',
  note: 'THE SIGNAL IS CLEAR',
}

const compareDefault: CompareSettings = {
  leftTitle: 'STANDARD',
  rightTitle: 'OPTIMIZED',
  leftValue: 34,
  rightValue: 86,
  split: 46,
}

const quoteDefault: QuoteSettings = {
  quote: 'CLARITY\nIS A\nCOMPETITIVE\nADVANTAGE.',
  source: 'FIELD NOTES / 2025',
  index: '07 — 18',
}

const railDefault: RailSettings = {
  title: 'MAKE IT\nMEMORABLE',
  first: 'FIND THE SIGNAL',
  second: 'FRAME THE MOMENT',
  third: 'LEAVE A MARK',
  note: 'THREE MOVES / ONE STORY',
}

function Icon({ children, size = 18 }: { children: ReactNode; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  )
}

function PlayIcon({ playing }: { playing: boolean }) {
  return playing ? (
    <Icon size={16}><path d="M8 6v12M16 6v12" /></Icon>
  ) : (
    <Icon size={16}><path d="m9 5 10 7-10 7V5Z" fill="currentColor" stroke="none" /></Icon>
  )
}

function RestartIcon() {
  return <Icon size={16}><path d="M20 11a8 8 0 1 0 2 5" /><path d="M20 4v7h-7" /></Icon>
}

function ExportIcon() {
  return <Icon size={15}><path d="M12 15V3" /><path d="m8 7 4-4 4 4" /><path d="M5 13v6h14v-6" /></Icon>
}

function useCountUp(value: number, delay: number, runKey: number) {
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    let frame = 0
    const start = performance.now() + delay
    const tick = (now: number) => {
      const progress = Math.min(Math.max((now - start) / 1550, 0), 1)
      const eased = 1 - Math.pow(1 - progress, 4)
      setDisplay(value * eased)
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    setDisplay(0)
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value, delay, runKey])

  return display
}

function PersonSafeZone() {
  return (
    <div className="person-safe-zone" aria-hidden="true">
      <span>CHARACTER SAFE AREA</span>
      <i className="safe-corner safe-corner--tl" /><i className="safe-corner safe-corner--tr" />
      <i className="safe-corner safe-corner--bl" /><i className="safe-corner safe-corner--br" />
    </div>
  )
}

function CardAvatar() {
  return <span className="card-avatar" aria-label="账号头像占位"><i>MC</i></span>
}

export function MetricFocus({ settings, playing, duration, runKey, elapsed = 2.2 }: { settings: MetricSettings; playing: boolean; duration: number; runKey: number; elapsed?: number }) {
  const display = settings.value * (1 - Math.pow(1 - Math.min(1, Math.max(0, (elapsed - .15) / .85)), 4))
  const sceneStyle = {
    '--scene-duration': `${duration}s`,
    animationPlayState: playing ? 'running' : 'paused',
  } as CSSProperties

  return (
    <section className="motion-scene metric-focus metric-focus--compact" style={sceneStyle}>
      <div className="metric-ticket" data-part-id="panel" data-part-label="数字卡整体">
        {!settings.numberOnly && <span className="metric-ticket-tag">{settings.label==='CONVERSION LIFT'?'核心数据':settings.label}</span>}
        <div className="metric-value" data-part-id="value" data-part-label="数字与单位" aria-label={`${settings.value}${settings.unit}`} style={{fontSize:`${Math.min(settings.numberOnly?10:7,(settings.numberOnly?43:28)/Math.max(4,String(settings.value).length+settings.unit.length*.45))}cqw`}}>
          {display.toFixed(Number.isInteger(settings.value)?0:1)}<span>{settings.unit}</span>
        </div>
        {!settings.numberOnly&&settings.note&&<p className="metric-note" data-part-id="note" data-part-label="补充说明">{settings.note==='THE SIGNAL IS CLEAR'?'示例数据 · 可替换':settings.note}</p>}
      </div>
    </section>
  )
}

export function CompareSplit({ settings, playing, duration }: { settings: CompareSettings; playing: boolean; duration: number }) {
  const delta = settings.rightValue - settings.leftValue
  const deltaLabel = `${delta > 0 ? '+' : ''}${delta} MS`
  const sceneStyle = {
    '--split': `${settings.split}%`,
    '--scene-duration': `${duration}s`,
    animationPlayState: playing ? 'running' : 'paused',
  } as CSSProperties

  return (
    <section className="motion-scene compare-split" style={sceneStyle}>
      <PersonSafeZone />
      <div className="compare-meta"><span>COMPARATIVE STUDY</span><span>02 / 03</span></div>
      <div className="compare-title">SYSTEM<br />RESPONSE</div>
      <div className="compare-stage">
        <div className="compare-left-clip">
          <div className="compare-card compare-card--left">
            <div className="compare-card-top"><span>01</span><span>BEFORE</span></div>
            <div className="compare-card-main"><p>{settings.leftTitle}</p><strong>{settings.leftValue}<small>ms</small></strong></div>
            <div className="compare-card-foot"><span>LATENCY</span><span>BASELINE</span></div>
          </div>
        </div>
        <div className="compare-divider"><i /><b>VS</b><i /></div>
        <div className="compare-card compare-card--right">
          <div className="compare-card-top"><span>02</span><span>AFTER</span></div>
          <div className="compare-card-main"><p>{settings.rightTitle}</p><strong>{settings.rightValue}<small>ms</small></strong></div>
          <div className="compare-card-foot"><span>LATENCY</span><span>{deltaLabel} SHIFT</span></div>
        </div>
      </div>
      <div className="compare-scale"><span>01 / BASELINE</span><b>{deltaLabel} SHIFT</b><span>02 / OPTIMIZED</span></div>
      <CardAvatar />
    </section>
  )
}

export function QuoteLockup({ settings, playing, duration }: { settings: QuoteSettings; playing: boolean; duration: number }) {
  const sceneStyle = {
    '--scene-duration': `${duration}s`,
    animationPlayState: playing ? 'running' : 'paused',
  } as CSSProperties

  return (
    <section className="motion-scene quote-lockup" style={sceneStyle}>
      <div className="quote-grid" />
      <PersonSafeZone />
      <div className="quote-top"><span>THOUGHT / {settings.index}</span><span>CAPTURED MOMENT</span></div>
      <div className="quote-marker">“</div>
      <blockquote>{settings.quote.split('\n').map((line) => <span key={line}>{line}</span>)}</blockquote>
      <div className="quote-bottom"><span className="quote-rule" /><span>{settings.source}</span><span className="quote-page">A — 014</span></div>
      <CardAvatar />
    </section>
  )
}

export function SequenceRail({ settings, playing, duration }: { settings: RailSettings; playing: boolean; duration: number }) {
  const sceneStyle = {
    '--scene-duration': `${duration}s`,
    animationPlayState: playing ? 'running' : 'paused',
  } as CSSProperties
  const steps = [settings.first, settings.second, settings.third]

  return (
    <section className="motion-scene sequence-rail" style={sceneStyle}>
      <div className="rail-paper" />
      <PersonSafeZone />
      <div className="rail-header"><span>STORY SYSTEM / 04</span><span>OVERLAY CARD</span></div>
      <div className="rail-left-panel"><span>SEQUENCE</span><b>04</b><i /><em>{settings.note}</em></div>
      <div className="rail-title">{settings.title.split('\n').map((line) => <span key={line}>{line}</span>)}</div>
      <div className="rail-layout">
        <div className="rail-track"><i /><i /><i /></div>
        <div className="rail-steps">
          {steps.map((step, index) => <div className={`rail-step rail-step--${index + 1}`} key={`${index}-${step}`}><small>0{index + 1}</small><div><b>{step}</b><em>EDITORIAL NOTE</em></div><span /></div>)}
        </div>
      </div>
      <div className="rail-footer"><span>EDIT NOTES</span><i /><span>KEEP THE FRAME OPEN</span></div>
    </section>
  )
}

export function DynamicInfoCard({ kind, playing, duration, sourceImage, insertImage }: { kind: InfoCardKind; playing: boolean; duration: number; sourceImage: { url: string; name: string } | null; insertImage: { url: string; name: string } | null }) {
  const sceneStyle = { '--scene-duration': `${duration}s`, animationPlayState: playing ? 'running' : 'paused' } as CSSProperties
  const label = infoCards.find((card) => card.id === kind)!
  const body = (() => {
    switch (kind) {
      case 'charts': return <><div className="info-panel panel-left chart-card"><small>PERFORMANCE / LIVE</small><div className="chart-top"><b>DATA SIGNALS</b><span className="chart-donut"><i>68</i></span></div><div className="bar-chart"><i /><i /><i /><i /><i /></div><em>WEEKLY RANGE</em></div><div className="info-panel panel-right trend-card"><small>CHANGE RATE</small><strong>+28<sup>%</sup></strong><svg viewBox="0 0 150 65" aria-hidden="true"><path className="trend-fill" d="M3 55 30 43 56 48 82 23 105 31 145 7V65H3Z" /><path d="M3 55 30 43 56 48 82 23 105 31 145 7" /></svg></div></>
      case 'timeline': return <div className="info-panel timeline-card"><small>EVENT TRACE</small><b>THE TURNING POINTS</b><div className="time-rail"><span><i /><em>01</em><strong>FIRST SIGNAL</strong></span><span><i /><em>02</em><strong>SHIFT IN VIEW</strong></span><span><i /><em>03</em><strong>NEXT MOVE</strong></span><span><i /><em>04</em><strong>OPEN FIELD</strong></span></div></div>
      case 'list': return <div className="info-panel panel-left list-card"><small>TOP 03 / THIS CUT</small><b>WHAT STAYS WITH YOU</b>{[['OPEN STRONG', 'FIRST THREE SECONDS'], ['CUT THE NOISE', 'ONE CLEAR IDEA'], ['LAND THE POINT', 'LEAVE A MARK']].map(([title, note], index) => <div className={`list-row list-row--${index + 1}`} key={title}><em>0{index + 1}</em><span><b>{title}</b><small>{note}</small></span><i>↗</i></div>)}</div>
      case 'tags': return <div className="info-panel panel-right tags-card"><small>KEYWORD CLOUD</small><b>FIELD LANGUAGE</b><div className="tag-grid">{['FOCUS', 'PACE', 'EDIT', 'DETAIL', 'RHYTHM', 'IMPACT'].map((tag, index) => <span className={`tag-${index + 1}`} key={tag}>{tag}</span>)}</div></div>
      case 'progress': return <div className="info-panel panel-left progress-card"><small>COMPLETION</small><strong>82<sup>%</sup></strong><b>BUILDING MOMENTUM</b><div className="progress-track"><i /></div><em>03 / 04 MILESTONES</em></div>
      case 'person': return <div className="info-panel panel-left guest-card"><div className="guest-avatar">AM</div><div><small>GUEST / 01</small><strong>ALEX MORI</strong><b>CREATIVE DIRECTOR</b><p>MAKES COMPLEX STORIES<br />FEEL IMMEDIATELY CLEAR.</p></div><i /></div>
      case 'insert': return <div className={`image-insert-layout ${insertImage ? 'has-insert-image' : ''}`}><div className="image-insert-frame">{insertImage ? <img src={insertImage.url} alt="插图预览" /> : <div className="image-insert-placeholder"><i>＋</i><b>IMAGE</b><span>ADD A VISUAL NOTE</span></div>}</div><div className="image-insert-caption"><small>VISUAL NOTE / 11</small><strong>{insertImage ? insertImage.name : '用一张图，补充这一句。'}</strong><em>RIGHT SAFE ZONE</em></div></div>
      case 'question': return <div className="info-panel panel-left question-card"><i>?</i><div className="question-copy"><small>QUESTION / 01</small><strong>WHAT WOULD<br />YOU KEEP?</strong><span>PAUSE. NOTICE. DECIDE.</span><em>ANSWER BELOW ↓</em></div></div>
      case 'vote': return <><div className="info-panel vote-card vote-card--a"><small>YOUR TAKE / A</small><strong>A</strong><b>THE DETAIL</b><span><i /><em>58%</em></span></div><div className="info-panel vote-card vote-card--b"><small>YOUR TAKE / B</small><strong>B</strong><b>THE FEELING</b><span><i /><em>42%</em></span></div><div className="vote-prompt">CHOOSE A SIDE · COMMENT A OR B ↓</div></>
      case 'divider': return <><div className="divider-label"><span>CHAPTER</span><strong>02</strong></div><div className="divider-rule"><i /><span><b>SHIFT THE VIEW</b><em>NEXT / PERSPECTIVE</em></span><i /></div></>
      case 'outro': return <div className="info-panel panel-right outro-card"><div className="outro-account"><i>MC</i><span><b>MOTION COLUMN</b><em>@MOTION.COLUMN</em></span></div><small>KEEP THIS CLOSE</small><strong>FOLLOW FOR<br />THE NEXT CUT.</strong><div><span>＋ FOLLOW</span><span>♡ SAVE</span></div></div>
      case 'watermark': return <div className="watermark-card"><i><b>MC</b></i><span>MOTION<br />COLUMN</span><em>EST. 2026</em></div>
      case 'arrow': return <div className="info-panel panel-left arrow-card"><i>↗</i><div className="arrow-note"><b>THE SMALL SHIFT.</b><em>LIGHT / ANGLE / PAUSE</em></div><span>01 / DETAIL</span></div>
      case 'calendar': return <div className="info-panel panel-right calendar-card"><small>FIELD SCHEDULE</small><div className="calendar-date"><b>18</b><span>OCT<br />SAT</span></div><div className="calendar-event"><i /><b>18:30</b><span>LIVE SESSION</span></div><div className="calendar-event"><i /><b>20:00</b><span>OPEN NOTES</span></div></div>
      case 'halo': return <div className="halo-layout"><div className="halo-portrait"><span>MC</span></div><div className="halo-copy"><small>FIELD REPORT / 07</small><strong>THE SIGNAL<br />IS CLOSER.</strong><em>GLOBAL REACH</em><b>70<sup>%</sup></b></div><i className="halo-rule" /></div>
      case 'orbit': return <div className="orbit-layout"><div className="orbit-portrait"><span>MC</span></div>{[['37°C','TEMPERATURE','orbit-chip--left'],['BREATHE','RHYTHM','orbit-chip--top'],['HEART','PULSE','orbit-chip--right'],['MUSCLE','RECOVERY','orbit-chip--bottom']].map(([value, note, klass]) => <div className={`orbit-chip ${klass}`} key={value}><b>{value}</b><small>{note}</small></div>)}<strong className="orbit-caption">ONE BODY · MANY SIGNALS</strong></div>
      case 'triad': return <div className="triad-layout"><small>THREE POINTS / ONE TAKE</small><strong>THE NEW<br />BASELINE</strong><div className="triad-columns">{[['01','FOCUS','CLARITY'],['02','PACE','MOMENTUM'],['03','IMPACT','MEMORY']].map(([index, title, note], position) => <div className={`triad-column triad-column--${position + 1}`} key={index}><em>{index}</em><b>{title}</b><span>{note}</span><i /></div>)}</div></div>
      case 'board': return <div className="board-layout"><div className="board-input"><small>USER INPUT</small><strong>MAKE THIS<br />LAND.</strong><span>BRIEF / 01</span></div><div className="board-result"><small>AI MOTION SYSTEM</small><strong>RICH PROMPT</strong>{['FRAME','MOTION','TIMING','DETAIL'].map((item, index) => <div className="board-row" key={item}><i>{String(index + 1).padStart(2, '0')}</i><b>{item}</b><span>{['KEEP THE CENTER OPEN','REVEAL EACH LINE','PAUSE ON THE POINT','END WITH A MARK'][index]}</span></div>)}<em>READY FOR THE NEXT CUT</em></div></div>
      case 'loop': return <div className="loop-layout"><div className="loop-copy"><strong>一条视频<br />不再是一次任务</strong><small>它是一条不断回流的工作链</small></div><div className="loop-track" aria-hidden="true"><i /><i /></div><div className="loop-node loop-node--input"><b>输入</b><small>01</small></div><div className="loop-node loop-node--create"><b>创作</b><small>02</small></div><div className="loop-node loop-node--publish"><b>发布</b><small>03</small></div><div className="loop-node loop-node--review"><b>复盘</b><small>04</small></div><div className="loop-node loop-node--settle"><b>沉淀</b><small>05</small></div><div className="loop-note"><i /> 文案确定以后，持续迭代每一次内容</div></div>
      case 'review': return <div className="review-layout"><div className="review-heading"><span>01</span><strong>总流程与审批</strong><em>PERSONAL IP · AI VIDEO</em></div><div className="review-flow">{[['文稿','SCRIPT','▤'],['本人声音','VOICE','◉'],['样片','SAMPLE','▶'],['成片','FINAL','▰'],['复盘','REVIEW','✓']].map(([title, note, icon], index) => <div className={`review-step review-step--${index + 1}`} key={title}><i>{index + 1}</i><b>{icon}</b><strong>{title}</strong><small>{note}</small>{index < 4 && <em>→</em>}</div>)}</div><div className="review-message"><i>✦</i><strong>明确做什么，也明确何时停止与复盘</strong></div></div>
      case 'bottomquote': {
        const quoteLines = ['真正能被记住的，', '从来不是信息量。']
        return <div className="bottom-quote-layout"><span>KEY LINE / 25</span><i>“</i><strong className="type-quote">{quoteLines.map((line, lineIndex) => <span className="type-line" key={line}>{[...line].map((character, characterIndex) => <i key={`${character}-${characterIndex}`} style={{ '--char-delay': `${0.48 + (lineIndex * 9 + characterIndex) * 0.09}s` } as CSSProperties}>{character}</i>)}</span>)}</strong><em>而是你让观众停下来的那一秒</em><b /></div>
      }
      case 'source': return <div className={`source-layout ${sourceImage ? 'has-source-image' : ''}`}><div className="source-image-frame">{sourceImage ? <img src={sourceImage.url} alt="引用资料预览" /> : <div className="source-placeholder"><i>▧</i><strong>DROP SOURCE</strong><span>SCREENSHOT / ARTICLE / DATA</span></div>}</div><div className="source-caption"><span>资料引用 / SOURCE 01</span><strong>{sourceImage ? sourceImage.name : '截图、报道或数据来源'}</strong><em>FULL FRAME REFERENCE</em></div></div>
      case 'transition': return <div className="chapter-two-layout"><div className="chapter-two-index"><small>CHAPTER</small><b>0</b><i /><em>01 / OBSERVE</em></div><div className="chapter-two-right"><small>进入第二点 / STEP TWO</small><b>2</b><strong>方法，<br />怎样真正落地？</strong><em>02 / METHOD</em></div><div className="chapter-two-corners"><span>01 观察</span><i /><span>03 复盘</span></div></div>
      case 'agenda': return <div className="agenda-layout"><small>TODAY'S MAP / 28</small><strong>今天讲三件事</strong><div>{[['01','先看变化','发生了什么'],['02','再讲方法','怎么做才有效'],['03','最后复盘','怎样持续迭代']].map(([index, title, note], position) => <article className={`agenda-item agenda-item--${position + 1}`} key={index}><i>{index}</i><span><b>{title}</b><em>{note}</em></span></article>)}</div><p>KEEP THE CENTER OPEN</p></div>
      case 'skillorbit': return <div className="skill-orbit-layout"><div className="skill-orbit-core"><b>6</b><span>SKILLS</span></div>{[['MOTION','01'],['CAPTIONS','02'],['素材','03'],['REVIEW','04'],['EXPORT','05'],['SCRIPT','06']].map(([name, index], position) => <div className={`skill-orbit-chip skill-orbit-chip--${position + 1}`} key={name}><b>{name}</b><small>{index}</small></div>)}</div>
      case 'mediawall': return <div className="media-wall-layout"><small>REFERENCE WALL / 38</small><strong>把素材放到<br /><em>该出现的位置</em></strong><div className="media-wall-grid">{['SCREEN','NOTE','DATA','PHOTO','CLIP','SOURCE'].map((label, index) => <div className={`media-tile media-tile--${index + 1}`} key={label}><i /><b>{label}</b></div>)}</div></div>
      case 'pipeline': return <div className="pipeline-layout"><small>ONE CLEAR PIPELINE / 39</small><strong>从输入到结果，<em>每一步都可见</em></strong><div className="pipeline-track">{[['01','INPUT','素材进入'],['02','BUILD','生成动效'],['03','REVIEW','人工确认'],['04','SHIP','交付成片']].map(([index, title, note], position) => <article className={`pipeline-step pipeline-step--${position + 1}`} key={index}><i>{index}</i><b>{title}</b><span>{note}</span></article>)}</div></div>
      case 'appcluster': return <div className="app-cluster-layout"><small>TOOLKIT / 40</small><strong>一套工具，<em>串起全流程</em></strong><div className="app-cluster-core">AI<br /><span>WORKFLOW</span></div>{['剪辑','字幕','素材','数据','动效','导出'].map((name, index) => <div className={`app-chip app-chip--${index + 1}`} key={name}><i>{String(index + 1).padStart(2, '0')}</i><b>{name}</b></div>)}</div>
      case 'splitboard': return <div className="split-board-layout"><div className="split-board-pane split-board-pane--left"><small>INPUT / 01</small><strong>原始素材</strong><span>脚本 · 画面 · 字幕</span></div><div className="split-board-center">→</div><div className="split-board-pane split-board-pane--right"><small>OUTPUT / 02</small><strong>完整内容</strong><span>动效 · 节奏 · 结果</span></div></div>
      case 'documentgrid': return <div className="document-grid-layout"><small>KNOWLEDGE INPUT / 42</small><strong>把资料变成<br /><em>可用的内容</em></strong><div>{['产品手册','报价规则','案例代码','流程数据','用户反馈','品牌资产'].map((name, index) => <article key={name}><i>{String(index + 1).padStart(2, '0')}</i><b>{name}</b><span>READY</span></article>)}</div></div>
      case 'flowline': return <div className="flow-line-layout"><small>CONTENT WORKFLOW / 43</small><strong>从想法到交付</strong><div className="flow-line-track">{['想法','脚本','画面','动效','交付'].map((name, index) => <span key={name}><i>{index + 1}</i><b>{name}</b></span>)}</div></div>
      case 'floatingframes': return <div className="floating-frames-layout"><small>REFERENCE WALL / 44</small><strong>素材在画面中<br /><em>各就各位</em></strong>{['A','B','C','D','E'].map((label, index) => <div className={`floating-frame floating-frame--${index + 1}`} key={label}><span>{label}</span><b>REFERENCE</b></div>)}</div>
      case 'dualmetric': return <div className="dual-metric-layout"><small>TIME × EFFICIENCY / 45</small><strong>最重要的是<br /><em>时间和效率</em></strong><div className="dual-metric-item dual-metric-item--left"><b>时间</b><span>压缩</span></div><div className="dual-metric-item dual-metric-item--right"><b>效率</b><span>提升</span></div><div className="dual-metric-line" /></div>
      case 'archflow': return <div className="arch-flow-layout"><small>CONTENT WORKFLOW / 46</small><strong>一条路径，<em>连接完整结果</em></strong><svg className="arch-flow-svg" viewBox="0 0 900 360" preserveAspectRatio="none" aria-hidden="true"><path className="arch-flow-path" d="M120 260 C260 260 300 70 450 70 C600 70 640 260 780 260" /><path className="arch-flow-path arch-flow-path--accent" d="M120 260 C260 260 300 70 450 70 C600 70 640 260 780 260" /></svg><div className="arch-node arch-node--left"><b>做视频</b><span>01 / INPUT</span></div><div className="arch-node arch-node--center"><b>持续复用</b><span>02 / FLOW</span></div><div className="arch-node arch-node--right"><b>去搞钱</b><span>03 / RESULT</span></div><div className="arch-flow-caption">素材进入　→　内容生成　→　结果沉淀</div></div>
    }
  })()
  return <section className={`motion-scene info-card info-card--${kind}`} style={sceneStyle}><div className="info-card-paper" />{kind !== 'watermark' && <PersonSafeZone />}<div className="info-card-meta"><span>{label.number} / {label.name.toUpperCase()}</span><span>OVERLAY SYSTEM</span></div>{body}{(kind === 'charts' || kind === 'timeline') && <CardAvatar />}</section>
}

function SceneThumbnail({ id }: { id: SceneId }) {
  if(id==='orbitcards')return <div className="thumb thumb--reference"><span style={{color:'#9468f5'}}>▰ ↻ ▰</span></div>
  if ((referenceScenes as readonly string[]).includes(id)) return <div className={`thumb thumb--reference thumb--reference-${id}`}><span>{({thinkcloud:'☁',questionstack:'☰',appburst:'▤ ✦',docrelay:'▧ → ✓',choicehub:'◎',checknote:'☑',growthpath:'▂▅▇',actionwindow:'▣ ↗',alertstamp:'!',arrowcallout:'➜',beforeafter:'◧ → ◨',filedrawer:'▱ ▤',insightpulse:'◌ → ◎'} as Record<string,string>)[id]}</span></div>
  if (['ring','gauge','fan','bubbles','ribbon','orbitflow','embed','merge'].includes(id)) return <div className={`thumb thumb--shape thumb--shape-${id}`}><span>{({ring:'◔',gauge:'◠',fan:'◭',bubbles:'● ●',ribbon:'☰',orbitflow:'↻',embed:'▣ → ▣',merge:'⌄'} as Record<string,string>)[id]}</span></div>
  if (id === 'metric') return <div className="thumb thumb--metric thumb--metric-number"><span>91.2<small>%</small></span></div>
  if (id === 'compare') return <div className="thumb thumb--compare"><i /><span>01</span><span>02</span><b /></div>
  if (id === 'rail') return <div className="thumb thumb--rail"><i /><span /><span /><span /></div>
  if (id === 'charts') return <div className="thumb thumb--mini thumb--charts"><i /><i /><i /><i /></div>
  if (id === 'timeline') return <div className="thumb thumb--mini thumb--timeline"><i /><span /><i /><span /><i /></div>
  if (id === 'progress') return <div className="thumb thumb--mini thumb--progress"><b>82</b><i /></div>
  if (id === 'person') return <div className="thumb thumb--mini thumb--person"><i>AM</i><span /></div>
  if (id === 'insert') return <div className="thumb thumb--mini thumb--insert"><i>＋</i><b>IMG</b></div>
  if (id === 'vote') return <div className="thumb thumb--mini thumb--vote"><i>A</i><i>B</i></div>
  if (id === 'calendar') return <div className="thumb thumb--mini thumb--calendar"><b>18</b><i /><i /></div>
  if (id === 'halo') return <div className="thumb thumb--mini thumb--halo"><i>MC</i><b>70%</b></div>
  if (id === 'orbit') return <div className="thumb thumb--mini thumb--orbit"><i>?</i><span /><span /><span /></div>
  if (id === 'triad') return <div className="thumb thumb--mini thumb--triad"><i /><i /><i /></div>
  if (id === 'board') return <div className="thumb thumb--mini thumb--board"><i /><b /><span /></div>
  if (id === 'loop') return <div className="thumb thumb--mini thumb--loop"><i /><span /><span /><span /></div>
  if (id === 'review') return <div className="thumb thumb--mini thumb--review"><i>1</i><i>2</i><i>3</i><i>4</i><i>5</i></div>
  if (id === 'bottomquote') return <div className="thumb thumb--mini thumb--bottomquote"><i>“</i><b>ONE<br />LINE.</b></div>
  if (id === 'source') return <div className="thumb thumb--mini thumb--source"><i>▧</i><b>SOURCE</b></div>
  if (id === 'transition') return <div className="thumb thumb--mini thumb--transition"><i>02</i><b>POINT</b></div>
  if (id === 'agenda') return <div className="thumb thumb--mini thumb--agenda"><i>01</i><i>02</i><i>03</i></div>
  if (id === 'watermark') return <div className="thumb thumb--mini thumb--watermark">MC</div>
  if (id === 'divider') return <div className="thumb thumb--mini thumb--divider"><b>02</b></div>
  if (id === 'arrow') return <div className="thumb thumb--mini thumb--arrow">↗</div>
  if (id === 'question') return <div className="thumb thumb--mini thumb--question">?</div>
  if (id === 'tags') return <div className="thumb thumb--mini thumb--tags"><i /><i /><i /></div>
  if (id === 'outro') return <div className="thumb thumb--mini thumb--outro">＋</div>
  if (id === 'list') return <div className="thumb thumb--mini thumb--list"><i /><i /><i /></div>
  return <div className="thumb thumb--quote"><i>“</i><span>CLARITY<br />WINS.</span><b /></div>
}

type LibraryActions={choose:(id:SceneId)=>void;add:(id:SceneId)=>void;drag:(event:ReactDragEvent<HTMLButtonElement>,id:SceneId)=>void}
function SceneLibrary({active,actions}:{active:SceneId;actions:LibraryActions}){
  const live=useRef(actions);live.current=actions
  const stable=useMemo<LibraryActions>(()=>({choose:id=>live.current.choose(id),add:id=>live.current.add(id),drag:(e,id)=>live.current.drag(e,id)}),[])
  return <StaticSceneLibrary active={active} actions={stable}/>
}
const StaticSceneLibrary=memo(function StaticSceneLibrary({active,actions}:{active:SceneId;actions:LibraryActions}){
  return <aside className="library-panel"><div className="panel-heading"><span>动效预览</span><small>{scenes.length} COMPONENTS</small></div><div className="scene-list">{scenes.map(scene=><button className={`scene-item ${active===scene.id?'is-active':''}`} key={scene.id} onClick={e=>{if((e.target as HTMLElement).closest('.scene-arrow'))actions.add(scene.id);else actions.choose(scene.id)}} draggable onDragStart={e=>actions.drag(e,scene.id)} type="button" title="单击查看，拖入画布或点＋添加"><SceneThumbnail id={scene.id}/><span className="scene-copy"><small>{scene.number}</small><b>{scene.name}</b><em>{scene.description}</em></span><span className="scene-arrow" title="添加到画布">＋</span></button>)}</div><div className="library-note"><span>COLLECTION</span><b>ESSENTIAL MOTIONS</b><p>{scenes.length} 组可参数化短视频动效模块。</p></div></aside>
})

function Field({ label, value, onChange, type = 'text', min, max, step }: { label: string; value: string | number; onChange: (value: string) => void; type?: 'text' | 'number'; min?: number; max?: number; step?: number }) {
  return <label className="control-field"><span>{label}</span><input type={type} value={value} min={min} max={max} step={step} onChange={(event) => onChange(event.target.value)} /></label>
}

function Range({ label, value, onChange, min, max, step = 1, suffix = '' }: { label: string; value: number; onChange: (value: number) => void; min: number; max: number; step?: number; suffix?: string }) {
  return <label className="range-field"><span><b>{label}</b><em>{value}{suffix}</em></span><input type="range" value={value} min={min} max={max} step={step} onInput={(event) => onChange(Number(event.currentTarget.value))} onChange={(event) => onChange(Number(event.target.value))} /></label>
}

export default function App() {
  const [presenter,setPresenter]=useState<PresenterSettings>(presenterDefault)
  const [layoutClips,setLayoutClips]=useState<LayoutClip[]>([])
  const [exportKind,setExportKind]=useState<'mov'|'mp4'>('mov')
  const [renderFull,setRenderFull]=useState(false)
  const [activeScene, setActiveScene] = useState<SceneId>('metric')
  // Start paused so a restored draft does not trigger a browser autoplay
  // rejection before the imported video has loaded. Playback is still
  // controlled by the transport button and the explicit autoplay toggle.
  const [playing, setPlaying] = useState(false)
  const [duration, setDuration] = useState(7)
  const [currentTime, setCurrentTime] = useState(0)
  const clockRef = useRef(0)
  const restoredTimeRef=useRef<number|null>(null)
  const [videoDuration, setVideoDuration] = useState(0)
  const [cues, setCues] = useState<SubtitleCue[]>([])
  const [captionStyle,setCaptionStyle]=useState<CaptionStyle>(captionDefault)
  const [audioClips,setAudioClips]=useState<AudioClip[]>([])
  const soundMedia = useRef<Partial<Record<BuiltinSound,string>>>({})
  const [generatingEmphasis,setGeneratingEmphasis]=useState(false)
  const srtInputRef=useRef<HTMLInputElement>(null)
  const importToTrack=useRef(false)
  const [subtitleName, setSubtitleName] = useState('')
  const [arrangeMessage, setArrangeMessage] = useState('')
  const [autoProcessStage, setAutoProcessStage] = useState<AutoProcessStage>('idle')
  const [pauseSuggestions, setPauseSuggestions] = useState<PauseGap[]>([])
  const autoProcessRun = useRef(0)
  const [transcriptionStage, setTranscriptionStage] = useState<TranscriptionStage>('idle')
  const transcriptionRun = useRef(0)
  const [mediaError, setMediaError] = useState('')
  const [subtitleWarnings, setSubtitleWarnings] = useState<string[]>([])
  const [runKey, setRunKey] = useState(1)
  const [editorMode, setEditorMode] = useState(true)
  const [canvasAspect, setCanvasAspect] = useState<(typeof CANVAS_ASPECTS)[number]['id']>('3 / 4')
  const [previewScale, setPreviewScale] = useState<'small' | 'medium' | 'large'>(() => {
    const saved = localStorage.getItem('overlay-preview-scale')
    return saved === 'small' || saved === 'large' ? saved : 'medium'
  })
  useEffect(() => { localStorage.setItem('overlay-preview-scale', previewScale) }, [previewScale])
  const previewHeightLimit = { small: 'min(52vh, 680px)', medium: 'min(64vh, 820px)', large: 'min(78vh, 1000px)' }[previewScale]
  const [ratioA, ratioB] = canvasAspect.split(' / ').map(Number)
  const CANVAS_WIDTH = ratioA >= ratioB ? Math.round(1080 * ratioA / ratioB) : 1080
  const CANVAS_HEIGHT = ratioA >= ratioB ? 1080 : Math.round(1080 * ratioB / ratioA)
  const CANVAS_X_UNIT = CANVAS_WIDTH / 100
  const CANVAS_Y_UNIT = CANVAS_HEIGHT / 100
  const CANVAS_ASPECT_RATIO = CANVAS_WIDTH / CANVAS_HEIGHT
  const viewportRef = useRef<HTMLDivElement>(null)
  const [previewSize, setPreviewSize] = useState({ width: 1, height: 1 })
  useEffect(() => {
    const node = viewportRef.current
    if (!node) return
    const observer = new ResizeObserver(([entry]) => {
      const width = Math.min(entry.contentRect.width, entry.contentRect.height * CANVAS_ASPECT_RATIO)
      const height = width / CANVAS_ASPECT_RATIO
      setPreviewSize(current => Math.abs(current.width - width) < 0.5 && Math.abs(current.height - height) < 0.5 ? current : { width, height })
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [CANVAS_ASPECT_RATIO])
  const [showOverlayLayers, setShowOverlayLayers] = useState(true)
  const [showLayoutGuides,setShowLayoutGuides]=useState(true)
  const [canvasLayers, setCanvasLayers] = useState<CanvasLayer[]>([])
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null)
  const [partTransforms, setPartTransforms] = useState<Record<string, Record<string, PartTransform>>>({})
  const [partTextOverrides, setPartTextOverrides] = useState<Record<string, Record<string, string>>>({})
  const [exportOpen, setExportOpen] = useState(false)
  const [incoming, setIncoming] = useState<{id:string;plan:unknown;cues:SubtitleCue[];subtitleName:string}|null>(null)
  const [arrangementId, setArrangementId] = useState('')
  useEffect(() => {
    if (RENDER_JOB) return
    const checkArrangement = () => { void fetch('/__studio/arrangement').then(r => r.json()).then(data => {
      if (data?.id && sessionStorage.getItem('overlay-incoming-id') !== data.id) {
        setIncoming(data)
      }
    }).catch(() => {}) }
    const timer = setInterval(checkArrangement, 3000)
    return () => clearInterval(timer)
  }, [])
  const [availableParts, setAvailableParts] = useState<SelectedPart[]>([])
  const [selectedPart, setSelectedPart] = useState<SelectedPart | null>(null)
  const [selectedPartTextFields, setSelectedPartTextFields] = useState<PartTextField[]>([])
  const [videoSource, setVideoSource] = useState<{ url: string; name: string } | null>(null)
  const ownedVideoUrls = useRef(new Set<string>())
  const [videoMuted, setVideoMuted] = useState(false)
  const [videoVolume, setVideoVolume] = useState(90)
  const [materials, setMaterials] = useState<MaterialAsset[]>([])
  const [materialQuery, setMaterialQuery] = useState('')
  const [sourceImage, setSourceImage] = useState<{ url: string; name: string } | null>(null)
  const [insertImage, setInsertImage] = useState<{ url: string; name: string } | null>(null)
  const [metricPreset, setMetricPreset] = useState(metricDefault)
  const [comparePreset, setComparePreset] = useState(compareDefault)
  const [quotePreset, setQuotePreset] = useState(quoteDefault)
  const [railPreset, setRailPreset] = useState(railDefault)
  const [cardLayoutPresets, setCardLayoutPresets] = useState<Partial<Record<SceneId, CardLayoutPreset>>>({})
  const videoInputRef = useRef<HTMLInputElement>(null)
  const sourceImageInputRef = useRef<HTMLInputElement>(null)
  const insertImageInputRef = useRef<HTMLInputElement>(null)
  const projectInputRef = useRef<HTMLInputElement>(null)
  const materialInputRef = useRef<HTMLInputElement>(null)
  const editorGestureRef = useRef<{ mode: 'move' | 'resize' | 'part-move' | 'part-resize'; startX: number; startY: number; layer: CanvasLayer; canvasWidth: number; canvasHeight: number; partKey?: string; partStart?: PartTransform } | null>(null)
  const previewVideoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const selectedSourceLayer = canvasLayers.find((layer) => layer.id === selectedLayerId) ?? null
  const selectedLayer=useMemo(()=>selectedSourceLayer?.type==='image'?fitMaterialRect(selectedSourceLayer,layoutAt(layoutClips,currentTime)?.settings??presenter,CANVAS_WIDTH,CANVAS_HEIGHT):selectedSourceLayer,[selectedSourceLayer,layoutClips,currentTime,presenter,CANVAS_WIDTH,CANVAS_HEIGHT])
  const materialSuggestions = useMemo(() => {
    const text = cues.map(cue => cue.text).join(' ')
    const known = ['豆包','豆瓣','腾讯','WorkBuddy','ChatGPT','DeepSeek','微信','剪映','抖音','小红书','飞书','钉钉','支付宝']
    return known.filter(name => text.toLowerCase().includes(name.toLowerCase())).map(name => `${name} logo`)
  }, [cues])
  const visibleMaterials = useMemo(() => {
    const query = materialQuery.trim().toLowerCase()
    return query ? materials.filter(item => `${item.name} ${item.tags.join(' ')}`.toLowerCase().includes(query)) : materials
  }, [materials, materialQuery])
  const metric = selectedLayer?.settings?.metric ?? metricPreset
  const compare = selectedLayer?.settings?.compare ?? comparePreset
  const quote = selectedLayer?.settings?.quote ?? quotePreset
  const rail = selectedLayer?.settings?.rail ?? railPreset
  const setCardSetting = (key: 'metric' | 'compare' | 'quote' | 'rail', value: MetricSettings | CompareSettings | QuoteSettings | RailSettings) => {
    if (selectedLayer && !selectedLayer.script) setCanvasLayers(layers => layers.map(layer => layer.id === selectedLayer.id ? { ...layer, settings: { metric, compare, quote, rail, ...layer.settings, [key]: value } } as CanvasLayer : layer))
    else if (key === 'metric') setMetricPreset(value as MetricSettings)
    else if (key === 'compare') setComparePreset(value as CompareSettings)
    else if (key === 'quote') setQuotePreset(value as QuoteSettings)
    else setRailPreset(value as RailSettings)
  }
  const setMetric = (value: MetricSettings) => setCardSetting('metric', value)
  const setCompare = (value: CompareSettings) => setCardSetting('compare', value)
  const setQuote = (value: QuoteSettings) => setCardSetting('quote', value)
  const setRail = (value: RailSettings) => setCardSetting('rail', value)
  const totalDuration = videoDuration || (canvasLayers.some(l=>l.review)?Math.max(.1,...cues.map(c=>c.end),...canvasLayers.map(l=>l.end??0),...audioClips.map(c=>c.end)):Math.max(duration, ...cues.map(c => c.end), ...canvasLayers.map(l => l.end ?? 0)))
  const previewSourceGain=sourceAudioGain({canvasLayers,audioClips,videoMuted,videoVolume},totalDuration)
  const seek = (seconds: number) => {
    const next = Math.max(0, Math.min(totalDuration, seconds))
    clockRef.current = next
    setCurrentTime(next)
    if (previewVideoRef.current && videoDuration) previewVideoRef.current.currentTime = next
  }
  const reviewVoiceActive=canvasLayers.some(l=>l.visible&&l.review?.project.media.voice&&currentTime>=(l.start??0)&&currentTime<(l.end??0))
  useEffect(() => {
    if (RENDER_JOB) return
    if (!playing) return
    let frame = 0, previous = performance.now(), lastPaint = -Infinity
    const tick = (now: number) => {
      const video = previewVideoRef.current
      if (playing) {
        const next = videoSource ? video?.currentTime ?? 0 : Math.min(totalDuration, clockRef.current + (now - previous) / 1000)
        clockRef.current = next
        // A 30 fps source does not need a full editor render at 60/120 Hz.
        // Keep the video as the clock; never seek it to catch up the UI.
        if (now - lastPaint >= 1000 / 30 - 2) { setCurrentTime(next); lastPaint = now }
        if (!videoSource && next >= totalDuration) setPlaying(false)
      }
      previous = now
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [playing, videoSource, totalDuration])
  // Discover legacy CSS animations only when layers change. Calling
  // getAnimations for every image/text layer on every frame forces style
  // resolution across the entire canvas, causing periodic playback hitches.
  const legacyAnimations = useRef<{animation:Animation;start:number}[]>([])
  useEffect(() => {
    const animations:{animation:Animation;start:number}[]=[]
    canvasRef.current?.querySelectorAll<HTMLElement>('.canvas-layer').forEach(element => {
      const layer = canvasLayers.find(item => item.id === element.dataset.layerId)
      if (!layer || layer.script || !(layer.type==='card'||layer.textStyle==='emphasis')) return
      for (const animation of element.getAnimations({ subtree: true })) {
        animation.pause()
        animations.push({animation,start:layer.start??0})
      }
    })
    legacyAnimations.current=animations
  }, [canvasLayers, runKey])
  useEffect(()=>{
    for(const {animation,start} of legacyAnimations.current) animation.currentTime=Math.max(0,currentTime-start)*1000
  },[currentTime,canvasLayers,runKey])
  const selectedPartTransform = selectedPart ? partTransforms[selectedPart.layerId]?.[selectedPart.key] ?? { x: 0, y: 0, scale: 1 } : null

  useEffect(() => {
    const schemaKey = 'overlay-studio-editor-schema'
    if (window.sessionStorage.getItem(schemaKey) === EDITOR_SCHEMA_VERSION) return
    window.sessionStorage.setItem(schemaKey, EDITOR_SCHEMA_VERSION)
    setCanvasLayers([])
    setPartTransforms({})
    setPartTextOverrides({})
    setSelectedLayerId(null)
    setSelectedPart(null)
    setActiveScene('metric')
  }, [])

  // Keep imported URLs alive across undo/redo; release them when this editor closes.
  useEffect(() => () => { ownedVideoUrls.current.forEach(url => URL.revokeObjectURL(url)) }, [])

  useEffect(() => () => {
    if (sourceImage) URL.revokeObjectURL(sourceImage.url)
  }, [sourceImage])

  useEffect(() => () => {
    if (insertImage) URL.revokeObjectURL(insertImage.url)
  }, [insertImage])

  useEffect(() => {
    const video = previewVideoRef.current
    if (!video || !videoSource) return
    video.muted = previewSourceGain===0 || reviewVoiceActive || Boolean(RENDER_JOB)
    video.volume = previewSourceGain
  }, [videoSource, previewSourceGain,reviewVoiceActive])
  useEffect(()=>{
    const video=previewVideoRef.current;if(!video||!videoSource||RENDER_JOB)return
    let cancelled=false
    if(!playing){video.pause();return()=>{cancelled=true}}
    // Do not report a decode error while the browser is still loading the
    // local media. The canplay handler below retries once a playable frame is
    // available.
    if(video.readyState < HTMLMediaElement.HAVE_FUTURE_DATA)return()=>{cancelled=true}
    void video.play().then(()=>{
      if(!cancelled)setMediaError('')
    }).catch(e=>{
      if(cancelled||e.name==='AbortError')return
      // NotAllowedError is the normal browser response to an unprompted
      // autoplay attempt. Leave the editor paused and wait for a click.
      if(e.name==='NotAllowedError'){setPlaying(false);return}
      setPlaying(false);setMediaError('视频播放未能开始，请再点击播放；若仍失败请检查视频格式。')
    })
    return()=>{cancelled=true}
  },[playing,videoSource])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let nextSelectedTextFields: PartTextField[] = []
    const nextParts: SelectedPart[] = []
    canvas.querySelectorAll<HTMLElement>('.canvas-layer--card').forEach((layerElement) => {
      const layerId = layerElement.dataset.layerId
      if (!layerId) return
      const counters: Record<string, number> = {}
      const parts = [...layerElement.querySelectorAll<HTMLElement>(`${EDITABLE_PART_SELECTOR},.script-part,[data-part-id]`)]
      const originalParts = [...parts]
      if (!canvasLayers.find(layer => layer.id === layerId)?.script) {
        const extras = [...layerElement.querySelectorAll<HTMLElement>('.motion-scene div,.motion-scene span,.motion-scene b,.motion-scene strong,.motion-scene small,.motion-scene em,.motion-scene p,.motion-scene i,.motion-scene img,.motion-scene svg,.bar-chart>i,.progress-track,.chart-donut,.rail-track,.loop-track')].filter(node => !parts.includes(node) && ((node.children.length === 0 && (Boolean(node.textContent?.trim()) || node.dataset.partId?.startsWith('detail-'))) || node.matches('img,svg,.bar-chart>i,.progress-track,.chart-donut,.rail-track,.loop-track')) && !node.closest('.person-safe-zone,.info-card-meta,.metric-corner,.compare-meta,.quote-top,.quote-bottom,.rail-header,.rail-footer'))
        extras.forEach(node => {
          const path: number[] = []; let current: Element | null = node
          while (current && current !== layerElement) { path.unshift(Array.from(current.parentElement?.children ?? []).indexOf(current)); current = current.parentElement }
          node.dataset.partId = `detail-${path.join('-')}`
          node.dataset.partLabel = node.textContent?.trim().slice(0, 16) || (node.tagName === 'IMG' ? '图片' : '图形')
        })
        parts.push(...extras)
      }
      parts.forEach((part) => {
        const base = [...part.classList].find((name) => !name.startsWith('is-') && !name.includes('--')) ?? part.tagName.toLowerCase()
        counters[base] = (counters[base] ?? 0) + 1
        const key = part.dataset.partId || `${base}-${counters[base]}`
        part.dataset.editorPart = key
        part.dataset.editorLabel = part.dataset.partLabel || partLabelFromElement(part)
        if (layerId === selectedLayerId) nextParts.push({ layerId, key, label: part.dataset.editorLabel })
      })
      // Keep pre-v5 grouped text edits when exposing new individual leaf controls.
      if (!canvasLayers.find(layer => layer.id === layerId)?.script) originalParts.forEach(part => {
        const leaves = [part, ...part.querySelectorAll<HTMLElement>('b,strong,small,em,p,span')].filter(node => {
          let owner: HTMLElement | null = node
          while (owner && !originalParts.includes(owner)) owner = owner.parentElement
          return owner === part && ['B','STRONG','SMALL','EM','P','SPAN'].includes(node.tagName) && node.children.length === 0 && Boolean(node.textContent?.trim())
        })
        leaves.forEach((node,index) => { const text=partTextOverrides[layerId]?.[`${part.dataset.editorPart}:text-${index+1}`];if(text !== undefined && node.textContent !== text) node.textContent=text })
      })
      parts.forEach((part) => {
        const key = part.dataset.editorPart!
        const transform = partTransforms[layerId]?.[key] ?? { x: 0, y: 0, scale: 1 }
        part.style.translate = `${transform.x / CANVAS_X_UNIT}cqw ${transform.y / CANVAS_X_UNIT}cqw`
        part.style.scale = String(transform.scale)
        if (part.dataset.editorInline === undefined) part.dataset.editorInline = String(getComputedStyle(part).display === 'inline')
        part.style.display = transform.hidden ? 'none' : part.dataset.editorInline === 'true' ? 'inline-block' : ''
        part.style.filter = transform.opacity !== undefined ? `opacity(${transform.opacity / 100})` : ''
        part.style.setProperty('--part-color', transform.color || '')
        part.toggleAttribute('data-custom-color', Boolean(transform.color))
        part.style.setProperty('background', transform.background || '')
        part.style.fontFamily = transform.fontFamily || ''

        part.classList.toggle('is-part-selected', selectedPart?.layerId === layerId && selectedPart.key === key)
        // Script content is edited through its typed fields, not DOM text replacement.
        if (canvasLayers.find(layer => layer.id === layerId)?.script) return
        const textNodes = [part, ...part.querySelectorAll<HTMLElement>('b,strong,small,em,p,span,i,div')].filter((node) => {
          const tag = node.tagName.toLowerCase()
          return ['b', 'strong', 'small', 'em', 'p', 'span', 'i', 'div'].includes(tag) && node.children.length === 0 && (Boolean(node.textContent?.trim()) || node.dataset.editorText) && node.closest<HTMLElement>('[data-editor-part]') === part
        })
        textNodes.forEach((node, index) => {
          const textKey = `${key}:text-${index + 1}`
          const override = partTextOverrides[layerId]?.[textKey]
          const liveText = node.textContent?.trim() ?? ''
          if (override === undefined) node.dataset.editorOriginalText = liveText
          const originalText = node.dataset.editorOriginalText ?? liveText
          node.dataset.editorText = textKey
          if (override !== undefined && node.textContent !== override) node.textContent = override
          if (selectedPart?.layerId === layerId && selectedPart.key === key) {
            nextSelectedTextFields.push({ key: textKey, label: `文字 ${index + 1} · ${originalText.slice(0, 12)}`, value: override ?? originalText })
          }
        })
      })
    })
    setAvailableParts(current => JSON.stringify(current) === JSON.stringify(nextParts) ? current : nextParts)
    setSelectedPartTextFields((current) => JSON.stringify(current) === JSON.stringify(nextSelectedTextFields) ? current : nextSelectedTextFields)
  }, [canvasLayers, partTransforms, partTextOverrides, selectedPart, selectedLayerId, runKey])

  const active = useMemo(() => scenes.find((scene) => scene.id === activeScene)!, [activeScene])
  const togglePlayback = () => {
    if (!playing && currentTime >= totalDuration - .05) seek(0)
    setPlaying(state => !state)
    if (!playing && previewVideoRef.current) {
      const video = previewVideoRef.current
      // Keep this call inside the click handler so browsers that require a
      // user gesture for audible media can start playback reliably.
      void video.play().then(() => setMediaError('')).catch(error => {
        if (error?.name === 'AbortError') return
        if (error?.name === 'NotAllowedError') {
          setPlaying(false)
          setMediaError('浏览器阻止了有声播放，请再点击一次播放按钮。')
          return
        }
        setPlaying(false)
        setMediaError('视频播放未能开始，请点击“重试视频”。')
      })
    }
  }
  const restart = () => {
    seek(0)
    setRunKey((value) => value + 1)
    setPlaying(true)
  }
  const importVideo = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !file.type.startsWith('video/')) return
    const isNewVideo = Boolean(videoSource && videoSource.name !== file.name)
    transcriptionRun.current += 1
    autoProcessRun.current += 1
    setVideoDuration(0)
    setCaptionStyle(style => ({ ...style, enabled: false }))
    setMediaError('')
    setAutoProcessStage('idle')
    setPauseSuggestions([])
    setTranscriptionStage('idle')
    setArrangeMessage('')
    clockRef.current = 0
    setCurrentTime(0)
    const url = URL.createObjectURL(file)
    ownedVideoUrls.current.add(url)
    setVideoSource({ url, name: file.name })
    setArrangeMessage(isNewVideo
      ? '已替换人物视频，当前动效、素材和字幕轨已保留。请导入对应 SRT；如需清空，请在图层编辑器中点击“清空全部图层”。'
      : '')
    setPlaying(false)
    setRunKey((value) => value + 1)
  }
  const clearVideo = () => {
    transcriptionRun.current += 1
    autoProcessRun.current += 1
    setVideoSource(null)
    setVideoDuration(0)
    setCues([])
    setSubtitleName('')
    setSubtitleWarnings([])
    setCaptionStyle(style => ({ ...style, enabled: false }))
    setTranscriptionStage('idle')
    setAutoProcessStage('idle')
    setPauseSuggestions([])
    setArrangeMessage('视频和字幕已清空，可以重新导入。')
    setMediaError('')
    setPlaying(false)
    clockRef.current = 0
    setCurrentTime(0)
    if (videoInputRef.current) videoInputRef.current.value = ''
  }
  const retryVideo = () => {
    const video = previewVideoRef.current
    if (!video) return
    restoredTimeRef.current = currentTime
    setPlaying(false)
    setMediaError('')
    video.load()
  }
  const importSourceImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    setSourceImage({ url: URL.createObjectURL(file), name: file.name })
    setRunKey((value) => value + 1)
  }
  const clearSourceImage = () => {
    setSourceImage(null)
    if (sourceImageInputRef.current) sourceImageInputRef.current.value = ''
  }
  const importInsertImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    setInsertImage({ url: URL.createObjectURL(file), name: file.name })
    setRunKey((value) => value + 1)
  }
  const clearInsertImage = () => {
    setInsertImage(null)
    if (insertImageInputRef.current) insertImageInputRef.current.value = ''
  }
  const importMaterials = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = [...(event.target.files ?? [])].filter(file => /^(image|video)\//.test(file.type) || /\.(mp4|mov|webm)$/i.test(file.name))
    event.target.value = ''
    const toTrack = importToTrack.current; importToTrack.current = false
    if (!files.length) return
    setArrangeMessage('正在导入素材…')
    const imported: MaterialAsset[] = [], failures: string[] = []
    for (const file of files) {
      try {
        const tags=file.name.replace(/\.[^.]+$/, '').split(/[\s_-]+/).filter(Boolean)
        if (file.type.startsWith('video/') || /\.(mp4|mov|webm)$/i.test(file.name)) {
          const mime=file.type || (/\.mov$/i.test(file.name)?'video/quicktime':/\.webm$/i.test(file.name)?'video/webm':'video/mp4')
          const media=await uploadLocalMedia(file.type?file:new Blob([file],{type:mime}),file.name)
          const meta=await readVideoMetadata(media.url)
          imported.push({id:createAssetId(),name:file.name,url:media.url,tags,kind:'video',...meta})
        } else {
          const url=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(Error('文件读取失败'));reader.readAsDataURL(file)})
          const lower=file.name.toLowerCase()
          imported.push({id:createAssetId(),name:file.name,url,tags,kind:/logo|图标|icon/.test(lower)?'logo':/截[图屏]|screenshot|document|文件/.test(lower)?'screenshot':'image'})
        }
      } catch(error) { failures.push(`${file.name}：${(error as Error).message}`) }
    }
    setMaterials(items=>[...items,...imported])
    if(toTrack){imported.forEach(asset=>addMaterialLayer(asset));setPlaying(false)}
    setArrangeMessage(`已导入 ${imported.length} 个素材。${failures.join('；')}`)
  }
  const chooseScene = (id: SceneId) => {
    setActiveScene(id)
    setSelectedLayerId(null)
    setSelectedPart(null)
  }
  const changeAspect = (next: typeof canvasAspect) => {
    if(next!=='16 / 9'&&canvasLayers.some(l=>l.review)){setArrangeMessage('成果审阅当前支持横屏 16:9，请先移除该模板再切换画幅。');return}
    const [a, b] = next.split(' / ').map(Number)
    const width = a >= b ? Math.round(1080 * a / b) : 1080
    const height = a >= b ? 1080 : Math.round(1080 * b / a)
    const sx = width / CANVAS_WIDTH, sy = height / CANVAS_HEIGHT
    setCanvasLayers(layers => layers.map(layer => ({ ...layer, x: layer.x * sx, y: layer.y * sy, width: layer.width * sx, height: layer.height * sy, fontSize: layer.fontSize * sx })))
    setPartTransforms(parts => Object.fromEntries(Object.entries(parts).map(([id, values]) => [id, Object.fromEntries(Object.entries(values).map(([key, value]) => [key, { ...value, x: value.x * sx, y: value.y * sy }]))])))
    editorGestureRef.current = null
    setCanvasAspect(next)
  }
  const updateLayer = (id: string, updates: Partial<CanvasLayer>) => {
    const storyLayer=canvasLayers.find(l=>l.id===id);if(storyLayer?.story&&(updates.start!==undefined||updates.end!==undefined)){if((updates.start??storyLayer.start)!==0||Math.abs((updates.end??storyLayer.end??0)-storyLayer.story.duration)>.01){setArrangeMessage('全片模板与口播、字幕共同绑定；请在全片编辑器调整内容，不单独移动整条编排。');return false}}
    const layer=canvasLayers.find(l=>l.id===id)
    if(layer?.review&&(updates.start!==undefined||updates.end!==undefined)){
      try{const start=updates.start??layer.start??0,end=updates.end??layer.end??start+layer.review.project.params.duration
        if(videoDuration&&end>videoDuration+.01)throw Error('模板超出人物视频时长')
        if(canvasLayers.some(l=>l.id!==id&&l.review&&(l.start??0)<end&&(l.end??0)>start))throw Error('完整模板场景暂不支持重叠，请调整片段位置')
        updates={...updates,review:resizeReviewBinding(updates.review??layer.review,start,end)}
      }catch(e){setArrangeMessage((e as Error).message);return false}
    }
    setCanvasLayers(layers=>layers.map(l=>l.id===id?{...l,...updates}:l));return true
  }
  const insertReview = (binding:ReviewBinding) => {
    if(canvasAspect!=='16 / 9'){setArrangeMessage('请先把画幅切换为横屏 16:9，再添加成果审阅模板。');return false}
    const start=currentTime,end=start+binding.project.params.duration
    if(videoDuration&&end>videoDuration+.01){setArrangeMessage('当前位置剩余时长不足，请移动播放头或缩短模板。');return false}
    if(canvasLayers.some(l=>l.review&&(l.start??0)<end&&(l.end??0)>start)){setArrangeMessage('完整模板场景暂不支持重叠，请把播放头移到已有模板之后。');return false}
    const layer:CanvasLayer={id:createLayerId(),type:'card',sceneId:'team-review',review:binding,x:0,y:0,width:CANVAS_WIDTH,height:CANVAS_HEIGHT,fontSize:48,zIndex:Math.max(0,...canvasLayers.map(l=>l.zIndex))+1,visible:true,start,end}
    setCanvasLayers(layers=>[...layers,layer]);setSelectedLayerId(layer.id);setSelectedPart(null);setActiveScene('team-review');setEditorMode(true);setPlaying(false);setArrangeMessage('成果审阅模板已加入时间轴，正在准备关联声音。');return true
  }
  const changeReviewParams=(layer:CanvasLayer,patch:Partial<ReviewParams>)=>{if(!layer.review)return;updateLayer(layer.id,{review:{...layer.review,project:{...layer.review.project,params:{...layer.review.project.params,...patch}}}})}

  const rememberCardLayout = (layer: CanvasLayer) => {
    if (layer.type !== 'card' || !layer.sceneId) return
    setCardLayoutPresets(presets => ({ ...presets, [layer.sceneId!]: { x: layer.x, y: layer.y, width: layer.width, height: layer.height, fontSize: layer.fontSize } }))
  }
  const addCardLayer = (sceneId: SceneId, position?: { x: number; y: number }) => {
    if(sceneId==='team-story'){setArrangeMessage('请打开已制作的全片模板工程；完整口播与事件时码绑定后使用。');return}
    if(sceneId==='team-review'){insertReview({project:{format:'overlay-review-project',version:1,template:'team.artifact-review@0.2.0',params:{...reviewDefaults},media:{video:null,voice:null,music:null}}});return}
    setEditorMode(true)
    const zIndex = Math.max(0, ...canvasLayers.map((layer) => layer.zIndex)) + 1
    const preset = cardLayoutPresets[sceneId]
    const layer: CanvasLayer = {
      id: createLayerId(), type: 'card', sceneId,
      start: videoDuration ? Math.min(currentTime, Math.max(0, videoDuration - duration)) : currentTime, end: videoDuration ? Math.min(videoDuration, currentTime + duration) : currentTime + duration,
      settings: { metric: sceneId === 'metric' ? { ...metricPreset, numberOnly: true } : metricPreset, compare: comparePreset, quote: quotePreset, rail: railPreset },
      x: preset?.x ?? 0, y: preset?.y ?? 0, width: preset?.width ?? CANVAS_WIDTH, height: preset?.height ?? CANVAS_HEIGHT, fontSize: preset?.fontSize ?? 48, fontFamily: FONT_OPTIONS[0].value, zIndex, visible: true,
    }
    if (['orbitcards','ring','gauge','fan','bubbles','ribbon','orbitflow','embed','merge',...referenceScenes].includes(sceneId as ScriptTemplate)) {
      layer.cueIds=[];layer.reason='手动添加，可自由编辑'
      layer.script = {title:scenes.find(s=>s.id===sceneId)?.description || '重点内容',value:['metric','progress','ring','gauge'].includes(sceneId)?'75%':'',items:['ring','gauge','metric','progress','bottomquote','question','transition','person'].includes(sceneId)?[]:sceneId==='compare'?['调整之前','调整之后']:['看得清','听得懂','用得上'],note:'点击右侧修改文案',placement:position && position.x > CANVAS_WIDTH/2?'right':'left'}
      layer.script.note=''
      const titles:Partial<Record<SceneId,string>>={ring:'目标完成进度',gauge:'当前完成度',fan:'抓住三个重点',bubbles:'把事情说明白',ribbon:'记住这三件事',orbitflow:'一起把事情做好',embed:'解决方案',merge:'架构师',question:'这件事，与你有什么关系？',metric:'看清关键数字',bottomquote:'复杂的事情，也可以讲明白'}
      layer.script.title=titles[sceneId]??layer.script.title
      const referenceDefaults:Partial<Record<ScriptTemplate,Pick<ScriptContent,'title'|'items'|'note'>>>={
        thinkcloud:{title:'AI 到底能帮我什么？',items:[],note:''},
        questionstack:{title:'这些问题，都可以问',items:['是什么？','为什么？','怎么做？'],note:''},
        appburst:{title:'一套工具，协同完成',items:['输入','定位','声音','交付'],note:''},
        docrelay:{title:'从初稿到完成',items:['生成初稿','人工修改','确认完成'],note:''},
        choicehub:{title:'聚焦合适的方案',items:['候选一','候选二','候选三'],note:''},
        checknote:{title:'今天的清单',items:['明确目标','逐项核对','交付结果'],note:''},
        growthpath:{title:'一步步向前',items:['先做一件事','养成习惯','再加一件'],note:''},
        actionwindow:{title:'保存为智能体',items:['我的专属助手'],note:'立即保存'},
        alertstamp:{title:'别等！',items:[],note:''},
        arrowcallout:{title:'复制粘贴',items:[],note:''},
        beforeafter:{title:'前后变化',items:['普通输出','更像你写的'],note:''},
        filedrawer:{title:'把资料整理好',items:['说明书','客户资料','项目记录'],note:''},
        insightpulse:{title:'几乎一样的判断',items:['企业服务的朋友'],note:''},
      }
      if(referenceDefaults[sceneId as ScriptTemplate]) layer.script={...layer.script,...referenceDefaults[sceneId as ScriptTemplate]!}
      if(sceneId==='orbitcards')layer.script={...layer.script,title:'先投入，再找答案',value:'先投入',items:['产品','时间','资金','团队','客户','需求'],note:'需求有没有人买单，先试一遍才知道'}
    }
    setCanvasLayers((layers) => [...layers, layer])
    setSelectedLayerId(layer.id)
    setSelectedPart(null)
    setActiveScene(sceneId)
    seek(layer.start ?? 0)
    setRunKey((value) => value + 1)
    setPlaying(true)
  }
  const addTextLayer = () => {
    setEditorMode(true)
    const zIndex = Math.max(0, ...canvasLayers.map((layer) => layer.zIndex)) + 1
    const layer: CanvasLayer = { id: createLayerId(), type: 'text', text: '双击右侧文字内容进行编辑', textStyle: 'panel', fontFamily: FONT_OPTIONS[0].value, x: CANVAS_WIDTH * .1, y: CANVAS_HEIGHT * .75, width: CANVAS_WIDTH * .65, height: 130, fontSize: 42, zIndex, visible: true, start: Math.min(currentTime, Math.max(0,totalDuration-.1)), end: Math.min(totalDuration, currentTime + duration) }
    setCanvasLayers((layers) => [...layers, layer])
    setSelectedLayerId(layer.id)
    setSelectedPart(null)
  }
  const addMaterialLayer = (asset: MaterialAsset, position?: { x: number; y: number }) => {
    setEditorMode(true)
    const zIndex = Math.max(0, ...canvasLayers.map(layer => layer.zIndex)) + 1
    const width = asset.kind === 'logo' ? CANVAS_WIDTH * .16 : CANVAS_WIDTH * .3
    const height = asset.kind === 'logo' ? width : asset.kind==='video' && asset.width && asset.height ? Math.min(CANVAS_HEIGHT*.65,width*asset.height/asset.width) : width * .62
    const start = Math.min(currentTime, Math.max(0,totalDuration-.1))
    const x = Math.max(0, Math.min(CANVAS_WIDTH - width, position?.x ?? CANVAS_WIDTH * .73))
    const y = Math.max(0, Math.min(CANVAS_HEIGHT - height, position?.y ?? CANVAS_HEIGHT * .16))
    const layer: CanvasLayer = { id: createLayerId(), type: 'image', assetId: asset.id, assetUrl: asset.url, assetName: asset.name, mediaType:asset.kind==='video'?'video':undefined, sourceDuration:asset.duration, sourceOffset:asset.kind==='video'?0:undefined, x, y, width, height, fontSize: 42, zIndex, visible: true, start, end: Math.min(totalDuration, start + (asset.kind==='video'?asset.duration??duration:duration)), presentation: {frame: asset.kind==='screenshot'||asset.kind==='video'?'web':'rounded', motion:'fade', motionDuration:.55, fit:'contain', title: asset.name} }
    setCanvasLayers(layers => [...layers, layer])
    setSelectedLayerId(layer.id); setSelectedPart(null); setPlaying(false)
  }
  const removeLayer = (id: string) => {
    setCanvasLayers((layers) => layers.filter((layer) => layer.id !== id))
    setPartTransforms((transforms) => {
      const next = { ...transforms }
      delete next[id]
      return next
    })
    setPartTextOverrides((overrides) => {
      const next = { ...overrides }
      delete next[id]
      return next
    })
    if (selectedLayerId === id) setSelectedLayerId(null)
    if (selectedPart?.layerId === id) setSelectedPart(null)
  }
  const clearAllLayers = () => {
    if (!window.confirm('确定清空画布中的所有卡片和文字吗？')) return
    setCanvasLayers([])
    setPartTransforms({})
    setPartTextOverrides({})
    setSelectedLayerId(null)
    setSelectedPart(null)
  }
  const selectLayer = (layer: CanvasLayer) => {
    setEditorMode(true)
    setPlaying(false)
    if (!isLayerActive(clockRef.current, layer.start, layer.end)) seek((layer.start ?? 0) + Math.min(.8, ((layer.end ?? totalDuration) - (layer.start ?? 0)) / 2))
    setSelectedLayerId(layer.id)
    setSelectedPart(null)
    if (layer.sceneId) setActiveScene(layer.sceneId)
  }
  const updatePartTransform = (layerId: string, key: string, updates: Partial<PartTransform>) => {
    setPartTransforms((transforms) => {
      const current = transforms[layerId]?.[key] ?? { x: 0, y: 0, scale: 1 }
      return { ...transforms, [layerId]: { ...transforms[layerId], [key]: { ...current, ...updates } } }
    })
  }
  const updatePartText = (layerId: string, key: string, value: string) => {
    setPartTextOverrides((overrides) => ({ ...overrides, [layerId]: { ...overrides[layerId], [key]: value } }))
  }
  const resetPartText = (layerId: string, key: string) => {
    const textNode = [...(canvasRef.current?.querySelectorAll<HTMLElement>('[data-editor-text]') ?? [])].find((node) => node.dataset.editorText === key && node.closest<HTMLElement>('.canvas-layer')?.dataset.layerId === layerId)
    if (textNode?.dataset.editorOriginalText !== undefined) textNode.textContent = textNode.dataset.editorOriginalText
    setPartTextOverrides((overrides) => {
      const layerOverrides = { ...overrides[layerId] }
      delete layerOverrides[key]
      return { ...overrides, [layerId]: layerOverrides }
    })
  }
  const beginCanvasGesture = (event: ReactPointerEvent<HTMLElement>, layer: CanvasLayer, mode: 'move' | 'resize') => {
    if (!editorMode || !layer.visible || layer.locked) return
    setPlaying(false)
    event.preventDefault()
    event.stopPropagation()
    const canvas = event.currentTarget.closest('.canvas-screen') as HTMLElement | null
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const part = mode === 'move' && !event.altKey ? (event.target as HTMLElement).closest<HTMLElement>('[data-editor-part]') : null
    if (part && part.closest('.canvas-layer') === event.currentTarget) {
      const partKey = part.dataset.editorPart!
      const partStart = partTransforms[layer.id]?.[partKey] ?? { x: 0, y: 0, scale: 1 }
      setSelectedLayerId(layer.id)
      setSelectedPart({ layerId: layer.id, key: partKey, label: part.dataset.editorLabel ?? '卡片小组件' })
      if (layer.sceneId) setActiveScene(layer.sceneId)
      editorGestureRef.current = { mode: 'part-move', startX: event.clientX, startY: event.clientY, layer, canvasWidth: rect.width, canvasHeight: rect.height, partKey, partStart }
    } else {
      selectLayer(layer)
      editorGestureRef.current = { mode, startX: event.clientX, startY: event.clientY, layer, canvasWidth: rect.width, canvasHeight: rect.height }
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  const updateCanvasGesture = (event: ReactPointerEvent<HTMLDivElement>) => {
    const gesture = editorGestureRef.current
    if (!gesture) return
    const deltaX = (event.clientX - gesture.startX) * CANVAS_WIDTH / gesture.canvasWidth
    const deltaY = (event.clientY - gesture.startY) * CANVAS_HEIGHT / gesture.canvasHeight
    if (gesture.mode === 'part-resize' && gesture.partKey && gesture.partStart) {
      updatePartTransform(gesture.layer.id,gesture.partKey,{scale:Math.max(.2,Math.min(4,gesture.partStart.scale+(deltaX+deltaY)/500))})
    } else if (gesture.mode === 'part-move' && gesture.partKey && gesture.partStart) {
      updatePartTransform(gesture.layer.id, gesture.partKey, { x: gesture.partStart.x + deltaX, y: gesture.partStart.y + deltaY })
    } else if (gesture.mode === 'move') {
      updateLayer(gesture.layer.id, { x: Math.max(-CANVAS_WIDTH*.8, Math.min(CANVAS_WIDTH*.8, gesture.layer.x + deltaX)), y: Math.max(-CANVAS_HEIGHT*.8, Math.min(CANVAS_HEIGHT*.8, gesture.layer.y + deltaY)) })
    } else {
      const width = Math.max(120, Math.min(CANVAS_WIDTH * 3, gesture.layer.width + deltaX))
      const height = gesture.layer.type === 'card' ? Math.round(width * gesture.layer.height / gesture.layer.width) : Math.max(70, Math.min(CANVAS_HEIGHT * 3, gesture.layer.height + deltaY))
      updateLayer(gesture.layer.id, { width, height })
    }
  }
  const endCanvasGesture = () => { editorGestureRef.current = null }
  const beginPartResize = (event:ReactPointerEvent<HTMLButtonElement>) => {
    if(!selectedLayer||selectedLayer.locked||!selectedPart||!canvasRef.current)return
    event.preventDefault();event.stopPropagation();setPlaying(false)
    const rect=canvasRef.current.getBoundingClientRect()
    editorGestureRef.current={mode:'part-resize',startX:event.clientX,startY:event.clientY,layer:selectedLayer,canvasWidth:rect.width,canvasHeight:rect.height,partKey:selectedPart.key,partStart:partTransforms[selectedLayer.id]?.[selectedPart.key]??{x:0,y:0,scale:1}}
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  const handleLibraryDrag = (event: ReactDragEvent<HTMLButtonElement>, sceneId: SceneId) => {
    event.dataTransfer.setData('application/x-overlay-scene', sceneId)
    event.dataTransfer.effectAllowed = 'copy'
  }
  const handleMaterialDrag = (event: ReactDragEvent<HTMLButtonElement>, assetId: string) => {
    event.dataTransfer.setData('application/x-overlay-asset', assetId)
    event.dataTransfer.effectAllowed = 'copy'
  }
  const handleCanvasDrop = (event: ReactDragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const sceneId = event.dataTransfer.getData('application/x-overlay-scene') as SceneId
    const rect = event.currentTarget.getBoundingClientRect()
    const position = { x: (event.clientX - rect.left) * CANVAS_WIDTH / rect.width, y: (event.clientY - rect.top) * CANVAS_HEIGHT / rect.height }
    if (scenes.some((scene) => scene.id === sceneId)) { addCardLayer(sceneId, position); return }
    const asset = materials.find(item => item.id === event.dataTransfer.getData('application/x-overlay-asset'))
    if (asset) addMaterialLayer(asset, position)
  }
  const moveLayerOrder = (id: string, direction: 'up' | 'down') => {
    const layer = canvasLayers.find((item) => item.id === id)
    if (!layer) return
    updateLayer(id, { zIndex: Math.max(1, layer.zIndex + (direction === 'up' ? 1 : -1)) })
  }
  const downloadJson = (name: string, data: unknown) => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url; link.download = name; link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  const importSubtitles = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      const result = parseSrt(await file.text())
      if (canvasLayers.some(layer => layer.origin) && !window.confirm('更换字幕将移除上一份字幕的自动编排卡片；手动添加的卡片保留。继续吗？')) return
      autoProcessRun.current += 1
      transcriptionRun.current += 1
      setCues(result.cues); setCaptionStyle(style=>({...style,enabled:false})); setSubtitleName(file.name); setSubtitleWarnings(result.warnings)
      setAudioClips(clips=>clips.filter(clip=>clip.origin!=='auto-emphasis'))
      setAutoProcessStage('idle')
      setTranscriptionStage('idle')
      setCanvasLayers(layers => layers.filter(layer => !layer.origin))
      setSelectedLayerId(null); setSelectedPart(null)
      setArrangeMessage(`已读取 ${result.cues.length} 段字幕。点击生成草稿，或导出给助手精修。`)
      setPlaying(false); seek(0)
    } catch (error) { setArrangeMessage((error as Error).message) }
  }
  const applyArrangement = (cards: PlanCard[], origin: 'local' | 'assistant', confirmed = false, replaceAll = false) => {
    if (!cards.length) { setArrangeMessage('未找到适合自动强调的句子。请导出编排素材给助手精修，或手动添加卡片。现有卡片未更改。'); return false }
    if (!confirmed && canvasLayers.some(layer => layer.origin && layer.origin!=='emphasis') && !window.confirm('替换上一次自动编排？这些卡片的手动修改也将替换。手动新增的卡片会保留。')) return false
    const keep = replaceAll ? [] : canvasLayers.filter(layer => !layer.origin || layer.origin==='emphasis'), baseZ = Math.max(0, ...keep.map(layer => layer.zIndex))
    const layers: CanvasLayer[] = cards.map((card, i) => { const preset = cardLayoutPresets[card.sceneId]; return ({ id: createLayerId(), type: 'card', sceneId: card.sceneId,
      x: preset?.x ?? 0, y: preset?.y ?? 0, width: preset?.width ?? CANVAS_WIDTH, height: preset?.height ?? CANVAS_HEIGHT, fontSize: preset?.fontSize ?? 48, fontFamily: FONT_OPTIONS[0].value, zIndex: baseZ + i + 1, visible: true,
      start: card.start, end: card.end, script: card.content, cueIds: card.cueIds, reason: card.reason, origin })
    })
    setCanvasLayers([...keep, ...layers]); setSelectedLayerId(layers[0].id); setSelectedPart(null)
    // Derive a safe presenter layout from the copy placement so cards and screenshots
    // have an intentional content zone instead of covering the speaker by default.
    // Effects-only mode: keep the imported video's original framing. Layout
    // segments and presenter transitions are deliberately not generated here.
    if (replaceAll) setLayoutClips([])
    setActiveScene(layers[0].sceneId!); setPlaying(false); setShowOverlayLayers(true)
    // Do not clamp to the previous no-video project length before React commits the new layers.
    const at = cards[0].start + Math.min(.8, (cards[0].end - cards[0].start) / 2)
    clockRef.current = at; setCurrentTime(at)
    if (previewVideoRef.current && videoDuration) previewVideoRef.current.currentTime = at
    setArrangeMessage(`已生成 ${layers.length} 张${origin === 'local' ? '本地规则草稿' : '助手编排'}卡片。请逐张核对文案、时间和人物遮挡；手动图层已保留。`)
    return true
  }
  const generateSoundEffects = async (sourceCues: SubtitleCue[] = cues, newCards: PlanCard[] = [], fromAutoProcess = false, measuredDuration = videoDuration || totalDuration) => {
    if (!sourceCues.length) { setArrangeMessage('请先导入 SRT，或用“本机识别字幕”生成字幕。'); return null }
    if (!fromAutoProcess && audioClips.some(clip=>clip.origin==='auto-emphasis') && !window.confirm('重新生成将替换上次自动配的音效；手动添加的内容保留。继续吗？')) return null
    const cards = newCards.length ? newCards.map(card=>({start:card.start,end:card.end,sceneId:card.sceneId})) : canvasLayers.filter(layer=>layer.type==='card' && layer.start!==undefined && layer.end!==undefined).map(layer=>({start:layer.start!,end:layer.end!,sceneId:layer.sceneId}))
    const cardEvents = cards.filter(card=>['metric','progress','compare','beforeafter','transition','editpain','commandrun','workflowmap','motionmatch','screenblend','exportpaths','commentprompt'].includes(card.sceneId??'')).map(card=>({start:card.start,sound:['transition','workflowmap','screenblend','exportpaths'].includes(card.sceneId??'')?'sweep' as const:'pop' as const,name:card.sceneId==='transition'?'转场':'重点卡片',cueId:undefined}))
    const transitions = layoutClips.filter(clip=>clip.transition>0).map(clip=>({start:clip.start,sound:'sweep' as const,name:'布局转场',cueId:undefined}))
    const allEvents = [...cardEvents,...transitions].filter(event=>event.start>=0 && event.start<measuredDuration).sort((a,b)=>a.start-b.start)
    const events = allEvents.filter((event,index)=>index===0 || event.start-allEvents[index-1].start>=.4).slice(0,100)
    if (!events.length) { setArrangeMessage('请先生成动效卡片；音效会配在数字、对比卡片出现或转场时。'); return {sounds:0} }
    setGeneratingEmphasis(true)
    setPlaying(false)
    try {
      for (const kind of new Set(events.map(event=>event.sound))) {
        if (!soundMedia.current[kind]) soundMedia.current[kind] = (await uploadLocalMedia(makeSfxWav(kind), `工作台-${kind}.wav`)).id
      }
      setAudioClips(previous=>{
        const keep=previous.filter(clip=>clip.origin!=='auto-emphasis')
        const room=Math.max(0,100-keep.length)
        const clips:AudioClip[]=events.slice(0,room).map(event=>({
          id:crypto.randomUUID(),mediaId:soundMedia.current[event.sound]!,name:event.name,track:'sfx' as const,start:event.start,
          end:Math.min(measuredDuration,event.start+(event.sound==='pop'?.38:.62)),offset:0,volume:event.sound==='pop'?.24:.18,loop:false,origin:'auto-emphasis' as const,cueId:event.cueId,
        })).filter(clip=>clip.end-clip.start>.05)
        return [...keep,...clips]
      })
      setShowOverlayLayers(true)
      if (!fromAutoProcess) setArrangeMessage(`已配 ${events.length} 个音效。请在时间轴试听并调整时间、音量。`)
      return {sounds:events.length}
    } catch (error) {
      setArrangeMessage(`音效生成失败：${(error as Error).message}`)
      return null
    } finally { setGeneratingEmphasis(false) }
  }
  const runAutoProcess = async () => {
    if (!videoSource) {
      setArrangeMessage('请先导入一条人物视频。')
      return
    }
    if (!cues.length) {
      setAutoProcessStage('needs-srt')
      setArrangeMessage('请先导入与视频对应的 SRT，或从视频识别字幕，再点击匹配动效。')
      return
    }
    const run = ++autoProcessRun.current
    setAutoProcessStage('analyzing')
    setPauseSuggestions([])
    setArrangeMessage('正在本地分析声音，寻找适合剪辑的长停顿…')
    let detectedDuration = videoDuration
    let detectedGaps: PauseGap[] = []
    let analysisWarning = ''
    try {
      const result = await detectPauseGaps(await fetch(videoSource.url).then(response => response.blob()))
      if (run !== autoProcessRun.current) return
      detectedDuration = detectedDuration || result.duration
      detectedGaps = result.gaps
      setPauseSuggestions(result.gaps)
    } catch (error) {
      if (run !== autoProcessRun.current) return
      analysisWarning = `声音分析未完成：${(error as Error).message}；已按导入字幕继续匹配。`
    }
    if (detectedDuration > 0 && !videoDuration) setVideoDuration(detectedDuration)
    setAutoProcessStage('matching')
    setArrangeMessage(analysisWarning || '声音分析完成，正在按字幕内容匹配动效卡片…')
    await new Promise(resolve => window.setTimeout(resolve, 180))
    if (run !== autoProcessRun.current) return
    const cards = draftCards(cues, detectedDuration || undefined)
    const applied = applyArrangement(cards, 'local')
    if (applied) {
      const result = await generateSoundEffects(cues,cards,true,detectedDuration || totalDuration)
      if (run !== autoProcessRun.current) return
      setAutoProcessStage('done')
      if(result)setArrangeMessage(`自动处理完成：${detectedGaps.length} 段长停顿、${cards.length} 张动效卡、${result.sounds} 个音效。请核对文案、时间和音量。${analysisWarning}`)
    } else {
      setAutoProcessStage('error')
    }
  }
  const transcribeVideo = async () => {
    if (!videoSource) {
      setArrangeMessage('请先导入一条人物视频。')
      return
    }
    if ((canvasLayers.some(layer=>layer.origin) || audioClips.some(clip=>clip.origin==='auto-emphasis')) && !window.confirm('重新识别字幕会移除旧字幕对应的自动卡片、重点词和音效；手动内容保留。继续吗？')) return
    const run = ++transcriptionRun.current
    setTranscriptionStage('uploading')
    setArrangeMessage('正在把视频交给本机 Whisper，视频不会上传到云端…')
    try {
      const source = await fetch(videoSource.url)
      if (run !== transcriptionRun.current) return
      if (!source.ok) throw Error('无法读取当前视频。')
      const blob = await source.blob()
      const started = await fetch('/__studio/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': blob.type || 'video/mp4', 'X-Media-Name': encodeURIComponent(videoSource.name) },
        body: blob,
      })
      const startPayload = await started.json().catch(() => ({}))
      if (!started.ok || typeof startPayload.id !== 'string') throw Error(startPayload.error || '本地字幕识别没有启动。')
      setTranscriptionStage('recognizing')
      let status: { status?: string; error?: string } = {}
      for (let attempt = 0; attempt < 1800; attempt += 1) {
        await new Promise(resolve => window.setTimeout(resolve, 1000))
        if (run !== transcriptionRun.current) return
        const response = await fetch(`/__studio/transcribe/${startPayload.id}`)
        if (!response.ok) throw Error('本地识别任务已失效，请重新点击识别字幕。')
        status = await response.json().catch(() => ({}))
        if (status.status === 'done') break
        if (status.status === 'error') throw Error(status.error || '本地 Whisper 识别失败。')
      }
      if (status.status !== 'done') throw Error('识别时间过长，请稍后重试；也可以直接导入 SRT。')
      const resultResponse = await fetch(`/__studio/transcribe/${startPayload.id}/srt`)
      if (run !== transcriptionRun.current) return
      const result = await resultResponse.json().catch(() => ({}))
      if (!resultResponse.ok || typeof result.srt !== 'string') throw Error(result.error || '没有拿到字幕结果。')
      const parsed = parseSrt(result.srt)
      setCues(parsed.cues)
      setCanvasLayers(layers=>layers.filter(layer=>!layer.origin))
      setAudioClips(clips=>clips.filter(clip=>clip.origin!=='auto-emphasis'))
      setSubtitleName(result.fileName || `${videoSource.name.replace(/\.[^.]+$/, '')}.srt`)
      setSubtitleWarnings([...parsed.warnings, '本机 Whisper 生成的是 AI 初稿，请核对错别字、专名和断句。'])
      // Keep this off by default: a source video may already contain hard subtitles.
      // The user can enable the editable subtitle layer after checking the preview.
      setCaptionStyle(style => ({ ...style, enabled: false }))
      setTranscriptionStage('done')
      setAutoProcessStage('idle')
      setArrangeMessage(`字幕已生成 ${parsed.cues.length} 段。字幕预览默认关闭，请先校对文字和时间；确认后再单独点击“根据字幕匹配动效”。`)
    } catch (error) {
      if (run !== transcriptionRun.current) return
      setTranscriptionStage('error')
      setArrangeMessage(`字幕识别未完成：${(error as Error).message} 可改用“导入 SRT 字幕”。`)
    }
  }
  const importArrangement = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value = ''
    if (!file) return
    try { const plan=validatePlan(JSON.parse(await file.text()), cues, videoDuration); if(plan.layouts?.length&&layoutClips.length&&!window.confirm('替换现有布局时间段？请先保存手动修改。'))return;if(applyArrangement(plan.cards, 'assistant')&&plan.layouts)setLayoutClips(plan.layouts) }
    catch (error) { setArrangeMessage((error as Error).message) }
  }
  useEffect(() => {
    if (!incoming || RENDER_JOB) return
    try {
      const source = validateCues(incoming.cues)
      const plan = validatePlan(incoming.plan, source, videoDuration)
      if(plan.layouts&&layoutClips.length&&!window.confirm('助手编排包含新布局，是否替换现有布局时间段？'))return
      // An assistant plan belongs to the imported video/SRT pair. Do not let stale
      // layers from a previous project leak into the new preview.
      const sameSubtitle=cues.length===source.length&&cues.every((cue,index)=>cue.id===source[index].id&&cue.text===source[index].text&&cue.start===source[index].start&&cue.end===source[index].end)
      setCues(source);if(!sameSubtitle)setCaptionStyle(style=>({...style,enabled:false}));setSubtitleName(incoming.subtitleName);setSubtitleWarnings([])
      setAudioClips(clips=>clips.filter(clip=>clip.origin!=='auto-emphasis'))
      setArrangementId(incoming.id)
      applyArrangement(plan.cards,'assistant',true,!sameSubtitle)
      if(plan.layouts)setLayoutClips(plan.layouts)
      sessionStorage.setItem('overlay-incoming-id',incoming.id)
    } catch (error) {setArrangeMessage(`助手编排未应用：${(error as Error).message}`)}
  }, [incoming])
  const exportHandoff = () => downloadJson('overlay-studio-handoff.json', {
    format: 'overlay-studio-handoff', version: 1,
    video: { name: videoSource?.name ?? null, duration: videoDuration || null },
    canvas: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT }, subtitleName, cues, layouts:layoutClips,
    templates: scriptTemplates, cards: canvasLayers.filter(layer => layer.script).map(layer => ({ sceneId: layer.sceneId, start: layer.start, end: layer.end, content: layer.script, cueIds: layer.cueIds, reason: layer.reason })),
    instruction: '根据完整语义编排，保留原始事实、数字、单位与限定语；输出 overlay-studio-plan v1。不要覆盖手动图层。',
  })
  const updateScript = (updates: Partial<ScriptContent>) => {
    if (selectedLayer?.script) updateLayer(selectedLayer.id, { script: { ...selectedLayer.script, ...updates } })
  }
  const projectSnapshot = () => ({
    version: 7, cues, subtitleName, currentTime, presenter, layouts:layoutClips, audioClips, captionStyle, arrangementId, videoMuted, videoVolume,
    canvas: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT, aspectRatio: canvasAspect.replaceAll(' ', '') },
    duration, canvasLayers, partTransforms, partTextOverrides, materials, cardLayoutPresets,
    metric: metricPreset, compare: comparePreset, quote: quotePreset, rail: railPreset,
  })
  const makeExportPayload = async () => {
    setPlaying(false)
    const project = {...projectSnapshot(),audioClips:[...audioClips,...reviewClips]}
    for(const layer of canvasLayers.filter(l=>l.visible&&l.review)){validateReviewBinding(layer.review);if(!reviewAudioClip(layer))throw Error('模板声音尚未同步，请等待或重试更新声音')}
    if (canvasLayers.some(layer => layer.visible && layer.sceneId === 'source') && !sourceImage) throw Error('请先重新导入引用截图，避免导出占位内容。')
    if (canvasLayers.some(layer => layer.visible && layer.sceneId === 'insert') && !insertImage) throw Error('请先重新导入插图，避免导出占位内容。')
    if (exportKind==='mov'&&!canvasLayers.some(layer => layer.visible)) throw Error('请先添加可见的动效或文字。')
    let mainMediaId:string|undefined
    if(exportKind==='mp4'){
      if(!videoSource&&!canvasLayers.some(l=>l.review))throw Error('请先导入人物视频或添加成果审阅模板')
      if(!videoSource){project.presenter={...presenterDefault};project.layouts=[]}
      validateLayouts(layoutClips,videoDuration||totalDuration)
      if(videoSource&&!layoutClips.length&&presenter.mode!=='full')throw Error('请添加布局时间段并选择内容素材')
      // Persisted main footage is already on disk; don't upload it again for each export.
      mainMediaId=videoSource?/^\/__studio\/media\/([a-f0-9-]{36})$/.exec(videoSource.url)?.[1]:undefined
      if(videoSource&&!mainMediaId){const blob=await (await fetch(videoSource.url)).blob();mainMediaId=(await uploadLocalMedia(blob,videoSource.name)).id}
    }
    const embed = async (image: { url: string; name: string } | null) => {
      if (!image) return null
      const blob = await (await fetch(image.url)).blob()
      const url = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(Error('图片读取失败')); reader.readAsDataURL(blob) })
      return { name: image.name, url }
    }
    return { project, kind:exportKind, mainMediaId, sourceImage: await embed(sourceImage), insertImage: await embed(insertImage) }
  }
  useEffect(() => {
    if (!RENDER_JOB) return
    const w = window as unknown as { __overlayReady?: boolean; __overlayRenderAt?: (time: number) => Promise<void> }
    void fetch(`/__studio/export/${RENDER_JOB}/payload`).then(r => r.json()).then(async payload => {
      const p = payload.project
      setPresenter(p.presenter??presenterDefault);setLayoutClips(p.layouts??[])
      if(payload.kind==='mp4'){setRenderFull(true);setPresenter(p.presenter??presenterDefault);setLayoutClips(p.layouts??[]);setCues(p.cues??[]);setCaptionStyle(validateCaption(p.captionStyle));setVideoSource(payload.mainMediaId?{url:`/__studio/media/${payload.mainMediaId}`,name:'人物视频'}:null)}
      const aspect = CANVAS_ASPECTS.find(a => a.id.replaceAll(' ', '') === p.canvas.aspectRatio)
      if (!aspect) throw Error('Unknown aspect')
      setCanvasAspect(aspect.id); setCanvasLayers(p.canvasLayers); setPartTransforms(p.partTransforms || {}); setPartTextOverrides(p.partTextOverrides || {})
      setMetricPreset(p.metric || metricDefault); setComparePreset(p.compare || compareDefault); setQuotePreset(p.quote || quoteDefault); setRailPreset(p.rail || railDefault)
      setSourceImage(payload.sourceImage); setInsertImage(payload.insertImage); setDuration(p.duration || 7)
      setPlaying(false); setEditorMode(false); setSelectedLayerId(null); setSelectedPart(null); setCurrentTime(0); setShowOverlayLayers(true)
      await document.fonts.ready
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
      await Promise.all(Array.from(document.images).map(image => image.decode().catch(() => { throw Error('图片未能解码') })))
      w.__overlayRenderAt = async time => {
        flushSync(()=>setCurrentTime(time))
        {
          await Promise.all(Array.from(document.querySelectorAll('video')).filter(v=>!v.dataset.renderIgnore).map(async video=>{
            if(video.readyState<1)await new Promise<void>((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('视频载入超时')),15000);video.addEventListener('loadedmetadata',()=>{clearTimeout(timer);resolve()},{once:true});video.addEventListener('error',()=>{clearTimeout(timer);reject(Error('视频无法解码，请使用 H.264 MP4'))},{once:true})})
            const at=Math.min(Number(video.dataset.renderTime??time),Math.max(0,video.duration-.04))
            if(Math.abs(video.currentTime-at)>.001||video.readyState<2)await new Promise<void>((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('视频定位超时')),15000);video.addEventListener('seeked',()=>{clearTimeout(timer);resolve()},{once:true});video.currentTime=at})
          }))
          await Promise.all(Array.from(document.images).map(img=>img.decode()))
          await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()))
        }
      }
      w.__overlayReady = true
    }).catch(error => console.error('Render initialization failed', error))
    return () => { delete w.__overlayReady; delete w.__overlayRenderAt }
  }, [])
  const exportProject = () => {
    const project = {
      version: 7, presenter, layouts:layoutClips, audioClips, captionStyle, videoMuted, videoVolume,
      cues, subtitleName, currentTime,
      canvas: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT, aspectRatio: canvasAspect.replaceAll(' ', '') },
      exportedAt: new Date().toISOString(),
      activeScene,
      duration,
      canvasLayers,
      partTransforms,
      partTextOverrides,
      materials,
      metric: metricPreset,
      compare: comparePreset,
      quote: quotePreset,
      rail: railPreset,
      cardLayoutPresets,
      assets: { video: videoSource?.name ?? null, sourceImage: sourceImage?.name ?? null, insertImage: insertImage?.name ?? null },
    }
    const url = URL.createObjectURL(new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' }))
    const download = document.createElement('a')
    download.href = url
    download.download = `overlay-studio-project-${new Date().toISOString().slice(0, 10)}.json`
    download.click()
    URL.revokeObjectURL(url)
  }
  const restoreProject = (project:Record<string,unknown>,exact=false) => {
        if (!Array.isArray(project.canvasLayers)) throw new Error('缺少工程图层。')
        for(const layer of project.canvasLayers as CanvasLayer[])if(layer.story)layer.story=validateStory(layer.story)
        for(const layer of project.canvasLayers as CanvasLayer[])if(layer.review){layer.review=validateReviewBinding(layer.review);if(Math.abs((layer.end??0)-(layer.start??0)-layer.review.project.params.duration)>.01)throw Error('模板时间与内部时长不一致')}
        const restoredCues = exact&&Array.isArray(project.cues)?project.cues as SubtitleCue[]:validateCues(project.cues ?? [])
        const restoredLayouts=validateLayouts(project.layouts??[])
        const restoredAudio=validateAudio(project.audioClips??[])
        const restoredCaption=validateCaption(project.captionStyle)
        const scriptLayers = (project.canvasLayers as CanvasLayer[]).filter(layer => layer?.script)
        if (!exact&&scriptLayers.length) validatePlan({ format: 'overlay-studio-plan', version: 1, cards: scriptLayers.map(layer => ({ sceneId: layer.sceneId, start: layer.start, end: layer.end, content: layer.script, cueIds: layer.cueIds, reason: layer.reason ?? '' })) }, restoredCues, undefined, true)
        if ((project.canvasLayers as CanvasLayer[]).some(layer => layer?.start !== undefined && (!Number.isFinite(layer.start) || !Number.isFinite(layer.end) || layer.start < 0 || layer.end! <= layer.start))) throw new Error('图层时间无效。')
        const savedPresenter=project.presenter as Partial<PresenterSettings>|undefined
        if(savedPresenter&&presenterModes.some(([mode])=>mode===savedPresenter.mode))setPresenter({mode:savedPresenter.mode!,x:Math.max(0,Math.min(100,Number(savedPresenter.x) || 50)),y:Math.max(0,Math.min(100,Number(savedPresenter.y)||35)),zoom:Math.max(1,Math.min(4,Number(savedPresenter.zoom)||1)),size:Math.max(12,Math.min(40,Number(savedPresenter.size)||24))})
        setCues(restoredCues); setSubtitleName(typeof project.subtitleName === 'string' ? project.subtitleName : '')
        setArrangementId(typeof project.arrangementId === 'string' ? project.arrangementId : '')
        setLayoutClips(restoredLayouts)
        setAudioClips(restoredAudio);setCaptionStyle(restoredCaption)
        setSubtitleWarnings([]); setPlaying(false); setSelectedPart(null); seek(0)
        setArrangeMessage('工程已恢复。请重新选择原视频；字幕、卡片内容与时间已保留。')
        if (typeof project.activeScene === 'string' && scenes.some((scene) => scene.id === project.activeScene)) setActiveScene(project.activeScene as SceneId)
        if (typeof project.duration === 'number') setDuration(Math.max(4, Math.min(12, project.duration)))
        const savedCanvas = project.canvas as { width?: number; height?: number; aspectRatio?: string } | undefined
        const savedAspect = CANVAS_ASPECTS.find(item => item.id.replaceAll(' ', '') === savedCanvas?.aspectRatio)
        const [a, b] = (savedAspect?.id ?? canvasAspect).split(' / ').map(Number)
        const CANVAS_WIDTH = a >= b ? Math.round(1080 * a / b) : 1080
        const CANVAS_HEIGHT = a >= b ? 1080 : Math.round(1080 * b / a)
        if (savedAspect) setCanvasAspect(savedAspect.id)
        if (Array.isArray(project.materials)) setMaterials((project.materials as MaterialAsset[]).filter(item => item && typeof item.id === 'string' && typeof item.name === 'string' && typeof item.url === 'string'))
        if (Array.isArray(project.canvasLayers)) {
          const sourceCanvas = project.canvas && typeof project.canvas === 'object' ? project.canvas as { width?: number; height?: number } : null
          const sourceWidth = Number(sourceCanvas?.width) || 1920
          const sourceHeight = Number(sourceCanvas?.height) || 1080
          const scaleX = CANVAS_WIDTH / sourceWidth
          const scaleY = CANVAS_HEIGHT / sourceHeight
          const importedLayers = (project.canvasLayers as CanvasLayer[]).filter((layer) => layer && typeof layer.id === 'string' && (layer.type === 'card' || layer.type === 'text' || layer.type === 'image')).map((layer, index) => {
            if (layer.type === 'card') return { ...layer, x: Math.max(0, (Number(layer.x) || 0) * scaleX), y: Math.max(0, (Number(layer.y) || 0) * scaleY), width: Math.max(120, (Number(layer.width) || sourceWidth) * scaleX), height: Math.max(80, (Number(layer.height) || sourceHeight) * scaleY), fontSize: 48, zIndex: Number(layer.zIndex) || index + 1, visible: layer.visible !== false }
            const x = Math.max(0, Math.min(CANVAS_WIDTH, (Number(layer.x) || 0) * scaleX))
            const y = Math.max(0, Math.min(CANVAS_HEIGHT, (Number(layer.y) || 0) * scaleY))
            const width = Math.max(120, Math.min(CANVAS_WIDTH - x, (Number(layer.width) || 600) * scaleX))
            const height = Math.max(60, Math.min(CANVAS_HEIGHT - y, (Number(layer.height) || 200) * scaleY))
            return { ...layer, x, y, width, height, fontSize: layer.type === 'image' ? 42 : Math.max(16, Math.min(160, (Number(layer.fontSize) || 42) * scaleX)), zIndex: Number(layer.zIndex) || index + 1, visible: layer.visible !== false }
          })
          setCanvasLayers(importedLayers)
          setSelectedLayerId(importedLayers[0]?.id ?? null)
        }
        setPartTransforms(project.partTransforms && typeof project.partTransforms === 'object' ? project.partTransforms as Record<string, Record<string, PartTransform>> : {})
        setPartTextOverrides(project.partTextOverrides && typeof project.partTextOverrides === 'object' ? project.partTextOverrides as Record<string, Record<string, string>> : {})
        if (project.metric && typeof project.metric === 'object') setMetricPreset({ ...metricDefault, ...(project.metric as MetricSettings) })
        if (project.compare && typeof project.compare === 'object') setComparePreset({ ...compareDefault, ...(project.compare as CompareSettings) })
        if (project.quote && typeof project.quote === 'object') setQuotePreset({ ...quoteDefault, ...(project.quote as QuoteSettings) })
        if (project.rail && typeof project.rail === 'object') setRailPreset({ ...railDefault, ...(project.rail as RailSettings) })
        if (project.cardLayoutPresets && typeof project.cardLayoutPresets === 'object') setCardLayoutPresets(project.cardLayoutPresets as Partial<Record<SceneId, CardLayoutPreset>>)
        if(exact){
          setCanvasLayers(project.canvasLayers as CanvasLayer[])
          const media=project.draftMedia as {video:{url:string;name:string}|null;source:{url:string;name:string}|null;insert:{url:string;name:string}|null}|undefined
          setVideoSource(media?.video??null);setSourceImage(media?.source??null);setInsertImage(media?.insert??null)
          const at=Number(project.currentTime)||0;clockRef.current=at;setCurrentTime(at);restoredTimeRef.current=at
          if(typeof project.videoDuration==='number')setVideoDuration(project.videoDuration)
          if(typeof project.showOverlayLayers==='boolean')setShowOverlayLayers(project.showOverlayLayers)
          if(typeof project.editorMode==='boolean')setEditorMode(project.editorMode)
          if(typeof project.showLayoutGuides==='boolean')setShowLayoutGuides(project.showLayoutGuides)
          if(typeof project.videoMuted==='boolean')setVideoMuted(project.videoMuted)
          if(typeof project.videoVolume==='number')setVideoVolume(project.videoVolume)
          if(project.presenter)setPresenter(project.presenter as PresenterSettings)
          if(typeof project.duration==='number')setDuration(project.duration)
          setArrangeMessage('本地草稿已恢复，视频、字幕、素材和编辑内容已保留。')
        }
        setRunKey((value) => value + 1)
  }
  const importProject = async (event:ChangeEvent<HTMLInputElement>)=>{
    const file=event.target.files?.[0];event.target.value='';if(!file)return
    try{restoreProject(JSON.parse(await file.text()))}catch(e){window.alert(`无法读取该 JSON 工程文件：${(e as Error).message}`)}
  }
  // Playback ticks are excluded: saving an edit captures its playhead without writing every frame.
  const draftSnapshot=useMemo(()=>({...projectSnapshot(),activeScene,videoDuration,showOverlayLayers,showLayoutGuides,editorMode,videoMuted,videoVolume,draftMedia:{video:videoSource,source:sourceImage,insert:insertImage}}),[cues,subtitleName,presenter,layoutClips,audioClips,captionStyle,canvasAspect,duration,canvasLayers,partTransforms,partTextOverrides,materials,cardLayoutPresets,metricPreset,comparePreset,quotePreset,railPreset,activeScene,videoSource,sourceImage,insertImage,videoDuration,showOverlayLayers,showLayoutGuides,editorMode,videoMuted,videoVolume,arrangementId])
  const draft=useDrafts(draftSnapshot,p=>restoreProject(p,true),Boolean(RENDER_JOB))
  const [reviewRetry,setReviewRetry]=useState(0)
  const reviewRequests=useRef(new Set<string>())
  const reviewClips=useMemo(()=>canvasLayers.map(reviewAudioClip).filter((v):v is AudioClip=>!!v),[canvasLayers])
  const reviewBindingKey=JSON.stringify(canvasLayers.filter(l=>l.review).map(l=>[l.id,l.review!.project,l.review!.signature]))
  useEffect(()=>{if(RENDER_JOB||!draft.ready||draft.opening)return
    const timer=setTimeout(()=>{for(const layer of canvasLayers){if(!layer.review)continue;let signature:string;try{signature=reviewSignature(layer.review.project)}catch(e){setArrangeMessage((e as Error).message);continue}
      if(layer.review.audio&&layer.review.signature===signature)continue
      const key=layer.id+signature;if(reviewRequests.current.has(key))continue;reviewRequests.current.add(key)
      void fetch('/__studio/review/bind',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({project:layer.review.project})}).then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.error);const binding=validateReviewBinding(d);setCanvasLayers(layers=>layers.map(l=>{if(l.id!==layer.id||!l.review)return l;try{return reviewSignature(l.review.project)===signature?{...l,review:binding}:l}catch{return l}}))}).catch(e=>setArrangeMessage('模板声音未更新：'+e.message)).finally(()=>reviewRequests.current.delete(key))
    }},500);return()=>clearTimeout(timer)
  },[reviewBindingKey,reviewRetry,draft.ready,draft.opening])
  useEffect(()=>{if(RENDER_JOB||!draft.ready||draft.opening)return;const raw=sessionStorage.getItem('overlay-review-pending');if(!raw)return
    try{const data=JSON.parse(raw),binding=validateReviewBinding(data.binding)
      if(canvasAspect!=='16 / 9'){if(!canvasLayers.length&&!videoSource){setCanvasAspect('16 / 9');return}setArrangeMessage('有待加入的成果审阅模板，请先切换到横屏 16:9。');return}
      if(data.layerId){const target=canvasLayers.find(l=>l.id===data.layerId);if(!target?.review)throw Error('原模板实例已不存在，未修改当前工程');const end=(target.start??0)+binding.project.params.duration;if(videoDuration&&end>videoDuration+.01)throw Error('修改后的模板超出视频长度');if(!updateLayer(target.id,{review:binding,end}))return;setSelectedLayerId(target.id);setActiveScene('team-review');setArrangeMessage('模板实例已更新，保留原起点与画布位置。')}
      else if(!insertReview(binding))return
      sessionStorage.removeItem('overlay-review-pending');sessionStorage.removeItem('overlay-review-edit-context')
    }catch(e){setArrangeMessage((e as Error).message);sessionStorage.removeItem('overlay-review-pending')}
  },[draft.ready,draft.opening,canvasAspect,currentTime,videoDuration,reviewBindingKey])
  const openReviewEditor=async(layer:CanvasLayer)=>{if(!layer.review)return;try{await draft.save();sessionStorage.setItem('overlay-review-edit-context',JSON.stringify({layerId:layer.id,project:layer.review.project}));location.assign('/?templateLab&editLayer='+encodeURIComponent(layer.id))}catch(e){setArrangeMessage('工程保存失败，暂未离开当前页面：'+(e as Error).message)}}

  const editSnapshot = useMemo<EditSnapshot>(() => ({
    canvasLayers, partTransforms, partTextOverrides, cues, captionStyle, materials, presenter, layoutClips, audioClips,
    canvasAspect, metricPreset, comparePreset, quotePreset, railPreset, cardLayoutPresets, videoSource, videoDuration, sourceImage, insertImage,
  }), [canvasLayers, partTransforms, partTextOverrides, cues, captionStyle, materials, presenter, layoutClips, audioClips, canvasAspect, metricPreset, comparePreset, quotePreset, railPreset, cardLayoutPresets, videoSource, videoDuration, sourceImage, insertImage])
  const editHistory = useRef<{ past: EditSnapshot[]; current: EditSnapshot | null; future: EditSnapshot[]; timer: number | null }>({past:[],current:null,future:[],timer:null})
  const [, refreshHistory] = useState(0)
  const updateHistoryButtons = () => refreshHistory(value => value + 1)
  const applyEditSnapshot = (snapshot: EditSnapshot) => {
    setPlaying(false); setCanvasLayers(snapshot.canvasLayers); setPartTransforms(snapshot.partTransforms); setPartTextOverrides(snapshot.partTextOverrides)
    setCues(snapshot.cues); setCaptionStyle(snapshot.captionStyle); setMaterials(snapshot.materials); setPresenter(snapshot.presenter)
    setLayoutClips(snapshot.layoutClips); setAudioClips(snapshot.audioClips); setCanvasAspect(snapshot.canvasAspect)
    setMetricPreset(snapshot.metricPreset); setComparePreset(snapshot.comparePreset); setQuotePreset(snapshot.quotePreset); setRailPreset(snapshot.railPreset)
    setCardLayoutPresets(snapshot.cardLayoutPresets)
    setVideoSource(snapshot.videoSource); setVideoDuration(snapshot.videoDuration); setSourceImage(snapshot.sourceImage); setInsertImage(snapshot.insertImage)
    setSelectedLayerId(null); setSelectedPart(null)
  }
  useEffect(() => {
    if (RENDER_JOB || draft.opening) return
    const history = editHistory.current
    if (!history.current) { history.current = editSnapshot; updateHistoryButtons(); return }
    if (sameEdit(history.current, editSnapshot)) return
    if (history.timer !== null) window.clearTimeout(history.timer)
    history.timer = window.setTimeout(() => {
      if (history.current && !sameEdit(history.current, editSnapshot)) {
        history.past.push(history.current)
        if (history.past.length > 80) history.past.shift()
        history.current = editSnapshot
        history.future = []
        updateHistoryButtons()
      }
      history.timer = null
    }, 450)
    return () => { if (history.timer !== null) { window.clearTimeout(history.timer); history.timer = null } }
  }, [editSnapshot, draft.opening])
  const undoEdit = () => {
    const history = editHistory.current
    if (!history.current) return
    if (history.timer !== null) { window.clearTimeout(history.timer); history.timer = null }
    const changed = !sameEdit(history.current, editSnapshot)
    if (!changed && !history.past.length) return
    history.future.push(editSnapshot)
    const target = changed ? history.current : history.past.pop()!
    history.current = target
    applyEditSnapshot(target); updateHistoryButtons()
  }
  const redoEdit = () => {
    const history = editHistory.current
    if (history.timer !== null) return
    const target = history.future.pop()
    if (!target || !history.current) return
    history.past.push(history.current); history.current = target
    applyEditSnapshot(target); updateHistoryButtons()
  }
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'z') return
      const target = event.target as HTMLElement | null
      if (target?.closest('input,textarea,[contenteditable="true"]')) return
      event.preventDefault()
      if (event.shiftKey) redoEdit(); else undoEdit()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  const renderScene = (sceneId: SceneId, instanceId: string) => {
    const key = `${sceneId}-${instanceId}-${runKey}`
    const layer = canvasLayers.find(item => item.id === instanceId)!
    const elapsed = Math.max(0, Math.min(currentTime,layer.end??totalDuration) - (layer.start ?? 0))
    if (layer.script) return <ScriptCard key={key} scene={sceneId as ScriptTemplate} content={layer.script} elapsed={elapsed} duration={Math.max(.1, (layer.end ?? ((layer.start ?? 0) + duration)) - (layer.start ?? 0))} portrait={CANVAS_ASPECT_RATIO < 1.2} />
    if (sceneId === 'metric') return <MetricFocus key={key} settings={layer.settings?.metric ?? metricPreset} playing={playing} duration={duration} runKey={runKey} elapsed={elapsed} />
    if (sceneId === 'compare') return <CompareSplit key={key} settings={layer.settings?.compare ?? comparePreset} playing={playing} duration={duration} />
    if (sceneId === 'quote') return <QuoteLockup key={key} settings={layer.settings?.quote ?? quotePreset} playing={playing} duration={duration} />
    if (sceneId === 'rail') return <SequenceRail key={key} settings={layer.settings?.rail ?? railPreset} playing={playing} duration={duration} />
    return <DynamicInfoCard key={key} kind={sceneId as InfoCardKind} playing={playing} duration={duration} sourceImage={sourceImage} insertImage={insertImage} />
  }


  const trackSeek=(t:number)=>{setPlaying(false);seek(t)}
  const trackItems:TrackItem[]=useMemo(()=>[
    ...(videoSource?[{id:'person',name:videoSource.name,track:'person' as const,start:0,end:videoDuration||totalDuration,select:()=>trackSeek(0)}]:[]),
    ...canvasLayers.map(layer=>({id:layer.id,name:layer.review?.project.params.title||layer.assetName||layer.script?.title||layer.text||scenes.find(s=>s.id===layer.sceneId)?.description||'动效',track:layer.type==='image'?'material' as const:'effect' as const,start:layer.start??0,end:layer.end??totalDuration,select:()=>{setPlaying(false);selectLayer(layer)},change:(start:number,end:number)=>updateLayer(layer.id,{start,end}),remove:()=>removeLayer(layer.id)})),
    ...layoutClips.filter(c=>c.mediaId).map(c=>({id:'layout:'+c.id,name:c.mediaName||'布局素材',track:'material' as const,start:c.start,end:c.end,select:()=>trackSeek(c.start),change:(start:number,end:number)=>{try{setLayoutClips(validateLayouts(layoutClips.map(l=>l.id===c.id?{...l,start,end}:l),totalDuration));setMediaError('')}catch(e){setMediaError((e as Error).message)}},remove:()=>setLayoutClips(layoutClips.map(l=>l.id===c.id?{...l,mediaId:undefined,mediaName:undefined,mediaType:undefined}:l))})),
    ...cues.map(c=>({id:'subtitle:'+c.id,name:c.text,track:'subtitle' as const,start:c.start,end:c.end,select:()=>trackSeek(c.start),change:(start:number,end:number)=>setCues(cues.map(q=>q.id===c.id?{...q,start,end}:q).sort((a,b)=>a.start-b.start)),remove:()=>{setCues(cues.filter(q=>q.id!==c.id));setCanvasLayers(layers=>layers.map(l=>({...l,cueIds:l.cueIds?.filter(id=>id!==c.id)})))}})),
    ...reviewClips.map(clip=>({id:clip.id,name:clip.name,track:clip.track,start:clip.start,end:clip.end,select:()=>{const layer=canvasLayers.find(l=>'template-mix:'+l.id===clip.id);if(layer){setPlaying(false);selectLayer(layer)}}})),
    ...audioClips.map(clip=>({id:'audio:'+clip.id,name:clip.name,track:clip.track,start:clip.start,end:clip.end,volume:clip.volume,select:()=>trackSeek(clip.start),change:(start:number,end:number)=>setAudioClips(clips=>clips.map(item=>item.id===clip.id?{...item,start,end}:item)),changeVolume:(volume:number)=>setAudioClips(clips=>clips.map(item=>item.id===clip.id?{...item,volume}:item)),remove:()=>setAudioClips(clips=>clips.filter(item=>item.id!==clip.id))})),
  ],[videoSource,videoDuration,totalDuration,canvasLayers,layoutClips,cues,audioClips,reviewClips,selectedLayerId,selectedPart])
  const activeLayoutClip=layoutAt(layoutClips,currentTime)
  const currentPresenter=activeLayoutClip?.settings??presenter
  const updatePresenter=(patch:Partial<PresenterSettings>)=>{if(activeLayoutClip)setLayoutClips(clips=>clips.map(c=>c.id===activeLayoutClip.id?{...c,settings:{...c.settings,...patch}}:c));else setPresenter(p=>({...p,...patch}))}
  const renderLayer=(source:CanvasLayer)=>{
    // Automatic keyword visuals are paused; preserve older draft layers for later reuse.
    if (source.origin === 'emphasis') return null
    const layerBase=source.type==='image'?fitMaterialRect(source,currentPresenter,CANVAS_WIDTH,CANVAS_HEIGHT):source
    // In a split layout the empty half is the effect canvas. Keep the card
    // there regardless of the script's original placement hint; otherwise a
    // left-content/right-person layout could accidentally put the card over
    // the presenter. Circle layouts reserve the lower-left area for the
    // circular presenter and let the card use the upper canvas as a stage.
    const layer = source.type === 'card' && source.script?.placement !== 'bottom'
      ? currentPresenter.mode === 'right'
        ? { ...layerBase, x: 0, width: CANVAS_WIDTH / 2 }
        : currentPresenter.mode === 'left'
          ? { ...layerBase, x: CANVAS_WIDTH / 2, width: CANVAS_WIDTH / 2 }
          : currentPresenter.mode === 'circle'
            ? { ...layerBase, x: 0, y: 0, width: CANVAS_WIDTH, height: CANVAS_HEIGHT * .78 }
            : layerBase
      : layerBase
              const motion=layer.story?{opacity:1,transform:'none'}:layer.type==='image'||layer.type==='text'&&layer.presentation?mediaMotion(currentTime,layer.start??0,layer.end??totalDuration,layer.presentation??{}):layer.type==='card'?mediaMotion(currentTime,layer.start??0,layer.end??totalDuration,{motion:'scale',motionDuration:['fan','docrelay'].includes(layer.sceneId??'')?.01:.45}):layer.textStyle==='emphasis'?mediaMotion(currentTime,layer.start??0,layer.end??totalDuration,{motion:'scale',motionDuration:.22}):{opacity:1,transform:'none'}
              const splitCardScale = source.type === 'card' && (currentPresenter.mode === 'right' || currentPresenter.mode === 'left') ? .72 : layer.width / CANVAS_WIDTH
              return layer.visible && <div data-layer-id={layer.id} className={`canvas-layer canvas-layer--${layer.type} ${selectedLayerId === layer.id ? 'is-selected' : ''}`} key={layer.id} style={{ left: `${layer.x / CANVAS_X_UNIT}%`, top: `${layer.y / CANVAS_Y_UNIT}%`, width: `${layer.width / CANVAS_X_UNIT}%`, height: `${layer.height / CANVAS_Y_UNIT}%`, zIndex: layer.zIndex, visibility: showOverlayLayers && isLayerActive(currentTime, layer.start, layer.end) ? 'visible' : 'hidden', '--layer-font-size': `${layer.fontSize / CANVAS_X_UNIT}cqw`, fontFamily: layer.fontFamily, opacity:motion.opacity, transform:motion.transform } as CSSProperties} onPointerDown={(event) => beginCanvasGesture(event, layer, 'move')} onPointerMove={updateCanvasGesture} onPointerUp={endCanvasGesture} onPointerCancel={endCanvasGesture}>
                <div className="canvas-layer-content">{layer.companyScene ? <CompanyOfficeScene data={layer.companyScene} time={Math.max(0,currentTime-(layer.start??0))} duration={(layer.end??totalDuration)-(layer.start??0)}/> : layer.story ? <StoryScene project={layer.story} time={Math.max(0,currentTime-(layer.start??0))} portrait={CANVAS_HEIGHT>CANVAS_WIDTH} playing={playing} rendering={Boolean(RENDER_JOB)}/> : layer.review ? <ReviewTimeline binding={layer.review} time={currentTime} start={layer.start??0} end={layer.end??totalDuration} playing={playing} rendering={Boolean(RENDER_JOB)}/> : layer.type === 'card' && layer.sceneId ? <div className="canvas-card-stage" style={{ width: `${100 / splitCardScale}%`, height: `${CANVAS_HEIGHT / layer.height * 100 / splitCardScale}%`, transform: `scale(${splitCardScale})` }}>{renderScene(layer.sceneId, layer.id)}</div> : layer.type === 'image' ? <MediaCard presentation={layer.presentation}>{layer.mediaType==='video'?<MaterialVideo src={layer.assetUrl!} time={currentTime} start={layer.start??0} end={layer.end??totalDuration} offset={layer.sourceOffset??0} playing={playing} rendering={Boolean(RENDER_JOB)}/>:<img className="material-canvas-image" src={layer.assetUrl} alt={layer.assetName ?? '素材'} />}</MediaCard> : layer.textStyle==='kinetic'&&layer.keywordEffect ? <KeywordMotion effect={layer.keywordEffect} text={layer.text??''} time={Math.max(0,currentTime-(layer.start??0))} duration={(layer.end??totalDuration)-(layer.start??0)} color={layer.textColor}/> : <div className={`editable-text editable-text--${layer.textStyle ?? 'panel'}`} style={{color:layer.textColor || '#ffffff'}}>{layer.text}</div>}</div>
                {editorMode && selectedLayerId === layer.id && <><span className="layer-name">{layer.type === 'card' ? '按住 Option 拖动整卡' : layer.type === 'image' ? 'IMAGE' : 'TEXT'}</span><button className="layer-remove" type="button" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); removeLayer(layer.id) }} aria-label="移除图层">×</button><span className="canvas-resize-handle" onPointerDown={(event) => beginCanvasGesture(event, layer, 'resize')} aria-label="拖动缩放图层" /></>}
              </div>
  }
  const renderCaptionCue=(cue:SubtitleCue)=>{
    return <div key={cue.id}>{cue.text}</div>
  }
  const renderCanvas = (<div ref={canvasRef} className={`canvas-screen ${videoSource ? 'has-video' : ''} ${canvasLayers.some(l=>l.story)?'has-story-template':''} ${canvasLayers.some(l=>l.review)?'has-review-template':''} ${editorMode ? 'is-editing' : ''}`} onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'copy' }} onDrop={handleCanvasDrop} onPointerDown={(event) => { if (event.target === event.currentTarget) { setSelectedLayerId(null); setSelectedPart(null) } }}>
              {(!RENDER_JOB||renderFull)&&captionStyle.enabled&&<div className="timeline-caption" style={{fontFamily:captionStyle.fontFamily,fontSize:`${captionStyle.fontSize/CANVAS_WIDTH*100}cqw`,color:captionStyle.color,bottom:`${captionStyle.bottom}%`,WebkitTextStroke:`${captionStyle.strokeWidth/CANVAS_WIDTH*100}cqw #000`,paintOrder:'stroke fill'}}>{cues.filter(c=>currentTime>=c.start&&currentTime<c.end).map(renderCaptionCue)}</div>}
              {(!RENDER_JOB || renderFull) && <PresenterLayout settings={presenter} clips={layoutClips} rendering={Boolean(RENDER_JOB)} guides={showLayoutGuides} time={currentTime} playing={playing} aspect={CANVAS_ASPECT_RATIO}>{videoSource ? <video ref={previewVideoRef} className="imported-video" data-render-ignore={canvasLayers.some(l=>l.story)?true:undefined} src={videoSource.url} muted={previewSourceGain===0 || reviewVoiceActive || Boolean(RENDER_JOB)} playsInline preload="auto" onLoadedMetadata={event => { const length = event.currentTarget.duration; event.currentTarget.volume = previewSourceGain; if (Number.isFinite(length)) {setVideoDuration(length);if(restoredTimeRef.current!==null){event.currentTarget.currentTime=Math.min(restoredTimeRef.current,length);restoredTimeRef.current=null}} }} onCanPlay={event => { setMediaError(''); if (playing && !RENDER_JOB) void event.currentTarget.play().catch(error => { if (error?.name !== 'AbortError' && error?.name !== 'NotAllowedError') { setPlaying(false); setMediaError('视频播放未能开始；请重试视频。') } }) }} onSeeked={event => { if(!RENDER_JOB){clockRef.current = event.currentTarget.currentTime; setCurrentTime(event.currentTarget.currentTime)} }} onEnded={() => setPlaying(false)} onError={event => { const code=event.currentTarget.error?.code;setMediaError(code===2?'本地视频读取中断，请点击“重试视频”。':code===3?'浏览器解码中断，请点击“重试视频”。':code===4?'当前浏览器不支持此视频的编码，请导入 H.264/AAC MP4。':'视频暂时无法播放，请点击“重试视频”。');setPlaying(false) }} /> : (RENDER_JOB||canvasLayers.some(l=>l.review))?null:<span className="presenter-empty">请先导入人物视频</span>}</PresenterLayout>}
              {currentPresenter.mode !== 'full' && <div className={`layout-fill-backdrop layout-fill-backdrop--${currentPresenter.mode}${currentPresenter.backdrop?` layout-fill-backdrop--${currentPresenter.backdrop}`:''}`} aria-hidden="true" />}
              <div className="canvas-material-plane">{canvasLayers.filter(l=>l.type==='image').map(renderLayer)}</div>
              <div className="canvas-effect-plane">{canvasLayers.filter(l=>l.type!=='image').map(renderLayer)}</div>
              {editorMode && selectedLayer && isLayerActive(currentTime,selectedLayer.start,selectedLayer.end) && !RENDER_JOB && <div className="canvas-edit-tools" onPointerMove={updateCanvasGesture} onPointerUp={endCanvasGesture} onPointerCancel={endCanvasGesture}>
                <span>{selectedPart ? selectedPart.label : '整张卡片'}</span>
                <button type="button" disabled={selectedLayer.locked} onPointerDown={event=>beginCanvasGesture(event,selectedLayer,'move')}>↔ 拖动整卡</button>
                <button type="button" disabled={selectedLayer.locked} onPointerDown={event=>beginCanvasGesture(event,selectedLayer,'resize')}>↗ 缩放整卡</button>
                {selectedPart && <><button type="button" onPointerDown={beginPartResize}>↗ 拖动缩放组件</button><button type="button" onClick={()=>{updatePartTransform(selectedLayer.id,selectedPart.key,{hidden:true});setSelectedPart(null)}}>移除此组件</button></>}
                <button type="button" onClick={()=>removeLayer(selectedLayer.id)}>删除整卡</button>
              </div>}
            </div>)
  if (RENDER_JOB) return <div className="export-root" style={{width: CANVAS_WIDTH, height: CANVAS_HEIGHT, '--canvas-aspect': canvasAspect} as CSSProperties}>{renderCanvas}</div>
  return (
    <main className="app-shell">
      {draft.opening&&<div className="draft-loading" role="status">正在恢复本地草稿，请稍候…</div>}
      <ExportPanel kind={exportKind} open={exportOpen} close={() => setExportOpen(false)} duration={totalDuration} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} makePayload={makeExportPayload} sourceMediaId={videoSource?.url.match(/^\/__studio\/media\/([a-f0-9-]{36})$/)?.[1]} />
      <header className="topbar">
        <div className="brand"><span className="brand-mark"><i /><i /><i /></span><span>动效预览台</span><small>MOTION SYSTEM / V.01</small></div>
        <div className="topbar-center"><span className="status-dot" /> PREVIEW READY</div>
        <div className="edit-history-actions"><button type="button" onClick={undoEdit} disabled={!editHistory.current.current || (sameEdit(editHistory.current.current, editSnapshot) && !editHistory.current.past.length)} title="撤回上一步（⌘Z）">↶ 撤回</button><button type="button" onClick={redoEdit} disabled={!editHistory.current.future.length || !editHistory.current.current || !sameEdit(editHistory.current.current, editSnapshot)} title="重做（⌘⇧Z）">↷ 重做</button></div>
        <button className="export-button" type="button" onClick={() => { setExportKind('mov');setPlaying(false); setExportOpen(true) }}><ExportIcon /> 导出透明 MOV</button>
        <button className="export-button" type="button" onClick={() => { setExportKind('mp4');setPlaying(false); setExportOpen(true) }}><ExportIcon /> 导出完整视频 MP4</button>
        <a className="template-library-entry" href="/?templateLab" target="_blank" rel="noopener noreferrer" title="在新标签页打开模板实验台">模板实验台 ↗</a>
      </header>

      <div className="workspace">
        <SceneLibrary active={activeScene} actions={{choose:chooseScene,add:addCardLayer,drag:handleLibraryDrag}}/>

        <section className="preview-panel">
          <DraftPanel draft={draft}/>
          <div className="preview-topline"><span>WORKBENCH / <b>{active.name.toUpperCase()}</b></span><span className="workbench-tip">左侧选择·拖入或点＋添加·画布内直接编辑</span><span>{CANVAS_WIDTH} × {CANVAS_HEIGHT} · {canvasAspect.replaceAll(' / ', ':')} <i className="live-dot" /> LIVE</span></div>
          <div className="presenter-controls"><div className="aspect-picker"><span>人物布局</span>{presenterModes.map(([mode,label])=><button key={mode} type="button" aria-pressed={currentPresenter.mode===mode} className={currentPresenter.mode===mode?'is-active':''} onClick={()=>updatePresenter({mode})}>{label}</button>)}</div>{currentPresenter.mode!=='full'&&<div className="presenter-adjust"><Range label="人物水平位置" min={0} max={100} value={currentPresenter.x} onChange={x=>updatePresenter({x})}/><Range label="头部上下位置" min={0} max={100} value={currentPresenter.y} onChange={y=>updatePresenter({y})}/><Range label="人物放大" min={100} max={400} value={Math.round(currentPresenter.zoom*100)} suffix="%" onChange={zoom=>updatePresenter({zoom:zoom/100})}/>{currentPresenter.mode==='circle'&&<Range label="圆形大小" min={12} max={40} value={currentPresenter.size} suffix="%" onChange={size=>updatePresenter({size})}/>}</div>}<small>{activeLayoutClip?'正在调整当前时间段的布局':'正在调整默认布局（没有布局片段的时间）'} · 分屏时图片限定在素材区，圆形人物始终在素材上方。</small></div>
          <div className="preview-viewport" ref={viewportRef} style={{'--canvas-aspect': canvasAspect, maxHeight: previewHeightLimit} as CSSProperties}><div className="canvas-frame" style={{ width: previewSize.width, height: previewSize.height, '--canvas-aspect': canvasAspect } as CSSProperties}>

            {renderCanvas}
          </div>
          </div>
          <div className="canvas-tools" role="group" aria-label="预览画布设置">
            <div className="layout-region-legend"><span><i className="legend-person"/>人物区</span><span><i className="legend-content"/>素材区</span><button type="button" aria-pressed={showLayoutGuides} onClick={()=>setShowLayoutGuides(v=>!v)}>{showLayoutGuides?'隐藏区域提示':'显示区域提示'}</button><small>仅编辑时显示，不进入导出</small></div>
            <div className="aspect-picker"><span>画布比例</span>{CANVAS_ASPECTS.map((aspect) => <button key={aspect.id} className={canvasAspect === aspect.id ? 'is-active' : ''} aria-pressed={canvasAspect === aspect.id} onClick={() => changeAspect(aspect.id)} type="button">{aspect.label}</button>)}</div>
            <div className="aspect-picker" role="group" aria-label="预览大小"><span>预览大小</span>{([['small','小'],['medium','中'],['large','大']] as const).map(([size,label])=><button key={size} type="button" className={previewScale===size?'is-active':''} aria-pressed={previewScale===size} onClick={()=>setPreviewScale(size)}>{label}</button>)}</div>
            <button className={`canvas-tool-toggle ${showOverlayLayers ? 'is-active' : ''}`} onClick={() => setShowOverlayLayers((visible) => !visible)} type="button" aria-pressed={showOverlayLayers}>{showOverlayLayers ? '隐藏动效' : '显示动效'}</button>
            <button className={`canvas-tool-toggle ${editorMode ? 'is-active' : ''}`} onClick={() => { setEditorMode(value => !value); setPlaying(false); editorGestureRef.current = null }} type="button" aria-pressed={editorMode} aria-label="拖动编辑">{editorMode ? '拖动编辑：已开启' : '开启拖动编辑'}</button>
            <small className="canvas-edit-status">{editorMode ? '拖文字或图标可移动组件；按住 Option 拖动整卡。' : '当前仅预览，不能拖动或缩放。点击“开启拖动编辑”恢复。'}</small>
          </div>
          <LayoutTimeline clips={layoutClips} onChange={setLayoutClips} time={currentTime} duration={totalDuration} seek={n=>{setPlaying(false);seek(n)}} settings={presenter}/>
          <div className="transport">
            <div className="transport-main"><button className="round-button" onClick={togglePlayback} aria-label={playing ? '暂停' : '播放'} type="button"><PlayIcon playing={playing} /></button><button className="icon-button" onClick={restart} aria-label="重新播放" type="button"><RestartIcon /></button><span className="timecode">{timeLabel(currentTime)}</span></div>
            <input className="playhead-slider" aria-label="播放进度" onInput={event => { setPlaying(false); seek(Number(event.currentTarget.value)) }} type="range" min={0} max={totalDuration} step={0.01} value={Math.min(currentTime, totalDuration)} onChange={event => { setPlaying(false); seek(Number(event.target.value)) }} />
            <span className="duration-label">{timeLabel(totalDuration)}</span>
          </div>
          <MultiTrack items={trackItems} time={currentTime} duration={!videoDuration&&canvasLayers.some(l=>l.review)?Math.max(30,totalDuration+2):totalDuration} seek={trackSeek} cues={cues} onCues={setCues} caption={captionStyle} onCaption={setCaptionStyle} importVideo={()=>videoInputRef.current?.click()} importMaterial={()=>{importToTrack.current=true;materialInputRef.current?.click()}} importSubtitle={()=>srtInputRef.current?.click()}/>
          <AudioLibrary clips={audioClips} onChange={setAudioClips} duration={totalDuration} time={currentTime}/>
          <AudioPreview clips={[...audioClips,...reviewClips]} time={currentTime} playing={playing}/>
          <div className="preview-footer"><span>从左侧拖入卡片或点击＋添加</span><span>{canvasLayers.length} 个图层 · {showOverlayLayers ? '显示中' : '已隐藏'}</span></div>
        </section>

        <aside className="settings-panel">
          <div className="panel-heading"><span>参数调整</span><button onClick={restart} type="button">RESET MOTION</button></div>
          <div className="settings-scroll">
            <section className="settings-section media-section"><div className="section-title"><span>00</span> VIDEO INPUT</div><label className="video-import"><input ref={videoInputRef} type="file" accept="video/*" onChange={importVideo} /><span>＋ 导入视频</span><small>MP4 / MOV / WEBM</small></label>{videoSource || cues.length ? <div className="video-status"><span title={videoSource?.name || subtitleName}>{videoSource?.name || subtitleName}</span><button onClick={clearVideo} type="button">清空视频和字幕</button></div> : <p className="media-note">导入视频进行本地预览。“清空视频和字幕”会一起清除人物视频和字幕轨，可撤回。</p>}</section>
            {mediaError && <div className="media-retry"><p className="arrange-warning" role="alert">{mediaError} 原有字幕和卡片不会丢失。</p>{videoSource&&<button type="button" onClick={retryVideo}>重试视频</button>}</div>}
            <section className="settings-section arrangement-section">
              <div className="section-title"><span>01</span> 字幕编排</div>
              <p className="editor-hint">导入视频和同版本 SRT 后，可自动分析气口、显示剪辑建议并匹配动效。当前不会直接裁掉原视频；硬字幕不会被当作字幕轨道读取。</p>
              <label className="editor-action project-import"><input ref={srtInputRef} type="file" accept=".srt" onChange={importSubtitles} />＋ 导入 SRT 字幕</label>
              <button className="editor-action" type="button" disabled={!videoSource || transcriptionStage==='uploading' || transcriptionStage==='recognizing'} onClick={()=>void transcribeVideo()}>{transcriptionStage==='uploading'?'正在准备本机识别…':transcriptionStage==='recognizing'?'正在识别字幕…':'从视频自动识别字幕'}</button>
              <div className="toggle-row arrangement-caption-toggle"><span>预览导入字幕</span><button className={`toggle ${captionStyle.enabled ? 'is-on' : ''}`} onClick={() => setCaptionStyle(style => ({ ...style, enabled: !style.enabled }))} aria-pressed={captionStyle.enabled} type="button"><i /></button></div>
              <p className="editor-hint">识别结果会进入字幕轨，可逐条改字和时间。视频已有硬字幕时保持关闭，避免出现两层字幕；透明 MOV 不含字幕。</p>
              <button className="editor-action editor-action--primary" type="button" disabled={!videoSource || autoProcessStage === 'analyzing' || autoProcessStage === 'matching'} onClick={() => void runAutoProcess()}>{autoProcessStage === 'analyzing' ? '正在分析声音…' : autoProcessStage === 'matching' ? '正在匹配动效…' : '根据字幕匹配动效'}</button>
              <div className={`auto-pipeline auto-pipeline--${autoProcessStage}`} aria-live="polite">
                <span className={['analyzing', 'matching', 'needs-srt', 'done'].includes(autoProcessStage) ? 'is-done' : ''}>01 分析气口</span>
                <span className={autoProcessStage === 'matching' || autoProcessStage === 'done' ? 'is-done' : ''}>02 匹配动效</span>
              </div>
              {arrangeMessage && <p className="arrange-status" role={autoProcessStage === 'error' ? 'alert' : 'status'}>{arrangeMessage}</p>}
              {pauseSuggestions.length > 0 && <div className="pause-suggestions"><b>疑似长停顿 {pauseSuggestions.length} 段</b><span>{pauseSuggestions.slice(0, 5).map(gap => `${timeLabel(gap.start)}–${timeLabel(gap.end)}`).join('　')}</span><small>当前只生成建议，不直接改变原视频；剪辑前请试听核对。</small>{pauseSuggestions.length > 5 && <small>仅显示前 5 段。</small>}</div>}
              <button className="editor-action" type="button" onClick={() => setArrangeMessage('视频里的硬字幕已经烧录进画面，不能直接拆成可编辑字幕。请使用无硬字幕原片进行本机识别，或导入剪映导出的 SRT。')}>硬字幕不能直接拆出</button>
              {!!cues.length && <p className="editor-hint">{subtitleName} · {cues.length} 段 · {timeLabel(cues.at(-1)!.end)}</p>}
              {subtitleWarnings.map(message => <p className="arrange-warning" key={message}>{message}</p>)}
              {videoDuration > 0 && cues.some(cue => cue.end > videoDuration + .5) && <p className="arrange-warning">字幕超出视频时长，请核对版本。超出部分不生成卡片。</p>}
              {videoDuration > 0 && canvasLayers.some(layer => (layer.end ?? 0) > videoDuration + .05) && <p className="arrange-warning">部分卡片超出视频时长，请调整卡片时间。</p>}
              <button className="editor-action editor-action--primary" disabled={!cues.length || Boolean(videoSource && !videoDuration)} type="button" onClick={() => applyArrangement(draftCards(cues, videoDuration), 'local')}>按字幕生成卡片草稿</button>
              <button className="editor-action editor-action--primary" disabled={!cues.length || generatingEmphasis} type="button" onClick={()=>void generateSoundEffects()}>{generatingEmphasis?'正在配音效…':'自动配音效'}</button>
              <p className="editor-hint">数字、对比卡片出现或转场时配轻音效，可在音效轨调整时间、音量或删除。自动重点词视觉效果已暂停。</p>
              <p className="editor-hint">本地规则匹配，不是 AI 理解。不上传视频，也不为每句话堆叠卡片。</p>
              <div className="project-actions"><button className="editor-action" disabled={!cues.length} type="button" onClick={exportHandoff}>导出给助手精修</button><label className="editor-action project-import"><input type="file" accept=".json" onChange={importArrangement} />导入助手编排</label></div>
              <p className="editor-hint">把视频和同版本 SRT 发给助手，由助手使用工作台技能编排后导入本页供你审核。</p>
            </section>
            <section className="settings-section"><div className="section-title"><span>01</span> PLAYBACK</div><Range label="新卡片默认时长" value={duration} onChange={setDuration} min={3} max={20} suffix="s" /><div className="toggle-row"><span>播放视频声音</span><button className={`toggle ${!videoMuted ? 'is-on' : ''}`} onClick={() => setVideoMuted(state => !state)} aria-pressed={!videoMuted} type="button"><i /></button></div>{!videoMuted && <Range label="预览音量" value={videoVolume} onChange={setVideoVolume} min={0} max={100} suffix="%" />}<div className="toggle-row"><span>自动播放</span><button className={`toggle ${playing ? 'is-on' : ''}`} onClick={togglePlayback} aria-pressed={playing} type="button"><i /></button></div><p className="editor-hint">MP4 包含人物原声与音效；透明 MOV 只带动效画面和音效，不带人物原声。预览静音不影响导出。</p></section>

            <section className="settings-section material-library-section"><div className="section-title"><span>02</span> 素材库</div><p className="editor-hint">导入图片或操作录屏，定位到要出现的时间再加到画布。视频素材默认静音，保留人物口播；可拖动、缩放或铺满画面。</p><label className="editor-action editor-action--primary project-import"><input ref={materialInputRef} type="file" accept="image/*,video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm" multiple onChange={importMaterials} />＋ 导入图片 / 视频素材</label><input className="material-search" value={materialQuery} onChange={event => setMaterialQuery(event.target.value)} placeholder="按文件名或标签查找素材" />{materialSuggestions.length > 0 && <div className="material-suggestions"><span>文案可能需要：</span>{materialSuggestions.map(query => <a key={query} href={`https://www.bing.com/images/search?q=${encodeURIComponent(query)}`} target="_blank" rel="noreferrer">查找 {query}</a>)}</div>}<div className="material-grid">{visibleMaterials.map(asset => <article key={asset.id}>{asset.kind==='video'?<span className="material-video-thumb">▶</span>:<img src={asset.url} alt="" />}<div><b title={asset.name}>{asset.name}</b><small>{asset.kind==='video'?`视频 · ${(asset.duration??0).toFixed(1)} 秒`:asset.kind === 'logo' ? 'LOGO' : asset.kind === 'screenshot' ? '截图' : '图片'}</small></div><button draggable onDragStart={event => handleMaterialDrag(event, asset.id)} onClick={() => addMaterialLayer(asset)} type="button">＋ 加到画布</button><button className="material-remove" onClick={() => setMaterials(items => items.filter(item => item.id !== asset.id))} type="button">移除</button></article>)}</div>{!visibleMaterials.length && <p className="media-note">素材库目前为空。私有文件或指定截图需要你提供；公开软件 logo 可以点上方建议去查找。</p>}</section>

            <section className="settings-section canvas-editor-section">
              <div className="section-title"><span>02</span> LAYER EDITOR</div>
              <button className="editor-action editor-action--add-effect" type="button" onClick={() => addCardLayer(activeScene)}>＋ 添加当前动效·{active.name}</button>
              <button className="editor-action editor-action--primary" type="button" onClick={addTextLayer}>＋ 添加文字图层</button>
              <div className="toggle-row"><span>允许拖动与缩放（显示编辑框）</span><button className={`toggle ${editorMode ? 'is-on' : ''}`} onClick={() => { setEditorMode((state) => !state); editorGestureRef.current = null }} aria-label="允许拖动与缩放" aria-pressed={editorMode} type="button"><i /></button></div>
              <div className="toggle-row"><span>显示动效图层</span><button className={`toggle ${showOverlayLayers ? 'is-on' : ''}`} onClick={() => setShowOverlayLayers((state) => !state)} aria-pressed={showOverlayLayers} type="button"><i /></button></div>
              <div className="layer-stack">
                <div className="layer-stack-heading"><span>画布图层</span><b>{canvasLayers.length}</b></div>
                {[...canvasLayers].sort((a, b) => b.zIndex - a.zIndex).map((layer) => <div className={`layer-stack-row ${selectedLayerId === layer.id ? 'is-active' : ''}`} key={layer.id}><button type="button" onClick={() => selectLayer(layer)}><i>{layer.type === 'card' ? '卡' : layer.type === 'image' ? '图' : '字'}</i><span>{layer.type === 'card' ? scenes.find((scene) => scene.id === layer.sceneId)?.name : layer.type === 'image' ? layer.assetName : layer.text?.slice(0, 12)}</span></button><button className="layer-stack-remove" type="button" onClick={() => removeLayer(layer.id)} aria-label="移除图层">×</button></div>)}
              </div>
              {selectedLayer ? <>
                <div className="editor-selected"><span>当前选中图层</span><b>{selectedLayer.type === 'card' ? `${scenes.find((scene) => scene.id === selectedLayer.sceneId)?.number} · ${scenes.find((scene) => scene.id === selectedLayer.sceneId)?.name}` : selectedLayer.type === 'image' ? `IMAGE · ${selectedLayer.assetName}` : 'TEXT · 自由文字'}</b></div>
                <div className="editor-position"><Field label="开始时间（秒）" type="number" value={Number((selectedLayer.start ?? 0).toFixed(2))} onChange={value => { const start = Math.max(0, Math.min((selectedLayer.end ?? totalDuration) - .1, Number(value) || 0)); updateLayer(selectedLayer.id, { start, end: selectedLayer.end ?? totalDuration }); seek(start + .05) }} /><Field label="结束时间（秒）" type="number" value={Number((selectedLayer.end ?? totalDuration).toFixed(2))} onChange={value => updateLayer(selectedLayer.id, { start: selectedLayer.start ?? 0, end: Math.max((selectedLayer.start ?? 0) + .1, Math.min(videoDuration || 86400, Number(value) || .1)) })} /></div>
                <div className="duration-editor"><Field label="持续时长（秒）" type="number" value={Number(((selectedLayer.end ?? totalDuration) - (selectedLayer.start ?? 0)).toFixed(2))} onChange={value => updateLayer(selectedLayer.id, { end: Math.min(videoDuration || 86400, (selectedLayer.start ?? 0) + Math.max(.5, Number(value) || .5)) })} /><div className="duration-buttons"><button type="button" onClick={() => updateLayer(selectedLayer.id, {end: Math.min(videoDuration || 86400, (selectedLayer.end ?? totalDuration) + 1)})}>＋1 秒</button><button type="button" onClick={() => updateLayer(selectedLayer.id, {end: Math.min(videoDuration || 86400, (selectedLayer.end ?? totalDuration) + 3)})}>＋3 秒</button><button type="button" onClick={() => updateLayer(selectedLayer.id, {end: Math.max((selectedLayer.start ?? 0) + .5, (selectedLayer.end ?? totalDuration) - 1)})}>－1 秒</button></div></div>
                {selectedLayer.type !== 'image' && <label className="control-field"><span>整层字体</span><select value={selectedLayer.fontFamily ?? FONT_OPTIONS[0].value} onChange={event => updateLayer(selectedLayer.id, {fontFamily:event.target.value})}>{FONT_OPTIONS.map(font => <option key={font.label} value={font.value}>{font.label}</option>)}</select></label>}
                {selectedLayer.story&&<p className="editor-hint">全片模板包含 {selectedLayer.story.scenes.length} 个语义镜头；内容可在全片编辑器中修改。<button onClick={()=>void draft.save().then(saved=>location.assign('/?storyLab&draft='+saved.id)).catch(e=>setArrangeMessage(e.message))}>打开全片编辑器</button></p>}
                {selectedLayer.review&&<ReviewInstanceControls binding={selectedLayer.review} onChange={patch=>changeReviewParams(selectedLayer,patch)} onOpen={()=>void openReviewEditor(selectedLayer)} onRetry={()=>setReviewRetry(n=>n+1)}/>}
                {selectedLayer.script && <div className="script-editor">
                  <label className="control-field"><span>动效样式（保留文案）</span><select value={selectedLayer.sceneId} onChange={event=>{ const sceneId=event.target.value as ScriptTemplate; const script={...selectedLayer.script!}; if(['compare','beforeafter','triad','docrelay','growthpath'].includes(sceneId)){const count=['compare','beforeafter'].includes(sceneId)?2:3;script.items=Array.from({length:count},(_,i)=>script.items[i]||`要点 ${i+1}`)} if(['fan','bubbles','ribbon','orbitflow','embed','merge','rail','list','tags','timeline','loop','agenda','symbol','questionstack','appburst','choicehub','checknote','filedrawer'].includes(sceneId)&&!script.items.length)script.items=['输入内容','输出结果']; if(['metric','progress','ring','gauge'].includes(sceneId)&&!script.value)script.value='0%';if(sceneId==='symbol')script.palette='symbol';if(referenceScenes.includes(sceneId as typeof referenceScenes[number])&&!script.title.trim())script.title=scenes.find(scene=>scene.id===sceneId)?.description??'重点内容';updateLayer(selectedLayer.id,{sceneId,script});setActiveScene(sceneId);setSelectedPart(null) }}>{scriptTemplates.map(template=><option key={template.id} value={template.id}>{template.label}</option>)}</select></label>
                  <label className="control-field"><span>动效风格</span><select value={selectedLayer.script.palette??'flow'} onChange={event=>updateScript({palette:event.target.value as ScriptContent['palette']})}><option value="flow">流程数据 · 团队能力</option><option value="indigo">现有 · 蓝紫 / 橙色</option><option value="blue">现有 · 清晰蓝 / 青色</option><option value="warm">现有 · 暖橙 / 深蓝</option><option value="symbol">符号叙事</option></select></label>
                  <Range label="动作幅度" min={50} max={200} value={(selectedLayer.script.motion??1)*100} suffix="%" onChange={value=>updateScript({motion:value/100})}/>
                  <Range label="整卡大小" min={35} max={160} value={Math.round(selectedLayer.width/CANVAS_WIDTH*100)} suffix="%" onChange={value=>updateLayer(selectedLayer.id,{width:CANVAS_WIDTH*value/100,height:CANVAS_HEIGHT*value/100})}/>
                  <div className="editor-position"><Field label="卡片 X" value={Math.round(selectedLayer.x)} type="number" onChange={value => updateLayer(selectedLayer.id, { x: Math.max(0, Math.min(CANVAS_WIDTH - selectedLayer.width, Number(value) || 0)) })} /><Field label="卡片 Y" value={Math.round(selectedLayer.y)} type="number" onChange={value => updateLayer(selectedLayer.id, { y: Math.max(0, Math.min(CANVAS_HEIGHT - selectedLayer.height, Number(value) || 0)) })} /></div>
                  <div className="editor-position"><Field label="卡片宽度" value={Math.round(selectedLayer.width)} type="number" onChange={value => updateLayer(selectedLayer.id, { width: Math.max(160, Math.min(CANVAS_WIDTH - selectedLayer.x, Number(value) || 160)) })} /><Field label="卡片高度" value={Math.round(selectedLayer.height)} type="number" onChange={value => updateLayer(selectedLayer.id, { height: Math.max(100, Math.min(CANVAS_HEIGHT - selectedLayer.y, Number(value) || 100)) })} /></div>
                  <p className="editor-hint">{selectedLayer.origin === 'local' ? '本地规则草稿 · 需要核对' : selectedLayer.origin === 'assistant' ? '助手编排' : '手动卡片'} · {selectedLayer.reason}</p>
                  <label className="control-field control-field--textarea"><span>标题 / 重点文案</span><textarea rows={3} maxLength={140} value={selectedLayer.script.title} onChange={event => updateScript({ title: event.target.value })} /></label>
                  {['orbitcards','metric','progress','person','ring','gauge'].includes(selectedLayer.sceneId!) && <Field label={selectedLayer.sceneId === 'orbitcards' ? '环绕中心文字' : selectedLayer.sceneId === 'person' ? '人物身份' : '原文数值（含单位）'} value={selectedLayer.script.value} onChange={value => updateScript({ value: value.slice(0, 24) })} />}
                  {selectedLayer.script.items.map((item, index) => <Field key={index} label={`要点 / 选项 ${index + 1}`} value={item} onChange={value => updateScript({ items: selectedLayer.script!.items.map((text, i) => i === index ? value.slice(0, 100) : text) })} />)}
                  <div className="layer-actions">{selectedLayer.sceneId !== 'compare' && ['rail','list','agenda','timeline','tags','loop','fan','bubbles','ribbon','orbitflow','merge','symbol','questionstack','appburst','choicehub','checknote','filedrawer','actionwindow'].includes(selectedLayer.sceneId!) && <><button type="button" disabled={selectedLayer.script.items.length >= (selectedLayer.sceneId === 'actionwindow' ? 1 : 4)} onClick={() => updateScript({items:[...selectedLayer.script!.items,'新要点']})}>＋ 增加要点</button><button type="button" disabled={selectedLayer.script.items.length <= (selectedLayer.sceneId === 'actionwindow' ? 0 : 1)} onClick={() => updateScript({items:selectedLayer.script!.items.slice(0,-1)})}>移除末项</button></>}</div>
                  <Field label={selectedLayer.sceneId === 'actionwindow' ? '操作按钮文字' : '补充说明'} value={selectedLayer.script.note} onChange={value => updateScript({ note: value.slice(0, 80) })} />
                  <label className="control-field"><span>横屏位置（竖屏以安全区为准）</span><select value={selectedLayer.script.placement} onChange={event => updateScript({ placement: event.target.value as ScriptContent['placement'] })}><option value="left">左侧</option><option value="right">右侧</option><option value="bottom">{referenceScenes.includes(selectedLayer.sceneId as typeof referenceScenes[number]) ? '左下（避开人物和字幕）' : '下方'}</option></select></label>
                  <details className="source-transcript" open><summary>核对对应字幕</summary>{cues.filter(cue => selectedLayer.cueIds?.includes(cue.id)).map(cue => <p key={cue.id}><time>{timeLabel(cue.start)}</time> {cue.text}</p>)}</details>
                </div>}
                <div className="toggle-row"><span>显示本图层</span><button className={`toggle ${selectedLayer.visible ? 'is-on' : ''}`} onClick={() => updateLayer(selectedLayer.id, { visible: !selectedLayer.visible })} aria-pressed={selectedLayer.visible} type="button"><i /></button></div>
                <div className="toggle-row"><span>锁定当前卡片位置和大小</span><button className={`toggle ${selectedLayer.locked ? 'is-on' : ''}`} onClick={() => { const nextLocked = !selectedLayer.locked; if (nextLocked) rememberCardLayout(selectedLayer); updateLayer(selectedLayer.id, { locked: nextLocked }) }} aria-pressed={Boolean(selectedLayer.locked)} type="button"><i /></button></div>
                {selectedLayer.type === 'card' && <p className="editor-hint">锁定用于防止误拖，并记住整卡布局；不会把组件修改保存为库模板。</p>}
                {selectedLayer.type === 'image' && <>
                  <MediaControls value={selectedLayer.presentation} onChange={presentation=>updateLayer(selectedLayer.id,{presentation})}/>
                  <button type="button" className="editor-action" onClick={()=>updateLayer(selectedLayer.id,{x:0,y:0,width:CANVAS_WIDTH,height:CANVAS_HEIGHT,presentation:{...selectedLayer.presentation,frame:'fullscreen',title:'',fit:'contain'}})}>铺满素材区 / 画布</button>
                  {selectedLayer.mediaType==='video'&&<><Field label="素材从第几秒开始" type="number" value={selectedLayer.sourceOffset??0} onChange={value=>updateLayer(selectedLayer.id,{sourceOffset:Math.min(Math.max(0,(selectedLayer.sourceDuration??86400)-.04),Math.max(0,Number(value)||0))})}/><p className="editor-hint">素材静音，保留人物口播。素材播完后停在最后一帧，到片段结束时消失。开始／结束时间控制它在整片的出现范围。</p></>}
                </>} 
                {selectedLayer.type === 'card' ? <>
                  <label className="control-field"><span>选择内部组件（含已隐藏）</span><select value={selectedPart?.key ?? ''} onChange={event => setSelectedPart(availableParts.find(part => part.key === event.target.value) ?? null)}><option value="">点击画布或在这里选择</option>{availableParts.map(part => <option key={part.key} value={part.key}>{part.label} · {part.key}{partTransforms[part.layerId]?.[part.key]?.hidden ? '（隐藏）' : ''}</option>)}</select></label>
                  {selectedPart && selectedPartTransform ? <div className="part-editor">
                    <div className="editor-selected editor-selected--part"><span>内部小组件</span><b>{selectedPart.label}</b></div>
                    <p className="editor-hint">拖动橙框可移动该组件。文字内容在文案区编辑；隐藏后可在上方列表找回。</p>
                    <div className="part-colors"><label>文字 / 图标<input type="color" value={selectedPartTransform.color || '#ffffff'} onInput={event => updatePartTransform(selectedPart.layerId, selectedPart.key, {color:event.currentTarget.value})} onChange={event => updatePartTransform(selectedPart.layerId, selectedPart.key, {color:event.target.value})}/></label><label>底色<input type="color" value={selectedPartTransform.background || '#2a2a3e'} onInput={event => updatePartTransform(selectedPart.layerId, selectedPart.key, {background:event.currentTarget.value})} onChange={event => updatePartTransform(selectedPart.layerId, selectedPart.key, {background:event.target.value})}/></label><button type="button" onClick={() => updatePartTransform(selectedPart.layerId, selectedPart.key, {color:undefined,background:undefined,opacity:undefined})}>恢复原色</button></div>
                    <label className="control-field"><span>小组件字体</span><select value={selectedPartTransform.fontFamily ?? ''} onChange={event => updatePartTransform(selectedPart.layerId, selectedPart.key, {fontFamily:event.target.value || undefined})}><option value="">跟随整张卡片</option>{FONT_OPTIONS.map(font => <option key={font.label} value={font.value}>{font.label}</option>)}</select></label>
                    <Range label="组件不透明度" value={selectedPartTransform.opacity ?? 100} min={0} max={100} suffix="%" onChange={value => updatePartTransform(selectedPart.layerId, selectedPart.key, {opacity:value})}/>
                    <button className="editor-action" type="button" onClick={() => updatePartTransform(selectedPart.layerId, selectedPart.key, {hidden:!selectedPartTransform.hidden})}>{selectedPartTransform.hidden ? '恢复此组件' : '隐藏此组件'}</button>
                    <div className="editor-position"><Field label="偏移 X" value={Math.round(selectedPartTransform.x)} type="number" onChange={(value) => updatePartTransform(selectedPart.layerId, selectedPart.key, { x: Number(value) || 0 })} /><Field label="偏移 Y" value={Math.round(selectedPartTransform.y)} type="number" onChange={(value) => updatePartTransform(selectedPart.layerId, selectedPart.key, { y: Number(value) || 0 })} /></div>
                    <Range label="小组件大小" value={Math.round(selectedPartTransform.scale * 100)} onChange={(value) => updatePartTransform(selectedPart.layerId, selectedPart.key, { scale: value / 100 })} min={30} max={220} suffix="%" />
                    {selectedPartTextFields.length > 0 && <div className="part-text-fields"><span>小组件文字</span>{selectedPartTextFields.slice(0, 10).map((field) => <div className="part-text-row" key={field.key}><label><small>{field.label}</small><input value={field.value} onChange={(event) => updatePartText(selectedPart.layerId, field.key, event.target.value)} /></label><button type="button" onClick={() => resetPartText(selectedPart.layerId, field.key)} title="恢复原文">↺</button></div>)}</div>}
                    <button className="editor-action" type="button" onClick={() => updatePartTransform(selectedPart.layerId, selectedPart.key, { x: 0, y: 0, scale: 1 })}>恢复这个小组件的位置和大小</button>
                  </div> : <p className="editor-hint">点击画布中的数字、标题、选项、图片或步骤，再单独拖动、缩放或改文字。</p>}
                </> : <><p className="editor-hint">拖动画面中的{selectedLayer.type === 'image' ? '素材' : '文字框'}移动；拖右下角手柄调整尺寸。</p><div className="editor-position"><Field label="X" value={Math.round(selectedLayer.x)} type="number" onChange={(value) => updateLayer(selectedLayer.id, { x: Math.max(0, Math.min(CANVAS_WIDTH - selectedLayer.width, Number(value) || 0)) })} /><Field label="Y" value={Math.round(selectedLayer.y)} type="number" onChange={(value) => updateLayer(selectedLayer.id, { y: Math.max(0, Math.min(CANVAS_HEIGHT - selectedLayer.height, Number(value) || 0)) })} /></div><div className="editor-position"><Field label="宽度" value={Math.round(selectedLayer.width)} type="number" onChange={(value) => updateLayer(selectedLayer.id, { width: Math.max(80, Math.min(CANVAS_WIDTH - selectedLayer.x, Number(value) || 80)) })} /><Field label="高度" value={Math.round(selectedLayer.height)} type="number" onChange={(value) => updateLayer(selectedLayer.id, { height: Math.max(50, Math.min(CANVAS_HEIGHT - selectedLayer.y, Number(value) || 50)) })} /></div>{selectedLayer.type === 'text' && <><label className="control-field control-field--textarea"><span>文字内容</span><textarea value={selectedLayer.text ?? ''} rows={4} onChange={(event) => updateLayer(selectedLayer.id, { text: event.target.value })} /></label><label className="control-field"><span>文字颜色</span><input type="color" value={selectedLayer.textColor || '#ffffff'} onInput={event => updateLayer(selectedLayer.id, {textColor:event.currentTarget.value})} onChange={event => updateLayer(selectedLayer.id, {textColor:event.target.value})} /></label><Range label="文字大小" value={selectedLayer.fontSize} onChange={(value) => updateLayer(selectedLayer.id, { fontSize: value })} min={16} max={120} suffix="px" /><div className="text-style-picker"><button className={selectedLayer.textStyle === 'panel' ? 'is-active' : ''} onClick={() => updateLayer(selectedLayer.id, { textStyle: 'panel' })} type="button">面板</button><button className={selectedLayer.textStyle === 'caption' ? 'is-active' : ''} onClick={() => updateLayer(selectedLayer.id, { textStyle: 'caption' })} type="button">字幕</button><button className={selectedLayer.textStyle === 'plain' ? 'is-active' : ''} onClick={() => updateLayer(selectedLayer.id, { textStyle: 'plain' })} type="button">纯文字</button></div></>}</>}
                <div className="layer-actions"><button type="button" onClick={() => moveLayerOrder(selectedLayer.id, 'up')}>上移一层</button><button type="button" onClick={() => moveLayerOrder(selectedLayer.id, 'down')}>下移一层</button></div>
                <button className="editor-action editor-action--danger" type="button" onClick={() => removeLayer(selectedLayer.id)}>移除当前图层</button>
              </> : <div className="editor-empty-selection"><b>没有选中图层</b><span>点击画布中的卡片，或从左侧拖入一个新卡片。</span></div>}
              {canvasLayers.length > 0 && <button className="editor-action editor-action--ghost-danger" type="button" onClick={clearAllLayers}>清空全部图层</button>}
              <div className="project-actions"><button className="editor-action editor-action--primary" type="button" onClick={exportProject}>导出工程 JSON</button><label className="editor-action project-import"><input ref={projectInputRef} type="file" accept="application/json,.json" onChange={importProject} />导入工程 JSON</label></div>
              <p className="editor-hint">JSON 会保存全部卡片、文字、时间、字体和素材库图片；背景视频及旧版引用卡图片需重新选择。</p>
            </section>

            {activeScene === 'metric' && !selectedLayer?.script && <section className="settings-section"><div className="section-title"><span>02</span> CONTENT</div><Range label="核心数值" value={metric.value} onChange={(value) => setMetric({ ...metric, value })} min={0} max={100} step={0.1} suffix="%" /><Field label="数值单位" value={metric.unit} onChange={(value) => setMetric({ ...metric, unit: value.slice(0, 3) })} /><Field label="主题标签" value={metric.label} onChange={(value) => setMetric({ ...metric, label: value.toUpperCase() })} /><Field label="辅助信息" value={metric.note} onChange={(value) => setMetric({ ...metric, note: value.toUpperCase() })} /></section>}

            {activeScene === 'compare' && !selectedLayer?.script && <section className="settings-section"><div className="section-title"><span>02</span> COMPARISON</div><Range label="分割位置" value={compare.split} onChange={(value) => setCompare({ ...compare, split: value })} min={25} max={75} suffix="%" /><Field label="左侧标题" value={compare.leftTitle} onChange={(value) => setCompare({ ...compare, leftTitle: value.toUpperCase() })} /><Range label="左侧数值" value={compare.leftValue} onChange={(value) => setCompare({ ...compare, leftValue: value })} min={1} max={120} suffix="ms" /><Field label="右侧标题" value={compare.rightTitle} onChange={(value) => setCompare({ ...compare, rightTitle: value.toUpperCase() })} /><Range label="右侧数值" value={compare.rightValue} onChange={(value) => setCompare({ ...compare, rightValue: value })} min={1} max={120} suffix="ms" /></section>}

            {activeScene === 'quote' && !selectedLayer?.script && <section className="settings-section"><div className="section-title"><span>02</span> LOCKUP</div><label className="control-field control-field--textarea"><span>金句内容（以换行断句）</span><textarea value={quote.quote} rows={5} onChange={(event) => setQuote({ ...quote, quote: event.target.value.toUpperCase() })} /></label><Field label="来源说明" value={quote.source} onChange={(value) => setQuote({ ...quote, source: value.toUpperCase() })} /><Field label="章节索引" value={quote.index} onChange={(value) => setQuote({ ...quote, index: value.toUpperCase() })} /></section>}

            {activeScene === 'rail' && !selectedLayer?.script && <section className="settings-section"><div className="section-title"><span>02</span> SEQUENCE</div><label className="control-field control-field--textarea"><span>主标题（以换行断句）</span><textarea value={rail.title} rows={3} onChange={(event) => setRail({ ...rail, title: event.target.value.toUpperCase() })} /></label><Field label="步骤一" value={rail.first} onChange={(value) => setRail({ ...rail, first: value.toUpperCase() })} /><Field label="步骤二" value={rail.second} onChange={(value) => setRail({ ...rail, second: value.toUpperCase() })} /><Field label="步骤三" value={rail.third} onChange={(value) => setRail({ ...rail, third: value.toUpperCase() })} /><Field label="辅助说明" value={rail.note} onChange={(value) => setRail({ ...rail, note: value.toUpperCase() })} /></section>}

            {activeScene === 'source' && <section className="settings-section source-upload-section"><div className="section-title"><span>02</span> SOURCE IMAGE</div><label className="video-import"><input ref={sourceImageInputRef} type="file" accept="image/*" onChange={importSourceImage} /><span>＋ 导入引用截图</span><small>PNG / JPG / WEBP</small></label>{sourceImage ? <div className="video-status"><span title={sourceImage.name}>{sourceImage.name}</span><button onClick={clearSourceImage} type="button">移除</button></div> : <p className="media-note">适合截图、数据图表或文章页面；仅本地预览。</p>}</section>}

            {activeScene === 'insert' && <section className="settings-section source-upload-section"><div className="section-title"><span>02</span> IMAGE INSERT</div><label className="video-import"><input ref={insertImageInputRef} type="file" accept="image/*" onChange={importInsertImage} /><span>＋ 导入小图</span><small>PNG / JPG / WEBP</small></label>{insertImage ? <div className="video-status"><span title={insertImage.name}>{insertImage.name}</span><button onClick={clearInsertImage} type="button">移除</button></div> : <p className="media-note">图片固定在人物右侧安全区外，仅本地预览。</p>}</section>}

            {infoCards.some((card) => card.id === activeScene) && <section className="settings-section"><div className="section-title"><span>02</span> CARD MOTION</div><div className="style-row"><span>进场方式</span><b>SEQUENTIAL</b></div><div className="style-row"><span>循环状态</span><b>ACTIVE</b></div><div className="style-row"><span>人物区域</span><b>PROTECTED</b></div></section>}

            <section className="settings-section style-section"><div className="section-title"><span>03</span> STYLE</div><div className="style-row"><span>视觉语言</span><b>INDIGO / ORANGE</b></div><div className="style-row"><span>缓动曲线</span><b>SOFT DECEL</b></div><div className="style-row"><span>光效</span><b>DISABLED</b></div></section>
          </div>
        </aside>
      </div>
    </main>
  )
}
