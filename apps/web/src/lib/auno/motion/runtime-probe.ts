import type { Project } from '$lib/video-editor/project/types';
import {
	TimelineFrameRenderer,
	type TimelineFrameRenderOptions
} from '$lib/video-editor/media/render-export';

export interface FramePixelProbe {
	frame: number;
	width: number;
	height: number;
	rgba: Uint8ClampedArray;
}

export interface FramePixelDiff {
	changedPixels: number;
	maxChannelDelta: number;
	ratio: number;
}

function normalizedFrame(frame: number): number {
	return Number.isFinite(frame) ? Math.max(0, Math.round(frame)) : 0;
}

function probeFromImageData(frame: number, image: ImageData): FramePixelProbe {
	return {
		frame: normalizedFrame(frame),
		width: image.width,
		height: image.height,
		rgba: new Uint8ClampedArray(image.data)
	};
}

/** Capture pixels from the interactive preview canvas at one exact authored frame. */
export function captureCanvasProbe(canvas: HTMLCanvasElement, frame: number): FramePixelProbe {
	const context = canvas.getContext('2d', { willReadFrequently: true });
	if (!context) throw new Error('2D preview canvas is unavailable');
	return probeFromImageData(
		frame,
		context.getImageData(0, 0, Math.max(1, canvas.width), Math.max(1, canvas.height))
	);
}

/** Capture pixels from the same full-resolution compositor used immediately before export encoding. */
export function captureOffscreenCanvasProbe(
	canvas: OffscreenCanvas,
	frame: number
): FramePixelProbe {
	const context = canvas.getContext('2d', { willReadFrequently: true });
	if (!context) throw new Error('2D export canvas is unavailable');
	return probeFromImageData(
		frame,
		context.getImageData(0, 0, Math.max(1, canvas.width), Math.max(1, canvas.height))
	);
}

/**
 * Render one frame through TimelineFrameRenderer and read it before VideoSample/codec submission.
 * This is the authoritative export-side probe for deterministic preview/export QA.
 */
export async function captureExportRendererProbe(
	project: Project,
	frame: number,
	options: TimelineFrameRenderOptions = {}
): Promise<FramePixelProbe> {
	const normalized = normalizedFrame(frame);
	const renderer = new TimelineFrameRenderer(project, options);
	try {
		const canvas = await renderer.render(normalized);
		return captureOffscreenCanvasProbe(canvas, normalized);
	} finally {
		renderer.dispose();
	}
}

/** Compare pre-encode frame buffers with an explicit per-channel tolerance. */
export function compareFramePixelProbes(
	left: FramePixelProbe,
	right: FramePixelProbe,
	tolerance = 0
): FramePixelDiff {
	if (left.frame !== right.frame) throw new Error('probe frames do not match');
	if (left.width !== right.width || left.height !== right.height) {
		throw new Error('probe dimensions do not match');
	}
	const expectedLength = left.width * left.height * 4;
	if (left.rgba.length !== expectedLength || right.rgba.length !== expectedLength) {
		throw new Error('probe pixel buffers are invalid');
	}
	const boundedTolerance = Number.isFinite(tolerance)
		? Math.max(0, Math.floor(tolerance))
		: 0;
	let changedPixels = 0;
	let maxChannelDelta = 0;
	for (let offset = 0; offset < expectedLength; offset += 4) {
		let changed = false;
		for (let channel = 0; channel < 4; channel += 1) {
			const delta = Math.abs(left.rgba[offset + channel]! - right.rgba[offset + channel]!);
			maxChannelDelta = Math.max(maxChannelDelta, delta);
			if (delta > boundedTolerance) changed = true;
		}
		if (changed) changedPixels += 1;
	}
	const pixels = left.width * left.height;
	return {
		changedPixels,
		maxChannelDelta,
		ratio: pixels > 0 ? changedPixels / pixels : 0
	};
}
