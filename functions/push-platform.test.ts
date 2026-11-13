import { describe, it, expect, vi, beforeEach } from "vitest";

import handler, {
  assertWritten,
  deliverReminders,
  expoMessage,
  fetchAllRows,
  isAllowedPushEndpoint,
  loadTadabburByUser,
  EXPO_PUSH_URL,
  EXPO_BATCH_SIZE,
} from "./send-reminders";
import type { DueSend, SendDeps } from "./send-reminders";

const continuePayload = JSON.stringify({
  body: "You paused at verse 254. Al-Baqarah is waiting where you left off.",
  title: "Continue your tadabbur — Al-Baqarah",
  url: "/tadabbur/2?v=255",
});

function webRow(n: number, over: Partial<DueSend> = {}): DueSend {
  return {
    endpoint: `https://fcm.googleapis.com/fcm/send/web-${n}`,
    keys: { auth: "a", p256dh: "p" },
    payload: continuePayload,
    platform: "web",
    today: "2026-10-06",
    ...over,
  };
}
function expoRow(n: number, over: Partial<DueSend> = {}): DueSend {
  return {
    endpoint: `ExponentPushToken[tok-${n}]`,
    keys: null,
    payload: continuePayload,
    platform: "expo",
    today: "2026-10-06",
    ...over,
  };
}

interface Ticket {
  status: string;
  id?: string;
  message?: string;
  details?: { error?: string };
}
const ok = (): Ticket => ({ id: "receipt", status: "ok" });

/** fetch mock answering each Expo request with tickets from `ticketsFor`. */
function expoFetch(
  ticketsFor: (msgs: { to: string }[]) => Ticket[] = (m) => m.map(ok)
) {
  return vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
    const msgs = JSON.parse(String(init!.body));
    return new Response(JSON.stringify({ data: ticketsFor(msgs) }), {
      status: 200,
    });
  });
}

