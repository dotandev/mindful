import { circleCountLine } from "@mindfulverse/core/circles";

import { useCircleWeekCount } from "../lib/useCircleWeekCount";

import "./week.css";

/** "<N> in <name> reflected this week", or "<N> people…" with no name.
 *  Nothing below two. */
export default function CircleCount({
  code,
  name,
  className,
}: {
  code: string;
  name?: string;
  className?: string;
}) {
  const count = useCircleWeekCount(code);
  const line = count === null ? null : circleCountLine(name ?? null, count);
  if (line === null) {
    return null;
  }
  return (
    <p className={className ? `circle-count ${className}` : "circle-count"}>
      {line}
    </p>
  );
}
