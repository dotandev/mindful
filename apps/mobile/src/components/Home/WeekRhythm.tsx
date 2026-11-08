// Home's private rhythm: seven dots for the last seven days, today on the
// right, and one line. Computed on the device and never sent anywhere.
import { View } from "react-native";

import { space, useTheme } from "../../theme";
import { Text } from "../../ui";
import type { RhythmView } from "./weekModel";

const DOT = 8;

export function WeekRhythm({ rhythm }: { rhythm: RhythmView }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        alignItems: "center",
        flexDirection: "row",
        gap: 10,
        marginTop: space.sm,
      }}
    >
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={rhythm.label}
        style={{ flexDirection: "row", gap: 5 }}
      >
        {rhythm.days.map((kept, i) => (
          <View
            key={i}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={{
              backgroundColor: kept ? colors.indigo : "transparent",
              borderColor: kept ? colors.indigo : colors.lineStrong,
              borderRadius: DOT / 2,
              borderWidth: 1,
              height: DOT,
              width: DOT,
            }}
          />
        ))}
      </View>
      <Text
        variant="soft"
        style={{ flexShrink: 1, fontSize: 14.5, lineHeight: 20 }}
      >
        {rhythm.line}
      </Text>
    </View>
  );
}
