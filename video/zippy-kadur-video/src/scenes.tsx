import React from 'react';
import {AbsoluteFill, interpolate, random, useCurrentFrame, Sequence} from 'remotion';
import {BRAND, FONT, H, W} from './config';
import {BigText, Flash, Logo, Particles, Vignette, clamp, ease} from './common';
import {FOODS} from './foods';

/* ---------- Scene 1: Something is coming (90f) ---------- */
export const Scene1 = () => {
  const f = useCurrentFrame();
  const push = interpolate(f, [0, 90], [1, 1.55], {...clamp, easing: ease});
  const fade = interpolate(f, [0, 30], [0, 1], clamp);
  return (
    <AbsoluteFill style={{background: '#02020A'}}>
      <Particles count={90} speed={1.4} seed="s1" />
      <AbsoluteFill style={{opacity: fade, transform: `scale(${push}) translateY(${(push - 1) * -120}px)`, transformOrigin: '50% 70%'}}>
        {[0, 1, 2].map((layer) => (
          <div key={layer} style={{position: 'absolute', left: 0, right: 0, bottom: 200 + layer * 150, height: 700}}>
            {Array.from({length: 14}).map((_, i) => {
              const w = 90 + random(`b${layer}${i}`) * 90;
              const h = 120 + random(`h${layer}${i}`) * (260 - layer * 50);
              const x = i * 85 - 40 + random(`x${layer}${i}`) * 20;
              return (
                <div key={i} style={{position: 'absolute', left: x, bottom: 0, width: w, height: h, background: `rgb(${14 + layer * 6},${14 + layer * 6},${34 + layer * 10})`, opacity: 0.9}}>
                  {Array.from({length: Math.floor(h / 28)}).map((_, r) => Array.from({length: Math.floor(w / 26)}).map((__, c) => {
                    const on = random(`w${layer}${i}${r}${c}`) > 0.55;
                    const tw = on ? 0.6 + 0.4 * Math.sin(f / 7 + r * c) : 0;
                    return <div key={`${r}-${c}`} style={{position: 'absolute', left: 8 + c * 24, top: 10 + r * 26, width: 9, height: 12, background: BRAND.warm, opacity: tw, boxShadow: on ? `0 0 8px ${BRAND.warm}` : 'none'}} />;
                  }))}
                </div>
              );
            })}
          </div>
        ))}
      </AbsoluteFill>
      <AbsoluteFill style={{background: `radial-gradient(circle at 50% 80%, ${BRAND.primary}33, transparent 55%)`}} />
      <Vignette />
      <BigText text="KADUR..." start={22} size={190} y={700} />
      <BigText text={'ARE YOU\nREADY?'} start={58} size={150} y={1150} color={BRAND.primary} glow={BRAND.secondary} />
      <Flash at={22} len={6} /><Flash at={58} len={10} />
    </AbsoluteFill>
  );
};

/* ---------- Scene 2: Cravings (120f, 20f per shot) ---------- */
const bgs = ['#FF7A1A', '#E8281E', '#F2A900', '#FFB300', '#2FB344', '#7B3FE4'];
export const Scene2 = () => {
  const f = useCurrentFrame();
  const i = Math.min(5, Math.floor(f / 20));
  const lf = f - i * 20;
  const Food = FOODS[i];
  const scale = interpolate(lf, [0, 20], [0.8, 1.35], clamp);
  const whip = interpolate(lf, [0, 5], [600, 0], {...clamp, easing: ease});
  const blur = interpolate(lf, [0, 5], [30, 0], clamp);
  const rot = interpolate(lf, [0, 20], [-6, 6], clamp);
  return (
    <AbsoluteFill style={{background: `radial-gradient(circle at 50% 45%, ${bgs[i]}, #07070F 75%)`}}>
      <Particles count={60} color="#fff" speed={4} seed={`s2${i}`} />
      <div style={{position: 'absolute', left: 0, top: 380, width: W, display: 'flex', justifyContent: 'center', transform: `translateX(${whip}px) scale(${scale}) rotate(${rot}deg)`, filter: `blur(${blur}px) drop-shadow(0 40px 60px #000a)`}}>
        <Food />
      </div>
      {Array.from({length: 14}).map((_, k) => {
        const a = random(`fp${i}${k}`) * Math.PI * 2;
        const d = lf * (12 + random(`fd${k}`) * 20);
        return <div key={k} style={{position: 'absolute', left: W / 2 + Math.cos(a) * d, top: 690 + Math.sin(a) * d, width: 16, height: 16, borderRadius: '50%', background: '#fff', opacity: interpolate(lf, [0, 20], [0.9, 0], clamp)}} />;
      })}
      <Vignette />
      {f < 62 && <BigText text={'YOUR FAVOURITE\nFOOD...'} start={4} size={105} y={1560} />}
      {f >= 62 && <BigText text={'YOUR DAILY\nGROCERIES...'} start={64} size={105} y={1560} glow={BRAND.secondary} />}
      <Flash at={0} len={4} />
    </AbsoluteFill>
  );
};

