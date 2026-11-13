// Lightweight, privacy-respecting event logging for the v0 retention experiment.
// No third-party SDK: events stay in localStorage on this device (never
// uploaded) and the Stats page reads them from there.
//
// The kill/greenlight metrics from the plan are all derivable from these events:
//   - Day-1/3/7 return  -> "app_open" timestamps
//   - session completion -> "session_start" vs "session_complete"

import type { FollowUpAnswer } from "./followUps";

export type AnalyticsEvent =
  | { type: "app_open" }
  | { type: "session_start"; sessionId: string }
  | { type: "session_complete"; sessionId: string }
  | { type: "checkin_view"; emotion?: string }
  | { type: "journal_save"; context: string }
  | { type: "share_verse"; verseKey: string; where: string }
  | { type: "dhikr_start"; setId: string }
  | { type: "dhikr_complete"; setId: string }
  | { type: "read_view"; view: "translation" | "reading" }
  | { type: "account_signup"; method: "password" | "google" }
  | { type: "account_signin"; method: "password" | "google" }
  | { type: "account_signout" }
  | { type: "sync_done"; ok: boolean }
  | { type: "reminder_set"; enabled: boolean }
  | { type: "followup_shown"; verseKey: string }
  | { type: "followup_answered"; answer: FollowUpAnswer }
  | { type: "followup_skipped" };

interface StoredEvent {
  t: number; // epoch ms
  e: AnalyticsEvent;
}

/** Host hook called after each event is stored (web: console.debug in dev). */
let onTrack: ((e: AnalyticsEvent) => void) | null = null;

export function configureAnalytics(opts: {
  onTrack?: (e: AnalyticsEvent) => void;
}): void {
  onTrack = opts.onTrack ?? null;
}

const KEY = "mindfulverse.events.v1";
const FIRST_SEEN = "mindfulverse.firstSeen.v1";
/** Only the newest events are kept, so the log cannot grow without bound. */
export const MAX_EVENTS = 3000;

export function track(e: AnalyticsEvent): void {
  try {
    const raw = localStorage.getItem(KEY);
    const events: StoredEvent[] = raw ? JSON.parse(raw) : [];
    events.push({ e, t: Date.now() });
    localStorage.setItem(KEY, JSON.stringify(events.slice(-MAX_EVENTS)));
    onTrack?.(e);
  } catch {
    /* analytics must never break the app */
  }
}

export function getEvents(): StoredEvent[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as StoredEvent[]) : [];
  } catch {
    return [];
  }
}

/** Records first-seen once, then fires app_open every load. */
export function trackAppOpen(): void {
  try {
    if (!localStorage.getItem(FIRST_SEEN)) {
      localStorage.setItem(FIRST_SEEN, String(Date.now()));
    }
  } catch {
    /* storage blocked or full: still try to log the open */
  }
  track({ type: "app_open" });
}
