// The daily verse reminder as the Account screen uses it. Server push
// (push.ts) is the main path. The phone's own daily schedule
// (localReminder.ts) stands in for builds without push, and backs push up
// when registering failed or the test push did not go out. The backstop is
// dropped once a daily verse push arrives (notifications.ts). The decisions
// live in reminderModel.ts.
import {
  disableLocalReminder,
  enableLocalReminder,
  getBackstop,
  getLocalReminder,
  setBackstop,
} from "./localReminder";
import {
  disableReminder,
  enableReminder,
  getReminder,
  pushSupport,
  updateReminderTime,
} from "./push";
import {
  dropsBackstopOnPush,
  enableOutcome,
  isLeftoverLocal,
  NOT_ALLOWED,
  shownReminder,
  timeChangeTargets,
  turnOffTargets,
} from "./reminderModel";

export async function currentReminder(): Promise<{ time: string } | null> {
  const support = pushSupport();
  const backstop = getBackstop();
  const local = getLocalReminder();
  if (isLeftoverLocal(support, backstop, local !== null)) {
    void disableLocalReminder();
  }
  const push = support === "ok" ? await getReminder().catch(() => null) : null;
  return shownReminder(support, backstop, push, local);
}

export async function turnReminderOn(
  time: string
): Promise<{ error: string | null; welcomed: boolean }> {
  const support = pushSupport();
  const result = support === "ok" ? await enableReminder(time) : null;
  const outcome = enableOutcome(support, result);
  if (outcome.kind === "refused") {
    return { error: NOT_ALLOWED, welcomed: false };
  }
  if (outcome.kind === "push") {
    // Push is enough: an on-device reminder would fire as a second one.
    await disableLocalReminder();
    return { error: null, welcomed: true };
  }
  const local = await enableLocalReminder(time);
  if (outcome.kind === "local") {
    return { error: local.error, welcomed: false };
  }
  if (local.error === null) {
    setBackstop(outcome.backstop);
    return { error: null, welcomed: false };
  }
  // No backstop could be scheduled. Push alone still stands if it registered.
  setBackstop("none");
  return { error: result?.error ?? null, welcomed: false };
}

export async function changeReminderTime(
  time: string
): Promise<{ error: string | null }> {
  const targets = timeChangeTargets(pushSupport(), getBackstop());
  if (targets.push) {
    const { error } = await updateReminderTime(time);
    if (error) {
      return { error };
    }
  }
  return targets.local ? await enableLocalReminder(time) : { error: null };
}

export async function turnReminderOff(): Promise<{ error: string | null }> {
  const targets = turnOffTargets(pushSupport());
  if (targets.push) {
    const { error } = await disableReminder();
    if (error) {
      return { error };
    }
  }
  return targets.local ? await disableLocalReminder() : { error: null };
}

/** A daily verse push reached this phone, so push works here: stop the
 *  on-device backstop for good. */
export async function pushProvenWorking(): Promise<void> {
  if (dropsBackstopOnPush(getBackstop())) {
    await disableLocalReminder();
  }
}
