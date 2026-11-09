import Svg, { Circle, Path } from "react-native-svg";

/** A magnifier on the tab icons' 24-unit grid and line weight. */
export function SearchIcon({
  color,
  size = 22,
}: {
  color: string;
  size?: number;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle
        cx={10.5}
        cy={10.5}
        r={6.5}
        fill="none"
        stroke={color}
        strokeWidth={1.6}
      />
      <Path
        d="M15.4 15.4 L20.5 20.5"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
    </Svg>
  );
}
