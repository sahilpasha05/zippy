"""Synthesises the score. Every hit/riser/tick is placed from timing.json so audio and text cannot drift apart.
120 BPM, A minor. Run: python3 scripts/make-audio.py"""
import json, wave
import numpy as np
from scipy import signal

T = json.load(open('timing.json'))
C = T['cues']; S = T['scenes']
sr = 44100; DUR = 25.0; n = int(sr * DUR)
rng = np.random.default_rng(7)
BEAT = 0.5
L = np.zeros(n); R = np.zeros(n)          # dry stereo bus
WL = np.zeros(n); WR = np.zeros(n)        # reverb send

def put(sig, t, gain=1.0, pan=0.0, wet=0.0):
    s = int(t * sr)
    if s >= n: return
    e = min(n, s + len(sig)); x = sig[: e - s] * gain
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    L[s:e] += x * l; R[s:e] += x * r
    WL[s:e] += x * l * wet; WR[s:e] += x * r * wet

def tt(d): return np.arange(int(d * sr)) / sr
def lp(x, f, o=2): return signal.sosfilt(signal.butter(o, f, 'low', fs=sr, output='sos'), x)
def hp(x, f, o=2): return signal.sosfilt(signal.butter(o, f, 'high', fs=sr, output='sos'), x)
def bp(x, a, b): return signal.sosfilt(signal.butter(2, [a, b], 'band', fs=sr, output='sos'), x)
def env(d, a=0.005, r=0.1):
    x = np.ones(int(d * sr)); a = max(1, int(a * sr)); r = max(1, int(r * sr))
    x[:a] = np.linspace(0, 1, a); x[-r:] = np.minimum(x[-r:], np.linspace(1, 0, r)); return x
def midi(m): return 440 * 2 ** ((m - 69) / 12)

def kick(g=1.0):
    t = tt(0.42); ph = 2 * np.pi * (45 * t + 95 * (1 - np.exp(-t * 22)) / 22)
    return (np.sin(ph) * np.exp(-t * 8) + 0.25 * hp(rng.standard_normal(len(t)), 2000) * np.exp(-t * 120)) * g
def hat(g=0.25, open_=False):
    t = tt(0.25 if open_ else 0.05); return hp(rng.standard_normal(len(t)), 7000) * np.exp(-t * (14 if open_ else 90)) * g
def clap(g=0.5):
    t = tt(0.22); x = bp(rng.standard_normal(len(t)), 1200, 3500)
    return x * (np.exp(-t * 35) + 0.6 * np.exp(-((t - 0.012) * 300) ** 2)) * g
def boom(d=2.4, f=42, g=1.0):
    t = tt(d); x = np.sin(2 * np.pi * (f + 90 * np.exp(-t * 12)) * t) * np.exp(-t * 1.6)
    x += 0.35 * lp(rng.standard_normal(len(t)), 900) * np.exp(-t * 5)
    return x * g
def whoosh(d=0.5, up=True, g=0.3):
    t = tt(d); x = rng.standard_normal(len(t)); p = t / d
    f = (500 + 6000 * p ** 2) if up else (6500 - 6000 * p)
    out = np.zeros(len(t)); k = 2048
    for i in range(0, len(t), k):
        fc = float(np.clip(f[min(i, len(t) - 1)], 200, 15000)); seg = x[i:i + k]
        out[i:i + k] = bp(seg, fc * 0.7, min(fc * 1.4, 20000))[: len(seg)]
    return out * (p ** 1.5 if up else (1 - p) ** 1.5) * g * 4
def riser(d, g=0.5):
    t = tt(d); p = t / d
    noise = hp(rng.standard_normal(len(t)), 1500) * p ** 2
    tone = np.sin(2 * np.pi * np.cumsum(220 + 1800 * p ** 2) / sr) * p ** 2 * 0.5
    return (noise * 0.6 + tone) * g
def pluck(m, d=0.5, g=0.3):
    t = tt(d); f = midi(m)
    x = np.sin(2 * np.pi * f * t) + 0.4 * np.sin(4 * np.pi * f * t) + 0.2 * np.sin(6 * np.pi * f * t)
    return x * np.exp(-t * 7) * g
def bell(m, d=2.0, g=0.3):
    t = tt(d); f = midi(m)
    x = sum(a * np.sin(2 * np.pi * f * r * t) for r, a in [(1, 1), (2.01, .5), (3.02, .3), (4.2, .15)])
    return x * np.exp(-t * 2.2) * g
