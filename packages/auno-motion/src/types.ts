export const MOTION_SCHEMA_VERSION = 1 as const;

export const MOTION_STYLE_IDS = [
  'editorial-fashion',
  'luxury-product',
  'visual-journalism',
  'white-catalog',
  'continuous-action',
  'cartoon-collage',
  'vintage-sketch',
  'breaking-news',
  'minimal-data'
] as const;

export type MotionStyleId = (typeof MOTION_STYLE_IDS)[number];

export interface StyleBrief {
  palette: string[];
  typography: string;
  cameraLanguage: string;
  motionSignature: string;
  backgroundLanguage: string;
  transitionLanguage: string[];
}

export interface CameraPlan {
  scaleFrom: number;
  scaleTo: number;
  xFrom: number;
  xTo: number;
  yFrom: number;
  yTo: number;
  rotationFrom: number;
  rotationTo: number;
}

export interface BackgroundPlan {
  rotationFrom: number;
  rotationTo: number;
  scaleFrom: number;
  scaleTo: number;
  offsetXFrom: number;
  offsetXTo: number;
  offsetYFrom: number;
  offsetYTo: number;
  smoothness: number;
}

export interface TextMotionPlan {
  inPreset: 'fade-up' | 'rise' | 'cascade' | 'pop' | 'blur-in' | 'slide-mask' | 'wave-in';
  outPreset: 'fade-down' | 'sink' | 'pop-out' | 'blur-out';
  loopPreset?: 'pulse' | 'wave' | 'shimmer' | 'swing';
  intensity: number;
  staggerFrames: number;
}

export interface MotionTransition {
  kind: 'crossfade' | 'depth-push' | 'match-movement' | 'hard-cut' | 'slide';
  durationSeconds: number;
}

export interface MotionScene {
  id: string;
  sourceSceneId: string;
  visualIntent: string;
  startSeconds: number;
  durationSeconds: number;
  camera: CameraPlan;
  background: BackgroundPlan;
  text: TextMotionPlan;
  transitionOut?: MotionTransition;
}

export interface MotionSceneGraph {
  schemaVersion: typeof MOTION_SCHEMA_VERSION;
  style: MotionStyleId;
  seed: number;
  brief: StyleBrief;
  scenes: MotionScene[];
}

export interface MotionSourceScene {
  id: string;
  title: string;
  voice: string;
  visualIntent: string;
  durationSeconds: number;
}
