import React from 'react';
import {AbsoluteFill, interpolate, random, useCurrentFrame} from 'remotion';
import {BRAND, FONT, H, URL_TEXT, W} from './config';
import {FloorGrid, Flash, Frame, Grain, Headline, Logo, Particles, Rings, Streak, Vignette, clamp, ease} from './common';

const mono = "'DejaVu Sans Mono','Courier New',monospace";

/* ---------- Scene 1: Something is coming (90f) ---------- */
export const Scene1 = () => {
  const f = useCurrentFrame();
  const push = interpolate(f, [0, 90], [1, 1.45], {...clamp, easing: ease});
  const fade = interpolate(f, [8, 40], [0, 1], clamp);
  const streak = interpolate(f, [6, 26], [0, 1], {...clamp, easing: ease});
  return (
    <AbsoluteFill style={{background: '#010403'}}>
      <Particles count={80} speed={1.2} seed="s1" />
      <AbsoluteFill style={{opacity: fade, transform: `scale(${push}) translateY(${(push - 1) * -160}px)`, transformOrigin: '50% 75%'}}>
        {[0, 1, 2, 3].map((layer) => (
          <div key={layer} style={{position: 'absolute', left: -40, right: -40, bottom: 330 + layer * 110, height: 800}}>
            {Array.from({length: 16}).map((_, i) => {
              const w = 70 + random(`b${layer}${i}`) * 90;
              const h = 100 + random(`h${layer}${i}`) * (300 - layer * 55);
              const x = i * 72 + random(`x${layer}${i}`) * 25;
              const shade = 8 + layer * 5;
              return (
                <div key={i} style={{position: 'absolute', left: x, bottom: 0, width: w, height: h, background: `linear-gradient(#0c1a14, rgb(${shade},${shade + 6},${shade + 4}))`, borderTop: `1px solid ${BRAND.primary}33`}}>
                  {Array.from({length: Math.floor(h / 30)}).map((_, r) => Array.from({length: Math.floor(w / 24)}).map((__, c) => {
                    const on = random(`w${layer}${i}${r}${c}`) > 0.6;
                    return on ? <div key={`${r}-${c}`} style={{position: 'absolute', left: 8 + c * 22, top: 12 + r * 28, width: 7, height: 11, background: BRAND.warm, opacity: 0.35 + 0.5 * Math.abs(Math.sin(f / 9 + r * c + i)), boxShadow: `0 0 10px ${BRAND.warm}`}} /> : null;
                  }))}
                </div>
              );
            })}
          </div>
        ))}
        <div style={{position: 'absolute', left: 0, right: 0, bottom: 300, height: 260, background: 'linear-gradient(transparent, #010403 80%)'}} />
      </AbsoluteFill>
      <AbsoluteFill style={{background: `radial-gradient(ellipse at 50% 82%, ${BRAND.primary}30, transparent 55%)`}} />
      <Streak y={990} p={streak} width={1700} />
      <Frame opacity={interpolate(f, [30, 50], [0, 0.45], clamp)} />
      <Vignette />
      <Headline start={24} y={640} lines={[{t: 'KADUR.', size: 210, weight: 800, track: 0.08}]} />
      <Headline start={56} y={900} lines={[{t: 'THE WAIT IS', size: 62, weight: 300, track: 0.32}, {t: 'ALMOST OVER.', size: 62, weight: 600, track: 0.32, color: BRAND.primary}]} />
      <Flash at={24} len={7} peak={0.55} /><Flash at={56} len={9} peak={0.3} />
      <Grain />
    </AbsoluteFill>
  );
};

