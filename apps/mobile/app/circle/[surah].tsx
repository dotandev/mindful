// A study circle's invite link (mindfulverse://circle/94): remember the
// circle's surah so Home suggests it, then open that surah's tadabbur. A link
// that isn't a surah number just goes Home.
import { setCircleSurah } from "@mindfulverse/core/circleSurah";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

import { useTheme } from "../../src/theme";

export default function CircleLink() {
  const { colors } = useTheme();
  const { surah } = useLocalSearchParams<{ surah: string }>();

  useEffect(() => {
    const n = setCircleSurah(surah);
    if (n === null) {
      router.replace("/");
      return;
    }
    router.replace({
      params: { surah: String(n) },
      pathname: "/tadabbur/[surah]",
    });
  }, [surah]);

  return (
    <View
      accessibilityLabel="Opening your circle’s surah"
      style={{
        alignItems: "center",
        backgroundColor: colors.cotton,
        flex: 1,
        justifyContent: "center",
      }}
    >
      <ActivityIndicator color={colors.indigo} />
    </View>
  );
}
