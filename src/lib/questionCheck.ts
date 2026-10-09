// Instant on-device check so users see if JEV-1 can rule on their question before sending.
// The worker re-checks with the model and can still throw it out of court.

export type QuestionCheck =
  | { state: 'empty'; hint: string }
  | { state: 'ok'; kind: 'yes_no' | 'who_is_right' | 'rating'; hint: string }
  | { state: 'weak'; hint: string; suggestion: string }

const YES_NO_START =
  /^(is|are|am|was|were|do|does|did|will|would|should|shall|can|could|has|have|had|may|might|must|est-ce|est|sont|suis|va|vont|dois|peut|es|está|están|soy|debo|puede|ist|sind|bin|hat|sollte)\b/i
const WHO_RIGHT = /\b(who|which|qui|quién|wer)\b.*\b(right|wrong|fault|winning|won|toxic|raison|tort|razón|culpa|recht|schuld)\b/i
const ME_OR_THEM = /\b(me or (him|her|them)|am i (right|wrong|the problem|overreacting|tripping|crazy))\b/i
const RATING = /\b(how (toxic|bad|red|green|into|much|serious|likely)|rate|score|on a scale|\/10)\b/i
const OPEN_START = /^(why|what|when|where|how|pourquoi|quoi|quand|où|comment|por qué|qué|cuándo|dónde|cómo|warum|was|wann|wo|wie)\b/i

export function checkQuestion(raw: string): QuestionCheck {
  const q = raw.trim()
  if (q.length === 0) return { state: 'empty', hint: 'Ask a question about the chat' }
  if (q.length < 6) return { state: 'weak', hint: 'A bit short — what do you want judged?', suggestion: 'Is this a red flag?' }

  if (WHO_RIGHT.test(q) || ME_OR_THEM.test(q)) return { state: 'ok', kind: 'who_is_right', hint: "Good question: Jevit will pick a side" }
  if (RATING.test(q)) return { state: 'ok', kind: 'rating', hint: 'Good question: Jevit will give it a score' }
  if (YES_NO_START.test(q)) return { state: 'ok', kind: 'yes_no', hint: 'Good question: Jevit will answer yes or no' }

  if (OPEN_START.test(q)) {
    return {
      state: 'weak',
      hint: 'Tip: yes/no or “who’s right?” questions work best',
      suggestion: 'Is this a red flag?',
    }
  }
  if (q.endsWith('?')) return { state: 'ok', kind: 'yes_no', hint: 'Looks good' }
  return { state: 'weak', hint: "That's not a question yet — end it with a ?", suggestion: `${q.replace(/[.!]+$/, '')}?` }
}

export const STARTER_QUESTIONS = [
  'Is he cheating?',
  'Am I wrong here?',
  'Is she into me?',
  'Is this a red flag?',
  'Who’s right, me or them?',
  'Is he good for me?',
  'How toxic is this?',
  'Is he the love of my life?',
  'Will they text back?',
]
