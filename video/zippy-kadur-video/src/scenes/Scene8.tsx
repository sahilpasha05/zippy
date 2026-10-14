import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {BRAND, FONT, W} from '../config';
import {Grain, Headline} from '../typography';
import {clamp} from '../util';
import {local} from '../timing';

/** 19–22s · Announcement on verified brand green. */
export const Scene8 = () => {
  const f = useCurrentFrame();
  const sub = interpolate(f, [local('s8', 'something'), local('s8', 'something') + 14], [0, 1], clamp);
  const bar = interpolate(f, [0, 20], [0, 1], clamp);
  return (
    <AbsoluteFill style={{background: `linear-gradient(170deg, ${BRAND.green} 0%, #0c6b30 55%, #063d1b 100%)`}}>
      <div style={{position: 'absolute', left: 80, top: 420, width: 160 * bar, height: 8, background: '#fff', borderRadius: 4}} />
      <Headline at={local('s8', 'getReady')} y={700} align="left" shadow={false} lines={[{t: 'KADUR,', size: 150, weight: 300, track: 0.04}, {t: 'GET READY!', size: 150, weight: 900}]} />
      <Headline at={local('s8', 'comingSoon')} y={1110} align="left" shadow={false} lines={[{t: 'ZIPPY IS', size: 100, weight: 300, track: 0.08}, {t: 'COMING SOON!', size: 100, weight: 900}]} />
      <div style={{position: 'absolute', left: 80, top: 1330, fontFamily: FONT, fontSize: 46, fontWeight: 400, color: '#ffffffdd', letterSpacing: '0.02em', opacity: sub, transform: `translateY(${(1 - sub) * 20}px)`}}>Something exciting is on its way.</div>
      <Grain opacity={0.1} />
    </AbsoluteFill>
  );
};
