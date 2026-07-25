import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import { useGame } from './store'

// Dev-only test hook: lets playtesting/automation drive the state machine.
// Stripped from production builds (import.meta.env.DEV is false there).
if (import.meta.env.DEV) {
  ;(window as unknown as { __game: typeof useGame }).__game = useGame
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
