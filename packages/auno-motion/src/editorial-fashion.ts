import type { CameraPlan, MotionSourceScene, TextMotionPlan } from './types';

export interface EditorialFashionRefinement {
  camera: CameraPlan;
  text: TextMotionPlan;
  backgroundScaleMultiplier: number;
  backgroundDriftMultiplier: number;
}

const RESTRAINED_INTENTS = new Set(['chart', 'big-number', 'document', 'map']);
const HERO_INTENTS = new Set(['image', 'video', 'b-roll', 'product']);

/**
 * Keeps Editorial Fashion cinematic rather than template-heavy. The function is
 * deterministic and context-only: it never reads layout state, time, or random values.
 */
export function refineEditorialFashion(
  scene: MotionSourceScene,
  index: number,
  camera: CameraPlan,
  text: TextMotionPlan
): EditorialFashionRefinement {
  if (RESTRAINED_INTENTS.has(scene.visualIntent)) {
    return {
      camera: {
        ...camera,
        scaleTo: 1 + (camera.scaleTo - 1) * 0.45,
        xTo: camera.xTo * 0.45,
        yTo: camera.yTo * 0.45,
        rotationTo: camera.rotationTo * 0.25
      },
      text: { ...text, intensity: Math.min(text.intensity, 0.45), staggerFrames: 1 },
      backgroundScaleMultiplier: 0.55,
      backgroundDriftMultiplier: 0.5
    };
  }

  if (scene.visualIntent === 'motion-composition') {
    return {
      camera: {
        ...camera,
        scaleTo: 1 + (camera.scaleTo - 1) * 1.18,
        xTo: camera.xTo * 1.12,
        yTo: camera.yTo * 1.08
      },
      text: { ...text, intensity: Math.min(0.78, text.intensity * 1.06) },
      backgroundScaleMultiplier: 1.12,
      backgroundDriftMultiplier: 1.08
    };
  }

  if (HERO_INTENTS.has(scene.visualIntent)) {
    const alternate = index % 2 === 0 ? 1 : -1;
    return {
      camera: {
        ...camera,
        xFrom: camera.xFrom * 0.7,
        xTo: camera.xTo * 0.78,
        yFrom: camera.yFrom * 0.7,
        yTo: Math.abs(camera.yTo) * 0.65 * alternate,
        rotationFrom: camera.rotationFrom * 0.35,
        rotationTo: camera.rotationTo * 0.35
      },
      text: { ...text, intensity: Math.min(text.intensity, 0.68), staggerFrames: Math.max(1, text.staggerFrames) },
      backgroundScaleMultiplier: 0.9,
      backgroundDriftMultiplier: 0.82
    };
  }

  return {
    camera,
    text,
    backgroundScaleMultiplier: 0.82,
    backgroundDriftMultiplier: 0.78
  };
}
