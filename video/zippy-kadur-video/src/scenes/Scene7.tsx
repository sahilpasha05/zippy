import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {Media, useHasMedia} from '../media';
import {BRAND, H, W} from '../config';
import {Grain, Headline} from '../typography';
import {clamp, ease} from '../util';
import {local} from '../timing';

/** 17–19s · Genuine app/website screenshot or screen recording inside a device frame. */
export const Scene7 = () => {
  const f = useCurrentFrame();
  const p = interpolate(f, [0, 18], [0, 1], {...clamp, easing: ease});
  const second = f >= local('s7', 'groceriesYouNeed');
  const hasApp = useHasMedia('s7-app');
  const glare = interpolate(f, [0, 60], [-400, 900], clamp);
  return (
    <AbsoluteFill style={{background: `radial-gradient(ellipse at 50% 35%, #12281b, ${BRAND.dark} 70%)`}}>
      {hasApp && <div style={{position: 'absolute', left: (W - 500) / 2, top: 190, width: 500, height: 1010, borderRadius: 68, background: '#0b0b0d', border: '3px solid #2a2a2e', boxShadow: '0 50px 120px rgba(0,0,0,0.7)', padding: 16, boxSizing: 'border-box', transform: `translateY(${(1 - p) * 120}px) rotate(${(1 - p) * -3}deg)`, opacity: p}}>
        <div style={{position: 'relative', width: '100%', height: '100%', borderRadius: 54, overflow: 'hidden'}}>
          <Media slot="s7-app" label="Shot 7 · real Zippy app/site screenshot or screen recording" push={0.04} />
          <div style={{position: 'absolute', top: 0, bottom: 0, left: glare, width: 140, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.16), transparent)', transform: 'skewX(-14deg)'}} />
        </div>
      </div>}
      {!second && <Headline at={local('s7', 'foodYouLove')} y={hasApp ? 1420 : 960} lines={[{t: 'FOOD', size: 84, weight: 300, track: 0.14}, {t: 'YOU LOVE.', size: 130, weight: 800}]} shadow={false} />}
      {second && <Headline at={local('s7', 'groceriesYouNeed')} y={hasApp ? 1420 : 960} lines={[{t: 'GROCERIES', size: 84, weight: 300, track: 0.14}, {t: 'YOU NEED.', size: 130, weight: 800}]} shadow={false} />}
      <Grain />
    </AbsoluteFill>
  );
};
