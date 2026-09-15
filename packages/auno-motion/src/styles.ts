import type { MotionStyleId, StyleBrief, TextMotionPlan } from './types';

export interface MotionStyleDefinition {
  id: MotionStyleId;
  label: string;
  brief: StyleBrief;
  text: TextMotionPlan;
  camera: {
    scaleDelta: number;
    xTravel: number;
    yTravel: number;
    rotationDegrees: number;
  };
  background: {
    scaleDelta: number;
    rotationDegrees: number;
    drift: number;
    smoothness: number;
  };
  transition: 'crossfade' | 'depth-push' | 'match-movement' | 'hard-cut' | 'slide';
}

export const MOTION_STYLES: Record<MotionStyleId, MotionStyleDefinition> = {
  'editorial-fashion': {
    id: 'editorial-fashion',
    label: 'Editorial Fashion',
    brief: {
      palette: ['#F3E8D8', '#191919', '#B8895A'],
      typography: 'editorial-serif-clean-sans',
      cameraLanguage: 'slow-push-lateral-glide',
      motionSignature: 'fabric-flow',
      backgroundLanguage: 'layered-soft-gradient',
      transitionLanguage: ['match-movement', 'depth-push']
    },
    text: { inPreset: 'rise', outPreset: 'fade-down', loopPreset: 'shimmer', intensity: 0.7, staggerFrames: 2 },
    camera: { scaleDelta: 0.055, xTravel: 0.018, yTravel: 0.012, rotationDegrees: 0.45 },
    background: { scaleDelta: 0.07, rotationDegrees: 7, drift: 0.045, smoothness: 0.68 },
    transition: 'match-movement'
  },
  'luxury-product': {
    id: 'luxury-product',
    label: 'Luxury Product',
    brief: {
      palette: ['#0C0C0C', '#F4EFE7', '#C5A572'],
      typography: 'high-contrast-serif-minimal-sans',
      cameraLanguage: 'measured-push-premium-hold',
      motionSignature: 'controlled-reveal',
      backgroundLanguage: 'dark-depth-glow',
      transitionLanguage: ['depth-push', 'crossfade']
    },
    text: { inPreset: 'blur-in', outPreset: 'blur-out', intensity: 0.55, staggerFrames: 1 },
    camera: { scaleDelta: 0.04, xTravel: 0.008, yTravel: 0.008, rotationDegrees: 0.2 },
    background: { scaleDelta: 0.05, rotationDegrees: 4, drift: 0.025, smoothness: 0.76 },
    transition: 'depth-push'
  },
  'visual-journalism': {
    id: 'visual-journalism',
    label: 'Visual Journalism',
    brief: {
      palette: ['#F3F1EB', '#111827', '#C92A2A'],
      typography: 'news-grotesk-data-mono',
      cameraLanguage: 'fact-led-reframe',
      motionSignature: 'evidence-first',
      backgroundLanguage: 'paper-grid-data-layer',
      transitionLanguage: ['hard-cut', 'slide']
    },
    text: { inPreset: 'slide-mask', outPreset: 'fade-down', intensity: 0.8, staggerFrames: 1 },
    camera: { scaleDelta: 0.025, xTravel: 0.025, yTravel: 0.01, rotationDegrees: 0.15 },
    background: { scaleDelta: 0.03, rotationDegrees: 2, drift: 0.018, smoothness: 0.42 },
    transition: 'slide'
  },
  'white-catalog': {
    id: 'white-catalog',
    label: 'White Catalog',
    brief: {
      palette: ['#FFFFFF', '#111111', '#D9D9D9'],
      typography: 'clean-sans-catalog',
      cameraLanguage: 'static-product-micro-push',
      motionSignature: 'precise-catalog',
      backgroundLanguage: 'white-studio',
      transitionLanguage: ['crossfade']
    },
    text: { inPreset: 'fade-up', outPreset: 'fade-down', intensity: 0.35, staggerFrames: 1 },
    camera: { scaleDelta: 0.018, xTravel: 0.006, yTravel: 0.006, rotationDegrees: 0 },
    background: { scaleDelta: 0.015, rotationDegrees: 0, drift: 0.008, smoothness: 0.9 },
    transition: 'crossfade'
  },
  'continuous-action': {
    id: 'continuous-action',
    label: 'Continuous Action',
    brief: {
      palette: ['#131313', '#F6F0E6', '#F97316'],
      typography: 'bold-condensed-action',
      cameraLanguage: 'continuous-directional-travel',
      motionSignature: 'carry-momentum',
      backgroundLanguage: 'directional-depth',
      transitionLanguage: ['match-movement']
    },
    text: { inPreset: 'wave-in', outPreset: 'sink', loopPreset: 'swing', intensity: 0.9, staggerFrames: 1 },
    camera: { scaleDelta: 0.065, xTravel: 0.04, yTravel: 0.018, rotationDegrees: 0.8 },
    background: { scaleDelta: 0.08, rotationDegrees: 10, drift: 0.055, smoothness: 0.56 },
    transition: 'match-movement'
  },
  'cartoon-collage': {
    id: 'cartoon-collage',
    label: 'Cartoon Collage',
    brief: {
      palette: ['#FFE56B', '#FF6B6B', '#4D96FF', '#1E1E1E'],
      typography: 'playful-heavy-mixed',
      cameraLanguage: 'snap-pan-pop',
      motionSignature: 'cutout-bounce',
      backgroundLanguage: 'paper-cutout-layering',
      transitionLanguage: ['slide', 'hard-cut']
    },
    text: { inPreset: 'pop', outPreset: 'pop-out', loopPreset: 'pulse', intensity: 1, staggerFrames: 2 },
    camera: { scaleDelta: 0.075, xTravel: 0.035, yTravel: 0.035, rotationDegrees: 1.5 },
    background: { scaleDelta: 0.075, rotationDegrees: 12, drift: 0.06, smoothness: 0.34 },
    transition: 'slide'
  },
  'vintage-sketch': {
    id: 'vintage-sketch',
    label: 'Vintage Sketch',
    brief: {
      palette: ['#E8DDC7', '#413A32', '#9C7651'],
      typography: 'vintage-serif-hand-note',
      cameraLanguage: 'slow-document-drift',
      motionSignature: 'drawn-reveal',
      backgroundLanguage: 'aged-paper',
      transitionLanguage: ['crossfade']
    },
    text: { inPreset: 'cascade', outPreset: 'fade-down', intensity: 0.5, staggerFrames: 2 },
    camera: { scaleDelta: 0.028, xTravel: 0.012, yTravel: 0.015, rotationDegrees: 0.5 },
    background: { scaleDelta: 0.03, rotationDegrees: 3, drift: 0.02, smoothness: 0.62 },
    transition: 'crossfade'
  },
  'breaking-news': {
    id: 'breaking-news',
    label: 'Breaking News',
    brief: {
      palette: ['#B91C1C', '#FFFFFF', '#111827'],
      typography: 'broadcast-bold-condensed',
      cameraLanguage: 'urgent-push-cut',
      motionSignature: 'headline-impact',
      backgroundLanguage: 'broadcast-red-depth',
      transitionLanguage: ['hard-cut', 'slide']
    },
    text: { inPreset: 'slide-mask', outPreset: 'fade-down', loopPreset: 'pulse', intensity: 0.95, staggerFrames: 0 },
    camera: { scaleDelta: 0.05, xTravel: 0.025, yTravel: 0.012, rotationDegrees: 0.25 },
    background: { scaleDelta: 0.055, rotationDegrees: 5, drift: 0.03, smoothness: 0.48 },
    transition: 'hard-cut'
  },
  'minimal-data': {
    id: 'minimal-data',
    label: 'Minimal Data',
    brief: {
      palette: ['#F8FAFC', '#0F172A', '#2563EB'],
      typography: 'clean-grotesk-tabular',
      cameraLanguage: 'restrained-static-reframe',
      motionSignature: 'data-emphasis',
      backgroundLanguage: 'clean-grid',
      transitionLanguage: ['crossfade', 'slide']
    },
    text: { inPreset: 'fade-up', outPreset: 'fade-down', intensity: 0.45, staggerFrames: 1 },
    camera: { scaleDelta: 0.018, xTravel: 0.012, yTravel: 0.008, rotationDegrees: 0 },
    background: { scaleDelta: 0.02, rotationDegrees: 1, drift: 0.012, smoothness: 0.82 },
    transition: 'crossfade'
  }
};

export function motionStyle(id: MotionStyleId): MotionStyleDefinition {
  return MOTION_STYLES[id];
}
