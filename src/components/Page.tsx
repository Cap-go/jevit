import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { setDirection, setupPage } from '@capgo/capacitor-transitions/react'
import { tap } from '../lib/haptics'
import { nativeChrome, showChrome, updateChrome, type Chrome } from '../lib/chrome'

type Props = {
  title?: ReactNode
  /** Native bar title when `title` is not plain text. */
  navTitle?: string
  navSubtitle?: string
  back?: string | number
  right?: ReactNode
  footer?: ReactNode
  className?: string
  onDidEnter?: () => void
  children: ReactNode
}

export default function Page({ title, navTitle, navSubtitle, back, right, footer, className, onDidEnter, children }: Props) {
  const ref = useRef<HTMLElement>(null)
  const navigate = useNavigate()
  const [owner] = useState(() => Symbol('page'))

  const goBack = () => {
    void tap()
    setDirection('back')
    if (typeof back === 'number') navigate(back)
    else navigate(back ?? '/')
  }

  const chrome: Chrome = {
    owner,
    title: navTitle ?? (typeof title === 'string' ? title : title ? '' : undefined),
    subtitle: navSubtitle,
    onBack: back !== undefined ? goBack : undefined,
  }
  const latest = useRef(chrome)
  latest.current = chrome

  // Claim the bar when this page is pushed, and again when it comes back from the cache.
  useEffect(() => {
    showChrome(latest.current)
    if (ref.current) return setupPage(ref.current, { onWillEnter: () => showChrome(latest.current), onDidEnter })
  }, [onDidEnter])

  useEffect(() => updateChrome(latest.current), [chrome.title, chrome.subtitle, back])

  return (
    <cap-page ref={ref}>
      {!nativeChrome && (title || back !== undefined) && (
        <cap-header slot="header">
          <div className="toolbar">
            {back !== undefined ? (
              <button className="icon-btn" onClick={goBack} aria-label="Back">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
              </button>
            ) : (
              <span className="icon-btn ghost" />
            )}
            <div className="toolbar-title">{title}</div>
            {right ?? <span className="icon-btn ghost" />}
          </div>
        </cap-header>
      )}
      <cap-content slot="content" scroll-x="false">
        <div className={`page ${className ?? ''}`}>{children}</div>
      </cap-content>
      {footer && (
        <cap-footer slot="footer">
          <div className="footer">{footer}</div>
        </cap-footer>
      )}
    </cap-page>
  )
}
