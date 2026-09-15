import { deterministicChoice, hashMotionSeed, seededSigned } from './determinism';
import { motionStyle } from './styles';
import type {
  MotionScene,
  MotionSceneGraph,
  MotionSourceScene,
  MotionStyleId
} from './types';

export interface PlanMotionGraphInput {
  projectId: string;
  style: MotionStyleId;
  scenes: MotionSourceScene[];
  seed?: number;
}

export function planMotionGraph(input: PlanMotionGraphInput): MotionSceneGraph {
  const style = motionStyle(input.style);
  const seed = input.seed ?? hashMotionSeed(`${input.projectId}:${input.style}`);
  let cursor = 0;
  const scenes: MotionScene[] = input.scenes.map((scene, index) => {
    const sceneSeed = hashMotionSeed(`${seed}:${scene.id}:${index}`);
    const direction = index % 2 === 0 ? 1 : -1;
    const cameraX = style.camera.xTravel * direction * (0.72 + Math.abs(seededSigned(sceneSeed, 1)) * 0.28);
    const cameraY = style.camera.yTravel * seededSigned(sceneSeed, 2);
    const rotation = style.camera.rotationDegrees * seededSigned(sceneSeed, 3);
    const backgroundDriftX = style.background.drift * direction;
    const backgroundDriftY = style.background.drift * 0.55 * seededSigned(sceneSeed, 4);
    const transitionKind = index === input.scenes.length - 1
      ? undefined
      : deterministicChoice(
          style.brief.transitionLanguage.length > 0
            ? style.brief.transitionLanguage
            : [style.transition],
          sceneSeed,
          5
        );
    const durationSeconds = Math.max(2, scene.durationSeconds);
    const planned: MotionScene = {
      id: `motion-${scene.id}`,
      sourceSceneId: scene.id,
      startSeconds: cursor,
      durationSeconds,
      camera: {
        scaleFrom: 1,
        scaleTo: 1 + style.camera.scaleDelta,
        xFrom: -cameraX * 0.35,
        xTo: cameraX,
        yFrom: -cameraY * 0.3,
        yTo: cameraY,
        rotationFrom: -rotation * 0.2,
        rotationTo: rotation
      },
      background: {
        rotationFrom: -style.background.rotationDegrees * 0.15,
        rotationTo: style.background.rotationDegrees * direction,
        scaleFrom: 1,
        scaleTo: 1 + style.background.scaleDelta,
        offsetXFrom: -backgroundDriftX * 0.25,
        offsetXTo: backgroundDriftX,
        offsetYFrom: -backgroundDriftY * 0.25,
        offsetYTo: backgroundDriftY,
        smoothness: style.background.smoothness
      },
      text: { ...style.text },
      transitionOut: transitionKind
        ? {
            kind: transitionKind as MotionScene['transitionOut'] extends infer T
              ? T extends { kind: infer K }
                ? K
                : never
              : never,
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
    brief: structuredClone(style.brief),
    scenes
  };
}
