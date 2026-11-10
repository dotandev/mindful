// Notification presentation + tap routing.
//
// Reminder payloads carry `data.url` (Phase 3 contract): "/tadabbur/{surah}?v={ayah}"
// or "/checkin". Those are also Expo Router paths here (file routes mirror
// web's), so a tap just pushes the URL. Both entry points are covered:
//   - cold start: the response that launched the app (getLastNotificationResponse);
//   - warm: addNotificationResponseReceivedListener.
// A daily verse push that arrives (seen while the app runs, tapped, or still
// in the tray at launch) proves push works on this phone, so the on-device
// backstop reminder is dropped (reminder.ts).
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import type { Href } from "expo-router";
import { useEffect } from "react";
import { Platform } from "react-native";

import { pushProvenWorking } from "./reminder";
import { isServerDailyVerse } from "./reminderModel";

// Foreground presentation. shouldShowAlert is deprecated in SDK 57 (F5).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/** Only in-app paths: never let a payload open an arbitrary scheme. */
export function routeForNotification(data: unknown): string | null {
  const url = (data as { url?: unknown } | null)?.url;
  if (typeof url !== "string" || !url.startsWith("/") || url.startsWith("//")) {
    return null;
  }
  return url;
}

function notePush(notification: Notifications.Notification): void {
  const { content, trigger } = notification.request;
  const viaPush =
    trigger !== null && "type" in trigger && trigger.type === "push";
  if (isServerDailyVerse({ data: content.data, viaPush })) {
    void pushProvenWorking().catch(() => {});
  }
}

const handled = new Set<string>();

function open(response: Notifications.NotificationResponse | null): void {
  if (
    !response ||
    response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER
  ) {
    return;
  }
  // The on-device reminder reuses one identifier every day, so the delivery
  // date tells one day's tap from the next.
  const { date, request } = response.notification;
  const key = `${request.identifier}:${date}`;
  if (handled.has(key)) {
    return;
  } // cold-start response can also reach the listener
  handled.add(key);
  notePush(response.notification);
  // Forget it natively too: `handled` lives in JS memory, so after a JS reload
  // (dev reload, an update) getLastNotificationResponse() would return the same
  // tap again and re-route. Best effort (SDK 57: clearLastNotificationResponse;
  // the Async variant is deprecated).
  try {
    Notifications.clearLastNotificationResponse();
  } catch {
    /* not available on this platform */
  }
  const url = routeForNotification(response.notification.request.content.data);
  if (url) {
    router.push(url as Href);
  }
}

/** Mount once, inside the root navigator (app/_layout.tsx). */
export function useNotificationRouting(): void {
  useEffect(() => {
    if (Platform.OS === "web") {
      return;
    } // the browser design preview has no notifications
    open(Notifications.getLastNotificationResponse());
    const sub = Notifications.addNotificationResponseReceivedListener(open);
    const received = Notifications.addNotificationReceivedListener(notePush);
    // Pushes delivered while the app was closed never reach the listener.
    void Notifications.getPresentedNotificationsAsync()
      .then((shown) => {
        for (const notification of shown) {
          notePush(notification);
        }
      })
      .catch(() => {});
    return () => {
      sub.remove();
      received.remove();
    };
  }, []);
}
