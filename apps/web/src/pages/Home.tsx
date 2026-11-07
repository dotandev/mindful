import { getCircleSurah, STARTER_SURAHS } from "@mindfulverse/core/circleSurah";
import { todayVerseKey } from "@mindfulverse/core/dailyVerse";
import { loadAyahsByKeys, loadSurahs } from "@mindfulverse/core/data";
import { checkedInToday } from "@mindfulverse/core/journal";
import {
  currentStreak,
  getLastRead,
  latestSurahTadabbur,
} from "@mindfulverse/core/progress";
import { useAccount } from "@mindfulverse/core/sync/auth";
import { TRANSLATION_SOURCE_URL } from "@mindfulverse/core/translation";
import type { Ayah, SurahMeta } from "@mindfulverse/core/types";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import {
  ChevronIcon,
  DhikrIcon,
  DyeRule,
  ReadIcon,
  TadabburIcon,
} from "../components/Adire";
import FollowUpCard from "../components/FollowUpCard";
import { usePrefersReducedMotion } from "../lib/usePrefersReducedMotion";
import { starterLabel, surahLabel } from "./home-lead";

import "./home.css";

function greeting(hour: number): string {
  if (hour < 5) {
    return "Peace be upon you tonight";
  }
  if (hour < 12) {
    return "Peace be upon you this morning";
  }
  if (hour < 18) {
    return "Peace be upon you today";
  }
  return "Peace be upon you this evening";
}

// The surah journal leads; these are
// the places to go when there is more time, or a need.
// An entry with `soon` renders inert, with a "Soon" pill instead of a chevron.
interface Entry {
  to: string;
  title: string;
  desc: string;
  Icon: () => JSX.Element;
  soon?: boolean;
}

const entries: Entry[] = [
  {
    Icon: TadabburIcon,
    desc: "Ponder the Qur’an, surah by surah.",
    title: "Tadabbur",
    to: "/sessions",
  },
  {
    Icon: ReadIcon,
    desc: "The Qur’an, with translation and commentary.",
    title: "Read",
    to: "/read",
  },
  {
    Icon: DhikrIcon,
    desc: "Remembrance, paced to your breath.",
    title: "Dhikr & breath",
    to: "/dhikr",
  },
];

const LEAD_LINE =
  "Write why you’re reading, ponder it verse by verse with Ibn Kathir, and keep a page for it. A week later, we’ll ask how your action went.";

function whereYouAre(ayah: number, meta: SurahMeta | undefined): string {
  if (!meta) {
    return `You’ve pondered up to verse ${ayah}.`;
  }
  if (ayah >= meta.ayahCount) {
    return `You’ve pondered all ${meta.ayahCount} verses.`;
  }
  return `Verse ${ayah} of ${meta.ayahCount}`;
}

function SurahLead({
  surahs,
}: {
  surahs: Map<number, SurahMeta>;
}): JSX.Element {
  const current = latestSurahTadabbur();
  if (current) {
    const meta = surahs.get(current.surah);
    const name = surahLabel(current.surah, meta);
    return (
      <section aria-label="Your surah" className="cloth home-lead fade-rise">
        <p className="cloth-eyebrow">Your surah</p>
        <h2 className="home-lead-title">Continue {name}</h2>
        <p className="cloth-soft home-lead-line">
          {whereYouAre(current.ayah, meta)}
        </p>
        <div className="home-lead-actions">
          <Link
            to={`/tadabbur/${current.surah}?v=${current.ayah}`}
            className="btn cloth-btn"
          >
            Resume
          </Link>
          <Link
            to={`/tadabbur/${current.surah}/journal`}
            className="home-lead-quiet"
          >
            Your page for {name}
          </Link>
        </div>
      </section>
    );
  }
  const circle = getCircleSurah();
  if (circle) {
    const name = surahLabel(circle.surah, surahs.get(circle.surah));
    return (
      <section
        aria-label="Your circle is reading"
        className="cloth home-lead fade-rise"
      >
        <p className="cloth-eyebrow">Your circle is reading</p>
        <h2 className="home-lead-title">{name}</h2>
        <p className="cloth-soft home-lead-line">{LEAD_LINE}</p>
        <div className="home-lead-actions">
          <Link to={`/tadabbur/${circle.surah}`} className="btn cloth-btn">
            Begin {name}
          </Link>
          <Link to="/sessions" className="home-lead-quiet">
            Choose another surah
          </Link>
        </div>
      </section>
    );
  }
  return (
    <section
      aria-label="Begin with a surah"
      className="cloth home-lead fade-rise"
    >
      <h2 className="home-lead-title">Begin with a surah</h2>
      <p className="cloth-soft home-lead-line">{LEAD_LINE}</p>
      <h3 id="home-starters" className="home-lead-subhead">
        Short surahs to begin with
      </h3>
      <ul aria-labelledby="home-starters" className="home-lead-suggestions">
        {STARTER_SURAHS.map((n) => (
          <li key={n}>
            <Link to={`/tadabbur/${n}`} className="btn cloth-btn">
              {starterLabel(n, surahs.get(n))}
            </Link>
          </li>
        ))}
      </ul>
      <Link to="/sessions" className="home-lead-quiet">
        Choose another surah
      </Link>
    </section>
  );
}

