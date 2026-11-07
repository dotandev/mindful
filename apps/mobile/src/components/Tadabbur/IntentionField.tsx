import { track } from "@mindfulverse/core/analytics";
import { addEntry, getEntries } from "@mindfulverse/core/journal";
import { useState } from "react";
import { TextInput, View } from "react-native";
import type { TextInputInstance } from "react-native";

import { tapSuccess } from "../../platform/haptics";
import { fonts, radius, space, useTheme } from "../../theme";
import { Button, Text } from "../../ui";
import { composeIntention, currentIntention } from "./intention";

export function IntentionQuote({
  label,
  body,
}: {
  label: string;
  body: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: space.sm }}>
      <Text variant="eyebrow">{label}</Text>
      <View
        style={{
          borderLeftColor: colors.line,
          borderLeftWidth: 2,
          paddingLeft: 12,
        }}
      >
        <Text selectable>{body}</Text>
      </View>
    </View>
  );
}

export function IntentionField({
  surah,
  surahName,
  onSaved,
  onFocusInput,
}: {
  surah: number;
  surahName: string;
  onSaved?: () => void;
  onFocusInput?: (input: TextInputInstance) => void;
}) {
  const { colors } = useTheme();
  const [saved, setSaved] = useState<string | null>(() =>
    currentIntention(getEntries(), surah)
  );
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [focused, setFocused] = useState(false);
  const [failed, setFailed] = useState(false);
  const [input, setInput] = useState<TextInputInstance | null>(null);

  function save() {
    const entry = composeIntention(surah, surahName, draft);
    if (!entry) {
      return;
    }
    try {
      addEntry(entry);
    } catch {
      setFailed(true);
      return;
    }
    track({ context: "intention", type: "journal_save" });
    tapSuccess();
    setFailed(false);
    setSaved(currentIntention(getEntries(), surah));
    setEditing(false);
    onSaved?.();
  }

  if (saved !== null && !editing) {
    return (
      <View style={{ alignItems: "flex-start", gap: space.xs }}>
        <IntentionQuote label="Why you’re reading this surah" body={saved} />
        <Button
          kind="ghost"
          title="Change"
          accessibilityLabel="Change why you’re reading this surah"
          onPress={() => {
            setDraft(saved);
            setEditing(true);
          }}
        />
      </View>
    );
  }

  const label = "Why are you reading this surah now?";
  return (
    <View style={{ gap: space.sm }}>
      <Text
        nativeID="intention-label"
        style={{
          color: colors.indigoDeep,
          fontFamily: fonts.readSemiBold,
          fontSize: 17,
          lineHeight: 24,
        }}
      >
        {label}
      </Text>
      <TextInput
        ref={setInput}
        value={draft}
        onChangeText={(value) => {
          setDraft(value);
          setFailed(false);
        }}
        onFocus={() => {
          setFocused(true);
          if (input) {
            onFocusInput?.(input);
          }
        }}
        onBlur={() => setFocused(false)}
        multiline
        textAlignVertical="top"
        accessibilityLabel={label}
        accessibilityLabelledBy="intention-label"
        placeholderTextColor={colors.inkFaint}
        selectionColor={colors.indigo}
        style={{
          backgroundColor: colors.cottonRaised,
          borderColor: focused ? colors.indigo : colors.lineStrong,
          borderRadius: radius.md,
          borderWidth: 1,
          color: colors.ink,
          fontFamily: fonts.read,
          fontSize: 17,
          lineHeight: 26,
          minHeight: 88,
          paddingBottom: space.sm + 4,
          paddingHorizontal: space.md,
          paddingTop: space.sm + 4,
        }}
      />
      <View
        style={{ alignItems: "center", flexDirection: "row", gap: space.md }}
      >
        <Button
          kind="secondary"
          title="Save"
          disabled={draft.trim() === ""}
          onPress={save}
        />
        {editing ? (
          <Button
            kind="ghost"
            title="Cancel"
            onPress={() => {
              setEditing(false);
              setFailed(false);
            }}
          />
        ) : null}
      </View>
      {failed ? (
        <Text variant="soft" accessibilityLiveRegion="assertive">
          That couldn’t be kept on this device. Your words are still here. Try
          again.
        </Text>
      ) : null}
    </View>
  );
}
