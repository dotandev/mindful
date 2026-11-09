import {
  resolveOwnerMismatch,
  statusLabel,
  syncNow,
} from "@mindfulverse/core/sync/engine";
import type { SyncStatus } from "@mindfulverse/core/sync/engine";
// Backup status, "Sync now", and the switched-account standoff (this
// device's data was written under another account). Same flow and copy as
// web's Account.tsx; window.confirm becomes Alert.alert.
import { useState } from "react";
import { Alert, View } from "react-native";

import { space } from "../../theme";
import { Button, Text } from "../../ui";
import { NETWORK_ERROR } from "./logic";
import { FormError, Notice } from "./parts";

function confirmFresh(): Promise<boolean> {
  return new Promise((resolve) =>
    Alert.alert(
      "Start fresh?",
      "This clears this device. The other account’s backup stays safe.",
      [
        { onPress: () => resolve(false), style: "cancel", text: "Cancel" },
        {
          onPress: () => resolve(true),
          style: "destructive",
          text: "Start fresh",
        },
      ],
      { cancelable: true, onDismiss: () => resolve(false) }
    )
  );
}

export function SyncSection({
  status,
  setNotice,
}: {
  status: SyncStatus;
  setNotice: (n: string | null) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const label = statusLabel(status);

  async function resolveSwitch(choice: "merge" | "fresh") {
    if (choice === "fresh" && !(await confirmFresh())) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await resolveOwnerMismatch(choice);
      setNotice(
        choice === "merge"
          ? "Merged into your account."
          : "This device now shows this account’s backup."
      );
    } catch {
      // resolveOwnerMismatch's own sync swallows errors; this covers the
      // auth lookup before it.
      setError(NETWORK_ERROR);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ gap: space.md }}>
      {label ? (
        <Text variant="soft" accessibilityLiveRegion="polite">
          {label}
        </Text>
      ) : null}

      {status === "switched-account" ? (
        <Notice>
          <Text variant="soft">
            This device has entries from another account. Nothing syncs until
            you choose.
          </Text>
          <View
            style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}
          >
            <Button
              title="Merge them"
              disabled={busy}
              busy={busy}
              onPress={() => void resolveSwitch("merge")}
            />
            <Button
              title="Start fresh"
              kind="secondary"
              disabled={busy}
              onPress={() => void resolveSwitch("fresh")}
              accessibilityHint="Asks for confirmation, then removes this device's entries and progress"
            />
          </View>
        </Notice>
      ) : null}

      <FormError message={error} />

      <View style={{ flexDirection: "row" }}>
        <Button
          title="Sync now"
          kind="secondary"
          disabled={status === "syncing" || busy}
          busy={status === "syncing"}
          // syncNow never throws: failures land in the status line above.
          onPress={() => void syncNow().catch(() => {})}
        />
      </View>
    </View>
  );
}
