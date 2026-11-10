import type { ReactNode } from "react";
import { Link } from "react-router-dom";

/** The one back link: quiet text with a leading arrow and a 44px hit area
 *  (.back-link in index.css). */
export default function BackLink({
  to,
  children,
}: {
  to: string;
  children: ReactNode;
}) {
  return (
    <Link to={to} className="muted back-link">
      <span aria-hidden="true">← </span>
      {children}
    </Link>
  );
}
