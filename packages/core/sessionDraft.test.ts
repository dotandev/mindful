import { beforeEach, describe, expect, it, vi } from "vitest";

const store = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (k: string) => store.get(k) ?? null,
  removeItem: (k: string) => void store.delete(k),
  setItem: (k: string, v: string) => void store.set(k, v),
});

import {
  clearSessionDraft,
  readSessionDraft,
  writeSessionDraft,
} from "./sessionDraft";

beforeEach(() => {
  store.clear();
});

describe(readSessionDraft, () => {
  it("is empty when nothing was written", () => {
    expect(readSessionDraft("patience")).toStrictEqual({
      action: "",
      body: "",
    });
  });

  it("returns what was written, per session", () => {
    writeSessionDraft("patience", { action: "call mum", body: "it stayed" });
    expect(readSessionDraft("patience")).toStrictEqual({
      action: "call mum",
      body: "it stayed",
    });
    expect(readSessionDraft("gratitude").body).toBe("");
  });

  it("survives corrupt storage", () => {
    store.set("mindfulverse.sessionDraft.v1:patience", "{bad");
    expect(readSessionDraft("patience").body).toBe("");
    store.set("mindfulverse.sessionDraft.v1:patience", '{"body":3}');
    expect(readSessionDraft("patience").body).toBe("");
  });
});

describe(writeSessionDraft, () => {
  it("removes the draft once both fields are blank", () => {
    writeSessionDraft("patience", { action: "", body: "words" });
    expect(store.size).toBe(1);
    writeSessionDraft("patience", { action: " ", body: "" });
    expect(store.size).toBe(0);
  });

  it("clearSessionDraft forgets the session's draft", () => {
    writeSessionDraft("patience", { action: "a", body: "b" });
    clearSessionDraft("patience");
    expect(readSessionDraft("patience").body).toBe("");
  });
});
