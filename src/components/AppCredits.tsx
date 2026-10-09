import { LogoMark } from './Logo'
import { APP_VERSION, useLiveBundle } from '../lib/version'

export default function AppCredits() {
  const bundle = useLiveBundle()
  return (
    <div className="credits">
      <LogoMark size={44} />
      <p className="credits-version">
        Jevit {APP_VERSION}
        {bundle && <span> · {bundle}</span>}
      </p>
      <p className="credits-note">Built with Capacitor and shipped with Capgo live updates.</p>
      <a className="made-with" href="https://capgo.app/?ref=jevit" target="_blank" rel="noreferrer">
        <img src="/capgo.svg" alt="" />
        Made with Capgo
      </a>
    </div>
  )
}
