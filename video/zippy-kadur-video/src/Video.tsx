import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile} from 'remotion';
import {sceneRange} from './timing';
import {Mode, ModeCtx} from './media';
import voice from './voice.json';
import {FPS} from './timing';
import {Scene1} from './scenes/Scene1';
import {Scene2} from './scenes/Scene2';
import {Scene3} from './scenes/Scene3';
import {Scene4} from './scenes/Scene4';
import {Scene5} from './scenes/Scene5';
import {Scene6} from './scenes/Scene6';
import {Scene7} from './scenes/Scene7';
import {Scene8} from './scenes/Scene8';
import {Scene9} from './scenes/Scene9';

const SC: [string, React.FC][] = [['s1', Scene1], ['s2', Scene2], ['s3', Scene3], ['s4', Scene4], ['s5', Scene5], ['s6', Scene6], ['s7', Scene7], ['s8', Scene8], ['s9', Scene9]];
/** Music ducks under the voice-over (less on the KADUR! hit so the impact still lands). */
const musicVolume = (f: number) => {
  let duck = 1;
  for (const w of voice.windows) {
    const a = w.start * FPS, b = w.end * FPS, r = 6;
    const k = w.cue === 'kadurHit' ? 0.7 : 0.4;
    const inside = Math.max(0, Math.min(1, Math.min((f - (a - r)) / r, ((b + r) - f) / r)));
    duck = Math.min(duck, 1 - (1 - k) * inside);
  }
  return 0.62 * duck;
};
export const Video: React.FC<{mode: Mode}> = ({mode}) => (
  <ModeCtx.Provider value={mode}><AbsoluteFill style={{background: '#000'}}>
    {SC.map(([id, C]) => <Sequence key={id} {...sceneRange(id)}><C /></Sequence>)}
    <Audio src={staticFile('music.wav')} volume={musicVolume} />
    <Audio src={staticFile('voice.wav')} volume={0.95} />
  </AbsoluteFill></ModeCtx.Provider>
);
