// Home follow-up (web: apps/web/src/components/FollowUpCard.tsx): about a week
// after a tadabbur reflection with an "Action:", ask calmly how it went.
import { track } from "@mindfulverse/core/analytics";
import {
  answerFollowUp,
  dueFollowUp,
  loadFollowUpState,
  saveFollowUpState,
  skipFollowUp,
} from "@mindfulverse/core/followUps";
import type { DueFollowUp, FollowUpAnswer } from "@mindfulverse/core/followUps";
import { getEntries } from "@mindfulverse/core/journal";
import { onSyncStatus } from "@mindfulverse/core/sync/engine";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Pressable,
  TextInput,
  View,
} from "react-native";

import { tapSuccess, tickSelection } from "../../platform/haptics";
import { fonts, radius, space, useTheme } from "../../theme";
import { Button, Card, Text } from "../../ui";
import { FadeRise } from "../../ui/FadeRise";
import { ACK_TEXT, followUpHeading, followUpStillOpen } from "./followUpModel";

const ANSWERS: FollowUpAnswer[] = ["Yes", "Partly", "Not yet"];
const ACK_HOLD_MS = 2400;
const ACK_FADE_MS = 600;

type Phase = "ask" | "note" | "kept" | "gone";

const pickDue = (): DueFollowUp | null =>
  dueFollowUp(getEntries(), new Date(), loadFollowUpState());

export function FollowUpCard({
  surahNames,
  reduce,
}: {
  surahNames: Map<number, string>;
  reduce: boolean;
}) {
  const { colors } = useTheme();
  const [due, setDue] = useState<DueFollowUp | null>(pickDue);
  const [phase, setPhase] = useState<Phase>("ask");
  const phaseRef = useRef<Phase>("ask");
  phaseRef.current = phase;
  const [answer, setAnswer] = useState<FollowUpAnswer | null>(null);
  const [note, setNote] = useState("");
  const [focused, setFocused] = useState(false);
  const shown = useRef(new Set<string>());
  const fade = useRef(new Animated.Value(1)).current;
  const verseKey = due?.verseKey;

  useEffect(() => {
    if (verseKey && !shown.current.has(verseKey)) {
      shown.current.add(verseKey);
      track({ type: "followup_shown", verseKey });
    }
  }, [verseKey]);

  // Entries can arrive after first render (sync, another device) and the tab
  // stays mounted across days: re-pick on focus or sync, never mid-note or
  // while the acknowledgement is showing.
  const recheck = useCallback(() => {
    const current = phaseRef.current;
    if (current === "note" || current === "kept") {
      return;
    }
    const next = pickDue();
    setDue((prev) => (prev?.entry.id === next?.entry.id ? prev : next));
    if (current === "gone" && next) {
      setAnswer(null);
      setNote("");
      fade.setValue(1);
      setPhase("ask");
    }
  }, [fade]);

  useFocusEffect(recheck);

  useEffect(
    () =>
      onSyncStatus((s) => {
        if (s === "synced") {
          recheck();
        }
      }),
    [recheck]
  );

  useEffect(() => {
    if (phase !== "kept") {
      return;
    }
    AccessibilityInfo.announceForAccessibility(ACK_TEXT);
    let anim: Animated.CompositeAnimation | null = null;
    const hold = setTimeout(() => {
      if (reduce) {
        setPhase("gone");
        return;
      }
      anim = Animated.timing(fade, {
        duration: ACK_FADE_MS,
        easing: Easing.out(Easing.quad),
        toValue: 0,
        useNativeDriver: true,
      });
      anim.start(({ finished }) => finished && setPhase("gone"));
    }, ACK_HOLD_MS);
    return () => {
      clearTimeout(hold);
      anim?.stop();
    };
  }, [phase, fade, reduce]);

  if (!due || phase === "gone") {
    return null;
  }

  function choose(a: FollowUpAnswer) {
    tickSelection();
    setAnswer(a);
    setPhase("note");
  }

  function skip() {
    if (!due || phaseRef.current !== "ask") {
      return;
    }
    phaseRef.current = "gone";
    saveFollowUpState(
      skipFollowUp(loadFollowUpState(), due.entry.id, new Date())
    );
    track({ type: "followup_skipped" });
    setPhase("gone");
  }

  function finish(text: string) {
    if (!due || !answer || phaseRef.current !== "note") {
      return;
    }
    // A second tap before re-render would see its own entry and drop the acknowledgement.
    phaseRef.current = "kept";
    if (!followUpStillOpen(getEntries(), due)) {
      setPhase("gone");
      return;
    }
    saveFollowUpState(
      answerFollowUp(due, answer, text, new Date(), loadFollowUpState())
    );
    track({ answer, type: "followup_answered" });
    tapSuccess();
    setPhase("kept");
  }

  if (phase === "kept") {
    return (
      <Animated.View style={{ opacity: fade }}>
        <Card accessibilityLabel="Follow-up">
          <Text variant="soft">{ACK_TEXT}</Text>
        </Card>
      </Animated.View>
    );
  }

  return (
    <FadeRise reduce={reduce}>
      <Card accessibilityLabel="Follow-up" style={{ gap: 0 }}>
        <Text variant="eyebrow">A week on</Text>
        <Text
          accessibilityRole="header"
          style={{
            color: colors.indigoDeep,
            fontFamily: fonts.readSemiBold,
            fontSize: 18.7,
            lineHeight: 25,
            marginBottom: 10,
            marginTop: 2,
          }}
        >
          {followUpHeading(due.verseKey, surahNames)}
        </Text>
        <Text variant="soft" style={{ marginBottom: space.xs }}>
          You wrote:
        </Text>
        <Text numberOfLines={4} style={{ marginBottom: 14 }}>
          “{due.action}”
        </Text>

        {phase === "ask" ? (
          <>
            <View style={{ flexDirection: "row", gap: space.sm }}>
              {ANSWERS.map((a) => (
                <Button
                  key={a}
                  kind="secondary"
                  title={a}
                  onPress={() => choose(a)}
                  style={{ flex: 1, paddingHorizontal: space.sm }}
                />
              ))}
            </View>
            <View style={{ alignItems: "flex-start", marginTop: space.sm }}>
              <Pressable
                accessibilityRole="button"
                onPress={skip}
                hitSlop={4}
                style={({ pressed }) => ({
                  justifyContent: "center",
                  minHeight: 44,
                  opacity: pressed ? 0.6 : 1,
                  paddingHorizontal: 4,
                })}
              >
                <Text variant="soft" style={{ fontSize: 15.5 }}>
                  Skip for now
                </Text>
              </Pressable>
            </View>
          </>
        ) : (
          <>
            <Text variant="soft" style={{ marginBottom: space.sm }}>
              {answer}
            </Text>
            <Text
              nativeID="followup-note"
              style={{
                color: colors.indigoDeep,
                fontFamily: fonts.readSemiBold,
                fontSize: 15.5,
                lineHeight: 22,
                marginBottom: space.xs,
              }}
            >
              Anything to add? (optional)
            </Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              multiline
              textAlignVertical="top"
              accessibilityLabel="Anything to add? (optional)"
              accessibilityLabelledBy="followup-note"
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
                paddingHorizontal: space.md,
                paddingVertical: space.sm + 4,
              }}
            />
            <View
              style={{
                alignItems: "center",
                flexDirection: "row",
                gap: 12,
                marginTop: 12,
              }}
            >
              <Button title="Save" onPress={() => finish(note)} />
              <Button kind="ghost" title="Skip" onPress={() => finish("")} />
            </View>
          </>
        )}
      </Card>
    </FadeRise>
  );
}
