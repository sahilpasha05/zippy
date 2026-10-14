import React from 'react';
import {AbsoluteFill, Img, interpolate, random, spring, staticFile, useCurrentFrame, useVideoConfig, Easing} from 'remotion';
import {BRAND, FONT, LOGO_FILE, W, H} from './config';

export const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
export const ease = Easing.bezier(0.16, 1, 0.3, 1);

export const Logo: React.FC<{size?: number}> = ({size = 520}) => (
  // Original logo, undistorted, on a white card (the asset has a white background).
  <div style={{background: '#fff', borderRadius: 44, padding: 14, boxShadow: `0 0 120px ${BRAND.primary}88, 0 40px 90px #000c`}}>
    {LOGO_FILE ? <Img src={staticFile(LOGO_FILE)} style={{width: size, height: size, display: 'block', borderRadius: 32}} /> : null}
  </div>
);

export const Particles: React.FC<{count?: number; color?: string; speed?: number; seed?: string; max?: number}> = ({count = 70, color = BRAND.primary, speed = 1, seed = 'p', max = 5}) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {Array.from({length: count}).map((_, i) => {
        const x = random(seed + 'x' + i) * W;
        const y0 = random(seed + 'y' + i) * H;
        const s = 1.5 + random(seed + 's' + i) * max;
        const v = (0.3 + random(seed + 'v' + i)) * 1.6 * speed;
        const y = (((y0 - f * v) % H) + H) % H;
        const tw = 0.25 + 0.6 * Math.abs(Math.sin(f / 11 + i));
        return <div key={i} style={{position: 'absolute', left: x + Math.sin(f / 30 + i) * 12, top: y, width: s, height: s, borderRadius: '50%', background: color, opacity: tw, boxShadow: `0 0 ${s * 5}px ${color}`}} />;
      })}
    </AbsoluteFill>
  );
};

/** Editorial headline: masked slide-up reveal, per line. */
export const Headline: React.FC<{lines: {t: string; size: number; weight?: number; color?: string; track?: number; outline?: boolean}[]; start: number; y: number; glow?: string; gap?: number}> = ({lines, start, y, glow = BRAND.primary, gap = 0.04}) => {
  const f = useCurrentFrame();
  if (f < start) return null;
  return (
    <div style={{position: 'absolute', left: 0, width: W, top: y, transform: 'translateY(-50%)', textAlign: 'center', fontFamily: FONT}}>
      {lines.map((l, i) => {
        const lf = f - start - i * 5;
        const p = interpolate(lf, [0, 16], [0, 1], {...clamp, easing: ease});
        return (
          <div key={i} style={{overflow: 'hidden', padding: '0.06em 40px', marginTop: i ? l.size * gap : 0}}>
            <div style={{fontSize: l.size, fontWeight: l.weight ?? 800, letterSpacing: `${l.track ?? 0.02}em`, lineHeight: 1.05, color: l.outline ? 'transparent' : l.color ?? '#fff', WebkitTextStroke: l.outline ? `3px ${l.color ?? '#fff'}` : undefined, transform: `translateY(${(1 - p) * 110}%)`, opacity: p, filter: `blur(${(1 - p) * 10}px)`, textShadow: l.outline ? undefined : `0 0 50px ${glow}66`, whiteSpace: 'nowrap'}}>{l.t}</div>
          </div>
        );
      })}
    </div>
  );
};

export const Flash: React.FC<{at: number; len?: number; color?: string; peak?: number}> = ({at, len = 8, color = '#fff', peak = 1}) => {
  const f = useCurrentFrame();
  const o = interpolate(f - at, [0, 1, len], [0, peak, 0], clamp);
  return <AbsoluteFill style={{background: color, opacity: o, pointerEvents: 'none'}} />;
};

export const Vignette = () => <AbsoluteFill style={{background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.8) 100%)', pointerEvents: 'none'}} />;

/** Animated film grain + subtle chromatic edge for a filmic finish. */
export const Grain: React.FC<{opacity?: number}> = ({opacity = 0.16}) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{pointerEvents: 'none', mixBlendMode: 'overlay', opacity}}>
      <svg width={W} height={H}><filter id="g"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={f % 24} /><feColorMatrix type="saturate" values="0" /></filter><rect width={W} height={H} filter="url(#g)" /></svg>
    </AbsoluteFill>
  );
};

/** Horizontal anamorphic lens streak. */
export const Streak: React.FC<{y: number; p: number; color?: string; width?: number}> = ({y, p, color = BRAND.primary, width = 1500}) => (
  <div style={{position: 'absolute', left: W / 2 - width / 2, top: y, width, height: 5, transform: `scaleX(${p})`, opacity: Math.min(1, p * 1.5), background: `linear-gradient(90deg, transparent, ${color}, #fff, ${color}, transparent)`, filter: 'blur(2px)', boxShadow: `0 0 60px 12px ${color}88`}} />
);

/** Corner HUD brackets for a tech/premium frame. */
export const Frame: React.FC<{opacity?: number}> = ({opacity = 0.5}) => {
  const c = {position: 'absolute', width: 70, height: 70, borderColor: '#fff', opacity} as const;
  return <AbsoluteFill style={{pointerEvents: 'none'}}>
    <div style={{...c, left: 50, top: 50, borderLeft: '3px solid', borderTop: '3px solid'}} /><div style={{...c, right: 50, top: 50, borderRight: '3px solid', borderTop: '3px solid'}} />
    <div style={{...c, left: 50, bottom: 50, borderLeft: '3px solid', borderBottom: '3px solid'}} /><div style={{...c, right: 50, bottom: 50, borderRight: '3px solid', borderBottom: '3px solid'}} />
  </AbsoluteFill>;
};

export const Rings: React.FC<{x: number; y: number; at: number; color?: string; count?: number; max?: number}> = ({x, y, at, color = BRAND.primary, count = 3, max = 900}) => {
  const f = useCurrentFrame();
  return <>{Array.from({length: count}).map((_, i) => {
    const p = interpolate(f - at - i * 8, [0, 50], [0, 1], {...clamp, easing: ease});
    if (f < at + i * 8) return null;
    const d = p * max;
    return <div key={i} style={{position: 'absolute', left: x - d / 2, top: y - d / 2, width: d, height: d, borderRadius: '50%', border: `3px solid ${color}`, opacity: (1 - p) * 0.9, boxShadow: `0 0 40px ${color}88`}} />;
  })}</>;
};

/** Perspective floor grid that scrolls toward the camera. */
export const FloorGrid: React.FC<{color?: string; top?: number; speed?: number}> = ({color = BRAND.primary, top = 900, speed = 1}) => {
  const f = useCurrentFrame();
  const off = (f * 6 * speed) % 120;
  return (
    <div style={{position: 'absolute', left: -600, width: W + 1200, top, height: 1500, perspective: 900, perspectiveOrigin: '50% 0%', overflow: 'hidden', maskImage: 'linear-gradient(transparent, #000 25%)'}}>
      <div style={{position: 'absolute', inset: 0, transform: 'rotateX(68deg)', transformOrigin: '50% 0%', backgroundImage: `linear-gradient(${color}66 2px, transparent 2px), linear-gradient(90deg, ${color}44 2px, transparent 2px)`, backgroundSize: '120px 120px', backgroundPosition: `0 ${off}px`}} />
    </div>
  );
};
