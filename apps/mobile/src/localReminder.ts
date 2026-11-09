// The daily verse reminder scheduled on the phone itself, for builds without
// push (no Firebase config yet, see push.ts). The OS fires it every day at the
// chosen time, offline, with no account needed. It can't carry the day's verse
// text, so it says the verse is waiting and opens the check-in.
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { REMINDER_CHANNEL } from "./push";

const KEY = "mindfulverse.localReminder.v1";
const ID = "daily-verse-reminder";
const TIME = /^(\d{2}):(\d{2})$/u;

export const NOT_ALLOWED = "Notifications were not allowed.";

export function getLocalReminder(): { time: string } | null {
  try {
    const time = localStorage.getItem(KEY);
    return time && TIME.test(time) ? { time } : null;
  } catch {
    return null;
  }
}

async function ensurePermission(): Promise<boolean> {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL, {
      importance: Notifications.AndroidImportance.DEFAULT,
      name: "Daily reminder",
    });
  }
  let { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") {
    ({ status } = await Notifications.requestPermissionsAsync());
  }
  return status === "granted";
}

/** Schedules (or reschedules) the reminder every day at `time` ("HH:MM"). */
export async function enableLocalReminder(
  time: string
): Promise<{ error: string | null }> {
  const match = TIME.exec(time);
  if (!match) {
    return { error: "Choose a time." };
  }
  if (!(await ensurePermission())) {
    return { error: NOT_ALLOWED };
  }
  await Notifications.cancelScheduledNotificationAsync(ID).catch(() => {});
  await Notifications.scheduleNotificationAsync({
    content: {
      body: "Today’s verse is waiting for you.",
      data: { url: "/checkin" },
      title: "MindfulVerse",
    },
    identifier: ID,
    trigger: {
      channelId: REMINDER_CHANNEL,
      hour: Number(match[1]),
      minute: Number(match[2]),
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
    },
  });
  try {
    localStorage.setItem(KEY, time);
  } catch {
    /* the schedule itself still stands */
  }
  return { error: null };
}

export async function disableLocalReminder(): Promise<{
  error: string | null;
}> {
  try {
    await Notifications.cancelScheduledNotificationAsync(ID);
  } catch {
    return { error: "Couldn’t turn it off. Try again." };
  }
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nothing scheduled any more either way */
  }
  return { error: null };
}
