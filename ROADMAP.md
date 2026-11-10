# Roadmap

A **prioritized menu, not a to-do list.** Having the data is not a reason to build.

## Positioning (2026-11-07)

Quran.com is where you read. **MindfulVerse is where you sit with one surah, write the way a tadabbur journal asks you to, and get asked a week later whether you did what you wrote — all from real sources, never AI.**

Most competing tadabbur apps (Tadabbur, ReflectQ, TadabburAI, Ask Quran) generate text with AI; Quran.com notes + QuranReflect is the free, trusted alternative. The daily verse and mood picker are what everyone has, so the app leads with the surah journal and keeps those second.

## The launch test (2026-11-07) — rules written before testers arrive

|  |  |
| --- | --- |
| **Who** | 50+ installs from 3+ Qur'an study circles (Nigeria + diaspora), via the design partner and circle teachers |
| **Platforms** | Android app (Play internal → closed testing) + web app for iPhone. No paid Apple account until the bar is met |
| **Language** | English only. Hausa / Yoruba come next, starting with a licensed translation |
| **Bar** | Day-7 return ≥ 30% over 4 weeks |
| **Second signal** | ≥ 20% of people who kept an action answer its week-later follow-up |
| **Below 15%** | Stop building. Interview 5 testers who left; fix the first session |
| **15–30%** | Keep the scope; change one thing at a time |
| **Measured by** | Anonymous "active today" signal (random install id + date + platform, write-only table `active_days`) — query in `scripts/retention.sql` |
| **Before launch** | Design partner walks the full Ash-Sharh flow; the first circle's teacher reviews hand-written prompts, session intros and emotion pairings (no endorsement claimed) |

## The v0 gate — cleared (2026-09-15)

|  |  |
| --- | --- |
| **Bar** | Day-7 return ≥ 25–30% on 50+ non-friend users within ~4 weeks |
| **Outcome** | Cleared — v1 (accounts, sync, reminders) built and shipped 2026-09-15 |
| **Measured by** | Vercel Analytics (visits) + testers' `/stats` copies (behavior) |
| **Pricing** | Free for everyone, decided 2026-11-07. No subscription or paywall is planned (see v1 row 3) |

## v0 — shipped (live at mindfulverse.vercel.app)

| Feature | Notes |
| --- | --- |
| Reader (114 surahs) | Arabic (Uthmanic Hafs) + Itani/ClearQuran + Ibn Kathir, lazy-loaded, passage-grouped commentary, Arabic-only view toggle |
| Daily check-in | Rotating vetted verse of the day (139-verse pool), neutral emotion picker (12 × 5 vetted verses) |
| Tadabbur sessions | 20 sessions, verbatim assembly, progress + resume, tafsir excerpts |
| Dhikr & breath | 8 sets, breathing circle, tap counting, wake lock, adaptive sizing |
| Journal | Saved on the device first (cloud sync came in v1), verse/session attribution, export, backup nudge |
| Search + topics browse | Translation search; verses-by-topic index into the reader |
| Modern English translation | Talal Itani / ClearQuran (CC BY-NC-ND — non-commercial, which fits a free app; attribution required) |
| User-controlled dark theme | Default light, user toggle; never follows OS |
| Growth & measurement | Share-a-verse, OG preview card, PWA install prompt, `/stats`, WhatsApp feedback link, analytics |
| Identity | West African indigo, adire band, Outfit + Literata + KFGQPC Hafs, offline PWA |

## v1 — shipped 2026-09-15 (accounts, sync, reminders)

| Priority | Feature | Status | Why | Effort | Depends on |
| --- | --- | --- | --- | --- | --- |
| 1 | Accounts (email/OAuth) | **Shipped** | Identity for sync | Medium | Backend (first server component) |
| 2 | Journal cloud sync | **Shipped** | The #1 trust gap — localStorage is fragile | Medium | Accounts |
| 3 | Subscription billing | **Dropped** (2026-11-07) | MindfulVerse stays free; the $3/month willingness-to-pay question was removed. If charging is ever reconsidered, the Itani translation's non-commercial licence must be cleared first | — | — |
| 4 | Push notifications / daily reminder | **Shipped** | Biggest retention lever a PWA lacks | Medium | Backend |
| 5 | React Native app | **Built** (Android); not on the Play Store yet | Store presence, reliable notifications, better offline | High | v1 validated on web |

## Shipped since v1 (October to November 2026)

| Feature | Notes |
| --- | --- |
| Surah journal | Home begins with a surah: its background, then verse by verse with Ibn Kathir, and a page that keeps everything written on it. Web and Android |
| Week-later follow-up | "What will you do?" on surah tadabbur and theme sessions; seven days on, Home asks how it went |
| Circles | Anyone signed in can start a named circle and share a link. Joining needs no account, journals stay private, and the circle sees only an anonymous weekly count of two or more |
| Rhythm | Day count of returning, plus a private line for how many days this week a reflection was kept |
| Android app | Surah journal, theme sessions, search, circles, journal export and reminders, sharing the core with the web app |
| Daily verse API | Free, keyed, non-commercial API for other sites, at `/developers` |
| Launch measurement | Anonymous `active_days` signal on web and Android |

## v2 — deepen (pull by priority once v1 is stable)

| Priority | Feature | Unlocked by | Effort | Blocker / note |
| --- | --- | --- | --- | --- |
| 1 | New sessions on a cadence (2/week) | Themes + tafsir data | Low (authoring) | None — strongest retention play |
| 2 | Richer topic ontology (2,512 topics) | `topics.db` (unused) | Low | Enriches the existing verses-by-topic page; pipeline step + UI |
| 3 | Recitation audio + word highlighting | Timestamp data (4 reciters) | High | **Licensing first** — audio is on Tarteel's CDN, not ours |
| 4 | Related-wording links in reader | Similar-ayahs dataset | Low | Lexical matches — label "related wording," not "related meaning" |

## Later / niche

| Feature | Audience | Note |
| --- | --- | --- |
| Hausa / Yoruba | Nigeria growth base | **Next after the launch test.** Start with a licensed Hausa translation; tafsir data in those languages still unsourced |
| Arabic tafsirs (Uthaymeen, Saadi) | Arabic readers | Data already in hand |
| Mutashabihat pairs | Memorizers | Narrow but loyal audience |
| Page-accurate mushaf view | Traditionalists | Heavy; layouts + fonts in hand |
| Scholar-vetted emotion guidance | All | Needs a named scholar's endorsement — upgrade from the neutral sets |

## Not blocked by anything (do regardless)

| Task | Why it matters |
| --- | --- |
| Distribution — 50 honest non-friend testers | The entire experiment; the actual bottleneck |
| Day-3 / day-7 tester follow-ups | Where the retention data comes from |
| Written evaluation memo before data arrives | So the numbers get judged by pre-committed rules, not mood |
