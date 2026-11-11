/**
 * 10-band graphic equalizer built on the Web Audio API.
 *
 * Signal path:  <audio> → low shelf → 8 peaking filters → high shelf → preamp → speakers
 *
 * The equalizer only touches audio when the element was loaded with
 * `crossOrigin = "anonymous"` and the host sends CORS headers (Cloudinary
 * does). Without CORS the browser outputs silence for audio routed through
 * Web Audio, so PlayerContext falls back to a plain element and marks the
 * equalizer as unavailable for that track.
 */

export const EQ_BANDS = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000] as const
export const EQ_MIN_GAIN = -12
export const EQ_MAX_GAIN = 12

export type EqGains = number[]

export const EQ_PRESETS: Record<string, EqGains> = {
  Flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  "Bass boost": [6, 5, 4, 2, 0, 0, 0, 0, 0, 0],
  "Treble boost": [0, 0, 0, 0, 0, 1, 2, 4, 5, 6],
  Vocal: [-2, -2, -1, 1, 3, 4, 3, 1, 0, -1],
  Rock: [4, 3, 2, 0, -1, -1, 1, 3, 4, 4],
  Pop: [-1, 1, 3, 4, 3, 0, -1, -1, 1, 2],
  Electronic: [5, 4, 1, 0, -2, 2, 1, 1, 4, 5],
  Acoustic: [3, 3, 2, 1, 1, 1, 2, 3, 2, 1],
}

export const CUSTOM_PRESET = "Custom"

export interface EqState {
  enabled: boolean
  gains: EqGains
  /** A key of EQ_PRESETS, or "Custom" once a band was moved by hand. */
  preset: string
  /** False when the current track's host blocks Web Audio processing. */
  available: boolean
}

const STORAGE_KEY = "npop_eq"
const FLAT = EQ_PRESETS.Flat

function clampGain(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(EQ_MAX_GAIN, Math.max(EQ_MIN_GAIN, Math.round(value * 2) / 2))
}

/** Validate whatever is in localStorage; never trust it. */
export function parseStoredState(raw: string | null): Pick<EqState, "enabled" | "gains" | "preset"> {
  const fallback = { enabled: false, gains: [...FLAT], preset: "Flat" }
  if (!raw) return fallback
  try {
    const data = JSON.parse(raw) as Partial<EqState>
    if (!Array.isArray(data.gains) || data.gains.length !== EQ_BANDS.length) return fallback
    const gains = data.gains.map((g) => clampGain(Number(g)))
    const preset =
      typeof data.preset === "string" &&
      (data.preset === CUSTOM_PRESET || data.preset in EQ_PRESETS)
        ? data.preset
        : CUSTOM_PRESET
    return { enabled: data.enabled === true, gains, preset }
  } catch {
    return fallback
  }
}

/**
 * Headroom so boosted bands do not clip: lower the overall level by 60% of
 * the largest boost.
 */
export function preampDb(gains: EqGains): number {
  const maxBoost = Math.max(0, ...gains)
  return -maxBoost * 0.6
}

const dbToLinear = (db: number) => 10 ** (db / 20)

type Listener = () => void

export class Equalizer {
  private state: EqState
  private listeners = new Set<Listener>()
  private context: AudioContext | null = null
  private source: MediaElementAudioSourceNode | null = null
  private filters: BiquadFilterNode[] = []
  private preamp: GainNode | null = null

  constructor() {
    const stored = parseStoredState(
      typeof localStorage === "undefined" ? null : localStorage.getItem(STORAGE_KEY)
    )
    this.state = { ...stored, available: true }
  }

  // ------------------------------------------------ external store contract
  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  getSnapshot = (): EqState => this.state

  private update(patch: Partial<EqState>, persist = true) {
    this.state = { ...this.state, ...patch }
    if (persist) {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            enabled: this.state.enabled,
            gains: this.state.gains,
            preset: this.state.preset,
          })
        )
      } catch {
        /* storage may be full or blocked; the equalizer still works */
      }
    }
    this.applyToGraph()
    this.listeners.forEach((listener) => listener())
  }

  // ------------------------------------------------------------- controls
  setEnabled(enabled: boolean) {
    this.update({ enabled })
  }

  setGain(band: number, gain: number) {
    if (band < 0 || band >= EQ_BANDS.length) return
    const gains = [...this.state.gains]
    gains[band] = clampGain(gain)
    this.update({ gains, preset: CUSTOM_PRESET })
  }

  applyPreset(name: string) {
    const gains = EQ_PRESETS[name]
    if (!gains) return
    this.update({ gains: [...gains], preset: name })
  }

  setAvailable(available: boolean) {
    if (this.state.available === available) return
    this.update({ available }, false)
  }

  // -------------------------------------------------------------- graph
  /** Route `audio` through the filter chain. Call once per element. */
  attach(audio: HTMLAudioElement): boolean {
    try {
      const Ctor: typeof AudioContext | undefined =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return false

      if (!this.context) {
        this.context = new Ctor()
        this.filters = EQ_BANDS.map((frequency, i) => {
          const filter = this.context!.createBiquadFilter()
          filter.type =
            i === 0 ? "lowshelf" : i === EQ_BANDS.length - 1 ? "highshelf" : "peaking"
          filter.frequency.value = frequency
          filter.Q.value = 1.1
          return filter
        })
        this.preamp = this.context.createGain()
        this.filters.forEach((filter, i) => {
          if (i > 0) this.filters[i - 1].connect(filter)
        })
        this.filters[this.filters.length - 1].connect(this.preamp)
        this.preamp.connect(this.context.destination)
      }

      this.detach()
      this.source = this.context.createMediaElementSource(audio)
      this.source.connect(this.filters[0])
      this.applyToGraph()
      return true
    } catch {
      return false
    }
  }

  detach() {
    try {
      this.source?.disconnect()
    } catch {
      /* already disconnected */
    }
    this.source = null
  }

  /** Browsers start an AudioContext suspended until a user gesture. */
  resume() {
    if (this.context && this.context.state === "suspended") {
      void this.context.resume().catch(() => undefined)
    }
  }

  private applyToGraph() {
    if (!this.context || !this.preamp) return
    const now = this.context.currentTime
    const gains = this.state.enabled ? this.state.gains : FLAT
    this.filters.forEach((filter, i) => {
      filter.gain.setTargetAtTime(gains[i], now, 0.015)
    })
    this.preamp.gain.setTargetAtTime(
      dbToLinear(this.state.enabled ? preampDb(gains) : 0),
      now,
      0.015
    )
  }
}

/** One equalizer for the whole app; there is a single audio output. */
export const equalizer = new Equalizer()
