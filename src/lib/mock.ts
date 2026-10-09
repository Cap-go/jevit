import { checkQuestion } from './questionCheck'
import type { RemoteCheck, Verdict } from './types'
import { demo } from './demo'

// UI-only fakes: run `VITE_MOCK=1 bun run dev` to work on animations without the worker.
export async function mockCheck(question: string): Promise<RemoteCheck> {
  await new Promise((r) => setTimeout(r, 150))
  const local = checkQuestion(question)
  return local.state === 'ok'
    ? { ok: true, kind: local.kind, yesIsGood: false, confidence: 0.9, hint: local.hint, suggestions: [] }
    : { ok: false, kind: 'invalid', yesIsGood: false, confidence: 0.8, hint: local.hint, suggestions: ['Is this a red flag?'] }
}

export async function mockVerdict(question: string): Promise<Verdict> {
  if (demo === 'judging') await new Promise(() => {}) // freeze on the deliberation screen
  if (demo === 'green' || demo === 'share') return green
  await new Promise((r) => setTimeout(r, demo ? 0 : 1500))
  if (!/\?$/.test(question.trim())) {
    return {
      ...base,
      question_ok: false,
      question_kind: 'invalid',
      verdict: 'NONE',
      verdict_label: 'OBJECTION!',
      question_feedback: 'Try a yes/no question, “who’s right?”, or “how toxic is this?”',
      suggested_questions: ['Is he into me?', 'Is he a red flag?', 'Am I wrong here?'],
    }
  }
  // Dev: localStorage.setItem('jevit.mockLabel', 'PROBABLY NOT') to test long stamps.
  const label = localStorage.getItem('jevit.mockLabel')
  return label ? { ...base, verdict_label: label } : base
}

const base: Verdict = {
  question_ok: true,
  question_feedback: '',
  suggested_questions: [],
  question_kind: 'yes_no',
  verdict: 'YES',
  verdict_label: 'YES… 🚩',
  confidence: 78,
  vibe: 'red',
  headline: 'The chat doesn’t lie, and they’re not looking good.',
  reasoning:
    'Jevit ran 20 checks on your chat. Strongest signals: low effort (91%) and mixed signals (74%). Their interest reads “barely”, toxicity “slightly off”.',
  breakdown: [
    { label: 'Yes', p: 0.81 },
    { label: 'No', p: 0.19 },
  ],
  meters: [
    { id: 'interest', label: 'Their interest', emoji: '💘', value: 25, caption: 'Barely' },
    { id: 'toxicity', label: 'Toxicity', emoji: '☢️', value: 30, caption: 'Slightly off' },
    { id: 'effort', label: 'Effort balance', emoji: '⚖️', value: 12, caption: 'You carry it' },
  ],
  green_flags: [{ id: 'banter', label: 'Good banter', emoji: '😂', p: 0.56 }],
  red_flags: [
    { id: 'low_effort', label: 'Low effort', emoji: '🥱', p: 0.91 },
    { id: 'mixed_signals', label: 'Mixed signals', emoji: '🌀', p: 0.74 },
    { id: 'shady', label: 'Shady behaviour', emoji: '🤥', p: 0.58 },
  ],
  advice: 'Match the energy you’re getting, and save the paragraphs for someone who replies with more than “k”.',
  safety_concern: false,
  safety_note: '',
  checks: 20,
}

const green: Verdict = {
  ...base,
  question_kind: 'who_is_right',
  verdict: 'YOU',
  verdict_label: 'YOU WIN 🏆',
  confidence: 86,
  vibe: 'green',
  headline: 'The chat backs you up. You win.',
  reasoning:
    'Jevit ran 20 checks on your chat. You asked a fair question and got deflection back. Strongest signals: blame-shifting (88%) and dodging (81%).',
  breakdown: [
    { label: 'You', p: 0.83 },
    { label: 'Them', p: 0.07 },
    { label: 'Both right', p: 0.06 },
    { label: 'Both wrong', p: 0.04 },
  ],
  red_flags: [
    { id: 'blame_shift', label: 'Blame-shifting', emoji: '🔥', p: 0.88 },
    { id: 'shady', label: 'Shady behaviour', emoji: '🤥', p: 0.81 },
  ],
  green_flags: [],
  advice: 'If every fight ends with you apologising, write down what actually happened. Your memory is valid.',
}
