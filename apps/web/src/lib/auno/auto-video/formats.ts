import type { AutoVideoFormat, AutoVideoSceneRole, AutoVideoVisualIntent } from './types';

export type AutoVideoFormatScene = {
	role: AutoVideoSceneRole;
	label: string;
	visualIntent: AutoVideoVisualIntent;
};

export const AUTO_VIDEO_FORMAT_SCENES: Record<AutoVideoFormat, readonly AutoVideoFormatScene[]> = {
	review: [
		{ role: 'hook', label: 'Hook', visualIntent: 'product' },
		{ role: 'overview', label: 'Overview', visualIntent: 'product' },
		{ role: 'feature', label: 'Feature 1', visualIntent: 'image' },
		{ role: 'feature', label: 'Feature 2', visualIntent: 'image' },
		{ role: 'feature', label: 'Feature 3', visualIntent: 'image' },
		{ role: 'pros', label: 'Pros', visualIntent: 'icon' },
		{ role: 'cons', label: 'Cons', visualIntent: 'icon' },
		{ role: 'verdict', label: 'Verdict', visualIntent: 'quote' },
		{ role: 'cta', label: 'Call to action', visualIntent: 'product' }
	],
	news: [
		{ role: 'hook', label: 'Hook', visualIntent: 'motion-composition' },
		{ role: 'what-happened', label: 'What happened', visualIntent: 'document' },
		{ role: 'key-fact', label: 'Key fact', visualIntent: 'quote' },
		{ role: 'big-number', label: 'Big number', visualIntent: 'big-number' },
		{ role: 'why-it-matters', label: 'Why it matters', visualIntent: 'chart' },
		{ role: 'impact', label: 'Impact', visualIntent: 'b-roll' },
		{ role: 'what-next', label: 'What next', visualIntent: 'document' },
		{ role: 'cta', label: 'Call to action', visualIntent: 'motion-composition' }
	],
	guide: [
		{ role: 'problem', label: 'Problem', visualIntent: 'image' },
		{ role: 'definition', label: 'Definition', visualIntent: 'document' },
		{ role: 'step', label: 'Step 1', visualIntent: 'icon' },
		{ role: 'step', label: 'Step 2', visualIntent: 'icon' },
		{ role: 'step', label: 'Step 3', visualIntent: 'icon' },
		{ role: 'mistake', label: 'Common mistake', visualIntent: 'quote' },
		{ role: 'tip', label: 'Tip', visualIntent: 'big-number' },
		{ role: 'cta', label: 'Call to action', visualIntent: 'motion-composition' }
	],
	compare: [
		{ role: 'hook', label: 'Hook', visualIntent: 'split-screen' },
		{ role: 'versus', label: 'A vs B', visualIntent: 'split-screen' },
		{ role: 'price', label: 'Price', visualIntent: 'big-number' },
		{ role: 'feature', label: 'Feature', visualIntent: 'split-screen' },
		{ role: 'advantage', label: 'Advantage', visualIntent: 'icon' },
		{ role: 'disadvantage', label: 'Disadvantage', visualIntent: 'icon' },
		{ role: 'best-for', label: 'Best for', visualIntent: 'quote' },
		{ role: 'verdict', label: 'Verdict', visualIntent: 'split-screen' }
	],
	'top-n': [
		{ role: 'hook', label: 'Hook', visualIntent: 'motion-composition' },
		{ role: 'rank', label: '#5', visualIntent: 'big-number' },
		{ role: 'rank', label: '#4', visualIntent: 'big-number' },
		{ role: 'rank', label: '#3', visualIntent: 'big-number' },
		{ role: 'rank', label: '#2', visualIntent: 'big-number' },
		{ role: 'rank', label: '#1', visualIntent: 'big-number' },
		{ role: 'summary', label: 'Summary', visualIntent: 'quote' },
		{ role: 'cta', label: 'Call to action', visualIntent: 'motion-composition' }
	]
};

export const AUTO_VIDEO_FORMAT_LABELS: Record<AutoVideoFormat, string> = {
	review: 'Review',
	news: 'News',
	guide: 'Guide',
	compare: 'Compare',
	'top-n': 'Top N'
};
