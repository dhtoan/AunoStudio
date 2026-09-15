import { createBlankProject } from '$lib/video-editor/project/defaults';
import type { ProjectCreationSettings } from '$lib/video-editor/project/project-presets';
import type {
	Project,
	TimelineItem,
	TimelineMarker,
	TimelineTrack,
	TimelineTransition
} from '$lib/video-editor/project/types';
import type { AutoVideoFormat, AutoVideoStoryboard } from './types';

export type AutoVideoCanvasPreset = 'vertical' | 'landscape' | 'square';

export const AUTO_VIDEO_CANVAS_SETTINGS: Record<AutoVideoCanvasPreset, ProjectCreationSettings> = {
	vertical: { width: 1080, height: 1920, fps: 30 },
	landscape: { width: 1920, height: 1080, fps: 30 },
	square: { width: 1080, height: 1080, fps: 30 }
};

const FORMAT_COLORS: Record<AutoVideoFormat, [string, string, string, string]> = {
	review: ['#17130f', '#7c5b2f', '#b99155', '#211b15'],
	news: ['#160d12', '#7f1d2d', '#d43d51', '#24101a'],
	guide: ['#071522', '#0f4c81', '#2a77b9', '#0b2238'],
	compare: ['#130f26', '#4c2c83', '#8759c7', '#1d1637'],
	'top-n': ['#071c17', '#1f6b54', '#49a682', '#0b2d24']
};

function audioTrack(id: string, name: string, order: number): TimelineTrack {
	return {
		id,
		name,
		kind: 'audio',
		height: 72,
		locked: false,
		visible: true,
		muted: false,
		solo: false,
		volume: 1,
		order
	};
}

export function compileStoryboardToProject(
	storyboard: AutoVideoStoryboard,
	canvas: AutoVideoCanvasPreset = 'vertical'
): Project {
	const settings = AUTO_VIDEO_CANVAS_SETTINGS[canvas];
	const project = createBlankProject(storyboard.title, settings);
	const timeline = project.timeline!;
	const fps = settings.fps;
	const overlayTrackId = 'track-video-overlay';
	const mainTrackId = 'track-video-main';
	const voiceTrackId = 'track-audio';
	const musicTrackId = 'track-auno-music';

	timeline.tracks = timeline.tracks.map((track) => {
		if (track.id === overlayTrackId) return { ...track, name: 'Auno Text', order: 0 };
		if (track.id === mainTrackId) return { ...track, name: 'Auno Visuals', order: 1 };
		if (track.id === voiceTrackId) return { ...track, name: 'Auno Voice', order: 2 };
		return track;
	});
	timeline.tracks.push(audioTrack(musicTrackId, 'Auno Music', 3));

	const items: TimelineItem[] = [];
	const markers: TimelineMarker[] = [];
	const transitions: TimelineTransition[] = [];
	let cursor = 0;
	let previousBackgroundId: string | null = null;

	storyboard.scenes.forEach((scene, index) => {
		const frames = Math.max(fps * 2, Math.round(scene.durationSeconds * fps));
		const backgroundId = `${scene.id}-background`;
		const textId = `${scene.id}-text`;
		const colors = FORMAT_COLORS[storyboard.format];

		items.push({
			id: backgroundId,
			trackId: mainTrackId,
			from: cursor,
			durationInFrames: frames,
			label: `${scene.title} · Background`,
			type: 'background',
			background: {
				kind: 'mesh-gradient',
				colors,
				smoothness: 0.58,
				rotation: (index % 4) * 12,
				scale: 1.12,
				offsetX: (index % 2 === 0 ? -1 : 1) * 0.04,
				offsetY: ((index % 3) - 1) * 0.03
			}
		});

		items.push({
			id: textId,
			trackId: overlayTrackId,
			from: cursor,
			durationInFrames: frames,
			label: scene.title,
			type: 'text',
			text: `${scene.title}\n${scene.voice}`,
			textStylePresetId: scene.role === 'hook' ? 'headline-stack' : 'clean-title',
			fontSize: canvas === 'vertical' ? 68 : 58,
			fontWeight: 700,
			color: '#ffffff',
			textAlign: 'center',
			verticalAlign: 'middle',
			lineHeight: 1.08,
			paddingX: 32,
			paddingY: 24,
			transform: {
				x: settings.width / 2,
				y: settings.height / 2,
				width: settings.width * 0.82,
				height: settings.height * 0.56,
				opacity: 1
			}
		});

		markers.push({
			id: `${scene.id}-marker`,
			frame: cursor,
			label: `${index + 1}. ${scene.title}`,
			color: colors[2]
		});

		if (previousBackgroundId) {
			transitions.push({
				id: `${scene.id}-transition`,
				type: 'crossfade',
				durationInFrames: Math.min(10, Math.max(4, Math.round(frames * 0.08))),
				alignment: 0.5,
				fromItemId: previousBackgroundId,
				toItemId: backgroundId
			});
		}

		previousBackgroundId = backgroundId;
		cursor += frames;
	});

	timeline.items = items;
	timeline.markers = markers;
	timeline.transitions = transitions;
	timeline.currentFrame = 0;
	timeline.inPoint = 0;
	timeline.outPoint = cursor;
	project.duration = cursor / fps;
	project.description = `Auno Auto Video · ${storyboard.format} · ${storyboard.language}`;
	project.updatedAt = Date.now();
	return project;
}
