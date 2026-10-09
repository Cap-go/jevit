import type { ReactNode } from 'react'

// Native-style bottom sheet. Tap the dimmed backdrop to close.
export default function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <h3>{title}</h3>
        {children}
      </div>
    </div>
  )
}
