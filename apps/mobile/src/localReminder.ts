// The daily verse reminder scheduled on the phone itself. The OS fires it every
// day at the chosen time, offline. It can't carry the day's verse text, so it
// says the verse is waiting and opens the check-in.
// It runs alone in builds without push. In builds with push it is a backstop:
// reminder.ts schedules it when registering for push failed or the test push
// did not go out, and remembers why (the backstop flag below). Once a daily
// verse push arrives, the backstop is cancelled so only one reminder shows.
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { REMINDER_CHANNEL } from "./push";
import { NOT_ALLOWED, parseBackstop } from "./reminderModel";
import type { Backstop } from "./reminderModel";

const KEY = "mindfulverse.localReminder.v1";
const BACKSTOP_KEY = "mindfulverse.reminderBackstop.v1";
const ID = "daily-verse-reminder";
const TIME = /^(\d{2}):(\d{2})$/u;

export function getLocalReminder(): { time: string } | null {
  try {
    const time = localStorage.getItem(KEY);
    return time && TIME.test(time) ? { time } : null;
  } catch {
    return null;
  }
}

/** Why this reminder is running next to push, or "none". */
export function getBackstop(): Backstop {
  try {
    return parseBackstop(localStorage.getItem(BACKSTOP_KEY));
  } catch {
    return "none";
  }
}

export function setBackstop(backstop: Backstop): void {
  try {
    if (backstop === "none") {
      localStorage.removeItem(BACKSTOP_KEY);
    } else {
      localStorage.setItem(BACKSTOP_KEY, backstop);
    }
  } catch {
    /* read back as "none": the reminder is then treated as a leftover */
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
  setBackstop("none");
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nothing scheduled any more either way */
  }
  return { error: null };
}
