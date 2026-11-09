import { memo } from "react";
import { View } from "react-native";

import { radius, space, useTheme } from "../../theme";
import { LinkPressable, Text } from "../../ui";
import { verseHref } from "../Reader/IndexRows";
import { highlightSegments } from "./searchModel";
import type { SearchResult } from "./searchModel";

export const ResultRow = memo(
  ({
    result,
    surahName,
    term,
  }: {
    result: SearchResult;
    surahName: string | undefined;
    term: string;
  }) => {
    const { colors } = useTheme();
    const segments = highlightSegments(result.snippet, term);
    const where = surahName
      ? `${surahName} ${result.verseKey}`
      : result.verseKey;
    return (
      <LinkPressable
        href={verseHref(result.surah, result.ayah)}
        accessibilityLabel={`${where}. ${result.snippet}`}
        accessibilityHint="Opens the verse in the reader"
        style={({ pressed }) => ({
          backgroundColor: pressed ? colors.indigoWash : "transparent",
          borderRadius: radius.md,
          marginHorizontal: -space.sm,
          minHeight: 44,
          paddingHorizontal: space.sm,
          paddingVertical: 14,
        })}
      >
        <View style={{ gap: space.xs }}>
          <Text variant="eyebrow">{where}</Text>
          <Text variant="translation">
            {segments.map((s, i) =>
              s.match ? (
                <Text
                  // Segments are positional and never reorder.
                  // oxlint-disable-next-line react/no-array-index-key
                  key={i}
                  variant="translation"
                  style={{
                    backgroundColor: colors.indigoWash,
                    color: colors.indigoDeep,
                  }}
                >
                  {s.text}
                </Text>
              ) : (
                s.text
              )
            )}
          </Text>
        </View>
      </LinkPressable>
    );
  }
);
