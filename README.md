# Tempo

A Strava-style training log for iOS and Android, built with Expo (SDK 57) and Expo Router.

- **Record** runs, rides, walks, hikes and swims with live GPS: a map that follows you, your route drawn as you go, distance, current pace and average pace. Pause, resume, finish or discard.
- **Import GPX** files from Garmin, Coros, Apple Health or a Strava export, or **log a session by hand**.
- **Feed** of your activities with route drawings and this week's distance against your weekly goal.
- **Activity page** with a map coloured slow→fast, an elevation profile and per-km/mile splits (fastest split highlighted).
- **Progress**: 12-week distance chart with goal line, year totals, week streak, and best efforts (fastest 1 km, mile, 5K, 10K, half and full marathon found inside your routes; 10–100 km for rides).
- km/mi toggle, light and dark mode. Everything is stored on the phone.

Until you save your first activity the app shows clearly labelled example activities, so every screen has something to look at.

## Run it on your phone

You need Node 20+ and the **Expo Go** app on your phone.

```bash
npm install
npx expo start
```

Scan the QR code with the Camera app (iOS) or Expo Go (Android). In Expo Go, recording works while the app is open on screen: Tempo keeps the screen awake while it records.

## Record with the screen locked

Background GPS (keep recording in your pocket with the screen off) needs a **development build**, because Expo Go can't run background location. The permissions and the Android foreground-service notification are already configured in `app.json`.

```bash
npx expo run:ios        # needs Xcode
npx expo run:android    # needs Android Studio
# or build in the cloud, no local toolchain:
npx eas-cli@latest build --profile development
```

When you press Start, Tempo asks for location access and then for "Always" access. With "Always" it records in the background and shows the system location indicator (iOS) or a "Tempo is recording" notification (Android). If you only allow "While Using", it falls back to on-screen recording.

If the app is closed mid-recording, the recording is restored the next time you open it.

**Android maps:** for a development or store build on Android, react-native-maps needs a Google Maps API key in `app.json` under `expo.android.config.googleMaps.apiKey`. Expo Go and iOS (Apple Maps) work without one.

## Before publishing

Replace the placeholder icons in `assets/`.

## Project layout

```
src/app/                 screens (Expo Router)
  (tabs)/index.tsx       feed
  (tabs)/record.tsx      live recording, GPX import, manual entry
  (tabs)/progress.tsx    weekly chart, totals, best efforts
  activity/[id].tsx      activity detail
  save.tsx               review and save an activity
src/components/          maps, route drawings, charts, UI pieces
src/lib/
  recorder.ts            GPS recording (background task + foreground fallback)
  geo.ts                 distance, climb, splits, best efforts, moving time
  gpx.ts                 GPX parser
  stats.ts               weekly totals, streaks, records
  store.ts               on-device storage (AsyncStorage)
  examples.ts            generated example activities
```

## Checks

```bash
npm test           # unit tests for the GPS maths, GPX parser and stats
npm run typecheck
npm run lint
```

`npx expo start --web` runs a browser preview for layout work. Maps and live GPS are phone-only, so the web preview draws routes without map tiles.
