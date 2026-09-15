import { hashMotionSeed, seededSigned, seededUnit } from './determinism';
import type { CameraPlan, TextMotionPlan } from './types';

export interface PaperMotionSampleInput {
  seed: number;
  elementId: string;
  seconds: number;
  startSeconds: number;
  durationSeconds: number;
  fps: number;
}

export interface PaperMotionSample {
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
  progress: number;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function salt(elementId: string, channel: string): number {
  return hashMotionSeed(`${elementId}:${channel}`);
}

function easeOutCubic(value: number): number {
  const p = 1 - clamp01(value);
  return 1 - p * p * p;
}

function overshoot(value: number): number {
  const p = clamp01(value);
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2);
}

/** Quantize project time to a stop-motion influenced cadence without reading a wall clock. */
export function steppedProgress(
  seconds: number,
  startSeconds: number,
  durationSeconds: number,
  fps: number,
  holdFrames = 2
): number {
  const normalizedFPS = Math.max(1, Math.round(fps));
  const normalizedDuration = Math.max(1 / normalizedFPS, durationSeconds);
  const frame = Math.max(0, Math.floor((seconds - startSeconds) * normalizedFPS));
  const quantizedFrame = Math.floor(frame / Math.max(1, Math.floor(holdFrames))) * Math.max(1, Math.floor(holdFrames));
  return clamp01(quantizedFrame / Math.max(1, Math.round(normalizedDuration * normalizedFPS)));
}

function inputProgress(input: PaperMotionSampleInput, holdFrames = 2): number {
  return steppedProgress(
    input.seconds,
    input.startSeconds,
    input.durationSeconds,
    input.fps,
    holdFrames
  );
}

export function paperSlideAt(input: PaperMotionSampleInput): PaperMotionSample {
  const progress = easeOutCubic(inputProgress(input));
  const direction = seededSigned(input.seed, salt(input.elementId, 'slide-direction')) >= 0 ? 1 : -1;
  const travel = 0.12 + seededUnit(input.seed, salt(input.elementId, 'slide-travel')) * 0.08;
  return {
    x: direction * travel * (1 - progress),
    y: seededSigned(input.seed, salt(input.elementId, 'slide-y')) * 0.015 * (1 - progress),
    scale: 0.985 + progress * 0.015,
    rotation: direction * (2.4 + seededUnit(input.seed, salt(input.elementId, 'slide-rotation')) * 2.2) * (1 - progress),
    opacity: progress,
    progress
  };
}

export function paperDropSettleAt(input: PaperMotionSampleInput): PaperMotionSample {
  const raw = inputProgress(input);
  const settle = overshoot(raw);
  const direction = seededSigned(input.seed, salt(input.elementId, 'drop-rotation'));
  return {
    x: seededSigned(input.seed, salt(input.elementId, 'drop-x')) * 0.01 * (1 - raw),
    y: -0.1 * (1 - easeOutCubic(raw)),
    scale: 0.96 + 0.04 * settle,
    rotation: direction * 3.2 * (1 - raw),
    opacity: clamp01(raw * 1.8),
    progress: raw
  };
}

export function stampHitAt(input: PaperMotionSampleInput): PaperMotionSample {
  const raw = inputProgress(input, 1);
  const hit = raw < 0.45 ? raw / 0.45 : 1;
  const settle = raw < 0.45 ? hit : 1 - (raw - 0.45) * 0.08;
  return {
    x: 0,
    y: -0.02 * (1 - hit),
    scale: 1.18 - 0.18 * clamp01(settle),
    rotation: seededSigned(input.seed, salt(input.elementId, 'stamp-rotation')) * 1.2 * (1 - raw),
    opacity: clamp01(raw * 2.5),
    progress: raw
  };
}

export function pinPopAt(input: PaperMotionSampleInput): PaperMotionSample {
  const raw = inputProgress(input, 1);
  return {
    x: 0,
    y: 0,
    scale: 0.45 + 0.55 * overshoot(raw),
    rotation: seededSigned(input.seed, salt(input.elementId, 'pin-rotation')) * 8 * (1 - raw),
    opacity: clamp01(raw * 2.2),
    progress: raw
  };
}

export function labelStripAt(input: PaperMotionSampleInput): PaperMotionSample {
  return paperSlideAt({ ...input, seed: hashMotionSeed(`${input.seed}:${input.elementId}:label`) });
}

export function stringDrawAt(input: PaperMotionSampleInput): PaperMotionSample {
  const progress = inputProgress(input, 1);
  return { x: 0, y: 0, scale: progress, rotation: 0, opacity: clamp01(progress * 1.5), progress };
}

export function markerUnderlineAt(input: PaperMotionSampleInput): PaperMotionSample {
  return stringDrawAt({ ...input, seed: hashMotionSeed(`${input.seed}:${input.elementId}:underline`) });
}

export function arrowDrawAt(input: PaperMotionSampleInput): PaperMotionSample {
  return stringDrawAt({ ...input, seed: hashMotionSeed(`${input.seed}:${input.elementId}:arrow`) });
}

export function paperCornerLiftAt(input: PaperMotionSampleInput): PaperMotionSample {
  const progress = inputProgress(input, 3);
  const phase = seededUnit(input.seed, salt(input.elementId, 'corner-phase')) * Math.PI * 2;
  const life = Math.sin(progress * Math.PI * 2 + phase);
  return { x: 0, y: -life * 0.003, scale: 1, rotation: life * 0.18, opacity: 1, progress };
}

export function shadowBreatheAt(input: PaperMotionSampleInput): PaperMotionSample {
  const progress = inputProgress(input, 3);
  const phase = seededUnit(input.seed, salt(input.elementId, 'shadow-phase')) * Math.PI * 2;
  const life = Math.sin(progress * Math.PI * 2 + phase);
  return { x: life * 0.002, y: life * 0.002, scale: 1 + life * 0.003, rotation: 0, opacity: 0.92 + life * 0.04, progress };
}

export function halftoneFlickerAt(input: PaperMotionSampleInput): PaperMotionSample {
  const progress = inputProgress(input, 2);
  const frame = Math.floor(progress * 17);
  const opacity = 0.94 + seededUnit(input.seed, salt(input.elementId, `halftone:${frame}`)) * 0.06;
  return { x: 0, y: 0, scale: 1, rotation: 0, opacity, progress };
}

/** Vox refinement keeps the scene camera nearly locked so motion comes from paper elements. */
export function refineDocumentaryPaperCollage(
  camera: CameraPlan,
  text: TextMotionPlan
): { camera: CameraPlan; text: TextMotionPlan; backgroundScaleMultiplier: number; backgroundDriftMultiplier: number } {
  return {
    camera: {
      scaleFrom: 1,
      scaleTo: Math.min(1.006, Math.max(1, camera.scaleTo)),
      xFrom: Math.max(-0.002, Math.min(0.002, camera.xFrom)),
      xTo: Math.max(-0.003, Math.min(0.003, camera.xTo)),
      yFrom: Math.max(-0.002, Math.min(0.002, camera.yFrom)),
      yTo: Math.max(-0.003, Math.min(0.003, camera.yTo)),
      rotationFrom: Math.max(-0.03, Math.min(0.03, camera.rotationFrom)),
      rotationTo: Math.max(-0.08, Math.min(0.08, camera.rotationTo))
    },
    text: { ...text, intensity: Math.min(0.48, text.intensity) },
    backgroundScaleMultiplier: 0.35,
    backgroundDriftMultiplier: 0.3
  };
}
