# Deutsch-Wordle — Android app

The same game as the web app, as a React Native app on **Expo SDK 57**. The game
logic and the word list are not copied: this app imports them from the repository
root, so there is one implementation of the rules and one word list.

> **Status: ready to build, not yet built.** Everything that can be checked without
> the Android SDK has been checked (see [What was verified](#what-was-verified)).
> The APK itself has never been produced, because the container this was written in
> is blocked from `dl.google.com` and so cannot install the Android SDK at all.

---

## Build the APK

### Prerequisites

| Need | Notes |
| --- | --- |
| **Node 20+** | Same as the web app |
| **JDK 17 or newer** | React Native 0.86 needs 17+. Set `JAVA_HOME` |
| **Android SDK** | Platform + build-tools. Easiest via Android Studio; set `ANDROID_HOME` (or `ANDROID_SDK_ROOT`) |
| Gradle | **Not** needed separately — the wrapper fetches Gradle 9.3.1 |

### Local build

```bash
cd mobile
npm install
npm run apk          # expo prebuild + gradlew assembleRelease
```

The APK lands at:

```
mobile/android/app/build/outputs/apk/release/app-release.apk
```

Install it with `adb install -r <that path>`, or copy it to the phone and open it
(Android will ask you to allow installing from this source).

**It is signed with Expo's bundled debug keystore**, which is what `assembleRelease`
does by default in a prebuilt Expo project. That means it installs and runs
immediately — good for your own phone — but it is not a key you would publish with.
For a real release key, generate one and wire it into
`android/app/build.gradle` per [the React Native guide](https://reactnative.dev/docs/signed-apk-android).

**Smaller APK.** The default builds four ABIs, which roughly quadruples the native
payload. For one phone, build only its architecture (almost always `arm64-v8a`):

```bash
npm run apk:arm64
```

### Cloud build (EAS)

No Android SDK needed locally:

```bash
npx eas login
npm run apk:cloud    # eas build --platform android --profile preview
```

The `preview` profile in [eas.json](eas.json) is set to `buildType: apk`, so you get
an APK rather than an AAB. `production` builds an app-bundle for the Play Store.

> **One caveat, untested.** This app imports `../src/core`, `../src/store` and
> `../src/data`, which sit outside `mobile/`. Metro is configured for that and it
> bundles correctly (verified), but EAS decides what to upload for itself. If a cloud
> build fails to resolve those paths, the documented fix is to make the repository an
> npm workspace root (`"workspaces": ["mobile"]`) so EAS treats it as a monorepo.
> The local Gradle path above has no such question mark, which is why it is listed
> first.

### Run it without building an APK

```bash
npm start            # then scan the QR code with Expo Go
```

`expo-clipboard` and AsyncStorage both work in Expo Go, so the whole game is
playable that way.

---

## What is shared with the web app

Nothing is duplicated. [metro.config.js](metro.config.js) points Metro at the
repository root and maps three aliases:

| Alias | Resolves to | What it holds |
| --- | --- | --- |
| `@core/*` | `../src/core/*` | Scoring, the game reducer, daily selection, umlaut handling |
| `@store/*` | `../src/store/*` | The persisted shape, migrations and the stats rules |
| `@data/*` | `../src/data/*` | The generated word bundles and guess dictionaries |

So a fix to the tile algorithm or a new word fixes both apps, and the 82 unit tests
at the repository root cover this app's game logic too.

Two Metro details worth knowing, both learned the hard way:

- **`src/core` is written as Node-style ESM** — its internal imports carry explicit
  `.js` extensions that actually point at `.ts` sources (`'./types.js'` → `types.ts`).
  Vite, vitest and tsx all remap that; **Metro does not**, and the bundle fails with
  "Unable to resolve module". `metro.config.js` adds a `resolveRequest` hook that
  strips the extension and lets Metro's own `sourceExts` find the TypeScript file.
- **Do not set `resolver.disableHierarchicalLookup`.** It is the usual monorepo guard
  against two copies of React, but this app has its own complete `node_modules` and
  the repository root has no React at all — so it buys nothing here and it breaks
  packages nested inside `node_modules/expo/node_modules` (`expo-asset` fails first).

## What is different from the web app

The game rules are identical — same reducer, same word list, same definition card.
The platform differences:

| | Web | Android |
| --- | --- | --- |
| Umlaut entry | On-screen keys **or** the `;a` dead key | On-screen `Ä Ö Ü ß` keys only — there is no physical keyboard to put a dead key on |
| Storage | `localStorage` | `AsyncStorage` (async, so the setup screen waits for it before a round can start) |
| Theming | CSS custom properties + media queries | A resolved token object from `useColorScheme()` — see [theme.ts](theme.ts) |
| Safe areas | n/a | `react-native-safe-area-context`. **RN's own `SafeAreaView` is a no-op on Android**, and SDK 54+ is edge-to-edge by default, so it would put the header under the status bar |
| Share | `navigator.clipboard` | `expo-clipboard` |
| Guess dictionary | One dynamic `import()` per length, so Vite code-splits it | Static imports — Metro emits one bundle either way, which is why the bytecode is 3 MB rather than 1.6 MB |

`String.prototype.normalize` is also guarded now: Hermes has historically shipped
without it, and `src/core/normalise.ts` falls back to the raw string. That is safe
rather than merely convenient — `build-words.ts` fails the build on any lemma that is
not already NFC, so on an engine without `normalize` there is nothing left to
normalise.

## What was verified

Run here, all passing:

- `npx tsc --noEmit` — clean, with `strict` plus `noUncheckedIndexedAccess`
- `npx expo export --platform android` — Metro bundles all 628 modules and **hermesc
  compiles them to Hermes bytecode** (`index.hbc`, 3 MB — most of the growth is the
  98,000-form guess dictionary), so the JS is valid for the engine that will run it
- `npx expo prebuild --platform android --clean` — generates a valid Android project;
  `applicationId com.deutschwordle.app`, `versionCode 1`, Gradle 9.3.1, new
  architecture and Hermes both on. This is also what caught a real config bug:
  `userInterfaceStyle: "automatic"` silently does nothing without `expo-system-ui`,
  which is now a dependency
- `npx expo-doctor` — 19 of 21 checks pass. The two failures are the sandbox's proxy
  blocking `api.expo.dev` and the React Native Directory, not project problems
- `npm test` at the repository root — 82 unit tests, which are this app's game logic

**Not verified, because the Android SDK cannot be installed here:** `gradlew
assembleRelease`, the APK, and anything about how it looks or feels on a real device.
The first build is where you would find a missing native dependency or a layout
problem, so expect to iterate once.
