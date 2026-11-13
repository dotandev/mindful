// "Start a circle": a 9:16 how-to in three steps (name it, pick a surah,
// share the link), then what a friend sees. Every screen in a phone or a card
// is a capture of the running app with invented test data
// (scripts/capture-three.mjs); the typing, taps, the surah list and the plain
// chat bubble are drawn on top.
import { AbsoluteFill } from "remotion";

import layout from "../public/screens/three/layout.json";
import { C, F, Fonts, STATUS, Screen, Touch, VW, ease, prog } from "./kit";
import {
  CIRCLE_NAME,
  Caption,
  EndCard,
  Nasheed,
  Ring,
  SITE,
  SceneStack,
  StagePhone,
  Swap,
  TitleCard,
  TypedField,
  VerseCredit,
  ZOOM_X,
  Zoom,
  fullWidth,
  shot,
  totalOf,
} from "./threeKit";
import type { Scene, SceneProps } from "./threeKit";

export const START_CIRCLE_FPS = 30;

/** Scene lengths in frames, storyboard scenes 1 to 8. */
const LENGTHS = [90, 120, 105, 120, 120, 120, 120, 120] as const;
export const START_CIRCLE_DURATION = totalOf(LENGTHS);

// The invite as the app writes it (circleShareMessage in the web app).
const INVITE = `Read Al-Kahf with “${CIRCLE_NAME}” on MindfulVerse.`;
const INVITE_ORIGIN = `https://${SITE}`;
const INVITE_PATH = "/circle/k7m2qx";

function S1Title({ t }: SceneProps) {
  return <TitleCard t={t}>Start a Qur’an circle in 30 seconds.</TitleCard>;
}

function S2Name({ t }: SceneProps) {
  const field = layout.formName;
  const TYPE_AT = 40;
  const typing = (
    <TypedField
      rect={field}
      text={CIRCLE_NAME}
      t={t}
      from={TYPE_AT}
      perFrame={0.35}
      kind="form"
    />
  );
  return (
    <AbsoluteFill style={{ background: C.cotton }}>
      <Caption t={t} from={0} to={999}>
        1. Name it
      </Caption>
      <StagePhone t={t} from="below" dim={prog(t, 20, 34) * 0.25}>
        <Swap a="circle-form-empty" b="circle-form-named" t={t} at={90} />
        {t >= TYPE_AT && t < 98 ? typing : null}
      </StagePhone>
      <Zoom
        crop={fullWidth(field.y - 38, field.h + 54)}
        x={ZOOM_X}
        y={1080}
        t={t}
        at={22}
      >
        <Screen src={shot("circle-form-empty")} />
        {t >= TYPE_AT ? typing : null}
      </Zoom>
    </AbsoluteFill>
  );
}

// Names as the app lists them (apps/web/public/data/surahs.json).
const PICK = [
  [16, "An-Nahl"],
  [17, "Al-Isra"],
  [18, "Al-Kahf"],
  [19, "Maryam"],
  [20, "Taha"],
] as const;
const ROW_H = 46;
const SHEET_H = 29 + PICK.length * ROW_H + 30;
const KAHF_ROW = { h: ROW_H, w: VW, x: 0, y: 844 - SHEET_H + 29 + ROW_H * 2 };

/** A plain list sheet for choosing the surah (drawn). */
function SurahPicker({
  t,
  at,
  pickAt,
}: {
  t: number;
  at: number;
  pickAt: number;
}) {
  const up = prog(t, at, at + 12, ease.drawer);
  const down = prog(t, pickAt + 6, pickAt + 16, ease.inOut);
  const p = up * (1 - down);
  if (p <= 0) {
    return null;
  }
  const picked = t >= pickAt;
  return (
    <>
      <div
        style={{
          background: "rgba(22,26,46,0.35)",
          inset: 0,
          opacity: p,
          position: "absolute",
        }}
      />
      <div
        style={{
          background: C.raised,
          borderRadius: "16px 16px 0 0",
          height: SHEET_H,
          left: 0,
          position: "absolute",
          top: STATUS + 844 - SHEET_H,
          transform: `translateY(${(1 - p) * 320}px)`,
          width: VW,
        }}
      >
        <div
          style={{
            background: C.line,
            borderRadius: 3,
            height: 5,
            margin: "14px auto 10px",
            width: 40,
          }}
        />
        {PICK.map(([n, name]) => {
          const on = n === 18;
          return (
            <div
              key={n}
              style={{
                background: on && picked ? C.wash : "transparent",
                boxSizing: "border-box",
                color: on ? C.indigo : C.ink,
                fontFamily: "OutfitText, sans-serif",
                fontSize: 18,
                fontWeight: on ? 600 : 400,
                height: ROW_H,
                lineHeight: `${ROW_H}px`,
                padding: "0 24px",
              }}
            >
              {n}. {name}
            </div>
          );
        })}
      </div>
    </>
  );
}

function S3Surah({ t }: SceneProps) {
  const select = layout.formSurah;
  const PICK_AT = 50;
  return (
    <AbsoluteFill style={{ background: C.cotton }}>
      <Caption t={t} from={0} to={999}>
        2. Pick a surah
      </Caption>
      <StagePhone t={t} dim={prog(t, 66, 80) * 0.25}>
        <Swap a="circle-form-named" b="circle-form-surah" t={t} at={PICK_AT} />
        <Touch f={t} at={10} rect={select} />
        <SurahPicker t={t} at={20} pickAt={PICK_AT} />
        <Touch f={t} at={PICK_AT - 4} rect={KAHF_ROW} />
      </StagePhone>
      <Zoom
        crop={fullWidth(select.y - 38, select.h + 54)}
        x={ZOOM_X}
        y={1210}
        t={t}
        at={66}
      >
        <Screen src={shot("circle-form-surah")} />
      </Zoom>
    </AbsoluteFill>
  );
}

