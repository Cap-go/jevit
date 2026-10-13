// Public pages required by the App Store / Play Store listings, plus the /get smart link used in shares.

const CONTACT = "support@capgo.app";
const UPDATED = "October 13, 2026";

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
<p>Screenshots, photos, and text you add to a case are sent over an encrypted connection to our server, which forwards them to Cloudflare Workers AI to compute one verdict. <b>We do not store your screenshots, messages, questions, or verdicts.</b> They exist only in memory for the few seconds needed to answer. Cloudflare does not use them to train models.</p>
<h2>Third-party AI and your consent</h2>
<p>Before your first case, the app asks your permission to share this content with third-party AI. Nothing is sent until you agree. With your permission:</p>
<ul><li><b>Clef</b>, an AI decision model by Cloudflare, running on Cloudflare Workers AI, reads your screenshots, pasted messages, question, and extra details to write the verdict.</li>
<li><b>Gemma</b>, an AI model by Google, running on Cloudflare Workers AI, translates your question, extra details, and the verdict when your device is not set to English. App and website text is translated the same way.</li></ul>
<p>The content is used only to answer you. You can turn AI data sharing off anytime in Account → AI data sharing; the app then sends nothing and asks again before your next case. Screenshots can contain other people’s names and messages: only add content you have the right to share.</p>
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

const FAQ = [
  ["How does Jevit decide?", "It uses Clef, an AI model by Cloudflare. It checks about 20 things in your screenshots: your question, red and green flags, interest, toxicity, effort, and safety."],
  ["Are my screenshots stored?", "No. They are used for one answer and thrown away. No ads, no tracking, no selling data."],
  ["Is it free?", "Yes. You get free answers every day. Sign in with Apple or Google so bots stay out."],
  ["Does it speak my language?", "Yes. Jevit uses your phone’s language automatically, and you can ask in any language."],
  ["Is it real advice?", "No. Jevit is for fun. It can be wrong, so don’t make big decisions based on it. If a chat makes you feel unsafe, Jevit stops joking and points you to real help."],
];

const SHOTS = [
  ["01-home", "Your chats. Judged."],
  ["02-upload", "Upload the chat"],
  ["03-ask", "Ask a question"],
  ["04-judging", "The AI reads every message"],
  ["05-verdict", "Get the answer"],
  ["06-report", "Red flags. Green flags."],
  ["07-share", "Share it with friends"],
];

