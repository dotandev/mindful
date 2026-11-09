import { surahJournal } from "@mindfulverse/core/surahJournal";
import type { JournalEntry } from "@mindfulverse/core/types";
import { describe, expect, it } from "vitest";

import * as web from "../../../../web/src/lib/surahJournalExport";
import { buildSurahJournalHtml, escapeHtml, fontFaceCss } from "./pdfHtml";
import {
  exportBaseName,
  followUpLine,
  surahJournalSections,
  titledJournalText,
} from "./sections";

const day = (d: number) => new Date(2026, 9, d, 9, 30).getTime();

const entries: JournalEntry[] = [
  {
    body: 'Begin <gently> & "listen"',
    context: { kind: "intention", ref: "94" },
    createdAt: day(1),
    id: "i",
    prompt: "Before you begin",
  },
  {
    body: "Lessons: Ease follows.\n\nAction: Call <mum>",
    context: { kind: "tadabbur", ref: "94:6" },
    createdAt: day(2),
    id: "t6",
    prompt: "",
  },
  {
    body: "Free words",
    context: { kind: "tadabbur", ref: "94:5" },
    createdAt: day(3),
    id: "t5",
    prompt: "",
  },
  {
    body: "Did it\n\nShe laughed",
    context: { kind: "followup", ref: "t6" },
    createdAt: day(10),
    id: "f",
    prompt: "How did it go? (94:6)",
  },
  {
    body: "A check-in",
    context: { kind: "checkin", ref: "94:1" },
    createdAt: day(4),
    id: "c",
    prompt: "What stays with you?",
  },
];

const verses = new Map([
  ["94:5", { arabic: "فَإِنَّ", translation: "With hardship <is> ease." }],
  ["94:6", { arabic: "إِنَّ", translation: "Indeed, with hardship is ease." }],
]);

const page = surahJournal(entries, 94);

describe(surahJournalSections, () => {
  it("matches the web export section by section", () => {
    expect(surahJournalSections(page, "Ash-Sharh", verses)).toStrictEqual(
      web.surahJournalSections(page, "Ash-Sharh", verses)
    );
  });

  it("orders intention, verses by number with follow-ups, then the rest", () => {
    const sections = surahJournalSections(page, "Ash-Sharh", verses);
    expect(sections.map((s) => s.title)).toStrictEqual([
      "My intention",
      "Verse by verse",
      "Also written on Ash-Sharh",
    ]);
    expect(sections[1]?.items.map((i) => i.entry.id)).toStrictEqual([
      "t5",
      "t6",
      "f",
    ]);
  });
});

describe("helpers", () => {
  it("names the file like web", () => {
    expect(exportBaseName("Al-Fātiḥah's Way")).toBe(
      "mindfulverse-al-f-ti-ah-s-way"
    );
  });

  it("writes a follow-up the way the page shows it", () => {
    expect(followUpLine("Did it", "She laughed", "x")).toBe(
      "A week on: Did it — She laughed"
    );
    expect(followUpLine("Not yet", "", "x")).toBe("A week on: Not yet");
    expect(followUpLine(null, "raw", "raw body")).toBe("A week on: raw body");
  });

  it("puts the page title on the plain text", () => {
    const text = titledJournalText(
      {
        exportedAt: new Date(day(10)),
        sections: surahJournalSections(page, "Ash-Sharh", verses),
      },
      "Ash-Sharh — my tadabbur"
    );
    expect(text.split("\n")[0]).toBe("MindfulVerse | Ash-Sharh — my tadabbur");
    expect(text).toContain("Call <mum>");
  });

  it("embeds fonts as data URIs", () => {
    expect(
      fontFaceCss([{ base64: "AAA", family: "Literata", weight: 400 }])
    ).toContain(
      'font-family:"Literata";font-weight:400;src:url(data:font/ttf;base64,AAA)'
    );
  });
});

describe(buildSurahJournalHtml, () => {
  const html = buildSurahJournalHtml(
    {
      exportedAt: new Date(day(10)),
      sections: surahJournalSections(page, "Ash-Sharh", verses),
      title: "Ash-Sharh — my tadabbur",
    },
    "/*fonts*/"
  );

  it("escapes every user and verse string", () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe(
      "&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;"
    );
    expect(html).not.toContain("<gently>");
    expect(html).not.toContain("<mum>");
    expect(html).toContain("Begin &lt;gently&gt; &amp; &quot;listen&quot;");
    expect(html).toContain("With hardship &lt;is&gt; ease.");
  });

  it("follows the page order and carries the credit and fonts", () => {
    const order = [
      "My intention",
      "Free words",
      "Lessons: Ease follows.",
      "Did it",
      "Also written on Ash-Sharh",
      "A check-in",
      "English translation by Talal Itani",
    ].map((s) => html.indexOf(s));
    expect(order.every((i) => i >= 0)).toBeTruthy();
    expect([...order].sort((a, b) => a - b)).toStrictEqual(order);
    expect(html).toContain("/*fonts*/");
    expect(html).toContain("<h1>Ash-Sharh — my tadabbur</h1>");
  });
});
