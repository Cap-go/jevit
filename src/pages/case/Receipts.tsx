import { useRef, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { CapgoFilePicker } from '@capgo/capacitor-file-picker'
import { useNavigate } from 'react-router-dom'
import { setDirection } from '@capgo/capacitor-transitions/react'
import CasePage from '../../components/CasePage'
import Sheet from '../../components/Sheet'
import { caseFile, newId } from '../../lib/store'
import { toEvidenceImage } from '../../lib/images'
import { useQuota } from '../../lib/useQuota'
import { TIPS } from '../../lib/examples'
import { tap } from '../../lib/haptics'
import type { Evidence } from '../../lib/types'

const MAX_IMAGES = 4 // Clef accepts up to 4 images per decision

// Step 1. Images come from plain file inputs: WKWebView opens Apple's native photo picker (fast, multi-select,
// no photo-library permission) and Android opens the system photo picker.
export default function Receipts() {
  const navigate = useNavigate()
  const { quota } = useQuota('/case/receipts')
  const [evidence, setEvidence] = useState<Evidence[]>(caseFile.evidence)
  const [busy, setBusy] = useState(0)
  const [error, setError] = useState('')
  const [sheet, setSheet] = useState<'paste' | 'tips' | null>(null)
  const [draft, setDraft] = useState('')
  const gallery = useRef<HTMLInputElement>(null)
  const camera = useRef<HTMLInputElement>(null)

  // Every receipt (screenshot or pasted chat) takes one of the 4 slots.
  const room = MAX_IMAGES - evidence.length - busy

  const update = (next: Evidence[]) => {
    caseFile.evidence = next
    setEvidence(next)
  }

  // Load picked images one by one so each tile pops in as soon as it's ready.
  const addImages = async (sources: (() => Promise<string>)[], cleanup?: (url: string) => void) => {
    if (!sources.length) return
    setError(sources.length > room ? `Max ${MAX_IMAGES} screenshots per case, kept the first ${room}` : '')
    const take = sources.slice(0, room)
    setBusy(take.length)
    for (const source of take) {
      let url = ''
      try {
        url = await source()
        const img = await toEvidenceImage(url)
        update([...caseFile.evidence, { id: newId(), kind: 'image', ...img }])
      } catch {
        setError('Couldn’t read one of those images')
      } finally {
        if (url) cleanup?.(url)
        setBusy((n) => n - 1)
      }
    }
  }

  const onFiles = (list: FileList | null) => {
    const files = [...(list ?? [])].filter((f) => f.type.startsWith('image/') || f.name.match(/\.(heic|heif)$/i))
    void addImages(
      files.map((f) => async () => URL.createObjectURL(f)),
      (url) => URL.revokeObjectURL(url),
    )
  }

  // Native builds: Capgo file picker (PHPicker / Android photo picker, multi-select, returns file paths).
  // Older native builds without the plugin (reached by live updates) fall back to the system file input.
  const pickScreenshots = async () => {
    void tap()
    if (room <= 0) return
    if (Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('CapgoFilePicker')) {
      try {
        const { files } = await CapgoFilePicker.pickImages({ limit: room })
        void addImages(
          files
            .filter((f) => f.path)
            .map((f) => async () => {
              let path = f.path!
              if (/hei[cf]/i.test(f.mimeType) || /\.hei[cf]$/i.test(f.name)) {
                path = (await CapgoFilePicker.convertHeicToJpeg({ path, quality: 0.85 })).path
              }
              return Capacitor.convertFileSrc(path)
            }),
        )
      } catch {
        /* picker dismissed */
      }
      return
    }
    open(gallery.current)
  }

  const open = (input: HTMLInputElement | null) => {
    if (!input || room <= 0) return
    void tap()
    input.value = ''
    input.click()
  }

  const savePaste = () => {
    const text = draft.trim()
    if (text) update([...caseFile.evidence, { id: newId(), kind: 'text', text }])
    setDraft('')
    setSheet(null)
  }

  const next = () => {
    void tap()
    setDirection('forward')
    navigate('/case/question')
  }

  const slots = Array.from({ length: MAX_IMAGES }, (_, i) => evidence[i])

  return (
    <CasePage
      step={1}
      back="/"
      quota={quota}
      footer={
        <button className="cta" disabled={evidence.length === 0 || busy > 0} onClick={next}>
          {evidence.length === 0 ? 'Add a screenshot to continue' : 'Next'}
        </button>
      }
    >
      <div className="step-head">
        <h1>Upload the chat 📸</h1>
        <p className="muted">The whole chat, both sides, timestamps visible.</p>
      </div>

      <div className="step-body">
        {evidence.length === 0 && busy === 0 ? (
          <button className="dropzone" onClick={pickScreenshots}>
            <span className="dz-icon">🖼️</span>
            <b>Add screenshots</b>
            <span>Pick up to {MAX_IMAGES} at once</span>
          </button>
        ) : (
          <div className="slots">
            {slots.map((e, i) =>
              e ? (
                <div key={e.id} className="slot filled pop-in">
                  {e.kind === 'image' ? <img src={e.preview} alt="" /> : <p>{e.text}</p>}
                  <button
                    className="remove"
                    aria-label="Remove"
                    onClick={() => (tap(), update(evidence.filter((x) => x.id !== e.id)))}
                  >
                    ×
                  </button>
                </div>
              ) : i < evidence.length + busy ? (
                <div key={`busy-${i}`} className="slot loading-tile" />
              ) : (
                <button key={`add-${i}`} className="slot empty" onClick={pickScreenshots} disabled={room <= 0}>
                  +
                </button>
              ),
            )}
          </div>
        )}

        <div className="source-row">
          <button className="source" onClick={() => open(camera.current)} disabled={room <= 0}>
            📸 Camera
          </button>
          <button className="source" onClick={() => (tap(), setSheet('paste'))} disabled={room <= 0}>
            💬 Paste chat
          </button>
          <button className="source" onClick={() => (tap(), setSheet('tips'))}>
            💡 Tips
          </button>
        </div>
        {error && <p className="error-text">{error}</p>}
      </div>

      <input ref={gallery} type="file" accept="image/*" multiple hidden onChange={(e) => onFiles(e.target.files)} />
      <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={(e) => onFiles(e.target.files)} />

      {sheet === 'paste' && (
        <Sheet title="Paste the chat 💬" onClose={() => setSheet(null)}>
          <textarea
            className="context-box"
            autoFocus
            rows={7}
            placeholder={'Him: wyd\nMe: nothing u?\nHim: k'}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <button className="cta" disabled={!draft.trim()} onClick={savePaste}>
            Add to case
          </button>
        </Sheet>
      )}

      {sheet === 'tips' && (
        <Sheet title="Tips for a sharp verdict 🔍" onClose={() => setSheet(null)}>
          <ul className="tips-list">
            <li>Screenshot the <b>whole exchange</b>, not one message.</li>
            <li>Keep <b>timestamps</b> visible: reply times are evidence.</li>
            <li>Your messages are usually <b>right / blue</b>. Say so in context if not.</li>
            <li>Recent messages beat old ones.</li>
          </ul>
          <div className="good-bad">
            {TIPS.map((t) => (
              <div key={t.good} className="gb-row">
                <span className="gb good">✅ {t.good}</span>
                <span className="gb bad">❌ {t.bad}</span>
              </div>
            ))}
          </div>
          <button className="btn ghost" onClick={() => setSheet(null)}>
            Got it
          </button>
        </Sheet>
      )}
    </CasePage>
  )
}
