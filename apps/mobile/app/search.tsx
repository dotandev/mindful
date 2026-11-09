import { loadSearchIndex, loadSurahs } from "@mindfulverse/core/data";
import { Stack } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import type { ReactElement } from "react";
import { ActivityIndicator, FlatList, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ResultRow } from "../src/components/Search/ResultRow";
import {
  isSearchable,
  normalizeQuery,
  resultCountLabel,
  runSearch,
} from "../src/components/Search/searchModel";
import type {
  SearchIndex,
  SearchOutcome,
} from "../src/components/Search/searchModel";
import { useDebounced } from "../src/components/Search/useDebounced";
import { fonts, radius, space, useTheme } from "../src/theme";
import { Button, Card, Text } from "../src/ui";

const DEBOUNCE_MS = 300;

type IndexStatus = "idle" | "loading" | "ready" | "error";

export default function Search() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [input, setInput] = useState("");
  const term = normalizeQuery(useDebounced(input, DEBOUNCE_MS));
  const wantsSearch = isSearchable(term);

  const [index, setIndex] = useState<SearchIndex | null>(null);
  const [status, setStatus] = useState<IndexStatus>("idle");
  const [attempt, setAttempt] = useState(0);
  const [names, setNames] = useState<Map<number, string>>(new Map());

  // The ~1MB index loads on the first real query, never on mount.
  const needIndex = wantsSearch && index === null;
  useEffect(() => {
    if (!needIndex) {
      return;
    }
    let active = true;
    setStatus("loading");
    loadSearchIndex()
      .then((data) => {
        if (!active) {
          return;
        }
        setIndex(data);
        setStatus("ready");
      })
      .catch(() => active && setStatus("error"));
    return () => {
      active = false;
    };
  }, [needIndex, attempt]);

  useEffect(() => {
    let active = true;
    loadSurahs()
      .then((list) => {
        if (active) {
          setNames(new Map(list.map((s) => [s.number, s.name])));
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const outcome = useMemo<SearchOutcome | null>(
    () => (index && wantsSearch ? runSearch(index, term) : null),
    [index, term, wantsSearch]
  );

  let empty: ReactElement | null = null;
  if (!wantsSearch) {
    empty = (
      <Text variant="muted">
        Search the English translation for a word or phrase.
      </Text>
    );
  } else if (status === "error") {
    empty = (
      <Card>
        <View style={{ alignItems: "flex-start", gap: space.md }}>
          <Text variant="soft">Search isn’t available right now.</Text>
          <Button
            kind="secondary"
            title="Try again"
            onPress={() => setAttempt((n) => n + 1)}
          />
        </View>
      </Card>
    );
  } else if (outcome) {
    empty = (
      <Text variant="soft">
        Nothing found for “{outcome.term}”. Try a simpler word.
      </Text>
    );
  } else {
    empty = (
      <View
        style={{ alignItems: "center", flexDirection: "row", gap: space.sm }}
      >
        <ActivityIndicator color={colors.indigo} />
        <Text variant="muted">Loading the search index…</Text>
      </View>
    );
  }

  const hasResults = outcome !== null && outcome.results.length > 0;

  const header = (
    <View style={{ gap: space.md, paddingBottom: space.md }}>
      <Text variant="h1">Find a verse</Text>
      <TextInput
        value={input}
        onChangeText={setInput}
        placeholder="e.g. mercy, patience"
        placeholderTextColor={colors.inkFaint}
        accessibilityLabel="Search the translation"
        autoFocus
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        clearButtonMode="while-editing"
        style={{
          backgroundColor: colors.cottonRaised,
          borderColor: colors.line,
          borderRadius: radius.md,
          borderWidth: 1,
          color: colors.ink,
          fontFamily: fonts.read,
          fontSize: 17,
          minHeight: 48,
          paddingHorizontal: 14,
          paddingVertical: 12,
        }}
      />
      {hasResults ? (
        <Text
          variant="muted"
          accessibilityLiveRegion="polite"
          accessibilityRole="summary"
        >
          {resultCountLabel(outcome)}
        </Text>
      ) : null}
    </View>
  );

  return (
    <View style={{ backgroundColor: colors.cotton, flex: 1 }}>
      <Stack.Screen options={{ title: "Search" }} />
      <FlatList
        data={hasResults ? outcome.results : []}
        keyExtractor={(r) => r.verseKey}
        renderItem={({ item }) => (
          <ResultRow
            result={item}
            surahName={names.get(item.surah)}
            term={outcome?.term ?? ""}
          />
        )}
        ItemSeparatorComponent={Separator}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        initialNumToRender={10}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{
          paddingBottom: insets.bottom + space.xxl,
          paddingHorizontal: space.lg,
          paddingTop: space.lg,
        }}
      />
    </View>
  );
}

function Separator() {
  const { colors } = useTheme();
  return <View style={{ backgroundColor: colors.line, height: 1 }} />;
}