function deps(over: Partial<SendDeps> = {}) {
  return {
    fetch: expoFetch() as unknown as typeof fetch,
    markSent: vi.fn(async () => {}),
    prune: vi.fn(async () => {}),
    sendWeb: vi.fn(async () => {}),
    ...over,
  } satisfies SendDeps;
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe(expoMessage, () => {
  it("carries the web payload's title, body and deep link in data.url", () => {
    expect(expoMessage("ExponentPushToken[x]", continuePayload)).toStrictEqual({
      body: "You paused at verse 254. Al-Baqarah is waiting where you left off.",
      data: { url: "/tadabbur/2?v=255" },
      sound: "default",
      title: "Continue your tadabbur — Al-Baqarah",
      to: "ExponentPushToken[x]",
    });
  });
});

describe("deliverReminders — platform branching", () => {
  it("web rows go through web push only, never fetch Expo", async () => {
    const d = deps();
    const counts = await deliverReminders([webRow(1), webRow(2)], d);
    expect(counts).toStrictEqual({
      blocked: 0,
      failed: 0,
      pruned: 0,
      sent: 2,
      writeFailed: 0,
    });
    expect(d.sendWeb).toHaveBeenCalledTimes(2);
    expect(d.sendWeb).toHaveBeenCalledWith(
      webRow(1).endpoint,
      { auth: "a", p256dh: "p" },
      continuePayload
    );
    expect(d.fetch).not.toHaveBeenCalled();
    expect(d.markSent).toHaveBeenCalledWith(webRow(1).endpoint, "2026-10-06");
  });

  it("rows with no platform (pre-migration) are treated as web", async () => {
    const d = deps();
    await deliverReminders([webRow(1, { platform: undefined })], d);
    expect(d.sendWeb).toHaveBeenCalledOnce();
    expect(d.fetch).not.toHaveBeenCalled();
  });

  it("expo rows go to the Expo Push API only, never web push", async () => {
    const d = deps();
    const counts = await deliverReminders([expoRow(1)], d);
    expect(counts).toStrictEqual({
      blocked: 0,
      failed: 0,
      pruned: 0,
      sent: 1,
      writeFailed: 0,
    });
    expect(d.sendWeb).not.toHaveBeenCalled();
    expect(d.fetch).toHaveBeenCalledOnce();
    expect(d.markSent).toHaveBeenCalledWith(
      "ExponentPushToken[tok-1]",
      "2026-10-06"
    );
  });

  it("a user with both a web and an expo row gets one send per row, each stamped separately", async () => {
    const d = deps();
    const counts = await deliverReminders([webRow(1), expoRow(1)], d);
    expect(counts).toStrictEqual({
      blocked: 0,
      failed: 0,
      pruned: 0,
      sent: 2,
      writeFailed: 0,
    });
    expect(d.sendWeb).toHaveBeenCalledOnce();
    expect(d.fetch).toHaveBeenCalledOnce();
    expect((d.markSent as ReturnType<typeof vi.fn>).mock.calls).toStrictEqual(
      expect.arrayContaining([
        [webRow(1).endpoint, "2026-10-06"],
        ["ExponentPushToken[tok-1]", "2026-10-06"],
      ])
    );
  });

  it("an unknown platform is counted as failed and sent nowhere", async () => {
    const d = deps();
    const counts = await deliverReminders([webRow(1, { platform: "apns" })], d);
    expect(counts).toStrictEqual({
      blocked: 0,
      failed: 1,
      pruned: 0,
      sent: 0,
      writeFailed: 0,
    });
    expect(d.sendWeb).not.toHaveBeenCalled();
    expect(d.fetch).not.toHaveBeenCalled();
  });
});

describe("deliverReminders — Expo request", () => {
  it("POSTs a JSON array of messages to the Expo push endpoint", async () => {
    const d = deps();
    await deliverReminders([expoRow(1), expoRow(2)], d);
    const [url, init] = (d.fetch as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0];
    expect(url).toBe(EXPO_PUSH_URL);
    expect(init.method).toBe("POST");
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(init.headers.Authorization).toBeUndefined();
    expect(JSON.parse(init.body)).toStrictEqual([
      expoMessage("ExponentPushToken[tok-1]", continuePayload),
      expoMessage("ExponentPushToken[tok-2]", continuePayload),
    ]);
    expect(JSON.parse(init.body)[0].data).toStrictEqual({
      url: "/tadabbur/2?v=255",
    });
  });

  it("sends Authorization: Bearer only when an access token is configured", async () => {
    const d = deps({ expoAccessToken: "secret-token" });
    await deliverReminders([expoRow(1)], d);
    const init = (d.fetch as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0][1];
    expect(init.headers.Authorization).toBe("Bearer secret-token");
  });

  it("splits more than 100 expo rows into batches of at most 100", async () => {
    const d = deps();
    const rows = Array.from({ length: 250 }, (_, i) => expoRow(i));
    const counts = await deliverReminders(rows, d);
    const { calls } = (d.fetch as unknown as ReturnType<typeof vi.fn>).mock;
    expect(EXPO_BATCH_SIZE).toBe(100);
    expect(calls.map((c) => JSON.parse(c[1].body).length)).toStrictEqual([
      100, 100, 50,
    ]);
    expect(JSON.parse(calls[2][1].body)[49].to).toBe(
      "ExponentPushToken[tok-249]"
    );
    expect(counts).toStrictEqual({
      blocked: 0,
      failed: 0,
      pruned: 0,
      sent: 250,
      writeFailed: 0,
    });
  });
});

describe("deliverReminders — Expo errors", () => {
  it("prunes rows whose ticket says DeviceNotRegistered and does not stamp them", async () => {
    const d = deps({
      fetch: expoFetch((msgs) =>
        msgs.map((m) =>
          m.to === "ExponentPushToken[tok-2]"
            ? {
                details: { error: "DeviceNotRegistered" },
                message: `"${m.to}" is not a registered push notification recipient`,
                status: "error",
              }
            : ok()
        )
      ) as unknown as typeof fetch,
    });
    const counts = await deliverReminders(
      [expoRow(1), expoRow(2), expoRow(3)],
      d
    );
    expect(counts).toStrictEqual({
      blocked: 0,
      failed: 0,
      pruned: 1,
      sent: 2,
      writeFailed: 0,
    });
    expect(d.prune).toHaveBeenCalledWith("ExponentPushToken[tok-2]");
    expect(d.markSent).not.toHaveBeenCalledWith(
      "ExponentPushToken[tok-2]",
      expect.anything()
    );
  });

  it("other ticket errors are logged and counted, not pruned, and the batch continues", async () => {
    const d = deps({
      fetch: expoFetch((msgs) =>
        msgs.map((m, i) =>
          i === 0
            ? {
                details: { error: "MessageRateExceeded" },
                message: `rate limited ${m.to}`,
                status: "error",
              }
            : ok()
        )
      ) as unknown as typeof fetch,
    });
    const counts = await deliverReminders([expoRow(1), expoRow(2)], d);
    expect(counts).toStrictEqual({
      blocked: 0,
      failed: 1,
      pruned: 0,
      sent: 1,
      writeFailed: 0,
    });
    expect(d.prune).not.toHaveBeenCalled();
    // Tokens are redacted from logs.
    const logged = JSON.stringify(
      (console.error as unknown as ReturnType<typeof vi.fn>).mock.calls
    );
    expect(logged).not.toContain("tok-1");
  });

  it("a failed batch request counts its rows as failed and later batches still go out", async () => {
    let call = 0;
    const fetchMock = vi.fn(async (_u: unknown, init?: RequestInit) => {
      call++;
      if (call === 1) {
        return new Response("upstream down", { status: 503 });
      }
      return new Response(
        JSON.stringify({ data: JSON.parse(String(init!.body)).map(ok) }),
        { status: 200 }
      );
    });
    const d = deps({ fetch: fetchMock as unknown as typeof fetch });
    const rows = Array.from({ length: 150 }, (_, i) => expoRow(i));
    const counts = await deliverReminders(rows, d);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(counts).toStrictEqual({
      blocked: 0,
      failed: 100,
      pruned: 0,
      sent: 50,
      writeFailed: 0,
    });
  });

  it("a thrown fetch never propagates and never touches web rows", async () => {
    const d = deps({
      fetch: vi.fn(async () => {
        throw new Error("network");
      }) as unknown as typeof fetch,
    });
    const counts = await deliverReminders([expoRow(1), webRow(1)], d);
    expect(counts).toStrictEqual({
      blocked: 0,
      failed: 1,
      pruned: 0,
      sent: 1,
      writeFailed: 0,
    });
    expect(d.sendWeb).toHaveBeenCalledOnce();
  });

  it("missing tickets are counted as failed", async () => {
    const d = deps({
      fetch: expoFetch(() => [ok()]) as unknown as typeof fetch,
    });
    const counts = await deliverReminders([expoRow(1), expoRow(2)], d);
    expect(counts).toStrictEqual({
      blocked: 0,
      failed: 1,
      pruned: 0,
      sent: 1,
      writeFailed: 0,
    });
  });
});

describe("deliverReminders — web error parity (unchanged behaviour)", () => {
  it.each([404, 410])("prunes a web row on %i", async (statusCode) => {
    const d = deps({
      sendWeb: vi.fn(async () => {
        throw Object.assign(new Error("gone"), { statusCode });
      }),
    });
    const counts = await deliverReminders([webRow(1)], d);
    expect(counts).toStrictEqual({
      blocked: 0,
      failed: 0,
      pruned: 1,
      sent: 0,
      writeFailed: 0,
    });
    expect(d.prune).toHaveBeenCalledWith(webRow(1).endpoint);
    expect(d.markSent).not.toHaveBeenCalled();
  });

  it("other web failures are counted, not pruned", async () => {
    const d = deps({
      sendWeb: vi.fn(async () => {
        throw Object.assign(new Error("boom"), { statusCode: 500 });
      }),
    });
    const counts = await deliverReminders([webRow(1), webRow(2)], d);
    expect(counts).toStrictEqual({
      blocked: 0,
      failed: 2,
      pruned: 0,
      sent: 0,
      writeFailed: 0,
    });
    expect(d.prune).not.toHaveBeenCalled();
  });
});

describe("deliverReminders — failed writes", () => {
  const failing = () =>
    vi.fn(async () => {
      throw new Error("write failed");
    });

  it("a web push whose stamp fails is sent, with the failed write counted apart", async () => {
    const d = deps({ markSent: failing() });
    const counts = await deliverReminders([webRow(1), webRow(2)], d);
    expect(counts).toStrictEqual({
      blocked: 0,
      failed: 0,
      pruned: 0,
      sent: 2,
      writeFailed: 2,
    });
    expect(d.prune).not.toHaveBeenCalled();
  });

  it("an expo push whose stamp fails is sent, with the failed write counted apart", async () => {
    const d = deps({ markSent: failing() });
    const counts = await deliverReminders([expoRow(1)], d);
    expect(counts).toStrictEqual({
      blocked: 0,
      failed: 0,
      pruned: 0,
      sent: 1,
      writeFailed: 1,
    });
  });

  it("a prune that fails is not counted as pruned", async () => {
    const d = deps({
      fetch: expoFetch((msgs) =>
        msgs.map(() => ({
          details: { error: "DeviceNotRegistered" },
          status: "error",
        }))
      ) as unknown as typeof fetch,
      prune: failing(),
      sendWeb: vi.fn(async () => {
        throw Object.assign(new Error("gone"), { statusCode: 410 });
      }),
    });
    const counts = await deliverReminders([webRow(1), expoRow(1)], d);
    expect(counts).toStrictEqual({
      blocked: 0,
      failed: 0,
      pruned: 0,
      sent: 0,
      writeFailed: 2,
    });
  });
});

describe(assertWritten, () => {
  it("throws when the SDK result carries an error", () => {
    expect(() =>
      assertWritten({ error: { message: "permission denied" } }, "stamp")
    ).toThrow("stamp failed");
  });

  it("passes a clean result", () => {
    expect(() => assertWritten({ error: null }, "stamp")).not.toThrow();
  });
});

describe(isAllowedPushEndpoint, () => {
  it.each([
    "https://fcm.googleapis.com/fcm/send/abc",
    "https://updates.push.services.mozilla.com/wpush/v2/abc",
    "https://autopush.push.services.mozilla.com/wpush/v2/abc",
    "https://wns2-by3p.notify.windows.com/w/?token=abc",
    "https://web.push.apple.com/abc",
    "https://FCM.googleapis.com/fcm/send/abc",
  ])("allows %s", (endpoint) => {
    expect(isAllowedPushEndpoint(endpoint)).toBeTruthy();
  });

  it.each([
    "http://fcm.googleapis.com/fcm/send/abc",
    "https://fcm.googleapis.com.evil.example/fcm/send/abc",
    "https://evil.example/fcm.googleapis.com",
    "https://notify.windows.com.evil.example/",
    "https://evilpush.apple.com/abc",
    "https://user@fcm.googleapis.com/fcm/send/abc",
    "https://fcm.googleapis.com:8443/fcm/send/abc",
    "https://169.254.169.254/latest/meta-data",
    "https://localhost/",
    "not a url",
    "",
  ])("refuses %s", (endpoint) => {
    expect(isAllowedPushEndpoint(endpoint)).toBeFalsy();
  });

  it("deliverReminders skips and counts a web row on another host", async () => {
    const d = deps();
    const counts = await deliverReminders(
      [webRow(1, { endpoint: "https://internal.example/hook" }), webRow(2)],
      d
    );
    expect(counts).toStrictEqual({
      blocked: 1,
      failed: 0,
      pruned: 0,
      sent: 1,
      writeFailed: 0,
    });
    expect(d.sendWeb).toHaveBeenCalledOnce();
    expect(d.sendWeb).toHaveBeenCalledWith(
      webRow(2).endpoint,
      expect.anything(),
      expect.anything()
    );
    expect(d.markSent).toHaveBeenCalledOnce();
  });
});

describe(fetchAllRows, () => {
  const table = Array.from({ length: 2500 }, (_, i) => ({ endpoint: `e${i}` }));
  const pageOf = (rows: { endpoint: string }[]) =>
    vi.fn(async (from: number, to: number) => ({
      data: rows.slice(from, to + 1),
      error: null,
    }));

  it("reads past the first 1000 rows", async () => {
    const fetchPage = pageOf(table);
    const { rows, error } = await fetchAllRows(fetchPage);
    expect(error).toBeNull();
    expect(rows).toStrictEqual(table);
    expect(fetchPage.mock.calls).toStrictEqual([
      [0, 999],
      [1000, 1999],
      [2000, 2999],
    ]);
  });

  it("asks once more when the last page is exactly full", async () => {
    const fetchPage = pageOf(table.slice(0, 2000));
    const { rows } = await fetchAllRows(fetchPage);
    expect(rows).toHaveLength(2000);
    expect(fetchPage).toHaveBeenCalledTimes(3);
  });

  it("stops and reports a page error", async () => {
    const boom = { message: "db down" };
    const fetchPage = vi.fn(async (from: number) =>
      from === 0
        ? { data: table.slice(0, 1000), error: null }
        : { data: null, error: boom }
    );
    const { error } = await fetchAllRows(fetchPage);
    expect(error).toBe(boom);
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });
});

describe(loadTadabburByUser, () => {
  const entry = { ayah: 3, updatedAt: 1 };

  it("asks once per chunk of distinct users, not once per user", async () => {
    const ids = Array.from({ length: 250 }, (_, i) => `user-${i}`);
    const fetchChunk = vi.fn(async (chunk: string[]) => ({
      data: chunk.map((user_id) => ({
        surah_tadabbur: { "2": entry },
        user_id,
      })),
      error: null,
    }));
    // A user with two devices appears twice.
    const map = await loadTadabburByUser([...ids, "user-0"], fetchChunk);
    expect(fetchChunk.mock.calls.map((c) => c[0].length)).toStrictEqual([
      100, 100, 50,
    ]);
    expect(map.size).toBe(250);
    expect(map.get("user-249")).toStrictEqual({ "2": entry });
  });

  it("makes no query when nobody is due", async () => {
    const fetchChunk = vi.fn(async () => ({ data: [], error: null }));
    await loadTadabburByUser([], fetchChunk);
    expect(fetchChunk).not.toHaveBeenCalled();
  });

  it("leaves out users with no row or in a failed chunk", async () => {
    const fetchChunk = vi.fn(async (chunk: string[]) =>
      chunk.includes("b")
        ? { data: null, error: { message: "boom" } }
        : {
            data: [{ surah_tadabbur: { "2": entry }, user_id: "a" }],
            error: null,
          }
    );
    const map = await loadTadabburByUser(["a", "missing", "b"], fetchChunk, 2);
    expect([...map.keys()]).toStrictEqual(["a"]);
  });
});

describe(handler, () => {
  const post = (headers: Record<string, string> = {}, body = "{}") =>
    new Request("https://fn.example/send-reminders", {
      body,
      headers,
      method: "POST",
    });

  it("rejects an unauthenticated call before loading any module", async () => {
    // The Deno-only imports cannot load here, so a 401 (not a 500) shows the
    // auth check ran first.
    vi.stubGlobal("Deno", { env: { get: () => {} } });
    const res = await handler(post());
    expect(res.status).toBe(401);
    const noEndpoint = await handler(post({ Authorization: "Bearer token" }));
    expect(noEndpoint.status).toBe(401);
    vi.unstubAllGlobals();
  });

  it("turns an internal error into a generic 500", async () => {
    vi.stubGlobal("Deno", {
      env: {
        get: () => {
          throw new Error("secret detail");
        },
      },
    });
    const res = await handler(post({ Authorization: "Bearer x" }));
    expect(res.status).toBe(500);
    const text = await res.text();
    expect(JSON.parse(text)).toStrictEqual({ error: "internal error" });
    expect(text).not.toContain("secret detail");
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    vi.unstubAllGlobals();
  });
});
