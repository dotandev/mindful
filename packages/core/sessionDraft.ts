// An unsaved session reflection survives leaving the final screen (or the OS
// killing the app), the way the check-in and tadabbur drafts already do.
export interface SessionDraft {
  body: string;
  action: string;
}

const KEY_PREFIX = "mindfulverse.sessionDraft.v1:";

export const EMPTY_SESSION_DRAFT: SessionDraft = Object.freeze({
  action: "",
  body: "",
});

export function readSessionDraft(sessionId: string): SessionDraft {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + sessionId);
    if (!raw) {
      return EMPTY_SESSION_DRAFT;
    }
    const parsed = JSON.parse(raw) as Partial<SessionDraft> | null;
    return {
      action: typeof parsed?.action === "string" ? parsed.action : "",
      body: typeof parsed?.body === "string" ? parsed.body : "",
    };
  } catch {
    return EMPTY_SESSION_DRAFT;
  }
}

export function writeSessionDraft(
  sessionId: string,
  draft: SessionDraft
): void {
  try {
    if (draft.body.trim() || draft.action.trim()) {
      localStorage.setItem(KEY_PREFIX + sessionId, JSON.stringify(draft));
    } else {
      localStorage.removeItem(KEY_PREFIX + sessionId);
    }
  } catch {
    // Storage full or blocked: the draft is a convenience.
  }
}

export function clearSessionDraft(sessionId: string): void {
  writeSessionDraft(sessionId, EMPTY_SESSION_DRAFT);
}
