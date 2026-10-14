import timing from '../timing.json';
export const FPS = timing.fps;
export const SCENES = timing.scenes as unknown as Record<string, [number, number]>;
export const CUES = timing.cues as Record<string, number>;
export const TOTAL = 25 * FPS;
/** Absolute frame of a cue. */
export const cueFrame = (name: string) => Math.round(CUES[name] * FPS);
/** Frame of a cue relative to the start of a scene (for use inside that scene's Sequence). */
export const local = (scene: string, name: string) => cueFrame(name) - SCENES[scene][0] * FPS;
export const sceneRange = (scene: string) => ({from: SCENES[scene][0] * FPS, durationInFrames: (SCENES[scene][1] - SCENES[scene][0]) * FPS});