/* ---------- Scene 2: Cravings (120f, 8 beats x 15f) ---------- */
const WORDS = ['BIRYANI', 'PIZZA', 'BURGERS', 'FRIES', 'FRUITS', 'VEGETABLES', 'SNACKS', 'ESSENTIALS'];
const TINT = ['#b45309', '#9f1d1d', '#a16207', '#b45309', '#15803d', '#166534', '#0f766e', '#15803d'];
export const Scene2 = () => {
  const f = useCurrentFrame();
  const i = Math.min(7, Math.floor(f / 15));
  const lf = f - i * 15;
  const word = WORDS[i];
  const dir = i % 2 ? -1 : 1;
  const slide = interpolate(lf, [0, 5], [dir * 700, 0], {...clamp, easing: ease});
  const blur = interpolate(lf, [0, 5], [26, 0], clamp);
  const zoom = interpolate(lf, [0, 15], [0.92, 1.12], clamp);
  const second = f >= 60;
  return (
    <AbsoluteFill style={{background: '#030806'}}>
      <AbsoluteFill style={{background: `radial-gradient(ellipse at 50% 48%, ${TINT[i]}aa, transparent 62%)`}} />
      <Particles count={50} color="#fff" speed={5} seed={`s2${i}`} max={3} />
      {/* ghost outline word, oversized */}
      <div style={{position: 'absolute', left: 0, width: W, top: 760, textAlign: 'center', fontFamily: FONT, fontWeight: 900, fontSize: 330, color: 'transparent', WebkitTextStroke: '2px #ffffff30', whiteSpace: 'nowrap', transform: `translateX(${slide * 1.8 - lf * 14 * dir}px) scale(${zoom})`, filter: `blur(${blur / 2}px)`}}>{word}</div>
      <div style={{position: 'absolute', left: 0, width: W, top: 880, textAlign: 'center', fontFamily: FONT, fontWeight: 800, fontSize: word.length > 8 ? 140 : word.length > 6 ? 190 : 230, letterSpacing: '0.02em', color: '#fff', whiteSpace: 'nowrap', transform: `translateX(${slide}px) scale(${zoom})`, filter: `blur(${blur}px)`, textShadow: `0 0 70px ${TINT[i]}`}}>{word}</div>
      {/* graphic accents */}
      <div style={{position: 'absolute', left: 90, width: interpolate(lf, [0, 12], [0, W - 180], {...clamp, easing: ease}), top: 1115, height: 3, background: `linear-gradient(90deg, ${BRAND.primary}, transparent)`}} />
      <div style={{position: 'absolute', left: 90, top: 1145, fontFamily: mono, fontSize: 30, color: '#ffffffaa', letterSpacing: '0.2em'}}>{String(i + 1).padStart(2, '0')} / 08</div>
      <Rings x={W / 2} y={880} at={0} color={TINT[i]} count={2} max={1100} />
      <div style={{position: 'absolute', left: 0, width: W, top: 360, textAlign: 'center', fontFamily: FONT, fontWeight: 300, fontSize: 54, letterSpacing: '0.34em', color: '#fff', opacity: interpolate(lf + (second ? 0 : f), [0, 10], [0, 1], clamp)}}>
        {second ? <>YOUR DAILY<br /><span style={{fontWeight: 700, color: BRAND.primary}}>GROCERIES</span></> : <>YOUR FAVOURITE<br /><span style={{fontWeight: 700, color: BRAND.primary}}>FOOD</span></>}
      </div>
      <Frame opacity={0.35} /><Vignette /><Flash at={0} len={4} peak={0.4} /><Grain />
    </AbsoluteFill>
  );
};

