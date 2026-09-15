import type { AutoVideoStoryboard, AutoVideoVisualIssue } from '$lib/auno/auto-video/types';
import type { TimelineItem } from '$lib/video-editor/project/types';

export interface AunoMotionVisualQAInput {
	storyboard: AutoVideoStoryboard;
	items: readonly TimelineItem[];
	width: number;
	height: number;
	compositionIds?: ReadonlySet<string>;
}

interface Bounds {
	left: number;
	right: number;
	top: number;
	bottom: number;
	area: number;
}

function finite(value: number | undefined): boolean {
	return value === undefined || Number.isFinite(value);
}

function sceneItems(items: readonly TimelineItem[], sceneId: string): TimelineItem[] {
	return items.filter(
		(item) =>
			item.id === `${sceneId}-background` ||
			item.id === `${sceneId}-text` ||
			item.id === `${sceneId}-motion-composition` ||
			item.id.startsWith(`${sceneId}-visual-`)
	);
}

function visible(item: TimelineItem): boolean {
	return (item.transform?.opacity ?? 1) > 0 && item.durationInFrames > 0;
}

function invalidTransform(item: TimelineItem): boolean {
	const transform = item.transform;
	if (!transform) return false;
	if (
		!finite(transform.x) ||
		!finite(transform.y) ||
		!finite(transform.width) ||
		!finite(transform.height) ||
		!finite(transform.scaleX) ||
		!finite(transform.scaleY) ||
		!finite(transform.rotation) ||
		!finite(transform.opacity)
	) {
		return true;
	}
	return (transform.width !== undefined && transform.width <= 0) ||
		(transform.height !== undefined && transform.height <= 0) ||
		(transform.scaleX !== undefined && transform.scaleX <= 0) ||
		(transform.scaleY !== undefined && transform.scaleY <= 0);
}

function itemBounds(item: TimelineItem): Bounds | null {
	const transform = item.transform;
	if (!transform) return null;
	const { x, y, width, height, scaleX = 1, scaleY = 1 } = transform;
	if (![x, y, width, height, scaleX, scaleY].every((value) => value !== undefined && Number.isFinite(value))) {
		return null;
	}
	const scaledWidth = Math.abs((width as number) * (scaleX as number));
	const scaledHeight = Math.abs((height as number) * (scaleY as number));
	if (scaledWidth <= 0 || scaledHeight <= 0) return null;
	return {
		left: (x as number) - scaledWidth / 2,
		right: (x as number) + scaledWidth / 2,
		top: (y as number) - scaledHeight / 2,
		bottom: (y as number) + scaledHeight / 2,
		area: scaledWidth * scaledHeight
	};
}

function textOutsideSafeBounds(item: TimelineItem, width: number, height: number): boolean {
	if (item.type !== 'text') return false;
	const bounds = itemBounds(item);
	if (!bounds) return false;
	const safeX = width * 0.05;
	const safeY = height * 0.05;
	return bounds.left < safeX || bounds.right > width - safeX || bounds.top < safeY || bounds.bottom > height - safeY;
}

function overlapRatio(left: Bounds, right: Bounds): number {
	const width = Math.max(0, Math.min(left.right, right.right) - Math.max(left.left, right.left));
	const height = Math.max(0, Math.min(left.bottom, right.bottom) - Math.max(left.top, right.top));
	const intersection = width * height;
	if (intersection <= 0) return 0;
	return intersection / Math.max(1, Math.min(left.area, right.area));
}

function overlappingTextPair(items: readonly TimelineItem[]): [TimelineItem, TimelineItem] | null {
	const textItems = items.filter((item) => item.type === 'text' && visible(item));
	for (let leftIndex = 0; leftIndex < textItems.length; leftIndex += 1) {
		const left = textItems[leftIndex]!;
		const leftBounds = itemBounds(left);
		if (!leftBounds) continue;
		for (let rightIndex = leftIndex + 1; rightIndex < textItems.length; rightIndex += 1) {
			const right = textItems[rightIndex]!;
			const rightBounds = itemBounds(right);
			if (!rightBounds) continue;
			if (overlapRatio(leftBounds, rightBounds) >= 0.2) return [left, right];
		}
	}
	return null;
}

/**
 * Static visual QA over the authored native timeline. It is intentionally deterministic and
 * does not try to score aesthetics; runtime screenshot probes can layer on top of these issues.
 */
export function inspectAunoMotionVisualQA(input: AunoMotionVisualQAInput): AutoVideoVisualIssue[] {
	const issues: AutoVideoVisualIssue[] = [];
	for (const scene of input.storyboard.scenes) {
		const authored = sceneItems(input.items, scene.id);
		if (!authored.some(visible)) {
			issues.push({
				code: 'visual.blank_scene',
				severity: 'error',
				sceneId: scene.id,
				message: 'Scene has no visible authored native item.'
			});
		}
		for (const item of authored) {
			if (invalidTransform(item)) {
				issues.push({
					code: 'visual.invalid_transform',
					severity: 'error',
					sceneId: scene.id,
					itemId: item.id,
					message: `Item ${item.label || item.id} has an invalid transform.`
				});
			}
			if (textOutsideSafeBounds(item, input.width, input.height)) {
				issues.push({
					code: 'visual.text_clipped',
					severity: 'warning',
					sceneId: scene.id,
					itemId: item.id,
					message: `Text ${item.label || item.id} extends outside the 5% stage safe area.`
				});
			}
			if (
				item.type === 'composition' &&
				item.compositionId &&
				input.compositionIds &&
				!input.compositionIds.has(item.compositionId)
			) {
				issues.push({
					code: 'visual.composition_error',
					severity: 'error',
					sceneId: scene.id,
					itemId: item.id,
					message: `Motion Composition ${item.compositionId} is missing from the project registry.`
				});
			}
		}
		const overlap = overlappingTextPair(authored);
		if (overlap) {
			issues.push({
				code: 'visual.text_overlap',
				severity: 'warning',
				sceneId: scene.id,
				itemId: overlap[0].id,
				message: `Text ${overlap[0].label || overlap[0].id} overlaps ${overlap[1].label || overlap[1].id} by at least 20%.`
			});
		}
	}
	return issues;
}