def pad_chord(ms, d, g=0.18):
    t = tt(d); x = np.zeros(len(t))
    for m in ms:
        for det in (-0.12, 0.0, 0.12):
            f = midi(m + det); x += sum(np.sin(2 * np.pi * f * k * t + k) / k for k in range(1, 7))
    return x * env(d, 1.2, 1.2) * g / len(ms)

# --- dynamics: the score grows across the film ---
def lvl(t): return float(np.interp(t, [0, 3, 9, 12, 14, 19, 22, 25], [0.35, 0.5, 0.65, 0.5, 0.85, 1.0, 1.0, 0.6]))

# Pad: Am - F - C - G, 4 s per chord, crossfade a dark/bright version with time
prog = [[45, 57, 60, 64], [41, 53, 57, 60], [48, 55, 60, 64], [43, 55, 59, 62]]
for i in range(0, 7):
    t0 = i * 4.0 - 0.6 if i else 0; d = 4.0 + (0.6 if i else 0) + 0.6
    ch = pad_chord(prog[i % 4], d)
    put(lp(ch, 700), max(t0, 0), 1.0 * (1.1 - lvl(t0) * 0.5), wet=0.4)
    put(lp(ch, 5000), max(t0, 0), 0.9 * lvl(t0), wet=0.5)
# Sub drone
t = tt(DUR); put(np.sin(2 * np.pi * 55 * t) * (0.18 + 0.1 * np.sin(2 * np.pi * 0.125 * t)) * np.interp(t, [0, 2, 25], [0.2, 1, 1]), 0)

breath = (11.55, 12.0)   # everything drops out just before KADUR! hits
def active(t, spans): return any(a <= t < b for a, b in spans)
GROOVE1 = [(3.0, breath[0]), (12.0, 22.5)]
HATS = [(4.0, breath[0]), (12.0, 22.5)]
CLAPS = [(7.0, breath[0]), (12.0, 22.5)]

b = 0
while b * BEAT < DUR:
    t0 = b * BEAT
    if active(t0, GROOVE1): put(kick(), t0, 0.95 * lvl(t0), wet=0.02)
    if active(t0, HATS):
        put(hat(), t0 + BEAT / 2, lvl(t0), pan=0.3)
        if b % 2: put(hat(0.18, True), t0 + BEAT / 2, lvl(t0), pan=-0.3, wet=0.1)
    if active(t0, CLAPS) and b % 2: put(clap(), t0, lvl(t0), wet=0.25)
    b += 1
