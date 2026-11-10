// Pure decisions for the daily verse reminder: when the server push is enough
// and when the phone's own daily schedule (localReminder.ts) has to stand in
// or back it up. No React Native imports, so vitest runs it.
import type { PushSupport } from "./push";

/** The OS prompt was dismissed or refused. Callers compare against it. */
export const NOT_ALLOWED = "Notifications were not allowed.";

/** Why the on-device reminder is running next to (or instead of) push in a
 *  build that has push:
 *  - "unconfirmed": this phone is registered, but the test push did not go
 *    out, so nothing has shown yet that pushes arrive;
 *  - "push-failed": registering for push failed, so only the phone's own
 *    schedule is running. */
export type Backstop = "none" | "unconfirmed" | "push-failed";

export function parseBackstop(raw: unknown): Backstop {
  return raw === "unconfirmed" || raw === "push-failed" ? raw : "none";
}

export interface PushEnableResult {
  error: string | null;
  welcomed: boolean;
}

export type EnableOutcome =
  /** No push in this build: the phone's own schedule only. */
  | { kind: "local" }
  /** Push is registered and the test push went out: push only. */
  | { kind: "push" }
  /** Push is registered but unproven, or failed: schedule on the phone too. */
  | { kind: "backstop"; backstop: Exclude<Backstop, "none"> }
  /** The person said no to notifications: nothing is turned on. */
  | { kind: "refused" };

/** What turning the reminder on led to. `result` is enableReminder()'s, and
 *  is only looked at when this build has push. */
export function enableOutcome(
  support: PushSupport,
  result: PushEnableResult | null
): EnableOutcome {
  if (support !== "ok" || result === null) {
    return { kind: "local" };
  }
  if (result.error === NOT_ALLOWED) {
    return { kind: "refused" };
  }
  if (result.error !== null) {
    return { backstop: "push-failed", kind: "backstop" };
  }
  return result.welcomed
    ? { kind: "push" }
    : { backstop: "unconfirmed", kind: "backstop" };
}

export interface ReminderTargets {
  push: boolean;
  local: boolean;
}

/** Turning off always clears the phone's schedule too, backstop or leftover. */
export function turnOffTargets(support: PushSupport): ReminderTargets {
  return { local: true, push: support === "ok" };
}

/** A new time goes to every reminder that is running. */
export function timeChangeTargets(
  support: PushSupport,
  backstop: Backstop
): ReminderTargets {
  const push = support === "ok";
  return { local: !push || backstop !== "none", push };
}

/** Which stored reminder the screen shows as on. */
export function shownReminder<T>(
  support: PushSupport,
  backstop: Backstop,
  pushReminder: T | null,
  localReminder: T | null
): T | null {
  if (support !== "ok") {
    return localReminder;
  }
  return pushReminder ?? (backstop === "none" ? null : localReminder);
}

/** An on-device reminder left by a build without push, now that this build
 *  has it and no backstop was asked for: it would fire next to the push. */
export function isLeftoverLocal(
  support: PushSupport,
  backstop: Backstop,
  hasLocal: boolean
): boolean {
  return support === "ok" && backstop === "none" && hasLocal;
}

/** A daily verse push arrived, so push is proven to work on this phone: the
 *  backstop goes for good. A backstop kept because registering failed stays,
 *  since that push cannot be this registration's. */
export function dropsBackstopOnPush(backstop: Backstop): boolean {
  return backstop === "unconfirmed";
}

/** True for the server's daily verse push (send-reminders): it comes through
 *  push, not the phone's own schedule, and opens the check-in or a verse. */
export function isServerDailyVerse(notification: {
  viaPush: boolean;
  data: unknown;
}): boolean {
  if (!notification.viaPush) {
    return false;
  }
  const url = (notification.data as { url?: unknown } | null)?.url;
  return (
    typeof url === "string" &&
    (url === "/checkin" || url.startsWith("/tadabbur/"))
  );
}
