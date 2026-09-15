import type { MotionSceneGraph } from '@auno/motion';
import { timelineStore } from '$lib/video-editor/timeline/stores/timeline-store.svelte';
import { transitionsStore } from '$lib/video-editor/timeline/actions/transitions-store.svelte';
import { execute } from '$lib/video-editor/timeline/commands/command-store.svelte';
import { compileMotionGraphToNativeTimeline } from './native-compiler';

export function applyMotionGraphToLiveTimeline(options: {
	graph: MotionSceneGraph;
	width: number;
	height: number;
}): void {
	const compiled = compileMotionGraphToNativeTimeline({
		items: timelineStore.items,
		transitions: transitionsStore.list,
		fps: timelineStore.fps,
		width: options.width,
		height: options.height,
		graph: options.graph
	});
	execute('AUNO_APPLY_MOTION_STYLE', () => {
		timelineStore._setItems(compiled.items);
		transitionsStore.setAll(compiled.transitions);
	});
}
