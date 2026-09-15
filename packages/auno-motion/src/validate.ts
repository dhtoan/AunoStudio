import type { MotionScene, MotionSceneGraph } from './types';

export type MotionValidationSeverity = 'warning' | 'error';

export type MotionValidationIssueCode =
  | 'motion.no_visual_throughline'
  | 'motion.camera_repetition'
  | 'motion.transition_variety'
  | 'motion.no_motion_window'
  | 'motion.invalid_scene_timing';

export interface MotionValidationIssue {
  code: MotionValidationIssueCode;
  severity: MotionValidationSeverity;
  sceneId?: string;
  message: string;
}

function hasCameraMovement(scene: MotionScene): boolean {
  const camera = scene.camera;
  return (
    Math.abs(camera.scaleTo - camera.scaleFrom) > 0.0001 ||
    Math.abs(camera.xTo - camera.xFrom) > 0.0001 ||
    Math.abs(camera.yTo - camera.yFrom) > 0.0001 ||
    Math.abs(camera.rotationTo - camera.rotationFrom) > 0.0001
  );
}

function cameraSignature(scene: MotionScene): string {
  const camera = scene.camera;
  return [
    Math.sign(camera.scaleTo - camera.scaleFrom),
    Math.sign(camera.xTo - camera.xFrom),
    Math.sign(camera.yTo - camera.yFrom),
    Math.sign(camera.rotationTo - camera.rotationFrom)
  ].join(':');
}

export function validateMotionGraph(graph: MotionSceneGraph): MotionValidationIssue[] {
  const issues: MotionValidationIssue[] = [];
  let cursor = 0;

  graph.scenes.forEach((scene) => {
    if (
      !Number.isFinite(scene.startSeconds) ||
      !Number.isFinite(scene.durationSeconds) ||
      scene.startSeconds < 0 ||
      scene.durationSeconds <= 0 ||
      scene.startSeconds + 0.0001 < cursor
    ) {
      issues.push({
        code: 'motion.invalid_scene_timing',
        severity: 'error',
        sceneId: scene.id,
        message: 'Scene timing must be finite, positive, ordered, and non-overlapping.'
      });
    }
    cursor = Math.max(cursor, scene.startSeconds + Math.max(0, scene.durationSeconds));

    if (scene.durationSeconds >= 1 && !hasCameraMovement(scene)) {
      issues.push({
        code: 'motion.no_motion_window',
        severity: 'warning',
        sceneId: scene.id,
        message: 'Scene has no authored camera movement for a one-second-or-longer window.'
      });
    }
  });

  if (graph.scenes.length >= 3) {
    const adjacentThroughline = graph.scenes.some((scene, index) => {
      const next = graph.scenes[index + 1];
      return Boolean(next && scene.visualIntent && scene.visualIntent === next.visualIntent);
    });
    if (!adjacentThroughline) {
      issues.push({
        code: 'motion.no_visual_throughline',
        severity: 'warning',
        message: 'No adjacent scenes share a visual intent, so the project may feel like disconnected slides.'
      });
    }
  }

  for (let index = 0; index <= graph.scenes.length - 3; index += 1) {
    const signatures = graph.scenes.slice(index, index + 3).map(cameraSignature);
    if (signatures[0] === signatures[1] && signatures[1] === signatures[2]) {
      issues.push({
        code: 'motion.camera_repetition',
        severity: 'warning',
        sceneId: graph.scenes[index + 2]?.id,
        message: 'Three consecutive scenes repeat the same camera movement pattern.'
      });
    }
  }

  const transitions = graph.scenes
    .map((scene) => scene.transitionOut?.kind)
    .filter((kind): kind is NonNullable<MotionScene['transitionOut']>['kind'] => Boolean(kind));
  if (transitions.length >= 4 && new Set(transitions).size < 2) {
    issues.push({
      code: 'motion.transition_variety',
      severity: 'warning',
      message: 'Projects with four or more transitions should use at least two transition families.'
    });
  }

  return issues;
}
