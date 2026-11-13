import { SIZES } from "@mindfulverse/core/readingPrefs";
import { View } from "react-native";

import { tickSelection } from "../../platform/haptics";
import { space } from "../../theme";
import { Segmented } from "./Segmented";

const SIZE_NAMES: Record<string, string> = {
  l: "large",
  m: "medium",
  s: "small",
};

/** Port of apps/web/src/components/ReadingControls.tsx: the text size choice,
 *  shown inside the "Text size" sheet (ReaderTools.tsx). It applies at once.
 *  The Translation / Reading switch lives on the toolbar itself. */
export function ReadingControls({
  sizeKey,
  onSize,
}: {
  sizeKey: string;
  onSize: (k: string) => void;
}) {
  return (
    <View style={{ gap: space.lg }}>
      <View style={{ gap: space.sm }}>
        <Segmented
          accessibilityLabel="Reading size"
          value={sizeKey}
          onChange={(k) => {
            if (k !== sizeKey) {
              tickSelection();
            }
            onSize(k);
          }}
          options={SIZES.map((s, i) => ({
            key: s.key,
            label: s.label,
            accessibilityLabel: `Reading size ${SIZE_NAMES[s.key] ?? s.key}`,
            // web: the three A's grow
            labelStyle: { fontSize: 14 + i * 3.2, lineHeight: 24 },
          }))}
        />
      </View>
    </View>
  );
}
