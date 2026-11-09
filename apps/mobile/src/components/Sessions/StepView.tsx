// One session step (web's SessionPlayer StepView): the step's verses in
// Arabic and translation, its hand-written prompt, then the commentary.
import { loadAyahsByKeys, parseVerseKey } from "@mindfulverse/core/data";
import type { Ayah, SessionStep } from "@mindfulverse/core/types";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

import { space, useTheme } from "../../theme";
import { ArabicText, Card, Diamond, Text } from "../../ui";
import { FadeRise } from "../../ui/FadeRise";
import { verseLabel } from "./logic";
import { TafsirDisclosure } from "./TafsirDisclosure";

type VerseStatus =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "ready"; ayahs: Ayah[] };

const STAGGER_MS = 50;

function VerseBlock({
  ayah,
  surahNames,
  arabicScale,
}: {
  ayah: Ayah;
  surahNames: Map<number, string>;
  arabicScale: number;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: space.sm }}>
      <View style={{ alignItems: "center", flexDirection: "row", gap: 12 }}>
        <View
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
        >
          <Diamond label={parseVerseKey(ayah.verseKey).ayah} />
        </View>
        <Text variant="eyebrow">{verseLabel(ayah.verseKey, surahNames)}</Text>
        <View
          style={{ backgroundColor: colors.indigoWash, flex: 1, height: 2 }}
        />
      </View>
      <ArabicText
        scale={arabicScale}
        selectable
        accessibilityLanguage="ar"
        style={{ marginBottom: space.sm, marginTop: space.sm }}
      >
        {ayah.arabic}
      </ArabicText>
      <Text variant="translation" selectable>
        {ayah.translation}
      </Text>
    </View>
  );
}

export function StepView({
  step,
  surahNames,
  arabicScale,
  reduce,
}: {
  step: SessionStep;
  surahNames: Map<number, string>;
  arabicScale: number;
  reduce: boolean;
}) {
  const { colors } = useTheme();
  const [status, setStatus] = useState<VerseStatus>({ kind: "loading" });

  useEffect(() => {
    let alive = true;
    setStatus({ kind: "loading" });
    loadAyahsByKeys(step.verseKeys)
      .then((ayahs) => {
        if (alive) {
          setStatus({ ayahs, kind: "ready" });
        }
      })
      .catch(() => {
        if (alive) {
          setStatus({ kind: "error" });
        }
      });
    return () => {
      alive = false;
    };
  }, [step]);

  return (
    <View style={{ gap: space.lg }}>
      {status.kind === "loading" ? (
        <View
          style={{ alignItems: "center", flexDirection: "row", gap: space.sm }}
          accessible
          accessibilityLabel="Bringing the verses in"
          accessibilityLiveRegion="polite"
        >
          <ActivityIndicator color={colors.indigo} />
          <Text variant="muted">Bringing the verses in…</Text>
        </View>
      ) : null}
      {status.kind === "error" ? (
        <Card>
          <Text variant="muted">Couldn’t load these verses. Try again.</Text>
        </Card>
      ) : null}
      {status.kind === "ready"
        ? status.ayahs.map((a, i) => (
            <FadeRise
              key={a.verseKey}
              reduce={reduce}
              delay={reduce ? 0 : i * STAGGER_MS}
            >
              <VerseBlock
                ayah={a}
                surahNames={surahNames}
                arabicScale={arabicScale}
              />
            </FadeRise>
          ))
        : null}

      {step.reflection ? (
        <Card
          style={{
            backgroundColor: colors.cottonRaised,
            borderColor: colors.lineStrong,
            borderWidth: 1,
            gap: space.sm,
          }}
        >
          <Text variant="eyebrow">Sit with this</Text>
          <Text>{step.reflection}</Text>
        </Card>
      ) : null}

      <TafsirDisclosure verseKeys={step.verseKeys} surahNames={surahNames} />
    </View>
  );
}
