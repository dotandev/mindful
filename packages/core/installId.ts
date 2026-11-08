// The anonymous install id and local-day key shared by every anonymous signal
// (activeDays, circle reflections). Kept apart so circles and activeDays can
// both use it without importing each other.

const INSTALL_ID_KEY = "mindfulverse.installId.v1";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;
const HEX_RADIX = 16;
const UUID_V4_TEMPLATE = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx";

export function localDay(now: Date): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function randomId(): string {
  const host = globalThis as { crypto?: Partial<Crypto> };
  if (typeof host.crypto?.randomUUID === "function") {
    return host.crypto.randomUUID();
  }
  // Older browsers (Safari < 15.4) and plain-http dev hosts lack randomUUID;
  // a weak id only risks two installs merging in the counts.
  return UUID_V4_TEMPLATE.replaceAll(/[xy]/gu, (ch) => {
    const r = Math.floor(Math.random() * HEX_RADIX);
    // oxlint-disable-next-line no-bitwise -- UUID v4 variant bits
    return (ch === "x" ? r : (r & 0x3) | 0x8).toString(HEX_RADIX);
  });
}

export function getInstallId(): string {
  const stored = localStorage.getItem(INSTALL_ID_KEY);
  if (stored && UUID_PATTERN.test(stored)) {
    return stored;
  }
  const id = randomId();
  localStorage.setItem(INSTALL_ID_KEY, id);
  return id;
}
