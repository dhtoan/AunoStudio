import { deterministicChoice, hashMotionSeed, seededSigned } from './determinism';
import { refineEditorialFashion } from './editorial-fashion';
import { createStyleBrief } from './style-brief';
import { motionStyle } from './styles';
import type {
  MotionScene,
  MotionSceneGraph,
  MotionSourceScene,
  MotionStyleCustomization,
  MotionStyleId,
  MotionTransition,
  MotionTransitionKind,
  StyleBrief
} from './types';

export interface PlanMotionGraphInput {
  projectId: string;
  style: MotionStyleId;
  scenes: MotionSourceScene[];
  seed?: number;
  brandPalette?: string[];
  customization?: MotionStyleCustomization;
}

const TRANSITION_KINDS: readonly MotionTransitionKind[] = [
  'crossfade',
  'depth-push',
  'match-movement',
  'hard-cut',
  'slide'
];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizedIntensity(value: number | undefined, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return clamp(value as number, 0, 1);
}

function normalizeCustomization(
  base: StyleBrief,
  customization: MotionStyleCustomization | undefined,
  sceneCount: number
): { brief: StyleBrief; motionIntensity: number | undefined } {
  if (!customization) return { brief: base, motionIntensity: undefined };
  const cameraLanguage = customization.cameraLanguage?.trim();
  const backgroundLanguage = customization.backgroundLanguage?.trim();
  const transitionLanguage = (customization.transitionLanguage ?? []).filter((kind) =>
    TRANSITION_KINDS.includes(kind)
  );
  const palette = createStyleBrief({
    style: 'editorial-fashion',
    brandPalette: customization.palette,
    sceneCount
  }).palette;
  return {
    brief: {
      ...base,
      ...(customization.palette?.length ? { palette } : {}),
      ...(cameraLanguage ? { cameraLanguage } : {}),
      ...(backgroundLanguage ? { backgroundLanguage } : {}),
      ...(transitionLanguage.length ? { transitionLanguage: [...new Set(transitionLanguage)] } : {})
    },
    motionIntensity: customization.motionIntensity
  };
}

export function planMotionGraph(input: PlanMotionGraphInput): MotionSceneGraph {
  const style = motionStyle(input.style);
  const baseBrief = createStyleBrief({
    style: input.style,
    brandPalette: input.brandPalette,
    sceneCount: input.scenes.length
  });
  const customized = normalizeCustomization(baseBrief, input.customization, input.scenes.length);
  const brief = customized.brief;
  const userIntensity = normalizedIntensity(customized.motionIntensity, style.text.intensity);
  const intensityRatio = clamp(userIntensity / Math.max(0.05, style.text.intensity), 0, 1.75);
  const seed = input.seed ?? hashMotionSeed(`${input.projectId}:${input.style}`);
  let cursor = 0;
  const scenes: MotionScene[] = input.scenes.map((scene, index) => {
    const sceneSeed = hashMotionSeed(`${seed}:${scene.id}:${index}`);
    const direction = index % 2 === 0 ? 1 : -1;
    const cameraX =
      style.camera.xTravel * intensityRatio * direction *
      (0.72 + Math.abs(seededSigned(sceneSeed, 1)) * 0.28);
    const cameraY = style.camera.yTravel * intensityRatio * seededSigned(sceneSeed, 2);
    const rotation = style.camera.rotationDegrees * intensityRatio * seededSigned(sceneSeed, 3);
    const backgroundDriftX = style.background.drift * intensityRatio * direction;
    const backgroundDriftY = style.background.drift * intensityRatio * 0.55 * seededSigned(sceneSeed, 4);
    const transitionKind: MotionTransition['kind'] | undefined =
      index === input.scenes.length - 1
        ? undefined
        : (deterministicChoice(
            brief.transitionLanguage.length > 0 ? brief.transitionLanguage : [style.transition],
            sceneSeed,
            5
          ) as MotionTransition['kind']);
    const durationSeconds = Math.max(2, scene.durationSeconds);
    const baseCamera = {
      scaleFrom: 1,
      scaleTo: 1 + style.camera.scaleDelta * intensityRatio,
      xFrom: -cameraX * 0.35,
      xTo: cameraX,
      yFrom: -cameraY * 0.3,
      yTo: cameraY,
      rotationFrom: -rotation * 0.2,
      rotationTo: rotation
    };
    const refinement = input.style === 'editorial-fashion'
      ? refineEditorialFashion(scene, index, baseCamera, {
          ...style.text,
          intensity: userIntensity
        })
      : {
          camera: baseCamera,
          text: { ...style.text, intensity: userIntensity },
          backgroundScaleMultiplier: 1,
          backgroundDriftMultiplier: 1
        };
    const planned: MotionScene = {
      id: `motion-${scene.id}`,
      sourceSceneId: scene.id,
      visualIntent: scene.visualIntent,
      startSeconds: cursor,
      durationSeconds,
      camera: refinement.camera,
      background: {
        rotationFrom: -style.background.rotationDegrees * 0.15 * intensityRatio,
        rotationTo: style.background.rotationDegrees * direction * intensityRatio,
        scaleFrom: 1,
        scaleTo: 1 + style.background.scaleDelta * intensityRatio * refinement.backgroundScaleMultiplier,
        offsetXFrom: -backgroundDriftX * 0.25 * refinement.backgroundDriftMultiplier,
        offsetXTo: backgroundDriftX * refinement.backgroundDriftMultiplier,
        offsetYFrom: -backgroundDriftY * 0.25 * refinement.backgroundDriftMultiplier,
        offsetYTo: backgroundDriftY * refinement.backgroundDriftMultiplier,
        smoothness: style.background.smoothness
      },
      text: refinement.text,
      transitionOut: transitionKind
        ? {
            kind: transitionKind,
            durationSeconds: Math.min(0.55, Math.max(0.18, durationSeconds * 0.08))
          }
        : undefined
    };
    cursor += durationSeconds;
    return planned;
  });

  return {
    schemaVersion: 1,
    style: input.style,
    seed,
    brief,
    scenes
  };
}
