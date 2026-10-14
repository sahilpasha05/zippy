import timing from '../timing.json';
export const FPS = timing.fps;
export const SCENES = timing.scenes as unknown as Record<string, [number, number]>;
export const CUES = timing.cues as Record<string, number>;
export const TOTAL = 25 * FPS;
const fr = (s: number) => Math.round(s * FPS);
/** Absolute frame of a cue. */
export const cueFrame = (name: string) => fr(CUES[name]);
/** Frame of a cue relative to the start of a scene (for use inside that scene's Sequence). */
export const local = (scene: string, name: string) => cueFrame(name) - fr(SCENES[scene][0]);
/** Length of a scene in frames. */
export const sceneLen = (scene: string) => fr(SCENES[scene][1]) - fr(SCENES[scene][0]);
export const sceneRange = (scene: string) => ({from: fr(SCENES[scene][0]), durationInFrames: sceneLen(scene)});
