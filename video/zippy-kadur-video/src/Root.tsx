import {Composition} from 'remotion';
import {Video} from './Video';
import {FPS, TOTAL} from './timing';
import {W, H} from './config';
const base = {durationInFrames: TOTAL, fps: FPS, width: W, height: H, component: Video};
export const Root = () => (
  <>
    <Composition id="ZippyKadurImages" {...base} defaultProps={{mode: 'images' as const, voiceOn: true}} />
    <Composition id="ZippyKadurImagesNoVoice" {...base} defaultProps={{mode: 'images' as const, voiceOn: false}} />
    <Composition id="ZippyKadurType" {...base} defaultProps={{mode: 'type' as const, voiceOn: true}} />
  </>
);