# Bass line under groove (root of chord, 8ths)
roots = [33, 29, 36, 31]
t0 = 3.0
while t0 < 22.5:
    if not breath[0] <= t0 < breath[1]:
        r = roots[int(t0 // 4) % 4]
        put(lp(np.sin(2 * np.pi * midi(r) * tt(0.3)) * np.exp(-tt(0.3) * 5) + 0.3 * np.sin(4 * np.pi * midi(r) * tt(0.3)) * np.exp(-tt(0.3) * 8), 400), t0, 0.5 * lvl(t0))
    t0 += BEAT
# Arp plucks from the rider/delivery section on
arp = [0, 7, 12, 16]
t0 = 14.0
while t0 < 22.5:
    ch = prog[int(t0 // 4) % 4]
    put(pluck(ch[1] + 12 + arp[int((t0 - 14) / (BEAT / 2)) % 4] - 0, 0.4, 0.22), t0, 1.0, pan=0.5 * np.sin(t0 * 3), wet=0.45)
    t0 += BEAT / 2

# --- cues: hits, ticks, risers ---
put(whoosh(0.7, True, 0.3), C['kadur'] - 0.45, wet=0.3); put(boom(2.6, 40, 0.7), C['kadur'], wet=0.3)
put(boom(2.0, 46, 0.55), C['ready'], wet=0.3); put(pluck(69, 1.0, 0.25), C['ready'], wet=0.6)
for k in ['pizza', 'burger', 'fries', 'groceries', 'shelf']:   # picture cuts
    put(whoosh(0.28, False, 0.28), C[k] - 0.02, pan=0.4 if k in ('pizza', 'fries', 'shelf') else -0.4)
put(whoosh(0.5, True, 0.25), C['food'] - 0.35)
# logo reveal: soft shimmer, then a quiet text tick
put(bell(81, 2.5, 0.22), C['logo'], wet=0.6); put(boom(1.6, 50, 0.4), C['logo'], wet=0.3)
put(whoosh(0.6, False, 0.2), C['comingTo'] - 0.05)
# tension to KADUR!
put(riser(1.55, 0.7), 10.45, wet=0.2)
put(whoosh(0.4, True, 0.35), 11.6)
put(boom(3.2, 38, 1.15), C['kadurHit'], wet=0.35); put(kick(1.3), C['kadurHit'])
put(bell(69, 2.6, 0.25), C['kadurHit'], wet=0.6)
# delivery section accents
put(whoosh(0.35, False, 0.25), C['rider'] - 0.05); put(whoosh(0.3, True, 0.22), C['bag'] - 0.3); put(kick(0.8), C['bag'])
# phone section
for k in ['foodYouLove', 'groceriesYouNeed']: put(whoosh(0.4, False, 0.22), C[k] - 0.05); put(pluck(76, 0.7, 0.25), C[k], wet=0.5)
# announcement build
put(whoosh(0.5, False, 0.3), C['getReady'] - 0.05); put(boom(2.0, 44, 0.8), C['getReady'], wet=0.3)
put(boom(1.6, 48, 0.65), C['comingSoon'], wet=0.3); put(riser(0.95, 0.55), C['something'] - 0.05, wet=0.2) if False else None
put(riser(1.95, 0.75), 20.5, wet=0.2)
put(pluck(81, 0.8, 0.25), C['something'], wet=0.5)
# end card: hit, then clean resolve into A major-ish sting
put(boom(3.0, 40, 1.0), C['end'], wet=0.35); put(kick(1.1), C['end'])
put(whoosh(0.35, False, 0.25), C['stayTuned'] - 0.05); put(pluck(76, 0.9, 0.7), C['stayTuned'], wet=0.5); put(boom(1.0, 55, 0.5), C['stayTuned'])
put(whoosh(0.3, False, 0.2), C['url'] - 0.05); put(pluck(81, 0.9, 0.7), C['url'], wet=0.5); put(boom(0.8, 60, 0.4), C['url'])
for m, dt in [(57, 0), (64, 0.03), (69, 0.06), (73, 0.09), (76, 0.12)]: put(bell(m, 1.1, 0.34), C['sting'] + dt, pan=(m - 64) / 20, wet=0.7)

# --- reverb (synthetic stereo IR, 2.2 s) ---
ir_t = tt(2.2)
irL = hp(rng.standard_normal(len(ir_t)), 200) * np.exp(-ir_t * 2.6); irR = hp(rng.standard_normal(len(ir_t)), 200) * np.exp(-ir_t * 2.6)
irL /= np.sqrt((irL ** 2).sum()); irR /= np.sqrt((irR ** 2).sum())
rvL = signal.fftconvolve(WL, irL)[:n]; rvR = signal.fftconvolve(WR, irR)[:n]
outL = L + 0.8 * rvL; outR = R + 0.8 * rvR
# hard drop-out right before KADUR! so the hit lands on silence
duck = np.ones(n); a, b2 = int(11.70 * sr), int(11.995 * sr); r_ = int(0.02 * sr)
duck[a:b2] = 0.08; duck[a - r_:a] = np.linspace(1, 0.08, r_); duck[b2:b2 + int(0.004 * sr)] = 1
outL *= duck; outR *= duck

# sidechain-style duck of pad under kicks is skipped; master: gentle glue, limiter, fades
def master(x):
    x = np.tanh(x * 1.1) / np.tanh(1.1)
    return x
outL, outR = master(outL), master(outR)
peak = max(np.abs(outL).max(), np.abs(outR).max()); outL, outR = outL / peak * 0.89, outR / peak * 0.89
fo = np.ones(n); fi = int(0.3 * sr); fo[:fi] = np.linspace(0, 1, fi); fe = int(0.5 * sr); fo[-fe:] = np.linspace(1, 0, fe)
outL *= fo; outR *= fo
st = np.empty(n * 2, dtype=np.int16); st[0::2] = (outL * 32767).astype(np.int16); st[1::2] = (outR * 32767).astype(np.int16)
w = wave.open('public/music.wav', 'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(sr); w.writeframes(st.tobytes()); w.close()
print('audio ok', DUR, 's, peak', round(float(peak), 2))
