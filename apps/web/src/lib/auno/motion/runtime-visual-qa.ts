import type { AutoVideoVisualIssue } from '$lib/auno/auto-video/types';

export interface RuntimeStageBounds {
	x: number;
	y: number;
	width: number;
	height: number;
}

export interface RuntimeTextRect {
	itemId: string;
	left: number;
	right: number;
	top: number;
	bottom: number;
	sizeClass?: 'normal' | 'large';
}

export interface RuntimeContrastSample {
	itemId: string;
	foreground: string;
	background: string;
	sizeClass: 'normal' | 'large';
}

export interface RuntimeAssetMeasurement {
	itemId: string;
	status: 'ready' | 'loading' | 'missing' | 'error';
	required?: boolean;
}

export interface RuntimeVisualMeasurement {
	sceneId: string;
	stage: RuntimeStageBounds;
	visibleItems: readonly string[];
	requiredSubjectIds: readonly string[];
	textRects: readonly RuntimeTextRect[];
	assets: readonly RuntimeAssetMeasurement[];
	contrastSamples?: readonly RuntimeContrastSample[];
}

function rectArea(rect: RuntimeTextRect): number {
	return Math.max(0, rect.right - rect.left) * Math.max(0, rect.bottom - rect.top);
}

function overlapRatio(left: RuntimeTextRect, right: RuntimeTextRect): number {
	const width = Math.max(0, Math.min(left.right, right.right) - Math.max(left.left, right.left));
	const height = Math.max(0, Math.min(left.bottom, right.bottom) - Math.max(left.top, right.top));
	const intersection = width * height;
	if (intersection <= 0) return 0;
	return intersection / Math.max(1, Math.min(rectArea(left), rectArea(right)));
}

function parseHexColor(value: string): [number, number, number] | null {
	const normalized = value.trim();
	const short = /^#([0-9a-f]{3})$/i.exec(normalized)?.[1];
	if (short) {
		return short.split('').map((channel) => Number.parseInt(channel + channel, 16)) as [number, number, number];
	}
	const full = /^#([0-9a-f]{6})$/i.exec(normalized)?.[1];
	if (!full) return null;
	return [
		Number.parseInt(full.slice(0, 2), 16),
		Number.parseInt(full.slice(2, 4), 16),
		Number.parseInt(full.slice(4, 6), 16)
	];
}

function linearChannel(channel: number): number {
	const normalized = channel / 255;
	return normalized <= 0.04045
		? normalized / 12.92
		: Math.pow((normalized + 0.055) / 1.055, 2.4);
}

function luminance(color: [number, number, number]): number {
	return (
		0.2126 * linearChannel(color[0]) +
		0.7152 * linearChannel(color[1]) +
		0.0722 * linearChannel(color[2])
	);
}

function contrastRatio(foreground: string, background: string): number | null {
	const foregroundRGB = parseHexColor(foreground);
	const backgroundRGB = parseHexColor(background);
	if (!foregroundRGB || !backgroundRGB) return null;
	const foregroundLuminance = luminance(foregroundRGB);
	const backgroundLuminance = luminance(backgroundRGB);
	const lighter = Math.max(foregroundLuminance, backgroundLuminance);
	const darker = Math.min(foregroundLuminance, backgroundLuminance);
	return (lighter + 0.05) / (darker + 0.05);
}

function textOutsideSafeArea(rect: RuntimeTextRect, stage: RuntimeStageBounds): boolean {
	const safeX = stage.width * 0.05;
	const safeY = stage.height * 0.05;
	const left = stage.x + safeX;
	const right = stage.x + stage.width - safeX;
	const top = stage.y + safeY;
	const bottom = stage.y + stage.height - safeY;
	return rect.left < left || rect.right > right || rect.top < top || rect.bottom > bottom;
}

/**
 * Runtime QA only reports facts supplied by the renderer/DOM measurement layer.
 * It intentionally does not infer subjective quality from screenshots.
 */
export function measureRuntimeVisualQA(input: RuntimeVisualMeasurement): AutoVideoVisualIssue[] {
	const issues: AutoVideoVisualIssue[] = [];
	const visible = new Set(input.visibleItems);

	if (visible.size === 0) {
		issues.push({
			code: 'visual.blank_scene',
			severity: 'error',
			sceneId: input.sceneId,
			message: 'No runtime visual item is visible at this probe frame.'
		});
	}

	for (const subjectId of input.requiredSubjectIds) {
		if (visible.has(subjectId)) continue;
		issues.push({
			code: 'visual.missing_subject',
			severity: 'error',
			sceneId: input.sceneId,
			itemId: subjectId,
			message: `Required subject ${subjectId} is not visible at this probe frame.`
		});
	}

	for (const rect of input.textRects) {
		if (!textOutsideSafeArea(rect, input.stage)) continue;
		issues.push({
			code: 'visual.text_clipped',
			severity: 'warning',
			sceneId: input.sceneId,
			itemId: rect.itemId,
			message: `Measured text ${rect.itemId} extends outside the 5% stage safe area.`
		});
	}

	for (let leftIndex = 0; leftIndex < input.textRects.length; leftIndex += 1) {
		const left = input.textRects[leftIndex]!;
		for (let rightIndex = leftIndex + 1; rightIndex < input.textRects.length; rightIndex += 1) {
			const right = input.textRects[rightIndex]!;
			if (overlapRatio(left, right) < 0.2) continue;
			issues.push({
				code: 'visual.text_overlap',
				severity: 'warning',
				sceneId: input.sceneId,
				itemId: left.itemId,
				message: `Measured text ${left.itemId} overlaps ${right.itemId} by at least 20%.`
			});
			leftIndex = input.textRects.length;
			break;
		}
	}

	for (const sample of input.contrastSamples ?? []) {
		const ratio = contrastRatio(sample.foreground, sample.background);
		if (ratio === null) continue;
		const threshold = sample.sizeClass === 'large' ? 3 : 4.5;
		if (ratio >= threshold) continue;
		issues.push({
			code: 'visual.low_contrast',
			severity: 'warning',
			sceneId: input.sceneId,
			itemId: sample.itemId,
			message: `Measured contrast for ${sample.itemId} is ${ratio.toFixed(2)}:1, below ${threshold.toFixed(1)}:1.`
		});
	}

	for (const asset of input.assets) {
		if (!asset.required || asset.status === 'ready') continue;
		issues.push({
			code: 'visual.asset_not_ready',
			severity: 'error',
			sceneId: input.sceneId,
			itemId: asset.itemId,
			message: `Required asset ${asset.itemId} is ${asset.status} at this probe frame.`
		});
	}

	return issues;
}
