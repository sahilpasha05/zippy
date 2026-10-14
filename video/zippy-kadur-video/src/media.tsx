import React from 'react';
import {AbsoluteFill, Img, OffthreadVideo, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import manifest from './manifest.json';
import {FONT, MONO, SAFE} from './config';

const base = (p: string) => p.split('/').pop()!.replace(/\.[^.]+$/, '');
export const findAsset = (slot: string) => (manifest.files as string[]).find((f) => base(f) === slot);

/** Colour grade: rich blacks, slightly lifted teal shadows, warm highlights. Applied over every real shot. */
export const Grade: React.FC = () => (
  <>
    <AbsoluteFill style={{background: 'linear-gradient(180deg, #0a2a3a22, #3a1a0a22)', mixBlendMode: 'soft-light'}} />
    <AbsoluteFill style={{background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.55) 100%)'}} />
  </>
);

export const Media: React.FC<{slot: string; label: string; push?: number; from?: number}> = ({slot, label, push = 0.1, from = 0}) => {
  const f = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const file = findAsset(slot);
  const z = 1 + interpolate(f, [0, durationInFrames], [0, push], {extrapolateRight: 'clamp'});
  if (!file) {
    // Honest placeholder: a graded dark frame that names the missing shot. No fake imagery.
    return (
      <AbsoluteFill style={{background: 'linear-gradient(160deg, #101a15, #05090700 70%), #070b09'}}>
        <div style={{position: 'absolute', left: SAFE.side, top: SAFE.top, fontFamily: MONO, fontSize: 24, letterSpacing: '0.08em', color: '#ffffff66', lineHeight: 1.6}}>
          FOOTAGE SLOT · {label.toUpperCase()}<br />add public/assets/{slot}.mp4 (or .jpg)
        </div>
        <AbsoluteFill style={{border: '2px dashed #ffffff18', margin: 36, borderRadius: 24}} />
      </AbsoluteFill>
    );
  }
  const src = staticFile(`assets/${file}`);
  const isVideo = /\.(mp4|mov|webm)$/i.test(file);
  const style: React.CSSProperties = {width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${z})`, filter: 'contrast(1.1) saturate(1.04) brightness(0.96)'};
  return (
    <AbsoluteFill style={{overflow: 'hidden', background: '#000'}}>
      {isVideo ? <OffthreadVideo src={src} startFrom={from} muted style={style} /> : <Img src={src} style={style} />}
      <Grade />
    </AbsoluteFill>
  );
};
