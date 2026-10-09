import type { ReactNode } from 'react'
import Page from './Page'
import type { Quota } from '../lib/auth'
import { nativeChrome } from '../lib/chrome'

const STEP_TITLES = ['Chat', 'Question', 'Context']

// Shell for the 3 case steps: progress in the header, one screen of content, primary action pinned at the bottom.
export default function CasePage({
  step,
  back,
  quota,
  footer,
  children,
}: {
  step: 1 | 2 | 3
  back: string
  quota: Quota | null
  footer: ReactNode
  children: ReactNode
}) {
  const steps = (
    <div className="steps-bar" aria-label={`Step ${step} of 3`}>
      {[1, 2, 3].map((n) => (
        <span key={n} className={n <= step ? 'on' : ''} />
      ))}
    </div>
  )
  const badge = <span className="quota-badge">{quota ? `⚖️ ${quota.remaining}` : ''}</span>
  return (
    <Page
      back={back}
      title={steps}
      navTitle={STEP_TITLES[step - 1]}
      right={badge}
      className="fill"
      footer={footer}
    >
      {nativeChrome && (
        <div className="case-progress">
          {steps}
          {badge}
        </div>
      )}
      {children}
    </Page>
  )
}
