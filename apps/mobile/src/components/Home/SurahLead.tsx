// Home's lead card (web: apps/web/src/pages/Home.tsx): the surah journal comes
// first. Continue the surah in progress, begin the surah your circle is
// reading (at its focus verse when it has one), or begin with a short one.
import type { SurahMeta } from "@mindfulverse/core/types";
import { router } from "expo-router";
import type { Href } from "expo-router";
import { Pressable, View } from "react-native";

import { fonts } from "../../theme";
import { AdireCloth, Button, Text, useOnCloth } from "../../ui";
import { FadeRise } from "../../ui/FadeRise";
import { fittingVerse } from "../Circles/circleModel";
import {
  BEGIN_LINE,
  BEGIN_TITLE,
  CIRCLE_EYEBROW,
  continueTitle,
  focusLine,
  namedAction,
  namedEyebrow,
  STARTERS_HEADING,
  starterLabel,
  surahName,
} from "./leadModel";
import type { Lead } from "./leadModel";

const surahHref = (surah: number, ayah?: number): Href => ({
  params:
    ayah === undefined
      ? { surah: String(surah) }
      : { surah: String(surah), v: String(ayah) },
  pathname: "/tadabbur/[surah]",
});

export function SurahLead({
  lead,
  surahs,
  surahNames,
  reduce,
}: {
  lead: Lead;
  surahs: Map<number, SurahMeta>;
  surahNames: Map<number, string>;
  reduce: boolean;
}) {
  return (
    <FadeRise reduce={reduce} style={{ marginTop: 6 }}>
      <AdireCloth style={{ paddingHorizontal: 20, paddingVertical: 18 }}>
        <View style={{ alignItems: "flex-start", gap: 14 }}>
          <LeadBody lead={lead} surahs={surahs} surahNames={surahNames} />
        </View>
      </AdireCloth>
    </FadeRise>
  );
}

function LeadBody({
  lead,
  surahs,
  surahNames,
}: {
  lead: Lead;
  surahs: Map<number, SurahMeta>;
  surahNames: Map<number, string>;
}) {
  const cloth = useOnCloth();
  if (lead.kind === "continue") {
    return (
      <>
        <Text variant="h2" style={{ color: cloth.strong }}>
          {continueTitle(lead.surah, surahNames)}
        </Text>
        <Button
          kind="cloth"
          title={`Resume at verse ${lead.ayah}`}
          onPress={() => router.push(surahHref(lead.surah, lead.ayah))}
        />
        <QuietLink
          title="Open this surah’s page"
          href={{
            params: { surah: String(lead.surah) },
            pathname: "/tadabbur/journal/[surah]",
          }}
        />
      </>
    );
  }
  if (lead.kind === "named") {
    const name = surahName(lead.surah, surahs);
    const verse = fittingVerse(lead.verse, surahs.get(lead.surah)?.ayahCount);
    return (
      <>
        <View style={{ gap: 4 }}>
          <Eyebrow>{namedEyebrow(lead.name)}</Eyebrow>
          <Text variant="h2" style={{ color: cloth.strong }}>
            {name}
          </Text>
          {verse === null ? null : (
            <Text
              style={{
                color: cloth.strong,
                fontFamily: fonts.readMedium,
                fontSize: 16,
                lineHeight: 22,
              }}
            >
              {focusLine(verse)}
            </Text>
          )}
        </View>
        <BeginLine />
        <Button
          kind="cloth"
          title={namedAction(name, verse)}
          onPress={() => router.push(surahHref(lead.surah, verse ?? undefined))}
        />
        <QuietLink title="Choose another surah" href="/tadabbur" />
      </>
    );
  }
  if (lead.kind === "circle") {
    const name = surahName(lead.surah, surahs);
    return (
      <>
        <View style={{ gap: 4 }}>
          <Eyebrow>{CIRCLE_EYEBROW}</Eyebrow>
          <Text variant="h2" style={{ color: cloth.strong }}>
            {name}
          </Text>
        </View>
        <BeginLine />
        <Button
          kind="cloth"
          title={`Begin ${name}`}
          onPress={() => router.push(surahHref(lead.surah))}
        />
        <QuietLink title="Choose another surah" href="/tadabbur" />
      </>
    );
  }
  return (
    <>
      <Text variant="h2" style={{ color: cloth.strong }}>
        {BEGIN_TITLE}
      </Text>
      <BeginLine />
      <Text
        accessibilityRole="header"
        style={{
          color: cloth.strong,
          fontFamily: fonts.readSemiBold,
          fontSize: 15.5,
          lineHeight: 22,
        }}
      >
        {STARTERS_HEADING}
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {lead.surahs.map((n) => (
          <Button
            key={n}
            kind="clothQuiet"
            title={starterLabel(n, surahs)}
            onPress={() => router.push(surahHref(n))}
          />
        ))}
      </View>
      <QuietLink title="Choose another surah" href="/tadabbur" />
    </>
  );
}

function Eyebrow({ children }: { children: string }) {
  const cloth = useOnCloth();
  return (
    <Text
      style={{
        color: cloth.soft,
        fontFamily: fonts.readMedium,
        fontSize: 14.5,
        lineHeight: 20,
      }}
    >
      {children}
    </Text>
  );
}

function BeginLine() {
  const cloth = useOnCloth();
  return (
    <Text style={{ color: cloth.soft, fontSize: 16.5, lineHeight: 25 }}>
      {BEGIN_LINE}
    </Text>
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
