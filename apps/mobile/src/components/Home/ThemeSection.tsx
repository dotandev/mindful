// "Or ponder a theme" on Home: a few hand-written topic sessions, then the
// full list. Titles come from the bundled sessions.json the web uses.
import { loadSessions } from "@mindfulverse/core/data";
import { getAllSessionProgress } from "@mindfulverse/core/progress";
import type { TadabburSession } from "@mindfulverse/core/types";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { View } from "react-native";

import { space, useTheme } from "../../theme";
import { LinkPressable, Text } from "../../ui";
import { ChevronIcon } from "../../ui/icons";
import { HomeEntryDivider } from "./HomeEntry";
import { themePicks } from "./leadModel";

export function ThemeSection() {
  const { colors } = useTheme();
  const [sessions, setSessions] = useState<TadabburSession[]>([]);
  const [progress, setProgress] = useState(getAllSessionProgress);

  useFocusEffect(useCallback(() => setProgress(getAllSessionProgress()), []));

  useEffect(() => {
    let alive = true;
    loadSessions()
      .then((list) => alive && setSessions(list))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const picks = themePicks(sessions, progress);
  if (picks.length === 0) {
    return null;
  }

  return (
    <View
      accessibilityLabel="Or ponder a theme"
      style={{ marginTop: space.lg }}
    >
      <Text
        variant="h2"
        accessibilityRole="header"
        style={{ fontSize: 20, lineHeight: 26 }}
      >
        Or ponder a theme
      </Text>
      <View style={{ marginTop: space.xs }}>
        {picks.map((p) => (
          <View key={p.id}>
            <LinkPressable
              href={{ params: { id: p.id }, pathname: "/sessions/[id]" }}
              accessibilityLabel={p.title}
              style={({ pressed }) => ({
                alignItems: "center",
                flexDirection: "row",
                gap: 14,
                minHeight: 48,
                opacity: pressed ? 0.6 : 1,
                paddingVertical: 12,
              })}
            >
              <Text style={{ color: colors.ink, flex: 1, fontSize: 17.8 }}>
                {p.title}
              </Text>
              <ChevronIcon color={colors.indigo} />
            </LinkPressable>
            <HomeEntryDivider />
          </View>
        ))}
      </View>
      <LinkPressable
        href="/sessions"
        style={({ pressed }) => ({
          alignSelf: "flex-start",
          justifyContent: "center",
          minHeight: 44,
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <Text style={{ color: colors.indigo, fontSize: 16.5 }}>
          See all themes
        </Text>
      </LinkPressable>
    </View>
  );
}
