import { track } from "@mindfulverse/core/analytics";
import * as Notifications from "expo-notifications";
// Daily verse reminder: enable at a chosen time, change the time, turn off.
// Ported from web's Account.tsx over src/push.ts (same results). Native
// differences: no "install to Home Screen" / unsupported-browser branches;
// instead a build without push (pushSupport() other than "ok") schedules the
// reminder on the phone itself (localReminder.ts), and a permission the OS
// will no longer prompt for can only be fixed in Settings.
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Linking, View } from "react-native";

import {
  disableLocalReminder,
  enableLocalReminder,
  getLocalReminder,
} from "../../localReminder";
import {
  disableReminder,
  enableReminder,
  getReminder,
  pushSupport,
  updateReminderTime,
} from "../../push";
import { space } from "../../theme";
import { Button } from "../../ui";
import { DEFAULT_REMINDER_TIME, notificationsBlocked } from "./logic";
import { FormError, LinkButton, Section, Small } from "./parts";
import { TimeStepper } from "./TimeStepper";

const NOT_ALLOWED = "Notifications were not allowed."; // push.ts's message for a refused prompt

interface ReminderApi {
  get: () => Promise<{ time: string } | null>;
  enable: (
    time: string
  ) => Promise<{ error: string | null; welcomed?: boolean }>;
  update: (time: string) => Promise<{ error: string | null }>;
  disable: () => Promise<{ error: string | null }>;
}

// Push from the server when this build has it; otherwise the phone's own
// daily schedule, so the reminder works either way.
const PUSH: ReminderApi = {
  disable: disableReminder,
  enable: enableReminder,
  get: getReminder,
  update: updateReminderTime,
};
const LOCAL: ReminderApi = {
  disable: disableLocalReminder,
  enable: enableLocalReminder,
  get: async () => getLocalReminder(),
  update: enableLocalReminder,
};

async function permissionBlocked(): Promise<boolean> {
  try {
    return notificationsBlocked(await Notifications.getPermissionsAsync());
  } catch {
    return false;
  }
}

export function ReminderSection() {
  const api = pushSupport() === "ok" ? PUSH : LOCAL;
  const [reminderOn, setReminderOn] = useState(false);
  const [reminderTime, setReminderTime] = useState(DEFAULT_REMINDER_TIME);
  // The time last saved to the subscription; a "Save" appears only when the
  // picker differs from it.
  const [savedTime, setSavedTime] = useState(DEFAULT_REMINDER_TIME);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);
  const mounted = useRef(true);
  useEffect(() => () => void (mounted.current = false), []);

  const recheckPermission = useCallback(() => {
    void permissionBlocked().then((b) => mounted.current && setBlocked(b));
  }, []);

  useEffect(() => {
    recheckPermission();
    api
      .get()
      .then((r) => {
        if (r && mounted.current) {
          setReminderOn(true);
          setReminderTime(r.time);
          setSavedTime(r.time);
        }
      })
      .catch(() => {
        /* no existing subscription on this device — leave defaults */
      });
    // Coming back from Settings may have unblocked notifications.
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") {
        recheckPermission();
      }
    });
    return () => sub.remove();
  }, [api, recheckPermission]);

  async function turnOn() {
    setBusy(true);
    setError(null);
    try {
      const { error: failure, welcomed } = await api.enable(reminderTime);
      if (failure) {
        if (await permissionBlocked()) {
          setBlocked(true);
        } else if (failure === NOT_ALLOWED)
        // Prompt dismissed or refused once: the OS can still ask again.
        {
          setError(
            "Notifications weren't allowed. Try again and choose Allow."
          );
        } else {
          setError(failure);
        }
        return;
      }
      track({ enabled: true, type: "reminder_set" });
      setReminderOn(true);
      setSavedTime(reminderTime);
      setNotice(welcomed ? "Sent today’s verse so you can see it." : null);
    } catch {
      setError("Couldn't set the reminder. Try again.");
    } finally {
      if (mounted.current) {
        setBusy(false);
      }
    }
  }

  async function turnOff() {
    setBusy(true);
    setError(null);
    try {
      const { error: offError } = await api.disable();
      if (offError) {
        setError("Couldn't turn it off. Try again.");
        return;
      }
      track({ enabled: false, type: "reminder_set" });
      setReminderOn(false);
      setNotice(null);
    } catch {
      setError("Couldn't turn it off. Try again.");
    } finally {
      if (mounted.current) {
        setBusy(false);
      }
    }
  }

  // With the reminder on, a new time must reach the stored subscription,
  // otherwise pushes keep firing at the old time. Committed by an explicit
  // Save (web commits on blur) so stepper taps don't race network writes.
  async function saveTime() {
    if (!reminderOn || reminderTime === savedTime) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { error: failure } = await api.update(reminderTime);
      if (failure) {
        return setError(failure);
      }
      setSavedTime(reminderTime);
      setNotice("Saved.");
    } catch {
      setError("Couldn't save the time. Try again.");
    } finally {
      if (mounted.current) {
        setBusy(false);
      }
    }
  }

  const dirty = reminderOn && reminderTime !== savedTime;
  return (
    <Section title="Daily verse reminder" aside={reminderOn ? "On" : undefined}>
      {blocked && !reminderOn ? (
        <View style={{ alignItems: "flex-start", gap: space.sm }}>
          <Small>
            Notifications are off for MindfulVerse. Allow them in Settings.
          </Small>
          <Button
            title="Open settings"
            kind="secondary"
            onPress={() => void Linking.openSettings().catch(() => {})}
            accessibilityHint="Opens this app's system settings"
          />
        </View>
      ) : null}

      {!blocked && !reminderOn ? (
        <>
          <TimeStepper
            label="Remind me at"
            value={reminderTime}
            onChange={setReminderTime}
            disabled={busy}
          />
          <View style={{ flexDirection: "row" }}>
            <Button
              title={busy ? "Turning on…" : "Turn on"}
              busy={busy}
              onPress={() => void turnOn()}
            />
          </View>
        </>
      ) : null}

      {reminderOn ? (
        <>
          <TimeStepper
            label="Every day at"
            value={reminderTime}
            onChange={(t) => {
              setReminderTime(t);
              setNotice(null);
            }}
            disabled={busy}
          />
          <View
            style={{
              alignItems: "center",
              flexDirection: "row",
              flexWrap: "wrap",
              gap: space.md,
            }}
          >
            {dirty ? (
              <>
                <Button
                  title="Save"
                  busy={busy}
                  onPress={() => void saveTime()}
                />
                <LinkButton
                  title="Cancel"
                  disabled={busy}
                  onPress={() => setReminderTime(savedTime)}
                />
              </>
            ) : (
              <LinkButton
                title="Turn off"
                disabled={busy}
                onPress={() => void turnOff()}
                hint="Stops the daily reminder on this phone"
              />
            )}
          </View>
        </>
      ) : null}

      {notice ? <Small>{notice}</Small> : null}
      <FormError message={error} />
    </Section>
  );
}
