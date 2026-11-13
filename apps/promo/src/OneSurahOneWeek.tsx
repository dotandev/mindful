// "One surah, one week": a 9:16 walk through one surah journal. A reason for
// reading, a verse with Ibn Kathir, a reflection, an action, and the question
// Home asks a week later. Every screen in a phone or a card is a capture of
// the running app with invented test data (scripts/capture-three.mjs); the
// typing, taps, rings and the seven beads are drawn on top.
import { AbsoluteFill } from "remotion";

import layout from "../public/screens/three/layout.json";
import { C, F, Fonts, Screen, Touch, beat, ease, prog } from "./kit";
import {
  ACTION,
  Caption,
  EndCard,
  INTENTION,
  Nasheed,
  REFLECTION,
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

export const ONE_SURAH_FPS = 30;

/** Scene lengths in frames, storyboard scenes 1 to 10. */
const LENGTHS = [105, 90, 135, 120, 105, 120, 135, 90, 150, 120] as const;
export const ONE_SURAH_DURATION = totalOf(LENGTHS);

function S1Title({ t }: SceneProps) {
  return (
    <TitleCard t={t}>What if you stayed with one surah for a week?</TitleCard>
  );
}

function S2Pick({ t }: SceneProps) {
  const opened = prog(t, 60, 76, ease.inOut);
  return (
    <AbsoluteFill style={{ background: C.cotton }}>
      <Caption t={t} from={0} to={999}>
        Pick one.
      </Caption>
      <VerseCredit />
      <StagePhone t={t} from="below">
        <Screen src={shot("home-begin")} />
        <Ring t={t} at={28} until={56} rect={layout.beginChip} pad={4} />
        <Touch f={t} at={46} rect={layout.beginChip} />
        <div
          style={{
            inset: 0,
            opacity: opened,
            position: "absolute",
            transform: `translateX(${(1 - opened) * 120}px)`,
          }}
        >
          <Screen src={shot("intention-empty")} />
        </div>
      </StagePhone>
    </AbsoluteFill>
  );
}

function S3Intention({ t }: SceneProps) {
  const field = layout.intentionField;
  const TYPE_AT = 30;
  return (
    <AbsoluteFill style={{ background: C.cotton }}>
      <Caption t={t} from={0} to={999}>
        Why are you reading this surah now?
      </Caption>
      <StagePhone t={t} dim={prog(t, 8, 22) * 0.25}>
        <Swap a="intention-empty" b="intention-typed" t={t} at={96} />
        {t >= TYPE_AT && t < 104 ? (
          <TypedField
            rect={field}
            text={INTENTION}
            t={t}
            from={TYPE_AT}
            perFrame={0.5}
          />
        ) : null}
      </StagePhone>
      <Zoom
        crop={fullWidth(field.y - 12, field.h + 24)}
        x={ZOOM_X}
        y={1350}
        t={t}
        at={10}
      >
        <Screen src={shot("intention-empty")} />
        <TypedField
          rect={field}
          text={INTENTION}
          t={t}
          from={TYPE_AT}
          perFrame={0.5}
        />
      </Zoom>
      <VerseCredit />
    </AbsoluteFill>
  );
}

function S4Verse({ t }: SceneProps) {
  const top = layout.verse.y - 10;
  const bottom = layout.verseTranslation.y + layout.verseTranslation.h + 18;
  return (
    <AbsoluteFill style={{ background: C.cotton }}>
      <Caption t={t} from={0} to={999}>
        Go verse by verse.
      </Caption>
      <StagePhone t={t} dim={prog(t, 12, 26) * 0.25}>
        <Screen src={shot("verse")} />
      </StagePhone>
      <Zoom
        crop={fullWidth(top, bottom - top)}
        x={ZOOM_X}
        y={1230}
        t={t}
        at={14}
      >
        <Screen src={shot("verse")} />
      </Zoom>
      <VerseCredit />
    </AbsoluteFill>
  );
}

function S5Commentary({ t }: SceneProps) {
  const card = layout.commentaryCard;
  return (
    <AbsoluteFill style={{ background: C.cotton }}>
      <Caption t={t} from={0} to={999}>
        With Ibn Kathir.
      </Caption>
      <StagePhone t={t} dim={prog(t, 38, 52) * 0.25}>
        <Swap a="verse" b="verse-commentary" t={t} at={24} />
        <Touch f={t} at={12} rect={layout.commentaryOpen} />
      </StagePhone>
      <Zoom crop={fullWidth(card.y - 4, 168)} x={ZOOM_X} y={1290} t={t} at={40}>
        <Screen src={shot("verse-commentary")} />
      </Zoom>
      <VerseCredit />
    </AbsoluteFill>
  );
}

function S6Reflect({ t }: SceneProps) {
  const field = layout.reflectField;
  const TYPE_AT = 24;
  const top = layout.reflectLabel.y - 28;
  const typing = (
    <TypedField
      rect={field}
      text={REFLECTION}
      t={t}
      from={TYPE_AT}
      perFrame={0.55}
    />
  );
  return (
    <AbsoluteFill style={{ background: C.cotton }}>
      <Zoom
        crop={fullWidth(top, field.y + field.h + 14 - top)}
        x={ZOOM_X}
        y={104}
        t={t}
        at={2}
      >
        <Screen src={shot("reflect-empty")} />
        {typing}
      </Zoom>
      <StagePhone t={t}>
        <Swap a="reflect-empty" b="reflect-typed" t={t} at={98} />
        {t >= TYPE_AT && t < 106 ? typing : null}
      </StagePhone>
      <VerseCredit />
    </AbsoluteFill>
  );
}

function S7Action({ t }: SceneProps) {
  const field = layout.actionField;
  const TYPE_AT = 24;
  const typing = (
    <TypedField
      rect={field}
      text={ACTION}
      t={t}
      from={TYPE_AT}
      perFrame={0.6}
    />
  );
  return (
    <AbsoluteFill style={{ background: C.cotton }}>
      <Caption t={t} from={0} to={999}>
        What will you do?
      </Caption>
      <StagePhone t={t} dim={prog(t, 8, 22) * 0.25}>
        <Swap a="action-empty" b="action-typed" t={t} at={100} />
        {t >= TYPE_AT && t < 108 ? typing : null}
      </StagePhone>
      <Zoom
        crop={fullWidth(field.y - 12, field.h + 24)}
        x={ZOOM_X}
        y={1256}
        t={t}
        at={8}
      >
        <Screen src={shot("action-empty")} />
        {typing}
      </Zoom>
      <VerseCredit />
    </AbsoluteFill>
  );
}

const BEADS = [0, 1, 2, 3, 4, 5, 6];

function S8Week({ t }: SceneProps) {
  const SIZE = 78;
  return (
    <AbsoluteFill style={{ background: C.indigo }}>
      <div
        style={{
          display: "flex",
          gap: 40,
          justifyContent: "center",
          left: 0,
          position: "absolute",
          right: 0,
          top: 800,
        }}
      >
        {BEADS.map((i) => {
          const appear = prog(t, i * 2, 12 + i * 2);
          const fill = prog(t, 14 + i * 7, 24 + i * 7, ease.drawer);
          return (
            <div
              key={`bead-${i}`}
              style={{
                background: C.cotton,
                border: `4px solid ${C.cotton}`,
                borderRadius: "50%",
                boxShadow: `inset 0 0 0 ${(1 - fill) * SIZE}px ${C.indigo}`,
                boxSizing: "border-box",
                height: SIZE,
                opacity: appear,
                transform: `scale(${0.6 + appear * 0.4 + Math.sin(fill * Math.PI) * 0.12})`,
                width: SIZE,
              }}
            />
          );
        })}
      </div>
      <div
        style={{
          color: C.cotton,
          fontFamily: F.ui,
          fontSize: 110,
          fontWeight: 600,
          left: 0,
          letterSpacing: "-0.03em",
          position: "absolute",
          right: 0,
          textAlign: "center",
          top: 960,
          ...beat(t, 6, 999),
        }}
      >
        A week later…
      </div>
    </AbsoluteFill>
  );
}

function S9FollowUp({ t }: SceneProps) {
  const ask = layout.followup;
  const note = layout.followupNote;
  const YES_AT = 84;
  const grown = prog(t, YES_AT + 12, YES_AT + 30, ease.drawer);
  const SCALE = 2.3;
  const crop = {
    h: ask.h + 12 + (note.h - ask.h) * grown,
    w: ask.w + 12,
    x: ask.x - 6,
    y: ask.y - 6,
  };
  return (
    <AbsoluteFill style={{ background: C.cotton }}>
      <Caption t={t} from={0} to={999}>
        Did you do it?
      </Caption>
      <VerseCredit />
      <StagePhone t={t} from="below" dim={prog(t, 22, 36) * 0.3}>
        <Swap a="home-followup" b="home-followup-yes" t={t} at={YES_AT + 12} />
      </StagePhone>
      <Zoom
        crop={crop}
        scale={SCALE}
        x={(1080 - crop.w * SCALE) / 2}
        y={790}
        t={t}
        at={24}
      >
        <Swap a="home-followup" b="home-followup-yes" t={t} at={YES_AT + 12} />
        <Touch f={t} at={YES_AT} rect={layout.followupYes} />
      </Zoom>
    </AbsoluteFill>
  );
}

function S10End({ t, credit }: SceneProps) {
  return (
    <EndCard
      t={t}
      credit={credit}
      headline="Sit with one surah."
      lines={[{ text: "Free. No ads. No AI." }, { link: true, text: SITE }]}
    />
  );
}

const SCENES: Scene[] = [
  S1Title,
  S2Pick,
  S3Intention,
  S4Verse,
  S5Commentary,
  S6Reflect,
  S7Action,
  S8Week,
  S9FollowUp,
  S10End,
];

export function OneSurahOneWeek({ withNasheed }: { withNasheed: boolean }) {
  return (
    <AbsoluteFill style={{ background: C.cotton }}>
      <Fonts />
      {/* Vocals-only nasheed, CC BY 3.0 (public/audio/CREDITS.md). */}
      {withNasheed ? <Nasheed duration={ONE_SURAH_DURATION} /> : null}
      <SceneStack scenes={SCENES} lengths={LENGTHS} credit={withNasheed} />
    </AbsoluteFill>
  );
}
