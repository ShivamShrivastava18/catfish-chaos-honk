import { useCallback } from 'react'
import { useGame } from './store'
import { DialogueBox } from './DialogueBox'

/**
 * Cutscene — plays the current level's intro/outro DialogueLine[] in sequence as
 * an HTML overlay, one line at a time through <DialogueBox/>.
 *
 * STATE SOURCE: reads straight from the store (gamePhase, dialogue, lineIndex,
 * currentLine) — no props required. It self-gates: renders only while gamePhase
 * is 'intro' or 'outro', so it is safe to mount unconditionally alongside Scene.
 *
 * ADVANCING: each advance calls store.advanceDialogue(), which walks the script
 * and performs the built-in phase hand-off at the end (intro -> playing, outro ->
 * levelclear). If an `onComplete` is supplied, it is invoked INSTEAD of the store
 * hand-off on the final line, letting Integration drive the phase transition
 * itself; omit it to rely on the store's automatic hand-off.
 *
 * The two-character intro (henchman -> citizen -> Reginald) needs no special
 * casing: each line already carries its own speaker/name/portrait, which
 * DialogueBox renders with per-speaker styling.
 */
export interface CutsceneProps {
  onComplete?: () => void
}

export function Cutscene({ onComplete }: CutsceneProps) {
  const gamePhase = useGame((s) => s.gamePhase)
  const dialogue = useGame((s) => s.dialogue)
  const lineIndex = useGame((s) => s.lineIndex)
  const currentLine = useGame((s) => s.currentLine)
  const advanceDialogue = useGame((s) => s.advanceDialogue)

  const isCutscene = gamePhase === 'intro' || gamePhase === 'outro'
  const line = currentLine ?? dialogue[lineIndex] ?? null
  const isLast = lineIndex >= dialogue.length - 1

  const handleAdvance = useCallback(() => {
    if (isLast && onComplete) {
      onComplete()
      return
    }
    advanceDialogue()
  }, [isLast, onComplete, advanceDialogue])

  if (!isCutscene || !line) return null

  return <DialogueBox line={line} onAdvance={handleAdvance} />
}
