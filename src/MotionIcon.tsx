type MotionIconProps = { text: string; index?: number; className?: string }

const iconKind = (text: string, index: number) => {
  if (/书|手册|资料|文档|稿/.test(text)) return 'book'
  if (/经验|年|亲历|IT/.test(text)) return 'briefcase'
  if (/电|省动作|效率/.test(text)) return 'bolt'
  if (/门口|还没|没用/.test(text)) return 'door'
  if (/不用慌|安心|别慌/.test(text)) return 'shield'
  if (/云|上线|上云/.test(text)) return 'cloud'
  if (/质检|验收|标准|结果|完成|跑通|真用/.test(text)) return 'check'
  if (/环节|业务|流程|连接|进入/.test(text)) return 'flow'
  if (/口号|战略|会议|提|喊/.test(text)) return 'signal'
  if (/AI|智能|自动/.test(text)) return 'spark'
  if (/问题|哪个|哪里|哪一|选择/.test(text)) return 'search'
  if (/日常|持续|重复|循环/.test(text)) return 'cycle'
  return index < 0 ? 'spark' : null
}

export function MotionIcon({ text, index = 0, className = '' }: MotionIconProps) {
  const kind = iconKind(text, index)
  if (!kind) return null
  return <span className={`motion-icon motion-icon--${kind} ${className}`.trim()} aria-hidden="true">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      {kind === 'cloud' && <><path d="M6.4 18h10.3a3.3 3.3 0 0 0 .5-6.6A5.4 5.4 0 0 0 6.8 10 4 4 0 0 0 6.4 18Z"/><path d="m9 14 2 2 4-4"/></>}
      {kind === 'check' && <><path d="M5 12.5 9.2 17 19 7"/><path d="M12 3.5a8.5 8.5 0 1 1-7.4 4.3"/></>}
      {kind === 'flow' && <><circle cx="5" cy="6" r="2"/><circle cx="19" cy="12" r="2"/><circle cx="7" cy="19" r="2"/><path d="M7 6h4a3 3 0 0 1 3 3v0a3 3 0 0 0 3 3M17.5 13.5 9 18"/></>}
      {kind === 'signal' && <><path d="M5 14h3l7 4V6l-7 4H5Z"/><path d="M18 9.5a4 4 0 0 1 0 5M20 7a7 7 0 0 1 0 10"/></>}
      {kind === 'spark' && <><path d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7Z"/><path d="m18.5 16 .7 2.3 2.3.7-2.3.7-.7 2.3-.7-2.3-2.3-.7 2.3-.7Z"/></>}
      {kind === 'search' && <><circle cx="10.5" cy="10.5" r="6"/><path d="m15 15 5 5M10.5 7.5v3M10.5 13.4v.1"/></>}
      {kind === 'cycle' && <><path d="M19 7v5h-5M5 17v-5h5"/><path d="M7.1 8.2A6.5 6.5 0 0 1 18.7 12M5.3 12a6.5 6.5 0 0 0 11.6 3.8"/></>}
      {kind === 'book' && <><path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H11v17H7.5A3.5 3.5 0 0 0 4 22Z"/><path d="M20 5.5A3.5 3.5 0 0 0 16.5 2H13v17h3.5A3.5 3.5 0 0 1 20 22Z"/></>}
      {kind === 'briefcase' && <><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2"/></>}
      {kind === 'bolt' && <path d="m13 2-8 12h6l-1 8 9-13h-6Z"/>}
      {kind === 'door' && <><path d="M5 21V4.5L17 2v19M5 21h14"/><circle cx="14" cy="12" r=".7" fill="currentColor" stroke="none"/></>}
      {kind === 'shield' && <><path d="M12 2 20 5v6c0 5.2-3.4 9-8 11-4.6-2-8-5.8-8-11V5Z"/><path d="m8.5 12 2.2 2.2 4.8-5"/></>}
    </svg>
  </span>
}
