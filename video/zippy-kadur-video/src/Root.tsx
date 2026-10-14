import {Composition} from 'remotion';
import {Video} from './Video';
import {FPS, TOTAL} from './timing';
import {W, H} from './config';
export const Root = () => <Composition id="ZippyKadur" component={Video} durationInFrames={TOTAL} fps={FPS} width={W} height={H} />;
