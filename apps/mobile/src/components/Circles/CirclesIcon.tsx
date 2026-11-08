import Svg, { Circle, Path } from "react-native-svg";

const STROKE = 1.6;

/** Circles: three readers around one diamond, drawn like the tab icons. */
export function CirclesIcon({
  color,
  size = 24,
}: {
  color: string;
  size?: number;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 9 L15 12 L12 15 L9 12Z"
        fill="none"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinejoin="round"
      />
      <Circle
        cx={12}
        cy={4}
        r={2}
        fill="none"
        stroke={color}
        strokeWidth={STROKE}
      />
      <Circle
        cx={4.5}
        cy={18}
        r={2}
        fill="none"
        stroke={color}
        strokeWidth={STROKE}
      />
      <Circle
        cx={19.5}
        cy={18}
        r={2}
        fill="none"
        stroke={color}
        strokeWidth={STROKE}
      />
    </Svg>
  );
}
