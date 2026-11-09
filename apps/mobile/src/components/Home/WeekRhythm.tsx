// Home's private rhythm as one quiet line. The day count under the greeting
// already has the dots. Computed on the device and never sent anywhere.
import { space } from "../../theme";
import { Text } from "../../ui";
import type { RhythmView } from "./weekModel";

export function WeekRhythm({ rhythm }: { rhythm: RhythmView }) {
  return (
    <Text
      variant="soft"
      accessibilityLabel={rhythm.label}
      style={{ fontSize: 14.5, lineHeight: 20, marginTop: space.sm }}
    >
      {rhythm.line}
    </Text>
  );
}
