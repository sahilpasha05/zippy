import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {Media} from '../media';
import {Flash, Grain, Headline, Scrim} from '../typography';
import {clamp, ease} from '../util';
import {local} from '../timing';

/** 12–14s · Town shot; KADUR! lands with a subtle camera impact on the bass hit. */
export const Scene5 = () => {
  const f = useCurrentFrame();
  const hit = local('s5', 'kadurHit');
  const impact = interpolate(f, [hit, hit + 10], [1.07, 1], {...clamp, easing: ease});
  const shake = f >= hit && f < hit + 8 ? Math.sin(f * 13) * 8 * (1 - (f - hit) / 8) : 0;
  return (
    <AbsoluteFill style={{background: '#000', transform: `scale(${impact}) translate(${shake}px, ${shake * 0.6}px)`}}>
      <Media slot="s5-town" label="Shot 5 · representative town footage (not a specific landmark)" push={0.1} />
      <Scrim strength={0.75} />
      <Headline at={hit} y={1250} lines={[{t: 'KADUR!', size: 215, weight: 900, track: 0}]} />
      <Flash at={hit} len={5} peak={0.5} />
      <Grain />
    </AbsoluteFill>
  );
};
