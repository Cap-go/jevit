import Page from '../components/Page'
import { LogoMark } from '../components/Logo'
import AppCredits from '../components/AppCredits'

const STEPS = [
  { e: '📸', t: 'Upload the chat', d: 'Screenshots, photos of a chat, or pasted messages. Up to 4 images per case.' },
  { e: '❓', t: 'Ask a question', d: 'Like “Is he into me?”, “Who’s right, me or her?” or “How toxic is this?”' },
  { e: '⚖️', t: 'Jevit reads the chat', d: 'The AI looks at your screenshots and checks about 20 things: your question, red flags, green flags, interest, toxicity, effort, and safety.' },
  { e: '✅', t: 'Get the answer', d: 'Jevit turns those probabilities into a stamp, a confidence score, a vibe report, and real advice.' },
]

export default function HowItWorks() {
  return (
    <Page title="How it works" back="/">
      <div className="how-hero">
        <LogoMark size={72} />
        <div>
          <h2>Jevit</h2>
          <p className="muted">The AI judge for your chats.</p>
        </div>
      </div>

      <div className="steps">
        {STEPS.map((s, i) => (
          <div key={s.t} className="card step-card pop-in" style={{ animationDelay: `${i * 80}ms` }}>
            <span className="step-emoji">{s.e}</span>
            <div>
              <h3>{s.t}</h3>
              <p>{s.d}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <h3>🤖 The AI</h3>
        <p>
          Jevit uses Clef, an AI model by Cloudflare. It doesn’t write essays: it scores each possible answer, so you get a
          fast and clear answer every time.
        </p>
      </div>

      <div className="card">
        <h3>🔒 Privacy</h3>
        <p>
          Your screenshots are used for one answer and aren’t stored by Jevit. Sign-in is only used to stop bots and count
          your daily verdicts — no emails or names are kept. Blur names if you want to be extra safe.
        </p>
      </div>

      <div className="card safety">
        <h3>💜 Real talk</h3>
        <p>
          Jevit is for fun. If a conversation shows threats, control, or abuse, Jevit stops joking. If you feel unsafe,
          talk to someone you trust or contact local emergency services or a domestic-violence hotline.
        </p>
      </div>
      <AppCredits />
    </Page>
  )
}
