import {Composition} from 'remotion';
import {Video} from './Video';
import {FPS, TOTAL} from './timing';
import {W, H} from './config';
export const Root = () => (
  <>
    <Composition id="ZippyKadurImages" component={Video} defaultProps={{mode: 'images' as const}} durationInFrames={TOTAL} fps={FPS} width={W} height={H} />
    <Composition id="ZippyKadurType" component={Video} defaultProps={{mode: 'type' as const}} durationInFrames={TOTAL} fps={FPS} width={W} height={H} />
  </>
);
