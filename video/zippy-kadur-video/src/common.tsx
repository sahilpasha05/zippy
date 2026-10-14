import React from 'react';
import {AbsoluteFill, Img, interpolate, random, spring, staticFile, useCurrentFrame, useVideoConfig, Easing} from 'remotion';
import {BRAND, FONT, LOGO_FILE, W, H} from './config';

export const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
export const ease = Easing.bezier(0.16, 1, 0.3, 1);

export const Logo: React.FC<{size?: number}> = ({size = 520}) => (
  // Original logo, undistorted, on a white card (the asset has a white background).
  <div style={{background: '#fff', borderRadius: 56, padding: 18, boxShadow: `0 0 90px ${BRAND.primary}99, 0 30px 80px #000a`}}>
    {LOGO_FILE ? <Img src={staticFile(LOGO_FILE)} style={{width: size, height: size, display: 'block', borderRadius: 40}} /> : null}
  </div>
);

export const Particles: React.FC<{count?: number; color?: string; speed?: number; seed?: string}> = ({count = 70, color = BRAND.primary, speed = 1, seed = 'p'}) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {Array.from({length: count}).map((_, i) => {
        const x = random(seed + 'x' + i) * W;
        const y0 = random(seed + 'y' + i) * H;
        const s = 2 + random(seed + 's' + i) * 7;
        const v = (0.4 + random(seed + 'v' + i)) * 2.2 * speed;
        const y = (((y0 - f * v) % H) + H) % H;
        const tw = 0.4 + 0.6 * Math.abs(Math.sin(f / 9 + i));
        return <div key={i} style={{position: 'absolute', left: x, top: y, width: s, height: s, borderRadius: '50%', background: color, opacity: tw, boxShadow: `0 0 ${s * 4}px ${color}`}} />;
      })}
    </AbsoluteFill>
  );
};

export const BigText: React.FC<{text: string; start: number; size?: number; color?: string; y?: number; glow?: string; hold?: number}> = ({text, start, size = 190, color = '#fff', y = H / 2, glow = BRAND.primary}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = spring({frame: f - start, fps, config: {damping: 11, stiffness: 140}});
  if (f < start) return null;
  const blur = interpolate(f - start, [0, 8], [24, 0], clamp);
  return (
    <div style={{position: 'absolute', left: 0, width: W, top: y, textAlign: 'center', transform: `translateY(-50%) scale(${0.5 + p * 0.5})`, opacity: interpolate(f - start, [0, 4], [0, 1], clamp), filter: `blur(${blur}px)`, fontFamily: FONT, fontWeight: 900, fontSize: size, lineHeight: 1.05, color, letterSpacing: 4, textShadow: `0 0 40px ${glow}, 0 0 90px ${glow}88`, whiteSpace: 'pre-line', padding: '0 40px', boxSizing: 'border-box'}}>
      {text}
    </div>
  );
};

export const Flash: React.FC<{at: number; len?: number; color?: string}> = ({at, len = 8, color = '#fff'}) => {
  const f = useCurrentFrame();
  const o = interpolate(f - at, [0, 1, len], [0, 1, 0], clamp);
  return <AbsoluteFill style={{background: color, opacity: o, pointerEvents: 'none'}} />;
};

export const Vignette = () => <AbsoluteFill style={{background: 'radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.75) 100%)', pointerEvents: 'none'}} />;
