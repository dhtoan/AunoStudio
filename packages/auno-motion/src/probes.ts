import type { MotionSceneGraph } from './types';

export interface MotionFrameProbe {
  id: string;
  sceneId: string;
  frame: number;
  seconds: number;
  position: 'start' | 'quarter' | 'middle' | 'three-quarter' | 'end';
}

export interface MotionProbePlan {
  schemaVersion: 1;
  fps: number;
  totalFrames: number;
  /** Five stable whole-project frames shared by preview/export QA. */
  projectFrames: number[];
  /** Scene-local probes used to diagnose scene-specific regressions. */
  probes: MotionFrameProbe[];
}

const POSITIONS = [
  ['start', 0],
  ['quarter', 0.25],
  ['middle', 0.5],
  ['three-quarter', 0.75],
  ['end', 1]
] as const;

/** Stable 0/25/50/75/last-frame probe set for any project length. */
export function frameProbeFrames(totalFrames: number): number[] {
  const total = Math.max(1, Math.floor(totalFrames));
  const last = total - 1;
  return [
    0,
    Math.min(last, Math.round(total * 0.25)),
    Math.min(last, Math.round(total * 0.5)),
    Math.min(last, Math.round(total * 0.75)),
    last
  ].filter((frame, index, frames) => index === 0 || frame !== frames[index - 1]);
}

function boundedFrame(seconds: number, fps: number, totalFrames: number): number {
  const frame = Math.round(seconds * fps);
  return Math.max(0, Math.min(Math.max(0, totalFrames - 1), frame));
}

/**
 * Builds stable visual probe frames from authored project time only.
 * Preview and export can consume the same plan; no wall clock or random state is read.
 */
export function createMotionProbePlan(graph: MotionSceneGraph, fps: number): MotionProbePlan {
  const normalizedFps = Math.max(1, Math.round(fps));
  const projectDuration = graph.scenes.reduce(
    (max, scene) => Math.max(max, scene.startSeconds + scene.durationSeconds),
    0
  );
  const totalFrames = Math.max(1, Math.ceil(projectDuration * normalizedFps));
  const seen = new Set<number>();
  const probes: MotionFrameProbe[] = [];

  for (const scene of graph.scenes) {
    for (const [position, progress] of POSITIONS) {
      const seconds = scene.startSeconds + scene.durationSeconds * progress;
      const frame = boundedFrame(seconds, normalizedFps, totalFrames);
      // Adjacent scene end/start probes can point to the same frame. Keep one stable owner.
      if (seen.has(frame)) continue;
      seen.add(frame);
      probes.push({
        id: `motion-probe:${scene.sourceSceneId}:${position}:${frame}`,
        sceneId: scene.sourceSceneId,
        frame,
        seconds: frame / normalizedFps,
        position
      });
    }
  }

  probes.sort((left, right) => left.frame - right.frame || left.id.localeCompare(right.id));
  return {
    schemaVersion: 1,
    fps: normalizedFps,
    totalFrames,
    projectFrames: frameProbeFrames(totalFrames),
    probes
  };
}

/** Small serializable signature for comparing preview/export probe plans. */
export function motionProbeSignature(plan: MotionProbePlan): string {
  return [
    plan.schemaVersion,
    plan.fps,
    plan.totalFrames,
    `project:${plan.projectFrames.join(',')}`,
    ...plan.probes.map((probe) => `${probe.sceneId}:${probe.frame}:${probe.position}`)
  ].join('|');
}
