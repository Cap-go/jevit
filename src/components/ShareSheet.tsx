import { useEffect, useState } from 'react'
import { renderVerdictCard, shareVerdict, verdictText } from '../lib/share'
import { buzz, tap } from '../lib/haptics'
import type { Verdict } from '../lib/types'

// Bottom sheet: preview of the story card, then native share / copy caption.
export default function ShareSheet({ verdict, question, onClose }: { verdict: Verdict; question: string; onClose: () => void }) {
  const [card, setCard] = useState<Blob | null>(null)
  const [url, setUrl] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let objectUrl = ''
    renderVerdictCard(verdict, question).then((b) => {
      objectUrl = URL.createObjectURL(b)
      setCard(b)
      setUrl(objectUrl)
    })
    return () => URL.revokeObjectURL(objectUrl)
  }, [verdict, question])

  const share = async () => {
    if (!card) return
    void tap()
    if (await shareVerdict(verdict, question, card)) void buzz(true)
  }

  const copy = async () => {
    void tap()
    await navigator.clipboard?.writeText(verdictText(verdict, question)).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <h3>Share the verdict</h3>
        <div className="sheet-preview">{url ? <img src={url} alt="Verdict card" /> : <div className="loading-tile" />}</div>
        <button className="cta" disabled={!card} onClick={share}>
          Share image 📤
        </button>
        <div className="row">
          <button className="btn ghost grow" onClick={copy}>
            {copied ? 'Copied ✓' : 'Copy caption'}
          </button>
          <button className="btn ghost grow" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
