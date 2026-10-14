import React from 'react';
import {AbsoluteFill, Sequence} from 'remotion';
import {Media} from '../media';
import {Grain} from '../typography';
import {local, sceneLen} from '../timing';

/** 14–17s · Delivery rider through a town (safely), then a close-up of the bag. No on-screen text. */
export const Scene6 = () => (
  <AbsoluteFill style={{background: '#000'}}>
    <Sequence from={0} durationInFrames={local('s6', 'bag')}><Media slot="s6-rider" label="Shot 6a · delivery rider travelling safely through a town" push={0.1} /></Sequence>
    <Sequence from={local('s6', 'bag')} durationInFrames={sceneLen('s6') - local('s6', 'bag')}><Media slot="s6-bag" label="Shot 6b · close-up of Zippy-branded bag (real branded footage or a matched composite)" push={0.06} /></Sequence>
    <Grain />
  </AbsoluteFill>
);
