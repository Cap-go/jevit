import { choice, noul, runClef, score, type ClefImage, type ClefQuestion, type ClefResponse } from "./clef";
import type { QuestionCheck, QuestionKind } from "./questionCheck";

// ---------- verdict contract (mirrored in app src/lib/types.ts) ----------

export type Signal = { id: string; label: string; emoji: string; p: number };
export type Bar = { label: string; p: number };
export type Meter = { id: string; label: string; emoji: string; value: number; caption: string };

export type Verdict = {
  question_ok: boolean;
  question_feedback: string;
  suggested_questions: string[];
  question_kind: QuestionKind | "invalid";
  verdict: "YES" | "NO" | "MAYBE" | "YOU" | "THEM" | "BOTH" | "NOBODY" | "SCORE" | "NONE";
  verdict_label: string;
  confidence: number;
  vibe: "green" | "yellow" | "red";
  headline: string;
  reasoning: string;
  breakdown: Bar[];
  meters: Meter[];
  green_flags: Signal[];
  red_flags: Signal[];
  advice: string;
  safety_concern: boolean;
  safety_note: string;
  checks: number;
};

// ---------- the case file Clef rules on ----------

const ASKER =
  "The person asking is the uploader: their messages are usually on the right, in blue/colored bubbles, or labelled 'Me'. 'The other person' is whoever they are talking to or about.";

const RED_FLAGS: Record<string, { label: string; emoji: string; q: string }> = {
  low_effort: { label: "Low effort", emoji: "🥱", q: "Does the other person put in clearly less effort (dry, short, slow, one-word replies)?" },
  mixed_signals: { label: "Mixed signals", emoji: "🌀", q: "Is the other person sending mixed or inconsistent signals?" },
  controlling: { label: "Controlling / jealous", emoji: "⛓️", q: "Is the other person controlling, possessive, or jealous?" },
  disrespect: { label: "Disrespect", emoji: "🙄", q: "Is the other person dismissive, rude, or disrespectful?" },
  shady: { label: "Shady behaviour", emoji: "🤥", q: "Does the other person seem dishonest, secretive, or evasive?" },
  blame_shift: { label: "Blame-shifting", emoji: "🔥", q: "Does the other person deny, twist, or shift blame (gaslighting)?" },
  love_bombing: { label: "Love bombing", emoji: "💣", q: "Is the other person over-the-top intense way too fast (love bombing)?" },
};

const GREEN_FLAGS: Record<string, { label: string; emoji: string; q: string }> = {
  affection: { label: "Affection", emoji: "🥰", q: "Does the other person show warmth or affection toward the asker?" },
  effort: { label: "Real effort", emoji: "💪", q: "Does the other person make real effort (initiates, asks questions, makes plans)?" },
  respect: { label: "Respect", emoji: "🤝", q: "Does the other person treat the asker with respect?" },
  consistency: { label: "Consistent", emoji: "📅", q: "Is the other person consistent and reliable?" },
  banter: { label: "Good banter", emoji: "😂", q: "Is there playful humor or good chemistry between them?" },
  accountability: { label: "Owns mistakes", emoji: "🙏", q: "Does the other person apologise or take responsibility when needed?" },
};

const INTEREST_LEVELS = ["Not interested", "Barely", "Somewhat", "Very", "Obsessed"];
const TOXICITY_LEVELS = ["Healthy", "Slightly off", "Some toxicity", "Toxic", "Very toxic"];
const RATING_LEVELS = ["Not at all", "A little", "Somewhat", "A lot", "Extremely"];

function mainQuestion(kind: QuestionKind, question: string): ClefQuestion {
  if (kind === "who_is_right") {
    return {
      type: "choice",
      instructions: `${question} — ${ASKER}`,
      criteria: {
        you: "The person asking is right / not at fault",
        them: "The other person is right / the asker is at fault",
        both: "Both have a fair point",
        nobody: "Both are in the wrong",
      },
    };
  }
  if (kind === "rating") return { type: "score", instructions: question, criteria: RATING_LEVELS };
  return {
    type: "noul",
    instructions: `${question} (${ASKER})`,
    criteria: { true: "Yes, the evidence points to yes", false: "No, the evidence points to no" },
  };
}