function S4Share({ t }: SceneProps) {
  const notice = layout.createdNotice;
  const link = layout.createdLink;
  const top = notice.y - 6;
  return (
    <AbsoluteFill style={{ background: C.cotton }}>
      <Caption t={t} from={0} to={999}>
        3. Share the link
      </Caption>
      <StagePhone t={t}>
        <Screen src={shot("circle-created")} />
        <Ring t={t} at={10} rect={link} pad={5} />
        <Touch f={t} at={78} rect={layout.createdCopy} />
      </StagePhone>
      <Zoom
        crop={fullWidth(top, link.y + link.h + 8 - top)}
        x={ZOOM_X}
        y={836}
        t={t}
        at={24}
      >
        <Screen src={shot("circle-created")} />
      </Zoom>
    </AbsoluteFill>
  );
}

/** A plain incoming message: no app's colours, logo or chrome. */
function S5Chat({ t }: SceneProps) {
  const TAP_AT = 66;
  const p = prog(t, 8, 26, ease.drawer);
  const land = prog(t, TAP_AT, TAP_AT + 8);
  const lift = prog(t, TAP_AT + 12, TAP_AT + 26);
  const pressed = prog(t, TAP_AT + 2, TAP_AT + 10) * (1 - lift * 0.4);
  return (
    <AbsoluteFill style={{ background: C.cotton }}>
      <Caption t={t} from={0} to={999}>
        No account needed to join
      </Caption>
      <div
        style={{
          background: C.raised,
          borderRadius: "44px 44px 44px 12px",
          boxShadow:
            "0 30px 80px rgba(16,20,40,0.2), 0 0 0 2px rgba(42,58,140,0.14)",
          boxSizing: "border-box",
          display: "grid",
          gap: 26,
          left: 80,
          opacity: p,
          padding: "46px 50px 50px",
          position: "absolute",
          top: 800,
          transform: `translateY(${(1 - p) * 90}px) scale(${0.9 + p * 0.1})`,
          transformOrigin: "0% 100%",
          width: 860,
        }}
      >
        <div
          style={{
            color: C.ink,
            fontFamily: "OutfitText, sans-serif",
            fontSize: 50,
            lineHeight: 1.32,
          }}
        >
          {INVITE}
        </div>
        <div
          style={{
            background: `rgba(227,231,244,${pressed})`,
            borderRadius: 12,
            color: C.indigo,
            fontFamily: F.ui,
            fontSize: 42,
            fontWeight: 500,
            lineHeight: 1.3,
            margin: "-8px -12px",
            padding: "8px 12px",
            position: "relative",
            textDecoration: "underline",
            textDecorationThickness: 3,
            textUnderlineOffset: 8,
          }}
        >
          {INVITE_ORIGIN}
          <wbr />
          {INVITE_PATH}
          {t >= TAP_AT && lift < 1 ? (
            <div
              style={{
                background: C.indigo,
                border: `4px solid ${C.cotton}`,
                borderRadius: "50%",
                height: 110,
                left: 300,
                opacity: land * 0.32 * (1 - lift),
                position: "absolute",
                top: 6,
                transform: `scale(${0.7 + land * 0.3 + lift * 0.5})`,
                width: 110,
              }}
            />
          ) : null}
        </div>
      </div>
    </AbsoluteFill>
  );
}

function S6Friend({ t }: SceneProps) {
  const lead = layout.homeLead;
  return (
    <AbsoluteFill style={{ background: C.cotton }}>
      <Caption t={t} from={0} to={999}>
        Everyone reads the same surah
      </Caption>
      <StagePhone t={t} from="right" dim={prog(t, 34, 48) * 0.25}>
        <Screen src={shot("home-circle")} />
      </StagePhone>
      <Zoom crop={fullWidth(lead.y - 6, 124)} x={ZOOM_X} y={1240} t={t} at={36}>
        <Screen src={shot("home-circle")} />
      </Zoom>
      <VerseCredit />
    </AbsoluteFill>
  );
}

function S7Count({ t }: SceneProps) {
  const count = layout.homeCount;
  return (
    <AbsoluteFill style={{ background: C.cotton }}>
      <Caption t={t} from={0} to={999}>
        Journals stay private
      </Caption>
      <StagePhone t={t} dim={prog(t, 10, 24) * 0.25}>
        <Screen src={shot("home-circle")} />
      </StagePhone>
      <Zoom
        crop={fullWidth(count.y - 9, count.h + 20)}
        x={ZOOM_X}
        y={1300}
        t={t}
        at={12}
      >
        <Screen src={shot("home-circle")} />
      </Zoom>
      <VerseCredit />
    </AbsoluteFill>
  );
}

function S8End({ t, credit }: SceneProps) {
  return (
    <EndCard
      t={t}
      credit={credit}
      headline="Start yours."
      lines={[{ link: true, text: SITE }]}
    />
  );
}

const SCENES: Scene[] = [
  S1Title,
  S2Name,
  S3Surah,
  S4Share,
  S5Chat,
  S6Friend,
  S7Count,
  S8End,
];

export function StartACircle({ withNasheed }: { withNasheed: boolean }) {
  return (
    <AbsoluteFill style={{ background: C.cotton }}>
      <Fonts />
      {/* Vocals-only nasheed, CC BY 3.0 (public/audio/CREDITS.md). */}
      {withNasheed ? <Nasheed duration={START_CIRCLE_DURATION} /> : null}
      <SceneStack scenes={SCENES} lengths={LENGTHS} credit={withNasheed} />
    </AbsoluteFill>
  );
}
