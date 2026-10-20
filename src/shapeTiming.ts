const clamp01 = (value: number) => value >= 1 - 1e-9 ? 1 : Math.max(0, value)

/** Keep a two-leg connector drawing for almost the whole card, including playback and seeks. */
export function stagedConnectorProgress(elapsed: number, duration: number) {
  const safeDuration = Math.max(.1, duration)
  return {
    first: clamp01((elapsed - safeDuration * .04) / (safeDuration * .46)),
    second: clamp01((elapsed - safeDuration * .52) / (safeDuration * .40)),
  }
}
