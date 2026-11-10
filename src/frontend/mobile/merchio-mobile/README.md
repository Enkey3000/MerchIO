# MerchIO Mobile (React Native · Expo) — Android & iOS

One JavaScript codebase for both platforms. Same business logic as the MerchIO web app (validation, stock effects, workflow automation, scheduler, chatbot, CSV import/export, backup/restore).

## Run it
```bash
npm install
npx expo install --fix      # aligns native package versions with your Expo SDK
npx expo start              # press a (Android emulator), i (iOS simulator), or scan the QR code in Expo Go
```

## Build installable apps (EAS)
```bash
npm i -g eas-cli && eas login
eas build -p android --profile preview   # APK for testing
eas build -p ios --profile preview       # needs an Apple Developer account
```
Bundle ids are `com.merchio.app` (change in `app.json`).

## Structure
- `App.js` — shell: header, bottom tabs, stack navigation, Android back button, theme
- `src/engine.js` — data store (AsyncStorage), seed data, module schemas, validation, automation, CSV, backup
- `src/screens.js` — Home, module lists, record form, ticket thread, notifications, chatbot, subscription, settings, chart builder, search
- `src/ui.js` — theme (logo colors), buttons, cards, pills, pickers, simple charts
- `assets/` — your original logo, app icon, adaptive icon, splash
- `preview/` — builds `merchio-mobile-preview.html` (`npm run preview`) so you can revise and test in a browser

## Notes
- Data is stored on-device (AsyncStorage). There is no server yet — see the backend plan for the API/sync layer.
- `src/engine.js` was generated from the web app logic; edit it directly from here on.
- Left out vs. the web app: Trending page, drag-and-drop pipeline (use "Next stage →"), calendar grid (appointments are a date-sorted list), file downloads (CSV/backup use copy-paste sheets).
