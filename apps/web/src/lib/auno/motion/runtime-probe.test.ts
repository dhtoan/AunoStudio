import { describe, expect, it } from 'vitest';
import { compareFramePixelProbes } from './runtime-probe';

describe('compareFramePixelProbes', () => {
	it('reports exact equality for identical pre-encode pixels', () => {
		const rgba = new Uint8ClampedArray([0, 0, 0, 255, 255, 255, 255, 255]);
		const left = { frame: 75, width: 2, height: 1, rgba };
		const right = { frame: 75, width: 2, height: 1, rgba: new Uint8ClampedArray(rgba) };

		expect(compareFramePixelProbes(left, right, 0)).toEqual({
			changedPixels: 0,
			maxChannelDelta: 0,
			ratio: 0
		});
	});

	it('counts a pixel only when at least one channel exceeds tolerance', () => {
		const left = {
			frame: 150,
			width: 2,
			height: 1,
			rgba: new Uint8ClampedArray([10, 20, 30, 255, 100, 110, 120, 255])
		};
		const right = {
			frame: 150,
			width: 2,
			height: 1,
			rgba: new Uint8ClampedArray([11, 19, 30, 255, 104, 110, 120, 255])
		};

		expect(compareFramePixelProbes(left, right, 1)).toEqual({
			changedPixels: 1,
			maxChannelDelta: 4,
			ratio: 0.5
		});
	});

	it('rejects probes from different frames or dimensions', () => {
		const base = {
			frame: 1,
			width: 1,
			height: 1,
			rgba: new Uint8ClampedArray([0, 0, 0, 255])
		};

		expect(() => compareFramePixelProbes(base, { ...base, frame: 2 }, 0)).toThrow(
			'probe frames do not match'
		);
		expect(() => compareFramePixelProbes(base, { ...base, width: 2 }, 0)).toThrow(
			'probe dimensions do not match'
		);
	});
});
