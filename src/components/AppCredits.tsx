import { LogoMark } from './Logo'
import { useVersionLabel } from '../lib/version'

const AUTHOR_URL = 'https://x.com/martindonadieu'
const SOURCE_URL = 'https://github.com/Cap-go/jevit'
const CAPGO_URL = 'https://capgo.app/?ref=jevit'

export default function AppCredits() {
  const version = useVersionLabel()
  return (
    <div className="credits">
      <LogoMark size={84} />
      <p className="credits-version">
        Version <span translate="no">{version}</span>
      </p>
      <p className="credits-author">
        Made by{' '}
        <a href={AUTHOR_URL} target="_blank" rel="noreferrer" translate="no">
          Martin Donadieu
        </a>
      </p>
      <p className="credits-note">
        <a href={SOURCE_URL} target="_blank" rel="noreferrer">
          Open source
        </a>
        , built with Capacitor and shipped with Capgo live updates.
      </p>
      <a className="made-with" href={CAPGO_URL} target="_blank" rel="noreferrer">
        <img src="/capgo.svg" alt="" />
        <span translate="no">Made with Capgo</span>
      </a>
    </div>
  )
}
