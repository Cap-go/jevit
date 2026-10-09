import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { setDirection } from '@capgo/capacitor-transitions/react'
import CasePage from '../../components/CasePage'
import { caseFile } from '../../lib/store'
import { useQuota } from '../../lib/useQuota'
import { CONTEXT_CHIPS } from '../../lib/examples'
import { resetsIn } from '../../lib/time'
import { tap, thud } from '../../lib/haptics'

// Step 3: optional background the screenshots don't show, then judge.
export default function Context() {
  const navigate = useNavigate()
  const { quota, outOfVerdicts } = useQuota('/case/context')
  const [context, setContextState] = useState(caseFile.context)

  useEffect(() => {
    if (caseFile.evidence.length === 0) navigate('/case/receipts', { replace: true })
    else if (!caseFile.question.trim()) navigate('/case/question', { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setContext = (c: string) => {
    caseFile.context = c
    setContextState(c)
  }

  const addChip = (chip: string) => {
    void tap()
    const c = context.trim()
    setContext(c ? `${c.replace(/[.\s]*$/, '')}. ${chip}.` : `${chip}.`)
  }

  const judge = () => {
    if (outOfVerdicts) return
    void thud()
    caseFile.context = context.trim()
    setDirection('forward')
    navigate('/verdict')
  }

  return (
    <CasePage
      step={3}
      back="/case/question"
      quota={quota}
      footer={
        <>
          {quota && (
            <p className={`quota-pill ${outOfVerdicts ? 'empty' : ''}`}>
              {outOfVerdicts
                ? `No more answers today · ${resetsIn(quota.resetAt)}`
                : `${quota.remaining} of ${quota.limit} verdicts left today`}
            </p>
          )}
          <button className="cta judge-btn" disabled={outOfVerdicts} onClick={judge}>
            {outOfVerdicts ? 'Come back tomorrow' : context.trim() ? 'JUDGE IT ⚖️' : 'Skip & JUDGE IT ⚖️'}
          </button>
        </>
      }
    >
      <div className="step-head">
        <h1>Anything else to know? 🕵️</h1>
        <p className="muted">Optional. What the screenshots don’t show.</p>
      </div>

      <div className="step-body">
        <p className="asked-chip">“{caseFile.question}”</p>
        <textarea
          className="context-box"
          rows={4}
          maxLength={500}
          placeholder="e.g. We’ve dated 3 months. He used to reply in minutes, now it takes hours."
          value={context}
          onChange={(e) => setContext(e.target.value)}
        />
        <div className="chips wrap compact">
          {CONTEXT_CHIPS.map((c) => (
            <button key={c} className="chip" onClick={() => addChip(c)}>
              + {c}
            </button>
          ))}
        </div>
      </div>
    </CasePage>
  )
}
