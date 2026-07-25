import { useAudio } from './useAudio'

/** Headless: mount once at app root to wire procedural audio to the store. */
export function AudioController() {
  useAudio()
  return null
}
