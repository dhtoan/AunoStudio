import type { MotionSceneGraph } from '@auno/motion';
import { timelineStore } from '$lib/video-editor/timeline/stores/timeline-store.svelte';
import { transitionsStore } from '$lib/video-editor/timeline/actions/transitions-store.svelte';
import { execute } from '$lib/video-editor/timeline/commands/command-store.svelte';
import { sequenceStore } from '$lib/video-editor/sequences/sequence-store.svelte';
import { compileMotionGraphToNativeTimeline } from './native-compiler';
import { aunoMotionTrack, buildMotionCompositionOverlays } from './motion-composition';

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
	const overlays = buildMotionCompositionOverlays({
		graph: options.graph,
		width: options.width,
		height: options.height,
		fps: timelineStore.fps
	});
	const overlayIds = new Set(overlays.map((entry) => entry.item.id));
	const baseItems = compiled.items.filter((item) => !item.id.endsWith('-motion-composition'));
	const items = [...baseItems, ...overlays.map((entry) => entry.item)];
	const tracks = timelineStore.tracks
		.filter((track) => track.id !== 'track-auno-motion')
		.map((track) => {
			if (overlays.length === 0) return track;
			if (track.id === 'track-video-overlay') return { ...track, order: 0 };
			if (track.id === 'track-video-main') return { ...track, order: 2 };
			if (track.id === 'track-audio') return { ...track, order: 3 };
			if (track.id === 'track-auno-music') return { ...track, order: 4 };
			return track;
		});
	if (overlays.length > 0) tracks.push(aunoMotionTrack());
	tracks.sort((left, right) => left.order - right.order);

	execute('AUNO_APPLY_MOTION_STYLE', () => {
		timelineStore._setTracks(tracks);
		timelineStore._setItems(items);
		transitionsStore.setAll(compiled.transitions);

		const existing = sequenceStore.compositionById;
		for (const overlay of overlays) {
			if (existing.has(overlay.composition.id)) {
				const { id: _id, ...patch } = overlay.composition;
				sequenceStore.updateComposition(overlay.composition.id, patch);
			} else {
				sequenceStore.addComposition(overlay.composition);
			}
		}
	});

	void overlayIds;
}
