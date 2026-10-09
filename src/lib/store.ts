import type { Evidence } from './types'

// The case being judged. Lives in memory so Ask -> Verdict -> back keeps the evidence.
export const caseFile = {
  question: '',
  context: '',
  evidence: [] as Evidence[],
}

export function newId(): string {
  return crypto.randomUUID()
}
