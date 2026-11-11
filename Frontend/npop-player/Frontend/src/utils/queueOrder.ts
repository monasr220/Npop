/**
 * Pure helpers for the play order of the queue.
 *
 * The queue itself (an array of tracks) never changes order. Playback walks an
 * `order` array of queue indexes instead, so shuffle only reshuffles that
 * array and the visible queue stays stable.
 */

export type RepeatMode = "off" | "all" | "one"

/** Fisher–Yates shuffle that returns a new array. */
function shuffled(values: number[], random: () => number): number[] {
  const result = [...values]
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

/**
 * Build a play order for `length` tracks. The track at `first` always plays
 * first; with `shuffle` the rest are randomised.
 */
export function makeOrder(
  length: number,
  first: number,
  shuffle: boolean,
  random: () => number = Math.random
): number[] {
  const all = Array.from({ length }, (_, i) => i)
  if (!shuffle) return all
  const rest = shuffled(
    all.filter((i) => i !== first),
    random
  )
  return length > 0 ? [first, ...rest] : []
}

/**
 * Reshuffle after the whole order has played (repeat-all). The new first
 * track is never the one that just finished, unless it is the only track.
 */
export function reshuffleAvoiding(
  length: number,
  avoid: number,
  random: () => number = Math.random
): number[] {
  const order = shuffled(
    Array.from({ length }, (_, i) => i),
    random
  )
  if (length > 1 && order[0] === avoid) {
    const swapWith = 1 + Math.floor(random() * (length - 1))
    ;[order[0], order[swapWith]] = [order[swapWith], order[0]]
  }
  return order
}

/**
 * Next position in `order`, or `null` when playback should stop.
 * `auto` is true when a track ended by itself and false for the Next button,
 * which always moves on (and wraps) even with repeat off.
 */
export function nextPosition(
  pos: number,
  length: number,
  repeat: RepeatMode,
  auto: boolean
): number | null {
  if (length === 0) return null
  if (auto && repeat === "one") return pos
  if (pos + 1 < length) return pos + 1
  if (repeat === "all" || !auto) return 0
  return null
}

export function previousPosition(pos: number, length: number): number {
  if (length === 0) return 0
  return pos > 0 ? pos - 1 : length - 1
}

/** Insert a new queue index `at` and slot it into the order after `pos`. */
export function insertIntoOrder(
  order: number[],
  pos: number,
  at: number,
  placeAfterCurrent: boolean
): { order: number[]; } {
  const shifted = order.map((i) => (i >= at ? i + 1 : i))
  const slot = placeAfterCurrent ? pos + 1 : shifted.length
  shifted.splice(slot, 0, at)
  return { order: shifted }
}

/**
 * Remove queue index `at` (never the current track). Returns the new order
 * and the new `pos`, which moves back by one when the removed entry sat
 * before the current position.
 */
export function removeFromOrder(
  order: number[],
  pos: number,
  at: number
): { order: number[]; pos: number } {
  const removedPos = order.indexOf(at)
  if (removedPos === -1) return { order, pos }
  const next = order.filter((i) => i !== at).map((i) => (i > at ? i - 1 : i))
  return { order: next, pos: removedPos < pos ? pos - 1 : pos }
}
