// Start or change a circle: name, surah, optional focus verse. Used for both,
// so the owner edits with the same fields they created with.
import { CIRCLE_NAME_MAX, normalizeName } from "@mindfulverse/core/circles";
import type {
  CircleDraft,
  CircleResult,
  Circle,
} from "@mindfulverse/core/circles";
import type { SurahMeta } from "@mindfulverse/core/types";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { fonts, radius, space, useTheme } from "../../theme";
import { Button, Text } from "../../ui";
import { Field, FormError } from "../Account/parts";
import { checkFocusVerse } from "./circleModel";
import { SurahPicker } from "./SurahPicker";

export function CircleForm({
  surahs,
  initial,
  submitTitle,
  onSubmit,
  onCancel,
}: {
  surahs: SurahMeta[];
  initial?: Pick<Circle, "name" | "surah" | "verse">;
  submitTitle: string;
  onSubmit: (draft: CircleDraft) => Promise<CircleResult<Circle>>;
  onCancel?: () => void;
}) {
  const { colors } = useTheme();
  const [name, setName] = useState(initial?.name ?? "");
  const [surah, setSurah] = useState<number | null>(initial?.surah ?? null);
  const [verse, setVerse] = useState(
    initial?.verse === null || initial?.verse === undefined
      ? ""
      : String(initial.verse)
  );
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const meta = surahs.find((s) => s.number === surah);
  const verseCheck = checkFocusVerse(verse, meta?.ayahCount);
  const verseError = verseCheck.ok ? null : verseCheck.message;

  async function submit() {
    setError(null);
    const cleanName = normalizeName(name);
    if (cleanName === null) {
      setError("Give the circle a name.");
      return;
    }
    if (surah === null) {
      setError("Choose a surah.");
      return;
    }
    if (!verseCheck.ok) {
      setError(verseCheck.message);
      return;
    }
    setBusy(true);
    const result = await onSubmit({
      name: cleanName,
      surah,
      verse: verseCheck.verse,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error.message);
    }
  }

  return (
    <View style={{ gap: space.md }}>
      <Field
        label="Circle name"
        value={name}
        onChangeText={setName}
        maxLength={CIRCLE_NAME_MAX}
        placeholder="Friday friends"
        autoCapitalize="words"
        returnKeyType="done"
      />

      <View style={{ gap: space.xs }}>
        <Text
          variant="eyebrow"
          importantForAccessibility="no"
          accessibilityElementsHidden
        >
          Surah
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            meta ? `Surah: ${meta.name}. Change surah` : "Choose a surah"
          }
          disabled={surahs.length === 0}
          onPress={() => setPicking(true)}
          style={({ pressed }) => ({
            backgroundColor: pressed ? colors.indigoWash : colors.cottonRaised,
            borderColor: colors.lineStrong,
            borderRadius: radius.sm,
            borderWidth: 1,
            justifyContent: "center",
            minHeight: 48,
            paddingHorizontal: 14,
            paddingVertical: 10,
          })}
        >
          <Text
            style={{
              color: meta ? colors.ink : colors.inkFaint,
              fontFamily: fonts.read,
            }}
          >
            {meta
              ? `${meta.name} · ${meta.ayahCount} verses`
              : surahs.length === 0
                ? "Gathering the surahs…"
                : "Choose a surah"}
          </Text>
        </Pressable>
      </View>

      <Field
        label="Focus verse (optional)"
        value={verse}
        onChangeText={setVerse}
        placeholder={meta ? `1 to ${meta.ayahCount}` : "e.g. 10"}
        keyboardType="number-pad"
        maxLength={3}
        returnKeyType="done"
      />
      {verseError && verse.trim() !== "" ? (
        <Text variant="muted" style={{ fontSize: 15, lineHeight: 22 }}>
          {verseError}
        </Text>
      ) : null}

      <FormError message={error} />

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
        <Button title={submitTitle} busy={busy} onPress={() => void submit()} />
        {onCancel ? (
          <Button kind="ghost" title="Cancel" onPress={onCancel} />
        ) : null}
      </View>

      {picking ? (
        <SurahPicker
          surahs={surahs}
          selected={surah}
          onClose={() => setPicking(false)}
          onPick={(s) => {
            setSurah(s.number);
            setPicking(false);
          }}
        />
      ) : null}
    </View>
  );
}
