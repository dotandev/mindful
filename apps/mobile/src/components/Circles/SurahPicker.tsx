// Choose a circle's surah: the /tadabbur picker's search and rows, in a sheet,
// returning the choice instead of navigating.
import type { SurahMeta } from "@mindfulverse/core/types";
import { useMemo, useState } from "react";
import { FlatList, Pressable, TextInput, View } from "react-native";

import { fonts, radius, space, useTheme } from "../../theme";
import { Diamond, Sheet, Text } from "../../ui";
import { IndexDivider } from "../Reader/IndexRows";
import { filterSurahs } from "./circleModel";

export function SurahPicker({
  surahs,
  selected,
  onPick,
  onClose,
}: {
  surahs: SurahMeta[];
  selected: number | null;
  onPick: (surah: SurahMeta) => void;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => filterSurahs(surahs, query), [surahs, query]);

  return (
    <Sheet label="Choose a surah" title="Choose a surah" onClose={onClose}>
      <View style={{ paddingBottom: space.sm, paddingHorizontal: space.lg }}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Find a surah by name or number"
          placeholderTextColor={colors.inkFaint}
          accessibilityLabel="Find a surah by name or number"
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          clearButtonMode="while-editing"
          style={{
            backgroundColor: colors.cotton,
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
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(s) => String(s.number)}
        initialNumToRender={12}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ItemSeparatorComponent={IndexDivider}
        contentContainerStyle={{
          paddingBottom: space.lg,
          paddingHorizontal: space.lg,
        }}
        ListEmptyComponent={
          <Text variant="muted">
            No surah matches that. Try a different name or a number from 1 to
            114.
          </Text>
        }
        renderItem={({ item }) => {
          const chosen = item.number === selected;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: chosen }}
              accessibilityLabel={`Surah ${item.number}, ${item.name}, ${item.ayahCount} verses`}
              onPress={() => onPick(item)}
              style={({ pressed }) => ({
                alignItems: "center",
                backgroundColor:
                  pressed || chosen ? colors.indigoWash : "transparent",
                borderRadius: radius.md,
                flexDirection: "row",
                gap: 14,
                marginHorizontal: -space.sm,
                minHeight: 56,
                paddingHorizontal: space.sm,
                paddingVertical: 10,
              })}
            >
              <Diamond label={item.number} size={40} tone="outline" />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                  style={{
                    fontFamily: fonts.readSemiBold,
                    fontSize: 17.5,
                    lineHeight: 24,
                  }}
                >
                  {item.name}
                </Text>
                <Text variant="muted" style={{ fontSize: 14, lineHeight: 20 }}>
                  {`${item.ayahCount} verses`}
                </Text>
              </View>
            </Pressable>
          );
        }}
      />
    </Sheet>
  );
}
