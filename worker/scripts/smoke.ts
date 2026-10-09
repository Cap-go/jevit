// Runs the real question check + judge logic against Clef over the REST API.
// CLOUDFLARE_ACCOUNT_ID=... CLOUDFLARE_API_TOKEN=$(bunx wrangler auth token) bun scripts/smoke.ts [image.png]
import { checkQuestion, type QuestionKind } from "../src/questionCheck";
import { judge } from "../src/judge";

const account = process.env.CLOUDFLARE_ACCOUNT_ID!;
const token = process.env.CLOUDFLARE_API_TOKEN!;

const ai = {
  async run(model: string, input: unknown) {
    const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/${model}`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify(input),
    });
    const body = (await res.json()) as { result?: unknown; errors?: unknown };
    if (!res.ok) throw new Error(JSON.stringify(body.errors));
    return body.result;
  },
} as unknown as Ai;

const imagePath = process.argv[2];
const images = imagePath
  ? [{ content_type: "image/png", base64: Buffer.from(await Bun.file(imagePath).arrayBuffer()).toString("base64") }]
  : [];
const chat = imagePath
  ? []
  : [
      "Me: hey I miss you, can we talk tonight? I feel like you've been distant\nHim: busy rn\nMe: ok when are you free?\nHim: k.\nMe: you were online at 2am though\nHim: why are you checking that?? ur being crazy",
    ];

for (const q of ["Is he cheating?", "Is he into me?", "Who's right, me or him?", "How toxic is this?", "what is 2+2", "why does he do this"]) {
  const t0 = performance.now();
  const check = await checkQuestion(ai, q);
  const t1 = performance.now();
  console.log(`\n=== ${q}\ncheck (${Math.round(t1 - t0)}ms):`, JSON.stringify(check));
  if (!check.ok) continue;
  const v = await judge(ai, check as typeof check & { kind: QuestionKind }, q, "We've dated 3 months.", chat, images);
  console.log(`judge (${Math.round(performance.now() - t1)}ms):`, v.verdict_label, v.vibe, `${v.confidence}%`);
  console.log("  breakdown:", v.breakdown.map((b) => `${b.label} ${Math.round(b.p * 100)}%`).join(", "));
  console.log("  meters:", v.meters.map((m) => `${m.label}=${m.caption}(${m.value})`).join(", "));
  console.log("  red:", v.red_flags.map((f) => `${f.label} ${Math.round(f.p * 100)}%`).join(", "));
  console.log("  green:", v.green_flags.map((f) => `${f.label} ${Math.round(f.p * 100)}%`).join(", "));
  console.log("  safety:", v.safety_concern, "|", v.reasoning);
}
