// Anonymous "active today" signal: a random install id, the local day and the
// platform, sent once per local day to the InsForge `active_days` table.
// Nothing else leaves the device. Never throws and never blocks startup.
import { insforge } from "./sync/insforge";

export type ActivePlatform = "web" | "android" | "ios";

export interface ActiveDayRow {
  install_id: string;
  day: string;
  platform: ActivePlatform;
}

/** Resolves to the insert error, or null on success. */
export type SendActiveDay = (row: ActiveDayRow) => Promise<unknown>;

const INSTALL_ID_KEY = "mindfulverse.installId.v1";
const LAST_DAY_KEY = "mindfulverse.activeDay.v1";
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

function isDuplicate(err: unknown): boolean {
  const e = err as { code?: string | number; statusCode?: number } | null;
  const code = String(e?.code ?? "");
  return code === "23505" || code === "409" || e?.statusCode === 409;
}

const sendToInsforge: SendActiveDay = async (row) => {
  const { error } = await insforge.database.from("active_days").insert([row]);
  return error;
};

let inFlight = false;

/** Sends today's row unless this install already sent it. Resolves to
 *  whether a row was attempted; never rejects. */
export async function recordActiveDay(
  platform: ActivePlatform,
  now: Date = new Date(),
  send: SendActiveDay = sendToInsforge
): Promise<boolean> {
  if (inFlight) {
    return false;
  }
  inFlight = true;
  try {
    const day = localDay(now);
    if (localStorage.getItem(LAST_DAY_KEY) === day) {
      return false;
    }
    const error = await send({ day, install_id: getInstallId(), platform });
    if (!error || isDuplicate(error)) {
      localStorage.setItem(LAST_DAY_KEY, day);
    }
    return true;
  } catch {
    return false;
  } finally {
    inFlight = false;
  }
}

/** Fire and forget, for app startup. */
export function pingActiveDay(platform: ActivePlatform): void {
  void recordActiveDay(platform);
}
