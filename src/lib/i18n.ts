// The app only ships English. For any other phone language, every visible text is translated on the fly by
// the jevit-i18n worker (Workers AI + KV cache) and kept in a local dictionary, so each string is fetched once.
// A MutationObserver translates text nodes and a few attributes as React renders them; elements (or parents)
// with translate="no" are left alone (user content like pasted chats).
import { Capacitor } from '@capacitor/core'

const I18N_URL = import.meta.env.VITE_I18N_URL ?? 'https://i18n.jevit.fun'
const DICT_VERSION = 'v1'
const ATTRS = ['placeholder', 'aria-label', 'title', 'alt']
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'CODE', 'PRE', 'svg'])
const BATCH_DELAY_MS = 30
const FIRST_PAINT_TIMEOUT_MS = 3500
const MAX_BATCH = 150
const RTL = new Set(['ar', 'he', 'fa', 'ur', 'ps', 'yi', 'ckb', 'dv', 'sd', 'ug'])

/** Translation target ("fr", "pt-BR", "zh-Hant"…), or "en" when nothing needs translating. */
export let lang = 'en'
let dict: Record<string, string> = {}
const queued = new Set<string>()
const waiting = new Map<string, Set<() => void>>()
let timer: ReturnType<typeof setTimeout> | undefined

// Same mapping as the worker: base language, with the variants that really differ kept apart.
function normalize(tag: string): string {
  try {
    const loc = new Intl.Locale(Intl.getCanonicalLocales(tag.replace(/_/g, '-'))[0])
    if (loc.language === 'zh') return loc.script === 'Hant' || ['TW', 'HK', 'MO'].includes(loc.region ?? '') ? 'zh-Hant' : 'zh-Hans'
    if (loc.language === 'pt') return loc.region === 'PT' ? 'pt-PT' : 'pt-BR'
    return loc.language
  } catch {
    return 'en'
  }
}

async function phoneLanguage(): Promise<string> {
  const forced = new URLSearchParams(location.search).get('lang') ?? localStorage.getItem('jevit-lang')
  if (forced) return forced
  // iOS WebViews report only the languages the app bundle declares, so ask the OS directly.
  if (Capacitor.isPluginAvailable('Device')) {
    try {
      const { Device } = await import('@capacitor/device')
      return (await Device.getLanguageTag()).value
    } catch {
      /* fall through */
    }
  }
  return navigator.languages?.[0] ?? navigator.language ?? 'en'
}

const storeKey = () => `jevit-i18n:${DICT_VERSION}:${lang}`
let saveTimer: ReturnType<typeof setTimeout> | undefined
function saveSoon() {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(storeKey(), JSON.stringify(dict))
    } catch {
      /* storage full: keep the in-memory dictionary */
    }
  }, 500)
}

const split = (text: string) => {
  const m = text.match(/^(\s*)([\s\S]*?)(\s*)$/)!
  return { lead: m[1], core: m[2], trail: m[3] }
}
const translatable = (core: string) => core.length > 0 && core.length <= 2000 && /\p{L}/u.test(core)

/** Sync lookup: the translation if known, else the English text. */
export function tr(text: string): string {
  if (lang === 'en') return text
  const { lead, core, trail } = split(text)
  const hit = dict[core]
  return hit === undefined ? text : lead + hit + trail
}

/** Translates strings that never reach the DOM (native titles, share card, share text). Falls back to English. */
export async function tx(text: string, timeoutMs = 4000): Promise<string> {
  if (lang === 'en') return text
  const { core } = split(text)
  if (!translatable(core) || dict[core] !== undefined) return tr(text)
  await Promise.race([new Promise<void>((done) => request(core, done)), new Promise((r) => setTimeout(r, timeoutMs))])
  return tr(text)
}

/** Fetches translations ahead of time (e.g. a verdict while the reveal animation plays). */
export async function prime(texts: string[], timeoutMs = 6000): Promise<void> {
  if (lang === 'en') return
  const cores = texts.map((t) => split(t).core).filter((c) => translatable(c) && dict[c] === undefined)
  if (!cores.length) return
  await Promise.race([
    Promise.all(cores.map((c) => new Promise<void>((done) => request(c, done)))),
    new Promise((r) => setTimeout(r, timeoutMs)),
  ])
}

function request(core: string, onDone: () => void) {
  let set = waiting.get(core)
  if (!set) waiting.set(core, (set = new Set()))
  set.add(onDone)
  queued.add(core)
  clearTimeout(timer)
  timer = setTimeout(flush, BATCH_DELAY_MS)
}