function buildQuestions(kind: QuestionKind, question: string): Record<string, ClefQuestion> {
  const qs: Record<string, ClefQuestion> = {
    main: mainQuestion(kind, question),
    relevant: {
      type: "noul",
      instructions: "Is this content a conversation, messages, social media, or photos involving people or a relationship?",
    },
    enough_evidence: {
      type: "noul",
      instructions: `Is there enough evidence in this content to answer: "${question}"?`,
    },
    safety: {
      type: "noul",
      instructions:
        "Does this content show abuse, threats, coercion, stalking, sextortion, self-harm, or a minor in danger?",
    },
    interest: {
      type: "score",
      instructions: `How interested in the asker does the other person seem? ${ASKER}`,
      criteria: INTEREST_LEVELS,
    },
    toxicity: { type: "score", instructions: "How toxic is this interaction?", criteria: TOXICITY_LEVELS },
    effort_balance: {
      type: "choice",
      instructions: `Who is putting more effort into this conversation? ${ASKER}`,
      criteria: { asker: "The person asking", balanced: "About equal", other: "The other person" },
    },
  };
  for (const [id, f] of Object.entries(RED_FLAGS)) qs[`red.${id}`] = { type: "noul", instructions: f.q };
  for (const [id, f] of Object.entries(GREEN_FLAGS)) qs[`green.${id}`] = { type: "noul", instructions: f.q };
  return qs;
}

// ---------- turning probabilities into a verdict ----------

const pick = <T>(xs: T[]): T => xs[Math.floor(Math.random() * xs.length)];
const pct = (p: number) => Math.round(p * 100);

const LABELS = {
  YES: { green: ["YES 💅", "BIG YES", "100% YES"], red: ["YES… 🚩", "SADLY YES", "YEP. RUN."], yellow: ["PROBABLY YES"] },
  NO: { green: ["NOPE 😮‍💨", "NO. RELAX."], red: ["NO 💔", "NOT IT", "NOPE"], yellow: ["PROBABLY NOT"] },
  MAYBE: ["MAYBE 🤔", "JURY’S OUT", "50/50"],
  YOU: ["YOU WIN 🏆", "YOU’RE RIGHT", "CASE CLOSED"],
  THEM: ["TAKE THE L", "THEY WIN", "YOU’RE WRONG"],
  BOTH: ["BOTH RIGHT", "FAIR POINTS"],
  NOBODY: ["BOTH WRONG", "NOBODY WINS"],
};

const HEADLINES: Record<string, string[]> = {
  green: [
    "The chat is giving main character energy.",
    "Honestly? This is cute.",
    "Green flags only. Screenshot this.",
  ],
  red: [
    "The chat doesn’t lie, and they’re not looking good.",
    "Yeah… this is not it.",
    "Red flag parade, and you’ve got front row seats.",
  ],
  yellow: [
    "Hard to tell. This one could go either way.",
    "Not enough tea to spill. Send more screenshots.",
    "Mixed signals. Send more screenshots.",
  ],
};

const ADVICE: Record<string, string> = {
  low_effort: "Match the energy you’re getting, and save the paragraphs for someone who replies with more than “k”.",
  mixed_signals: "Stop decoding and ask directly. A clear answer, or no answer, tells you everything.",
  controlling: "Caring doesn’t look like control. Keep your friends close and your independence closer.",
  disrespect: "You deserve basic respect, not crumbs. Say what crossed the line, then watch what they do.",
  shady: "Trust your gut. Ask the straight question and notice if the answer changes.",
  blame_shift: "If every fight ends with you apologising, write down what actually happened. Your memory is valid.",
  love_bombing: "Slow it down. Real interest still shows up at a normal speed.",
  default_green: "Keep doing what you’re doing, and tell them you like this energy.",
  default_yellow: "Add more screenshots or ask a sharper question, to get a clearer answer.",
};

