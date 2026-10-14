import React from 'react';
import {AbsoluteFill, Img, OffthreadVideo, interpolate, random, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import manifest from './manifest.json';
import {FONT, W} from './config';

const base = (p: string) => p.split('/').pop()!.replace(/\.[^.]+$/, '');
export const findAsset = (slot: string) => (manifest.files as string[]).find((f) => base(f) === slot);

/** Colour grade: rich blacks, slightly lifted teal shadows, warm highlights. Applied over every real shot. */
export const Grade: React.FC = () => (
  <>
    <AbsoluteFill style={{background: 'linear-gradient(180deg, #0a2a3a22, #3a1a0a22)', mixBlendMode: 'soft-light'}} />
    <AbsoluteFill style={{background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.55) 100%)'}} />
  </>
);

export type Mode = 'images' | 'type';
export const ModeCtx = React.createContext<Mode>('images');
/** True when this slot will show real imagery in the current mode. */
export const useHasMedia = (slot: string) => {
  const mode = React.useContext(ModeCtx);
  return mode === 'images' && !!findAsset(slot);
};

const BACKDROPS: Record<string, {tint: string; word?: string; bokeh?: boolean}> = {
  's1-town-night': {tint: '#16a34a', bokeh: true},
  's2-biryani': {tint: '#b45309', word: 'BIRYANI'}, 's2-pizza': {tint: '#9f1d1d', word: 'PIZZA'},
  's2-burger': {tint: '#a16207', word: 'BURGERS'}, 's2-fries': {tint: '#b91c1c', word: 'FRIES'},
  's3-produce': {tint: '#15803d', word: 'FRESH'}, 's3-shelves': {tint: '#0f766e', word: 'DAILY'},
  's5-town': {tint: '#16a34a', bokeh: true},
  's6-rider': {tint: '#15803d', word: 'DELIVERED', bokeh: true}, 's6-bag': {tint: '#16a34a', word: 'ZIPPY'},
};
/** Typography-only stand-in: graded dark frame, slow light drift, optional night-town bokeh, ghost outline word. */
export const Backdrop: React.FC<{slot: string}> = ({slot}) => {
  const f = useCurrentFrame();
  const c = BACKDROPS[slot] ?? {tint: '#16a34a'};
  return (
    <AbsoluteFill style={{background: '#040906', overflow: 'hidden'}}>
      <AbsoluteFill style={{background: `radial-gradient(ellipse at ${50 + Math.sin(f / 40) * 12}% 45%, ${c.tint}88, transparent 62%)`}} />
      {c.bokeh && Array.from({length: 26}).map((_, i) => {
        const x = (random('bx' + slot + i) * 1300 - 110 + f * (0.3 + random('bv' + i)) * 0.6) % 1190;
        const y = 1000 + random('by' + slot + i) * 700; const r = 14 + random('br' + i) * 46;
        return <div key={i} style={{position: 'absolute', left: x, top: y - Math.sin(f / 25 + i) * 6, width: r, height: r, borderRadius: '50%', background: i % 3 ? '#FBBF24' : '#fff', opacity: 0.12 + 0.2 * random('bo' + i), filter: `blur(${2 + random('bb' + i) * 6}px)`}} />;
      })}
      {c.word && <div style={{position: 'absolute', left: 0, width: W, top: 640, textAlign: 'center', fontFamily: FONT, fontWeight: 900, fontSize: c.word.length > 6 ? 250 : 330, color: 'transparent', WebkitTextStroke: '2px #ffffff26', whiteSpace: 'nowrap', transform: `translateX(${(f - 15) * -3}px)`}}>{c.word}</div>}
      <AbsoluteFill style={{background: 'linear-gradient(180deg, #00000000 55%, #000000aa)'}} />
    </AbsoluteFill>
  );
};

export const Media: React.FC<{slot: string; label?: string; push?: number; from?: number}> = ({slot, push = 0.1, from = 0}) => {
  const f = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const mode = React.useContext(ModeCtx);
  const file = mode === 'images' ? findAsset(slot) : undefined;
  if (!file) return <Backdrop slot={slot} />;
  const z = 1 + interpolate(f, [0, durationInFrames], [0, push], {extrapolateRight: 'clamp'});
  const src = staticFile(`assets/${file}`);
  const isVideo = /\.(mp4|mov|webm)$/i.test(file);
  const style: React.CSSProperties = {width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${z})`, filter: 'contrast(1.08) saturate(1.04) brightness(0.97)'};
  return (
    <AbsoluteFill style={{overflow: 'hidden', background: '#000'}}>
      {isVideo ? <OffthreadVideo src={src} startFrom={from} muted style={style} /> : <Img src={src} style={style} />}
      <Grade />
    </AbsoluteFill>
  );
};
