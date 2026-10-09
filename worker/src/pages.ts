// Public pages required by the App Store / Play Store listings, plus the /get smart link used in shares.

const CONTACT = "support@capgo.app";
const UPDATED = "October 8, 2026";

const layout = (title: string, body: string) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} · Jevit</title>
<style>
:root{color-scheme:dark}body{margin:0;background:#14051f;color:#fff6fb;font:16px/1.6 -apple-system,system-ui,sans-serif}
main{max-width:720px;margin:0 auto;padding:48px 24px 80px}h1{font-size:34px;margin:0 0 4px}h2{margin-top:32px;font-size:20px}
a{color:#d7ff3a}.muted{color:rgba(255,246,251,.6)}.logo{display:inline-block;padding:6px 14px;border-radius:12px;background:linear-gradient(135deg,#ff3d8b,#b026ff 55%,#5b2cff);font-weight:800;margin-bottom:24px;text-decoration:none;color:#fff}
.hero{text-align:center;padding:24px 0 8px}.hero svg{border-radius:24%;filter:drop-shadow(0 16px 30px #b026ff88)}
.big{font-size:72px;letter-spacing:-.05em;margin:14px 0 0;background:linear-gradient(90deg,#fff,#ffc2e0 50%,#d7ff3a);-webkit-background-clip:text;color:transparent}
.tag{color:#d7ff3a;font-size:26px;font-weight:800;margin:0 0 10px}.soon{font-weight:700;color:#d7ff3a}.small{font-size:14px;text-align:center;margin-top:40px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(220px,100%),1fr));gap:12px;margin-top:36px}.f{padding:16px 18px;border-radius:18px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);display:grid;gap:4px}.f span{color:rgba(255,246,251,.65);font-size:15px}
.btn{display:inline-block;margin:8px 8px 0 0;padding:14px 20px;border-radius:16px;background:linear-gradient(135deg,#ff3d8b,#b026ff 55%,#5b2cff);color:#fff;font-weight:700;text-decoration:none}
</style></head><body><main><a class="logo" href="/">jevit</a>${body}</main></body></html>`;

const PRIVACY = layout(
  "Privacy Policy",
  `<h1>Privacy Policy</h1><p class="muted">Last updated ${UPDATED}</p>
<p>Jevit ("we") is an entertainment app where an AI judge gives a verdict on conversations you upload. This policy explains what we process and why.</p>
<h2>What you upload</h2>
<p>Screenshots, photos, and text you add to a case are sent over an encrypted connection to our server, which forwards them to Cloudflare Workers AI (the Clef decision model) to compute one verdict. <b>We do not store your screenshots, messages, questions, or verdicts.</b> They exist only in memory for the few seconds needed to answer. Cloudflare does not use them to train models.</p>
<h2>Your account</h2>
<p>You sign in with Apple or Google so we can prevent abuse. We verify the sign-in token and keep only a salted, one-way hash of your account identifier together with a daily verdict counter. We do not store your email address, name, contacts, or profile photo. If your provider shares your first name, it lives only in your session on your device for the greeting; we never store it.</p>
<h2>On your device</h2>
<p>The app keeps your session in the iOS Keychain or Android AccountManager, plus small preferences such as whether you finished onboarding. Images you pick stay in memory and are discarded when you start a new case. Verdict cards you share are created on your device.</p>
<h2>Analytics and ads</h2>
<p>Jevit has no ads, no third-party tracking, and does not sell or share personal data.</p>
<h2>Service providers</h2>
<p>Cloudflare (hosting, AI inference, rate limiting), Apple and Google (sign-in), Capgo (app updates; receives device and app version information only).</p>
<h2>Children</h2>
<p>Jevit is not intended for anyone under 13 (or the minimum age in your country).</p>
<h2>Your choices</h2>
<p>You can delete your account in the app (Account → Delete account). This removes your usage history. Contact <a href="mailto:${CONTACT}">${CONTACT}</a> for any privacy request.</p>`,
);

const TERMS = layout(
  "Terms of Use",
  `<h1>Terms of Use</h1><p class="muted">Last updated ${UPDATED}</p>
<p>Jevit is for entertainment. Verdicts are produced automatically by an AI decision model from the content you provide, can be wrong, and are not psychological, relationship, medical, or legal advice. Don’t make important decisions based on a verdict.</p>
<p>Only upload content you are allowed to share. Do not upload content that is illegal, sexual content involving minors, or content meant to harass someone. We may limit or suspend accounts that abuse the service.</p>
<p>If a conversation makes you feel unsafe, contact local emergency services or a domestic-violence or crisis hotline.</p>
<p>The service is provided "as is" without warranties. Questions: <a href="mailto:${CONTACT}">${CONTACT}</a>.</p>`,
);

const SUPPORT = layout(
  "Support",
  `<h1>Support</h1>
<p>Need help with Jevit? Email <a href="mailto:${CONTACT}">${CONTACT}</a> and we’ll get back to you.</p>
<h2>FAQ</h2>
<p><b>How does Jevit decide?</b> It uses Clef, an AI model by Cloudflare. It checks about 20 things in your screenshots: your question, red and green flags, interest, toxicity, effort, and safety.</p>
<p><b>Are my screenshots stored?</b> No. They are processed for one verdict and discarded.</p>
<p><b>Why do I need to sign in?</b> So everyone gets free answers every day, and bots stay out.</p>
<p><b>How do I delete my account?</b> In the app: Account → Delete account.</p>
<p><a href="/privacy">Privacy Policy</a> · <a href="/terms">Terms of Use</a></p>`,
);

const LOGO = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="96" height="96">  <defs>    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">      <stop offset="0" stop-color="#FF3D8B"/>      <stop offset="0.55" stop-color="#B026FF"/>      <stop offset="1" stop-color="#5B2CFF"/>    </linearGradient>    <radialGradient id="glow" cx="0.3" cy="0.2" r="0.8">      <stop offset="0" stop-color="#ffffff" stop-opacity="0.35"/>      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>    </radialGradient>  </defs>  <rect width="1024" height="1024" rx="232" fill="url(#bg)"/>  <rect width="1024" height="1024" rx="232" fill="url(#glow)"/>  <!-- J handle -->  <path d="M590 400 V640 a150 150 0 0 1 -300 0" fill="none" stroke="#fff" stroke-width="120" stroke-linecap="round"/>  <!-- gavel head -->  <g transform="rotate(-14 590 330)">    <rect x="400" y="250" width="380" height="160" rx="48" fill="#fff"/>    <rect x="460" y="250" width="34" height="160" fill="#B026FF" opacity="0.9"/>    <rect x="686" y="250" width="34" height="160" fill="#B026FF" opacity="0.9"/>  </g>  <!-- sparkles -->  <path d="M250 240 Q262 302 324 314 Q262 326 250 388 Q238 326 176 314 Q238 302 250 240Z" fill="#D7FF3A"/>  <path d="M790 640 Q798 682 840 690 Q798 698 790 740 Q782 698 740 690 Q782 682 790 640Z" fill="#D7FF3A"/></svg>`;

function getPage(appStore: string, playStore: string) {
  const buttons = [
    appStore ? `<a class="btn" href="${appStore}">Download on the App Store</a>` : "",
    playStore ? `<a class="btn" href="${playStore}">Get it on Google Play</a>` : "",
  ].join("");
  return layout(
    "Get judged",
    `<div class="hero">${LOGO}<h1 class="big">jevit</h1><p class="tag">get judged.</p>
<p class="muted">Upload a chat. Ask a question. Get the answer in seconds.</p>
${buttons || '<p class="soon">Coming soon to iOS and Android.</p>'}</div>
<div class="grid">
<div class="f"><b>📸 Upload the chat</b><span>Chat screenshots, photos, or pasted messages.</span></div>
<div class="f"><b>❓ Ask a question</b><span>Is he cheating? Am I wrong? Is she into me? How toxic is this?</span></div>
<div class="f"><b>🔨 Get the verdict</b><span>A stamp, a confidence score, red &amp; green flags, and real advice.</span></div>
<div class="f"><b>🔒 Private</b><span>Screenshots are processed for one verdict and never stored.</span></div>
</div>
<p class="muted small"><a href="/privacy">Privacy</a> · <a href="/terms">Terms</a> · <a href="/support">Support</a></p>`,
  );
}

const html = (body: string) =>
  new Response(body, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=3600" } });

export function publicPage(request: Request, env: { APP_STORE_URL?: string; PLAY_STORE_URL?: string }): Response | null {
  const { pathname } = new URL(request.url);
  if (pathname === "/privacy") return html(PRIVACY);
  if (pathname === "/terms") return html(TERMS);
  if (pathname === "/support") return html(SUPPORT);
  if (pathname === "/get" || pathname === "/") {
    // Smart link: send phones straight to their store, everyone else to a landing page.
    const ua = request.headers.get("user-agent") ?? "";
    if (/iPhone|iPad|iPod/i.test(ua) && env.APP_STORE_URL) return Response.redirect(env.APP_STORE_URL, 302);
    if (/Android/i.test(ua) && env.PLAY_STORE_URL) return Response.redirect(env.PLAY_STORE_URL, 302);
    return html(getPage(env.APP_STORE_URL ?? "", env.PLAY_STORE_URL ?? ""));
  }
  return null;
}
