import type { AutoVideoStoryboard, AutoVideoVisualIssue } from '$lib/auno/auto-video/types';
import type { TimelineItem } from '$lib/video-editor/project/types';

export interface AunoMotionVisualQAInput {
	storyboard: AutoVideoStoryboard;
	items: readonly TimelineItem[];
	width: number;
	height: number;
	compositionIds?: ReadonlySet<string>;
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

function textOutsideSafeBounds(item: TimelineItem, width: number, height: number): boolean {
	if (item.type !== 'text' || !item.transform) return false;
	const { x, y, width: itemWidth, height: itemHeight } = item.transform;
	if (![x, y, itemWidth, itemHeight].every((value) => value !== undefined && Number.isFinite(value))) {
		return false;
	}
	const safeX = width * 0.05;
	const safeY = height * 0.05;
	const left = (x as number) - (itemWidth as number) / 2;
	const right = (x as number) + (itemWidth as number) / 2;
	const top = (y as number) - (itemHeight as number) / 2;
	const bottom = (y as number) + (itemHeight as number) / 2;
	return left < safeX || right > width - safeX || top < safeY || bottom > height - safeY;
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
	}
	return issues;
}
