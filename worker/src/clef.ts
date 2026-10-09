// Thin typed wrapper over Cloudflare Clef decision models on Workers AI.
// Docs: https://developers.cloudflare.com/workers-ai/models/clef/

export type ClefModel = "clef" | "clef-flash";

export type ClefQuestion =
  | { type: "noul"; instructions: unknown; criteria?: { true?: unknown; false?: unknown } }
  | { type: "choice"; instructions: unknown; criteria: Record<string, unknown> }
  | { type: "score"; instructions: unknown; criteria: unknown[] };

export type ClefAnswer =
  | { type: "noul"; noul: number }
  | { type: "choice"; choice: string; probabilities: Record<string, number>; confidence: number }
  | { type: "score"; score: number; legend: Record<string, unknown>; probabilities: Record<string, number>; confidence: number };

export type ClefImage = { content_type: string; base64: string };

export type ClefRequest = {
  state: unknown;
  questions: Record<string, ClefQuestion>;
  images?: ClefImage[];
};

export type ClefResponse = {
  model: string;
  answers: Record<string, ClefAnswer>;
  usage: { input_tokens: number; output_tokens: number };
};

export const MAX_CLEF_IMAGES = 4;

export async function runClef(
  ai: Ai,
  model: ClefModel,
  req: ClefRequest,
  gatewayId?: string,
): Promise<ClefResponse> {
  // Clef isn't in the generated AiModelList types yet. Call through the binding object: a detached
  // `ai.run` loses its `this` and throws "Cannot set properties of undefined".
  const binding = ai as unknown as { run(name: string, input: unknown, opts?: { gateway?: { id: string } }): Promise<unknown> };
  const res = await binding.run(
    `@cf/cloudflare/${model}`,
    { model, ...req },
    gatewayId ? { gateway: { id: gatewayId } } : undefined,
  );
  return res as ClefResponse;
}

export function noul(res: ClefResponse, id: string): number {
  const a = res.answers[id];
  return a?.type === "noul" ? a.noul : 0.5;
}

export function choice(res: ClefResponse, id: string) {
  const a = res.answers[id];
  return a?.type === "choice" ? a : null;
}

export function score(res: ClefResponse, id: string) {
  const a = res.answers[id];
  return a?.type === "score" ? a : null;
}
