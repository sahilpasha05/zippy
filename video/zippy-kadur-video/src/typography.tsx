import React from 'react';
import {AbsoluteFill, interpolate, random, useCurrentFrame} from 'remotion';
import {BRAND, FONT, H, W} from './config';
import {ease} from './util';

export type Line = {t: string; size: number; weight?: number; color?: string; track?: number};

/** Restrained editorial headline: masked slide-up per line, soft drop shadow for legibility on footage. */
export const Headline: React.FC<{lines: Line[]; at: number; y: number; align?: 'center' | 'left'; shadow?: boolean}> = ({lines, at, y, align = 'center', shadow = true}) => {
  const f = useCurrentFrame();
  if (f < at) return null;
  return (
    <div style={{position: 'absolute', left: 0, width: W, top: y, transform: 'translateY(-50%)', textAlign: align, fontFamily: FONT}}>
      {lines.map((l, i) => {
        const p = interpolate(f - at - i * 4, [0, 14], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});
        return (
          <div key={i} style={{overflow: 'hidden', padding: '0.05em 80px'}}>
            <div style={{fontSize: l.size, fontWeight: l.weight ?? 800, letterSpacing: `${l.track ?? 0.01}em`, lineHeight: 1.06, color: l.color ?? '#fff', whiteSpace: 'nowrap', transform: `translateY(${(1 - p) * 105}%)`, opacity: p, textShadow: shadow ? '0 4px 36px rgba(0,0,0,0.65)' : undefined}}>{l.t}</div>
          </div>
        );
      })}
    </div>
  );
};

/** Dark gradient at the bottom (or top) so text stays readable on bright footage. */
export const Scrim: React.FC<{side?: 'bottom' | 'top'; strength?: number}> = ({side = 'bottom', strength = 0.8}) => (
  <AbsoluteFill style={{background: `linear-gradient(${side === 'bottom' ? '0deg' : '180deg'}, rgba(0,0,0,${strength}) 0%, transparent 45%)`, pointerEvents: 'none'}} />
);

export const Grain: React.FC<{opacity?: number}> = ({opacity = 0.12}) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{pointerEvents: 'none', mixBlendMode: 'overlay', opacity}}>
      <svg width={W} height={H}><filter id="gr"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={f % 24} /><feColorMatrix type="saturate" values="0" /></filter><rect width={W} height={H} filter="url(#gr)" /></svg>
    </AbsoluteFill>
  );
};

export const Flash: React.FC<{at: number; len?: number; peak?: number}> = ({at, len = 6, peak = 0.6}) => {
  const f = useCurrentFrame();
  return <AbsoluteFill style={{background: '#fff', opacity: interpolate(f - at, [0, 1, len], [0, peak, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}), pointerEvents: 'none'}} />;
};

export const Fade: React.FC<{from?: number; to?: number; len?: number; color?: string; dir?: 'in' | 'out'; total?: number}> = ({from = 0, len = 15, color = '#000', dir = 'in', total = 0}) => {
  const f = useCurrentFrame();
  const o = dir === 'in' ? interpolate(f, [from, from + len], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) : interpolate(f, [total - len, total], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return <AbsoluteFill style={{background: color, opacity: o, pointerEvents: 'none'}} />;
};
export {BRAND, random};
