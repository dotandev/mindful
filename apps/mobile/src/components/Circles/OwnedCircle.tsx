// One circle the signed-in person started: its link, Share, edit in place,
// and delete behind an inline confirm.
import {
  deleteCircle,
  joinCircle,
  updateCircle,
} from "@mindfulverse/core/circles";
import type { Circle } from "@mindfulverse/core/circles";
import type { SurahMeta } from "@mindfulverse/core/types";
import { useState } from "react";
import { Share, View } from "react-native";

import { fonts, space, useTheme } from "../../theme";
import { Button, Card, Text } from "../../ui";
import { FormError } from "../Account/parts";
import { CircleForm } from "./CircleForm";
import { circleSummary, inviteMessage, inviteUrl } from "./circleModel";
import { useCircleCountLine } from "./useCircleCount";

type Mode = "view" | "edit" | "confirm-delete";

export async function shareCircle(
  circle: Circle,
  surahs: Map<number, SurahMeta>
): Promise<boolean> {
  try {
    await Share.share({ message: inviteMessage(circle, surahs) });
    return true;
  } catch {
    return false;
  }
}

export function CircleLinkBlock({
  circle,
  surahs,
}: {
  circle: Circle;
  surahs: Map<number, SurahMeta>;
}) {
  const { colors } = useTheme();
  const [failed, setFailed] = useState(false);
  return (
    <View style={{ alignItems: "flex-start", gap: space.sm }}>
      <Text
        selectable
        accessibilityLabel={`Circle link: ${inviteUrl(circle.code)}`}
        style={{
          color: colors.indigo,
          fontFamily: fonts.readMedium,
          fontSize: 15.5,
          lineHeight: 22,
        }}
      >
        {inviteUrl(circle.code)}
      </Text>
      <Button
        kind="secondary"
        title="Share link"
        onPress={() =>
          void shareCircle(circle, surahs).then((ok) => setFailed(!ok))
        }
      />
      {failed ? <FormError message="Couldn’t open the share sheet." /> : null}
    </View>
  );
}

export function OwnedCircle({
  circle,
  surahs,
  surahList,
  joinedCode,
  onChanged,
  onDeleted,
}: {
  circle: Circle;
  surahs: Map<number, SurahMeta>;
  surahList: SurahMeta[];
  joinedCode: string | null;
  onChanged: (circle: Circle) => void;
  onDeleted: (code: string) => void;
}) {
  const { colors } = useTheme();
  const [mode, setMode] = useState<Mode>("view");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isJoined = joinedCode === circle.code;
  // The joined circle's card at the top of the screen already shows its count.
  const countLine = useCircleCountLine(isJoined ? null : circle, {
    named: false,
  });

  async function remove() {
    setBusy(true);
    setError(null);
    const result = await deleteCircle(circle.code);
    setBusy(false);
    if (result.ok) {
      onDeleted(circle.code);
      return;
    }
    setError(result.error.message);
  }

  if (mode === "edit") {
    return (
      <Card>
        <CircleForm
          surahs={surahList}
          initial={circle}
          submitTitle="Save changes"
          onCancel={() => setMode("view")}
          onSubmit={async (draft) => {
            const result = await updateCircle(circle.code, draft);
            if (result.ok) {
              onChanged(result.value);
              setMode("view");
            }
            return result;
          }}
        />
      </Card>
    );
  }

  return (
    <Card>
      <View style={{ gap: 2 }}>
        <Text style={{ fontFamily: fonts.readSemiBold }}>{circle.name}</Text>
        <Text variant="soft" style={{ fontSize: 15.5, lineHeight: 22 }}>
          {circleSummary(circle, surahs)}
        </Text>
        {countLine ? (
          <Text variant="soft" style={{ fontSize: 15.5, lineHeight: 22 }}>
            {countLine}
          </Text>
        ) : null}
      </View>
      <CircleLinkBlock circle={circle} surahs={surahs} />
      {mode === "confirm-delete" ? (
        <View style={{ gap: space.sm }}>
          <Text variant="soft" style={{ fontSize: 15.5, lineHeight: 22 }}>
            Delete this circle? Its link stops working. Members keep their
            reflections.
          </Text>
          <View
            style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}
          >
            <Button
              title="Delete"
              busy={busy}
              onPress={() => void remove()}
              style={{
                backgroundColor: colors.kola,
                borderColor: colors.kola,
              }}
            />
            <Button
              kind="ghost"
              title="Keep it"
              disabled={busy}
              onPress={() => setMode("view")}
            />
          </View>
        </View>
      ) : (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
          <Button kind="ghost" title="Edit" onPress={() => setMode("edit")} />
          {isJoined ? null : (
            <Button
              kind="ghost"
              title="Show on Home"
              onPress={() => joinCircle(circle)}
            />
          )}
          <Button
            kind="ghost"
            title="Delete"
            onPress={() => setMode("confirm-delete")}
          />
        </View>
      )}
      <FormError message={error} />
    </Card>
  );
}
