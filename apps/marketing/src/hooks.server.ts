import type { Handle } from '@sveltejs/kit';

const modulePreload = /<link href="[^"]+" rel="modulepreload">/g;

export const handle: Handle = ({ event, resolve }) => {
	if (event.url.pathname !== '/') return resolve(event);
	return resolve(event, {
		transformPageChunk: ({ html }) => html.replace(modulePreload, '')
	});
};
