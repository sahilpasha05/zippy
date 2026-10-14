"""Neural voice-over (Kokoro via sherpa-onnx) placed on the cues in timing.json.
Model: kokoro-en-v0_19 (download: github.com/k2-fsa/sherpa-onnx/releases/tag/tts-models). Writes public/voice.wav + src/voice.json (windows used to duck the music).
Usage: KOKORO_DIR=/path/to/kokoro-en-v0_19 python3 scripts/make-voice.py [speaker_id]"""
import json, os, sys, wave
import numpy as np
import sherpa_onnx
from scipy import signal

T = json.load(open('timing.json')); C = T['cues']
M = os.environ.get('KOKORO_DIR', '/tmp/claude-0/tts/kokoro-en-v0_19') + '/'
SID = int(sys.argv[1]) if len(sys.argv) > 1 else 5      # 5 = am_adam (deep male). Try 10 bm_lewis, 9 bm_george, 3 af_sarah ...
cfg = sherpa_onnx.OfflineTtsConfig(model=sherpa_onnx.OfflineTtsModelConfig(vits=sherpa_onnx.OfflineTtsVitsModelConfig(), kokoro=sherpa_onnx.OfflineTtsKokoroModelConfig(model=M + 'model.onnx', voices=M + 'voices.bin', tokens=M + 'tokens.txt', data_dir=M + 'espeak-ng-data'), num_threads=4))
tts = sherpa_onnx.OfflineTts(cfg)
SR = 44100; n = 25 * SR
# (cue, text, latest end in seconds, speed range, gain)
LINES = [
 ('kadur', 'Kadur.', 1.95, (0.85, 1.0), 1.0), ('ready', 'Are you ready?', 2.95, (0.9, 1.1), 1.0),
 ('food', 'Your favourite food.', 4.9, (0.95, 1.15), 1.0), ('groceries', 'Your daily groceries.', 8.9, (0.95, 1.15), 1.0),
 ('comingTo', 'Zippy is coming to...', 11.6, (0.85, 1.1), 1.0), ('kadurHit', 'Kadur!', 13.6, (0.7, 0.85), 1.25),
 ('foodYouLove', 'Food you love.', 17.45, (0.95, 1.2), 1.0), ('groceriesYouNeed', 'Groceries you need.', 18.45, (0.95, 1.2), 1.0),
 ('getReady', 'Kadur, get ready!', 19.45, (0.95, 1.2), 1.05), ('comingSoon', 'Zippy is coming soon!', 20.9, (0.95, 1.2), 1.05),
 ('something', 'Something exciting is on its way.', 22.6, (1.0, 1.3), 1.0), ('stayTuned', 'Stay tuned, Kadur!', 24.5, (0.9, 1.1), 1.05),
]
def hp(x, f): return signal.sosfilt(signal.butter(2, f, 'high', fs=SR, output='sos'), x)
bus = np.zeros(n); wet = np.zeros(n); windows = []
for cue, text, end, (lo, hi), g in LINES:
    t0 = C[cue] + 0.02; speed = lo
    while True:
        a = tts.generate(text, sid=SID, speed=speed); x = np.array(a.samples, dtype=np.float64)
        d = len(x) / a.sample_rate
        if t0 + d <= end or speed >= hi: break
        speed = min(hi, speed + 0.05)
    x = signal.resample_poly(x, SR, a.sample_rate)
    x = np.trim_zeros(x, 'fb') if np.abs(x).max() > 0 else x
    x = hp(x, 90); x = np.tanh(x * 2.2 / max(np.abs(x).max(), 1e-6)) / np.tanh(2.2) * 0.9 * g   # gentle compression/loudness
    f = int(0.012 * SR); x[:f] *= np.linspace(0, 1, f); x[-f:] *= np.linspace(1, 0, f)
    s = int(t0 * SR); e = min(n, s + len(x)); bus[s:e] += x[: e - s]; wet[s:e] += x[: e - s] * (0.35 if cue == 'kadurHit' else 0.14)
    windows.append({'cue': cue, 'text': text, 'start': round(t0, 3), 'end': round(t0 + len(x) / SR, 3), 'speed': round(speed, 2)})
    print(f"{cue:18s} {t0:6.2f} -> {t0 + len(x) / SR:6.2f}  (limit {end})  speed {speed:.2f}  '{text}'" + ('  !! OVER LIMIT' if t0 + len(x) / SR > end + 0.02 else ''))
t = np.arange(int(1.1 * SR)) / SR; ir = hp(np.random.default_rng(3).standard_normal(len(t)), 250) * np.exp(-t * 4); ir /= np.sqrt((ir ** 2).sum())
out = bus + signal.fftconvolve(wet, ir)[:n]
out = out / np.abs(out).max() * 0.85
st = np.empty(n * 2, dtype=np.int16); st[0::2] = st[1::2] = (out * 32767).astype(np.int16)
w = wave.open('public/voice.wav', 'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(st.tobytes()); w.close()
json.dump({'windows': windows}, open('src/voice.json', 'w'), indent=1); print('voice ok')
