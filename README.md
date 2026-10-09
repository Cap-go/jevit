# jevit

Get judged. Upload screenshots, photos, or pasted chats, ask a question ("Is he cheating?", "Am I wrong here?", "Is she into me?"), and Jevit's AI judge gives you a clear answer: a stamp, how sure it is, red and green flags, and advice, built from Clef decision probabilities. The app speaks the phone's language (see [Languages](#languages)).

```
app (Capacitor + React) ──▶ jevit-judge worker ──▶ Workers AI: Clef decision models
                              /v1/check  → @cf/cloudflare/clef-flash  (live, while typing)
                              /v1/judge  → @cf/cloudflare/clef        (vision, ~20 decisions)
                    └──────▶ jevit-i18n worker  ──▶ Workers AI: Gemma 4 (translations, cached in KV)
```

Jevit runs on [Clef](https://blog.cloudflare.com/clef-decision-models/), Cloudflare's open-source decision model. A decision model doesn't write text. It returns a probability for every allowed answer of typed questions (`noul` yes/no, `choice`, `score`). Jevit turns those probabilities into the verdict.

## How it works

1. **Chat:** up to 4 images (Clef's limit, downscaled on device to 1568px JPEG) and/or pasted text.
2. **Question check:** an instant on-device check, then `clef-flash` confirms it while you type (`worker/src/questionCheck.ts`). It works out:
   - is it judgeable (about people, feelings, or a conversation)?
   - what kind: yes/no becomes a `noul` question, who's right becomes a `choice` (you / them / both / nobody), a rating becomes a `score`, and open questions are rejected
   - is a YES good news for the asker? This sets the color: "Is she into me?" YES is green, "Is he cheating?" YES is red.

   Bad questions get **OBJECTION!** plus tappable rewrites.
3. **Verdict:** one `clef` call with the screenshots answers the main question plus 7 red flags, 6 green flags, interest, toxicity, effort balance, enough-evidence, relevance, and safety (`worker/src/judge.ts`). Thin evidence pushes the verdict to MAYBE and lowers confidence.
4. **Accounts and abuse protection:** every Clef call needs a signed-in account (see below).
5. **Safety:** if the safety probability is at least 0.6, the app drops the jokes and confetti and shows a support card.

## App flow

1. **Onboarding:** 4 swipeable slides on first launch, then sign-in.
2. **Home:** start a case or tap a sample question; invite friends.
3. **New chat:** screenshots + live question check + daily quota.
4. **Verdict:** deliberation animation, gavel slam, stamp, vibe report, flags, advice.
5. **Share:** a 1080×1920 verdict card drawn on device, shared through the native share sheet (or copy the caption). Links go to `/get`, which sends phones to the right store.

Store listing kit (screenshots, graphics, metadata, upload scripts): see [`store/README.md`](store/README.md).

## Stack

- Capacitor 8, React 19, Vite
- [`@capgo/capacitor-transitions`](https://github.com/Cap-go/capacitor-transitions) for native-feel page navigation and swipe-back
- [`@capgo/capacitor-updater`](https://capgo.app) for live updates (`notifyAppReady` is called in `src/main.tsx`)
- [`@capgo/capacitor-native-navigation`](https://github.com/Cap-go/capacitor-native-navigation) for the native top bar, Android back button, and safe-area insets (`src/lib/chrome.ts`; older native builds keep the web header)
- `@capgo/capacitor-file-picker` (native multi-select photo picker), haptics, share, status-bar, splash-screen, app
- Cloudflare Workers, Workers AI (Clef, Gemma 4), KV, optional AI Gateway, Workers rate limiting
- `@capacitor/device` for the phone language (iOS WebViews only report the languages an app bundle declares)

## Develop

```bash
bun install
cp .env.example .env          # VITE_JUDGE_URL + social login client ids

# UI with fake sign-in + fake verdicts
VITE_MOCK=1 bun run dev

# Real verdicts (Workers AI runs remotely; needs a workers.dev subdomain on the account)
cd worker && bun install && cp .dev.vars.example .dev.vars   # SESSION_SECRET for local dev
bun run worker:dev            # http://localhost:8787
bun run dev

# Smoke-test the Clef logic straight against the REST API
cd worker && CLOUDFLARE_ACCOUNT_ID=<id> CLOUDFLARE_API_TOKEN=$(bunx wrangler auth token) bun scripts/smoke.ts [chat.png]
```

## Languages

The app only contains English. Everything else is translated at runtime, so it works in any language without shipping translation files.

- `src/lib/i18n.ts` reads the phone language (`@capacitor/device`, falling back to `navigator.language`; `?lang=fr` forces one in dev). For anything but English, a `MutationObserver` translates every text node and the `placeholder`/`aria-label`/`title`/`alt` attributes as React renders them. Text waiting for its translation stays invisible instead of flashing in English, and the first launch in a new language waits up to 3.5s for the first screen.
- Translations are kept in `localStorage` per language, so each string is fetched once per device. Strings outside the DOM (native bar titles, the share card, share texts) go through `tr()` / `tx()`. Verdicts are translated while the reveal animation plays (`prime()` in `src/lib/api.ts`).
- Anything with `translate="no"` (pasted chats, the user's own question) is left alone. Right-to-left languages get per-paragraph text direction.
- `translator/` is the `jevit-i18n` worker on `i18n.jevit.fun`: `POST /v1/translate {lang, texts}` → `{translations, complete}`. Each string is translated once per language with Gemma 4 (JSON-schema batches, brand names protected) and stored in KV forever; bump `CACHE_VERSION` to retranslate. Misses are rate limited to 30 requests/min per IP. `jevit-judge` calls it over RPC to turn questions typed in other languages into English before Clef reads them.
- `bun scripts/warm-i18n.ts [langs…]` (with `VITE_MOCK=1 bunx vite --port 5173` running) reads every screen of the mock app and pre-translates it into the 26 most common languages, so the first user in a language doesn't wait.

## Accounts and rate limits

Sign in with Apple or Google (`@capgo/capacitor-social-login`) is required before any Clef call.

```
app: native Apple/Google sign-in ─▶ provider ID token ─▶ POST /v1/auth
worker: checks the token signature (Apple/Google public keys), issuer, audience, and age (≤10 min)
        ─▶ Jevit session JWT (HS256, 30 days), stored in Keychain / AccountManager (@capgo/capacitor-persistent-account)
every /v1/check, /v1/judge, /v1/me call: Authorization: Bearer <session>
```

| Layer | Limit | Where |
|---|---|---|
| Sign-in attempts | 10 / min per IP | `AUTH_LIMITER` |
| Verdicts, burst | 4 / min per account | `JUDGE_LIMITER` |
| Verdicts, daily | 15 / day per account (`DAILY_VERDICTS`) | `Quota` Durable Object (consistent counter) |
| Live question checks | 40 / min per account | `CHECK_LIMITER` |
| Ban | per account | `POST /v1/admin/ban {key}` with `ADMIN_TOKEN`; `key` is the `user=` value in Workers logs |

- A verdict is counted before Clef runs. It is refunded if Clef errors or the question gets OBJECTION!.
- Deleting the account (`DELETE /v1/me`, the Account screen) drops usage history. Today's count and any ban stay, so delete + sign in again doesn't reset the quota.
- Quota storage is keyed by a salted hash of the account id. Jevit stores no emails, names, or screenshots.

### Social login setup

1. **Apple:** enable *Sign in with Apple* for `ee.forgr.jevit` in the Apple developer portal (the entitlement is already in `ios/App/App/App.entitlements`). For Apple sign-in on Android, also create a Services ID + redirect URL, set `VITE_APPLE_SERVICE_ID` / `VITE_APPLE_REDIRECT_URL`, and add the Services ID to `APPLE_CLIENT_IDS`.
2. **Google:** create an iOS client and a Web client in Google Cloud (Android uses the Web client plus your SHA-1).
   - Set `VITE_GOOGLE_IOS_CLIENT_ID` and `VITE_GOOGLE_WEB_CLIENT_ID`.
   - Put both ids in `GOOGLE_CLIENT_IDS` (`worker/wrangler.jsonc`).
   - Replace `com.googleusercontent.apps.pending` in `ios/App/App/Info.plist` with the reversed iOS client id.
3. Full guide: https://capgo.app/docs/plugins/social-login/

## Deploy the judge (Cloudflare)

```bash
cd worker
openssl rand -hex 32 | bunx wrangler secret put SESSION_SECRET
openssl rand -hex 32 | bunx wrangler secret put ADMIN_TOKEN     # optional, for bans
# fill GOOGLE_CLIENT_IDS / APPLE_CLIENT_IDS in wrangler.jsonc
bun run deploy
```

## Native

```bash
bun run icons                 # regenerate icons + splash from resources/logo.svg
bun run ios                   # build, sync, open Xcode
bun run android               # build, sync, open Android Studio
```

## Live updates (Capgo)

```bash
bunx @capgo/cli@latest login <api-key>
bunx @capgo/cli@latest app add ee.forgr.jevit
bun run capgo:upload          # build + upload the bundle to the production channel
```

Installed apps download new bundles in the background and apply them on the next launch. If a bundle doesn't call `notifyAppReady` within 10s, Capgo rolls it back.
