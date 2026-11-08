// /circles: start a circle and share its link, look after the circles you
// started, and see or leave the circle this device has joined. Starting one
// needs an account so it stays yours to change; joining never does.
import {
  createCircle,
  getJoinedCircle,
  leaveCircle,
  listMyCircles,
  onJoinedCircleChange,
} from "@mindfulverse/core/circles";
import type { Circle } from "@mindfulverse/core/circles";
import { loadSurahs } from "@mindfulverse/core/data";
import { useAccount } from "@mindfulverse/core/sync/auth";
import type { SurahMeta } from "@mindfulverse/core/types";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, View } from "react-native";

import { FormError } from "../../src/components/Account/parts";
import { CircleForm } from "../../src/components/Circles/CircleForm";
import {
  circleSummary,
  PRIVACY_LINE,
  SIGNED_OUT_LINES,
} from "../../src/components/Circles/circleModel";
import {
  CircleLinkBlock,
  OwnedCircle,
} from "../../src/components/Circles/OwnedCircle";
import { useCircleCountLine } from "../../src/components/Circles/useCircleCount";
import { fonts, space, useTheme } from "../../src/theme";
import { Button, Card, Screen, Text } from "../../src/ui";

type MineState =
  | { status: "loading" }
  | { status: "ready"; circles: Circle[] }
  | { status: "error"; message: string };

export default function Circles() {
  const { colors } = useTheme();
  const { user, loading: accountLoading } = useAccount();
  const [surahList, setSurahList] = useState<SurahMeta[]>([]);
  const surahs = useMemo(
    () => new Map(surahList.map((s) => [s.number, s])),
    [surahList]
  );
  const [joined, setJoined] = useState<Circle | null>(getJoinedCircle);
  const [mine, setMine] = useState<MineState>({ status: "loading" });
  const [created, setCreated] = useState<Circle | null>(null);
  const [formKey, setFormKey] = useState(0);
  const userId = user?.id ?? null;
  const joinedCount = useCircleCountLine(joined);

  useEffect(() => onJoinedCircleChange(setJoined), []);

  useEffect(() => {
    let alive = true;
    loadSurahs()
      .then((list) => alive && setSurahList(list))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const loadMine = useCallback(async () => {
    setMine({ status: "loading" });
    const result = await listMyCircles();
    setMine(
      result.ok
        ? { circles: result.value, status: "ready" }
        : { message: result.error.message, status: "error" }
    );
  }, []);

  useEffect(() => {
    if (userId) {
      void loadMine();
    }
  }, [userId, loadMine]);

  const replaceMine = (next: (circles: Circle[]) => Circle[]) =>
    setMine((m) =>
      m.status === "ready" ? { circles: next(m.circles), status: "ready" } : m
    );

  return (
    <Screen edges="bottom">
      <Text variant="soft">{PRIVACY_LINE}</Text>

      {joined ? (
        <Card accessibilityLabel="Your circle">
          <View style={{ gap: 2 }}>
            <Text variant="eyebrow">Your circle</Text>
            <Text style={{ fontFamily: fonts.readSemiBold }}>
              {joined.name}
            </Text>
            <Text variant="soft" style={{ fontSize: 15.5, lineHeight: 22 }}>
              {circleSummary(joined, surahs)}
            </Text>
          </View>
          {joinedCount ? (
            <Text variant="soft" style={{ fontSize: 15.5, lineHeight: 22 }}>
              {joinedCount}
            </Text>
          ) : null}
          <View
            style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}
          >
            <Button
              title="Open on Home"
              kind="secondary"
              onPress={() => router.navigate("/")}
            />
            <Button
              kind="ghost"
              title="Leave circle"
              onPress={() => leaveCircle()}
            />
          </View>
        </Card>
      ) : null}

      {accountLoading ? <ActivityIndicator color={colors.indigo} /> : null}

      {!accountLoading && !userId ? (
        <Card>
          <Text variant="h2">Start a circle</Text>
          {SIGNED_OUT_LINES.map((line) => (
            <Text key={line} variant="soft">
              {line}
            </Text>
          ))}
          <View style={{ alignItems: "flex-start" }}>
            <Button
              title="Go to Account"
              onPress={() => router.navigate("/account")}
            />
          </View>
        </Card>
      ) : null}

      {userId ? (
        <>
          <Card>
            <Text variant="h2">Start a circle</Text>
            <Text variant="soft">
              Read a surah with friends. Keep your own journal.
            </Text>
            {created ? (
              <View style={{ gap: space.md }}>
                <Text style={{ fontFamily: fonts.readSemiBold }}>
                  {`“${created.name}” is ready. Share this link with your circle.`}
                </Text>
                <CircleLinkBlock circle={created} surahs={surahs} />
                <View style={{ alignItems: "flex-start" }}>
                  <Button
                    kind="ghost"
                    title="Start another circle"
                    onPress={() => {
                      setCreated(null);
                      setFormKey((k) => k + 1);
                    }}
                  />
                </View>
              </View>
            ) : (
              <CircleForm
                key={formKey}
                surahs={surahList}
                submitTitle="Start circle"
                onSubmit={async (draft) => {
                  const result = await createCircle(draft);
                  if (result.ok) {
                    setCreated(result.value);
                    replaceMine((cs) => [result.value, ...cs]);
                  }
                  return result;
                }}
              />
            )}
          </Card>

          <View style={{ gap: space.md }}>
            <Text variant="h2">Your circles</Text>
            <MineList
              mine={mine}
              surahs={surahs}
              surahList={surahList}
              joinedCode={joined?.code ?? null}
              onRetry={() => void loadMine()}
              onChanged={(c) =>
                replaceMine((cs) => [c, ...cs.filter((x) => x.code !== c.code)])
              }
              onDeleted={(code) => {
                replaceMine((cs) => cs.filter((x) => x.code !== code));
                if (created?.code === code) {
                  setCreated(null);
                }
              }}
            />
          </View>
        </>
      ) : null}
    </Screen>
  );
}

function MineList({
  mine,
  surahs,
  surahList,
  joinedCode,
  onRetry,
  onChanged,
  onDeleted,
}: {
  mine: MineState;
  surahs: Map<number, SurahMeta>;
  surahList: SurahMeta[];
  joinedCode: string | null;
  onRetry: () => void;
  onChanged: (circle: Circle) => void;
  onDeleted: (code: string) => void;
}) {
  const { colors } = useTheme();
  if (mine.status === "loading") {
    return <ActivityIndicator color={colors.indigo} />;
  }
  if (mine.status === "error") {
    return (
      <View style={{ alignItems: "flex-start", gap: space.sm }}>
        <FormError message={mine.message} />
        <Button kind="secondary" title="Try again" onPress={onRetry} />
      </View>
    );
  }
  if (mine.circles.length === 0) {
    return <Text variant="muted">Circles you start will appear here.</Text>;
  }
  return (
    <>
      {mine.circles.map((c) => (
        <OwnedCircle
          key={c.code}
          circle={c}
          surahs={surahs}
          surahList={surahList}
          joinedCode={joinedCode}
          onChanged={onChanged}
          onDeleted={onDeleted}
        />
      ))}
    </>
  );
}
