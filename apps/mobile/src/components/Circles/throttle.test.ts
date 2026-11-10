import { describe, expect, it } from "vitest";

import { CIRCLE_REFETCH_MS, createThrottle } from "./throttle";

describe(createThrottle, () => {
  it("fetches straight away the first time", () => {
    expect(createThrottle().due("abc234", 1000)).toBeTruthy();
  });

  it("holds the same circle back for two minutes", () => {
    const throttle = createThrottle();
    throttle.due("abc234", 1000);
    expect(throttle.due("abc234", 1000 + CIRCLE_REFETCH_MS - 1)).toBeFalsy();
    expect(throttle.due("abc234", 1000 + CIRCLE_REFETCH_MS)).toBeTruthy();
  });

  it("counts the gap from the last fetch, not the last ask", () => {
    const throttle = createThrottle(100);
    throttle.due("abc234", 0);
    expect(throttle.due("abc234", 60)).toBeFalsy();
    expect(throttle.due("abc234", 110)).toBeTruthy();
  });

  it("fetches straight away after a change of circle", () => {
    const throttle = createThrottle();
    throttle.due("abc234", 1000);
    expect(throttle.due("zzz999", 1001)).toBeTruthy();
  });

  it("fetches again if the clock went backwards", () => {
    const throttle = createThrottle();
    throttle.due("abc234", 5000);
    expect(throttle.due("abc234", 10)).toBeTruthy();
  });
});
