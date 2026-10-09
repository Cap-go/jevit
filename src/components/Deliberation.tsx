import { useEffect, useState } from 'react'
import { Gavel } from './Logo'
import type { Evidence } from '../lib/types'

const LINES = [
  'Reading the chat 📸',
  'Reading between the lines 👀',
  'Checking reply times ⏱️',
  'Zooming into the emojis 🔍',
  "Counting the 'k.'s",
  'Cross-examining the vibes ✨',
  'Consulting the group chat 👯',
  'Scoring 13 red & green flags 🚩💚',
  'Reviewing the tone 🎭',
  'Almost ready to rule… 🤔',
]

export default function Deliberation({
  question,
  evidence,
  slamming,
}: {
  question: string
  evidence: Evidence[]
  slamming: boolean
}) {
  const [line, setLine] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setLine((l) => Math.min(l + 1, LINES.length - 1)), 1500)
    return () => clearInterval(t)
  }, [])

  const pile = evidence.slice(0, 3)

  return (
    <div className={`deliberation ${slamming ? 'slamming' : ''}`}>
      <h2 className="judging-title">
        Jevit is judging<span className="dots"><i>.</i><i>.</i><i>.</i></span>
      </h2>
      <p className="judging-q" translate="no">“{question}”</p>

      <div className="bench">
        <Gavel className="gavel" />
        <div className="pile">
          {pile.map((e, i) => (
            <div key={e.id} className={`pile-card pile-${i}`}>
              {e.kind === 'image' ? <img src={e.preview} alt="" /> : <p translate="no">{e.text}</p>}
            </div>
          ))}
          <div className="scanline" />
        </div>
      </div>

      <p className="status-line" key={line}>
        {LINES[line]}
      </p>
      <div className="progress">
        <div className="progress-fill" />
      </div>
    </div>
  )
}
