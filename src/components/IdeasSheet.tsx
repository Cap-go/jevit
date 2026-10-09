import { useState } from 'react'
import { EXAMPLE_GROUPS, type Example } from '../lib/examples'
import { tap } from '../lib/haptics'

// Bottom sheet of example cases. Picking one fills the question and the context.
export default function IdeasSheet({ onPick, onClose }: { onPick: (e: Example) => void; onClose: () => void }) {
  const [group, setGroup] = useState(EXAMPLE_GROUPS[0].id)
  const current = EXAMPLE_GROUPS.find((g) => g.id === group)!

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet ideas" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <h3>Need ideas? 💡</h3>
        <p className="muted center">Tap a case to use it. Great questions are yes/no, who’s right, or a rating.</p>
        <div className="chips scroll">
          {EXAMPLE_GROUPS.map((g) => (
            <button key={g.id} className={`chip ${g.id === group ? 'active' : ''}`} onClick={() => (tap(), setGroup(g.id))}>
              {g.emoji} {g.title}
            </button>
          ))}
        </div>
        <div className="ideas-list">
          {current.examples.map((e) => (
            <button
              key={e.q}
              className="idea"
              onClick={() => {
                void tap()
                onPick(e)
              }}
            >
              <b>{e.q}</b>
              <span>{e.context}</span>
            </button>
          ))}
        </div>
        <button className="btn ghost" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  )
}
