// The session's last screen (web's SessionPlayer FinalScreen): the journal
// prompt, the reflection, and an optional "What will you do?" that the
// follow-up asks about a week later. Saved with the same prompt, body and
// context as web.
import { track } from "@mindfulverse/core/analytics";
import { addEntry } from "@mindfulverse/core/journal";
import { recordSessionComplete } from "@mindfulverse/core/progress";
import {
  clearSessionDraft,
  readSessionDraft,
  writeSessionDraft,
} from "@mindfulverse/core/sessionDraft";
import { formatSessionBody } from "@mindfulverse/core/tadabburBody";
import type { TadabburSession } from "@mindfulverse/core/types";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { TextInput, View } from "react-native";
import type { TextInputInstance } from "react-native";

import { tapSuccess } from "../../platform/haptics";
import { fonts, radius, space, useTheme } from "../../theme";
import { Button, Card, Text } from "../../ui";
import { FadeRise } from "../../ui/FadeRise";

function Field({
  id,
  label,
  value,
  onChangeText,
  minHeight,
  placeholder,
  onFocusInput,
}: {
  id: string;
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  minHeight: number;
  placeholder?: string;
  onFocusInput: (input: TextInputInstance) => void;
}) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const input = useRef<TextInputInstance | null>(null);
  return (
    <TextInput
      ref={input}
      nativeID={id}
      value={value}
      onChangeText={onChangeText}
      onFocus={() => {
        setFocused(true);
        if (input.current) {
          onFocusInput(input.current);
        }
      }}
      onBlur={() => setFocused(false)}
      multiline
      textAlignVertical="top"
      accessibilityLabel={label}
      placeholder={placeholder}
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
        minHeight,
        paddingBottom: space.sm + 4,
        paddingHorizontal: space.md,
        paddingTop: space.sm + 4,
      }}
    />
  );
}

export function FinalScreen({
  session,
  reduce,
  onFocusInput,
  onDone,
}: {
  session: TadabburSession;
  reduce: boolean;
  onFocusInput: (input: TextInputInstance) => void;
  onDone: () => void;
}) {
  const { colors } = useTheme();
  const [draft] = useState(() => readSessionDraft(session.id));
  const [body, setBody] = useState(draft.body);
  const [action, setAction] = useState(draft.action);
  const [status, setStatus] = useState<"idle" | "saved" | "failed">("idle");
  const saved = status === "saved";
  const canSave = body.trim().length > 0 && !saved;

  useEffect(() => {
    track({ sessionId: session.id, type: "session_complete" });
    recordSessionComplete(session.id);
  }, [session.id]);

  function save() {
    if (!canSave) {
      return;
    }
    try {
      addEntry({
        body: formatSessionBody(body, action),
        context: { kind: "session", ref: session.id },
        prompt: session.journalPrompt,
      });
    } catch {
      setStatus("failed");
      return;
    }
    clearSessionDraft(session.id);
    track({ context: "session", type: "journal_save" });
    tapSuccess();
    setStatus("saved");
  }

  return (
    <>
      <FadeRise reduce={reduce} style={{ gap: space.xs }}>
        <Text variant="eyebrow">{session.title}</Text>
        <Text variant="h1">A moment to reflect</Text>
      </FadeRise>

      <FadeRise reduce={reduce} delay={reduce ? 0 : 60}>
        <Card>
          <Text variant="soft">{session.journalPrompt}</Text>
          {saved ? (
            <View style={{ alignItems: "flex-start", gap: space.md }}>
              <Text
                variant="soft"
                accessibilityLiveRegion="polite"
                accessibilityRole="text"
              >
                Kept in your journal.
              </Text>
              <Button
                kind="secondary"
                title="Go to journal"
                onPress={() => router.navigate("/journal")}
              />
            </View>
          ) : (
            <View style={{ gap: space.md }}>
              <Field
                id="session-reflection"
                label={session.journalPrompt}
                value={body}
                onChangeText={(v) => {
                  setBody(v);
                  setStatus("idle");
                  writeSessionDraft(session.id, { action, body: v });
                }}
                minHeight={150}
                placeholder="Write what stayed with you…"
                onFocusInput={onFocusInput}
              />
              <View style={{ gap: space.xs + 2 }}>
                <Text
                  variant="soft"
                  nativeID="session-action-label"
                  importantForAccessibility="no"
                >
                  What will you do? (optional)
                </Text>
                <Field
                  id="session-action"
                  label="What will you do? (optional)"
                  value={action}
                  onChangeText={(v) => {
                    setAction(v);
                    writeSessionDraft(session.id, { action: v, body });
                  }}
                  minHeight={72}
                  onFocusInput={onFocusInput}
                />
              </View>
              <View style={{ alignItems: "flex-start" }}>
                <Button
                  title="Save reflection"
                  onPress={save}
                  disabled={!canSave}
                />
              </View>
              {status === "failed" ? (
                <Text
                  variant="soft"
                  accessibilityLiveRegion="assertive"
                  style={{ color: colors.kola }}
                >
                  That reflection couldn’t be kept on this device. Your words
                  are still here. Try again.
                </Text>
              ) : null}
            </View>
          )}
        </Card>
      </FadeRise>

      <FadeRise
        reduce={reduce}
        delay={reduce ? 0 : 120}
        style={{ alignItems: "flex-start" }}
      >
        <Button kind="ghost" title="Tadabbur" onPress={onDone} />
      </FadeRise>
    </>
  );
}
