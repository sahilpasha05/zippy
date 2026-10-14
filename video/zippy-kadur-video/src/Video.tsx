import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile} from 'remotion';
import {S} from './config';
import {Scene1, Scene2, Scene3, Scene4, Scene5} from './scenes';

const seq = (r: readonly [number, number], C: React.FC) => (
  <Sequence from={r[0]} durationInFrames={r[1] - r[0]}><C /></Sequence>
);
export const Video: React.FC = () => (
  <AbsoluteFill style={{background: '#000'}}>
    {seq(S.s1, Scene1)}{seq(S.s2, Scene2)}{seq(S.s3, Scene3)}{seq(S.s4, Scene4)}{seq(S.s5, Scene5)}
    <Audio src={staticFile('music.wav')} />
  </AbsoluteFill>
);
