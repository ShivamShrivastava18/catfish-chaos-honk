// story.ts — the full narrative script for Catfish Chaos: HONK! v2.
// Voice: Sir Reginald is a dry, formal, morally-grey river don (Sarkar-style).
// Lines are short enough for a speech bubble. References sprite keys from ./sprites.
import type { SpriteKey } from './sprites'

export type Speaker = 'reginald' | 'hench' | 'citizen' | 'boss' | 'narrator'

export interface DialogueLine {
  speaker: Speaker
  name: string
  portrait: SpriteKey | null
  text: string
}

export interface Character {
  id: string
  name: string
  portrait: SpriteKey
}

export const REGINALD: Character = { id: 'reginald', name: 'Sir Reginald', portrait: 'faceNeutral' }

/** Every named character, keyed by id (portraits are SpriteKeys from the manifest). */
export const CHARACTERS: Record<string, Character> = {
  reginald: REGINALD,
  vinny: { id: 'vinny', name: 'Vinny', portrait: 'henchClownfish' },
  marla: { id: 'marla', name: 'Marla', portrait: 'citizenGuppy' },
  sil: { id: 'sil', name: 'Sil', portrait: 'henchBetta' },
  barnaby: { id: 'barnaby', name: 'Old Barnaby', portrait: 'citizenCory' },
  paulie: { id: 'paulie', name: 'Big Paulie', portrait: 'henchPuffer' },
  della: { id: 'della', name: 'Della', portrait: 'citizenDiscus' },
  vitale: { id: 'vitale', name: 'Don Vitale', portrait: 'bossDonMan' },
}

// Concise line builders keep the scripts readable.
const reg = (text: string, portrait: SpriteKey = 'faceNeutral'): DialogueLine => ({
  speaker: 'reginald',
  name: REGINALD.name,
  portrait,
  text,
})
const hen = (c: Character, text: string): DialogueLine => ({ speaker: 'hench', name: c.name, portrait: c.portrait, text })
const cit = (c: Character, text: string): DialogueLine => ({ speaker: 'citizen', name: c.name, portrait: c.portrait, text })
const villain = (text: string): DialogueLine => ({ speaker: 'boss', name: CHARACTERS.vitale.name, portrait: 'bossDonMan', text })
const narr = (text: string): DialogueLine => ({ speaker: 'narrator', name: '', portrait: null, text })

// --- LEVEL 1 — "A Small Favour" (tutorial) ------------------------------------
export const L1_INTRO: DialogueLine[] = [
  hen(CHARACTERS.vinny, 'Boss. Lady here says it can’t wait.'),
  hen(CHARACTERS.vinny, 'She’s one of ours. No hat, no trouble.'),
  cit(CHARACTERS.marla, 'Sir Reginald. My nursery — my eggs — buried. Overnight.'),
  reg('Overnight. Rivers do not bury themselves, child.'),
  reg('Show me. We dig.'),
]
export const L1_OUTRO: DialogueLine[] = [
  cit(CHARACTERS.marla, 'They can breathe again. Bless you, Sir.'),
  reg('Keep them close. The water is not finished with us.'),
  hen(CHARACTERS.vinny, 'Boss… this silt. It don’t smell like river.'),
  reg('No. It smells of chemicals. Someone upstream is careless.', 'faceAngry'),
  reg('Find out who.', 'faceAngry'),
]

// --- LEVEL 2 — "Bad Water" ----------------------------------------------------
export const L2_INTRO: DialogueLine[] = [
  hen(CHARACTERS.sil, 'Boss. The reed beds. It’s bad down there.'),
  cit(CHARACTERS.barnaby, 'Drums, Sir. Leaking. And a net — it took my grandsons.'),
  cit(CHARACTERS.barnaby, 'The water tastes of metal now. Nothing grows.'),
  reg('Nets I understand. Poachers are honest thieves.'),
  reg('Drums are another matter. Cut the net. Haul the rest.'),
]
export const L2_OUTRO: DialogueLine[] = [
  cit(CHARACTERS.barnaby, 'The reeds may yet come back. Thank you, Sir.'),
  hen(CHARACTERS.sil, 'Boss — there’s writing stamped on the drums.'),
  reg('Read it to me.'),
  hen(CHARACTERS.sil, '“VITALE LAND CO.” Same on every one.'),
  reg('Vitale. So the careless man has a name.', 'faceAngry'),
]

// --- LEVEL 3 — "The Source" ---------------------------------------------------
export const L3_INTRO: DialogueLine[] = [
  hen(CHARACTERS.paulie, 'Boss, half the district’s sick. It’s the big pipe.'),
  cit(CHARACTERS.della, 'My children won’t wake, Sir. The pipe never stops.'),
  cit(CHARACTERS.della, 'It runs up to the surface. To the men’s side.'),
  reg('Then we follow it up. To whoever holds the other end.'),
  reg('Paulie. Bring my temper.'),
]
export const L3_OUTRO: DialogueLine[] = [
  reg('The pipe ends at a dock. And a man in a very fine hat.'),
  villain('Fish don’t vote. Don’t buy. Don’t matter. This is prime riverfront.'),
  villain('Kill the water, build the condos. “Riverfront.” Lovely word.'),
  reg('You poisoned children to sell a view.', 'faceAngry'),
  reg('Sleep well, Vitale. It is the last night you will.', 'faceAngry'),
]

// --- LEVEL 4 — "Sleep With The Fishes" (boss) ---------------------------------
export const L4_INTRO: DialogueLine[] = [
  villain('You came up for air, fish? Bad habit.'),
  villain('I’ve a hundred barrels and all afternoon.'),
  hen(CHARACTERS.paulie, 'Give him back his garbage, Boss.'),
  reg('I need only three. And your attention.'),
  reg('Gladly. Every last drop.', 'faceAngry'),
]
export const L4_OUTRO: DialogueLine[] = [
  villain('Wait — we can deal — I’m a reasonable—'),
  reg('Reason is for men who keep their word.', 'faceAngry'),
  narr('The barrels stop. The dock goes quiet. The river breathes.'),
  reg('The water is clean. Do not mistake that for mercy.'),
  reg('This district is mine. It always was.', 'faceContent'),
]

/** Reginald’s signature bark, surfaced by store.honk(). */
export const HONK_LINE: DialogueLine = reg('HONK.', 'faceWink')

/** Wrap a plain string as a Reginald bark (used for objective doneLine barks). */
export const reginaldBark = (text: string): DialogueLine => reg(text)

/** Earned kicker shown on the win card (one real eco stat). */
export const ENDING_STAT = 'Monitored freshwater species populations have fallen 84% since 1970.'
export const ENDING_SOURCE = 'WWF Living Planet Report 2020'