function homePage(appStore: string, playStore: string) {
  const badge = (href: string, img: string, alt: string, h: number) =>
    href
      ? `<a class="badge" href="${href}"><img src="/badges/${img}" alt="${alt}" height="${h}"></a>`
      : `<span class="badge soon"><img src="/badges/${img}" alt="${alt}" height="${h}"><em>Coming soon</em></span>`;
  const badges = `<div class="badges">${badge(appStore, "app-store.svg", "Download on the App Store", 54)}${badge(playStore, "google-play.png", "Get it on Google Play", 80)}</div>`;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Jevit · Who’s right? Ask the AI.</title>
<meta name="description" content="Upload a chat, ask a question, get the answer in seconds. Jevit is the AI judge for your chats.">
<meta property="og:title" content="Jevit · Who’s right? Ask the AI.">
<meta property="og:description" content="Upload a chat, ask a question, get the answer in seconds.">
<meta property="og:image" content="https://jevit.fun/og.jpg"><meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#14051f"><link rel="icon" href="/logo.svg" type="image/svg+xml">
<link rel="preload" href="/fonts/bricolage.woff2" as="font" type="font/woff2" crossorigin>
<style>
@font-face{font-family:Bricolage;src:url(/fonts/bricolage.woff2) format("woff2");font-weight:200 800;font-display:swap}
*{box-sizing:border-box}
:root{color-scheme:dark;--pink:#ff3d8b;--violet:#b026ff;--blue:#5b2cff;--lime:#d7ff3a;--ink:#14051f}
body{margin:0;background:var(--ink);color:#fff6fb;font:17px/1.55 Bricolage,-apple-system,system-ui,sans-serif;overflow-x:hidden}
body::before{content:"";position:fixed;inset:-50%;z-index:-1;background:radial-gradient(40% 30% at 15% 10%,#ff3d8b55,transparent),radial-gradient(45% 35% at 90% 35%,#5b2cff66,transparent),radial-gradient(40% 30% at 30% 95%,#b026ff44,transparent);animation:drift 18s ease-in-out infinite alternate}
@keyframes drift{to{transform:translate(4%,-3%)}}
a{color:var(--lime)}
.wrap{max-width:1120px;margin:0 auto;padding:0 24px}
nav{display:flex;align-items:center;justify-content:space-between;padding:22px 0}
.brand{display:flex;align-items:center;gap:10px;font-weight:800;font-size:26px;letter-spacing:-.04em;color:#fff;text-decoration:none}
.brand img{width:40px;height:40px;border-radius:24%}
nav .links a{color:rgba(255,246,251,.75);text-decoration:none;font-weight:600;margin-left:22px}
.hero{display:grid;grid-template-columns:1.1fr .9fr;gap:40px;align-items:center;padding:30px 0 60px}
h1{font-size:clamp(46px,7.5vw,92px);line-height:.95;letter-spacing:-.05em;margin:0 0 18px;font-weight:800}
h1 em{font-style:normal;background:linear-gradient(90deg,var(--lime),#ffe36b);-webkit-background-clip:text;color:transparent}
.lead{font-size:clamp(19px,2.2vw,23px);color:rgba(255,246,251,.78);max-width:30ch;margin:0 0 28px}
.badges{display:flex;flex-wrap:wrap;align-items:center;gap:10px}
.badge{position:relative;display:inline-flex;align-items:center}
.badge img{display:block}
.badge.soon img{opacity:.45;filter:grayscale(.3)}
.badge.soon em{position:absolute;top:-10px;right:-6px;font-style:normal;font-size:12px;font-weight:800;background:var(--lime);color:var(--ink);padding:2px 8px;border-radius:999px}
.free{margin-top:16px;color:rgba(255,246,251,.6);font-size:15px}
.phone{justify-self:center;width:min(340px,80vw);aspect-ratio:9/16;border-radius:34px;overflow:hidden;box-shadow:0 40px 120px rgba(0,0,0,.6),0 0 100px #b026ff44;border:1px solid rgba(255,255,255,.08)}
.phone video{width:100%;height:100%;object-fit:cover;display:block}
section{padding:56px 0}
h2{font-size:clamp(32px,4.5vw,52px);letter-spacing:-.04em;line-height:1;margin:0 0 10px;font-weight:800}
.sub{color:rgba(255,246,251,.65);margin:0 0 30px;font-size:19px}
.steps{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
.step{padding:24px;border-radius:24px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.09)}
.step .n{display:inline-grid;place-items:center;width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,var(--pink),var(--violet) 55%,var(--blue));font-weight:800;margin-bottom:14px}
.step h3{margin:0 0 6px;font-size:23px;letter-spacing:-.02em}.step p{margin:0;color:rgba(255,246,251,.68)}
.shots{display:flex;gap:16px;overflow-x:auto;scroll-snap-type:x mandatory;padding:6px 24px 18px;margin:0 -24px;scrollbar-width:none}
.shots::-webkit-scrollbar{display:none}
.shots img{flex:0 0 auto;width:min(240px,62vw);height:auto;border-radius:22px;scroll-snap-align:center;box-shadow:0 20px 60px rgba(0,0,0,.45)}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
.f{padding:22px;border-radius:22px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.09)}
.f b{display:block;font-size:20px;margin-bottom:4px}.f span{color:rgba(255,246,251,.66)}
details{border-bottom:1px solid rgba(255,255,255,.1);padding:18px 0}
summary{cursor:pointer;font-weight:700;font-size:20px;list-style:none}summary::-webkit-details-marker{display:none}
summary::after{content:"+";float:right;color:var(--lime)}details[open] summary::after{content:"–"}
details p{color:rgba(255,246,251,.7);margin:10px 0 0}
.cta{text-align:center;padding:70px 24px;border-radius:32px;background:linear-gradient(135deg,#ff3d8b33,#5b2cff44);border:1px solid rgba(255,255,255,.1);margin:40px 0}
.cta .badges{justify-content:center;margin-top:22px}
footer{padding:30px 0 50px;color:rgba(255,246,251,.5);font-size:15px;display:flex;flex-wrap:wrap;gap:16px;justify-content:space-between}
footer a{color:rgba(255,246,251,.7)}
@media (max-width:820px){.hero{grid-template-columns:1fr;text-align:center;padding-top:10px}.lead{margin-left:auto;margin-right:auto}.badges{justify-content:center}.steps,.grid{grid-template-columns:1fr}nav .links{display:none}}
</style></head><body>
<div class="wrap">
<nav><a class="brand" href="/"><img src="/logo.svg" alt="">jevit</a><div class="links"><a href="#how">How it works</a><a href="#faq">FAQ</a><a href="/support">Support</a></div></nav>
<header class="hero">
  <div>
    <h1>Who’s right?<br><em>Ask the AI.</em></h1>
    <p class="lead">Upload a chat, ask a question, and get a clear answer in seconds.</p>
    ${badges}
    <p class="free">Free · No ads · Works in your language</p>
  </div>
  <div class="phone"><video src="/promo.mp4" poster="/promo-poster.jpg" autoplay muted loop playsinline preload="metadata"></video></div>
</header>

<section id="how">
  <h2>How it works</h2>
  <p class="sub">Three steps. No essays.</p>
  <div class="steps">
    <div class="step"><span class="n">1</span><h3>Upload the chat 📸</h3><p>A screenshot, a photo of the chat, or paste the messages.</p></div>
    <div class="step"><span class="n">2</span><h3>Ask a question ❓</h3><p>“Is he into me?”, “Who’s right, me or her?” or “How toxic is this?”</p></div>
    <div class="step"><span class="n">3</span><h3>Get the answer ✅</h3><p>YES, NOPE or YOU WIN, how sure it is, the red and green flags, and one piece of advice.</p></div>
  </div>
</section>

<section>
  <div class="shots">${SHOTS.map(([f, alt]) => `<img src="/shots/${f}.webp" alt="${alt}" loading="lazy" width="600" height="1304">`).join("")}</div>
</section>

<section>
  <h2>Made for the group chat</h2>
  <p class="sub">The answer you can screenshot.</p>
  <div class="grid">
    <div class="f"><b>⚖️ A clear answer</b><span>Yes or no, who’s right, or a score. Never a wall of text.</span></div>
    <div class="f"><b>🚩 Red &amp; green flags</b><span>Interest, toxicity, effort, and the signals behind the answer.</span></div>
    <div class="f"><b>📤 Share in one tap</b><span>A story-ready card for your friends.</span></div>
    <div class="f"><b>🔒 Private</b><span>Screenshots are never stored. No ads, no tracking.</span></div>
    <div class="f"><b>🌍 Any language</b><span>The app speaks your phone’s language. Ask in any language.</span></div>
    <div class="f"><b>💜 Safety first</b><span>If a chat looks unsafe, Jevit stops joking and points you to real help.</span></div>
  </div>
</section>

<section id="faq">
  <h2>FAQ</h2>
  ${FAQ.map(([q, a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join("")}
</section>

<div class="cta">
  <h2>Get judged.</h2>
  <p class="sub" style="margin:0">Free on iPhone and Android.</p>
  ${badges}
</div>

<footer><span translate="no">© 2026 Digital Shift OÜ</span><span><a href="/privacy">Privacy</a> · <a href="/terms">Terms</a> · <a href="/support">Support</a> · <a href="mailto:${CONTACT}" translate="no">${CONTACT}</a></span></footer>
</div>
</body></html>`;
}

const html = (body: string) =>
  new Response(body, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=300" } });

export function publicPage(request: Request, env: { APP_STORE_URL?: string; PLAY_STORE_URL?: string }): Response | null {
  const { pathname } = new URL(request.url);
  if (pathname === "/privacy") return html(PRIVACY);
  if (pathname === "/terms") return html(TERMS);
  if (pathname === "/support") return html(SUPPORT);
  if (pathname === "/get") {
    // Smart link (shared verdict cards): send phones straight to their store, everyone else to the landing page.
    const ua = request.headers.get("user-agent") ?? "";
    if (/iPhone|iPad|iPod/i.test(ua) && env.APP_STORE_URL) return Response.redirect(env.APP_STORE_URL, 302);
    if (/Android/i.test(ua) && env.PLAY_STORE_URL) return Response.redirect(env.PLAY_STORE_URL, 302);
  }
  if (pathname === "/get" || pathname === "/") return html(homePage(env.APP_STORE_URL ?? "", env.PLAY_STORE_URL ?? ""));
  return null;
}
