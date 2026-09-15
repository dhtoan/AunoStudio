import { AUTO_VIDEO_FORMAT_SCENES } from './formats';
import type {
	AutoVideoScene,
	AutoVideoStoryboard,
	BuildStoryboardInput
} from './types';

function compact(value: string): string {
	return value.replace(/\s+/g, ' ').trim();
}

function titleFromSource(input: BuildStoryboardInput): string {
	if (input.title?.trim()) return input.title.trim();
	if (input.source.kind === 'url') {
		try {
			const url = new URL(input.source.url || input.source.value);
			return url.hostname.replace(/^www\./, '');
		} catch {
			return 'Auto Video';
		}
	}
	const text = compact(input.source.value);
	return text ? text.slice(0, 72) : 'Auto Video';
}

function sourceSegments(value: string): string[] {
	const normalized = value
		.replace(/\r/g, '\n')
		.split(/(?:\n+|(?<=[.!?])\s+)/)
		.map(compact)
		.filter(Boolean);
	return normalized.length > 0 ? normalized : ['Add your key point here.'];
}

function sceneVoice(label: string, segment: string, index: number): string {
	if (index === 0) return segment;
	if (/call to action/i.test(label)) return `Save or share this if ${segment.toLowerCase()}`;
	if (/verdict|summary/i.test(label)) return `${label}: ${segment}`;
	return `${label}. ${segment}`;
}

export function buildStarterStoryboard(input: BuildStoryboardInput): AutoVideoStoryboard {
	const template = AUTO_VIDEO_FORMAT_SCENES[input.format];
	const segments = sourceSegments(input.source.value);
	const targetDurationSeconds = Math.max(10, Math.min(180, input.targetDurationSeconds));
	const sceneDuration = Math.max(2, targetDurationSeconds / template.length);
	const storyboardId = crypto.randomUUID();
	const scenes: AutoVideoScene[] = template.map((definition, index) => {
		const segment = segments[index % segments.length] ?? segments[0];
		return {
			id: `${storyboardId}-scene-${index + 1}`,
			role: definition.role,
			title: definition.label,
			voice: sceneVoice(definition.label, segment, index),
			visualIntent: definition.visualIntent,
			durationSeconds: Number(sceneDuration.toFixed(2)),
			sourceIds: [input.source.id]
		};
	});

	return {
		version: 1,
		id: storyboardId,
		format: input.format,
		title: titleFromSource(input),
		language: input.language,
		targetDurationSeconds,
		scenes
	};
}
