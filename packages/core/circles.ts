// Circles: a named group reading one surah together. The server holds only the
// name, surah and optional focus verse (migrations/20261108120000_circles.sql);
// reflection text never leaves the device through here: a kept reflection
// sends only the install id, circle code and local date, for an anonymous
// weekly count. Membership is device-local: one joined circle, cached so Home
// works offline.
import { parseSurahNumber } from "./circleSurah";
import { getInstallId, localDay } from "./installId";
import { onEntryAdded } from "./journal";
import { insforge } from "./sync/insforge";

/** a-z and 2-9 without i, l, o, 0, 1. Must match the SQL CHECK. */
export const CIRCLE_CODE_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
export const CIRCLE_CODE_LENGTH = 6;
export const CIRCLE_NAME_MAX = 40;
export const CIRCLE_VERSE_MAX = 286;

export interface Circle {
  code: string;
  name: string;
  surah: number;
  verse: number | null;
  /** Epoch ms of the owner's last change. */
  updatedAt: number;
}

export interface CircleDraft {
  name: string;
  surah: number;
  verse?: number | null;
}

export type CirclePatch = Partial<CircleDraft>;

export type CircleErrorKind =
  | "invalid"
  | "signed-out"
  | "not-found"
  | "network"
  | "unknown";

export interface CircleError {
  kind: CircleErrorKind;
  /** Calm copy, safe to show as is. */
  message: string;
}

export type CircleResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: CircleError };

export type CircleLink =
  | { kind: "code"; code: string }
  | { kind: "surah"; surah: number };

const ERROR_COPY: Record<CircleErrorKind, string> = {
  invalid: "Check the circle's name, surah and verse.",
  network: "Couldn't reach the server. Check your connection and try again.",
  "not-found": "This circle isn't available any more.",
  "signed-out": "Sign in to start or change a circle.",
  unknown: "Something went wrong. Please try again.",
};

export function circleError(kind: CircleErrorKind): CircleError {
  return { kind, message: ERROR_COPY[kind] };
}

