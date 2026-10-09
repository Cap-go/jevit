import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { setDirection } from '@capgo/capacitor-transitions/react'
import CasePage from '../../components/CasePage'
import IdeasSheet from '../../components/IdeasSheet'
import { checkQuestion, STARTER_QUESTIONS } from '../../lib/questionCheck'
import { AuthRequired, checkQuestionRemote } from '../../lib/api'
import { caseFile } from '../../lib/store'
import { useQuota } from '../../lib/useQuota'
import { tap } from '../../lib/haptics'
import type { RemoteCheck } from '../../lib/types'

// Step 2: the question, checked on device instantly and by clef-flash after a short pause.
export default function Question() {
  const navigate = useNavigate()
  const { quota, toLogin } = useQuota('/case/question')
  const [question, setQuestion] = useState(caseFile.question)
  const [ideas, setIdeas] = useState(false)
  const [remote, setRemote] = useState<{ q: string; check: RemoteCheck } | null>(null)

  useEffect(() => {
    if (caseFile.evidence.length === 0) navigate('/case/receipts', { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const local = useMemo(() => checkQuestion(question), [question])

  useEffect(() => {
    const q = question.trim()
    if (q.length < 6) return
    const ctrl = new AbortController()
    const t = setTimeout(() => {
      checkQuestionRemote(q, ctrl.signal)
        .then((check) => setRemote({ q, check }))
        .catch((err) => err instanceof AuthRequired && toLogin())
    }, 500)
    return () => {
      clearTimeout(t)
      ctrl.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question])

  const confirmed = remote && remote.q === question.trim() ? remote.check : null
  const check =
    local.state === 'empty' || !confirmed
      ? local
      : confirmed.ok
        ? { state: 'ok' as const, kind: confirmed.kind, hint: confirmed.hint }
        : { state: 'weak' as const, hint: confirmed.hint, suggestion: confirmed.suggestions[0] ?? 'Is this a red flag?' }

  const setQ = (q: string) => {
    caseFile.question = q
    setQuestion(q)
  }

  const next = () => {
    if (check.state === 'empty') return
    void tap()
    caseFile.question = question.trim()
    setDirection('forward')
    navigate('/case/context')
  }

  return (
    <CasePage
      step={2}
      back="/case/receipts"
      quota={quota}
      footer={
        <button className="cta" disabled={check.state === 'empty'} onClick={next}>
          {check.state === 'empty' ? 'Ask your question' : 'Next'}
        </button>
      }
    >
      <div className="step-head">
        <h1>What’s the question? ❓</h1>
        <p className="muted">Yes/no, who’s right, or a rating.</p>
      </div>

      <div className="step-body">
        <div className={`question-box state-${check.state}`}>
          <textarea
            value={question}
            onChange={(e) => setQ(e.target.value.replace(/\n/g, ''))}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), next())}
            placeholder="Is he cheating?"
            maxLength={300}
            rows={2}
            enterKeyHint="next"
          />
        </div>
        <div className={`check-pill state-${check.state}`} key={check.hint}>
          <span>{check.state === 'ok' ? '✓' : check.state === 'weak' ? '!' : '?'}</span>
          {check.hint}
          {check.state === 'weak' && (
            <button className="fix-btn" onClick={() => setQ(check.suggestion)}>
              Try “{check.suggestion}”
            </button>
          )}
        </div>

        <div className="chips wrap compact">
          {STARTER_QUESTIONS.slice(0, 6).map((q) => (
            <button key={q} className={`chip ${q === question ? 'active' : ''}`} onClick={() => (tap(), setQ(q))}>
              {q}
            </button>
          ))}
        </div>
        <button className="ideas-link" onClick={() => (tap(), setIdeas(true))}>
          Need ideas? See example cases 💡
        </button>
      </div>

      {ideas && (
        <IdeasSheet
          onClose={() => setIdeas(false)}
          onPick={(e) => {
            setQ(e.q)
            if (!caseFile.context.trim()) caseFile.context = e.context
            setIdeas(false)
          }}
        />
      )}
    </CasePage>
  )
}
