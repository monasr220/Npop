import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { equalizer } from "../audio/equalizer"
import { api } from "../services/api"
import type { Track } from "../types"
import {
  insertIntoOrder,
  makeOrder,
  nextPosition,
  previousPosition,
  removeFromOrder,
  reshuffleAvoiding,
  type RepeatMode,
} from "../utils/queueOrder"

interface PlayerContextValue {
  current: Track | null
  /** The queue in its visible order. It never changes order when shuffling. */
  queue: Track[]
  /** Queue indexes in the order they will play (differs from queue when shuffled). */
  order: number[]
  /** Position of the current track inside `order`. */
  position: number
  /** Queue index of the current track. */
  index: number
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  shuffle: boolean
  repeat: RepeatMode
  play: (track: Track, queue?: Track[]) => void
  playQueue: (tracks: Track[], startIndex?: number) => void
  playAt: (queueIndex: number) => void
  playNext: (track: Track) => void
  addToQueue: (track: Track) => void
  removeFromQueue: (queueIndex: number) => void
  clearUpcoming: () => void
  toggleShuffle: () => void
  cycleRepeat: () => void
  toggle: () => void
  next: () => void
  previous: () => void
  seek: (time: number) => void
  setVolume: (volume: number) => void
  isCurrent: (trackId: string) => boolean
}

const PlayerContext = createContext<PlayerContextValue | undefined>(undefined)

const VOLUME_KEY = "npop_volume"
const SHUFFLE_KEY = "npop_shuffle"
const REPEAT_KEY = "npop_repeat"
const REPEAT_MODES: RepeatMode[] = ["off", "all", "one"]

