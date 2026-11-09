import { ActivityIndicator, Pressable } from "react-native";
import type { PressableProps, ViewStyle } from "react-native";

import { tapLight } from "../platform/haptics";
import { fonts, radius, useTheme } from "../theme";
import { useOnCloth } from "./adire";
import { Text } from "./Text";

export type ButtonKind =
  | "primary"
  | "secondary"
  | "ghost"
  | "cloth"
  | "clothQuiet";

/** Web's .btn: flat indigo block, square-shouldered; .secondary is outlined,
 *  .ghost is a bare link-style action. `cloth` is the cotton button that sits
 *  on an AdireCloth panel; `clothQuiet` is its outlined form, for a row of
 *  choices where only one action should be filled. Primary and cloth buttons
 *  tap lightly on press. */
export function Button({
  title,
  kind = "primary",
  busy = false,
  disabled,
  style,
  onPress,
  ...rest
}: Omit<PressableProps, "children" | "style"> & {
  title: string;
  kind?: ButtonKind;
  busy?: boolean;
  style?: ViewStyle;
}) {
  const { colors, scheme } = useTheme();
  const onCloth = useOnCloth();
  const filled = kind === "primary";
  const cloth = kind === "cloth";
  const clothQuiet = kind === "clothQuiet";
  // On night cloth a cotton button would read as a dark slab: use the light indigo instead.
  const clothFace = scheme === "dark" ? colors.indigo : colors.cottonRaised;
  const clothText = scheme === "dark" ? colors.cotton : colors.indigoDeep;
  // A disabled filled button becomes an empty outline: clearly off, no new colour
  // (half-strength indigo over cotton reads as a muddy violet).
  const off = !!disabled && !busy && (filled || cloth);
  const fg = off
    ? colors.inkFaint
    : filled
      ? colors.cottonRaised
      : cloth
        ? clothText
        : clothQuiet
          ? onCloth.strong
          : colors.indigo;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ busy, disabled: !!(disabled || busy) }}
      disabled={disabled || busy}
      {...rest}
      onPress={(e) => {
        if (filled || cloth) {
          tapLight();
        }
        onPress?.(e);
      }}
      style={({ pressed }) => [
        {
          alignItems: "center",
          backgroundColor: off
            ? "transparent"
            : cloth
              ? pressed
                ? scheme === "dark"
                  ? colors.indigoDeep
                  : colors.indigoWash
                : clothFace
              : filled
                ? pressed
                  ? colors.indigoDeep
                  : colors.indigo
                : pressed && kind === "secondary"
                  ? colors.indigoWash
                  : pressed && clothQuiet
                    ? "rgba(255,255,255,0.08)"
                    : "transparent",
          borderColor: off
            ? colors.lineStrong
            : kind === "ghost"
              ? "transparent"
              : cloth
                ? clothFace
                : clothQuiet
                  ? onCloth.soft
                  : pressed && filled
                    ? colors.indigoDeep
                    : colors.indigo,
          borderRadius: radius.sm,
          borderWidth: 1,
          flexDirection: "row",
          gap: 8,
          justifyContent: "center",
          minHeight: 44,
          opacity: disabled && !off ? 0.5 : 1,
          paddingHorizontal: kind === "ghost" ? 4 : 16,
          paddingVertical: 8,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
        style,
      ]}
    >
      {busy ? <ActivityIndicator color={fg} /> : null}
      <Text
        style={{
          color: fg,
          fontFamily: fonts.read,
          fontSize: 15.5,
          lineHeight: 20,
        }}
      >
        {title}
      </Text>
    </Pressable>
  );
}
