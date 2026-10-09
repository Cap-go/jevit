import { createRemoteJWKSet, jwtVerify, SignJWT, type JWTPayload } from "jose";

// Social login: the app signs in natively with Apple/Google, sends us the provider ID token,
// we verify its signature + audience against the provider's public keys, then issue our own
// short session JWT. Every judge/check call needs that session, so quotas are per real account.

export type Provider = "apple" | "google";
export type Session = { sub: string; provider: Provider | "demo"; name?: string };

const PROVIDERS = {
  google: {
    issuers: ["https://accounts.google.com", "accounts.google.com"],
    jwks: createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs")),
  },
  apple: {
    issuers: ["https://appleid.apple.com"],
    jwks: createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys")),
  },
} as const;

const MAX_ID_TOKEN_AGE_S = 600; // provider tokens must be fresh: limits replay of a leaked token
const SESSION_TTL = "30d";
const SESSION_ISSUER = "jevit";

export class AuthError extends Error {}

const csv = (s: string | undefined) =>
  (s ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

export async function verifyProviderToken(
  provider: Provider,
  idToken: string,
  audiences: string,
): Promise<{ sub: string; email?: string }> {
  const cfg = PROVIDERS[provider];
  const aud = csv(audiences);
  if (!cfg || aud.length === 0) throw new AuthError(`${provider} login is not configured`);

  let payload: JWTPayload;
  try {
    ({ payload } = await jwtVerify(idToken, cfg.jwks, {
      issuer: [...cfg.issuers],
      audience: aud,
      maxTokenAge: MAX_ID_TOKEN_AGE_S,
      clockTolerance: 30,
    }));
  } catch {
    throw new AuthError("Invalid sign-in, try again");
  }
  if (!payload.sub) throw new AuthError("Invalid sign-in, try again");
  if (provider === "google" && payload.email_verified === false) throw new AuthError("Verify your Google email first");
  return { sub: payload.sub, email: typeof payload.email === "string" ? payload.email : undefined };
}

const key = (secret: string) => new TextEncoder().encode(secret);

export async function issueSession(secret: string, s: Session): Promise<string> {
  if (!secret || secret.length < 32) throw new Error("SESSION_SECRET must be at least 32 chars");
  return new SignJWT({ provider: s.provider, name: s.name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(s.sub)
    .setIssuer(SESSION_ISSUER)
    .setIssuedAt()
    .setExpirationTime(SESSION_TTL)
    .sign(key(secret));
}

export async function readSession(secret: string, request: Request): Promise<Session | null> {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token || !secret) return null;
  try {
    const { payload } = await jwtVerify(token, key(secret), { issuer: SESSION_ISSUER, algorithms: ["HS256"] });
    if (!payload.sub) return null;
    return {
      sub: payload.sub,
      provider: payload.provider as Provider,
      name: typeof payload.name === "string" ? payload.name : undefined,
    };
  } catch {
    return null;
  }
}

// Store-review / tester account: email + password from worker secrets, compared in constant time.
export async function verifyDemoLogin(
  email: unknown,
  password: unknown,
  expectedEmail: string | undefined,
  expectedPassword: string | undefined,
): Promise<boolean> {
  if (!expectedEmail || !expectedPassword || typeof email !== "string" || typeof password !== "string") return false;
  const enc = new TextEncoder();
  const hash = async (v: string) => new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(v)));
  const [a, b] = await Promise.all([hash(`${email.trim().toLowerCase()}\n${password}`), hash(`${expectedEmail.toLowerCase()}\n${expectedPassword}`)]);
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}