const CODE_PATTERN = /^[a-hjkmnp-z2-9]{6}$/u;
const WHITESPACE = /\s+/gu;
const CIRCLE_PATH = /(?:^|\/)circle\/([^/?#]+)/iu;
const SURAH_DIGITS = /^\d{1,3}$/u;
const BYTE_RANGE = 256;
const MAX_CREATE_ATTEMPTS = 3;
const LIST_LIMIT = 50;
const COLUMNS = "code, name, surah, verse, updated_at";

export function isCircleCode(raw: unknown): raw is string {
  return typeof raw === "string" && CODE_PATTERN.test(raw);
}

/** Trims and collapses whitespace, caps at 40 characters. Null when empty. */
export function normalizeName(raw: unknown): string | null {
  if (typeof raw !== "string") {
    return null;
  }
  const collapsed = raw.replaceAll(WHITESPACE, " ").trim();
  const capped = [...collapsed].slice(0, CIRCLE_NAME_MAX).join("").trimEnd();
  return capped.length > 0 ? capped : null;
}

export function parseVerseNumber(raw: unknown): number | null {
  const n = typeof raw === "string" ? Number(raw) : raw;
  return typeof n === "number" &&
    Number.isInteger(n) &&
    n >= 1 &&
    n <= CIRCLE_VERSE_MAX
    ? n
    : null;
}

/** Accepts a bare code, an old surah number, a path (/circle/x) or a full
 *  web or app link. Old numeric links stay surah links. */
export function parseCircleLink(raw: unknown): CircleLink | null {
  if (typeof raw !== "string" && typeof raw !== "number") {
    return null;
  }
  const text = String(raw).trim();
  const match = CIRCLE_PATH.exec(text);
  let segment = match?.[1] ?? text;
  try {
    segment = decodeURIComponent(segment);
  } catch {
    return null;
  }
  segment = segment.trim().toLowerCase();
  if (isCircleCode(segment)) {
    return { code: segment, kind: "code" };
  }
  if (SURAH_DIGITS.test(segment)) {
    const surah = parseSurahNumber(segment);
    return surah === null ? null : { kind: "surah", surah };
  }
  return null;
}

export function circlePath(code: string): string {
  return `/circle/${code}`;
}

export type RandomBytes = (length: number) => Uint8Array;

const defaultRandomBytes: RandomBytes = (length) => {
  const bytes = new Uint8Array(length);
  const host = globalThis as {
    crypto?: { getRandomValues?: (array: Uint8Array) => Uint8Array };
  };
  if (typeof host.crypto?.getRandomValues === "function") {
    host.crypto.getRandomValues(bytes);
    return bytes;
  }
  // Hermes without a getRandomValues shim: codes are links, not secrets, and
  // a collision only costs a retry on insert.
  for (let i = 0; i < length; i += 1) {
    bytes[i] = Math.floor(Math.random() * BYTE_RANGE);
  }
  return bytes;
};

export function newCircleCode(
  random: RandomBytes = defaultRandomBytes
): string {
  const size = CIRCLE_CODE_ALPHABET.length;
  // Rejection sampling keeps every character equally likely.
  const limit = BYTE_RANGE - (BYTE_RANGE % size);
  let code = "";
  while (code.length < CIRCLE_CODE_LENGTH) {
    for (const byte of random(CIRCLE_CODE_LENGTH)) {
      if (byte < limit && code.length < CIRCLE_CODE_LENGTH) {
        code += CIRCLE_CODE_ALPHABET[byte % size];
      }
    }
  }
  return code;
}

// ---- Server ----

export interface CircleRow {
  code: string;
  name: string;
  surah: number;
  verse: number | null;
  updated_at: string;
}

export interface CircleInsert {
  code: string;
  name: string;
  surah: number;
  verse: number | null;
}

export type CircleUpdate = Partial<Omit<CircleInsert, "code">>;

interface ApiResponse<T> {
  data: T | null;
  error: unknown;
}

/** The server surface, injectable for tests. */
export interface CircleApi {
  insert(row: CircleInsert): Promise<ApiResponse<CircleRow[]>>;
  update(code: string, patch: CircleUpdate): Promise<ApiResponse<CircleRow[]>>;
  remove(code: string): Promise<ApiResponse<Pick<CircleRow, "code">[]>>;
  listMine(): Promise<ApiResponse<CircleRow[]>>;
  get(code: string): Promise<ApiResponse<CircleRow[]>>;
}

export const insforgeCircleApi: CircleApi = {
  get: async (code) =>
    await insforge.database.rpc("get_circle", { p_code: code }),
  insert: async (row) =>
    await insforge.database.from("circles").insert([row]).select(COLUMNS),
  listMine: async () =>
    await insforge.database
      .from("circles")
      .select(COLUMNS)
      .order("updated_at", { ascending: false })
      .limit(LIST_LIMIT),
  remove: async (code) =>
    await insforge.database
      .from("circles")
      .delete()
      .eq("code", code)
      .select("code"),
  update: async (code, patch) =>
    await insforge.database
      .from("circles")
      .update(patch)
      .eq("code", code)
      .select(COLUMNS),
};

export function circleFromRow(row: unknown): Circle | null {
  const r = row as Partial<CircleRow> | null;
  const code = r?.code;
  const name = normalizeName(r?.name);
  const surah = parseSurahNumber(r?.surah);
  if (!isCircleCode(code) || name === null || surah === null) {
    return null;
  }
  const updatedAt = Date.parse(String(r?.updated_at ?? ""));
  return {
    code,
    name,
    surah,
    updatedAt: Number.isFinite(updatedAt) ? updatedAt : 0,
    verse: parseVerseNumber(r?.verse),
  };
}

function errorCode(err: unknown): string {
  const e = err as { code?: unknown; statusCode?: unknown; status?: unknown };
  return String(e?.code ?? e?.statusCode ?? e?.status ?? "");
}

function isDuplicate(err: unknown): boolean {
  const code = errorCode(err);
  return code === "23505" || code === "409";
}

const SIGNED_OUT_CODES = new Set([
  "42501",
  "PGRST301",
  "PGRST302",
  "401",
  "403",
]);
const INVALID_CODES = new Set(["23514", "23502", "22P02", "22001", "400"]);

export function toCircleError(err: unknown): CircleError {
  const code = errorCode(err);
  if (SIGNED_OUT_CODES.has(code)) {
    return circleError("signed-out");
  }
  if (INVALID_CODES.has(code)) {
    return circleError("invalid");
  }
  const message = String((err as { message?: unknown })?.message ?? "");
  if (err instanceof TypeError || /network|fetch|timeout/iu.test(message)) {
    return circleError("network");
  }
  return circleError("unknown");
}

function fail<T>(error: CircleError): CircleResult<T> {
  return { error, ok: false };
}

function firstCircle(data: CircleRow[] | null): CircleResult<Circle> {
  const circle = circleFromRow(data?.[0]);
  return circle ? { ok: true, value: circle } : fail(circleError("not-found"));
}

function validateDraft(
  draft: CircleDraft
): CircleResult<Omit<CircleInsert, "code">> {
  const name = normalizeName(draft.name);
  const surah = parseSurahNumber(draft.surah);
  const verse =
    draft.verse === null || draft.verse === undefined
      ? null
      : parseVerseNumber(draft.verse);
  const badVerse =
    verse === null && draft.verse !== null && draft.verse !== undefined;
  if (name === null || surah === null || badVerse) {
    return fail(circleError("invalid"));
  }
  return { ok: true, value: { name, surah, verse } };
}

/** Signed-in only. Retries with a fresh code if the code is taken, and joins
 *  the new circle on this device. */
export async function createCircle(
  draft: CircleDraft,
  api: CircleApi = insforgeCircleApi,
  random: RandomBytes = defaultRandomBytes
): Promise<CircleResult<Circle>> {
  const valid = validateDraft(draft);
  if (!valid.ok) {
    return valid;
  }
  try {
    for (let attempt = 0; attempt < MAX_CREATE_ATTEMPTS; attempt += 1) {
      const { data, error } = await api.insert({
        ...valid.value,
        code: newCircleCode(random),
      });
      if (!error) {
        const result = firstCircle(data);
        if (result.ok) {
          joinCircle(result.value);
        }
        return result;
      }
      if (!isDuplicate(error)) {
        return fail(toCircleError(error));
      }
    }
    return fail(circleError("unknown"));
  } catch (error) {
    return fail(toCircleError(error));
  }
}

/** Owner only. Keeps this device's joined copy in step. */
export async function updateCircle(
  code: string,
  patch: CirclePatch,
  api: CircleApi = insforgeCircleApi
): Promise<CircleResult<Circle>> {
  if (!isCircleCode(code)) {
    return fail(circleError("invalid"));
  }
  const update: CircleUpdate = {};
  if (patch.name !== undefined) {
    const name = normalizeName(patch.name);
    if (name === null) {
      return fail(circleError("invalid"));
    }
    update.name = name;
  }
  if (patch.surah !== undefined) {
    const surah = parseSurahNumber(patch.surah);
    if (surah === null) {
      return fail(circleError("invalid"));
    }
    update.surah = surah;
  }
  if (patch.verse !== undefined) {
    const verse = patch.verse === null ? null : parseVerseNumber(patch.verse);
    if (patch.verse !== null && verse === null) {
      return fail(circleError("invalid"));
    }
    update.verse = verse;
  }
  try {
    const { data, error } = await api.update(code, update);
    if (error) {
      return fail(toCircleError(error));
    }
    const result = firstCircle(data);
    if (result.ok && getJoinedCircle()?.code === code) {
      writeJoined(result.value);
    }
    return result;
  } catch (error) {
    return fail(toCircleError(error));
  }
}

/** Owner only. Leaves the circle on this device too if it was joined. */
export async function deleteCircle(
  code: string,
  api: CircleApi = insforgeCircleApi
): Promise<CircleResult<null>> {
  if (!isCircleCode(code)) {
    return fail(circleError("invalid"));
  }
  try {
    const { data, error } = await api.remove(code);
    if (error) {
      return fail(toCircleError(error));
    }
    if (!data?.length) {
      return fail(circleError("not-found"));
    }
    if (getJoinedCircle()?.code === code) {
      leaveCircle();
    }
    return { ok: true, value: null };
  } catch (error) {
    return fail(toCircleError(error));
  }
}

/** The signed-in person's own circles, most recently changed first. */
export async function listMyCircles(
  api: CircleApi = insforgeCircleApi
): Promise<CircleResult<Circle[]>> {
  try {
    const { data, error } = await api.listMine();
    if (error) {
      return fail(toCircleError(error));
    }
    const circles = (data ?? [])
      .map(circleFromRow)
      .filter((c): c is Circle => c !== null);
    return { ok: true, value: circles };
  } catch (error) {
    return fail(toCircleError(error));
  }
}

/** Reads one circle by code; works signed out. */
export async function fetchCircle(
  code: string,
  api: CircleApi = insforgeCircleApi
): Promise<CircleResult<Circle>> {
  if (!isCircleCode(code)) {
    return fail(circleError("not-found"));
  }
  try {
    const { data, error } = await api.get(code);
    if (error) {
      return fail(toCircleError(error));
    }
    return firstCircle(data);
  } catch (error) {
    return fail(toCircleError(error));
  }
}

// ---- Device-local membership ----

const JOINED_KEY = "mindfulverse.circle.v1";
// circleSurah.ts's key: a named circle replaces an old numeric circle link.
const LEGACY_SURAH_KEY = "mindfulverse.circleSurah.v1";

type Listener = (circle: Circle | null) => void;
const listeners = new Set<Listener>();

function notify(circle: Circle | null): void {
  for (const listener of listeners) {
    listener(circle);
  }
}

/** Called after join, leave or a refresh that changed the cached circle. */
export function onJoinedCircleChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getJoinedCircle(): Circle | null {
  try {
    const raw = localStorage.getItem(JOINED_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<Circle>;
    return circleFromRow({
      ...parsed,
      updated_at: new Date(Number(parsed.updatedAt) || 0).toISOString(),
    });
  } catch {
    return null;
  }
}

function writeJoined(circle: Circle): Circle | null {
  const valid = circleFromRow({
    ...circle,
    updated_at: new Date(circle.updatedAt).toISOString(),
  });
  if (!valid) {
    return null;
  }
  try {
    localStorage.setItem(JOINED_KEY, JSON.stringify(valid));
  } catch {
    return null;
  }
  notify(valid);
  return valid;
}

/** Replaces any joined circle (and any old numeric circle surah) on this
 *  device. Returns false for a malformed circle. */
export function joinCircle(circle: Circle): boolean {
  if (!writeJoined(circle)) {
    return false;
  }
  try {
    localStorage.removeItem(LEGACY_SURAH_KEY);
  } catch {
    return true;
  }
  return true;
}

export function leaveCircle(): void {
  try {
    localStorage.removeItem(JOINED_KEY);
  } catch {
    return;
  }
  notify(null);
}

function sameCircle(a: Circle, b: Circle): boolean {
  return (
    a.name === b.name &&
    a.surah === b.surah &&
    a.verse === b.verse &&
    a.updatedAt === b.updatedAt
  );
}

/** Refetches the joined circle. Clears membership and resolves null when the
 *  circle is gone; keeps the cached copy when offline or on any other error. */
export async function refreshJoinedCircle(
  fetcher: (code: string) => Promise<CircleResult<Circle>> = fetchCircle
): Promise<Circle | null> {
  const cached = getJoinedCircle();
  if (!cached) {
    return null;
  }
  const result = await fetcher(cached.code);
  if (result.ok) {
    if (getJoinedCircle()?.code !== cached.code) {
      return getJoinedCircle();
    }
    if (!sameCircle(cached, result.value)) {
      writeJoined(result.value);
    }
    return result.value;
  }
  if (
    result.error.kind === "not-found" &&
    getJoinedCircle()?.code === cached.code
  ) {
    leaveCircle();
    return null;
  }
  return cached;
}

// ---- Anonymous weekly count ----

/** The one row a kept reflection sends: no text, no verse. */
export interface CircleReflectionRow {
  install_id: string;
  circle_code: string;
  day: string;
}

/** Resolves to the insert error, or null on success. */
export type SendCircleReflection = (
  row: CircleReflectionRow
) => Promise<unknown>;

export type FetchWeekCount = (code: string) => Promise<ApiResponse<unknown>>;

const LAST_REFLECTION_KEY = "mindfulverse.circleReflection.v1";
const MIN_SHOWN_COUNT = 2;

const sendReflectionToInsforge: SendCircleReflection = async (row) => {
  const { error } = await insforge.database
    .from("circle_reflections")
    .insert([row]);
  return error;
};

const fetchWeekCountFromInsforge: FetchWeekCount = async (code) =>
  await insforge.database.rpc("circle_week_count", { p_code: code });

/** Sends today's row for the joined circle, once per circle and local day.
 *  A no-op outside a circle. Resolves to whether a row was attempted; never
 *  rejects. */
export async function recordCircleReflection(
  now: Date = new Date(),
  send: SendCircleReflection = sendReflectionToInsforge
): Promise<boolean> {
  try {
    const code = getJoinedCircle()?.code;
    if (!code) {
      return false;
    }
    const day = localDay(now);
    const sentKey = `${code}:${day}`;
    if (localStorage.getItem(LAST_REFLECTION_KEY) === sentKey) {
      return false;
    }
    const error = await send({
      circle_code: code,
      day,
      install_id: getInstallId(),
    });
    if (!error || isDuplicate(error)) {
      localStorage.setItem(LAST_REFLECTION_KEY, sentKey);
    }
    return true;
  } catch {
    return false;
  }
}

let unwireReflections: (() => void) | null = null;

/** Counts every kept journal reflection toward the joined circle. Call once
 *  at app startup; repeat calls are no-ops. Returns an unsubscribe. */
export function wireCircleReflections(
  send: SendCircleReflection = sendReflectionToInsforge
): () => void {
  if (!unwireReflections) {
    const off = onEntryAdded(() => {
      void recordCircleReflection(new Date(), send);
    });
    unwireReflections = () => {
      off();
      unwireReflections = null;
    };
  }
  return unwireReflections;
}

function countFrom(data: unknown): number | null {
  const value = Array.isArray(data)
    ? (data[0] as { circle_week_count?: unknown } | undefined)
        ?.circle_week_count
    : data;
  const n = typeof value === "string" ? Number(value) : value;
  return typeof n === "number" && Number.isInteger(n) && n >= 0 ? n : null;
}

/** Distinct installs in the circle that kept a reflection in the last 7 days
 *  (server UTC date). Null on any error. */
export async function fetchCircleWeekCount(
  code: string,
  fetcher: FetchWeekCount = fetchWeekCountFromInsforge
): Promise<number | null> {
  if (!isCircleCode(code)) {
    return null;
  }
  try {
    const { data, error } = await fetcher(code);
    return error ? null : countFrom(data);
  } catch {
    return null;
  }
}

/** Null below 2 so a lone member is never singled out. */
export function circleCountLine(name: string, n: number): string | null {
  if (!Number.isFinite(n) || n < MIN_SHOWN_COUNT) {
    return null;
  }
  return `${Math.floor(n)} people in ${name} kept a reflection this week.`;
}