/* ---------- Scene 3: Big reveal (150f) ---------- */
export const Scene3 = () => {
  const f = useCurrentFrame();
  const beam = interpolate(f, [14, 34], [0, 1], {...clamp, easing: ease});
  const logoP = interpolate(f, [34, 66], [0, 1], {...clamp, easing: ease});
  const shake = f >= 98 && f < 114 ? Math.sin(f * 11) * 16 * (1 - (f - 98) / 16) : 0;
  const kP = interpolate(f, [98, 110], [0, 1], {...clamp, easing: ease});
  return (
    <AbsoluteFill style={{background: '#010403', transform: `translate(${shake}px, ${shake * 0.5}px)`}}>
      <Particles count={110} speed={2.2} seed="s3" />
      <AbsoluteFill style={{background: `radial-gradient(ellipse at 50% 35%, ${BRAND.primary}${f > 98 ? '55' : '22'}, transparent 62%)`}} />
      <FloorGrid top={1000} speed={1.5} />
      {/* vertical light beam */}
      <div style={{position: 'absolute', left: W / 2 - 3, top: 0, width: 6, height: H * beam, background: `linear-gradient(#fff, ${BRAND.primary})`, opacity: f < 58 ? 1 : Math.max(0, 1 - (f - 58) / 8), boxShadow: `0 0 80px 20px ${BRAND.primary}88`}} />
      <Streak y={420} p={interpolate(f, [34, 48], [0, 1], clamp) * (f < 80 ? 1 : 0.4)} width={1600} />
      <div style={{position: 'absolute', left: 0, top: 220, width: W, display: 'flex', justifyContent: 'center', opacity: logoP, transform: `perspective(1400px) rotateY(${(1 - logoP) * 100}deg) rotateX(${(1 - logoP) * 12}deg) scale(${0.55 + logoP * 0.45})`}}>
        <Logo size={500} />
      </div>
      <Rings x={W / 2} y={470} at={36} count={3} max={1500} />
      <Headline start={70} y={930} lines={[{t: 'ZIPPY IS COMING TO', size: 58, weight: 300, track: 0.3}]} />
      {f >= 98 && (
        <div style={{position: 'absolute', left: 0, width: W, top: 1250, textAlign: 'center', transform: `translateY(-50%) scale(${1 + (1 - kP) * 2.2})`, opacity: kP, fontFamily: FONT, fontWeight: 900, fontSize: 250, letterSpacing: '0.03em', color: '#fff', backgroundImage: `linear-gradient(#fff 35%, ${BRAND.primary})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: `drop-shadow(0 0 40px ${BRAND.primary}) drop-shadow(0 0 120px ${BRAND.primary}aa)`}}>KADUR</div>
      )}
      {f >= 98 && <Rings x={W / 2} y={1250} at={98} count={4} max={1800} />}
      <Streak y={1250} p={f >= 98 ? interpolate(f, [98, 112], [0, 1], clamp) * 0.8 : 0} width={1800} />
      <Flash at={34} len={7} peak={0.7} /><Flash at={98} len={16} color={BRAND.primary} peak={0.9} />
      <Frame opacity={0.4} /><Vignette /><Grain />
    </AbsoluteFill>
  );
};

/* ---------- Scene 4: The excitement – town map, routes, app cards (180f) ---------- */
const NODES: [number, number, string][] = [[200, 250, BRAND.primary], [1250, 330, BRAND.secondary], [260, 1000, BRAND.secondary], [1180, 980, BRAND.primary], [700, 80, BRAND.primary], [720, 1280, BRAND.secondary]];
const C0: [number, number] = [720, 640];
const route = (n: [number, number, string]) => `M ${C0[0]} ${C0[1]} L ${C0[0]} ${n[1]} L ${n[0]} ${n[1]}`;
const CARDS = ['Restaurants', 'Groceries', 'Essentials'];
export const Scene4 = () => {
  const f = useCurrentFrame();
  const draw = interpolate(f, [10, 70], [0, 1], {...clamp, easing: ease});
  const cam = interpolate(f, [0, 180], [0, 60], clamp);
  return (
    <AbsoluteFill style={{background: '#020805'}}>
      <AbsoluteFill style={{background: `radial-gradient(ellipse at 50% 58%, ${BRAND.brand}55, transparent 62%)`}} />
      <div style={{position: 'absolute', left: -260, top: 760 - cam, width: 1600, height: 1400, perspective: 1100, perspectiveOrigin: '50% 0%'}}>
        <div style={{position: 'absolute', inset: 0, transform: 'rotateX(52deg)', transformOrigin: '50% 0%'}}>
          <svg width={1440} height={1400} style={{position: 'absolute', left: 80}} viewBox="0 0 1440 1400">
            {/* street grid */}
            {Array.from({length: 18}).map((_, k) => <line key={'h' + k} x1={0} x2={1440} y1={k * 80 + random('sh' + k) * 20} y2={k * 80 + random('sh' + k) * 20} stroke="#ffffff" strokeOpacity={0.09} strokeWidth={2 + random('sw' + k) * 3} />)}
            {Array.from({length: 18}).map((_, k) => <line key={'v' + k} y1={0} y2={1400} x1={k * 82 + random('sv' + k) * 20} x2={k * 82 + random('sv' + k) * 20} stroke="#ffffff" strokeOpacity={0.09} strokeWidth={2 + random('sx' + k) * 3} />)}
            <line x1={0} y1={1100} x2={1440} y2={300} stroke={BRAND.primary} strokeOpacity={0.12} strokeWidth={14} />
            {/* routes */}
            {NODES.map((n, k) => (
              <g key={k}>
                <path d={route(n)} fill="none" stroke={n[2]} strokeOpacity={0.25} strokeWidth={8} strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} />
                <path d={route(n)} fill="none" stroke="#fff" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="0.06 1" strokeDashoffset={-((f * 0.012 + k * 0.17) % 1)} style={{filter: `drop-shadow(0 0 12px ${n[2]})`}} opacity={draw > 0.9 ? 1 : 0} />
                <circle cx={n[0]} cy={n[1]} r={interpolate(draw, [0.6, 1], [0, 16], clamp)} fill={n[2]} style={{filter: `drop-shadow(0 0 18px ${n[2]})`}} />
                <circle cx={n[0]} cy={n[1]} r={16 + ((f + k * 11) % 40) * 1.2} fill="none" stroke={n[2]} strokeOpacity={1 - ((f + k * 11) % 40) / 40} strokeWidth={3} />
              </g>
            ))}
            <circle cx={C0[0]} cy={C0[1]} r={26} fill={BRAND.primary} style={{filter: `drop-shadow(0 0 30px ${BRAND.primary})`}} />
            <circle cx={C0[0]} cy={C0[1]} r={26 + (f % 50) * 3} fill="none" stroke={BRAND.primary} strokeOpacity={1 - (f % 50) / 50} strokeWidth={4} />
          </svg>
        </div>
      </div>
      <AbsoluteFill style={{background: 'linear-gradient(#020805 0%, transparent 35%)'}} />
      {/* glass app cards */}
      {CARDS.map((c, k) => {
        const p = interpolate(f, [60 + k * 9, 82 + k * 9], [0, 1], {...clamp, easing: ease});
        return (
          <div key={c} style={{position: 'absolute', left: k % 2 ? 330 : 90, top: 130 + k * 190 + Math.sin(f / 22 + k) * 8, width: 660, height: 150, borderRadius: 34, background: 'linear-gradient(135deg, #ffffff22, #ffffff0a)', border: '1.5px solid #ffffff33', backdropFilter: 'blur(14px)', boxShadow: '0 30px 80px #000a', transform: `translateX(${(1 - p) * (k % 2 ? 700 : -700)}px)`, opacity: p, display: 'flex', alignItems: 'center', padding: '0 40px', fontFamily: FONT}}>
            <div style={{width: 20, height: 20, borderRadius: 10, background: [BRAND.primary, BRAND.secondary, BRAND.warm][k], boxShadow: `0 0 24px ${[BRAND.primary, BRAND.secondary, BRAND.warm][k]}`}} />
            <div style={{marginLeft: 30, color: '#fff', fontSize: 52, fontWeight: 700, letterSpacing: '0.02em'}}>{c}</div>
            <div style={{marginLeft: 'auto', display: 'flex', flexDirection: 'column', gap: 12}}><div style={{width: 140, height: 10, borderRadius: 5, background: '#ffffff44'}} /><div style={{width: 90, height: 10, borderRadius: 5, background: '#ffffff22'}} /></div>
          </div>
        );
      })}
      <Vignette /><Frame opacity={0.35} />
      {f >= 6 && f < 64 && <Headline start={6} y={1610} lines={[{t: 'FOOD', size: 120, weight: 300, track: 0.2}, {t: 'YOU LOVE.', size: 120, weight: 800}]} />}
      {f >= 64 && f < 124 && <Headline start={64} y={1610} lines={[{t: 'GROCERIES', size: 120, weight: 300, track: 0.2}, {t: 'YOU NEED.', size: 120, weight: 800}]} />}
      {f >= 124 && <Headline start={124} y={1610} lines={[{t: 'DELIVERED', size: 120, weight: 300, track: 0.2}, {t: 'WITH ZIPPY.', size: 120, weight: 800, color: BRAND.primary}]} />}
      <Flash at={64} len={5} peak={0.3} /><Flash at={124} len={5} peak={0.3} /><Grain />
    </AbsoluteFill>
  );
};

/* ---------- Scene 5: Final teaser (210f) ---------- */
export const Scene5 = () => {
  const f = useCurrentFrame();
  const pulse = 1 + (f > 160 ? 0.025 * Math.sin((f - 160) / 7) : 0);
  const out = interpolate(f, [196, 210], [0, 1], clamp);
  return (
    <AbsoluteFill style={{background: `radial-gradient(ellipse at 50% 26%, ${BRAND.brand}, #04140a 70%, #010403)`}}>
      <FloorGrid top={1150} speed={0.6} />
      <Particles count={60} seed="s5" speed={1} color="#fff" max={3} />
      <AbsoluteFill style={{background: '#fff', opacity: interpolate(f, [0, 18], [0.9, 0], clamp)}} />
      <div style={{position: 'absolute', left: 0, top: 100, width: W, display: 'flex', justifyContent: 'center', transform: `scale(${interpolate(f, [4, 34], [0.7, 1], {...clamp, easing: ease}) * pulse})`, opacity: interpolate(f, [4, 20], [0, 1], clamp)}}>
        <Logo size={400} />
      </div>
      <Headline start={34} y={720} lines={[{t: 'KADUR,', size: 130, weight: 300, track: 0.1}, {t: 'GET READY.', size: 130, weight: 800}]} />
      <Headline start={66} y={1030} lines={[{t: 'ZIPPY IS', size: 100, weight: 300, track: 0.15}, {t: 'COMING SOON.', size: 100, weight: 800, color: BRAND.warm}]} glow={BRAND.secondary} />
      <div style={{position: 'absolute', top: 1255, width: W, textAlign: 'center', fontFamily: FONT, fontWeight: 400, fontSize: 44, letterSpacing: '0.04em', color: '#ffffffcc', opacity: interpolate(f, [104, 122], [0, 1], clamp)}}>Something exciting is on its way.</div>
      <Headline start={130} y={1440} lines={[{t: 'STAY TUNED, KADUR.', size: 70, weight: 700, track: 0.08}]} />
      <div style={{position: 'absolute', top: 1560, left: W / 2 - 330, width: 660, height: 100, borderRadius: 50, border: '2px solid #ffffff66', background: '#ffffff14', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontWeight: 600, fontSize: 50, letterSpacing: '0.06em', color: '#fff', opacity: interpolate(f, [150, 168], [0, 1], clamp), transform: `translateY(${interpolate(f, [150, 168], [30, 0], {...clamp, easing: ease})}px)`}}>{URL_TEXT}</div>
      <Frame opacity={0.4} /><Vignette /><Grain opacity={0.12} />
      <AbsoluteFill style={{background: '#000', opacity: out * 0.0}} />
    </AbsoluteFill>
  );
};
