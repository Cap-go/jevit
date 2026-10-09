import { choice, noul, runClef, type ClefQuestion } from "./clef";

export type QuestionKind = "yes_no" | "who_is_right" | "rating";

export type QuestionCheck = {
  ok: boolean;
  kind: QuestionKind | "invalid";
  // For yes/no and ratings: is a YES / a high score good news for the asker? Drives the vibe color.
  yesIsGood: boolean;
  confidence: number;
  hint: string;
  suggestions: string[];
};

// Asked to clef-flash with the user's question as the state.
const CHECK_QUESTIONS: Record<string, ClefQuestion> = {
  judgeable: {
    type: "noul",
    instructions:
      "Is this a question someone wants an outside judge to rule on, about a person, a relationship, a date, or a conversation (for example 'Is he cheating?', 'Am I wrong?', 'Is she into me?')?",
    criteria: {
      true: "A real question about people, feelings, behaviour, or a conversation",
      false: "Not a question, gibberish, or about something unrelated (math, weather, trivia, lottery, coding)",
    },
  },
  kind: {
    type: "choice",
    instructions: "What kind of answer does this question need?",
    criteria: {
      yes_no: "A yes or no answer (Is he…? Does she…? Am I…? Will they…? Should I…?)",
      who_is_right: "Picking a side: who is right, who is wrong, who is to blame, me or them",
      rating: "A level on a scale: how much, how bad, how toxic, how into me, rate this",
      open: "An open explanation: why, what, when, where, how-to, or advice that is not yes/no",
    },
  },
  yes_is_good: {
    type: "noul",
    instructions:
      "If the honest answer to this question were YES (or a high rating), would that be good news for the person asking?",
    criteria: {
      true: "Yes is good news (e.g. 'Is she into me?', 'Is he good for me?', 'Am I right?')",
      false: "Yes is bad news (e.g. 'Is he cheating?', 'Is this toxic?', 'Am I wrong?', 'Is this a red flag?')",
    },
  },
};

const HINTS: Record<QuestionKind, string> = {
  yes_no: "Good question: Jevit will answer yes or no",
  who_is_right: "Good question: Jevit will pick a side",
  rating: "Good question: Jevit will give it a score",
};

export function suggestionsFor(question: string): string[] {
  const q = question.toLowerCase();
  if (/\b(she|her)\b/.test(q)) return ["Is she into me?", "Is she a red flag?", "Am I wrong here?"];
  if (/\b(he|him|his)\b/.test(q)) return ["Is he into me?", "Is he a red flag?", "Am I wrong here?"];
  if (/\b(they|them)\b/.test(q)) return ["Are they into me?", "Who’s right, me or them?", "How toxic is this?"];
  return ["Is this a red flag?", "Am I wrong here?", "Is he into me?"];
}

export async function checkQuestion(ai: Ai, question: string, gatewayId?: string): Promise<QuestionCheck> {
  const res = await runClef(ai, "clef-flash", { state: question, questions: CHECK_QUESTIONS }, gatewayId);
  const judgeable = noul(res, "judgeable");
  const kind = choice(res, "kind");
  const yesIsGood = noul(res, "yes_is_good") >= 0.5;
  const picked = kind?.choice ?? "open";

  if (judgeable < 0.4) {
    return {
      ok: false,
      kind: "invalid",
      yesIsGood,
      confidence: 1 - judgeable,
      hint: "Ask about the people or the chat",
      suggestions: suggestionsFor(question),
    };
  }
  if (picked === "open") {
    return {
      ok: false,
      kind: "invalid",
      yesIsGood,
      confidence: kind?.confidence ?? 0.5,
      hint: "Try a yes/no question, “who’s right?”, or “how toxic is this?”",
      suggestions: suggestionsFor(question),
    };
  }
  const k = picked as QuestionKind;
  return { ok: true, kind: k, yesIsGood, confidence: kind?.confidence ?? judgeable, hint: HINTS[k], suggestions: [] };
}