/* ---------- Scene 3: Big reveal (150f) ---------- */
export const Scene3 = () => {
  const f = useCurrentFrame();
  const streak = interpolate(f, [18, 36], [-1400, 1500], clamp);
  const logoP = interpolate(f, [34, 62], [0, 1], {...clamp, easing: ease});
  const shake = f >= 96 && f < 112 ? Math.sin(f * 9) * 14 * (1 - (f - 96) / 16) : 0;
  const kadurS = interpolate(f, [96, 106], [3, 1], {...clamp, easing: ease});
  return (
    <AbsoluteFill style={{background: '#04040C', transform: `translate(${shake}px, ${shake * 0.6}px)`}}>
      <Particles count={120} speed={2} seed="s3" />
      <AbsoluteFill style={{background: `radial-gradient(circle at 50% 38%, ${BRAND.primary}${f > 96 ? '66' : '33'}, transparent 60%)`}} />
      <div style={{position: 'absolute', top: 0, left: streak, width: 500, height: H, background: `linear-gradient(90deg, transparent, #fff, transparent)`, transform: 'skewX(-20deg)', opacity: f > 18 && f < 40 ? 0.9 : 0, filter: 'blur(14px)'}} />
      <div style={{position: 'absolute', left: 0, top: 250, width: W, display: 'flex', justifyContent: 'center', opacity: logoP, transform: `perspective(1200px) rotateY(${(1 - logoP) * 180}deg) scale(${0.4 + logoP * 0.6}) translateZ(0)`}}>
        <Logo size={500} />
      </div>
      <BigText text="ZIPPY IS COMING TO..." start={66} size={64} y={880} />
      {f >= 96 && (
        <div style={{position: 'absolute', left: 0, width: W, top: 1250, textAlign: 'center', transform: `translateY(-50%) scale(${kadurS})`, fontFamily: FONT, fontWeight: 900, fontSize: 205, color: '#fff', letterSpacing: 6, textShadow: `0 0 50px ${BRAND.primary}, 0 0 140px ${BRAND.primary}, 0 12px 0 ${BRAND.secondary}`}}>
          KADUR!
        </div>
      )}
      <Flash at={36} len={6} /><Flash at={96} len={14} color={BRAND.primary} />
      <Vignette />
    </AbsoluteFill>
  );
};

