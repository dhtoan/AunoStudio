import type { ThemeIconRole } from '$lib/themes';

export type AunoCreateAction = {
	id: 'auto-video' | 'video' | 'photo' | 'record' | 'post';
	label: string;
	description: string;
	href: string;
	icon: ThemeIconRole;
};

export const AUNO_CREATE_ACTIONS: readonly AunoCreateAction[] = [
	{
		id: 'auto-video',
		label: 'AI Auto Video',
		description: 'Turn text, URL, or Markdown into an editable native video project.',
		href: '/auto-video',
		icon: 'sparkles'
	},
	{
		id: 'video',
		label: 'Video',
		description: 'Edit video with the native Auno Studio timeline.',
		href: '/video-editor',
		icon: 'video'
	},
	{
		id: 'photo',
		label: 'Photo / Carousel',
		description: 'Design images and multi-page carousels.',
		href: '/image-editor',
		icon: 'image'
	},
	{
		id: 'record',
		label: 'Record',
		description: 'Capture screen, camera, and microphone.',
		href: '/record',
		icon: 'camera'
	},
	{
		id: 'post',
		label: 'Social Post',
		description: 'Compose, schedule, and publish to connected channels.',
		href: '/',
		icon: 'compose'
	}
] as const;
