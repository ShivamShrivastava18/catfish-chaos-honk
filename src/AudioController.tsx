import { useAudio } from './useAudio'

/**
 * Headless: mount once at app root to wire procedural audio to the store
 * (ambience, boss sting, jingles, honks, objective/boss-hit SFX).
 */
export function AudioController() {
  useAudio()
  return null
}
