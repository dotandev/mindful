// A circle's invite link (https://mindfulverse.vercel.app/circle/abc234 or
// mindfulverse://circle/abc234): join the circle on this device, then open its
// surah at the focus verse. Old numeric links (/circle/94) still just remember
// the surah. Anything else goes Home.
import {
  fetchCircle,
  joinCircle,
  leaveCircle,
} from "@mindfulverse/core/circles";
import { setCircleSurah } from "@mindfulverse/core/circleSurah";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

import { resolveCircleLink } from "../../src/components/Circles/circleModel";
import { space, useTheme } from "../../src/theme";
import { Button, Text } from "../../src/ui";

const deps = {
  fetch: fetchCircle,
  join: joinCircle,
  leave: leaveCircle,
  setSurah: setCircleSurah,
};

export default function CircleLink() {
  const { colors } = useTheme();
  const { surah } = useLocalSearchParams<{ surah: string }>();
  const [failure, setFailure] = useState<{
    message: string;
    retry: boolean;
  } | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    setFailure(null);
    void resolveCircleLink(surah, deps).then((target) => {
      if (!alive) {
        return;
      }
      if (target.kind === "failed") {
        setFailure({ message: target.message, retry: target.retry });
        return;
      }
      if (target.kind === "home") {
        router.replace("/");
        return;
      }
      router.replace({
        params:
          target.verse === null
            ? { surah: String(target.surah) }
            : { surah: String(target.surah), v: String(target.verse) },
        pathname: "/tadabbur/[surah]",
      });
    });
    return () => {
      alive = false;
    };
  }, [surah, attempt]);

  return (
    <View
      style={{
        alignItems: "center",
        backgroundColor: colors.cotton,
        flex: 1,
        gap: space.md,
        justifyContent: "center",
        padding: space.lg,
      }}
    >
      {failure ? (
        <>
          <Text
            variant="soft"
            accessibilityRole="alert"
            style={{ textAlign: "center" }}
          >
            {failure.message}
          </Text>
          {failure.retry ? (
            <Button
              title="Try again"
              onPress={() => setAttempt((n) => n + 1)}
            />
          ) : null}
          <Button
            kind="ghost"
            title="Go to Home"
            onPress={() => router.replace("/")}
          />
        </>
      ) : (
        <View accessible accessibilityLabel="Opening your circle">
          <ActivityIndicator color={colors.indigo} />
        </View>
      )}
    </View>
  );
}
