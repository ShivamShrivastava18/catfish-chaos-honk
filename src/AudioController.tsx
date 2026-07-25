import { useAudio } from './useAudio'

/**
 * Headless: mount once at app root to wire procedural audio to the store
 * (ambience, boss sting + looping boss battle music, jingles, honks,
 * objective/boss-hit SFX, nursery chime, fry bubbles, revive + game-over cues).
 */
export function AudioController() {
  useAudio()
  return null
}