function noulVerdict(p: number, enough: number, yesIsGood: boolean) {
  const sure = Math.max(p, 1 - p);
  const verdict = enough < 0.3 || sure < 0.6 ? "MAYBE" : p >= 0.5 ? "YES" : "NO";
  const good = verdict === "YES" ? yesIsGood : !yesIsGood;
  const vibe: Verdict["vibe"] = verdict === "MAYBE" ? "yellow" : good ? "green" : "red";
  const label =
    verdict === "MAYBE" ? pick(LABELS.MAYBE) : pick(LABELS[verdict][vibe === "green" ? "green" : "red"]);
  return {
    verdict: verdict as Verdict["verdict"],
    label,
    vibe,
    certainty: sure,
    breakdown: [
      { label: "Yes", p },
      { label: "No", p: 1 - p },
    ],
  };
}

export async function judge(
  ai: Ai,
  check: QuestionCheck & { kind: QuestionKind },
  question: string,
  context: string | undefined,
  texts: string[],
  images: ClefImage[],
  gatewayId?: string,
): Promise<Verdict> {
  const state = {
    question,
    // What the asker says about the situation; background, not proof.
    context_from_asker: context,
    pasted_messages: texts.length ? texts : undefined,
    note: images.length ? `${images.length} screenshot(s)/photo(s) of the conversation are attached. ${ASKER}` : ASKER,
  };
  const questions = buildQuestions(check.kind, question);
  const res: ClefResponse = await runClef(ai, "clef", { state, questions, images }, gatewayId);

  const enough = noul(res, "enough_evidence");
  const relevant = noul(res, "relevant");
  const safety = noul(res, "safety");

  if (relevant < 0.25) {
    return invalid(
      check.kind,
      "These screenshots don’t look like a conversation or people. Jevit only judges chats and relationships.",
      ["Is this a red flag?", "Am I wrong here?", "Is he into me?"],
    );
  }

  // Main ruling
  let main: { verdict: Verdict["verdict"]; label: string; vibe: Verdict["vibe"]; certainty: number; breakdown: Bar[] };
  if (check.kind === "who_is_right") {
    const c = choice(res, "main");
    const probs = c?.probabilities ?? { you: 0.25, them: 0.25, both: 0.25, nobody: 0.25 };
    const top = (c?.choice ?? "both") as "you" | "them" | "both" | "nobody";
    const topP = probs[top] ?? 0;
    const verdict = (enough < 0.3 || topP < 0.4 ? "MAYBE" : top.toUpperCase()) as Verdict["verdict"];
    const vibe: Verdict["vibe"] = verdict === "YOU" ? "green" : verdict === "THEM" ? "red" : "yellow";
    main = {
      verdict,
      label: pick(LABELS[verdict as "YOU" | "THEM" | "BOTH" | "NOBODY" | "MAYBE"]),
      vibe,
      certainty: Math.max(...Object.values(probs)),
      breakdown: [
        { label: "You", p: probs.you ?? 0 },
        { label: "Them", p: probs.them ?? 0 },
        { label: "Both right", p: probs.both ?? 0 },
        { label: "Both wrong", p: probs.nobody ?? 0 },
      ],
    };
  } else if (check.kind === "rating") {
    const s = score(res, "main");
    const level = s?.score ?? 2;
    const outOf10 = Math.round((level / (RATING_LEVELS.length - 1)) * 10);
    const high = outOf10 >= 6;
    const vibe: Verdict["vibe"] = outOf10 >= 4 && outOf10 <= 6 ? "yellow" : high === check.yesIsGood ? "green" : "red";
    main = {
      verdict: "SCORE",
      label: `${outOf10}/10`,
      vibe,
      // Mass on the two levels around the score: tight distribution = confident rating.
      certainty: s ? (s.probabilities[String(Math.floor(level))] ?? 0) + (s.probabilities[String(Math.ceil(level))] ?? 0) * (Math.ceil(level) === Math.floor(level) ? 0 : 1) : 0.5,
      breakdown: RATING_LEVELS.map((l, i) => ({ label: l, p: s?.probabilities[String(i)] ?? 0 })),
    };
  } else {
    main = noulVerdict(noul(res, "main"), enough, check.yesIsGood);
  }

  const flags = (group: "red" | "green", defs: typeof RED_FLAGS) =>
    Object.entries(defs)
      .map(([id, f]) => ({ id, label: f.label, emoji: f.emoji, p: noul(res, `${group}.${id}`) }))
      .filter((s) => s.p >= 0.5)
      .sort((a, b) => b.p - a.p)
      .slice(0, 4);
  const red = flags("red", RED_FLAGS);
  const green = flags("green", GREEN_FLAGS);

  const interest = score(res, "interest");
  const toxicity = score(res, "toxicity");
  const effort = choice(res, "effort_balance");
  const level = (s: ReturnType<typeof score>, levels: string[]) => levels[Math.round(s?.score ?? 0)] ?? levels[0];
  const meters: Meter[] = [
    {
      id: "interest",
      label: "Their interest",
      emoji: "💘",
      value: Math.round(((interest?.score ?? 0) / (INTEREST_LEVELS.length - 1)) * 100),
      caption: level(interest, INTEREST_LEVELS),
    },
    {
      id: "toxicity",
      label: "Toxicity",
      emoji: "☢️",
      value: Math.round(((toxicity?.score ?? 0) / (TOXICITY_LEVELS.length - 1)) * 100),
      caption: level(toxicity, TOXICITY_LEVELS),
    },
    {
      id: "effort",
      label: "Effort balance",
      emoji: "⚖️",
      // 0 = asker does all the work, 50 = balanced, 100 = other person does
      value: Math.round(
        ((effort?.probabilities.other ?? 0) + (effort?.probabilities.balanced ?? 0) * 0.5) * 100,
      ),
      caption: effort?.choice === "asker" ? "You carry it" : effort?.choice === "other" ? "They carry it" : "Balanced",
    },
  ];

  // Confidence: how decisive the main answer is, discounted when evidence is thin.
  const confidence = Math.round(100 * (0.5 + (main.certainty - 0.5) * (0.4 + 0.6 * enough)));

  const strongest = [...red, ...green].sort((a, b) => b.p - a.p).slice(0, 2);
  const reasoning = [
    `Jevit ran ${Object.keys(questions).length} checks on your chat.`,
    strongest.length
      ? `Strongest signals: ${strongest.map((s) => `${s.label.toLowerCase()} (${pct(s.p)}%)`).join(" and ")}.`
      : "No strong flags either way.",
    `Their interest reads “${meters[0].caption.toLowerCase()}”, toxicity “${meters[1].caption.toLowerCase()}”.`,
    enough < 0.4 ? "Heads up: the evidence is thin, so take this one lightly." : "",
  ]
    .filter(Boolean)
    .join(" ");

  const isSafety = safety >= 0.6;
  const advice = red[0]
    ? ADVICE[red[0].id]
    : main.vibe === "yellow"
      ? ADVICE.default_yellow
      : ADVICE.default_green;

  return {
    question_ok: true,
    question_feedback: "",
    suggested_questions: [],
    question_kind: check.kind,
    verdict: main.verdict,
    verdict_label: main.label,
    confidence,
    vibe: isSafety ? "red" : main.vibe,
    headline: isSafety ? "No jokes on this one." : pick(HEADLINES[main.vibe]),
    reasoning,
    breakdown: main.breakdown,
    meters,
    green_flags: green,
    red_flags: red,
    advice,
    safety_concern: isSafety,
    safety_note: isSafety
      ? "Some of what’s in these screenshots looks like it could be harmful or unsafe. You deserve to feel safe. Talk to someone you trust, and if you’re in danger contact local emergency services or a domestic-violence or crisis hotline."
      : "",
    checks: Object.keys(questions).length,
  };
}

export function invalid(kind: Verdict["question_kind"], feedback: string, suggestions: string[]): Verdict {
  return {
    question_ok: false,
    question_feedback: feedback,
    suggested_questions: suggestions,
    question_kind: kind === "invalid" ? "invalid" : kind,
    verdict: "NONE",
    verdict_label: "OBJECTION!",
    confidence: 0,
    vibe: "yellow",
    headline: "",
    reasoning: "",
    breakdown: [],
    meters: [],
    green_flags: [],
    red_flags: [],
    advice: "",
    safety_concern: false,
    safety_note: "",
    checks: 0,
  };
}
