import type { SubtitleCue } from './arrangement'

export type EmphasisSuggestion = {
  cueId: string
  text: string
  start: number
  end: number
  sound: 'pop' | 'sweep'
}

const namedPhrases = [
  '最耗时间', '快速成片', '一条命令', '重点词', '读取脚本', '拆解视频', '匹配动效',
  '画面融合', '成片导出', '完整 MP4', '透明 MOV', '完整MP4', '透明MOV',
  '自动匹配', '自动识别', '节省时间', '核心结果', '正式版', '转型成功',
]
const transitionPattern = /第[一二三四五六七八九十\d]+步|首先|接下来|然后|最后|总结|回到正题/g
const numberPattern = /[+−-]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?\s*(?:%|％|亿|万|元|倍|小时|分钟|秒|年|个|次)/g

function phraseIn(text: string): { text: string; index: number; score: number } | null {
  const matches: { text: string; index: number; score: number }[] = []
  const quoted = /[“「『]([^”」』]{2,12})[”」』]/g
  for (const match of text.matchAll(quoted)) matches.push({ text: match[1], index: match.index + 1, score: 5 })
  for (const match of text.matchAll(numberPattern)) matches.push({ text: match[0].trim(), index: match.index, score: 4 })
  for (const phrase of namedPhrases) {
    const index = text.indexOf(phrase)
    if (index >= 0) matches.push({ text: phrase, index, score: 3 })
  }
  const point = text.match(/(?:关键|核心|重点|真正|最重要)(?:的)?(?:是|在于|就是)([^，。；！？!?]{2,10})/)
  if (point?.index !== undefined) matches.push({ text: point[1].trim(), index: point.index + point[0].indexOf(point[1]), score: 4 })
  for (const match of text.matchAll(transitionPattern)) matches.push({ text: match[0], index: match.index, score: 2 })
  matches.sort((a, b) => b.score - a.score || a.index - b.index)
  return matches[0] ?? null
}

/** A sparse, editable first pass. SRT has sentence timing, so word timing is estimated. */
export function suggestEmphasis(cues: SubtitleCue[], duration?: number): EmphasisSuggestion[] {
  const result: EmphasisSuggestion[] = []
  let lastStart = -Infinity
  for (const cue of [...cues].sort((a, b) => a.start - b.start)) {
    if (result.length >= 80 || (duration && cue.start >= duration)) break
    if (cue.start < lastStart + 1.8) continue
    const phrase = phraseIn(cue.text)
    if (!phrase || phrase.text.length > 14) continue
    const span = cue.end - cue.start
    if (span < .35) continue
    const position = phrase.index / Math.max(1, cue.text.length)
    const start = Math.max(cue.start, Math.min(cue.end - .25, cue.start + span * position - .06))
    const end = Math.min(duration || Infinity, cue.end + .12, start + Math.max(.65, Math.min(1.55, phrase.text.length * .22)))
    if (end - start < .25 || start < lastStart + 1.8) continue
    const sound = /第[一二三四五六七八九十\d]+步|首先|接下来|最后|总结/.test(phrase.text) ? 'sweep' : 'pop'
    result.push({ cueId: cue.id, text: phrase.text, start: Math.round(start * 100) / 100, end: Math.round(end * 100) / 100, sound })
    lastStart = start
  }
  return result
}
