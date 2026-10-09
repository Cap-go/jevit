// Mirrors worker/src/judge.ts
export type Signal = { id: string; label: string; emoji: string; p: number }
export type Bar = { label: string; p: number }
export type Meter = { id: string; label: string; emoji: string; value: number; caption: string }

export type Verdict = {
  question_ok: boolean
  question_feedback: string
  suggested_questions: string[]
  question_kind: 'yes_no' | 'who_is_right' | 'rating' | 'invalid'
  verdict: 'YES' | 'NO' | 'MAYBE' | 'YOU' | 'THEM' | 'BOTH' | 'NOBODY' | 'SCORE' | 'NONE'
  verdict_label: string
  confidence: number
  vibe: 'green' | 'yellow' | 'red'
  headline: string
  reasoning: string
  breakdown: Bar[]
  meters: Meter[]
  green_flags: Signal[]
  red_flags: Signal[]
  advice: string
  safety_concern: boolean
  safety_note: string
  checks: number
}

export type RemoteCheck = {
  ok: boolean
  kind: 'yes_no' | 'who_is_right' | 'rating' | 'invalid'
  yesIsGood: boolean
  confidence: number
  hint: string
  suggestions: string[]
}

export type Evidence =
  | { id: string; kind: 'image'; mediaType: string; data: string; preview: string }
  | { id: string; kind: 'text'; text: string }
