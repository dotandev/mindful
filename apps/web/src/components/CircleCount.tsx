import { circleCountLine } from "@mindfulverse/core/circles";

import { useCircleWeekCount } from "../lib/useCircleWeekCount";

import "./week.css";

/** "<N> people in <name> kept a reflection this week." Nothing below two. */
export default function CircleCount({
  code,
  name,
  className,
}: {
  code: string;
  name: string;
  className?: string;
}) {
  const count = useCircleWeekCount(code);
  const line = count === null ? null : circleCountLine(name, count);
  if (line === null) {
    return null;
  }
  return (
    <p className={className ? `circle-count ${className}` : "circle-count"}>
      {line}
    </p>
  );
}
