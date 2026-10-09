# Store release kit

Everything for App Store + Google Play: metadata, screenshots, graphics, and the scripts that push them.

| Path | What |
|---|---|
| `metadata.json` | Names, subtitle, keywords, descriptions, URLs, review notes |
| `screenshots/ios-6.9/` | 6 × 1320×2868 (App Store 6.9", scaled by Apple for smaller iPhones) |
| `screenshots/android/` | 6 × 1080×1920 phone screenshots |
| `graphics/` | Play feature graphic 1024×500, Play icon 512, App Store icon 1024 |
| `frame.html`, `feature.html`, `shots.ts` | Regenerate screenshots: `VITE_MOCK=1 bunx vite` then `bun store/shots.ts` |
| `apple.ts` | Fills the App Store listing + uploads screenshots (App Store Connect API) |
| `play.ts` | Fills the Play listing + graphics + uploads the AAB to internal (draft) |
| `swap-ios-build.ts` | Puts a newer build on the iOS version waiting for review and resubmits it (`--metadata` also re-pushes the listing) |

Public pages served by the worker: [privacy](https://jevit.fun/privacy) · [terms](https://jevit.fun/terms) · [support](https://jevit.fun/support) · [smart link](https://jevit.fun)

## One-time steps that have no API

### 1. App Store Connect: create the app
My Apps → **+** → New App → iOS, name `Jevit: AI Judge for Chats`, language English (U.S.), bundle ID `ee.forgr.jevit` (already registered, Sign in with Apple enabled), SKU `jevit-ios-1`, Full Access.

Then: `ASC_KEY_ID=… ASC_ISSUER_ID=… bun store/apple.ts --contact-phone +33…`, and upload the build:
```bash
xcrun altool --upload-app -f /tmp/jevit-build/export/App.ipa -t ios --apiKey $ASC_KEY_ID --apiIssuer $ASC_ISSUER_ID
```

### 2. App Store Connect: App Privacy
- Data collection: **Yes**
- **Identifiers → User ID**: App Functionality; linked to the user: Yes; used for tracking: No
- Everything else: not collected. Screenshots and messages are processed only to answer the request and never stored, which Apple counts as not collected.

### 3. Google Play Console: create the app
Create app → name `Jevit: AI Judge for Chats`, default language English (US), App, Free, accept declarations. Package name comes from the first upload: `ee.forgr.jevit`.

Then `bun store/play.ts` (listing, graphics, screenshots, AAB → internal track draft).

### 4. Play Console: App content
- Privacy policy: `https://jevit.fun/privacy`
- Ads: No ads
- App access: all functionality needs sign-in. Provide the demo account from `~/.jevit/review-account` (worker secrets `DEMO_EMAIL` / `DEMO_PASSWORD`). Instructions: "On the sign-in screen tap 'Reviewer or tester? Sign in with email'."
- Content rating (IARC): category Entertainment / social-adjacent. No violence, sexual content, profanity by the app itself, gambling, or drugs. Users can't communicate with each other. The app does not share location. Choose "users can upload content: yes, processed by AI, not shared publicly".
- Target audience: 13+ (not designed for children)
- Advertising ID: **No** (the manifest explicitly removes `AD_ID`)
- Data safety:
  - Data collected: **App info and performance → none**; **Personal info → User IDs** (collected, not shared, required, purpose: App functionality, Account management).
  - Photos and messages: transmitted for processing only, not stored. Declare under "Photos" and "Other user-generated content" as *processed ephemerally*, not collected.
  - Encrypted in transit: Yes. Users can request deletion: Yes (in-app Account → Delete account).

### 5. Google Sign-In OAuth clients (Google Cloud Console → APIs & Services → Credentials)
- **Web client**: no redirect URIs needed. Its id goes in `VITE_GOOGLE_WEB_CLIENT_ID` and `GOOGLE_CLIENT_IDS`.
- **iOS client**: bundle `ee.forgr.jevit`. Its id goes in `VITE_GOOGLE_IOS_CLIENT_ID` + `GOOGLE_CLIENT_IDS`, and its reversed id in `ios/App/App/Info.plist` (`com.googleusercontent.apps.pending`).
- **Android client**: package `ee.forgr.jevit` with **both** SHA-1s:
  - upload key: `41:DA:EF:87:83:21:4C:B0:56:2D:9A:DF:54:37:0E:79:58:7F:F5:A1`
  - Play app signing key: `FC:76:98:11:4B:8B:80:42:EC:A5:69:1C:0F:7E:5C:86:BA:E5:BD:19`
- OAuth consent screen: app name Jevit, support email, privacy + terms URLs above, scopes `openid email profile`.

## Signing material (outside the repo, back it up)
- Android upload key: `~/.jevit/signing/jevit-upload.jks` + `upload.password`. **If lost, you need a Play upload key reset.**
- `android/keystore.properties` (gitignored) points to it.
- iOS: automatic signing via the App Store Connect API key, team `UVTJ336J2D`.
- Worker admin token for bans: `~/.jevit/admin_token`.

## Live identifiers
| What | Value |
|---|---|
| App Store app (Apple ID) | `6820318157` |
| Play developer account | Digital shift OU (`7955825393155090217`) |
| Google Cloud project | `jevit-app` (consent screen External, in production) |
| Google Web client | `885497139376-0cuab877sg5ersufq1hfldtr1lc0thpp.apps.googleusercontent.com` |
| Google iOS client | `885497139376-p9i7sq4ni7pnnt96dj8tquugnm8kgf9q.apps.googleusercontent.com` |
| Google Android client (upload key) | `885497139376-43lt0csbd2eev4e7v987i65vjbn5ugka.apps.googleusercontent.com` |
| Google Android client (Play signing) | `885497139376-fck3ciptp92hvc4h93llf5bp83lg6rjt.apps.googleusercontent.com` |
| Backend | `https://jevit.fun` (Cloudflare account Digital shift) |
