import { useLayoutEffect, useRef } from 'react'

// Verdict stamp: shrinks its font until the label fits the screen, so long labels never spill out.
export default function Stamp({ label, vibe, max = 76 }: { label: string; vibe: string; max?: number }) {
  const ref = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const el = ref.current
    const box = el?.parentElement
    if (!el || !box) return
    // Rotation adds a little width, so keep ~10% slack.
    const room = box.clientWidth * 0.9
    const fit = (wrap: boolean) => {
      el.style.whiteSpace = wrap ? 'normal' : 'nowrap'
      el.style.maxWidth = wrap ? `${room}px` : 'none'
      let size = max
      el.style.fontSize = `${size}px`
      // Wrapped: a single word may not overflow and we allow at most 2 lines.
      const tooBig = () =>
        wrap ? el.scrollWidth > el.clientWidth + 1 || el.offsetHeight > size * 2.6 : el.offsetWidth > room
      while (size > 26 && tooBig()) {
        size -= 2
        el.style.fontSize = `${size}px`
      }
      return size
    }
    // Two big lines beat one tiny line: "PROBABLY / NOT".
    if (fit(false) < 40 && label.includes(' ')) fit(true)
  }, [label, max])

  return (
    <div className="stamp-wrap">
      <div ref={ref} className={`stamp vibe-${vibe}`}>
        {label}
      </div>
    </div>
  )
}
