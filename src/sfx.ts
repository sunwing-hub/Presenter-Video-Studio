export type BuiltinSound = 'pop' | 'sweep'

/** Small locally generated cues; no third-party sound library or network request. */
export function makeSfxWav(kind: BuiltinSound): Blob {
  const sampleRate = 44100
  const seconds = kind === 'pop' ? .38 : .62
  const count = Math.round(sampleRate * seconds)
  const bytes = new ArrayBuffer(44 + count * 2)
  const view = new DataView(bytes)
  const write = (offset: number, value: string) => { for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i)) }
  write(0, 'RIFF'); view.setUint32(4, 36 + count * 2, true); write(8, 'WAVE')
  write(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true)
  view.setUint16(22, 1, true); view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true)
  write(36, 'data'); view.setUint32(40, count * 2, true)
  let noise = 0x12345678
  let smooth = 0
  for (let i = 0; i < count; i++) {
    const t = i / sampleRate
    noise ^= noise << 13; noise ^= noise >>> 17; noise ^= noise << 5
    const random = ((noise >>> 0) / 0xffffffff) * 2 - 1
    smooth = smooth * .89 + random * .11
    const sound = kind === 'pop'
      ? (Math.sin(2 * Math.PI * (660 * t - 500 * t * t)) * .5 + smooth * .22) * Math.exp(-t * 17) * Math.min(1, t * 450)
      : (smooth * .6 + Math.sin(2 * Math.PI * (250 * t + 650 * t * t)) * .12) * Math.sin(Math.PI * Math.min(1, t / seconds)) ** 1.5
    view.setInt16(44 + i * 2, Math.max(-32767, Math.min(32767, Math.round(sound * 32767))), true)
  }
  return new Blob([bytes], { type: 'audio/wav' })
}
