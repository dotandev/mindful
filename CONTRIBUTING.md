# Contributing to MindfulVerse

Thank you for wanting to help. MindfulVerse is a small, free app for pondering the Qur'an, one surah at a time. Please read the principles below before you start. They matter more than any code style.

## Principles

1. **The Qur'an and its commentary are never changed.** Arabic text, the ClearQuran translation and Ibn Kathir's commentary are shown exactly as they are. Do not rewrite, summarise, translate or generate religious content, with AI or by hand. The translation is CC BY-NC-ND 4.0, so the credit stays visible and the text stays word for word.
2. **No AI in the product.** Prompts, session intros and pairings are written by people and reviewed by a teacher. Don't add features that generate reflections, answers or explanations.
3. **Free, with no ads.** Don't add payments, tips, ads or tracking. The only measurement is an anonymous count of the days the app is opened.
4. **Private by default.** Journals live on the device. Sync is optional, and a circle never sees what anyone writes, only an anonymous weekly count of two or more.
5. **Calm and short.** One idea per line, no guilt, no streaks that break. If a sentence can lose half its words, it should.

## Getting started

You need Node 22 or later and npm.

```bash
git clone https://github.com/mohammedfirdouss/MindfulVerse.git
cd MindfulVerse
npm install          # installs every workspace
cp .env.example .env # optional: only needed for accounts, sync and reminders
npm run dev          # the web app at http://localhost:5173
```

The whole app works signed out and offline, so most changes don't need a backend. For the Android app, follow [`apps/mobile/README.md`](apps/mobile/README.md).

### Layout

| Path | What lives there |
| --- | --- |
| `packages/core` | Shared logic with no DOM or React Native: journal, progress, circles, sync, data loaders |
| `apps/web` | The Vite + React PWA |
| `apps/mobile` | The Expo Android app (Expo Router) |
| `apps/promo` | Remotion promo videos |
| `functions/` | InsForge edge functions (the daily-verse API and reminders) |
| `migrations/` | InsForge SQL migrations |

Put logic that both apps need in `packages/core`, and keep screens thin. Web and mobile should behave the same, so a change to one usually needs the same change in the other.

## Before you open a pull request

```bash
npx ultracite fix                                # format and lint fixes
npx ultracite check                              # must be clean
npm test                                         # vitest: core, web, mobile logic, functions
npm run build                                    # core typecheck + web build
npm run typecheck -w @mindfulverse/mobile        # if you touched apps/mobile
```

- **Tests.** Pure logic gets a vitest test next to it (`*.test.ts`). Mobile screens keep their logic in plain `.ts` files so vitest can run it without React Native.
- **Accessibility.** Use real buttons and links, label form fields, give icons and dot rows an accessible label, keep touch targets at least 44px, and respect reduced motion.
- **Both themes.** Check light and night, and a 390px-wide phone.
- **Copy.** Short and plain. Read it aloud once.

## Commits and pull requests

- Branch from `main` (`feat/…`, `fix/…`, `chore/…`).
- Write one-line commit messages in the imperative that say what changed for the reader, for example `Show the starter surahs by name only`.
- Keep each pull request to one change. Say what it does, why, and how you checked it. Add a screenshot for anything visual.
- Database changes go in a new file in `migrations/` with row-level security. Anonymous access should only be able to do what the feature needs.

## Data, secrets and privacy

- Never commit keys. `.env`, `.env.local`, `apps/mobile/.env` and `google-services.json` are gitignored for a reason.
- Never use real people's journals, emails or circles in tests, fixtures or screenshots. Invent test data.
- The Qur'an data in `apps/web/public/data` is generated from source datasets that aren't in the repo. If something in it looks wrong, open an issue rather than editing the JSON by hand.

## Licence

By contributing, you agree that your code is released under the [MIT License](LICENSE). The Qur'anic text, translation, commentary and fonts are not covered by it and keep their own licences, listed at the end of the [LICENSE](LICENSE) file.

## Reporting a problem or an idea

Open an issue on GitHub with what you expected, what happened, and the device or browser you used. For content concerns (a prompt, a pairing or a session intro that reads wrongly), please say which screen and quote the line, and it will be reviewed with a teacher.

JazakAllahu khayran for your help.