async function flush() {
  const batch = [...queued].slice(0, MAX_BATCH)
  batch.forEach((c) => queued.delete(c))
  if (queued.size) timer = setTimeout(flush, BATCH_DELAY_MS)
  if (!batch.length) return
  let translations: string[] | null = null
  let complete = false
  try {
    const res = await fetch(`${I18N_URL}/v1/translate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ lang, texts: batch }),
    })
    if (res.ok) ({ translations, complete } = (await res.json()) as { translations: string[]; complete: boolean })
  } catch {
    /* offline: stay in English for now, retried on the next render */
  }
  batch.forEach((core, i) => {
    const out = translations?.[i]
    // When the worker couldn't translate everything (rate limit, model hiccup), unchanged strings are not
    // stored, so they get retried on a later render.
    if (out !== undefined && (out !== core || complete)) dict[core] = out
    const done = waiting.get(core)
    waiting.delete(core)
    done?.forEach((fn) => fn())
  })
  saveSoon()
}

// ---- DOM translation ----

type Seen = { source: string; shown: string }
const textSeen = new WeakMap<Text, Seen>()
const attrSeen = new WeakMap<Element, Map<string, Seen>>()
const WAIT_ATTR = 'data-i18n-wait'

function skipped(el: Element | null): boolean {
  for (let e = el; e; e = e.parentElement) {
    if (SKIP_TAGS.has(e.tagName) || e.getAttribute('translate') === 'no' || (e as HTMLElement).isContentEditable) return true
  }
  return false
}

// Hides English text while its translation loads, so nothing flashes in the wrong language.
function hold(el: Element | null, core: string) {
  if (!el) return
  const n = Number(el.getAttribute(WAIT_ATTR) ?? 0) + 1
  el.setAttribute(WAIT_ATTR, String(n))
  request(core, () => {
    const left = Number(el.getAttribute(WAIT_ATTR) ?? 1) - 1
    if (left > 0) el.setAttribute(WAIT_ATTR, String(left))
    else el.removeAttribute(WAIT_ATTR)
  })
}

function translateText(node: Text) {
  const value = node.nodeValue ?? ''
  const seen = textSeen.get(node)
  if (seen && value === seen.shown) return // our own write
  const { lead, core, trail } = split(value)
  if (!translatable(core) || skipped(node.parentElement)) return
  const apply = () => {
    if (node.nodeValue !== value || dict[core] === undefined) return
    const shown = lead + dict[core] + trail
    textSeen.set(node, { source: value, shown })
    if (shown !== value) node.nodeValue = shown
  }
  textSeen.set(node, { source: value, shown: value })
  if (dict[core] !== undefined) return apply()
  hold(node.parentElement, core)
  request(core, apply)
}

function translateAttr(el: Element, name: string) {
  const value = el.getAttribute(name)
  if (!value) return
  let seen = attrSeen.get(el)
  if (seen?.get(name)?.shown === value) return
  const { lead, core, trail } = split(value)
  if (!translatable(core) || skipped(el)) return
  if (!seen) attrSeen.set(el, (seen = new Map()))
  const map = seen
  const apply = () => {
    if (el.getAttribute(name) !== value || dict[core] === undefined) return
    const shown = lead + dict[core] + trail
    map.set(name, { source: value, shown })
    if (shown !== value) el.setAttribute(name, shown)
  }
  map.set(name, { source: value, shown: value })
  if (dict[core] !== undefined) apply()
  else request(core, apply)
}

function walk(root: Node) {
  if (root.nodeType === Node.TEXT_NODE) return translateText(root as Text)
  if (root.nodeType !== Node.ELEMENT_NODE) return
  const el = root as Element
  if (skipped(el)) return
  for (const a of ATTRS) if (el.hasAttribute(a)) translateAttr(el, a)
  const it = document.createTreeWalker(el, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
    acceptNode: (n) =>
      n.nodeType === Node.ELEMENT_NODE && (SKIP_TAGS.has((n as Element).tagName) || (n as Element).getAttribute('translate') === 'no')
        ? NodeFilter.FILTER_REJECT
        : NodeFilter.FILTER_ACCEPT,
  })
  for (let n = it.nextNode(); n; n = it.nextNode()) {
    if (n.nodeType === Node.TEXT_NODE) translateText(n as Text)
    else for (const a of ATTRS) if ((n as Element).hasAttribute(a)) translateAttr(n as Element, a)
  }
}

/** Detects the phone language and starts translating the page. Call before rendering the app. */
export async function setupI18n(): Promise<void> {
  const tag = await phoneLanguage()
  lang = normalize(tag)
  if (lang === 'en') return
  document.documentElement.lang = tag
  // Right-to-left scripts: each paragraph takes its own direction (layout stays as designed).
  if (RTL.has(lang)) document.documentElement.classList.add('i18n-rtl')
  try {
    dict = JSON.parse(localStorage.getItem(storeKey()) ?? '{}')
  } catch {
    dict = {}
  }

  const firstRun = Object.keys(dict).length === 0
  if (firstRun) document.documentElement.classList.add('i18n-loading')

  new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type === 'characterData') translateText(m.target as Text)
      else if (m.type === 'attributes') translateAttr(m.target as Element, m.attributeName!)
      else m.addedNodes.forEach(walk)
    }
  }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS })

  if (firstRun) {
    // Show the app once the first screen is translated (or after a timeout, in English if offline).
    const reveal = () => document.documentElement.classList.remove('i18n-loading')
    setTimeout(reveal, FIRST_PAINT_TIMEOUT_MS)
    const check = () => (document.querySelector(`[${WAIT_ATTR}]`) || queued.size ? setTimeout(check, 50) : reveal())
    setTimeout(check, 300)
  }
}