function readRepeat(): RepeatMode {
  const stored = localStorage.getItem(REPEAT_KEY)
  return REPEAT_MODES.includes(stored as RepeatMode) ? (stored as RepeatMode) : "off"
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const unbindRef = useRef<() => void>(() => undefined)
  /** True when the current element was created with crossOrigin (equalizer-capable). */
  const usesCorsRef = useRef(false)
  const loadedUrlRef = useRef("")
  const corsRetriedRef = useRef(false)

  const [queue, setQueue] = useState<Track[]>([])
  const [order, setOrder] = useState<number[]>([])
  const [position, setPosition] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [shuffle, setShuffle] = useState(() => localStorage.getItem(SHUFFLE_KEY) === "1")
  const [repeat, setRepeat] = useState<RepeatMode>(readRepeat)
  const [volume, setVolumeState] = useState(() => {
    const stored = Number(localStorage.getItem(VOLUME_KEY))
    return Number.isFinite(stored) && stored >= 0 && stored <= 1 ? stored : 0.8
  })

  // Mirrors of state for callbacks that must not go stale (audio events).
  const queueRef = useRef<Track[]>([])
  const orderRef = useRef<number[]>([])
  const positionRef = useRef(0)
  const shuffleRef = useRef(shuffle)
  const repeatRef = useRef(repeat)
  const volumeRef = useRef(volume)
  const advanceRef = useRef<(auto: boolean) => void>(() => undefined)
  volumeRef.current = volume

  const index = order[position] ?? 0
  const current = queue[index] ?? null

  /** Write queue, play order and position to both refs and state. */
  const commit = useCallback((nextQueue: Track[], nextOrder: number[], nextPos: number) => {
    queueRef.current = nextQueue
    orderRef.current = nextOrder
    positionRef.current = nextPos
    setQueue(nextQueue)
    setOrder(nextOrder)
    setPosition(nextPos)
  }, [])

  // ------------------------------------------------------------ audio element
  const loadInto = useCallback(
    (audio: HTMLAudioElement, url: string, time: number, autoplay: boolean) => {
      audio.src = url
      if (time > 0) {
        audio.addEventListener(
          "loadedmetadata",
          () => {
            audio.currentTime = time
          },
          { once: true }
        )
      }
      if (autoplay && url) {
        equalizer.resume()
        audio.play().catch(() => undefined)
      }
    },
    []
  )

  /**
   * Create a fresh <audio> element. Audio routed through the equalizer needs
   * `crossOrigin`, which breaks hosts without CORS, so it is only requested
   * while the equalizer is on.
   */
  const mountAudio = useCallback((withCors: boolean) => {
    unbindRef.current()
    const old = audioRef.current
    if (old) {
      equalizer.detach()
      old.pause()
      old.removeAttribute("src")
      old.load()
    }

    const audio = new Audio()
    audio.preload = "metadata"
    audio.volume = volumeRef.current
    audioRef.current = audio
    usesCorsRef.current = false
    if (withCors) {
      if (equalizer.attach(audio)) {
        audio.crossOrigin = "anonymous" // must be set before src
        usesCorsRef.current = true
      } else {
        equalizer.setAvailable(false) // Web Audio unsupported
      }
    }

    const onTime = () => setCurrentTime(audio.currentTime)
    const onMetadata = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0)
    const onPlay = () => {
      setIsPlaying(true)
      equalizer.resume()
    }
    const onPause = () => setIsPlaying(false)
    const onEnded = () => advanceRef.current(true)
    const onError = () => {
      // A host without CORS fails to load once crossOrigin is set. Retry the
      // same track on a plain element; only the equalizer is lost.
      const url = loadedUrlRef.current
      if (!usesCorsRef.current || corsRetriedRef.current || !url) return
      corsRetriedRef.current = true
      const time = audio.currentTime
      equalizer.setAvailable(false)
      mountAudio(false)
      const plain = audioRef.current
      if (plain) loadInto(plain, url, time, true)
    }

    audio.addEventListener("timeupdate", onTime)
    audio.addEventListener("loadedmetadata", onMetadata)
    audio.addEventListener("play", onPlay)
    audio.addEventListener("pause", onPause)
    audio.addEventListener("ended", onEnded)
    audio.addEventListener("error", onError)
    unbindRef.current = () => {
      audio.removeEventListener("timeupdate", onTime)
      audio.removeEventListener("loadedmetadata", onMetadata)
      audio.removeEventListener("play", onPlay)
      audio.removeEventListener("pause", onPause)
      audio.removeEventListener("ended", onEnded)
      audio.removeEventListener("error", onError)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    mountAudio(equalizer.getSnapshot().enabled)
    return () => {
      unbindRef.current()
      equalizer.detach()
      audioRef.current?.pause()
      audioRef.current = null
    }
  }, [mountAudio])

  // Turning the equalizer on mid-track needs an equalizer-capable element.
  useEffect(
    () =>
      equalizer.subscribe(() => {
        const state = equalizer.getSnapshot()
        const audio = audioRef.current
        if (!audio || !state.enabled || !state.available || usesCorsRef.current) return
        const url = loadedUrlRef.current
        const time = audio.currentTime
        const wasPlaying = !audio.paused
        corsRetriedRef.current = false
        mountAudio(true)
        const fresh = audioRef.current
        if (fresh && url) loadInto(fresh, url, time, wasPlaying)
      }),
    [loadInto, mountAudio]
  )

  const startTrack = useCallback(
    (track: Track) => {
      const wantCors = equalizer.getSnapshot().enabled
      equalizer.setAvailable(true) // each track gets a fresh chance
      if (!audioRef.current || usesCorsRef.current !== wantCors) mountAudio(wantCors)
      const audio = audioRef.current
      if (!audio) return
      corsRetriedRef.current = false
      loadedUrlRef.current = track.audio_url || ""
      setCurrentTime(0)
      setDuration(track.duration || 0)
      loadInto(audio, track.audio_url || "", 0, true)
      // Register the listen (play counter + history) once per start.
      api.playTrack(track.id).catch(() => undefined)
    },
    [loadInto, mountAudio]
  )

  // ----------------------------------------------------------------- queue
  const startQueue = useCallback(
    (tracks: Track[], startIndex: number) => {
      const order = makeOrder(tracks.length, startIndex, shuffleRef.current)
      commit(tracks, order, order.indexOf(startIndex))
      startTrack(tracks[startIndex])
    },
    [commit, startTrack]
  )

  const play = useCallback(
    (track: Track, list?: Track[]) => {
      const nextQueue =
        list && list.length > 0
          ? list.some((item) => item.id === track.id)
            ? list
            : [track, ...list]
          : [track]
      const startIndex = Math.max(
        0,
        nextQueue.findIndex((item) => item.id === track.id)
      )
      startQueue(nextQueue, startIndex)
    },
    [startQueue]
  )

  const playQueue = useCallback(
    (tracks: Track[], startIndex = 0) => {
      if (tracks.length === 0) return
      startQueue(tracks, Math.min(Math.max(0, startIndex), tracks.length - 1))
    },
    [startQueue]
  )

  const playAt = useCallback(
    (queueIndex: number) => {
      const track = queueRef.current[queueIndex]
      const nextPos = orderRef.current.indexOf(queueIndex)
      if (!track || nextPos === -1) return
      commit(queueRef.current, orderRef.current, nextPos)
      startTrack(track)
    },
    [commit, startTrack]
  )

  const advance = useCallback(
    (auto: boolean) => {
      const list = queueRef.current
      const len = list.length
      const pos = positionRef.current
      const target = nextPosition(pos, len, repeatRef.current, auto)
      const audio = audioRef.current

      if (target === null) {
        // Reached the end with repeat off: stop on the last track.
        audio?.pause()
        if (audio) audio.currentTime = 0
        setCurrentTime(0)
        return
      }

      if (auto && repeatRef.current === "one") {
        const track = list[orderRef.current[pos]]
        if (audio && track) {
          audio.currentTime = 0
          audio.play().catch(() => undefined)
          api.playTrack(track.id).catch(() => undefined)
        }
        return
      }

      let nextOrder = orderRef.current
      const wrapped = len > 0 && pos === len - 1 && target === 0
      if (wrapped && shuffleRef.current && len > 1) {
        nextOrder = reshuffleAvoiding(len, nextOrder[pos])
      }
      commit(list, nextOrder, target)
      startTrack(list[nextOrder[target]])
    },
    [commit, startTrack]
  )
  advanceRef.current = advance

  const next = useCallback(() => advance(false), [advance])

  const previous = useCallback(() => {
    const list = queueRef.current
    if (list.length === 0) return
    const audio = audioRef.current
    if (audio && audio.currentTime > 4) {
      audio.currentTime = 0
      return
    }
    const target = previousPosition(positionRef.current, list.length)
    commit(list, orderRef.current, target)
    startTrack(list[orderRef.current[target]])
  }, [commit, startTrack])

  const playNext = useCallback(
    (track: Track) => {
      const list = queueRef.current
      if (list.length === 0) {
        play(track)
        return
      }
      const at = orderRef.current[positionRef.current] + 1
      const nextQueue = [...list.slice(0, at), track, ...list.slice(at)]
      const { order: nextOrder } = insertIntoOrder(
        orderRef.current,
        positionRef.current,
        at,
        true
      )
      commit(nextQueue, nextOrder, positionRef.current)
    },
    [commit, play]
  )

  const addToQueue = useCallback(
    (track: Track) => {
      const list = queueRef.current
      if (list.length === 0) {
        play(track)
        return
      }
      const nextQueue = [...list, track]
      const { order: nextOrder } = insertIntoOrder(
        orderRef.current,
        positionRef.current,
        list.length,
        false
      )
      commit(nextQueue, nextOrder, positionRef.current)
    },
    [commit, play]
  )

  const removeFromQueue = useCallback(
    (queueIndex: number) => {
      const list = queueRef.current
      // The playing track cannot be removed; that would be a skip.
      if (queueIndex < 0 || queueIndex >= list.length) return
      if (queueIndex === orderRef.current[positionRef.current]) return
      const removed = removeFromOrder(orderRef.current, positionRef.current, queueIndex)
      commit(
        list.filter((_, i) => i !== queueIndex),
        removed.order,
        removed.pos
      )
    },
    [commit]
  )

  const clearUpcoming = useCallback(() => {
    const track = queueRef.current[orderRef.current[positionRef.current]]
    if (!track) return
    commit([track], [0], 0)
  }, [commit])

  const toggleShuffle = useCallback(() => {
    const next = !shuffleRef.current
    shuffleRef.current = next
    setShuffle(next)
    localStorage.setItem(SHUFFLE_KEY, next ? "1" : "0")
    const list = queueRef.current
    if (list.length === 0) return
    const currentIndex = orderRef.current[positionRef.current]
    const nextOrder = makeOrder(list.length, currentIndex, next)
    commit(list, nextOrder, nextOrder.indexOf(currentIndex))
  }, [commit])

  const cycleRepeat = useCallback(() => {
    const nextMode = REPEAT_MODES[(REPEAT_MODES.indexOf(repeatRef.current) + 1) % REPEAT_MODES.length]
    repeatRef.current = nextMode
    setRepeat(nextMode)
    localStorage.setItem(REPEAT_KEY, nextMode)
  }, [])

  // -------------------------------------------------------------- transport
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume
    localStorage.setItem(VOLUME_KEY, String(volume))
  }, [volume])

  const toggle = useCallback(() => {
    const audio = audioRef.current
    if (!audio || !current) return
    if (audio.paused) {
      equalizer.resume()
      audio.play().catch(() => undefined)
    } else {
      audio.pause()
    }
  }, [current])

  const seek = useCallback((time: number) => {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = time
    setCurrentTime(time)
  }, [])

  const setVolume = useCallback((value: number) => {
    setVolumeState(Math.min(1, Math.max(0, value)))
  }, [])

  const isCurrent = useCallback(
    (trackId: string) => current?.id === trackId,
    [current]
  )

  const value = useMemo<PlayerContextValue>(
    () => ({
      current,
      queue,
      order,
      position,
      index,
      isPlaying,
      currentTime,
      duration,
      volume,
      shuffle,
      repeat,
      play,
      playQueue,
      playAt,
      playNext,
      addToQueue,
      removeFromQueue,
      clearUpcoming,
      toggleShuffle,
      cycleRepeat,
      toggle,
      next,
      previous,
      seek,
      setVolume,
      isCurrent,
    }),
    [
      current,
      queue,
      order,
      position,
      index,
      isPlaying,
      currentTime,
      duration,
      volume,
      shuffle,
      repeat,
      play,
      playQueue,
      playAt,
      playNext,
      addToQueue,
      removeFromQueue,
      clearUpcoming,
      toggleShuffle,
      cycleRepeat,
      toggle,
      next,
      previous,
      seek,
      setVolume,
      isCurrent,
    ]
  )

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>
}

export function usePlayer() {
  const context = useContext(PlayerContext)
  if (!context) throw new Error("usePlayer must be used inside PlayerProvider")
  return context
}
