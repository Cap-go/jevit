import { setAIConsent } from '../lib/consent'
import { tap, thud } from '../lib/haptics'

// Shown before the first case (and again after it's turned off in Account). No backdrop dismiss: pick one.
export default function AIConsentSheet({ onAgree, onDecline }: { onAgree: () => void; onDecline: () => void }) {
  return (
    <div className="sheet-backdrop">
      <div className="sheet consent" role="dialog" aria-modal="true" aria-labelledby="consent-title">
        <div className="sheet-handle" />
        <h3 id="consent-title">Before the AI reads your chat 🔒</h3>
        <p>To answer you, Jevit sends what you add to a case to <b>Cloudflare’s AI</b> (Cloudflare Workers AI):</p>
        <ul className="consent-list">
          <li>📸 Your screenshots and pasted messages</li>
          <li>❓ Your question and the extra details you add</li>
        </ul>
        <p>
          <b>Clef</b>, an AI model by Cloudflare, reads them and writes the answer. If your phone isn’t in English,{' '}
          <b>Gemma</b>, an AI model by Google run on Cloudflare, translates your question and the answer.
        </p>
        <p className="muted">
          It’s only used to answer you. Jevit doesn’t keep it and it isn’t used to train AI. Screenshots can show other
          people’s names and messages, so only add what you’re OK sharing.
        </p>
        <p className="muted small">
          You can change this anytime in Account.{' '}
          <a href="https://jevit.fun/privacy" target="_blank" rel="noreferrer">
            Privacy Policy
          </a>
        </p>
        <button
          className="cta"
          onClick={() => {
            void thud()
            setAIConsent(true)
            onAgree()
          }}
        >
          I agree, continue
        </button>
        <button className="btn ghost" onClick={() => (tap(), onDecline())}>
          Not now
        </button>
      </div>
    </div>
  )
}
