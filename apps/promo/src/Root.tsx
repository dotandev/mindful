import { Composition } from "remotion";

import { DAY_DURATION, DAY_FPS, DayInTheLife } from "./DayInTheLife";
import { DURATION, FPS, HeartPromo } from "./HeartPromo";
import { WHATS_NEW_DURATION, WHATS_NEW_FPS, WhatsNew } from "./WhatsNew";

export function Root() {
  return (
    <>
      <Composition
        id="HeartPromo"
        component={HeartPromo}
        durationInFrames={DURATION}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={{ withNasheed: true }}
      />
      {/* For adding a sound from TikTok, Reels or CapCut when posting. */}
      <Composition
        id="HeartPromoSilent"
        component={HeartPromo}
        durationInFrames={DURATION}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={{ withNasheed: false }}
      />
      {/* Real app screens from scripts/capture-screens.mjs; silent. */}
      <Composition
        id="DayInTheLife"
        component={DayInTheLife}
        durationInFrames={DAY_DURATION}
        fps={DAY_FPS}
        width={1080}
        height={1920}
      />
      {/* What's new (circles first): screens from scripts/capture-whatsnew.mjs. */}
      <Composition
        id="WhatsNew"
        component={WhatsNew}
        durationInFrames={WHATS_NEW_DURATION}
        fps={WHATS_NEW_FPS}
        width={1080}
        height={1920}
        defaultProps={{ withNasheed: true }}
      />
      {/* For adding a sound from TikTok, Reels or CapCut when posting. */}
      <Composition
        id="WhatsNewSilent"
        component={WhatsNew}
        durationInFrames={WHATS_NEW_DURATION}
        fps={WHATS_NEW_FPS}
        width={1080}
        height={1920}
        defaultProps={{ withNasheed: false }}
      />
    </>
  );
}
