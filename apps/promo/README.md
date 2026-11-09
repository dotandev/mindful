# MindfulVerse promos

Motion promos rendered with [Remotion](https://www.remotion.dev), using the app's own mark (`packages/core/brand.ts`), fonts and palette.

```bash
npm run studio -w @mindfulverse/promo   # preview and scrub in the browser
npm run render -w @mindfulverse/promo   # out/heart-promo.mp4, 1080x1920, 30 fps
```

## HeartPromo (44 s, 9:16, with nasheed)

Story: hook ("What if the Qur'an asked how you're doing first?"), pain at night (meant to read, felt like a lot, scrolled instead, further away), the question turns the screen to daylight, a tap on "Weary" (Ad-Duha 93:3), "Or maybe today feels different", a tap on "Anxious" (Ash-Sharh 94:6), "One verse. One minute.", what else is inside (read, ponder, keep), then the تدبر mark and the call to action. Scene lengths live in `SCENES` in `src/HeartPromo.tsx`.

Audio: "Alhamdulilah (Vocal Only Nasheed)" by Jawad Syed, CC BY 3.0, faded in and out in the video. The licence requires credit: it is on the closing card, and any caption or post should carry it too. See `public/audio/CREDITS.md`.

## WhatsNew (66.5 s, 9:16, with nasheed)

Story: one message, "Read a surah together, each in your own words." Hook on indigo ("Reading the Qur'an is better together."), the تدبر mark and "What's new in MindfulVerse", the pain (a surah opened alone, chat bubbles pulling away), "Now there are circles.", then the circle flow on real screens: name it and pick Al-Kahf, share the link, a friend's Home ("Al-Noor halaqa is reading Al-Kahf"), pondering a verse with Ibn Kathir, the privacy line, and the anonymous weekly count. "Also new" tours Home's surah lead, the private week dots, session actions and their follow-up a week later, the Android app (surah page, sessions, search) and Circles in the desktop sidebar. It closes on "Start a circle." and the end card. Scene lengths live in `LENGTHS` in `src/WhatsNew.tsx`.

Screens come from `scripts/capture-whatsnew.mjs` (output in `public/screens/whatsnew`, with measured positions in `layout.json`). It seeds invented localStorage data (a circle "Al-Noor halaqa", journal entries, a session draft) and answers every InsForge request with `page.route`, including a fake signed-in test account for the "Start a circle" form, so nothing reaches the real backend. It needs the web preview and the Expo web server running:

```bash
npm run build                                                        # repo root
npx vite preview --config apps/web/vite.config.ts --port 4300 --strictPort apps/web
(cd apps/mobile && CI=1 npx expo start --web --port 8099)            # Android screens
npm run capture:whatsnew -w @mindfulverse/promo                      # SKIP_MOBILE=1 to skip Expo
npm run render:whatsnew -w @mindfulverse/promo                       # out/whats-new.mp4
npm run render:whatsnew:silent -w @mindfulverse/promo                # out/whats-new-silent.mp4
```

Audio: the 46 s nasheed plays twice, crossfaded over two seconds, and fades out on the end card. The licence (CC BY 3.0) requires credit: the end card of `WhatsNew` reads "Nasheed: “Alhamdulilah” by Jawad Syed, CC BY 3.0", and any caption or post using the video should carry it too. `WhatsNewSilent` has no music and no credit line. See `public/audio/CREDITS.md`.
