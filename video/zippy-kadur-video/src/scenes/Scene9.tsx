import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {BRAND, FONT, SITE, W} from '../config';
import {LogoFull} from '../Logo';
import {Headline} from '../typography';
import {clamp, ease} from '../util';
import {local} from '../timing';

/** 22–25s · End card on clean white (the official logo has a white background, so it sits seamlessly). */
export const Scene9 = () => {
  const f = useCurrentFrame();
  const p = interpolate(f, [0, 20], [0, 1], {...clamp, easing: ease});
  const breathe = 1 + 0.012 * Math.sin(f / 14);
  const u = interpolate(f, [local('s9', 'url'), local('s9', 'url') + 14], [0, 1], {...clamp, easing: ease});
  return (
    <AbsoluteFill style={{background: '#fff'}}>
      <div style={{position: 'absolute', left: 0, top: 170, width: W, display: 'flex', justifyContent: 'center', opacity: p, transform: `scale(${(0.94 + p * 0.06) * breathe})`}}><LogoFull size={640} /></div>
      <Headline at={local('s9', 'stayTuned')} y={1000} shadow={false} lines={[{t: 'STAY TUNED,', size: 84, weight: 300, track: 0.06, color: BRAND.ink}, {t: 'KADUR!', size: 130, weight: 900, color: BRAND.green}]} />
      <div style={{position: 'absolute', top: 1200, left: W / 2 - 300, width: 600, height: 96, borderRadius: 48, background: BRAND.green, color: '#fff', fontFamily: FONT, fontWeight: 700, fontSize: 46, letterSpacing: '0.04em', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: u, transform: `translateY(${(1 - u) * 24}px)`}}>{SITE}</div>
    </AbsoluteFill>
  );
};
