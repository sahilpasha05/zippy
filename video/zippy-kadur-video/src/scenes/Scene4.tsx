import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {BRAND, H, W} from '../config';
import {LogoMark} from '../Logo';
import {Grain, Headline} from '../typography';
import {clamp, ease} from '../util';
import {local} from '../timing';

/** 9–12s · Clean dark brand environment. Logo fades up, one soft light pass, then the line. */
export const Scene4 = () => {
  const f = useCurrentFrame();
  const t0 = local('s4', 'logo');
  const p = interpolate(f, [t0, t0 + 22], [0, 1], {...clamp, easing: ease});
  const sweep = interpolate(f, [t0 + 10, t0 + 40], [-300, 700], clamp);
  return (
    <AbsoluteFill style={{background: `radial-gradient(ellipse at 50% 38%, #0f2a1a, ${BRAND.dark} 70%)`}}>
      <div style={{position: 'absolute', left: 0, top: 360, width: W, display: 'flex', justifyContent: 'center', opacity: p, transform: `translateY(${(1 - p) * 40}px) scale(${0.94 + p * 0.06 + f * 0.0004})`}}>
        <div style={{position: 'relative', overflow: 'hidden', borderRadius: 48}}>
          <LogoMark size={440} />
          <div style={{position: 'absolute', top: 0, bottom: 0, left: sweep, width: 160, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.65), transparent)', transform: 'skewX(-18deg)', opacity: f > t0 + 10 && f < t0 + 42 ? 1 : 0}} />
        </div>
      </div>
      <Headline at={local('s4', 'comingTo')} y={1100} lines={[{t: 'ZIPPY IS COMING TO...', size: 56, weight: 300, track: 0.2}]} shadow={false} />
      <AbsoluteFill style={{background: `linear-gradient(0deg, ${BRAND.green}33, transparent 35%)`}} />
      <Grain />
    </AbsoluteFill>
  );
};
