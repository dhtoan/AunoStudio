import { describe, expect, it } from 'vitest';
import { MOTION_STYLES } from './styles';
import {
  paperDropSettleAt,
  paperSlideAt,
  stampHitAt,
  steppedProgress
} from './documentary-paper-collage';

describe('documentary paper collage style', () => {
  it('is the tenth Auno Motion Style with a restrained camera', () => {
    expect(Object.keys(MOTION_STYLES)).toHaveLength(10);
    const style = MOTION_STYLES['documentary-paper-collage'];
    expect(style.label).toBe('Vox Style');
    expect(style.camera.xTravel).toBeLessThanOrEqual(0.004);
    expect(style.camera.yTravel).toBeLessThanOrEqual(0.004);
    expect(style.camera.rotationDegrees).toBeLessThanOrEqual(0.1);
    expect(style.brief.transitionLanguage.every((kind) => ['hard-cut', 'crossfade'].includes(kind))).toBe(true);
  });

  it('quantizes authored time to a stable stepped cadence', () => {
    expect(steppedProgress(0.41, 0, 1, 30, 2)).toBe(steppedProgress(0.42, 0, 1, 30, 2));
    expect(steppedProgress(0, 0, 1, 30, 2)).toBe(0);
    expect(steppedProgress(2, 0, 1, 30, 2)).toBe(1);
  });

  it('returns identical primitive samples regardless of call order', () => {
    const firstSlide = paperSlideAt({ seed: 42, elementId: 'document', seconds: 0.75, startSeconds: 0, durationSeconds: 2.5, fps: 30 });
    void stampHitAt({ seed: 99, elementId: 'stamp', seconds: 0.75, startSeconds: 0, durationSeconds: 2.5, fps: 30 });
    const secondSlide = paperSlideAt({ seed: 42, elementId: 'document', seconds: 0.75, startSeconds: 0, durationSeconds: 2.5, fps: 30 });
    expect(secondSlide).toEqual(firstSlide);

    const firstDrop = paperDropSettleAt({ seed: 7, elementId: 'photo', seconds: 1.25, startSeconds: 0, durationSeconds: 2.5, fps: 30 });
    const secondDrop = paperDropSettleAt({ seed: 7, elementId: 'photo', seconds: 1.25, startSeconds: 0, durationSeconds: 2.5, fps: 30 });
    expect(secondDrop).toEqual(firstDrop);
  });
});