export default function Home() {
  const { user, loading: accountLoading } = useAccount();
  const accountId = user?.id ?? null;
  const [hero, setHero] = useState<Ayah | null>(null);
  const [surahs, setSurahs] = useState<Map<number, SurahMeta>>(new Map());
  const [mounted, setMounted] = useState(false);
  const reduced = usePrefersReducedMotion();
  const surahNames = useMemo(
    () => new Map([...surahs.values()].map((s) => [s.number, s.name])),
    [surahs]
  );

  useEffect(() => {
    document.title = "MindfulVerse";
  }, []);

  useEffect(() => {
    let active = true;
    loadSurahs()
      .then((list) => {
        if (active) {
          setSurahs(new Map(list.map((s) => [s.number, s])));
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    // Today's verse — from anywhere in the Qur'an, same as the check-in page.
    // Each person has their own; wait for the account so it doesn't flip.
    if (accountLoading) {
      return;
    }
    todayVerseKey(accountId)
      .then((key) => loadAyahsByKeys([key]))
      .then((a) => {
        if (active) {
          setHero(a[0] ?? null);
        }
      })
      .catch(() => {});
    const id = requestAnimationFrame(() => active && setMounted(true));
    return () => {
      active = false;
      cancelAnimationFrame(id);
    };
  }, [accountId, accountLoading]);

  const reveal = (delay: number): React.CSSProperties =>
    reduced
      ? { opacity: mounted ? 1 : 0, transition: "opacity .5s ease" }
      : {
          opacity: mounted ? 1 : 0,
          transform: mounted ? "none" : "translateY(10px)",
          transition:
            "opacity .6s var(--ease-out), transform .6s var(--ease-out)",
          transitionDelay: `${delay}ms`,
        };

  // oxlint-disable-next-line react/purity -- the greeting follows the clock on each render
  const hours = new Date().getHours();
  const streak = currentStreak();
  const lastRead = getLastRead();
  const doneToday = checkedInToday();
  const surahName = hero ? (surahs.get(hero.surah)?.name ?? "") : "";
  const navEntries: Entry[] = lastRead
    ? entries.map((e) =>
        e.to === "/read"
          ? {
              ...e,
              desc: `Pick up at Surah ${lastRead.surah}, verse ${lastRead.ayah}`,
              to: `/read/${lastRead.surah}?v=${lastRead.ayah}`,
            }
          : e
      )
    : entries;

  return (
    <div className="home">
      <header style={reveal(0)}>
        <p className="home-date">{todayLabel()}</p>
        <h1 className="home-greeting">{greeting(hours)}</h1>
      </header>

      {streak >= 2 && (
        <p className="home-streak soft" style={reveal(60)}>
          <span className="home-beads" aria-hidden="true">
            {Array.from({ length: 7 }, (_, i) => (
              <i
                key={i}
                className={i < Math.min(streak, 7) ? "on" : undefined}
              />
            ))}
          </span>
          Day {streak} of returning to the Qur’an
        </p>
      )}

      <SurahLead surahs={surahs} />

      <FollowUpCard surahNames={surahNames} />

      <section aria-label="Today’s verse" className="card home-verse">
        <p className="eyebrow home-verse-eyebrow">Today’s verse</p>
        {hero ? (
          <>
            <p className="arabic" lang="ar" dir="rtl">
              {hero.arabic}
            </p>
            <p className="translation home-verse-translation">
              {hero.translation}
            </p>
            <p className="muted home-verse-ref">
              {surahName ? `${surahName} ` : ""}
              {hero.surah}:{hero.ayah}
            </p>
          </>
        ) : (
          <p className="muted">Opening today’s verse…</p>
        )}

        <div className="home-today">
          {doneToday ? (
            <p className="soft" style={{ margin: 0 }}>
              Today’s reflection is saved.
            </p>
          ) : (
            <Link to="/checkin" className="btn secondary">
              Reflect on today’s verse
            </Link>
          )}
        </div>
      </section>

      <nav aria-label="Sections" className="home-entries" style={reveal(260)}>
        {navEntries.map((e) => {
          const body = (
            <>
              <span className="home-entry-well" aria-hidden="true">
                <e.Icon />
              </span>
              <span className="home-entry-text">
                <span className="home-entry-title">{e.title}</span>
                <span className="home-entry-desc">{e.desc}</span>
              </span>
              {e.soon ? (
                <span className="home-entry-soon">Soon</span>
              ) : (
                <span className="home-entry-chevron" aria-hidden="true">
                  <ChevronIcon />
                </span>
              )}
            </>
          );
          return e.soon ? (
            <div key={e.to} className="home-entry inert">
              {body}
            </div>
          ) : (
            <Link key={e.to} to={e.to} className="home-entry">
              {body}
            </Link>
          );
        })}
      </nav>

      <footer style={reveal(320)}>
        <DyeRule />
        {/* Required attribution — the translation is CC BY-NC-ND. */}
        <p className="muted home-attribution">
          English translation by{" "}
          <a
            href={TRANSLATION_SOURCE_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            Talal Itani (ClearQuran)
          </a>
          {" · "}
          <Link to="/developers">For developers</Link>
        </p>
      </footer>
    </div>
  );
}

/** "Wednesday 7 October" in the browser's language. */
function todayLabel(): string {
  try {
    return new Date().toLocaleDateString(undefined, {
      day: "numeric",
      month: "long",
      weekday: "long",
    });
  } catch {
    return new Date().toDateString();
  }
}
