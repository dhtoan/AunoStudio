import { motionStyle } from './styles';
import type { MotionStyleId, StyleBrief } from './types';

export interface CreateStyleBriefInput {
  style: MotionStyleId;
  brandPalette?: string[];
  minimumTransitionFamilies?: number;
  sceneCount?: number;
}

function normalizeHex(value: string): string | null {
  const trimmed = value.trim();
  if (!/^#[0-9a-f]{6}$/i.test(trimmed)) return null;
  return trimmed.toUpperCase();
}

function unique<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

export function createStyleBrief(input: CreateStyleBriefInput): StyleBrief {
  const definition = motionStyle(input.style);
  const brandPalette = unique(
    (input.brandPalette ?? [])
      .map(normalizeHex)
      .filter((value): value is string => Boolean(value))
  );
  const palette = brandPalette.length >= 2 ? brandPalette : [...definition.brief.palette];
  const requestedFamilies = Math.max(
    input.sceneCount && input.sceneCount >= 4 ? 2 : 1,
    input.minimumTransitionFamilies ?? 1
  );
  const styleFamilies = unique([
    ...definition.brief.transitionLanguage,
    definition.transition,
    'crossfade'
  ]);
  const transitionLanguage = styleFamilies.slice(0, Math.max(1, requestedFamilies));

  return {
    palette,
    typography: definition.brief.typography,
    cameraLanguage: definition.brief.cameraLanguage,
    motionSignature: definition.brief.motionSignature,
    backgroundLanguage: definition.brief.backgroundLanguage,
    transitionLanguage
  };
}