/* ---------- Scene 4: Excitement (180f) ---------- */
const Rider: React.FC = () => (
  <svg viewBox="0 0 300 260" width={560} height={485}>
    <circle cx="70" cy="200" r="38" fill="#111" stroke="#555" strokeWidth="6" /><circle cx="230" cy="200" r="38" fill="#111" stroke="#555" strokeWidth="6" />
    <path d="M70 200 L120 140 H210 L230 200" stroke="#2a2a3a" strokeWidth="14" fill="none" strokeLinejoin="round" />
    <rect x="95" y="60" width="95" height="85" rx="12" fill={BRAND.primary} /><rect x="105" y="78" width="75" height="14" rx="4" fill="#fff" opacity=".85" />
    <circle cx="170" cy="40" r="20" fill="#E0AC84" /><path d="M150 36 Q170 12 192 34Z" fill={BRAND.secondary} />
    <path d="M160 62 L190 130 L150 140" stroke={BRAND.secondary} strokeWidth="18" fill="none" strokeLinecap="round" />
  </svg>
);
export const Scene4 = () => {
  const f = useCurrentFrame();
  const bob = Math.sin(f / 3) * 6;
  const road = (f * 28) % 200;
  const phoneIn = interpolate(f, [80, 105], [900, 0], {...clamp, easing: ease});
  return (
    <AbsoluteFill style={{background: 'linear-gradient(#FFB36B, #FF6B8B 55%, #3A1F6B)'}}>
      <Particles count={40} color="#fff" seed="s4" speed={3} />
      {[0, 1].map((l) => (
        <div key={l} style={{position: 'absolute', left: -((f * (8 + l * 8)) % 540), bottom: 560 + l * 120, display: 'flex', opacity: 0.5 + l * 0.3}}>
          {Array.from({length: 8}).map((_, i) => <div key={i} style={{width: 120 + random(`d${l}${i}`) * 80, height: 200 + random(`e${l}${i}`) * 260 + l * 80, marginRight: 10, background: l ? '#2a1850' : '#4a2a7a', borderRadius: '8px 8px 0 0'}} />)}
        </div>
      ))}
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 380, height: 180, background: '#1a1030'}}>
        {Array.from({length: 8}).map((_, i) => <div key={i} style={{position: 'absolute', top: 85, left: i * 200 - road, width: 100, height: 10, background: '#fff', opacity: 0.7}} />)}
      </div>
      <div style={{position: 'absolute', left: interpolate(f, [0, 25], [-700, 250], {...clamp, easing: ease}) - (f > 120 ? (f - 120) * 14 : 0), bottom: 400 + bob}}><Rider /></div>
      <div style={{position: 'absolute', left: 560, top: 260 + phoneIn, width: 420, height: 800, borderRadius: 70, background: '#0c0c18', border: '10px solid #222', boxShadow: '0 40px 100px #000a', overflow: 'hidden'}}>
        <div style={{height: 120, background: BRAND.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontSize: 54, color: '#111'}}>Browse</div>
        {['Food', 'Fresh', 'Snacks', 'Daily'].map((t, i) => (
          <div key={t} style={{margin: '20px 24px', height: 120, borderRadius: 24, background: ['#FF7A1A', '#2FB344', '#F2A900', '#4DA3FF'][i], display: 'flex', alignItems: 'center', paddingLeft: 36, fontFamily: FONT, fontSize: 46, color: '#fff', transform: `translateX(${interpolate(f, [105 + i * 6, 118 + i * 6], [500, 0], {...clamp, easing: ease})}px)`}}>{t}</div>
        ))}
      </div>
      <Vignette />
      {f >= 8 && f < 66 && <BigText text={'FOOD YOU\nLOVE.'} start={8} size={118} y={1600} />}
      {f >= 66 && f < 126 && <BigText text={'GROCERIES\nYOU NEED.'} start={66} size={118} y={1600} glow={BRAND.secondary} />}
      {f >= 126 && <BigText text={'DELIVERED\nWITH ZIPPY.'} start={126} size={118} y={1600} color={BRAND.warm} glow={BRAND.brand} />}
      <Flash at={66} len={5} /><Flash at={126} len={5} />
    </AbsoluteFill>
  );
};

/* ---------- Scene 5: Final teaser (210f) ---------- */
export const Scene5 = () => {
  const f = useCurrentFrame();
  const pulse = 1 + (f > 150 ? 0.04 * Math.sin((f - 150) / 6) : 0);
  return (
    <AbsoluteFill style={{background: `radial-gradient(circle at 50% 30%, ${BRAND.brand}, ${BRAND.dark} 85%)`}}>
      <Particles count={70} seed="s5" speed={1.2} />
      <AbsoluteFill style={{opacity: interpolate(f, [0, 20], [1, 0], clamp), background: '#fff'}} />
      <div style={{position: 'absolute', left: 0, top: 90, width: W, display: 'flex', justifyContent: 'center', transform: `scale(${interpolate(f, [4, 30], [0.6, 1], {...clamp, easing: ease}) * pulse})`, opacity: interpolate(f, [4, 20], [0, 1], clamp)}}>
        <Logo size={400} />
      </div>
      <BigText text={'KADUR,\nGET READY!'} start={30} size={120} y={720} />
      <BigText text={'ZIPPY IS\nCOMING SOON!'} start={62} size={110} y={1040} color={BRAND.warm} glow={BRAND.secondary} />
      <div style={{position: 'absolute', top: 1270, width: W, textAlign: 'center', fontFamily: 'Arial,sans-serif', fontSize: 52, color: '#fff', opacity: interpolate(f, [100, 118], [0, 1], clamp)}}>Something exciting is on its way.</div>
      <BigText text="STAY TUNED, KADUR!" start={130} size={78} y={1470} />
      <div style={{position: 'absolute', top: 1610, width: W, textAlign: 'center', fontFamily: 'Arial,sans-serif', fontSize: 46, color: '#fff', opacity: interpolate(f, [150, 168], [0, 1], clamp)}}>zippytarikere.com</div>
      <AbsoluteFill style={{background: '#000', opacity: interpolate(f, [195, 210], [0, 0.0], clamp)}} />
      <Vignette />
    </AbsoluteFill>
  );
};
