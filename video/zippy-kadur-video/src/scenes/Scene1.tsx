import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Media} from '../media';
import {Fade, Grain, Headline, Scrim} from '../typography';
import {BRAND} from '../config';
import {local} from '../timing';

/** 0–3s · Establishing shot of a real town at dusk/night. Slow push-in. */
export const Scene1 = () => (
  <AbsoluteFill style={{background: '#000'}}>
    <Media slot="s1-town-night" label="Shot 1 · town at dusk/night, slow push-in (representative footage)" push={0.14} />
    <Scrim strength={0.85} />
    <Headline at={local('s1', 'kadur')} y={1090} lines={[{t: 'KADUR...', size: 190, weight: 800, track: 0.05}]} />
    <Headline at={local('s1', 'ready')} y={1290} lines={[{t: 'ARE YOU', size: 74, weight: 300, track: 0.3}, {t: 'READY?', size: 74, weight: 700, track: 0.3, color: BRAND.greenBright}]} />
    <Fade len={20} />
    <Grain />
  </AbsoluteFill>
);
