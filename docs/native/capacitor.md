# ArahDana Native Shell

ArahDana remains a Next.js web app deployed on Vercel. Capacitor is added as a native-like shell, not as a rewrite.

## Commands

```bash
npm run cap:sync:android
npm run cap:open:android
```

## Configuration

- Config file: `capacitor.config.ts`
- Android project: `android/`
- Placeholder webDir: `capacitor-www/`
- Hosted app URL: `CAPACITOR_SERVER_URL`, defaulting to `https://arahdana.id`

The placeholder webDir exists so Capacitor can sync, while the native shell loads the deployed app. This avoids forcing a static export that would break Next.js API routes and authenticated flows.

## Native UX

Implemented:

- Dark emerald splash/status/nav background.
- Status bar configured through Capacitor StatusBar.
- Splash screen configured through Capacitor SplashScreen.
- Android back button bridge:
  - closes the Menu bottom sheet first
  - navigates back when possible
  - asks before exiting on root pages
- Light haptics on taps when running in a native shell.
- Push notification dependency and Android notification permission are present for later Firebase/APNs wiring.

Still requires device QA:

- Google login redirect inside the native shell.
- Android install/open from Android Studio.
- No startup white flash on physical devices.
- App lock/biometric hardening if a native biometric plugin is selected.
