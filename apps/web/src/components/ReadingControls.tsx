import { SIZES } from "@mindfulverse/core/readingPrefs";

const SIZE_NAMES: Record<string, string> = {
  l: "large",
  m: "medium",
  s: "small",
};

/** The text size choice, shown inside the "Text size" sheet
 *  (components/ReaderTools.tsx). It applies at once. The Translation /
 *  Reading switch lives on the toolbar itself. */
export default function ReadingControls({
  sizeKey,
  onSize,
}: {
  sizeKey: string;
  onSize: (k: string) => void;
}) {
  return (
    <div className="display-choices">
      <div className="display-choice">
        <div className="reading-controls" role="group" aria-label="Text size">
          {SIZES.map((s, i) => (
            <button
              type="button"
              key={s.key}
              className="size-btn"
              aria-pressed={s.key === sizeKey}
              onClick={() => onSize(s.key)}
              style={{ fontSize: `${0.82 + i * 0.2}rem` }}
              aria-label={`Reading size ${SIZE_NAMES[s.key] ?? s.key}`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
