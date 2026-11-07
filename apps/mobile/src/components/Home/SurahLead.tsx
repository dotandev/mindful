// Home's lead card (web: apps/web/src/pages/Home.tsx): the surah journal comes
// first. Continue the surah in progress, or begin with a short one.
import { router } from "expo-router";
import type { Href } from "expo-router";
import { Pressable, View } from "react-native";

import { fonts, space } from "../../theme";
import { AdireCloth, Button, Text, useOnCloth } from "../../ui";
import { FadeRise } from "../../ui/FadeRise";
import type { VersePos } from "./homeModel";
import {
  BEGIN_LINE,
  BEGIN_TITLE,
  continueTitle,
  SUGGESTED_SURAHS,
} from "./leadModel";

const surahHref = (surah: number, ayah?: number): Href => ({
  params:
    ayah === undefined
      ? { surah: String(surah) }
      : { surah: String(surah), v: String(ayah) },
  pathname: "/tadabbur/[surah]",
});

export function SurahLead({
  deeper,
  surahNames,
  reduce,
}: {
  deeper: VersePos | null;
  surahNames: Map<number, string>;
  reduce: boolean;
}) {
  const cloth = useOnCloth();
  return (
    <FadeRise reduce={reduce} style={{ marginTop: 6 }}>
      <AdireCloth style={{ padding: space.lg, paddingTop: 20 }}>
        {deeper ? (
          <View style={{ alignItems: "flex-start", gap: 14 }}>
            <Text variant="h2" style={{ color: cloth.strong }}>
              {continueTitle(deeper.surah, surahNames)}
            </Text>
            <Button
              kind="cloth"
              title={`Resume at verse ${deeper.ayah}`}
              onPress={() => router.push(surahHref(deeper.surah, deeper.ayah))}
            />
            <QuietLink
              title="Open this surah’s page"
              href={{
                params: { surah: String(deeper.surah) },
                pathname: "/tadabbur/journal/[surah]",
              }}
            />
          </View>
        ) : (
          <View style={{ alignItems: "flex-start", gap: 14 }}>
            <Text variant="h2" style={{ color: cloth.strong }}>
              {BEGIN_TITLE}
            </Text>
            <Text style={{ color: cloth.soft, fontSize: 16.5, lineHeight: 25 }}>
              {BEGIN_LINE}
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {SUGGESTED_SURAHS.map((s) => (
                <Button
                  key={s.number}
                  kind="cloth"
                  title={surahNames.get(s.number) ?? s.name}
                  onPress={() => router.push(surahHref(s.number))}
                />
              ))}
            </View>
            <QuietLink title="Choose another surah" href="/tadabbur" />
          </View>
        )}
      </AdireCloth>
    </FadeRise>
  );
}

function QuietLink({ title, href }: { title: string; href: Href }) {
  const cloth = useOnCloth();
  return (
    <Pressable
      accessibilityRole="link"
      onPress={() => router.push(href)}
      style={{ justifyContent: "center", minHeight: 44 }}
    >
      {({ pressed }) => (
        <Text
          style={{
            color: cloth.soft,
            fontFamily: fonts.read,
            fontSize: 16,
            lineHeight: 22,
            opacity: pressed ? 0.7 : 1,
            textDecorationLine: "underline",
          }}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}
