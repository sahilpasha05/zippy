import React from 'react';
import {AbsoluteFill, Sequence} from 'remotion';
import {Media} from '../media';
import {Grain, Headline, Scrim} from '../typography';
import {local, sceneLen} from '../timing';

/** 7–9s · Fresh produce, then shelves/milk/snacks. Smooth tracking shots. */
export const Scene3 = () => (
  <AbsoluteFill style={{background: '#000'}}>
    <Sequence from={0} durationInFrames={local('s3', 'shelf')}><Media slot="s3-produce" label="Shot 3a · vegetables & fruit, tracking" push={0.08} /></Sequence>
    <Sequence from={local('s3', 'shelf')} durationInFrames={sceneLen('s3') - local('s3', 'shelf')}><Media slot="s3-shelves" label="Shot 3b · milk, snacks, shelves, tracking" push={0.08} /></Sequence>
    <Scrim strength={0.8} />
    <Headline at={local('s3', 'groceries')} y={1380} lines={[{t: 'YOUR DAILY', size: 84, weight: 300, track: 0.12}, {t: 'GROCERIES.', size: 140, weight: 800}]} />
    <Grain />
  </AbsoluteFill>
);
