import type { CapacitorConfig } from '@capacitor/cli'
import pkg from './package.json' with { type: 'json' }

const config: CapacitorConfig = {
  appId: 'ee.forgr.jevit',
  appName: 'Jevit',
  webDir: 'dist',
  backgroundColor: '#14051f',
  ios: { contentInset: 'never' },
  plugins: {
    CapacitorUpdater: {
      // Capgo live updates: new web bundles download in background, apply on next launch.
      autoUpdate: true,
      appReadyTimeout: 10000,
      responseTimeout: 20,
      // Builtin bundle version = package.json, so a fresh store install doesn't re-download the same bundle.
      version: pkg.version,
    },
    SocialLogin: {
      // Only bundle what we use: Sign in with Apple + Google.
      providers: { apple: true, google: true, facebook: false, twitter: false },
      logLevel: 1,
    },
    SplashScreen: {
      launchShowDuration: 600,
      backgroundColor: '#14051f',
      showSpinner: false,
    },
  },
}

export default config
