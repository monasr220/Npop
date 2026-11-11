import { useSyncExternalStore } from "react"
import { equalizer, type EqState } from "../audio/equalizer"

export function useEqualizer() {
  const state: EqState = useSyncExternalStore(equalizer.subscribe, equalizer.getSnapshot)
  return { ...state, controls: equalizer }
}
