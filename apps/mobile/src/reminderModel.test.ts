import { describe, expect, it } from "vitest";

import {
  dropsBackstopOnPush,
  enableOutcome,
  isLeftoverLocal,
  isServerDailyVerse,
  NOT_ALLOWED,
  parseBackstop,
  shownReminder,
  timeChangeTargets,
  turnOffTargets,
} from "./reminderModel";

describe(enableOutcome, () => {
  it("uses push alone once the test push went out", () => {
    expect(enableOutcome("ok", { error: null, welcomed: true })).toStrictEqual({
      kind: "push",
    });
  });

  it("backs push up on the phone when the test push did not go out", () => {
    expect(enableOutcome("ok", { error: null, welcomed: false })).toStrictEqual(
      { backstop: "unconfirmed", kind: "backstop" }
    );
  });

  it("falls back to the phone when registering for push fails", () => {
    expect(
      enableOutcome("ok", { error: "Couldn’t turn on", welcomed: false })
    ).toStrictEqual({ backstop: "push-failed", kind: "backstop" });
  });

  it("turns nothing on when notifications were refused", () => {
    expect(
      enableOutcome("ok", { error: NOT_ALLOWED, welcomed: false })
    ).toStrictEqual({ kind: "refused" });
  });

  it("stays on the phone alone in a build without push", () => {
    expect(enableOutcome("not-configured", null)).toStrictEqual({
      kind: "local",
    });
    expect(enableOutcome("no-project", null)).toStrictEqual({ kind: "local" });
  });
});

describe(turnOffTargets, () => {
  it("cancels both where push exists", () => {
    expect(turnOffTargets("ok")).toStrictEqual({ local: true, push: true });
  });

  it("cancels only the phone's schedule without push", () => {
    expect(turnOffTargets("not-configured")).toStrictEqual({
      local: true,
      push: false,
    });
  });
});

describe(timeChangeTargets, () => {
  it("updates push alone when there is no backstop", () => {
    expect(timeChangeTargets("ok", "none")).toStrictEqual({
      local: false,
      push: true,
    });
  });

  it("updates both while a backstop is running", () => {
    expect(timeChangeTargets("ok", "unconfirmed")).toStrictEqual({
      local: true,
      push: true,
    });
    expect(timeChangeTargets("ok", "push-failed")).toStrictEqual({
      local: true,
      push: true,
    });
  });

  it("updates the phone's schedule without push", () => {
    expect(timeChangeTargets("not-configured", "none")).toStrictEqual({
      local: true,
      push: false,
    });
  });
});

describe(dropsBackstopOnPush, () => {
  it("drops an unconfirmed backstop once a push arrives", () => {
    expect(dropsBackstopOnPush("unconfirmed")).toBeTruthy();
  });

  it("keeps a backstop that stands in for a failed registration", () => {
    expect(dropsBackstopOnPush("push-failed")).toBeFalsy();
  });

  it("has nothing to drop without a backstop", () => {
    expect(dropsBackstopOnPush("none")).toBeFalsy();
  });
});

describe(shownReminder, () => {
  const push = { time: "07:00" };
  const local = { time: "08:15" };

  it("shows the push reminder where push exists", () => {
    expect(shownReminder("ok", "unconfirmed", push, local)).toBe(push);
    expect(shownReminder("ok", "none", push, null)).toBe(push);
  });

  it("shows the backstop when push has no registration", () => {
    expect(shownReminder("ok", "push-failed", null, local)).toBe(local);
  });

  it("ignores a leftover on-device reminder", () => {
    expect(shownReminder("ok", "none", null, local)).toBeNull();
  });

  it("shows the phone's schedule without push", () => {
    expect(shownReminder("not-configured", "none", null, local)).toBe(local);
  });
});

describe(isLeftoverLocal, () => {
  it("spots an on-device reminder nobody asked this build for", () => {
    expect(isLeftoverLocal("ok", "none", true)).toBeTruthy();
  });

  it("leaves a backstop and a push-less build alone", () => {
    expect(isLeftoverLocal("ok", "unconfirmed", true)).toBeFalsy();
    expect(isLeftoverLocal("not-configured", "none", true)).toBeFalsy();
    expect(isLeftoverLocal("ok", "none", false)).toBeFalsy();
  });
});

describe(isServerDailyVerse, () => {
  it("accepts the server's pushes", () => {
    expect(
      isServerDailyVerse({ data: { url: "/checkin" }, viaPush: true })
    ).toBeTruthy();
    expect(
      isServerDailyVerse({ data: { url: "/tadabbur/94?v=5" }, viaPush: true })
    ).toBeTruthy();
  });

  it("rejects the phone's own reminder and other pushes", () => {
    expect(
      isServerDailyVerse({ data: { url: "/checkin" }, viaPush: false })
    ).toBeFalsy();
    expect(
      isServerDailyVerse({ data: { url: "/read" }, viaPush: true })
    ).toBeFalsy();
    expect(isServerDailyVerse({ data: null, viaPush: true })).toBeFalsy();
  });
});

describe(parseBackstop, () => {
  it("reads the stored flag and treats anything else as none", () => {
    expect(parseBackstop("unconfirmed")).toBe("unconfirmed");
    expect(parseBackstop("push-failed")).toBe("push-failed");
    expect(parseBackstop(null)).toBe("none");
    expect(parseBackstop("1")).toBe("none");
  });
});
