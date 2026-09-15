import { describe, expect, it } from 'vitest';
import { clamp01, easeInOutCubic, easeOutCubic, steppedEase } from './easing';

describe('deterministic motion easing', () => {
	it('clamps arbitrary progress into the unit interval', () => {
		expect(clamp01(-2)).toBe(0);
		expect(clamp01(0.25)).toBe(0.25);
		expect(clamp01(3)).toBe(1);
	});

	it('uses stable cubic curves with exact endpoints', () => {
		expect(easeOutCubic(0)).toBe(0);
		expect(easeOutCubic(1)).toBe(1);
		expect(easeInOutCubic(0)).toBe(0);
		expect(easeInOutCubic(0.5)).toBe(0.5);
		expect(easeInOutCubic(1)).toBe(1);
	});

	it('quantizes stop-motion progress deterministically', () => {
		expect(steppedEase(0, 4)).toBe(0);
		expect(steppedEase(0.24, 4)).toBe(0);
		expect(steppedEase(0.26, 4)).toBe(0.25);
		expect(steppedEase(0.99, 4)).toBe(0.75);
		expect(steppedEase(1, 4)).toBe(1);
	});

	it('normalizes invalid step counts instead of producing NaN', () => {
		expect(steppedEase(0.6, 0)).toBe(0);
		expect(steppedEase(0.6, Number.NaN)).toBe(0);
	});
});
