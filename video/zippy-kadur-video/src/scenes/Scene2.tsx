import React from 'react';
import {AbsoluteFill, Sequence} from 'remotion';
import {Media} from '../media';
import {Grain, Headline, Scrim} from '../typography';
import {local, sceneLen} from '../timing';

const SHOTS: [string, string, string][] = [
  ['food', 's2-biryani', 'Shot 2a · biryani macro with steam'],
  ['pizza', 's2-pizza', 'Shot 2b · pizza cheese pull'],
  ['burger', 's2-burger', 'Shot 2c · burger build / close-up'],
  ['fries', 's2-fries', 'Shot 2d · crispy fries'],
];
/** 3–7s · Four 1-second macro food shots, cuts land on the beat. */
export const Scene2 = () => (
  <AbsoluteFill style={{background: '#000'}}>
    {SHOTS.map(([cue, slot, label], i) => {
      const from = local('s2', cue);
      const to = i < SHOTS.length - 1 ? local('s2', SHOTS[i + 1][0]) : sceneLen('s2');
      return <Sequence key={slot} from={from} durationInFrames={to - from}><Media slot={slot} label={label} push={0.12} /></Sequence>;
    })}
    <Scrim strength={0.8} />
    <Headline at={local('s2', 'food')} y={1380} lines={[{t: 'YOUR FAVOURITE', size: 84, weight: 300, track: 0.12}, {t: 'FOOD.', size: 150, weight: 800}]} />
    <Grain />
  </AbsoluteFill>
);
